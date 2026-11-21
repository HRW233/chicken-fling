import { chickenDef } from '../data/chickens';
import { worldDef } from '../data/worlds';
import type { LevelRuntime } from '../game/LevelRuntime';
import type { SaveV1 } from '../save/Save';
import { drawChickenPortrait } from '../render/DrawChicken';
import { FONT, roundRect, starIcon, text, Ui } from './widgets';

/** In-game overlay: score, star meter, queue, pause, wind flag and egg tracker. */
export function drawHud(
  ctx: CanvasRenderingContext2D,
  ui: Ui,
  runtime: LevelRuntime,
  save: SaveV1,
  onPause: () => void,
): void {
  const level = runtime.level;
  const world = worldDef(level.world);
  const score = runtime.score;

  // Top-left score board
  ui.panel(ctx, 14, 14, 380, 104);
  text(ctx, `${level.world}-${level.index}  ${level.name}`, 32, 42, 22, '#FFE9B0');
  text(ctx, score.toLocaleString(), 32, 82, 36, '#FFFFFF', 'left', 800);
  text(ctx, 'SCORE', 190, 84, 16, '#C9A24A');
  text(ctx, `${world.name}`, 300, 42, 15, 'rgba(255,241,206,0.7)', 'left', 600);

  if (save.settings.showStarsOnHud) {
    const nextStar = score >= level.starScore[2] ? 3 : score >= level.starScore[1] ? 2 : 1;
    for (let i = 0; i < 3; i++) {
      starIcon(ctx, 300 + i * 28, 78, 12, i < nextStar);
    }
    const target = score >= level.starScore[2] ? level.starScore[2] : level.starScore[1];
    const prev = score >= level.starScore[2] ? level.starScore[1] : 0;
    const ratio = target > 0 ? Math.max(0, Math.min(1, (score - prev) / Math.max(1, target - prev))) : 1;
    roundRect(ctx, 300, 94, 72, 7, 4);
    ctx.fillStyle = 'rgba(20,10,4,0.6)';
    ctx.fill();
    roundRect(ctx, 300, 94, 72 * ratio, 7, 4);
    ctx.fillStyle = '#FFD166';
    ctx.fill();
  }

  // Pause button
  ui.button(ctx, 1280 - 116, 14, 100, 100, 'II', onPause, { variant: 'secondary', size: 34 });

  // Wind flag
  const windX = level.wind.x;
  if (Math.abs(windX) > 1) {
    ctx.save();
    ctx.translate(640, 30);
    ctx.strokeStyle = '#E8DCC8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 58);
    ctx.stroke();
    const dir = Math.sign(windX);
    const strength = Math.min(1, Math.abs(windX) / 320);
    const len = 30 + strength * 46;
    const flap = Math.sin(performance.now() * (0.006 + strength * 0.008)) * 5;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.quadraticCurveTo((len / 2) * dir, 4 + flap, len * dir, 14 + flap);
    ctx.lineTo(len * dir, 34 + flap);
    ctx.quadraticCurveTo((len / 2) * dir, 26 - flap, 0, 30);
    ctx.closePath();
    ctx.fillStyle = world.accent;
    ctx.fill();
    ctx.strokeStyle = '#2E1B0C';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    text(ctx, 'WIND', 640, 100, 12, 'rgba(255,246,223,0.7)', 'center', 700);
  }

  // Chicken queue
  const remaining: { id: import('../data/types').ChickenId; active: boolean }[] = [];
  if (runtime.loaded) remaining.push({ id: runtime.loaded, active: true });
  for (const id of runtime.queue) remaining.push({ id, active: false });
  text(ctx, 'QUEUE', 26, 622, 14, 'rgba(255,246,223,0.75)', 'left', 700);
  for (let i = 0; i < remaining.length; i++) {
    const item = remaining[i];
    const def = chickenDef(item.id);
    drawChickenPortrait(ctx, def, 46 + i * 62, 674, 0.95, item.active);
  }
  if (remaining.length === 0) {
    text(ctx, 'Empty — last shot!', 28, 674, 18, '#FFB4A0');
  }

  // Shots / egg / par
  text(ctx, `Shots ${runtime.shots}`, 250, 626, 16, 'rgba(255,246,223,0.8)', 'left', 600);
  if (runtime.goldenEgg) {
    const collected = runtime.goldenEgg.collected;
    ctx.save();
    ctx.globalAlpha = collected ? 0.4 : 1;
    ctx.translate(250, 668);
    ctx.fillStyle = collected ? '#8B7355' : '#F7C948';
    ctx.strokeStyle = '#8A6A16';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    text(ctx, collected ? 'Golden egg found' : 'Golden egg', 266, 670, 15, collected ? 'rgba(255,241,206,0.6)' : '#FFE9B0');
  }

  // Ability hint strip for the loaded chicken
  if (runtime.loaded && !runtime.isFlying) {
    const def = chickenDef(runtime.loaded);
    if (def.ability !== 'none') {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.font = `600 14px ${FONT}`;
      ctx.fillStyle = '#FFF1CE';
      ctx.textAlign = 'center';
      ctx.fillText(`${def.name}: ${def.abilityHint}`, 640, 690);
      ctx.restore();
    }
  }
}
