import type { Body } from 'matter-js';
import { materialDef } from '../data/materials';
import { worldDef } from '../data/worlds';
import type { Material } from '../data/types';
import type { Camera } from '../game/Camera';
import type { Cannon } from '../game/Cannon';
import type { LevelRuntime } from '../game/LevelRuntime';
import { sampleArc, simulateArc } from '../game/Trajectory';
import type { Settings } from '../save/Save';
import { Backgrounds } from './Backgrounds';
import { drawCannon } from './DrawCannon';
import { drawChicken } from './DrawChicken';
import { drawWeasel, drawWeaselKo } from './DrawWeasel';
import { Particles } from './Particles';
import { Textures } from './Textures';

const DESIGN_W = 1280;
const DESIGN_H = 720;

export class Renderer {
  readonly textures = new Textures();
  readonly backgrounds = new Backgrounds();
  readonly particles: Particles;
  private readonly ctx: CanvasRenderingContext2D;
  dpr = 1;
  scale = 1;
  offsetX = 0;
  offsetY = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    particles?: Particles,
  ) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D is unavailable');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    this.ctx = ctx;
    this.particles = particles ?? new Particles();
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const cssW = Math.max(1, rect.width || window.innerWidth);
    const cssH = Math.max(1, rect.height || window.innerHeight);
    // Render at the screen's full pixel density (up to 3x) so sprites and
    // material textures stay crisp on phones and high-DPI laptops.
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    this.dpr = dpr;
    this.canvas.width = Math.floor(cssW * dpr);
    this.canvas.height = Math.floor(cssH * dpr);
    this.scale = Math.min(cssW / DESIGN_W, cssH / DESIGN_H);
    this.offsetX = (cssW - DESIGN_W * this.scale) / 2;
    this.offsetY = (cssH - DESIGN_H * this.scale) / 2;
    this.textures.setDpr(dpr);
  }

  toDesign(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this.offsetX) / this.scale,
      y: (clientY - rect.top - this.offsetY) / this.scale,
    };
  }

  begin(): CanvasRenderingContext2D {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#160D06';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, this.dpr * this.offsetX, this.dpr * this.offsetY);
    ctx.clearRect(0, 0, DESIGN_W, DESIGN_H);
    return ctx;
  }

  drawPlay(
    runtime: LevelRuntime,
    cannon: Cannon,
    camera: Camera,
    settings: Settings,
    time: number,
    showHint: boolean,
  ): void {
    const ctx = this.ctx;
    const world = worldDef(runtime.level.world);
    this.backgrounds.draw(ctx, world, camera.x, settings.reducedMotion);

    ctx.save();
    ctx.translate(camera.offset.x, camera.offset.y);
    this.drawMechanismsBack(runtime, time);
    for (const ent of runtime.blocks) {
      if (ent.destroyed || ent.def.isGround) continue;
      this.drawBlock(ent, settings.highContrast);
    }
    drawCannon(ctx, cannon, runtime.loadedDef, time, settings.highContrast);
    this.drawAimPreview(runtime, cannon, settings);
    for (const w of runtime.weasels) {
      if (w.defeated) continue;
      drawWeasel(ctx, w, time, settings.highContrast);
    }
    for (const c of runtime.chickens) {
      if (c.removed) continue;
      drawChicken(ctx, c, time, settings.highContrast);
    }
    for (const egg of runtime.eggs) {
      if (egg.dead) continue;
      this.drawEgg(egg.body.position.x, egg.body.position.y, egg.radius, egg.mega);
    }
    if (runtime.goldenEgg && !runtime.goldenEgg.collected) {
      this.drawGoldenEgg(runtime.goldenEgg.x, runtime.goldenEgg.y, time);
    }
    this.particles.draw(ctx);
    for (const ko of runtime.kos) drawWeaselKo(ctx, ko);
    ctx.restore();

    if (showHint) {
      const active = runtime.activeChicken;
      if (active && !active.abilityUsed && active.bodies[0] && !active.inert) {
        const p = active.bodies[0].position;
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.font = '600 15px ui-rounded, "Nunito", "Trebuchet MS", system-ui, sans-serif';
        ctx.fillStyle = '#FFF4C2';
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(30,18,8,0.75)';
        const label = runtime.level.world === 1 ? 'TAP / SPACE: ability' : 'TAP / SPACE';
        ctx.strokeText(label, p.x, p.y - 44);
        ctx.fillText(label, p.x, p.y - 44);
        ctx.restore();
      }
    }
  }

  private drawBlock(ent: LevelRuntime['blocks'][number], highContrast: boolean): void {
    const ctx = this.ctx;
    const mat = materialDef(ent.def.material as Material);
    const verts = ent.body.vertices;
    if (verts.length < 3) return;
    const variant = ent.seed % 3;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
    ctx.closePath();
    ctx.fillStyle = this.textures.patternFor(ctx, ent.def.material, variant);
    ctx.fill();
    ctx.lineWidth = highContrast ? 5 : 3;
    ctx.strokeStyle = mat.edge;
    ctx.stroke();

    // Top light edge for chunky depth.
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = mat.light;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(verts[0].x + 3, verts[0].y + 3);
    for (let i = 1; i < Math.min(verts.length, 3); i++) ctx.lineTo(verts[i].x - 3, verts[i].y + 3);
    ctx.stroke();

    // Cracks by damage state.
    const ratio = ent.maxHp > 0 ? Math.max(0, ent.hp / ent.maxHp) : 1;
    if (ratio < 0.75) {
      const cx = ent.body.position.x;
      const cy = ent.body.position.y;
      const span = Math.min(48, (ent.def.w ?? 30) * 0.42);
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = mat.edge;
      ctx.lineWidth = 2;
      const cracks = ratio < 0.35 ? 3 : 2;
      for (let i = 0; i < cracks; i++) {
        const a = (ent.seed % 7) * 0.9 + i * 2.1;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * span * 0.4, cy + Math.sin(a) * span * 0.4);
        ctx.lineTo(cx + Math.cos(a + 0.6) * span, cy + Math.sin(a + 0.6) * span);
        ctx.stroke();
      }
    }
    if (ent.burning > 0) {
      ctx.globalAlpha = 0.5 + Math.sin(performance.now() * 0.015) * 0.15;
      ctx.fillStyle = '#FF8A3D';
      ctx.fill();
    }
    if (ent.flash > 0) {
      ctx.globalAlpha = Math.min(0.8, ent.flash * 6);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }
    ctx.restore();
  }

  private drawAimPreview(runtime: LevelRuntime, cannon: Cannon, settings: Settings): void {
    if (settings.aimAssist === 'off') return;
    const def = runtime.loadedDef;
    if (!def || runtime.isFlying) return;
    const ctx = this.ctx;
    const power = cannon.isCharging ? Math.max(0.06, cannon.charge) : 0.7;
    const start = { x: cannon.muzzleX, y: cannon.muzzleY };
    const arc = simulateArc(runtime.level, start.x, start.y, cannon.angle, power, def, 0.9);
    const count = settings.aimAssist === 'short' ? 10 : 28;
    let dots = sampleArc(arc, count);
    // Stop the preview on the first live block, so the landing marker is honest.
    const live = runtime.blocks.filter((b) => !b.destroyed && !b.def.isGround);
    let hitPoint: { x: number; y: number } | null = null;
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      for (const block of live) {
        const bounds = block.body.bounds;
        if (d.x > bounds.min.x - 4 && d.x < bounds.max.x + 4 && d.y > bounds.min.y - 4 && d.y < bounds.max.y + 4) {
          hitPoint = { x: d.x, y: d.y };
          dots = dots.slice(0, Math.max(1, i + 1));
          break;
        }
      }
      if (hitPoint) break;
    }
    ctx.save();
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      const t = i / Math.max(1, dots.length - 1);
      ctx.globalAlpha = i < 6 ? 0.9 : 0.75 * (1 - t * 0.65);
      ctx.fillStyle = '#FFF4C2';
      ctx.beginPath();
      ctx.arc(d.x, d.y, 3.6 - t * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    if (settings.aimAssist === 'full' && dots.length > 0) {
      const last = hitPoint ?? dots[dots.length - 1];
      const onGround = last.y > runtime.level.groundY - 26;
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = onGround ? '#FFD166' : '#FFB4A0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(last.x, last.y, 16, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawMechanismsBack(runtime: LevelRuntime, time: number): void {
    const ctx = this.ctx;
    const mechs = runtime.level.mechanisms;
    for (let i = 0; i < mechs.length; i++) {
      const m = mechs[i];
      if (m.kind === 'lava') {
        ctx.save();
        ctx.fillStyle = 'rgba(249,115,22,0.85)';
        ctx.fillRect(m.x - m.w / 2, m.y - m.h / 2, m.w, m.h);
        ctx.fillStyle = 'rgba(255,220,120,0.8)';
        for (let b = 0; b < 4; b++) {
          const bx = m.x - m.w / 2 + 20 + ((b * 47 + time * 20) % (m.w - 30));
          const by = m.y - 8 + Math.sin(time * 2 + b) * 6;
          ctx.beginPath();
          ctx.arc(bx, by, 4 + Math.sin(time * 3 + b) * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (m.kind === 'conveyor') {
        ctx.save();
        ctx.fillStyle = '#3E4652';
        ctx.fillRect(m.x - m.w / 2, m.y - 6, m.w, 14);
        ctx.strokeStyle = '#8B97A4';
        ctx.lineWidth = 2;
        const dir = Math.sign(m.speed) || 1;
        for (let c = 0; c < 6; c++) {
          const cx = m.x - m.w / 2 + ((c * 34 + ((time * m.speed * dir) % 34) + m.w) % m.w);
          ctx.beginPath();
          ctx.moveTo(cx - 6, m.y - 3);
          ctx.lineTo(cx + 4, m.y + 1);
          ctx.lineTo(cx - 6, m.y + 5);
          ctx.stroke();
        }
        ctx.restore();
      } else if (m.kind === 'geyser') {
        ctx.save();
        ctx.fillStyle = '#3B2A20';
        ctx.beginPath();
        ctx.ellipse(m.x, m.y - 6, m.radius * 0.55, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#F97316';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(m.x, m.y - 6, m.radius * 0.4, 7, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (m.kind === 'magnet') {
        ctx.save();
        ctx.globalAlpha = 0.35 + Math.sin(time * 3) * 0.1;
        ctx.strokeStyle = '#A78BFA';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#9CA6B4';
        ctx.strokeStyle = '#2F3742';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 22, Math.PI, 0);
        ctx.lineTo(m.x + 22, m.y + 16);
        ctx.lineTo(m.x + 10, m.y + 16);
        ctx.lineTo(m.x + 10, m.y + 1);
        ctx.arc(m.x, m.y + 1, 10, 0, Math.PI, true);
        ctx.lineTo(m.x - 10, m.y + 16);
        ctx.lineTo(m.x - 22, m.y + 16);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else if (m.kind === 'windZone') {
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        for (let l = 0; l < 4; l++) {
          const y = m.y - m.h / 2 + ((l * 38 + time * 60) % m.h);
          ctx.beginPath();
          ctx.moveTo(m.x - m.w / 2, y);
          ctx.bezierCurveTo(m.x - m.w * 0.15, y - 8, m.x + m.w * 0.15, y + 8, m.x + m.w / 2, y);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // Pistons
    for (const body of runtime.pistonBodies) {
      const verts = body.vertices;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(verts[0].x, verts[0].y);
      for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
      ctx.closePath();
      ctx.fillStyle = '#9CA6B4';
      ctx.fill();
      ctx.strokeStyle = '#2F3742';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    // Balloons + strings
    for (let i = 0; i < mechs.length; i++) {
      const m = mechs[i];
      if (m.kind !== 'balloon') continue;
      const target = runtime.blocks.find((b) => b.def.id === m.blockId);
      if (!target) continue;
      const popped = runtime.isBalloonPopped(i);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y + 20);
      ctx.lineTo(target.body.position.x, target.body.position.y - 4);
      ctx.stroke();
      if (!popped) {
        ctx.fillStyle = '#F0ABFC';
        ctx.strokeStyle = '#A21CAF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(m.x, m.y, 20, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.ellipse(m.x - 6, m.y - 8, 5, 7, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(m.x, m.y + 24);
        ctx.lineTo(m.x - 4, m.y + 30);
        ctx.lineTo(m.x + 4, m.y + 30);
        ctx.closePath();
        ctx.fillStyle = '#A21CAF';
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawEgg(x: number, y: number, radius: number, mega: boolean): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = mega ? '#FFF2C4' : '#FFFDF6';
    ctx.strokeStyle = '#B7A98C';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * 1.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (mega) {
      ctx.strokeStyle = '#F97316';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.7, 0.4, 2.2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawGoldenEgg(x: number, y: number, time: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y + Math.sin(time * 2) * 3);
    ctx.globalAlpha = 0.4 + Math.sin(time * 3) * 0.12;
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 34);
    glow.addColorStop(0, 'rgba(255,230,140,0.9)');
    glow.addColorStop(1, 'rgba(255,230,140,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#F7C948';
    ctx.strokeStyle = '#8A6A16';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.ellipse(-4, -5, 3.5, 5, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Exposed for the verification harness. */
  static bodiesOf(runtime: LevelRuntime): Body[] {
    return runtime.blocks.map((b) => b.body);
  }
}
