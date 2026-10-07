/**
 * Ground tiles and their edge pieces. The tiles are mottled with noise that repeats every 16
 * pixels, so neighbouring tiles join without a seam. Colours are dark and desaturated.
 */
import { Image } from './png.ts';
import { TILE, int, random, ramp, rgb, rotateTimes, tileNoise } from './raster.ts';
import type { Frame } from './sprites.ts';

interface GroundStyle {
  /** Colours from the darkest to the lightest. The mottle uses the middle shades. */
  readonly ramp: readonly number[];
  readonly variants: number;
}

/** In blend order: a type later in this list draws its edge over a type earlier in it. */
export const GROUND: Record<'water' | 'sand' | 'dirt' | 'grass' | 'darkgrass', GroundStyle> = {
  water: { ramp: ramp('#070d10', '#0b1418', '#101b20', '#16242a', '#203339', '#3a525a'), variants: 5 },
  sand: { ramp: ramp('#1d1b17', '#26231e', '#2f2b25', '#39342c', '#454036', '#5a554a'), variants: 5 },
  dirt: { ramp: ramp('#15110d', '#1c1712', '#241d17', '#2d251d', '#382e24', '#4a4440'), variants: 6 },
  grass: { ramp: ramp('#171a10', '#1e2214', '#262b18', '#2f351d', '#3a4123', '#55502f'), variants: 8 },
  darkgrass: { ramp: ramp('#0f150e', '#141c12', '#1a2417', '#202d1c', '#283823', '#36482c'), variants: 6 },
};

export type GroundName = keyof typeof GROUND;

/**
 * Mottled base: the middle shade, with sparse small clusters of the shades above and below
 * it. The clusters come from tiling noise with 4-pixel cells. A noise layer as large as the
 * tile would repeat with every tile and show the tile grid.
 */
function mottle(style: GroundStyle, seed: number, amount: number): Image {
  const image = new Image(TILE, TILE);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const n = 0.7 * tileNoise(x, y, 4, TILE, seed) + 0.3 * tileNoise(x, y, 2, TILE, seed + 1);
      const shade = n < 0.5 - 0.18 * amount ? 1 : n > 0.5 + 0.18 * amount ? 3 : 2;
      image.set(x, y, style.ramp[shade]!);
    }
  }
  return image;
}

function grassTile(style: GroundStyle, seed: number, straw: number): Image {
  const rand = random(seed);
  const image = mottle(style, seed, 1.1);
  // Blades: a dark root under a lighter tip, sometimes a dry, pale strand.
  for (let i = 0; i < 10; i++) {
    const x = int(rand, TILE);
    const y = 1 + int(rand, TILE - 1);
    image.set(x, y, style.ramp[1]!);
    image.set(x, y - 1, rand() < 0.25 ? straw : style.ramp[4]!);
  }
  return image;
}

function mossTile(style: GroundStyle, seed: number): Image {
  const rand = random(seed);
  const image = mottle(style, seed, 1.3);
  for (let i = 0; i < 6; i++) image.set(int(rand, TILE), int(rand, TILE), style.ramp[4]!);
  for (let i = 0; i < 4; i++) image.set(int(rand, TILE), int(rand, TILE), style.ramp[0]!);
  return image;
}

/** Mud or gravel: the mottle, with small stones that have a light top and a dark underside. */
function stonyTile(style: GroundStyle, seed: number, stones: number): Image {
  const rand = random(seed);
  const image = mottle(style, seed, 1.2);
  for (let i = 0; i < stones; i++) {
    const x = int(rand, TILE);
    const y = int(rand, TILE - 1);
    image.set(x, y, style.ramp[5]!);
    if (rand() < 0.5) image.set((x + 1) % TILE, y, style.ramp[4]!);
    image.set(x, y + 1, style.ramp[0]!);
  }
  return image;
}

function waterTile(style: GroundStyle, seed: number): Image {
  const rand = random(seed);
  const image = mottle(style, seed, 0.7);
  // A few faint glints of moonlight on the surface.
  for (let i = 0; i < 2; i++) {
    const x = int(rand, TILE);
    const y = int(rand, TILE);
    const length = 2 + int(rand, 3);
    for (let k = 0; k < length; k++) image.set((x + k) % TILE, y, style.ramp[k === 0 || k === length - 1 ? 4 : 5]!);
  }
  return image;
}

export function groundTile(name: GroundName, variant: number): Image {
  const style = GROUND[name];
  const seed = 1000 * (Object.keys(GROUND).indexOf(name) + 1) + variant;
  switch (name) {
    case 'water':
      return waterTile(style, seed);
    case 'sand':
      return stonyTile(style, seed, 9);
    case 'dirt':
      return stonyTile(style, seed, 3);
    case 'grass':
      return grassTile(style, seed, rgb('#4d4a2e'));
    case 'darkgrass':
      return mossTile(style, seed);
  }
}

/**
 * Edge pieces. A tile draws the edge of a neighbour with a higher blend order over itself, so
 * borders between ground types are ragged instead of square. "n" is the piece for a neighbour
 * to the north; e, s and w are the same piece turned.
 */
export const EDGE_SIDES = ['n', 'e', 's', 'w'] as const;
export const EDGE_CORNERS = ['nw', 'ne', 'se', 'sw'] as const;

function edgePieces(name: GroundName): Frame[] {
  const style = GROUND[name];
  const source = groundTile(name, 0);
  const rand = random(7000 + Object.keys(GROUND).indexOf(name));

  // A depth for each column: a random walk between 2 and 7 pixels that starts and ends at 4,
  // so pieces on neighbouring tiles meet. No line marks the border: the ragged shape is enough.
  const MID = 4;
  const depth: number[] = [];
  let d = MID;
  for (let x = 0; x < TILE; x++) {
    const toEnd = TILE - 1 - x;
    d += rand() < 0.4 ? -1 : rand() < 0.65 ? 1 : 0;
    d = Math.max(2, Math.min(7, d));
    while (toEnd < Math.abs(d - MID)) d += d > MID ? -1 : 1;
    depth.push(x === 0 || toEnd === 0 ? MID : d);
  }
  const north = new Image(TILE, TILE);
  for (let x = 0; x < TILE; x++) {
    for (let y = 0; y < depth[x]!; y++) north.set(x, y, source.get(x, y));
  }

  // The corner piece is a ragged quarter disc in the north-west corner.
  const corner = new Image(TILE, TILE);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const r = 5.5 + 1.2 * Math.sin(Math.atan2(y + 0.5, x + 0.5) * 5 + 1);
      if (Math.hypot(x + 0.5, y + 0.5) < r) corner.set(x, y, source.get(x, y));
    }
  }

  return [
    ...EDGE_SIDES.map((side, turns) => ({ name: `edge/${name}/${side}`, image: rotateTimes(north, turns) })),
    ...EDGE_CORNERS.map((side, turns) => ({ name: `edge/${name}/${side}`, image: rotateTimes(corner, turns) })),
  ];
}

export function groundFrames(): Frame[] {
  const frames: Frame[] = [];
  for (const name of Object.keys(GROUND) as GroundName[]) {
    for (let v = 0; v < GROUND[name].variants; v++) frames.push({ name: `ground/${name}/${v}`, image: groundTile(name, v) });
    if (name !== 'water') frames.push(...edgePieces(name));
  }
  return frames;
}
