import type { Guides, ShotDef } from '../engine/types';
import { pocketName } from './pocketNames';

/**
 * Predicted-outcome readout derived from the current guides. Target ball is
 * aimSpec.ball (aimSpec.second for combos); kick shots report contact instead
 * of pocketing, since a kick's job is to reach the object ball, not pot it.
 */
export function predictedOutcome(shot: ShotDef, guides: Guides): string {
  const spec = shot.aimSpec;

  if (spec.kind === 'kick') {
    const contacted = guides.events.some(
      (e) =>
        e.type === 'ball-ball' &&
        ((e.a === 'cue' && e.b === spec.ball) || (e.b === 'cue' && e.a === spec.ball)),
    );
    if (contacted) return `✓ kick contacts the ${spec.ball} ball`;
    if (guides.pocketed.includes('cue')) return '⚠ scratch — cue ball drops!';
    return `✗ kick misses the ${spec.ball} ball — adjust aim`;
  }

  const target =
    spec.kind === 'combo' ? spec.second : spec.kind === 'pocket' || spec.kind === 'bank' ? spec.ball : null;

  if (target && guides.pocketed.includes(target)) {
    const drop = guides.events.find((e) => e.type === 'pocket' && e.ball === target);
    const where = drop && drop.type === 'pocket' ? pocketName(drop.pocket) : 'pocket';
    return `✓ ${target} ball → ${where}`;
  }
  if (guides.pocketed.includes('cue')) return '⚠ scratch — cue ball drops!';
  return '✗ no ball pocketed — adjust aim';
}
