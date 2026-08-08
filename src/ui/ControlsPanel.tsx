import type { Spin } from '../engine/types';
import type { PlaybackStatus } from './hooks/usePlayback';
import { SpinWidget } from './SpinWidget';
import { OutcomeReadout, PlayReset, SpeedSelect } from './Transport';

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
  ghostAlpha: number;
  onGhostAlphaChange: (alpha: number) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  outcome: string;
  /** Phone layout keeps Play/Reset/outcome in the always-visible action bar instead. */
  showTransport?: boolean;
  /** Coarse pointer: bigger spin face, gesture wording instead of double-click. */
  touch?: boolean;
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

const AIM_STEP = 0.25;

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
  ghostAlpha,
  onGhostAlphaChange,
  speed,
  onSpeedChange,
  outcome,
  showTransport = true,
  touch = false,
}: ControlsPanelProps) {
  const animating = status === 'playing';
  const speedSelect = <SpeedSelect speed={speed} onChange={onSpeedChange} />;

  return (
    <section className="card controls-panel" aria-label="Controls">
      {showTransport && (
        <>
          <div className="btn-row">
            <PlayReset status={status} onPlay={onPlay} onReset={onReset} />
            {speedSelect}
          </div>
          <OutcomeReadout outcome={outcome} />
        </>
      )}

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
          <SpinWidget spin={spin} onChange={onSpinChange} disabled={animating} size={touch ? 132 : 110} />
          <div className="spin-side">
            <span className="spin-readout">{spinWords(spin)}</span>
            <button
              type="button"
              className="btn btn-small"
              onClick={() => onSpinChange({ sx: 0, sy: 0 })}
              disabled={animating || (spin.sx === 0 && spin.sy === 0)}
            >
              Center tip
            </button>
          </div>
        </div>
        <span className="field-hint">
          {touch ? 'Tap or drag on the ball face to move the tip.' : 'Click or drag on the ball face.'}
        </span>
      </div>

      <div className="field">
        <span className="field-label" id="aim-nudge-label">
          Aim nudge: {angleOffsetDeg.toFixed(2)}°
        </span>
        <div className="stepper-row">
          <button
            type="button"
            className="stepper-btn"
            aria-label={`Nudge aim left by ${AIM_STEP} degrees`}
            disabled={animating}
            onClick={() => onAngleChange(angleOffsetDeg - AIM_STEP)}
          >
            −
          </button>
          <input
            type="range"
            min={-8}
            max={8}
            step={0.1}
            value={angleOffsetDeg}
            disabled={animating}
            aria-labelledby="aim-nudge-label"
            onChange={(e) => onAngleChange(Number(e.target.value))}
            onPointerUp={blurAfterPointer}
          />
          <button
            type="button"
            className="stepper-btn"
            aria-label={`Nudge aim right by ${AIM_STEP} degrees`}
            disabled={animating}
            onClick={() => onAngleChange(angleOffsetDeg + AIM_STEP)}
          >
            +
          </button>
        </div>
        <div className="field-foot">
          <span className="field-hint">
            Adds aiming error to the perfect aim. See how much a shot forgives.
          </span>
          <button
            type="button"
            className="btn btn-small"
            onClick={onRecenterAim}
            disabled={animating || angleOffsetDeg === 0}
          >
            Re-center
          </button>
        </div>
      </div>

      <label className="field">
        <span className="field-label">Ghost ball opacity: {Math.round(ghostAlpha * 100)}%</span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(ghostAlpha * 100)}
          onChange={(e) => onGhostAlphaChange(Number(e.target.value) / 100)}
          onPointerUp={blurAfterPointer}
        />
        <span className="field-hint">
          How strongly the aim target shows: solid ball, faint outline, or hidden at zero.
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

      {/* Transport lives in the phone action bar, but speed still belongs here. */}
      {!showTransport && (
        <label className="field field-inline">
          <span className="field-label">Playback speed</span>
          {speedSelect}
        </label>
      )}
    </section>
  );
}
