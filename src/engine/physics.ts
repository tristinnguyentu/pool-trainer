// Aiming math + deterministic shot simulation.
// Imports ONLY from ./constants.ts. Pure & deterministic (no Date.now/Math.random).

import { TABLE, BALL_R, POCKETS, clamp, clamp01, pocketAimPoint, reflectOverRail } from './constants';
import type { AimSpec, Ball, Frame, Guides, RailName, Scene, SimEvent, SimResult, Spin, Vec2 } from './types';

const DT = 1 / 240;
const FRAME_DT = 1 / 60;
const MAX_T = 12;
const FRICTION = 15; // in/s^2
const STOP_SPEED = 1; // in/s snap threshold
const LAUNCH_BASE = 30;
const LAUNCH_SCALE = 170;
const RAIL_NORMAL_RESTITUTION = 0.75;
// Derived, not free: spinless rebounds must be angle-true (retention equals
// restitution) or the mirror-system bank/kick aiming silently breaks, and the
// spin blend must complement retention exactly.
const RAIL_TANGENT_RETENTION = RAIL_NORMAL_RESTITUTION;
const SPIN_DECAY_TAU = 2.0;
const SPIN_RAIL_BLEND = 1 - RAIL_TANGENT_RETENTION;
const SPIN_W_MAX = 30; // side-spin scalar at |sx| = 1, rad/s
// English's effective surface speed at the cushion is w * BALL_R * this
// factor. >1 exaggerates the effect for teaching visibility, but the rail
// bounce also clamps outgoing speed to incoming speed, so spin can redirect
// the ball without ever adding energy.
const SPIN_SURFACE_FACTOR = 3;
const SPIN_RAIL_DECAY = 0.6;
const FOLLOW_DRAW_ACCEL = 95; // in/s^2
const FOLLOW_DRAW_WINDOW = 0.55; // s
const THROW_BASE_DEG = 4.5;
const THROW_SPIN_DEG = 3.0;
const THROW_CLAMP_DEG = 6;

// ---------- small vector helpers ----------

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
  return reflectOverRail(p, rail);
}

// The sim's collision-induced throw approximation, shared by the simulation
// and the aiming compensation so the two can never drift apart.
// sinCut: signed tangential fraction of cue velocity at contact;
// sideSpinUnit: current side spin as a fraction of max (w / SPIN_W_MAX).
function throwDegrees(sinCut: number, sideSpinUnit: number, sy: number): number {
  const deg = THROW_BASE_DEG * sinCut * (1 - 0.3 * Math.abs(clamp(sy, -1, 1))) + THROW_SPIN_DEG * sideSpinUnit;
  return clamp(deg, -THROW_CLAMP_DEG, THROW_CLAMP_DEG);
}

// Ghost-ball aim at `target`, corrected for the throw the simulation will
// apply at contact (same formula as runSim). We want the object ball to
// DEPART toward the target after throw rotates it, so pick the line of
// centers n̂ = rotate(desired, -throw) and iterate: throw depends on the cut
// angle, which depends on the aim, which depends on the throw. Converges in
// a couple of rounds.
function compensatedGhost(cue: Vec2, ball: Vec2, target: Vec2, spin: Spin | null | undefined): Vec2 {
  const sx = clamp(spin && typeof spin.sx === 'number' ? spin.sx : 0, -1, 1);
  const sy = clamp(spin && typeof spin.sy === 'number' ? spin.sy : 0, -1, 1);
  const d = normalizeVec(target.x - ball.x, target.y - ball.y);
  let u = d;
  for (let i = 0; i < 3; i++) {
    const ghost = { x: ball.x - 2 * BALL_R * u.x, y: ball.y - 2 * BALL_R * u.y };
    const v = normalizeVec(ghost.x - cue.x, ghost.y - cue.y);
    const vt = v.x * -u.y + v.y * u.x; // dot(v̂, rot90ccw(n̂)) = signed sin(cut)
    const throwDeg = throwDegrees(vt, sx, sy);
    const r = (-throwDeg * Math.PI) / 180;
    u = { x: d.x * Math.cos(r) - d.y * Math.sin(r), y: d.x * Math.sin(r) + d.y * Math.cos(r) };
  }
  // The cue ball can only occupy the rail-inset box, so the reachable ghost
  // points are ball - 2R*u with u inside per-axis bounds. For a ball near a
  // cushion asked to travel through it (frozen-rail toward a far pocket) the
  // desired u is infeasible; clamp the DEPARTURE DIRECTION into the feasible
  // half-plane and renormalize. Clamping the ghost point coordinate-wise
  // instead can flip the contact to the wrong side of the ball and send it
  // the opposite way.
  const uxMax = (ball.x - BALL_R) / (2 * BALL_R);
  const uxMin = (ball.x - (TABLE.W - BALL_R)) / (2 * BALL_R);
  const uyMax = (ball.y - BALL_R) / (2 * BALL_R);
  const uyMin = (ball.y - (TABLE.H - BALL_R)) / (2 * BALL_R);
  const inBounds = (x: number, y: number) =>
    x >= uxMin - 1e-9 && x <= uxMax + 1e-9 && y >= uyMin - 1e-9 && y <= uyMax + 1e-9;

  if (!inBounds(u.x, u.y)) {
    // Enumerate the feasible arc's boundary directions (each binding cap with
    // the remaining unit length on the other axis, plus the axis units) and
    // take the one closest to the desired departure. This handles corner
    // balls where BOTH caps bind — a coordinate-wise clamp there collapses
    // to zero and any naive fallback aims through a cushion.
    const candidates: Vec2[] = [];
    const consider = (x: number, y: number) => {
      if (inBounds(x, y)) candidates.push({ x, y });
    };
    for (const cap of [uxMin, uxMax]) {
      if (Math.abs(cap) <= 1) {
        const rest = Math.sqrt(Math.max(0, 1 - cap * cap));
        consider(cap, rest);
        consider(cap, -rest);
      }
    }
    for (const cap of [uyMin, uyMax]) {
      if (Math.abs(cap) <= 1) {
        const rest = Math.sqrt(Math.max(0, 1 - cap * cap));
        consider(rest, cap);
        consider(-rest, cap);
      }
    }
    consider(1, 0);
    consider(-1, 0);
    consider(0, 1);
    consider(0, -1);

    let best: Vec2 | null = null;
    let bestDot = -Infinity;
    for (const c of candidates) {
      const dp = c.x * u.x + c.y * u.y;
      if (dp > bestDot) {
        bestDot = dp;
        best = c;
      }
    }
    // at least the away-from-rail axis directions are always feasible, but
    // keep a defined fallback regardless
    u = best ?? d;
  }
  return { x: ball.x - 2 * BALL_R * u.x, y: ball.y - 2 * BALL_R * u.y };
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
  px?: number; // position at the start of the current substep (for swept pocket capture)
  py?: number;
}

function snapshotBall(b: SimBall): Ball {
  return { id: b.id, x: b.x, y: b.y, pocketed: b.pocketed };
}

// Swept capture: pocket the ball if the segment it traveled this substep
// passes within the capture radius, not just if it ENDS inside it.
function findPocketAlongPath(b: SimBall) {
  const ax = b.px ?? b.x;
  const ay = b.py ?? b.y;
  for (const p of POCKETS) {
    const abx = b.x - ax;
    const aby = b.y - ay;
    const len2 = abx * abx + aby * aby;
    let s = 0;
    if (len2 > 1e-12) {
      s = clamp(((p.x - ax) * abx + (p.y - ay) * aby) / len2, 0, 1);
    }
    const cx = ax + abx * s;
    const cy = ay + aby * s;
    if (vecLen(cx - p.x, cy - p.y) <= p.r) return p;
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
  launchAngle: number;
}

// Runs the full deterministic simulation once. Returns frames/events/duration
// plus analytic contact info captured at the cue ball's first ball-ball hit.
function runSim(scene: Scene | null | undefined): RunSimResult {
  const power = clamp01(scene && scene.aim && typeof scene.aim.power === 'number' ? scene.aim.power : 0.5);
  const spin = (scene && scene.aim && scene.aim.spin) || ({} as Partial<Spin>);
  // Spin inputs are tip positions on the unit circle; out-of-range values
  // would flip the throw sign and pump unbounded energy into the follow/draw
  // window, so clamp defensively (the UI already enforces the unit circle).
  const sx = Math.max(-1, Math.min(1, typeof spin.sx === 'number' ? spin.sx : 0));
  const sy = Math.max(-1, Math.min(1, typeof spin.sy === 'number' ? spin.sy : 0));
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
    return { frames, events, duration: 0, contact: null, launchAngle: angle };
  }

  const v0 = LAUNCH_BASE + LAUNCH_SCALE * power;
  cue.vx = v0 * Math.cos(angle);
  cue.vy = v0 * Math.sin(angle);

  let w = sx * SPIN_W_MAX; // side-spin scalar, cue ball only
  let firstContactTime: number | null = null;
  let firstContactDir: Vec2 | null = null;
  let contact: Contact | null = null;

  function applyRailBounce(b: SimBall, n: Vec2): void {
    const tx = -n.y;
    const ty = n.x;
    const vn = b.vx * n.x + b.vy * n.y;
    const vt = b.vx * tx + b.vy * ty;
    const inSpeed = vecLen(b.vx, b.vy);
    const vnOut = -RAIL_NORMAL_RESTITUTION * vn;
    let vtOut: number;
    if (b.id === 'cue') {
      const slip = vt - w * BALL_R * SPIN_SURFACE_FACTOR;
      vtOut = vt - SPIN_RAIL_BLEND * slip;
      w *= SPIN_RAIL_DECAY;
      // A cushion contact breaks the follow/draw "grip" continuity along the
      // old line: mirror the acceleration direction with the bounce, so the
      // window keeps pushing the ball along its post-rebound roll instead of
      // pinning it against the rail in a micro-bounce loop.
      if (firstContactDir) {
        const dn = firstContactDir.x * n.x + firstContactDir.y * n.y;
        firstContactDir = { x: firstContactDir.x - 2 * dn * n.x, y: firstContactDir.y - 2 * dn * n.y };
      }
    } else {
      vtOut = RAIL_TANGENT_RETENTION * vt;
    }
    b.vx = vnOut * n.x + vtOut * tx;
    b.vy = vnOut * n.y + vtOut * ty;
    // A cushion can redirect the ball (english converts some spin to sideways
    // motion) but must never make it faster than it arrived — without this
    // clamp a slow ball with heavy english gains energy off the rail.
    const outSpeed = vecLen(b.vx, b.vy);
    if (outSpeed > inSpeed && outSpeed > 1e-9) {
      const s = inSpeed / outSpeed;
      b.vx *= s;
      b.vy *= s;
    }
  }

  // The cushion physically ends at a pocket mouth: while a ball is within a
  // pocket's approach zone it may cross the rail line un-reflected (that is
  // how it enters the jaws). If it penetrates a full ball radius past the
  // rail line without being captured, it "rattles" off the jaw and reflects
  // after all — the backstop that keeps near-miss balls on the table.
  function inPocketMouth(b: SimBall): boolean {
    for (const p of POCKETS) {
      if (vecLen(b.x - p.x, b.y - p.y) <= p.r + BALL_R) return true;
    }
    return false;
  }

  function reflectRailFor(b: SimBall): RailName[] {
    const hits: RailName[] = [];
    const R = BALL_R;
    const mouth = inPocketMouth(b);
    if (b.x < R && (!mouth || b.x < 0)) {
      b.x = R + (R - b.x) * RAIL_NORMAL_RESTITUTION;
      applyRailBounce(b, { x: 1, y: 0 });
      hits.push('left');
    } else if (b.x > TABLE.W - R && (!mouth || b.x > TABLE.W)) {
      b.x = TABLE.W - R - (b.x - (TABLE.W - R)) * RAIL_NORMAL_RESTITUTION;
      applyRailBounce(b, { x: -1, y: 0 });
      hits.push('right');
    }
    if (b.y < R && (!mouth || b.y < 0)) {
      b.y = R + (R - b.y) * RAIL_NORMAL_RESTITUTION;
      applyRailBounce(b, { x: 0, y: 1 });
      hits.push('bottom');
    } else if (b.y > TABLE.H - R && (!mouth || b.y > TABLE.H)) {
      b.y = TABLE.H - R - (b.y - (TABLE.H - R)) * RAIL_NORMAL_RESTITUTION;
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

    // integrate (remembering where each ball started the substep, so pocket
    // capture can sweep the whole travel segment instead of point-sampling —
    // at full speed a ball moves most of a radius per substep and a discrete
    // sample can skip a capture circle the path actually crossed)
    for (const b of balls) {
      if (!b.pocketed) {
        b.px = b.x;
        b.py = b.y;
        b.x += b.vx * DT;
        b.y += b.vy * DT;
      }
    }

    // pockets first (swept)
    for (const b of balls) {
      if (b.pocketed) continue;
      const p = findPocketAlongPath(b);
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
        const endTouching = dist > 0 && dist <= 2 * BALL_R;

        // Contact detection is exact-time-of-impact based. Two cases:
        //  - the balls overlap at the end of the substep: rewind to the
        //    instant they first touched (the overlap-detected line of centers
        //    can be several degrees off the true contact normal at speed);
        //  - the balls do NOT overlap at the end, but their relative motion
        //    crossed the 2R circle entirely INSIDE the substep (razor-thin
        //    cuts at high speed) — without a swept test these graze contacts
        //    tunnel straight through.
        let rewoundTau = 0;
        if (endTouching) {
          let nxT = dx / dist;
          let nyT = dy / dist;
          const closing = (a.vx - b.vx) * nxT + (a.vy - b.vy) * nyT;
          if (closing <= 1e-9) continue;
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
              rewoundTau = tau; // re-advanced with post-collision velocities below
            }
          }
        } else {
          // swept test from start-of-substep positions with current velocities
          const q0x = (a.px ?? a.x) - (b.px ?? b.x);
          const q0y = (a.py ?? a.y) - (b.py ?? b.y);
          const rx = a.vx - b.vx;
          const ry = a.vy - b.vy;
          const A = rx * rx + ry * ry;
          if (A <= 1e-12) continue;
          const B = 2 * (q0x * rx + q0y * ry);
          const C = q0x * q0x + q0y * q0y - 4 * BALL_R * BALL_R;
          const disc = B * B - 4 * A * C;
          if (disc <= 0) continue;
          const sqrtDisc = Math.sqrt(disc);
          const s1 = (-B - sqrtDisc) / (2 * A); // first touch
          const s2 = (-B + sqrtDisc) / (2 * A); // separation
          if (s1 > DT || s2 < 0) continue; // crossing not inside this substep
          const sStar = clamp(s1, 0, DT);
          // must be approaching at the contact instant
          const relAtX = q0x + rx * sStar;
          const relAtY = q0y + ry * sStar;
          if (relAtX * rx + relAtY * ry >= 0) continue;
          a.x = (a.px ?? a.x) + a.vx * sStar;
          a.y = (a.py ?? a.y) + a.vy * sStar;
          b.x = (b.px ?? b.x) + b.vx * sStar;
          b.y = (b.py ?? b.y) + b.vy * sStar;
          rewoundTau = DT - sStar;
        }

        dx = b.x - a.x;
        dy = b.y - a.y;
        dist = vecLen(dx, dy);
        if (dist <= 1e-9) continue;
        const nx = dx / dist;
        const ny = dy / dist;

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
          const other = isCueA ? b : a;
          const preVx = cueBall.vx;
          const preVy = cueBall.vy;
          const preSpeed = vecLen(preVx, preVy);
          const otherSpeed = vecLen(other.vx, other.vy);

          // Throw is friction from the CUE BALL's surface dragging the object
          // ball off the line of centers. It only applies when the cue ball is
          // the striker (a ball rolling into the resting cue ball gets a plain
          // collision), and its spin term uses the DECAYED side spin, not the
          // tip position from launch.
          const cueIsStriker = preSpeed > otherSpeed;

          // n pointing cue -> object
          const ncx = isCueA ? nx : -nx;
          const ncy = isCueA ? ny : -ny;
          const tcx = -ncy;
          const tcy = ncx;
          const vt = preVx * tcx + preVy * tcy;

          if (cueIsStriker && preSpeed > 1e-9) {
            const throwDeg = throwDegrees(vt / preSpeed, w / SPIN_W_MAX, sy);
            const rad = (throwDeg * Math.PI) / 180;
            const cosr = Math.cos(rad);
            const sinr = Math.sin(rad);
            const objNew = isCueA ? newB : newA;
            const rotated = { x: objNew.x * cosr - objNew.y * sinr, y: objNew.x * sinr + objNew.y * cosr };
            if (isCueA) newB = rotated;
            else newA = rotated;
          }

          events.push({ t, type: 'ball-ball', a: a.id, b: b.id });

          if (firstContactTime === null) {
            firstContactTime = t;
            const dir = preSpeed > 1e-9 ? { x: preVx / preSpeed, y: preVy / preSpeed } : normalizeVec(Math.cos(angle), Math.sin(angle));
            firstContactDir = dir;
            const objBall = isCueA ? b : a;
            const ghost = { x: cueBall.x, y: cueBall.y };
            // Cut angle / fullness describe the CONTACT geometry (line of
            // centers vs. cue travel), not the post-throw departure — a
            // dead-straight hit with english is still a full-ball hit.
            const dotProd = clamp(dir.x * ncx + dir.y * ncy, -1, 1);
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
  return { frames, events, duration, contact, launchAngle: angle };
}

// The app treats scenes as immutable (every edit replaces the object), and
// the sim is deterministic, so guides and playback can share one run instead
// of simulating twice per input change. Consumers must not mutate the result.
const simCache = new WeakMap<Scene, RunSimResult>();

function runSimCached(scene: Scene): RunSimResult {
  if (!scene || typeof scene !== 'object') return runSim(scene);
  const hit = simCache.get(scene);
  if (hit) return hit;
  const result = runSim(scene);
  simCache.set(scene, result);
  return result;
}

export function simulate(scene: Scene): SimResult {
  const r = runSimCached(scene);
  return { frames: r.frames, events: r.events, duration: r.duration };
}

export function computeGuides(scene: Scene): Guides {
  const r = runSimCached(scene);
  const angle = r.launchAngle; // runSim already resolved the (compensated) aim

  // Frames are produced by balls.map(snapshotBall), so every frame shares one
  // stable ball ordering — walk them once with an index map instead of a
  // find() per ball per frame.
  const paths: Record<string, Vec2[]> = {};
  const srcBalls: Ball[] = scene && Array.isArray(scene.balls) ? scene.balls : [];
  const trails: Vec2[][] = srcBalls.map((b0) => [{ x: b0.x, y: b0.y }]);
  const indexOfId = new Map<string, number>();
  srcBalls.forEach((b0, i) => indexOfId.set(b0.id, i));
  for (const f of r.frames) {
    for (const fb of f.balls) {
      const idx = indexOfId.get(fb.id);
      if (idx === undefined) continue;
      const pts = trails[idx];
      const last = pts[pts.length - 1];
      if (vecLen(fb.x - last.x, fb.y - last.y) > 1e-4) {
        pts.push({ x: fb.x, y: fb.y });
      }
    }
  }
  srcBalls.forEach((b0, i) => {
    if (trails[i].length > 1) paths[b0.id] = trails[i];
  });

  const pocketed: string[] = [];
  for (const ev of r.events) if (ev.type === 'pocket') pocketed.push(ev.ball);

  let bankGuide: Guides['bankGuide'] = null;
  const spec = scene && scene.shot && scene.shot.aimSpec;
  if (spec && spec.kind === 'bank') {
    // pocketAimPoint throws on an unknown pocket id (bad ShotDef data);
    // a malformed shot should degrade to no bank guide, not a crash.
    try {
      const aim = pocketAimPoint(spec.pocket);
      if (aim) bankGuide = { mirror: mirrorPoint(aim, spec.rail), rail: spec.rail };
    } catch {
      bankGuide = null;
    }
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
