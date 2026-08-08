import type { PlaybackStatus } from './hooks/usePlayback';
import { outcomeKind } from './outcome';

/**
 * The playback transport, shared by the desktop controls panel and the phone
 * action bar so the two can't drift on labels or disabled rules.
 */

export function OutcomeReadout({ outcome }: { outcome: string }) {
  return (
    <p className="outcome-readout" data-kind={outcomeKind(outcome)}>
      {outcome}
    </p>
  );
}

interface PlayResetProps {
  status: PlaybackStatus;
  onPlay: () => void;
  onReset: () => void;
  /** Extra class on the Play button, for layouts that size it differently. */
  playClass?: string;
}

export function PlayReset({ status, onPlay, onReset, playClass }: PlayResetProps) {
  return (
    <>
      <button
        type="button"
        className={playClass ? `btn btn-primary ${playClass}` : 'btn btn-primary'}
        onClick={onPlay}
        disabled={status === 'playing'}
      >
        {status === 'settled' ? 'Replay' : 'Play'}
      </button>
      <button type="button" className="btn" onClick={onReset}>
        Reset
      </button>
    </>
  );
}

export function SpeedSelect({ speed, onChange }: { speed: number; onChange: (speed: number) => void }) {
  return (
    <select
      className="speed-select"
      value={speed}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label="Playback speed"
    >
      <option value={0.5}>0.5×</option>
      <option value={1}>1×</option>
    </select>
  );
}
