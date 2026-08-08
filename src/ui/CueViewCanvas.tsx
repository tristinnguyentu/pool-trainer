import { useCallback, useEffect, useState } from 'react';
import { clamp } from '../engine/constants';
import { renderCueView } from '../render/cueview';
import type { Ball, Guides, Scene } from '../engine/types';
import { useCanvas } from './hooks/useCanvas';

interface CueViewCanvasProps {
  scene: Scene;
  guides: Guides | null;
  balls: Ball[];
  animating: boolean;
  showGuides: boolean;
  ghostAlpha: number;
}

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 1.2;

export function CueViewCanvas({ scene, guides, balls, animating, showGuides, ghostAlpha }: CueViewCanvasProps) {
  const [camZoom, setCamZoom] = useState(1);

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
        cssW,
        cssH,
      });
    },
    [scene, guides, balls, animating, showGuides, camZoom, ghostAlpha],
  );

  const { canvasRef, renderNow } = useCanvas(draw);
  useEffect(() => {
    renderNow();
  }, [draw, renderNow]);

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

  return (
    <>
      <canvas ref={canvasRef} className="cue-canvas" onDoubleClick={() => setCamZoom(1)} />
      <div className="zoom-controls">
        <button
          type="button"
          className="zoom-btn"
          aria-label="Zoom out"
          title="Zoom out (scroll wheel works too)"
          disabled={camZoom <= ZOOM_MIN}
          onClick={() => setCamZoom((z) => clamp(z / ZOOM_STEP, ZOOM_MIN, ZOOM_MAX))}
        >
          −
        </button>
        <button
          type="button"
          className="zoom-btn"
          aria-label="Zoom in"
          title="Zoom in (scroll wheel works too)"
          disabled={camZoom >= ZOOM_MAX}
          onClick={() => setCamZoom((z) => clamp(z * ZOOM_STEP, ZOOM_MIN, ZOOM_MAX))}
        >
          +
        </button>
        {camZoom > 1 && (
          <button
            type="button"
            className="zoom-btn zoom-reset"
            aria-label="Reset zoom"
            title="Reset zoom (double-click works too)"
            onClick={() => setCamZoom(1)}
          >
            {Math.round(camZoom * 100) / 100}×
          </button>
        )}
      </div>
    </>
  );
}
