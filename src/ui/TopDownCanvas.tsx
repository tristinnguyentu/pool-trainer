import { useCallback, useEffect, useRef, useState } from 'react';
import { BALL_R, TABLE, clamp } from '../engine/constants';
import { renderTopDown, viewTransform } from '../render/topdown';
import type { Ball, Guides, MirrorStep, MirrorWalkthrough, Scene, TableZoom, Vec2 } from '../engine/types';
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
/** Minimum grab radius in CSS px — a fingertip is far wider than a ball on a phone. */
const GRAB_PX = 24;

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
  // Grab offset (table units) so a ball never jumps under the finger/cursor.
  const dragOffsetRef = useRef<Vec2>({ x: 0, y: 0 });
  const panRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  // Live pointers in canvas coords, keyed by pointerId — two of them means pinch.
  const pointersRef = useRef(new Map<number, Vec2>());
  const pinchRef = useRef<{ dist: number; scale: number; world: Vec2 } | null>(null);
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

  /**
   * Re-anchor the view at `scale` so the table point `world` sits under canvas
   * point `at`. Shared by wheel zoom and pinch zoom.
   */
  const zoomAnchored = useCallback(
    (scale: number, world: Vec2, at: Vec2): TableZoom => {
      const next = clamp(scale, ZOOM_MIN, ZOOM_MAX);
      if (next === 1) return NO_ZOOM;
      const { cssW, cssH } = sizeRef.current;
      const unpanned = viewTransform(cssW, cssH, mirrorDataRef.current, {
        scale: next,
        panX: 0,
        panY: 0,
      }).toCanvas(world);
      return { scale: next, panX: at.x - unpanned.x, panY: at.y - unpanned.y };
    },
    [sizeRef],
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
      const at = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setZoom((prev) => {
        const { cssW, cssH } = sizeRef.current;
        const world = viewTransform(cssW, cssH, mirrorDataRef.current, prev).toTable(at);
        return zoomAnchored(prev.scale * (e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP), world, at);
      });
    }
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [canvasRef, sizeRef, zoomAnchored]);

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

  const hitTestBall = useCallback(
    (tx: number, ty: number, minRadius: number): Ball | null => {
      let best: Ball | null = null;
      let bestDist = Infinity;
      for (const b of balls) {
        if (b.pocketed) continue;
        const d = Math.hypot(b.x - tx, b.y - ty);
        if (d <= minRadius && d < bestDist) {
          best = b;
          bestDist = d;
        }
      }
      return best;
    },
    [balls],
  );

  /** Grab radius in table units: never smaller than a fingertip's worth of pixels. */
  const grabRadius = useCallback(
    () => Math.max(BALL_R * 1.6, GRAB_PX / Math.max(0.0001, currentTransform().scale)),
    [currentTransform],
  );

  const endGesture = useCallback((canvas: HTMLCanvasElement) => {
    dragIdRef.current = null;
    panRef.current = null;
    pinchRef.current = null;
    canvas.style.cursor = 'default';
  }, []);

  const beginPinch = useCallback(() => {
    const pts = Array.from(pointersRef.current.values());
    if (pts.length < 2) return;
    const [a, b] = pts;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    dragIdRef.current = null;
    panRef.current = null;
    pinchRef.current = {
      dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      scale: zoomRef.current.scale,
      world: currentTransform().toTable(mid),
    };
  }, [currentTransform]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    canvas.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, clientToCanvas(e.clientX, e.clientY));

    if (pointersRef.current.size >= 2) {
      beginPinch();
      return;
    }

    const canDragBalls = !animating && !mirror;
    if (canDragBalls) {
      const { x, y } = clientToTable(e.clientX, e.clientY);
      const hit = hitTestBall(x, y, grabRadius());
      if (hit) {
        dragIdRef.current = hit.id;
        dragOffsetRef.current = { x: hit.x - x, y: hit.y - y };
        canvas.style.cursor = 'grabbing';
        return;
      }
    }
    // empty felt: pan when zoomed in
    if (zoomRef.current.scale > 1) {
      const c = clientToCanvas(e.clientX, e.clientY);
      panRef.current = { startX: c.x, startY: c.y, panX: zoomRef.current.panX, panY: zoomRef.current.panY };
      canvas.style.cursor = 'grabbing';
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const here = clientToCanvas(e.clientX, e.clientY);
    if (pointersRef.current.has(e.pointerId)) pointersRef.current.set(e.pointerId, here);

    // two fingers: pinch to zoom, and the midpoint drags the table along with it
    const pinch = pinchRef.current;
    if (pinch && pointersRef.current.size >= 2) {
      const [a, b] = Array.from(pointersRef.current.values());
      const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      setZoom(zoomAnchored((pinch.scale * dist) / pinch.dist, pinch.world, mid));
      return;
    }

    const pan = panRef.current;
    if (pan) {
      setZoom((prev) => ({
        ...prev,
        panX: pan.panX + (here.x - pan.startX),
        panY: pan.panY + (here.y - pan.startY),
      }));
      return;
    }

    const draggingId = dragIdRef.current;
    if (!draggingId) {
      if (animating || e.pointerType !== 'mouse') return;
      const { x: tx, y: ty } = clientToTable(e.clientX, e.clientY);
      const hovered = !mirror && hitTestBall(tx, ty, grabRadius());
      canvas.style.cursor = hovered ? 'grab' : zoomRef.current.scale > 1 ? 'grab' : 'default';
      return;
    }

    const { x: px, y: py } = clientToTable(e.clientX, e.clientY);
    const off = dragOffsetRef.current;
    const x = clamp(px + off.x, BALL_R, TABLE.W - BALL_R);
    const y = clamp(py + off.y, BALL_R, TABLE.H - BALL_R);
    const collides = balls.some(
      (b) => b.id !== draggingId && !b.pocketed && Math.hypot(b.x - x, b.y - y) < 2 * BALL_R,
    );
    if (!collides) onDragBall(draggingId, x, y);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    // Lifting one finger of a pinch must not silently start dragging a ball
    // with the finger that's still down.
    if (pointersRef.current.size === 0) endGesture(e.currentTarget);
    else {
      dragIdRef.current = null;
      panRef.current = null;
    }
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
          title="Zoom out (pinch or scroll works too)"
          disabled={zoom.scale <= ZOOM_MIN}
          onClick={() => zoomAboutCenter(1 / ZOOM_STEP)}
        >
          −
        </button>
        <button
          type="button"
          className="zoom-btn"
          aria-label="Zoom in"
          title="Zoom in (pinch or scroll works too)"
          disabled={zoom.scale >= ZOOM_MAX}
          onClick={() => zoomAboutCenter(ZOOM_STEP)}
        >
          +
        </button>
        {zoom.scale > 1 && (
          <button
            type="button"
            className="zoom-btn zoom-reset"
            aria-label={`Reset zoom (currently ${Math.round(zoom.scale * 100) / 100}×)`}
            title="Reset zoom"
            onClick={() => setZoom(NO_ZOOM)}
          >
            {Math.round(zoom.scale * 100) / 100}× ✕
          </button>
        )}
      </div>
    </>
  );
}
