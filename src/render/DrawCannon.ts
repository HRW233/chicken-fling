import type { ChickenDef } from '../data/chickens';
import type { Cannon } from '../game/Cannon';

export function drawCannon(
  ctx: CanvasRenderingContext2D,
  cannon: Cannon,
  loaded: ChickenDef | null,
  time: number,
  highContrast: boolean,
): void {
  const p = cannon.pivot;
  const recoil = cannon.recoilOffset();
  const x = p.x + recoil.x;
  const y = p.y + recoil.y;
  const lw = highContrast ? 5 : 3;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3A2413';
  ctx.lineWidth = lw;

  // Rear wheel
  wheel(ctx, x - 38, y + 42, 25, time, recoil.x);
  // Carriage body
  ctx.fillStyle = '#8B5E34';
  ctx.beginPath();
  ctx.moveTo(x - 58, y + 34);
  ctx.lineTo(x + 44, y + 34);
  ctx.lineTo(x + 32, y + 8);
  ctx.lineTo(x - 44, y + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#B07C46';
  ctx.beginPath();
  ctx.moveTo(x - 50, y + 30);
  ctx.lineTo(x + 36, y + 30);
  ctx.lineTo(x + 28, y + 14);
  ctx.lineTo(x - 38, y + 11);
  ctx.closePath();
  ctx.fill();

  // axle + front wheel
  ctx.fillStyle = '#5C3A1C';
  ctx.fillRect(x - 12, y + 34, 40, 8);
  wheel(ctx, x + 24, y + 46, 27, time, recoil.x);

  // Barrel
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-cannon.angle);
  const grad = ctx.createLinearGradient(0, -16, 0, 16);
  grad.addColorStop(0, '#C08A52');
  grad.addColorStop(0.45, '#96632F');
  grad.addColorStop(1, '#6E441F');
  ctx.fillStyle = grad;
  roundRect(ctx, -34, -16, 100, 32, 12);
  ctx.fill();
  ctx.stroke();
  // bands
  ctx.fillStyle = '#5E6875';
  ctx.fillRect(-18, -16, 10, 32);
  ctx.fillRect(28, -16, 9, 32);
  ctx.strokeStyle = '#2F3742';
  ctx.lineWidth = 2;
  ctx.strokeRect(-18, -16, 10, 32);
  ctx.strokeRect(28, -16, 9, 32);
  // muzzle lip
  ctx.fillStyle = '#4A525C';
  roundRect(ctx, 58, -19, 12, 38, 5);
  ctx.fill();
  ctx.strokeStyle = '#2F3742';
  ctx.stroke();
  // breech cap
  ctx.fillStyle = '#7A4E25';
  ctx.beginPath();
  ctx.arc(-28, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Loaded glow
  if (loaded) {
    ctx.globalAlpha = 0.55 + Math.sin(time * 5) * 0.12;
    const glow = ctx.createRadialGradient(64, 0, 2, 64, 0, 26);
    glow.addColorStop(0, 'rgba(255,206,120,0.9)');
    glow.addColorStop(1, 'rgba(255,206,120,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(64, 0, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // Muzzle flash
  if (cannon.flashTimer > 0) {
    const t = cannon.flashTimer / 0.09;
    const mx = cannon.muzzleX;
    const my = cannon.muzzleY;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(-cannon.angle);
    ctx.globalAlpha = Math.min(1, t);
    ctx.fillStyle = '#F97316';
    star(ctx, 42 * (0.7 + t * 0.5), 7);
    ctx.fill();
    ctx.fillStyle = '#FFF8DC';
    star(ctx, 22 * (0.7 + t * 0.4), 6);
    ctx.fill();
    ctx.restore();
  }

  wheelSpokes(ctx, x - 38, y + 42, 25, time * 0.2, 5);
  wheelSpokes(ctx, x + 24, y + 46, 27, time * 0.2, 5);

  // Powder gauge
  drawGauge(ctx, p.x - 98, p.y - 78, cannon.charge, cannon.charging);
  ctx.restore();

  if (cannon.loadT < 1 && loaded) drawLoadingChicken(ctx, cannon, loaded);
}

function wheel(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, time: number, recoil: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#6B4A2B';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3A2413';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#B07C46';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7A4E25';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + recoil * 0.03 + Math.sin(time) * 0.02;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66);
  }
  ctx.stroke();
  ctx.fillStyle = '#4A2E16';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function wheelSpokes(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, time: number, count: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = 'rgba(58,36,19,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + time * 0.4;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55);
  }
  ctx.stroke();
  ctx.restore();
}

function drawGauge(ctx: CanvasRenderingContext2D, x: number, y: number, charge: number, charging: boolean): void {
  const h = 96;
  const w = 18;
  ctx.save();
  ctx.fillStyle = '#3A2A16';
  roundRect(ctx, x - 4, y - 6, w + 8, h + 12, 6);
  ctx.fill();
  ctx.strokeStyle = '#C9A24A';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#1B1008';
  ctx.fillRect(x, y, w, h);
  // red zone
  ctx.fillStyle = 'rgba(228,87,46,0.5)';
  ctx.fillRect(x, y, w, h * 0.05);
  // fill
  const fill = Math.max(0, Math.min(1, charge));
  const grad = ctx.createLinearGradient(0, y + h, 0, y);
  grad.addColorStop(0, '#7BC950');
  grad.addColorStop(0.7, '#FFD166');
  grad.addColorStop(1, '#F97316');
  ctx.fillStyle = grad;
  ctx.fillRect(x + 2, y + h - fill * (h - 4) - 2, w - 4, fill * (h - 4));
  // gold sweet spot tick
  ctx.fillStyle = '#FFE9A8';
  ctx.fillRect(x - 2, y + h * 0.1, w + 4, 3);
  // brass cap
  ctx.fillStyle = '#C9A24A';
  roundRect(ctx, x - 5, y - 12, w + 10, 8, 3);
  ctx.fill();
  if (charging) {
    ctx.globalAlpha = 0.4 + Math.sin(performance.now() * 0.02) * 0.2;
    ctx.fillStyle = '#FFCF6B';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  }
  ctx.restore();
}

function drawLoadingChicken(ctx: CanvasRenderingContext2D, cannon: Cannon, def: ChickenDef): void {
  const t = easeInOut(cannon.loadT);
  const startX = cannon.pivot.x - 86;
  const startY = cannon.pivot.y + 44;
  const endX = cannon.muzzleX;
  const endY = cannon.muzzleY;
  const x = startX + (endX - startX) * t;
  const y = startY + (endY - startY) * t - Math.sin(t * Math.PI) * 46;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * Math.PI) * 0.4);
  ctx.fillStyle = def.body;
  ctx.strokeStyle = '#3A2413';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(6, -9, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = def.comb;
  ctx.beginPath();
  ctx.arc(3, -15, 3, 0, Math.PI * 2);
  ctx.arc(8, -15, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#F4A629';
  ctx.beginPath();
  ctx.moveTo(12, -10);
  ctx.lineTo(17, -8);
  ctx.lineTo(12, -6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function star(ctx: CanvasRenderingContext2D, radius: number, points: number): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.42;
    const a = (i / (points * 2)) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
