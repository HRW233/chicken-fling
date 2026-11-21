/** Pointer + keyboard input, mapped into 1280x720 design space. */

export interface PointerSnapshot {
  x: number;
  y: number;
  down: boolean;
  downX: number;
  downY: number;
  justDown: boolean;
  justUp: boolean;
}

const TRACKED_KEYS = new Set([
  'KeyR',
  'KeyP',
  'KeyM',
  'KeyN',
  'Escape',
  'Space',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
]);

export class Input {
  readonly pointer: PointerSnapshot = {
    x: 0,
    y: 0,
    down: false,
    downX: 0,
    downY: 0,
    justDown: false,
    justUp: false,
  };
  private keys = new Set<string>();
  private keyQueue: string[] = [];
  private activePointer: number | null = null;
  private wheelAmount = 0;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly toDesign: (clientX: number, clientY: number) => { x: number; y: number },
  ) {
    const updatePos = (e: PointerEvent): void => {
      const p = this.toDesign(e.clientX, e.clientY);
      this.pointer.x = p.x;
      this.pointer.y = p.y;
    };

    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.activePointer !== null) return;
      this.activePointer = e.pointerId;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      updatePos(e);
      this.pointer.down = true;
      this.pointer.justDown = true;
      this.pointer.downX = this.pointer.x;
      this.pointer.downY = this.pointer.y;
    });

    canvas.addEventListener('pointermove', (e) => {
      if (this.activePointer !== null && e.pointerId !== this.activePointer) return;
      updatePos(e);
    });

    const endPointer = (e: PointerEvent): void => {
      if (this.activePointer !== null && e.pointerId !== this.activePointer) return;
      updatePos(e);
      this.activePointer = null;
      this.pointer.down = false;
      this.pointer.justUp = true;
    };
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      if (TRACKED_KEYS.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      this.keyQueue.push(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.pointer.down = false;
      this.activePointer = null;
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.wheelAmount += e.deltaY;
      },
      { passive: false },
    );
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  /** Drain queued key presses for this frame. */
  drainKeys(): string[] {
    if (this.keyQueue.length === 0) return [];
    const out = this.keyQueue;
    this.keyQueue = [];
    return out;
  }

  /** Wheel delta accumulated since the last call. */
  drainWheel(): number {
    const amount = this.wheelAmount;
    this.wheelAmount = 0;
    return amount;
  }

  /** Clear per-frame edge flags. Call at the end of each rendered frame. */
  endFrame(): void {
    this.pointer.justDown = false;
    this.pointer.justUp = false;
  }
}
