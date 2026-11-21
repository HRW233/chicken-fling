import type { Body } from 'matter-js';
import type { ChickenDef } from '../data/chickens';
import type { Block, ChickenId, Weasel, WeaselType } from '../data/types';

export const CAT = {
  block: 0x0002,
  terrain: 0x0004,
  weasel: 0x0008,
  chicken: 0x0010,
  egg: 0x0020,
  piston: 0x0040,
} as const;

export const ALL_MASK = 0xffffffff;

export interface BlockEnt {
  def: Block;
  body: Body;
  hp: number;
  maxHp: number;
  destroyed: boolean;
  flash: number;
  seed: number;
  burning: number;
  spreadTimer: number;
  slow: number;
  /** Temporary bodies (boss-thrown crates) are flagged so they can be cleaned up. */
  temporary: boolean;
}

export interface WeaselEnt {
  def: Weasel;
  body: Body;
  hp: number;
  maxHp: number;
  armour: number;
  maxArmour: number;
  defeated: boolean;
  flash: number;
  squash: number;
  patrolDir: 1 | -1;
  originX: number;
  originY: number;
  bossPhase: number;
  slow: number;
}

export interface ChickenEnt {
  id: ChickenId;
  def: ChickenDef;
  bodies: Body[];
  launched: boolean;
  abilityUsed: boolean;
  launchTime: number;
  damageMult: number;
  multTimer: number;
  pierceTimer: number;
  restTime: number;
  inert: boolean;
  fade: number;
  removed: boolean;
}

export interface EggEnt {
  body: Body;
  fuse: number;
  mega: boolean;
  radius: number;
  dead: boolean;
}

export interface KoEnt {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  type: WeaselType;
  timer: number;
  duration: number;
}

export type EntityRef =
  | { kind: 'block'; ent: BlockEnt }
  | { kind: 'weasel'; ent: WeaselEnt }
  | { kind: 'chicken'; ent: ChickenEnt }
  | { kind: 'egg'; ent: EggEnt };

interface PluginHost {
  plugin?: { entity?: EntityRef };
}

export function getEntity(body: Body): EntityRef | null {
  return (body as unknown as PluginHost).plugin?.entity ?? null;
}

export function setEntity(body: Body, ref: EntityRef): void {
  const host = body as unknown as PluginHost;
  if (!host.plugin) host.plugin = {};
  host.plugin.entity = ref;
}

export function clearEntity(body: Body): void {
  const host = body as unknown as PluginHost;
  if (host.plugin) delete host.plugin.entity;
}
