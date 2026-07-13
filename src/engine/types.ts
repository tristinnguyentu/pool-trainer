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

export interface View {
  scene: Scene;
  guides: Guides | null;
  balls: Ball[]; // positions to draw (animation frame or scene.balls)
  animating: boolean; // true while a shot is playing back
  showGuides: boolean;
  cssW: number; // canvas size in CSS px
  cssH: number;
}
