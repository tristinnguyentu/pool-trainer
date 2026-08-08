import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp } from '../engine/constants';
import { renderCueView } from '../render/cueview';
import type { Ball, Guides, Scene } from '../engine/types';
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

  // Pinch is the touch equivalent of the wheel: no anchoring, just optical zoom.
  const camZoomRef = useRef(camZoom);
  camZoomRef.current = camZoom;
  const pinch = usePinch<number>({
    toLocal: (clientX, clientY) => ({ x: clientX, y: clientY }),
    onStart: () => camZoomRef.current,
    onPinch: (ratio, _mid, start) => setCamZoom(clamp(start * ratio, ZOOM_MIN, ZOOM_MAX)),
  });

  return (
    <>
      <canvas
        ref={canvasRef}
        className="cue-canvas"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          pinch.down(e);
        }}
        onPointerMove={pinch.move}
        onPointerUp={pinch.up}
        onPointerCancel={pinch.up}
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
