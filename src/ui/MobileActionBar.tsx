import type { PlaybackStatus } from './hooks/usePlayback';
import { OutcomeReadout, PlayReset } from './Transport';

/** The two halves of the phone sheet: dial in the shot, or read about it. */
export type SheetTab = 'controls' | 'lesson';
export const TAB_LABEL: Record<SheetTab, string> = { controls: 'Aim & spin', lesson: 'Lesson' };

interface MobileActionBarProps {
  status: PlaybackStatus;
  outcome: string;
  onPlay: () => void;
  onReset: () => void;
  sheetOpen: boolean;
  /** Which half the sheet is showing — only meaningful while it is open. */
  tab: SheetTab;
  onSelectTab: (tab: SheetTab) => void;
  sheetId: string;
  /** The walkthrough takes the lesson half over mid-shot and says so. */
  lessonLabel: string;
}

/**
 * Thumb-reachable transport for the phone layout: the predicted outcome plus
 * Play/Reset stay on screen at all times, so the loop of tweak → play → watch
 * never costs more than one tap.
 *
 * Both halves of the sheet are named here rather than behind one another. A
 * single toggle labelled with whichever half you opened last hides the other
 * one completely — a phone that says "Aim & spin" gives no sign the lesson
 * text exists at all.
 */
export function MobileActionBar({
  status,
  outcome,
  onPlay,
  onReset,
  sheetOpen,
  tab,
  onSelectTab,
  sheetId,
  lessonLabel,
}: MobileActionBarProps) {
  const label: Record<SheetTab, string> = { ...TAB_LABEL, lesson: lessonLabel };

  return (
    <div className="action-bar">
      <OutcomeReadout outcome={outcome} />
      <div className="action-row">
        <PlayReset status={status} onPlay={onPlay} onReset={onReset} playClass="action-play" />
        {(['controls', 'lesson'] as SheetTab[]).map((name) => {
          const showing = sheetOpen && tab === name;
          return (
            <button
              key={name}
              type="button"
              className={showing ? 'btn action-tab action-tab-active' : 'btn action-tab'}
              onClick={() => onSelectTab(name)}
              aria-expanded={showing}
              aria-controls={sheetId}
            >
              <span>{label[name]}</span>
              <span className="action-chevron" aria-hidden="true">
                {showing ? '▾' : '▴'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
