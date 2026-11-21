import type { ChickenId } from '../data/types';

export type AimAssist = 'full' | 'short' | 'off';

export interface LevelRecord {
  stars: 0 | 1 | 2 | 3;
  bestScore: number;
  bestTimeSec: number;
  goldenEgg: boolean;
}

export interface Settings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  screenShake: boolean;
  aimAssist: AimAssist;
  reducedMotion: boolean;
  highContrast: boolean;
  showStarsOnHud: boolean;
}

export interface SaveV1 {
  version: 1;
  levels: Record<string, LevelRecord>;
  totalStars: number;
  settings: Settings;
  cosmetics: { unlocked: string[]; equipped: string | null };
  lastPlayed: string | null;
  seenTutorial: boolean;
}

const KEY = 'chicken-fling-save-v1';

export function defaultSettings(): Settings {
  return {
    masterVolume: 0.8,
    musicVolume: 0.5,
    sfxVolume: 0.85,
    screenShake: true,
    aimAssist: 'full',
    reducedMotion: false,
    highContrast: false,
    showStarsOnHud: true,
  };
}

export function defaultSave(): SaveV1 {
  return {
    version: 1,
    levels: {},
    totalStars: 0,
    settings: defaultSettings(),
    cosmetics: { unlocked: [], equipped: null },
    lastPlayed: null,
    seenTutorial: false,
  };
}

function num(v: unknown, fallback: number, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

/** Normalise anything found in storage into a valid SaveV1. */
function coerce(raw: unknown): SaveV1 {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object') return base;
  const src = raw as Record<string, unknown>;
  const levelsRaw = src.levels;
  if (levelsRaw && typeof levelsRaw === 'object') {
    for (const [id, rec] of Object.entries(levelsRaw as Record<string, unknown>)) {
      if (!/^w[1-5]-\d{2}$/.test(id) || !rec || typeof rec !== 'object') continue;
      const r = rec as Record<string, unknown>;
      const stars = num(r.stars, 0, 0, 3) as 0 | 1 | 2 | 3;
      base.levels[id] = {
        stars: Math.round(stars) as 0 | 1 | 2 | 3,
        bestScore: Math.round(num(r.bestScore, 0, 0, 10_000_000)),
        bestTimeSec: num(r.bestTimeSec, 0, 0, 100_000),
        goldenEgg: bool(r.goldenEgg, false),
      };
    }
  }
  const s = src.settings;
  if (s && typeof s === 'object') {
    const st = s as Record<string, unknown>;
    base.settings = {
      masterVolume: num(st.masterVolume, 0.8, 0, 1),
      musicVolume: num(st.musicVolume, 0.5, 0, 1),
      sfxVolume: num(st.sfxVolume, 0.85, 0, 1),
      screenShake: bool(st.screenShake, true),
      aimAssist: st.aimAssist === 'short' || st.aimAssist === 'off' ? st.aimAssist : 'full',
      reducedMotion: bool(st.reducedMotion, false),
      highContrast: bool(st.highContrast, false),
      showStarsOnHud: bool(st.showStarsOnHud, true),
    };
  }
  const c = src.cosmetics;
  if (c && typeof c === 'object') {
    const cc = c as Record<string, unknown>;
    if (Array.isArray(cc.unlocked)) {
      base.cosmetics.unlocked = cc.unlocked.filter((x): x is string => typeof x === 'string').slice(0, 50);
    }
    base.cosmetics.equipped = typeof cc.equipped === 'string' ? cc.equipped : null;
  }
  base.lastPlayed = typeof src.lastPlayed === 'string' ? src.lastPlayed : null;
  base.seenTutorial = bool(src.seenTutorial, false);
  base.totalStars = Object.values(base.levels).reduce((sum, r) => sum + r.stars, 0);
  return base;
}

export class SaveStore {
  data: SaveV1 = defaultSave();
  private timer: number | null = null;

  constructor() {
    this.load();
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') this.flush();
      });
      window.addEventListener('pagehide', () => this.flush());
    }
  }

  load(): SaveV1 {
    try {
      const text = localStorage.getItem(KEY);
      if (!text) {
        this.data = defaultSave();
        return this.data;
      }
      const parsed: unknown = JSON.parse(text);
      this.data = coerce(parsed);
      const version = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>).version : 1;
      if (version !== 1) {
        // Migrate forward: unknown versions are normalised by coerce() and re-saved.
        console.info(`[chicken-fling] migrated save from version ${String(version)}`);
        this.writeNow();
      }
    } catch (err) {
      console.warn('[chicken-fling] couldn’t read save; starting fresh', err);
      this.data = defaultSave();
    }
    return this.data;
  }

  /** Debounced write (250 ms) so rapid changes don't thrash storage. */
  save(): void {
    if (this.timer !== null) return;
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.writeNow();
    }, 250);
  }

  flush(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.writeNow();
  }

  private writeNow(): void {
    try {
      this.data.totalStars = Object.values(this.data.levels).reduce((sum, r) => sum + r.stars, 0);
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (err) {
      console.warn('[chicken-fling] couldn’t write save', err);
    }
  }

  record(id: string, stars: number, score: number, timeSec: number, egg: boolean): LevelRecord {
    const prev = this.data.levels[id];
    const next: LevelRecord = {
      stars: (Math.max(prev?.stars ?? 0, stars) as 0 | 1 | 2 | 3) || (0 as const),
      bestScore: Math.max(prev?.bestScore ?? 0, score),
      bestTimeSec: prev && prev.bestTimeSec > 0 ? Math.min(prev.bestTimeSec, timeSec) : timeSec,
      goldenEgg: Boolean(prev?.goldenEgg) || egg,
    };
    this.data.levels[id] = next;
    this.data.totalStars = Object.values(this.data.levels).reduce((sum, r) => sum + r.stars, 0);
    this.save();
    return next;
  }

  resetProgress(): void {
    this.data.levels = {};
    this.data.totalStars = 0;
    this.data.cosmetics = { unlocked: [], equipped: null };
    this.data.lastPlayed = null;
    this.data.seenTutorial = false;
    this.save();
  }
}

export function starsFor(score: number, cleared: boolean, unusedChickens: number, queueLength: number, starScore: readonly number[]): number {
  if (!cleared) return 0;
  let stars = 1;
  if (score >= starScore[1]) stars = 2;
  // The brief's third star requires a spare chicken; a one-chicken "scarcity"
  // level is exempt so 3 stars stays attainable (documented in DECISIONS.md).
  const spare = unusedChickens >= 1 || queueLength === 1;
  if (spare && score >= starScore[2]) stars = 3;
  return stars;
}

export function chickenUnlockLevel(id: ChickenId): string {
  switch (id) {
    case 'cluck':
      return '1-1';
    case 'speckle':
      return '1-4';
    case 'drumstick':
      return '1-11';
    case 'puff':
      return '2-6';
    case 'nugget':
      return '2-15';
    case 'bantam':
      return '3-9';
    case 'snowbell':
      return '3-20';
    case 'pepper':
      return '4-2';
    case 'mother':
      return '4-18';
    default:
      return '1-1';
  }
}
