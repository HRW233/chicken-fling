/**
 * Headless solvability harness.
 *
 * For each level it makes several full attempts from a fresh world. Each
 * attempt picks a target weasel, solves the launch angle from the real
 * trajectory model (with jitter) and uses the chicken's ability at a sensible
 * moment. If any attempt clears the level, a human with a visible arc and the
 * same information can clear it too.
 *
 * Run: npx --yes tsx scripts/simulate.ts [w1|w2|w3|w4|w5|all] [attempts]
 */
import { LevelRuntime } from '../src/game/LevelRuntime';
import { simulateArc } from '../src/game/Trajectory';
import { NULL_FX } from '../src/game/fx';
import { ALL_LEVELS } from '../src/data/levels/index';
import { validateLevels } from '../src/data/levels/validate';
import type { ChickenDef } from '../src/data/chickens';

const STEP = 1 / 120;
const DEG = Math.PI / 180;

interface Candidate {
  angle: number;
  power: number;
  distance: number;
  targetId: string;
}

function occludedDistance(rt: LevelRuntime, arc: { x: number; y: number }[], tx: number, ty: number): number {
  const blocks = rt.blocks.filter((b) => !b.destroyed && !b.def.isGround);
  let best = Infinity;
  for (let i = 0; i < arc.length; i += 2) {
    const p = arc[i];
    let blocked = false;
    for (const b of blocks) {
      const bb = b.body.bounds;
      if (p.x > bb.min.x - 8 && p.x < bb.max.x + 8 && p.y > bb.min.y - 8 && p.y < bb.max.y + 8) {
        blocked = true;
        break;
      }
    }
    if (blocked) break;
    const d = Math.hypot(p.x - tx, p.y - ty);
    if (d < best) best = d;
  }
  return best;
}

function candidateFor(rt: LevelRuntime, targetId: string, power: number, jitter: number): Candidate | null {
  const def = rt.loadedDef;
  if (!def) return null;
  const target = rt.weasels.find((w) => w.def.id === targetId && !w.defeated);
  if (!target) return null;
  const cfg = rt.level.cannon;
  const minA = cfg.minAngleDeg * DEG;
  const maxA = cfg.maxAngleDeg * DEG;
  const tx = target.body.position.x;
  const ty = target.body.position.y;
  let best: Candidate | null = null;
  let fallback: Candidate | null = null;
  for (let a = minA; a <= maxA + 0.001; a += 2 * DEG) {
    const sx = cfg.x + Math.cos(a) * 66;
    const sy = cfg.y - Math.sin(a) * 66;
    const arc = simulateArc(rt.level, sx, sy, a, power, def, 1.5);
    let free = Infinity;
    for (const p of arc) {
      const d = Math.hypot(p.x - tx, p.y - ty);
      if (d < free) free = d;
    }
    const aim = Math.max(minA, Math.min(maxA, a + jitter * DEG));
    if (!fallback || free < fallback.distance) fallback = { angle: aim, power, distance: free, targetId };
    if (free > 110) continue;
    const distance = occludedDistance(rt, arc, tx, ty);
    if (!Number.isFinite(distance)) continue;
    if (!best || distance < best.distance) best = { angle: aim, power, distance, targetId };
  }
  return best ?? fallback;
}

function abilityMoment(def: ChickenDef): 'early' | 'late' {
  switch (def.ability) {
    case 'dash':
    case 'pierce':
    case 'split':
    case 'inflate':
      return 'early';
    default:
      return 'late';
  }
}

function playAttempt(levelIndex: number, seed: number): { cleared: boolean; shots: number; remaining: number; near: number } {
  const level = ALL_LEVELS[levelIndex];
  const rt = new LevelRuntime(level, NULL_FX);
  let shots = 0;
  let guard = 0;
  let bestRemaining = rt.weasels.length;
  try {
    while (rt.state === 'aiming' && guard++ < 10) {
      const alive = rt.weasels.filter((w) => !w.defeated);
      if (alive.length === 0) break;
      const target = alive[Math.abs(seed + shots * 7) % alive.length];
      const powers = [0.75, 0.88, 1];
      const power = powers[Math.abs(seed * 3 + shots) % powers.length];
      const offsets = [-3, -1.5, 0, 1.5, 3];
      const jitter = offsets[Math.abs(seed * 7 + shots * 5) % offsets.length];
      const candidate = candidateFor(rt, target.def.id, power, jitter);
      if (!candidate) break;
      const def = rt.loadedDef;
      if (!def) break;
      rt.fire(candidate.angle, candidate.power);
      shots += 1;
      const moment = abilityMoment(def);
      let abilityDone = false;
      let steps = 0;
      while ((rt.state as string) === 'flying' && steps < 120 * 8) {
        rt.step(STEP);
        steps += 1;
        const chicken = rt.activeChicken;
        if (!abilityDone && chicken && chicken.def.ability !== 'none' && !chicken.abilityUsed) {
          const body = chicken.bodies[0];
          const t = (steps * STEP);
          const near = body ? Math.hypot(body.position.x - target.body.position.x, body.position.y - target.body.position.y) : 999;
          if (moment === 'early' ? t > 0.12 : t > 0.3 && (near < 170 || t > 0.75)) {
            if (rt.useAbility()) abilityDone = true;
          }
        }
      }
      const remaining = rt.weasels.filter((w) => !w.defeated).length;
      bestRemaining = Math.min(bestRemaining, remaining);
      if (rt.state !== 'aiming') break;
    }
    return { cleared: rt.state === 'won', shots, remaining: bestRemaining, near: bestRemaining };
  } finally {
    rt.dispose();
  }
}

const filter = process.argv[2] ?? 'all';
const attempts = Math.max(1, Number(process.argv[3] ?? 8));

const report = validateLevels();
console.log(`levels=${report.levelCount} problems=${report.problems.length} eggs=${report.goldenEggs} bosses=${report.bosses}`);
for (const p of report.problems.slice(0, 12)) console.log('  !', p);

const indices = ALL_LEVELS.map((_, i) => i).filter((i) => filter === 'all' || `w${ALL_LEVELS[i].world}` === filter);

const failures: string[] = [];
const nearMisses: string[] = [];
let cleared = 0;
const started = Date.now();
for (const levelIndex of indices) {
  const level = ALL_LEVELS[levelIndex];
  let bestShots = 0;
  let bestRemaining = level.weasels.length;
  let won = false;
  for (let attempt = 0; attempt < attempts && !won; attempt++) {
    const result = playAttempt(levelIndex, levelIndex * 131 + attempt * 37 + 11);
    if (result.cleared) {
      won = true;
      bestShots = result.shots;
      bestRemaining = 0;
    } else if (result.remaining < bestRemaining) {
      bestRemaining = result.remaining;
      bestShots = result.shots;
    }
  }
  if (won) cleared += 1;
  else {
    failures.push(`${level.id} ${level.name}: best remaining ${bestRemaining}/${level.weasels.length} after ${bestShots} shots (queue ${level.queue.length})`);
    if (bestRemaining <= 1) nearMisses.push(level.id);
  }
  if ((cleared + failures.length) % 25 === 0) {
    console.log(`  … ${cleared + failures.length}/${indices.length} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  }
}

console.log(`\nCleared ${cleared}/${indices.length} across ${attempts} attempts each in ${((Date.now() - started) / 1000).toFixed(1)}s`);
if (nearMisses.length > 0) console.log(`Near misses (one weasel left): ${nearMisses.join(', ')}`);
if (failures.length > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(' ', f);
}
console.log(
  'Chicken coverage:',
  Object.entries(report.chickenLevels)
    .map(([k, v]) => `${k}:${v}`)
    .join(' '),
);
