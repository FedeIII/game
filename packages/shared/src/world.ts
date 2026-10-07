import { CHUNK_SIZE, TILE_SIZE } from './constants.ts';
import { fbm, hash01 } from './noise.ts';

/** The ground of a tile. The values go into a Uint8Array, so keep them below 256. */
export const Ground = {
  Water: 0,
  Sand: 1,
  Dirt: 2,
  Grass: 3,
  DarkGrass: 4,
} as const;
export type Ground = (typeof Ground)[keyof typeof Ground];

/** The object on a tile, if there is one. Tufts, flowers and pebbles are flat; trees and rocks are solid. */
export const Decor = {
  None: 0,
  Tuft: 1,
  Flowers: 2,
  Pebbles: 3,
  Tree: 4,
  Rock: 5,
} as const;
export type Decor = (typeof Decor)[keyof typeof Decor];

/** An axis-aligned box: [x0, y0, x1, y1], with x1 and y1 exclusive. */
export type Box = readonly [number, number, number, number];

export interface Chunk {
  readonly cx: number;
  readonly cy: number;
  /** CHUNK_SIZE * CHUNK_SIZE values of Ground, row by row. */
  readonly ground: Uint8Array;
  /** CHUNK_SIZE * CHUNK_SIZE values of Decor, row by row. */
  readonly decor: Uint8Array;
}

// Seed offsets. Each noise field has its own offset, so the fields do not correlate.
const ELEVATION = 0;
const PATHS = 7_001;
const LUSH = 13_007;
const FOREST = 19_009;
const SCATTER = 23_011;
const TREE_PICK = 29_017;

function groundAt(seed: number, tx: number, ty: number): Ground {
  const elevation = fbm(tx / 56, ty / 56, seed + ELEVATION, 4);
  if (elevation < 0.34) return Ground.Water;
  if (elevation < 0.37) return Ground.Sand;
  const path = Math.abs(fbm(tx / 44, ty / 44, seed + PATHS, 3) - 0.5);
  if (path < 0.0105) return Ground.Dirt;
  return fbm(tx / 18, ty / 18, seed + LUSH, 3) > 0.55 ? Ground.DarkGrass : Ground.Grass;
}

function isGrass(ground: Ground): boolean {
  return ground === Ground.Grass || ground === Ground.DarkGrass;
}

/**
 * A tree grows on a tile when the tile is in a forest area and its random value is the
 * largest in its 3x3 neighbourhood. Thus no two trees touch, also across chunk borders.
 */
function hasTree(seed: number, tx: number, ty: number): boolean {
  if (fbm(tx / 26, ty / 26, seed + FOREST, 3) < 0.53) return false;
  const own = hash01(tx, ty, seed + TREE_PICK);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if ((dx !== 0 || dy !== 0) && hash01(tx + dx, ty + dy, seed + TREE_PICK) >= own) return false;
    }
  }
  return true;
}

function decorAt(seed: number, tx: number, ty: number, ground: Ground): Decor {
  if (ground === Ground.Water) return Decor.None;
  if (isGrass(ground) && hasTree(seed, tx, ty)) return Decor.Tree;
  const roll = hash01(tx, ty, seed + SCATTER);
  if (roll < 0.006 && ground !== Ground.Sand) return Decor.Rock;
  if (isGrass(ground)) {
    if (roll < 0.035) return Decor.Flowers;
    if (roll < 0.13) return Decor.Tuft;
  } else if (roll < 0.07) {
    return Decor.Pebbles;
  }
  return Decor.None;
}

/** Makes one chunk. The result depends only on the seed and the chunk coordinates. */
export function generateChunk(seed: number, cx: number, cy: number): Chunk {
  const ground = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
  const decor = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const tx = cx * CHUNK_SIZE + lx;
      const ty = cy * CHUNK_SIZE + ly;
      const g = groundAt(seed, tx, ty);
      ground[ly * CHUNK_SIZE + lx] = g;
      decor[ly * CHUNK_SIZE + lx] = decorAt(seed, tx, ty, g);
    }
  }
  return { cx, cy, ground, decor };
}

// Solid boxes in tile-local pixels. The tree box is the trunk only, so the player can walk
// behind the canopy.
const WATER_BOX: Box = [0, 0, TILE_SIZE, TILE_SIZE];
const TREE_BOX: Box = [5, 10, 11, 16];
const ROCK_BOX: Box = [2, 7, 14, 15];

/** Anything that can tell which part of a tile is solid. The movement code needs only this. */
export interface SolidMap {
  /** The solid part of a tile in tile-local pixels, or null if the tile is open. */
  solidBox(tx: number, ty: number): Box | null;
}

/** Returns the solid part of a tile in tile-local pixels, or null if the tile is open. */
export function solidBox(ground: Ground, decor: Decor): Box | null {
  if (ground === Ground.Water) return WATER_BOX;
  if (decor === Decor.Tree) return TREE_BOX;
  if (decor === Decor.Rock) return ROCK_BOX;
  return null;
}

/** Keeps generated chunks in memory and answers questions about tiles. */
export class World implements SolidMap {
  readonly seed: number;
  private readonly chunks = new Map<string, Chunk>();
  /** Most tile lookups are in the same chunk as the previous one; this skips the map for them. */
  private last: Chunk | null = null;

  constructor(seed: number) {
    this.seed = seed;
  }

  chunk(cx: number, cy: number): Chunk {
    const last = this.last;
    if (last && last.cx === cx && last.cy === cy) return last;
    const key = `${cx},${cy}`;
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = generateChunk(this.seed, cx, cy);
      this.chunks.set(key, chunk);
    }
    this.last = chunk;
    return chunk;
  }

  ground(tx: number, ty: number): Ground {
    const cx = Math.floor(tx / CHUNK_SIZE);
    const cy = Math.floor(ty / CHUNK_SIZE);
    const index = (ty - cy * CHUNK_SIZE) * CHUNK_SIZE + (tx - cx * CHUNK_SIZE);
    return this.chunk(cx, cy).ground[index] as Ground;
  }

  decor(tx: number, ty: number): Decor {
    const cx = Math.floor(tx / CHUNK_SIZE);
    const cy = Math.floor(ty / CHUNK_SIZE);
    const index = (ty - cy * CHUNK_SIZE) * CHUNK_SIZE + (tx - cx * CHUNK_SIZE);
    return this.chunk(cx, cy).decor[index] as Decor;
  }

  solidBox(tx: number, ty: number): Box | null {
    return solidBox(this.ground(tx, ty), this.decor(tx, ty));
  }

  /** Removes the chunks outside a range of chunk coordinates (inclusive), to free memory. */
  forgetChunksOutside(minCx: number, minCy: number, maxCx: number, maxCy: number): void {
    for (const [key, chunk] of this.chunks) {
      if (chunk.cx < minCx || chunk.cx > maxCx || chunk.cy < minCy || chunk.cy > maxCy) {
        this.chunks.delete(key);
        if (chunk === this.last) this.last = null;
      }
    }
  }

  get chunkCount(): number {
    return this.chunks.size;
  }

  /**
   * Finds the open tile nearest to the origin, with open tiles all around it. Returns the
   * centre of that tile in world pixels.
   */
  findSpawn(): { x: number; y: number } {
    const open = (tx: number, ty: number): boolean => {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (this.solidBox(tx + dx, ty + dy)) return false;
        }
      }
      return true;
    };
    // Square rings around the origin, nearest ring first.
    for (let r = 0; r < 512; r++) {
      for (let ty = -r; ty <= r; ty++) {
        for (let tx = -r; tx <= r; tx++) {
          if (Math.max(Math.abs(tx), Math.abs(ty)) !== r) continue;
          if (open(tx, ty)) return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
        }
      }
    }
    throw new Error(`no open spawn tile near the origin for seed ${this.seed}`);
  }
}
