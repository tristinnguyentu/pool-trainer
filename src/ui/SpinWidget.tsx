import { useCallback, useEffect, useRef } from 'react';
import type { Spin } from '../engine/types';

interface SpinWidgetProps {
  spin: Spin;
  onChange: (spin: Spin) => void;
  disabled?: boolean;
}

const SIZE = 110;
const PAD = 8;
const RADIUS = SIZE / 2 - PAD;
const CENTER = SIZE / 2;

function clampToUnitCircle(sx: number, sy: number): Spin {
  const mag = Math.hypot(sx, sy);
  if (mag <= 1) return { sx, sy };
  return { sx: sx / mag, sy: sy / mag };
}

/** Small canvas drawing a cue-ball face; click/drag sets spin, double-click recenters. */
export function SpinWidget({ spin, onChange, disabled = false }: SpinWidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingRef = useRef(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const px = Math.round(SIZE * dpr);
    if (canvas.width !== px) canvas.width = px;
    if (canvas.height !== px) canvas.height = px;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);

    // ball face
    const grad = ctx.createRadialGradient(
      CENTER - RADIUS * 0.35,
      CENTER - RADIUS * 0.35,
      RADIUS * 0.1,
      CENTER,
      CENTER,
      RADIUS,
    );
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#c7c7c7');
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = disabled ? '#8a8a8a' : grad;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.stroke();

    // crosshair
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CENTER - RADIUS, CENTER);
    ctx.lineTo(CENTER + RADIUS, CENTER);
    ctx.moveTo(CENTER, CENTER - RADIUS);
    ctx.lineTo(CENTER, CENTER + RADIUS);
    ctx.stroke();

    // contact dot (sy>0 = follow/top => up on screen => negative canvas y)
    const dotX = CENTER + spin.sx * RADIUS;
    const dotY = CENTER - spin.sy * RADIUS;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#e6342f';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#7a1414';
    ctx.stroke();
  }, [spin, disabled]);

  useEffect(() => {
    draw();
  }, [draw]);

  const setFromClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const sx = (x - CENTER) / RADIUS;
      const sy = -(y - CENTER) / RADIUS;
      onChange(clampToUnitCircle(sx, sy));
    },
    [onChange],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setFromClientPoint(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || !draggingRef.current) return;
    setFromClientPoint(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    draggingRef.current = false;
  };

  const handleDoubleClick = () => {
    if (!disabled) onChange({ sx: 0, sy: 0 });
  };

  return (
    <canvas
      ref={canvasRef}
      className="spin-widget"
      style={{ width: SIZE, height: SIZE, cursor: disabled ? 'default' : 'crosshair', touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      role="slider"
      aria-label="Spin (english)"
      aria-valuetext={`side ${spin.sx.toFixed(2)}, vertical ${spin.sy.toFixed(2)}`}
    />
  );
}
