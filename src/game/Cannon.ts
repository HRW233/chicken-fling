import { clamp } from '../core/rng';
import type { ChickenId, Level } from '../data/types';

const DEG = Math.PI / 180;
export const BARREL_LENGTH = 66;

/** Visual + input state for the barn cannon. Owns no physics. */
export class Cannon {
  readonly pivot: { x: number; y: number };
  readonly minAngle: number;
  readonly maxAngle: number;
  angle: number;
  targetAngle: number;
  private angularVelocity = 0;
  charging = false;
  charge = 0;
  loaded: ChickenId | null = null;
  loadT = 1;
  flashTimer = 0;
  recoilT = 999;
  private lastShotPower = 0;
  private pointerDist = 0;

  constructor(config: Level['cannon']) {
    this.pivot = { x: config.x, y: config.y };
    this.minAngle = config.minAngleDeg * DEG;
    this.maxAngle = config.maxAngleDeg * DEG;
    this.angle = clamp(38 * DEG, this.minAngle, this.maxAngle);
    this.targetAngle = this.angle;
  }

  get muzzleX(): number {
    return this.pivot.x + Math.cos(this.angle) * BARREL_LENGTH;
  }

  get muzzleY(): number {
    return this.pivot.y - Math.sin(this.angle) * BARREL_LENGTH;
  }

  get isCharging(): boolean {
    return this.charging;
  }

  setLoaded(id: ChickenId | null): void {
    if (id === this.loaded) return;
    this.loaded = id;
    this.loadT = id ? 0 : 1;
  }

  begin(x: number, y: number): void {
    if (!this.loaded) return;
    this.aimAt(x, y);
  }

  aimAt(x: number, y: number): void {
    const dx = x - this.pivot.x;
    const dy = this.pivot.y - y;
    const dist = Math.hypot(dx, dy);
    this.pointerDist = dist;
    if (dist > 18) {
      const a = Math.atan2(dy, dx);
      // Keep the barrel pointing at the pointer, clamped to the level's arc.
      this.targetAngle = clamp(a, this.minAngle, this.maxAngle);
    }
    if (dist < 30) {
      this.cancelCharge();
      return;
    }
    if (dist > 40) {
      const wasCharging = this.charging;
      this.charging = true;
      this.charge = clamp((dist - 40) / 360, 0, 1);
      if (!wasCharging) this.charge = Math.max(this.charge, 0.02);
    }
  }

  cancelCharge(): void {
    this.charging = false;
    this.charge = 0;
  }

  /** Use the charge if it is meaningfully above the dead zone. */
  release(): { angle: number; power: number } | null {
    if (!this.charging || !this.loaded) {
      this.cancelCharge();
      return null;
    }
    const power = this.charge;
    if (power < 0.06) {
      this.cancelCharge();
      return null;
    }
    this.lastShotPower = power;
    this.charging = false;
    this.charge = 0;
    this.flashTimer = 0.09;
    this.recoilT = 0;
    return { angle: this.angle, power };
  }

  update(dt: number): void {
    // Under-damped angular spring: heavy barrel with a small settle wobble.
    const stiffness = 520;
    const damping = 30;
    const accel = (this.targetAngle - this.angle) * stiffness - this.angularVelocity * damping;
    this.angularVelocity += accel * dt;
    this.angle += this.angularVelocity * dt;
    if (this.angle < this.minAngle) {
      this.angle = this.minAngle;
      this.angularVelocity = Math.max(0, this.angularVelocity) * 0.3;
    } else if (this.angle > this.maxAngle) {
      this.angle = this.maxAngle;
      this.angularVelocity = Math.min(0, this.angularVelocity) * 0.3;
    }
    this.loadT = Math.min(1, this.loadT + dt / 0.38);
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.recoilT += dt;
  }

  /** Carriage offset in px for the current recoil phase. */
  recoilOffset(): { x: number; y: number } {
    const t = this.recoilT;
    if (t > 0.32) return { x: 0, y: 0 };
    let back = 0;
    if (t < 0.09) {
      back = (t / 0.09) * 14;
    } else {
      const u = (t - 0.09) / 0.23;
      back = 14 * (1 - u) * Math.cos(u * Math.PI * 4) * Math.exp(-u * 2.2);
    }
    const dirX = -Math.cos(this.angle);
    const dirY = Math.sin(this.angle);
    return { x: dirX * back, y: dirY * back - back * 0.28 };
  }

  get power(): number {
    return this.lastShotPower;
  }

  get pointerDistance(): number {
    return this.pointerDist;
  }
}
