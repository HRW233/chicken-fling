/**
 * Greedy solvability solver.
 *
 * For each shot it scores a shortlist of launch angles/powers by actually
 * playing them out (replaying the earlier shots first, since physics is
 * deterministic), then keeps the best. That models a player who reads the arc
 * preview and tries a few aims, which is a much fairer "is this beatable?"
 * test than a random spray.
 *
 * Run: npx --yes tsx scripts/solve.ts w2-10,w4-07
 *      npx --yes tsx scripts/solve.ts            (whole campaign)
 */
import { LevelRuntime } from '../src/game/LevelRuntime';
import { simulateArc } from '../src/game/Trajectory';
import { NULL_FX } from '../src/game/fx';
import { ALL_LEVELS } from '../src/data/levels/index';
import type { ChickenDef } from '../src/data/chickens';
import type { Level } from '../src/data/types';

const STEP = 1 / 120;
const DEG = Math.PI / 180;

interface Shot {
  angle: number;
  power: number;
}

interface Attempt {
  won: boolean;
  shots: Shot[];
  bestRemaining: number;
}

function replay(level: Level, shots: Shot[], evaluate = false): { rt: LevelRuntime; snapshot: Snapshot } | null {
  const rt = new LevelRuntime(level, NULL_FX);
  for (const shot of shots) {
    const def = rt.loadedDef;
    if (!def || rt.state !== 'aiming') break;
    const target = nearestAlive(rt, shot);
    rt.fire(shot.angle, shot.power);
    stepShot(rt, def, target);
  }
  if (!evaluate) return { rt, snapshot: snapshotOf(rt) };
  return { rt, snapshot: snapshotOf(rt) };
}

interface Snapshot {
  hp: Map<string, number>;
  defeated: Set<string>;
  blocks: number;
  cleared: boolean;
}

function snapshotOf(rt: LevelRuntime): Snapshot {
  return {
    hp: new Map(rt.weasels.map((w) => [w.def.id, w.hp + w.armour])),
    defeated: new Set(rt.weasels.filter((w) => w.defeated).map((w) => w.def.id)),
    blocks: rt.blocksDestroyed,
    cleared: rt.state === 'won',
  };
}

function nearestAlive(rt: LevelRuntime, shot: Shot) {
  const alive = rt.weasels.filter((w) => !w.defeated);
  if (alive.length === 0) return null;
  const def = rt.loadedDef;
  if (!def) return null;
  const arc = simulateArc(rt.level, rt.level.cannon.x + Math.cos(shot.angle) * 66, rt.level.cannon.y - Math.sin(shot.angle) * 66, shot.angle, shot.power, def, 1.5);
  let best = alive[0];
  let bestD = Infinity;
  for (const w of alive) {
    for (const p of arc) {
      const d = Math.hypot(p.x - w.body.position.x, p.y - w.body.position.y);
      if (d < bestD) {
        bestD = d;
        best = w;
      }
    }
  }
  return best;
}

function stepShot(rt: LevelRuntime, def: ChickenDef, target: { body: { position: { x: number; y: number } } } | null): void {
  let steps = 0;
  let abilityDone = false;
  while ((rt.state as string) === 'flying' && steps < 120 * 9) {
    rt.step(STEP);
    steps += 1;
    const chicken = rt.activeChicken;
    if (!abilityDone && chicken && chicken.def.ability !== 'none' && !chicken.abilityUsed) {
      const body = chicken.bodies[0];
      const t = steps * STEP;
      const near = body && target
        ? Math.hypot(body.position.x - target.body.position.x, body.position.y - target.body.position.y)
        : 999;
      const early = ['dash', 'pierce', 'split', 'inflate'].includes(def.ability);
      const use = early ? t > 0.14 : t > 0.2 && (near < 170 || t > 0.8);
      if (use && rt.useAbility()) abilityDone = true;
    }
  }
}

/** Shortlist of aims: the best arc per weasel plus a few spread shots. */
function candidates(rt: LevelRuntime): Shot[] {
  const def = rt.loadedDef;
  if (!def) return [];
  const cfg = rt.level.cannon;
  const minA = cfg.minAngleDeg * DEG;
  const maxA = cfg.maxAngleDeg * DEG;
  const alive = rt.weasels.filter((w) => !w.defeated);
  const live = rt.blocks.filter((b) => !b.destroyed && !b.def.isGround);
  const scored: { shot: Shot; score: number }[] = [];
  for (let a = minA; a <= maxA + 1e-4; a += 1 * DEG) {
    for (let p = 0.5; p <= 1.0001; p += 0.05) {
      const sx = cfg.x + Math.cos(a) * 66;
      const sy = cfg.y - Math.sin(a) * 66;
      const arc = simulateArc(rt.level, sx, sy, a, p, def, 2.2);
      // Aim at the weasel: nearest arc approach wins, with a penalty if the arc
      // clipped structure first. A player adjusts from the preview, so a shot
      // that grazes a block on the way in is still worth trying.
      let best = Infinity;
      for (const w of alive) {
        let blocked = false;
        let free = Infinity;
        for (const point of arc) {
          if (!blocked) {
            for (const b of live) {
              const bb = b.body.bounds;
              if (point.x > bb.min.x - 4 && point.x < bb.max.x + 4 && point.y > bb.min.y - 4 && point.y < bb.max.y + 4) {
                blocked = true;
                break;
              }
            }
          }
          const d = Math.hypot(point.x - w.body.position.x, point.y - w.body.position.y);
          if (d < free) free = d;
        }
        best = Math.min(best, free + (blocked ? 40 : 0));
      }
      scored.push({ shot: { angle: a, power: p }, score: best });
    }
  }
  scored.sort((l, r) => l.score - r.score);
  const out: Shot[] = [];
  const seen = new Set<string>();
  const push = (s: Shot): void => {
    const key = `${s.angle.toFixed(3)}:${s.power.toFixed(2)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(s);
  };
  for (const s of scored.slice(0, 26)) push(s.shot);
  // Spread shots so a shortlist can't get stuck on one approach lane.
  for (const a of [Math.min(minA + 26 * DEG, maxA), (minA + maxA) / 2, Math.max(maxA - 6 * DEG, minA)]) {
    for (const p of [0.7, 0.85, 1]) push({ angle: a, power: p });
  }
  return out.slice(0, 34);
}

function evaluate(level: Level, prefix: Shot[], shot: Shot): { score: number; cleared: boolean; remaining: number; won: boolean } {
  const rt = new LevelRuntime(level, NULL_FX);
  for (const s of prefix) {
    const def = rt.loadedDef;
    if (!def) break;
    const target = nearestAlive(rt, s);
    rt.fire(s.angle, s.power);
    stepShot(rt, def, target);
  }
  if (rt.state !== 'aiming' || !rt.loadedDef) {
    return { score: -1, cleared: rt.state === 'won', remaining: rt.weasels.filter((w) => !w.defeated).length, won: rt.state === 'won' };
  }
  // Damage already banked by the prefix.
  const before = new Map(rt.weasels.map((w) => [w.def.id, (w.defeated ? -100 : 0) + w.hp + w.armour]));
  const target = nearestAlive(rt, shot);
  const def = rt.loadedDef;
  rt.fire(shot.angle, shot.power);
  stepShot(rt, def, target);
  let score = 0;
  for (const w of rt.weasels) {
    const b = before.get(w.def.id) ?? 0;
    const after = (w.defeated ? -100 : 0) + w.hp + w.armour;
    score += b - after;
    if (w.defeated && b > -100) score += 14;
  }
  score += rt.blocksDestroyed * 0.05;
  return {
    score,
    cleared: rt.state === 'won',
    remaining: rt.weasels.filter((x) => !x.defeated).length,
    won: rt.state === 'won',
  };
}

function minAngle(level: Level): number {
  return level.cannon.minAngleDeg * DEG;
}

function maxAngle(level: Level): number {
  return level.cannon.maxAngleDeg * DEG;
}

function solve(level: Level, maxShots = 10): Attempt {
  const shots: Shot[] = [];
  let bestRemaining = level.weasels.length;
  for (let n = 0; n < maxShots; n++) {
    const probe = new LevelRuntime(level, NULL_FX);
    for (const s of shots) {
      const def = probe.loadedDef;
      if (!def) break;
      const target = nearestAlive(probe, s);
      probe.fire(s.angle, s.power);
      stepShot(probe, def, target);
    }
    if (probe.state !== 'aiming') {
      const won = probe.state === 'won';
      probe.dispose();
      return { won, shots, bestRemaining: won ? 0 : bestRemaining };
    }
    const list = candidates(probe);
    probe.dispose();
    let best: { shot: Shot; score: number; cleared: boolean; remaining: number } | null = null;
    const tryShot = (shot: Shot): boolean => {
      const r = evaluate(level, shots, shot);
      if (!best || r.score > best.score) best = { shot, ...r };
      return r.cleared;
    };
    for (const shot of list) {
      if (tryShot(shot)) break;
    }
    // Hill-climb around the best aim: a player nudges the mouse until the arc
    // sits on the weasel, which is how narrow windows get hit.
    if (best && !best.cleared) {
      const seeds = [best.shot, ...list.slice(0, 2)];
      for (const seed of seeds) {
        for (const da of [-1.2, -0.6, 0.6, 1.2]) {
          for (const dp of [-0.04, 0.04]) {
            const angle = Math.min(maxAngle(level), Math.max(minAngle(level), seed.angle + da * DEG));
            const power = Math.min(1, Math.max(0.3, seed.power + dp));
            if (tryShot({ angle, power })) break;
          }
          if (best?.cleared) break;
        }
        if (best?.cleared) break;
      }
    }
    if (!best) break;
    shots.push(best.shot);
    bestRemaining = Math.min(bestRemaining, best.remaining);
    if (best.cleared) return { won: true, shots, bestRemaining: 0 };
  }
  return { won: false, shots, bestRemaining };
}

const ids = (process.argv[2] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const levels = ALL_LEVELS.filter((l) => ids.length === 0 || ids.includes(l.id));
let fails = 0;
const started = Date.now();
for (const level of levels) {
  const t0 = Date.now();
  const r = solve(level);
  if (r.won) {
    console.log(`${level.id} ${level.name}: SOLVED in ${r.shots.length} shots (${r.shots.map((s) => `${(s.angle / DEG).toFixed(0)}°/${s.power.toFixed(2)}`).join(' ')}) [${((Date.now() - t0) / 1000).toFixed(1)}s]`);
  } else {
    fails += 1;
    console.log(`${level.id} ${level.name}: NOT solved — ${r.bestRemaining}/${level.weasels.length} left after ${r.shots.length} shots [${((Date.now() - t0) / 1000).toFixed(1)}s]`);
  }
}
console.log(`\n${levels.length - fails}/${levels.length} solved in ${((Date.now() - started) / 1000).toFixed(1)}s`);
process.exitCode = fails > 0 ? 1 : 0;
