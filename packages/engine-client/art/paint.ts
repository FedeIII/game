/**
 * A small painter for the scenes of the prologue (art/prologue.ts): pixel art at a low resolution,
 * with the tools of a painter who works in pixels: gradients with an ordered dither, soft glows,
 * shapes, value noise, ridges of hills and mountains, and trees. Colours are 0xRRGGBBAA.
 */
import { Image } from './image.ts';
import { bayer } from './raster.ts';

const r = (c: number) => (c >>> 24) & 0xff;
const g = (c: number) => (c >>> 16) & 0xff;
const b = (c: number) => (c >>> 8) & 0xff;
const a = (c: number) => c & 0xff;
const pack = (rr: number, gg: number, bb: number, aa: number) => ((Math.round(rr) << 24) | (Math.round(gg) << 16) | (Math.round(bb) << 8) | Math.round(aa)) >>> 0;

/** A colour from '#rrggbb'. */
export function hex(h: string, alpha = 255): number {
  return ((Number.parseInt(h.slice(1), 16) << 8) | alpha) >>> 0;
}

/** Colours from '#rrggbb' strings. */
export function hexes(...h: string[]): number[] {
  return h.map((x) => hex(x));
}

/** The colour between `c0` and `c1` (t from 0 to 1). */
export function lerpColour(c0: number, c1: number, t: number): number {
  const k = Math.max(0, Math.min(1, t));
  return pack(r(c0) + (r(c1) - r(c0)) * k, g(c0) + (g(c1) - g(c0)) * k, b(c0) + (b(c1) - b(c0)) * k, a(c0) + (a(c1) - a(c0)) * k);
}

/** A seeded random generator (mulberry32). */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A hash of a whole number and a seed, in [0, 1). */
function hash1(i: number, seed: number): number {
  let h = Math.imul(i ^ Math.imul(seed, 0x9e3779b1), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in one dimension, in [0, 1). */
export function noise1(x: number, seed: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const s = f * f * (3 - 2 * f);
  return hash1(i, seed) * (1 - s) + hash1(i + 1, seed) * s;
}

/** Fractal value noise in one dimension (octaves halve in size and in weight), in [0, 1). */
export function fbm1(x: number, seed: number, octaves = 4): number {
  let sum = 0;
  let weight = 0.5;
  let total = 0;
  let freq = 1;
  for (let o = 0; o < octaves; o++) {
    sum += noise1(x * freq, seed + o * 101) * weight;
    total += weight;
    weight *= 0.5;
    freq *= 2;
  }
  return sum / total;
}

/** Smooth value noise in two dimensions, in [0, 1). */
export function noise2(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const h = (i: number, j: number) => hash1(i * 7919 + j * 104729, seed);
  const top = h(ix, iy) * (1 - sx) + h(ix + 1, iy) * sx;
  const bottom = h(ix, iy + 1) * (1 - sx) + h(ix + 1, iy + 1) * sx;
  return top * (1 - sy) + bottom * sy;
}

/** Fractal value noise in two dimensions, in [0, 1). */
export function fbm2(x: number, y: number, seed: number, octaves = 4): number {
  let sum = 0;
  let weight = 0.5;
  let total = 0;
  let freq = 1;
  for (let o = 0; o < octaves; o++) {
    sum += noise2(x * freq, y * freq, seed + o * 131) * weight;
    total += weight;
    weight *= 0.5;
    freq *= 2;
  }
  return sum / total;
}

/** A layer of a scene: an RGBA image and the tools to paint on it. */
export class Canvas {
  readonly image: Image;
  readonly w: number;
  readonly h: number;

  constructor(w: number, h: number) {
    this.image = new Image(w, h);
    this.w = w;
    this.h = h;
  }

  get(x: number, y: number): number {
    return this.image.get(x, y);
  }

  set(x: number, y: number, c: number): void {
    this.image.set(Math.floor(x), Math.floor(y), c);
  }

  /** Blends `c` over the pixel with the share `k` (soft: for glows and mist). */
  mix(x: number, y: number, c: number, k: number): void {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    if (!this.image.inside(xi, yi) || k <= 0) return;
    const under = this.image.get(xi, yi);
    const ka = Math.min(1, k) * (a(c) / 255);
    if (a(under) === 0) {
      this.image.set(xi, yi, pack(r(c), g(c), b(c), 255 * ka));
      return;
    }
    const outA = ka + (a(under) / 255) * (1 - ka);
    const blend = (cu: number, cc: number) => (cc * ka + cu * (a(under) / 255) * (1 - ka)) / outA;
    this.image.set(xi, yi, pack(blend(r(under), r(c)), blend(g(under), g(c)), blend(b(under), b(c)), outA * 255));
  }

  /** Sets the pixel to `c` where the share `k` beats the ordered dither (crisp: the pixel-art way to fade). */
  dither(x: number, y: number, c: number, k: number): void {
    if (k > bayer(Math.floor(x), Math.floor(y))) this.set(x, y, c);
  }

  /** A colour of `ramp` at `t` (0 to 1), dithered between its steps. */
  static rampAt(ramp: readonly number[], t: number, x: number, y: number): number {
    const v = Math.max(0, Math.min(1, t)) * (ramp.length - 1);
    const i = Math.min(ramp.length - 1, Math.floor(v + bayer(x, y)));
    return ramp[i]!;
  }

  /** Fills rows y0..y1 (and columns x0..x1) with `ramp` from top to bottom, dithered; `curve` shapes the change. */
  vgrad(x0: number, y0: number, x1: number, y1: number, ramp: readonly number[], curve: (t: number) => number = (t) => t): void {
    for (let y = y0; y <= y1; y++) {
      const t = curve((y - y0) / Math.max(1, y1 - y0));
      for (let x = x0; x <= x1; x++) this.set(x, y, Canvas.rampAt(ramp, t, x, y));
    }
  }

  rect(x0: number, y0: number, x1: number, y1: number, c: number): void {
    for (let y = Math.floor(y0); y <= y1; y++) for (let x = Math.floor(x0); x <= x1; x++) this.set(x, y, c);
  }

  /** A filled disc; `shade(x, y, d)` (d: 0 in the middle, 1 at the rim) can give each pixel its colour. */
  disc(cx: number, cy: number, radius: number, c: number | ((x: number, y: number, d: number) => number | null)): void {
    for (let y = Math.floor(cy - radius); y <= cy + radius; y++) {
      for (let x = Math.floor(cx - radius); x <= cx + radius; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / radius;
        if (d > 1) continue;
        const colour = typeof c === 'number' ? c : c(x, y, d);
        if (colour !== null) this.set(x, y, colour);
      }
    }
  }

  /** A soft round glow: `c` at its middle, fading to nothing at `radius`. */
  glow(cx: number, cy: number, radius: number, c: number, strength = 1): void {
    for (let y = Math.floor(cy - radius); y <= cy + radius; y++) {
      for (let x = Math.floor(cx - radius); x <= cx + radius; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / radius;
        if (d < 1) this.mix(x, y, c, strength * (1 - d) * (1 - d));
      }
    }
  }

  /** A filled polygon (even-odd rule), by scanlines through the middles of the pixels. */
  poly(points: readonly (readonly [number, number])[], c: number | ((x: number, y: number) => number | null)): void {
    const ys = points.map(([, y]) => y);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) {
      const cy = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i]!;
        const [bx, by] = points[(i + 1) % points.length]!;
        if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k]! - 0.5); x <= Math.floor(xs[k + 1]! - 0.5); x++) {
          const colour = typeof c === 'number' ? c : c(x, y);
          if (colour !== null) this.set(x, y, colour);
        }
      }
    }
  }

  /** A line of pixels (Bresenham). */
  line(x0: number, y0: number, x1: number, y1: number, c: number): void {
    let x = Math.round(x0);
    let y = Math.round(y0);
    const xe = Math.round(x1);
    const ye = Math.round(y1);
    const dx = Math.abs(xe - x);
    const dy = -Math.abs(ye - y);
    const sx = x < xe ? 1 : -1;
    const sy = y < ye ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x, y, c);
      if (x === xe && y === ye) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /**
   * A ridge: for each column x, the land from `top(x)` down to the bottom of the layer, in the colour
   * `fill(x, y, depth)` (depth: rows below the top). `rim` paints the top pixel of each column.
   */
  ridge(top: (x: number) => number, fill: (x: number, y: number, depth: number) => number, rim?: (x: number, slope: number) => number | null): void {
    for (let x = 0; x < this.w; x++) {
      const t = Math.round(top(x));
      for (let y = Math.max(0, t); y < this.h; y++) this.set(x, y, fill(x, y, y - t));
      if (rim) {
        const colour = rim(x, top(x + 1) - top(x - 1));
        if (colour !== null) this.set(x, t, colour);
      }
    }
  }

  /**
   * A pine, from its foot (x, foot) up `height` pixels: tiers of branches that grow wider to the
   * bottom. `side` (-1 or 1) is the side of the light: its rim gets `lit`.
   */
  pine(x: number, foot: number, height: number, dark: number, lit: number | null = null, side = -1): void {
    const top = foot - height;
    const tiers = Math.max(2, Math.round(height / 6));
    for (let y = Math.floor(top); y <= foot; y++) {
      const t = (y - top) / Math.max(1, height);
      // Each tier flares out, then the next starts narrower.
      const tier = (t * tiers) % 1;
      const half = Math.max(0.5, (height * 0.32) * (0.25 + 0.75 * t) * (0.55 + 0.45 * tier));
      for (let px = Math.round(x - half); px <= Math.round(x + half); px++) this.set(px, y, dark);
      if (lit !== null && t > 0.08) this.set(Math.round(x + side * half), y, lit);
    }
    this.set(Math.round(x), Math.floor(top) - 1, dark);
  }

  /** A round broadleaf tree: a trunk and a crown of blobs. */
  broadleaf(x: number, foot: number, height: number, dark: number, trunk: number, seed: number): void {
    this.rect(x - 1, foot - height * 0.45, x, foot, trunk);
    const rand = rng(seed);
    const cy = foot - height * 0.65;
    const radius = height * 0.33;
    for (let i = 0; i < 6; i++) this.disc(x + (rand() - 0.5) * radius * 1.2, cy + (rand() - 0.5) * radius * 0.9, radius * (0.55 + rand() * 0.35), dark);
  }
}

/** Composes layers into one image (for previews and tests): each one shifted by `dx`. */
export function compose(w: number, h: number, layers: readonly { readonly image: Image; readonly dx: number }[]): Image {
  const out = new Image(w, h);
  for (const { image, dx } of layers) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = image.get(x + dx, y);
        const ca = c & 0xff;
        if (ca === 0) continue;
        if (ca === 255) {
          out.set(x, y, c);
          continue;
        }
        const u = out.get(x, y);
        const k = ca / 255;
        out.set(x, y, pack(r(u) * (1 - k) + r(c) * k, g(u) * (1 - k) + g(c) * k, b(u) * (1 - k) + b(c) * k, 255));
      }
    }
  }
  return out;
}
