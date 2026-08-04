// Mirror-walkthrough geometry audit: the construction the walkthrough draws
// must be consistent with the aiming guides for every bank and kick shot.

import { describe, expect, it } from 'vitest';
import { BALL_R, TABLE } from '../src/engine/constants';
import { mirrorWalkthrough, railLine, reflectOverRail } from '../src/engine/mirror';
import { computeGuides } from '../src/engine/physics';
import { buildScene, SHOTS } from '../src/engine/shots';

const bankOrKick = SHOTS.filter((s) => s.aimSpec.kind === 'bank' || s.aimSpec.kind === 'kick');

describe('mirrorWalkthrough', () => {
  it('covers all bank and kick shots in the library', () => {
    expect(bankOrKick.length).toBeGreaterThanOrEqual(6); // 4 banks + 2 kicks
  });

  for (const shotDef of bankOrKick) {
    it(`${shotDef.id}: construction geometry is consistent`, () => {
      const scene = buildScene(shotDef);
      const guides = computeGuides(scene);
      const data = mirrorWalkthrough(scene, guides);

      expect(data).not.toBeNull();
      const d = data!;

      // phantom target is exactly the guides' mirror construction point
      expect(d.phantomTarget).toEqual(guides.bankGuide!.mirror);

      // bank point sits on the rail line, within the table bounds
      const line = railLine(d.rail);
      if (line.axis === 'y') {
        expect(d.bankPoint.y).toBeCloseTo(line.value, 6);
        expect(d.bankPoint.x).toBeGreaterThanOrEqual(0);
        expect(d.bankPoint.x).toBeLessThanOrEqual(TABLE.W);
      } else {
        expect(d.bankPoint.x).toBeCloseTo(line.value, 6);
        expect(d.bankPoint.y).toBeGreaterThanOrEqual(0);
        expect(d.bankPoint.y).toBeLessThanOrEqual(TABLE.H);
      }

      // the phantom sits as far beyond the rail as the real target sits inside it
      expect(d.railDistReal).toBeGreaterThan(0);
      const phantomCoord = line.axis === 'y' ? d.phantomTarget.y : d.phantomTarget.x;
      expect(Math.abs(phantomCoord - line.value)).toBeCloseTo(d.railDistReal, 6);

      // folding the phantom back over the rail lands on the real target side
      const folded = reflectOverRail(d.phantomTarget, d.rail);
      const foldedCoord = line.axis === 'y' ? folded.y : folded.x;
      expect(Math.abs(foldedCoord - line.value)).toBeCloseTo(d.railDistReal, 6);

      // subject ball is the traveling ball (object for banks, cue for kicks)
      if (d.kind === 'bank') {
        expect(d.subjectBallId).toBe((shotDef.aimSpec as { ball: string }).ball);
        expect(d.phantomPocketCenter).not.toBeNull();
        expect(d.realPocketId).toBe((shotDef.aimSpec as { pocket: string }).pocket);
      } else {
        expect(d.subjectBallId).toBe('cue');
        expect(d.targetBallId).toBe((shotDef.aimSpec as { ball: string }).ball);
      }

      // the actual simulated rail contact happens near the constructed bank
      // point (throw compensation and the ball's radius shift it slightly)
      const railEvent = guides.events.find(
        (ev) => ev.type === 'rail' && ev.ball === d.subjectBallId && ev.rail === d.rail,
      );
      expect(railEvent).toBeTruthy();
      const path = guides.paths[d.subjectBallId];
      expect(path).toBeTruthy();
      let closest = Infinity;
      for (const p of path!) {
        closest = Math.min(closest, Math.hypot(p.x - d.bankPoint.x, p.y - d.bankPoint.y));
      }
      expect(closest).toBeLessThan(BALL_R * 3);
    });
  }

  it('returns null for non-bank/kick shots', () => {
    const cut = SHOTS.find((s) => s.aimSpec.kind === 'pocket')!;
    const scene = buildScene(cut);
    expect(mirrorWalkthrough(scene, computeGuides(scene))).toBeNull();
  });
});
