import { useEffect, useState } from 'react';

/**
 * Breakpoints. These MUST stay in sync with the matching media queries in
 * styles.css — CSS owns the layout, these flags own the behaviour (which
 * chrome renders, whether the sidebar is a drawer, etc.).
 *
 *   compact  phone-sized: single column, sidebar drawer, docked transport.
 *            Either narrow, or short-and-not-wide — the second arm catches big
 *            phones held sideways (a 932x430 Pro Max is a phone, not a tablet)
 *            without dragging a short desktop window into the phone layout.
 *   drawer   (<= 1099px) phone + small tablet: sidebar collapses to a drawer
 *   rail     compact and sideways: the dock moves to a right-hand rail and the
 *            two views sit side by side instead of stacked
 */
export const COMPACT_QUERY = '(max-width: 859px), (max-width: 1099px) and (max-height: 560px)';
export const DRAWER_QUERY = '(max-width: 1099px)';
export const RAIL_QUERY = '(max-width: 1099px) and (orientation: landscape) and (max-height: 560px)';
export const COARSE_QUERY = '(pointer: coarse)';

function matchNow(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(query).matches;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => matchNow(query));

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange(); // resize may have happened between render and effect
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export interface LayoutMode {
  /** Phone-sized: single column with a docked sheet for controls. */
  compact: boolean;
  /** Phone or small tablet: the shot library lives behind a hamburger. */
  drawerLayout: boolean;
  /** Phone held sideways: controls in a side rail, views side by side. */
  sideRail: boolean;
  /** Touch/pen primary input: grow hit targets, swap keyboard hints for gestures. */
  coarse: boolean;
}

export function useLayoutMode(): LayoutMode {
  const compact = useMediaQuery(COMPACT_QUERY);
  const drawerLayout = useMediaQuery(DRAWER_QUERY);
  const sideRail = useMediaQuery(RAIL_QUERY);
  const coarse = useMediaQuery(COARSE_QUERY);
  return { compact, drawerLayout: drawerLayout || compact, sideRail, coarse };
}

/** True on the very first paint too, so initial state can branch on it. */
export function isCompactNow(): boolean {
  return matchNow(COMPACT_QUERY);
}
