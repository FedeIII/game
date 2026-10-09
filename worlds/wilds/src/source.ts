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
  type MobRules,
  type WorldSource,
} from '@game/engine';
import { HOME_CELL, HOME_ID, generateHome, homeStart } from './home.ts';
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

/** Mobs in the wilds: four imps and two brutes round each player. */
const MOB_POPULATION = { imp: 4, brute: 2 } as const;

/**
 * The wilds: endless natural terrain from a seed, with a house in about a third of the cells, and
 * the player's home in the middle (home.ts), where every character starts.
 */
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
      const isWater = (tx: number, ty: number) => naturalGround(this.seed, tx, ty) === Ground.Water;
      house = cellX === HOME_CELL[0] && cellY === HOME_CELL[1] ? generateHome(isWater) : generateHouse(this.seed, cellX, cellY, isWater);
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
        const house = houses.find((h) => nearHouse(h, tx, ty));
        const natural = naturalGround(this.seed, tx, ty);
        // The ground of the home is always dry (it stands where it must, see home.ts).
        const ground = house?.id === HOME_ID && natural === Ground.Water ? Ground.Grass : natural;
        if (house && inRect(house, tx, ty)) {
          // The home is a hut: packed earth with straw. The other houses have wooden floors.
          chunk.ground[index] = house.id === HOME_ID ? Ground.FloorEarth : Ground.Floor;
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

  /** Inside the home, by the door. */
  spawn(): { x: number; y: number } {
    return homeStart(this.home());
  }

  /** The player's home (home.ts). */
  home(): Building {
    return this.house(HOME_CELL[0], HOME_CELL[1])!;
  }

  /**
   * Mobs live everywhere in the woods, except on water and on the ground of a house (its ring and
   * the path to its door): a player who comes out of a door does not walk into one. They hunt
   * everywhere outside the houses.
   */
  mobs(): MobRules {
    return {
      roam: (tx, ty) =>
        naturalGround(this.seed, tx, ty) !== Ground.Water &&
        !this.buildingsIn(tx - DOOR_PATH - 1, ty - DOOR_PATH - 1, tx + DOOR_PATH + 1, ty + DOOR_PATH + 1).some((h) => nearHouse(h, tx, ty)),
      hunt: () => true,
      population: MOB_POPULATION,
    };
  }
}
