import type { Block, ChickenId, Level, Material, Mechanism, WeaselType } from '../types';
import { LevelBuilder } from './builder';
import { TEMPLATES, type TemplateId } from './templates';

export interface LevelSpec {
  name: string;
  t: TemplateId;
  q: ChickenId[];
  mat?: Material;
  tier?: number;
  en?: number;
  et?: WeaselType[];
  wind?: number;
  windY?: number;
  cannon?: [number, number, number, number];
  mech?: Mechanism[];
  egg?: [number, number];
  boss?: boolean;
  x?: number;
}

const DEFAULT_X = 690;

const WORLD_START_DIFFICULTY = [1, 3, 5, 6.5, 8];
const WORLD_DIFFICULTY_SPAN = [2, 2, 1.5, 1.5, 2];

export function defaultMaterial(world: number): Material {
  switch (world) {
    case 2:
      return 'wood';
    case 3:
      return 'ice';
    case 4:
      return 'stone';
    case 5:
      return 'crystal';
    default:
      return 'hay';
  }
}

export function defaultTypes(index: number, boss: boolean): WeaselType[] {
  if (boss) return ['boss', 'helmet', 'brute', 'grunt', 'helmet'];
  if (index <= 5) return ['grunt'];
  if (index <= 11) return ['grunt', 'helmet'];
  if (index <= 18) return ['helmet', 'grunt', 'brute'];
  if (index <= 26) return ['brute', 'helmet', 'grunt', 'king'];
  return ['king', 'brute', 'helmet', 'grunt'];
}

export function buildLevel(world: 1 | 2 | 3 | 4 | 5, index: number, spec: LevelSpec): Level {
  const gy = 660;
  const b = new LevelBuilder(world, gy);
  const tier = spec.tier ?? (index <= 8 ? 1 : index <= 19 ? 2 : 3);
  const en = spec.en ?? (index <= 3 ? 1 : index <= 9 ? 2 : index <= 17 ? 3 : index <= 24 ? 4 : 5);
  const et = spec.et ?? defaultTypes(index, Boolean(spec.boss));
  const mat = spec.mat ?? defaultMaterial(world);
  // An all-metal fort is a wall, not a puzzle: metal stays for single-target
  // teaching levels and machinery, while larger forts use breakable framing.
  const structureMat: Material = mat === 'metal' && en > 1 ? (world === 5 ? 'crystal' : 'wood') : mat;

  TEMPLATES[spec.t]({
    b,
    x: spec.x ?? DEFAULT_X,
    gy,
    mat: structureMat,
    tier,
    en,
    et,
    world,
    seed: world * 1000 + index,
  });

  if (spec.mech) {
    for (const m of spec.mech) b.mech(m);
  }
  if (spec.egg) b.egg(spec.egg[0], spec.egg[1]);

  if (b.weasels.length === 0) b.weasel(DEFAULT_X + 80, gy, 'grunt');

  // Always hold a spare chicken (three-star rule) and enough ammunition to
  // finish the job; bosses get a full coop because their health pool is huge.
  const queue = spec.q.length > 0 ? [...spec.q] : (['cluck', 'cluck'] as ChickenId[]);
  const minQueue = spec.boss ? 8 : Math.min(8, b.weasels.length + 2);
  while (queue.length < minQueue) {
    queue.push(queue[queue.length - 1] ?? 'cluck');
  }
  const egg = Boolean(spec.egg);
  const maxScore =
    b.weasels.length * 5000 + b.blocks.filter((x: Block) => !x.isGround).length * 1000 + Math.max(1, queue.length - 1) * 8000 + (egg ? 10000 : 0);

  const diffBase = WORLD_START_DIFFICULTY[world - 1] ?? 1;
  const diffSpan = WORLD_DIFFICULTY_SPAN[world - 1] ?? 2;
  const difficulty = Math.round((diffBase + ((index - 1) / 28) * diffSpan + (spec.boss ? 0.4 : 0)) * 10) / 10;

  // The brief fixes wind in px/s^2; a little negative noise-free tuning per world.
  const wind = { x: spec.wind ?? 0, y: spec.windY ?? 0 };
  const gravity =
    world === 5 ? { x: 0, y: 1500 } : { x: 0, y: 2200 };

  return {
    id: `w${world}-${String(index).padStart(2, '0')}`,
    world,
    index,
    name: spec.name,
    difficulty,
    parTimeSec: Math.round(24 + index * 1.1 + b.weasels.length * 4),
    starScore: [0, Math.round(maxScore * 0.45), Math.round(maxScore * 0.72)],
    wind,
    gravity,
    worldWidth: 1280,
    cannon: spec.cannon
      ? { x: spec.cannon[0], y: spec.cannon[1], minAngleDeg: spec.cannon[2], maxAngleDeg: spec.cannon[3] }
      : { x: 120, y: 600, minAngleDeg: -10, maxAngleDeg: 95 },
    queue,
    blocks: b.blocks,
    weasels: b.weasels,
    pickups: b.pickups,
    mechanisms: b.mechanisms,
    groundY: gy,
  };
}

export function buildWorld(world: 1 | 2 | 3 | 4 | 5, specs: LevelSpec[]): Level[] {
  return specs.map((spec, i) => buildLevel(world, i + 1, spec));
}
