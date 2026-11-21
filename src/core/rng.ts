/** Seeded PRNG (mulberry32) plus small helpers. All gameplay randomness uses this. */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(...parts: number[]): number {
  let h = 2166136261 >>> 0;
  for (const p of parts) {
    h ^= Math.imul(p | 0, 374761393) + (h << 13) + (h >>> 7);
    h = Math.imul(h, 2246822519) >>> 0;
  }
  return h >>> 0;
}

export function rngRange(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng();
}

export function rngInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rngRange(rng, min, max + 1));
}

export function rngPick<T>(rng: Rng, list: readonly T[]): T {
  if (list.length === 0) throw new Error('rngPick on empty list');
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeOutCubic(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}

export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(target, current + maxDelta);
  return Math.max(target, current - maxDelta);
}
