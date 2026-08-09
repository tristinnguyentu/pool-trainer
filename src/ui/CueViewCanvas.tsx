import { useCallback, useEffect, useRef, useState } from 'react';
import { BALL_R, TABLE, clamp } from '../engine/constants';
import { cueCameraOf, cueViewProjection, renderCueView } from '../render/cueview';
import type { Ball, CueCamera, Guides, Scene, Vec2 } from '../engine/types';
import { useCanvas } from './hooks/useCanvas';
import { usePinch } from './hooks/usePinch';
import { ZoomControls } from './ZoomControls';

interface CueViewCanvasProps {
  scene: Scene;
  guides: Guides | null;
  balls: Ball[];
  animating: boolean;
  showGuides: boolean;
  ghostAlpha: number;
  onDragBall: (id: string, x: number, y: number) => void;
  /** Absolute aim nudge in degrees; the caller clamps it to the allowed range. */
  onAimChange: (deg: number) => void;
  angleOffsetDeg: number;
}

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 1.2;
/** Minimum grab radius in CSS px — a fingertip is wider than a distant ball. */
const GRAB_PX = 24;

export function CueViewCanvas({
  scene,
  guides,
  balls,
  animating,
  showGuides,
  ghostAlpha,
  onDragBall,
  onAimChange,
  angleOffsetDeg,
}: CueViewCanvasProps) {
  const [camZoom, setCamZoom] = useState(1);
  /*
   * Both the eye and the aim it sights down are derived from the balls, so while
   * a ball is being dragged the camera would swing away under the finger moving
   * it. Pinning the camera for the drag keeps the manipulation direct; the view
   * settles on release.
   */
  const [cameraLock, setCameraLock] = useState<CueCamera | null>(null);

  useEffect(() => {
    setCamZoom(1);
  }, [scene.shot.id]);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, cssW: number, cssH: number) => {
      renderCueView(ctx, {
        scene,
        guides,
        balls,
        animating,
        showGuides,
        cameraZoom: camZoom,
        ghostAlpha,
        cameraLock,
        cssW,
        cssH,
      });
    },
    [scene, guides, balls, animating, showGuides, camZoom, ghostAlpha, cameraLock],
  );

  const { canvasRef, renderNow, sizeRef } = useCanvas(draw);
  useEffect(() => {
    renderNow();
  }, [draw, renderNow]);

  const scaleBy = useCallback((factor: number) => {
    setCamZoom((prev) => clamp(prev * factor, ZOOM_MIN, ZOOM_MAX));
  }, []);

  // Optical zoom on the wheel (native listener so preventDefault sticks).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      setCamZoom((prev) => clamp(prev * (e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP), ZOOM_MIN, ZOOM_MAX));
    }
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [canvasRef]);

  const clientToCanvas = useCallback(
    (clientX: number, clientY: number): Vec2 => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    },
    [canvasRef],
  );

  // Latest values the pointer handlers need, without re-creating them per render.
  const stateRef = useRef({ scene, guides, balls, camZoom, angleOffsetDeg, animating, cameraLock });
  stateRef.current = { scene, guides, balls, camZoom, angleOffsetDeg, animating, cameraLock };

  /** The projection the pixels were last drawn with. */
  const projection = useCallback(() => {
    const { cssW, cssH } = sizeRef.current;
    const s = stateRef.current;
    const camera = s.cameraLock ?? cueCameraOf(s.scene, s.guides);
    return cueViewProjection(camera, cssW, cssH, s.camZoom);
  }, [sizeRef]);

  const dragRef = useRef<{ id: string; offset: Vec2 } | null>(null);
  const aimRef = useRef<{ startX: number; startDeg: number; radPerPx: number } | null>(null);

  const pinch = usePinch<number>({
    toLocal: (clientX, clientY) => ({ x: clientX, y: clientY }),
    onStart: () => {
      dragRef.current = null;
      aimRef.current = null;
      setCameraLock(null);
      return stateRef.current.camZoom;
    },
    onPinch: (ratio, _mid, start) => setCamZoom(clamp(start * ratio, ZOOM_MIN, ZOOM_MAX)),
  });

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const { pinching } = pinch.down(e);
    if (pinching) return;
    if (stateRef.current.animating) return;

    const at = clientToCanvas(e.clientX, e.clientY);
    const proj = projection();

    // Nearest ball whose drawn circle (or a fingertip's worth of pixels) covers
    // the touch. Nearer balls are drawn larger, so this favours them naturally.
    let best: { ball: Ball; dist: number } | null = null;
    for (const b of stateRef.current.balls) {
      if (b.pocketed) continue;
      const s = proj.ballAt(b);
      if (!s) continue;
      const d = Math.hypot(s.x - at.x, s.y - at.y);
      if (d <= Math.max(s.r, GRAB_PX) && (!best || d < best.dist)) best = { ball: b, dist: d };
    }

    if (best) {
      const table = proj.tableAt(at);
      // Hold the camera where it is for the whole drag, and keep the grab offset
      // so the ball doesn't jump to the fingertip.
      setCameraLock(stateRef.current.cameraLock ?? cueCameraOf(stateRef.current.scene, stateRef.current.guides));
      dragRef.current = {
        id: best.ball.id,
        offset: table ? { x: best.ball.x - table.x, y: best.ball.y - table.y } : { x: 0, y: 0 },
      };
      e.currentTarget.style.cursor = 'grabbing';
      return;
    }

    // Empty felt: sight left and right, the way you shift your aim over the ball.
    aimRef.current = {
      startX: at.x,
      startDeg: stateRef.current.angleOffsetDeg,
      radPerPx: proj.radiansPerPx,
    };
    e.currentTarget.style.cursor = 'ew-resize';
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pinch.move(e).handled) return;

    const at = clientToCanvas(e.clientX, e.clientY);

    const drag = dragRef.current;
    if (drag) {
      const table = projection().tableAt(at);
      if (!table) return;
      const x = clamp(table.x + drag.offset.x, BALL_R, TABLE.W - BALL_R);
      const y = clamp(table.y + drag.offset.y, BALL_R, TABLE.H - BALL_R);
      const collides = stateRef.current.balls.some(
        (b) => b.id !== drag.id && !b.pocketed && Math.hypot(b.x - x, b.y - y) < 2 * BALL_R,
      );
      if (!collides) onDragBall(drag.id, x, y);
      return;
    }

    const aim = aimRef.current;
    if (aim) {
      // Dragging right swings the aim right; the camera turns with it, so the
      // view sights along wherever you have pointed the cue.
      const deg = aim.startDeg + (at.x - aim.startX) * aim.radPerPx * (180 / Math.PI);
      onAimChange(deg);
      return;
    }

    if (e.pointerType === 'mouse' && !stateRef.current.animating) {
      const proj = projection();
      const over = stateRef.current.balls.some((b) => {
        if (b.pocketed) return false;
        const s = proj.ballAt(b);
        return s ? Math.hypot(s.x - at.x, s.y - at.y) <= Math.max(s.r, GRAB_PX) : false;
      });
      e.currentTarget.style.cursor = over ? 'grab' : 'ew-resize';
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pinch.up(e);
    dragRef.current = null;
    aimRef.current = null;
    setCameraLock(null); // let the view settle on the shot as it now stands
    e.currentTarget.style.cursor = 'default';
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className="cue-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={() => setCamZoom(1)}
      />
      <ZoomControls
        scale={camZoom}
        min={ZOOM_MIN}
        max={ZOOM_MAX}
        step={ZOOM_STEP}
        onScaleBy={scaleBy}
        onReset={() => setCamZoom(1)}
      />
    </>
  );
}
