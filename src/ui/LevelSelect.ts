import { LEVELS_BY_WORLD } from '../data/levels';
import type { Level } from '../data/types';
import { WORLDS, worldDef } from '../data/worlds';
import type { SaveV1 } from '../save/Save';
import type { UiActions } from './actions';
import { drawLevelsHeader, isWorldUnlocked } from './Screens';
import { roundRect, starRow, text, Ui } from './widgets';

export const LEVEL_VIEW = { x: 40, y: 148, w: 1200, h: 494 };
const NODE_W = 258;
const NODE_H = 140;
const GAP_X = 34;
const GAP_Y = 26;
const COLS = 4;
const ROWS = 8;

export function levelContentHeight(): number {
  return ROWS * (NODE_H + GAP_Y) - GAP_Y;
}

export function maxLevelScroll(): number {
  return Math.max(0, levelContentHeight() - LEVEL_VIEW.h);
}

export function levelSelectScrollFor(id: string): number {
  const level = (LEVELS_BY_WORLD[Number(id[1])] ?? []).find((l) => l.id === id);
  if (!level) return 0;
  const row = Math.floor((level.index - 1) / COLS);
  const y = row * (NODE_H + GAP_Y);
  return Math.max(0, Math.min(maxLevelScroll(), y - LEVEL_VIEW.h / 2 + NODE_H / 2));
}

export function isLevelUnlocked(level: Level, save: SaveV1): boolean {
  if (level.world === 1 && level.index === 1) return true;
  if (level.index === 1) {
    const prev = save.levels[`w${level.world - 1}-27`];
    return (prev?.stars ?? 0) > 0;
  }
  const prevId = `w${level.world}-${String(level.index - 1).padStart(2, '0')}`;
  return (save.levels[prevId]?.stars ?? 0) > 0;
}

export function drawLevelSelect(
  ctx: CanvasRenderingContext2D,
  ui: Ui,
  save: SaveV1,
  worldId: number,
  scroll: number,
  actions: UiActions,
): void {
  const world = worldDef(worldId);
  const levels = LEVELS_BY_WORLD[worldId] ?? [];
  const g = ctx.createLinearGradient(0, 0, 0, 720);
  g.addColorStop(0, world.skyTop);
  g.addColorStop(0.55, world.mid);
  g.addColorStop(1, world.groundDark);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1280, 720);
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = world.accent;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.ellipse(120 + i * 170, 120 + (i % 3) * 60, 90, 28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.9;
  roundRect(ctx, 0, 0, 1280, 120, 0);
  ctx.fillStyle = 'rgba(20,10,4,0.55)';
  ctx.fill();
  ctx.restore();

  drawLevelsHeader(ctx, ui, actions, worldId, save);

  // World tabs
  const tabW = 178;
  const tabGap = 12;
  const tabsW = WORLDS.length * tabW + (WORLDS.length - 1) * tabGap;
  const tabStart = (1280 - tabsW) / 2;
  for (let i = 0; i < WORLDS.length; i++) {
    const w = WORLDS[i];
    const x = tabStart + i * (tabW + tabGap);
    const active = w.id === worldId;
    const unlocked = isWorldUnlocked(w.id, save);
    ctx.save();
    roundRect(ctx, x, 86, tabW, 44, 12);
    ctx.fillStyle = active ? '#F0A63C' : 'rgba(20,10,4,0.5)';
    ctx.fill();
    ctx.strokeStyle = active ? '#FFE9A8' : 'rgba(226,192,122,0.5)';
    ctx.lineWidth = active ? 3 : 1.5;
    ctx.stroke();
    ctx.restore();
    text(ctx, `${w.id} · ${unlocked ? w.name.split(' ')[0] : 'LOCKED'}`, x + tabW / 2, 109, 16, unlocked ? '#FFF6DF' : 'rgba(255,241,206,0.45)', 'center', 700);
    if (unlocked) {
      ui.add({ x, y: 86, w: tabW, h: 44, action: () => actions.switchWorld(w.id) });
    }
  }

  // Level grid viewport
  ctx.save();
  ctx.beginPath();
  ctx.rect(LEVEL_VIEW.x, LEVEL_VIEW.y, LEVEL_VIEW.w, LEVEL_VIEW.h);
  ctx.clip();
  ctx.translate(0, -scroll);

  // Winding path decoration
  ctx.save();
  ctx.strokeStyle = 'rgba(255,246,223,0.22)';
  ctx.lineWidth = 5;
  ctx.setLineDash([12, 14]);
  ctx.beginPath();
  for (let i = 0; i < levels.length; i++) {
    const pos = nodePos(i);
    const px = LEVEL_VIEW.x + pos.x + NODE_W / 2;
    const py = LEVEL_VIEW.y + pos.y + NODE_H / 2;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const rec = save.levels[level.id];
    const stars = rec?.stars ?? 0;
    const unlocked = isLevelUnlocked(level, save);
    const boss = level.index === 29;
    const pos = nodePos(i);
    const x = LEVEL_VIEW.x + pos.x;
    const y = LEVEL_VIEW.y + pos.y;

    ctx.save();
    roundRect(ctx, x, y, NODE_W, NODE_H, 16);
    const fill = ctx.createLinearGradient(0, y, 0, y + NODE_H);
    if (stars > 0) {
      fill.addColorStop(0, '#5C8C3A');
      fill.addColorStop(1, '#3C5F24');
    } else if (!unlocked) {
      fill.addColorStop(0, 'rgba(38,24,12,0.65)');
      fill.addColorStop(1, 'rgba(24,15,7,0.65)');
    } else {
      fill.addColorStop(0, '#8A5A2E');
      fill.addColorStop(1, '#5C3A1C');
    }
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = unlocked ? 3 : 2;
    ctx.strokeStyle = boss ? '#FFD166' : unlocked ? '#E2C07A' : 'rgba(139,115,85,0.5)';
    ctx.stroke();
    ctx.restore();

    text(ctx, `${level.world}-${level.index}`, x + 20, y + 40, 30, unlocked ? '#FFF6DF' : 'rgba(255,246,223,0.4)', 'left', 900);
    text(
      ctx,
      level.name.length > 24 ? `${level.name.slice(0, 23)}…` : level.name,
      x + 20,
      y + 74,
      15,
      unlocked ? 'rgba(255,246,223,0.85)' : 'rgba(255,246,223,0.35)',
      'left',
      600,
    );

    if (unlocked) {
      starRow(ctx, x + 34, y + 106, stars, 13, 30);
      if (rec && rec.bestScore > 0) {
        text(ctx, `BEST ${rec.bestScore.toLocaleString()}`, x + NODE_W - 16, y + 106, 12, 'rgba(255,246,223,0.7)', 'right', 600);
      }
      ui.add({
        x,
        y,
        w: NODE_W,
        h: NODE_H,
        action: () => actions.startLevel(level.id),
      });
    } else {
      text(ctx, 'LOCKED', x + 20, y + 108, 14, 'rgba(255,241,206,0.45)', 'left', 700);
      // Padlock
      ctx.save();
      ctx.translate(x + NODE_W - 42, y + 40);
      ctx.fillStyle = 'rgba(226,192,122,0.5)';
      roundRect(ctx, -12, -4, 24, 22, 5);
      ctx.fill();
      ctx.strokeStyle = 'rgba(226,192,122,0.7)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, -5, 8, Math.PI, 0);
      ctx.stroke();
      ctx.restore();
    }

    if (level.pickups.length > 0) {
      ctx.save();
      ctx.translate(x + NODE_W - 30, y + 106);
      ctx.fillStyle = rec?.goldenEgg ? '#7BC950' : '#F7C948';
      ctx.strokeStyle = '#8A6A16';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    if (boss) {
      text(ctx, 'BOSS', x + NODE_W - 18, y + 40, 12, '#FFD166', 'right', 800);
    }
  }
  ctx.restore();

  // Scroll indicators
  if (scroll > 2) text(ctx, '▲', 1244, LEVEL_VIEW.y + 20, 18, 'rgba(255,246,223,0.7)', 'center', 700);
  if (scroll < maxLevelScroll() - 2) text(ctx, '▼', 1244, LEVEL_VIEW.y + LEVEL_VIEW.h - 20, 18, 'rgba(255,246,223,0.7)', 'center', 700);

  // Fade the viewport edges so scrolled content doesn't collide with the chrome.
  ctx.save();
  const topFade = ctx.createLinearGradient(0, LEVEL_VIEW.y, 0, LEVEL_VIEW.y + 26);
  topFade.addColorStop(0, world.mid);
  topFade.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topFade;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(LEVEL_VIEW.x, LEVEL_VIEW.y, LEVEL_VIEW.w, 26);
  ctx.restore();
}

function nodePos(index: number): { x: number; y: number } {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  const rowOffset = row % 2 === 1 ? 22 : 0;
  return {
    x: col * (NODE_W + GAP_X) + rowOffset,
    y: row * (NODE_H + GAP_Y),
  };
}
