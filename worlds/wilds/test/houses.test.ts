import { describe, expect, it } from 'vitest';
import {
  Decor,
  Ground,
  Room,
  Structure,
  TICK_RATE,
  TILE_SIZE,
  World,
  createPlayer,
  findInteraction,
  fixtureTiles,
  isWet,
  stepPlayer,
  useDoor,
  type Building,
} from '@game/engine';
import { BUILDING_CELL, DEFAULT_SEED, HOME_CELL, HOME_ID, WildsSource, wilds } from '../src/index.ts';

const newWorld = (seed: number) => new World(new WildsSource(seed));
const houseOf = (world: World, cx: number, cy: number) => (world.source as WildsSource).house(cx, cy);

/** Many buildings: every cell of a few seeds that has one. */
function sample(): { world: World; building: Building }[] {
  const out: { world: World; building: Building }[] = [];
  for (const seed of [DEFAULT_SEED, 1, 7, 42, 1234]) {
    const world = newWorld(seed);
    for (let cy = -6; cy < 6; cy++) {
      for (let cx = -6; cx < 6; cx++) {
        const building = houseOf(world, cx, cy);
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
    expect(new WildsSource(1).house(2, 3)).toEqual(new WildsSource(1).house(2, 3));
  });

  it('about one in four with a chest is barred, never the home or the house next to it, and its chest gives more', () => {
    const withChest = buildings.filter(({ building: b }) => b.id !== HOME_ID && b.id !== '1,0' && b.fixtures.some((f) => f.kind === 'chest'));
    const barred = withChest.filter(({ building: b }) => b.barred);
    expect(barred.length / withChest.length).toBeGreaterThan(0.15);
    expect(barred.length / withChest.length).toBeLessThan(0.35);
    for (const { building: b } of buildings) {
      if (b.barred) expect(b.barred).toEqual({ ability: 'str', min: 13 });
      if (b.id === HOME_ID || b.id === '1,0' || !b.fixtures.some((f) => f.kind === 'chest')) expect(b.barred).toBeUndefined();
    }
    for (const { world, building: b } of buildings) {
      const chest = b.fixtures.find((f) => f.kind === 'chest');
      const table = chest ? world.source.loot!(chest) : null;
      if (b.id === HOME_ID) expect(table).toBeNull();
      else if (chest) expect(table!.coins![1]).toBe(b.barred ? 15 : 6);
    }
  });

  it('there is the home in the middle, and a house next to it', () => {
    const source = new WildsSource(DEFAULT_SEED);
    expect(source.house(0, 0)?.id).toBe(HOME_ID);
    expect(source.house(1, 0)).not.toBeNull();
  });

  it('stay inside their cell, off water, with a wall ring and one door in the south wall', () => {
    for (const { world, building: b } of buildings) {
      const [cx, cy] = b.id === HOME_ID ? HOME_CELL : (b.id.split(',').map(Number) as [number, number]);
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
            expect(isWet(world.ground(tx, ty))).toBe(false);
            continue;
          }
          expect(world.ground(tx, ty)).toBe(b.id === HOME_ID ? Ground.FloorEarth : Ground.Floor);
          const edge = tx === b.x0 || tx === b.x1 || ty === b.y0 || ty === b.y1;
          if (structure === Structure.Door) {
            doors++;
            expect(ty).toBe(b.y1);
            expect(tx).toBeGreaterThan(b.x0 + 1);
            expect(tx).toBeLessThan(b.x1 - 1);
          } else if (structure === Structure.Window) {
            // A lit window is part of the south wall, never in a corner.
            expect(ty).toBe(b.y1);
            expect(tx > b.x0 && tx < b.x1).toBe(true);
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
      for (const item of b.fixtures) {
        const reachable = fixtureTiles(item).some(([x, y]) =>
          [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(([nx, ny]) => seen.has(`${nx},${ny}`)),
        );
        expect(reachable, `${item.kind} at ${item.tx},${item.ty} in ${b.id}`).toBe(true);
      }
    }
  });

  it('has furniture in every building, and a bed or a bookshelf in most', () => {
    const counts = buildings.map(({ building }) => building.fixtures.length);
    expect(Math.min(...counts)).toBeGreaterThan(0);
    const homely = buildings.filter(({ building }) => building.fixtures.some((f) => f.kind === 'bed' || f.kind === 'bookshelf'));
    expect(homely.length / buildings.length).toBeGreaterThan(0.9);
  });

  it('never puts the spawn inside a building', () => {
    for (const seed of [DEFAULT_SEED, 1, 7, 42, 1234]) {
      const world = newWorld(seed);
      const spawn = world.findSpawn();
      expect(world.ground(Math.floor(spawn.x / TILE_SIZE), Math.floor(spawn.y / TILE_SIZE))).not.toBe(Ground.Floor);
    }
  });
});

describe('walls and doors', () => {
  const world = newWorld(DEFAULT_SEED);
  const b = houseOf(world, 0, 0)!;
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
    const item = b.fixtures[0]!;
    const [tx, ty] = fixtureTiles(item)[0]!;
    // Stand on a free floor tile next to the piece and face it.
    const sides: [number, number, 'up' | 'down' | 'left' | 'right'][] = [[0, 1, 'up'], [1, 0, 'left'], [-1, 0, 'right'], [0, -1, 'down']];
    const side = sides.find(([dx, dy]) => world.structure(tx + dx, ty + dy) === Structure.Floor)!;
    const player = createPlayer((tx + side[0]) * TILE_SIZE + 8, (ty + side[1]) * TILE_SIZE + 8);
    player.facing = side[2];
    expect(findInteraction(world, player)?.kind).toBe(item.kind);
  });
});

describe('the home', () => {
  it('is where every new player of the shared Wilds starts, and they all start there', () => {
    expect(wilds.multiplayer).toBe(true);
    const room = new Room(new World(wilds.createSource(null)), { random: () => 0.9 });
    const starts = [room.join(0, 1)!, room.join(0, 2)!, room.join(0, 3, [200, -40])!].map((p) => p.state);
    for (const state of starts) {
      expect(room.world.insideOf(Math.floor(state.x / TILE_SIZE), Math.floor(state.y / TILE_SIZE))?.id).toBe(HOME_ID);
      expect(state).toMatchObject(room.world.spawn());
    }
  });

  const seeds = [DEFAULT_SEED, 1, 7, 42, 1234, 99, 2024, 31337];

  it('is a small hut in the middle cell, the same for a seed, and every character starts in it', () => {
    for (const seed of seeds) {
      const world = newWorld(seed);
      const home = (world.source as WildsSource).home();
      expect(home).toEqual(new WildsSource(seed).home());
      expect([home.x1 - home.x0 + 1, home.y1 - home.y0 + 1]).toEqual([7, 6]);
      expect(home.style).toEqual({ walls: 'timber', roof: 'thatch' });
      const spawn = world.spawn();
      const [tx, ty] = [Math.floor(spawn.x / TILE_SIZE), Math.floor(spawn.y / TILE_SIZE)];
      expect(world.insideOf(tx, ty)).toBe(home);
      expect(world.structure(tx, ty)).toBe(Structure.Floor);
      expect([tx, ty]).toEqual([home.doorX, home.y1 - 1]);
      // Dry all round, and on the approach to its door.
      for (let y = home.y0 - 1; y <= home.y1 + 1; y++) for (let x = home.x0 - 1; x <= home.x1 + 1; x++) expect(isWet(world.ground(x, y)), `${seed}: ${x},${y}`).toBe(false);
      for (let y = home.y1 + 1; y <= home.y1 + 3; y++) for (let x = home.doorX - 1; x <= home.doorX + 1; x++) expect(isWet(world.ground(x, y)), `${seed}: ${x},${y}`).toBe(false);
    }
  });

  it('has a bed, a chest, a shelf, a table with a candle and a barrel, each with its own text', () => {
    const home = new WildsSource(DEFAULT_SEED).home();
    expect(home.fixtures.map((f) => f.kind).sort()).toEqual(['barrel', 'bed', 'bookshelf', 'chest', 'table']);
    for (const fixture of home.fixtures) expect(fixture.content?.pages?.length, fixture.kind).toBe(1);
    expect(home.fixtures.find((f) => f.kind === 'table')?.light).toBeTruthy();
  });

  it('lets the player walk out of the door', () => {
    const world = newWorld(DEFAULT_SEED);
    const home = (world.source as WildsSource).home();
    const start = world.spawn();
    const player = createPlayer(start.x, start.y);
    player.facing = 'down';
    expect(findInteraction(world, player)).toMatchObject({ kind: 'door', tx: home.doorX, ty: home.y1 });
    expect(useDoor(world, player, home.doorX, home.y1)).toBe('opened');
    for (let i = 0; i < TICK_RATE; i++) stepPlayer(player, { x: 0, y: 1 }, world);
    expect(Math.floor(player.y / TILE_SIZE)).toBeGreaterThan(home.y1);
  });
});
