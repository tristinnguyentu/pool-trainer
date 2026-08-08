import { useCallback, useRef } from 'react';
import type { Vec2 } from '../../engine/types';

/**
 * Two-finger pinch bookkeeping, shared by both canvases: tracks live pointers by
 * id, and once two are down reports the distance ratio and midpoint so the
 * caller can scale however it likes. The caller keeps its own anchoring rule —
 * this owns only the fiddly part (pointer tracking, start snapshot, teardown).
 *
 * Every handler returns the pointer's local position so the caller can reuse it
 * without a second `getBoundingClientRect()` on the pointermove path.
 */

export interface PinchConfig<S> {
  /** Client point → whatever space the caller measures in. */
  toLocal: (clientX: number, clientY: number) => Vec2;
  /** Called when the second finger lands; return the snapshot `onPinch` needs. */
  onStart: (mid: Vec2) => S;
  onPinch: (ratio: number, mid: Vec2, start: S) => void;
}

export interface Pinch {
  down: (e: React.PointerEvent) => { pinching: boolean; local: Vec2 };
  move: (e: React.PointerEvent) => { handled: boolean; local: Vec2 };
  /** Forgets the pointer; returns how many are still down. */
  up: (e: React.PointerEvent) => number;
}

function spread(points: Iterable<Vec2>): { dist: number; mid: Vec2 } {
  const [a, b] = Array.from(points);
  return {
    dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
    mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
  };
}

export function usePinch<S>(config: PinchConfig<S>): Pinch {
  const pointers = useRef(new Map<number, Vec2>());
  const pinch = useRef<{ dist: number; start: S } | null>(null);
  // Read through a ref so the handlers stay stable while still seeing fresh state.
  const cfg = useRef(config);
  cfg.current = config;

  const down = useCallback((e: React.PointerEvent) => {
    const local = cfg.current.toLocal(e.clientX, e.clientY);
    pointers.current.set(e.pointerId, local);
    if (pointers.current.size < 2) return { pinching: false, local };
    const { dist, mid } = spread(pointers.current.values());
    pinch.current = { dist, start: cfg.current.onStart(mid) };
    return { pinching: true, local };
  }, []);

  const move = useCallback((e: React.PointerEvent) => {
    const local = cfg.current.toLocal(e.clientX, e.clientY);
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, local);
    const started = pinch.current;
    if (!started || pointers.current.size < 2) return { handled: false, local };
    const { dist, mid } = spread(pointers.current.values());
    cfg.current.onPinch(dist / started.dist, mid, started.start);
    return { handled: true, local };
  }, []);

  const up = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      pinch.current = null;
    } else if (pinch.current) {
      // Three fingers down to two: the surviving pair may not be the pair the
      // baseline was measured from, so re-anchor instead of dividing by a
      // distance that belonged to a different pair (which snaps the zoom).
      const { dist, mid } = spread(pointers.current.values());
      pinch.current = { dist, start: cfg.current.onStart(mid) };
    }
    return pointers.current.size;
  }, []);

  return { down, move, up };
}
