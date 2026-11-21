import type { Level } from '../types';
import { WORLD1 } from './world1';
import { WORLD2 } from './world2';
import { WORLD3 } from './world3';
import { WORLD4 } from './world4';
import { WORLD5 } from './world5';

export const ALL_LEVELS: Level[] = [...WORLD1, ...WORLD2, ...WORLD3, ...WORLD4, ...WORLD5];

export const LEVELS_BY_WORLD: Record<number, Level[]> = {
  1: WORLD1,
  2: WORLD2,
  3: WORLD3,
  4: WORLD4,
  5: WORLD5,
};

export function findLevel(id: string): Level | undefined {
  return ALL_LEVELS.find((l) => l.id === id);
}

export function levelIndex(id: string): number {
  return ALL_LEVELS.findIndex((l) => l.id === id);
}

export function worldLevels(world: number): Level[] {
  return LEVELS_BY_WORLD[world] ?? [];
}
