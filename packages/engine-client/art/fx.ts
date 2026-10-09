/**
 * Effects of a fight: the effect of each attack style (`fx/<style>/<turn>/<0-3>`, attacks.ts)
 * and the star of a stun (`fx/star`). They are drawn in white and greys; the game tints them
 * (the colour of a blade, a spell, a flame) and turns them to the direction of the attack.
 *
 * Each effect is designed facing right (+x), from the attacker's chest at the anchor. The build
 * draws it again at each turn of FX_TURNS (turn k: k x 22.5 degrees clockwise), so its pixels
 * stay on the grid at every angle. The game makes the other 12 of the 16 directions with
 * quarter turns and mirrors, which keep the grid too (fxPlacement in attacks.ts).
 */
import { ATTACK_FRAMES, ATTACK_STYLES, FX_TURNS, type AttackStyle } from './attacks.ts';
import { Image } from './image.ts';
import type { Frame } from './sprites.ts';

/** The area of an effect facing right, in pixels from the anchor: x from `left` to `right`, y from -`half` to `half`. */
const FX_AREA = { left: -6, right: 26, half: 16 } as const;

/** The canvas of a turned effect: room for the area turned up to 67.5 degrees. Each frame is then cropped to its pixels. */
const CANVAS = { width: 48, height: 48, pivotX: 18, pivotY: 16 } as const;

/** A small hash for stable sparkle, 0..1. */
function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Writes a grey of brightness v (0..255) with alpha a (0..1), keeping the stronger of two writes. */
function plotImage(image: Image, x: number, y: number, v: number, a: number): void {
  if (a < 0.1 || !image.inside(x, y)) return;
  const old = image.get(x, y) & 0xff;
  const alpha = Math.round(Math.min(1, a) * 255);
  if (alpha <= old) return;
  const g = Math.max(0, Math.min(255, Math.round(v)));
  image.set(x, y, ((g << 24) | (g << 16) | (g << 8) | alpha) >>> 0);
}

/** Whether a point of an effect facing right (pixels from the anchor) is in its area. */
function inArea(dx: number, dy: number): boolean {
  return dx >= FX_AREA.left && dx < FX_AREA.right && dy >= -FX_AREA.half && dy < FX_AREA.half;
}

/**
 * One frame of an effect, turned by `turn` x 22.5 degrees. The effect draws in its own
 * coordinates (facing right, from the anchor); the canvas turns them.
 */
class Canvas {
  readonly image = new Image(CANVAS.width, CANVAS.height);
  private readonly cos: number;
  private readonly sin: number;

  constructor(turn: number) {
    const angle = (turn * Math.PI) / 8;
    this.cos = Math.cos(angle);
    this.sin = Math.sin(angle);
  }

  /**
   * Calls `f` for every pixel of the canvas whose centre is in the effect's area, with the
   * centre in the effect's coordinates (dx, dy) and the pixel (x, y), for sparkle.
   */
  each(f: (dx: number, dy: number, x: number, y: number) => void): void {
    for (let y = 0; y < CANVAS.height; y++) {
      for (let x = 0; x < CANVAS.width; x++) {
        const px = x + 0.5 - CANVAS.pivotX;
        const py = y + 0.5 - CANVAS.pivotY;
        const dx = px * this.cos + py * this.sin;
        const dy = py * this.cos - px * this.sin;
        if (inArea(dx, dy)) f(dx, dy, x, y);
      }
    }
  }

  /** Writes the canvas pixel (x, y) (from `each`). */
  set(x: number, y: number, v: number, a: number): void {
    plotImage(this.image, x, y, v, a);
  }

  /** Writes the pixel (dx, dy) of the effect (whole pixels from the anchor, facing right). */
  plot(dx: number, dy: number, v: number, a: number): void {
    if (!inArea(dx, dy)) return;
    const cx = dx + 0.5;
    const cy = dy + 0.5;
    plotImage(this.image, Math.floor(CANVAS.pivotX + cx * this.cos - cy * this.sin), Math.floor(CANVAS.pivotY + cx * this.sin + cy * this.cos), v, a);
  }
}

/**
 * A crescent that sweeps from `from` to `to` (radians, y down) at a radius: frame i shows it up to
 * its edge at that moment, bright at the edge and fading behind it; the last frame fades all.
 */
function sweep(c: Canvas, t: number, radius: number, thickness: number, from: number, to: number): Image {
  const span = to - from;
  const edge = from + span * Math.min(1, t * 1.35);
  const fade = t > 0.75 ? 1 - ((t - 0.75) / 0.25) * 0.75 : 1;
  c.each((dx, dy, x, y) => {
    const a = Math.atan2(dy, dx);
    if (a > edge || a < from) return;
    const along = (a - from) / span;
    const thick = 1.2 + thickness * Math.sin(Math.PI * along);
    const inner = radius - thick / 2;
    const r = Math.hypot(dx, dy);
    if (r < inner || r > inner + thick) return;
    const trail = Math.max(0, 1 - (edge - a) / 1.4);
    c.set(x, y, 150 + 105 * trail, trail * fade * 1.1);
  });
  return c.image;
}

/** A thin streak straight ahead with a bright point at its tip: a thrust. */
function streak(c: Canvas, t: number): Image {
  const length = [7, 19, 21, 21][Math.round(t * 4) - 1] ?? 21;
  const fade = t >= 1 ? 0.45 : 1;
  for (let i = 0; i < length; i++) {
    const k = i / length;
    c.plot(3 + i, 0, 140 + 115 * k, (0.25 + 0.75 * k) * fade);
    if (k > 0.55) c.plot(3 + i, -1, 120, 0.35 * k * fade);
  }
  if (t >= 0.5 && t < 1) {
    // A small flare at the tip.
    const tx = 3 + length;
    for (const [dx, dy, v] of [[0, 0, 255], [1, 0, 230], [0, -1, 210], [0, 1, 210], [-1, -1, 150], [-1, 1, 150], [2, 0, 170]] as const) c.plot(tx + dx, dy, v, 1);
  }
  return c.image;
}

/** A burst of magic at the end of the reach: a core, a ring that grows, and sparks. */
function burst(c: Canvas, t: number): Image {
  const cx = 17;
  const ring = [1.5, 4.5, 7.5, 9.5][Math.round(t * 4) - 1] ?? 9.5;
  const fade = [1, 1, 0.85, 0.45][Math.round(t * 4) - 1] ?? 0.45;
  c.each((dx, dy, x, y) => {
    const r = Math.hypot(dx - cx, dy);
    if (Math.abs(r - ring) < 0.9) c.set(x, y, 230, fade * (hash(x, y, 3) < 0.85 ? 1 : 0.4));
    if (r < Math.max(1.2, 3 - ring * 0.2) && t < 1) c.set(x, y, 255, 1);
    else if (r < ring - 1.5 && t <= 0.5) c.set(x, y, 160, 0.4);
  });
  // Sparks thrown out along eight rays.
  if (t >= 0.5) {
    for (let k = 0; k < 8; k++) {
      const angle = (k / 8) * 2 * Math.PI + 0.3;
      const d = ring + 2 + 2 * hash(k, 1, 9);
      c.plot(Math.round(cx + Math.cos(angle) * d), Math.round(Math.sin(angle) * d), 255, fade);
    }
  }
  return c.image;
}

/** A gout of fire ahead: a cone of flame, ragged, bright inside. */
function flame(c: Canvas, t: number): Image {
  const reach = [8, 20, 23, 22][Math.round(t * 4) - 1] ?? 22;
  const fade = t >= 1 ? 0.5 : 1;
  c.each((dx, dy, x, y) => {
    if (dx < 2 || dx > reach) return;
    const k = (dx - 2) / Math.max(1, reach - 2);
    const width = 1 + 5.5 * Math.sin(Math.PI * Math.min(1, k * 0.85 + 0.1));
    const wobble = 1.5 * Math.sin(dx * 0.9 + t * 9);
    const off = Math.abs(dy + wobble * k);
    const ragged = width * (0.75 + 0.5 * hash(x, Math.floor(y / 2), Math.round(t * 4)));
    if (off > ragged) return;
    const core = 1 - off / ragged;
    // Sparse at the tips and the edges: flame licks, not a solid shape.
    if (k > 0.8 && hash(x, y, 7 + Math.round(t * 4)) > 0.55) return;
    c.set(x, y, 120 + 135 * core, (0.5 + 0.5 * core) * fade);
  });
  return c.image;
}

/** A cloud of poison thrown ahead: soft puffs that grow and thin out. */
function cloud(c: Canvas, t: number): Image {
  const step = Math.round(t * 4);
  const steps: (readonly (readonly [number, number, number])[])[] = [
    [[8, 0, 2.5]],
    [[11, -1, 4], [16, 2, 3]],
    [[14, -2, 5.5], [19, 2, 5], [22, -1, 3.5]],
    [[16, -3, 6.5], [21, 2, 6], [25, -2, 4.5]],
  ];
  const puffs = steps[step - 1] ?? [];
  const density = [0.95, 0.9, 0.8, 0.45][step - 1] ?? 0.45;
  c.each((dx, dy, x, y) => {
    for (const [px, py, r] of puffs) {
      const d = Math.hypot(dx - px, dy - py);
      if (d > r) continue;
      const soft = 1 - d / r;
      if (hash(x, y, step) > density * (0.5 + soft)) continue;
      c.set(x, y, 150 + 90 * soft, 0.45 + 0.5 * soft);
    }
  });
  return c.image;
}

/** A shock wave from a palm: an arc that bulges ahead and moves out. */
function wave(c: Canvas, t: number): Image {
  const step = Math.round(t * 4);
  const x0 = [8, 12, 17, 21][step - 1] ?? 21;
  const height = [4, 7, 9, 10][step - 1] ?? 10;
  const fade = [0.8, 1, 0.9, 0.45][step - 1] ?? 0.45;
  c.each((dx, dy, x, y) => {
    if (Math.abs(dy) > height) return;
    const bulge = x0 + 3 * (1 - (dy / height) ** 2);
    const d = Math.abs(dx - bulge);
    if (d < 1) c.set(x, y, 250, fade);
    else if (d < 2 && dx < bulge) c.set(x, y, 170, fade * 0.55);
  });
  return c.image;
}

/** The hit of a fist: a star of short rays at the end of the reach. */
function impact(c: Canvas, t: number): Image {
  const step = Math.round(t * 4);
  const length = [1, 3, 4, 3][step - 1] ?? 3;
  const gap = [0, 1, 2, 3][step - 1] ?? 3;
  const fade = [0.7, 1, 0.9, 0.4][step - 1] ?? 0.4;
  const cx = 15;
  if (step <= 2) c.plot(cx, 0, 255, 1);
  for (let k = 0; k < 8; k++) {
    const angle = (k / 8) * 2 * Math.PI;
    for (let i = 0; i < length; i++) {
      const d = gap + 1 + i;
      c.plot(Math.round(cx + Math.cos(angle) * d), Math.round(Math.sin(angle) * d), 250 - i * 40, fade);
    }
  }
  return c.image;
}

const DRAW: Readonly<Record<AttackStyle, (c: Canvas, t: number) => Image>> = {
  slash: (c, t) => sweep(c, t, 15, 3.2, -1.05, 1.05),
  thrust: streak,
  bash: (c, t) => sweep(c, t, 12, 4.2, -1.45, 0.75),
  spell: burst,
  flame,
  miasma: cloud,
  palm: wave,
  punch: impact,
};

/** A small four-pointed star. */
function star(): Image {
  const image = new Image(5, 5);
  for (const [x, y, v] of [
    [2, 0, 200],
    [2, 1, 255],
    [0, 2, 200],
    [1, 2, 255],
    [2, 2, 255],
    [3, 2, 255],
    [4, 2, 200],
    [2, 3, 255],
    [2, 4, 200],
  ] as const) {
    plotImage(image, x, y, v, 1);
  }
  return image;
}

/** A frame of the canvas, cropped to its pixels, with the anchor where the canvas has it. */
function cropped(name: string, image: Image): Frame {
  let x0: number = CANVAS.pivotX;
  let y0: number = CANVAS.pivotY;
  let x1 = x0 + 1;
  let y1 = y0 + 1;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if ((image.get(x, y) & 0xff) === 0) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x + 1);
      y1 = Math.max(y1, y + 1);
    }
  }
  const out = new Image(x1 - x0, y1 - y0);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) out.set(x - x0, y - y0, image.get(x, y));
  return { name, image: out, anchor: { x: (CANVAS.pivotX - x0) / out.width, y: (CANVAS.pivotY - y0) / out.height } };
}

export function fxFrames(): Frame[] {
  const frames: Frame[] = [];
  for (const style of ATTACK_STYLES) {
    for (let turn = 0; turn < FX_TURNS; turn++) {
      for (let i = 0; i < ATTACK_FRAMES; i++) frames.push(cropped(`fx/${style}/${turn}/${i}`, DRAW[style](new Canvas(turn), (i + 1) / ATTACK_FRAMES)));
    }
  }
  frames.push({ name: 'fx/star', image: star(), anchor: { x: 0.5, y: 0.5 } });
  return frames;
}
