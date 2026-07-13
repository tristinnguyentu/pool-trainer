// UI shell: wires shots.js / physics.js / topdown.js / cueview.js together.
// The four sibling modules are loaded dynamically (not via static import) so that,
// if any of them is missing or throws while other agents are still writing it,
// boot() can catch the failure and show a readable error overlay instead of a
// blank page / silent console error.

import { TABLE, BALL_R } from './constants.js';

// Populated by boot() from the dynamically-imported sibling modules.
let SHOTS, getShot, buildScene;
let aimAngle, computeGuides, simulate;
let renderTopDown, tableTransform;
let renderCueView;

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------

const appEl = document.getElementById('app');
const bootErrorEl = document.getElementById('boot-error');
const bootErrorMessageEl = document.getElementById('boot-error-message');
const bootErrorStackEl = document.getElementById('boot-error-stack');

const headerShotNameEl = document.getElementById('header-shot-name');
const headerShotPipsEl = document.getElementById('header-shot-pips');

const shotListEl = document.getElementById('shot-list');

const topdownContainer = document.getElementById('topdown-container');
const topdownCanvas = document.getElementById('topdown');
const cueviewContainer = document.getElementById('cueview-container');
const cueviewCanvas = document.getElementById('cueview');

const btnPlay = document.getElementById('btn-play');
const btnReset = document.getElementById('btn-reset');
const speedSelect = document.getElementById('speed-select');

const powerSlider = document.getElementById('power-slider');
const powerReadout = document.getElementById('power-readout');

const spinCanvas = document.getElementById('spin-widget');

const aimSlider = document.getElementById('aim-slider');
const aimReadout = document.getElementById('aim-readout');
const btnRecenterAim = document.getElementById('btn-recenter-aim');

const showGuidesCheckbox = document.getElementById('show-guides');

const outcomeReadoutEl = document.getElementById('outcome-readout');

const shotInfoNameEl = document.getElementById('shot-info-name');
const shotInfoCategoryEl = document.getElementById('shot-info-category');
const shotInfoPipsEl = document.getElementById('shot-info-pips');
const shotInfoDescriptionEl = document.getElementById('shot-info-description');
const shotInfoTipsEl = document.getElementById('shot-info-tips');

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let scene = null;
let guides = null;
let currentShotDef = null;

let isAnimating = false;
let animFrames = null;
let animElapsed = 0;
let animLastNow = null;
let animRAF = null;
let currentFrameBalls = null; // balls array for the frame currently being drawn
let frozenBalls = null; // final animation frame, kept until Reset/shot change
let playbackSpeed = parseFloat(speedSelect.value) || 1;

let topdownSize = { w: 0, h: 0 };
let cueviewSize = { w: 0, h: 0 };
let topdownCtx = null;
let cueviewCtx = null;
let spinCtx = null;

let dragBallId = null;
let spinDragging = false;

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function boot() {
  const [shotsMod, physicsMod, topdownMod, cueviewMod] = await Promise.all([
    import('./shots.js'),
    import('./physics.js'),
    import('./topdown.js'),
    import('./cueview.js'),
  ]);

  ({ SHOTS, getShot, buildScene } = shotsMod);
  ({ aimAngle, computeGuides, simulate } = physicsMod);
  ({ renderTopDown, tableTransform } = topdownMod);
  ({ renderCueView } = cueviewMod);

  if (!Array.isArray(SHOTS) || SHOTS.length === 0) {
    throw new Error('shots.js loaded but SHOTS is empty or not an array.');
  }

  setupCanvasSizing(topdownCanvas, topdownContainer, (w, h) => {
    topdownSize = { w, h };
    topdownCtx = topdownCanvas.getContext('2d');
    render();
  });
  setupCanvasSizing(cueviewCanvas, cueviewContainer, (w, h) => {
    cueviewSize = { w, h };
    cueviewCtx = cueviewCanvas.getContext('2d');
    render();
  });

  spinCtx = spinCanvas.getContext('2d');

  buildSidebar();
  wireControls();
  wireSpinWidget();
  wireTopdownDrag();
  wireKeyboard();

  selectShot(SHOTS[0].id);
}

function showBootError(err) {
  console.error(err);
  if (appEl) appEl.style.display = 'none';
  if (bootErrorEl) bootErrorEl.hidden = false;
  if (bootErrorMessageEl) bootErrorMessageEl.textContent = (err && err.message) || String(err);
  if (bootErrorStackEl) bootErrorStackEl.textContent = (err && err.stack) || '';
}

boot().catch(showBootError);

// ---------------------------------------------------------------------------
// Canvas sizing (DPR-aware, ResizeObserver driven)
// ---------------------------------------------------------------------------

function setupCanvasSizing(canvas, container, onResize) {
  function resize() {
    const rect = container.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    onResize(cssW, cssH);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function buildSidebar() {
  shotListEl.innerHTML = '';
  const order = [];
  const byCategory = new Map();
  for (const shot of SHOTS) {
    if (!byCategory.has(shot.category)) {
      byCategory.set(shot.category, []);
      order.push(shot.category);
    }
    byCategory.get(shot.category).push(shot);
  }

  for (const category of order) {
    const catDiv = document.createElement('div');
    catDiv.className = 'shot-category';

    const title = document.createElement('div');
    title.className = 'shot-category-title';
    title.textContent = category;
    catDiv.appendChild(title);

    for (const shot of byCategory.get(category)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'shot-item';
      btn.dataset.shotId = shot.id;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'shot-item-name';
      nameSpan.textContent = shot.name;

      const pips = document.createElement('span');
      pips.className = 'pips';
      renderPipsInto(pips, shot.difficulty);

      btn.appendChild(nameSpan);
      btn.appendChild(pips);
      btn.addEventListener('click', () => selectShot(shot.id));
      catDiv.appendChild(btn);
    }

    shotListEl.appendChild(catDiv);
  }
}

function setActiveShotItem(shotId) {
  const items = shotListEl.querySelectorAll('.shot-item');
  items.forEach((el) => el.classList.toggle('active', el.dataset.shotId === shotId));
}

function renderPipsInto(container, difficulty) {
  container.innerHTML = '';
  const total = 5;
  const filled = Math.max(0, Math.min(total, Math.round(difficulty)));
  for (let i = 0; i < total; i++) {
    const pip = document.createElement('span');
    pip.className = 'pip' + (i < filled ? ' filled' : '');
    container.appendChild(pip);
  }
}

// ---------------------------------------------------------------------------
// Shot selection
// ---------------------------------------------------------------------------

function selectShot(shotId) {
  const shotDef = getShot(shotId);
  if (!shotDef) return;

  stopAnimation();
  frozenBalls = null;

  scene = buildScene(shotDef);
  currentShotDef = shotDef;

  powerSlider.value = String(Math.round(scene.aim.power * 100));
  updatePowerReadout();

  aimSlider.value = String(scene.aim.angleOffsetDeg);
  updateAimReadout();

  updateShotInfoCard(shotDef);
  setActiveShotItem(shotId);

  headerShotNameEl.textContent = shotDef.name;
  renderPipsInto(headerShotPipsEl, shotDef.difficulty);

  drawSpinWidget();
  recomputeGuides();
}

function updateShotInfoCard(shotDef) {
  shotInfoNameEl.textContent = shotDef.name;
  shotInfoCategoryEl.textContent = shotDef.category;
  renderPipsInto(shotInfoPipsEl, shotDef.difficulty);
  shotInfoDescriptionEl.textContent = shotDef.description || '';
  shotInfoTipsEl.innerHTML = '';
  (shotDef.tips || []).forEach((tip) => {
    const li = document.createElement('li');
    li.textContent = tip;
    shotInfoTipsEl.appendChild(li);
  });
}

// ---------------------------------------------------------------------------
// Guides / outcome readout
// ---------------------------------------------------------------------------

function recomputeGuides() {
  if (!scene) return;
  guides = computeGuides(scene);
  updateOutcomeReadout();
  render();
}

function updateOutcomeReadout() {
  const el = outcomeReadoutEl;
  if (!guides) {
    el.textContent = '—';
    el.className = 'outcome-readout';
    return;
  }
  const pocketed = guides.pocketed || [];
  if (pocketed.includes('cue')) {
    el.textContent = '✗ scratch! cue ball pocketed';
    el.className = 'outcome-readout scratch';
    return;
  }
  const objectPocketed = pocketed.filter((id) => id !== 'cue');
  if (objectPocketed.length > 0) {
    el.textContent = `✓ ${objectPocketed.join(', ')} ball → pocket`;
    el.className = 'outcome-readout pocketed';
  } else {
    el.textContent = '✗ no ball pocketed — adjust aim';
    el.className = 'outcome-readout missed';
  }
}

// ---------------------------------------------------------------------------
// Controls wiring
// ---------------------------------------------------------------------------

function wireControls() {
  btnPlay.addEventListener('click', () => play());
  btnReset.addEventListener('click', () => reset());

  speedSelect.addEventListener('change', () => {
    playbackSpeed = parseFloat(speedSelect.value) || 1;
  });

  powerSlider.addEventListener('input', () => {
    if (!scene) return;
    scene.aim.power = Number(powerSlider.value) / 100;
    updatePowerReadout();
    recomputeGuides();
  });

  aimSlider.addEventListener('input', () => {
    if (!scene) return;
    scene.aim.angleOffsetDeg = Number(aimSlider.value);
    updateAimReadout();
    recomputeGuides();
  });

  btnRecenterAim.addEventListener('click', () => {
    if (!scene) return;
    scene.aim.angleOffsetDeg = 0;
    aimSlider.value = '0';
    updateAimReadout();
    recomputeGuides();
  });

  showGuidesCheckbox.addEventListener('change', () => render());
}

function updatePowerReadout() {
  powerReadout.textContent = `${Math.round(scene.aim.power * 100)}%`;
}

function updateAimReadout() {
  aimReadout.textContent = `${scene.aim.angleOffsetDeg.toFixed(1)}°`;
}

function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || target.isContentEditable;
}

function wireKeyboard() {
  window.addEventListener('keydown', (evt) => {
    if (isTypingTarget(evt.target)) return;

    if (evt.code === 'Space') {
      evt.preventDefault();
      play();
      return;
    }
    if (evt.key === 'r' || evt.key === 'R') {
      evt.preventDefault();
      reset();
      return;
    }
    if (evt.key === 'ArrowLeft' || evt.key === 'ArrowRight') {
      if (!scene) return;
      evt.preventDefault();
      const delta = evt.key === 'ArrowLeft' ? -0.25 : 0.25;
      nudgeAim(delta);
    }
  });
}

function nudgeAim(deltaDeg) {
  if (!scene) return;
  const next = clamp(scene.aim.angleOffsetDeg + deltaDeg, -8, 8);
  scene.aim.angleOffsetDeg = next;
  aimSlider.value = String(next);
  updateAimReadout();
  recomputeGuides();
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// ---------------------------------------------------------------------------
// Spin widget
// ---------------------------------------------------------------------------

function wireSpinWidget() {
  spinCanvas.addEventListener('pointerdown', (evt) => {
    if (!scene) return;
    spinDragging = true;
    spinCanvas.setPointerCapture(evt.pointerId);
    handleSpinPointer(evt);
  });
  spinCanvas.addEventListener('pointermove', (evt) => {
    if (!spinDragging) return;
    handleSpinPointer(evt);
  });
  spinCanvas.addEventListener('pointerup', () => {
    spinDragging = false;
  });
  spinCanvas.addEventListener('pointercancel', () => {
    spinDragging = false;
  });
  spinCanvas.addEventListener('dblclick', () => {
    if (!scene) return;
    scene.aim.spin.sx = 0;
    scene.aim.spin.sy = 0;
    drawSpinWidget();
    recomputeGuides();
  });
}

function handleSpinPointer(evt) {
  const rect = spinCanvas.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const r = Math.min(rect.width, rect.height) / 2;
  let x = (evt.clientX - rect.left - cx) / r;
  let y = -(evt.clientY - rect.top - cy) / r;
  const len = Math.hypot(x, y);
  if (len > 1) {
    x /= len;
    y /= len;
  }
  scene.aim.spin.sx = x;
  scene.aim.spin.sy = y;
  drawSpinWidget();
  recomputeGuides();
}

function drawSpinWidget() {
  if (!spinCtx || !scene) return;
  const w = spinCanvas.width;
  const h = spinCanvas.height;
  const ctx = spinCtx;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.restore();

  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2 - 4;

  // cue ball face
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#cfcfcf');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.stroke();

  // crosshair
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();

  // contact dot: sx = right(+)/left(-), sy = up(+, follow)/down(-, draw)
  const sx = scene.aim.spin.sx || 0;
  const sy = scene.aim.spin.sy || 0;
  const dx = cx + sx * r * 0.92;
  const dy = cy - sy * r * 0.92;
  ctx.beginPath();
  ctx.arc(dx, dy, Math.max(3, r * 0.09), 0, Math.PI * 2);
  ctx.fillStyle = '#e0564a';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Ball dragging on the top-down canvas
// ---------------------------------------------------------------------------

function wireTopdownDrag() {
  topdownCanvas.addEventListener('pointerdown', onTopdownPointerDown);
  topdownCanvas.addEventListener('pointermove', onTopdownPointerMove);
  topdownCanvas.addEventListener('pointerup', onTopdownPointerUp);
  topdownCanvas.addEventListener('pointercancel', onTopdownPointerUp);
}

function eventToTablePoint(evt) {
  const rect = topdownCanvas.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;
  const t = tableTransform(topdownSize.w, topdownSize.h);
  return t.toTable({ x, y });
}

function onTopdownPointerDown(evt) {
  if (!scene || isAnimating || topdownSize.w === 0) return;
  const tablePt = eventToTablePoint(evt);
  let hit = null;
  let hitDist = Infinity;
  for (const b of scene.balls) {
    if (b.pocketed) continue;
    const d = Math.hypot(b.x - tablePt.x, b.y - tablePt.y);
    if (d <= BALL_R * 1.6 && d < hitDist) {
      hit = b;
      hitDist = d;
    }
  }
  if (!hit) return;
  dragBallId = hit.id;
  topdownCanvas.classList.add('grabbing');
  topdownCanvas.setPointerCapture(evt.pointerId);
}

function onTopdownPointerMove(evt) {
  if (!dragBallId || !scene) return;
  const tablePt = eventToTablePoint(evt);
  const nx = clamp(tablePt.x, BALL_R, TABLE.W - BALL_R);
  const ny = clamp(tablePt.y, BALL_R, TABLE.H - BALL_R);

  const ball = scene.balls.find((b) => b.id === dragBallId);
  if (!ball) return;

  let overlaps = false;
  for (const other of scene.balls) {
    if (other.id === dragBallId || other.pocketed) continue;
    if (Math.hypot(other.x - nx, other.y - ny) < 2 * BALL_R) {
      overlaps = true;
      break;
    }
  }
  if (!overlaps) {
    ball.x = nx;
    ball.y = ny;
    recomputeGuides();
  }
}

function onTopdownPointerUp() {
  if (dragBallId) {
    dragBallId = null;
    topdownCanvas.classList.remove('grabbing');
  }
}

// ---------------------------------------------------------------------------
// Playback
// ---------------------------------------------------------------------------

function play() {
  if (!scene) return;
  stopAnimation();
  frozenBalls = null;

  const sim = simulate(scene);
  animFrames = sim.frames && sim.frames.length ? sim.frames : [{ t: 0, balls: scene.balls }];
  animElapsed = 0;
  animLastNow = null;
  isAnimating = true;
  currentFrameBalls = animFrames[0].balls;
  animRAF = requestAnimationFrame(tick);
}

function reset() {
  stopAnimation();
  frozenBalls = null;
  currentFrameBalls = null;
  recomputeGuides();
}

function stopAnimation() {
  isAnimating = false;
  if (animRAF !== null) {
    cancelAnimationFrame(animRAF);
    animRAF = null;
  }
  animLastNow = null;
}

function tick(now) {
  if (!isAnimating) return;
  if (animLastNow === null) animLastNow = now;
  const dtReal = (now - animLastNow) / 1000;
  animLastNow = now;
  animElapsed += dtReal * playbackSpeed;

  const frames = animFrames;
  const lastT = frames[frames.length - 1].t;

  if (animElapsed >= lastT) {
    currentFrameBalls = frames[frames.length - 1].balls;
    frozenBalls = currentFrameBalls;
    isAnimating = false;
    animRAF = null;
    render();
    return;
  }

  let idx = Math.floor(animElapsed * 60);
  if (idx < 0) idx = 0;
  if (idx >= frames.length) idx = frames.length - 1;
  currentFrameBalls = frames[idx].balls;
  render();
  animRAF = requestAnimationFrame(tick);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function render() {
  if (!scene || !topdownCtx || !cueviewCtx) return;

  const balls = isAnimating ? currentFrameBalls : frozenBalls || scene.balls;
  const showGuides = showGuidesCheckbox.checked;

  const topView = {
    scene,
    guides,
    balls,
    animating: isAnimating,
    showGuides,
    cssW: topdownSize.w,
    cssH: topdownSize.h,
  };
  renderTopDown(topdownCtx, topView);

  const cueView = {
    scene,
    guides,
    balls,
    animating: isAnimating,
    showGuides,
    cssW: cueviewSize.w,
    cssH: cueviewSize.h,
  };
  renderCueView(cueviewCtx, cueView);
}
