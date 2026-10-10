import {
  CHUNK_SIZE,
  Decor,
  Ground,
  TILE_SIZE,
  emptyChunk,
  fixtureTiles,
  inRect,
  isGrass,
  isWet,
  naturalDecor,
  naturalGround,
  structureIn,
  type Building,
  type Chunk,
  type Fixture,
  type LootTable,
  type MobRules,
  type NpcDef,
  type Landmark,
  type Refuge,
  type WorldSource,
} from '@game/engine';
import { HOME_CELL, HOME_ID, generateHome, homeStart } from './home.ts';
import { herbPatch, naturalSolid } from './herbs.ts';
import { BUILDING_CELL, DOOR_PATH, generateHouse } from './houses.ts';
import { Road, signpost } from './road.ts';
import { Plot, TOWN, TOWN_BUILDINGS, TOWN_CACHE, TOWN_NAME, TOWN_NPCS, TOWN_STREET_FIXTURES, inTown, plotAt, townFloor } from './town.ts';

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

/** What a chest in a house of the wilds holds: some coins and one small thing (Fede's choice, 2026-10-10). */
const TRINKETS = [
  ['candle', 3],
  ['ring', 1],
  ['cup', 2],
  ['herbs', 3],
] as const;
const CHEST_LOOT: LootTable = { coins: [1, 6], items: [{ chance: 1, pick: TRINKETS }] };
/** A locked chest keeps more: more coins, and a second thing in about one of three. */
const LOCKED_CHEST_LOOT: LootTable = {
  coins: [3, 10],
  items: [
    { chance: 1, pick: TRINKETS },
    { chance: 0.35, pick: TRINKETS },
  ],
};
/** A barred house was shut with its things inside: more coins, and a second thing in one of two. */
const BARRED_CHEST_LOOT: LootTable = {
  coins: [5, 15],
  items: [
    { chance: 1, pick: TRINKETS },
    { chance: 0.5, pick: TRINKETS },
  ],
};

/** A patch of herbs gives a bundle, and grows again 20 minutes after it was picked (Fede's choice, 2026-10-10). */
const HERB_LOOT: LootTable = { items: [{ chance: 1, pick: [['herbs', 1]] }], refillMs: 20 * 60_000 };
/** The savings that the old couple of Thornwick buried (the reeve tells of it, to a character with Wisdom 13). */
const CACHE_LOOT: LootTable = {
  coins: [8, 20],
  items: [
    { chance: 1, pick: [['ring', 1]] },
    { chance: 0.5, pick: TRINKETS },
  ],
};
/** No patch of herbs grows this close (tiles) to the ground of a house or to the signpost. */
const HERB_MARGIN = 2;

const CHAPEL = TOWN_BUILDINGS.find((b) => b.id === 'chapel')!;
const REFUGES: readonly Refuge[] = [{ id: 'chapel', building: CHAPEL.id, x: CHAPEL.doorX * TILE_SIZE + TILE_SIZE / 2, y: (CHAPEL.y1 - 1) * TILE_SIZE + 12 }];

/** Mobs in the wilds: four imps and two brutes round each player. */
const MOB_POPULATION = { imp: 4, brute: 2 } as const;

/** No house of the wilds stands this close to the town (tiles), and mobs do not live this close to it. */
const TOWN_MARGIN = 2;

/** Every fixture of the town, in its buildings and in its streets. */
const TOWN_FIXTURE_LIST: readonly Fixture[] = [...TOWN_BUILDINGS.flatMap((b) => b.fixtures), ...TOWN_STREET_FIXTURES, TOWN_CACHE];
/** The same, by each tile of its footprint. */
const TOWN_FIXTURES = new Map<string, { fixture: Fixture; code: number }>();
for (const fixture of TOWN_FIXTURE_LIST) {
  for (const [tx, ty, code] of fixtureTiles(fixture)) {
    const key = `${tx},${ty}`;
    if (TOWN_FIXTURES.has(key)) throw new Error(`two fixtures of the town on tile ${key}`);
    TOWN_FIXTURES.set(key, { fixture, code });
  }
}

const overlaps = (b: { x0: number; y0: number; x1: number; y1: number }, x0: number, y0: number, x1: number, y1: number) =>
  b.x1 >= x0 && b.x0 <= x1 && b.y1 >= y0 && b.y0 <= y1;

/**
 * The wilds: endless natural terrain from a seed, with a house in about a third of the cells, the
 * player's home in the middle (home.ts), where every character starts, and the town of Thornwick
 * to the west (town.ts), at the end of a road from the home (road.ts).
 */
export class WildsSource implements WorldSource {
  readonly seed: number;
  private readonly houses = new Map<string, Building | null>();
  private readonly patches = new Map<string, Fixture | null>();
  private roadOf: Road | null = null;
  private signOf: Fixture | null = null;

  constructor(seed: number) {
    this.seed = seed;
  }

  /** The road from the home to the town. */
  get road(): Road {
    this.roadOf ??= new Road(this.home());
    return this.roadOf;
  }

  /** The signpost by the home that points to the town. */
  get sign(): Fixture {
    this.signOf ??= signpost(this.home());
    return this.signOf;
  }

  /**
   * The house of a cell (cached), or null. A cell has no house where the house's ground (its ring
   * and the approach to its door) would touch the town, the road or the signpost.
   */
  house(cellX: number, cellY: number): Building | null {
    const key = `${cellX},${cellY}`;
    let house = this.houses.get(key);
    if (house === undefined) {
      const isWater = (tx: number, ty: number) => isWet(naturalGround(this.seed, tx, ty));
      if (cellX === HOME_CELL[0] && cellY === HOME_CELL[1]) {
        house = generateHome(isWater);
      } else {
        house = generateHouse(this.seed, cellX, cellY, isWater);
        if (house && this.inTheWay(house)) house = null;
      }
      this.houses.set(key, house);
    }
    return house;
  }

  /** Whether the ground of a house of the wilds would touch the town, the road or the signpost. */
  private inTheWay(house: Building): boolean {
    const x0 = house.x0 - 1;
    const y0 = house.y0 - 1;
    const x1 = house.x1 + 1;
    const y1 = house.y1 + DOOR_PATH;
    if (overlaps(TOWN, x0 - TOWN_MARGIN, y0 - TOWN_MARGIN, x1 + TOWN_MARGIN, y1 + TOWN_MARGIN)) return true;
    const sign = this.sign;
    if (sign.tx >= x0 - 1 && sign.tx <= x1 + 1 && sign.ty >= y0 - 1 && sign.ty <= y1 + 1) return true;
    const road = this.road;
    if (!overlaps(road, x0, y0, x1, y1)) return false;
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (road.clear(tx, ty)) return true;
    return false;
  }

  /** The patch of herbs of a cell (cached), or null (herbs.ts). */
  herbs(cellX: number, cellY: number): Fixture | null {
    const key = `${cellX},${cellY}`;
    let patch = this.patches.get(key);
    if (patch === undefined) {
      patch = herbPatch(
        this.seed,
        cellX,
        cellY,
        (tx, ty) => this.noHerbsAt(tx, ty),
        (tx, ty) => inTown(tx, ty) || naturalSolid(this.seed, tx, ty) || this.cellHousesIn(tx, ty, tx, ty).length > 0,
      );
      this.patches.set(key, patch);
    }
    return patch;
  }

  /** The patch of herbs on a tile, or null. */
  private patchAt(tx: number, ty: number): Fixture | null {
    const patch = this.herbs(Math.floor(tx / BUILDING_CELL), Math.floor(ty / BUILDING_CELL));
    return patch && patch.tx === tx && patch.ty === ty ? patch : null;
  }

  /** Where no herbs grow: near the town, on or near the road, near the signpost, and on or near the ground of a house. */
  private noHerbsAt(tx: number, ty: number): boolean {
    const m = TOWN_MARGIN + HERB_MARGIN;
    if (tx >= TOWN.x0 - m && tx <= TOWN.x1 + m && ty >= TOWN.y0 - m && ty <= TOWN.y1 + m) return true;
    if (this.road.clear(tx, ty)) return true;
    if (Math.abs(tx - this.sign.tx) <= HERB_MARGIN && Math.abs(ty - this.sign.ty) <= HERB_MARGIN) return true;
    const r = HERB_MARGIN + DOOR_PATH + 1;
    return this.cellHousesIn(tx - r, ty - r, tx + r, ty + r).some(
      (h) => tx >= h.x0 - 1 - HERB_MARGIN && tx <= h.x1 + 1 + HERB_MARGIN && ty >= h.y0 - 1 - HERB_MARGIN && ty <= h.y1 + DOOR_PATH + HERB_MARGIN,
    );
  }

  chunk(cx: number, cy: number): Chunk {
    const chunk = emptyChunk(cx, cy);
    // The houses of the cells that this chunk overlaps, and of the cells next to it: the ground
    // of a house (its ring and the path to its door) can reach a few tiles into the next cell.
    const reach = DOOR_PATH + 1;
    const houses = this.cellHousesIn(cx * CHUNK_SIZE - reach, cy * CHUNK_SIZE - reach, cx * CHUNK_SIZE + CHUNK_SIZE - 1 + reach, cy * CHUNK_SIZE + CHUNK_SIZE - 1 + reach);
    const road = this.road;
    const sign = this.sign;
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const tx = cx * CHUNK_SIZE + lx;
        const ty = cy * CHUNK_SIZE + ly;
        const index = ly * CHUNK_SIZE + lx;
        if (inTown(tx, ty)) {
          this.townTile(chunk, index, tx, ty);
          continue;
        }
        if (tx === sign.tx && ty === sign.ty) {
          const natural = naturalGround(this.seed, tx, ty);
          chunk.ground[index] = isWet(natural) ? Ground.Grass : natural;
          chunk.structure[index] = fixtureTiles(sign)[0]![2];
          continue;
        }
        const patch = this.patchAt(tx, ty);
        if (patch) {
          // A patch of herbs: on the grass, with nothing else growing on its tile.
          chunk.ground[index] = naturalGround(this.seed, tx, ty);
          chunk.structure[index] = fixtureTiles(patch)[0]![2];
          continue;
        }
        const house = houses.find((h) => nearHouse(h, tx, ty));
        if (!house && road.clear(tx, ty)) {
          // The road: mud (over water too), and nothing grows on it or close to it.
          const natural = naturalGround(this.seed, tx, ty);
          const ground = road.on(tx, ty) ? Ground.Dirt : isWet(natural) ? Ground.Sand : natural;
          chunk.ground[index] = ground;
          const decor = road.on(tx, ty) ? Decor.None : naturalDecor(this.seed, tx, ty, ground);
          chunk.decor[index] = decor === Decor.Tree || decor === Decor.Rock ? Decor.None : decor;
          continue;
        }
        const natural = naturalGround(this.seed, tx, ty);
        // The ground of the home is always dry (it stands where it must, see home.ts).
        const ground = house?.id === HOME_ID && isWet(natural) ? Ground.Grass : natural;
        if (house && inRect(house, tx, ty)) {
          // The home is a hut: packed earth with straw. The other houses have wooden floors.
          chunk.ground[index] = house.id === HOME_ID ? Ground.FloorEarth : Ground.Floor;
          chunk.structure[index] = structureIn(house, tx, ty);
        } else {
          // A short mud path leads to the door.
          chunk.ground[index] = house && tx === house.doorX && onApproach(house, tx, ty) ? Ground.Dirt : ground;
          // Nothing grows on a house, right next to it, or in front of its door; no tree grows
          // right next to the signpost.
          const decor = house ? Decor.None : naturalDecor(this.seed, tx, ty, ground);
          chunk.decor[index] = decor === Decor.Tree && Math.abs(tx - sign.tx) <= 1 && Math.abs(ty - sign.ty) <= 1 ? Decor.None : decor;
        }
      }
    }
    return chunk;
  }

  /** A tile of the town: its buildings, its streets with their things, and its gardens. */
  private townTile(chunk: Chunk, index: number, tx: number, ty: number): void {
    const building = TOWN_BUILDINGS.find((b) => inRect(b, tx, ty));
    if (building) {
      chunk.ground[index] = townFloor(building);
      chunk.structure[index] = structureIn(building, tx, ty);
      return;
    }
    const plot = plotAt(tx, ty);
    if (plot === Plot.Street || plot === Plot.Lane) {
      chunk.ground[index] = plot === Plot.Street ? Ground.Cobble : Ground.Dirt;
      chunk.structure[index] = TOWN_FIXTURES.get(`${tx},${ty}`)?.code ?? 0;
      return;
    }
    // A garden: the grass of the wilds (dry in any case), with tufts and flowers, and a tree only
    // where the plan has one. A buried cache has nothing growing on it.
    const natural = naturalGround(this.seed, tx, ty);
    const ground = isGrass(natural) ? natural : Ground.Grass;
    chunk.ground[index] = ground;
    const thing = TOWN_FIXTURES.get(`${tx},${ty}`);
    if (thing) {
      chunk.structure[index] = thing.code;
      return;
    }
    const decor = naturalDecor(this.seed, tx, ty, ground);
    chunk.decor[index] = plot === Plot.Tree && !this.treeOutsideNextTo(tx, ty) ? Decor.Tree : decor === Decor.Tree || decor === Decor.Rock ? Decor.None : decor;
  }

  /** Whether a tree of the wilds grows next to a tile of the town, just outside it: then no tree of the town grows there (no two trees touch). */
  private treeOutsideNextTo(tx: number, ty: number): boolean {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const [x, y] = [tx + dx, ty + dy];
        if (!inTown(x, y) && naturalDecor(this.seed, x, y, naturalGround(this.seed, x, y)) === Decor.Tree) return true;
      }
    }
    return false;
  }

  buildingAt(tx: number, ty: number): Building | null {
    if (inTown(tx, ty)) return TOWN_BUILDINGS.find((b) => inRect(b, tx, ty)) ?? null;
    const house = this.house(Math.floor(tx / BUILDING_CELL), Math.floor(ty / BUILDING_CELL));
    return house && inRect(house, tx, ty) ? house : null;
  }

  buildingsIn(x0: number, y0: number, x1: number, y1: number): Building[] {
    return [...TOWN_BUILDINGS.filter((b) => overlaps(b, x0, y0, x1, y1)), ...this.cellHousesIn(x0, y0, x1, y1)];
  }

  /** The houses of the cells (the home among them) that overlap a rectangle of tiles. */
  private cellHousesIn(x0: number, y0: number, x1: number, y1: number): Building[] {
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
    if (inTown(tx, ty)) return TOWN_FIXTURES.get(`${tx},${ty}`)?.fixture ?? null;
    if (tx === this.sign.tx && ty === this.sign.ty) return this.sign;
    const patch = this.patchAt(tx, ty);
    if (patch) return patch;
    const house = this.buildingAt(tx, ty);
    if (!house) return null;
    return house.fixtures.find((f) => fixtureTiles(f).some(([x, y]) => x === tx && y === ty)) ?? null;
  }

  fixturesIn(x0: number, y0: number, x1: number, y1: number): Fixture[] {
    const within = (f: Fixture) => f.tx >= x0 && f.tx <= x1 && f.ty >= y0 && f.ty <= y1;
    const out = this.cellHousesIn(x0, y0, x1, y1).flatMap((h) => h.fixtures.filter(within));
    if (overlaps(TOWN, x0, y0, x1, y1)) out.push(...TOWN_FIXTURE_LIST.filter(within));
    if (within(this.sign)) out.push(this.sign);
    for (let cy = Math.floor(y0 / BUILDING_CELL); cy <= Math.floor(y1 / BUILDING_CELL); cy++) {
      for (let cx = Math.floor(x0 / BUILDING_CELL); cx <= Math.floor(x1 / BUILDING_CELL); cx++) {
        const patch = this.herbs(cx, cy);
        if (patch && within(patch)) out.push(patch);
      }
    }
    return out;
  }

  /**
   * The chests of the houses of the wilds give loot (not the home's: that one is the character's
   * own); a locked chest gives more, and the chest of a barred house the most. A patch of herbs
   * gives a bundle, and the buried cache of Thornwick its savings.
   */
  loot(fixture: Fixture): LootTable | null {
    if (fixture.kind === 'herbpatch') return HERB_LOOT;
    if (fixture.kind === 'cache') return CACHE_LOOT;
    if (fixture.kind !== 'chest' || inTown(fixture.tx, fixture.ty)) return null;
    const house = this.buildingAt(fixture.tx, fixture.ty);
    if (!house || house.id === HOME_ID) return null;
    return house.barred ? BARRED_CHEST_LOOT : fixture.lock ? LOCKED_CHEST_LOOT : CHEST_LOOT;
  }

  /**
   * The chapel of Thornwick is a refuge: a character that has been inside it can wake there after a
   * defeat, if it is nearer than the home (Fede's choice, 2026-10-10). The point is the tile north
   * of its door.
   */
  refuges(): readonly Refuge[] {
    return REFUGES;
  }

  /** The named places for the map: the home, Thornwick, and its chapel. */
  landmarks(): readonly Landmark[] {
    const home = this.spawn();
    const town = { x: ((TOWN.x0 + TOWN.x1 + 1) / 2) * TILE_SIZE, y: ((TOWN.y0 + TOWN.y1 + 1) / 2) * TILE_SIZE };
    return [
      { name: 'Home', kind: 'home', x: home.x, y: home.y },
      { name: TOWN_NAME, kind: 'town', ...town },
      { name: 'Chapel', kind: 'refuge', x: REFUGES[0]!.x, y: REFUGES[0]!.y },
    ];
  }

  /** The people of Thornwick. */
  npcs(): readonly NpcDef[] {
    return TOWN_NPCS;
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
   * Mobs live everywhere in the woods, except on water, on the ground of a house (its ring and
   * the path to its door: a player who comes out of a door does not walk into one) and in or near
   * the town. They hunt everywhere outside the houses and the town: they never come into the
   * town, so it is safe.
   */
  mobs(): MobRules {
    const nearTown = (tx: number, ty: number) => tx >= TOWN.x0 - TOWN_MARGIN && tx <= TOWN.x1 + TOWN_MARGIN && ty >= TOWN.y0 - TOWN_MARGIN && ty <= TOWN.y1 + TOWN_MARGIN;
    return {
      roam: (tx, ty) =>
        !isWet(naturalGround(this.seed, tx, ty)) &&
        !nearTown(tx, ty) &&
        !this.cellHousesIn(tx - DOOR_PATH - 1, ty - DOOR_PATH - 1, tx + DOOR_PATH + 1, ty + DOOR_PATH + 1).some((h) => nearHouse(h, tx, ty)),
      hunt: (tx, ty) => !inTown(tx, ty),
      population: MOB_POPULATION,
    };
  }
}
