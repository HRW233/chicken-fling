import type { Settings } from '../save/Save';
import type { SoundName, SoundOpts } from '../game/fx';

const SILENT = 0.0001;

/** Fully synthesised audio: no files, no network, unlocked by the first gesture. */
export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private chargeNodes: { osc: OscillatorNode; gain: GainNode; noise: AudioBufferSourceNode; filter: BiquadFilterNode } | null = null;
  private voices = 0;
  private musicTimer: number | null = null;
  private musicWorld = 0;
  private musicStep = 0;
  private musicNext = 0;
  private musicBusy = false;
  private duckFactor = 1;

  constructor(private readonly getSettings: () => Settings) {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.visibilityState === 'hidden') {
          this.stopMusic();
          void this.ctx.suspend().catch(() => undefined);
        } else {
          void this.ctx.resume().catch(() => undefined);
          if (this.musicWorld > 0) this.startMusic(this.musicWorld);
        }
      });
    }
  }

  get unlocked(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
      return;
    }
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const master = ctx.createGain();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -12;
      compressor.knee.value = 20;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.18;
      master.connect(compressor);
      compressor.connect(ctx.destination);
      const musicBus = ctx.createGain();
      const sfxBus = ctx.createGain();
      musicBus.connect(master);
      sfxBus.connect(master);
      this.ctx = ctx;
      this.master = master;
      this.compressor = compressor;
      this.musicBus = musicBus;
      this.sfxBus = sfxBus;
      this.noiseBuffer = this.makeNoise(ctx);
      this.applyVolumes();
      void ctx.resume().catch(() => undefined);
    } catch {
      this.ctx = null;
    }
  }

  applyVolumes(): void {
    if (!this.ctx || !this.master || !this.musicBus || !this.sfxBus) return;
    const s = this.getSettings();
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(Math.max(SILENT, s.masterVolume), now, 0.03);
    this.musicBus.gain.setTargetAtTime(Math.max(SILENT, s.musicVolume * 0.9 * this.duckFactor), now, 0.05);
    this.sfxBus.gain.setTargetAtTime(Math.max(SILENT, s.sfxVolume), now, 0.03);
  }

  duck(active: boolean): void {
    if (!this.ctx || !this.musicBus) return;
    this.duckFactor = active ? 0.4 : 1;
    const target = Math.max(SILENT, this.getSettings().musicVolume * 0.9 * this.duckFactor);
    this.musicBus.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
  }

  play(name: SoundName, opts: SoundOpts = {}): void {
    const ctx = this.ctx;
    const bus = this.sfxBus;
    if (!ctx || !bus || ctx.state !== 'running') return;
    if (this.voices >= 12) return;
    const now = ctx.currentTime;
    const volume = opts.volume ?? 1;
    switch (name) {
      case 'cannon': {
        const power = opts.power ?? 0.7;
        this.noise(now, 0.22 + power * 0.1, 900 + power * 700, volume * 0.9);
        this.tone('sine', 120 + power * 40, 45, now, 0.18 + power * 0.12, volume * 0.8);
        this.tone('triangle', 320, 220, now + 0.02, 0.08, volume * 0.25);
        break;
      }
      case 'chargeStart':
      case 'chargeStop':
        break;
      case 'rotate':
        this.noise(now, 0.12, 700, volume * 0.12);
        break;
      case 'reload':
        this.tone('triangle', 260, 340, now, 0.1, volume * 0.35);
        this.noise(now + 0.06, 0.08, 1200, volume * 0.25);
        break;
      case 'crunchHay':
        this.noise(now, 0.16, 900, volume * 0.5);
        this.tone('sine', 180, 110, now, 0.1, volume * 0.25);
        break;
      case 'crunchWood':
        this.noise(now, 0.14, 1500, volume * 0.55);
        this.tone('triangle', 150, 90, now, 0.12, volume * 0.35);
        break;
      case 'crunchIce':
        this.noise(now, 0.2, 3600, volume * 0.45);
        for (let i = 0; i < 3; i++) this.tone('sine', 1800 + i * 420, 1600 + i * 380, now + i * 0.03, 0.18, volume * 0.18);
        break;
      case 'crunchStone':
        this.noise(now, 0.22, 500, volume * 0.65);
        this.tone('sine', 80, 48, now, 0.2, volume * 0.5);
        break;
      case 'crunchMetal':
        this.tone('triangle', 640, 620, now, 0.3, volume * 0.28);
        this.tone('triangle', 670, 650, now + 0.01, 0.26, volume * 0.22);
        this.noise(now, 0.1, 2600, volume * 0.25);
        break;
      case 'crunchCrystal':
        for (let i = 0; i < 4; i++) this.tone('sine', 1400 + i * 380, 1200 + i * 340, now + i * 0.02, 0.24, volume * 0.2);
        break;
      case 'squawk': {
        const pitch = (opts.pitch ?? 1) * 520;
        this.tone('triangle', pitch * 1.4, pitch * 0.75, now, 0.16, volume * 0.32);
        this.tone('square', pitch * 0.7, pitch * 0.55, now + 0.03, 0.1, volume * 0.12);
        break;
      }
      case 'abilityEgg':
        this.noise(now, 0.3, 2200, volume * 0.35);
        this.tone('sine', 600, 300, now, 0.2, volume * 0.2);
        break;
      case 'abilityDash':
        this.noise(now, 0.24, 2600, volume * 0.5);
        this.tone('sawtooth', 320, 900, now, 0.18, volume * 0.2);
        break;
      case 'abilityInflate':
        this.tone('sine', 180, 520, now, 0.22, volume * 0.3);
        this.noise(now, 0.18, 900, volume * 0.3);
        break;
      case 'abilitySplit':
        for (let i = 0; i < 3; i++) this.tone('triangle', 700 + i * 160, 900 + i * 160, now + i * 0.05, 0.1, volume * 0.2);
        break;
      case 'abilityPierce':
        this.tone('sawtooth', 220, 660, now, 0.25, volume * 0.25);
        this.noise(now, 0.2, 3200, volume * 0.25);
        break;
      case 'abilityFire':
        this.noise(now, 0.5, 700, volume * 0.6);
        this.tone('sine', 90, 40, now, 0.4, volume * 0.3);
        break;
      case 'abilityFreeze':
        for (let i = 0; i < 5; i++) this.tone('sine', 2000 + i * 300, 1700 + i * 240, now + i * 0.04, 0.3, volume * 0.16);
        break;
      case 'abilityMega':
        this.tone('sine', 90, 50, now, 0.4, volume * 0.4);
        this.noise(now, 0.4, 600, volume * 0.4);
        break;
      case 'weaselHit':
        this.tone('sine', 380 * (opts.pitch ?? 1), 200 * (opts.pitch ?? 1), now, 0.16, volume * 0.4);
        break;
      case 'weaselKo':
        this.tone('sine', 1200 * (opts.pitch ?? 1), 300 * (opts.pitch ?? 1), now, 0.5, volume * 0.28);
        this.tone('triangle', 220, 120, now + 0.4, 0.12, volume * 0.22);
        break;
      case 'boom':
        this.noise(now, 0.55, 420, volume * 0.8);
        this.tone('sine', 90, 35, now, 0.45, volume * 0.6);
        break;
      case 'balloon':
        this.noise(now, 0.06, 2800, volume * 0.5);
        this.tone('sine', 1400, 500, now, 0.1, volume * 0.2);
        break;
      case 'geyser':
        this.noise(now, 0.35, 1200, volume * 0.25);
        break;
      case 'lava':
        this.noise(now, 0.4, 400, volume * 0.5);
        break;
      case 'freeze':
        this.tone('sine', 1600, 2400, now, 0.3, volume * 0.2);
        break;
      case 'win': {
        const notes = [0, 4, 7, 12, 16];
        notes.forEach((n, i) => this.tone('triangle', freq(n), freq(n), now + i * 0.13, 0.34, volume * 0.28));
        break;
      }
      case 'fail': {
        const notes = [0, -3, -7];
        notes.forEach((n, i) => this.tone('triangle', freq(n + 12), freq(n + 12), now + i * 0.16, 0.3, volume * 0.22));
        break;
      }
      case 'star':
        this.tone('sine', 900 * (opts.pitch ?? 1), 1500 * (opts.pitch ?? 1), now, 0.18, volume * 0.3);
        break;
      case 'click':
        this.tone('triangle', 520, 480, now, 0.05, volume * 0.25);
        break;
      case 'unlock':
        this.tone('sine', 880, 1320, now, 0.4, volume * 0.3);
        this.tone('sine', 1320, 1760, now + 0.12, 0.4, volume * 0.24);
        break;
      default:
        break;
    }
  }

  setCharge(active: boolean, charge: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    if (!active) {
      if (this.chargeNodes) {
        const n = this.chargeNodes;
        this.chargeNodes = null;
        try {
          n.gain.gain.setTargetAtTime(SILENT, ctx.currentTime, 0.02);
          n.osc.stop(ctx.currentTime + 0.08);
          n.noise.stop(ctx.currentTime + 0.08);
        } catch {
          /* already stopped */
        }
      }
      return;
    }
    if (!this.chargeNodes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const noise = ctx.createBufferSource();
      osc.type = 'sawtooth';
      osc.frequency.value = 90;
      filter.type = 'bandpass';
      filter.frequency.value = 700;
      filter.Q.value = 0.8;
      noise.buffer = this.noiseBuffer;
      noise.loop = true;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.05;
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(gain);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      gain.gain.value = SILENT;
      osc.start();
      noise.start();
      this.chargeNodes = { osc, gain, noise, filter };
    }
    const n = this.chargeNodes;
    const now = ctx.currentTime;
    n.osc.frequency.setTargetAtTime(90 + charge * 260, now, 0.03);
    n.filter.frequency.setTargetAtTime(600 + charge * 1400, now, 0.03);
    const vol = this.getSettings().sfxVolume * 0.12 * Math.min(1, charge + 0.05);
    n.gain.gain.setTargetAtTime(Math.max(SILENT, vol), now, 0.03);
  }

  startMusic(world: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    if (this.musicWorld === world && this.musicTimer !== null) return;
    this.stopMusic(false);
    this.musicWorld = world;
    this.musicStep = 0;
    this.musicNext = ctx.currentTime + 0.08;
    this.musicBus.gain.cancelScheduledValues(ctx.currentTime);
    this.musicBus.gain.setValueAtTime(SILENT, ctx.currentTime);
    this.musicBus.gain.setTargetAtTime(Math.max(SILENT, this.getSettings().musicVolume * 0.9 * this.duckFactor), ctx.currentTime, 0.3);
    if (this.musicTimer === null) {
      this.musicTimer = window.setInterval(() => this.scheduleMusic(), 140);
    }
    this.scheduleMusic();
  }

  stopMusic(resetWorld = true): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.musicWorld > 0) {
      if (resetWorld) this.musicWorld = 0;
    }
  }

  private scheduleMusic(): void {
    const ctx = this.ctx;
    if (!ctx || this.musicBusy) return;
    this.musicBusy = true;
    try {
      const stepDur = 0.29;
      while (this.musicNext < ctx.currentTime + 0.4) {
        this.musicNote(this.musicStep, this.musicNext);
        this.musicStep = (this.musicStep + 1) % 32;
        this.musicNext += stepDur;
      }
    } finally {
      this.musicBusy = false;
    }
  }

  private musicNote(step: number, when: number): void {
    const ctx = this.ctx;
    const bus = this.musicBus;
    if (!ctx || !bus) return;
    const world = this.musicWorld || 1;
    const scale = world >= 4 ? [0, 2, 3, 7, 10] : [0, 2, 4, 7, 9];
    const roots = [0, 5, 7, 2, 9];
    const root = roots[(world - 1) % roots.length] ?? 0;
    const degree = scale[(step * 3 + Math.floor(step / 4)) % scale.length];
    const octave = step % 8 === 0 ? 12 : step % 4 === 0 ? 0 : 0;
    if (step % 2 === 0) {
      const timbre: OscillatorType = world <= 3 ? 'triangle' : world === 5 ? 'sine' : 'sawtooth';
      this.musicVoice(timbre, freq(root + degree + octave + 12), when, 0.55, 0.22);
    }
    if (step % 8 === 0) {
      this.musicVoice('sine', freq(root - 12), when, 1.1, 0.32);
    }
    if (world >= 4 && step % 4 === 2) {
      this.musicVoice('square', freq(root + degree + 24), when, 0.18, 0.06);
    }
    if (world === 5 && step % 8 === 4) {
      this.musicVoice('sine', freq(root + degree + 31), when, 0.9, 0.1);
    }
  }

  private musicVoice(type: OscillatorType, frequency: number, when: number, duration: number, volume: number): void {
    const ctx = this.ctx;
    const bus = this.musicBus;
    if (!ctx || !bus) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(SILENT, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(SILENT, volume), when + 0.02);
    gain.gain.exponentialRampToValueAtTime(SILENT, when + duration);
    osc.connect(gain);
    gain.connect(bus);
    osc.start(when);
    osc.stop(when + duration + 0.05);
    this.countVoice(osc, gain);
  }

  private tone(
    type: OscillatorType,
    from: number,
    to: number,
    when: number,
    duration: number,
    volume: number,
  ): void {
    const ctx = this.ctx;
    const bus = this.sfxBus;
    if (!ctx || !bus) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, from), when);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), when + duration);
    gain.gain.setValueAtTime(Math.max(SILENT, volume), when);
    gain.gain.exponentialRampToValueAtTime(SILENT, when + duration);
    osc.connect(gain);
    gain.connect(bus);
    osc.start(when);
    osc.stop(when + duration + 0.04);
    this.countVoice(osc, gain);
  }

  private noise(when: number, duration: number, cutoff: number, volume: number): void {
    const ctx = this.ctx;
    const bus = this.sfxBus;
    if (!ctx || !bus || !this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, when);
    filter.frequency.exponentialRampToValueAtTime(Math.max(120, cutoff * 0.4), when + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(SILENT, volume), when);
    gain.gain.exponentialRampToValueAtTime(SILENT, when + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    src.start(when);
    src.stop(when + duration + 0.04);
    this.countVoice(src, gain);
  }

  private countVoice(node: AudioScheduledSourceNode, gain: GainNode): void {
    this.voices += 1;
    node.onended = () => {
      this.voices = Math.max(0, this.voices - 1);
      try {
        node.disconnect();
        gain.disconnect();
      } catch {
        /* ignore */
      }
    };
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 1.2);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
}

function freq(semitones: number): number {
  return 220 * Math.pow(2, semitones / 12);
}
