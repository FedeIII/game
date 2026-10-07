import { BUILDING_CELL, Structure, generateBuilding, isInside, structureIn, type Building } from './buildings.ts';
import { CHUNK_SIZE, TILE_SIZE } from './constants.ts';
import { fbm, hash01 } from './noise.ts';

/** The ground of a tile. The values go into a Uint8Array, so keep them below 256. */
export const Ground = {
  Water: 0,
  Sand: 1,
  Dirt: 2,
  Grass: 3,
  DarkGrass: 4,
  /** The wooden floor of a building, under its walls too. */
  Floor: 5,
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
  /** CHUNK_SIZE * CHUNK_SIZE values of Structure (buildings), row by row. */
  readonly structure: Uint8Array;
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

/** The building of a cell, or null. The same for every caller with the same seed. */
export function buildingOfCell(seed: number, cellX: number, cellY: number): Building | null {
  return generateBuilding(seed, cellX, cellY, (tx, ty) => groundAt(seed, tx, ty) === Ground.Water);
}

/** The approach to the door: 3 tiles wide and DOOR_PATH tiles deep, kept clear. */
const DOOR_PATH = 3;

function onApproach(building: Building, tx: number, ty: number): boolean {
  return tx >= building.doorX - 1 && tx <= building.doorX + 1 && ty > building.y1 && ty <= building.y1 + DOOR_PATH;
}

/**
 * Whether a tile belongs to a building's ground: its rectangle, the ring one tile round it, or
 * the approach to its door. Nothing grows there.
 */
function nearBuilding(building: Building, tx: number, ty: number): boolean {
  const ring = tx >= building.x0 - 1 && tx <= building.x1 + 1 && ty >= building.y0 - 1 && ty <= building.y1 + 1;
  return ring || onApproach(building, tx, ty);
}

/** Makes one chunk. The result depends only on the seed and the chunk coordinates. */
export function generateChunk(seed: number, cx: number, cy: number): Chunk {
  const ground = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
  const decor = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
  const structure = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
  // The buildings of the cells that this chunk overlaps, and of the cells next to it: the ground
  // of a building (its ring and the path to its door) can reach a few tiles into the next cell.
  const reach = DOOR_PATH + 1;
  const buildings: Building[] = [];
  const cellX0 = Math.floor((cx * CHUNK_SIZE - reach) / BUILDING_CELL);
  const cellX1 = Math.floor((cx * CHUNK_SIZE + CHUNK_SIZE - 1 + reach) / BUILDING_CELL);
  const cellY0 = Math.floor((cy * CHUNK_SIZE - reach) / BUILDING_CELL);
  const cellY1 = Math.floor((cy * CHUNK_SIZE + CHUNK_SIZE - 1 + reach) / BUILDING_CELL);
  for (let cellY = cellY0; cellY <= cellY1; cellY++) {
    for (let cellX = cellX0; cellX <= cellX1; cellX++) {
      const building = buildingOfCell(seed, cellX, cellY);
      if (building) buildings.push(building);
    }
  }
  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const tx = cx * CHUNK_SIZE + lx;
      const ty = cy * CHUNK_SIZE + ly;
      const index = ly * CHUNK_SIZE + lx;
      const g = groundAt(seed, tx, ty);
      const building = buildings.find((b) => nearBuilding(b, tx, ty));
      if (building && tx >= building.x0 && tx <= building.x1 && ty >= building.y0 && ty <= building.y1) {
        ground[index] = Ground.Floor;
        structure[index] = structureIn(building, tx, ty);
      } else {
        // A short mud path leads to the door.
        ground[index] = building && tx === building.doorX && onApproach(building, tx, ty) ? Ground.Dirt : g;
        // Nothing grows on a building, right next to it, or in front of its door.
        decor[index] = building ? Decor.None : decorAt(seed, tx, ty, g);
      }
    }
  }
  return { cx, cy, ground, decor, structure };
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

/** A map that can also tell the ground, decor, structure and door state. Interactions need this. */
export interface TileMap extends SolidMap {
  ground(tx: number, ty: number): Ground;
  decor(tx: number, ty: number): Decor;
  structure(tx: number, ty: number): Structure;
  isDoorOpen(tx: number, ty: number): boolean;
}

/** Furniture boxes, in tile-local pixels. They match the footprints of the furniture art. */
export const FULL_BOX: Box = [0, 0, TILE_SIZE, TILE_SIZE];
const STRUCTURE_BOX: Partial<Record<Structure, Box>> = {
  [Structure.Wall]: FULL_BOX,
  [Structure.Door]: FULL_BOX,
  [Structure.Bookshelf]: [1, 0, 15, 6],
  [Structure.TableWest]: [1, 3, 16, 13],
  [Structure.TableEast]: [0, 3, 15, 13],
  [Structure.BedHead]: [1, 1, 15, 16],
  [Structure.BedFoot]: [1, 0, 15, 15],
  [Structure.Chest]: [2, 4, 14, 13],
  [Structure.Barrel]: [3, 3, 13, 13],
};

/**
 * Returns the solid part of a tile in tile-local pixels, or null if the tile is open. An open
 * door is open: the player walks through it.
 */
export function solidBox(ground: Ground, decor: Decor, structure: Structure = Structure.None, doorOpen = false): Box | null {
  if (structure !== Structure.None && structure !== Structure.Floor) {
    return structure === Structure.Door && doorOpen ? null : (STRUCTURE_BOX[structure] ?? null);
  }
  if (ground === Ground.Water) return WATER_BOX;
  if (decor === Decor.Tree) return TREE_BOX;
  if (decor === Decor.Rock) return ROCK_BOX;
  return null;
}

/** Keeps generated chunks in memory and answers questions about tiles. */
export class World implements TileMap {
  readonly seed: number;
  private readonly chunks = new Map<string, Chunk>();
  /** Most tile lookups are in the same chunk as the previous one; this skips the map for them. */
  private last: Chunk | null = null;
  private readonly buildings = new Map<string, Building | null>();
  /**
   * The doors that are open. This is the first state of the world that is not in the seed;
   * the server will own it.
   */
  private readonly openDoors = new Set<string>();

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

  structure(tx: number, ty: number): Structure {
    const cx = Math.floor(tx / CHUNK_SIZE);
    const cy = Math.floor(ty / CHUNK_SIZE);
    const index = (ty - cy * CHUNK_SIZE) * CHUNK_SIZE + (tx - cx * CHUNK_SIZE);
    return this.chunk(cx, cy).structure[index] as Structure;
  }

  solidBox(tx: number, ty: number): Box | null {
    const structure = this.structure(tx, ty);
    return solidBox(this.ground(tx, ty), this.decor(tx, ty), structure, structure === Structure.Door && this.isDoorOpen(tx, ty));
  }

  isDoorOpen(tx: number, ty: number): boolean {
    return this.openDoors.has(`${tx},${ty}`);
  }

  setDoorOpen(tx: number, ty: number, open: boolean): void {
    if (open) this.openDoors.add(`${tx},${ty}`);
    else this.openDoors.delete(`${tx},${ty}`);
  }

  /** The building of a cell (cached), or null. */
  building(cellX: number, cellY: number): Building | null {
    const key = `${cellX},${cellY}`;
    let building = this.buildings.get(key);
    if (building === undefined) {
      building = buildingOfCell(this.seed, cellX, cellY);
      this.buildings.set(key, building);
    }
    return building;
  }

  /** The building whose rectangle holds the tile, or null. */
  buildingAt(tx: number, ty: number): Building | null {
    const building = this.building(Math.floor(tx / BUILDING_CELL), Math.floor(ty / BUILDING_CELL));
    return building && tx >= building.x0 && tx <= building.x1 && ty >= building.y0 && ty <= building.y1 ? building : null;
  }

  /** The building that the tile is inside (its interior or its doorway), or null. */
  insideOf(tx: number, ty: number): Building | null {
    const building = this.buildingAt(tx, ty);
    return building && isInside(building, tx, ty) ? building : null;
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
   * Finds the open tile nearest to (nearTx, nearTy) with `clearance` rings of open tiles round
   * it (1: all 8 neighbours open; 0: only the tile itself). Returns the centre of that tile in
   * world pixels. With a clearance above 0 the tile is also outside buildings.
   */
  findSpawn(nearTx = 0, nearTy = 0, clearance = 1): { x: number; y: number } {
    const open = (tx: number, ty: number): boolean => {
      if (clearance > 0 && this.ground(tx, ty) === Ground.Floor) return false;
      for (let dy = -clearance; dy <= clearance; dy++) {
        for (let dx = -clearance; dx <= clearance; dx++) {
          if (this.solidBox(tx + dx, ty + dy)) return false;
        }
      }
      return true;
    };
    // Square rings round the start tile, nearest ring first.
    for (let r = 0; r < 512; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const tx = nearTx + dx;
          const ty = nearTy + dy;
          if (open(tx, ty)) return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
        }
      }
    }
    throw new Error(`no open tile near ${nearTx},${nearTy} for seed ${this.seed}`);
  }
}
