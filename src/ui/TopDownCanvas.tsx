import { useCallback, useEffect, useRef } from 'react';
import { BALL_R, TABLE } from '../engine/constants';
import { renderTopDown, tableTransform } from '../render/topdown';
import type { Ball, Guides, Scene } from '../engine/types';
import { useCanvas } from './hooks/useCanvas';

interface TopDownCanvasProps {
  scene: Scene;
  guides: Guides | null;
  balls: Ball[];
  animating: boolean;
  showGuides: boolean;
  onDragBall: (id: string, x: number, y: number) => void;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function TopDownCanvas({ scene, guides, balls, animating, showGuides, onDragBall }: TopDownCanvasProps) {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, cssW: number, cssH: number) => {
      renderTopDown(ctx, { scene, guides, balls, animating, showGuides, cssW, cssH });
    },
    [scene, guides, balls, animating, showGuides],
  );

  const { canvasRef, renderNow, sizeRef } = useCanvas(draw);
  useEffect(() => {
    renderNow();
  }, [draw, renderNow]);

  const dragIdRef = useRef<string | null>(null);

  const clientToTable = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const { cssW, cssH } = sizeRef.current;
      const t = tableTransform(cssW, cssH);
      return t.toTable({ x: clientX - rect.left, y: clientY - rect.top });
    },
    [canvasRef, sizeRef],
  );

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

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (animating) return;
    const { x, y } = clientToTable(e.clientX, e.clientY);
    const hit = hitTestBall(x, y);
    if (!hit) return;
    dragIdRef.current = hit.id;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = 'grabbing';
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (animating) return;
    const { x: tx, y: ty } = clientToTable(e.clientX, e.clientY);
    const draggingId = dragIdRef.current;

    if (!draggingId) {
      const hovered = hitTestBall(tx, ty);
      e.currentTarget.style.cursor = hovered ? 'grab' : 'default';
      return;
    }

    const x = clamp(tx, BALL_R, TABLE.W - BALL_R);
    const y = clamp(ty, BALL_R, TABLE.H - BALL_R);
    const collides = balls.some(
      (b) => b.id !== draggingId && !b.pocketed && Math.hypot(b.x - x, b.y - y) < 2 * BALL_R,
    );
    if (!collides) onDragBall(draggingId, x, y);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragIdRef.current = null;
    e.currentTarget.style.cursor = 'default';
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Only reset the hover cursor; an active drag keeps going via pointer capture
    // until pointerup/pointercancel, so don't clear dragIdRef here.
    if (!dragIdRef.current) e.currentTarget.style.cursor = 'default';
  };

  return (
    <canvas
      ref={canvasRef}
      className="table-canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    />
  );
}
