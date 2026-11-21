import Matter from 'matter-js';
import type { Body as MBody, Engine as MatterEngine, World as MatterWorld } from 'matter-js';

const { Bodies, Body, Composite, Events } = Matter;
const Engine = Matter.Engine;
import { chickenDef, type ChickenDef } from '../data/chickens';
import { materialDef } from '../data/materials';
import type { ChickenId, Level, Material, WeaselType } from '../data/types';
import { weaselDef } from '../data/levels/builder';
import { hashSeed, mulberry32, type Rng } from '../core/rng';
import { starsFor } from '../save/Save';
import { BARREL_LENGTH } from './Cannon';
import {
  ALL_MASK,
  CAT,
  getEntity,
  setEntity,
  type BlockEnt,
  type ChickenEnt,
  type EggEnt,
  type EntityRef,
  type KoEnt,
  type WeaselEnt,
} from './Entities';
import type { Fx, SoundName } from './fx';
import { MechanismRunner } from './Mechanisms';

export type RuntimeState = 'aiming' | 'flying' | 'won' | 'lost';

export interface LevelResult {
  levelId: string;
  cleared: boolean;
  score: number;
  stars: number;
  timeSec: number;
  unusedChickens: number;
  goldenEgg: boolean;
  blocksDestroyed: number;
  weaselsDefeated: number;
}

interface CollisionPair {
  bodyA: MBody;
  bodyB: MBody;
  collision: { normal: { x: number; y: number }; supports?: { x: number; y: number }[] };
}

const CRUNCH: Record<Material, SoundName> = {
  hay: 'crunchHay',
  wood: 'crunchWood',
  ice: 'crunchIce',
  stone: 'crunchStone',
  metal: 'crunchMetal',
  crystal: 'crunchCrystal',
  terrain: 'crunchStone',
};

const IMPULSE_SCALE = 0.3;
const WEASEL_DAMAGE_SCALE = 0.03;
/** Closing speed (px/s) below which a bump doesn't hurt a weasel. */
const WEASEL_MIN_SPEED = 150;
/** Blast damage at the centre and the extra falloff-scaled damage on top. */
const BLAST_DAMAGE_BASE = 18;
const BLAST_DAMAGE_SCALE = 22;
/** matter.js 0.20 normalises velocities to a 60 Hz base delta. */
const PX_PER_STEP = 60;

export class LevelRuntime {
  readonly engine: MatterEngine;
  readonly world: MatterWorld;
  readonly blocks: BlockEnt[] = [];
  readonly weasels: WeaselEnt[] = [];
  readonly chickens: ChickenEnt[] = [];
  readonly eggs: EggEnt[] = [];
  readonly kos: KoEnt[] = [];
  readonly queue: ChickenId[];
  readonly goldenEgg: { x: number; y: number; collected: boolean } | null;

  loaded: ChickenId | null = null;
  state: RuntimeState = 'aiming';
  score = 0;
  time = 0;
  shots = 0;
  usedChickens = 0;
  blocksDestroyed = 0;
  weaselsDefeated = 0;

  private readonly mechs: MechanismRunner;
  private readonly prevVel = new Map<number, { x: number; y: number }>();
  private readonly rng: Rng;
  private crushTimer = 0;
  private shotStart = 0;
  private lastLaunchTime = 0;
  private explosionDepth = 0;
  private resultCache: LevelResult | null = null;

  constructor(
    readonly level: Level,
    private readonly fx: Fx,
  ) {
    this.engine = Engine.create();
    // Settled stacks sleep, so untouched structures don't creep or topple while
    // the player is aiming. Any impact wakes them again.
    this.engine.enableSleeping = true;
    // More solver iterations keep tall stacks stiff: at the default 6/4 a
    // five-storey tower visibly squashes and leans on its own.
    this.engine.positionIterations = 20;
    this.engine.velocityIterations = 12;
    this.engine.gravity.scale = 0.001;
    this.engine.gravity.y = (level.gravity?.y ?? 2200) / 1000;
    this.engine.gravity.x = (level.gravity?.x ?? 0) / 1000;
    this.world = this.engine.world;
    this.rng = mulberry32(hashSeed(level.world, level.index, 7331));
    this.queue = level.queue.slice();
    this.goldenEgg = level.pickups.length > 0 ? { x: level.pickups[0].x, y: level.pickups[0].y, collected: false } : null;

    for (const def of level.blocks) this.blocks.push(this.createBlock(def));
    for (const def of level.weasels) this.weasels.push(this.createWeasel(def));

    this.mechs = new MechanismRunner(this.world, level, {
      fx,
      blockById: (id) => this.blocks.find((b) => b.def.id === id && !b.destroyed) ?? null,
      chickens: () => this.chickens,
      weasels: () => this.weasels,
      lavaHitChicken: (ent) => this.meltChicken(ent),
      lavaHitWeasel: (ent) => {
        if (!ent.defeated) {
          this.fx.burst('flame', ent.body.position.x, ent.body.position.y, { count: 8 });
          this.fx.sound('lava', { pitch: 0.9 });
          this.defeatWeasel(ent);
        }
      },
    });

    Events.on(this.engine, 'collisionStart', this.onCollisionStart);
    this.loadNext();
  }

  private readonly onCollisionStart = (event: unknown): void => {
    this.handleCollision(event);
  };

  // ---------------------------------------------------------------- building

  private createBlock(def: Level['blocks'][number], temporary = false): BlockEnt {
    const mat = materialDef(def.material);
    const options = {
      isStatic: Boolean(def.static),
      restitution: mat.restitution,
      friction: mat.friction,
      frictionStatic: mat.friction,
      density: mat.density,
      angle: ((def.angle ?? 0) * Math.PI) / 180,
      label: def.id,
      collisionFilter: { category: def.material === 'terrain' ? CAT.terrain : CAT.block, mask: ALL_MASK },
    };
    let body: MBody;
    if (def.shape === 'circle') {
      body = Bodies.circle(def.x, def.y, def.r ?? 20, options, 20);
    } else if (def.shape === 'polygon' && def.points && def.points.length >= 3) {
      // Convex polygons are rare in our levels; a bounding box keeps the solver stable.
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const p of def.points) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
      body = Bodies.rectangle(def.x, def.y, Math.max(8, maxX - minX), Math.max(8, maxY - minY), options);
    } else {
      body = Bodies.rectangle(def.x, def.y, def.w ?? 40, def.h ?? 40, options);
    }
    if (def.angle) Body.setAngle(body, ((def.angle ?? 0) * Math.PI) / 180);
    Composite.add(this.world, body);
    const ent: BlockEnt = {
      def,
      body,
      hp: mat.hp,
      maxHp: mat.hp,
      destroyed: false,
      flash: 0,
      seed: Math.floor(this.rng() * 10000),
      burning: 0,
      spreadTimer: 0,
      slow: 0,
      temporary,
    };
    setEntity(body, { kind: 'block', ent });
    return ent;
  }

  private createWeasel(def: Level['weasels'][number]): WeaselEnt {
    const wd = weaselDef(def.type);
    const body = Bodies.circle(def.x, def.y, wd.radius, {
      restitution: 0.12,
      friction: 0.75,
      frictionStatic: 1,
      density: 0.0012,
      label: `weasel-${def.type}`,
      collisionFilter: { category: CAT.weasel, mask: ALL_MASK },
    });
    Body.setMass(body, 1.5 * wd.massScale);
    Composite.add(this.world, body);
    const ent: WeaselEnt = {
      def,
      body,
      hp: wd.hp,
      maxHp: wd.hp,
      armour: wd.armour,
      maxArmour: wd.armour,
      defeated: false,
      flash: 0,
      squash: 0,
      patrolDir: 1,
      originX: def.x,
      originY: def.y,
      bossPhase: 0,
      slow: 0,
    };
    setEntity(body, { kind: 'weasel', ent });
    return ent;
  }

  private createChickenBody(def: ChickenDef, x: number, y: number): MBody {
    const body = Bodies.circle(x, y, def.radius, {
      restitution: 0.25,
      friction: 0.5,
      frictionAir: 0.002,
      density: 0.002,
      label: `chicken-${def.id}`,
      collisionFilter: { category: CAT.chicken, mask: ALL_MASK },
    });
    Body.setMass(body, def.mass);
    Composite.add(this.world, body);
    return body;
  }

  // ------------------------------------------------------------------- input

  get isFlying(): boolean {
    return this.state === 'flying';
  }

  get loadedDef(): ChickenDef | null {
    return this.loaded ? chickenDef(this.loaded) : null;
  }

  get activeChicken(): ChickenEnt | null {
    for (let i = this.chickens.length - 1; i >= 0; i--) {
      const c = this.chickens[i];
      if (!c.removed) return c;
    }
    return null;
  }

  get unusedChickens(): number {
    return this.queue.length + (this.loaded ? 1 : 0);
  }

  get cannonPivot(): { x: number; y: number } {
    return { x: this.level.cannon.x, y: this.level.cannon.y };
  }

  get pistonBodies(): MBody[] {
    return this.mechs.pistonBodies;
  }

  isBalloonPopped(index: number): boolean {
    return this.mechs.balloonPopped(index);
  }

  muzzleFor(angle: number): { x: number; y: number } {
    return {
      x: this.level.cannon.x + Math.cos(angle) * BARREL_LENGTH,
      y: this.level.cannon.y - Math.sin(angle) * BARREL_LENGTH,
    };
  }

  private loadNext(): void {
    this.loaded = this.queue.length > 0 ? (this.queue.shift() as ChickenId) : null;
  }

  fire(angle: number, power: number): boolean {
    if (this.state !== 'aiming' || !this.loaded) return false;
    const def = chickenDef(this.loaded);
    const muzzle = this.muzzleFor(angle);
    const spawnX = muzzle.x + Math.cos(angle) * 16;
    const spawnY = muzzle.y - Math.sin(angle) * 16;
    const body = this.createChickenBody(def, spawnX, spawnY);
    const speed = 700 + 620 * power;
    Body.setVelocity(body, {
      x: (Math.cos(angle) * speed) / PX_PER_STEP,
      y: (-Math.sin(angle) * speed) / PX_PER_STEP,
    });
    Body.setAngularVelocity(body, 0.3);
    const ent: ChickenEnt = {
      id: def.id,
      def,
      bodies: [body],
      launched: true,
      abilityUsed: def.ability === 'none',
      launchTime: this.time,
      damageMult: 1,
      multTimer: 0,
      pierceTimer: 0,
      restTime: 0,
      inert: false,
      fade: 0,
      removed: false,
    };
    setEntity(body, { kind: 'chicken', ent });
    this.chickens.push(ent);
    this.loaded = null;
    this.state = 'flying';
    this.shots += 1;
    this.usedChickens += 1;
    this.lastLaunchTime = this.time;
    this.shotStart = this.time;

    this.fx.sound('cannon', { power });
    this.fx.sound('squawk', { pitch: def.squawkPitch / 420 });
    this.fx.shake(3 + 6 * power);
    this.fx.burst('smoke', muzzle.x, muzzle.y, { count: 10 + Math.floor(power * 6), color: '#E8DCC8', power: 1 });
    this.fx.burst('spark', muzzle.x, muzzle.y, { count: 7, color: '#FFC24B', power: 1 });
    return true;
  }

  useAbility(): boolean {
    const ent = this.activeChicken;
    if (!ent || ent.removed || ent.abilityUsed || !ent.launched) return false;
    const body = ent.bodies[0];
    if (!body) return false;
    const speed = Math.hypot(body.velocity.x, body.velocity.y) * PX_PER_STEP;
    const buffered = this.time - this.lastLaunchTime <= 0.1;
    const airborne = this.state === 'flying' && speed > 50 && body.position.y < this.level.groundY - 8;
    if (!airborne && !buffered) return false;
    ent.abilityUsed = true;
    this.runAbility(ent);
    return true;
  }

  private runAbility(ent: ChickenEnt): void {
    const body = ent.bodies[0];
    const def = ent.def;
    const x = body.position.x;
    const y = body.position.y;
    switch (def.ability) {
      case 'eggBomb': {
        this.spawnEgg(x, y, 90, 0.35, false);
        this.fx.sound('abilityEgg', { pitch: 1 });
        break;
      }
      case 'megaEgg': {
        this.spawnEgg(x, y + 20, 150, -1, true);
        this.fx.sound('abilityMega', { pitch: 0.8 });
        break;
      }
      case 'dash': {
        const vx = body.velocity.x;
        const vy = body.velocity.y;
        const sp = Math.hypot(vx, vy) * PX_PER_STEP;
        const cap = 1900 / PX_PER_STEP;
        const scale = Math.min(2, cap / Math.max(1, sp));
        Body.setVelocity(body, { x: vx * scale, y: vy * scale });
        ent.damageMult = 3;
        ent.multTimer = 0.6;
        this.fx.sound('abilityDash', { pitch: 1 });
        this.fx.burst('smoke', x, y, { count: 8, color: '#FFF3D0', power: 0.6 });
        break;
      }
      case 'inflate': {
        const factor = 42 / def.radius;
        Body.scale(body, factor, factor);
        Body.setMass(body, def.mass * 2.2);
        body.density = body.mass / body.area;
        body.restitution = 0.6;
        (body as unknown as { circleRadius: number }).circleRadius = 42;
        this.fx.sound('abilityInflate', { pitch: 1 });
        this.fx.burst('dust', x, y, { count: 8, color: '#FFFFFF' });
        break;
      }
      case 'split': {
        const vx = body.velocity.x;
        const vy = body.velocity.y;
        const sp = Math.hypot(vx, vy);
        const baseAngle = Math.atan2(vy, vx);
        Composite.remove(this.world, body);
        ent.bodies = [];
        for (const delta of [-0.44, 0, 0.44]) {
          const a = baseAngle + delta;
          const child = this.createChickenBody(def, x + Math.cos(a) * 12, y + Math.sin(a) * 12);
          Body.scale(child, 0.62, 0.62);
          Body.setMass(child, 0.33);
          child.density = child.mass / child.area;
          Body.setVelocity(child, { x: Math.cos(a) * sp * 0.85, y: Math.sin(a) * sp * 0.85 });
          setEntity(child, { kind: 'chicken', ent });
          ent.bodies.push(child);
        }
        this.fx.sound('abilitySplit', { pitch: 1.2 });
        this.fx.burst('feather', x, y, { count: 10, color: def.body });
        break;
      }
      case 'pierce': {
        body.collisionFilter.mask = CAT.weasel | CAT.terrain | CAT.egg | CAT.piston;
        ent.damageMult = 3;
        ent.pierceTimer = 0.5;
        this.fx.sound('abilityPierce', { pitch: 1 });
        this.fx.burst('spark', x, y, { count: 8, color: '#DCE6F2' });
        break;
      }
      case 'fire': {
        this.igniteArea(x, y, 110);
        this.fx.sound('abilityFire', { pitch: 1 });
        this.fx.burst('flame', x, y, { count: 16, color: '#F97316', power: 1 });
        this.fx.shake(5);
        break;
      }
      case 'freeze': {
        for (const b of this.blocks) {
          if (b.destroyed || b.def.material !== 'ice') continue;
          if (Math.hypot(b.body.position.x - x, b.body.position.y - y) > 130) continue;
          b.hp = Math.min(b.hp, 1);
          b.flash = 0.2;
        }
        for (const w of this.weasels) {
          if (w.defeated) continue;
          if (Math.hypot(w.body.position.x - x, w.body.position.y - y) <= 130) w.slow = 1;
        }
        for (const b of this.blocks) {
          if (b.destroyed) continue;
          if (Math.hypot(b.body.position.x - x, b.body.position.y - y) <= 130) b.slow = 1;
        }
        this.fx.sound('abilityFreeze', { pitch: 1 });
        this.fx.burst('ice', x, y, { count: 18, color: '#DFF3FF', power: 1 });
        break;
      }
      case 'none':
      default:
        break;
    }
  }

  private spawnEgg(x: number, y: number, radius: number, fuse: number, mega: boolean): void {
    const body = Bodies.circle(x, y, mega ? 34 : 11, {
      restitution: 0.1,
      friction: 0.6,
      density: 0.002,
      label: 'egg',
      collisionFilter: { category: CAT.egg, mask: CAT.block | CAT.terrain | CAT.weasel | CAT.piston },
    });
    Body.setMass(body, mega ? 3 : 0.35);
    Body.setVelocity(body, { x: 0, y: 0.6 });
    Composite.add(this.world, body);
    const ent: EggEnt = { body, fuse, mega, radius, dead: false };
    setEntity(body, { kind: 'egg', ent });
    this.eggs.push(ent);
  }

  private igniteArea(x: number, y: number, radius: number): void {
    for (const b of this.blocks) {
      if (b.destroyed) continue;
      const mat = b.def.material;
      if (mat !== 'hay' && mat !== 'wood') continue;
      if (Math.hypot(b.body.position.x - x, b.body.position.y - y) > radius) continue;
      b.burning = Math.max(b.burning, 3);
    }
  }

  // ------------------------------------------------------------------ damage

  private damageBlock(ent: BlockEnt, amount: number, depth = 0): void {
    if (ent.destroyed || ent.def.isGround || ent.def.material === 'terrain') return;
    if (amount <= 0.02) return;
    ent.hp -= amount;
    ent.flash = Math.max(ent.flash, 0.12);
    if (ent.hp <= 0) this.destroyBlock(ent, depth);
  }

  private destroyBlock(ent: BlockEnt, depth: number): void {
    if (ent.destroyed) return;
    ent.destroyed = true;
    this.blocksDestroyed += 1;
    this.score += 1000;
    const mat = materialDef(ent.def.material);
    Composite.remove(this.world, ent.body);
    this.fx.burst('debris', ent.body.position.x, ent.body.position.y, {
      count: 5 + Math.floor(this.rng() * 4),
      color: mat.debris,
      power: 0.8,
    });
    this.fx.burst('dust', ent.body.position.x, ent.body.position.y, { count: 3, color: '#E8DCC8' });
    this.fx.sound(CRUNCH[ent.def.material], { pitch: 0.92 + this.rng() * 0.16 });
    if (ent.def.explosive && depth < 3) {
      this.explode(ent.body.position.x, ent.body.position.y, 130, 1500, depth + 1);
    }
  }

  private damageWeasel(ent: WeaselEnt, amount: number): void {
    if (ent.defeated) return;
    ent.flash = 0.09;
    ent.squash = 0.16;
    let dmg = amount;
    if (ent.armour > 0) {
      const absorbed = Math.min(ent.armour, dmg);
      ent.armour -= absorbed;
      dmg -= absorbed;
      if (ent.armour <= 0) {
        this.fx.burst('debris', ent.body.position.x, ent.body.position.y - 10, { count: 5, color: '#C9D2DC' });
      }
    }
    ent.hp -= dmg;
    this.fx.sound('weaselHit', { pitch: weaselPitch(ent.def.type) });
    if (ent.hp <= 0) this.defeatWeasel(ent);
  }

  private defeatWeasel(ent: WeaselEnt): void {
    if (ent.defeated) return;
    ent.defeated = true;
    this.weaselsDefeated += 1;
    this.score += 5000;
    const x = ent.body.position.x;
    const y = ent.body.position.y;
    Composite.remove(this.world, ent.body);
    const dir = x < this.level.cannon.x + 300 ? 1 : -1;
    this.kos.push({
      x,
      y,
      vx: dir * (140 + this.rng() * 130),
      vy: -520 - this.rng() * 160,
      angle: 0,
      spin: dir * (5 + this.rng() * 5),
      type: ent.def.type,
      timer: 0,
      duration: 1.5,
    });
    this.fx.sound('weaselKo', { pitch: weaselPitch(ent.def.type) });
    this.fx.burst('star', x, y, { count: 7, color: '#FFD166' });
    this.fx.shake(4);
    if (this.weasels.every((w) => w.defeated)) this.win();
  }

  private win(): void {
    if (this.state === 'won' || this.state === 'lost') return;
    this.state = 'won';
    const unused = this.unusedChickens;
    this.score += unused * 8000;
    this.fx.sound('win', { pitch: 1 });
    this.fx.slowMo(0.25);
    this.resultCache = null;
  }

  private lose(): void {
    if (this.state === 'won' || this.state === 'lost') return;
    this.state = 'lost';
    this.fx.sound('fail', { pitch: 1 });
    this.resultCache = null;
  }

  private explode(x: number, y: number, radius: number, impulse: number, depth: number): void {
    this.explosionDepth = Math.min(depth, 4);
    this.fx.sound('boom', { power: Math.min(1, radius / 150) });
    this.fx.shake(radius > 120 ? 13 : 8);
    this.fx.burst('smoke', x, y, { count: 16, color: '#F2E4CC', power: 1.2 });
    this.fx.burst('spark', x, y, { count: 14, color: '#FFB347', power: 1.2 });
    const dv = (impulse / PX_PER_STEP) * 0.55;
    for (const b of this.blocks) {
      if (b.destroyed || b.def.static) continue;
      const dx = b.body.position.x - x;
      const dy = b.body.position.y - y;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) continue;
      const falloff = 1 - dist / radius;
      const nx = dist > 1 ? dx / dist : 0;
      const ny = dist > 1 ? dy / dist : -1;
      Body.setVelocity(b.body, {
        x: b.body.velocity.x + nx * dv * falloff,
        y: b.body.velocity.y + ny * dv * falloff,
      });
      const mat = b.def.material;
      const dmg = falloff * (mat === 'hay' ? 14 : mat === 'wood' ? 10 : 6);
      this.damageBlock(b, dmg, depth);
    }
    for (const w of this.weasels) {
      if (w.defeated) continue;
      const dx = w.body.position.x - x;
      const dy = w.body.position.y - y;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) continue;
      const falloff = 1 - dist / radius;
      const nx = dist > 1 ? dx / dist : 0;
      const ny = dist > 1 ? dy / dist : -1;
      Body.setVelocity(w.body, {
        x: w.body.velocity.x + nx * dv * falloff * 0.8,
        y: w.body.velocity.y + ny * dv * falloff * 0.8,
      });
      this.damageWeasel(w, BLAST_DAMAGE_BASE + BLAST_DAMAGE_SCALE * falloff);
    }
  }

  private detonateEgg(egg: EggEnt): void {
    if (egg.dead) return;
    egg.dead = true;
    Composite.remove(this.world, egg.body);
    this.explode(egg.body.position.x, egg.body.position.y, egg.radius, egg.mega ? 3200 : 1600, 0);
    if (egg.mega) this.fx.burst('star', egg.body.position.x, egg.body.position.y, { count: 12, color: '#FFE9A8' });
  }

  private meltChicken(ent: ChickenEnt): void {
    if (ent.removed) return;
    const body = ent.bodies[0];
    const x = body ? body.position.x : 0;
    const y = body ? body.position.y : 0;
    for (const part of ent.bodies) Composite.remove(this.world, part);
    ent.bodies = [];
    ent.removed = true;
    this.fx.sound('lava', { pitch: 0.9 });
    this.fx.burst('flame', x, y, { count: 10, color: '#FF9A3C', power: 0.8 });
  }

  // ------------------------------------------------------------------ physics

  step(dt: number): void {
    if (this.state === 'won' || this.state === 'lost') {
      this.time += dt;
      this.updateCosmetics(dt);
      return;
    }
    this.time += dt;

    // Capture pre-step velocities for honest impact impulses.
    for (const body of Composite.allBodies(this.world)) {
      if (body.isStatic) continue;
      let v = this.prevVel.get(body.id);
      if (!v) {
        v = { x: 0, y: 0 };
        this.prevVel.set(body.id, v);
      }
      v.x = body.velocity.x;
      v.y = body.velocity.y;
    }

    this.applyChickenForces(dt);
    this.applySlow(dt);
    this.mechs.update(dt, this.time);
    this.updatePatrols();
    Engine.update(this.engine, dt * 1000);

    this.crushTimer += dt;
    if (this.crushTimer >= 0.25) {
      const ticks = Math.floor(this.crushTimer / 0.25);
      this.crushTimer -= ticks * 0.25;
      this.applyCrush(ticks);
      this.applyBurning(0.25 * ticks);
    }

    this.updateEggs(dt);
    this.updateChickens(dt);
    this.updateWeasels(dt);
    this.updateKos(dt);
    this.checkPickup();
    this.checkBossPhases();
    this.updateCosmetics(dt);
    this.resolveIfSettled();
  }

  private applyChickenForces(dt: number): void {
    const baseWind = this.level.wind;
    for (const ent of this.chickens) {
      if (ent.removed || ent.inert) continue;
      for (const body of ent.bodies) {
        const extra = this.mechs.windAt(body.position.x, body.position.y);
        const wx = baseWind.x + extra.x;
        const wy = baseWind.y + extra.y;
        const drag = 0.035 * ent.def.drag;
        Body.setVelocity(body, {
          x: body.velocity.x + (wx / 7200 - body.velocity.x * drag * dt),
          y: body.velocity.y + (wy / 7200 - body.velocity.y * drag * dt),
        });
        if (wx !== 0 || wy !== 0) this.mechs.popBalloonsNear(body.position.x, body.position.y, 42);
      }
    }
  }

  private applySlow(dt: number): void {
    for (const w of this.weasels) {
      if (w.defeated || w.slow <= 0) continue;
      w.slow -= dt;
      Body.setVelocity(w.body, { x: w.body.velocity.x * 0.5, y: w.body.velocity.y * 0.5 });
    }
    for (const b of this.blocks) {
      if (b.destroyed || b.slow <= 0) continue;
      b.slow -= dt;
      Body.setVelocity(b.body, { x: b.body.velocity.x * 0.5, y: b.body.velocity.y * 0.5 });
    }
  }

  private updatePatrols(): void {
    for (const w of this.weasels) {
      if (w.defeated || !w.def.patrol) continue;
      const p = w.def.patrol;
      if (p.axis !== 'x') continue;
      const dx = w.body.position.x - w.originX;
      if (dx > p.range) w.patrolDir = -1;
      else if (dx < -p.range) w.patrolDir = 1;
      Body.setVelocity(w.body, { x: (p.speed * w.patrolDir) / PX_PER_STEP, y: w.body.velocity.y });
    }
  }

  private applyCrush(ticks: number): void {
    const all = this.blocks.filter((b) => !b.destroyed && !b.def.static);
    for (const b of all) {
      let load = 0;
      for (const o of all) {
        if (o === b) continue;
        if (o.body.bounds.min.x > b.body.bounds.max.x - 4) continue;
        if (o.body.bounds.max.x < b.body.bounds.min.x + 4) continue;
        if (o.body.bounds.max.y > b.body.bounds.min.y + 10) continue;
        if (o.body.bounds.max.y < b.body.bounds.min.y - 90) continue;
        load += o.body.mass;
      }
      for (const w of this.weasels) {
        if (w.defeated) continue;
        if (w.body.bounds.min.x > b.body.bounds.max.x - 4) continue;
        if (w.body.bounds.max.x < b.body.bounds.min.x + 4) continue;
        if (w.body.bounds.max.y > b.body.bounds.min.y + 10) continue;
        if (w.body.bounds.max.y < b.body.bounds.min.y - 90) continue;
        load += w.body.mass;
      }
      if (load > materialDef(b.def.material).crush) {
        this.damageBlock(b, 0.6 * ticks);
      }
    }
  }

  private applyBurning(dt: number): void {
    for (const b of this.blocks) {
      if (b.destroyed) continue;
      if (b.burning > 0) {
        b.burning -= dt;
        this.damageBlock(b, 4 * dt);
        b.spreadTimer -= dt;
        if (b.spreadTimer <= 0) {
          b.spreadTimer = 1.5;
          for (const o of this.blocks) {
            if (o === b || o.destroyed || o.burning > 0) continue;
            if (o.def.material !== 'hay' && o.def.material !== 'wood') continue;
            if (Math.hypot(o.body.position.x - b.body.position.x, o.body.position.y - b.body.position.y) > 92) continue;
            o.burning = 3;
          }
        }
        if (this.rng() < dt * 6) {
          this.fx.burst('flame', b.body.position.x + (this.rng() - 0.5) * 30, b.body.position.y, { count: 1, color: '#FFA63D' });
        }
      }
    }
  }

  private updateEggs(dt: number): void {
    for (const egg of this.eggs) {
      if (egg.dead) continue;
      if (egg.fuse > 0) {
        egg.fuse -= dt;
        if (egg.fuse <= 0) this.detonateEgg(egg);
      }
      if (egg.body.position.y > 960) {
        egg.dead = true;
        Composite.remove(this.world, egg.body);
      }
    }
  }

  private updateChickens(dt: number): void {
    for (let ci = 0; ci < this.chickens.length; ci++) {
      const ent = this.chickens[ci];
      if (ent.removed) continue;
      if (ent.multTimer > 0) {
        ent.multTimer -= dt;
        if (ent.multTimer <= 0) ent.damageMult = 1;
      }
      if (ent.pierceTimer > 0) {
        ent.pierceTimer -= dt;
        if (ent.pierceTimer <= 0) {
          for (const body of ent.bodies) body.collisionFilter.mask = ALL_MASK;
        }
      }
      for (let bi = ent.bodies.length - 1; bi >= 0; bi--) {
        const body = ent.bodies[bi];
        if (body.position.y > 960 || body.position.x < -260 || body.position.x > (this.level.worldWidth ?? 1280) + 320) {
          Composite.remove(this.world, body);
          ent.bodies.splice(bi, 1);
          continue;
        }
        const speed = Math.hypot(body.velocity.x, body.velocity.y) * PX_PER_STEP;
        if (this.time - ent.launchTime > 0.4 && speed < 60) {
          ent.restTime += dt;
        } else {
          ent.restTime = 0;
        }
        if (!ent.inert && ent.restTime > 0.35) {
          ent.inert = true;
          ent.fade = 1.2;
          body.collisionFilter.mask = 0;
          this.fx.burst('feather', body.position.x, body.position.y, { count: 5, color: ent.def.body });
        }
      }
      if (ent.inert) {
        ent.fade -= dt;
        if (ent.fade <= 0) {
          for (const body of ent.bodies) Composite.remove(this.world, body);
          ent.bodies = [];
          ent.removed = true;
        }
      }
      if (ent.bodies.length === 0) ent.removed = true;
    }
  }

  private updateWeasels(dt: number): void {
    for (const w of this.weasels) {
      if (w.defeated) continue;
      if (w.flash > 0) w.flash -= dt;
      if (w.squash > 0) w.squash -= dt;
      if (w.body.position.y > 900) this.defeatWeasel(w);
    }
  }

  private updateKos(dt: number): void {
    for (const ko of this.kos) {
      ko.timer += dt;
      ko.vy += 2200 * dt;
      ko.x += ko.vx * dt;
      ko.y += ko.vy * dt;
      ko.angle += ko.spin * dt;
    }
    for (let i = this.kos.length - 1; i >= 0; i--) {
      if (this.kos[i].timer > this.kos[i].duration) this.kos.splice(i, 1);
    }
  }

  private updateCosmetics(dt: number): void {
    for (const b of this.blocks) {
      if (b.flash > 0) b.flash -= dt;
    }
  }

  private checkPickup(): void {
    if (!this.goldenEgg || this.goldenEgg.collected) return;
    for (const ent of this.chickens) {
      if (ent.removed || ent.inert) continue;
      for (const body of ent.bodies) {
        if (Math.hypot(body.position.x - this.goldenEgg.x, body.position.y - this.goldenEgg.y) < 40) {
          this.goldenEgg.collected = true;
          this.score += 10000;
          this.fx.sound('unlock', { pitch: 1.2 });
          this.fx.burst('star', this.goldenEgg.x, this.goldenEgg.y, { count: 14, color: '#FFE9A8' });
          return;
        }
      }
    }
  }

  private checkBossPhases(): void {
    for (const w of this.weasels) {
      if (w.defeated || w.def.type !== 'boss') continue;
      const ratio = w.hp / w.maxHp;
      const maxPhase = this.level.world === 5 ? 2 : 1;
      const wanted = ratio <= 0.25 ? 2 : ratio <= 0.5 ? 1 : 0;
      while (w.bossPhase < wanted && w.bossPhase < maxPhase) {
        w.bossPhase += 1;
        this.throwCrate(w);
        if (w.bossPhase >= 2) this.throwCrate(w);
      }
    }
  }

  private throwCrate(boss: WeaselEnt): void {
    const crate = this.createBlock(
      {
        id: `crate-${boss.def.id}-${boss.bossPhase}-${Math.floor(this.time * 1000)}`,
        shape: 'box',
        x: boss.body.position.x,
        y: boss.body.position.y - 90,
        w: 44,
        h: 34,
        material: 'wood',
        static: false,
      },
      true,
    );
    Body.setVelocity(crate.body, { x: -2.6, y: -9.2 });
    this.fx.burst('dust', crate.body.position.x, crate.body.position.y, { count: 5 });
    this.fx.sound('weaselHit', { pitch: 0.7 });
  }

  private resolveIfSettled(): void {
    if (this.state !== 'flying') return;
    const since = this.time - this.shotStart;
    if (since < 0.75) return;
    if (since < 6.5 && this.anythingMoving()) return;
    this.resolveShot();
  }

  private anythingMoving(): boolean {
    const moving = (b: MBody): boolean => !b.isStatic && Math.hypot(b.velocity.x, b.velocity.y) * PX_PER_STEP > 45;
    for (const b of this.blocks) if (!b.destroyed && moving(b.body)) return true;
    for (const w of this.weasels) if (!w.defeated && moving(w.body)) return true;
    for (const c of this.chickens) {
      if (c.removed || c.inert) continue;
      for (const body of c.bodies) if (moving(body)) return true;
    }
    return false;
  }

  private resolveShot(): void {
    if (this.weasels.every((w) => w.defeated)) {
      this.win();
      return;
    }
    if (this.queue.length === 0) {
      this.lose();
      return;
    }
    for (const c of this.chickens) {
      if (!c.removed) c.inert = true;
    }
    this.loadNext();
    this.state = 'aiming';
    this.fx.sound('reload', { pitch: 1 });
  }

  // ---------------------------------------------------------------- collisions

  handleCollision(event: unknown): void {
    const pairs = (event as { pairs?: CollisionPair[] }).pairs;
    if (!pairs) return;
    for (const pair of pairs) this.handlePair(pair);
  }

  private handlePair(pair: CollisionPair): void {
    // Structures settle for a few millimetres on the first frames; that must not
    // register as impact damage.
    if (this.time < 0.35) return;
    const refA = getEntity(pair.bodyA);
    const refB = getEntity(pair.bodyB);
    if (!refA && !refB) return;

    const eggA = refA?.kind === 'egg' ? refA.ent : null;
    const eggB = refB?.kind === 'egg' ? refB.ent : null;
    if (eggA?.mega) {
      this.detonateEgg(eggA);
      return;
    }
    if (eggB?.mega) {
      this.detonateEgg(eggB);
      return;
    }
    // A direct hit on a weasel arms the egg on contact instead of letting it
    // bounce away and burn its fuse somewhere harmless.
    if (eggA && refB?.kind === 'weasel') {
      this.detonateEgg(eggA);
      return;
    }
    if (eggB && refA?.kind === 'weasel') {
      this.detonateEgg(eggB);
      return;
    }

    // Static bodies are never sampled for previous velocity (they don't move),
    // but mechanisms may still leave a velocity on them; ignore it so a lifting
    // balloon deck can't register as a high-speed impact.
    const zero = { x: 0, y: 0 };
    const va = pair.bodyA.isStatic ? zero : (this.prevVel.get(pair.bodyA.id) ?? pair.bodyA.velocity);
    const vb = pair.bodyB.isStatic ? zero : (this.prevVel.get(pair.bodyB.id) ?? pair.bodyB.velocity);
    const relX = (va.x - vb.x) * PX_PER_STEP;
    const relY = (va.y - vb.y) * PX_PER_STEP;
    const n = pair.collision.normal;
    const normalSpeed = Math.abs(relX * n.x + relY * n.y);
    if (normalSpeed < 25) return;

    const massA = pair.bodyA.isStatic ? Infinity : pair.bodyA.mass;
    const massB = pair.bodyB.isStatic ? Infinity : pair.bodyB.mass;
    const effectiveMass = !Number.isFinite(massA) ? massB : !Number.isFinite(massB) ? massA : (massA * massB) / (massA + massB);
    let impulse = effectiveMass * normalSpeed * IMPULSE_SCALE;

    let chickenMult = 1;
    if (refA?.kind === 'chicken') chickenMult = Math.max(chickenMult, refA.ent.damageMult);
    if (refB?.kind === 'chicken') chickenMult = Math.max(chickenMult, refB.ent.damageMult);
    impulse *= chickenMult;

    const hit = pair.collision.supports?.[0] ?? {
      x: (pair.bodyA.position.x + pair.bodyB.position.x) / 2,
      y: (pair.bodyA.position.y + pair.bodyB.position.y) / 2,
    };

    this.applyImpactDamage(refA, refB, impulse, normalSpeed, hit.x, hit.y);
    this.applyImpactDamage(refB, refA, impulse, normalSpeed, hit.x, hit.y);

    if (normalSpeed > 320) {
      this.fx.burst('hitmark', hit.x, hit.y, { count: 4, color: '#FFF4C2' });
      this.fx.burst('dust', hit.x, hit.y, { count: 2 });
    }
  }

  private applyImpactDamage(
    target: EntityRef | null,
    other: EntityRef | null,
    impulse: number,
    normalSpeed: number,
    x: number,
    y: number,
  ): void {
    if (!target) return;
    if (target.kind === 'block') {
      const mat = materialDef(target.ent.def.material);
      const dmg = Math.max(0, (impulse - mat.threshold) * 0.02);
      if (dmg <= 0) return;
      this.damageBlock(target.ent, dmg);
      if (other?.kind === 'chicken') {
        this.fx.sound(CRUNCH[target.ent.def.material], { pitch: 0.95 + this.rng() * 0.1 });
      }
      if (target.ent.def.material === 'crystal') this.chainCrystal(target.ent, dmg, 0);
    } else if (target.kind === 'weasel') {
      // Weasel damage keys off closing speed, not impulse: a heavy king resting
      // on a light beam jitters hard enough to bruise itself otherwise, while a
      // genuine hit is always fast.
      const dmg = Math.max(0, normalSpeed - WEASEL_MIN_SPEED) * WEASEL_DAMAGE_SCALE;
      this.damageWeasel(target.ent, dmg);
    } else if (target.kind === 'chicken' && other?.kind === 'weasel') {
      this.fx.burst('feather', x, y, { count: 2, color: target.ent.def.body });
    }
  }

  private chainCrystal(source: BlockEnt, amount: number, depth: number): void {
    if (depth >= 3) return;
    for (const b of this.blocks) {
      if (b === source || b.destroyed || b.def.material !== 'crystal') continue;
      if (Math.hypot(b.body.position.x - source.body.position.x, b.body.position.y - source.body.position.y) > 110) continue;
      this.damageBlock(b, amount * 0.4);
      this.chainCrystal(b, amount * 0.4, depth + 1);
    }
  }

  // ------------------------------------------------------------------- result

  getResult(): LevelResult {
    if (this.resultCache) return this.resultCache;
    const unused = this.unusedChickens;
    const stars = starsFor(this.score, this.state === 'won', unused, this.level.queue.length, this.level.starScore);
    this.resultCache = {
      levelId: this.level.id,
      cleared: this.state === 'won',
      score: this.score,
      stars,
      timeSec: this.time,
      unusedChickens: unused,
      goldenEgg: this.goldenEgg?.collected ?? false,
      blocksDestroyed: this.blocksDestroyed,
      weaselsDefeated: this.weaselsDefeated,
    };
    return this.resultCache;
  }

  dispose(): void {
    Events.off(this.engine, 'collisionStart', this.onCollisionStart);
    Engine.clear(this.engine);
    this.prevVel.clear();
  }
}

function weaselPitch(type: WeaselType): number {
  switch (type) {
    case 'helmet':
      return 0.9;
    case 'brute':
      return 0.72;
    case 'king':
      return 0.62;
    case 'boss':
      return 0.5;
    default:
      return 1.1;
  }
}
