/**
 * Measures weasel blast damage for each enemy type: how much HP an egg bomb
 * removes when it detonates directly on the target, and at its edge.
 *
 * Run: npx --yes tsx scripts/blasttest.ts
 */
import { LevelRuntime } from '../src/game/LevelRuntime';
import { NULL_FX } from '../src/game/fx';
import { ALL_LEVELS } from '../src/data/levels/index';
import { weaselDef } from '../src/data/levels/builder';
import type { WeaselType } from '../src/data/types';

const base = ALL_LEVELS.find((l) => l.id === 'w1-01')!;

for (const type of ['grunt', 'helmet', 'brute', 'king', 'boss'] as WeaselType[]) {
  const level = {
    ...base,
    blocks: base.blocks.filter((b) => b.isGround),
    weasels: [{ id: 'e1', x: 700, y: base.groundY - weaselDef(type).radius, type, facing: -1 as const }],
    queue: ['speckle' as const],
    pickups: [],
    mechanisms: [],
  };
  const rt = new LevelRuntime(level, NULL_FX);
  const w = rt.weasels[0];
  const def = weaselDef(type);
  const cast = rt as unknown as {
    spawnEgg(x: number, y: number, radius: number, fuse: number, mega: boolean): void;
    detonateEgg(egg: { body: { position: { x: number; y: number } } }): void;
  };
  for (const offset of [0, 30, 55, 80]) {
    w.hp = def.hp;
    w.armour = def.armour;
    w.defeated = false;
    rt.eggs.length = 0;
    cast.spawnEgg(w.body.position.x + offset, w.body.position.y, 90, 0.01, false);
    const egg = rt.eggs[0];
    if (!egg) throw new Error('no egg');
    cast.detonateEgg(egg);
    const hpLost = def.hp + def.armour - (w.hp + w.armour);
    const state = w.defeated ? 'KILL' : `hp ${Math.max(0, w.hp).toFixed(1)}/${def.hp}`;
    console.log(`${type.padEnd(6)} offset ${String(offset).padStart(2)}px: dmg ${hpLost.toFixed(1).padStart(5)} → ${state}`);
  }
  rt.dispose();
}
