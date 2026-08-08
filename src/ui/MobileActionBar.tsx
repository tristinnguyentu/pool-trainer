import type { PlaybackStatus } from './hooks/usePlayback';
import { outcomeKind } from './outcome';

interface MobileActionBarProps {
  status: PlaybackStatus;
  outcome: string;
  onPlay: () => void;
  onReset: () => void;
  sheetOpen: boolean;
  onToggleSheet: () => void;
  sheetId: string;
  /** What the sheet currently holds — the walkthrough takes it over mid-lesson. */
  label: string;
}

/**
 * Thumb-reachable transport for the phone layout: the predicted outcome plus
 * Play/Reset stay on screen at all times, so the loop of tweak → play → watch
 * never costs more than one tap. Everything else lives in the sheet this bar
 * opens.
 */
export function MobileActionBar({
  status,
  outcome,
  onPlay,
  onReset,
  sheetOpen,
  onToggleSheet,
  sheetId,
  label,
}: MobileActionBarProps) {
  return (
    <div className="action-bar">
      <p className="outcome-readout" data-kind={outcomeKind(outcome)}>
        {outcome}
      </p>
      <div className="action-row">
        <button
          type="button"
          className="btn btn-primary action-play"
          onClick={onPlay}
          disabled={status === 'playing'}
        >
          {status === 'settled' ? 'Replay' : 'Play'}
        </button>
        <button type="button" className="btn" onClick={onReset}>
          Reset
        </button>
        <button
          type="button"
          className="btn action-sheet-toggle"
          onClick={onToggleSheet}
          aria-expanded={sheetOpen}
          aria-controls={sheetId}
        >
          <span>{label}</span>
          <span className="action-chevron" aria-hidden="true">
            {sheetOpen ? '▾' : '▴'}
          </span>
        </button>
      </div>
    </div>
  );
}
