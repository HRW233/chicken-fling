import type { AimAssist } from '../save/Save';

export interface UiActions {
  play(): void;
  openWorlds(): void;
  openLevels(world: number): void;
  openOptions(): void;
  openCredits(): void;
  back(): void;
  startLevel(id: string): void;
  resume(): void;
  restart(): void;
  quitToLevels(): void;
  nextLevel(): void;
  setVolume(key: 'masterVolume' | 'musicVolume' | 'sfxVolume', value: number): void;
  setToggle(key: 'screenShake' | 'reducedMotion' | 'highContrast' | 'showStarsOnHud', value: boolean): void;
  setAimAssist(value: AimAssist): void;
  resetProgress(): void;
  switchWorld(world: number): void;
}
