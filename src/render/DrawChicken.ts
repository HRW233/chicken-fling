import type { Body } from 'matter-js';
import type { ChickenDef } from '../data/chickens';
import type { ChickenEnt } from '../game/Entities';

/** Draw every body of a chicken (a split chicken has three). */
export function drawChicken(ctx: CanvasRenderingContext2D, ent: ChickenEnt, time: number, highContrast: boolean): void {
  const alpha = ent.inert ? Math.max(0, Math.min(1, ent.fade / 1.2)) : 1;
  if (alpha <= 0.02) return;
  for (const body of ent.bodies) {
    drawChickenBody(ctx, body, ent.def, time, alpha, highContrast, ent.damageMult > 1);
  }
}

function drawChickenBody(
  ctx: CanvasRenderingContext2D,
  body: Body,
  def: ChickenDef,
  time: number,
  alpha: number,
  highContrast: boolean,
  powered: boolean,
): void {
  const r = Math.max(7, (body as unknown as { circleRadius?: number }).circleRadius ?? def.radius);
  const flying = Math.hypot(body.velocity.x, body.velocity.y) > 0.06;
  const bob = flying ? 0 : Math.sin(time * 3 + body.id) * 1.4;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(body.position.x, body.position.y + bob);
  ctx.rotate(body.angle);
  ctx.scale(r / 16, r / 16);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const outline = highContrast ? 5 : 3;
  ctx.lineWidth = outline;
  ctx.strokeStyle = '#3A2413';

  // Tail feathers
  ctx.fillStyle = def.bodyDark;
  ctx.beginPath();
  ctx.moveTo(-11, -4);
  ctx.lineTo(-25, -16);
  ctx.lineTo(-19, -2);
  ctx.lineTo(-26, 6);
  ctx.lineTo(-10, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (def.id === 'pepper') {
    ctx.fillStyle = 'rgba(255,170,90,0.8)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(-24 + Math.sin(time * 4 + i) * 4, -10 - i * 5, 4 + i, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Feet
  ctx.strokeStyle = '#C97B2E';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-4, 12);
  ctx.lineTo(-6, 19);
  ctx.lineTo(-12, 21);
  ctx.moveTo(4, 12);
  ctx.lineTo(6, 19);
  ctx.lineTo(12, 21);
  ctx.stroke();

  // Body
  ctx.fillStyle = def.body;
  ctx.strokeStyle = '#3A2413';
  ctx.lineWidth = outline;
  if (def.id === 'puff') {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const rr = 15 + (i % 2 === 0 ? 4 : 0);
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else {
    ctx.beginPath();
    ctx.ellipse(0, 3, 14, 13, 0, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();

  // Wing
  ctx.fillStyle = def.bodyDark;
  ctx.beginPath();
  ctx.ellipse(-2, 4, 7, 8, -0.3, 0, Math.PI * 2);
  ctx.fill();
  if (def.id === 'drumstick') {
    ctx.strokeStyle = '#8A5528';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-2, 4, 5, 0, Math.PI);
    ctx.stroke();
  }

  // Speckles
  if (def.id === 'speckle') {
    ctx.fillStyle = '#6C655B';
    for (const [x, y] of [
      [-6, -2],
      [4, 6],
      [-4, 9],
      [6, -4],
    ]) {
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Head
  const headX = 7;
  const headY = -11;
  ctx.fillStyle = def.body;
  ctx.strokeStyle = '#3A2413';
  ctx.lineWidth = outline;
  ctx.beginPath();
  ctx.arc(headX, headY, 8.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Comb
  ctx.fillStyle = def.comb;
  ctx.beginPath();
  ctx.arc(headX - 3.5, headY - 10, 3.8, 0, Math.PI * 2);
  ctx.arc(headX, headY - 12, 4.2, 0, Math.PI * 2);
  ctx.arc(headX + 4, headY - 10, 3.4, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = '#F4A629';
  ctx.beginPath();
  ctx.moveTo(headX + 7, headY + 1);
  ctx.lineTo(headX + 16, headY + 4);
  ctx.lineTo(headX + 7, headY + 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#8A5528';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Eyes: determined eyebrows + pupil
  ctx.fillStyle = '#FFFDF6';
  ctx.beginPath();
  ctx.arc(headX + 3.4, headY - 1.5, 2.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1B1008';
  ctx.beginPath();
  ctx.arc(headX + 4.4, headY - 1.4, 1.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1B1008';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(headX + 1.2, headY - 5.4);
  ctx.lineTo(headX + 6.2, headY - 4.1);
  ctx.stroke();

  // Per-chicken props
  if (def.id === 'speckle') {
    ctx.fillStyle = def.prop;
    ctx.fillRect(-12, 0, 8, 11);
    ctx.strokeStyle = '#4C3A22';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-12, 0, 8, 11);
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(6, -8);
    ctx.stroke();
  } else if (def.id === 'drumstick') {
    ctx.fillStyle = def.prop;
    ctx.beginPath();
    ctx.moveTo(-10, -8);
    ctx.lineTo(-19, 12);
    ctx.lineTo(-2, 9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1D4FA8';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = '#2F6FDD';
    ctx.fillRect(-1, -20, 15, 4);
  } else if (def.id === 'nugget') {
    ctx.fillStyle = def.prop;
    ctx.beginPath();
    ctx.arc(headX, headY - 4, 10, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4A4F57';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = '#6F7681';
    ctx.fillRect(headX - 11, headY - 5, 22, 2.4);
  } else if (def.id === 'bantam') {
    ctx.strokeStyle = '#DCE6F2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(headX + 7, headY + 4);
    ctx.lineTo(headX + 20, headY + 8);
    ctx.stroke();
    ctx.fillStyle = '#8B97A4';
    ctx.beginPath();
    ctx.moveTo(headX + 14, headY + 3);
    ctx.lineTo(headX + 21, headY + 8);
    ctx.lineTo(headX + 14, headY + 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#D9DEE3';
    ctx.fillRect(-3, -4, 12, 4);
  } else if (def.id === 'pepper') {
    ctx.fillStyle = 'rgba(40,20,10,0.35)';
    ctx.beginPath();
    ctx.ellipse(-4, 8, 9, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = 'rgba(255,220,180,0.35)';
      ctx.beginPath();
      ctx.arc(-18, -16 - i * 6 + Math.sin(time * 3 + i) * 3, 5 + i * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (def.id === 'snowbell') {
    ctx.fillStyle = def.prop;
    ctx.fillRect(headX - 10, headY + 5, 22, 5);
    ctx.beginPath();
    ctx.moveTo(headX + 10, headY + 7);
    ctx.lineTo(headX + 18, headY + 18);
    ctx.lineTo(headX + 11, headY + 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(headX - 6, headY + 6);
    ctx.lineTo(headX - 2, headY + 18);
    ctx.lineTo(headX - 10, headY + 18);
    ctx.closePath();
    ctx.fill();
  } else if (def.id === 'mother') {
    ctx.fillStyle = def.prop;
    ctx.beginPath();
    ctx.moveTo(-10, -2);
    ctx.lineTo(8, -2);
    ctx.lineTo(11, 16);
    ctx.lineTo(-12, 16);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#C9CDD4';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = '#C9755F';
    ctx.beginPath();
    ctx.arc(2, 6, 2.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (def.id === 'puff') {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(-8 + i * 5, -14 + Math.sin(time * 2 + i) * 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Active-chicken gold rim.
  ctx.globalAlpha = alpha * 0.95;
  ctx.strokeStyle = powered ? '#FFF3B0' : '#FFD166';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 20, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Small portrait used by the HUD queue. */
export function drawChickenPortrait(
  ctx: CanvasRenderingContext2D,
  def: ChickenDef,
  x: number,
  y: number,
  scale: number,
  active: boolean,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = active ? '#FFE7A3' : 'rgba(30,18,8,0.35)';
  ctx.beginPath();
  ctx.arc(0, 0, 23, 0, Math.PI * 2);
  ctx.fill();
  if (active) {
    ctx.strokeStyle = '#FFD166';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.translate(0, 13);
  ctx.scale(0.78, 0.78);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#2A1A0C';
  ctx.lineWidth = 2.4;
  ctx.fillStyle = def.body;
  ctx.beginPath();
  ctx.ellipse(0, -6, 12, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(5, -19, 7.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = def.comb;
  ctx.beginPath();
  ctx.arc(2, -27, 3.2, 0, Math.PI * 2);
  ctx.arc(6.4, -27.5, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#F4A629';
  ctx.beginPath();
  ctx.moveTo(11, -20);
  ctx.lineTo(18, -18);
  ctx.lineTo(11, -15);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1B1008';
  ctx.beginPath();
  ctx.arc(7, -20, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
