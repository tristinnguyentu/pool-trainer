// Geometry for the mirror-system walkthrough (banks & kicks).
// Imports only from ./constants and ./types, per the engine contract.

import { clamp01, pocketAimPoint, pocketById, railLine, reflectOverRail } from './constants';
import type { Guides, MirrorWalkthrough, Scene, Vec2 } from './types';

// Re-export the shared rail geometry for existing importers (renderers).
export { railLine, reflectOverRail } from './constants';

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
