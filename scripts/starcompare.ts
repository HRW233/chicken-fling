/**
 * Before/after 3-star shot budget for the retuned fights.
 *
 * The bar moves with the coop: each extra bird raises `starScore[2]` by 5760
 * but adds 8000 of attainable "unused chicken" score, so the question is
 * whether the clear may spend more shots than before, not whether the bar's
 * absolute number moved.
 *
 * Run: npx --yes tsx scripts/starcompare.ts
 */
import { ALL_LEVELS } from '../src/data/levels/index';

// Coop sizes before this pass.
const BEFORE: Record<string, number> = {
  'w1-28': 6,
  'w3-28': 7,
  'w3-29': 8,
  'w4-13': 6,
  'w4-26': 6,
  'w4-28': 7,
};

function maxShots(queue: number, killBlocks: number, goal: number): number {
  for (let spare = 1; spare < queue; spare++) {
    if (killBlocks + spare * 8000 >= goal) return queue - spare;
  }
  return 0;
}

for (const [id, oldQueue] of Object.entries(BEFORE)) {
  const level = ALL_LEVELS.find((l) => l.id === id);
  if (!level) continue;
  const kb = level.weasels.length * 5000 + level.blocks.filter((b) => !b.isGround).length * 1000;
  const oldGoal = Math.round((kb + Math.max(1, oldQueue - 1) * 8000) * 0.72);
  const before = maxShots(oldQueue, kb, oldGoal);
  const after = maxShots(level.queue.length, kb, level.starScore[2]);
  console.log(
    `${id}: queue ${oldQueue}→${level.queue.length}  3★ ${oldGoal}→${level.starScore[2]}  ` +
      `maxShots ${before}→${after}${after > before ? '  (+' + (after - before) + ')' : ''}`,
  );
}
