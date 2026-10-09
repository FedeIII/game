import { describe, expect, it } from 'vitest';
import {
  Decor,
  Ground,
  INTERACT_RANGE,
  PLAYER_HALF_HEIGHT,
  TILE_SIZE,
  World,
  createPlayer,
  findInteraction,
  FIXTURE_CODE_BASE,
  FIXTURE_TYPES,
  Structure,
  decodeFixture,
  fixtureCode,
  solidBox,
  type TileMap,
} from '../src/index.ts';
import { textSource } from './helpers.ts';

/** A map of open grass with some decor at given tiles. */
function mapWith(decor: Record<string, Decor>, water: string[] = []): TileMap {
  const ground = (tx: number, ty: number) => (water.includes(`${tx},${ty}`) ? Ground.Water : Ground.Grass);
  const decorAt = (tx: number, ty: number) => decor[`${tx},${ty}`] ?? Decor.None;
  return {
    ground,
    decor: decorAt,
    structure: () => Structure.None,
    isDoorOpen: () => false,
    isDoorLocked: () => false,
    fixtureAt: () => null,
    solidBox: (tx, ty) => solidBox(ground(tx, ty), decorAt(tx, ty)),
  };
}

// The tree box is [5, 10, 11, 16] in its tile: its bottom edge is at y = 16 in tile (0, 0).
const TREE_BOTTOM = 16;

describe('findInteraction', () => {
  it('finds a tree right in front of the player', () => {
    const player = createPlayer(8, TREE_BOTTOM + PLAYER_HALF_HEIGHT + 2);
    player.facing = 'up';
    expect(findInteraction(mapWith({ '0,0': Decor.Tree }), player)).toMatchObject({ kind: 'tree', tx: 0, ty: 0, distance: 2 });
  });

  it('finds nothing just out of range', () => {
    const player = createPlayer(8, TREE_BOTTOM + PLAYER_HALF_HEIGHT + INTERACT_RANGE + 0.5);
    expect(findInteraction(mapWith({ '0,0': Decor.Tree }), player)).toBeNull();
  });

  it('finds a rock', () => {
    // The rock box is [2, 7, 14, 15]: stand just right of it.
    const player = createPlayer(14 + 5 + 1, 11);
    expect(findInteraction(mapWith({ '0,0': Decor.Rock }), player)).toMatchObject({ kind: 'rock', distance: 1 });
  });

  it('does not offer water, which is solid but not examinable', () => {
    const player = createPlayer(8, TILE_SIZE + PLAYER_HALF_HEIGHT + 1);
    expect(findInteraction(mapWith({}, ['0,0']), player)).toBeNull();
  });

  it('prefers the thing in front of the player', () => {
    // A tree above (box bottom y = 16) and a rock below (box top y = 23), and the player between
    // them, half a pixel from each.
    const map = mapWith({ '0,0': Decor.Tree, '0,1': Decor.Rock });
    const player = createPlayer(8, 19.5);
    player.facing = 'down';
    expect(findInteraction(map, player)?.kind).toBe('rock');
    player.facing = 'up';
    expect(findInteraction(map, player)?.kind).toBe('tree');
  });

  it('works on a World: next to a tree there is a target', () => {
    const world = new World(textSource(['....', '.T..', '....']));
    const player = createPlayer(1 * TILE_SIZE + 8, 2 * TILE_SIZE + PLAYER_HALF_HEIGHT + 1);
    player.facing = 'up';
    expect(findInteraction(world, player)).toMatchObject({ kind: 'tree', tx: 1, ty: 1 });
  });

  it('leaves out what the accept filter refuses', () => {
    const world = new World(textSource(['....', '.T..', '....']));
    const player = createPlayer(1 * TILE_SIZE + 8, 2 * TILE_SIZE + PLAYER_HALF_HEIGHT + 1);
    expect(findInteraction(world, player, (kind) => kind !== 'tree')).toBeNull();
  });
});

describe('findSpawn near a tile', () => {
  it('with clearance 0, returns the start tile itself when it is open', () => {
    const world = new World(textSource(['~~~', '~.~', '~~~']));
    expect(world.findSpawn(1, 1, 0)).toEqual({ x: 1 * TILE_SIZE + 8, y: 1 * TILE_SIZE + 8 });
  });

  it('with clearance 1, finds a tile with open tiles all round it', () => {
    const world = new World(textSource(['T.T.....', '........', '........']));
    const spawn = world.findSpawn(1, 0, 1);
    const [tx, ty] = [Math.floor(spawn.x / TILE_SIZE), Math.floor(spawn.y / TILE_SIZE)];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) expect(world.solidBox(tx + dx, ty + dy)).toBeNull();
  });
});

describe('fixture codes', () => {
  it('give every tile of every fixture type its own code, which decodes back', () => {
    const seen = new Set<number>();
    for (const type of FIXTURE_TYPES) {
      type.tiles.forEach((tile, i) => {
        const code = fixtureCode(type, i);
        expect(seen.has(code), `${type.kind} tile ${i}`).toBe(false);
        seen.add(code);
        expect(code).toBeGreaterThanOrEqual(FIXTURE_CODE_BASE);
        expect(code).toBeLessThan(256);
        expect(decodeFixture(code)).toEqual({ type, tile });
      });
    }
    expect(decodeFixture(Structure.Wall)).toBeNull();
  });
});
