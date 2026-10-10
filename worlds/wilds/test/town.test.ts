import { describe, expect, it } from 'vitest';
import {
  Decor,
  Ground,
  Horde,
  NpcCrowd,
  Structure,
  TICK_SECONDS,
  TILE_SIZE,
  World,
  checkDialog,
  createPlayer,
  findInteraction,
  fixtureTiles,
  inRect,
  useDoor,
  type HordePlayer,
  feetFit,
  refugeAt,
  findDeal,
} from '@game/engine';
import { DEFAULT_SEED, TOWN, TOWN_BUILDINGS, TOWN_GATE, TOWN_NAME, TOWN_NPCS, TOWN_STREET_FIXTURES, WildsSource, inTown } from '../src/index.ts';

const SEEDS = [DEFAULT_SEED, 1, 7, 42, 1234];
const source = new WildsSource(DEFAULT_SEED);
const world = new World(source);
const key = (x: number, y: number) => `${x},${y}`;
const centre = (tx: number, ty: number) => ({ x: tx * TILE_SIZE + 8, y: ty * TILE_SIZE + 8 });

/** The tiles that a player can walk to from (sx, sy) inside a rectangle, through open ground (closed doors count as walls). */
function reachable(w: World, sx: number, sy: number, x0: number, y0: number, x1: number, y1: number): Set<string> {
  const seen = new Set<string>();
  const queue: [number, number][] = [[sx, sy]];
  while (queue.length) {
    const [x, y] = queue.pop()!;
    if (x < x0 || x > x1 || y < y0 || y > y1 || seen.has(key(x, y)) || w.solidBox(x, y)) continue;
    seen.add(key(x, y));
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return seen;
}

describe('the signpost and the road', () => {
  it('stand by the home: the sign points west, to Thornwick', () => {
    for (const seed of SEEDS) {
      const s = new WildsSource(seed);
      const home = s.home();
      const sign = s.sign;
      expect(sign.kind).toBe('signpost');
      // Outside the hut, on the west side of the path to its door.
      expect(inRect(home, sign.tx, sign.ty)).toBe(false);
      expect(sign.tx).toBeLessThan(home.doorX);
      expect(Math.abs(sign.ty - home.y1)).toBeLessThanOrEqual(3);
      expect(sign.content?.pages?.join(' ')).toContain(TOWN_NAME.toUpperCase());
      expect(sign.content?.pages?.join(' ')).toContain('west');
      // The town is that way.
      expect(TOWN.x1).toBeLessThan(home.x0);
      const w = new World(s);
      expect(w.fixtureAt(sign.tx, sign.ty)).toBe(sign);
      expect(w.fixturesIn(sign.tx, sign.ty, sign.tx, sign.ty)).toContain(sign);
    }
  });

  it('can be read by a player who stands next to it', () => {
    const sign = source.sign;
    const player = createPlayer(sign.tx * TILE_SIZE + 10, (sign.ty + 1) * TILE_SIZE + 4);
    player.facing = 'up';
    expect(findInteraction(world, player)).toMatchObject({ kind: 'signpost', fixture: sign });
  });

  it('lead from the door of the home to the gate of the town, through open ground', () => {
    for (const seed of SEEDS) {
      const s = new WildsSource(seed);
      const w = new World(s);
      const home = s.home();
      const road = s.road;
      const area = reachable(w, home.doorX, home.y1 + 1, TOWN.x0, Math.min(TOWN.y0, home.y0) - 4, home.x1 + 4, Math.max(TOWN.y1, home.y1 + 8));
      expect(area.has(key(TOWN_GATE.tx, TOWN_GATE.ty)), `seed ${seed}`).toBe(true);
      // The road is mud, with nothing on it (next to the hut, the hut's own ground stays).
      const homeGround = (tx: number, ty: number) => tx >= home.x0 - 1 && tx <= home.x1 + 1 && ty >= home.y0 - 1 && ty <= home.y1 + 3;
      let tiles = 0;
      for (let ty = road.y0; ty <= road.y1; ty++) {
        for (let tx = road.x0; tx <= road.x1; tx++) {
          if (!road.on(tx, ty) || inTown(tx, ty) || w.buildingAt(tx, ty)) continue;
          tiles++;
          expect(w.decor(tx, ty), `${seed}: ${tx},${ty}`).toBe(Decor.None);
          if (w.structure(tx, ty) === Structure.None && !homeGround(tx, ty)) {
            expect(w.ground(tx, ty), `${seed}: ${tx},${ty}`).toBe(Ground.Dirt);
          }
        }
      }
      expect(tiles).toBeGreaterThan(30);
    }
  });

  it('keep the houses of the wilds off the town and the road', () => {
    for (const seed of SEEDS) {
      const s = new WildsSource(seed);
      for (let cy = -3; cy <= 2; cy++) {
        for (let cx = -4; cx <= 1; cx++) {
          const house = s.house(cx, cy);
          if (!house || (cx === 0 && cy === 0)) continue;
          expect(house.x1 < TOWN.x0 - 2 || house.x0 > TOWN.x1 + 2 || house.y1 + 3 < TOWN.y0 - 2 || house.y0 > TOWN.y1 + 2, `${seed}: ${house.id}`).toBe(true);
          for (let ty = house.y0 - 1; ty <= house.y1 + 3; ty++) for (let tx = house.x0 - 1; tx <= house.x1 + 1; tx++) expect(s.road.clear(tx, ty)).toBe(false);
        }
      }
    }
  });
});

describe('Thornwick', () => {
  it('has a main street with nine buildings round it: five open and four shut for good', () => {
    expect(TOWN_BUILDINGS).toHaveLength(9);
    expect(TOWN_BUILDINGS.filter((b) => b.locked)).toHaveLength(4);
    expect(TOWN_BUILDINGS.filter((b) => b.sign).map((b) => b.sign)).toEqual(expect.arrayContaining(['The Crooked Lantern', 'Smithy', 'Chapel', 'Apothecary']));
    // The main street: cobblestones from the west edge of the town to the east edge.
    for (let tx = TOWN.x0; tx <= TOWN.x1; tx++) expect(world.ground(tx, TOWN_GATE.ty)).toBe(Ground.Cobble);
    for (const b of TOWN_BUILDINGS) expect(world.buildingAt(b.doorX, b.y1)).toBe(b);
  });

  it('builds each building with a wall ring and one door in the south wall, and a clear doorstep', () => {
    for (const b of TOWN_BUILDINGS) {
      let doors = 0;
      for (let ty = b.y0; ty <= b.y1; ty++) {
        for (let tx = b.x0; tx <= b.x1; tx++) {
          const structure = world.structure(tx, ty);
          const edge = tx === b.x0 || tx === b.x1 || ty === b.y0 || ty === b.y1;
          if (structure === Structure.Door) {
            doors++;
            expect([ty, tx > b.x0 + 1 && tx < b.x1 - 1]).toEqual([b.y1, true]);
          } else if (structure === Structure.Window) {
            expect(ty).toBe(b.y1);
          } else {
            expect(structure === Structure.Wall, `${b.id}: ${tx},${ty}`).toBe(edge);
          }
        }
      }
      expect(doors).toBe(1);
      // Nothing stands in the 5 x 3 tiles in front of the door.
      for (let ty = b.y1 + 1; ty <= b.y1 + 3; ty++) {
        for (let tx = b.doorX - 2; tx <= b.doorX + 2; tx++) expect(world.solidBox(tx, ty), `${b.id}: ${tx},${ty}`).toBeNull();
      }
    }
  });

  it('opens the doors of the open buildings, and never the doors of the shut ones', () => {
    const w = new World(new WildsSource(DEFAULT_SEED));
    for (const b of TOWN_BUILDINGS) {
      const player = createPlayer(b.doorX * TILE_SIZE + 8, (b.y1 + 1) * TILE_SIZE + 4);
      player.facing = 'up';
      expect(findInteraction(w, player)).toMatchObject({ kind: 'door', tx: b.doorX, ty: b.y1 });
      expect(w.isDoorLocked(b.doorX, b.y1)).toBe(b.locked !== undefined);
      expect(useDoor(w, player, b.doorX, b.y1)).toBe(b.locked ? 'locked' : 'opened');
      expect(w.isDoorOpen(b.doorX, b.y1)).toBe(!b.locked);
    }
  });

  it('lets a player reach every thing in the open buildings from the door', () => {
    const w = new World(new WildsSource(DEFAULT_SEED));
    for (const b of TOWN_BUILDINGS.filter((b) => !b.locked)) {
      w.setDoorOpen(b.doorX, b.y1, true);
      const area = reachable(w, b.doorX, b.y1 + 1, b.x0, b.y0, b.x1, b.y1 + 1);
      expect(b.fixtures.length, b.id).toBeGreaterThan(2);
      for (const item of b.fixtures) {
        const near = fixtureTiles(item).some(([x, y]) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(([nx, ny]) => area.has(key(nx!, ny!))));
        expect(near, `${item.kind} at ${item.tx},${item.ty} in ${b.id}`).toBe(true);
      }
    }
  });

  it('has lamps, a fountain and a notice board in its streets, all reachable from the gate', () => {
    const kinds = TOWN_STREET_FIXTURES.map((f) => f.kind);
    expect(kinds.filter((k) => k === 'lamppost').length).toBeGreaterThan(10);
    expect(kinds).toEqual(expect.arrayContaining(['fountain', 'noticeboard']));
    const area = reachable(world, TOWN_GATE.tx, TOWN_GATE.ty, TOWN.x0, TOWN.y0, TOWN.x1 + 1, TOWN.y1);
    for (const f of TOWN_STREET_FIXTURES) {
      const near = fixtureTiles(f).some(([x, y]) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(([nx, ny]) => area.has(key(nx!, ny!))));
      expect(near, `${f.kind} at ${f.tx},${f.ty}`).toBe(true);
      expect(world.fixtureAt(f.tx, f.ty)).toBe(f);
    }
    // The doors of every building can be reached from the gate too.
    for (const b of TOWN_BUILDINGS) expect(area.has(key(b.doorX, b.y1 + 1)), b.id).toBe(true);
  });

  it('has people in its streets and in its buildings, each with something to say', () => {
    const inside = TOWN_NPCS.filter((n) => world.buildingAt(n.home[0], n.home[1]));
    expect(inside.length).toBeGreaterThanOrEqual(5);
    expect(TOWN_NPCS.length - inside.length).toBeGreaterThanOrEqual(3);
    expect(new Set(TOWN_NPCS.map((n) => n.id)).size).toBe(TOWN_NPCS.length);
    for (const npc of TOWN_NPCS) {
      expect(npc.content.speaker).toBe('fixture');
      // Pages, or a conversation.
      if (npc.content.dialog) expect(checkDialog(npc.content.dialog), npc.id).toEqual([]);
      else expect(npc.content.pages!.length, npc.id).toBeGreaterThanOrEqual(2);
      expect(npc.barks!.length, npc.id).toBeGreaterThanOrEqual(2);
      // Nobody lives in a building that is shut.
      expect(world.buildingAt(npc.home[0], npc.home[1])?.locked).toBeUndefined();
      // The area is open (a door aside) and in one piece.
      const tiles = new Set(npc.area.map(([x, y]) => key(x, y)));
      for (const [x, y] of npc.area) if (world.structure(x, y) !== Structure.Door) expect(world.solidBox(x, y), `${npc.id}: ${x},${y}`).toBeNull();
      const seen = new Set<string>();
      const queue: [number, number][] = [[npc.home[0], npc.home[1]]];
      while (queue.length) {
        const [x, y] = queue.pop()!;
        if (seen.has(key(x, y)) || !tiles.has(key(x, y))) continue;
        seen.add(key(x, y));
        queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
      expect(seen.size, npc.id).toBe(tiles.size);
    }
    expect(source.npcs()).toBe(TOWN_NPCS);
  });

  it('has people who talk with the player: conversations with answers that branch', () => {
    const talkers = TOWN_NPCS.filter((n) => n.content.dialog);
    expect(talkers.map((n) => n.id).sort()).toEqual(['apothecary', 'innkeeper', 'peddler', 'reeve', 'watchman']);
    for (const npc of talkers) {
      const dialog = npc.content.dialog!;
      const nodes = Object.values(dialog.nodes);
      expect(nodes.length, npc.id).toBeGreaterThanOrEqual(5);
      // The first line offers more than one way on.
      expect(dialog.nodes[dialog.start]!.answers.filter((a) => a.next).length, npc.id).toBeGreaterThanOrEqual(2);
      expect(npc.content.pages, npc.id).toBeUndefined();
    }
  });

  it('lets its people walk about, each in its own area', () => {
    const w = new World(new WildsSource(DEFAULT_SEED));
    const crowd = new NpcCrowd(w, TOWN_NPCS, 5);
    const areas = TOWN_NPCS.map((n) => new Set(n.area.map(([x, y]) => key(x, y))));
    const moved = new Set<number>();
    const start = crowd.poses.map((p) => ({ x: p.x, y: p.y }));
    for (let t = 0; t < 90_000; t += 50) {
      crowd.step(50, []);
      crowd.poses.forEach((p, i) => {
        expect(areas[i]!.has(key(Math.floor(p.x / TILE_SIZE), Math.floor(p.y / TILE_SIZE))), TOWN_NPCS[i]!.id).toBe(true);
        if (Math.hypot(p.x - start[i]!.x, p.y - start[i]!.y) > TILE_SIZE) moved.add(i);
      });
    }
    expect(moved.size).toBe(TOWN_NPCS.length);
    // The shut doors stay shut.
    for (const b of TOWN_BUILDINGS.filter((b) => b.locked)) expect(w.isDoorOpen(b.doorX, b.y1)).toBe(false);
  });

  it('is safe: no mob lives near it or comes into it', () => {
    const rules = source.mobs();
    for (let ty = TOWN.y0 - 2; ty <= TOWN.y1 + 2; ty++) for (let tx = TOWN.x0 - 2; tx <= TOWN.x1 + 2; tx++) expect(rules.roam(tx, ty)).toBe(false);
    const w = new World(new WildsSource(DEFAULT_SEED));
    const horde = new Horde(w, { ...rules, population: { imp: 0, brute: 0 } }, 3);
    // A player just inside the gate, and an imp on the road outside it.
    const player: HordePlayer = { id: 1, state: createPlayer(centre(TOWN_GATE.tx - 2, TOWN_GATE.ty).x, centre(TOWN_GATE.tx - 2, TOWN_GATE.ty).y) };
    const imp = horde.spawn('imp', centre(TOWN_GATE.tx + 4, TOWN_GATE.ty).x, centre(TOWN_GATE.tx + 4, TOWN_GATE.ty).y);
    let hits = 0;
    for (let t = 0; t < 20_000; t += TICK_SECONDS * 1000) {
      hits += horde.step(TICK_SECONDS * 1000, [player]).length;
      expect(inTown(Math.floor(imp.x / TILE_SIZE), Math.floor(imp.y / TILE_SIZE))).toBe(false);
    }
    expect(hits).toBe(0);
  });
});

describe('Constitution in the Wilds', () => {
  it('makes the chapel a refuge: its point is open, inside the chapel', () => {
    const world = new World(new WildsSource(DEFAULT_SEED));
    const [chapel] = world.source.refuges!();
    expect(chapel!.id).toBe('chapel');
    expect(feetFit(world, chapel!.x, chapel!.y)).toBe(true);
    expect(refugeAt(world, chapel!.x, chapel!.y)?.id).toBe('chapel');
    // Outside the chapel, no refuge.
    expect(refugeAt(world, chapel!.x, chapel!.y + 3 * TILE_SIZE)).toBeNull();
  });

  it('lets the player rest in the bed of the home, and sells ale at the inn', () => {
    const source = new WildsSource(DEFAULT_SEED);
    const bed = source.home().fixtures.find((f) => f.kind === 'bed')!;
    expect(bed.content?.rest).toBe(true);
    const innkeeper = source.npcs().find((n) => n.id === 'innkeeper')!;
    expect(findDeal(innkeeper.content.dialog!, 'ale')).toEqual({ id: 'ale', goods: 'ale', price: 2, poor: 'poor' });
  });
});

describe('Intelligence in the Wilds', () => {
  it('has a cauldron at the apothecary with three recipes behind INT 10, 13 and 15', () => {
    const cauldron = TOWN_BUILDINGS.flatMap((b) => b.fixtures).find((f) => f.kind === 'cauldron')!;
    const dialog = cauldron.content!.dialog!;
    expect(checkDialog(dialog)).toEqual([]);
    const recipes = dialog.nodes[dialog.start]!.answers.filter((a) => a.deal);
    expect(recipes.map((a) => [a.deal!.goods, a.gate!.min])).toEqual([
      ['draught', 10],
      ['antidote', 13],
      ['strong-draught', 15],
    ]);
  });

  it('puts lore (INT 13) on the books of the houses, and names its places for the map', () => {
    const source = new WildsSource(DEFAULT_SEED);
    let shelves = 0;
    for (let cy = -4; cy < 4; cy++) {
      for (let cx = -4; cx < 4; cx++) {
        const house = source.house(cx, cy);
        if (!house || house.id === 'home') continue;
        for (const f of house.fixtures.filter((f) => f.kind === 'bookshelf')) {
          shelves++;
          expect(f.content?.lore?.[0]?.gate).toEqual({ ability: 'int', min: 13 });
        }
      }
    }
    expect(shelves).toBeGreaterThan(5);
    expect(source.landmarks().map((l) => l.kind)).toEqual(['home', 'town', 'refuge']);
  });
});
