import { Structure, inRect, isInside, structureOnStorey, upperStorey, type Building } from './buildings.ts';
import { CHUNK_SIZE, TILE_SIZE } from './constants.ts';
import { decodeFixture, fixtureTiles, type Fixture } from './fixtures.ts';
import type { MobRules } from './mobs.ts';
import type { NpcDef } from './npc.ts';
import type { Gate } from './traits.ts';
import type { ItemKind, LootTable } from './items.ts';
import type { QuestDef, QuestEffect } from './quests.ts';
import type { SceneDef } from './scenes.ts';
import type { AmbushDef } from './ambushes.ts';
import type { ConvoyDef } from './convoys.ts';
import type { EscortDef } from './escorts.ts';

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
  /**
   * Shallow water: the band of a lake at its shore. It is solid like water, except for a player
   * strong enough to wade (traits.ts, WADE_GATE).
   */
  Shallows: 9,
} as const;
export type Ground = (typeof Ground)[keyof typeof Ground];

/** Whether a ground is water, deep or shallow. */
export function isWet(ground: Ground): boolean {
  return ground === Ground.Water || ground === Ground.Shallows;
}

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
  /** The talks that a character overhears (scenes.ts): the NPCs of the scene say its lines. Without it, none. */
  scenes?(): readonly SceneDef[];
  /** The ambushes of the story (ambushes.ts): mobs that wait for a character at a step in an area. Without it, none. */
  ambushes?(): readonly AmbushDef[];
  /** The escorts of the story (escorts.ts): companions that a step gives a character, until they come home. Without it, none. */
  escorts?(): readonly EscortDef[];
  /** The convoys of the story (convoys.ts): guards that walk a route, and the attackers that wait for them. Without it, none. */
  convoys?(): readonly ConvoyDef[];
  /**
   * The effects of the story that water applies (quests.ts): when a character wades or swims
   * (PlayerState.wading), each one that can apply to it applies (canApply: the step of its quest,
   * the items that it takes). In a shared world the server sees the wade, so a page cannot hide it.
   * Without it, none.
   */
  wadeEffects?(): readonly QuestEffect[];
  /** Where the mobs of this world may be, and how many (mobs.ts). Without it, the world has none. */
  mobs?(): MobRules;
  /**
   * What a fixture gives when a player opens it (a chest), or null: then it is not a source of
   * loot, and acting on it shows its content as before. See loot.ts.
   */
  loot?(fixture: Fixture): LootTable | null;
  /**
   * The refuges of the world: buildings where a defeated character can wake, once it has been
   * inside them (Character.refuges). The spawn is always a refuge. See wakePoint().
   */
  refuges?(): readonly Refuge[];
  /** The named places of the world, for the map (INT 13 shows their names). */
  landmarks?(): readonly Landmark[];
  /** The places with a sound of their own (the music of the client). Without it, the whole world has one. */
  soundAreas?(): readonly SoundArea[];
  /** The places whose name shows over the screen when a player comes in (the page). Without it, none. */
  placeTitles?(): readonly PlaceTitle[];
}

/**
 * A place whose name shows over the screen when a player comes into it, as the name of a world on
 * arrival (Fede's rule, 2026-10-13): a city, or a big town or a town that is important for the story.
 * A small place has no title, only a name sign. The page shows the title once for each visit.
 */
export interface PlaceTitle {
  readonly id: string;
  /** The name, in the world's English: the page translates it. */
  readonly title: string;
  /** Tiles, inclusive. */
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/**
 * A place with a sound of its own (2026-10-12, Fede's request: the music follows the places): the
 * mood of its music, and the first time a character comes in, a moment of awe. The world names the
 * moods; the client has a piece for each mood that it knows ('wilds', 'town', 'haven', 'home',
 * 'chapel', 'ruins', 'camp', 'shrine'), and the rest of the world is 'wilds'. The first area of the
 * list that holds a tile wins: a building's area before the area of its town.
 */
export interface SoundArea {
  readonly id: string;
  readonly music: string;
  /** Tiles, inclusive. */
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  /** Only inside this building (its id): the home, the chapel. */
  readonly building?: string;
  /** The first visit of a character has the music of discovery. */
  readonly discover?: boolean;
}

/** The sound area of a tile (`inside`: the id of the building that the player is in, or null), or null. */
export function soundAreaAt(areas: readonly SoundArea[], tx: number, ty: number, inside: string | null): SoundArea | null {
  return areas.find((a) => tx >= a.x0 && tx <= a.x1 && ty >= a.y0 && ty <= a.y1 && (a.building === undefined || a.building === inside)) ?? null;
}

/** A named place for the map: the home, a town, a refuge. */
export interface Landmark {
  readonly name: string;
  readonly kind: 'home' | 'town' | 'refuge';
  /** World pixels. */
  readonly x: number;
  readonly y: number;
}

/** A place where a defeated character can wake: the building that it must have entered, and the point (world pixels). */
export interface Refuge {
  readonly id: string;
  readonly building: string;
  readonly x: number;
  readonly y: number;
  /** A refuge that a character gets only from a deal (Deal.refuge: a room at an inn), not when it enters the building. */
  readonly given?: boolean;
}

/**
 * Where a character that was defeated at (x, y) wakes: at the world's spawn (the home), or at
 * the nearest refuge of `known` (the refuges that it has entered), if one is nearer.
 */
export function wakePoint(world: World, x: number, y: number, known: readonly string[]): { x: number; y: number } {
  let best = world.spawn();
  let bestD = Math.hypot(best.x - x, best.y - y);
  for (const refuge of world.source.refuges?.() ?? []) {
    if (!known.includes(refuge.id)) continue;
    const d = Math.hypot(refuge.x - x, refuge.y - y);
    if (d < bestD) {
      best = { x: refuge.x, y: refuge.y };
      bestD = d;
    }
  }
  return best;
}

/** The refuge whose building a player at (x, y) is inside, or null. */
export function refugeAt(world: World, x: number, y: number): Refuge | null {
  const building = world.insideOf(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE));
  if (!building) return null;
  return world.source.refuges?.().find((r) => r.building === building.id && !r.given) ?? null;
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
  /** Whether the tile is the door of a building that is shut for good (Building.locked). */
  isDoorLocked(tx: number, ty: number): boolean;
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
  if (isWet(ground)) return FULL_BOX;
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
  /** The barred doors that a player forced (Building.barred): they are ordinary doors until the world bars them again. */
  private readonly forcedDoors = new Set<string>();
  /** The maps of the storeys above the ground storey (level()). */
  private readonly levels = new Map<number, StoreyMap>();

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

  /** The part of a tile that stops an arrow (arrows.ts): what is solid, except water. */
  shotBox(tx: number, ty: number): Box | null {
    const structure = this.structure(tx, ty);
    const ground = this.ground(tx, ty);
    return solidBox(isWet(ground) ? Ground.Grass : ground, this.decor(tx, ty), structure, structure === Structure.Door && this.isDoorOpen(tx, ty));
  }

  isDoorOpen(tx: number, ty: number): boolean {
    return this.openDoors.has(`${tx},${ty}`);
  }

  isDoorLocked(tx: number, ty: number): boolean {
    return this.structure(tx, ty) === Structure.Door && this.buildingAt(tx, ty)?.locked !== undefined;
  }

  /** The gate of the boards on the door on (tx, ty), or null: no door, not barred, or forced. */
  doorBar(tx: number, ty: number): Gate | null {
    if (this.structure(tx, ty) !== Structure.Door) return null;
    const gate = this.buildingAt(tx, ty)?.barred;
    return gate && !this.forcedDoors.has(`${tx},${ty}`) ? gate : null;
  }

  setDoorForced(tx: number, ty: number, forced: boolean): void {
    if (forced) this.forcedDoors.add(`${tx},${ty}`);
    else this.forcedDoors.delete(`${tx},${ty}`);
  }

  /** The forced doors, as [tx, ty] pairs. A multiplayer server sends them with the open doors. */
  forcedDoorList(): [number, number][] {
    return [...this.forcedDoors].map((key) => key.split(',').map(Number) as [number, number]);
  }

  /** Forces exactly the doors of the list: the state from a server. */
  setForcedDoors(doors: readonly (readonly [number, number])[]): void {
    this.forcedDoors.clear();
    for (const [tx, ty] of doors) this.forcedDoors.add(`${tx},${ty}`);
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

  /**
   * The map of a storey: the world itself for the ground storey (0); for a storey above it, the
   * storeys of the buildings that have it (StoreyMap). Movement and actions on a storey go through it.
   */
  level(storey: number): TileMap & SpawnFinder {
    if (storey <= 0) return this;
    let map = this.levels.get(storey);
    if (!map) {
      map = new StoreyMap(this, storey);
      this.levels.set(storey, map);
    }
    return map;
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

/** A map that can find an open tile near a tile (World.findSpawn): the place of a start. */
export interface SpawnFinder {
  findSpawn(nearTx?: number, nearTy?: number, clearance?: number): { x: number; y: number };
}

/**
 * A storey above the ground storey (1 and up) as a map (Building.storeys): inside a building with
 * that storey, its walls (without a door), its windows, its things and its floor; everywhere else
 * a wall. Nothing grows there, no door opens there, and there is no water.
 */
export class StoreyMap implements TileMap, SpawnFinder {
  readonly storey: number;
  private readonly world: World;

  constructor(world: World, storey: number) {
    this.world = world;
    this.storey = storey;
  }

  /** The building whose rectangle holds the tile, if it has this storey. */
  private building(tx: number, ty: number): Building | null {
    const building = this.world.buildingAt(tx, ty);
    return building && upperStorey(building, this.storey) ? building : null;
  }

  ground(tx: number, ty: number): Ground {
    const building = this.building(tx, ty);
    return (building && upperStorey(building, this.storey)!.floor) ?? Ground.Floor;
  }

  decor(): Decor {
    return Decor.None;
  }

  structure(tx: number, ty: number): number {
    const building = this.building(tx, ty);
    return building ? structureOnStorey(building, this.storey, tx, ty) : Structure.Wall;
  }

  solidBox(tx: number, ty: number): Box | null {
    return solidBox(Ground.Floor, Decor.None, this.structure(tx, ty));
  }

  isDoorOpen(): boolean {
    return false;
  }

  isDoorLocked(): boolean {
    return false;
  }

  fixtureAt(tx: number, ty: number): Fixture | null {
    const building = this.building(tx, ty);
    if (!building) return null;
    return upperStorey(building, this.storey)!.fixtures.find((f) => fixtureTiles(f).some(([x, y]) => x === tx && y === ty)) ?? null;
  }

  /**
   * The centre of the open tile of this storey nearest to (nearTx, nearTy), within 32 tiles. The
   * clearance is not used: a storey is indoors. Throws if there is none.
   */
  findSpawn(nearTx = 0, nearTy = 0): { x: number; y: number } {
    for (let r = 0; r < 32; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const tx = nearTx + dx;
          const ty = nearTy + dy;
          if (!this.solidBox(tx, ty)) return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
        }
      }
    }
    throw new Error(`no open tile of storey ${this.storey} near ${nearTx},${nearTy}`);
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
   * A line about each kind of item, for the pack panel: what it is, and what it is for in this
   * world (who buys it, what it goes into). The engine adds what a drink does.
   */
  readonly items?: Readonly<Partial<Record<ItemKind, string>>>;
  /**
   * The world's texts in other languages: for each language code ('es'), a table from the English
   * text (as the content has it: a page, a line, a dialog, a sign, a name) to its translation. The
   * page shows a text without a translation in English. A world tests that the table has every
   * text of its content.
   */
  readonly texts?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /**
   * The world's quests (quests.ts): the journal shows the steps of a character's quests from them.
   * Effects (in dialogs, on things) move them on.
   */
  readonly quests?: readonly QuestDef[];
  /**
   * Whether visitors share this world through the multiplayer server: each one sees the others,
   * and the server owns the state (positions, doors). Without it, the world is single-player.
   */
  readonly multiplayer?: boolean;
  /**
   * What a visitor sees on arrival: the world's name in the middle of the screen, and then a
   * welcome: lines that the NPC with the id `speaker` says to the new visitor, one after the
   * other. Without it, the visitor just starts.
   */
  readonly intro?: {
    readonly title: string;
    readonly speaker?: string;
    readonly welcome?: readonly string[];
  };
  /**
   * The prologue (the page's ui/prologue.ts): cards of text over the painted scenes of the world, played
   * once for a new character and again from the game menu. Without it, there is no prologue.
   */
  readonly prologue?: readonly PrologueCard[];
}

/**
 * A card of the prologue: a painted scene (its id in the prologue art, art/prologue.ts), an optional
 * title and subtitle, an optional banner, and lines that show one after the other. In the texts,
 * {name} stands for the character's name and {kind} for its race and class ("Dwarf cleric").
 */
export interface PrologueCard {
  readonly scene: string;
  readonly title?: string;
  readonly subtitle?: string;
  /** A name over the scene in the pixel font, on a dark band, as the name of a world on arrival. */
  readonly banner?: string;
  /**
   * The line with which the banner shows. None or 0: before the first line (the first line waits for
   * it). A later line: when that line starts to type (the line that names the place).
   */
  readonly bannerLine?: number;
  /** The music of the prologue rises with this card (its choir and violins), however long the player took to reach it. */
  readonly crescendo?: boolean;
  readonly lines: readonly string[];
}
