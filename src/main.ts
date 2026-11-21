import { Game } from './game/Game';
import { validateLevels } from './data/levels/validate';

const canvas = document.getElementById('game');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Missing #game canvas');
}

const game = new Game(canvas);

const loading = document.getElementById('loading');
if (loading) {
  loading.classList.add('hidden');
  window.setTimeout(() => loading.remove(), 400);
}

if (import.meta.env.DEV) {
  const report = validateLevels();
  if (report.problems.length > 0) {
    console.warn('[chicken-fling] level validation problems:', report.problems);
  } else {
    console.info(
      `[chicken-fling] ${report.levelCount} levels validated · eggs ${report.goldenEggs} · bosses ${report.bosses}`,
    );
  }
  (window as unknown as { chickenFling?: unknown }).chickenFling = game;
}
