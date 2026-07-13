// Shot audit — port of the manual validation that every shot in SHOTS.js pots
// its intended target under simulation. Behavior-identical engine, so these
// assertions describe the SAME outcomes that were validated in the vanilla
// build; they are not new tolerances or new physics.

import { describe, expect, it } from 'vitest';
import { computeGuides, simulate } from '../src/engine/physics';
import { buildScene, SHOTS } from '../src/engine/shots';

describe('shot audit — every shot in SHOTS pots its intended target', () => {
  for (const shotDef of SHOTS) {
    it(`${shotDef.id}: ${shotDef.name}`, () => {
      const scene = buildScene(shotDef);
      const guides = computeGuides(scene);
      const spec = shotDef.aimSpec;

      // No shot may pocket the cue ball.
      expect(guides.pocketed).not.toContain('cue');

      // The target ball must drop in the pocket the shot AIMS at — dropping
      // anywhere else (e.g. a bank swallowed by the side pocket en route)
      // means the lesson's geometry is wrong even though a ball went down.
      const dropPocket = (ball: string): string | null => {
        const ev = guides.events.find((e) => e.type === 'pocket' && e.ball === ball);
        return ev && ev.type === 'pocket' ? ev.pocket : null;
      };

      switch (spec.kind) {
        case 'pocket':
        case 'bank': {
          expect(guides.pocketed).toContain(spec.ball);
          expect(dropPocket(spec.ball)).toBe(spec.pocket);
          break;
        }
        case 'combo': {
          expect(guides.pocketed).toContain(spec.second);
          expect(dropPocket(spec.second)).toBe(spec.pocket);
          break;
        }
        case 'kick': {
          const target = spec.ball;
          const hitTarget = guides.events.some(
            (ev) => ev.type === 'ball-ball' && (ev.a === target || ev.b === target),
          );
          expect(hitTarget).toBe(true);
          break;
        }
        case 'angle': {
          // No target ball to assert against for a raw angle aim spec.
          break;
        }
        default: {
          const _exhaustive: never = spec;
          throw new Error(`unhandled aimSpec kind: ${JSON.stringify(_exhaustive)}`);
        }
      }
    });
  }

  it('carom-tangent: cue contacts at least 2 distinct object balls', () => {
    const shotDef = SHOTS.find((s) => s.id === 'carom-tangent');
    expect(shotDef).toBeTruthy();
    const scene = buildScene(shotDef!);
    const guides = computeGuides(scene);

    const contactedByCue = new Set<string>();
    for (const ev of guides.events) {
      if (ev.type !== 'ball-ball') continue;
      if (ev.a === 'cue') contactedByCue.add(ev.b);
      else if (ev.b === 'cue') contactedByCue.add(ev.a);
    }
    expect(contactedByCue.size).toBeGreaterThanOrEqual(2);
  });
});

describe('determinism', () => {
  it('simulate() is deterministic across repeated runs of the same scene', () => {
    const shotDef = SHOTS.find((s) => s.id === 'cut-30');
    expect(shotDef).toBeTruthy();
    const scene = buildScene(shotDef!);

    const r1 = simulate(scene);
    const r2 = simulate(scene);

    expect(r2.duration).toBe(r1.duration);
    expect(r2.frames).toEqual(r1.frames);
    expect(r2.events).toEqual(r1.events);
  });
});

describe('stop shot (stun)', () => {
  it('leaves the cue ball at rest near the contact point', () => {
    const shotDef = SHOTS.find((s) => s.id === 'stop-shot');
    expect(shotDef).toBeTruthy();
    const scene = buildScene(shotDef!);

    const guides = computeGuides(scene);
    expect(guides.ghost).not.toBeNull();

    const result = simulate(scene);
    const lastFrame = result.frames[result.frames.length - 1];
    const cueFinal = lastFrame.balls.find((b) => b.id === 'cue');
    expect(cueFinal).toBeTruthy();
    expect(cueFinal!.pocketed).toBe(false);

    const dist = Math.hypot(cueFinal!.x - guides.ghost!.x, cueFinal!.y - guides.ghost!.y);
    // A true stun shot transfers essentially all forward momentum to the
    // object ball at the line of centers; only sub-substep numerical creep
    // should remain.
    expect(dist).toBeLessThan(1.0);
  });
});
