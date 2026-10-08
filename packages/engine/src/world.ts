import { Structure, inRect, isInside, type Building } from './buildings.ts';
import { CHUNK_SIZE, TILE_SIZE } from './constants.ts';
import { decodeFixture, type Fixture } from './fixtures.ts';
import type { NpcDef } from './npc.ts';

/** The ground of a tile. The values go into a Uint8Array, so keep them below 256. */
export const Ground = {
  Water: 0,
  Sand: 1,
  Dirt: 2,
  Grass: 3,
  DarkGrass: 4,
  /** The wooden floor of a building, under its walls too. */
  Floor: 5,
  /** Paving: the streets and squares of a town. */
  Cobble: 6,
  /** Flagstones, the floor of a stone building. */
  FloorStone: 7,
  /** Packed earth with straw, the floor of a hut or a tent. */
  FloorEarth: 8,
} as const;
export type Ground = (typeof Ground)[keyof typeof Ground];

/** Whether a ground is the floor of a building (any kind). */
export function isFloor(ground: Ground): boolean {
  return ground === Ground.Floor || ground === Ground.FloorStone || ground === Ground.FloorEarth;
}

/** Small things on a tile. Tufts, flowers and pebbles are flat; trees and rocks are solid. */
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
  /** CHUNK_SIZE * CHUNK_SIZE structure codes (Structure, or a fixture tile), row by row. */
  readonly structure: Uint8Array;
}

export function emptyChunk(cx: number, cy: number): Chunk {
  const size = CHUNK_SIZE * CHUNK_SIZE;
  return { cx, cy, ground: new Uint8Array(size), decor: new Uint8Array(size), structure: new Uint8Array(size) };
}

/**
 * Where a world comes from. A world can be generated (the wilds) or made by hand (a town); the
 * engine only reads it through this interface. Every method must give the same answer for the
 * same arguments: the client and the server must see the same world.
 */
export interface WorldSource {
  /** A seed for visual variety (tile variants), and the generator's seed if there is one. */
  readonly seed: number;
  chunk(cx: number, cy: number): Chunk;
  /** The building whose rectangle holds the tile, or null. */
  buildingAt(tx: number, ty: number): Building | null;
  /** The buildings that overlap a rectangle of tiles (inclusive). */
  buildingsIn(x0: number, y0: number, x1: number, y1: number): Building[];
  /** The fixture whose footprint holds the tile, or null. */
  fixtureAt(tx: number, ty: number): Fixture | null;
  /** The fixtures whose anchor is in a rectangle of tiles (inclusive), in buildings or outside. */
  fixturesIn(x0: number, y0: number, x1: number, y1: number): Fixture[];
  /** Where a new player starts, in world pixels. */
  spawn(world: World): { x: number; y: number };
  /** The NPCs that walk in this world (npc.ts). Without it, none. */
  npcs?(): readonly NpcDef[];
}

/** Anything that can tell which part of a tile is solid. The movement code needs only this. */
export interface SolidMap {
  /** The solid part of a tile in tile-local pixels, or null if the tile is open. */
  solidBox(tx: number, ty: number): Box | null;
}

/** A map that can also tell the ground, decor, structure, fixtures and doors. Interactions need this. */
export interface TileMap extends SolidMap {
  ground(tx: number, ty: number): Ground;
  decor(tx: number, ty: number): Decor;
  structure(tx: number, ty: number): number;
  isDoorOpen(tx: number, ty: number): boolean;
  fixtureAt(tx: number, ty: number): Fixture | null;
}

// Solid boxes in tile-local pixels. The tree box is the trunk only, so the player can walk
// behind the canopy.
export const FULL_BOX: Box = [0, 0, TILE_SIZE, TILE_SIZE];
const TREE_BOX: Box = [5, 10, 11, 16];
const ROCK_BOX: Box = [2, 7, 14, 15];

/**
 * Returns the solid part of a tile in tile-local pixels, or null if the tile is open. An open
 * door is open: the player walks through it.
 */
export function solidBox(ground: Ground, decor: Decor, structure: number = Structure.None, doorOpen = false): Box | null {
  if (structure === Structure.Wall || structure === Structure.Window) return FULL_BOX;
  if (structure === Structure.Door) return doorOpen ? null : FULL_BOX;
  const fixture = decodeFixture(structure);
  if (fixture) return fixture.tile.box;
  if (ground === Ground.Water) return FULL_BOX;
  if (decor === Decor.Tree) return TREE_BOX;
  if (decor === Decor.Rock) return ROCK_BOX;
  return null;
}

/**
 * A world in memory: the chunks of its source (cached), and the state that is not in the source
 * (which doors are open). Everything that reads the world goes through here.
 */
export class World implements TileMap {
  readonly source: WorldSource;
  private readonly chunks = new Map<string, Chunk>();
  /** Most tile lookups are in the same chunk as the previous one; this skips the map for them. */
  private last: Chunk | null = null;
  /**
   * The doors that are open. This is the first state of the world that is not in the source;
   * the server will own it.
   */
  private readonly openDoors = new Set<string>();

  constructor(source: WorldSource) {
    this.source = source;
  }

  get seed(): number {
    return this.source.seed;
  }

  chunk(cx: number, cy: number): Chunk {
    const last = this.last;
    if (last && last.cx === cx && last.cy === cy) return last;
    const key = `${cx},${cy}`;
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = this.source.chunk(cx, cy);
      this.chunks.set(key, chunk);
    }
    this.last = chunk;
    return chunk;
  }

  private index(tx: number, ty: number): { chunk: Chunk; index: number } {
    const cx = Math.floor(tx / CHUNK_SIZE);
    const cy = Math.floor(ty / CHUNK_SIZE);
    return { chunk: this.chunk(cx, cy), index: (ty - cy * CHUNK_SIZE) * CHUNK_SIZE + (tx - cx * CHUNK_SIZE) };
  }

  ground(tx: number, ty: number): Ground {
    const { chunk, index } = this.index(tx, ty);
    return chunk.ground[index] as Ground;
  }

  decor(tx: number, ty: number): Decor {
    const { chunk, index } = this.index(tx, ty);
    return chunk.decor[index] as Decor;
  }

  structure(tx: number, ty: number): number {
    const { chunk, index } = this.index(tx, ty);
    return chunk.structure[index]!;
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

  /** The open doors, as [tx, ty] pairs. A multiplayer server sends this list to its clients. */
  openDoorList(): [number, number][] {
    return [...this.openDoors].map((key) => key.split(',').map(Number) as [number, number]);
  }

  /** Opens exactly the doors of the list and closes all others: the door state from a server. */
  setOpenDoors(doors: readonly (readonly [number, number])[]): void {
    this.openDoors.clear();
    for (const [tx, ty] of doors) this.openDoors.add(`${tx},${ty}`);
  }

  buildingAt(tx: number, ty: number): Building | null {
    const building = this.source.buildingAt(tx, ty);
    return building && inRect(building, tx, ty) ? building : null;
  }

  buildingsIn(x0: number, y0: number, x1: number, y1: number): Building[] {
    return this.source.buildingsIn(x0, y0, x1, y1);
  }

  /** The building that the tile is inside (its interior or its doorway), or null. */
  insideOf(tx: number, ty: number): Building | null {
    const building = this.buildingAt(tx, ty);
    return building && isInside(building, tx, ty) ? building : null;
  }

  fixtureAt(tx: number, ty: number): Fixture | null {
    return this.source.fixtureAt(tx, ty);
  }

  fixturesIn(x0: number, y0: number, x1: number, y1: number): Fixture[] {
    return this.source.fixturesIn(x0, y0, x1, y1);
  }

  spawn(): { x: number; y: number } {
    return this.source.spawn(this);
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
      if (clearance > 0 && isFloor(this.ground(tx, ty))) return false;
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
    throw new Error(`no open tile near ${nearTx},${nearTy}`);
  }
}

/**
 * A world as an application offers it: a source, the default lines for things without their
 * own content, and how dark it is. Pure data and functions, so the server can use it as well.
 */
export interface WorldDefinition {
  /** For the URL: ?world=<id>. */
  readonly id: string;
  /** For the world menu. */
  readonly name: string;
  /** Makes the source. `seed` comes from ?seed= in the URL, for generated worlds. */
  createSource(seed: number | null): WorldSource;
  /** Default lines for things without content of their own, by kind (tree, rock, bed, ...). */
  readonly examine: Readonly<Record<string, string>>;
  /** How dark the night is, from 0 (no darkness) to 1 (full). */
  readonly darkness: number;
  /**
   * Whether visitors share this world through the multiplayer server: each one sees the others,
   * and the server owns the state (positions, doors). Without it, the world is single-player.
   */
  readonly multiplayer?: boolean;
}
