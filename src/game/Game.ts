import { ALL_LEVELS, findLevel } from '../data/levels';
import type { ChickenId, Level } from '../data/types';
import { worldDef } from '../data/worlds';
import { GameAudio } from '../audio/Audio';
import { Input } from '../core/input';
import { Loop } from '../core/loop';
import { clamp } from '../core/rng';
import { Particles } from '../render/Particles';
import { Renderer } from '../render/Renderer';
import { SaveStore, type AimAssist, type Settings } from '../save/Save';
import { drawHud } from '../ui/Hud';
import {
  drawComplete,
  drawCredits,
  drawFailed,
  drawPause,
  drawTitle,
  drawWorlds,
} from '../ui/Screens';
import {
  drawLevelSelect,
  isLevelUnlocked,
  levelSelectScrollFor,
  maxLevelScroll,
} from '../ui/LevelSelect';
import { drawOptions } from '../ui/Options';
import { Ui, type Hit } from '../ui/widgets';
import type { UiActions } from '../ui/actions';
import { Camera } from './Camera';
import { Cannon } from './Cannon';
import { LevelRuntime, type LevelResult } from './LevelRuntime';
import type { Fx, SoundName, SoundOpts, BurstKind, BurstOpts } from './fx';

type Screen = 'title' | 'worlds' | 'levels' | 'options' | 'credits' | 'play' | 'pause' | 'complete' | 'failed';

export class Game {
  private readonly input: Input;
  private readonly loop: Loop;
  private readonly renderer: Renderer;
  private readonly particles: Particles;
  private readonly audio: GameAudio;
  private readonly saveStore: SaveStore;
  private readonly ui = new Ui();
  private readonly camera = new Camera();
  private readonly actions: UiActions;
  private readonly fx: Fx;

  private screen: Screen = 'title';
  private selectedWorld = 1;
  private levelScroll = 0;
  private levelPending: { hit: Hit; x: number; y: number; moved: boolean; scroll: number } | null = null;
  private dragHit: Hit | null = null;

  private runtime: LevelRuntime | null = null;
  private cannon: Cannon | null = null;
  private levelResult: LevelResult | null = null;
  private newBest = false;
  private aiming = false;

  private optionsReturn: Screen = 'title';
  private resetArmedAt = 0;
  private completeStartedAt = 0;
  private completeStarStage = 0;
  private failedStartedAt = 0;
  private slowTimer = 0;
  private audioTouched = false;
  private lastVolume = 0.8;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.particles = new Particles();
    this.renderer = new Renderer(canvas, this.particles);
    this.saveStore = new SaveStore();
    this.audio = new GameAudio(() => this.saveStore.data.settings);
    this.input = new Input(canvas, (cx, cy) => this.renderer.toDesign(cx, cy));
    this.actions = this.buildActions();
    this.fx = this.buildFx();

    this.camera.reducedMotion = this.saveStore.data.settings.reducedMotion;
    this.lastVolume = this.saveStore.data.settings.masterVolume || 0.8;
    this.audio.applyVolumes();

    this.loop = new Loop(
      (dt, real) => this.update(dt, real),
      () => this.render(),
    );

    window.addEventListener('resize', () => this.renderer.resize());
    window.addEventListener('orientationchange', () => this.renderer.resize());
    window.addEventListener('blur', () => {
      if (this.screen === 'play') this.pause();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.screen === 'play') this.pause();
    });

    this.renderer.backgrounds.update(0, worldDef(1));
    this.loop.start();
  }

  /** Level currently being played, if any. */
  get currentLevel(): Level | null {
    return this.runtime?.level ?? null;
  }

  private buildFx(): Fx {
    return {
      burst: (kind: BurstKind, x: number, y: number, opts?: BurstOpts) => this.particles.burst(kind, x, y, opts),
      sound: (name: SoundName, opts?: SoundOpts) => this.audio.play(name, opts),
      shake: (amount: number) => this.camera.shake(amount),
      slowMo: (seconds: number) => {
        if (seconds > 0 && !this.saveStore.data.settings.reducedMotion) {
          this.slowTimer = Math.max(this.slowTimer, seconds);
        }
      },
    };
  }

  private buildActions(): UiActions {
    return {
      play: () => this.startLevel(this.continueLevel()),
      openWorlds: () => {
        this.click();
        this.screen = 'worlds';
      },
      openLevels: (world) => {
        this.click();
        this.selectedWorld = world;
        this.levelScroll = this.firstUnclearedScroll(world);
        this.screen = 'levels';
        this.audio.startMusic(world);
      },
      openOptions: () => {
        this.click();
        this.optionsReturn = this.screen === 'pause' ? 'pause' : this.screen === 'play' ? 'pause' : 'title';
        this.resetArmedAt = 0;
        this.screen = 'options';
      },
      openCredits: () => {
        this.click();
        this.screen = 'credits';
      },
      back: () => this.back(),
      startLevel: (id) => this.startLevel(id),
      resume: () => this.resume(),
      restart: () => this.restart(),
      quitToLevels: () => this.quitToLevels(),
      nextLevel: () => this.nextLevel(),
      setVolume: (key, value) => {
        this.saveStore.data.settings[key] = value;
        if (key === 'masterVolume' && value > 0) this.lastVolume = value;
        this.afterSettingsChange();
      },
      setToggle: (key, value) => {
        this.saveStore.data.settings[key] = value;
        this.afterSettingsChange();
      },
      setAimAssist: (value: AimAssist) => {
        this.saveStore.data.settings.aimAssist = value;
        this.click();
        this.afterSettingsChange();
      },
      resetProgress: () => this.resetProgress(),
      switchWorld: (world) => {
        this.click();
        this.selectedWorld = world;
        this.levelScroll = this.firstUnclearedScroll(world);
        this.audio.startMusic(world);
      },
    };
  }

  private click(): void {
    this.audio.play('click', { volume: 0.6 });
  }

  private update(dt: number, realDt: number): void {
    if (this.slowTimer > 0) {
      this.slowTimer = Math.max(0, this.slowTimer - realDt);
      this.loop.timeScale = this.saveStore.data.settings.reducedMotion ? 1 : 0.25;
    } else {
      this.loop.timeScale = 1;
    }

    this.particles.update(dt);
    this.renderer.backgrounds.update(dt, worldDef(this.currentWorldId()));

    if (this.screen === 'play' && this.runtime && this.cannon) {
      if (this.aiming && this.input.pointer.down && this.runtime.state === 'aiming') {
        this.cannon.aimAt(this.input.pointer.x, this.input.pointer.y);
      }
      this.cannon.update(dt);
      this.runtime.step(dt);
      this.syncCannonLoaded();
      this.audio.setCharge(this.cannon.isCharging, this.cannon.charge);
      const active = this.runtime.activeChicken;
      const focus = this.runtime.isFlying && active?.bodies[0] ? active.bodies[0].position.x : this.runtime.cannonPivot.x;
      this.camera.follow(focus, dt, this.runtime.level.worldWidth ?? 1280);

      if (this.runtime.state === 'won') this.onWin();
      else if (this.runtime.state === 'lost') this.onLose();
    }

    if (this.screen === 'complete') {
      const elapsed = (performance.now() - this.completeStartedAt) / 1000;
      const stars = this.levelResult?.stars ?? 0;
      while (this.completeStarStage < stars && elapsed > 0.34 + this.completeStarStage * 0.34) {
        this.audio.play('star', { pitch: 1 + this.completeStarStage * 0.25 });
        this.completeStarStage += 1;
      }
    }
  }

  private render(): void {
    this.handleInput();
    this.ui.begin();
    const ctx = this.renderer.begin();
    const time = performance.now() / 1000;

    switch (this.screen) {
      case 'title':
        drawTitle(ctx, this.ui, this.saveStore.data, this.actions, time, this.continueLabel());
        break;
      case 'worlds':
        drawWorlds(ctx, this.ui, this.saveStore.data, this.actions, time);
        break;
      case 'levels':
        drawLevelSelect(ctx, this.ui, this.saveStore.data, this.selectedWorld, this.levelScroll, this.actions);
        break;
      case 'options':
        drawOptions(
          ctx,
          this.ui,
          this.saveStore.data,
          this.actions,
          performance.now() - this.resetArmedAt < 3000 && this.resetArmedAt > 0,
          time,
        );
        break;
      case 'credits':
        drawCredits(ctx, this.ui, this.actions, time);
        break;
      case 'play':
        this.drawGame(ctx);
        break;
      case 'pause':
        this.drawGame(ctx);
        if (this.runtime) drawPause(ctx, this.ui, this.actions, this.runtime.level);
        break;
      case 'complete':
        this.drawGame(ctx);
        if (this.runtime && this.levelResult) {
          drawComplete(
            ctx,
            this.ui,
            this.levelResult,
            this.runtime.level,
            (performance.now() - this.completeStartedAt) / 1000,
            this.actions,
            this.hasNext(),
            this.newBest,
          );
        }
        break;
      case 'failed':
        this.drawGame(ctx);
        if (this.runtime) {
          drawFailed(ctx, this.ui, this.runtime.level, this.actions, (performance.now() - this.failedStartedAt) / 1000);
        }
        break;
      default:
        break;
    }

    this.input.endFrame();
  }

  private drawGame(ctx: CanvasRenderingContext2D): void {
    if (!this.runtime || !this.cannon) {
      ctx.fillStyle = '#1B1008';
      ctx.fillRect(0, 0, 1280, 720);
      return;
    }
    const active = this.runtime.activeChicken;
    const showHint = Boolean(
      this.runtime.isFlying &&
        active &&
        !active.abilityUsed &&
        active.def.ability !== 'none' &&
        this.runtime.shots <= 2,
    );
    this.renderer.drawPlay(
      this.runtime,
      this.cannon,
      this.camera,
      this.saveStore.data.settings,
      performance.now() / 1000,
      showHint,
    );
    drawHud(ctx, this.ui, this.runtime, this.saveStore.data, () => this.pause());
  }

  private handleInput(): void {
    const pointer = this.input.pointer;
    const keys = this.input.drainKeys();

    if ((pointer.justDown || keys.length > 0) && !this.audioTouched) {
      this.audioTouched = true;
      this.audio.unlock();
      this.audio.applyVolumes();
      this.audio.startMusic(this.currentWorldId());
    }

    for (const key of keys) {
      if (key === 'KeyM') this.toggleMute();
      if (key === 'Escape' || key === 'KeyP') this.togglePause();
      if (key === 'KeyR' && (this.screen === 'play' || this.screen === 'pause' || this.screen === 'failed' || this.screen === 'complete')) {
        this.restart();
      }
      if (key === 'KeyN' && this.screen === 'complete') this.nextLevel();
      if (key === 'Space' && this.screen === 'play') this.runtime?.useAbility();
      if ((key === 'ArrowDown' || key === 'ArrowUp') && this.screen === 'levels') {
        this.levelScroll = clamp(this.levelScroll + (key === 'ArrowDown' ? 120 : -120), 0, maxLevelScroll());
      }
    }

    if (this.screen === 'levels') {
      const wheel = this.input.drainWheel();
      if (wheel !== 0) this.levelScroll = clamp(this.levelScroll + wheel * 0.8, 0, maxLevelScroll());
    } else {
      this.input.drainWheel();
    }

    if (pointer.justDown) this.onPointerDown(pointer.x, pointer.y);
    if (pointer.down) this.onPointerDrag(pointer.x, pointer.y);
    if (pointer.justUp) this.onPointerUp(pointer.x, pointer.y);
  }

  private onPointerDown(x: number, y: number): void {
    switch (this.screen) {
      case 'play': {
        if (!this.runtime || !this.cannon) return;
        const pauseHit = this.ui.hitTest(x, y);
        if (pauseHit) {
          pauseHit.action(x, y);
          return;
        }
        if (this.runtime.useAbility()) return;
        if (this.runtime.state === 'aiming' && this.runtime.loaded) {
          this.cannon.begin(x, y);
          this.aiming = true;
          this.audio.play('rotate', { volume: 0.4 });
        }
        break;
      }
      case 'levels': {
        const hit = this.ui.hitTest(x, y);
        this.levelPending = { hit: hit ?? ({ x: 0, y: 0, w: 0, h: 0, action: () => undefined } as Hit), x, y, moved: false, scroll: this.levelScroll };
        break;
      }
      case 'options': {
        const hit = this.ui.hitTest(x, y);
        if (hit) {
          hit.action(x, y);
          if (hit.drag) this.dragHit = hit;
        }
        break;
      }
      default: {
        const hit = this.ui.hitTest(x, y);
        if (hit) hit.action(x, y);
        break;
      }
    }
  }

  private onPointerDrag(x: number, y: number): void {
    if (this.screen === 'play') {
      return;
    }
    if (this.screen === 'levels' && this.levelPending) {
      const dy = y - this.levelPending.y;
      const dx = x - this.levelPending.x;
      if (Math.abs(dy) > 10 || Math.abs(dx) > 10) {
        this.levelPending.moved = true;
        this.levelScroll = clamp(this.levelPending.scroll - dy, 0, maxLevelScroll());
      }
    } else if (this.screen === 'options' && this.dragHit) {
      this.dragHit.action(x, y);
    }
  }

  private onPointerUp(x: number, y: number): void {
    if (this.screen === 'play') {
      if (this.aiming && this.cannon && this.runtime) {
        const shot = this.cannon.release();
        this.aiming = false;
        if (shot) {
          this.runtime.fire(shot.angle, shot.power);
          this.audio.setCharge(false, 0);
        }
      }
      return;
    }
    if (this.screen === 'levels') {
      const pending = this.levelPending;
      this.levelPending = null;
      if (pending && !pending.moved) {
        const hit = this.ui.hitTest(x, y);
        if (hit && hit.action === pending.hit.action) hit.action(x, y);
      }
      return;
    }
    this.dragHit = null;
  }

  private pause(): void {
    if (this.screen !== 'play') return;
    this.screen = 'pause';
    this.aiming = false;
    this.cannon?.cancelCharge();
    this.audio.setCharge(false, 0);
  }

  private resume(): void {
    if (this.screen !== 'pause') return;
    this.screen = 'play';
    this.click();
  }

  private togglePause(): void {
    if (this.screen === 'play') this.pause();
    else if (this.screen === 'pause') this.resume();
  }

  private restart(): void {
    if (!this.runtime) return;
    const id = this.runtime.level.id;
    this.startLevel(id);
  }

  private quitToLevels(): void {
    this.click();
    this.audio.setCharge(false, 0);
    const world = this.runtime?.level.world ?? this.selectedWorld;
    if (this.runtime) this.runtime.dispose();
    this.runtime = null;
    this.cannon = null;
    this.levelResult = null;
    this.selectedWorld = world;
    this.levelScroll = clamp(levelSelectScrollFor(this.continueLevel()), 0, maxLevelScroll());
    this.screen = 'levels';
    this.audio.startMusic(world);
  }

  private nextLevel(): void {
    if (!this.runtime) {
      this.quitToLevels();
      return;
    }
    const index = ALL_LEVELS.findIndex((l) => l.id === this.runtime?.level.id);
    if (index >= 0 && index + 1 < ALL_LEVELS.length) {
      this.startLevel(ALL_LEVELS[index + 1].id);
    } else {
      this.quitToLevels();
    }
  }

  private hasNext(): boolean {
    if (!this.runtime) return false;
    const index = ALL_LEVELS.findIndex((l) => l.id === this.runtime?.level.id);
    return index >= 0 && index + 1 < ALL_LEVELS.length;
  }

  private back(): void {
    this.click();
    if (this.screen === 'options') {
      this.screen = this.optionsReturn;
      this.resetArmedAt = 0;
      return;
    }
    if (this.screen === 'credits') {
      this.screen = 'title';
      return;
    }
    if (this.screen === 'levels') {
      this.screen = 'worlds';
      return;
    }
    if (this.screen === 'worlds') {
      this.screen = 'title';
      return;
    }
    this.screen = 'title';
  }

  private startLevel(id: string): void {
    const level = findLevel(id);
    if (!level) return;
    if (this.runtime) this.runtime.dispose();
    this.audio.setCharge(false, 0);
    this.runtime = new LevelRuntime(level, this.fx);
    this.cannon = new Cannon(level.cannon);
    this.cannon.setLoaded(this.runtime.loaded);
    this.camera.reset();
    this.camera.reducedMotion = this.saveStore.data.settings.reducedMotion;
    this.particles.clear();
    this.levelResult = null;
    this.newBest = false;
    this.completeStarStage = 0;
    this.slowTimer = 0;
    this.aiming = false;
    this.screen = 'play';
    this.selectedWorld = level.world;
    this.saveStore.data.lastPlayed = id;
    this.saveStore.save();
    this.audio.startMusic(level.world);
    this.renderer.backgrounds.update(0, worldDef(level.world));
  }

  private onWin(): void {
    if (!this.runtime || this.screen !== 'play') return;
    const result = this.runtime.getResult();
    const prev = this.saveStore.data.levels[this.runtime.level.id];
    this.newBest = result.score > (prev?.bestScore ?? 0);
    this.saveStore.record(this.runtime.level.id, result.stars, result.score, result.timeSec, result.goldenEgg);
    this.saveStore.data.seenTutorial = true;
    this.saveStore.save();
    this.levelResult = result;
    this.completeStartedAt = performance.now();
    this.completeStarStage = 0;
    this.screen = 'complete';
    this.audio.setCharge(false, 0);
    this.aiming = false;
    this.slowTimer = 0;
    this.loop.timeScale = 1;
  }

  private onLose(): void {
    if (!this.runtime || this.screen !== 'play') return;
    this.levelResult = this.runtime.getResult();
    this.failedStartedAt = performance.now();
    this.screen = 'failed';
    this.audio.setCharge(false, 0);
    this.aiming = false;
  }

  private resetProgress(): void {
    const now = performance.now();
    if (this.resetArmedAt > 0 && now - this.resetArmedAt < 3000) {
      this.saveStore.resetProgress();
      this.resetArmedAt = 0;
      this.audio.play('unlock', { pitch: 0.7 });
    } else {
      this.resetArmedAt = now;
      this.click();
    }
  }

  private toggleMute(): void {
    const s = this.saveStore.data.settings;
    if (s.masterVolume > 0) {
      this.lastVolume = s.masterVolume;
      s.masterVolume = 0;
    } else {
      s.masterVolume = this.lastVolume || 0.8;
    }
    this.afterSettingsChange();
  }

  private afterSettingsChange(): void {
    this.camera.reducedMotion = this.saveStore.data.settings.reducedMotion;
    this.audio.applyVolumes();
    this.saveStore.save();
  }

  private syncCannonLoaded(): void {
    if (!this.runtime || !this.cannon) return;
    if (this.cannon.loaded !== this.runtime.loaded) {
      this.cannon.setLoaded(this.runtime.loaded);
      if (this.runtime.loaded) this.audio.play('reload', { volume: 0.5 });
    }
  }

  private currentWorldId(): number {
    return this.runtime?.level.world ?? this.selectedWorld ?? 1;
  }

  private firstUnclearedScroll(world: number): number {
    const levels = ALL_LEVELS.filter((l) => l.world === world);
    const target = levels.find((l) => isLevelUnlocked(l, this.saveStore.data) && (this.saveStore.data.levels[l.id]?.stars ?? 0) === 0) ?? levels[0];
    return target ? levelSelectScrollFor(target.id) : 0;
  }

  private continueLevel(): string {
    const lastId = this.saveStore.data.lastPlayed;
    const last = lastId ? findLevel(lastId) : undefined;
    if (last && isLevelUnlocked(last, this.saveStore.data)) return last.id;
    for (const level of ALL_LEVELS) {
      if (isLevelUnlocked(level, this.saveStore.data) && (this.saveStore.data.levels[level.id]?.stars ?? 0) === 0) {
        return level.id;
      }
    }
    for (let i = ALL_LEVELS.length - 1; i >= 0; i--) {
      if (isLevelUnlocked(ALL_LEVELS[i], this.saveStore.data)) return ALL_LEVELS[i].id;
    }
    return 'w1-01';
  }

  private continueLabel(): string {
    const id = this.continueLevel();
    const level = findLevel(id);
    if (!level) return 'Start flinging';
    const name = level.name.length > 16 ? `${level.name.slice(0, 15)}…` : level.name;
    return `Continue ${level.id.toUpperCase()} · ${name}`;
  }

  /** Exposed for QA harnesses; not used by gameplay. */
  get debugState(): { screen: Screen; levelId: string | null; shots: number } {
    return { screen: this.screen, levelId: this.runtime?.level.id ?? null, shots: this.runtime?.shots ?? 0 };
  }
}

export type { ChickenId, Settings };
