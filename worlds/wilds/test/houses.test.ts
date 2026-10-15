import { describe, expect, it } from 'vitest';
import {
  Decor,
  Ground,
  Horde,
  Room,
  Structure,
  TICK_RATE,
  TILE_SIZE,
  World,
  createPlayer,
  findInteraction,
  fixtureTiles,
  inBuilding,
  isInside,
  isWet,
  landAt,
  onWall,
  stepPlayer,
  useDoor,
  type Building,
} from '@game/engine';
import { BUILDING_CELL, CHEST_GRADES, CHEST_LOOT, DEFAULT_SEED, HOME_CELL, HOME_ID, HOUSE_KINDS, LANDS, READ_LETTER, SILVERSPRING, WildsSource, wilds, type House } from '../src/index.ts';

const newWorld = (seed: number) => new World(new WildsSource(seed));
const houseOf = (world: World, cx: number, cy: number) => (world.source as WildsSource).house(cx, cy);

/** Many buildings: every cell of a few seeds that has one. */
function sample(): { world: World; building: House }[] {
  const out: { world: World; building: House }[] = [];
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

  it('about one in four with a chest is barred, never the home or the house next to it, and the DC of its boards follows what its chest holds', () => {
    const withChest = buildings.filter(({ building: b }) => b.id !== HOME_ID && b.id !== '1,0' && b.fixtures.some((f) => f.kind === 'chest'));
    const barred = withChest.filter(({ building: b }) => b.barred);
    expect(barred.length / withChest.length).toBeGreaterThan(0.15);
    expect(barred.length / withChest.length).toBeLessThan(0.35);
    for (const { building: b } of buildings) {
      if (b.barred) expect(b.barred.ability).toBe('str');
      if (b.id === HOME_ID || b.id === '1,0' || !b.fixtures.some((f) => f.kind === 'chest')) expect(b.barred).toBeUndefined();
    }
    for (const { world, building: b } of buildings) {
      const chest = b.fixtures.find((f) => f.kind === 'chest');
      const table = chest ? world.source.loot!(chest) : null;
      if (b.id === HOME_ID) expect(table).toBeNull();
      else if (chest) expect(table).toBe(b.barred ? CHEST_GRADES.find((g) => g.dc === b.barred!.dc)!.loot : chest.lock ? table : CHEST_LOOT);
    }
    // Every grade guards some barred house.
    expect(new Set(barred.map(({ building: b }) => b.barred!.dc))).toEqual(new Set(CHEST_GRADES.map((g) => g.dc)));
  });

  it('lock the chest in about one house of three that is not barred, and the DC of the lock follows what the chest holds', () => {
    const open = buildings.filter(({ building: b }) => b.id !== HOME_ID && !b.barred && b.fixtures.some((f) => f.kind === 'chest'));
    const locked = open.filter(({ building: b }) => b.fixtures.some((f) => f.lock));
    expect(locked.length / open.length).toBeGreaterThan(0.2);
    expect(locked.length / open.length).toBeLessThan(0.45);
    for (const { world, building: b } of buildings) {
      for (const f of b.fixtures) {
        if (!f.lock) continue;
        expect(f.kind).toBe('chest');
        expect(f.lock.ability).toBe('dex');
        expect(b.barred).toBeUndefined();
        expect(world.source.loot!(f)).toBe(CHEST_GRADES.find((g) => g.dc === f.lock!.dc)!.loot);
      }
    }
    // Every grade has some locks; the locks are more often on poor chests, the boards on rich ones.
    const locks = locked.map(({ building: b }) => b.fixtures.find((f) => f.lock)!.lock!.dc);
    expect(new Set(locks)).toEqual(new Set(CHEST_GRADES.map((g) => g.dc)));
    const boards = buildings.flatMap(({ building: b }) => (b.barred ? [b.barred.dc] : []));
    const mean = (dcs: number[]) => dcs.reduce((sum, dc) => sum + dc, 0) / dcs.length;
    expect(mean(boards)).toBeGreaterThan(mean(locks));
  });

  it('guard a richer chest with a higher DC, from 10 to 13 at the start of the game (Fede, 2026-10-15)', () => {
    expect(CHEST_GRADES.map((g) => g.dc)).toEqual([10, 11, 12, 13]);
    const coins = (g: (typeof CHEST_GRADES)[number]) => ((g.loot.coins![0] + g.loot.coins![1]) / 2) * (g.loot.coinChance ?? 1);
    const things = (g: (typeof CHEST_GRADES)[number]) => (g.loot.items ?? []).reduce((sum, roll) => sum + roll.chance, 0);
    for (let i = 1; i < CHEST_GRADES.length; i++) {
      expect(coins(CHEST_GRADES[i]!)).toBeGreaterThan(coins(CHEST_GRADES[i - 1]!));
      expect(things(CHEST_GRADES[i]!)).toBeGreaterThan(things(CHEST_GRADES[i - 1]!));
      expect(CHEST_GRADES[i]!.loot.coins![1]).toBeGreaterThanOrEqual(CHEST_GRADES[i - 1]!.loot.coins![1]);
    }
    // Even the poorest guarded chest gives more than a chest without a guard; and every chest has no coins at times.
    expect(coins(CHEST_GRADES[0]!)).toBeGreaterThan(((CHEST_LOOT.coins![0] + CHEST_LOOT.coins![1]) / 2) * CHEST_LOOT.coinChance!);
    for (const g of CHEST_GRADES) expect(g.loot.coinChance).toBeLessThan(1);
  });

  it('there is the home in its cell, and a house next to it', () => {
    const source = new WildsSource(DEFAULT_SEED);
    expect(source.house(HOME_CELL[0], HOME_CELL[1])?.id).toBe(HOME_ID);
    expect(source.house(HOME_CELL[0] + 1, HOME_CELL[1])).not.toBeNull();
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
          if (!inRect || !inBuilding(b, tx, ty)) {
            // Round the house, and in a corner cut from it (Building.cut): open ground, dry, where nothing grows.
            expect(structure).toBe(Structure.None);
            expect(world.decor(tx, ty), `nothing grows next to building ${b.id}`).toBe(Decor.None);
            expect(isWet(world.ground(tx, ty))).toBe(false);
            expect(world.buildingAt(tx, ty)).toBeNull();
            continue;
          }
          expect(world.ground(tx, ty)).toBe(b.floor);
          const edge = onWall(b, tx, ty);
          if (structure === Structure.Door) {
            doors++;
            expect(ty).toBe(b.y1);
            expect(tx).toBeGreaterThan(b.x0 + 1);
            expect(tx).toBeLessThan(b.x1 - 1);
          } else if (structure === Structure.Window) {
            // A window is part of the south wall, never in a corner.
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
      // Walk the open floor from the tile inside the door: over the floor and over a pelt (no solid box).
      const seen = new Set<string>();
      const queue: [number, number][] = [[b.doorX, b.y1 - 1]];
      while (queue.length) {
        const [x, y] = queue.pop()!;
        const key = `${x},${y}`;
        if (seen.has(key) || !isInside(b, x, y) || world.solidBox(x, y) !== null) continue;
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

  it('has furniture in every building, and a bed or a bookshelf in each one that is not a store room', () => {
    const counts = buildings.map(({ building }) => building.fixtures.length);
    expect(Math.min(...counts)).toBeGreaterThan(0);
    const homes = buildings.filter(({ building }) => building.kind !== 'storeroom');
    const homely = homes.filter(({ building }) => building.fixtures.some((f) => f.kind === 'bed' || f.kind === 'bookshelf'));
    expect(homely.length / homes.length).toBeGreaterThan(0.95);
    expect(homes.length / buildings.length).toBeGreaterThan(0.8);
  });

  it('never puts the spawn inside a building', () => {
    for (const seed of [DEFAULT_SEED, 1, 7, 42, 1234]) {
      const world = newWorld(seed);
      const spawn = world.findSpawn();
      expect(world.ground(Math.floor(spawn.x / TILE_SIZE), Math.floor(spawn.y / TILE_SIZE))).not.toBe(Ground.Floor);
    }
  });
});

describe('the variants of the houses (Fede, 2026-10-15)', () => {
  const houses = buildings.map(({ building }) => building).filter((b) => b.id !== HOME_ID);
  /** The land of the middle of the cell of a house (the look and the kind of a house follow it). */
  const landOf = (b: House) => {
    const [cx, cy] = b.id.split(',').map(Number) as [number, number];
    return landAt(LANDS, cx * BUILDING_CELL + BUILDING_CELL / 2, cy * BUILDING_CELL + BUILDING_CELL / 2)!.id;
  };
  /** The houses round Silverspring: the Mithril Enclave. */
  const enclave: House[] = [];
  for (let seed = 1; seed <= 40; seed++) {
    const source = new WildsSource(seed);
    for (let cy = Math.floor((SILVERSPRING.y0 - 14) / BUILDING_CELL); cy <= Math.floor((SILVERSPRING.y1 + 14) / BUILDING_CELL); cy++) {
      for (let cx = Math.floor((SILVERSPRING.x0 - 14) / BUILDING_CELL); cx <= Math.floor((SILVERSPRING.x1 + 14) / BUILDING_CELL); cx++) {
        const house = source.house(cx, cy);
        if (house && landOf(house) === 'mithril-enclave') enclave.push(house);
      }
    }
  }
  const LOOKS: Record<string, string[]> = {
    'iron-sovereignty': ['timber thatch 8', 'planks shingle 5', 'timber shingle 5', 'planks thatch 8', 'stone slate 7'],
    wildlands: ['stone slate 5', 'rubble thatch 8', 'rubble slate 7', 'planks thatch 8'],
    'mithril-enclave': ['brick clay 5', 'timber clay 5', 'stone slate 7'],
  };
  const lookOf = (b: House) => `${b.style!.walls} ${b.style!.roof} ${b.floor}`;

  it('take the looks of their land, with the floor of the look', () => {
    expect(Ground.Floor).toBe(5);
    expect(Ground.FloorStone).toBe(7);
    expect(Ground.FloorEarth).toBe(8);
    expect(enclave.length).toBeGreaterThan(3);
    for (const b of [...houses, ...enclave]) expect(LOOKS[landOf(b)], `${b.id}: ${lookOf(b)}`).toContain(lookOf(b));
    for (const land of ['iron-sovereignty', 'wildlands'] as const) {
      const looks = new Set(houses.filter((b) => landOf(b) === land).map(lookOf));
      expect(looks.size, land).toBeGreaterThanOrEqual(3);
    }
    expect(new Set(enclave.map(lookOf)).size).toBeGreaterThanOrEqual(2);
  });

  it('are an L or a T now and then: corners cut from the north, the south part whole', () => {
    const cuts = houses.map((b) => b.cut).filter((cut) => cut !== undefined);
    expect(cuts.length / houses.length).toBeGreaterThan(0.15);
    expect(cuts.length / houses.length).toBeLessThan(0.5);
    expect(cuts.some((c) => c.west > 0 && c.east === 0)).toBe(true);
    expect(cuts.some((c) => c.west === 0 && c.east > 0)).toBe(true);
    expect(cuts.some((c) => c.west > 0 && c.east > 0)).toBe(true);
    for (const b of houses) {
      if (!b.cut) continue;
      const { depth, west, east } = b.cut;
      expect(depth).toBeGreaterThanOrEqual(2);
      // The south part: the corridor and two rows more inside its walls. The wing: two columns inside its walls.
      expect(b.y1 - (b.y0 + depth) + 1).toBeGreaterThanOrEqual(5);
      expect(b.x1 - b.x0 + 1 - west - east).toBeGreaterThanOrEqual(4);
      for (const side of [west, east]) expect(side === 0 || side >= 2).toBe(true);
      // The corner tiles are not part of it; the door and the whole south wall are.
      if (west > 0) expect(inBuilding(b, b.x0, b.y0)).toBe(false);
      if (east > 0) expect(inBuilding(b, b.x1, b.y0)).toBe(false);
      for (let tx = b.x0; tx <= b.x1; tx++) expect(inBuilding(b, tx, b.y1)).toBe(true);
    }
  });

  it('have one or two windows now and then, and most are dark: a lit house has a burning candle, a dark one a cold one', () => {
    const windowed = houses.filter((b) => b.windows);
    expect(windowed.length / houses.length).toBeGreaterThan(0.45);
    expect(windowed.length / houses.length).toBeLessThan(0.75);
    for (const b of windowed) {
      expect(b.windows!.length).toBeGreaterThanOrEqual(1);
      expect(b.windows!.length).toBeLessThanOrEqual(2);
      for (const tx of b.windows!) expect(Math.abs(tx - b.doorX)).toBeGreaterThan(1);
      if (b.windows!.length === 2) expect(b.windows![1]! - b.windows![0]!).toBeGreaterThan(1);
    }
    const dark = houses.filter((b) => b.dark);
    expect(dark.length / houses.length).toBeGreaterThan(0.75);
    expect(dark.length / houses.length).toBeLessThan(0.92);
    // Nobody was in a house with boards across its door.
    for (const b of houses) if (b.barred) expect(b.dark, b.id).toBe(true);
    for (const b of houses) {
      for (const table of b.fixtures.filter((f) => f.kind === 'table')) {
        if (b.dark) {
          expect(table.light).toBeUndefined();
          expect(table.look).toBe('cold');
          expect(table.content?.pages).toEqual(['The candle burned down long ago. Nobody lives here now.']);
        } else {
          expect(table.light).toBeTruthy();
          expect(table.look).toBeUndefined();
          expect(table.content).toBeUndefined();
        }
      }
    }
  });

  it('have a chimney now and then, never over a corner', () => {
    const chimneys = houses.filter((b) => b.roofProps);
    expect(chimneys.length / houses.length).toBeGreaterThan(0.25);
    expect(chimneys.length / houses.length).toBeLessThan(0.55);
    for (const b of chimneys) {
      expect(b.roofProps).toHaveLength(1);
      expect(b.roofProps![0]!.name).toBe('chimney');
      expect(b.roofProps![0]!.tx).toBeGreaterThan(b.x0);
      expect(b.roofProps![0]!.tx).toBeLessThan(b.x1);
    }
  });

  it('have the things of their kind, and the kinds follow the land', () => {
    const kinds = (kind: string) => houses.filter((b) => b.kind === kind);
    for (const kind of HOUSE_KINDS) expect(kinds(kind).length, kind).toBeGreaterThan(5);
    const has = (b: House, kind: string) => b.fixtures.filter((f) => f.kind === kind);
    for (const b of houses) {
      // The chest of every kind: the loot, the bars and the lock stay as they were.
      expect(has(b, 'chest').length, b.id).toBeLessThanOrEqual(1);
      if (b.kind === 'storeroom') {
        expect(has(b, 'bed')).toHaveLength(0);
        expect(has(b, 'table')).toHaveLength(0);
      }
      for (const crate of has(b, 'crate')) {
        const pages = crate.content?.pages;
        if (b.kind === 'farmhouse') expect(pages).toEqual(['Sacks of grain. The grain is mouldy.']);
        else if (b.kind === 'lodge') expect(pages).toEqual(['Snares, a coil of rope and a rusty skinning knife.']);
        else expect(pages).toBeUndefined();
      }
      for (const rug of has(b, 'rug')) {
        expect(b.kind).toBe('lodge');
        expect(rug.look).toBe('pelt');
      }
      for (const lectern of has(b, 'lectern')) {
        expect(b.kind).toBe('hermitage');
        expect(lectern.content?.pages).toHaveLength(1);
        expect(lectern.content?.lore?.[0]?.gate).toEqual({ ability: 'int', dc: 10 });
      }
    }
    const share = (kind: string, b: House[]) => b.filter((h) => h.kind === kind).length / b.length;
    expect(kinds('storeroom').every((b) => has(b, 'crate').length >= 3)).toBe(true);
    expect(kinds('lodge').filter((b) => has(b, 'rug').length === 1).length / kinds('lodge').length).toBeGreaterThan(0.8);
    expect(kinds('hermitage').filter((b) => has(b, 'lectern').length === 1).length / kinds('hermitage').length).toBeGreaterThan(0.8);
    expect(kinds('farmhouse').every((b) => has(b, 'crate').length >= 1)).toBe(true);
    const forest = houses.filter((b) => landOf(b) === 'iron-sovereignty');
    const wild = houses.filter((b) => landOf(b) === 'wildlands');
    expect(share('farmhouse', forest)).toBeGreaterThan(share('farmhouse', wild));
    expect(share('lodge', wild)).toBeGreaterThan(share('lodge', forest));
  });
});

describe('walls and doors', () => {
  const world = newWorld(DEFAULT_SEED);
  const b = houseOf(world, HOME_CELL[0], HOME_CELL[1])!;
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
    // The table has the letter of Thrain Steelforge: three pages, and to read it starts the story.
    for (const fixture of home.fixtures) expect(fixture.content?.pages?.length, fixture.kind).toBe(fixture.kind === 'table' ? 3 : 1);
    const table = home.fixtures.find((f) => f.kind === 'table');
    expect(table?.light).toBeTruthy();
    expect(table?.content?.effect).toEqual(READ_LETTER);
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

describe('a pack of mobs in the woods', () => {
  it('keeps its attacks on a player who stands still (a stuck mob gives its turn to the next one)', () => {
    const world = newWorld(DEFAULT_SEED);
    const horde = new Horde(world, { ...world.source.mobs!(), population: { imp: 0, brute: 0 } }, 3);
    const p = createPlayer(8, 40 * TILE_SIZE + 12);
    p.hp = 1000;
    for (const kind of ['brute', 'brute', 'imp', 'imp'] as const) {
      const spot = world.findSpawn(5, 40, 0);
      horde.spawn(kind, spot.x, spot.y);
    }
    let hits = 0;
    const tick = 1000 / TICK_RATE;
    for (let t = 0; t < 60_000; t += tick) {
      stepPlayer(p, { x: 0, y: 0 }, world);
      hits += horde.step(tick, [{ id: 1, state: p }]).length;
    }
    expect(hits).toBeGreaterThan(12);
  });
});
