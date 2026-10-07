import {
  CHUNK_SIZE,
  Decor,
  Ground,
  emptyChunk,
  fixtureTiles,
  inRect,
  naturalDecor,
  naturalGround,
  structureIn,
  type Building,
  type Chunk,
  type Fixture,
  type World,
  type WorldSource,
} from '@game/engine';
import { BUILDING_CELL, DOOR_PATH, generateHouse } from './houses.ts';

function onApproach(house: Building, tx: number, ty: number): boolean {
  return tx >= house.doorX - 1 && tx <= house.doorX + 1 && ty > house.y1 && ty <= house.y1 + DOOR_PATH;
}

/**
 * Whether a tile belongs to a house's ground: its rectangle, the ring one tile round it, or the
 * approach to its door. Nothing grows there.
 */
function nearHouse(house: Building, tx: number, ty: number): boolean {
  const ring = tx >= house.x0 - 1 && tx <= house.x1 + 1 && ty >= house.y0 - 1 && ty <= house.y1 + 1;
  return ring || onApproach(house, tx, ty);
}

/** The wilds: endless natural terrain from a seed, with a house in about a third of the cells. */
export class WildsSource implements WorldSource {
  readonly seed: number;
  private readonly houses = new Map<string, Building | null>();

  constructor(seed: number) {
    this.seed = seed;
  }

  /** The house of a cell (cached), or null. */
  house(cellX: number, cellY: number): Building | null {
    const key = `${cellX},${cellY}`;
    let house = this.houses.get(key);
    if (house === undefined) {
      house = generateHouse(this.seed, cellX, cellY, (tx, ty) => naturalGround(this.seed, tx, ty) === Ground.Water);
      this.houses.set(key, house);
    }
    return house;
  }

  chunk(cx: number, cy: number): Chunk {
    const chunk = emptyChunk(cx, cy);
    // The houses of the cells that this chunk overlaps, and of the cells next to it: the ground
    // of a house (its ring and the path to its door) can reach a few tiles into the next cell.
    const reach = DOOR_PATH + 1;
    const houses = this.buildingsIn(cx * CHUNK_SIZE - reach, cy * CHUNK_SIZE - reach, cx * CHUNK_SIZE + CHUNK_SIZE - 1 + reach, cy * CHUNK_SIZE + CHUNK_SIZE - 1 + reach);
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const tx = cx * CHUNK_SIZE + lx;
        const ty = cy * CHUNK_SIZE + ly;
        const index = ly * CHUNK_SIZE + lx;
        const ground = naturalGround(this.seed, tx, ty);
        const house = houses.find((h) => nearHouse(h, tx, ty));
        if (house && inRect(house, tx, ty)) {
          chunk.ground[index] = Ground.Floor;
          chunk.structure[index] = structureIn(house, tx, ty);
        } else {
          // A short mud path leads to the door.
          chunk.ground[index] = house && tx === house.doorX && onApproach(house, tx, ty) ? Ground.Dirt : ground;
          // Nothing grows on a house, right next to it, or in front of its door.
          chunk.decor[index] = house ? Decor.None : naturalDecor(this.seed, tx, ty, ground);
        }
      }
    }
    return chunk;
  }

  buildingAt(tx: number, ty: number): Building | null {
    const house = this.house(Math.floor(tx / BUILDING_CELL), Math.floor(ty / BUILDING_CELL));
    return house && inRect(house, tx, ty) ? house : null;
  }

  buildingsIn(x0: number, y0: number, x1: number, y1: number): Building[] {
    const out: Building[] = [];
    for (let cy = Math.floor(y0 / BUILDING_CELL); cy <= Math.floor(y1 / BUILDING_CELL); cy++) {
      for (let cx = Math.floor(x0 / BUILDING_CELL); cx <= Math.floor(x1 / BUILDING_CELL); cx++) {
        const house = this.house(cx, cy);
        if (house && house.x1 >= x0 && house.x0 <= x1 && house.y1 >= y0 && house.y0 <= y1) out.push(house);
      }
    }
    return out;
  }

  fixtureAt(tx: number, ty: number): Fixture | null {
    const house = this.buildingAt(tx, ty);
    if (!house) return null;
    return house.fixtures.find((f) => fixtureTiles(f).some(([x, y]) => x === tx && y === ty)) ?? null;
  }

  fixturesIn(x0: number, y0: number, x1: number, y1: number): Fixture[] {
    return this.buildingsIn(x0, y0, x1, y1).flatMap((h) => h.fixtures.filter((f) => f.tx >= x0 && f.tx <= x1 && f.ty >= y0 && f.ty <= y1));
  }

  spawn(world: World): { x: number; y: number } {
    return world.findSpawn();
  }
}
