/**
 * Dense solvability + reachability probe.
 *
 * For the named levels it
 *  1. reports, per weasel, whether any launch arc can reach it without passing
 *     through static terrain ("sealed pocket" check), and
 *  2. plays several full attempts with a much finer aim/power sweep than
 *     scripts/simulate.ts, so a level is only called unbeatable after a
 *     genuinely broad search.
 *
 * Run: npx --yes tsx scripts/probe.ts w2-10,w4-07 20
 */
import { LevelRuntime } from '../src/game/LevelRuntime';
import { simulateArc } from '../src/game/Trajectory';
import { NULL_FX } from '../src/game/fx';
import { ALL_LEVELS } from '../src/data/levels/index';
import { chickenDef } from '../src/data/chickens';
import type { ChickenDef } from '../src/data/chickens';
import type { Level } from '../src/data/types';

const STEP = 1 / 120;
const DEG = Math.PI / 180;

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Shot {
  angle: number;
  power: number;
  score: number;
}

/**
 * Best clearance from a launch arc to (tx,ty). `blocked` arcs passed through a
 * block before getting close; those are still valid shots, just worse.
 */
function sweep(level: Level, def: ChickenDef, tx: number, ty: number, radius: number): { bestClear: number; clearance: number } {
  const cfg = level.cannon;
  const minA = cfg.minAngleDeg * DEG;
  const maxA = cfg.maxAngleDeg * DEG;
  const hard = level.blocks.filter((b) => b.static && b.material === 'terrain' && !b.isGround);
  let bestClear = Infinity;
  let clearance = Infinity;
  for (let a = minA; a <= maxA + 1e-4; a += 1.5 * DEG) {
    for (let p = 0.45; p <= 1.0001; p += 0.08) {
      const sx = cfg.x + Math.cos(a) * 66;
      const sy = cfg.y - Math.sin(a) * 66;
      const arc = simulateArc(level, sx, sy, a, p, def, 2.2);
      let blocked = false;
      for (const point of arc) {
        if (!blocked) {
          for (const b of hard) {
            const bw = (b.w ?? 0) / 2;
            const bh = (b.h ?? 0) / 2;
            if (point.x > b.x - bw - radius && point.x < b.x + bw + radius && point.y > b.y - bh - radius && point.y < b.y + bh + radius) {
              blocked = true;
              break;
            }
          }
        }
        const d = Math.hypot(point.x - tx, point.y - ty);
        if (d < clearance) clearance = d;
        if (!blocked && d < bestClear) bestClear = d;
      }
    }
  }
  return { bestClear, clearance };
}

function candidatesFor(rt: LevelRuntime, tx: number, ty: number): Shot[] {
  const def = rt.loadedDef;
  if (!def) return [];
  const cfg = rt.level.cannon;
  const minA = cfg.minAngleDeg * DEG;
  const maxA = cfg.maxAngleDeg * DEG;
  const live = rt.blocks.filter((b) => !b.destroyed && !b.def.isGround);
  const out: Shot[] = [];
  for (let a = minA; a <= maxA + 1e-4; a += 1 * DEG) {
    for (let p = 0.45; p <= 1.0001; p += 0.05) {
      const sx = cfg.x + Math.cos(a) * 66;
      const sy = cfg.y - Math.sin(a) * 66;
      const arc = simulateArc(rt.level, sx, sy, a, p, def, 2.2);
      let free = Infinity;
      let clear = Infinity;
      let blocked = false;
      for (const point of arc) {
        if (!blocked) {
          for (const b of live) {
            const bb = b.body.bounds;
            if (point.x > bb.min.x - 6 && point.x < bb.max.x + 6 && point.y > bb.min.y - 6 && point.y < bb.max.y + 6) {
              blocked = true;
              break;
            }
          }
        }
        const d = Math.hypot(point.x - tx, point.y - ty);
        if (d < free) free = d;
        if (!blocked && d < clear) clear = d;
      }
      const score = Number.isFinite(clear) ? clear : free + 500;
      out.push({ angle: a, power: p, score });
    }
  }
  out.sort((l, r) => l.score - r.score);
  return out.slice(0, 30);
}

function pickShot(list: Shot[], rng: () => number, precise: boolean): Shot | null {
  if (list.length === 0) return null;
  // Precise attempts model a player lining up the on-screen arc: tiny jitter on
  // the best solution. Exploratory attempts spray wider to find alternatives.
  const span = Math.min(list.length, 16);
  // Precise = aim the best clear arc, like a player reading the arc preview.
  const idx = precise ? 0 : Math.min(list.length - 1, Math.floor(Math.pow(rng(), 1.6) * span));
  const base = list[idx];
  const jitter = precise ? 0.15 : 2;
  return {
    angle: base.angle + (rng() - 0.5) * jitter * DEG,
    power: Math.min(1, Math.max(0.3, base.power + (rng() - 0.5) * (precise ? 0.01 : 0.06))),
    score: base.score,
  };
}

function abilityTiming(def: ChickenDef, rng: () => number): (t: number, near: number) => boolean {
  const jitter = rng() * 0.25;
  switch (def.ability) {
    case 'dash':
    case 'pierce':
    case 'split':
    case 'inflate':
      return (t) => t > 0.12 + jitter * 0.4;
    case 'eggBomb':
    case 'megaEgg':
      return (t, near) => t > 0.18 && (near < 150 + jitter * 220 || t > 0.7 + jitter);
    case 'fire':
    case 'freeze':
      return (t, near) => t > 0.2 && (near < 260 || t > 0.9);
    default:
      return () => false;
  }
}

interface AttemptResult {
  cleared: boolean;
  shots: number;
  remaining: number;
}

function attempt(level: Level, seed: number): AttemptResult {
  const rt = new LevelRuntime(level, NULL_FX);
  const rng = mulberry(seed);
  let shots = 0;
  let guard = 0;
  let bestRemaining = rt.weasels.length;
  try {
    while (rt.state === 'aiming' && guard++ < 12) {
      const alive = rt.weasels.filter((w) => !w.defeated);
      if (alive.length === 0) break;
      const target = alive[Math.floor(rng() * alive.length)];
      const def = rt.loadedDef;
      if (!def) break;
      const shot = pickShot(candidatesFor(rt, target.body.position.x, target.body.position.y), rng, guard % 2 === 0);
      if (!shot) break;
      const shouldUse = abilityTiming(def, rng);
      rt.fire(shot.angle, shot.power);
      shots += 1;
      let abilityDone = false;
      let steps = 0;
      while ((rt.state as string) === 'flying' && steps < 120 * 9) {
        rt.step(STEP);
        steps += 1;
        const chicken = rt.activeChicken;
        if (!abilityDone && chicken && !chicken.abilityUsed) {
          const body = chicken.bodies[0];
          const near = body
            ? Math.hypot(body.position.x - target.body.position.x, body.position.y - target.body.position.y)
            : 999;
          if (shouldUse(steps * STEP, near)) {
            if (rt.useAbility()) abilityDone = true;
          }
        }
      }
      bestRemaining = Math.min(bestRemaining, rt.weasels.filter((w) => !w.defeated).length);
      if (rt.state !== 'aiming') break;
    }
    return { cleared: rt.state === 'won', shots, remaining: bestRemaining };
  } finally {
    rt.dispose();
  }
}

const ids = (process.argv[2] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const attempts = Math.max(1, Number(process.argv[3] ?? 20));
const levels = ALL_LEVELS.filter((l) => ids.length === 0 || ids.includes(l.id));

let fails = 0;
for (const level of levels) {
  const first = chickenDef(level.queue[0]);
  const reach = level.weasels.map((w) => {
    const r = sweep(level, first, w.x, w.y, first.radius);
    return `${w.type}@${Math.round(w.x)},${Math.round(w.y)} clear=${Number.isFinite(r.bestClear) ? r.bestClear.toFixed(0) : 'never'} free=${r.clearance.toFixed(0)}`;
  });
  let won = false;
  let winShots = 0;
  let bestRemaining = level.weasels.length;
  let fired = 0;
  const started = Date.now();
  for (let i = 0; i < attempts && !won; i++) {
    const r = attempt(level, 9001 + i * 733 + level.index * 97 + level.world * 31);
    fired += r.shots;
    if (r.cleared) {
      won = true;
      winShots = r.shots;
    } else if (r.remaining < bestRemaining) {
      bestRemaining = r.remaining;
    }
  }
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  if (won) {
    console.log(`${level.id} ${level.name}: CLEARED in ${winShots} shot(s) [${secs}s]`);
  } else {
    fails += 1;
    console.log(
      `${level.id} ${level.name}: NOT cleared — ${bestRemaining}/${level.weasels.length} left, ${fired} shots [${secs}s] queue=${level.queue.join('/')}`,
    );
  }
  for (const line of reach) console.log(`   reach ${line}`);
}
console.log(`\n${levels.length - fails}/${levels.length} beatable by the dense probe.`);
process.exitCode = fails > 0 ? 1 : 0;
