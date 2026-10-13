import { fixtureTiles, type Fixture } from './fixtures.ts';
import type { Gate } from './traits.ts';
import type { Ground } from './world.ts';

/**
 * The building model: a rectangle of walls with one door in the south wall, a floor inside, and
 * fixtures. Worlds make buildings (by generator or by hand); the engine collides with them,
 * draws them, and fades the roof while the player is inside. A building can have storeys above
 * its ground storey (Building.storeys), joined by stairs.
 */

/** What is on a tile of the structure layer. Codes from FIXTURE_CODE_BASE up are fixture tiles. */
export const Structure = {
  None: 0,
  Floor: 1,
  Wall: 2,
  Door: 3,
  /** A wall tile with a window in its front face. It collides like a wall. */
  Window: 4,
} as const;

/**
 * How a building looks: the name of its wall set and of its roof set in the art
 * (`wall/<walls>/...`, `roof/<roof>/...`). The engine does not read them; the client does.
 */
export interface BuildingStyle {
  readonly walls: string;
  readonly roof: string;
}

/** The look of a building without a style of its own. */
export const DEFAULT_STYLE: BuildingStyle = { walls: 'stone', roof: 'slate' };

/**
 * A thing that stands on the ridge of a roof, in one column: a chimney, a flag, a spire. The
 * name is its art (`roof/<name>`); the engine does not read it.
 */
export interface RoofProp {
  readonly name: string;
  readonly tx: number;
}

/**
 * A storey above the ground storey of a building (Building.storeys; 2026-10-13, Fede's request for
 * the town hall of Ironhold). It has the rectangle of its building: walls all round, without a door,
 * and its own things, windows, walls and floor. Stairs join it to the storey under it: a fixture
 * `stairs` on the storey under it, and a fixture `stairwell` on the same tiles on this storey
 * (interact.ts, useStairs). A storey without stairs to it is only a look: nobody goes up.
 */
export interface Storey {
  /** The things on this storey: the stairwell, furniture. Their tiles are inside the walls. */
  readonly fixtures: readonly Fixture[];
  /** Columns (tx) of the south wall that have a lit window on this storey. Never a corner. */
  readonly windows?: readonly number[];
  /** The look of the walls of this storey (the art's wall set); default: the walls of the building's style. */
  readonly walls?: string;
  /** The floor of this storey. Default: Ground.Floor (wood). */
  readonly floor?: Ground;
}

export interface Building {
  /** Unique in its world. */
  readonly id: string;
  /** The outer walls, inclusive. The interior is the rectangle inside them. */
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  /** The door is in the south wall, at (doorX, y1), never in a corner. */
  readonly doorX: number;
  readonly fixtures: readonly Fixture[];
  /** A name on a sign over the door, drawn in the pixel font. */
  readonly sign?: string;
  /**
   * A symbol on the sign over the door, in place of a name: the art `ui/emblem/<emblem>` (a chalice
   * over a shrine or a chapel). A building has a sign or an emblem, not both. The engine does not read it.
   */
  readonly emblem?: string;
  /** The look of the walls and the roof. Default: DEFAULT_STYLE. */
  readonly style?: BuildingStyle;
  /** Columns (tx) of the south wall that have a lit window. Never a corner or the door. */
  readonly windows?: readonly number[];
  /** Things on the roof. Never in a corner column. */
  readonly roofProps?: readonly RoofProp[];
  /**
   * A door that never opens: the building is shut for good. A press on the door shows this line
   * (the player says it) and the door stays closed. NPCs do not walk through it.
   */
  readonly locked?: string;
  /**
   * A door with boards nailed across it: it stays closed until a character that passes the gate
   * (a score: Strength 13, for example) forces it. Then it is an ordinary door, until the world
   * bars it again (loot.ts). NpcCrowd does not check it: do not give an NPC an area through it.
   */
  readonly barred?: Gate;
  /**
   * The storeys above the ground storey, from the bottom up: storeys[0] is storey 1. Outside, the
   * walls are one storey high (32 pixels) for each storey, and the roof sits on the top one.
   */
  readonly storeys?: readonly Storey[];
}

/** How many storeys a building has: the ground storey and the storeys above it. */
export function storeyCount(building: Building): number {
  return 1 + (building.storeys?.length ?? 0);
}

/** A storey above the ground storey (1 and up), or null if the building has no such storey. */
export function upperStorey(building: Building, storey: number): Storey | null {
  return storey >= 1 ? (building.storeys?.[storey - 1] ?? null) : null;
}

/** The things on a storey of a building: the building's own on the ground storey (0). */
export function storeyFixtures(building: Building, storey: number): readonly Fixture[] {
  return storey === 0 ? building.fixtures : (upperStorey(building, storey)?.fixtures ?? []);
}

/** The columns of the south wall with a lit window on a storey of a building. */
export function storeyWindows(building: Building, storey: number): readonly number[] {
  return (storey === 0 ? building.windows : upperStorey(building, storey)?.windows) ?? [];
}

/**
 * The structure code that a storey above the ground storey (1 and up) of the building puts on a tile
 * of its rectangle: a wall all round (no door), a window, a tile of a thing, or the floor.
 */
export function structureOnStorey(building: Building, storey: number, tx: number, ty: number): number {
  if (storey === 0) return structureIn(building, tx, ty);
  const { x0, y0, x1, y1 } = building;
  if (ty === y1 && tx !== x0 && tx !== x1 && storeyWindows(building, storey).includes(tx)) return Structure.Window;
  if (tx === x0 || tx === x1 || ty === y0 || ty === y1) return Structure.Wall;
  for (const fixture of storeyFixtures(building, storey)) {
    for (const [x, y, code] of fixtureTiles(fixture)) if (x === tx && y === ty) return code;
  }
  return Structure.Floor;
}

export function inRect(building: Building, tx: number, ty: number): boolean {
  return tx >= building.x0 && tx <= building.x1 && ty >= building.y0 && ty <= building.y1;
}

/** The structure code that the building puts on a tile of its rectangle. */
export function structureIn(building: Building, tx: number, ty: number): number {
  const { x0, y0, x1, y1, doorX } = building;
  if (ty === y1 && tx === doorX) return Structure.Door;
  if (ty === y1 && building.windows?.includes(tx) && tx !== x0 && tx !== x1) return Structure.Window;
  if (tx === x0 || tx === x1 || ty === y0 || ty === y1) return Structure.Wall;
  for (const fixture of building.fixtures) {
    for (const [x, y, code] of fixtureTiles(fixture)) if (x === tx && y === ty) return code;
  }
  return Structure.Floor;
}

/** Whether a tile is inside the building: its interior or its doorway. */
export function isInside(building: Building, tx: number, ty: number): boolean {
  if (tx === building.doorX && ty === building.y1) return true;
  return tx > building.x0 && tx < building.x1 && ty > building.y0 && ty < building.y1;
}
