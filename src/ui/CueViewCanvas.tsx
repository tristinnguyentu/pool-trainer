import { useCallback, useEffect } from 'react';
import { renderCueView } from '../render/cueview';
import type { Ball, Guides, Scene } from '../engine/types';
import { useCanvas } from './hooks/useCanvas';

interface CueViewCanvasProps {
  scene: Scene;
  guides: Guides | null;
  balls: Ball[];
  animating: boolean;
  showGuides: boolean;
}

export function CueViewCanvas({ scene, guides, balls, animating, showGuides }: CueViewCanvasProps) {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, cssW: number, cssH: number) => {
      renderCueView(ctx, { scene, guides, balls, animating, showGuides, cssW, cssH });
    },
    [scene, guides, balls, animating, showGuides],
  );

  const { canvasRef, renderNow } = useCanvas(draw);
  useEffect(() => {
    renderNow();
  }, [draw, renderNow]);

  return <canvas ref={canvasRef} className="cue-canvas" />;
}
