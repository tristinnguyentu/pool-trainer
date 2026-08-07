import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp } from '../../engine/constants';

export type MaximizedView = 'top' | 'bottom' | null;

export interface ViewSplitState {
  topShare: number;
  maximized: MaximizedView;
}

const DEFAULT_TOP_SHARE = 2 / 3; // matches the historic flex: 2 1 0 / 1 1 0 split
const MIN_TOP_SHARE = 0.25;
const MAX_TOP_SHARE = 0.85;

const STORAGE_KEY = 'pool-trainer:view-split';

function readStored(): ViewSplitState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { topShare: DEFAULT_TOP_SHARE, maximized: null };
    const parsed = JSON.parse(raw) as Partial<ViewSplitState>;
    const topShare =
      typeof parsed.topShare === 'number' && Number.isFinite(parsed.topShare)
        ? clamp(parsed.topShare, MIN_TOP_SHARE, MAX_TOP_SHARE)
        : DEFAULT_TOP_SHARE;
    const maximized = parsed.maximized === 'top' || parsed.maximized === 'bottom' ? parsed.maximized : null;
    return { topShare, maximized };
  } catch {
    return { topShare: DEFAULT_TOP_SHARE, maximized: null };
  }
}

/**
 * Owns the vertical split between the top-down and cue-view canvas wraps in the
 * trainer-mode center column: a drag-resizable fraction (topShare) plus an
 * optional single-view maximize state. Persisted to localStorage so the layout
 * survives reload.
 */
export function useViewSplit() {
  const [state, setState] = useState<ViewSplitState>(readStored);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage may be unavailable (private mode, quota); layout just won't persist.
    }
  }, [state]);

  const setTopShare = useCallback((share: number) => {
    setState((prev) => ({ ...prev, topShare: clamp(share, MIN_TOP_SHARE, MAX_TOP_SHARE) }));
  }, []);

  const resetSplit = useCallback(() => {
    setState((prev) => ({ ...prev, topShare: DEFAULT_TOP_SHARE }));
  }, []);

  const toggleMaximized = useCallback((view: 'top' | 'bottom') => {
    setState((prev) => ({ ...prev, maximized: prev.maximized === view ? null : view }));
  }, []);

  return {
    topShare: state.topShare,
    maximized: state.maximized,
    setTopShare,
    resetSplit,
    toggleMaximized,
  };
}
