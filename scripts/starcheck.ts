/**
 * Three-star reachability check.
 *
 * A level's third star needs `score >= starScore[2]` plus one unused chicken.
 * starScore is 72% of maxScore, and maxScore counts every weasel, every
 * non-ground block and `queue - 1` unused chickens — the score of a clear that
 * broke everything and took a single shot. That fantasy total is never reached,
 * so this script asks the useful question: with every weasel killed and every
 * block broken, how many shots may the clear take and still hold 3 stars?
 *
 * Run: npx --yes tsx scripts/starcheck.ts            (whole campaign)
 *      npx --yes tsx scripts/starcheck.ts w1-28,w4-13
 */
import { ALL_LEVELS } from '../src/data/levels/index';

const ids = (process.argv[2] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const levels = ALL_LEVELS.filter((l) => ids.length === 0 || ids.includes(l.id));

let unreachable = 0;
const rows: string[] = [];
for (const level of levels) {
  const kill = level.weasels.length * 5000;
  const blocks = level.blocks.filter((b) => !b.isGround).length * 1000;
  const q = level.queue.length;
  const goal = level.starScore[2];
  // Most shots a clear can spend and still score 3★: the fewest unused birds
  // whose spare bonus closes the gap.
  let maxShots = 0;
  for (let spare = 1; spare <= q - 1; spare++) {
    if (kill + blocks + spare * 8000 >= goal) {
      maxShots = q - spare;
      break;
    }
  }
  const best = kill + blocks + (q - 1) * 8000;
  if (kill + blocks + (q - 1) * 8000 < goal) unreachable += 1;
  rows.push(
    `${level.id} ${level.name}: queue=${q} 3★=${goal} best=${best} ` +
      (maxShots > 0 ? `maxShots=${maxShots} (${((maxShots / q) * 100).toFixed(0)}% of the coop)` : 'UNREACHABLE'),
  );
}
console.log(rows.join('\n'));
console.log(`\n${levels.length - unreachable}/${levels.length} levels can reach 3★ with every block broken.`);
process.exitCode = unreachable > 0 ? 1 : 0;
