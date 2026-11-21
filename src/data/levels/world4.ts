import type { Level, Mechanism } from '../types';
import { buildWorld, type LevelSpec } from './build';

const lava = (x: number, w: number): Mechanism[] => [{ kind: 'lava', x, y: 640, w, h: 70 }];
const geyser = (x: number, periodS = 4): Mechanism[] => [
  { kind: 'geyser', x, y: 660, radius: 60, force: 2600, periodS, phaseS: 0 },
];

const S: LevelSpec[] = [
  { name: 'Warm Welcome', t: 'gate', q: ['cluck', 'speckle', 'drumstick'], mat: 'stone', en: 1, mech: lava(1140, 180) },
  { name: 'Peppers and Powder', t: 'canopy', q: ['pepper', 'cluck', 'drumstick'], mat: 'hay', en: 2, mech: lava(1140, 180) },
  { name: 'Ash and Bone', t: 'bunker', q: ['pepper', 'drumstick', 'cluck'], mat: 'stone', en: 1, tier: 2 },
  { name: 'Geyser Games', t: 'tower', q: ['pepper', 'cluck', 'drumstick'], mat: 'stone', en: 2, mech: geyser(500) },
  { name: 'Lava Flow', t: 'multi', q: ['pepper', 'drumstick', 'cluck'], en: 2, mech: lava(1140, 200) },
  { name: 'Firebreak', t: 'gate', q: ['pepper', 'cluck', 'drumstick'], mat: 'hay', en: 2, tier: 2 },
  { name: 'Magma Chamber', t: 'island', q: ['pepper', 'drumstick', 'puff'], mat: 'stone', en: 2, mech: lava(1100, 260) },
  { name: 'Soot Sniper', t: 'tower', q: ['pepper', 'drumstick', 'cluck'], mat: 'stone', en: 2, tier: 2 },
  { name: 'The Furnace', t: 'factory', q: ['pepper', 'cluck', 'drumstick', 'drumstick', 'drumstick', 'puff'], mat: 'hay', en: 3, mech: lava(1140, 180) },
  { name: 'Basalt Column', t: 'tower', q: ['pepper', 'drumstick', 'nugget'], mat: 'stone', en: 2, tier: 3 },
  { name: 'Hot Air', t: 'tower', q: ['pepper', 'drumstick', 'cluck'], en: 2, mech: geyser(760, 3.4) },
  { name: 'Caldera Rim', t: 'island', q: ['pepper', 'drumstick', 'puff'], mat: 'stone', en: 2, mech: lava(1120, 220) },
  { name: 'Ember Rain', t: 'canopy', q: ['pepper', 'cluck', 'drumstick', 'drumstick', 'pepper', 'drumstick', 'pepper', 'drumstick'], mat: 'hay', en: 3, tier: 2 },
  { name: 'The Mine Cart', t: 'factory', q: ['pepper', 'drumstick', 'cluck'], en: 2, mat: 'stone' },
  { name: 'Steam Vents', t: 'factory', q: ['pepper', 'puff', 'drumstick'], en: 2, mech: geyser(560, 3.6) },
  { name: 'Obsidian Wall', t: 'bunker', q: ['pepper', 'drumstick', 'cluck', 'nugget'], mat: 'stone', en: 2, tier: 2 },
  { name: 'The Roost', t: 'factory', q: ['pepper', 'drumstick', 'puff', 'cluck'], mat: 'stone', en: 3, tier: 2 },
  { name: 'Mother of Invention', t: 'gate', q: ['mother', 'pepper', 'drumstick'], mat: 'stone', en: 2, tier: 2 },
  { name: 'Two Fires', t: 'multi', q: ['mother', 'pepper', 'drumstick', 'cluck'], en: 3, mat: 'stone' },
  { name: 'Lava Tube', t: 'corridor', q: ['mother', 'pepper', 'drumstick'], mat: 'stone', en: 2, tier: 2 },
  { name: 'Powder Keg', t: 'fortress', q: ['pepper', 'cluck', 'drumstick', 'speckle'], en: 3, tier: 1, mat: 'wood' },
  { name: 'The Bridge of Sighs', t: 'bridge', q: ['mother', 'pepper', 'drumstick'], mat: 'wood', en: 2, mech: lava(1140, 220) },
  { name: 'Smoke Signal', t: 'bunker', q: ['mother', 'pepper', 'puff'], mat: 'stone', en: 2, tier: 2 },
  {
    name: 'Thermal Timing',
    t: 'tower',
    q: ['mother', 'pepper', 'drumstick', 'cluck'],
    mat: 'stone',
    en: 2,
    mech: geyser(690, 3),
  },
  {
    name: 'The Golden Egg Forge',
    t: 'bunker',
    q: ['mother', 'pepper', 'drumstick'],
    mat: 'stone',
    en: 2,
    tier: 2,
    egg: [690, 460],
  },
  {
    name: 'Scorched Earth',
    t: 'gauntlet',
    // Four weasels including a king; the old coop ran dry with it still standing.
    q: ['mother', 'pepper', 'drumstick', 'cluck', 'mother', 'pepper', 'drumstick', 'cluck'],
    en: 4,
    tier: 2,
    mat: 'stone',
    mech: lava(1180, 160),
  },
  {
    name: "The Volcano's Throat",
    t: 'tower',
    q: ['mother', 'pepper', 'drumstick', 'cluck'],
    mat: 'stone',
    en: 2,
    tier: 3,
    cannon: [120, 600, 55, 88],
  },
  {
    name: 'The Gauntlet: Eruption',
    t: 'gauntlet',
    q: ['mother', 'pepper', 'drumstick', 'cluck', 'puff', 'mother', 'pepper', 'drumstick'],
    en: 5,
    mat: 'stone',
    mech: [...lava(1180, 180), ...geyser(500, 3.8)],
  },
  {
    name: 'Boss: Magma Maggie',
    t: 'fortress',
    q: ['mother', 'pepper', 'drumstick', 'cluck', 'puff', 'pepper'],
    boss: true,
    en: 4,
    tier: 2,
    mat: 'stone',
    et: ['boss', 'helmet', 'brute', 'grunt'],
    mech: lava(1180, 160),
  },
];

export const WORLD4: Level[] = buildWorld(4, S);
