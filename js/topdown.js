// Top-down table renderer.
// Imports ONLY from ./constants.js. Pure rendering — never mutates `view`.

import { TABLE, BALL_R, POCKETS, BALL_COLORS, isStripe, FELT, GUIDES } from './constants.js';

// ---- Layout constants (table + frame fit) ---------------------------------

const FRAME_IN = 5.2; // wood frame thickness outside the playing surface, inches
const MARGIN_FRAC = 0.05; // breathing room around the frame, fraction of min(cssW,cssH)
const CUSHION_IN = 2.1; // rubber cushion band width just inside the rail, inches

// ---- Coordinate transform (shared by renderer + main.js hit-testing) -----

export function tableTransform(cssW, cssH) {
  const totalW = TABLE.W + FRAME_IN * 2;
  const totalH = TABLE.H + FRAME_IN * 2;
  const margin = MARGIN_FRAC * Math.min(cssW, cssH);
  const availW = Math.max(1, cssW - margin * 2);
  const availH = Math.max(1, cssH - margin * 2);
  const scale = Math.max(0.0001, Math.min(availW / totalW, availH / totalH));
  const drawW = totalW * scale;
  const drawH = totalH * scale;
  const frameLeft = (cssW - drawW) / 2;
  const frameTop = (cssH - drawH) / 2;
  const tableLeftPx = frameLeft + FRAME_IN * scale;
  const tableTopPx = frameTop + FRAME_IN * scale; // canvas y of table y = TABLE.H
  const tableBottomPx = tableTopPx + TABLE.H * scale; // canvas y of table y = 0

  const ox = tableLeftPx;
  const oy = tableBottomPx;

  function toCanvas(pt) {
    return { x: ox + pt.x * scale, y: oy - pt.y * scale };
  }
  function toTable(pt) {
    return { x: (pt.x - ox) / scale, y: (oy - pt.y) / scale };
  }

  return { scale, ox, oy, toCanvas, toTable };
}

// Derive the outer frame rect (canvas px) from a transform result.
function frameRect(t) {
  const left = t.ox - FRAME_IN * t.scale;
  const top = t.oy - TABLE.H * t.scale - FRAME_IN * t.scale;
  const w = (TABLE.W + FRAME_IN * 2) * t.scale;
  const h = (TABLE.H + FRAME_IN * 2) * t.scale;
  return { left, top, w, h };
}

// ---- small trail memory for animation flavor (optional, module-scoped) ---

const trailHistory = new Map(); // id -> [{x,y}, ...]
let wasAnimating = false;

function updateTrails(balls, animating) {
  if (!animating) {
    if (wasAnimating) trailHistory.clear();
    wasAnimating = false;
    return;
  }
  wasAnimating = true;
  for (const b of balls) {
    if (b.pocketed) continue;
    let h = trailHistory.get(b.id);
    if (!h) {
      h = [];
      trailHistory.set(b.id, h);
    }
    h.push({ x: b.x, y: b.y });
    if (h.length > 18) h.shift();
  }
}

// ---- main entry -------------------------------------------------------

export function renderTopDown(ctx, view) {
  const { cssW, cssH } = view;
  const t = tableTransform(cssW, cssH);
  const balls = view.balls || [];

  updateTrails(balls, !!view.animating);

  ctx.save();
  ctx.clearRect(0, 0, cssW, cssH);
  // backdrop behind the frame
  ctx.fillStyle = '#111214';
  ctx.fillRect(0, 0, cssW, cssH);

  drawFrame(ctx, t);
  drawFelt(ctx, t);
  drawCushions(ctx, t);
  drawDiamonds(ctx, t);
  drawPockets(ctx, t);

  if (view.animating) {
    drawTrails(ctx, t);
  }

  for (const b of balls) {
    if (b.pocketed) continue;
    drawBall(ctx, t, b, view.scene);
  }

  if (view.showGuides && !view.animating && view.guides) {
    drawGuides(ctx, t, view);
  }

  ctx.restore();
}

// ---- frame / felt / cushions / diamonds / pockets ----------------------

function drawFrame(ctx, t) {
  const r = frameRect(t);
  const grad = ctx.createLinearGradient(r.left, r.top, r.left + r.w, r.top + r.h);
  grad.addColorStop(0, FELT.woodLight);
  grad.addColorStop(0.5, FELT.wood);
  grad.addColorStop(1, FELT.woodLight);
  ctx.fillStyle = grad;
  roundRect(ctx, r.left, r.top, r.w, r.h, Math.min(14, t.scale * 1.5));
  ctx.fill();

  // subtle inner bevel shadow around the felt cut-out
  const innerLeft = t.ox;
  const innerTop = t.oy - TABLE.H * t.scale;
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = Math.max(1, t.scale * 0.12);
  ctx.strokeRect(innerLeft, innerTop, TABLE.W * t.scale, TABLE.H * t.scale);
  ctx.restore();
}

function drawFelt(ctx, t) {
  const left = t.ox;
  const top = t.oy - TABLE.H * t.scale;
  const w = TABLE.W * t.scale;
  const h = TABLE.H * t.scale;

  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, w, h);
  ctx.clip();

  ctx.fillStyle = FELT.cloth;
  ctx.fillRect(left, top, w, h);

  const cx = left + w / 2;
  const cy = top + h / 2;
  const vignette = ctx.createRadialGradient(
    cx, cy, Math.min(w, h) * 0.15,
    cx, cy, Math.max(w, h) * 0.75
  );
  vignette.addColorStop(0, 'rgba(255,255,255,0.05)');
  vignette.addColorStop(0.55, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, FELT.clothDark);
  ctx.fillStyle = vignette;
  ctx.fillRect(left, top, w, h);

  ctx.restore();
}

function drawCushions(ctx, t) {
  const left = t.ox;
  const top = t.oy - TABLE.H * t.scale;
  const w = TABLE.W * t.scale;
  const h = TABLE.H * t.scale;
  const cIn = CUSHION_IN * t.scale;

  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, w, h);
  ctx.clip();

  const bands = [
    { x: left, y: top, w, h: cIn, dir: 'v' }, // top
    { x: left, y: top + h - cIn, w, h: cIn, dir: 'v' }, // bottom
    { x: left, y: top, w: cIn, h, dir: 'h' }, // left
    { x: left + w - cIn, y: top, w: cIn, h, dir: 'h' }, // right
  ];
  for (const band of bands) {
    let grad;
    if (band.dir === 'v') {
      grad = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
    } else {
      grad = ctx.createLinearGradient(band.x, 0, band.x + band.w, 0);
    }
    grad.addColorStop(0, 'rgba(255,255,255,0.10)');
    grad.addColorStop(0.4, FELT.cushion);
    grad.addColorStop(1, FELT.cushion);
    ctx.fillStyle = grad;
    ctx.fillRect(band.x, band.y, band.w, band.h);
  }
  ctx.restore();
}

function drawDiamonds(ctx, t) {
  const dLongX = [1, 2, 3, 5, 6, 7].map((n) => (n / 8) * TABLE.W);
  const dShortY = [1, 3].map((n) => (n / 4) * TABLE.H);
  const size = Math.max(3, t.scale * 0.9);

  ctx.fillStyle = FELT.diamond;
  ctx.globalAlpha = 0.85;

  const frameMidTop = t.oy - TABLE.H * t.scale - (FRAME_IN * t.scale) / 2;
  const frameMidBottom = t.oy + (FRAME_IN * t.scale) / 2;
  for (const x of dLongX) {
    const px = t.ox + x * t.scale;
    drawDiamondMark(ctx, px, frameMidTop, size);
    drawDiamondMark(ctx, px, frameMidBottom, size);
  }

  const frameMidLeft = t.ox - (FRAME_IN * t.scale) / 2;
  const frameMidRight = t.ox + TABLE.W * t.scale + (FRAME_IN * t.scale) / 2;
  for (const y of dShortY) {
    const py = t.oy - y * t.scale;
    drawDiamondMark(ctx, frameMidLeft, py, size);
    drawDiamondMark(ctx, frameMidRight, py, size);
  }
  ctx.globalAlpha = 1;
}

function drawDiamondMark(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.lineTo(cx + s, cy);
  ctx.lineTo(cx, cy + s);
  ctx.lineTo(cx - s, cy);
  ctx.closePath();
  ctx.fill();
}

function drawPockets(ctx, t) {
  for (const p of POCKETS) {
    const c = t.toCanvas({ x: p.x, y: p.y });
    const r = p.r * t.scale * 0.62; // visual mouth a bit tighter than capture radius
    const grad = ctx.createRadialGradient(c.x, c.y, r * 0.15, c.x, c.y, r);
    grad.addColorStop(0, '#000000');
    grad.addColorStop(0.75, FELT.pocket);
    grad.addColorStop(1, 'rgba(13,13,13,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = Math.max(1, t.scale * 0.08);
    ctx.stroke();
  }
}

// ---- balls -------------------------------------------------------------

function drawBall(ctx, t, ball, scene) {
  const c = t.toCanvas({ x: ball.x, y: ball.y });
  const r = BALL_R * t.scale;
  const isCue = ball.id === 'cue';
  const color = isCue ? BALL_COLORS.cue : BALL_COLORS[ball.id] || '#999999';

  ctx.save();
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (!isCue && isStripe(ball.id)) {
    ctx.fillStyle = '#f4f1e8';
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    const bandH = r * 1.15;
    ctx.fillStyle = color;
    ctx.fillRect(c.x - r, c.y - bandH / 2, r * 2, bandH);
  } else {
    ctx.fillStyle = color;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
  }

  // shading overlay (radial gradient, highlight upper-left)
  const shade = ctx.createRadialGradient(
    c.x - r * 0.4, c.y - r * 0.45, r * 0.1,
    c.x, c.y, r * 1.15
  );
  shade.addColorStop(0, 'rgba(255,255,255,0.55)');
  shade.addColorStop(0.25, 'rgba(255,255,255,0.12)');
  shade.addColorStop(0.65, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = shade;
  ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);

  ctx.restore();

  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = Math.max(0.5, r * 0.05);
  ctx.stroke();

  if (!isCue) {
    drawBallNumber(ctx, c.x, c.y, r, ball.id);
  } else {
    drawSpinDot(ctx, c.x, c.y, r, scene);
  }
}

function drawBallNumber(ctx, cx, cy, r, id) {
  const labelR = r * 0.58;
  ctx.beginPath();
  ctx.arc(cx, cy, labelR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(244,241,232,0.95)';
  ctx.fill();

  ctx.fillStyle = '#161616';
  ctx.font = `${Math.max(6, labelR * 1.35)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(id), cx, cy + 0.5);
}

function drawSpinDot(ctx, cx, cy, r, scene) {
  const spin = scene && scene.aim && scene.aim.spin ? scene.aim.spin : { sx: 0, sy: 0 };
  const sx = spin.sx || 0;
  const sy = spin.sy || 0;
  if (sx === 0 && sy === 0) return;
  const dx = cx + sx * r * 0.62;
  const dy = cy - sy * r * 0.62;
  ctx.beginPath();
  ctx.arc(dx, dy, Math.max(1.2, r * 0.14), 0, Math.PI * 2);
  ctx.fillStyle = '#c0342b';
  ctx.fill();
  ctx.lineWidth = Math.max(0.5, r * 0.03);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.stroke();
}

// ---- trails --------------------------------------------------------------

function drawTrails(ctx, t) {
  ctx.save();
  for (const [id, pts] of trailHistory) {
    if (pts.length < 2) continue;
    const color = id === 'cue' ? GUIDES.cue : GUIDES.object;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const c = t.toCanvas(pts[i]);
      if (i === 0) ctx.moveTo(c.x, c.y);
      else ctx.lineTo(c.x, c.y);
    }
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = Math.max(1, t.scale * 0.06);
    ctx.stroke();
  }
  ctx.restore();
}

// ---- guides --------------------------------------------------------------

function drawGuides(ctx, t, view) {
  const guides = view.guides;
  const scene = view.scene;
  const cueBall = (scene && scene.balls ? scene.balls : []).find((b) => b.id === 'cue');

  ctx.save();

  // aim line: cue -> ghost
  if (cueBall && guides.ghost) {
    const a = t.toCanvas({ x: cueBall.x, y: cueBall.y });
    const b = t.toCanvas(guides.ghost);
    ctx.beginPath();
    ctx.setLineDash([6, 5]);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = GUIDES.aim;
    ctx.lineWidth = Math.max(1, t.scale * 0.06);
    ctx.stroke();
  }

  // ghost ball outline
  if (guides.ghost) {
    const g = t.toCanvas(guides.ghost);
    const r = BALL_R * t.scale;
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.arc(g.x, g.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = GUIDES.ghost;
    ctx.lineWidth = Math.max(1, t.scale * 0.06);
    ctx.stroke();
  }

  ctx.setLineDash([]);

  // predicted paths
  if (guides.paths) {
    for (const id of Object.keys(guides.paths)) {
      const pts = guides.paths[id];
      if (!pts || pts.length < 2) continue;
      const color = id === 'cue' ? GUIDES.cue : GUIDES.object;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const c = t.toCanvas(pts[i]);
        if (i === 0) ctx.moveTo(c.x, c.y);
        else ctx.lineTo(c.x, c.y);
      }
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = Math.max(1, t.scale * 0.08);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // tangent hint: short line through ghost, perpendicular to ghost->firstContactBall line of centers
  if (guides.ghost && guides.firstContactBall && scene && scene.balls) {
    const ob = scene.balls.find((b) => b.id === guides.firstContactBall);
    if (ob) {
      const dx = ob.x - guides.ghost.x;
      const dy = ob.y - guides.ghost.y;
      const len = Math.hypot(dx, dy);
      if (len > 1e-6) {
        const ux = dx / len;
        const uy = dy / len;
        const px = -uy;
        const py = ux;
        const half = BALL_R * 1.6;
        const p1 = t.toCanvas({ x: guides.ghost.x - px * half, y: guides.ghost.y - py * half });
        const p2 = t.toCanvas({ x: guides.ghost.x + px * half, y: guides.ghost.y + py * half });
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = GUIDES.tangent;
        ctx.lineWidth = Math.max(1, t.scale * 0.05);
        ctx.stroke();
      }
    }
  }

  // bank / kick construction line + marker
  if (guides.bankGuide && guides.bankGuide.mirror) {
    const mirror = guides.bankGuide.mirror;
    const from = guides.ghost || (cueBall ? { x: cueBall.x, y: cueBall.y } : null);
    if (from) {
      const a = t.toCanvas(from);
      const b = t.toCanvas(mirror);
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = GUIDES.bank;
      ctx.lineWidth = Math.max(1, t.scale * 0.05);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const m = t.toCanvas(mirror);
    ctx.beginPath();
    ctx.arc(m.x, m.y, Math.max(2, t.scale * 0.25), 0, Math.PI * 2);
    ctx.strokeStyle = GUIDES.bank;
    ctx.lineWidth = Math.max(1, t.scale * 0.06);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(m.x - 4, m.y);
    ctx.lineTo(m.x + 4, m.y);
    ctx.moveTo(m.x, m.y - 4);
    ctx.lineTo(m.x, m.y + 4);
    ctx.strokeStyle = GUIDES.bank;
    ctx.stroke();
  }

  ctx.restore();
}

// ---- misc helpers ---------------------------------------------------------

function roundRect(ctx, x, y, w, h, radius) {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
