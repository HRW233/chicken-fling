export const FONT = 'ui-rounded, "Nunito", "Baloo 2", "Trebuchet MS", system-ui, sans-serif';

export interface Hit {
  x: number;
  y: number;
  w: number;
  h: number;
  action: (px: number, py: number) => void;
  drag?: boolean;
}

export class Ui {
  hits: Hit[] = [];

  begin(): void {
    this.hits.length = 0;
  }

  add(hit: Hit): void {
    this.hits.push(hit);
  }

  hitTest(x: number, y: number): Hit | null {
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const h = this.hits[i];
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h;
    }
    return null;
  }

  panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha = 0.92): void {
    ctx.save();
    ctx.globalAlpha = alpha;
    roundRect(ctx, x, y, w, h, 18);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#4A2E17');
    g.addColorStop(1, '#2E1B0C');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#C9A24A';
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.35;
    ctx.strokeStyle = '#F4E4B2';
    ctx.lineWidth = 1.5;
    roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 14);
    ctx.stroke();
    ctx.restore();
  }

  button(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    action: () => void,
    opts: { sub?: string; variant?: 'primary' | 'secondary' | 'ghost'; disabled?: boolean; size?: number } = {},
  ): void {
    const variant = opts.variant ?? 'secondary';
    const disabled = Boolean(opts.disabled);
    ctx.save();
    ctx.globalAlpha = disabled ? 0.45 : 1;
    ctx.translate(0, 0);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    if (variant === 'primary') {
      g.addColorStop(0, '#F0793F');
      g.addColorStop(1, '#C2410C');
    } else if (variant === 'ghost') {
      g.addColorStop(0, 'rgba(74,46,23,0.7)');
      g.addColorStop(1, 'rgba(46,27,12,0.7)');
    } else {
      g.addColorStop(0, '#A6703F');
      g.addColorStop(1, '#6E441F');
    }
    roundRect(ctx, x, y + 4, w, h, 16);
    ctx.fillStyle = 'rgba(20,10,4,0.55)';
    ctx.fill();
    roundRect(ctx, x, y, w, h, 16);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = variant === 'ghost' ? 2 : 4;
    ctx.strokeStyle = variant === 'primary' ? '#FFD9A0' : '#E2C07A';
    ctx.stroke();
    if (variant !== 'ghost') {
      ctx.globalAlpha *= 0.4;
      roundRect(ctx, x + 8, y + 7, w - 16, Math.max(6, h * 0.22), 8);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fill();
      ctx.globalAlpha = disabled ? 0.45 : 1;
    }
    ctx.fillStyle = '#FFF6DF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const size = opts.size ?? Math.min(34, Math.max(20, h * 0.3));
    ctx.font = `800 ${size}px ${FONT}`;
    const cy = opts.sub ? y + h * 0.4 : y + h / 2;
    ctx.fillText(label, x + w / 2, cy);
    if (opts.sub) {
      ctx.font = `600 ${Math.max(14, Math.min(19, size * 0.52))}px ${FONT}`;
      ctx.fillStyle = 'rgba(255,240,210,0.8)';
      ctx.fillText(opts.sub, x + w / 2, y + h * 0.72);
    }
    ctx.restore();
    if (!disabled) this.add({ x, y, w, h, action });
  }

  toggle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    value: boolean,
    onChange: (v: boolean) => void,
  ): void {
    ctx.save();
    ctx.font = `700 24px ${FONT}`;
    ctx.fillStyle = '#FFF1CE';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 10, y + h / 2);
    const sw = 84;
    const sx = x + w - sw - 10;
    const sy = y + h / 2 - 20;
    roundRect(ctx, sx, sy, sw, 40, 20);
    ctx.fillStyle = value ? '#7BC950' : '#5A4632';
    ctx.fill();
    ctx.strokeStyle = value ? '#B9ED8C' : '#8B7355';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx + (value ? sw - 21 : 21), sy + 20, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF6DF';
    ctx.fill();
    ctx.restore();
    this.add({ x, y, w, h, action: () => onChange(!value), drag: false });
  }

  slider(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    label: string,
    value: number,
    onChange: (v: number) => void,
  ): void {
    ctx.save();
    ctx.font = `700 22px ${FONT}`;
    ctx.fillStyle = '#FFF1CE';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 6, y);
    ctx.fillStyle = '#D9B45B';
    ctx.font = `700 19px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(value * 100)}%`, x + w - 6, y);
    const trackY = y + 24;
    const trackX = x + 8;
    const trackW = w - 16;
    roundRect(ctx, trackX, trackY, trackW, 14, 7);
    ctx.fillStyle = '#2A1A0C';
    ctx.fill();
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 2;
    ctx.stroke();
    roundRect(ctx, trackX, trackY, Math.max(10, trackW * value), 14, 7);
    ctx.fillStyle = '#F0A63C';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(trackX + trackW * value, trackY + 7, 13, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF1CE';
    ctx.fill();
    ctx.strokeStyle = '#8A6A16';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    const hitY = y - 16;
    const hitH = 62;
    this.add({
      x,
      y: hitY,
      w,
      h: hitH,
      drag: true,
      action: (px) => onChange(Math.max(0, Math.min(1, (px - trackX) / trackW))),
    });
  }
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function text(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  size: number,
  color = '#FFF6DF',
  align: CanvasTextAlign = 'left',
  weight = 700,
  baseline: CanvasTextBaseline = 'middle',
): void {
  ctx.save();
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(str, x, y);
  ctx.restore();
}

export function starIcon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, filled: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? '#FFD166' : 'rgba(30,18,8,0.45)';
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.14);
  ctx.strokeStyle = filled ? '#8A6A16' : 'rgba(201,162,74,0.5)';
  ctx.stroke();
  ctx.restore();
}

export function starRow(ctx: CanvasRenderingContext2D, x: number, y: number, stars: number, size = 16, gap = 34): void {
  for (let i = 0; i < 3; i++) starIcon(ctx, x + i * gap, y, size, i < stars);
}
