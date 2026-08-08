import { describe, expect, it } from 'vitest';
import { BALL_R, TABLE } from '../src/engine/constants';
import { cueCameraOf, cueViewProjection } from '../src/render/cueview';
import type { CueCamera, Guides, Scene } from '../src/engine/types';

/*
 * Dragging a ball in the shooter's view maps a pixel back onto the cloth, so the
 * projection has to be a true inverse of the one the renderer draws with — a
 * near-miss here shows up as a ball that slides away from the finger.
 */

const CAM: CueCamera = { cueCenter: { x: 25, y: 25 }, aimAngle: 0 };

function roundTrip(camera: CueCamera, cssW: number, cssH: number, zoom: number, p: { x: number; y: number }) {
  const proj = cueViewProjection(camera, cssW, cssH, zoom);
  const screen = proj.ballAt(p);
  expect(screen, `${JSON.stringify(p)} should project onto the screen`).not.toBeNull();
  const back = proj.tableAt({ x: screen!.x, y: screen!.y });
  expect(back, `${JSON.stringify(p)} should unproject back onto the cloth`).not.toBeNull();
  return back!;
}

describe('cue-view projection', () => {
  it('unprojects a screen point back to the table point it came from', () => {
    for (const p of [
      { x: 40, y: 25 }, // straight down the aim line
      { x: 60, y: 33 }, // off to one side
      { x: 55, y: 14 }, // off to the other
      { x: 90, y: 25 }, // far end of the table
    ]) {
      const back = roundTrip(CAM, 800, 400, 1, p);
      expect(back.x).toBeCloseTo(p.x, 6);
      expect(back.y).toBeCloseTo(p.y, 6);
    }
  });

  it('holds at every zoom level and canvas size', () => {
    const p = { x: 62, y: 31 };
    for (const zoom of [1, 1.5, 2, 3]) {
      for (const [w, h] of [
        [800, 400],
        [368, 165],
        [320, 240],
      ]) {
        const back = roundTrip(CAM, w, h, zoom, p);
        expect(back.x).toBeCloseTo(p.x, 6);
        expect(back.y).toBeCloseTo(p.y, 6);
      }
    }
  });

  it('holds when the camera is sighting down a different aim', () => {
    for (const aimAngle of [0, 0.4, -0.9, Math.PI / 2, Math.PI]) {
      const camera: CueCamera = { cueCenter: { x: 50, y: 25 }, aimAngle };
      // a point 20" ahead along that aim, which is always in view
      const p = { x: 50 + Math.cos(aimAngle) * 20, y: 25 + Math.sin(aimAngle) * 20 };
      const back = roundTrip(camera, 700, 300, 1, p);
      expect(back.x).toBeCloseTo(p.x, 6);
      expect(back.y).toBeCloseTo(p.y, 6);
    }
  });

  it('moving the pointer right moves the table point right of the aim line', () => {
    const proj = cueViewProjection(CAM, 800, 400, 1);
    const centre = proj.tableAt({ x: 400, y: 260 });
    const right = proj.tableAt({ x: 500, y: 260 });
    expect(centre).not.toBeNull();
    expect(right).not.toBeNull();
    // aim is +x, so screen-right is -y in table space
    expect(right!.y).toBeLessThan(centre!.y);
    expect(Math.abs(right!.x - centre!.x)).toBeLessThan(Math.abs(right!.y - centre!.y) + 1e-9 + 40);
  });

  it('reports no table point for a pixel above the horizon', () => {
    const proj = cueViewProjection(CAM, 800, 400, 1);
    // far above the centre line the ray tilts up and never meets the cloth
    expect(proj.tableAt({ x: 400, y: -5000 })).toBeNull();
  });

  it('derives the camera from the cue ball and the resolved aim', () => {
    const scene = {
      balls: [
        { id: 'cue', x: 30, y: 20, pocketed: false },
        { id: '1', x: 60, y: 40, pocketed: false },
      ],
    } as unknown as Scene;
    const guides = { aimAngle: 0.75 } as Guides;
    expect(cueCameraOf(scene, guides)).toEqual({ cueCenter: { x: 30, y: 20 }, aimAngle: 0.75 });
  });

  it('falls back to a usable camera when the scene or guides are unusable', () => {
    const empty = { balls: [] } as unknown as Scene;
    const cam = cueCameraOf(empty, null);
    expect(Number.isFinite(cam.cueCenter.x)).toBe(true);
    expect(Number.isFinite(cam.aimAngle)).toBe(true);
    const nanGuides = { aimAngle: Number.NaN } as Guides;
    expect(cueCameraOf(empty, nanGuides).aimAngle).toBe(0);
  });

  it('keeps a dragged ball on the table it was projected from', () => {
    // every corner of the playing surface round-trips, so a drag to any legal
    // spot lands where the finger is rather than drifting at the edges
    const camera: CueCamera = { cueCenter: { x: 12, y: 25 }, aimAngle: 0 };
    for (const p of [
      { x: BALL_R, y: BALL_R },
      { x: TABLE.W - BALL_R, y: BALL_R },
      { x: TABLE.W - BALL_R, y: TABLE.H - BALL_R },
      { x: BALL_R, y: TABLE.H - BALL_R },
    ]) {
      const proj = cueViewProjection(camera, 900, 420, 1);
      const screen = proj.ballAt(p);
      if (!screen) continue; // behind the eye at this camera, nothing to check
      const back = proj.tableAt({ x: screen.x, y: screen.y })!;
      expect(back.x).toBeCloseTo(p.x, 6);
      expect(back.y).toBeCloseTo(p.y, 6);
    }
  });
});
