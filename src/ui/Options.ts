import type { AimAssist, SaveV1 } from '../save/Save';
import type { UiActions } from './actions';
import { drawMenuBackdrop } from './Screens';
import { text, Ui } from './widgets';

export function drawOptions(
  ctx: CanvasRenderingContext2D,
  ui: Ui,
  save: SaveV1,
  actions: UiActions,
  resetArmed: boolean,
  time: number,
): void {
  drawMenuBackdrop(ctx, time, '#7BC950');
  ui.panel(ctx, 190, 46, 900, 628);
  text(ctx, 'OPTIONS', 640, 104, 44, '#FFE9A8', 'center', 900);

  const s = save.settings;
  ui.slider(ctx, 250, 164, 780, 'Master volume', s.masterVolume, (v) => actions.setVolume('masterVolume', v));
  ui.slider(ctx, 250, 238, 780, 'Music volume', s.musicVolume, (v) => actions.setVolume('musicVolume', v));
  ui.slider(ctx, 250, 312, 780, 'Effects volume', s.sfxVolume, (v) => actions.setVolume('sfxVolume', v));

  text(ctx, 'AIM ASSIST', 260, 384, 15, '#C9A24A');
  const options: { id: AimAssist; label: string }[] = [
    { id: 'full', label: 'FULL' },
    { id: 'short', label: 'SHORT' },
    { id: 'off', label: 'OFF' },
  ];
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const x = 250 + i * 178;
    const active = s.aimAssist === opt.id;
    ui.button(ctx, x, 402, 160, 66, opt.label, () => actions.setAimAssist(opt.id), {
      variant: active ? 'primary' : 'ghost',
      size: 22,
    });
  }

  text(ctx, 'ACCESSIBILITY', 700, 384, 15, '#C9A24A');
  ui.toggle(ctx, 700, 398, 340, 46, 'Screen shake', s.screenShake, (v) => actions.setToggle('screenShake', v));
  ui.toggle(ctx, 700, 448, 340, 46, 'Reduced motion', s.reducedMotion, (v) => actions.setToggle('reducedMotion', v));
  ui.toggle(ctx, 700, 498, 340, 46, 'High contrast', s.highContrast, (v) => actions.setToggle('highContrast', v));
  ui.toggle(ctx, 700, 548, 340, 46, 'Stars on HUD', s.showStarsOnHud, (v) => actions.setToggle('showStarsOnHud', v));

  ui.button(ctx, 250, 500, 300, 76, resetArmed ? 'TAP AGAIN TO CONFIRM' : 'RESET PROGRESS', () => actions.resetProgress(), {
    variant: 'ghost',
    size: resetArmed ? 17 : 19,
    sub: resetArmed ? 'This clears every star and egg' : 'Asks twice. No accidents.',
  });
  ui.button(ctx, 250, 594, 300, 62, 'BACK', () => actions.back(), { variant: 'primary', size: 22 });

  text(ctx, 'Fixed 1/120 s physics · 60 fps target · all sound synthesised', 640, 644, 13, 'rgba(255,241,206,0.5)', 'center', 500);
}
