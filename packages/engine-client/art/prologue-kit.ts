/**
 * What the scenes of the prologue share (art/prologue.ts, art/prologue-map.ts,
 * art/prologue-dominions.ts): the view, the types of a scene, and the pieces of a painting that
 * more than one scene uses (stars, the moon, hills, mountains, clouds).
 */
import { Canvas, fbm1, fbm2, hex, hexes, lerpColour, rng } from './paint.ts';
import type { Image } from './image.ts';

/** The view of the prologue (pixels of the art). */
export const PROLOGUE_VIEW = { w: 320, h: 180 } as const;
/** The width of a layer that moves: the view and room for the parallax. */
export const WIDE = 384;

/** Something that moves on a layer: the page makes its particles in the box (x, y, w, h). */
export interface PrologueEmitter {
  readonly kind: 'twinkle' | 'smoke' | 'embers' | 'fireflies' | 'motes' | 'sparkles' | 'flame' | 'birds' | 'mist';
  /** The index of the layer that it moves with. */
  readonly layer: number;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** About how many particles a second (or, for twinkle, how many stars). */
  readonly rate: number;
  /** Its colour, as '#rrggbb'. */
  readonly colour: string;
}

export interface PrologueLayer {
  readonly image: Image;
  /** How much it moves with the pan: 0 does not move, 1 moves the most. */
  readonly depth: number;
  /**
   * How far the layer rises over a card, in pixels: the view goes down it (a map, north to south).
   * The image is that much taller than the view. None: it does not rise.
   */
  readonly rise?: number;
  /** A layer for one language only (the labels of a map). None: for every language. */
  readonly lang?: 'en' | 'es';
}

export interface PrologueScene {
  readonly id: string;
  readonly layers: readonly PrologueLayer[];
  readonly emitters: readonly PrologueEmitter[];
  /** The sound under the scene (an ambience of src/audio/sounds.ts). */
  readonly ambience?: string;
}

export const H = PROLOGUE_VIEW.h;

// ---------------------------------------------------------------- shared pieces

/** Stars on a night sky: dim pixels, some brighter, a few with a cross. Returns the bright ones (they twinkle). */
export function stars(c: Canvas, seed: number, count: number, maxY: number): void {
  const rand = rng(seed);
  const tones = hexes('#5a6280', '#8890b0', '#b8c0d8', '#e8ecff', '#fff3d8');
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rand() * c.w);
    const y = Math.floor(rand() * rand() * maxY);
    const v = rand();
    const tone = tones[v < 0.6 ? 0 : v < 0.85 ? 1 : v < 0.95 ? 2 : v < 0.99 ? 3 : 4]!;
    c.set(x, y, tone);
    if (v > 0.985) {
      c.mix(x - 1, y, tone, 0.5);
      c.mix(x + 1, y, tone, 0.5);
      c.mix(x, y - 1, tone, 0.5);
      c.mix(x, y + 1, tone, 0.5);
    }
  }
}

/** The moon: a disc with craters and a dark side to the lower left, and a halo. */
export function moon(c: Canvas, cx: number, cy: number, radius: number, seed: number): void {
  c.glow(cx, cy, radius * 3.2, hex('#7f90c0'), 0.28);
  c.glow(cx, cy, radius * 1.7, hex('#c8d2ea'), 0.25);
  const lit = hexes('#7c8098', '#a4a6b8', '#c8c6cc', '#e2ddd0', '#f4efe0');
  c.disc(cx, cy, radius, (x, y, d) => {
    const lx = (x + 0.5 - cx) / radius;
    const ly = (y + 0.5 - cy) / radius;
    let t = 0.75 + 0.35 * (lx * 0.6 - ly * 0.4) - 0.25 * d * d;
    const crater = fbm2(x / 4, y / 4, seed, 3);
    if (crater > 0.62) t -= 0.25;
    else if (crater > 0.56) t -= 0.12;
    return Canvas.rampAt(lit, t, x, y);
  });
}

/** A smooth curve of heights: `base` plus fractal noise of `amplitude` (higher noise, higher land). */
export function heights(base: number, amplitude: number, scale: number, seed: number, octaves = 4): (x: number) => number {
  return (x) => base - fbm1(x / scale, seed, octaves) * amplitude;
}

/** A sharper mountain range: ridged noise (peaks, not hills). */
export function peaks(base: number, amplitude: number, scale: number, seed: number): (x: number) => number {
  return (x) => {
    const n = fbm1(x / scale, seed, 5);
    const ridged = 1 - Math.abs(n * 2 - 1);
    return base - (ridged * ridged * 0.75 + n * 0.25) * amplitude;
  };
}

/**
 * A mountain range from `top`: faces that look to the light (`side`: 1 for a light on the right) are
 * lighter near the top; `ramp` goes from the dark foot to the lit crest. Snow (`snow`) covers what is
 * higher than the row `snowLine`.
 */
export function mountains(c: Canvas, top: (x: number) => number, ramp: readonly number[], snow: number | null, snowLine: number, side: number): void {
  for (let x = 0; x < c.w; x++) {
    const t = Math.round(top(x));
    // The slope over a few columns: which way the face looks.
    const slope = (top(x + 2) - top(x - 2)) * side;
    const facing = Math.max(-1, Math.min(1, slope / 3));
    for (let y = Math.max(0, t); y < c.h; y++) {
      const d = y - t;
      // Gullies: darker streaks down the faces.
      const gully = fbm2(x / 3, y / 14, 61, 3);
      const light = (facing * 0.5 + 0.35) * Math.max(0, 1 - d / 40) - (gully > 0.62 ? 0.25 : 0) - d / 90;
      c.set(x, y, Canvas.rampAt(ramp, 0.25 + light, x, y));
    }
    if (snow !== null && t < snowLine) {
      const depth = (snowLine - t) * 0.55;
      for (let y = t; y < t + depth; y++) c.dither(x, y, snow, 1.05 - (y - t) / depth + facing * 0.35 - (fbm2(x / 4, y / 6, 71, 2) > 0.6 ? 0.4 : 0));
    }
  }
}

/** A body of clouds in streaks: dark, with the side toward the sun lit. */
export function streakClouds(c: Canvas, seed: number, y0: number, y1: number, dark: number, lit: number, sunX: number, sunY: number, threshold = 0.6): void {
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < c.w; x++) {
      const n = fbm2(x / 46, y / 4.5, seed, 4);
      if (n < threshold) continue;
      const below = fbm2(x / 46, (y + 1) / 4.5, seed, 4) < threshold;
      const near = Math.max(0, 1 - Math.hypot(x - sunX, (y - sunY) * 2) / 230);
      c.set(x, y, below ? lerpColour(dark, lit, 0.4 + near * 0.6) : lerpColour(dark, lit, near * 0.35 * (n - threshold) * 8));
    }
  }
}
