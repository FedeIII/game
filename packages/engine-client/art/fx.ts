/**
 * Effects of a fight: the effect of each attack style (`fx/<style>/<0-3>`, attacks.ts) and the
 * star of a stun (`fx/star`). They are drawn in white and greys; the game tints them (the
 * colour of a blade, a spell, a flame) and turns them to the side of the attack: each one faces
 * right (+x), from the attacker's chest at the anchor, on the left of the frame.
 */
import { ATTACK_FRAMES, ATTACK_STYLES, type AttackStyle } from './attacks.ts';
import { Image } from './image.ts';
import type { Frame } from './sprites.ts';

/** The frame of an effect. */
export const FX_FRAME = { width: 32, height: 32, pivotX: 6, pivotY: 16 } as const;

/** Writes a grey of brightness v (0..255) with alpha a (0..1), keeping the stronger of two writes. */
function plot(image: Image, x: number, y: number, v: number, a: number): void {
  if (a < 0.1 || !image.inside(x, y)) return;
  const old = image.get(x, y) & 0xff;
  const alpha = Math.round(Math.min(1, a) * 255);
  if (alpha <= old) return;
  const g = Math.max(0, Math.min(255, Math.round(v)));
  image.set(x, y, ((g << 24) | (g << 16) | (g << 8) | alpha) >>> 0);
}

/** A small hash for stable sparkle, 0..1. */
function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Calls `f` with the coordinates of every pixel centre, relative to the anchor. */
function each(image: Image, f: (dx: number, dy: number, x: number, y: number) => void): void {
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) f(x + 0.5 - FX_FRAME.pivotX, y + 0.5 - FX_FRAME.pivotY, x, y);
}

/**
 * A crescent that sweeps from `from` to `to` (radians, y down) at a radius: frame i shows it up to
 * its edge at that moment, bright at the edge and fading behind it; the last frame fades all.
 */
function sweep(t: number, radius: number, thickness: number, from: number, to: number): Image {
  const image = new Image(FX_FRAME.width, FX_FRAME.height);
  const span = to - from;
  const edge = from + span * Math.min(1, t * 1.35);
  const fade = t > 0.75 ? 1 - ((t - 0.75) / 0.25) * 0.75 : 1;
  each(image, (dx, dy, x, y) => {
    const a = Math.atan2(dy, dx);
    if (a > edge || a < from) return;
    const along = (a - from) / span;
    const thick = 1.2 + thickness * Math.sin(Math.PI * along);
    const inner = radius - thick / 2;
    const r = Math.hypot(dx, dy);
    if (r < inner || r > inner + thick) return;
    const trail = Math.max(0, 1 - (edge - a) / 1.4);
    plot(image, x, y, 150 + 105 * trail, trail * fade * 1.1);
  });
  return image;
}

/** A thin streak straight ahead with a bright point at its tip: a thrust. */
function streak(t: number): Image {
  const image = new Image(FX_FRAME.width, FX_FRAME.height);
  const length = [7, 19, 21, 21][Math.round(t * 4) - 1] ?? 21;
  const fade = t >= 1 ? 0.45 : 1;
  for (let i = 0; i < length; i++) {
    const k = i / length;
    plot(image, FX_FRAME.pivotX + 3 + i, FX_FRAME.pivotY, 140 + 115 * k, (0.25 + 0.75 * k) * fade);
    if (k > 0.55) plot(image, FX_FRAME.pivotX + 3 + i, FX_FRAME.pivotY - 1, 120, 0.35 * k * fade);
  }
  if (t >= 0.5 && t < 1) {
    // A small flare at the tip.
    const tx = FX_FRAME.pivotX + 3 + length;
    for (const [dx, dy, v] of [[0, 0, 255], [1, 0, 230], [0, -1, 210], [0, 1, 210], [-1, -1, 150], [-1, 1, 150], [2, 0, 170]] as const) plot(image, tx + dx, FX_FRAME.pivotY + dy, v, 1);
  }
  return image;
}

/** A burst of magic at the end of the reach: a core, a ring that grows, and sparks. */
function burst(t: number): Image {
  const image = new Image(FX_FRAME.width, FX_FRAME.height);
  const cx = 17;
  const ring = [1.5, 4.5, 7.5, 9.5][Math.round(t * 4) - 1] ?? 9.5;
  const fade = [1, 1, 0.85, 0.45][Math.round(t * 4) - 1] ?? 0.45;
  each(image, (dx, dy, x, y) => {
    const r = Math.hypot(dx - cx, dy);
    if (Math.abs(r - ring) < 0.9) plot(image, x, y, 230, fade * (hash(x, y, 3) < 0.85 ? 1 : 0.4));
    if (r < Math.max(1.2, 3 - ring * 0.2) && t < 1) plot(image, x, y, 255, 1);
    else if (r < ring - 1.5 && t <= 0.5) plot(image, x, y, 160, 0.4);
  });
  // Sparks thrown out along eight rays.
  if (t >= 0.5) {
    for (let k = 0; k < 8; k++) {
      const angle = (k / 8) * 2 * Math.PI + 0.3;
      const d = ring + 2 + 2 * hash(k, 1, 9);
      plot(image, Math.round(FX_FRAME.pivotX + cx + Math.cos(angle) * d), Math.round(FX_FRAME.pivotY + Math.sin(angle) * d), 255, fade);
    }
  }
  return image;
}

/** A gout of fire ahead: a cone of flame, ragged, bright inside. */
function flame(t: number): Image {
  const image = new Image(FX_FRAME.width, FX_FRAME.height);
  const reach = [8, 20, 23, 22][Math.round(t * 4) - 1] ?? 22;
  const fade = t >= 1 ? 0.5 : 1;
  each(image, (dx, dy, x, y) => {
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
    plot(image, x, y, 120 + 135 * core, (0.5 + 0.5 * core) * fade);
  });
  return image;
}

/** A cloud of poison thrown ahead: soft puffs that grow and thin out. */
function cloud(t: number): Image {
  const image = new Image(FX_FRAME.width, FX_FRAME.height);
  const step = Math.round(t * 4);
  const steps: (readonly (readonly [number, number, number])[])[] = [
    [[8, 0, 2.5]],
    [[11, -1, 4], [16, 2, 3]],
    [[14, -2, 5.5], [19, 2, 5], [22, -1, 3.5]],
    [[16, -3, 6.5], [21, 2, 6], [25, -2, 4.5]],
  ];
  const puffs = steps[step - 1] ?? [];
  const density = [0.95, 0.9, 0.8, 0.45][step - 1] ?? 0.45;
  each(image, (dx, dy, x, y) => {
    for (const [px, py, r] of puffs) {
      const d = Math.hypot(dx - px, dy - py);
      if (d > r) continue;
      const soft = 1 - d / r;
      if (hash(x, y, step) > density * (0.5 + soft)) continue;
      plot(image, x, y, 150 + 90 * soft, 0.45 + 0.5 * soft);
    }
  });
  return image;
}

/** A shock wave from a palm: an arc that bulges ahead and moves out. */
function wave(t: number): Image {
  const image = new Image(FX_FRAME.width, FX_FRAME.height);
  const step = Math.round(t * 4);
  const x0 = [8, 12, 17, 21][step - 1] ?? 21;
  const height = [4, 7, 9, 10][step - 1] ?? 10;
  const fade = [0.8, 1, 0.9, 0.45][step - 1] ?? 0.45;
  each(image, (dx, dy, x, y) => {
    if (Math.abs(dy) > height) return;
    const bulge = x0 + 3 * (1 - (dy / height) ** 2);
    const d = Math.abs(dx - bulge);
    if (d < 1) plot(image, x, y, 250, fade);
    else if (d < 2 && dx < bulge) plot(image, x, y, 170, fade * 0.55);
  });
  return image;
}

/** The hit of a fist: a star of short rays at the end of the reach. */
function impact(t: number): Image {
  const image = new Image(FX_FRAME.width, FX_FRAME.height);
  const step = Math.round(t * 4);
  const length = [1, 3, 4, 3][step - 1] ?? 3;
  const gap = [0, 1, 2, 3][step - 1] ?? 3;
  const fade = [0.7, 1, 0.9, 0.4][step - 1] ?? 0.4;
  const cx = FX_FRAME.pivotX + 15;
  const cy = FX_FRAME.pivotY;
  if (step <= 2) plot(image, cx, cy, 255, 1);
  for (let k = 0; k < 8; k++) {
    const angle = (k / 8) * 2 * Math.PI;
    for (let i = 0; i < length; i++) {
      const d = gap + 1 + i;
      plot(image, Math.round(cx + Math.cos(angle) * d), Math.round(cy + Math.sin(angle) * d), 250 - i * 40, fade);
    }
  }
  return image;
}

const DRAW: Readonly<Record<AttackStyle, (t: number) => Image>> = {
  slash: (t) => sweep(t, 15, 3.2, -1.05, 1.05),
  thrust: streak,
  bash: (t) => sweep(t, 12, 4.2, -1.45, 0.75),
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
    plot(image, x, y, v, 1);
  }
  return image;
}

export function fxFrames(): Frame[] {
  const anchor = { x: FX_FRAME.pivotX / FX_FRAME.width, y: FX_FRAME.pivotY / FX_FRAME.height };
  const frames: Frame[] = [];
  for (const style of ATTACK_STYLES) {
    for (let i = 0; i < ATTACK_FRAMES; i++) frames.push({ name: `fx/${style}/${i}`, image: DRAW[style]((i + 1) / ATTACK_FRAMES), anchor });
  }
  frames.push({ name: 'fx/star', image: star(), anchor: { x: 0.5, y: 0.5 } });
  return frames;
}
