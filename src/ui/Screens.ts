import { CHICKEN_ORDER, chickenDef } from '../data/chickens';
import { LEVELS_BY_WORLD } from '../data/levels';
import type { Level } from '../data/types';
import { WORLDS, worldDef } from '../data/worlds';
import type { LevelResult } from '../game/LevelRuntime';
import type { LevelRecord, SaveV1 } from '../save/Save';
import { drawChickenPortrait } from '../render/DrawChicken';
import type { UiActions } from './actions';
import { FONT, roundRect, starIcon, starRow, text, Ui } from './widgets';

export function drawMenuBackdrop(ctx: CanvasRenderingContext2D, time: number, accent = '#8ED9F2'): void {
  const g = ctx.createLinearGradient(0, 0, 0, 720);
  g.addColorStop(0, '#2A1A0C');
  g.addColorStop(0.6, '#4A2E17');
  g.addColorStop(1, '#1B1008');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1280, 720);

  // Barn beams
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#F4E4B2';
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.moveTo(-40, 0);
  ctx.lineTo(320, 720);
  ctx.moveTo(1320, 0);
  ctx.lineTo(960, 720);
  ctx.stroke();
  ctx.globalAlpha = 0.12;
  ctx.lineWidth = 10;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 100 + i * 90);
    ctx.lineTo(1280, 60 + i * 90);
    ctx.stroke();
  }
  ctx.restore();

  // Hay bales and dust
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#D9B45B';
    roundRect(ctx, 80 + i * 1050, 610 - i * 18, 190, 90, 22);
    ctx.fill();
    ctx.strokeStyle = '#8B6A22';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.restore();

  // Floating powder motes
  ctx.save();
  for (let i = 0; i < 26; i++) {
    const x = ((i * 137 + time * (8 + (i % 5) * 3)) % 1320) - 20;
    const y = 90 + ((i * 83) % 560) + Math.sin(time + i) * 12;
    ctx.globalAlpha = 0.18 + (i % 4) * 0.08;
    ctx.fillStyle = '#FFE9B0';
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Soft accent glow behind content
  const glow = ctx.createRadialGradient(640, 300, 60, 640, 300, 620);
  glow.addColorStop(0, accent + '44');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1280, 720);
}

export function drawTitle(
  ctx: CanvasRenderingContext2D,
  ui: Ui,
  save: SaveV1,
  actions: UiActions,
  time: number,
  continueLabel: string,
): void {
  drawMenuBackdrop(ctx, time, '#8ED9F2');

  // Cannon silhouette + chicken peeking
  ctx.save();
  ctx.translate(190, 470);
  ctx.fillStyle = '#5C3A1C';
  roundRect(ctx, -140, 40, 300, 56, 18);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-96, 110, 44, 0, Math.PI * 2);
  ctx.arc(84, 118, 48, 0, Math.PI * 2);
  ctx.fillStyle = '#3A2413';
  ctx.fill();
  ctx.fillStyle = '#96632F';
  ctx.save();
  ctx.translate(10, 14);
  ctx.rotate(-0.5);
  roundRect(ctx, -40, -26, 240, 52, 18);
  ctx.fill();
  ctx.fillStyle = '#4A525C';
  roundRect(ctx, 178, -30, 22, 60, 8);
  ctx.fill();
  ctx.restore();
  ctx.restore();
  const peeking = chickenDef('cluck');
  ctx.save();
  ctx.translate(352, 400);
  ctx.rotate(-0.15);
  ctx.scale(1.8, 1.8);
  drawChickenPortrait(ctx, peeking, 0, 0, 1, false);
  ctx.restore();

  // Logo
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `900 92px ${FONT}`;
  ctx.fillStyle = 'rgba(20,10,4,0.65)';
  ctx.fillText('CHICKEN FLING', 646, 190);
  const grad = ctx.createLinearGradient(0, 100, 0, 210);
  grad.addColorStop(0, '#FFE9A8');
  grad.addColorStop(1, '#F0A63C');
  ctx.fillStyle = grad;
  ctx.fillText('CHICKEN FLING', 640, 182);
  ctx.font = `700 24px ${FONT}`;
  ctx.fillStyle = '#F4E4B2';
  ctx.fillText('Load the coop’s finest. Knock out the weasels.', 640, 240);
  ctx.restore();

  // Buttons: 2x2
  const bw = 292;
  const bh = 108;
  const gap = 22;
  const startX = 640 - bw - gap / 2;
  const startY = 306;
  ui.button(ctx, startX, startY, bw, bh, 'PLAY', () => actions.play(), { variant: 'primary', sub: continueLabel, size: 40 });
  ui.button(ctx, startX + bw + gap, startY, bw, bh, 'WORLDS', () => actions.openWorlds(), { sub: 'Five worlds, 145 levels' });
  ui.button(ctx, startX, startY + bh + gap, bw, bh, 'OPTIONS', () => actions.openOptions(), { sub: 'Audio, feel and access' });
  ui.button(ctx, startX + bw + gap, startY + bh + gap, bw, bh, 'CREDITS', () => actions.openCredits(), { sub: 'No assets. All code.' });

  // Progress strip
  ui.panel(ctx, 380, 574, 520, 96, 0.8);
  text(ctx, 'TOTAL STARS', 408, 610, 15, '#C9A24A');
  text(ctx, `${save.totalStars} / 435`, 408, 642, 28, '#FFF6DF', 'left', 800);
  text(ctx, 'GOLDEN EGGS', 620, 610, 15, '#C9A24A');
  const eggs = Object.values(save.levels).filter((r) => r.goldenEgg).length;
  text(ctx, `${eggs} / 5`, 620, 642, 28, '#FFF6DF', 'left', 800);
  text(ctx, 'v1.0', 1200, 700, 13, 'rgba(255,246,223,0.5)', 'right', 600);
}

export function drawWorlds(
  ctx: CanvasRenderingContext2D,
  ui: Ui,
  save: SaveV1,
  actions: UiActions,
  time: number,
): void {
  drawMenuBackdrop(ctx, time, '#F4E4B2');
  text(ctx, 'CHOOSE A WORLD', 640, 76, 46, '#FFE9A8', 'center', 900);
  ui.button(ctx, 34, 30, 150, 62, 'BACK', () => actions.back(), { size: 22 });

  const cardW = 228;
  const cardH = 348;
  const gap = 14;
  const totalW = cardW * 5 + gap * 4;
  const startX = (1280 - totalW) / 2;
  const y = 176;
  for (let i = 0; i < WORLDS.length; i++) {
    const world = WORLDS[i];
    const levels = LEVELS_BY_WORLD[world.id] ?? [];
    const stars = levels.reduce((sum, l) => sum + (save.levels[l.id]?.stars ?? 0), 0);
    const eggs = levels.filter((l) => save.levels[l.id]?.goldenEgg).length;
    const unlocked = isWorldUnlocked(world.id, save);
    const x = startX + i * (cardW + gap);

    const g = ctx.createLinearGradient(0, y, 0, y + cardH);
    g.addColorStop(0, world.skyTop);
    g.addColorStop(0.62, world.mid);
    g.addColorStop(1, world.groundDark);
    roundRect(ctx, x, y, cardW, cardH, 20);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = unlocked ? '#E2C07A' : '#5A4632';
    ctx.stroke();
    ctx.save();
    roundRect(ctx, x, y, cardW, cardH, 20);
    ctx.clip();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = world.accent;
    for (let c = 0; c < 3; c++) {
      ctx.beginPath();
      ctx.arc(x + 30 + c * 80, y + 60 + (c % 2) * 22, 22 + c * 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.92;
    roundRect(ctx, x + 12, y + 12, 54, 44, 12);
    ctx.fillStyle = 'rgba(20,10,4,0.65)';
    ctx.fill();
    ctx.restore();
    text(ctx, String(world.id), x + 39, y + 35, 28, '#FFE9A8', 'center', 900);
    text(ctx, world.name, x + cardW / 2, y + 88, 28, '#26160A', 'center', 900);
    text(ctx, world.gimmick, x + cardW / 2, y + 122, 13, 'rgba(38,22,10,0.78)', 'center', 600);
    text(ctx, world.blurb, x + cardW / 2, y + 148, 12, 'rgba(38,22,10,0.65)', 'center', 500);

    ctx.save();
    ctx.globalAlpha = 0.85;
    roundRect(ctx, x + 20, y + 214, cardW - 40, 96, 12);
    ctx.fillStyle = 'rgba(20,10,4,0.55)';
    ctx.fill();
    ctx.restore();
    text(ctx, `${stars} / 87`, x + cardW / 2, y + 240, 22, '#FFF6DF', 'center', 800);
    text(ctx, 'STARS', x + cardW / 2, y + 260, 11, '#C9A24A', 'center', 700);
    text(ctx, `Golden eggs ${eggs} / 1`, x + cardW / 2, y + 292, 14, '#F7C948', 'center', 700);

    if (!unlocked) {
      ctx.save();
      roundRect(ctx, x, y, cardW, cardH, 20);
      ctx.fillStyle = 'rgba(15,9,4,0.72)';
      ctx.fill();
      ctx.restore();
      text(ctx, 'LOCKED', x + cardW / 2, y + 160, 28, '#E2C07A', 'center', 900);
      const prev = world.id - 1;
      text(ctx, `Clear  ${prev}-27  to open`, x + cardW / 2, y + 196, 14, '#FFF1CE', 'center', 600);
    } else {
      ui.add({
        x,
        y,
        w: cardW,
        h: cardH,
        action: () => actions.openLevels(world.id),
      });
    }
  }
  text(ctx, 'Stars are score, not a lock — clear a level with any score to move on.', 640, 570, 16, 'rgba(255,246,223,0.7)', 'center', 600);
}

export function drawLevelsHeader(ctx: CanvasRenderingContext2D, ui: Ui, actions: UiActions, worldId: number, save: SaveV1): void {
  const world = worldDef(worldId);
  text(ctx, `${world.id}  ${world.name}`, 240, 56, 34, '#FFE9A8', 'left', 900);
  ui.button(ctx, 34, 26, 140, 62, 'BACK', () => actions.back(), { size: 22 });
  const stars = (LEVELS_BY_WORLD[worldId] ?? []).reduce((sum, l) => sum + (save.levels[l.id]?.stars ?? 0), 0);
  text(ctx, `${stars} / 87 stars`, 1240, 44, 20, '#FFF1CE', 'right', 700);
  text(ctx, 'Drag or scroll to browse', 1240, 70, 14, 'rgba(255,246,223,0.6)', 'right', 500);
}

export function drawPause(
  ctx: CanvasRenderingContext2D,
  ui: Ui,
  actions: UiActions,
  level: Level,
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(12,7,3,0.66)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.restore();
  ui.panel(ctx, 340, 120, 600, 492);
  text(ctx, 'PAUSED', 640, 186, 48, '#FFE9A8', 'center', 900);
  text(ctx, `${level.id.toUpperCase()} · ${level.name}`, 640, 228, 18, 'rgba(255,241,206,0.8)', 'center', 600);
  const bw = 250;
  const bh = 92;
  ui.button(ctx, 640 - bw - 12, 262, bw, bh, 'RESUME', () => actions.resume(), { variant: 'primary', sub: 'Esc / P' });
  ui.button(ctx, 640 + 12, 262, bw, bh, 'RESTART', () => actions.restart(), { sub: 'R key' });
  ui.button(ctx, 640 - bw - 12, 372, bw, bh, 'OPTIONS', () => actions.openOptions());
  ui.button(ctx, 640 + 12, 372, bw, bh, 'QUIT TO MAP', () => actions.quitToLevels());
  text(ctx, 'M mutes · N next level · tap or Space uses abilities', 640, 560, 15, 'rgba(255,241,206,0.65)', 'center', 600);
}

export function drawCredits(ctx: CanvasRenderingContext2D, ui: Ui, actions: UiActions, time: number): void {
  drawMenuBackdrop(ctx, time, '#A78BFA');
  ui.panel(ctx, 290, 80, 700, 560);
  text(ctx, 'CREDITS', 640, 140, 44, '#FFE9A8', 'center', 900);
  const lines = [
    'Chicken Fling was built in code.',
    'Every block, chicken, weasel and sky is drawn with Canvas 2D.',
    'Every crunch, squawk and jingle is synthesised with WebAudio.',
    'No image files. No audio files. No fonts to download. No network calls.',
    '',
    'Physics: matter.js (MIT)',
    'Engine, design, art and audio: the coop',
    '',
    'With apologies to every egg that became ammunition.',
  ];
  lines.forEach((line, i) => {
    text(ctx, line, 640, 220 + i * 38, i === 0 ? 22 : 18, i === 0 ? '#FFF6DF' : 'rgba(255,241,206,0.78)', 'center', i === 0 ? 700 : 500);
  });
  ui.button(ctx, 640 - 130, 566, 260, 76, 'BACK', () => actions.back(), { variant: 'primary' });
}

export function drawComplete(
  ctx: CanvasRenderingContext2D,
  ui: Ui,
  result: LevelResult,
  level: Level,
  elapsed: number,
  actions: UiActions,
  hasNext: boolean,
  newBest: boolean,
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(12,7,3,0.55)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.restore();
  const pop = Math.min(1, elapsed / 0.25);
  const scale = 0.8 + pop * 0.2;
  ctx.save();
  ctx.translate(640, 360);
  ctx.scale(scale, scale);
  ctx.translate(-640, -360);
  ui.panel(ctx, 300, 92, 680, 548);
  text(ctx, 'LEVEL CLEARED!', 640, 156, 42, '#FFE9A8', 'center', 900);
  text(ctx, `${level.id.toUpperCase()} · ${level.name}`, 640, 194, 17, 'rgba(255,241,206,0.75)', 'center', 600);

  for (let i = 0; i < 3; i++) {
    const show = elapsed > 0.34 + i * 0.34;
    const t = show ? Math.min(1, (elapsed - (0.34 + i * 0.34)) / 0.22) : 0;
    if (!show) {
      starIcon(ctx, 556 + i * 84, 254, 32, false);
    } else {
      const bounce = 1 + Math.sin(Math.min(Math.PI, t * Math.PI)) * 0.35;
      ctx.save();
      ctx.translate(556 + i * 84, 254);
      ctx.scale(bounce, bounce);
      ctx.translate(-(556 + i * 84), -254);
      starIcon(ctx, 556 + i * 84, 254, 34, i < result.stars);
      ctx.restore();
    }
  }

  const shown = Math.round(result.score * Math.min(1, Math.max(0, (elapsed - 0.2) / 1.1)));
  text(ctx, shown.toLocaleString(), 640, 330, 52, '#FFFFFF', 'center', 900);
  text(ctx, 'SCORE', 640, 362, 14, '#C9A24A', 'center', 700);
  if (newBest) text(ctx, 'NEW BEST!', 786, 326, 15, '#FFD166', 'left', 800);

  const rows: [string, string][] = [
    ['Weasels bounced', String(result.weaselsDefeated)],
    ['Blocks smashed', String(result.blocksDestroyed)],
    ['Chickens unused', `${result.unusedChickens} (+${result.unusedChickens * 8000})`],
    ['Time', `${result.timeSec.toFixed(1)} s  (par ${level.parTimeSec}s)`],
  ];
  rows.forEach(([label, value], i) => {
    text(ctx, label, 380, 410 + i * 32, 18, 'rgba(255,241,206,0.8)', 'left', 600);
    text(ctx, value, 900, 410 + i * 32, 18, '#FFF6DF', 'right', 700);
  });
  if (result.goldenEgg) {
    text(ctx, '★ Golden egg found — +10,000 ★', 640, 548, 19, '#F7C948', 'center', 800);
  }

  ui.button(ctx, 446, 566, 180, 72, hasNext ? 'NEXT' : 'MAP', () => actions.nextLevel(), { variant: 'primary', size: 24 });
  ui.button(ctx, 640, 566, 180, 72, 'REPLAY', () => actions.restart(), { size: 24 });
  ui.button(ctx, 834, 566, 120, 72, 'MAP', () => actions.quitToLevels(), { size: 20 });
  ctx.restore();
}

export function drawFailed(ctx: CanvasRenderingContext2D, ui: Ui, level: Level, actions: UiActions, elapsed: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(12,7,3,0.62)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.restore();
  ui.panel(ctx, 340, 150, 600, 430);
  text(ctx, 'OUT OF CHICKENS!', 640, 224, 44, '#FFB4A0', 'center', 900);
  text(ctx, `The weasels kept the eggs on ${level.id.toUpperCase()}`, 640, 268, 17, 'rgba(255,241,206,0.8)', 'center', 600);

  // Sulking chicken
  ctx.save();
  ctx.translate(640, 360);
  ctx.rotate(0.06 + Math.sin(elapsed * 2) * 0.02);
  ctx.scale(1.6, 1.6);
  drawChickenPortrait(ctx, chickenDef(CHICKEN_ORDER[0]), 0, 0, 1, false);
  ctx.restore();

  ui.button(ctx, 430, 484, 200, 84, 'RETRY', () => actions.restart(), { variant: 'primary', sub: 'R' });
  ui.button(ctx, 650, 484, 200, 84, 'QUIT', () => actions.quitToLevels());
}

export function isWorldUnlocked(worldId: number, save: SaveV1): boolean {
  if (worldId <= 1) return true;
  const rec: LevelRecord | undefined = save.levels[`w${worldId - 1}-27`];
  return (rec?.stars ?? 0) > 0;
}
