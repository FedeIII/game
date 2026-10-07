/**
 * Light textures for the Diablo-style lights: the world is dark, and each light (the player's
 * torch, a lamp, a candle, a portal) erases a hole in the darkness. The falloff is in dithered
 * steps on the world-pixel grid, so it looks like pixel art and not like a smooth gradient.
 */
import { Image } from './png.ts';
import { bayer, rgb } from './raster.ts';
import type { Frame } from './sprites.ts';

/**
 * The light settings. build.ts also writes them into the atlas JSON (meta.lighting), so the
 * client uses exactly the same colour and radii.
 */
export const LIGHTING = {
  ambient: '#04050a',
  ambientAlpha: 0.8,
  /** The radii of the light holes in the atlas. A light uses the nearest one; scaling would break the dither. */
  radii: [48, 96, 150],
  /** Fully lit inside this fraction of the radius. */
  inner: 0.37,
  glowRadius: 96,
  glow: '#ff8a3c',
  glowAlpha: 0.16,
} as const;

const STEPS = 10;

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

/**
 * The light textures. A "hole" is white with an alpha that is 1 in the centre and falls to 0 at
 * the radius, in dithered steps: the client erases the darkness with it. The glow is the warm,
 * additive light round a source; the client tints it.
 */
export function lightFrames(): Frame[] {
  const centre = { x: 0.5, y: 0.5 };
  const holes: Frame[] = LIGHTING.radii.map((radius) => ({
    name: `light/hole/${radius}`,
    image: radial(radius, rgb('#ffffff', 0), (r, x, y) => stepped(1 - smoothstep(radius * LIGHTING.inner, radius, r), x, y)),
    anchor: centre,
  }));
  return [
    ...holes,
    {
      name: 'light/glow',
      image: radial(LIGHTING.glowRadius, rgb('#ffffff', 0), (r, x, y) => LIGHTING.glowAlpha * stepped(Math.pow(1 - smoothstep(0, LIGHTING.glowRadius, r), 1.5), x, y)),
      anchor: centre,
    },
  ];
}
