// Aiming math + deterministic shot simulation.
// Imports ONLY from ./constants.ts. Pure & deterministic (no Date.now/Math.random).

import { TABLE, BALL_R, POCKETS, pocketAimPoint } from './constants';
import type { AimSpec, Ball, Frame, Guides, RailName, Scene, SimEvent, SimResult, Spin, Vec2 } from './types';

const DT = 1 / 240;
const FRAME_DT = 1 / 60;
const MAX_T = 12;
const FRICTION = 15; // in/s^2
const STOP_SPEED = 1; // in/s snap threshold
const LAUNCH_BASE = 30;
const LAUNCH_SCALE = 170;
const RAIL_NORMAL_RESTITUTION = 0.75;
// Tangential retention matches normal restitution so a spinless rebound is
// angle-true — the mirror system used for bank/kick aiming holds exactly.
const RAIL_TANGENT_RETENTION = 0.75;
const SPIN_DECAY_TAU = 2.0;
const SPIN_RAIL_BLEND = 0.25; // (1 - blend) must equal RAIL_TANGENT_RETENTION
const SPIN_RAIL_DECAY = 0.6;
const FOLLOW_DRAW_ACCEL = 95; // in/s^2
const FOLLOW_DRAW_WINDOW = 0.55; // s
const THROW_BASE_DEG = 4.5;
const THROW_SPIN_DEG = 3.0;
const THROW_CLAMP_DEG = 6;

// ---------- small vector helpers ----------

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function clamp01(v: number): number {
  return clamp(v, 0, 1);
}

function vecLen(x: number, y: number): number {
  return Math.hypot(x, y);
}

function normalizeVec(x: number, y: number): Vec2 {
  const len = vecLen(x, y);
  if (len < 1e-9) return { x: 1, y: 0 };
  return { x: x / len, y: y / len };
}

function findBall<T extends { id: string }>(balls: T[] | null | undefined, id: string): T | null {
  if (!Array.isArray(balls)) return null;
  return balls.find((b) => b.id === id) || null;
}

function angleBetweenPoints(from: Vec2, to: Vec2): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (vecLen(dx, dy) < 1e-9) return 0;
  return Math.atan2(dy, dx);
}

// ---------- exported aiming API ----------

export function ghostBallPos(ball: Vec2 | null | undefined, targetPoint: Vec2 | null | undefined): Vec2 {
  if (!ball) return { x: 0, y: 0 };
  if (!targetPoint) return { x: ball.x, y: ball.y };
  const dx = targetPoint.x - ball.x;
  const dy = targetPoint.y - ball.y;
  const len = vecLen(dx, dy);
  if (len < 1e-9) return { x: ball.x, y: ball.y };
  const nx = dx / len;
  const ny = dy / len;
  return { x: ball.x - 2 * BALL_R * nx, y: ball.y - 2 * BALL_R * ny };
}

export function mirrorPoint(p: Vec2 | null | undefined, rail: RailName): Vec2 {
  if (!p) return { x: 0, y: 0 };
  switch (rail) {
    case 'top': {
      const line = TABLE.H - BALL_R;
      return { x: p.x, y: 2 * line - p.y };
    }
    case 'bottom': {
      const line = BALL_R;
      return { x: p.x, y: 2 * line - p.y };
    }
    case 'left': {
      const line = BALL_R;
      return { x: 2 * line - p.x, y: p.y };
    }
    case 'right': {
      const line = TABLE.W - BALL_R;
      return { x: 2 * line - p.x, y: p.y };
    }
    default:
      return { x: p.x, y: p.y };
  }
}

// Ghost-ball aim at `target`, corrected for the throw the simulation will
// apply at contact (same formula as runSim). We want the object ball to
// DEPART toward the target after throw rotates it, so pick the line of
// centers n̂ = rotate(desired, -throw) and iterate: throw depends on the cut
// angle, which depends on the aim, which depends on the throw. Converges in
// a couple of rounds.
function compensatedGhost(cue: Vec2, ball: Vec2, target: Vec2, spin: Spin | null | undefined): Vec2 {
  const sx = spin && typeof spin.sx === 'number' ? spin.sx : 0;
  const sy = spin && typeof spin.sy === 'number' ? spin.sy : 0;
  const d = normalizeVec(target.x - ball.x, target.y - ball.y);
  let u = d;
  for (let i = 0; i < 3; i++) {
    const ghost = { x: ball.x - 2 * BALL_R * u.x, y: ball.y - 2 * BALL_R * u.y };
    const v = normalizeVec(ghost.x - cue.x, ghost.y - cue.y);
    const vt = v.x * -u.y + v.y * u.x; // dot(v̂, rot90ccw(n̂)) = signed sin(cut)
    let throwDeg = THROW_BASE_DEG * vt * (1 - 0.3 * Math.abs(sy)) + THROW_SPIN_DEG * sx;
    throwDeg = clamp(throwDeg, -THROW_CLAMP_DEG, THROW_CLAMP_DEG);
    const r = (-throwDeg * Math.PI) / 180;
    u = { x: d.x * Math.cos(r) - d.y * Math.sin(r), y: d.x * Math.sin(r) + d.y * Math.cos(r) };
  }
  // The cue ball can only occupy the rail-inset box; a compensated ghost
  // outside it (object frozen to a cushion) would make the cue graze the
  // rail before contact. Clamp and accept the residual throw error.
  return {
    x: clamp(ball.x - 2 * BALL_R * u.x, BALL_R, TABLE.W - BALL_R),
    y: clamp(ball.y - 2 * BALL_R * u.y, BALL_R, TABLE.H - BALL_R),
  };
}

export function resolveAimAngle(
  aimSpec: AimSpec | null | undefined,
  balls: Ball[],
  spin?: Spin,
): number {
  if (!aimSpec) return 0;
  const cue = findBall(balls, 'cue');
  if (!cue) return 0;

  try {
    switch (aimSpec.kind) {
      case 'angle': {
        return typeof aimSpec.angle === 'number' ? aimSpec.angle : 0;
      }
      case 'pocket': {
        const ball = findBall(balls, aimSpec.ball);
        if (!ball) return 0;
        const aim = pocketAimPoint(aimSpec.pocket);
        if (!aim) return 0;
        const ghost = compensatedGhost(cue, ball, aim, spin);
        return angleBetweenPoints(cue, ghost);
      }
      case 'bank': {
        const ball = findBall(balls, aimSpec.ball);
        if (!ball) return 0;
        const aim = pocketAimPoint(aimSpec.pocket);
        if (!aim) return 0;
        const mirrored = mirrorPoint(aim, aimSpec.rail);
        const ghost = compensatedGhost(cue, ball, mirrored, spin);
        return angleBetweenPoints(cue, ghost);
      }
      case 'kick': {
        const target = findBall(balls, aimSpec.ball);
        if (!target) return 0;
        const mirrored = mirrorPoint({ x: target.x, y: target.y }, aimSpec.rail);
        return angleBetweenPoints(cue, mirrored);
      }
      case 'combo': {
        const first = findBall(balls, aimSpec.first);
        const second = findBall(balls, aimSpec.second);
        if (!first || !second) return 0;
        const aim = pocketAimPoint(aimSpec.pocket);
        if (!aim) return 0;
        // first->second contact is a plain (throw-free) collision in the sim,
        // so only the cue->first leg needs compensation.
        const g2 = ghostBallPos(second, aim);
        const ghost = compensatedGhost(cue, first, g2, spin);
        return angleBetweenPoints(cue, ghost);
      }
      default:
        return 0;
    }
  } catch {
    return 0;
  }
}

export function aimAngle(scene: Scene | null | undefined): number {
  if (!scene || !scene.shot) return 0;
  const spin = (scene.aim && scene.aim.spin) || undefined;
  const base = resolveAimAngle(scene.shot.aimSpec, scene.balls, spin);
  const offsetDeg =
    scene.aim && typeof scene.aim.angleOffsetDeg === 'number' ? scene.aim.angleOffsetDeg : 0;
  return base + (offsetDeg * Math.PI) / 180;
}

// ---------- simulation core ----------

interface SimBall {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  pocketed: boolean;
}

function snapshotBall(b: SimBall): Ball {
  return { id: b.id, x: b.x, y: b.y, pocketed: b.pocketed };
}

function findPocketAt(b: SimBall) {
  for (const p of POCKETS) {
    if (vecLen(b.x - p.x, b.y - p.y) <= p.r) return p;
  }
  return null;
}

// `skipSnap` is used while an external force (follow/draw acceleration) is
// actively driving the ball this substep: rolling friction still bleeds
// speed, but we don't snap sub-threshold speeds to zero, or the friction
// snap would cancel the small per-substep acceleration before it can ever
// build up momentum.
function applyFriction(b: SimBall, dt: number, skipSnap: boolean): void {
  const speed = vecLen(b.vx, b.vy);
  if (speed <= 0) return;
  let newSpeed = speed - FRICTION * dt;
  if (newSpeed <= 0) {
    newSpeed = 0;
  } else if (!skipSnap && newSpeed < STOP_SPEED) {
    newSpeed = 0;
  }
  if (newSpeed <= 0) {
    b.vx = 0;
    b.vy = 0;
  } else {
    const scale = newSpeed / speed;
    b.vx *= scale;
    b.vy *= scale;
  }
}

interface Contact {
  ghost: Vec2;
  firstContactBall: string;
  cutAngleDeg: number;
  fraction: number;
}

interface RunSimResult {
  frames: Frame[];
  events: SimEvent[];
  duration: number;
  contact: Contact | null;
}

// Runs the full deterministic simulation once. Returns frames/events/duration
// plus analytic contact info captured at the cue ball's first ball-ball hit.
function runSim(scene: Scene | null | undefined): RunSimResult {
  const power = clamp01(scene && scene.aim && typeof scene.aim.power === 'number' ? scene.aim.power : 0.5);
  const spin = (scene && scene.aim && scene.aim.spin) || ({} as Partial<Spin>);
  const sx = typeof spin.sx === 'number' ? spin.sx : 0;
  const sy = typeof spin.sy === 'number' ? spin.sy : 0;
  const angle = aimAngle(scene);

  const srcBalls: Ball[] = scene && Array.isArray(scene.balls) ? scene.balls : [];
  const balls: SimBall[] = srcBalls.map((b) => ({
    id: b.id,
    x: b.x,
    y: b.y,
    vx: 0,
    vy: 0,
    pocketed: !!b.pocketed,
  }));

  const events: SimEvent[] = [];
  const frames: Frame[] = [];
  frames.push({ t: 0, balls: balls.map(snapshotBall) });

  const cue = findBall(balls, 'cue');
  if (!cue || cue.pocketed) {
    return { frames, events, duration: 0, contact: null };
  }

  const v0 = LAUNCH_BASE + LAUNCH_SCALE * power;
  cue.vx = v0 * Math.cos(angle);
  cue.vy = v0 * Math.sin(angle);

  let w = sx * 30; // side-spin scalar, cue ball only
  let firstContactTime: number | null = null;
  let firstContactDir: Vec2 | null = null;
  let contact: Contact | null = null;

  function applyRailBounce(b: SimBall, n: Vec2): void {
    const tx = -n.y;
    const ty = n.x;
    const vn = b.vx * n.x + b.vy * n.y;
    const vt = b.vx * tx + b.vy * ty;
    const vnOut = -RAIL_NORMAL_RESTITUTION * vn;
    let vtOut: number;
    if (b.id === 'cue') {
      const slip = vt - w * BALL_R * 6;
      vtOut = vt - SPIN_RAIL_BLEND * slip;
      w *= SPIN_RAIL_DECAY;
    } else {
      vtOut = RAIL_TANGENT_RETENTION * vt;
    }
    b.vx = vnOut * n.x + vtOut * tx;
    b.vy = vnOut * n.y + vtOut * ty;
  }

  function reflectRailFor(b: SimBall): RailName[] {
    const hits: RailName[] = [];
    const R = BALL_R;
    if (b.x < R) {
      b.x = R;
      applyRailBounce(b, { x: 1, y: 0 });
      hits.push('left');
    } else if (b.x > TABLE.W - R) {
      b.x = TABLE.W - R;
      applyRailBounce(b, { x: -1, y: 0 });
      hits.push('right');
    }
    if (b.y < R) {
      b.y = R;
      applyRailBounce(b, { x: 0, y: 1 });
      hits.push('bottom');
    } else if (b.y > TABLE.H - R) {
      b.y = TABLE.H - R;
      applyRailBounce(b, { x: 0, y: -1 });
      hits.push('top');
    }
    return hits;
  }

  let t = 0;
  let frameIndex = 1; // frame 0 already pushed at t=0

  while (t <= MAX_T) {
    t += DT;

    // side-spin decay (cue only)
    if (!cue.pocketed) w *= Math.exp(-DT / SPIN_DECAY_TAU);

    // follow/draw acceleration window (cue only, after first contact)
    const cueAccelActive =
      firstContactTime !== null && !cue.pocketed && t - firstContactTime <= FOLLOW_DRAW_WINDOW && sy !== 0;
    if (cueAccelActive && firstContactDir) {
      const a = sy * FOLLOW_DRAW_ACCEL;
      cue.vx += a * DT * firstContactDir.x;
      cue.vy += a * DT * firstContactDir.y;
    }

    // friction
    for (const b of balls) {
      if (b.pocketed) continue;
      applyFriction(b, DT, b === cue && cueAccelActive);
    }

    // integrate
    for (const b of balls) {
      if (!b.pocketed) {
        b.x += b.vx * DT;
        b.y += b.vy * DT;
      }
    }

    // pockets first
    for (const b of balls) {
      if (b.pocketed) continue;
      const p = findPocketAt(b);
      if (p) {
        b.pocketed = true;
        b.vx = 0;
        b.vy = 0;
        events.push({ t, type: 'pocket', ball: b.id, pocket: p.id });
      }
    }

    // rails
    for (const b of balls) {
      if (b.pocketed) continue;
      const hits = reflectRailFor(b);
      for (const railName of hits) {
        events.push({ t, type: 'rail', ball: b.id, rail: railName });
      }
    }

    // ball-ball collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        if (a.pocketed || b.pocketed) continue;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = vecLen(dx, dy);
        if (dist <= 0 || dist > 2 * BALL_R) continue;
        let nx = dx / dist;
        let ny = dy / dist;
        const closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (closing <= 1e-9) continue;

        // Rewind to the exact time of impact within this substep. At these
        // speeds a ball moves a large fraction of its radius per substep, so
        // the overlap-detected line of centers can be several degrees off the
        // true contact normal — enough to turn makeable shots into misses.
        // Solve |q - r*tau| = 2R for the rewind time tau (q = rel pos,
        // r = rel vel); overlap guarantees one positive root.
        let rewoundTau = 0;
        {
          const qx = a.x - b.x;
          const qy = a.y - b.y;
          const rx = a.vx - b.vx;
          const ry = a.vy - b.vy;
          const A = rx * rx + ry * ry;
          const B = -2 * (qx * rx + qy * ry);
          const C = qx * qx + qy * qy - 4 * BALL_R * BALL_R;
          if (A > 1e-12) {
            const disc = B * B - 4 * A * C;
            if (disc > 0) {
              const tau = clamp((-B + Math.sqrt(disc)) / (2 * A), 0, DT);
              a.x -= a.vx * tau;
              a.y -= a.vy * tau;
              b.x -= b.vx * tau;
              b.y -= b.vy * tau;
              dx = b.x - a.x;
              dy = b.y - a.y;
              dist = vecLen(dx, dy);
              if (dist > 1e-9) {
                nx = dx / dist;
                ny = dy / dist;
              }
              rewoundTau = tau; // re-advanced with post-collision velocities below
            }
          }
        }

        const tx = -ny;
        const ty = nx;
        const van = a.vx * nx + a.vy * ny;
        const vat = a.vx * tx + a.vy * ty;
        const vbn = b.vx * nx + b.vy * ny;
        const vbt = b.vx * tx + b.vy * ty;

        // equal-mass collision: normal components swap, tangential retained
        let newA = { x: vbn * nx + vat * tx, y: vbn * ny + vat * ty };
        let newB = { x: van * nx + vbt * tx, y: van * ny + vbt * ty };

        const isCueA = a.id === 'cue';
        const isCueB = b.id === 'cue';

        if (isCueA || isCueB) {
          const cueBall = isCueA ? a : b;
          const preVx = cueBall.vx;
          const preVy = cueBall.vy;
          const preSpeed = vecLen(preVx, preVy);

          // n pointing cue -> object
          const ncx = isCueA ? nx : -nx;
          const ncy = isCueA ? ny : -ny;
          const tcx = -ncy;
          const tcy = ncx;
          const vt = preVx * tcx + preVy * tcy;

          let throwDeg = 0;
          if (preSpeed > 1e-9) {
            throwDeg = THROW_BASE_DEG * (vt / preSpeed) * (1 - 0.3 * Math.abs(sy)) + THROW_SPIN_DEG * sx;
            throwDeg = clamp(throwDeg, -THROW_CLAMP_DEG, THROW_CLAMP_DEG);
          }
          const rad = (throwDeg * Math.PI) / 180;
          const cosr = Math.cos(rad);
          const sinr = Math.sin(rad);

          const objNew = isCueA ? newB : newA;
          const rotated = { x: objNew.x * cosr - objNew.y * sinr, y: objNew.x * sinr + objNew.y * cosr };
          if (isCueA) newB = rotated;
          else newA = rotated;

          events.push({ t, type: 'ball-ball', a: a.id, b: b.id });

          if (firstContactTime === null) {
            firstContactTime = t;
            const dir = preSpeed > 1e-9 ? { x: preVx / preSpeed, y: preVy / preSpeed } : normalizeVec(Math.cos(angle), Math.sin(angle));
            firstContactDir = dir;
            const objBall = isCueA ? b : a;
            const ghost = { x: cueBall.x, y: cueBall.y };
            const departure = isCueA ? newB : newA;
            const depNorm = normalizeVec(departure.x, departure.y);
            const dotProd = clamp(dir.x * depNorm.x + dir.y * depNorm.y, -1, 1);
            const cutRad = Math.acos(dotProd);
            const cutAngleDeg = (cutRad * 180) / Math.PI;
            const fraction = clamp01(1 - Math.sin(cutRad));
            contact = {
              ghost,
              firstContactBall: objBall.id,
              cutAngleDeg,
              fraction,
            };
          }
        } else {
          events.push({ t, type: 'ball-ball', a: a.id, b: b.id });
        }

        a.vx = newA.x;
        a.vy = newA.y;
        b.vx = newB.x;
        b.vy = newB.y;

        // finish the substep from the exact contact time with new velocities
        if (rewoundTau > 0) {
          a.x += a.vx * rewoundTau;
          a.y += a.vy * rewoundTau;
          b.x += b.vx * rewoundTau;
          b.y += b.vy * rewoundTau;
        }
      }
    }

    // record frames on the 1/60s grid
    while (frameIndex * FRAME_DT <= t + 1e-9) {
      frames.push({ t: frameIndex * FRAME_DT, balls: balls.map(snapshotBall) });
      frameIndex++;
    }

    const allStopped = balls.every((b) => b.pocketed || (b.vx === 0 && b.vy === 0));
    if (allStopped) {
      const last = frames[frames.length - 1];
      if (!last || Math.abs(last.t - t) > 1e-9) {
        frames.push({ t, balls: balls.map(snapshotBall) });
      }
      break;
    }
  }

  const duration = frames.length ? frames[frames.length - 1].t : 0;
  return { frames, events, duration, contact };
}

export function simulate(scene: Scene): SimResult {
  const r = runSim(scene);
  return { frames: r.frames, events: r.events, duration: r.duration };
}

export function computeGuides(scene: Scene): Guides {
  const angle = aimAngle(scene);
  const r = runSim(scene);

  const paths: Record<string, Vec2[]> = {};
  const srcBalls: Ball[] = scene && Array.isArray(scene.balls) ? scene.balls : [];
  for (const b0 of srcBalls) {
    const id = b0.id;
    const pts: Vec2[] = [{ x: b0.x, y: b0.y }];
    for (const f of r.frames) {
      const fb = f.balls.find((x) => x.id === id);
      if (!fb) continue;
      const last = pts[pts.length - 1];
      if (vecLen(fb.x - last.x, fb.y - last.y) > 1e-4) {
        pts.push({ x: fb.x, y: fb.y });
      }
    }
    if (pts.length > 1) paths[id] = pts;
  }

  const pocketed: string[] = [];
  for (const ev of r.events) if (ev.type === 'pocket') pocketed.push(ev.ball);

  let bankGuide: Guides['bankGuide'] = null;
  const spec = scene && scene.shot && scene.shot.aimSpec;
  if (spec && spec.kind === 'bank') {
    const aim = pocketAimPoint(spec.pocket);
    if (aim) bankGuide = { mirror: mirrorPoint(aim, spec.rail), rail: spec.rail };
  } else if (spec && spec.kind === 'kick') {
    const target = findBall(srcBalls, spec.ball);
    if (target) bankGuide = { mirror: mirrorPoint({ x: target.x, y: target.y }, spec.rail), rail: spec.rail };
  }

  return {
    aimAngle: angle,
    ghost: r.contact ? r.contact.ghost : null,
    firstContactBall: r.contact ? r.contact.firstContactBall : null,
    cutAngleDeg: r.contact ? r.contact.cutAngleDeg : null,
    fraction: r.contact ? r.contact.fraction : null,
    paths,
    bankGuide,
    pocketed,
    events: r.events,
  };
}
