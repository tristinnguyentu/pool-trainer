// Shared type definitions for the pool-trainer engine + renderers.
// Mirrors the data shapes documented in SPEC.md. No runtime code here.

export interface Vec2 {
  x: number;
  y: number;
}

export interface Ball {
  id: string;
  x: number;
  y: number;
  pocketed: boolean;
}

/** A ball position only (no pocketed flag) — used in ShotDef.balls. */
export interface BallPos {
  id: string;
  x: number;
  y: number;
}

export interface Spin {
  sx: number; // side english: -1 (left tip) .. +1 (right tip)
  sy: number; // vertical spin: -1 (draw/bottom) .. +1 (follow/top)
}

export interface Aim {
  angleOffsetDeg: number; // user nudge, added to the resolved aim angle
  power: number; // 0..1
  spin: Spin;
}

export type RailName = 'top' | 'bottom' | 'left' | 'right';

export type PocketId = 'BL' | 'BM' | 'BR' | 'TL' | 'TM' | 'TR';

export type AimSpec =
  | { kind: 'angle'; angle: number }
  | { kind: 'pocket'; ball: string; pocket: PocketId }
  | { kind: 'bank'; ball: string; rail: RailName; pocket: PocketId }
  | { kind: 'kick'; ball: string; rail: RailName }
  | { kind: 'combo'; first: string; second: string; pocket: PocketId };

export interface ShotDef {
  id: string;
  name: string;
  category: string;
  difficulty: number;
  description: string;
  tips: string[];
  balls: BallPos[];
  aimSpec: AimSpec;
  spin: Spin;
  power: number;
}

export interface Scene {
  balls: Ball[];
  shot: ShotDef;
  aim: Aim;
}

export type SimEvent =
  | { t: number; type: 'ball-ball'; a: string; b: string }
  | { t: number; type: 'rail'; ball: string; rail: RailName }
  | { t: number; type: 'pocket'; ball: string; pocket: string };

export interface Frame {
  t: number;
  balls: Ball[];
}

export interface SimResult {
  frames: Frame[];
  events: SimEvent[];
  duration: number;
}

export interface BankGuide {
  mirror: Vec2;
  rail: RailName;
}

export interface Guides {
  aimAngle: number; // final radians incl. user offset
  ghost: Vec2 | null; // ghost-ball center at predicted first cue->ball contact
  firstContactBall: string | null;
  cutAngleDeg: number | null;
  fraction: number | null; // hit fullness = 1 - sin(cut), clamped 0..1
  paths: Record<string, Vec2[]>;
  bankGuide: BankGuide | null; // only for kind 'bank'/'kick'
  pocketed: string[];
  events: SimEvent[];
}

/** Geometry for the step-by-step mirror-system walkthrough (banks & kicks). */
export interface MirrorWalkthrough {
  kind: 'bank' | 'kick';
  rail: RailName;
  /** The ball that travels to the rail: aimSpec.ball for banks, 'cue' for kicks. */
  subjectBallId: string;
  /** Where the construction line points: mirrored pocket aim point (bank) or mirrored ball center (kick). */
  phantomTarget: Vec2;
  /** Bank only: mirrored pocket CENTER, for drawing the phantom pocket circle. */
  phantomPocketCenter: Vec2 | null;
  realPocketId: PocketId | null; // bank only
  targetBallId: string | null; // kick only
  /** Where the subject->phantom line crosses the rail line (inset by BALL_R). */
  bankPoint: Vec2;
  /** Perpendicular distance from the real target to the rail line (= phantom's distance). */
  railDistReal: number;
}

export type MirrorStep = 1 | 2 | 3 | 4 | 5;

export interface View {
  scene: Scene;
  guides: Guides | null;
  balls: Ball[]; // positions to draw (animation frame or scene.balls)
  animating: boolean; // true while a shot is playing back
  showGuides: boolean;
  cssW: number; // canvas size in CSS px
  cssH: number;
  /** When present, the top-down renderer zooms out and draws the mirror-system walkthrough. */
  mirror?: { data: MirrorWalkthrough; step: MirrorStep } | null;
  /** User zoom/pan of the top-down view, composed about the canvas center. */
  tableZoom?: TableZoom | null;
  /** Optical zoom of the shooter's-view camera (multiplies focal length), 1..3. */
  cameraZoom?: number;
  /** Ghost-ball prominence (0..1): 0 hides it, low = faint outline, high = a
   *  clearly visible translucent ball at the aim point. */
  ghostAlpha?: number;
}

export interface TableZoom {
  scale: number; // 1 = fit, up to ~5
  panX: number; // css px
  panY: number;
}
