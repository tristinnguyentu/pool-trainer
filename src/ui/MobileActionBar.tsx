import type { PlaybackStatus } from './hooks/usePlayback';
import { OutcomeReadout, PlayReset } from './Transport';

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
      <OutcomeReadout outcome={outcome} />
      <div className="action-row">
        <PlayReset status={status} onPlay={onPlay} onReset={onReset} playClass="action-play" />
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
