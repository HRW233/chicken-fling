import { clamp } from '../core/rng';

const DESIGN_W = 1280;

export class Camera {
  /** World-space x of the left edge of the view. */
  x = 0;
  private target = 0;
  shakeAmount = 0;
  reducedMotion = false;
  readonly offset = { x: 0, y: 0 };
  private shakePhase = Math.random() * Math.PI * 2;

  reset(): void {
    this.x = 0;
    this.target = 0;
    this.shakeAmount = 0;
    this.offset.x = 0;
    this.offset.y = 0;
  }

  shake(amount: number): void {
    if (this.reducedMotion) return;
    this.shakeAmount = Math.min(18, Math.max(this.shakeAmount, amount));
  }

  follow(worldX: number, dt: number, worldWidth = DESIGN_W): void {
    const maxX = Math.max(0, worldWidth - DESIGN_W);
    this.target = clamp(worldX - DESIGN_W * 0.5, 0, maxX);
    this.x += (this.target - this.x) * Math.min(1, dt * 4.5);
    if (this.shakeAmount > 0.05) {
      this.shakePhase += dt * 58;
      this.offset.x = Math.cos(this.shakePhase) * this.shakeAmount;
      this.offset.y = Math.sin(this.shakePhase * 1.31) * this.shakeAmount * 0.6;
      this.shakeAmount *= Math.exp(-dt * 9);
    } else {
      this.shakeAmount = 0;
      this.offset.x = 0;
      this.offset.y = 0;
    }
  }
}
