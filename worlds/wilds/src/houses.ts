import { FORCE_GATE, Ground, PICK_GATE, fixtureTiles, hash01, hash2, isInside, random, type Building, type BuildingCut, type Fixture, type Interaction } from '@game/engine';
import { LORE_GATE } from './dialogs.ts';

/**
 * Houses of the wilds. The world is cut into cells of BUILDING_CELL x BUILDING_CELL tiles; a
 * cell holds at most one house, well inside it, so houses never overlap and the house of a tile
 * is always the house of that tile's cell. Each house has the look of its land, a shape (a
 * rectangle, an L or a T), windows and a chimney now and then, a kind with its own things, and a
 * light or none (docs/features/game/houses.md). Everything here comes from the seed.
 */
export const BUILDING_CELL = 24;

/**
 * The cell of the player's home (home.ts): in the forest at the northern edge of the Iron Sovereignty,
 * south of Ironhold (Fede, 2026-10-12 and 2026-10-13). Cells are BUILDING_CELL tiles square.
 */
export const HOME_CELL = [1, 5] as const;

/**
 * The chance that a cell has a house. The cell HOME_CELL has the player's home (home.ts) instead,
 * and the cell east of it always tries, so a house stands near the home.
 */
const BUILDING_CHANCE = 0.35;
/**
 * The chance that a house with a chest has boards nailed across its door (Building.barred): a
 * character with Strength 13 or more can force them. Never the house east of the home, which
 * every new character finds first.
 */
const BARRED_CHANCE = 0.25;
/** The chance that the chest of a house that is not barred has a lock (Fixture.lock): Dexterity 13 picks it. */
const LOCKED_CHANCE = 1 / 3;
/** Tiles between a house and the edge of its cell. */
const CELL_MARGIN = 2;
const SEED_OFFSET = 31_337;

/** The approach to the door: 3 tiles wide and DOOR_PATH tiles deep, kept clear. */
export const DOOR_PATH = 3;

/**
 * The kinds of house (Fede, 2026-10-15: furniture by kind). Each kind has its own things; the chest,
 * the bars and the lock stay as for every house. A cottage: a bed, shelves of books, a table and
 * barrels. A farmhouse: sacks of grain in crates, and barrels. A hunter's lodge (`lodge`): a pelt on
 * the floor, crates of snares. A hermit's hut (`hermitage`): many books and a lectern. A store room:
 * crates and barrels, and no bed.
 */
export const HOUSE_KINDS = ['cottage', 'farmhouse', 'lodge', 'hermitage', 'storeroom'] as const;
export type HouseKind = (typeof HOUSE_KINDS)[number];

/** The lands of the Wilds (LANDS in source.ts) by their id: the looks and the kinds of the houses follow them. */
export type HouseLand = 'iron-sovereignty' | 'wildlands' | 'mithril-enclave';

/** A look of a house: its walls and its roof (the art's sets), and the floor that goes with them. */
interface HouseLook {
  readonly walls: string;
  readonly roof: string;
  readonly floor: Ground;
  /** How often the look comes, against the other looks of its land. */
  readonly weight: number;
}

/**
 * The looks of the houses in each land (Fede, 2026-10-15: the styles follow the land). The forest of
 * the Iron Sovereignty has the looks of its hamlets and of Ironhold: timber and planks, thatch and
 * shingle. The wildlands have rougher and older houses: fieldstone (rubble) and old stone. The Mithril
 * Enclave has the brick and the clay roofs of Silverspring.
 */
const LOOKS: Readonly<Record<HouseLand, readonly HouseLook[]>> = {
  'iron-sovereignty': [
    { walls: 'timber', roof: 'thatch', floor: Ground.FloorEarth, weight: 3 },
    { walls: 'planks', roof: 'shingle', floor: Ground.Floor, weight: 3 },
    { walls: 'timber', roof: 'shingle', floor: Ground.Floor, weight: 2 },
    { walls: 'planks', roof: 'thatch', floor: Ground.FloorEarth, weight: 2 },
    { walls: 'stone', roof: 'slate', floor: Ground.FloorStone, weight: 1 },
  ],
  wildlands: [
    { walls: 'stone', roof: 'slate', floor: Ground.Floor, weight: 3 },
    { walls: 'rubble', roof: 'thatch', floor: Ground.FloorEarth, weight: 3 },
    { walls: 'rubble', roof: 'slate', floor: Ground.FloorStone, weight: 2 },
    { walls: 'planks', roof: 'thatch', floor: Ground.FloorEarth, weight: 1 },
  ],
  'mithril-enclave': [
    { walls: 'brick', roof: 'clay', floor: Ground.Floor, weight: 2 },
    { walls: 'timber', roof: 'clay', floor: Ground.Floor, weight: 2 },
    { walls: 'stone', roof: 'slate', floor: Ground.FloorStone, weight: 1 },
  ],
};

/** How often each kind of house comes in each land: farms in the Sovereignty, hunters and hermits in the wildlands. */
const KINDS: Readonly<Record<HouseLand, Readonly<Record<HouseKind, number>>>> = {
  'iron-sovereignty': { cottage: 3, farmhouse: 3, lodge: 1, hermitage: 1, storeroom: 1 },
  wildlands: { cottage: 2, farmhouse: 1, lodge: 3, hermitage: 2, storeroom: 1 },
  'mithril-enclave': { cottage: 2, farmhouse: 1, lodge: 1, hermitage: 1, storeroom: 2 },
};

/** The chance that a house is an L (one corner cut from its north), and that it is a T (two corners). */
const L_CHANCE = 0.3;
const T_CHANCE = 0.15;
/** The chance that a house has windows in its south wall (one or two), and that it has a chimney. */
const WINDOW_CHANCE = 0.6;
const CHIMNEY_CHANCE = 0.4;
/**
 * The chance that somebody was in a house not long ago (Fede, 2026-10-15: most houses are dark, and
 * now and then one is lit): its windows light at night, and the candle on its table burns. In the
 * other houses (Building.dark) the windows stay dark and the candle is cold.
 */
const LIT_CHANCE = 0.2;

/**
 * A house of the Wilds: a building with the floor of its look and its kind (the source puts the
 * floor into the ground layer).
 */
export interface House extends Building {
  readonly floor: Ground;
  readonly kind: HouseKind;
}

/** One of a list, by weight. */
function weighted<T>(rand: () => number, items: readonly (readonly [T, number])[]): T {
  let left = rand() * items.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [item, weight] of items) {
    left -= weight;
    if (left < 0) return item;
  }
  return items[items.length - 1]![0];
}

/** A whole number from min to max, both included. */
function between(rand: () => number, min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

/**
 * The corners cut from the north of a house of that size (Building.cut), or none. The south part keeps
 * at least 3 rows inside its walls (the corridor and two more), and the wing at least 2 columns.
 */
function cutOf(rand: () => number, width: number, height: number): BuildingCut | undefined {
  const roll = rand();
  const maxDepth = height - 5;
  if (maxDepth < 2 || roll >= L_CHANCE + T_CHANCE) return undefined;
  const depth = between(rand, 2, maxDepth);
  if (roll < T_CHANCE && width >= 8) {
    const west = between(rand, 2, Math.floor((width - 4) / 2));
    const east = between(rand, 2, width - 4 - west);
    return { depth, west, east };
  }
  const side = between(rand, 2, Math.min(width - 4, Math.ceil(width / 2)));
  return rand() < 0.5 ? { depth, west: side, east: 0 } : { depth, west: 0, east: side };
}

/** The columns of the south wall with a window: one or two, never a corner, the door or next to it, and never side by side. */
function windowsOf(rand: () => number, x0: number, x1: number, doorX: number): number[] {
  const columns: number[] = [];
  for (let tx = x0 + 1; tx < x1; tx++) if (Math.abs(tx - doorX) > 1) columns.push(tx);
  const out: number[] = [];
  const count = rand() < 0.5 ? 1 : 2;
  for (let tries = 0; tries < 8 && out.length < count && columns.length > 0; tries++) {
    const tx = columns[Math.floor(rand() * columns.length)]!;
    if (out.some((w) => Math.abs(w - tx) <= 1)) continue;
    out.push(tx);
  }
  return out.sort((a, b) => a - b);
}

/** What the things of a kind of house say, when the world's line of the thing (`examine`) is not right for it. */
const SAY = {
  grain: { pages: ['Sacks of grain. The grain is mouldy.'] },
  snares: { pages: ['Snares, a coil of rope and a rusty skinning knife.'] },
  cold: { pages: ['The candle burned down long ago. Nobody lives here now.'] },
} as const satisfies Record<string, Interaction>;

/**
 * Puts the things of a kind of house in it. The column of the door and the row just inside the south
 * wall stay free, as a corridor (barrels may stand in its corners), and each new thing must leave every
 * thing reachable from the door: else it does not go in. A test walks to each one.
 */
function furnish(rand: () => number, shape: Building, kind: HouseKind, lit: boolean): Fixture[] {
  const { x0, y1, x1, doorX } = shape;
  const iy1 = y1 - 1;
  const taken = new Set<string>();
  const items: Fixture[] = [];
  const interior = (x: number, y: number) => isInside(shape, x, y) && !(x === doorX && y === y1);
  const free = (x: number, y: number) => interior(x, y) && x !== doorX && y !== iy1 && !taken.has(`${x},${y}`);
  // Every thing has a tile next to it that a walk from the door reaches over the free floor.
  const reachable = (): boolean => {
    const seen = new Set<string>();
    const queue: [number, number][] = [[doorX, iy1]];
    while (queue.length) {
      const [x, y] = queue.pop()!;
      const key = `${x},${y}`;
      if (seen.has(key) || !interior(x, y) || taken.has(key)) continue;
      seen.add(key);
      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return items.every((item) =>
      fixtureTiles(item).some(([x, y]) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(([nx, ny]) => seen.has(`${nx},${ny}`))),
    );
  };
  const add = (item: Fixture): boolean => {
    const tiles = fixtureTiles(item).map(([x, y]) => `${x},${y}`);
    for (const key of tiles) taken.add(key);
    items.push(item);
    if (reachable()) return true;
    items.pop();
    for (const key of tiles) taken.delete(key);
    return false;
  };
  const wall = (x: number, y: number) => !interior(x, y);
  // The free tiles of the house with a wall to the north (`north`), or to the west or the east (`side`).
  const spots = (where: 'north' | 'side') => {
    const out: [number, number][] = [];
    for (let y = shape.y0 + 1; y < iy1; y++) {
      for (let x = x0 + 1; x < x1; x++) {
        if (!free(x, y)) continue;
        if (where === 'north' ? wall(x, y - 1) : wall(x - 1, y) || wall(x + 1, y)) out.push([x, y]);
      }
    }
    return out;
  };
  const put = (count: number, where: 'north' | 'side', make: (x: number, y: number) => Fixture) => {
    for (let tries = 0, placed = 0; tries < count * 6 && placed < count; tries++) {
      const all = spots(where);
      if (all.length === 0) return;
      const [x, y] = all[Math.floor(rand() * all.length)]!;
      if (add(make(x, y))) placed++;
    }
  };

  // A bed in a corner by a north wall, with the chest at its foot. A store room has the chest alone.
  const corners = spots('north').filter(([x, y]) => (wall(x - 1, y) || wall(x + 1, y)) && free(x, y + 1));
  if (corners.length > 0) {
    const [x, y] = corners[Math.floor(rand() * corners.length)]!;
    if (kind === 'storeroom') add({ kind: 'chest', tx: x, ty: y });
    else if (add({ kind: 'bed', tx: x, ty: y + 1 }) && free(x, y + 2)) add({ kind: 'chest', tx: x, ty: y + 2 });
  }

  // Against the north walls: shelves of books (more for a hermit), or the crates of a store room.
  const shelves = kind === 'cottage' ? between(rand, 1, 3) : kind === 'hermitage' ? between(rand, 2, 4) : 0;
  put(shelves, 'north', (x, y) => ({ kind: 'bookshelf', tx: x, ty: y }));

  // A thing with a free tile all round it, so that it never closes a passage.
  const clear = (x: number, y: number, w: number) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= w; dx++) if (taken.has(`${x + dx},${y + dy}`)) return false;
    for (let dx = 0; dx < w; dx++) if (!free(x + dx, y)) return false;
    return true;
  };
  // A thing of `w` x `h` tiles (its anchor is its south-west tile) on a random spot in the open.
  const inTheOpen = (w: number, h: number, make: (x: number, y: number) => Fixture) => {
    const open: [number, number][] = [];
    for (let y = shape.y0 + 1 + h; y < iy1; y++) {
      for (let x = x0 + 1; x <= x1 - w; x++) {
        let ok = true;
        for (let row = y - h + 1; row <= y && ok; row++) ok = clear(x, row, w);
        if (ok) open.push([x, y]);
      }
    }
    while (open.length > 0) {
      const [x, y] = open.splice(Math.floor(rand() * open.length), 1)[0]!;
      if (add(make(x, y))) return;
    }
  };
  // The hunter's pelt lies on the floor (2 x 2 tiles).
  if (kind === 'lodge') inTheOpen(2, 2, (x, y) => ({ kind: 'rug', tx: x, ty: y, look: 'pelt' }));
  // The hermit's lectern, with a book open on it.
  if (kind === 'hermitage') inTheOpen(1, 1, (x, y) => ({ kind: 'lectern', tx: x, ty: y }));
  // A table (2 x 1). If somebody was here not long ago, its candle burns and gives a little light.
  if (kind !== 'storeroom') inTheOpen(2, 1, (x, y) => (lit ? { kind: 'table', tx: x, ty: y, light: CANDLE } : { kind: 'table', tx: x, ty: y, look: 'cold', content: SAY.cold }));

  // Crates and barrels against the side walls.
  const crates = kind === 'farmhouse' ? between(rand, 2, 4) : kind === 'lodge' ? between(rand, 1, 2) : kind === 'storeroom' ? between(rand, 3, 6) : 0;
  const content = kind === 'farmhouse' ? SAY.grain : kind === 'lodge' ? SAY.snares : undefined;
  put(crates, 'side', (x, y) => ({ kind: 'crate', tx: x, ty: y, ...(content ? { content } : {}) }));
  const barrels = kind === 'farmhouse' ? between(rand, 0, 2) : kind === 'storeroom' ? between(rand, 2, 4) : 0;
  put(barrels, 'side', (x, y) => ({ kind: 'barrel', tx: x, ty: y }));

  // Barrels in the south corners (the corridor row may hold them: the door is never there).
  const cornerChance = kind === 'lodge' ? 0.5 : kind === 'hermitage' ? 0.3 : 0.7;
  for (const x of [x0 + 1, x1 - 1]) if (x !== doorX && rand() < cornerChance && !taken.has(`${x},${iy1}`)) add({ kind: 'barrel', tx: x, ty: iy1 });
  return items;
}

/**
 * The books on the shelves of the houses: what anybody reads, and what a character with
 * Intelligence 13 reads too (Interaction.lore). Each one hints at a rule of the game.
 */
const BOOKS: readonly Interaction[] = [
  {
    pages: ['A bestiary. The pages are swollen with damp.'],
    lore: [{ gate: LORE_GATE, pages: ['Of the grey brute: "It raises its club slowly. Strike while it is up, and strike hard."'] }],
  },
  {
    pages: ['A herbal, with pressed leaves between the pages.'],
    lore: [{ gate: LORE_GATE, pages: ['"Two bundles of herbs, boiled with care, close a wound. With the horn of an imp, they draw out its poison."'] }],
  },
  {
    pages: ['A book of the old roads of the valley.'],
    lore: [{ gate: LORE_GATE, pages: ['"In the north, a chapel where the lost are found again. Sleep once under its roof, and it remembers you."'] }],
  },
  {
    pages: ['The accounts of a household. Candles, salt, rope.'],
    lore: [{ gate: LORE_GATE, pages: ['The last page: "We boarded the door and left the box inside. We will come back for it." Nobody came back.'] }],
  },
  {
    pages: ['A book of tales for children, with the pictures cut out.'],
    lore: [{ gate: LORE_GATE, pages: ['In the margin, in a child\'s hand: "The imps hate the light. Keep to the lamps."'] }],
  },
];

/**
 * The books on the lectern of a hermit's hut (HouseKind `hermitage`), as the books on the shelves: each
 * one hints at a rule of the game to a character with Intelligence 13.
 */
const LECTERN_BOOKS: readonly Interaction[] = [
  {
    pages: ['A book of prayers, open at the last page. Small, tight writing fills the margins.'],
    lore: [{ gate: LORE_GATE, pages: ['In the margin: "They see you less when you go slowly and low. Crouch, and walk."'] }],
  },
  {
    pages: ["A hermit's day book. Roots, rain, and the names of birds."],
    lore: [{ gate: LORE_GATE, pages: ['The last entry: "Strike, then step back at once, and brace. Braced, I was harder to hit."'] }],
  },
];

/** The light of the candle on a table: centred over the candle, which is on the west tile. */
export const CANDLE = { radius: 48, colour: 0xffa850, x: 8, y: -24 } as const;

/**
 * The house of a cell, or null. `isWater` tells if a tile is water: no house stands on water,
 * with water right round it, or with water on the approach to its door. `land` is the id of the land
 * of the cell (LANDS in source.ts): the look and the kind of the house follow it.
 */
export function generateHouse(seed: number, cellX: number, cellY: number, isWater: (tx: number, ty: number) => boolean, land: string = 'wildlands'): House | null {
  const forced = cellX === HOME_CELL[0] + 1 && cellY === HOME_CELL[1];
  if (!forced && hash01(cellX, cellY, seed + SEED_OFFSET) >= BUILDING_CHANCE) return null;
  const rand = random(hash2(cellX, cellY, seed + SEED_OFFSET + 1));
  const width = 7 + Math.floor(rand() * 5);
  const height = 6 + Math.floor(rand() * 4);
  const x0 = cellX * BUILDING_CELL + CELL_MARGIN + Math.floor(rand() * (BUILDING_CELL - 2 * CELL_MARGIN - width + 1));
  const y0 = cellY * BUILDING_CELL + CELL_MARGIN + Math.floor(rand() * (BUILDING_CELL - 2 * CELL_MARGIN - height + 1));
  const x1 = x0 + width - 1;
  const y1 = y0 + height - 1;
  for (let ty = y0 - 1; ty <= y1 + DOOR_PATH; ty++) {
    for (let tx = x0 - 1; tx <= x1 + 1; tx++) if (isWater(tx, ty)) return null;
  }
  const doorX = x0 + 2 + Math.floor(rand() * (width - 4));
  // The look, the shape, the windows and the kind come from a stream of their own.
  const look = random(hash2(cellX, cellY, seed + SEED_OFFSET + 5));
  const lands = land in LOOKS ? (land as HouseLand) : 'wildlands';
  const { walls, roof, floor } = weighted(look, LOOKS[lands].map((l) => [l, l.weight] as const));
  const cut = cutOf(look, width, height);
  const windows = look() < WINDOW_CHANCE ? windowsOf(look, x0, x1, doorX) : [];
  const chimney = look() < CHIMNEY_CHANCE ? between(look, x0 + 1, x1 - 1) : null;
  // A house with boards across its door was left: nobody was in it, so it is dark.
  const boards = !forced && hash01(cellX, cellY, seed + SEED_OFFSET + 2) < BARRED_CHANCE;
  const lit = look() < LIT_CHANCE && !boards;
  const kind = weighted(look, HOUSE_KINDS.map((k) => [k, KINDS[lands][k]] as const));
  const shape: Building = { id: `${cellX},${cellY}`, x0, y0, x1, y1, doorX, fixtures: [], ...(cut ? { cut } : {}) };
  const furniture = furnish(rand, shape, kind, lit);
  // Only a house with a chest is barred: forcing the door must be worth it.
  const barred = boards && furniture.some((f) => f.kind === 'chest');
  const locked = !barred && hash01(cellX, cellY, seed + SEED_OFFSET + 3) < LOCKED_CHANCE;
  const fixtures = furniture.map((f) => {
    if (f.kind === 'chest' && locked) return { ...f, lock: PICK_GATE };
    // A book on each shelf and on a lectern, picked from the seed and its place (not from `rand`: the furniture keeps its places).
    if (f.kind === 'bookshelf') return { ...f, content: BOOKS[hash2(f.tx, f.ty, seed + SEED_OFFSET + 4) % BOOKS.length]! };
    if (f.kind === 'lectern') return { ...f, content: LECTERN_BOOKS[hash2(f.tx, f.ty, seed + SEED_OFFSET + 4) % LECTERN_BOOKS.length]! };
    return f;
  });
  return {
    ...shape,
    fixtures,
    floor,
    kind,
    style: { walls, roof },
    ...(windows.length > 0 ? { windows } : {}),
    ...(lit ? {} : { dark: true }),
    ...(chimney !== null ? { roofProps: [{ name: 'chimney', tx: chimney }] } : {}),
    ...(barred ? { barred: FORCE_GATE } : {}),
  };
}
