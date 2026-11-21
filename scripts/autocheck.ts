import { ALL_LEVELS } from '../src/data/levels/index';
import { LevelRuntime } from '../src/game/LevelRuntime';

const fx = {
  burst: () => {},
  sound: () => {},
  shake: () => {},
  slowMo: () => {},
} as never;

const rows: string[] = [];
let autoWins = 0;
for (const level of ALL_LEVELS) {
  const rt = new LevelRuntime(level, fx);
  for (let i = 0; i < 300; i++) rt.step(1 / 60);
  if (rt.state === 'won') {
    autoWins++;
    rows.push(
      `${level.id} ${level.name}: WON no shots, t=${rt.time.toFixed(2)} blocks=${rt.blocksDestroyed} weasels=${rt.weaselsDefeated} score=${rt.score}`,
    );
  }
  rt.dispose();
}
console.log(rows.join('\n'));
console.log(`auto-won ${autoWins}/${ALL_LEVELS.length} levels without firing`);
