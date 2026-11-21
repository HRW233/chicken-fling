import type { Block, Material, Mechanism, Pickup, Vec2, Weasel, WeaselType } from '../types';

export interface WeaselDef {
  type: WeaselType;
  label: string;
  hp: number;
  armour: number;
  radius: number;
  /** Multiplier on the base body mass. */
  massScale: number;
  crown: boolean;
}

export const WEASEL_DEFS: Record<WeaselType, WeaselDef> = {
  grunt: { type: 'grunt', label: 'Grunt', hp: 10, armour: 0, radius: 22, massScale: 1, crown: false },
  helmet: { type: 'helmet', label: 'Helmet', hp: 10, armour: 10, radius: 22, massScale: 1.1, crown: false },
  brute: { type: 'brute', label: 'Brute', hp: 22, armour: 0, radius: 30, massScale: 2, crown: false },
  king: { type: 'king', label: 'King', hp: 40, armour: 0, radius: 36, massScale: 2.4, crown: true },
  boss: { type: 'boss', label: 'Boss', hp: 90, armour: 0, radius: 46, massScale: 3, crown: true },
};

export function weaselDef(type: WeaselType): WeaselDef {
  return WEASEL_DEFS[type] ?? WEASEL_DEFS.grunt;
}

export interface BlockOpts {
  angle?: number;
  static?: boolean;
  isGround?: boolean;
  explosive?: boolean;
  chain?: string;
  tags?: string[];
}

/**
 * Collects a level's geometry. All coordinates are design-space pixels and
 * `weasel(x, surfaceY)` takes the surface the weasel stands on.
 */
export class LevelBuilder {
  readonly blocks: Block[] = [];
  readonly weasels: Weasel[] = [];
  readonly mechanisms: Mechanism[] = [];
  readonly pickups: Pickup[] = [];
  private counter = 0;

  constructor(
    readonly world: number,
    readonly groundY = 660,
    groundWidth = 1280,
  ) {
    this.box(groundWidth / 2, groundY + 60, groundWidth, 120, 'terrain', {
      static: true,
      isGround: true,
    });
  }

  private nextId(prefix: string): string {
    this.counter += 1;
    return `${prefix}${this.counter}`;
  }

  box(x: number, y: number, w: number, h: number, material: Material, opts: BlockOpts = {}): Block {
    const block: Block = { id: this.nextId('b'), shape: 'box', x, y, w, h, material, ...opts };
    this.blocks.push(block);
    return block;
  }

  circle(x: number, y: number, r: number, material: Material, opts: BlockOpts = {}): Block {
    const block: Block = { id: this.nextId('b'), shape: 'circle', x, y, r, material, ...opts };
    this.blocks.push(block);
    return block;
  }

  poly(x: number, y: number, points: Vec2[], material: Material, opts: BlockOpts = {}): Block {
    const block: Block = { id: this.nextId('b'), shape: 'polygon', x, y, points, material, ...opts };
    this.blocks.push(block);
    return block;
  }

  weasel(x: number, surfaceY: number, type: WeaselType = 'grunt', facing: 1 | -1 = -1): Weasel {
    const def = weaselDef(type);
    const w: Weasel = { id: this.nextId('e'), x, y: surfaceY - def.radius, type, facing };
    this.weasels.push(w);
    return w;
  }

  mech(m: Mechanism): void {
    this.mechanisms.push(m);
  }

  egg(x: number, y: number): void {
    this.pickups.push({ type: 'goldenEgg', x, y });
  }
}
