import { FORCE_GATE, PICK_GATE, fixtureTiles, hash01, hash2, random, type Building, type Fixture } from '@game/engine';

/**
 * Houses of the wilds. The world is cut into cells of BUILDING_CELL x BUILDING_CELL tiles; a
 * cell holds at most one house, well inside it, so houses never overlap and the house of a tile
 * is always the house of that tile's cell. Everything here comes from the seed.
 */
export const BUILDING_CELL = 24;

/**
 * The chance that a cell has a house. The cell at (0, 0) has the player's home (home.ts) instead,
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
 * Puts furniture in a house. The column of the door and the row just inside the south wall stay
 * free, as a corridor; a test checks that every piece can be reached from the door.
 */
function furnish(rand: () => number, x0: number, y0: number, x1: number, y1: number, doorX: number): Fixture[] {
  const ix0 = x0 + 1;
  const ix1 = x1 - 1;
  const iy0 = y0 + 1;
  const iy1 = y1 - 1;
  const taken = new Set<string>();
  const items: Fixture[] = [];
  const inside = (x: number, y: number) => x >= ix0 && x <= ix1 && y >= iy0 && y <= iy1;
  const free = (x: number, y: number) => inside(x, y) && x !== doorX && y !== iy1 && !taken.has(`${x},${y}`);
  const add = (item: Fixture): void => {
    for (const [x, y] of fixtureTiles(item)) taken.add(`${x},${y}`);
    items.push(item);
  };
  const pick = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

  // A bed in a corner by the north wall, with a chest at its foot.
  const bedX = rand() < 0.5 ? ix0 : ix1;
  if (free(bedX, iy0) && free(bedX, iy0 + 1)) {
    add({ kind: 'bed', tx: bedX, ty: iy0 + 1 });
    if (free(bedX, iy0 + 2)) add({ kind: 'chest', tx: bedX, ty: iy0 + 2 });
  }

  // One to three bookshelves against the north wall.
  const shelves = pick(1, 3);
  for (let tries = 0, placed = 0; tries < 12 && placed < shelves; tries++) {
    const x = pick(ix0, ix1);
    if (!free(x, iy0)) continue;
    add({ kind: 'bookshelf', tx: x, ty: iy0 });
    placed++;
  }

  // A table (2 x 1) with a free tile all round it, so it never closes a passage. Its candle
  // gives a little light.
  const clear = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 2; dx++) if (taken.has(`${x + dx},${y + dy}`)) return false;
    return free(x, y) && free(x + 1, y);
  };
  for (let tries = 0; tries < 20; tries++) {
    const x = pick(ix0, ix1 - 1);
    const y = pick(iy0 + 1, iy1 - 1);
    if (!clear(x, y)) continue;
    add({ kind: 'table', tx: x, ty: y, light: CANDLE });
    break;
  }

  // Barrels in the south corners (the corridor row may hold them: the door is never there).
  for (const x of [ix0, ix1]) if (x !== doorX && rand() < 0.7 && !taken.has(`${x},${iy1}`)) add({ kind: 'barrel', tx: x, ty: iy1 });
  return items;
}

/** The light of the candle on a table: centred over the candle, which is on the west tile. */
export const CANDLE = { radius: 48, colour: 0xffa850, x: 8, y: -24 } as const;

/**
 * The house of a cell, or null. `isWater` tells if a tile is water: no house stands on water,
 * with water right round it, or with water on the approach to its door.
 */
export function generateHouse(seed: number, cellX: number, cellY: number, isWater: (tx: number, ty: number) => boolean): Building | null {
  const forced = cellX === 1 && cellY === 0;
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
  const furniture = furnish(rand, x0, y0, x1, y1, doorX);
  // Only a house with a chest is barred: forcing the door must be worth it.
  const barred = !forced && furniture.some((f) => f.kind === 'chest') && hash01(cellX, cellY, seed + SEED_OFFSET + 2) < BARRED_CHANCE;
  const locked = !barred && hash01(cellX, cellY, seed + SEED_OFFSET + 3) < LOCKED_CHANCE;
  const fixtures = locked ? furniture.map((f) => (f.kind === 'chest' ? { ...f, lock: PICK_GATE } : f)) : furniture;
  return { id: `${cellX},${cellY}`, x0, y0, x1, y1, doorX, fixtures, ...(barred ? { barred: FORCE_GATE } : {}) };
}
