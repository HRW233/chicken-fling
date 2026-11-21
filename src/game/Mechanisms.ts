import Matter from 'matter-js';
import type { World as MatterWorld } from 'matter-js';

const { Bodies, Body, Composite } = Matter;
import type { Level, Mechanism, Vec2 } from '../data/types';
import { CAT, getEntity, type BlockEnt, type ChickenEnt, type WeaselEnt } from './Entities';
import type { Fx } from './fx';

export interface MechanismHooks {
  fx: Fx;
  blockById(id: string): BlockEnt | null;
  chickens(): ChickenEnt[];
  weasels(): WeaselEnt[];
  lavaHitChicken(ent: ChickenEnt): void;
  lavaHitWeasel(ent: WeaselEnt): void;
}

interface PistonState {
  mech: Extract<Mechanism, { kind: 'piston' }>;
  body: ReturnType<typeof Bodies.rectangle>;
  baseX: number;
  baseY: number;
}

interface BalloonState {
  mech: Extract<Mechanism, { kind: 'balloon' }>;
  popped: boolean;
}

/** Runs conveyors, magnets, pistons, geysers, balloons, lava and wind zones. */
export class MechanismRunner {
  private pistons: PistonState[] = [];
  private balloons: BalloonState[] = [];
  private geyserPuff: number[] = [];

  constructor(
    private readonly world: MatterWorld,
    private readonly level: Level,
    private readonly hooks: MechanismHooks,
  ) {
    for (const m of level.mechanisms) {
      if (m.kind === 'piston') {
        const horizontal = m.axis === 'x';
        const body = Bodies.rectangle(
          m.x,
          m.y,
          horizontal ? 96 : 26,
          horizontal ? 26 : 96,
          {
            isStatic: false,
            density: 0.02,
            frictionAir: 0.9,
            friction: 0.4,
            restitution: 0,
            collisionFilter: {
              category: CAT.piston,
              mask: CAT.block | CAT.weasel | CAT.chicken | CAT.egg,
            },
            label: 'piston',
          },
        );
        this.pistons.push({ mech: m, body, baseX: m.x, baseY: m.y });
        Composite.add(this.world, body);
      } else if (m.kind === 'balloon') {
        this.balloons.push({ mech: m, popped: false });
      }
    }
    this.geyserPuff = level.mechanisms.map(() => 0);
  }

  get pistonBodies(): ReturnType<typeof Bodies.rectangle>[] {
    return this.pistons.map((p) => p.body);
  }

  balloonPopped(index: number): boolean {
    return this.balloons.find((b) => b.mech === this.level.mechanisms[index])?.popped ?? false;
  }

  balloonCountFor(blockId: string): number {
    return this.balloons.filter((b) => b.mech.blockId === blockId).length;
  }

  update(dt: number, time: number): void {
    const bodies = Composite.allBodies(this.world);
    for (const p of this.pistons) {
      const m = p.mech;
      const phase = (time % m.periodS) / m.periodS;
      const offset = Math.sin(phase * Math.PI * 2) * (m.travel / 2);
      const nx = m.axis === 'x' ? p.baseX + offset : p.baseX;
      const ny = m.axis === 'y' ? p.baseY + offset : p.baseY;
      const vx = (nx - p.body.position.x) / dt / 60;
      const vy = (ny - p.body.position.y) / dt / 60;
      Body.setPosition(p.body, { x: nx, y: ny });
      Body.setVelocity(p.body, { x: vx, y: vy });
    }

    for (let i = 0; i < this.level.mechanisms.length; i++) {
      const m = this.level.mechanisms[i];
      if (m.kind === 'conveyor') {
        for (const body of bodies) {
          if (body.isStatic) continue;
          const dx = Math.abs(body.position.x - m.x);
          if (dx > m.w / 2) continue;
          if (Math.abs(body.position.y - m.y) > 42) continue;
          const target = m.speed / 60;
          Body.setVelocity(body, {
            x: body.velocity.x + (target - body.velocity.x) * Math.min(1, dt * 9),
            y: body.velocity.y,
          });
        }
      } else if (m.kind === 'magnet') {
        for (const body of bodies) {
          if (body.isStatic) continue;
          const ref = getEntity(body);
          const metal = ref?.kind === 'block' && (ref.ent.def.material === 'metal' || ref.ent.def.tags?.includes('magnet'));
          if (!metal) continue;
          const dx = m.x - body.position.x;
          const dy = m.y - body.position.y;
          const dist = Math.hypot(dx, dy);
          if (dist > m.radius || dist < 1) continue;
          const falloff = 1 - dist / m.radius;
          const accel = m.strength * 2400 * falloff;
          Body.setVelocity(body, {
            x: body.velocity.x + (dx / dist) * (accel / 7200),
            y: body.velocity.y + (dy / dist) * (accel / 7200),
          });
        }
      } else if (m.kind === 'geyser') {
        const active = (time + m.phaseS) % m.periodS < 0.6;
        if (!active) continue;
        for (const body of bodies) {
          if (body.isStatic) continue;
          if (Math.hypot(body.position.x - m.x, body.position.y - m.y) > m.radius) continue;
          Body.setVelocity(body, {
            x: body.velocity.x,
            y: body.velocity.y - m.force / 7200,
          });
        }
        if (time - this.geyserPuff[i] > 0.12) {
          this.geyserPuff[i] = time;
          this.hooks.fx.burst('smoke', m.x, m.y - 10, { count: 3, color: '#E8DCC8', power: 0.5 });
          this.hooks.fx.sound('geyser', { pitch: 0.9 + Math.random() * 0.2 });
        }
      } else if (m.kind === 'balloon') {
        const state = this.balloons.find((b) => b.mech === m);
        if (!state || state.popped) continue;
        const target = this.hooks.blockById(m.blockId);
        if (!target || target.destroyed) continue;
        // A static deck can't actually rise; writing a velocity onto it would
        // only fake a launch into everything resting on it.
        if (target.body.isStatic) continue;
        const gravity = this.level.gravity?.y ?? 2200;
        Body.setVelocity(target.body, {
          x: target.body.velocity.x,
          y: Math.max(-2.6, target.body.velocity.y - (gravity * 0.55 * m.lift) / 7200),
        });
      } else if (m.kind === 'lava') {
        for (const c of this.hooks.chickens()) {
          if (c.removed) continue;
          for (const body of c.bodies) {
            if (Math.abs(body.position.x - m.x) < m.w / 2 && Math.abs(body.position.y - m.y) < m.h / 2) {
              this.hooks.lavaHitChicken(c);
              break;
            }
          }
        }
        for (const w of this.hooks.weasels()) {
          if (w.defeated) continue;
          if (Math.abs(w.body.position.x - m.x) < m.w / 2 && Math.abs(w.body.position.y - m.y) < m.h / 2) {
            this.hooks.lavaHitWeasel(w);
          }
        }
      }
    }
  }

  /** Extra wind acceleration at a point (wind zones add to the level's base wind). */
  windAt(x: number, y: number): Vec2 {
    let wx = 0;
    let wy = 0;
    for (const m of this.level.mechanisms) {
      if (m.kind !== 'windZone') continue;
      if (Math.abs(x - m.x) > m.w / 2 || Math.abs(y - m.y) > m.h / 2) continue;
      wx += m.wind.x;
      wy += m.wind.y;
    }
    return { x: wx, y: wy };
  }

  /** Pop any balloon near a moving chicken. Returns true if one popped. */
  popBalloonsNear(x: number, y: number, radius = 46): boolean {
    let popped = false;
    for (const b of this.balloons) {
      if (b.popped) continue;
      if (Math.hypot(b.mech.x - x, b.mech.y - y) > radius) continue;
      b.popped = true;
      popped = true;
      this.hooks.fx.burst('confetti', b.mech.x, b.mech.y, { count: 8, color: '#F0ABFC', power: 0.7 });
      this.hooks.fx.sound('balloon', { pitch: 1.1 });
    }
    return popped;
  }
}
