import type { MaximizedView } from './hooks/useViewSplit';

interface ViewTabsProps {
  value: MaximizedView;
  onChange: (value: MaximizedView) => void;
}

const OPTIONS: Array<{ value: MaximizedView; label: string; hint: string }> = [
  { value: 'top', label: 'Table', hint: "Bird's-eye view only" },
  { value: 'bottom', label: 'Cue view', hint: "Shooter's view only" },
  { value: null, label: 'Both', hint: 'Split the screen between both views' },
];

/**
 * Phone-sized segmented control choosing which canvas gets the screen. It drives
 * the same `maximized` state the desktop maximize buttons use, so the two never
 * disagree.
 */
export function ViewTabs({ value, onChange }: ViewTabsProps) {
  return (
    <div className="view-tabs" role="group" aria-label="Which view to show">
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.label}
            type="button"
            className={active ? 'view-tab view-tab-active' : 'view-tab'}
            aria-pressed={active}
            title={opt.hint}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
