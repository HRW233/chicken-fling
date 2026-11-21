import type { Material } from './types';

export interface MaterialDef {
  name: string;
  hp: number;
  restitution: number;
  friction: number;
  density: number;
  /** Impulse below this does no damage. */
  threshold: number;
  /** Supported mass above which the block is crushed. */
  crush: number;
  fill: string;
  light: string;
  dark: string;
  edge: string;
  debris: string;
  /** Loudness of the material crunch, 0..1. */
  crunch: number;
}

export const MATERIALS: Record<Material, MaterialDef> = {
  hay: {
    name: 'hay',
    hp: 3,
    restitution: 0.05,
    friction: 0.8,
    density: 0.0008,
    threshold: 120,
    crush: 2.4,
    fill: '#D9B45B',
    light: '#F0D68C',
    dark: '#A8863A',
    edge: '#6B521F',
    debris: '#E8C879',
    crunch: 0.5,
  },
  wood: {
    name: 'wood',
    hp: 6,
    restitution: 0.12,
    friction: 0.45,
    density: 0.0015,
    threshold: 120,
    crush: 5,
    fill: '#B97B45',
    light: '#D9A06A',
    dark: '#8A5528',
    edge: '#59300F',
    debris: '#C98C53',
    crunch: 0.7,
  },
  ice: {
    name: 'ice',
    hp: 2,
    restitution: 0.05,
    friction: 0.15,
    density: 0.0012,
    threshold: 120,
    crush: 1.6,
    fill: '#A9D8F2',
    light: '#DDF2FD',
    dark: '#6EAECF',
    edge: '#3F7C9B',
    debris: '#CFEFFF',
    crunch: 0.75,
  },
  stone: {
    name: 'stone',
    hp: 14,
    restitution: 0.08,
    friction: 0.6,
    density: 0.003,
    threshold: 260,
    crush: 12,
    fill: '#8D9097',
    light: '#B3B7BE',
    dark: '#63666D',
    edge: '#3D3F44',
    debris: '#9AA0A8',
    crunch: 0.85,
  },
  metal: {
    name: 'metal',
    hp: 30,
    restitution: 0.15,
    friction: 0.35,
    density: 0.0045,
    threshold: 420,
    crush: 40,
    fill: '#9CA6B4',
    light: '#D5DCE6',
    dark: '#5E6875',
    edge: '#2F3742',
    debris: '#B6C0CC',
    crunch: 0.9,
  },
  crystal: {
    name: 'crystal',
    hp: 8,
    restitution: 0.35,
    friction: 0.2,
    density: 0.002,
    threshold: 140,
    crush: 3,
    fill: '#B79BEC',
    light: '#E6D8FF',
    dark: '#7E63B8',
    edge: '#4B3179',
    debris: '#D9C8FF',
    crunch: 0.8,
  },
  terrain: {
    name: 'terrain',
    hp: Infinity,
    restitution: 0.2,
    friction: 0.6,
    density: 0.001,
    threshold: Infinity,
    crush: Infinity,
    fill: '#6B8F3C',
    light: '#8FBF58',
    dark: '#43602A',
    edge: '#2C4019',
    debris: '#6B8F3C',
    crunch: 0.4,
  },
};

export function materialDef(m: Material): MaterialDef {
  return MATERIALS[m] ?? MATERIALS.wood;
}
