import type { Material } from '../data/types';
import { materialDef } from '../data/materials';

const SIZE = 72;

/** Procedural material swatches, cached per material + variant. */
export class Textures {
  private cache = new Map<string, HTMLCanvasElement>();
  private patterns = new Map<string, CanvasPattern>();
  private dpr = 1;

  setDpr(dpr: number): void {
    if (Math.abs(dpr - this.dpr) > 0.01) {
      this.dpr = dpr;
      this.clear();
    }
  }

  clear(): void {
    this.cache.clear();
    this.patterns.clear();
  }

  variantFor(seed: number): number {
    return seed % 3;
  }

  canvasFor(material: Material, variant: number): HTMLCanvasElement {
    const key = `${material}-${variant}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    if (ctx) this.paint(ctx, material, variant);
    this.cache.set(key, canvas);
    if (this.cache.size > 24) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    return canvas;
  }

  patternFor(ctx: CanvasRenderingContext2D, material: Material, variant: number): CanvasPattern | string {
    const key = `${material}-${variant}`;
    const hit = this.patterns.get(key);
    if (hit) return hit;
    const pattern = ctx.createPattern(this.canvasFor(material, variant), 'repeat');
    if (!pattern) return materialDef(material).fill;
    this.patterns.set(key, pattern);
    return pattern;
  }

  private paint(ctx: CanvasRenderingContext2D, material: Material, variant: number): void {
    const m = materialDef(material);
    ctx.save();
    ctx.fillStyle = m.fill;
    ctx.fillRect(0, 0, SIZE, SIZE);
    const rand = mulberry(1234 + variant * 97 + material.length * 31);
    ctx.lineCap = 'round';

    if (material === 'hay') {
      for (let i = 0; i < 26; i++) {
        const y = rand() * SIZE;
        ctx.strokeStyle = rand() > 0.5 ? m.light : m.dark;
        ctx.globalAlpha = 0.5 + rand() * 0.35;
        ctx.lineWidth = 1 + rand() * 2;
        ctx.beginPath();
        ctx.moveTo(rand() * SIZE, y);
        ctx.lineTo(rand() * SIZE, y + (rand() - 0.5) * 10);
        ctx.stroke();
      }
    } else if (material === 'wood') {
      for (let i = 0; i < 4; i++) {
        const y = (i / 4) * SIZE;
        ctx.strokeStyle = m.dark;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(SIZE, y + 2);
        ctx.stroke();
        ctx.globalAlpha = 0.28;
        ctx.strokeStyle = m.light;
        ctx.beginPath();
        ctx.moveTo(0, y + 6);
        ctx.lineTo(SIZE, y + 8);
        ctx.stroke();
      }
      for (let i = 0; i < 2; i++) {
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = m.edge;
        ctx.beginPath();
        ctx.ellipse(rand() * SIZE, rand() * SIZE, 4 + rand() * 3, 2 + rand() * 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (material === 'ice') {
      for (let i = 0; i < 5; i++) {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = m.light;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(rand() * SIZE, 0);
        ctx.lineTo(rand() * SIZE, SIZE);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(SIZE * 0.6, 0, 3, SIZE);
    } else if (material === 'stone') {
      for (let i = 0; i < 46; i++) {
        ctx.globalAlpha = 0.25 + rand() * 0.35;
        ctx.fillStyle = rand() > 0.5 ? m.light : m.dark;
        const s = 1 + rand() * 3.5;
        ctx.fillRect(rand() * SIZE, rand() * SIZE, s, s);
      }
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = m.edge;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, SIZE * 0.4);
      ctx.lineTo(SIZE * 0.5, SIZE * 0.55);
      ctx.lineTo(SIZE, SIZE * 0.45);
      ctx.stroke();
    } else if (material === 'metal') {
      for (let i = 0; i < 8; i++) {
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = i % 2 ? m.light : m.dark;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, (i / 8) * SIZE);
        ctx.lineTo(SIZE, (i / 8) * SIZE);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.75;
      for (const [x, y] of [
        [12, 12],
        [SIZE - 12, 12],
        [12, SIZE - 12],
        [SIZE - 12, SIZE - 12],
      ]) {
        ctx.fillStyle = m.light;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = m.dark;
        ctx.beginPath();
        ctx.arc(x + 0.6, y + 0.8, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (material === 'crystal') {
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = rand() > 0.5 ? m.light : m.dark;
        ctx.beginPath();
        const x = rand() * SIZE;
        const y = rand() * SIZE;
        ctx.moveTo(x, y);
        ctx.lineTo(x + 12 + rand() * 14, y + rand() * 10);
        ctx.lineTo(x + rand() * 8, y + 12 + rand() * 12);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      for (let i = 0; i < 34; i++) {
        ctx.globalAlpha = 0.3 + rand() * 0.3;
        ctx.fillStyle = rand() > 0.55 ? m.light : m.dark;
        ctx.fillRect(rand() * SIZE, rand() * SIZE, 2, 4);
      }
    }
    ctx.restore();
  }
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
