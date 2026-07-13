import { useCallback, useEffect, useRef } from 'react';

export interface CanvasSize {
  cssW: number;
  cssH: number;
}

export type DrawFn = (ctx: CanvasRenderingContext2D, cssW: number, cssH: number) => void;

/**
 * DPR-aware canvas sizing + imperative drawing. Rendering is kept out of React state:
 * `renderNow()` reads the latest `draw` callback (via a ref, always current) and paints
 * directly onto the canvas. Call `renderNow()` from an effect keyed on whatever inputs
 * should trigger a repaint; a ResizeObserver also repaints on size changes.
 */
export function useCanvas(draw: DrawFn) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const sizeRef = useRef<CanvasSize>({ cssW: 0, cssH: 0 });

  const renderNow = useCallback(() => {
    const canvas = canvasRef.current;
    const { cssW, cssH } = sizeRef.current;
    if (!canvas || cssW <= 0 || cssH <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    const pxW = Math.max(1, Math.round(cssW * dpr));
    const pxH = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== pxW) canvas.width = pxW;
    if (canvas.height !== pxH) canvas.height = pxH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawRef.current(ctx, cssW, cssH);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      sizeRef.current = { cssW: width, cssH: height };
      renderNow();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [renderNow]);

  return { canvasRef, renderNow, sizeRef };
}
