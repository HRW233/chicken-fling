import type { ChickenDef } from '../data/chickens';
import type { Level } from '../data/types';

export interface ArcPoint {
  x: number;
  y: number;
  t: number;
}

/** Integrate the actual projectile flight (gravity, wind, drag) at 1/120 s. */
export function simulateArc(
  level: Level,
  startX: number,
  startY: number,
  angleRad: number,
  power: number,
  def: ChickenDef,
  duration = 0.9,
): ArcPoint[] {
  const contactRadius = Math.max(6, def.radius);
  const speed = 700 + 620 * power;
  let x = startX;
  let y = startY;
  let vx = Math.cos(angleRad) * speed;
  let vy = -Math.sin(angleRad) * speed;
  const gravityY = level.gravity?.y ?? 2200;
  const wind = level.wind;
  const drag = 0.035 * def.drag;
  const dt = 1 / 120;
  const points: ArcPoint[] = [];
  for (let t = dt; t <= duration + 1e-6; t += dt) {
    vy += gravityY * dt;
    vx += (wind.x - vx * drag) * dt;
    vy += (wind.y - vy * drag) * dt;
    x += vx * dt;
    y += vy * dt;
    if (x < -80 || x > (level.worldWidth ?? 1280) + 160 || y > level.groundY - contactRadius) {
      points.push({ x, y, t });
      break;
    }
    points.push({ x, y, t });
  }
  return points;
}

/** Evenly spaced dots sampled from the integrated arc. */
export function sampleArc(points: ArcPoint[], count: number): ArcPoint[] {
  if (points.length === 0 || count <= 0) return [];
  if (points.length <= count) return points.slice();
  const out: ArcPoint[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.min(points.length - 1, Math.round((i / (count - 1)) * (points.length - 1)));
    out.push(points[idx]);
  }
  return out;
}
