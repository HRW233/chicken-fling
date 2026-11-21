import type { BurstKind, BurstOpts } from '../game/fx';

interface Particle {
  active: boolean;
  kind: BurstKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  rotation: number;
  spin: number;
  gravity: number;
  drag: number;
}

const MAX_PARTICLES = 220;
const DEFAULT_COLORS: Record<BurstKind, string> = {
  dust: '#E8DCC8',
  debris: '#C98C53',
  feather: '#FFF6E3',
  smoke: '#E4DACB',
  spark: '#FFC24B',
  flame: '#FF9B3D',
  hitmark: '#FFF4C2',
  ice: '#DFF3FF',
  star: '#FFE9A8',
  confetti: '#F0ABFC',
};

/** Fixed-size particle pool; the oldest particle is recycled when full. */
export class Particles {
  private pool: Particle[] = [];
  private cursor = 0;
  private seeded = Math.random() * 1000;

  constructor() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool.push({
        active: false,
        kind: 'dust',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 1,
        color: '#fff',
        rotation: 0,
        spin: 0,
        gravity: 0,
        drag: 0,
      });
    }
  }

  get liveCount(): number {
    let n = 0;
    for (const p of this.pool) if (p.active) n++;
    return n;
  }

  clear(): void {
    for (const p of this.pool) p.active = false;
    this.cursor = 0;
  }

  burst(kind: BurstKind, x: number, y: number, opts: BurstOpts = {}): void {
    const count = Math.min(18, opts.count ?? defaultCount(kind));
    const power = opts.power ?? 0.6;
    const color = opts.color ?? DEFAULT_COLORS[kind];
    for (let i = 0; i < count; i++) {
      this.spawn(kind, x, y, color, power, opts.size ?? 1);
    }
  }

  private spawn(kind: BurstKind, x: number, y: number, color: string, power: number, scale: number): void {
    const p = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % MAX_PARTICLES;
    const r = rand(++this.seeded);
    const r2 = rand(this.seeded + 7.13);
    const angle = r * Math.PI * 2;
    const speed = (30 + r2 * 190) * (0.5 + power);
    p.active = true;
    p.kind = kind;
    p.x = x + (r - 0.5) * 12;
    p.y = y + (r2 - 0.5) * 12;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed - (kind === 'smoke' || kind === 'flame' || kind === 'feather' ? 40 : 0);
    p.size = particleSize(kind) * (0.7 + r2 * 0.7) * scale;
    p.color = color;
    p.rotation = r * Math.PI * 2;
    p.spin = (r2 - 0.5) * 10;
    p.gravity = kind === 'smoke' || kind === 'feather' ? -60 : kind === 'spark' ? 900 : 1350;
    p.drag = kind === 'smoke' ? 1.6 : kind === 'spark' ? 0.6 : 0.9;
    p.maxLife = lifetime(kind) * (0.7 + r * 0.6);
    p.life = p.maxLife;
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy += p.gravity * dt;
      p.vx *= 1 - p.drag * dt;
      p.vy *= 1 - p.drag * dt * 0.5;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.spin * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      const t = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = t;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      switch (p.kind) {
        case 'dust':
        case 'smoke': {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * (1.6 - t * 0.7), 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'debris':
        case 'confetti': {
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
          break;
        }
        case 'feather': {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.55, 0.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'spark': {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-p.vx * 0.02, -p.vy * 0.02);
          ctx.stroke();
          break;
        }
        case 'flame': {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 1.4);
          ctx.quadraticCurveTo(p.size, 0, 0, p.size);
          ctx.quadraticCurveTo(-p.size, 0, 0, -p.size * 1.4);
          ctx.fill();
          break;
        }
        case 'ice': {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.6, p.size);
          ctx.lineTo(-p.size * 0.6, p.size);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'hitmark': {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3;
          const s = p.size * 6;
          ctx.beginPath();
          ctx.moveTo(-s, 0);
          ctx.lineTo(s, 0);
          ctx.moveTo(0, -s);
          ctx.lineTo(0, s);
          ctx.stroke();
          break;
        }
        case 'star': {
          ctx.fillStyle = p.color;
          starPath(ctx, p.size * 1.6, 5);
          ctx.fill();
          break;
        }
        default:
          break;
      }
      ctx.restore();
    }
  }
}

function starPath(ctx: CanvasRenderingContext2D, radius: number, points: number): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.42;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function defaultCount(kind: BurstKind): number {
  switch (kind) {
    case 'smoke':
      return 5;
    case 'debris':
      return 6;
    case 'feather':
      return 4;
    case 'star':
      return 6;
    default:
      return 4;
  }
}

function particleSize(kind: BurstKind): number {
  switch (kind) {
    case 'smoke':
      return 13;
    case 'dust':
      return 7;
    case 'debris':
      return 7;
    case 'feather':
      return 6;
    case 'star':
      return 7;
    case 'hitmark':
      return 4;
    default:
      return 5;
  }
}

function lifetime(kind: BurstKind): number {
  switch (kind) {
    case 'smoke':
      return 1.4;
    case 'flame':
      return 0.55;
    case 'hitmark':
      return 0.22;
    case 'spark':
      return 0.5;
    default:
      return 0.95;
  }
}

function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
