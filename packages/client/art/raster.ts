/** Small 2D helpers for the art scripts. */
import { Image } from './png.ts';

export const TILE = 16;

/** Converts '#rrggbb' (and an optional alpha 0..255) to 0xRRGGBBAA. */
export function rgb(hex: string, alpha = 255): number {
  const value = Number.parseInt(hex.slice(1), 16);
  if (hex.length !== 7 || Number.isNaN(value)) throw new Error(`bad colour "${hex}"`);
  return ((value << 8) | alpha) >>> 0;
}

/** Converts a list of '#rrggbb' strings to colours. */
export function ramp(...hex: string[]): number[] {
  return hex.map((h) => rgb(h));
}

/** Mulberry32: a small seeded random generator, so every build gives the same art. */
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function int(rand: () => number, max: number): number {
  return Math.floor(rand() * max);
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** The 4x4 ordered-dither threshold for a pixel, in [0, 1). */
export function bayer(x: number, y: number): number {
  return BAYER4[(y & 3) * 4 + (x & 3)]! / 16;
}

/** Makes an image from text rows. '.' is transparent; other characters come from the palette. */
export function grid(rows: readonly string[], palette: Readonly<Record<string, number>>): Image {
  const width = rows[0]!.length;
  const image = new Image(width, rows.length);
  rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`grid row ${y} has ${row.length} pixels, expected ${width}: "${row}"`);
    for (let x = 0; x < width; x++) {
      const ch = row[x]!;
      if (ch === '.') continue;
      const colour = palette[ch];
      if (colour === undefined) throw new Error(`no palette colour for "${ch}" in row ${y}`);
      image.set(x, y, colour);
    }
  });
  return image;
}

export function fill(width: number, height: number, rgba: number): Image {
  const image = new Image(width, height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) image.set(x, y, rgba);
  return image;
}

/** Turns an image 90 degrees clockwise. */
export function rotate(image: Image): Image {
  const out = new Image(image.height, image.width);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) out.set(image.height - 1 - y, x, image.get(x, y));
  }
  return out;
}

export function rotateTimes(image: Image, turns: number): Image {
  let out = image;
  for (let i = 0; i < turns; i++) out = rotate(out);
  return out;
}

/** Draws a soft-edged ground shadow: an ellipse whose alpha falls off to the rim, in dithered steps. */
export function shadowEllipse(image: Image, cx: number, cy: number, rx: number, ry: number, alpha: number): void {
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const r = dx * dx + dy * dy;
      if (r > 1) continue;
      const strength = r < 0.5 ? 1 : 1 - (r - 0.5) / 0.5;
      if (strength < 0.35 && bayer(x, y) > strength * 1.8) continue;
      image.set(x, y, 0x04030600 | Math.round(alpha * (0.6 + 0.4 * strength)));
    }
  }
}

/**
 * Cuts an image down to its non-transparent pixels. The pivot (in pixels of the input) becomes
 * an anchor: a fraction of the new size, as PixiJS expects.
 */
export function cropToContent(
  image: Image,
  pivotX: number,
  pivotY: number,
): { image: Image; anchor: { x: number; y: number } } {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if ((image.get(x, y) & 0xff) === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) throw new Error('cropToContent: the image is empty');
  const out = new Image(maxX - minX + 1, maxY - minY + 1);
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) out.set(x - minX, y - minY, image.get(x, y));
  return { image: out, anchor: { x: (pivotX - minX) / out.width, y: (pivotY - minY) / out.height } };
}

/** Value noise that repeats every `period` pixels, with lattice cells of `cell` pixels. */
export function tileNoise(x: number, y: number, cell: number, period: number, seed: number): number {
  const n = Math.round(period / cell);
  const gx = x / cell;
  const gy = y / cell;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = gx - x0;
  const fy = gy - y0;
  const h = (i: number, j: number): number => {
    const xi = ((i % n) + n) % n;
    const yi = ((j % n) + n) % n;
    let v = Math.imul(xi, 0x27d4eb2d) ^ Math.imul(yi, 0x165667b1) ^ Math.imul(seed, 0x9e3779b1);
    // Two mixing rounds: with one, small lattice coordinates gave visible stripes.
    v = Math.imul(v ^ (v >>> 15), 0x2c1b3c6d);
    v = Math.imul(v ^ (v >>> 12), 0x297a2d39);
    v ^= v >>> 15;
    return (v >>> 0) / 4294967296;
  };
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const top = h(x0, y0) + (h(x0 + 1, y0) - h(x0, y0)) * sx;
  const bottom = h(x0, y0 + 1) + (h(x0 + 1, y0 + 1) - h(x0, y0 + 1)) * sx;
  return top + (bottom - top) * sy;
}
