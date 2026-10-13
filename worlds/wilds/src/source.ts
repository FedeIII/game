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
  type MobKind,
  type MobRules,
  type NpcDef,
  type Landmark,
  type Refuge,
  dice,
  type AmbushDef,
  type AmbushMember,
  type ConvoyDef,
  type EscortDef,
  type GuardDef,
  type SceneDef,
  type SoundArea,
  type WorldSource,
} from '@game/engine';
import { HOME_CELL, HOME_ID, generateHome, homeStart } from './home.ts';
import { herbPatch, naturalSolid } from './herbs.ts';
import { BUILDING_CELL, DOOR_PATH, generateHouse } from './houses.ts';
import { CAMP, CAMP_GATE } from './camp.ts';
import { MERCHANT, WAGON_DRIVER } from './dialogs.ts';
import { ASHES_HELD, ASHES_LATE, ASHES_RELIC, CAMP_TAKEN, CARAVAN_LOST, CARAVAN_ROBBED, CARAVAN_SAVED, HIMO_HOME, HIMO_LOST, RAID_ARRIVED, RAID_BAND, RAID_DEFENDED, RAID_SCOUTS } from './quests.ts';
import { BAND_AREA, BAND_SPAN, Grove, Road, RoadStretch, campTrail, cartSpot, gateRoad, homeLegs, homeRoad, northRoad, signpost } from './road.ts';
import { BRONZEHOLD, HAMLET_NPCS, WHITEGROVE, WHITEGROVE_SHRINE } from './hamlets.ts';
import { SILVERVEIN } from './river.ts';
import { RUINS, RUIN_NPCS } from './ruins.ts';
import { SILVERSPRING, SILVERSPRING_NPCS } from './silverspring.ts';
import { IRONHOLD, TOWN_CACHE, TOWN_NPCS, TOWN_SCENES } from './town.ts';
import { Plot, type Town } from './towns.ts';
import { SEEKER_CAMP } from './seekers.ts';
import { ALTAR_TILE, SHRINE_FIXTURES, SHRINE_RECT } from './shrine.ts';
import { SEEKER_TRAIL, WREN, WREN_GATE, WREN_NPCS } from './wren.ts';

/** The fixed towns of the Wilds: Ironhold (town.ts) and Silverspring (silverspring.ts). No mob comes into them. */
const TOWNS: readonly Town[] = [IRONHOLD, SILVERSPRING, WHITEGROVE, BRONZEHOLD];
/**
 * The places in a clearing of the woods, where mobs go as in the woods: the camp of the war band
 * (camp.ts), the burned homesteads (ruins.ts), the Wren homestead (wren.ts) and the camp of the
 * Ashen Seekers (seekers.ts).
 */
const CLEARINGS: readonly Town[] = [CAMP, ...RUINS, WREN, SEEKER_CAMP];
/** Every fixed place of the Wilds. */
const PLACES: readonly Town[] = [...TOWNS, ...CLEARINGS];

/** The fixed place that a tile is in, or null. */
function placeAt(tx: number, ty: number): Town | null {
  return PLACES.find((t) => t.has(tx, ty)) ?? null;
}

/** The town that a tile is in, or null. */
function townAt(tx: number, ty: number): Town | null {
  return TOWNS.find((t) => t.has(tx, ty)) ?? null;
}

/** Whether a tile is within `margin` tiles of one of `places` (or in it). */
function nearPlace(tx: number, ty: number, margin: number, places: readonly Town[] = PLACES): boolean {
  return places.some((t) => tx >= t.x0 - margin && tx <= t.x1 + margin && ty >= t.y0 - margin && ty <= t.y1 + margin);
}

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
/**
 * The magic items of the SRD (gear.ts), by weight: rare loot in a locked chest (1 in 16), a barred
 * house (1 in 8) and the buried cache of Ironhold (1 in 6). The common ones come more often.
 */
export const MAGIC_ITEMS = [
  ['longsword-plus-1', 3],
  ['cloak-of-protection', 3],
  ['boots-of-elvenkind', 3],
  ['ring-of-protection', 2],
  ['bracers-of-defence', 2],
  ['gauntlets-of-ogre-power', 2],
  ['headband-of-intellect', 2],
  ['belt-of-dwarvenkind', 2],
  ['amulet-of-health', 1],
] as const;
export const MAGIC_CHANCE = { locked: 1 / 16, barred: 1 / 8, cache: 1 / 6 } as const;
/** A locked chest keeps more: more coins, and a second thing in about one of three. */
const LOCKED_CHEST_LOOT: LootTable = {
  coins: [3, 10],
  items: [
    { chance: 1, pick: TRINKETS },
    { chance: 0.35, pick: TRINKETS },
    { chance: MAGIC_CHANCE.locked, pick: MAGIC_ITEMS },
  ],
};
/** A barred house was shut with its things inside: more coins, and a second thing in one of two. */
const BARRED_CHEST_LOOT: LootTable = {
  coins: [5, 15],
  items: [
    { chance: 1, pick: TRINKETS },
    { chance: 0.5, pick: TRINKETS },
    { chance: MAGIC_CHANCE.barred, pick: MAGIC_ITEMS },
  ],
};

/** A patch of herbs gives a bundle, and grows again 20 minutes after it was picked (Fede's choice, 2026-10-10). */
const HERB_LOOT: LootTable = { items: [{ chance: 1, pick: [['herbs', 1]] }], refillMs: 20 * 60_000 };
/** The savings that the old couple of Ironhold buried (the reeve tells of it, to a character with Wisdom 13). */
const CACHE_LOOT: LootTable = {
  coins: [8, 20],
  items: [
    { chance: 1, pick: [['ring', 1]] },
    { chance: 0.5, pick: TRINKETS },
    { chance: MAGIC_CHANCE.cache, pick: MAGIC_ITEMS },
  ],
};
/** No patch of herbs grows this close (tiles) to the ground of a house or to the signpost. */
const HERB_MARGIN = 2;

const CHAPEL = IRONHOLD.buildings.find((b) => b.id === 'chapel')!;
const INN = IRONHOLD.buildings.find((b) => b.id === 'inn')!;
const TROUT = SILVERSPRING.buildings.find((b) => b.id === 'trout')!;
/**
 * The chapel: a character that has been inside it wakes there after a defeat. The inn: only a
 * character to whom Marta gave a room (Charisma 13, dialogs.ts), on the tile west of its bed. The
 * Silver Trout of Silverspring: only a character of the guard of Silverspring (the title of the raid;
 * Tova gives the bed), on the tile west of its bed.
 */
const REFUGES: readonly Refuge[] = [
  { id: 'chapel', building: CHAPEL.id, x: CHAPEL.doorX * TILE_SIZE + TILE_SIZE / 2, y: (CHAPEL.y1 - 1) * TILE_SIZE + 12 },
  { id: 'inn', building: INN.id, x: (INN.x0 + 7) * TILE_SIZE + TILE_SIZE / 2, y: (INN.y0 + 4) * TILE_SIZE + 12, given: true },
  { id: 'trout', building: TROUT.id, x: (TROUT.x0 + 7) * TILE_SIZE + TILE_SIZE / 2, y: (TROUT.y0 + 2) * TILE_SIZE + 12, given: true },
  // The shrine of Whitegrove, on the road to Ironhold (the tutorial): the tile north of its door.
  { id: 'whitegrove', building: WHITEGROVE_SHRINE.id, x: WHITEGROVE_SHRINE.doorX * TILE_SIZE + TILE_SIZE / 2, y: (WHITEGROVE_SHRINE.y1 - 1) * TILE_SIZE + 12 },
];

/** The mobs round each player in the wildlands: four imps and two brutes. The hobgoblin band comes only with the story: none of it roams. */
const MOB_POPULATION = { imp: 4, brute: 2 } as const;

/**
 * The forest at the northern edge of the Iron Sovereignty, from this row south (tiles): the woods of
 * the tutorial, round the hut, Whitegrove, Bronzehold and Ironhold, to the north edge of Ironhold
 * (Fede, 2026-10-13: the only enemies on the way from the hut to Ironhold are goblins, and imps and
 * brutes live only north of Ironhold, the last town of the Sovereignty). Only goblin patrols live
 * there (the skirmisher: mobs.ts); imps and brutes keep the wildlands north of it.
 */
export const FOREST_EDGE_Y = IRONHOLD.y0;
/** The goblins round a player in the forest of the tutorial: one patrol of 2 or 3. */
const FOREST_POPULATION = { skirmisher: 3 } as const;
/** Whether a tile is in the forest of the tutorial. */
export function inTutorialForest(_tx: number, ty: number): boolean {
  return ty >= FOREST_EDGE_Y;
}

/** No house of the wilds stands this close to a town (tiles), and mobs do not live this close to it. */
const TOWN_MARGIN = 2;
/**
 * The scouts of the hobgoblins (chapter 1.5.1), in the order in which more characters meet more of
 * them: a worg with a goblin behind; the hobgoblin in front of that goblin; the second worg with its
 * goblin; the bugbear in front of it.
 */
const SCOUT_UNITS: readonly (readonly AmbushMember[])[] = [
  [{ kind: 'worg' }, { kind: 'goblin', rides: 0, seat: 1 }],
  [{ kind: 'hobgoblin', rides: 0, seat: 0 }],
  [{ kind: 'worg' }, { kind: 'goblin', rides: 3, seat: 1 }],
  [{ kind: 'bugbear', rides: 3, seat: 0 }],
];

/**
 * The war band (story phase 4b; chapter 1.5.1, "el pelotón de ataque"): the Hobgoblin Devastator
 * with a hobgoblin, then more hobgoblins and a bugbear. Alone, a character meets the Devastator and
 * one hobgoblin; six characters meet the whole band (encounters.ts: the Devastator, five hobgoblins
 * and the bugbear). The same band raids Silverspring when it comes there first.
 */
const BAND_UNITS: readonly (readonly AmbushMember[])[] = [
  [{ kind: 'devastator' }, { kind: 'hobgoblin' }],
  [{ kind: 'hobgoblin' }],
  [{ kind: 'hobgoblin' }],
  [{ kind: 'bugbear' }],
  [{ kind: 'hobgoblin' }],
  [{ kind: 'hobgoblin' }],
];
/** The band marches at this pace (px/s): a slow walk (a character walks at 80). */
const BAND_SPEED = 36;

/**
 * Other hobgoblins of the clan (story phase 5, Fede's decision): they attack the caravan of
 * Silverspring when the character already killed the scouts and the war band. A hobgoblin with a
 * goblin archer, then another hobgoblin, a worg with a goblin on its back, the bugbear, and more.
 */
const CLAN_UNITS: readonly (readonly AmbushMember[])[] = [
  [{ kind: 'hobgoblin' }, { kind: 'goblin' }],
  [{ kind: 'hobgoblin' }],
  [{ kind: 'worg' }, { kind: 'goblin', rides: 3, seat: 1 }],
  [{ kind: 'bugbear' }],
  [{ kind: 'hobgoblin' }],
  [{ kind: 'goblin' }],
];
/** The militia of the caravan of Silverspring (5e: a guard: AC 16, 11 hit points, a spear +3, 1d6+1). */
const CARAVAN_MILITIA: GuardDef = { id: 'militia', name: 'Militia', look: 'militia', hp: 11, ac: 16, blow: { toHit: 3, damage: dice(1, 6, 1), push: 1, stagger: 1, opening: 0 } };
/** The wagon of the caravan (a cart and two horses: 30 hit points, AC 11), with its driver to talk to. */
const CARAVAN_WAGON: GuardDef = {
  id: 'wagon',
  name: 'Caravan',
  look: 'wagon',
  hp: 30,
  ac: 11,
  speed: 0.55,
  content: { speaker: 'fixture', dialog: WAGON_DRIVER },
  size: { halfWidth: 14, halfHeight: 6 },
};
/** The caravan meets its attackers at this share of the north road (from Ironhold): half a day from Silverspring. A character this near starts it (`CARAVAN_AREA`). */
export const CARAVAN_MEET = 0.8;
const CARAVAN_AREA = { span: [0.7, 0.97], radius: 12 } as const;
/** A character at this step of the caravan meets the scouts and the band at the caravan, not in the grove or on the road. */
const NOT_AT_THE_CARAVAN = { quest: 'caravan', at: ['heard'], not: true } as const;

/** No tree or rock grows this close to the camp of the war band and to the burned homesteads (tiles): they stand in clearings. */
const CAMP_CLEARING = 2;
/** The raid on Silverspring starts for a character at the step this close to the town (tiles); the band marches this many tiles up the main street. */
const RAID_MARGIN = 6;
const RAID_STREET = 20;
/**
 * The race to the Wren homestead (story phase 7): the cinder hounds of the Ashen Seekers, in pairs, and
 * a watcher behind them that never fights. Alone, a character meets two hounds; two characters meet
 * six; more meet more (encounters.ts).
 */
const HOUND_UNITS: readonly (readonly AmbushMember[])[] = [
  [{ kind: 'hound' }, { kind: 'hound' }, { kind: 'watcher' }],
  [{ kind: 'hound' }, { kind: 'hound' }],
  [{ kind: 'hound' }, { kind: 'hound' }],
  [{ kind: 'hound' }, { kind: 'hound' }],
  [{ kind: 'hound' }, { kind: 'hound' }],
  [{ kind: 'hound' }, { kind: 'hound' }],
];
/**
 * The guards of the camp of the Ashen Seekers (story phase 8): blades and cinder adepts. Alone, a
 * character meets a blade and an adept; six characters meet four blades and two adepts.
 */
const CAMP_GUARD_UNITS: readonly (readonly AmbushMember[])[] = [[{ kind: 'seeker' }], [{ kind: 'adept' }], [{ kind: 'seeker' }], [{ kind: 'seeker' }], [{ kind: 'adept' }], [{ kind: 'seeker' }]];
/** The guards of the camp come for a character at the step this close to the camp (tiles). */
const CAMP_GUARD_MARGIN = 6;
/**
 * The Seekers who come for the Tear at the shrine of Tigris (story phase 9): the Ash Warden, then blades
 * and adepts. Alone or with a friend, a character meets the Warden alone; three meet it with a blade;
 * six meet it with three blades and an adept.
 */
const SHRINE_UNITS: readonly (readonly AmbushMember[])[] = [[{ kind: 'warden' }], [{ kind: 'seeker' }], [{ kind: 'seeker' }], [{ kind: 'adept' }], [{ kind: 'seeker' }], [{ kind: 'adept' }]];
/** They come for a character with the Tear within this many tiles of the altar; they march this many tiles of the burned trail from the east, at this pace (px/s). */
const SHRINE_RADIUS = 16;
const SHRINE_APPROACH = 14;
const SHRINE_SPEED = 44;
/** The race starts for a character at the step this close to the middle of the Wren homestead (tiles); the hounds march at this pace (px/s). */
const RACE_RADIUS = 32;
const RACE_SPEED = 32;
/** Himo, the scout of Ironhold (5e: a scout, 16 hit points, AC 13): he dies if he falls. */
const HIMO = { id: 'himo', name: 'Himo', look: 'scout', hp: 16, ac: 13, fallen: 'gone' } as const;

/** The trees of the grove: the natural forest with no threshold (terrain.ts, hasTree): a tree at every local pick, also where the woods have a clearing. */
const GROVE_THRESHOLD = 0;
/**
 * The lantern of the merchant's cart keeps the mobs this far away (tiles, from the middle of the
 * cart), as the lamps of the town do: a character can talk to the merchant in peace.
 */
export const CART_SAFE = 4;
/** The lantern of the cart: as a lamp of the town (the radius snaps to 48, 96 or 150). */
const CART_LANTERN = { radius: 96, colour: 0xffb060, x: 4, y: -20 } as const;

/** The loose things of the woods (the shrine of Tigris, shrine.ts), by each tile of their footprint. */
const LOOSE_FIXTURES = new Map<string, { fixture: Fixture; code: number }>();
for (const fixture of SHRINE_FIXTURES) for (const [tx, ty, code] of fixtureTiles(fixture)) LOOSE_FIXTURES.set(`${tx},${ty}`, { fixture, code });
/** Whether a tile is in or next to the rectangle of the shrine of Tigris: no tree, rock or herb grows there. */
const nearShrine = (tx: number, ty: number) => tx >= SHRINE_RECT.x0 - 1 && tx <= SHRINE_RECT.x1 + 1 && ty >= SHRINE_RECT.y0 - 1 && ty <= SHRINE_RECT.y1 + 1;

/** Every fixture of the fixed places, in their buildings and in their streets. */
const TOWN_FIXTURE_LIST: readonly Fixture[] = [...PLACES.flatMap((t) => [...t.buildings.flatMap((b) => b.fixtures), ...t.streetFixtures]), TOWN_CACHE];
/** The same, by each tile of its footprint. */
const TOWN_FIXTURES = new Map<string, { fixture: Fixture; code: number }>();
for (const fixture of TOWN_FIXTURE_LIST) {
  for (const [tx, ty, code] of fixtureTiles(fixture)) {
    const key = `${tx},${ty}`;
    if (TOWN_FIXTURES.has(key)) throw new Error(`two fixtures of a town on tile ${key}`);
    TOWN_FIXTURES.set(key, { fixture, code });
  }
}
/** The buildings of all the fixed places. */
const TOWN_BUILDINGS: readonly Building[] = PLACES.flatMap((t) => t.buildings);

const overlaps = (b: { x0: number; y0: number; x1: number; y1: number }, x0: number, y0: number, x1: number, y1: number) =>
  b.x1 >= x0 && b.x0 <= x1 && b.y1 >= y0 && b.y0 <= y1;

/**
 * The wilds: endless natural terrain from a seed, with a house in about a third of the cells, the
 * player's home in the cell HOME_CELL (home.ts), where every character starts, the hamlets Whitegrove
 * and Bronzehold on the road north (hamlets.ts), the town of Ironhold at its end (town.ts), and
 * Silverspring at the end of the north road from Ironhold (silverspring.ts). docs/story/world.md
 * tells the places, and the code must match it.
 */
export class WildsSource implements WorldSource {
  readonly seed: number;
  private readonly houses = new Map<string, Building | null>();
  private readonly patches = new Map<string, Fixture | null>();
  private roadOf: Road | null = null;
  private northOf: Road | null = null;
  private trailOf: Road | null = null;
  private gateOf: Road | null = null;
  private groveOf: Grove | null = null;
  private signOf: Fixture | null = null;
  private cartOf: Fixture | null = null;
  private npcList: readonly NpcDef[] | null = null;
  private ambushList: readonly AmbushDef[] | null = null;
  private soundAreaList: readonly SoundArea[] | null = null;

  constructor(seed: number) {
    this.seed = seed;
  }

  /** The road from the home to the town. */
  get road(): Road {
    this.roadOf ??= homeRoad(this.home());
    return this.roadOf;
  }

  /** The north road, from Ironhold to Silverspring (road.ts). */
  get north(): Road {
    this.northOf ??= northRoad();
    return this.northOf;
  }

  /** The trail from the north road to the camp of the war band (road.ts, camp.ts). */
  get trail(): Road {
    this.trailOf ??= campTrail(CAMP_GATE);
    return this.trailOf;
  }

  /** The way from the east gate of Ironhold to the start of the north road (road.ts). */
  get gate(): Road {
    this.gateOf ??= gateRoad();
    return this.gateOf;
  }

  /** The roads: to Ironhold, to Silverspring and from the gate to it, the trail to the camp, and the burned trail of the Seekers (wren.ts). */
  private get roads(): readonly Road[] {
    return [this.road, this.north, this.gate, this.trail, SEEKER_TRAIL];
  }

  /** The grove on the north road, where the scouts of the hobgoblins wait (road.ts). */
  get grove(): Grove {
    this.groveOf ??= new Grove(this.north);
    return this.groveOf;
  }

  /** Whether a tile is on a road or close to it, where nothing grows (but in the grove). */
  private roadClear(tx: number, ty: number): boolean {
    return this.roads.some((r) => r.clear(tx, ty));
  }

  /**
   * The merchant's cart, beside the road to the town (road.ts, cartSpot): broken, with its wheel in
   * the mud; mended for a character who helped the merchant (quests.ts, cart).
   */
  get cart(): Fixture {
    this.cartOf ??= { kind: 'cart', ...cartSpot(new Road([homeLegs(this.home())[0]!])), light: CART_LANTERN, variant: { when: { quest: 'cart', at: ['done'] }, frame: 'fixture/cart-mended' } };
    return this.cartOf;
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

  /** Whether the ground of a house of the wilds would touch a town, a road, the grove, the river or the signpost. */
  private inTheWay(house: Building): boolean {
    const x0 = house.x0 - 1;
    const y0 = house.y0 - 1;
    const x1 = house.x1 + 1;
    const y1 = house.y1 + DOOR_PATH;
    if (overlaps(SILVERVEIN, x0, y0, x1, y1)) {
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (SILVERVEIN.has(tx, ty)) return true;
    }
    if (PLACES.some((t) => overlaps(t, x0 - TOWN_MARGIN, y0 - TOWN_MARGIN, x1 + TOWN_MARGIN, y1 + TOWN_MARGIN))) return true;
    const sign = this.sign;
    if (sign.tx >= x0 - 1 && sign.tx <= x1 + 1 && sign.ty >= y0 - 1 && sign.ty <= y1 + 1) return true;
    for (const road of this.roads) {
      if (!overlaps(road, x0, y0, x1, y1)) continue;
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (road.clear(tx, ty)) return true;
    }
    // No house in the grove either: it is a wood.
    if (!overlaps(this.grove, x0, y0, x1, y1)) return false;
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.grove.has(tx, ty)) return true;
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
        (tx, ty) => placeAt(tx, ty) !== null || naturalSolid(this.seed, tx, ty) || this.cellHousesIn(tx, ty, tx, ty).length > 0,
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

  /** Where no herbs grow: near a town, on or near a road, near the signpost, and on or near the ground of a house. */
  private noHerbsAt(tx: number, ty: number): boolean {
    if (nearPlace(tx, ty, TOWN_MARGIN + HERB_MARGIN)) return true;
    if (SILVERVEIN.has(tx, ty) || nearShrine(tx, ty)) return true;
    if (this.roadClear(tx, ty)) return true;
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
    const north = this.north;
    const trail = this.trail;
    const gate = this.gate;
    const grove = this.grove;
    const sign = this.sign;
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const tx = cx * CHUNK_SIZE + lx;
        const ty = cy * CHUNK_SIZE + ly;
        const index = ly * CHUNK_SIZE + lx;
        const place = placeAt(tx, ty);
        if (place) {
          this.townTile(place, chunk, index, tx, ty);
          continue;
        }
        if (tx === sign.tx && ty === sign.ty) {
          const natural = naturalGround(this.seed, tx, ty);
          chunk.ground[index] = isWet(natural) ? Ground.Grass : natural;
          chunk.structure[index] = fixtureTiles(sign)[0]![2];
          continue;
        }
        const cart = this.cart;
        if (ty === cart.ty && (tx === cart.tx || tx === cart.tx + 1)) {
          // The merchant's cart, beside the road: on dry ground, with nothing growing under it.
          const natural = naturalGround(this.seed, tx, ty);
          chunk.ground[index] = isWet(natural) ? Ground.Sand : natural;
          chunk.structure[index] = fixtureTiles(cart)[tx - cart.tx]![2];
          continue;
        }
        const loose = LOOSE_FIXTURES.get(`${tx},${ty}`);
        if (loose) {
          // A thing of the shrine of Tigris, on the bank of the pool: dry ground under it.
          const natural = naturalGround(this.seed, tx, ty);
          chunk.ground[index] = isWet(natural) ? Ground.Grass : natural;
          chunk.structure[index] = loose.code;
          continue;
        }
        const river = SILVERVEIN.band(tx, ty);
        if (river) {
          // The Silvervein (river.ts): deep water, shallows at its banks, and a bank where nothing tall grows.
          const natural = naturalGround(this.seed, tx, ty);
          const ground = river === 'deep' ? Ground.Water : river === 'shallow' ? Ground.Shallows : isWet(natural) ? Ground.Grass : natural;
          chunk.ground[index] = ground;
          const decor = river === 'bank' ? naturalDecor(this.seed, tx, ty, ground) : Decor.None;
          chunk.decor[index] = decor === Decor.Tree || decor === Decor.Rock ? Decor.None : decor;
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
        const onRoad = road.on(tx, ty) || north.on(tx, ty) || gate.on(tx, ty) || trail.on(tx, ty) || SEEKER_TRAIL.on(tx, ty);
        if (!house && !onRoad && grove.has(tx, ty)) {
          // The grove: trees close on both sides of the north road, right to its edge.
          const natural = naturalGround(this.seed, tx, ty);
          const ground = north.clear(tx, ty) && isWet(natural) ? Ground.Sand : natural;
          chunk.ground[index] = ground;
          // A close wood: the forest of the woods everywhere along it (no clearings), never two trees side by side.
          chunk.decor[index] = naturalDecor(this.seed, tx, ty, ground, GROVE_THRESHOLD);
          continue;
        }
        if (!house && (road.clear(tx, ty) || north.clear(tx, ty) || gate.clear(tx, ty) || trail.clear(tx, ty) || SEEKER_TRAIL.clear(tx, ty))) {
          // A road: mud (over water too), and nothing grows on it or close to it.
          const natural = naturalGround(this.seed, tx, ty);
          const ground = onRoad ? Ground.Dirt : isWet(natural) ? Ground.Sand : natural;
          chunk.ground[index] = ground;
          const decor = onRoad ? Decor.None : naturalDecor(this.seed, tx, ty, ground);
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
          // right next to the signpost; no tree or rock in the ring round the camp and the burned homesteads (a clearing).
          const decor = house ? Decor.None : naturalDecor(this.seed, tx, ty, ground);
          const solid = decor === Decor.Tree || decor === Decor.Rock;
          chunk.decor[index] = (decor === Decor.Tree && Math.abs(tx - sign.tx) <= 1 && Math.abs(ty - sign.ty) <= 1) || (solid && (nearPlace(tx, ty, CAMP_CLEARING, CLEARINGS) || nearShrine(tx, ty))) ? Decor.None : decor;
        }
      }
    }
    return chunk;
  }

  /** A tile of a town: its buildings, its streets with their things, its water and its gardens. */
  private townTile(town: Town, chunk: Chunk, index: number, tx: number, ty: number): void {
    const building = town.buildings.find((b) => inRect(b, tx, ty));
    if (building) {
      chunk.ground[index] = town.floor(building);
      chunk.structure[index] = structureIn(building, tx, ty);
      return;
    }
    const plot = town.plotAt(tx, ty);
    if (plot === Plot.Water || plot === Plot.Bridge) {
      // The stream of Silverspring and its pools; a bridge of planks over it.
      chunk.ground[index] = plot === Plot.Water ? Ground.Water : Ground.Floor;
      return;
    }
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

  /** Whether a tree of the wilds grows next to a tile of a town, just outside it: then no tree of the town grows there (no two trees touch). */
  private treeOutsideNextTo(tx: number, ty: number): boolean {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const [x, y] = [tx + dx, ty + dy];
        if (!placeAt(x, y) && naturalDecor(this.seed, x, y, naturalGround(this.seed, x, y)) === Decor.Tree) return true;
      }
    }
    return false;
  }

  buildingAt(tx: number, ty: number): Building | null {
    const place = placeAt(tx, ty);
    if (place) return place.buildings.find((b) => inRect(b, tx, ty)) ?? null;
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
    if (placeAt(tx, ty)) return TOWN_FIXTURES.get(`${tx},${ty}`)?.fixture ?? null;
    const loose = LOOSE_FIXTURES.get(`${tx},${ty}`);
    if (loose) return loose.fixture;
    if (tx === this.sign.tx && ty === this.sign.ty) return this.sign;
    const cart = this.cart;
    if (ty === cart.ty && (tx === cart.tx || tx === cart.tx + 1)) return cart;
    const patch = this.patchAt(tx, ty);
    if (patch) return patch;
    const house = this.buildingAt(tx, ty);
    if (!house) return null;
    return house.fixtures.find((f) => fixtureTiles(f).some(([x, y]) => x === tx && y === ty)) ?? null;
  }

  fixturesIn(x0: number, y0: number, x1: number, y1: number): Fixture[] {
    const within = (f: Fixture) => f.tx >= x0 && f.tx <= x1 && f.ty >= y0 && f.ty <= y1;
    const out = this.cellHousesIn(x0, y0, x1, y1).flatMap((h) => h.fixtures.filter(within));
    if (PLACES.some((t) => overlaps(t, x0, y0, x1, y1))) out.push(...TOWN_FIXTURE_LIST.filter(within));
    out.push(...SHRINE_FIXTURES.filter(within));
    if (within(this.sign)) out.push(this.sign);
    if (within(this.cart)) out.push(this.cart);
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
   * gives a bundle, and the buried cache of Ironhold its savings.
   */
  loot(fixture: Fixture): LootTable | null {
    if (fixture.kind === 'herbpatch') return HERB_LOOT;
    if (fixture.kind === 'cache') return CACHE_LOOT;
    if (fixture.kind !== 'chest' || placeAt(fixture.tx, fixture.ty)) return null;
    const house = this.buildingAt(fixture.tx, fixture.ty);
    if (!house || house.id === HOME_ID) return null;
    return house.barred ? BARRED_CHEST_LOOT : fixture.lock ? LOCKED_CHEST_LOOT : CHEST_LOOT;
  }

  /**
   * The refuges of Ironhold: a character can wake in one after a defeat, if it is nearer than
   * the home (Fede's choice, 2026-10-10). The chapel, for a character that has been inside it
   * (the tile north of its door); the inn, for one with a room there (REFUGES).
   */
  refuges(): readonly Refuge[] {
    return REFUGES;
  }

  /**
   * The places with a music of their own (2026-10-12): the home and the chapel (inside them), the
   * two towns, the burned homesteads, the Wren homestead, the two camps and the shrine, each with a
   * margin round it (the music changes as the player comes near). All but the home have the music of
   * discovery the first time a character comes.
   */
  soundAreas(): readonly SoundArea[] {
    if (!this.soundAreaList) {
      const home = this.home();
      const around = (id: string, music: string, t: { x0: number; y0: number; x1: number; y1: number }, margin: number): SoundArea => ({
        id,
        music,
        x0: t.x0 - margin,
        y0: t.y0 - margin,
        x1: t.x1 + margin,
        y1: t.y1 + margin,
        discover: true,
      });
      this.soundAreaList = [
        { id: 'home', music: 'home', x0: home.x0, y0: home.y0, x1: home.x1, y1: home.y1, building: home.id },
        { id: 'chapel', music: 'chapel', x0: CHAPEL.x0, y0: CHAPEL.y0, x1: CHAPEL.x1, y1: CHAPEL.y1, building: CHAPEL.id },
        around('ironhold', 'town', IRONHOLD, 3),
        around('silverspring', 'haven', SILVERSPRING, 3),
        ...RUINS.map((ruin, i) => around(`ruin-${i + 1}`, 'ruins', ruin, 2)),
        around('wren', 'home', WREN, 2),
        around('war-camp', 'camp', CAMP, 4),
        around('seeker-camp', 'camp', SEEKER_CAMP, 4),
        around('shrine', 'shrine', SHRINE_RECT, 4),
        around('whitegrove', 'town', WHITEGROVE, 3),
        around('bronzehold', 'town', BRONZEHOLD, 3),
      ];
    }
    return this.soundAreaList;
  }

  /** The named places for the map: the home, Ironhold and its chapel, Silverspring, and the two hamlets with the shrine of Whitegrove. */
  landmarks(): readonly Landmark[] {
    const home = this.spawn();
    const middle = (t: Town) => ({ x: ((t.x0 + t.x1 + 1) / 2) * TILE_SIZE, y: ((t.y0 + t.y1 + 1) / 2) * TILE_SIZE });
    const shrine = REFUGES.find((r) => r.id === 'whitegrove')!;
    return [
      { name: 'Home', kind: 'home', x: home.x, y: home.y },
      { name: IRONHOLD.name, kind: 'town', ...middle(IRONHOLD) },
      { name: 'Chapel', kind: 'refuge', x: REFUGES[0]!.x, y: REFUGES[0]!.y },
      { name: SILVERSPRING.name, kind: 'town', ...middle(SILVERSPRING) },
      { name: WHITEGROVE.name, kind: 'town', ...middle(WHITEGROVE) },
      { name: BRONZEHOLD.name, kind: 'town', ...middle(BRONZEHOLD) },
      { name: 'Shrine', kind: 'refuge', x: shrine.x, y: shrine.y },
    ];
  }

  /**
   * The people of Ironhold, then the merchant by the cart on the road (its area: the road in front
   * of the cart), then the people of Silverspring, then the survivors of the burned homesteads. The
   * order is the code of each NPC on the wire: add new people at the end.
   */
  npcs(): readonly NpcDef[] {
    if (!this.npcList) {
      const cart = this.cart;
      const road = this.road;
      // The merchant walks on the road round his cart (cartSpot: north or east of it): the road tiles
      // within 2 tiles of the cart, in one piece with the one nearest to it, where he stands.
      const near = (tx: number, ty: number) => road.on(tx, ty) && tx >= cart.tx - 2 && tx <= cart.tx + 3 && ty >= cart.ty - 2 && ty <= cart.ty + 2;
      let home: [number, number] = [cart.tx, cart.ty + 1];
      for (let ty = cart.ty - 2; ty <= cart.ty + 2; ty++) {
        for (let tx = cart.tx - 2; tx <= cart.tx + 3; tx++) {
          if (near(tx, ty) && Math.hypot(tx - cart.tx - 0.5, ty - cart.ty) < Math.hypot(home[0] - cart.tx - 0.5, home[1] - cart.ty) - 1e-9) home = [tx, ty];
          if (near(tx, ty) && !near(home[0], home[1])) home = [tx, ty];
        }
      }
      const area: [number, number][] = [];
      const seen = new Set<string>();
      const queue: [number, number][] = [home];
      while (queue.length) {
        const [tx, ty] = queue.pop()!;
        if (seen.has(`${tx},${ty}`) || !near(tx, ty)) continue;
        seen.add(`${tx},${ty}`);
        area.push([tx, ty]);
        queue.push([tx + 1, ty], [tx - 1, ty], [tx, ty + 1], [tx, ty - 1]);
      }
      const merchant: NpcDef = {
        id: 'merchant',
        look: 'merchant',
        home,
        area,
        content: { speaker: 'fixture', dialog: MERCHANT },
        barks: ['A long road, and a bad one.', 'Ironhold, then Silverspring. Then home.', 'Who walks there? A friend, I hope.'],
      };
      this.npcList = [...TOWN_NPCS, merchant, ...SILVERSPRING_NPCS, ...RUIN_NPCS, ...WREN_NPCS, ...HAMLET_NPCS];
    }
    return this.npcList;
  }

  /**
   * The ambushes: the scouts of the hobgoblins wait in the grove for a character that goes to warn
   * Silverspring (quests.ts, raid at `asked`; chapter 1.5.1): a hobgoblin and a bugbear on worgs, a
   * goblin behind each one. Alone, a character meets one worg with its goblin; more characters meet
   * more of the band (encounters.ts).
   */
  ambushes(): readonly AmbushDef[] {
    if (!this.ambushList) {
      const grove = this.grove;
      const north = this.north;
      const tile = ([x, y]: readonly [number, number]) => [Math.floor(x), Math.floor(y)] as const;
      const scouts: AmbushDef = { id: 'scouts', inArea: (tx, ty) => grove.has(tx, ty), when: [{ quest: 'raid', at: ['asked'] }, NOT_AT_THE_CARAVAN], from: [tile(grove.start), tile(grove.end)], units: SCOUT_UNITS, effect: RAID_SCOUTS };
      // The war band marches from beyond the grove to the gate of Silverspring (road.ts, BAND_SPAN).
      const marchArea = new RoadStretch(north, BAND_AREA.span, BAND_AREA.radius);
      const first = Math.floor(north.points.length * BAND_SPAN[0]);
      const band: AmbushDef = {
        id: 'band',
        inArea: (tx, ty) => marchArea.has(tx, ty) && !townAt(tx, ty),
        when: [{ quest: 'raid', at: ['scouts'] }, NOT_AT_THE_CARAVAN],
        from: [],
        units: BAND_UNITS,
        effect: RAID_BAND,
        march: { route: north.points.slice(first), speed: BAND_SPEED, arrive: RAID_ARRIVED },
      };
      // It came to Silverspring first: it raids the town for a character at the step there (story phase 4c).
      const s = SILVERSPRING;
      const raid: AmbushDef = {
        id: 'raid',
        inArea: (tx, ty) => tx >= s.x0 - RAID_MARGIN && tx <= s.x1 + RAID_MARGIN && ty >= s.y0 - RAID_MARGIN && ty <= s.y1 + RAID_MARGIN,
        when: { quest: 'raid', at: ['raid'] },
        from: [],
        units: BAND_UNITS,
        effect: RAID_DEFENDED,
        // In at the gate, and up the main street to the middle of the town.
        march: { route: Array.from({ length: (RAID_STREET + 3) * 4 + 1 }, (_, i) => [s.x0 - 3 + i / 4 + 0.5, s.y0 + 10.5] as const), speed: BAND_SPEED },
        raid: { shelter: SILVERSPRING_NPCS.map((n) => n.id) },
      };
      // The race to the Wren homestead (story phase 7): the cinder hounds march from the camp of the
      // Seekers, west on their burned trail and up the yard path to the door of the house.
      const [wx, wy] = WREN_GATE;
      const door = WREN.at(5, 7);
      const yard = Array.from({ length: (wx - door[0]) * 4 + 1 }, (_, i) => [wx + 0.5 - i / 4, wy + 0.5] as const);
      const [cx, cy] = [(WREN.x0 + WREN.x1 + 1) / 2, (WREN.y0 + WREN.y1 + 1) / 2];
      const cinders: AmbushDef = {
        id: 'cinders',
        inArea: (tx, ty) => Math.hypot(tx + 0.5 - cx, ty + 0.5 - cy) <= RACE_RADIUS && !townAt(tx, ty),
        when: { quest: 'ashes', at: ['next', 'stone'] },
        from: [],
        units: HOUND_UNITS,
        effect: ASHES_HELD,
        march: { route: [...[...SEEKER_TRAIL.points].reverse(), ...yard], speed: RACE_SPEED, arrive: ASHES_LATE },
        shelter: WREN_NPCS.map((n) => n.id),
      };
      // The guards of the camp of the Seekers (story phase 8): they come out of the tents.
      const k = SEEKER_CAMP;
      const campGuard: AmbushDef = {
        id: 'camp-guard',
        inArea: (tx, ty) => tx >= k.x0 - CAMP_GUARD_MARGIN && tx <= k.x1 + CAMP_GUARD_MARGIN && ty >= k.y0 - CAMP_GUARD_MARGIN && ty <= k.y1 + CAMP_GUARD_MARGIN,
        when: { quest: 'ashes', at: ['held', 'late'] },
        from: [k.at(3, 6), k.at(12, 6)],
        units: CAMP_GUARD_UNITS,
        effect: CAMP_TAKEN,
      };
      // The Seekers at the shrine of Tigris (story phase 9): they march for the Tear from the burned trail
      // in the east to the front of the altar, and the Ash Warden goes in ash at half of its hit points
      // (it counts as a fall).
      const [ax, ay] = ALTAR_TILE;
      // West on the burned trail (wren.ts), then up the bank to the front of the altar.
      const along = [...SEEKER_TRAIL.points].reverse().filter(([x]) => x >= ax + 5.5 && x <= ax + 5.5 + SHRINE_APPROACH);
      const turn = along[along.length - 1]!;
      const front = [ax + 1.5, ay + 1.5] as const;
      const steps = Math.ceil(Math.hypot(front[0] - turn[0], front[1] - turn[1]) * 4);
      const up = Array.from({ length: steps }, (_, i) => [turn[0] + ((front[0] - turn[0]) * (i + 1)) / steps, turn[1] + ((front[1] - turn[1]) * (i + 1)) / steps] as const);
      const approach = [...along, ...up];
      const shrine: AmbushDef = {
        id: 'shrine',
        inArea: (tx, ty) => Math.hypot(tx - ax, ty - ay) <= SHRINE_RADIUS && !townAt(tx, ty),
        when: { quest: 'ashes', at: ['shrine'] },
        from: [],
        units: SHRINE_UNITS,
        effect: ASHES_RELIC,
        march: { route: approach, speed: SHRINE_SPEED },
      };
      this.ambushList = [scouts, band, raid, cinders, campGuard, shrine];
    }
    return this.ambushList;
  }

  /**
   * The caravan of Silverspring (story phase 5; chapter 1.5.1, "Asalto a la Caravana"): for a character
   * who overheard the plot (quests.ts, caravan at `heard`) and comes down the north road near the
   * meeting point, a wagon and two militia leave Silverspring for Ironhold. At four fifths of the road
   * (from Ironhold) the attackers come: the scouts and then the war band of the raid, if they still
   * live for the party (their fall moves the raid on, as in the grove); else other hobgoblins of the
   * clan (Fede's decision). The driver gives the cargo to nobody: a character who demands it is an
   * outlaw of the caravan, and its militia fight it.
   */
  convoys(): readonly ConvoyDef[] {
    const north = this.north;
    const area = new RoadStretch(north, CARAVAN_AREA.span, CARAVAN_AREA.radius);
    return [
      {
        id: 'caravan',
        when: { quest: 'caravan', at: ['heard'] },
        inArea: (tx, ty) => area.has(tx, ty) && !townAt(tx, ty),
        route: [...north.points].reverse(),
        members: [CARAVAN_WAGON, CARAVAN_MILITIA, CARAVAN_MILITIA],
        meet: 1 - CARAVAN_MEET,
        waves: [
          { when: { quest: 'raid', at: ['asked'] }, units: SCOUT_UNITS, effect: RAID_SCOUTS },
          { when: { quest: 'raid', at: ['asked', 'scouts'] }, units: BAND_UNITS, effect: RAID_BAND },
          { when: { quest: 'raid', at: ['asked', 'scouts'], not: true }, units: CLAN_UNITS },
        ],
        outlaw: { quest: 'caravan', at: ['robbing'] },
        saved: CARAVAN_SAVED,
        lost: CARAVAN_LOST,
        robbed: CARAVAN_ROBBED,
      },
    ];
  }

  /**
   * The escort of Himo (story phase 4b): for a character at the step `escort` of the raid, Himo
   * follows; in Ironhold he is home and his family pays (HIMO_HOME); if he falls, he dies (HIMO_LOST).
   */
  escorts(): readonly EscortDef[] {
    return [{ companion: HIMO, when: { quest: 'raid', at: ['escort'] }, home: (tx, ty) => IRONHOLD.has(tx, ty), arrive: HIMO_HOME, fall: HIMO_LOST }];
  }

  /** The talks that a character overhears (town.ts): the argument in the house of the reeve, the plot in the inn, the arrival. */
  scenes(): readonly SceneDef[] {
    return TOWN_SCENES;
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
   * a town. They hunt everywhere outside the houses and the towns: they never come into a town, so
   * it is safe. They never come near the lantern of the merchant's cart (CART_SAFE). In the forest
   * of the tutorial (inTutorialForest) only goblin patrols live, and only there (Fede, 2026-10-13).
   */
  mobs(): MobRules {
    const cart = this.cart;
    const nearCart = (tx: number, ty: number) => Math.hypot(tx + 0.5 - (cart.tx + 1), ty + 0.5 - (cart.ty + 0.5)) <= CART_SAFE;
    // A margin of two rows between the two kinds of woods: no mob lives on the line itself.
    const kindFits = (ty: number, kind: MobKind | undefined) =>
      kind === undefined || (kind === 'skirmisher' ? ty >= FOREST_EDGE_Y + 2 : ty < FOREST_EDGE_Y - 2);
    return {
      roam: (tx, ty, kind) =>
        kindFits(ty, kind) &&
        !isWet(naturalGround(this.seed, tx, ty)) &&
        !SILVERVEIN.wet(tx, ty) &&
        !nearPlace(tx, ty, TOWN_MARGIN, TOWNS) &&
        !nearCart(tx, ty) &&
        !this.cellHousesIn(tx - DOOR_PATH - 1, ty - DOOR_PATH - 1, tx + DOOR_PATH + 1, ty + DOOR_PATH + 1).some((h) => nearHouse(h, tx, ty)),
      hunt: (tx, ty) => !townAt(tx, ty) && !nearCart(tx, ty),
      // The mobs of the raid on Silverspring go into the town too (an event: Fede's decision, 2026-10-11).
      raid: (tx, ty) => !nearCart(tx, ty),
      population: MOB_POPULATION,
      populationAt: (tx, ty) => (inTutorialForest(tx, ty) ? FOREST_POPULATION : MOB_POPULATION),
    };
  }
}
