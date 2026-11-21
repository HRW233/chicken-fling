import { CHICKEN_ORDER } from '../chickens';
import type { ChickenId } from '../types';
import { weaselDef } from './builder';
import { ALL_LEVELS } from './index';

export interface ValidationReport {
  levelCount: number;
  problems: string[];
  chickenLevels: Record<string, number>;
  goldenEggs: number;
  bosses: number;
}

/** Structural checks the game can run in development and the QA harness can reuse. */
export function validateLevels(): ValidationReport {
  const problems: string[] = [];
  const ids = new Set<string>();
  const chickenLevels: Record<string, number> = {};
  for (const id of CHICKEN_ORDER) chickenLevels[id] = 0;

  for (const level of ALL_LEVELS) {
    if (ids.has(level.id)) problems.push(`${level.id}: duplicate id`);
    ids.add(level.id);
    if (level.blocks.length < 2) problems.push(`${level.id}: no structure`);
    if (level.weasels.length === 0) problems.push(`${level.id}: no weasels`);
    if (level.queue.length === 0) problems.push(`${level.id}: empty queue`);
    if (!(level.starScore[2] > level.starScore[1] && level.starScore[1] >= 0)) {
      problems.push(`${level.id}: star thresholds out of order`);
    }
    if (level.parTimeSec <= 0) problems.push(`${level.id}: bad par time`);
    const seen = new Set(level.queue);
    for (const id of seen) chickenLevels[id] = (chickenLevels[id] ?? 0) + 1;
    for (const block of level.blocks) {
      if (block.x < -20 || block.x > 1300 || block.y < -600 || block.y > 940) {
        problems.push(`${level.id}: block ${block.id} out of bounds (${block.x},${block.y})`);
      }
      if (block.shape === 'box' && (!block.w || !block.h)) problems.push(`${level.id}: block ${block.id} missing size`);
    }
    for (const weasel of level.weasels) {
      if (weasel.x < 0 || weasel.x > 1280 || weasel.y < -600 || weasel.y > 900) {
        problems.push(`${level.id}: weasel ${weasel.id} out of bounds`);
      }
      // A weasel spawned inside a block can never be hit (the block shields it)
      // and jitters itself apart, so treat that as a layout bug.
      const wr = weaselDef(weasel.type).radius;
      for (const block of level.blocks) {
        if (block.shape === 'circle') continue;
        if (Math.abs(block.angle ?? 0) > 1) continue;
        const hx = (block.w ?? 0) / 2;
        const hy = (block.h ?? 0) / 2;
        const nx = Math.max(block.x - hx, Math.min(weasel.x, block.x + hx));
        const ny = Math.max(block.y - hy, Math.min(weasel.y, block.y + hy));
        if (Math.hypot(weasel.x - nx, weasel.y - ny) < wr - 3) {
          problems.push(`${level.id}: ${weasel.type} ${weasel.id} spawns inside ${block.material} ${block.id}`);
        }
      }
    }
    for (const id of level.queue) {
      if (!(id in chickenLevels)) problems.push(`${level.id}: unknown chicken ${String(id)}`);
    }
  }

  if (ALL_LEVELS.length !== 145) problems.push(`expected 145 levels, found ${ALL_LEVELS.length}`);
  for (let w = 1; w <= 5; w++) {
    const levels = ALL_LEVELS.filter((l) => l.world === w);
    if (levels.length !== 29) problems.push(`world ${w}: expected 29 levels, found ${levels.length}`);
  }
  for (const id of CHICKEN_ORDER) {
    if ((chickenLevels[id] ?? 0) < 8) problems.push(`chicken ${id} appears in only ${chickenLevels[id] ?? 0} levels`);
  }

  const goldenEggs = ALL_LEVELS.filter((l) => l.pickups.length > 0).length;
  if (goldenEggs !== 5) problems.push(`expected 5 golden eggs, found ${goldenEggs}`);
  const bosses = ALL_LEVELS.filter((l) => l.weasels.some((w) => w.type === 'boss')).length;
  if (bosses !== 5) problems.push(`expected 5 bosses, found ${bosses}`);

  return { levelCount: ALL_LEVELS.length, problems, chickenLevels, goldenEggs, bosses };
}

export function chickenCoverage(level: { queue: ChickenId[] }): ChickenId[] {
  return level.queue;
}
