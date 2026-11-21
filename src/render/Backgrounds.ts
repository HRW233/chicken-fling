import type { WorldDef } from '../data/worlds';

const DESIGN_W = 1280;
const DESIGN_H = 720;

interface Ambient {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
}

/** Three-layer parallax artwork, all drawn in code. */
export class Backgrounds {
  private ambient: Ambient[] = [];
  private lastWorld = -1;
  private time = 0;

  private seed(world: WorldDef): void {
    this.ambient = [];
    const count = world.ambient === 'snow' ? 70 : world.ambient === 'ember' ? 40 : 34;
    for (let i = 0; i < count; i++) {
      this.ambient.push({
        x: Math.random() * DESIGN_W,
        y: Math.random() * DESIGN_H,
        vx: world.ambient === 'snow' ? -30 - Math.random() * 40 : (Math.random() - 0.5) * 30,
        vy:
          world.ambient === 'ember'
            ? -25 - Math.random() * 45
            : world.ambient === 'snow'
              ? 40 + Math.random() * 50
              : (Math.random() - 0.5) * 16,
        size: 1.5 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2,
      });
    }
    this.lastWorld = world.id;
  }

  update(dt: number, world: WorldDef): void {
    if (world.id !== this.lastWorld) this.seed(world);
    this.time += dt;
    for (const p of this.ambient) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.phase += dt * 2;
      if (p.x < -10) p.x = DESIGN_W + 10;
      if (p.x > DESIGN_W + 10) p.x = -10;
      if (p.y < -10) p.y = DESIGN_H + 10;
      if (p.y > DESIGN_H + 10) p.y = -10;
    }
  }

  draw(ctx: CanvasRenderingContext2D, world: WorldDef, camX: number, reducedMotion: boolean): void {
    if (this.lastWorld !== world.id) this.seed(world);
    const t = reducedMotion ? 0 : this.time;

    const sky = ctx.createLinearGradient(0, 0, 0, DESIGN_H * 0.85);
    sky.addColorStop(0, world.skyTop);
    sky.addColorStop(1, world.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);

    // Sun / glow
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = world.accent;
    ctx.beginPath();
    ctx.arc(1010, world.id === 4 ? 150 : 128, world.id === 4 ? 54 : 68, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.arc(1010, world.id === 4 ? 150 : 128, world.id === 4 ? 110 : 130, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (world.id === 1) this.barnyard(ctx, camX, t);
    else if (world.id === 2) this.ranch(ctx, camX, t);
    else if (world.id === 3) this.frost(ctx, camX, t);
    else if (world.id === 4) this.volcano(ctx, camX, t);
    else this.sky(ctx, camX, t);

    // Ambient weather
    for (const p of this.ambient) {
      const px = p.x - camX * 0.15;
      ctx.save();
      ctx.globalAlpha = 0.55;
      if (world.ambient === 'pollen') {
        ctx.fillStyle = '#FFF3C4';
        ctx.beginPath();
        ctx.arc(px, p.y, p.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (world.ambient === 'snow') {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(px, p.y, p.size * 0.9, 0, Math.PI * 2);
        ctx.fill();
      } else if (world.ambient === 'ember') {
        ctx.fillStyle = p.phase % 2 > 1 ? '#FFC46B' : '#FF7A38';
        ctx.beginPath();
        ctx.arc(px, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (world.ambient === 'spark') {
        ctx.fillStyle = '#FFE0A3';
        ctx.fillRect(px, p.y, p.size, p.size * 0.6);
      } else {
        ctx.fillStyle = '#F5D7FF';
        ctx.beginPath();
        ctx.ellipse(px, p.y, p.size * 1.4, p.size * 0.7, p.phase, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    this.foreground(ctx, world, camX);
  }

  private barnyard(ctx: CanvasRenderingContext2D, camX: number, t: number): void {
    // Far hills
    ctx.save();
    ctx.translate(-camX * 0.15, 0);
    ctx.fillStyle = '#BCE8F7';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(180 + i * 360, 520, 260, 150, 0, Math.PI, 0);
      ctx.fill();
    }
    // clouds
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 5; i++) {
      const cx = 120 + i * 290 + Math.sin(t * 0.08 + i) * 18;
      const cy = 120 + (i % 3) * 60;
      cloud(ctx, cx, cy, 46 + (i % 2) * 22);
    }
    ctx.restore();

    // Mid hills
    ctx.save();
    ctx.translate(-camX * 0.4, 0);
    ctx.fillStyle = '#8FD66A';
    ctx.beginPath();
    ctx.moveTo(-100, 620);
    for (let x = -100; x <= 1500; x += 100) {
      ctx.quadraticCurveTo(x + 50, 500 + Math.sin(x * 0.01) * 46, x + 100, 600);
    }
    ctx.lineTo(1500, 720);
    ctx.lineTo(-100, 720);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#76C153';
    ctx.fillRect(-100, 590, 1600, 130);
    ctx.restore();

    // Near: fence and tree
    ctx.save();
    ctx.translate(-camX * 0.75, 0);
    ctx.fillStyle = '#6B4A2B';
    for (let i = 0; i < 14; i++) {
      const x = 40 + i * 100;
      ctx.fillRect(x, 574, 8, 86);
    }
    ctx.fillRect(30, 592, 1400, 8);
    ctx.fillRect(30, 620, 1400, 8);
    ctx.fillStyle = '#5E8C3A';
    ctx.beginPath();
    ctx.arc(1210, 540, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4A6F2D';
    ctx.fillRect(1203, 560, 16, 100);
    ctx.restore();
  }

  private ranch(ctx: CanvasRenderingContext2D, camX: number, t: number): void {
    ctx.save();
    ctx.translate(-camX * 0.2, 0);
    ctx.fillStyle = '#B08D6A';
    for (let i = 0; i < 6; i++) {
      const x = 40 + i * 240;
      const h = 140 + (i % 3) * 50;
      ctx.fillRect(x, 560 - h, 90, h);
      ctx.fillRect(x + 54, 400 - (i % 4) * 30, 22, 170);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#E6D2B8';
      cloud(ctx, x + 64, 360 - (i % 4) * 32, 26 + (i % 3) * 8);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#B08D6A';
    }
    ctx.restore();

    ctx.save();
    ctx.translate(-camX * 0.45, 0);
    ctx.fillStyle = '#8A7A63';
    ctx.fillRect(-100, 600, 1600, 120);
    ctx.fillStyle = '#6B7280';
    for (let i = 0; i < 9; i++) ctx.fillRect(20 + i * 160, 520, 14, 160);
    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(0, 528);
    ctx.lineTo(1500, 528);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(-camX * 0.75, 0);
    ctx.strokeStyle = '#9A5B32';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(60, 596);
    ctx.lineTo(1400, 596);
    ctx.stroke();
    for (let i = 0; i < 20; i++) ctx.fillRect(60 + i * 70, 570, 10, 70);
    ctx.restore();
    void t;
  }

  private frost(ctx: CanvasRenderingContext2D, camX: number, t: number): void {
    ctx.save();
    ctx.translate(-camX * 0.15, 0);
    ctx.fillStyle = '#2E4C8F';
    ctx.beginPath();
    ctx.moveTo(-100, 620);
    ctx.lineTo(120, 300);
    ctx.lineTo(280, 470);
    ctx.lineTo(430, 260);
    ctx.lineTo(610, 500);
    ctx.lineTo(800, 320);
    ctx.lineTo(1030, 520);
    ctx.lineTo(1300, 330);
    ctx.lineTo(1500, 620);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#DCEBF7';
    ctx.beginPath();
    ctx.moveTo(120, 300);
    ctx.lineTo(190, 400);
    ctx.lineTo(60, 410);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(430, 260);
    ctx.lineTo(510, 380);
    ctx.lineTo(350, 390);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(800, 320);
    ctx.lineTo(860, 420);
    ctx.lineTo(730, 425);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(-camX * 0.4, 0);
    ctx.fillStyle = '#93C5FD';
    ctx.beginPath();
    ctx.moveTo(-100, 640);
    for (let x = -100; x < 1500; x += 120) {
      ctx.quadraticCurveTo(x + 60, 540 + Math.sin(x * 0.02) * 24, x + 120, 620);
    }
    ctx.lineTo(1500, 720);
    ctx.lineTo(-100, 720);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(-camX * 0.75, 0);
    for (let i = 0; i < 9; i++) {
      const x = 70 + i * 160;
      ctx.fillStyle = '#3E5C4A';
      ctx.fillRect(x, 590, 10, 70);
      ctx.fillStyle = '#5B7C66';
      for (let j = 0; j < 3; j++) {
        ctx.beginPath();
        ctx.moveTo(x + 5, 520 + j * 26);
        ctx.lineTo(x + 40 - j * 6, 600);
        ctx.lineTo(x - 30 + j * 6, 600);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
    // Drifting snow haze
    ctx.save();
    ctx.globalAlpha = 0.08 + Math.sin(t * 0.6) * 0.02;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);
    ctx.restore();
  }

  private volcano(ctx: CanvasRenderingContext2D, camX: number, t: number): void {
    ctx.save();
    ctx.translate(-camX * 0.15, 0);
    ctx.fillStyle = '#5C241B';
    ctx.beginPath();
    ctx.moveTo(-100, 640);
    ctx.lineTo(220, 260);
    ctx.lineTo(360, 420);
    ctx.lineTo(520, 300);
    ctx.lineTo(760, 640);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#F97316';
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(210, 300);
    ctx.lineTo(240, 360);
    ctx.lineTo(190, 356);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#FFB067';
    ctx.beginPath();
    ctx.ellipse(240, 250, 90 + Math.sin(t * 0.8) * 12, 60, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(-camX * 0.4, 0);
    ctx.fillStyle = '#44403C';
    ctx.beginPath();
    ctx.moveTo(-100, 680);
    ctx.lineTo(-100, 620);
    ctx.lineTo(300, 560);
    ctx.lineTo(700, 620);
    ctx.lineTo(1100, 570);
    ctx.lineTo(1500, 630);
    ctx.lineTo(1500, 720);
    ctx.closePath();
    ctx.fill();
    // lava river
    ctx.fillStyle = '#F97316';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(820, 720);
    ctx.quadraticCurveTo(880, 650, 990, 700);
    ctx.quadraticCurveTo(1080, 730, 1150, 720);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(-camX * 0.75, 0);
    ctx.fillStyle = '#2B1F1B';
    ctx.fillRect(-100, 640, 1600, 90);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = '#1E1411';
      ctx.beginPath();
      ctx.moveTo(80 + i * 190, 660);
      ctx.lineTo(110 + i * 190, 590);
      ctx.lineTo(140 + i * 190, 660);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private sky(ctx: CanvasRenderingContext2D, camX: number, t: number): void {
    ctx.save();
    ctx.translate(-camX * 0.15, 0);
    ctx.fillStyle = '#7DA8D8';
    for (let i = 0; i < 6; i++) {
      const x = 80 + i * 260;
      const y = 240 + (i % 3) * 110 + Math.sin(t * 0.25 + i) * 8;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.ellipse(x, y, 110, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.ellipse(x + 70, y + 96, 70, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    ctx.save();
    ctx.translate(-camX * 0.4, 0);
    for (let i = 0; i < 4; i++) {
      const x = 180 + i * 340;
      const y = 520 + (i % 2) * 60;
      ctx.fillStyle = '#A78BFA';
      ctx.beginPath();
      ctx.ellipse(x, y, 120, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8B6FE0';
      ctx.beginPath();
      ctx.moveTo(x - 70, y + 6);
      ctx.lineTo(x - 20, y + 90);
      ctx.lineTo(x + 40, y + 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#C4B5FD';
      for (let j = 0; j < 3; j++) {
        ctx.beginPath();
        ctx.moveTo(x - 40 + j * 42, y + 4);
        ctx.lineTo(x - 26 + j * 42, y - 50 - (j % 2) * 26);
        ctx.lineTo(x - 12 + j * 42, y + 4);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();

    ctx.save();
    ctx.translate(-camX * 0.75, 0);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 9; i++) cloud(ctx, i * 190 - 40, 600 + Math.sin(i) * 20, 34);
    ctx.restore();
  }

  private foreground(ctx: CanvasRenderingContext2D, world: WorldDef, camX: number): void {
    // Ground strip at the bottom of the play area.
    ctx.save();
    ctx.translate(-camX, 0);
    ctx.fillStyle = world.groundDark;
    ctx.fillRect(-100, 664, 1600, 90);
    ctx.fillStyle = world.ground;
    ctx.fillRect(-100, 660, 1600, 14);
    ctx.fillStyle = world.groundLight;
    ctx.fillRect(-100, 660, 1600, 4);
    ctx.restore();

    // Vignette
    const v = ctx.createRadialGradient(DESIGN_W / 2, DESIGN_H / 2, 320, DESIGN_W / 2, DESIGN_H / 2, 820);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(20,10,4,0.35)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);
  }
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.arc(x + r * 0.9, y + r * 0.18, r * 0.75, 0, Math.PI * 2);
  ctx.arc(x - r * 0.9, y + r * 0.2, r * 0.65, 0, Math.PI * 2);
  ctx.fill();
}
