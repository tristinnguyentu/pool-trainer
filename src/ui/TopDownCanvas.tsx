import { useCallback, useEffect, useRef, useState } from 'react';
import { BALL_R, TABLE, clamp } from '../engine/constants';
import { renderTopDown, viewTransform } from '../render/topdown';
import type { Ball, Guides, MirrorStep, MirrorWalkthrough, Scene, TableZoom } from '../engine/types';
import { useCanvas } from './hooks/useCanvas';

interface TopDownCanvasProps {
  scene: Scene;
  guides: Guides | null;
  balls: Ball[];
  animating: boolean;
  showGuides: boolean;
  mirror: { data: MirrorWalkthrough; step: MirrorStep } | null;
  ghostAlpha: number;
  onDragBall: (id: string, x: number, y: number) => void;
}

const ZOOM_MIN = 1;
const ZOOM_MAX = 5;
const ZOOM_STEP = 1.25;
const NO_ZOOM: TableZoom = { scale: 1, panX: 0, panY: 0 };

export function TopDownCanvas({
  scene,
  guides,
  balls,
  animating,
  showGuides,
  mirror,
  ghostAlpha,
  onDragBall,
}: TopDownCanvasProps) {
  const [zoom, setZoom] = useState<TableZoom>(NO_ZOOM);

  // A new shot (or entering/leaving the walkthrough) refits the view.
  useEffect(() => {
    setZoom(NO_ZOOM);
  }, [scene.shot.id, mirror ? mirror.data.rail : null]);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, cssW: number, cssH: number) => {
      renderTopDown(ctx, {
        scene,
        guides,
        balls,
        animating,
        showGuides,
        mirror,
        tableZoom: zoom,
        ghostAlpha,
        cssW,
        cssH,
      });
    },
    [scene, guides, balls, animating, showGuides, mirror, zoom, ghostAlpha],
  );

  const { canvasRef, renderNow, sizeRef } = useCanvas(draw);
  useEffect(() => {
    renderNow();
  }, [draw, renderNow]);

  const dragIdRef = useRef<string | null>(null);
  const panRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const mirrorData = mirror ? mirror.data : null;
  const mirrorDataRef = useRef(mirrorData);
  mirrorDataRef.current = mirrorData;

  const currentTransform = useCallback(() => {
    const { cssW, cssH } = sizeRef.current;
    return viewTransform(cssW, cssH, mirrorDataRef.current, zoomRef.current);
  }, [sizeRef]);

  const clientToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    },
    [canvasRef],
  );

  const clientToTable = useCallback(
    (clientX: number, clientY: number) => currentTransform().toTable(clientToCanvas(clientX, clientY)),
    [currentTransform, clientToCanvas],
  );

  // Wheel zoom, anchored on the cursor: the table point under the pointer
  // stays put. Native listener because React's synthetic wheel handler can't
  // reliably preventDefault (page would scroll instead of zooming).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = canvas!.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setZoom((prev) => {
        const next = clamp(prev.scale * (e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP), ZOOM_MIN, ZOOM_MAX);
        if (next === 1) return NO_ZOOM;
        const { cssW, cssH } = sizeRef.current;
        const world = viewTransform(cssW, cssH, mirrorDataRef.current, prev).toTable({ x: cx, y: cy });
        const unpanned = viewTransform(cssW, cssH, mirrorDataRef.current, {
          scale: next,
          panX: 0,
          panY: 0,
        }).toCanvas(world);
        return { scale: next, panX: cx - unpanned.x, panY: cy - unpanned.y };
      });
    }
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [canvasRef, sizeRef]);

  const zoomAboutCenter = useCallback(
    (factor: number) => {
      setZoom((prev) => {
        const next = clamp(prev.scale * factor, ZOOM_MIN, ZOOM_MAX);
        if (next === 1) return NO_ZOOM;
        // keep the canvas-center point fixed: pan scales with the ratio
        const ratio = next / prev.scale;
        return { scale: next, panX: prev.panX * ratio, panY: prev.panY * ratio };
      });
    },
    [],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canDragBalls = !animating && !mirror;
    if (canDragBalls) {
      const { x, y } = clientToTable(e.clientX, e.clientY);
      const hit = hitTestBall(x, y);
      if (hit) {
        dragIdRef.current = hit.id;
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.style.cursor = 'grabbing';
        return;
      }
    }
    // empty felt: pan when zoomed in
    if (zoomRef.current.scale > 1) {
      const c = clientToCanvas(e.clientX, e.clientY);
      panRef.current = { startX: c.x, startY: c.y, panX: zoomRef.current.panX, panY: zoomRef.current.panY };
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.style.cursor = 'grabbing';
    }
  };

  const hitTestBall = useCallback(
    (tx: number, ty: number): Ball | null => {
      for (const b of balls) {
        if (b.pocketed) continue;
        if (Math.hypot(b.x - tx, b.y - ty) <= BALL_R * 1.6) return b;
      }
      return null;
    },
    [balls],
  );

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pan = panRef.current;
    if (pan) {
      const c = clientToCanvas(e.clientX, e.clientY);
      setZoom((prev) => ({ ...prev, panX: pan.panX + (c.x - pan.startX), panY: pan.panY + (c.y - pan.startY) }));
      return;
    }

    const draggingId = dragIdRef.current;
    if (!draggingId) {
      if (animating) return;
      const { x: tx, y: ty } = clientToTable(e.clientX, e.clientY);
      const hovered = !mirror && hitTestBall(tx, ty);
      e.currentTarget.style.cursor = hovered ? 'grab' : zoomRef.current.scale > 1 ? 'grab' : 'default';
      return;
    }

    const { x: tx, y: ty } = clientToTable(e.clientX, e.clientY);
    const x = clamp(tx, BALL_R, TABLE.W - BALL_R);
    const y = clamp(ty, BALL_R, TABLE.H - BALL_R);
    const collides = balls.some(
      (b) => b.id !== draggingId && !b.pocketed && Math.hypot(b.x - x, b.y - y) < 2 * BALL_R,
    );
    if (!collides) onDragBall(draggingId, x, y);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragIdRef.current = null;
    panRef.current = null;
    e.currentTarget.style.cursor = 'default';
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Only reset the hover cursor; an active drag keeps going via pointer capture
    // until pointerup/pointercancel, so don't clear the drag/pan refs here.
    if (!dragIdRef.current && !panRef.current) e.currentTarget.style.cursor = 'default';
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className="table-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onDoubleClick={() => setZoom(NO_ZOOM)}
      />
      <div className="zoom-controls">
        <button
          type="button"
          className="zoom-btn"
          aria-label="Zoom out"
          title="Zoom out (scroll wheel works too)"
          disabled={zoom.scale <= ZOOM_MIN}
          onClick={() => zoomAboutCenter(1 / ZOOM_STEP)}
        >
          −
        </button>
        <button
          type="button"
          className="zoom-btn"
          aria-label="Zoom in"
          title="Zoom in (scroll wheel works too)"
          disabled={zoom.scale >= ZOOM_MAX}
          onClick={() => zoomAboutCenter(ZOOM_STEP)}
        >
          +
        </button>
        {zoom.scale > 1 && (
          <button
            type="button"
            className="zoom-btn zoom-reset"
            aria-label="Reset zoom"
            title="Reset zoom (double-click the table works too)"
            onClick={() => setZoom(NO_ZOOM)}
          >
            {Math.round(zoom.scale * 100) / 100}×
          </button>
        )}
      </div>
    </>
  );
}
