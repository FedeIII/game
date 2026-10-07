import { fixtureTiles, type Fixture } from './fixtures.ts';

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
} as const;

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
}

export function inRect(building: Building, tx: number, ty: number): boolean {
  return tx >= building.x0 && tx <= building.x1 && ty >= building.y0 && ty <= building.y1;
}

/** The structure code that the building puts on a tile of its rectangle. */
export function structureIn(building: Building, tx: number, ty: number): number {
  const { x0, y0, x1, y1, doorX } = building;
  if (ty === y1 && tx === doorX) return Structure.Door;
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
