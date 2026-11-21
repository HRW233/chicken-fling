import type { Material } from '../data/types';
import { materialDef } from '../data/materials';

/**
 * Material swatches are painted at 144 px and tiled, giving twice the texel
 * density of the old 72 px tiles while keeping the same feature size on screen.
 */
const SIZE = 144;

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
    const rand = mulberry(1234 + variant * 97 + material.length * 31);
    ctx.save();
    // Base wash: a soft diagonal gradient keeps big blocks from looking flat.
    const base = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    base.addColorStop(0, m.light);
    base.addColorStop(0.45, m.fill);
    base.addColorStop(1, m.dark);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.globalAlpha = 1;
    ctx.fillStyle = m.fill;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.globalAlpha = 1;
    ctx.lineCap = 'round';

    if (material === 'hay') {
      // Straw: overlapping strands with a lit top edge and a shadow below.
      for (let i = 0; i < 52; i++) {
        const y = rand() * SIZE;
        const x = rand() * SIZE;
        const len = 20 + rand() * 44;
        const droop = (rand() - 0.5) * 22;
        ctx.globalAlpha = 0.35 + rand() * 0.4;
        ctx.strokeStyle = m.dark;
        ctx.lineWidth = 1.6 + rand() * 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + len * 0.5, y + droop, x + len, y + droop * 0.35);
        ctx.stroke();
        ctx.globalAlpha = 0.3 + rand() * 0.35;
        ctx.strokeStyle = m.light;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y - 2);
        ctx.quadraticCurveTo(x + len * 0.5, y - 2 + droop, x + len, y - 2 + droop * 0.35);
        ctx.stroke();
      }
      // Binding twine.
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = m.edge;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, SIZE * 0.34);
      ctx.lineTo(SIZE, SIZE * 0.4);
      ctx.stroke();
    } else if (material === 'wood') {
      // Plank seams.
      for (let i = 0; i < 4; i++) {
        const y = (i / 4) * SIZE;
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = m.edge;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(SIZE, y + 3);
        ctx.stroke();
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = m.light;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, y + 7);
        ctx.lineTo(SIZE, y + 10);
        ctx.stroke();
        // Grain.
        for (let g = 0; g < 3; g++) {
          ctx.globalAlpha = 0.12 + rand() * 0.12;
          ctx.strokeStyle = m.dark;
          ctx.lineWidth = 1.4;
          const gy = y + 4 + rand() * (SIZE / 4 - 8);
          ctx.beginPath();
          ctx.moveTo(rand() * SIZE * 0.3, gy);
          ctx.bezierCurveTo(SIZE * 0.35, gy + (rand() - 0.5) * 8, SIZE * 0.6, gy + (rand() - 0.5) * 8, SIZE, gy);
          ctx.stroke();
        }
      }
      // Knots.
      for (let i = 0; i < 3; i++) {
        const kx = rand() * SIZE;
        const ky = rand() * SIZE;
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = m.edge;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(kx, ky, 7 + rand() * 5, 4 + rand() * 3, 0.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.ellipse(kx, ky, 3.5, 2, 0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (material === 'ice') {
      // Frozen facets.
      for (let i = 0; i < 10; i++) {
        ctx.globalAlpha = 0.16 + rand() * 0.22;
        ctx.fillStyle = rand() > 0.5 ? m.light : '#FFFFFF';
        const x = rand() * SIZE;
        const y = rand() * SIZE;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 24 + rand() * 26, y + rand() * 12);
        ctx.lineTo(x + rand() * 10, y + 20 + rand() * 20);
        ctx.closePath();
        ctx.fill();
      }
      for (let i = 0; i < 6; i++) {
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        const x = rand() * SIZE;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + (rand() - 0.5) * 10, SIZE);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(SIZE * 0.62, 0, 5, SIZE);
    } else if (material === 'stone') {
      // Aggregate.
      for (let i = 0; i < 120; i++) {
        ctx.globalAlpha = 0.16 + rand() * 0.3;
        ctx.fillStyle = rand() > 0.5 ? m.light : m.dark;
        const s = 2 + rand() * 6;
        ctx.beginPath();
        ctx.ellipse(rand() * SIZE, rand() * SIZE, s, s * (0.6 + rand() * 0.5), rand() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // Mortar cracks.
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = m.edge;
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(rand() * SIZE, 0);
        ctx.lineTo(rand() * SIZE, SIZE * (0.4 + rand() * 0.3));
        ctx.lineTo(rand() * SIZE, SIZE);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = m.light;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, SIZE * 0.4);
      ctx.lineTo(SIZE * 0.5, SIZE * 0.55);
      ctx.lineTo(SIZE, SIZE * 0.45);
      ctx.stroke();
    } else if (material === 'metal') {
      // Brushed bands.
      for (let i = 0; i < 18; i++) {
        ctx.globalAlpha = 0.08 + rand() * 0.1;
        ctx.strokeStyle = i % 2 ? m.light : m.dark;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, (i / 18) * SIZE);
        ctx.lineTo(SIZE, (i / 18) * SIZE);
        ctx.stroke();
      }
      // Plate seam + rivets.
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = m.edge;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, SIZE * 0.5);
      ctx.lineTo(SIZE, SIZE * 0.5);
      ctx.stroke();
      for (const [x, y] of [
        [24, 24],
        [SIZE - 24, 24],
        [24, SIZE - 24],
        [SIZE - 24, SIZE - 24],
        [SIZE * 0.5, 24],
        [SIZE * 0.5, SIZE - 24],
      ]) {
        const rivet = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 7);
        rivet.addColorStop(0, '#FFFFFF');
        rivet.addColorStop(0.5, m.light);
        rivet.addColorStop(1, m.dark);
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = rivet;
        ctx.beginPath();
        ctx.arc(x, y, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = m.edge;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    } else if (material === 'crystal') {
      // Faceted shards catching the light.
      for (let i = 0; i < 9; i++) {
        const x = rand() * SIZE;
        const y = rand() * SIZE;
        const w = 26 + rand() * 34;
        const h = 30 + rand() * 40;
        const facet = ctx.createLinearGradient(x, y, x + w, y + h);
        facet.addColorStop(0, m.light);
        facet.addColorStop(0.55, rand() > 0.5 ? m.fill : m.dark);
        facet.addColorStop(1, 'rgba(255,255,255,0.35)');
        ctx.globalAlpha = 0.28 + rand() * 0.24;
        ctx.fillStyle = facet;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y + rand() * 12);
        ctx.lineTo(x + w * 0.55, y + h);
        ctx.lineTo(x + rand() * 10, y + h * 0.6);
        ctx.closePath();
        ctx.fill();
      }
      // Highlight streaks.
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const x = rand() * SIZE;
        ctx.beginPath();
        ctx.moveTo(x, rand() * SIZE * 0.3);
        ctx.lineTo(x + 18, rand() * SIZE * 0.3 + SIZE * 0.45);
        ctx.stroke();
      }
    } else {
      // Terrain: sparse grit and grass flecks.
      for (let i = 0; i < 90; i++) {
        ctx.globalAlpha = 0.2 + rand() * 0.3;
        ctx.fillStyle = rand() > 0.55 ? m.light : m.dark;
        ctx.fillRect(rand() * SIZE, rand() * SIZE, 2.5 + rand() * 3, 4 + rand() * 6);
      }
      for (let i = 0; i < 22; i++) {
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = m.light;
        ctx.lineWidth = 1.6;
        const x = rand() * SIZE;
        const y = rand() * SIZE;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rand() - 0.5) * 12, y - 6 - rand() * 8);
        ctx.stroke();
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
