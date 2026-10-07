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
  Structure,
  solidBox,
  type TileMap,
} from '../src/index.ts';

/** A map of open grass with some decor at given tiles. */
function mapWith(decor: Record<string, Decor>, water: string[] = []): TileMap {
  const ground = (tx: number, ty: number) => (water.includes(`${tx},${ty}`) ? Ground.Water : Ground.Grass);
  const decorAt = (tx: number, ty: number) => decor[`${tx},${ty}`] ?? Decor.None;
  return {
    ground,
    decor: decorAt,
    structure: () => Structure.None,
    isDoorOpen: () => false,
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

  it('works on a generated world: next to some tree there is a target', () => {
    const world = new World(1);
    let tree: [number, number] | null = null;
    for (let ty = 0; ty < 64 && !tree; ty++) {
      for (let tx = 0; tx < 64 && !tree; tx++) if (world.decor(tx, ty) === Decor.Tree && !world.solidBox(tx, ty + 1)) tree = [tx, ty];
    }
    expect(tree).not.toBeNull();
    const [tx, ty] = tree!;
    const player = createPlayer(tx * TILE_SIZE + 8, (ty + 1) * TILE_SIZE + PLAYER_HALF_HEIGHT + 1);
    player.facing = 'up';
    expect(findInteraction(world, player)).toMatchObject({ kind: 'tree', tx, ty });
  });
});

describe('findSpawn near a tile', () => {
  it('with clearance 0, returns the start tile itself when it is open', () => {
    const world = new World(1);
    for (let ty = 0; ty < 20; ty++) {
      for (let tx = 0; tx < 20; tx++) {
        if (world.solidBox(tx, ty)) continue;
        expect(world.findSpawn(tx, ty, 0)).toEqual({ x: tx * TILE_SIZE + 8, y: ty * TILE_SIZE + 8 });
        return;
      }
    }
  });
});
