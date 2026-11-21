/**
 * Fixed-timestep loop. Gameplay always advances in 1/120 s steps, regardless of
 * display refresh rate. Rendering happens once per animation frame.
 */
export const STEP = 1 / 120;
const MAX_STEPS = 8;

export type UpdateFn = (dt: number, realDt: number) => void;
export type RenderFn = (alpha: number) => void;

export class Loop {
  timeScale = 1;
  paused = false;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private running = false;

  constructor(
    private readonly update: UpdateFn,
    private readonly render: RenderFn,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const frame = (ts: number): void => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(frame);
      let real = (ts - this.last) / 1000;
      this.last = ts;
      if (!Number.isFinite(real) || real < 0) real = 0;
      if (real > 0.25) real = 0.25;
      if (!this.paused) {
        this.acc += real * this.timeScale;
        let steps = 0;
        while (this.acc >= STEP && steps < MAX_STEPS) {
          this.update(STEP, real);
          this.acc -= STEP;
          steps++;
        }
        if (steps >= MAX_STEPS) this.acc = 0;
      } else {
        this.acc = 0;
      }
      this.render(this.acc / STEP);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}
