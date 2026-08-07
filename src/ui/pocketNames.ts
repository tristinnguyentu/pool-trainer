import type { PocketId } from '../engine/types';

export const POCKET_NAMES: Record<PocketId, string> = {
  BL: 'bottom-left corner',
  BM: 'bottom side pocket',
  BR: 'bottom-right corner',
  TL: 'top-left corner',
  TM: 'top side pocket',
  TR: 'top-right corner',
};

export function pocketName(id: string): string {
  return POCKET_NAMES[id as PocketId] ?? id;
}
