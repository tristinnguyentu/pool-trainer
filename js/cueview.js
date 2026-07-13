// Cue view — true pinhole-projected 3D perspective from behind the cue ball,
// sighting down the aim line. Imports ONLY from ./constants.js.

import { TABLE, BALL_R, POCKETS, BALL_COLORS, isStripe, FELT, GUIDES } from './constants.js';

const FOV_RAD = (40 * Math.PI) / 180;
const NEAR_Z = 0.5;
const RAIL_H = 1.4; // cushion height, inches
const RAIL_W = 4.5; // wood rail width beyond the cloth edge, inches

// ---------- small vec3 helpers ----------
function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function cross(a, b) {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}
function length(a) { return Math.sqrt(dot(a, a)); }
function normalize(a) {
  const l = length(a);
  if (!l || !isFinite(l)) return { x: 0, y: 0, z: 0 };
  return { x: a.x / l, y: a.y / l, z: a.z / l };
}

// ---------- camera ----------
function buildCamera(cueCenter, aimAngle, cssH) {
  const aimDir = { x: Math.cos(aimAngle), y: Math.sin(aimAngle), z: 0 };
  const eye = {
    x: cueCenter.x - aimDir.x * 18,
    y: cueCenter.y - aimDir.y * 18,
    z: 11,
  };
  const look = {
    x: cueCenter.x + aimDir.x * 30,
    y: cueCenter.y + aimDir.y * 30,
    z: BALL_R,
  };
  const forward = normalize(sub(look, eye));
  const worldUp = { x: 0, y: 0, z: 1 };
  let right = normalize(cross(forward, worldUp));
  if (!isFinite(right.x) || (right.x === 0 && right.y === 0 && right.z === 0)) {
    right = { x: 0, y: -1, z: 0 };
  }
  const trueUp = cross(right, forward);
  const f = (cssH / 2) / Math.tan(FOV_RAD / 2);
  return { eye, forward, right, trueUp, f };
}

// world point -> camera-space {x,y,z} (z is forward distance / depth)
function toCam(p, cam) {
  const rel = sub(p, cam.eye);
  return { x: dot(rel, cam.right), y: dot(rel, cam.trueUp), z: dot(rel, cam.forward) };
}

// camera-space point -> screen {x,y}
function projectCam(c, cam, cssW, cssH) {
  return {
    x: cssW / 2 + (cam.f * c.x) / c.z,
    y: cssH / 2 - (cam.f * c.y) / c.z,
    depth: c.z,
  };
}

// world point -> screen point, or null if behind the near plane
function project(p, cam, cssW, cssH) {
  const c = toCam(p, cam);
  if (c.z < NEAR_Z) return null;
  return projectCam(c, cam, cssW, cssH);
}

// ---------- near-plane clipping ----------
function intersectNear(a, b, nearZ) {
  const t = (nearZ - a.z) / (b.z - a.z);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: nearZ };
}

// Sutherland-Hodgman clip of a camera-space polygon against z >= NEAR_Z
function clipCamPoly(camPts) {
  const out = [];
  const n = camPts.length;
  for (let i = 0; i < n; i++) {
    const cur = camPts[i];
    const prev = camPts[(i - 1 + n) % n];
    const curIn = cur.z >= NEAR_Z;
    const prevIn = prev.z >= NEAR_Z;
    if (curIn) {
      if (!prevIn) out.push(intersectNear(prev, cur, NEAR_Z));
      out.push(cur);
    } else if (prevIn) {
      out.push(intersectNear(prev, cur, NEAR_Z));
    }
  }
  return out;
}

function projectWorldPoly(worldPts, cam, cssW, cssH) {
  const camPts = worldPts.map((p) => toCam(p, cam));
  const clipped = clipCamPoly(camPts);
  if (clipped.length < 3) return null;
  return clipped.map((c) => projectCam(c, cam, cssW, cssH));
}

// clip a single segment against the near plane; returns [camA, camB] or null if fully behind
function clipCamSegment(ca, cb) {
  const aIn = ca.z >= NEAR_Z;
  const bIn = cb.z >= NEAR_Z;
  if (!aIn && !bIn) return null;
  if (aIn && bIn) return [ca, cb];
  if (!aIn) return [intersectNear(ca, cb, NEAR_Z), cb];
  return [ca, intersectNear(cb, ca, NEAR_Z)];
}

function projectWorldSegment(a, b, cam, cssW, cssH) {
  const clipped = clipCamSegment(toCam(a, cam), toCam(b, cam));
  if (!clipped) return null;
  return [projectCam(clipped[0], cam, cssW, cssH), projectCam(clipped[1], cam, cssW, cssH)];
}

// ---------- misc helpers ----------
const FRACTION_TABLE = [
  [1, 'full'], [0.875, '7/8'], [0.75, '3/4'], [0.625, '5/8'], [0.5, '1/2'],
  [0.375, '3/8'], [0.25, '1/4'], [0.125, '1/8'], [0, 'thin'],
];
function fractionLabel(fraction) {
  let best = FRACTION_TABLE[0];
  let bestDiff = Infinity;
  for (const entry of FRACTION_TABLE) {
    const diff = Math.abs(fraction - entry[0]);
    if (diff < bestDiff) { bestDiff = diff; best = entry; }
  }
  return best[1];
}

function findBall(balls, id) {
  return (balls || []).find((b) => b.id === id) || null;
}

// ---------- drawing ----------
function drawBackdrop(ctx, cssW, cssH) {
  const g = ctx.createLinearGradient(0, 0, 0, cssH);
  g.addColorStop(0, '#0a0b0d');
  g.addColorStop(0.55, '#141519');
  g.addColorStop(1, '#1c1d20');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cssW, cssH);
}

function drawFelt(ctx, cam, cssW, cssH) {
  const corners = [
    { x: 0, y: 0, z: 0 },
    { x: TABLE.W, y: 0, z: 0 },
    { x: TABLE.W, y: TABLE.H, z: 0 },
    { x: 0, y: TABLE.H, z: 0 },
  ];
  const screen = projectWorldPoly(corners, cam, cssW, cssH);
  if (!screen) return;
  ctx.fillStyle = FELT.cloth;
  ctx.beginPath();
  ctx.moveTo(screen[0].x, screen[0].y);
  for (let i = 1; i < screen.length; i++) ctx.lineTo(screen[i].x, screen[i].y);
  ctx.closePath();
  ctx.fill();
}

function fillWorldQuad(ctx, cam, cssW, cssH, pts, color) {
  const screen = projectWorldPoly(pts, cam, cssW, cssH);
  if (!screen) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(screen[0].x, screen[0].y);
  for (let i = 1; i < screen.length; i++) ctx.lineTo(screen[i].x, screen[i].y);
  ctx.closePath();
  ctx.fill();
}

function drawRails(ctx, cam, cssW, cssH) {
  const W = TABLE.W;
  const H = TABLE.H;
  const topColor = FELT.cushion;
  const innerColor = FELT.clothDark;

  // bottom rail (y = 0 side)
  fillWorldQuad(ctx, cam, cssW, cssH, [
    { x: 0, y: -RAIL_W, z: RAIL_H }, { x: W, y: -RAIL_W, z: RAIL_H },
    { x: W, y: 0, z: RAIL_H }, { x: 0, y: 0, z: RAIL_H },
  ], topColor);
  fillWorldQuad(ctx, cam, cssW, cssH, [
    { x: 0, y: 0, z: RAIL_H }, { x: W, y: 0, z: RAIL_H },
    { x: W, y: 0, z: 0 }, { x: 0, y: 0, z: 0 },
  ], innerColor);

  // top rail (y = H side)
  fillWorldQuad(ctx, cam, cssW, cssH, [
    { x: 0, y: H, z: RAIL_H }, { x: W, y: H, z: RAIL_H },
    { x: W, y: H + RAIL_W, z: RAIL_H }, { x: 0, y: H + RAIL_W, z: RAIL_H },
  ], topColor);
  fillWorldQuad(ctx, cam, cssW, cssH, [
    { x: 0, y: H, z: 0 }, { x: W, y: H, z: 0 },
    { x: W, y: H, z: RAIL_H }, { x: 0, y: H, z: RAIL_H },
  ], innerColor);

  // left rail (x = 0 side)
  fillWorldQuad(ctx, cam, cssW, cssH, [
    { x: -RAIL_W, y: 0, z: RAIL_H }, { x: 0, y: 0, z: RAIL_H },
    { x: 0, y: H, z: RAIL_H }, { x: -RAIL_W, y: H, z: RAIL_H },
  ], topColor);
  fillWorldQuad(ctx, cam, cssW, cssH, [
    { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: RAIL_H },
    { x: 0, y: H, z: RAIL_H }, { x: 0, y: H, z: 0 },
  ], innerColor);

  // right rail (x = W side)
  fillWorldQuad(ctx, cam, cssW, cssH, [
    { x: W, y: 0, z: RAIL_H }, { x: W + RAIL_W, y: 0, z: RAIL_H },
    { x: W + RAIL_W, y: H, z: RAIL_H }, { x: W, y: H, z: RAIL_H },
  ], topColor);
  fillWorldQuad(ctx, cam, cssW, cssH, [
    { x: W, y: 0, z: 0 }, { x: W, y: 0, z: RAIL_H },
    { x: W, y: H, z: RAIL_H }, { x: W, y: H, z: 0 },
  ], innerColor);
}

function drawPockets(ctx, cam, cssW, cssH) {
  for (const p of POCKETS) {
    const world = { x: p.x, y: p.y, z: 0.03 };
    const c = toCam(world, cam);
    if (c.z < NEAR_Z) continue;
    const proj = projectCam(c, cam, cssW, cssH);
    const r = Math.max(1, (cam.f * p.r) / c.z);
    ctx.fillStyle = FELT.pocket;
    ctx.beginPath();
    ctx.ellipse(proj.x, proj.y, r, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGuideLines(ctx, cam, cssW, cssH, cueBall, guides) {
  if (!guides) return;
  const z = 0.06;
  if (guides.ghost) {
    const a = { x: cueBall.x, y: cueBall.y, z };
    const b = { x: guides.ghost.x, y: guides.ghost.y, z };
    const seg = projectWorldSegment(a, b, cam, cssW, cssH);
    if (seg) {
      ctx.save();
      ctx.strokeStyle = GUIDES.aim;
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 6]);
      ctx.beginPath();
      ctx.moveTo(seg[0].x, seg[0].y);
      ctx.lineTo(seg[1].x, seg[1].y);
      ctx.stroke();
      ctx.restore();
    }
  }

  if (guides.paths) {
    for (const [id, pts] of Object.entries(guides.paths)) {
      if (!pts || pts.length < 2) continue;
      ctx.save();
      ctx.strokeStyle = id === 'cue' ? GUIDES.cue : GUIDES.object;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = { x: pts[i].x, y: pts[i].y, z };
        const b = { x: pts[i + 1].x, y: pts[i + 1].y, z };
        const seg = projectWorldSegment(a, b, cam, cssW, cssH);
        if (!seg) { started = false; continue; }
        if (!started) { ctx.moveTo(seg[0].x, seg[0].y); started = true; }
        ctx.lineTo(seg[1].x, seg[1].y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
}

function ballScreenInfo(ball, cam, cssW, cssH) {
  const p = { x: ball.x, y: ball.y, z: BALL_R };
  const c = toCam(p, cam);
  if (c.z < NEAR_Z) return null;
  const proj = projectCam(c, cam, cssW, cssH);
  const r = (cam.f * BALL_R) / c.z;
  return { sx: proj.x, sy: proj.y, r, depth: c.z };
}

function drawBall(ctx, ball, info) {
  const { sx, sy, r } = info;
  if (r < 0.4) return;
  const color = BALL_COLORS[ball.id] || '#ffffff';
  const stripe = isStripe(ball.id);

  ctx.save();
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.clip();

  // base fill
  if (stripe) {
    ctx.fillStyle = '#f4f1e8';
    ctx.fillRect(sx - r - 1, sy - r - 1, r * 2 + 2, r * 2 + 2);
    ctx.fillStyle = color;
    ctx.fillRect(sx - r - 1, sy - r * 0.45, r * 2 + 2, r * 0.9);
  } else if (ball.id === 'cue') {
    ctx.fillStyle = color;
    ctx.fillRect(sx - r - 1, sy - r - 1, r * 2 + 2, r * 2 + 2);
  } else {
    ctx.fillStyle = color;
    ctx.fillRect(sx - r - 1, sy - r - 1, r * 2 + 2, r * 2 + 2);
  }

  // shading gradient (highlight upper-left, darker toward edge)
  const grad = ctx.createRadialGradient(
    sx - r * 0.35, sy - r * 0.4, r * 0.1,
    sx, sy, r * 1.15,
  );
  grad.addColorStop(0, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.06)');
  grad.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = grad;
  ctx.fillRect(sx - r - 1, sy - r - 1, r * 2 + 2, r * 2 + 2);

  ctx.restore();

  // number
  if (ball.id !== 'cue' && r > 6) {
    ctx.save();
    const fontSize = Math.max(6, r * 0.75);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#151515';
    if (r > 9) {
      ctx.beginPath();
      ctx.fillStyle = '#f4f1e8';
      ctx.arc(sx, sy, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#151515';
    }
    ctx.fillText(String(ball.id), sx, sy + 0.5);
    ctx.restore();
  }
}

function drawGhost(ctx, info) {
  if (!info) return;
  ctx.save();
  ctx.strokeStyle = GUIDES.ghost;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(info.sx, info.sy, info.r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCueStick(ctx, ballInfo, spin, cssW, cssH) {
  const sx = spin ? spin.sx || 0 : 0;
  const sy = spin ? spin.sy || 0 : 0;
  const tipX = ballInfo.sx + sx * 0.62 * ballInfo.r;
  const tipY = ballInfo.sy - sy * 0.62 * ballInfo.r;

  const baseX = cssW / 2 + (tipX - cssW / 2) * 0.25;
  const baseY = cssH + 24;

  const dx = tipX - baseX;
  const dy = tipY - baseY;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  const ferruleLen = Math.min(20, len * 0.08);
  const shaftEndX = tipX - (dx / len) * ferruleLen;
  const shaftEndY = tipY - (dy / len) * ferruleLen;

  const wBase = 9;
  const wTip = 2.5;

  ctx.save();
  ctx.globalAlpha = 0.9;
  const grad = ctx.createLinearGradient(baseX, baseY, shaftEndX, shaftEndY);
  grad.addColorStop(0, '#3d2414');
  grad.addColorStop(1, '#caa06a');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(baseX + nx * wBase, baseY + ny * wBase);
  ctx.lineTo(shaftEndX + nx * wTip, shaftEndY + ny * wTip);
  ctx.lineTo(shaftEndX - nx * wTip, shaftEndY - ny * wTip);
  ctx.lineTo(baseX - nx * wBase, baseY - ny * wBase);
  ctx.closePath();
  ctx.fill();

  // ferrule
  ctx.fillStyle = '#eee8da';
  ctx.beginPath();
  ctx.moveTo(shaftEndX + nx * wTip, shaftEndY + ny * wTip);
  ctx.lineTo(tipX + nx * (wTip * 0.6), tipY + ny * (wTip * 0.6));
  ctx.lineTo(tipX - nx * (wTip * 0.6), tipY - ny * (wTip * 0.6));
  ctx.lineTo(shaftEndX - nx * wTip, shaftEndY - ny * wTip);
  ctx.closePath();
  ctx.fill();

  // tip
  ctx.fillStyle = '#8fd0f2';
  ctx.beginPath();
  ctx.arc(tipX, tipY, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHud(ctx, guides, cssW, cssH) {
  if (!guides || guides.cutAngleDeg == null || guides.fraction == null) return;
  const label = `Cut ${Math.round(guides.cutAngleDeg)}° · ${fractionLabel(guides.fraction)} ball`;
  ctx.save();
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  const padX = 6;
  const w = ctx.measureText(label).width + padX * 2;
  ctx.fillRect(8, cssH - 26, w, 20);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(label, 8 + padX, cssH - 11);
  ctx.restore();
}

export function renderCueView(ctx, view) {
  const { scene, guides, balls, animating, showGuides, cssW, cssH } = view;

  ctx.save();
  ctx.clearRect(0, 0, cssW, cssH);
  drawBackdrop(ctx, cssW, cssH);

  const sceneCue = findBall(scene && scene.balls, 'cue') || { x: 25, y: 25 };
  const aimAngle = guides ? guides.aimAngle : 0;
  const cam = buildCamera(sceneCue, isFinite(aimAngle) ? aimAngle : 0, cssH);

  drawFelt(ctx, cam, cssW, cssH);
  drawRails(ctx, cam, cssW, cssH);
  drawPockets(ctx, cam, cssW, cssH);

  if (showGuides && !animating) {
    drawGuideLines(ctx, cam, cssW, cssH, sceneCue, guides);
  }

  const liveBalls = (balls || []).filter((b) => !b.pocketed);
  const infos = [];
  for (const b of liveBalls) {
    const info = ballScreenInfo(b, cam, cssW, cssH);
    if (info) infos.push({ b, info });
  }
  infos.sort((a, c) => c.info.depth - a.info.depth);
  for (const { b, info } of infos) drawBall(ctx, b, info);

  if (showGuides && !animating && guides && guides.ghost) {
    const ghostInfo = ballScreenInfo(guides.ghost, cam, cssW, cssH);
    drawGhost(ctx, ghostInfo);
  }

  if (!animating) {
    const cueNow = findBall(liveBalls, 'cue');
    if (cueNow) {
      const cueInfo = ballScreenInfo(cueNow, cam, cssW, cssH);
      if (cueInfo) {
        const spin = scene && scene.aim ? scene.aim.spin : { sx: 0, sy: 0 };
        drawCueStick(ctx, cueInfo, spin, cssW, cssH);
      }
    }
  }

  drawHud(ctx, guides, cssW, cssH);

  ctx.restore();
}
