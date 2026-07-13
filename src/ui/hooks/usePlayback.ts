import { useCallback, useEffect, useRef, useState } from 'react';
import { simulate } from '../../engine/physics';
import type { Ball, Scene, SimResult } from '../../engine/types';

export type PlaybackStatus = 'idle' | 'playing' | 'settled';

export interface Playback {
  status: PlaybackStatus;
  animating: boolean;
  /** Frame positions to draw while playing/settled; null means "use scene.balls". */
  balls: Ball[] | null;
  play: () => void;
  reset: () => void;
}

/**
 * Drives shot playback as a small state machine (idle -> playing -> settled).
 * Play() runs simulate(scene) once, then a requestAnimationFrame loop advances a
 * wall-clock-derived elapsed time (scaled by `speed`) and picks the matching recorded
 * frame (frames are recorded every 1/60s by the engine). Replay just calls play() again.
 */
export function usePlayback(scene: Scene, speed: number): Playback {
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [frameBalls, setFrameBalls] = useState<Ball[] | null>(null);
  const simRef = useRef<SimResult | null>(null);
  const elapsedRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const stopLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const tick = useCallback((ts: number) => {
    const sim = simRef.current;
    if (!sim) return;
    if (lastTsRef.current == null) lastTsRef.current = ts;
    const dt = (ts - lastTsRef.current) / 1000;
    lastTsRef.current = ts;
    elapsedRef.current += dt * speedRef.current;
    const t = elapsedRef.current;
    const frames = sim.frames;
    if (frames.length === 0 || t >= sim.duration) {
      const last = frames.length > 0 ? frames[frames.length - 1] : null;
      setFrameBalls(last ? last.balls : null);
      setStatus('settled');
      lastTsRef.current = null;
      rafRef.current = null;
      return;
    }
    let idx = Math.floor(t * 60);
    if (idx >= frames.length) idx = frames.length - 1;
    if (idx < 0) idx = 0;
    setFrameBalls(frames[idx].balls);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const play = useCallback(() => {
    stopLoop();
    simRef.current = simulate(scene);
    elapsedRef.current = 0;
    lastTsRef.current = null;
    setStatus('playing');
    rafRef.current = requestAnimationFrame(tick);
  }, [scene, stopLoop, tick]);

  const reset = useCallback(() => {
    stopLoop();
    simRef.current = null;
    elapsedRef.current = 0;
    lastTsRef.current = null;
    setStatus('idle');
    setFrameBalls(null);
  }, [stopLoop]);

  // Stop any in-flight animation loop on unmount.
  useEffect(() => stopLoop, [stopLoop]);

  return { status, animating: status === 'playing', balls: frameBalls, play, reset };
}
