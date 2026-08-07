// Regression tests for defects found by adversarial physics review.
// Each test reproduces a scenario that was broken before the fix landed.

import { describe, expect, it } from 'vitest';
import { BALL_R, TABLE, pocketAimPoint } from '../src/engine/constants';
import { computeGuides, simulate } from '../src/engine/physics';
import type { Scene, ShotDef } from '../src/engine/types';

function bareScene(opts: {
  balls: { id: string; x: number; y: number }[];
  angle: number;
  power: number;
  sx?: number;
  sy?: number;
}): Scene {
  const shot: ShotDef = {
    id: 'test',
    name: 'test',
    category: 'test',
    difficulty: 1,
    description: '',
    tips: [],
    balls: opts.balls,
    aimSpec: { kind: 'angle', angle: opts.angle },
    spin: { sx: opts.sx ?? 0, sy: opts.sy ?? 0 },
    power: opts.power,
  };
  return {
    balls: opts.balls.map((b) => ({ ...b, pocketed: false })),
    shot,
    aim: { angleOffsetDeg: 0, power: opts.power, spin: { sx: opts.sx ?? 0, sy: opts.sy ?? 0 } },
  };
}

// Frame-to-frame speed estimate for one ball (frames are 1/60s apart).
function frameSpeeds(frames: { balls: { id: string; x: number; y: number }[] }[], id: string): number[] {
  const speeds: number[] = [];
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1].balls.find((b) => b.id === id)!;
    const b = frames[i].balls.find((b2) => b2.id === id)!;
    speeds.push(Math.hypot(b.x - a.x, b.y - a.y) * 60);
  }
  return speeds;
}

describe('adversarial regressions', () => {
  it('B1: a cushion never speeds the ball up, even with maximum english', () => {
    // Slow roll, max right english, near-perpendicular into the bottom rail.
    // Pre-fix this bounced off at ~1.85x the incoming speed.
    const scene = bareScene({
      balls: [{ id: 'cue', x: 50, y: 20 }],
      angle: -Math.PI / 2,
      power: 0,
      sx: 1,
    });
    const { frames } = simulate(scene);
    const speeds = frameSpeeds(frames, 'cue');
    const v0 = 30; // LAUNCH_BASE at power 0
    for (const s of speeds) {
      expect(s).toBeLessThanOrEqual(v0 * 1.05);
    }
    // and specifically: speed is (weakly) non-increasing across the bounce
    for (let i = 1; i < speeds.length; i++) {
      expect(speeds[i]).toBeLessThanOrEqual(speeds[i - 1] + 1.5);
    }
  });

  it('B2: a draw shot into a nearby rail rebounds cleanly instead of machine-gunning', () => {
    // Cue close to the left rail shooting right; max draw pulls it back into
    // the rail while the 0.55s window is still active. Pre-fix this produced
    // ~28 micro-bounces with the ball pinned at the cushion.
    const scene = bareScene({
      balls: [
        { id: 'cue', x: 3, y: 25 },
        { id: '1', x: 7.5, y: 25 },
      ],
      angle: 0,
      power: 0.5,
      sy: -1,
    });
    const { events, frames } = simulate(scene);
    const leftBounces = events.filter((e) => e.type === 'rail' && e.ball === 'cue' && e.rail === 'left');
    expect(leftBounces.length).toBeLessThanOrEqual(2);
    // ball must not end pinned against the cushion
    const last = frames[frames.length - 1].balls.find((b) => b.id === 'cue')!;
    expect(last.x).toBeGreaterThan(BALL_R + 0.5);
  });

  it('B3: full-speed shallow corner approaches capture by geometry, not substep phase', () => {
    // Straight along y = 2.8 into the bottom-left corner at max power. The
    // path passes within the 2.9" capture circle, so it must drop — pre-fix
    // the rail clamp intercepted it and capture depended on sampling phase.
    const capture = bareScene({
      balls: [{ id: 'cue', x: 60, y: 2.8 }],
      angle: Math.PI,
      power: 1,
    });
    const captured = simulate(capture);
    expect(captured.events.some((e) => e.type === 'pocket' && e.ball === 'cue' && e.pocket === 'BL')).toBe(
      true,
    );

    // Just outside the capture circle (y = 3.2): must NOT drop, must NOT
    // escape the table — it rattles off the jaw and stays in play.
    const rattle = bareScene({
      balls: [{ id: 'cue', x: 60, y: 3.2 }],
      angle: Math.PI,
      power: 1,
    });
    const rattled = simulate(rattle);
    expect(rattled.events.some((e) => e.type === 'pocket')).toBe(false);
    for (const f of rattled.frames) {
      const c = f.balls.find((b) => b.id === 'cue')!;
      expect(c.x).toBeGreaterThanOrEqual(-BALL_R);
      expect(c.x).toBeLessThanOrEqual(TABLE.W + BALL_R);
      expect(c.y).toBeGreaterThanOrEqual(-BALL_R);
      expect(c.y).toBeLessThanOrEqual(TABLE.H + BALL_R);
    }
    const last = rattled.frames[rattled.frames.length - 1].balls.find((b) => b.id === 'cue')!;
    expect(last.x).toBeGreaterThan(0);
  });

  it('C: infeasible frozen-rail aim never reverses the object ball', () => {
    // Object frozen on the left cushion, pocket far up-table to the RIGHT.
    // The true ghost point lies inside the cushion; the resolver must fall
    // back to the closest feasible departure (up the rail), never a contact
    // from the wrong side that drives the ball down/backwards.
    const scene: Scene = {
      balls: [
        { id: 'cue', x: 25, y: 25, pocketed: false },
        { id: '1', x: BALL_R, y: 25, pocketed: false },
      ],
      shot: {
        id: 't',
        name: 't',
        category: 't',
        difficulty: 1,
        description: '',
        tips: [],
        balls: [
          { id: 'cue', x: 25, y: 25 },
          { id: '1', x: BALL_R, y: 25 },
        ],
        aimSpec: { kind: 'pocket', ball: '1', pocket: 'TR' },
        spin: { sx: 0, sy: 0 },
        power: 0.5,
      },
      aim: { angleOffsetDeg: 0, power: 0.5, spin: { sx: 0, sy: 0 } },
    };
    const g = computeGuides(scene);
    expect(g.firstContactBall).toBe('1');
    // early object-ball travel direction must not oppose the desired one
    const path = g.paths['1'];
    expect(path && path.length > 1).toBe(true);
    const aim = pocketAimPoint('TR');
    const desired = { x: aim.x - BALL_R, y: aim.y - 25 };
    const dLen = Math.hypot(desired.x, desired.y);
    const early = { x: path![1].x - path![0].x, y: path![1].y - path![0].y };
    const eLen = Math.hypot(early.x, early.y);
    const dot = (early.x * desired.x + early.y * desired.y) / (dLen * eLen);
    expect(dot).toBeGreaterThanOrEqual(0);
  });
});
