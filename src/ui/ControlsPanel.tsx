import type { Spin } from '../engine/types';
import type { PlaybackStatus } from './hooks/usePlayback';
import { SpinWidget } from './SpinWidget';

interface ControlsPanelProps {
  status: PlaybackStatus;
  onPlay: () => void;
  onReset: () => void;
  power: number;
  onPowerChange: (power: number) => void;
  spin: Spin;
  onSpinChange: (spin: Spin) => void;
  angleOffsetDeg: number;
  onAngleChange: (deg: number) => void;
  onRecenterAim: () => void;
  showGuides: boolean;
  onToggleGuides: (show: boolean) => void;
  cueBallAlpha: number;
  onCueBallAlphaChange: (alpha: number) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  outcome: string;
}

function outcomeKind(outcome: string): 'good' | 'warn' | 'bad' {
  if (outcome.startsWith('✓')) return 'good';
  if (outcome.startsWith('⚠')) return 'warn';
  return 'bad';
}

// Plain-language description of the current tip position, so newcomers
// aren't decoding raw sx/sy numbers.
function spinWords(spin: Spin): string {
  const parts: string[] = [];
  if (spin.sy > 0.05) parts.push(`follow ${Math.round(spin.sy * 100)}%`);
  else if (spin.sy < -0.05) parts.push(`draw ${Math.round(-spin.sy * 100)}%`);
  if (spin.sx > 0.05) parts.push(`right english ${Math.round(spin.sx * 100)}%`);
  else if (spin.sx < -0.05) parts.push(`left english ${Math.round(-spin.sx * 100)}%`);
  return parts.length ? parts.join(', ') : 'center ball, no spin';
}

const blurAfterPointer = (e: React.PointerEvent<HTMLElement>) => {
  e.currentTarget.blur();
};

export function ControlsPanel({
  status,
  onPlay,
  onReset,
  power,
  onPowerChange,
  spin,
  onSpinChange,
  angleOffsetDeg,
  onAngleChange,
  onRecenterAim,
  showGuides,
  onToggleGuides,
  cueBallAlpha,
  onCueBallAlphaChange,
  speed,
  onSpeedChange,
  outcome,
}: ControlsPanelProps) {
  const animating = status === 'playing';

  return (
    <section className="card controls-panel" aria-label="Controls">
      <div className="btn-row">
        <button type="button" className="btn btn-primary" onClick={onPlay} disabled={animating}>
          {status === 'settled' ? 'Replay' : 'Play'}
        </button>
        <button type="button" className="btn" onClick={onReset}>
          Reset
        </button>
        <select
          className="speed-select"
          value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          aria-label="Playback speed"
        >
          <option value={0.5}>0.5×</option>
          <option value={1}>1×</option>
        </select>
      </div>

      <p className="outcome-readout" data-kind={outcomeKind(outcome)}>
        {outcome}
      </p>

      <label className="field">
        <span className="field-label">Power: {Math.round(power * 100)}%</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(power * 100)}
          disabled={animating}
          onChange={(e) => onPowerChange(Number(e.target.value) / 100)}
          onPointerUp={blurAfterPointer}
        />
      </label>

      <div className="field">
        <span className="field-label">Spin (where the tip strikes the cue ball)</span>
        <div className="spin-row">
          <SpinWidget spin={spin} onChange={onSpinChange} disabled={animating} />
          <span className="spin-readout">{spinWords(spin)}</span>
        </div>
        <span className="field-hint">Click or drag on the ball face. Double-click to clear.</span>
      </div>

      <label className="field">
        <span className="field-label">Aim nudge: {angleOffsetDeg.toFixed(2)}°</span>
        <input
          type="range"
          min={-8}
          max={8}
          step={0.1}
          value={angleOffsetDeg}
          disabled={animating}
          onChange={(e) => onAngleChange(Number(e.target.value))}
          onPointerUp={blurAfterPointer}
        />
        <span className="field-hint">
          Adds aiming error to the perfect aim. See how much a shot forgives.
        </span>
      </label>
      <button type="button" className="btn btn-small" onClick={onRecenterAim} disabled={animating}>
        Re-center aim
      </button>

      <label className="field">
        <span className="field-label">Cue ball opacity: {Math.round(cueBallAlpha * 100)}%</span>
        <input
          type="range"
          min={10}
          max={100}
          step={5}
          value={Math.round(cueBallAlpha * 100)}
          onChange={(e) => onCueBallAlphaChange(Number(e.target.value) / 100)}
          onPointerUp={blurAfterPointer}
        />
        <span className="field-hint">
          Fade the cue ball to see the aim line and ghost ball through it.
        </span>
      </label>

      <label className="field field-checkbox">
        <input
          type="checkbox"
          checked={showGuides}
          onChange={(e) => onToggleGuides(e.target.checked)}
        />
        <span>Show guides</span>
      </label>
    </section>
  );
}
