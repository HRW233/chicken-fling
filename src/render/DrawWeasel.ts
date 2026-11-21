import type { KoEnt, WeaselEnt } from '../game/Entities';
import { weaselDef } from '../data/levels/builder';

const FUR = '#C08A4E';
const FUR_DARK = '#94622F';
const FUR_LIGHT = '#DCAE74';
const BELLY = '#F5E1BC';
const MASK = '#4A2F1A';
const INK = '#2E1B0C';

/**
 * Weasel art. Drawn in body-radius units so every size reads the same, with
 * gradient fur and gear details that survive being scaled up on high-DPI
 * screens.
 */
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
  ctx.strokeStyle = INK;

  // Contact shadow.
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#1B1008';
  ctx.beginPath();
  ctx.ellipse(0, r * 1.12, r * 1.02, r * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Tail: tapered, with a darker tip and a soft highlight.
  const tail = ctx.createLinearGradient(-r * 1.4, -r * 0.4, -r * 0.6, r * 0.4);
  tail.addColorStop(0, FUR_DARK);
  tail.addColorStop(1, FUR);
  ctx.fillStyle = tail;
  ctx.beginPath();
  ctx.moveTo(-r * 0.62, r * 0.24);
  ctx.bezierCurveTo(-r * 1.15, r * 0.44, -r * 1.5, r * 0.1, -r * 1.42, -r * 0.42);
  ctx.bezierCurveTo(-r * 1.2, -r * 0.32, -r * 1.15, -r * 0.02, -r * 0.58, r * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Hind leg and claws.
  ctx.strokeStyle = FUR_DARK;
  ctx.lineWidth = highContrast ? 5 : 3.4;
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, r * 0.72);
  ctx.quadraticCurveTo(-r * 0.4, r * 1.02, -r * 0.16, r * 1.06);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.16, r * 1.06);
    ctx.lineTo(r * 0.06 + i * r * 0.06, r * 1.1);
    ctx.stroke();
  }

  // Body.
  const bodyFill = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.1, 0, r * 0.25, r * 1.25);
  bodyFill.addColorStop(0, FUR_LIGHT);
  bodyFill.addColorStop(0.6, FUR);
  bodyFill.addColorStop(1, FUR_DARK);
  ctx.fillStyle = bodyFill;
  ctx.strokeStyle = INK;
  ctx.lineWidth = highContrast ? 5 : 3;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.25, r * 0.95, r * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Belly patch with a soft edge.
  const belly = ctx.createRadialGradient(r * 0.12, r * 0.3, 2, r * 0.12, r * 0.45, r * 0.8);
  belly.addColorStop(0, '#FDF3DC');
  belly.addColorStop(1, BELLY);
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(r * 0.14, r * 0.46, r * 0.55, r * 0.65, 0.04, 0, Math.PI * 2);
  ctx.fill();

  // Front arm and paw.
  ctx.strokeStyle = FUR_DARK;
  ctx.lineWidth = highContrast ? 5 : 3.6;
  ctx.beginPath();
  ctx.moveTo(r * 0.34, r * 0.02);
  ctx.quadraticCurveTo(r * 0.72, r * 0.14, r * 0.86, r * 0.42);
  ctx.stroke();
  ctx.fillStyle = FUR_LIGHT;
  ctx.beginPath();
  ctx.arc(r * 0.88, r * 0.46, r * 0.17, 0, Math.PI * 2);
  ctx.fill();

  // Head.
  const headX = r * 0.35;
  const headY = -r * 0.62;
  const headFill = ctx.createRadialGradient(headX - r * 0.1, headY - r * 0.15, r * 0.06, headX, headY, r * 0.7);
  headFill.addColorStop(0, FUR_LIGHT);
  headFill.addColorStop(1, FUR);
  ctx.fillStyle = headFill;
  ctx.strokeStyle = INK;
  ctx.lineWidth = highContrast ? 5 : 3;
  ctx.beginPath();
  ctx.ellipse(headX, headY, r * 0.64, r * 0.56, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Ears: outer fur with a pink inner.
  for (const side of [-1, 1]) {
    ctx.fillStyle = FUR_DARK;
    ctx.beginPath();
    ctx.arc(headX + side * r * 0.36, headY - r * 0.46, r * 0.21, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E8A6A0';
    ctx.beginPath();
    ctx.arc(headX + side * r * 0.36, headY - r * 0.46, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Snout, nose and whiskers.
  ctx.fillStyle = FUR_LIGHT;
  ctx.strokeStyle = INK;
  ctx.lineWidth = highContrast ? 4 : 2.4;
  ctx.beginPath();
  ctx.ellipse(headX + r * 0.55, headY + r * 0.14, r * 0.44, r * 0.27, 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2E1B0C';
  ctx.beginPath();
  ctx.ellipse(headX + r * 0.96, headY + r * 0.06, r * 0.11, r * 0.09, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = '#F7EAD2';
  ctx.lineWidth = 1.1;
  for (const dy of [-0.06, 0.1]) {
    ctx.beginPath();
    ctx.moveTo(headX + r * 0.86, headY + r * dy);
    ctx.lineTo(headX + r * 1.28, headY + r * (dy - 0.12));
    ctx.stroke();
  }
  ctx.restore();

  // Bandit mask.
  ctx.fillStyle = MASK;
  ctx.beginPath();
  ctx.ellipse(headX + r * 0.12, headY - r * 0.01, r * 0.52, r * 0.23, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes.
  const eyeY = headY - r * 0.03;
  for (const side of [0, 1]) {
    const ex = headX - r * 0.12 + side * r * 0.36;
    ctx.fillStyle = '#FFF8E7';
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, r * 0.155, r * 0.175, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1B1008';
    const look = hpRatio > 0.6 ? r * 0.06 : hpRatio > 0.3 ? 0 : -r * 0.03;
    ctx.beginPath();
    ctx.arc(ex + look, eyeY + (hpRatio > 0.3 ? 0 : r * 0.05), r * 0.078, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(ex + look + r * 0.03, eyeY - r * 0.05, r * 0.03, 0, Math.PI * 2);
    ctx.fill();
  }

  // Brows / lids by damage state.
  ctx.strokeStyle = '#1B1008';
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

  // Mouth.
  ctx.strokeStyle = '#2E1B0C';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (hpRatio > 0.35) {
    ctx.arc(headX + r * 0.55, headY + r * 0.32, r * 0.22, 0.15, Math.PI - 0.15);
    ctx.stroke();
    // Tooth.
    ctx.fillStyle = '#FFFDF6';
    ctx.beginPath();
    ctx.moveTo(headX + r * 0.4, headY + r * 0.44);
    ctx.lineTo(headX + r * 0.48, headY + r * 0.56);
    ctx.lineTo(headX + r * 0.55, headY + r * 0.44);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.arc(headX + r * 0.55, headY + r * 0.52, r * 0.18, Math.PI + 0.2, Math.PI * 2 - 0.2);
    ctx.stroke();
  }

  // Gear.
  if (ent.def.type === 'helmet' && ent.armour > 0) {
    const helm = ctx.createLinearGradient(headX - r * 0.6, headY - r * 0.9, headX + r * 0.6, headY - r * 0.2);
    helm.addColorStop(0, '#E4EAF0');
    helm.addColorStop(0.55, '#B9C3CB');
    helm.addColorStop(1, '#7C8794');
    ctx.fillStyle = helm;
    ctx.beginPath();
    ctx.arc(headX, headY - r * 0.3, r * 0.62, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4C5560';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#8B97A4';
    ctx.fillRect(headX - r * 0.68, headY - r * 0.36, r * 1.36, r * 0.13);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(headX - r * 0.22, headY - r * 0.62, r * 0.16, r * 0.09, -0.5, 0, Math.PI * 2);
    ctx.fill();
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#D5DCE6';
      ctx.beginPath();
      ctx.arc(headX + side * r * 0.5, headY - r * 0.34, r * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (ent.def.type === 'king' || ent.def.type === 'boss') {
    const crown = ctx.createLinearGradient(headX, headY - r * 1.0, headX, headY - r * 0.5);
    crown.addColorStop(0, '#FFE291');
    crown.addColorStop(1, '#E8AE2C');
    ctx.fillStyle = crown;
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
    ctx.fillStyle = '#D2402E';
    ctx.beginPath();
    ctx.arc(headX, headY - r * 0.66, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
  if (ent.def.type === 'brute') {
    ctx.fillStyle = FUR_DARK;
    ctx.beginPath();
    ctx.ellipse(-r * 0.5, r * 0.4, r * 0.28, r * 0.5, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // Shoulder scar.
    ctx.strokeStyle = '#7A4A2A';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(r * 0.1, -r * 0.3);
    ctx.lineTo(r * 0.34, -r * 0.05);
    ctx.stroke();
  }

  // Hit flash.
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
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  const bodyFill = ctx.createRadialGradient(-r * 0.3, -r * 0.2, r * 0.1, 0, 0, r * 1.2);
  bodyFill.addColorStop(0, FUR_LIGHT);
  bodyFill.addColorStop(1, FUR_DARK);
  ctx.fillStyle = bodyFill;
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
  // X eyes.
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
  // Flailing limbs.
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
