import { describe, expect, it } from 'vitest';
import { Structure, TICK_RATE, TILE_SIZE, World, createPlayer, inBuilding, isInside, onWall, stepPlayer, structureIn, type Building } from '../src/index.ts';
import { houseSource } from './helpers.ts';

/**
 * A T: a rectangle of 9 x 7 tiles from (2, 2) with two corners cut from its north (Building.cut):
 * 2 rows deep, 2 columns from the west and 4 from the east. The wing is x 4 to 6, y 2 to 3.
 *
 *     x 2 3 4 5 6 7 8 9 10
 *  y 2      # # #
 *    3      # . #
 *    4  # # # . # # # # #
 *    5  # . . . . . . . #
 *    6  # . . . . . . . #
 *    7  # . . . . . . . #
 *    8  # # # D # # # # #
 */
const T: Building = { id: 't', x0: 2, y0: 2, x1: 10, y1: 8, doorX: 5, fixtures: [], cut: { depth: 2, west: 2, east: 4 } };

describe('a building with corners cut from its north (Building.cut)', () => {
  it('leaves out the cut corners', () => {
    expect(inBuilding(T, 2, 2)).toBe(false);
    expect(inBuilding(T, 3, 3)).toBe(false);
    expect(inBuilding(T, 7, 2)).toBe(false);
    expect(inBuilding(T, 10, 3)).toBe(false);
    expect(inBuilding(T, 4, 2)).toBe(true);
    expect(inBuilding(T, 6, 3)).toBe(true);
    expect(inBuilding(T, 2, 4)).toBe(true);
    expect(inBuilding(T, 11, 4)).toBe(false);
    expect(structureIn(T, 3, 3)).toBe(Structure.None);
  });

  it('has walls round its shape, the inner corners too', () => {
    const map: string[] = [];
    for (let ty = 2; ty <= 8; ty++) {
      let row = '';
      for (let tx = 2; tx <= 10; tx++) {
        const s = structureIn(T, tx, ty);
        row += s === Structure.None ? ' ' : s === Structure.Wall ? '#' : s === Structure.Door ? 'D' : '.';
      }
      map.push(row);
    }
    expect(map).toEqual([
      '  ###    ',
      '  #.#    ',
      '###.#####',
      '#.......#',
      '#.......#',
      '#.......#',
      '###D#####',
    ]);
    expect(onWall(T, 4, 4)).toBe(true);
    expect(onWall(T, 5, 4)).toBe(false);
  });

  it('is inside in the wing and in the south part, and not in a cut corner', () => {
    expect(isInside(T, 5, 3)).toBe(true);
    expect(isInside(T, 5, 4)).toBe(true);
    expect(isInside(T, 3, 5)).toBe(true);
    expect(isInside(T, 3, 3)).toBe(false);
    expect(isInside(T, 4, 3)).toBe(false);
    expect(isInside(T, 5, 8)).toBe(true);
  });

  it('is not the building of a cut corner, and a player walks across it', () => {
    const world = new World(houseSource({ x0: 2, y0: 2, x1: 10, y1: 8, doorX: 5, cut: T.cut! }));
    expect(world.buildingAt(3, 3)).toBeNull();
    expect(world.buildingAt(5, 3)?.cut).toEqual(T.cut);
    expect(world.structure(3, 3)).toBe(Structure.None);
    // From the west of the T, east along row 3: the corner is open, the wing stops the player.
    const player = createPlayer(1 * TILE_SIZE + 8, 3 * TILE_SIZE + 8);
    for (let i = 0; i < TICK_RATE; i++) stepPlayer(player, { x: 1, y: 0 }, world);
    expect(player.x).toBeGreaterThan(3 * TILE_SIZE);
    expect(player.x).toBeLessThan(4 * TILE_SIZE);
    expect(world.insideOf(Math.floor(player.x / TILE_SIZE), 3)).toBeNull();
  });
});
