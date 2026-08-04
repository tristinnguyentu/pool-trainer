// Geometry for the mirror-system walkthrough (banks & kicks).
// Imports only from ./constants and ./types, per the engine contract.

import { BALL_R, TABLE, pocketAimPoint, pocketById } from './constants';
import type { Guides, MirrorWalkthrough, RailName, Scene, Vec2 } from './types';

interface RailLine {
  axis: 'x' | 'y';
  value: number;
}

/** The rail line a ball center reflects across (inset by BALL_R). */
export function railLine(rail: RailName): RailLine {
  switch (rail) {
    case 'top':
      return { axis: 'y', value: TABLE.H - BALL_R };
    case 'bottom':
      return { axis: 'y', value: BALL_R };
    case 'left':
      return { axis: 'x', value: BALL_R };
    case 'right':
      return { axis: 'x', value: TABLE.W - BALL_R };
  }
}

/** Reflect a point across the given rail line. */
export function reflectOverRail(p: Vec2, rail: RailName): Vec2 {
  const line = railLine(rail);
  return line.axis === 'y' ? { x: p.x, y: 2 * line.value - p.y } : { x: 2 * line.value - p.x, y: p.y };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function mirrorWalkthrough(scene: Scene, guides: Guides | null): MirrorWalkthrough | null {
  const spec = scene?.shot?.aimSpec;
  if (!spec || (spec.kind !== 'bank' && spec.kind !== 'kick')) return null;
  const bankGuide = guides?.bankGuide;
  if (!bankGuide) return null;

  const rail = bankGuide.rail;
  const subjectBallId = spec.kind === 'bank' ? spec.ball : 'cue';
  const subject = scene.balls.find((b) => b.id === subjectBallId && !b.pocketed);
  if (!subject) return null;

  const phantomTarget = bankGuide.mirror;

  // Where the straight subject -> phantom line crosses the rail line.
  const line = railLine(rail);
  const from = line.axis === 'y' ? subject.y : subject.x;
  const to = line.axis === 'y' ? phantomTarget.y : phantomTarget.x;
  const denom = to - from;
  const t = Math.abs(denom) < 1e-9 ? 0.5 : clamp01((line.value - from) / denom);
  const bankPoint: Vec2 = {
    x: subject.x + (phantomTarget.x - subject.x) * t,
    y: subject.y + (phantomTarget.y - subject.y) * t,
  };

  if (spec.kind === 'bank') {
    const pocket = pocketById(spec.pocket);
    if (!pocket) return null;
    const aim = pocketAimPoint(spec.pocket);
    const realCoord = line.axis === 'y' ? aim.y : aim.x;
    return {
      kind: 'bank',
      rail,
      subjectBallId,
      phantomTarget,
      phantomPocketCenter: reflectOverRail({ x: pocket.x, y: pocket.y }, rail),
      realPocketId: spec.pocket,
      targetBallId: null,
      bankPoint,
      railDistReal: Math.abs(realCoord - line.value),
    };
  }

  const target = scene.balls.find((b) => b.id === spec.ball && !b.pocketed);
  if (!target) return null;
  const realCoord = line.axis === 'y' ? target.y : target.x;
  return {
    kind: 'kick',
    rail,
    subjectBallId,
    phantomTarget,
    phantomPocketCenter: null,
    realPocketId: null,
    targetBallId: spec.ball,
    bankPoint,
    railDistReal: Math.abs(realCoord - line.value),
  };
}
