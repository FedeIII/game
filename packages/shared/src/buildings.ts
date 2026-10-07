import { hash01, hash2, random } from './noise.ts';

/**
 * Buildings. The world is cut into cells of BUILDING_CELL x BUILDING_CELL tiles; a cell holds
 * at most one building, well inside it, so buildings never overlap and the building of a tile
 * is always the building of that tile's cell. Everything here comes from the seed: the server
 * and every client make the same buildings.
 */
export const BUILDING_CELL = 24;

/** The chance that a cell has a building. The cell at (0, 0), next to the spawn, always tries. */
const BUILDING_CHANCE = 0.35;
/** Tiles between a building and the edge of its cell. */
const CELL_MARGIN = 2;
const SEED_OFFSET = 31_337;

/** What a building puts on a tile. The values go into a Uint8Array. */
export const Structure = {
  None: 0,
  Floor: 1,
  Wall: 2,
  Door: 3,
  Bookshelf: 10,
  TableWest: 11,
  TableEast: 12,
  BedHead: 13,
  BedFoot: 14,
  Chest: 15,
  Barrel: 16,
} as const;
export type Structure = (typeof Structure)[keyof typeof Structure];

export type FurnitureKind = 'bookshelf' | 'table' | 'bed' | 'chest' | 'barrel';

/** A piece of furniture. (tx, ty) is its anchor tile: the south-west tile of its footprint. */
export interface Furniture {
  readonly kind: FurnitureKind;
  readonly tx: number;
  readonly ty: number;
}

export interface Building {
  /** The cell, as "cellX,cellY". */
  readonly id: string;
  /** The outer walls, inclusive. The interior is the rectangle inside them. */
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  /** The door is in the south wall, at (doorX, y1). */
  readonly doorX: number;
  readonly furniture: readonly Furniture[];
}

/** The tiles that a piece of furniture covers, with the Structure value of each. */
export function furnitureTiles(item: Furniture): [number, number, Structure][] {
  switch (item.kind) {
    case 'bookshelf':
      return [[item.tx, item.ty, Structure.Bookshelf]];
    case 'table':
      return [
        [item.tx, item.ty, Structure.TableWest],
        [item.tx + 1, item.ty, Structure.TableEast],
      ];
    case 'bed':
      return [
        [item.tx, item.ty - 1, Structure.BedHead],
        [item.tx, item.ty, Structure.BedFoot],
      ];
    case 'chest':
      return [[item.tx, item.ty, Structure.Chest]];
    case 'barrel':
      return [[item.tx, item.ty, Structure.Barrel]];
  }
}

/**
 * Puts furniture in a building. The column of the door and the row just inside the south wall
 * stay free, as a corridor; a test checks that every piece can be reached from the door.
 */
function furnish(rand: () => number, x0: number, y0: number, x1: number, y1: number, doorX: number): Furniture[] {
  const ix0 = x0 + 1;
  const ix1 = x1 - 1;
  const iy0 = y0 + 1;
  const iy1 = y1 - 1;
  const taken = new Set<string>();
  const items: Furniture[] = [];
  const inside = (x: number, y: number) => x >= ix0 && x <= ix1 && y >= iy0 && y <= iy1;
  const free = (x: number, y: number) => inside(x, y) && x !== doorX && y !== iy1 && !taken.has(`${x},${y}`);
  const add = (item: Furniture): void => {
    for (const [x, y] of furnitureTiles(item)) taken.add(`${x},${y}`);
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

  // A table (2 x 1) with a free tile all round it, so it never closes a passage.
  const clear = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 2; dx++) if (taken.has(`${x + dx},${y + dy}`)) return false;
    return free(x, y) && free(x + 1, y);
  };
  for (let tries = 0; tries < 20; tries++) {
    const x = pick(ix0, ix1 - 1);
    const y = pick(iy0 + 1, iy1 - 1);
    if (!clear(x, y)) continue;
    add({ kind: 'table', tx: x, ty: y });
    break;
  }

  // Barrels in the south corners (the corridor row may hold them: the door is never there).
  for (const x of [ix0, ix1]) if (x !== doorX && rand() < 0.7 && !taken.has(`${x},${iy1}`)) add({ kind: 'barrel', tx: x, ty: iy1 });
  return items;
}

/**
 * The building of a cell, or null. `isWater` tells if a tile is water: no building stands on
 * water or with water right round it.
 */
export function generateBuilding(seed: number, cellX: number, cellY: number, isWater: (tx: number, ty: number) => boolean): Building | null {
  const forced = cellX === 0 && cellY === 0;
  if (!forced && hash01(cellX, cellY, seed + SEED_OFFSET) >= BUILDING_CHANCE) return null;
  const rand = random(hash2(cellX, cellY, seed + SEED_OFFSET + 1));
  const width = 7 + Math.floor(rand() * 5);
  const height = 6 + Math.floor(rand() * 4);
  const x0 = cellX * BUILDING_CELL + CELL_MARGIN + Math.floor(rand() * (BUILDING_CELL - 2 * CELL_MARGIN - width + 1));
  const y0 = cellY * BUILDING_CELL + CELL_MARGIN + Math.floor(rand() * (BUILDING_CELL - 2 * CELL_MARGIN - height + 1));
  const x1 = x0 + width - 1;
  const y1 = y0 + height - 1;
  // Dry land under the building, one tile round it, and the approach to the door in front.
  for (let ty = y0 - 1; ty <= y1 + 3; ty++) {
    for (let tx = x0 - 1; tx <= x1 + 1; tx++) if (isWater(tx, ty)) return null;
  }
  const doorX = x0 + 2 + Math.floor(rand() * (width - 4));
  return { id: `${cellX},${cellY}`, x0, y0, x1, y1, doorX, furniture: furnish(rand, x0, y0, x1, y1, doorX) };
}

/** What the building puts on a tile of its rectangle. Call it only for tiles inside the rectangle. */
export function structureIn(building: Building, tx: number, ty: number): Structure {
  const { x0, y0, x1, y1, doorX } = building;
  if (ty === y1 && tx === doorX) return Structure.Door;
  if (tx === x0 || tx === x1 || ty === y0 || ty === y1) return Structure.Wall;
  for (const item of building.furniture) {
    for (const [x, y, value] of furnitureTiles(item)) if (x === tx && y === ty) return value;
  }
  return Structure.Floor;
}

/** Whether a tile is inside the building: its interior or its doorway. */
export function isInside(building: Building, tx: number, ty: number): boolean {
  if (tx === building.doorX && ty === building.y1) return true;
  return tx > building.x0 && tx < building.x1 && ty > building.y0 && ty < building.y1;
}
