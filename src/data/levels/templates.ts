import type { Material, WeaselType } from '../types';
import type { LevelBuilder } from './builder';

export type TemplateId =
  | 'wall'
  | 'hut'
  | 'tower'
  | 'gate'
  | 'pyramid'
  | 'canopy'
  | 'bunker'
  | 'icebox'
  | 'igloo'
  | 'factory'
  | 'bridge'
  | 'island'
  | 'balloons'
  | 'dominos'
  | 'corridor'
  | 'bowling'
  | 'multi'
  | 'gauntlet'
  | 'fortress';

export interface BuildArgs {
  b: LevelBuilder;
  x: number;
  gy: number;
  mat: Material;
  tier: number;
  en: number;
  et: WeaselType[];
  world: number;
  seed: number;
}

type Spot = [number, number];
export type Template = (a: BuildArgs) => void;

/** Place up to `en` weasels on the given spots, spacing any extras to the right. */
function place(a: BuildArgs, spots: Spot[]): void {
  if (spots.length === 0) return;
  const used = new Map<Spot, number>();
  for (let i = 0; i < a.en; i++) {
    const spot = spots[i % spots.length];
    const count = used.get(spot) ?? 0;
    used.set(spot, count + 1);
    const x = spot[0] + count * 56;
    a.b.weasel(x, spot[1], a.et[i % a.et.length] ?? 'grunt');
  }
}

const wall: Template = (a) => {
  const { b, x, gy, mat, tier } = a;
  const span = 104 + tier * 24;
  const h = 92 + tier * 32;
  const colW = 24 + tier * 3;
  b.box(x - span / 2, gy - h / 2, colW, h, mat);
  b.box(x + span / 2, gy - h / 2, colW, h, mat);
  b.box(x, gy - h - 13, span + 52, 26, mat);
  if (tier >= 2) {
    b.box(x - span / 2, gy - h - 26 - 38, colW, 50, mat);
    b.box(x + span / 2, gy - h - 26 - 38, colW, 50, mat);
    b.box(x, gy - h - 26 - 76, span + 40, 24, mat);
  }
  place(a, [
    [x, gy - h - 26 - (tier >= 2 ? 76 : 0)],
    [x + span / 2 + 52, gy],
    [x - span / 2 - 48, gy],
    [x, gy],
    [x + span / 2 + 118, gy],
  ]);
};

const hut: Template = (a) => {
  const { b, x, gy, mat, tier } = a;
  const postH = 100 + tier * 28;
  const half = 54 + tier * 8;
  b.box(x - half, gy - postH / 2, 20, postH, mat);
  b.box(x + half, gy - postH / 2, 20, postH, mat);
  b.box(x, gy - postH - 8, half * 2 + 46, 20, mat);
  b.box(x - 30, gy - postH - 34, 84, 16, mat, { angle: 17 });
  b.box(x + 30, gy - postH - 34, 84, 16, mat, { angle: -17 });
  b.box(x, gy - 26, 54, 52, mat === 'ice' ? 'ice' : 'wood');
  place(a, [
    [x, gy - postH - 18],
    [x - half - 44, gy],
    [x + half + 44, gy],
    [x - half - 112, gy],
    [x + half + 112, gy],
  ]);
};

const tower: Template = (a) => {
  const { b, x, gy, mat, tier } = a;
  const tiers = 2 + tier;
  const tierH = 50;
  const halfGap = 25 + tier * 3;
  let base = gy;
  for (let i = 0; i < tiers; i++) {
    const colH = tierH - 14;
    b.box(x - halfGap, base - colH / 2, 16, colH, mat);
    b.box(x + halfGap, base - colH / 2, 16, colH, mat);
    b.box(x, base - tierH + 7, halfGap * 2 + 36, 14, mat);
    base -= tierH;
  }
  place(a, [
    [x, base],
    [x - 92, gy],
    [x + 104, gy],
    [x - 160, gy],
    [x + 166, gy],
  ]);
};

const gate: Template = (a) => {
  const { b, x, gy, mat, tier } = a;
  const h = 138 + tier * 24;
  const half = 68 + tier * 10;
  b.box(x - half, gy - h / 2, 36, h, mat);
  b.box(x + half, gy - h / 2, 36, h, mat);
  const lintelMat: Material = mat === 'hay' || mat === 'ice' ? 'wood' : 'stone';
  b.box(x, gy - h - 22, half * 2 + 76, 44, lintelMat);
  place(a, [
    [x, gy - h - 44],
    [x - half - 40, gy],
    [x + half + 42, gy],
    [x - half - 108, gy],
    [x + half + 110, gy],
  ]);
};

const pyramid: Template = (a) => {
  const { b, x, gy, mat, tier } = a;
  const rows = 2 + tier;
  const bw = 54;
  const bh = 30;
  for (let r = 0; r < rows; r++) {
    const count = rows - r;
    for (let i = 0; i < count; i++) {
      const px = x + (i - (count - 1) / 2) * (bw + 4);
      b.box(px, gy - r * bh - bh / 2, bw, bh, mat);
    }
  }
  place(a, [
    [x, gy - rows * bh],
    [x + rows * bw * 0.5 + 48, gy],
    [x - rows * bw * 0.5 - 44, gy],
    [x + rows * bw * 0.5 + 112, gy],
    [x + 70, gy - rows * bh],
  ]);
};

const canopy: Template = (a) => {
  const { b, x, gy, mat, tier } = a;
  const postH = 146 + tier * 30;
  b.box(x - 102, gy - postH / 2, 20, postH, 'wood');
  b.box(x + 102, gy - postH / 2, 20, postH, 'wood');
  b.box(x, gy - postH - 14, 254, 28, mat);
  b.box(x, gy - 32, 120, 64, 'wood');
  place(a, [
    [x, gy - postH - 28],
    [x - 74, gy - postH - 28],
    [x + 70, gy - postH - 28],
    [x - 196, gy],
    [x + 150, gy],
  ]);
};

const bunker: Template = (a) => {
  const { b, x, gy, mat, tier } = a;
  const h = 118 + tier * 20;
  const half = 90 + tier * 8;
  b.box(x - half, gy - h / 2, 34, h, mat);
  b.box(x + half, gy - h / 2, 34, h, mat);
  b.box(x, gy - h - 16, half * 2 + 68, 32, mat);
  b.box(x - 34, gy - 30, 52, 60, 'wood');
  place(a, [
    [x, gy - h - 32],
    [x - half - 40, gy],
    [x + half + 42, gy],
    [x - half - 106, gy],
    [x + half + 108, gy],
  ]);
};

const icebox: Template = (a) => {
  const { b, x, gy, tier } = a;
  const h = 96 + tier * 22;
  b.box(x - 92, gy - h / 2, 28, h, 'ice');
  b.box(x + 92, gy - h / 2, 28, h, 'ice');
  b.box(x, gy - h - 14, 224, 28, 'ice');
  b.box(x - 84, gy - h / 2, 12, h - 20, 'wood');
  b.box(x + 84, gy - h / 2, 12, h - 20, 'wood');
  place(a, [
    [x, gy - h - 28],
    [x - 130, gy],
    [x + 132, gy],
    [x - 194, gy],
    [x + 196, gy],
  ]);
};

const igloo: Template = (a) => {
  const { b, x, gy, tier } = a;
  const size = 30;
  const rows = 3 + tier;
  for (let r = 0; r < rows; r++) {
    const count = rows * 2 - 1 - r * 2;
    for (let i = 0; i < count; i++) {
      const px = x + (i - (count - 1) / 2) * (size + 2);
      b.box(px, gy - r * size - size / 2, size, size, 'ice');
    }
  }
  place(a, [
    [x, gy - rows * size],
    [x + rows * size + 42, gy],
    [x - rows * size - 40, gy],
    [x + rows * size + 104, gy],
    [x, gy - rows * size - 44],
  ]);
};

const factory: Template = (a) => {
  const { b, x, gy, mat, tier } = a;
  const h = 134 + tier * 22;
  b.box(x - 112, gy - h / 2, 24, h, 'metal');
  b.box(x + 112, gy - h / 2, 24, h, 'metal');
  b.box(x, gy - 66, 186, 20, mat);
  b.box(x, gy - h - 14, 250, 26, 'metal');
  b.box(x - 60, gy - 26, 44, 52, mat);
  b.box(x + 58, gy - 26, 44, 52, 'wood');
  b.box(x, gy - h - 42, 120, 22, 'metal');
  b.mech({ kind: 'conveyor', x, y: gy - 76, w: 186, speed: 110 });
  // Tall factory columns shadow whatever stands right behind them, so ground
  // spots sit outside the column line and the roofline.
  place(a, [
    [x, gy - h - 27],
    [x - 158, gy],
    [x + 226, gy],
    [x - 224, gy],
    [x + 160, gy],
  ]);
};

const bridge: Template = (a) => {
  const { b, x, gy, mat, tier } = a;
  const span = 132 + tier * 14;
  const towerH = 116 + tier * 16;
  b.box(x - span, gy - towerH / 2, 30, towerH, mat);
  b.box(x + span, gy - towerH / 2, 30, towerH, mat);
  const plankY = gy - towerH - 10;
  for (let i = -2; i <= 2; i++) {
    b.box(x + i * 56, plankY, 54, 16, mat);
  }
  b.box(x, plankY - 10, 18, 20, mat);
  place(a, [
    [x, plankY + 8],
    [x - span - 56, gy],
    [x - span, gy - towerH],
    [x + span, gy - towerH],
    [x + span + 54, gy],
  ]);
};

const island: Template = (a) => {
  const { b, x, gy, mat, tier } = a;
  const top = gy - 196;
  b.box(x, top + 13, 390, 26, 'terrain', { static: true });
  b.box(x - 72, top - 44, 22, 88, mat);
  b.box(x + 72, top - 44, 22, 88, mat);
  b.box(x, top - 100, 178, 24, mat);
  b.box(x - 48, top - 148, 22, 72, mat);
  b.box(x + 48, top - 148, 22, 72, mat);
  if (tier >= 3) b.box(x, top - 196, 130, 26, mat);
  b.mech({ kind: 'windZone', x, y: top - 120, w: 320, h: 260, wind: { x: 140, y: 0 } });
  place(a, [
    [x, top],
    [x, top - 112],
    [x, top - 208],
    [x - 150, gy],
    [x + 150, gy],
  ]);
};

const balloons: Template = (a) => {
  const { b, x, gy, mat } = a;
  const deckY = gy - 214;
  const deck = b.box(x, deckY, 226, 24, 'wood', { static: true });
  b.box(x - 62, deckY - 40, 58, 60, mat);
  b.box(x + 62, deckY - 40, 58, 60, mat);
  b.box(x, deckY - 84, 150, 22, mat);
  b.mech({ kind: 'balloon', x: x - 104, y: deckY - 74, blockId: deck.id, lift: 1 });
  b.mech({ kind: 'balloon', x: x + 104, y: deckY - 74, blockId: deck.id, lift: 1 });
  place(a, [
    [x, deckY - 12],
    [x, deckY - 96],
    [x - 150, gy],
    [x + 150, gy],
    [x + 190, deckY - 12],
  ]);
};

const dominos: Template = (a) => {
  const { b, x, gy, mat } = a;
  for (let i = 0; i < 5; i++) {
    b.box(x + (i - 2) * 48, gy - 59, 15, 118, mat);
  }
  place(a, [
    [x + 148, gy],
    [x - 148, gy],
    [x + 200, gy],
    [x, gy],
    [x + 256, gy],
  ]);
};

const corridor: Template = (a) => {
  const { b, x, gy, mat, tier } = a;
  const h = 170 + tier * 24;
  b.box(x - 110, gy - h / 2, 38, h, mat);
  b.box(x + 110, gy - h / 2, 38, h, mat);
  b.box(x - 110, gy - h - 14, 70, 28, mat);
  b.box(x + 110, gy - h - 14, 70, 28, mat);
  b.box(x, gy - 26, 84, 52, 'wood');
  place(a, [
    [x, gy - h - 28],
    [x, gy],
    [x + 156, gy],
    [x - 156, gy],
    [x + 156, gy - h],
  ]);
};

const bowling: Template = (a) => {
  const { b, x, gy, mat } = a;
  b.box(x - 150, gy - 66, 216, 18, 'terrain', { static: true, angle: 11 });
  b.circle(x - 196, gy - 150, 40, 'hay');
  b.box(x - 206, gy - 200, 18, 92, 'wood');
  place(a, [
    [x + 42, gy],
    [x + 112, gy],
    [x + 182, gy],
    [x + 252, gy],
    [x + 318, gy],
  ]);
};

const multi: Template = (a) => {
  const { b, x, gy, mat, tier, et } = a;
  const stones = [x - 160, x, x + 160];
  const types: WeaselType[] = et.length ? et : ['grunt'];
  for (let i = 0; i < stones.length; i++) {
    const sx = stones[i];
    b.box(sx - 44, gy - 50, 18, 100, mat);
    b.box(sx + 44, gy - 50, 18, 100, mat);
    b.box(sx, gy - 108, 118, 20, mat);
    if (tier >= 2) b.box(sx, gy - 128, 44, 20, mat);
    b.weasel(sx, gy - 118 - (tier >= 2 ? 20 : 0), types[i % types.length]);
  }
};

const gauntlet: Template = (a) => {
  const { b, x, gy, mat, tier, et } = a;
  const g1 = x - 150;
  const g3 = x + 150;
  // Near structure: a small hay shed
  b.box(g1 - 46, gy - 46, 18, 92, 'hay');
  b.box(g1 + 46, gy - 46, 18, 92, 'hay');
  b.box(g1, gy - 96, 122, 20, 'hay');
  // Middle: a tower
  for (let i = 0; i < 3; i++) {
    b.box(x - 30, gy - i * 50 - 20, 16, 36, mat);
    b.box(x + 30, gy - i * 50 - 20, 16, 36, mat);
    b.box(x, gy - i * 50 - 44, 96, 14, mat);
  }
  // Far structure: bunker
  b.box(g3 - 66, gy - 64, 28, 128, mat);
  b.box(g3 + 66, gy - 64, 28, 128, mat);
  b.box(g3, gy - 142, 174, 24, mat);
  if (tier >= 2) b.box(g3, gy - 166, 60, 24, mat);
  const types: WeaselType[] = et.length ? et : ['grunt'];
  b.weasel(g1, gy - 106, types[0]);
  b.weasel(x, gy - 150, types[1 % types.length]);
  b.weasel(g3, gy - 142, types[2 % types.length]);
  b.weasel(g3, gy, types[3 % types.length]);
  if (a.en >= 5) b.weasel(x, gy, types[0]);
  if (a.en >= 6) b.weasel(g3 + 120, gy, types[1 % types.length]);
};

const fortress: Template = (a) => {
  const { b, x, gy, mat, tier } = a;
  const h = 184 + tier * 26;
  b.box(x - 156, gy - h / 2, 32, h, 'stone');
  b.box(x + 156, gy - h / 2, 32, h, 'stone');
  b.box(x, gy - h - 16, 366, 32, 'stone');
  b.box(x - 84, gy - 44, 40, 88, 'wood', { explosive: true });
  b.box(x + 84, gy - 44, 40, 88, 'wood', { explosive: true });
  b.box(x, gy - 110, 96, 22, 'wood');
  b.box(x - 96, gy - 40, 46, 80, mat);
  b.box(x + 96, gy - 40, 46, 80, mat);
  place(a, [
    [x, gy - h - 32],
    [x - 214, gy],
    [x + 214, gy],
    [x - 288, gy],
    [x + 288, gy],
  ]);
};

export const TEMPLATES: Record<TemplateId, Template> = {
  wall,
  hut,
  tower,
  gate,
  pyramid,
  canopy,
  bunker,
  icebox,
  igloo,
  factory,
  bridge,
  island,
  balloons,
  dominos,
  corridor,
  bowling,
  multi,
  gauntlet,
  fortress,
};
