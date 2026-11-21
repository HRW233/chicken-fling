import type { KoEnt, WeaselEnt } from '../game/Entities';
import { weaselDef } from '../data/levels/builder';

const FUR = '#C08A4E';
const FUR_DARK = '#94622F';
const BELLY = '#F2D9AE';
const MASK = '#4A2F1A';

export function drawWeasel(ctx: CanvasRenderingContext2D, ent: WeaselEnt, time: number, highContrast: boolean): void {
  if (ent.defeated) return;
  const body = ent.body;
  const def = weaselDef(ent.def.type);
  const r = def.radius;
  const facing = ent.def.facing ?? -1;
  const hpRatio = Math.max(0, ent.hp / ent.maxHp);
  const squash = Math.max(0, ent.squash);
  const breath = Math.sin(time * 2.4 + body.id) * 1.2;
  ctx.save();
  ctx.translate(body.position.x, body.position.y + breath);
  ctx.rotate(body.angle * 0.35);
  ctx.scale(facing * (1 + squash * 0.35), 1 - squash * 0.35);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = highContrast ? 5 : 3;
  ctx.strokeStyle = '#2E1B0C';

  // Tail
  ctx.fillStyle = FUR_DARK;
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, r * 0.3);
  ctx.quadraticCurveTo(-r * 1.5, r * 0.5, -r * 1.35, -r * 0.4);
  ctx.quadraticCurveTo(-r * 1.2, -r * 0.1, -r * 0.6, 0);
  ctx.closePath();
  ctx.fill();

  // Body
  ctx.fillStyle = FUR;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.25, r * 0.95, r * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Belly
  ctx.fillStyle = BELLY;
  ctx.beginPath();
  ctx.ellipse(r * 0.12, r * 0.45, r * 0.55, r * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();

  // Arms
  ctx.strokeStyle = FUR_DARK;
  ctx.lineWidth = highContrast ? 5 : 3.5;
  ctx.beginPath();
  ctx.moveTo(r * 0.35, r * 0.05);
  ctx.lineTo(r * 0.85, r * 0.4);
  ctx.moveTo(-r * 0.2, r * 0.1);
  ctx.lineTo(-r * 0.6, r * 0.5);
  ctx.stroke();

  // Head
  const headX = r * 0.35;
  const headY = -r * 0.62;
  ctx.fillStyle = FUR;
  ctx.strokeStyle = '#2E1B0C';
  ctx.lineWidth = highContrast ? 5 : 3;
  ctx.beginPath();
  ctx.ellipse(headX, headY, r * 0.62, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Snout
  ctx.beginPath();
  ctx.ellipse(headX + r * 0.55, headY + r * 0.13, r * 0.42, r * 0.26, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2E1B0C';
  ctx.beginPath();
  ctx.arc(headX + r * 0.95, headY + r * 0.08, r * 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Ears
  ctx.fillStyle = FUR_DARK;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(headX + side * r * 0.35, headY - r * 0.45, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mask + eyes
  ctx.fillStyle = MASK;
  ctx.beginPath();
  ctx.ellipse(headX + r * 0.1, headY - r * 0.02, r * 0.5, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  const eyeY = headY - r * 0.04;
  ctx.fillStyle = '#FFF8E7';
  for (const side of [0, 1]) {
    const ex = headX - r * 0.12 + side * r * 0.36;
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, r * 0.15, r * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1B1008';
    const look = hpRatio > 0.6 ? r * 0.06 : hpRatio > 0.3 ? 0 : -r * 0.03;
    ctx.beginPath();
    ctx.arc(ex + look, eyeY + (hpRatio > 0.3 ? 0 : r * 0.05), r * 0.075, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFF8E7';
  }

  // Eyes change with damage: smug lids, worried brows, dazed swirls.
  ctx.strokeStyle = '#2E1B0C';
  ctx.lineWidth = 2.2;
  if (hpRatio > 0.6) {
    ctx.beginPath();
    ctx.moveTo(headX - r * 0.32, eyeY - r * 0.14);
    ctx.lineTo(headX + r * 0.02, eyeY - r * 0.2);
    ctx.stroke();
  } else if (hpRatio > 0.3) {
    ctx.beginPath();
    ctx.moveTo(headX - r * 0.34, eyeY - r * 0.34);
    ctx.lineTo(headX - r * 0.04, eyeY - r * 0.16);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(headX - r * 0.12, eyeY, r * 0.08, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Grin / worried mouth
  ctx.strokeStyle = '#2E1B0C';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (hpRatio > 0.35) {
    ctx.arc(headX + r * 0.55, headY + r * 0.3, r * 0.22, 0.15, Math.PI - 0.15);
  } else {
    ctx.arc(headX + r * 0.55, headY + r * 0.5, r * 0.18, Math.PI + 0.2, Math.PI * 2 - 0.2);
  }
  ctx.stroke();

  // Gear
  if (ent.def.type === 'helmet' && ent.armour > 0) {
    ctx.fillStyle = '#B9C3CB';
    ctx.beginPath();
    ctx.arc(headX, headY - r * 0.3, r * 0.6, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5E6875';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#8B97A4';
    ctx.fillRect(headX - r * 0.65, headY - r * 0.34, r * 1.3, r * 0.12);
  }
  if (ent.def.type === 'king' || ent.def.type === 'boss') {
    ctx.fillStyle = '#F7C948';
    ctx.strokeStyle = '#8A6A16';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(headX - r * 0.45, headY - r * 0.5);
    ctx.lineTo(headX - r * 0.45, headY - r * 0.9);
    ctx.lineTo(headX - r * 0.18, headY - r * 0.62);
    ctx.lineTo(headX, headY - r * 0.98);
    ctx.lineTo(headX + r * 0.18, headY - r * 0.62);
    ctx.lineTo(headX + r * 0.45, headY - r * 0.9);
    ctx.lineTo(headX + r * 0.45, headY - r * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  if (ent.def.type === 'brute') {
    ctx.fillStyle = FUR_DARK;
    ctx.beginPath();
    ctx.ellipse(-r * 0.5, r * 0.4, r * 0.28, r * 0.5, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hit flash
  if (ent.flash > 0) {
    ctx.globalAlpha = Math.min(0.85, ent.flash * 8);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.2, r * 1.05, r * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(headX, headY, r * 0.66, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawWeaselKo(ctx: CanvasRenderingContext2D, ko: KoEnt): void {
  const def = weaselDef(ko.type);
  const r = def.radius;
  const fade = Math.max(0, 1 - ko.timer / ko.duration);
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(ko.x, ko.y);
  ctx.rotate(ko.angle);
  ctx.scale(1.1, 1.1);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#2E1B0C';
  ctx.fillStyle = FUR;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.95, r * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = BELLY;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.2, r * 0.5, r * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = FUR;
  ctx.beginPath();
  ctx.arc(r * 0.35, -r * 0.75, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // X eyes
  ctx.strokeStyle = '#1B1008';
  ctx.lineWidth = 3;
  for (const ex of [r * 0.12, r * 0.62]) {
    ctx.beginPath();
    ctx.moveTo(ex - 4, -r * 0.88);
    ctx.lineTo(ex + 4, -r * 0.78);
    ctx.moveTo(ex + 4, -r * 0.88);
    ctx.lineTo(ex - 4, -r * 0.78);
    ctx.stroke();
  }
  // Flailing limbs
  ctx.strokeStyle = FUR_DARK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, 0);
  ctx.lineTo(-r * 0.95, -r * 0.3);
  ctx.moveTo(r * 0.4, 0);
  ctx.lineTo(r * 0.95, r * 0.3);
  ctx.stroke();
  ctx.restore();
}
