import { useCallback, useEffect, useRef } from 'react';
import type { Spin } from '../engine/types';

interface SpinWidgetProps {
  spin: Spin;
  onChange: (spin: Spin) => void;
  disabled?: boolean;
  /** CSS px; grows on touch so a fingertip can place the tip precisely. */
  size?: number;
}

const PAD = 8;

function clampToUnitCircle(sx: number, sy: number): Spin {
  const mag = Math.hypot(sx, sy);
  if (mag <= 1) return { sx, sy };
  return { sx: sx / mag, sy: sy / mag };
}

/** Small canvas drawing a cue-ball face; click/drag sets spin, double-click recenters. */
export function SpinWidget({ spin, onChange, disabled = false, size = 110 }: SpinWidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingRef = useRef(false);

  const center = size / 2;
  const radius = size / 2 - PAD;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const px = Math.round(size * dpr);
    if (canvas.width !== px) canvas.width = px;
    if (canvas.height !== px) canvas.height = px;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    // ball face
    const grad = ctx.createRadialGradient(
      center - radius * 0.35,
      center - radius * 0.35,
      radius * 0.1,
      center,
      center,
      radius,
    );
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#c7c7c7');
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = disabled ? '#8a8a8a' : grad;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.stroke();

    // crosshair
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(center - radius, center);
    ctx.lineTo(center + radius, center);
    ctx.moveTo(center, center - radius);
    ctx.lineTo(center, center + radius);
    ctx.stroke();

    // contact dot (sy>0 = follow/top => up on screen => negative canvas y)
    const dotX = center + spin.sx * radius;
    const dotY = center - spin.sy * radius;
    ctx.beginPath();
    ctx.arc(dotX, dotY, Math.max(5, size / 22), 0, Math.PI * 2);
    ctx.fillStyle = '#e6342f';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#7a1414';
    ctx.stroke();
  }, [spin, disabled, size, center, radius]);

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
      const sx = (x - center) / radius;
      const sy = -(y - center) / radius;
      onChange(clampToUnitCircle(sx, sy));
    },
    [onChange, center, radius],
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
    <div className="spin-face">
      <span className="spin-cardinal spin-n">follow</span>
      <span className="spin-cardinal spin-s">draw</span>
      <span className="spin-cardinal spin-w">left</span>
      <span className="spin-cardinal spin-e">right</span>
      <canvas
        ref={canvasRef}
        className="spin-widget"
        style={{ width: size, height: size, cursor: disabled ? 'default' : 'crosshair' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        role="slider"
        aria-label="Spin (english)"
        aria-valuetext={`side ${spin.sx.toFixed(2)}, vertical ${spin.sy.toFixed(2)}`}
      />
    </div>
  );
}
