# Pool Trainer — Module Contract Spec

A browser app for visualizing practical pool shots (cuts, banks, kicks, spin/english, combos)
from two synchronized angles: a **top-down** table view and a **cue view** (perspective from
behind the cue ball, sighting down the shot line).

**Stack:** Vite + React + TypeScript (strict), `<canvas>` for both views. Vitest for tests.
The engine/renderer contract below is unchanged from the original vanilla build — only the
file layout and language moved.

## Stack (Vite/React/TS layout)

- Build tooling: Vite (`vite.config.ts`, dev server on port 5174), TypeScript project references
  (`tsconfig.json` → `tsconfig.app.json` for `src/`, `tsconfig.node.json` for `vite.config.ts`),
  strict mode on. `npm run dev` / `build` / `preview` / `test` map to `vite` / `tsc -b && vite
  build` / `vite preview` / `vitest run`.
- `src/engine/types.ts` — shared TS interfaces/types for the data shapes below (`Ball`, `Spin`,
  `Aim`, `AimSpec`, `ShotDef`, `Scene`, `Guides`, `SimEvent`, `SimResult`, `Frame`, `View`).
- `src/engine/constants.ts`, `src/engine/physics.ts`, `src/engine/shots.ts` — direct, typed ports
  of the former `js/constants.js` / `js/physics.js` / `js/shots.js`. Same exported names and
  behavior; import-only rule below still applies (engine modules import from
  `src/engine/constants.ts` / `src/engine/types.ts` only, no cross-imports between
  physics/shots).
- `src/render/topdown.ts`, `src/render/cueview.ts` — typed ports of the former `js/topdown.js` /
  `js/cueview.js`, rendering against the `View` type from `src/engine/types.ts`.
- `src/main.tsx` — React entry point (mounts `#root`); the React UI components that replace
  `js/main.js` + `index.html` + `styles.css` are a separate, later stage.
- `tests/shots.test.ts` — Vitest shot audit (every shot in `SHOTS` pots its intended target;
  determinism check; stop-shot check).
- `src/engine/mirror.ts` — mirror-system walkthrough geometry: `mirrorWalkthrough(scene, guides)`
  returns `MirrorWalkthrough | null` (non-null only for aimSpec kinds `bank`/`kick`): the phantom
  target (the guides' mirror point), the phantom pocket center (banks), the bank/kick point where
  the subject→phantom line crosses the rail line, and the perpendicular rail distance. `View`
  gains an optional `mirror: { data, step: 1..5 }` field; when set, `renderTopDown` zooms out to
  fit the real table plus the ghosted mirror table folded over the bank rail and draws cumulative
  construction layers per step (1 goal → 2 phantom + equal distances → 3 straight line + bank
  point → 4 folded path + equal-angle arcs → 5 normal aiming guides). Ball dragging is disabled
  while a walkthrough is active. UI: `src/ui/MirrorWalkthroughPanel.tsx` (step dots, captions,
  Back/Next/Exit), tested by `tests/mirror.test.ts`.
- Legacy `js/`, `styles.css`, and the old static-server `index.html` have been removed now that
  the Vite/TS build is green; `index.html` at the repo root is now the Vite entry (mounts
  `/src/main.tsx`).

## Files & ownership (former vanilla layout, superseded by src/ above)

| File | Purpose |
|---|---|
| `js/constants.js` | Table geometry, pockets, ball colors, guide colors (ALREADY WRITTEN — read it, import from it, do not modify) |
| `js/physics.js` | Aiming math + deterministic shot simulation |
| `js/topdown.js` | Top-down renderer |
| `js/cueview.js` | Perspective (behind-the-cue-ball) renderer |
| `js/shots.js` | Shot library (data + teaching content) |
| `js/main.js`, `index.html`, `styles.css` | UI shell, controls, animation loop, wiring |

Modules may import ONLY from `js/constants.js` (plus `main.js`, which imports everything).
No cross-imports between physics/topdown/cueview/shots. Implement the APIs below **exactly**.

## Units & coordinates

- World units: **inches**. Playing surface `TABLE.W = 100` (x, long axis) × `TABLE.H = 50` (y). 9-ft table.
- Origin bottom-left of the playing surface; +x right, +y up (renderers flip y for canvas as needed).
- Ball radius `BALL_R = 1.125`.
- For the 3D cue view: z is up; ball centers sit at z = BALL_R; the cloth is z = 0.
- Angles: radians, standard math convention (0 = +x, CCW positive).

## Core data shapes

```js
// A ball
{ id: 'cue' | '1'..'15', x, y, pocketed: false }

// scene — the single source of truth held by main.js
scene = {
  balls: [Ball, ...],                    // cue ball always present, id 'cue'
  shot,                                  // the active ShotDef from shots.js (see below)
  aim: {
    angleOffsetDeg: 0,                   // user nudge, added to the resolved aim angle
    power: 0.55,                         // 0..1
    spin: { sx: 0, sy: 0 },             // sx: side english, -1(left tip)..+1(right tip)
  },                                     // sy: vertical, -1(draw/bottom)..+1(follow/top)
}

// ShotDef — one entry in the shot library
{
  id: 'cut-30',
  name: '30° Cut to the Corner',
  category: 'Cut Shots',                 // grouping key for the sidebar
  difficulty: 2,                         // 1..5
  description: '1–3 sentence overview of the shot and why it matters.',
  tips: ['aiming tip', 'common mistake', 'feel cue'],   // 2–4 strings
  balls: [ {id:'cue', x:25, y:25}, {id:'3', x:60, y:32} ],
  aimSpec: { ... },                      // see Aim specs
  spin: { sx: 0, sy: 0 },               // recommended starting spin
  power: 0.5,                            // recommended starting power
}

// Aim specs (resolved to a cue-ball direction by physics.resolveAimAngle)
{ kind: 'angle',  angle: 1.23 }                          // explicit radians
{ kind: 'pocket', ball: '3', pocket: 'TR' }              // ghost-ball aim: send ball to pocket
{ kind: 'bank',   ball: '3', rail: 'top', pocket: 'BR' } // one-rail bank via mirror system
{ kind: 'kick',   ball: '3', rail: 'bottom' }            // cue ball kicks off rail into ball
{ kind: 'combo',  first: '2', second: '9', pocket: 'TR' }// cue -> first -> second -> pocket
```

Pocket ids: `BL BM BR TL TM TR` (bottom-left/middle/right, top-...), see `POCKETS` in constants.

## `js/physics.js` — required exports

```js
export function aimAngle(scene)      // resolveAimAngle(scene.shot.aimSpec, scene.balls)
                                     //   + scene.aim.angleOffsetDeg * PI/180
export function resolveAimAngle(aimSpec, balls)  // -> radians (ignores user offset)
export function ghostBallPos(ball, targetPoint)  // -> {x,y}: ball.pos - 2R * normalize(target - ball.pos)
export function mirrorPoint(p, rail) // reflect point over rail line ('top'|'bottom'|'left'|'right')
                                     // rail lines are inset by BALL_R: e.g. 'top' is y = TABLE.H - BALL_R
export function computeGuides(scene) // -> Guides (below)
export function simulate(scene)      // -> { frames, events, duration }
```

### Aim resolution

- `pocket`: aim cue center at `ghostBallPos(ball, pocketAimPoint(pocket))`. The pocket aim
  point is the pocket center pulled 1.0" toward the table center for corner pockets (use the
  raw center for side pockets).
- `bank`: mirror the pocket aim point over the rail line, aim the OBJECT ball at that mirror
  point, i.e. cue aims at `ghostBallPos(ball, mirrored)`.
- `kick`: mirror the TARGET BALL center over the rail; aim the cue ball straight at the mirror point.
- `combo`: `g2 = ghostBallPos(second, pocketAimPoint)`, then aim cue at `ghostBallPos(first, g2)`.

### Guides

```js
computeGuides(scene) -> {
  aimAngle,                    // final radians incl. user offset
  ghost: {x,y} | null,         // ghost-ball center at predicted first cue->ball contact (from sim)
  firstContactBall: id | null,
  cutAngleDeg: number | null,  // angle between cue travel dir and object-ball departure dir
  fraction: number | null,     // hit fullness = 1 - sin(cut), clamp 0..1
  paths: { [ballId]: [{x,y}, ...] },  // predicted polylines (from an internal sim run), only balls that moved
  bankGuide: { mirror: {x,y}, rail } | null,  // only for kind 'bank'/'kick': the mirror construction point
  pocketed: [ballId, ...],     // balls predicted to drop
  events: [...],               // same shape as simulate() events
}
```

Implement by running the simulation internally (record polyline points every frame, and exact
contact info analytically at the moment of first cue-ball/object-ball collision).

### Simulation model (deterministic, keep it exactly this)

- Substep `dt = 1/240 s`; record a frame every 1/60 s: `{ t, balls: [{id,x,y,pocketed}] }`.
  Stop when all balls have speed 0 or `t > 12 s`.
- Launch speed: `v0 = 30 + 170 * power` in/s along the aim angle.
- Rolling friction: decelerate each moving ball 15 in/s² opposite velocity; snap to 0 below 1 in/s.
- **Pockets first (swept)**: each substep, capture if the SEGMENT the ball traveled passes within
  `p.r` of a pocket center (point-sampling tunnels at speed) → `pocketed = true`, remove from play.
  Check before rail reflection.
- **Rails**: if the center crosses `x < R`, `x > W-R`, `y < R`, `y > H-R` → reflect, EXCEPT while the
  ball is inside a pocket mouth (within `p.r + BALL_R` of a pocket center) — the cushion physically
  ends at the jaws, so mouth crossings pass through toward capture. Backstop: penetrating a full
  ball radius past the rail line without capture reflects anyway (jaw rattle). Normal component:
  `vn_out = -0.75 * vn_in`. Tangential: base retention 0.75 (angle-true; see spin below). A bounce
  never increases total speed — outgoing speed is clamped to incoming speed.
- **Ball–ball collision** (equal mass): contact is detected by exact time of impact — endpoint
  overlap is rewound to first touch, and pairs whose relative motion crosses the 2R circle
  entirely INSIDE a substep (razor-thin cuts at speed) are caught by a swept test from the
  substep's start positions. At contact the object ball takes the full normal component along the
  line of centers `n̂`; the striker keeps the tangential component. Only collisions where the CUE
  BALL is the striker (faster of the pair) get the throw treatment below; everything else is plain.
- **Throw** (cue striking an object ball): rotate the object ball's departure direction by
  `throwDeg = clamp(4.5 * (vt/|v|) * (1 - 0.3*|sy|) + 3.0 * (w/30), -6, 6)` degrees, where `vt` is
  the signed tangential component of cue velocity at contact (positive along `rot90ccw(n̂)`), `w`
  is the CURRENT (decayed) side spin, and the rotation is CCW-positive. Guides report the cut
  angle and fullness from the CONTACT geometry (line of centers vs. cue travel), not the
  post-throw departure. Spin inputs are clamped to [-1, 1] before use.
- **Vertical spin (follow/draw), cue ball only**: after the cue ball's FIRST object-ball contact,
  apply acceleration `a = sy * 95 in/s²` along the cue ball's **pre-impact direction** for 0.55 s
  (then stop applying). sy > 0 (follow) pushes it forward through the tangent line; sy < 0 (draw)
  pulls it back. With sy = 0 (stun) it stays on the tangent line. A dead-straight full hit with
  sy=0 must leave the cue ball (near) stopped. If the cue ball bounces off a rail while the
  window is active, the acceleration direction MIRRORS with the bounce (otherwise the fixed-frame
  force pins the ball against the cushion in a micro-bounce loop).
- **Side spin (english), cue ball only**: track scalar spin `w`, init `w = sx * 30` (rad/s,
  CCW-from-above positive for right english), exponential decay `w *= exp(-dt/2.0)`.
  On each cue-ball rail bounce: with `n̂` = inward rail normal and `t̂ = rot90ccw(n̂)`,
  let `vt = dot(v, t̂)`, `slip = vt - w * BALL_R * 3`; then `vt_out = vt - 0.25 * slip`
  (blends rebound toward the spin: running vs. reverse english; `1 - 0.25` matches the 0.75 base
  retention so spinless rebounds stay angle-true), then `w *= 0.6`, and the never-gain-speed
  clamp above applies. (No masse/swerve on open cloth — acceptable simplification.)
- Events array: `{t, type:'ball-ball', a, b}`, `{t, type:'rail', ball, rail}`,
  `{t, type:'pocket', ball, pocket}`.

Everything must be pure/deterministic (no Date/random).

## Renderer contract (both views)

```js
// topdown.js
export function renderTopDown(ctx, view)
// cueview.js
export function renderCueView(ctx, view)

view = {
  scene,            // current scene (aim, spin, shot)
  guides,           // computeGuides result, or null
  balls,            // positions to draw (animation frame or scene.balls)
  animating: bool,  // true while a shot is playing back
  showGuides: bool,
  cssW, cssH,       // canvas size in CSS px; ctx is already DPR-scaled — draw in CSS px
}
```

Renderers must not mutate the view. `ctx` comes pre-scaled (main.js does
`canvas.width = cssW*dpr; ctx.setTransform(dpr,0,0,dpr,0,0)`), so draw using cssW/cssH.
Clear/paint your full canvas each call. Use colors from `constants.js` (`FELT`, `BALL_COLORS`,
`GUIDES`) so both views look consistent.

### Top-down view

- Fit the table (plus wood rails ~ 5% margin) into cssW×cssH, centered, preserving aspect.
- Draw: wood frame, cushions, felt, sight diamonds, 6 pockets, balls (solids filled, 9–15 with a
  white stripe band, small number label; cue ball white with a subtle spin-dot showing sx/sy offset).
- Guides when `showGuides && !animating`:
  - cue aim line from cue ball to `guides.ghost` (white, dashed),
  - ghost ball: dashed circle outline at `guides.ghost`,
  - predicted paths: `guides.paths` polylines — cue ball path in `GUIDES.cue`, object balls in `GUIDES.object`,
  - tangent line hint: short line through ghost perpendicular to line of centers (`GUIDES.tangent`),
  - bank/kick construction: dashed line to `guides.bankGuide.mirror` + a small marker (in `GUIDES.bank`).
- During animation, draw balls at `view.balls`, no guides, but leave faint trails (optional).

### Cue view (perspective)

Full 3D pinhole projection (world → camera → screen), camera:

- `aimDir` from `guides.aimAngle` (fall back to +x). Eye = cue ball center − aimDir·18", at z = 11".
- Look-at = cue ball center + aimDir·30", z = BALL_R. Up = +z. Vertical FOV 40°;
  focal `f = (cssH/2) / tan(FOV/2)`. Cull points behind the camera.
- Draw order: room backdrop (dark gradient), felt quad (project 4 table corners; also project and
  draw rails/cushions as quads), pockets (dark ellipses), guide lines projected on the cloth
  (aim line, predicted paths — same colors as top-down), then balls back-to-front as billboarded
  circles: screen radius = `f * BALL_R / dist`, radial-gradient shading, number/stripe hint,
  ghost ball as a dashed outline circle (this makes the overlap/fullness visually obvious).
- Cue stick when `!animating`: a tapered wooden line entering from the bottom of the screen toward
  the cue ball, its tip offset from ball center by `(sx * 0.62 * r_screen, -sy * 0.62 * r_screen)`
  — i.e. the tip visually shows the english contact point. Small chalk-blue tip.
- HUD (bottom-left, small text): cut angle + fullness, e.g. `Cut 32° · ¾ ball`, from guides.
- During animation, hide stick/ghost/aim line and re-render balls each frame (camera stays fixed
  at the pre-shot position).

## `js/shots.js`

```js
export const SHOTS = [ShotDef, ...]   // ~20 shots, ordered by category then difficulty
export function getShot(id)
export function buildScene(shotDef)   // deep-copies balls, returns a fresh scene object
                                       // with aim = {angleOffsetDeg:0, power: shot.power, spin: {...shot.spin}}
```

Required coverage (categories in this order):

1. **Fundamentals** — stop shot (stun), follow, draw (straight-in shots showing cue-ball control).
2. **Cut Shots** — ~15°, 30°, 45°, and a thin (~60°+) cut; at least one to a side pocket.
3. **Spin & English** — outside english cut, inside english cut, draw for position, force follow,
   stun run-through; descriptions must explain throw and the tangent line.
4. **Bank Shots** — cross-side bank, cross-corner bank, long-rail bank, bank with running english.
5. **Kick Shots** — one-rail kick to a full hit, kick to the opposite end.
6. **Advanced** — combination (combo aimSpec), carom off the tangent line (use kind 'pocket' with
   spin and position a second ball on the tangent path), frozen-to-rail object ball.

Geometry rules: keep every setup honest — the object ball must have a clear straight line to its
target (no blocking balls), cue ball never frozen to a cushion (keep ≥ 4" clear unless the shot is
about that), all coordinates within `[BALL_R, TABLE.W-BALL_R] × [BALL_R, TABLE.H-BALL_R]`, and no
two balls overlapping. Prefer cut angles ≤ 60°, bank entry angles ≤ 45°. Write descriptions/tips
like a good instructor: what to look at, how to aim it, the classic miss.

## `index.html` / `styles.css` / `js/main.js`

- Layout: header bar (app name + current shot name/difficulty); left sidebar listing shots grouped
  by category (click to load; active state); center column with BOTH canvases — top-down on top,
  cue view below (each keeps a sensible aspect, together filling the column); right panel with:
  - Play / Reset buttons (space = play/replay, R = reset),
  - power slider (0–100%),
  - spin widget: a drawn cue-ball face (canvas or div) where clicking/dragging sets (sx, sy);
    show the contact dot; double-click to re-center,
  - aim nudge slider ±8° (arrow keys ← → nudge 0.25°) + a small readout + "re-center" button,
  - guide toggle checkbox,
  - shot info card: description, tips list, difficulty pips,
  - live readout of predicted outcome from guides (e.g. "3 ball → top-right pocket ✓" when
    guides.pocketed includes the target, else "misses — adjust aim").
- main.js owns `scene`, recomputes `computeGuides` on ANY input change (cheap enough), and renders
  both views. Animation: on Play run `simulate(scene)` once, then play frames against
  `requestAnimationFrame` wall-clock (0.5×/1× speed select), passing frame balls into `view.balls`;
  when done leave the final positions until Reset.
- Ball dragging on the top-down canvas in practice: pointer-down hit-test (in table coords),
  drag cue/object balls to new legal positions, guides update live. Cursor feedback.
- Dark, polished UI: felt-green accents, readable typography, no frameworks. Responsive enough
  for a 1280×800 window without horizontal scroll.
- DPR-correct canvas sizing on resize (ResizeObserver or window resize).
- App must boot with the first shot loaded and guides visible.

## Responsive & touch layout

The trainer is meant to be usable at the table, phone in hand, so every feature has to
survive a 320px-wide screen and a fingertip. Breakpoints live in
`src/ui/hooks/useMediaQuery.ts` and must stay in sync with the media queries in
`src/styles.css` — CSS owns layout, the hook owns which chrome React renders.

| Mode | Matches | Layout |
|---|---|---|
| wide | > 1099px | sidebar ǀ views ǀ right panel (the original three columns) |
| medium | ≤ 1099px | views ǀ right panel; sidebar becomes an off-canvas drawer |
| compact | ≤ 859px, or ≤ 1099px and ≤ 560px tall | single column: views above, docked transport below, controls in a collapsible sheet |
| rail | compact and landscape | dock moves to a right-hand rail, the two views sit side by side |

- **Shot library**: a drawer on medium/compact — hamburger in the header, backdrop, Escape or
  a selection closes it. `inert` + `visibility: hidden` keep it out of the focus order when shut.
- **Dock**: stays in normal flow at every size. Opening the sheet shrinks the view area rather
  than covering it, so the canvases refit (via their ResizeObserver) instead of hiding behind an
  overlay. Play/Reset/outcome live in the always-visible action bar; the sheet holds everything
  else and is capped so the focused view keeps enough height to draw the table full-width.
- **View tabs** (compact) drive the same `maximized` state as the desktop maximize buttons.
  Opening the sheet focuses the bird's-eye view (a phone cannot show two stacked views *and* the
  sheet); closing it hands the split back unless the user picked a view meanwhile. The mirror
  walkthrough leads the sheet while it runs — its caption and Back/Next sit above
  the aim controls rather than replacing them, so a walkthrough stays a shot you
  can also re-aim and replay.
- **Canvas gestures**: both canvases set `touch-action: none` and track pointers by id — one
  finger drags a ball (preserving the grab offset) or pans when zoomed, two fingers pinch-zoom
  anchored on the midpoint. Ball hit-testing uses `max(BALL_R * 1.6, 24px / scale)` so the grab
  target is fingertip-sized at any zoom.
- **Touch affordances**: 44px minimum targets, ± steppers on the aim nudge (the phone equivalent
  of ← →), a "Center tip" button (the equivalent of double-clicking the spin face), 16px selects
  so iOS does not zoom on focus, and gesture wording in the hint bar when the pointer is coarse.
- `100dvh` sizing plus `env(safe-area-inset-*)` padding and `viewport-fit=cover`; the body never
  scrolls or rubber-bands (`overscroll-behavior: none`).
