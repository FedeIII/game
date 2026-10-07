/**
 * Light textures for the Diablo-style light radius. The client puts "light/darkness" over the
 * world, centred on the player, and fills the rest of the screen with the ambient colour. The
 * falloff is in dithered steps on the world-pixel grid, so it looks like pixel art and not like
 * a smooth gradient. "light/glow" is a warm, additive torch light.
 */
import { Image } from './png.ts';
import { bayer, rgb } from './raster.ts';
import type { Frame } from './sprites.ts';

/**
 * The light settings. build.ts also writes them into the atlas JSON (meta.lighting), so the
 * client fills the screen beyond the darkness texture with exactly the same colour.
 */
export const LIGHTING = {
  /** Fully lit inside this radius (world pixels). */
  inner: 56,
  /** Full darkness outside this radius. */
  outer: 150,
  ambient: '#04050a',
  ambientAlpha: 0.8,
  glowRadius: 96,
  glow: '#ff8a3c',
  glowAlpha: 0.16,
} as const;

const INNER = LIGHTING.inner;
const OUTER = LIGHTING.outer;
const AMBIENT = rgb(LIGHTING.ambient, 0);
const AMBIENT_ALPHA = LIGHTING.ambientAlpha;
const STEPS = 10;
const GLOW_RADIUS = LIGHTING.glowRadius;
const GLOW = rgb(LIGHTING.glow, 0);
const GLOW_ALPHA = LIGHTING.glowAlpha;

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Puts a level in [0, 1] into STEPS steps, dithered. */
function stepped(f: number, x: number, y: number): number {
  return Math.min(STEPS, Math.floor(f * STEPS + bayer(x, y))) / STEPS;
}

function radial(radius: number, colour: number, alphaAt: (r: number, x: number, y: number) => number): Image {
  const size = radius * 2;
  const image = new Image(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.hypot(x + 0.5 - radius, y + 0.5 - radius);
      image.set(x, y, (colour | Math.round(255 * alphaAt(r, x, y))) >>> 0);
    }
  }
  return image;
}

export function lightFrames(): Frame[] {
  const centre = { x: 0.5, y: 0.5 };
  return [
    {
      name: 'light/darkness',
      image: radial(OUTER, AMBIENT, (r, x, y) => AMBIENT_ALPHA * stepped(smoothstep(INNER, OUTER, r), x, y)),
      anchor: centre,
    },
    {
      name: 'light/glow',
      image: radial(GLOW_RADIUS, GLOW, (r, x, y) => GLOW_ALPHA * stepped(Math.pow(1 - smoothstep(0, GLOW_RADIUS, r), 1.5), x, y)),
      anchor: centre,
    },
  ];
}
