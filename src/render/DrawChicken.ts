import type { Body } from 'matter-js';
import type { ChickenDef } from '../data/chickens';
import type { ChickenEnt } from '../game/Entities';

/**
 * Chicken art. Everything is vector-drawn in a 16 px-radius body space, so the
 * sprite stays crisp at any zoom or device pixel ratio.
 */
export function drawChicken(ctx: CanvasRenderingContext2D, ent: ChickenEnt, time: number, highContrast: boolean): void {
  const alpha = ent.inert ? Math.max(0, Math.min(1, ent.fade / 1.2)) : 1;
  if (alpha <= 0.02) return;
  for (const body of ent.bodies) {
    drawChickenBody(ctx, body, ent.def, time, alpha, highContrast, ent.damageMult > 1);
  }
}

function shade(color: string, amount: number): string {
  // Cheap luminance shift that accepts any CSS colour we use in chickens.ts.
  return amount >= 0 ? mix(color, '#FFFFFF', amount) : mix(color, '#3A2413', -amount);
}

function mix(a: string, b: string, t: number): string {
  const pa = hex(a);
  const pb = hex(b);
  if (!pa || !pb) return a;
  const [r, g, bl] = [0, 1, 2].map((i) => Math.round(pa[i] + (pb[i] - pa[i]) * t));
  return `rgb(${r},${g},${bl})`;
}

function hex(c: string): [number, number, number] | null {
  if (!c.startsWith('#') || (c.length !== 7 && c.length !== 4)) return null;
  const full = c.length === 4 ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}` : c;
  return [parseInt(full.slice(1, 3), 16), parseInt(full.slice(3, 5), 16), parseInt(full.slice(5, 7), 16)];
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
  const ink = '#3A2413';
  ctx.lineWidth = outline;
  ctx.strokeStyle = ink;

  // Ground shadow: keeps the bird readable against busy blocks.
  ctx.save();
  ctx.globalAlpha = alpha * 0.22;
  ctx.fillStyle = '#1B1008';
  ctx.beginPath();
  ctx.ellipse(0, 17, 15, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Tail: three layered feathers, each a touch lighter.
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === 2 ? shade(def.bodyDark, 0.16) : shade(def.bodyDark, -0.08 * i);
    ctx.beginPath();
    ctx.moveTo(-10 + i, 0);
    ctx.quadraticCurveTo(-22 - i * 3, -8 - i * 4, -27 - i * 4, -14 - i * 5);
    ctx.quadraticCurveTo(-19 - i * 2, -3 - i, -8, 5);
    ctx.closePath();
    ctx.fill();
    if (i === 2) ctx.stroke();
  }

  if (def.id === 'pepper') {
    ctx.fillStyle = 'rgba(255,170,90,0.8)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(-24 + Math.sin(time * 4 + i) * 4, -10 - i * 5, 4 + i, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Legs and three-toed feet.
  ctx.strokeStyle = '#C97B2E';
  ctx.lineWidth = 2.4;
  for (const side of [-1, 1]) {
    const x = side * 4;
    ctx.beginPath();
    ctx.moveTo(x, 11);
    ctx.quadraticCurveTo(x * 1.3, 16, x * 1.6, 18);
    ctx.stroke();
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(x * 1.6, 18);
    ctx.lineTo(x * 1.6 - 5, 20.5);
    ctx.moveTo(x * 1.6, 18);
    ctx.lineTo(x * 1.6 + 4.5, 20.5);
    ctx.moveTo(x * 1.6, 18);
    ctx.lineTo(x * 1.6, 21);
    ctx.stroke();
    ctx.lineWidth = 2.4;
  }

  // Body with a soft top-left highlight.
  const bodyFill = ctx.createRadialGradient(-4, -4, 2, 0, 3, 19);
  bodyFill.addColorStop(0, shade(def.body, 0.32));
  bodyFill.addColorStop(0.62, def.body);
  bodyFill.addColorStop(1, shade(def.bodyDark, -0.06));
  ctx.fillStyle = bodyFill;
  ctx.strokeStyle = ink;
  ctx.lineWidth = outline;
  if (def.id === 'puff') {
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const rr = 15 + (i % 2 === 0 ? 4.5 : 0.5);
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr + 2;
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

  // Belly sheen.
  ctx.save();
  ctx.globalAlpha = alpha * 0.45;
  ctx.fillStyle = shade(def.body, 0.5);
  ctx.beginPath();
  ctx.ellipse(0, 7, 8, 6.5, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Wing with feather divisions.
  ctx.fillStyle = shade(def.bodyDark, -0.02);
  ctx.beginPath();
  ctx.ellipse(-2, 4, 7.2, 8, -0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.globalAlpha = alpha * 0.75;
  ctx.strokeStyle = shade(def.bodyDark, -0.35);
  ctx.lineWidth = 1.1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(-2, 3 + i * 3, 6 - i * 1.2, 0.25, Math.PI - 0.3);
    ctx.stroke();
  }
  ctx.restore();
  if (def.id === 'drumstick') {
    ctx.strokeStyle = '#8A5528';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-2, 4, 5, 0, Math.PI);
    ctx.stroke();
  }

  if (def.id === 'speckle') {
    ctx.fillStyle = '#6C655B';
    for (const [x, y, rr] of [
      [-7, -2, 1.6],
      [3, 7, 1.4],
      [-4, 9.5, 1.2],
      [6, -3, 1.3],
      [-9, 5, 1.1],
    ]) {
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Head.
  const headX = 7;
  const headY = -11;
  const headFill = ctx.createRadialGradient(headX + 1, headY - 3, 1.5, headX, headY, 10);
  headFill.addColorStop(0, shade(def.body, 0.34));
  headFill.addColorStop(1, shade(def.body, 0.02));
  ctx.fillStyle = headFill;
  ctx.strokeStyle = ink;
  ctx.lineWidth = outline;
  ctx.beginPath();
  ctx.arc(headX, headY, 8.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Cheek blush for a friendlier read at small sizes.
  ctx.save();
  ctx.globalAlpha = alpha * 0.35;
  ctx.fillStyle = '#F08A78';
  ctx.beginPath();
  ctx.ellipse(headX - 2.5, headY + 3.6, 3.2, 2.1, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Comb: three rounded lobes with a shaded base.
  ctx.fillStyle = def.comb;
  ctx.strokeStyle = shade(def.comb, -0.35);
  ctx.lineWidth = Math.max(1.2, outline * 0.5);
  ctx.beginPath();
  ctx.arc(headX - 3.6, headY - 9.6, 3.9, Math.PI * 0.9, Math.PI * 2.2);
  ctx.arc(headX, headY - 12, 4.4, Math.PI, Math.PI * 2.1);
  ctx.arc(headX + 4.1, headY - 9.6, 3.6, Math.PI * 1.05, Math.PI * 2.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Wattle.
  ctx.fillStyle = shade(def.comb, -0.08);
  ctx.beginPath();
  ctx.ellipse(headX + 4.2, headY + 7.4, 1.9, 2.8, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Beak: upper and lower mandible.
  ctx.fillStyle = '#F7B33A';
  ctx.strokeStyle = '#8A5528';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(headX + 7, headY + 0.6);
  ctx.lineTo(headX + 16.5, headY + 3.4);
  ctx.lineTo(headX + 7, headY + 4.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#D98A1F';
  ctx.beginPath();
  ctx.moveTo(headX + 7, headY + 4.4);
  ctx.lineTo(headX + 13.4, headY + 4.6);
  ctx.lineTo(headX + 7, headY + 6.4);
  ctx.closePath();
  ctx.fill();

  // Eye: white, iris, highlight, determined brow.
  ctx.fillStyle = '#FFFDF6';
  ctx.beginPath();
  ctx.ellipse(headX + 3.4, headY - 1.6, 3, 3.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1B1008';
  ctx.beginPath();
  ctx.arc(headX + 4.6, headY - 1.5, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(headX + 5.3, headY - 2.4, 0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1B1008';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(headX + 1, headY - 5.6);
  ctx.lineTo(headX + 6.4, headY - 4.1);
  ctx.stroke();

  // Per-chicken props (unchanged designs, crispened).
  if (def.id === 'speckle') {
    ctx.fillStyle = def.prop;
    ctx.fillRect(-12, 0, 8, 11);
    ctx.strokeStyle = '#4C3A22';
    ctx.lineWidth = 1.3;
    ctx.stroke();
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
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(headX - 4, headY - 7.5, 3.2, 2.2, 0.5, 0, Math.PI * 2);
    ctx.fill();
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
  const disc = ctx.createRadialGradient(-4, -6, 3, 0, 0, 23);
  disc.addColorStop(0, active ? '#FFEFC0' : 'rgba(58,36,19,0.55)');
  disc.addColorStop(1, active ? '#F2C978' : 'rgba(24,14,6,0.5)');
  ctx.fillStyle = disc;
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
  const bodyFill = ctx.createRadialGradient(-4, -10, 2, 0, -6, 18);
  bodyFill.addColorStop(0, shade(def.body, 0.3));
  bodyFill.addColorStop(1, def.body);
  ctx.fillStyle = bodyFill;
  ctx.beginPath();
  ctx.ellipse(0, -6, 12, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(def.bodyDark, 0);
  ctx.beginPath();
  ctx.ellipse(-8, 2, 4, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = bodyFill;
  ctx.beginPath();
  ctx.arc(5, -19, 7.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = def.comb;
  ctx.beginPath();
  ctx.arc(2, -27, 3.2, 0, Math.PI * 2);
  ctx.arc(6.4, -27.5, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#F7B33A';
  ctx.beginPath();
  ctx.moveTo(11, -20);
  ctx.lineTo(18, -18);
  ctx.lineTo(11, -15);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#FFFDF6';
  ctx.beginPath();
  ctx.arc(7, -20.5, 2.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1B1008';
  ctx.beginPath();
  ctx.arc(7.6, -20.4, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
