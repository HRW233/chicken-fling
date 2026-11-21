import type { ChickenId } from './types';

export type AbilityId =
  | 'none'
  | 'eggBomb'
  | 'dash'
  | 'inflate'
  | 'split'
  | 'pierce'
  | 'fire'
  | 'freeze'
  | 'megaEgg';

export interface ChickenDef {
  id: ChickenId;
  name: string;
  mass: number;
  radius: number;
  drag: number;
  ability: AbilityId;
  abilityName: string;
  abilityHint: string;
  unlock: string;
  /** Base body colour. */
  body: string;
  /** Secondary/wing colour. */
  bodyDark: string;
  /** Comb / accent colour. */
  comb: string;
  /** Extra prop colour (cape, scarf, helmet, apron). */
  prop: string;
  squawkPitch: number;
}

export const CHICKENS: Record<ChickenId, ChickenDef> = {
  cluck: {
    id: 'cluck',
    name: 'Cluck',
    mass: 1,
    radius: 16,
    drag: 1,
    ability: 'none',
    abilityName: 'Steady Egg',
    abilityHint: 'Pure ballistic baseline — no ability.',
    unlock: '1-1',
    body: '#FDF6E3',
    bodyDark: '#E4D5B0',
    comb: '#E4572E',
    prop: '#F2C14E',
    squawkPitch: 520,
  },
  speckle: {
    id: 'speckle',
    name: 'Speckle',
    mass: 1.15,
    radius: 17,
    drag: 1.05,
    ability: 'eggBomb',
    abilityName: 'Egg Bomb',
    abilityHint: 'Drop an egg that detonates after 0.35 s.',
    unlock: '1-4',
    body: '#CFCAC2',
    bodyDark: '#9E978C',
    comb: '#C43D2D',
    prop: '#7B5E3B',
    squawkPitch: 470,
  },
  drumstick: {
    id: 'drumstick',
    name: 'Drumstick',
    mass: 1.3,
    radius: 18,
    drag: 0.95,
    ability: 'dash',
    abilityName: 'Dash',
    abilityHint: 'Double speed and triple impact damage for 0.6 s.',
    unlock: '1-11',
    body: '#F0C086',
    bodyDark: '#C08A50',
    comb: '#D6472B',
    prop: '#2F6FDD',
    squawkPitch: 400,
  },
  puff: {
    id: 'puff',
    name: 'Puff',
    mass: 0.7,
    radius: 15,
    drag: 1.25,
    ability: 'inflate',
    abilityName: 'Inflate',
    abilityHint: 'Swelling wrecking ball: bigger, heavier, bouncy.',
    unlock: '2-6',
    body: '#FFFDF6',
    bodyDark: '#E7E2D6',
    comb: '#E88FA8',
    prop: '#A8C5E2',
    squawkPitch: 640,
  },
  nugget: {
    id: 'nugget',
    name: 'Nugget',
    mass: 0.55,
    radius: 12,
    drag: 1.4,
    ability: 'split',
    abilityName: 'Split',
    abilityHint: 'Burst into three chicks in a 25° fan.',
    unlock: '2-15',
    body: '#FFE07A',
    bodyDark: '#E2B94A',
    comb: '#EF8A3C',
    prop: '#8A8F98',
    squawkPitch: 780,
  },
  bantam: {
    id: 'bantam',
    name: 'Bantam',
    mass: 2.4,
    radius: 14,
    drag: 0.8,
    ability: 'pierce',
    abilityName: 'Pierce',
    abilityHint: 'Ignore blocks and deal triple damage for 0.5 s.',
    unlock: '3-9',
    body: '#B9C3CB',
    bodyDark: '#7D8892',
    comb: '#B3382C',
    prop: '#D9DEE3',
    squawkPitch: 360,
  },
  pepper: {
    id: 'pepper',
    name: 'Pepper',
    mass: 0.95,
    radius: 16,
    drag: 1,
    ability: 'fire',
    abilityName: 'Fire Burst',
    abilityHint: 'Set every hay and wood block within 110 px alight.',
    unlock: '4-2',
    body: '#E8873E',
    bodyDark: '#B25420',
    comb: '#7A1F16',
    prop: '#F7B267',
    squawkPitch: 500,
  },
  snowbell: {
    id: 'snowbell',
    name: 'Snowbell',
    mass: 1.05,
    radius: 17,
    drag: 1.05,
    ability: 'freeze',
    abilityName: 'Freeze Burst',
    abilityHint: 'Shatter-ready ice within 130 px and chill nearby bodies.',
    unlock: '3-20',
    body: '#F2F7FF',
    bodyDark: '#C6D8EF',
    comb: '#5C8DD6',
    prop: '#4F7FD1',
    squawkPitch: 580,
  },
  mother: {
    id: 'mother',
    name: 'Mother Hen',
    mass: 3.2,
    radius: 22,
    drag: 0.7,
    ability: 'megaEgg',
    abilityName: 'Mega Egg',
    abilityHint: 'Drop a huge egg that detonates on contact.',
    unlock: '4-18',
    body: '#F6E7C8',
    bodyDark: '#CBB58B',
    comb: '#D2402E',
    prop: '#EFF1F4',
    squawkPitch: 300,
  },
};

export const CHICKEN_ORDER: ChickenId[] = [
  'cluck',
  'speckle',
  'drumstick',
  'puff',
  'nugget',
  'bantam',
  'pepper',
  'snowbell',
  'mother',
];

export function chickenDef(id: ChickenId): ChickenDef {
  return CHICKENS[id] ?? CHICKENS.cluck;
}
