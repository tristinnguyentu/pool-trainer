// Shared geometry + palette. Import-only — do not modify.

import type { PocketId, Vec2 } from './types';

export const TABLE = { W: 100, H: 50 }; // playing surface in inches (9-ft table)
export const BALL_R = 1.125;

export interface Pocket {
  id: PocketId;
  x: number;
  y: number;
  r: number;
}

// Pocket capture zones. Side pockets sit slightly proud of the rail line so only
// balls arriving near the rail center drop.
export const POCKETS: Pocket[] = [
  { id: 'BL', x: 0, y: 0, r: 2.9 },
  { id: 'BM', x: 50, y: -0.6, r: 2.6 },
  { id: 'BR', x: 100, y: 0, r: 2.9 },
  { id: 'TL', x: 0, y: 50, r: 2.9 },
  { id: 'TM', x: 50, y: 50.6, r: 2.6 },
  { id: 'TR', x: 100, y: 50, r: 2.9 },
];

export function pocketById(id: string): Pocket | undefined {
  return POCKETS.find((p) => p.id === id);
}

// Aiming target inside the pocket mouth: corners are aimed slightly into the table.
// Note: like the original JS, this does not guard against an unknown pocket id —
// it will throw (accessing properties of undefined) exactly as before.
export function pocketAimPoint(id: string): Vec2 {
  const p = pocketById(id)!;
  if (p.id === 'BM' || p.id === 'TM') return { x: p.x, y: p.y };
  const cx = TABLE.W / 2;
  const cy = TABLE.H / 2;
  const d = Math.hypot(cx - p.x, cy - p.y);
  return { x: p.x + ((cx - p.x) / d) * 1.0, y: p.y + ((cy - p.y) / d) * 1.0 };
}

// Standard ball colors (9-15 are stripes of the matching solid color).
export const BALL_COLORS: Record<string, string> = {
  cue: '#f4f1e8',
  1: '#f2b705',
  2: '#1e56b0',
  3: '#d1342f',
  4: '#5e2a84',
  5: '#e8842c',
  6: '#1d7a3e',
  7: '#7a2e2a',
  8: '#161616',
  9: '#f2b705',
  10: '#1e56b0',
  11: '#d1342f',
  12: '#5e2a84',
  13: '#e8842c',
  14: '#1d7a3e',
  15: '#7a2e2a',
};

export function isStripe(id: string): boolean {
  const n = Number(id);
  return Number.isFinite(n) && n >= 9;
}

export const FELT = {
  cloth: '#2e7d4f',
  clothDark: '#26643f',
  cushion: '#256b44',
  wood: '#4a2f1d',
  woodLight: '#5d3c25',
  pocket: '#0d0d0d',
  diamond: '#d8cfa8',
};

export const GUIDES = {
  aim: 'rgba(255,255,255,0.85)',
  ghost: 'rgba(255,255,255,0.75)',
  cue: '#6fb7ff',
  object: '#ffd54a',
  tangent: 'rgba(200,200,200,0.55)',
  bank: '#ff9a5c',
};
