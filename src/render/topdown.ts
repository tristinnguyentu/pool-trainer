// Top-down table renderer.
// Imports from ../engine/constants.ts and ../engine/types.ts. Pure rendering — never mutates `view`.

import { TABLE, BALL_R, POCKETS, BALL_COLORS, clamp, isStripe, FELT, GUIDES, POCKET_MOUTH_VISUAL } from '../engine/constants';
import { railLine, reflectOverRail } from '../engine/mirror';
import type { Ball, MirrorWalkthrough, MirrorStep, RailName, Scene, TableZoom, Vec2, View } from '../engine/types';

// ---- Layout constants (table + frame fit) ---------------------------------

const FRAME_IN = 5.2; // wood frame thickness outside the playing surface, inches
const MARGIN_FRAC = 0.05; // breathing room around the frame, fraction of min(cssW,cssH)
const CUSHION_IN = 2.1; // rubber cushion band width just inside the rail, inches

// ---- Coordinate transform (shared by renderer + main.js hit-testing) -----

export interface TableTransform {
  scale: number;
  ox: number;
  oy: number;
  toCanvas: (pt: Vec2) => Vec2;
  toTable: (pt: Vec2) => Vec2;
}

// Shared closure factory: both tableTransform and mirrorTransform produce a
// TableTransform from a resolved (scale, ox, oy) — this is the only place
// toCanvas/toTable are defined.
function makeTransform(scale: number, ox: number, oy: number): TableTransform {
  function toCanvas(pt: Vec2): Vec2 {
    return { x: ox + pt.x * scale, y: oy - pt.y * scale };
  }
  function toTable(pt: Vec2): Vec2 {
    return { x: (pt.x - ox) / scale, y: (oy - pt.y) / scale };
  }
  return { scale, ox, oy, toCanvas, toTable };
}

export function tableTransform(cssW: number, cssH: number): TableTransform {
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

  return makeTransform(scale, ox, oy);
}

// The single source of truth for the top-down coordinate mapping: the base
// fit (normal table or zoomed-out mirror walkthrough) composed with the
// user's zoom/pan about the canvas center. Renderer and pointer hit-testing
// must both use THIS so clicks always land where pixels are.
export function viewTransform(
  cssW: number,
  cssH: number,
  mirrorData: MirrorWalkthrough | null,
  zoom?: TableZoom | null,
): TableTransform {
  const base = mirrorData ? mirrorTransform(cssW, cssH, mirrorData) : tableTransform(cssW, cssH);
  if (!zoom || (zoom.scale === 1 && zoom.panX === 0 && zoom.panY === 0)) return base;
  const z = zoom.scale;
  const cx = cssW / 2;
  const cy = cssH / 2;
  return makeTransform(base.scale * z, (base.ox - cx) * z + cx + zoom.panX, (base.oy - cy) * z + cy + zoom.panY);
}

// Derive the outer frame rect (canvas px) from a transform result.
function frameRect(t: TableTransform) {
  const left = t.ox - FRAME_IN * t.scale;
  const top = t.oy - TABLE.H * t.scale - FRAME_IN * t.scale;
  const w = (TABLE.W + FRAME_IN * 2) * t.scale;
  const h = (TABLE.H + FRAME_IN * 2) * t.scale;
  return { left, top, w, h };
}

// ---- small trail memory for animation flavor (optional, module-scoped) ---

const trailHistory = new Map<string, Vec2[]>(); // id -> [{x,y}, ...]
let wasAnimating = false;

function updateTrails(balls: Ball[], animating: boolean): void {
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

export function renderTopDown(ctx: CanvasRenderingContext2D, view: View): void {
  const { cssW, cssH } = view;
  const mirror = view.mirror ?? null;
  const t = viewTransform(cssW, cssH, mirror ? mirror.data : null, view.tableZoom);
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

  // Mirror-world layers sit under the balls so real objects stay on top.
  if (mirror) {
    drawMirrorLayers(ctx, t, view, mirror.data, mirror.step);
  }

  if (view.animating) {
    drawTrails(ctx, t);
  }

  for (const b of balls) {
    if (b.pocketed) continue;
    const alpha = b.id === 'cue' ? clamp(view.cueBallAlpha ?? 1, 0.1, 1) : 1;
    if (alpha < 1) {
      ctx.save();
      ctx.globalAlpha = alpha;
      drawBall(ctx, t, b, view.scene);
      ctx.restore();
    } else {
      drawBall(ctx, t, b, view.scene);
    }
  }

  if (mirror) {
    drawMirrorOverlays(ctx, t, view, mirror.data, mirror.step);
  } else if (view.showGuides && !view.animating && view.guides) {
    drawGuides(ctx, t, view);
  }

  // the cue stick sits above everything on the table
  if (!view.animating && view.guides) {
    drawTopDownStick(ctx, t, view);
  }

  ctx.restore();
}

// Tapered cue stick behind the cue ball along the aim line, tip offset
// sideways with the english so the strike point reads from above too.
function drawTopDownStick(ctx: CanvasRenderingContext2D, t: TableTransform, view: View): void {
  const cueBall = (view.scene?.balls ?? []).find((b) => b.id === 'cue' && !b.pocketed);
  const guides = view.guides;
  if (!cueBall || !guides) return;

  const dir = { x: Math.cos(guides.aimAngle), y: Math.sin(guides.aimAngle) };
  const perp = { x: -dir.y, y: dir.x };
  const spin = view.scene.aim?.spin ?? { sx: 0, sy: 0 };
  // side english shifts the tip across the ball face (matches the spin dot)
  const side = -spin.sx * BALL_R * 0.62;

  const gap = BALL_R + 0.7; // tip hovers just behind the ball
  const len = 56;
  const tipC = {
    x: cueBall.x - dir.x * gap + perp.x * side,
    y: cueBall.y - dir.y * gap + perp.y * side,
  };
  const buttC = { x: tipC.x - dir.x * len, y: tipC.y - dir.y * len };
  const tip = t.toCanvas(tipC);
  const butt = t.toCanvas(buttC);
  const wTip = Math.max(1.2, 0.42 * t.scale);
  const wButt = Math.max(2.2, 1.05 * t.scale);
  const px = { x: -(tip.y - butt.y), y: tip.x - butt.x };
  const pLen = Math.hypot(px.x, px.y) || 1;
  const pu = { x: px.x / pLen, y: px.y / pLen };

  ctx.save();
  const grad = ctx.createLinearGradient(tip.x, tip.y, butt.x, butt.y);
  grad.addColorStop(0, '#e8c890');
  grad.addColorStop(0.72, '#8a5a30');
  grad.addColorStop(1, '#3c2414');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(tip.x + pu.x * wTip, tip.y + pu.y * wTip);
  ctx.lineTo(butt.x + pu.x * wButt, butt.y + pu.y * wButt);
  ctx.lineTo(butt.x - pu.x * wButt, butt.y - pu.y * wButt);
  ctx.lineTo(tip.x - pu.x * wTip, tip.y - pu.y * wTip);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 0.75;
  ctx.stroke();

  // chalk-blue ferrule/tip cap
  const capLen = Math.max(2, 1.6 * t.scale);
  const capEnd = {
    x: tip.x + ((butt.x - tip.x) / Math.hypot(butt.x - tip.x, butt.y - tip.y || 1)) * capLen,
    y: tip.y + ((butt.y - tip.y) / Math.hypot(butt.x - tip.x, butt.y - tip.y || 1)) * capLen,
  };
  ctx.beginPath();
  ctx.moveTo(tip.x + pu.x * wTip, tip.y + pu.y * wTip);
  ctx.lineTo(capEnd.x + pu.x * wTip, capEnd.y + pu.y * wTip);
  ctx.lineTo(capEnd.x - pu.x * wTip, capEnd.y - pu.y * wTip);
  ctx.lineTo(tip.x - pu.x * wTip, tip.y - pu.y * wTip);
  ctx.closePath();
  ctx.fillStyle = '#5b8fc7';
  ctx.fill();
  ctx.restore();
}

// Zoomed-out fit for the walkthrough: real table (with frame) + the mirror
// table folded over the bank rail, centered and aspect-preserving.
function mirrorTransform(cssW: number, cssH: number, data: MirrorWalkthrough): TableTransform {
  const pad = 2; // inches of breathing room around the union box
  let minX = -FRAME_IN;
  let minY = -FRAME_IN;
  let maxX = TABLE.W + FRAME_IN;
  let maxY = TABLE.H + FRAME_IN;
  const cornerA = reflectOverRail({ x: 0, y: 0 }, data.rail);
  const cornerB = reflectOverRail({ x: TABLE.W, y: TABLE.H }, data.rail);
  minX = Math.min(minX, cornerA.x, cornerB.x) - pad;
  minY = Math.min(minY, cornerA.y, cornerB.y) - pad;
  maxX = Math.max(maxX, cornerA.x, cornerB.x) + pad;
  maxY = Math.max(maxY, cornerA.y, cornerB.y) + pad;

  const margin = 0.03 * Math.min(cssW, cssH);
  const availW = Math.max(1, cssW - margin * 2);
  const availH = Math.max(1, cssH - margin * 2);
  const scale = Math.max(0.0001, Math.min(availW / (maxX - minX), availH / (maxY - minY)));
  const drawW = (maxX - minX) * scale;
  const drawH = (maxY - minY) * scale;
  const ox = (cssW - drawW) / 2 - minX * scale;
  const oy = (cssH - drawH) / 2 + maxY * scale;

  return makeTransform(scale, ox, oy);
}

// ---- frame / felt / cushions / diamonds / pockets ----------------------

function drawFrame(ctx: CanvasRenderingContext2D, t: TableTransform): void {
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

function drawFelt(ctx: CanvasRenderingContext2D, t: TableTransform): void {
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

function drawCushions(ctx: CanvasRenderingContext2D, t: TableTransform): void {
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
  ] as const;
  for (const band of bands) {
    let grad: CanvasGradient;
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

function drawDiamonds(ctx: CanvasRenderingContext2D, t: TableTransform): void {
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

function drawDiamondMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.lineTo(cx + s, cy);
  ctx.lineTo(cx, cy + s);
  ctx.lineTo(cx - s, cy);
  ctx.closePath();
  ctx.fill();
}

function drawPockets(ctx: CanvasRenderingContext2D, t: TableTransform): void {
  for (const p of POCKETS) {
    const c = t.toCanvas({ x: p.x, y: p.y });
    const r = p.r * t.scale * POCKET_MOUTH_VISUAL; // visual mouth a bit tighter than capture radius
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

function drawBall(ctx: CanvasRenderingContext2D, t: TableTransform, ball: Ball, scene: Scene): void {
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

function drawBallNumber(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, id: string): void {
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

function drawSpinDot(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, scene: Scene): void {
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

function drawTrails(ctx: CanvasRenderingContext2D, t: TableTransform): void {
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

// For kicks, guides.ghost is the cue ball's contact position AFTER the rail
// bounce — the real pre-bounce launch direction is cue -> kickPoint, where
// kickPoint is where the straight cue->mirror construction line crosses the
// rail. Same parametric lerp mirror.ts's mirrorWalkthrough uses for bankPoint.
function kickPointOnRail(from: Vec2, mirrorPt: Vec2, rail: RailName): Vec2 {
  const line = railLine(rail);
  const a = line.axis === 'y' ? from.y : from.x;
  const b = line.axis === 'y' ? mirrorPt.y : mirrorPt.x;
  const denom = b - a;
  const tt = Math.abs(denom) < 1e-9 ? 0.5 : Math.max(0, Math.min(1, (line.value - a) / denom));
  return { x: from.x + (mirrorPt.x - from.x) * tt, y: from.y + (mirrorPt.y - from.y) * tt };
}

function drawGuides(ctx: CanvasRenderingContext2D, t: TableTransform, view: View): void {
  const guides = view.guides!;
  const scene = view.scene;
  const cueBall = (scene && scene.balls ? scene.balls : []).find((b) => b.id === 'cue');
  const isKick = scene?.shot?.aimSpec?.kind === 'kick';

  ctx.save();

  // aim line: cue -> ghost (kicks: cue -> kickPoint -> ghost, since ghost is
  // the post-bounce contact position, not the real launch direction)
  if (cueBall && guides.ghost) {
    ctx.beginPath();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = GUIDES.aim;
    ctx.lineWidth = Math.max(1, t.scale * 0.06);
    if (isKick && guides.bankGuide) {
      const kickPoint = kickPointOnRail(cueBall, guides.bankGuide.mirror, guides.bankGuide.rail);
      const a = t.toCanvas({ x: cueBall.x, y: cueBall.y });
      const k = t.toCanvas(kickPoint);
      const b = t.toCanvas(guides.ghost);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(k.x, k.y);
      ctx.moveTo(k.x, k.y);
      ctx.lineTo(b.x, b.y);
    } else {
      const a = t.toCanvas({ x: cueBall.x, y: cueBall.y });
      const b = t.toCanvas(guides.ghost);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
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
    // Kicks: the line you actually sight is cue -> mirror (the cue ball is
    // what travels to the rail). Banks: object ball's ghost -> mirror.
    const from = isKick
      ? (cueBall ? { x: cueBall.x, y: cueBall.y } : null)
      : guides.ghost || (cueBall ? { x: cueBall.x, y: cueBall.y } : null);
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

// ---- mirror-system walkthrough -------------------------------------------

// Layers drawn UNDER the balls: the ghosted mirror-image table (step >= 2).
function drawMirrorLayers(
  ctx: CanvasRenderingContext2D,
  t: TableTransform,
  _view: View,
  data: MirrorWalkthrough,
  step: MirrorStep,
): void {
  if (step < 2) return;

  const a = t.toCanvas(reflectOverRail({ x: 0, y: 0 }, data.rail));
  const b = t.toCanvas(reflectOverRail({ x: TABLE.W, y: TABLE.H }, data.rail));
  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const w = Math.abs(b.x - a.x);
  const h = Math.abs(b.y - a.y);

  ctx.save();
  ctx.fillStyle = 'rgba(46, 125, 79, 0.10)';
  ctx.fillRect(left, top, w, h);
  ctx.setLineDash([7, 6]);
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 1.25;
  ctx.strokeRect(left, top, w, h);
  ctx.setLineDash([]);

  // faint mirrored pockets so the ghost table reads as a table
  for (const p of POCKETS) {
    const c = t.toCanvas(reflectOverRail({ x: p.x, y: p.y }, data.rail));
    ctx.beginPath();
    ctx.arc(c.x, c.y, p.r * t.scale * POCKET_MOUTH_VISUAL, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(13,13,13,0.35)';
    ctx.fill();
  }

  // the phantom target, highlighted
  if (data.kind === 'bank' && data.phantomPocketCenter) {
    const c = t.toCanvas(data.phantomPocketCenter);
    const targetPocket = POCKETS.find((p) => p.id === data.realPocketId);
    const r = (targetPocket ? targetPocket.r : 2.9) * t.scale * POCKET_MOUTH_VISUAL;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(13,13,13,0.8)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(c.x, c.y, r + 3, 0, Math.PI * 2);
    ctx.strokeStyle = GUIDES.bank;
    ctx.lineWidth = 2;
    ctx.stroke();
    drawLabelPill(ctx, c.x, c.y - r - 12, 'phantom pocket');
  } else if (data.kind === 'kick') {
    const c = t.toCanvas(data.phantomTarget);
    const r = BALL_R * t.scale;
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = GUIDES.bank;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(c.x, c.y, r + 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,154,92,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    drawLabelPill(ctx, c.x, c.y - r - 14, 'phantom ball');
  }
  ctx.restore();
}

// Layers drawn OVER the balls: highlights, construction lines, angles, labels.
function drawMirrorOverlays(
  ctx: CanvasRenderingContext2D,
  t: TableTransform,
  view: View,
  data: MirrorWalkthrough,
  step: MirrorStep,
): void {
  const scene = view.scene;
  const subject = scene.balls.find((b) => b.id === data.subjectBallId);
  if (!subject) return;
  const subjC = t.toCanvas({ x: subject.x, y: subject.y });
  const realTarget = reflectOverRail(data.phantomTarget, data.rail);
  const animating = !!view.animating;

  ctx.save();

  // Ball/pocket highlight rings mark the SETUP positions, so they only make
  // sense while the table is in its pre-shot state — during and after
  // playback the subject ball has moved (or dropped) and a ring would circle
  // empty cloth.
  if (!animating) {
    ctx.beginPath();
    ctx.arc(subjC.x, subjC.y, BALL_R * t.scale + 4, 0, Math.PI * 2);
    ctx.strokeStyle = GUIDES.object;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (data.kind === 'bank' && data.realPocketId) {
      const p = POCKETS.find((pk) => pk.id === data.realPocketId);
      if (p) {
        const c = t.toCanvas({ x: p.x, y: p.y });
        ctx.beginPath();
        ctx.arc(c.x, c.y, p.r * t.scale * POCKET_MOUTH_VISUAL + 3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } else if (data.kind === 'kick' && data.targetBallId) {
      const tb = scene.balls.find((b) => b.id === data.targetBallId);
      if (tb) {
        const c = t.toCanvas({ x: tb.x, y: tb.y });
        ctx.beginPath();
        ctx.arc(c.x, c.y, BALL_R * t.scale + 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  // step 1-3: the predicted bent path, faint — "the shot we're building"
  if (step <= 3 && !animating && view.guides?.paths) {
    const pts = view.guides.paths[data.subjectBallId];
    if (pts && pts.length > 1) {
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const c = t.toCanvas(pts[i]);
        if (i === 0) ctx.moveTo(c.x, c.y);
        else ctx.lineTo(c.x, c.y);
      }
      ctx.strokeStyle = GUIDES.object;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // step >= 2: equal perpendicular distances "d" either side of the rail line
  if (step >= 2) {
    const line = railLine(data.rail);
    const realPoint =
      data.kind === 'bank' && data.phantomPocketCenter
        ? reflectOverRail(data.phantomPocketCenter, data.rail)
        : realTarget;
    const phantomPoint =
      data.kind === 'bank' && data.phantomPocketCenter ? data.phantomPocketCenter : data.phantomTarget;
    const foot: Vec2 =
      line.axis === 'y' ? { x: realPoint.x, y: line.value } : { x: line.value, y: realPoint.y };
    drawDistanceMarker(ctx, t, foot, realPoint, 'd');
    drawDistanceMarker(ctx, t, foot, phantomPoint, 'd');
  }

  // step >= 3: straight construction line to the phantom + bank point marker
  if (step >= 3) {
    const alpha = step === 4 ? 0.35 : 0.95;
    const pA = subjC;
    const pB = t.toCanvas(data.phantomTarget);
    ctx.beginPath();
    ctx.setLineDash([7, 6]);
    ctx.moveTo(pA.x, pA.y);
    ctx.lineTo(pB.x, pB.y);
    ctx.strokeStyle = GUIDES.bank;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 2.25;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    const bp = t.toCanvas(data.bankPoint);
    ctx.beginPath();
    ctx.moveTo(bp.x - 6, bp.y - 6);
    ctx.lineTo(bp.x + 6, bp.y + 6);
    ctx.moveTo(bp.x - 6, bp.y + 6);
    ctx.lineTo(bp.x + 6, bp.y - 6);
    ctx.strokeStyle = GUIDES.bank;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    let labelOx = 0;
    let labelOy = 0;
    if (data.rail === 'left' || data.rail === 'right') {
      labelOx = data.rail === 'left' ? 16 : -16;
    } else {
      labelOy = data.rail === 'bottom' ? 16 : -16;
    }
    drawLabelPill(ctx, bp.x + labelOx, bp.y + labelOy, data.kind === 'bank' ? 'bank point' : 'kick point');
  }

  // step >= 4: the folded-back real path + equal-angle arcs at the rail
  if (step >= 4) {
    const bp = t.toCanvas(data.bankPoint);
    const rt = t.toCanvas(realTarget);
    ctx.beginPath();
    ctx.moveTo(subjC.x, subjC.y);
    ctx.lineTo(bp.x, bp.y);
    ctx.lineTo(rt.x, rt.y);
    ctx.strokeStyle = GUIDES.object;
    ctx.lineWidth = 3;
    ctx.stroke();
    drawEqualAngleArcs(ctx, bp, subjC, rt, data.rail);
  }

  // step 5: back to a normal shot — the regular aiming guides
  if (step === 5 && !animating && view.guides) {
    const cueBall = scene.balls.find((b) => b.id === 'cue');
    const g = view.guides;
    if (cueBall && g.ghost) {
      const a = t.toCanvas({ x: cueBall.x, y: cueBall.y });
      const gh = t.toCanvas(g.ghost);
      ctx.beginPath();
      ctx.setLineDash([6, 5]);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(gh.x, gh.y);
      ctx.strokeStyle = GUIDES.aim;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.arc(gh.x, gh.y, BALL_R * t.scale, 0, Math.PI * 2);
      ctx.strokeStyle = GUIDES.ghost;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  ctx.restore();
}

// Thin double-headed arrow from `from` to `to` with a small text label.
function drawDistanceMarker(
  ctx: CanvasRenderingContext2D,
  t: TableTransform,
  from: Vec2,
  to: Vec2,
  label: string,
): void {
  const a = t.toCanvas(from);
  const b = t.toCanvas(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 8) return;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  for (const [tip, dirx, diry] of [
    [a, ux, uy],
    [b, -ux, -uy],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x + dirx * 7 + px * 3.5, tip.y + diry * 7 + py * 3.5);
    ctx.lineTo(tip.x + dirx * 7 - px * 3.5, tip.y + diry * 7 - py * 3.5);
    ctx.closePath();
    ctx.fill();
  }
  const mx = (a.x + b.x) / 2 + px * 12;
  const my = (a.y + b.y) / 2 + py * 12;
  ctx.font = 'italic 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(label, mx, my);
  ctx.restore();
}

// Two same-radius arcs at the bank point, each from the rail direction to a
// ray (incoming / outgoing), with a tick — visually "these angles match".
function drawEqualAngleArcs(
  ctx: CanvasRenderingContext2D,
  bp: Vec2,
  toIn: Vec2,
  toOut: Vec2,
  rail: string,
): void {
  const railAngles = rail === 'left' || rail === 'right' ? [Math.PI / 2, -Math.PI / 2] : [0, Math.PI];
  const radius = 18;

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.5;
  for (const target of [toIn, toOut]) {
    const ang = Math.atan2(target.y - bp.y, target.x - bp.x);
    // nearest rail-tangent direction
    let best = railAngles[0];
    let bestDiff = Infinity;
    for (const ra of railAngles) {
      let diff = ang - ra;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      if (Math.abs(diff) < Math.abs(bestDiff)) {
        bestDiff = diff;
        best = ra;
      }
    }
    const ccw = bestDiff < 0;
    ctx.beginPath();
    ctx.arc(bp.x, bp.y, radius, best, best + bestDiff, ccw);
    ctx.stroke();
    // tick at the arc midpoint
    const mid = best + bestDiff / 2;
    ctx.beginPath();
    ctx.moveTo(bp.x + Math.cos(mid) * (radius - 4), bp.y + Math.sin(mid) * (radius - 4));
    ctx.lineTo(bp.x + Math.cos(mid) * (radius + 4), bp.y + Math.sin(mid) * (radius + 4));
    ctx.stroke();
  }
  ctx.restore();
}

function drawLabelPill(ctx: CanvasRenderingContext2D, cx: number, cy: number, text: string): void {
  ctx.save();
  ctx.font = '11px sans-serif';
  const w = ctx.measureText(text).width + 12;
  const h = 17;
  ctx.fillStyle = 'rgba(10,12,11,0.82)';
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(240,240,235,0.95)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + 0.5);
  ctx.restore();
}

// ---- misc helpers ---------------------------------------------------------

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number): void {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
