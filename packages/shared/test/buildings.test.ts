import { describe, expect, it } from 'vitest';
import {
  BUILDING_CELL,
  DEFAULT_SEED,
  Decor,
  Ground,
  Structure,
  TICK_RATE,
  TILE_SIZE,
  World,
  buildingOfCell,
  createPlayer,
  findInteraction,
  furnitureTiles,
  stepPlayer,
  useDoor,
  type Building,
} from '../src/index.ts';

/** Many buildings: every cell of a few seeds that has one. */
function sample(): { world: World; building: Building }[] {
  const out: { world: World; building: Building }[] = [];
  for (const seed of [DEFAULT_SEED, 1, 7, 42, 1234]) {
    const world = new World(seed);
    for (let cy = -6; cy < 6; cy++) {
      for (let cx = -6; cx < 6; cx++) {
        const building = world.building(cx, cy);
        if (building) out.push({ world, building });
      }
    }
  }
  return out;
}

const buildings = sample();

describe('buildings', () => {
  it('are many, and the same for the same seed', () => {
    expect(buildings.length).toBeGreaterThan(150);
    expect(buildingOfCell(1, 2, 3)).toEqual(buildingOfCell(1, 2, 3));
  });

  it('there is one next to the spawn of the default world', () => {
    const building = new World(DEFAULT_SEED).building(0, 0);
    expect(building).not.toBeNull();
  });

  it('stay inside their cell, off water, with a wall ring and one door in the south wall', () => {
    for (const { world, building: b } of buildings) {
      const [cx, cy] = b.id.split(',').map(Number) as [number, number];
      expect(b.x0).toBeGreaterThan(cx * BUILDING_CELL);
      expect(b.x1).toBeLessThan((cx + 1) * BUILDING_CELL - 1);
      expect(b.y0).toBeGreaterThan(cy * BUILDING_CELL);
      expect(b.y1).toBeLessThan((cy + 1) * BUILDING_CELL - 1);
      let doors = 0;
      for (let ty = b.y0 - 1; ty <= b.y1 + 1; ty++) {
        for (let tx = b.x0 - 1; tx <= b.x1 + 1; tx++) {
          const inRect = tx >= b.x0 && tx <= b.x1 && ty >= b.y0 && ty <= b.y1;
          const structure = world.structure(tx, ty);
          if (!inRect) {
            expect(structure).toBe(Structure.None);
            expect(world.decor(tx, ty), `nothing grows next to building ${b.id}`).toBe(Decor.None);
            expect(world.ground(tx, ty)).not.toBe(Ground.Water);
            continue;
          }
          expect(world.ground(tx, ty)).toBe(Ground.Floor);
          const edge = tx === b.x0 || tx === b.x1 || ty === b.y0 || ty === b.y1;
          if (structure === Structure.Door) {
            doors++;
            expect(ty).toBe(b.y1);
            expect(tx).toBeGreaterThan(b.x0 + 1);
            expect(tx).toBeLessThan(b.x1 - 1);
          } else {
            expect(structure === Structure.Wall, `wall at ${tx},${ty} of ${b.id}`).toBe(edge);
          }
        }
      }
      expect(doors).toBe(1);
      // The approach to the door is clear, with a path in the middle.
      for (let ty = b.y1 + 1; ty <= b.y1 + 3; ty++) {
        for (let tx = b.doorX - 1; tx <= b.doorX + 1; tx++) expect(world.solidBox(tx, ty), `approach ${tx},${ty} of ${b.id}`).toBeNull();
        expect(world.ground(b.doorX, ty)).toBe(Ground.Dirt);
      }
    }
  });

  it('can reach every piece of furniture from the door', () => {
    for (const { world, building: b } of buildings) {
      // Walk the open floor from the tile inside the door.
      const seen = new Set<string>();
      const queue: [number, number][] = [[b.doorX, b.y1 - 1]];
      while (queue.length) {
        const [x, y] = queue.pop()!;
        const key = `${x},${y}`;
        if (seen.has(key) || world.structure(x, y) !== Structure.Floor) continue;
        seen.add(key);
        queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
      for (const item of b.furniture) {
        const reachable = furnitureTiles(item).some(([x, y]) =>
          [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(([nx, ny]) => seen.has(`${nx},${ny}`)),
        );
        expect(reachable, `${item.kind} at ${item.tx},${item.ty} in ${b.id}`).toBe(true);
      }
    }
  });

  it('has furniture in every building, and a bed or a bookshelf in most', () => {
    const counts = buildings.map(({ building }) => building.furniture.length);
    expect(Math.min(...counts)).toBeGreaterThan(0);
    const homely = buildings.filter(({ building }) => building.furniture.some((f) => f.kind === 'bed' || f.kind === 'bookshelf'));
    expect(homely.length / buildings.length).toBeGreaterThan(0.9);
  });

  it('never puts the spawn inside a building', () => {
    for (const seed of [DEFAULT_SEED, 1, 7, 42, 1234]) {
      const world = new World(seed);
      const spawn = world.findSpawn();
      expect(world.ground(Math.floor(spawn.x / TILE_SIZE), Math.floor(spawn.y / TILE_SIZE))).not.toBe(Ground.Floor);
    }
  });
});

describe('walls and doors', () => {
  const world = new World(DEFAULT_SEED);
  const b = world.building(0, 0)!;
  // The centre of the tile just outside the door, and of the tile just inside it.
  const outside = { x: b.doorX * TILE_SIZE + 8, y: (b.y1 + 1) * TILE_SIZE + 8 };

  const walkNorth = (x: number, y: number, seconds: number) => {
    const player = createPlayer(x, y);
    for (let i = 0; i < seconds * TICK_RATE; i++) stepPlayer(player, { x: 0, y: -1 }, world);
    return player;
  };

  it('a closed door stops the player at the wall', () => {
    world.setDoorOpen(b.doorX, b.y1, false);
    const player = walkNorth(outside.x, outside.y, 1);
    expect(player.y).toBeGreaterThanOrEqual((b.y1 + 1) * TILE_SIZE);
  });

  it('a wall stops the player as well', () => {
    const player = walkNorth((b.doorX - 1) * TILE_SIZE + 8, outside.y, 1);
    expect(player.y).toBeGreaterThanOrEqual((b.y1 + 1) * TILE_SIZE);
  });

  it('an open door lets the player in', () => {
    world.setDoorOpen(b.doorX, b.y1, true);
    const player = walkNorth(outside.x, outside.y, 0.5);
    expect(player.y).toBeLessThan(b.y1 * TILE_SIZE);
    expect(world.insideOf(Math.floor(player.x / TILE_SIZE), Math.floor(player.y / TILE_SIZE))).toBe(b);
    world.setDoorOpen(b.doorX, b.y1, false);
  });

  it('the player outside the door can act on it, and opens and closes it', () => {
    const player = createPlayer(outside.x, outside.y - 4);
    player.facing = 'up';
    const target = findInteraction(world, player);
    expect(target).toMatchObject({ kind: 'door', tx: b.doorX, ty: b.y1 });
    expect(useDoor(world, player, b.doorX, b.y1)).toBe('opened');
    expect(world.isDoorOpen(b.doorX, b.y1)).toBe(true);
    expect(findInteraction(world, player)?.kind).toBe('door');
    expect(useDoor(world, player, b.doorX, b.y1)).toBe('closed');
    expect(world.isDoorOpen(b.doorX, b.y1)).toBe(false);
  });

  it('a door does not close on the player in the doorway', () => {
    world.setDoorOpen(b.doorX, b.y1, true);
    const player = createPlayer(outside.x, b.y1 * TILE_SIZE + 8);
    expect(useDoor(world, player, b.doorX, b.y1)).toBe('blocked');
    expect(world.isDoorOpen(b.doorX, b.y1)).toBe(true);
    world.setDoorOpen(b.doorX, b.y1, false);
  });

  it('the player inside can examine the furniture', () => {
    const item = b.furniture[0]!;
    const [tx, ty] = furnitureTiles(item)[0]!;
    // Stand on a free floor tile next to the piece and face it.
    const sides: [number, number, 'up' | 'down' | 'left' | 'right'][] = [[0, 1, 'up'], [1, 0, 'left'], [-1, 0, 'right'], [0, -1, 'down']];
    const side = sides.find(([dx, dy]) => world.structure(tx + dx, ty + dy) === Structure.Floor)!;
    const player = createPlayer((tx + side[0]) * TILE_SIZE + 8, (ty + side[1]) * TILE_SIZE + 8);
    player.facing = side[2];
    expect(findInteraction(world, player)?.kind).toBe(item.kind);
  });
});
