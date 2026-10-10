import { fixtureTiles, type Fixture } from './fixtures.ts';
import type { Gate } from './traits.ts';

/**
 * The building model: a rectangle of walls with one door in the south wall, a floor inside, and
 * fixtures. Worlds make buildings (by generator or by hand); the engine collides with them,
 * draws them, and fades the roof while the player is inside.
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
   * bars it again (loot.ts). NPCs do not walk through it.
   */
  readonly barred?: Gate;
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
