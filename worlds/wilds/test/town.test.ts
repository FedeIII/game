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
  stairsLanding,
  useStairs,
  stepPlayer,
  type Fixture,
} from '@game/engine';
import {
  BRONZEHOLD,
  BRONZEHOLD_NORTH,
  BRONZEHOLD_SOUTH,
  DEFAULT_SEED,
  FOREST_EDGE_Y,
  FOREST_MOBS,
  WILD_MOBS,
  HAMLET_NPCS,
  HAMLET_SIGNS,
  IRONHOLD,
  WHITEGROVE,
  WHITEGROVE_NORTH,
  WHITEGROVE_SHRINE,
  WHITEGROVE_SOUTH,
  Plot,
  SILVERSPRING,
  SILVERSPRING_NAME,
  SILVERSPRING_NAME_SIGN,
  SILVERSPRING_NPCS,
  SILVERSPRING_SITE,
  SILVERVEIN,
  TOWN,
  TOWN_BUILDINGS,
  TOWN_GATE,
  TOWN_NAME,
  TOWN_NAME_SIGN,
  TOWN_SOUTH,
  TOWN_NPCS,
  TOWN_STREET_FIXTURES,
  WildsSource,
  inTown,
} from '../src/index.ts';

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

/**
 * The things of the streets (not the palisade) that close a way: the open tiles round the thing do
 * not join one another by a short walk round it (within 2 tiles of it). For example, a lamp post at
 * the end of an alley of one tile: a player in the alley cannot get past it (a bug of 2026-10-13).
 */
function blockers(town: { streetFixtures: readonly Fixture[] }): string[] {
  const out: string[] = [];
  for (const f of town.streetFixtures.filter((f) => f.kind !== 'palisade')) {
    const tiles = fixtureTiles(f);
    const xs = tiles.map(([x]) => x);
    const ys = tiles.map(([, y]) => y);
    const [x0, x1, y0, y1] = [Math.min(...xs) - 1, Math.max(...xs) + 1, Math.min(...ys) - 1, Math.max(...ys) + 1];
    const ring: [number, number][] = [];
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const edge = tx === x0 || tx === x1 || ty === y0 || ty === y1;
        if (edge && !world.solidBox(tx, ty)) ring.push([tx, ty]);
      }
    }
    if (!ring.length) continue;
    const area = reachable(world, ring[0]![0], ring[0]![1], x0 - 1, y0 - 1, x1 + 1, y1 + 1);
    if (ring.some(([tx, ty]) => !area.has(key(tx, ty)))) out.push(`${f.kind} at ${f.tx},${f.ty}`);
  }
  return out;
}

describe('the signpost and the road', () => {
  it('stand by the home: the sign points west, along the road that turns north to Ironhold', () => {
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
      // The road leaves the hut west; Ironhold is north of the hut (Fede, 2026-10-12).
      const road = s.road;
      expect(road.points[8]![0]).toBeLessThan(road.points[0]![0]);
      expect(TOWN.y1).toBeLessThan(home.y0 - 100);
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
      // The cells round the town and along the road to the hut (HOME_CELL: 0, 6).
      for (let cy = -3; cy <= 7; cy++) {
        for (let cx = -4; cx <= 1; cx++) {
          const house = s.house(cx, cy);
          if (!house || house.id === 'home') continue;
          expect(house.x1 < TOWN.x0 - 2 || house.x0 > TOWN.x1 + 2 || house.y1 + 3 < TOWN.y0 - 2 || house.y0 > TOWN.y1 + 2, `${seed}: ${house.id}`).toBe(true);
          for (let ty = house.y0 - 1; ty <= house.y1 + 3; ty++) for (let tx = house.x0 - 1; tx <= house.x1 + 1; tx++) expect(s.road.clear(tx, ty)).toBe(false);
        }
      }
    }
  });
});

describe('Ironhold', () => {
  it('has a main street with nine buildings round it: five open and four shut for good', () => {
    expect(TOWN_BUILDINGS).toHaveLength(9);
    expect(TOWN_BUILDINGS.filter((b) => b.locked)).toHaveLength(4);
    expect(TOWN_BUILDINGS.filter((b) => b.sign).map((b) => b.sign)).toEqual(expect.arrayContaining(['The Crooked Lantern', 'Town Hall', 'Smithy', 'Apothecary']));
    // The chapel shows a chalice over its door, not a word (Fede's decision, 2026-10-13).
    const chapel = TOWN_BUILDINGS.find((b) => b.id === 'chapel')!;
    expect(chapel.emblem).toBe('chalice');
    expect(chapel.sign).toBeUndefined();
    // The main street: cobblestones from the west palisade to the east gate.
    for (let tx = TOWN.x0 + 1; tx <= TOWN.x1; tx++) expect(world.ground(tx, TOWN_GATE.ty)).toBe(Ground.Cobble);
    for (const b of TOWN_BUILDINGS) expect(world.buildingAt(b.doorX, b.y1)).toBe(b);
  });

  it('has a palisade all round it, open only at the south gate and the east gate (2026-10-13)', () => {
    const palisade = new Set(TOWN_STREET_FIXTURES.filter((f) => f.kind === 'palisade').map((f) => key(f.tx, f.ty)));
    const openings: string[] = [];
    for (let ty = TOWN.y0; ty <= TOWN.y1; ty++) {
      for (let tx = TOWN.x0; tx <= TOWN.x1; tx++) {
        const edge = tx === TOWN.x0 || tx === TOWN.x1 || ty === TOWN.y0 || ty === TOWN.y1;
        if (!edge) {
          expect(palisade.has(key(tx, ty)), `${tx},${ty}`).toBe(false);
          continue;
        }
        if (palisade.has(key(tx, ty))) expect(world.solidBox(tx, ty), `${tx},${ty}`).not.toBeNull();
        else openings.push(key(tx, ty));
      }
    }
    // The south gate (three tiles over the road from the hut) and the east gate (the main street).
    const south = [-1, 0, 1].map((d) => key(TOWN_SOUTH.tx + d, TOWN.y1));
    const east = [-1, 0, 1].map((d) => key(TOWN.x1, TOWN_GATE.ty + d));
    expect(openings.sort()).toEqual([...south, ...east].sort());
    // Each tile joins the tiles of palisade next to it: a corner joins two sides, a run two opposite sides.
    const corner = TOWN_STREET_FIXTURES.find((f) => f.kind === 'palisade' && f.tx === TOWN.x0 && f.ty === TOWN.y0)!;
    expect(corner.look).toBe('6');
    const run = TOWN_STREET_FIXTURES.find((f) => f.kind === 'palisade' && f.tx === TOWN.x0 + 5 && f.ty === TOWN.y0)!;
    expect(run.look).toBe('10');
  });

  it('lets a player walk through each alley between the south buildings, from the lane to the main street (a bug of 2026-10-13)', () => {
    // An alley: a column of open ground between two buildings, from the row under the main street to the lane.
    const [top, lane] = [TOWN.y0 + 13, TOWN.y0 + 19];
    const alleys: number[] = [];
    for (let tx = TOWN.x0 + 1; tx < TOWN.x1; tx++) {
      let open = true;
      for (let ty = top; ty < lane; ty++) if (world.structure(tx, ty) !== Structure.None || world.solidBox(tx, ty)) open = false;
      if (open) alleys.push(tx);
    }
    expect(alleys).toHaveLength(5);
    for (const tx of alleys) {
      const player = createPlayer(tx * TILE_SIZE + 8, lane * TILE_SIZE + 8);
      for (let i = 0; i < 600 && player.y > TOWN_GATE.ty * TILE_SIZE + 8; i++) stepPlayer(player, { x: 0, y: -1 }, world);
      expect(Math.floor(player.y / TILE_SIZE), `the alley at ${tx}`).toBe(TOWN_GATE.ty);
    }
  });

  it('has its town hall in the middle of a square: two storeys, the hall and the archive, joined by stairs', () => {
    const hall = TOWN_BUILDINGS.find((b) => b.id === 'town-hall')!;
    expect(hall.sign).toBe('Town Hall');
    expect(hall.storeys).toHaveLength(1);
    // Cobblestones on every side of it.
    for (let tx = hall.x0 - 1; tx <= hall.x1 + 1; tx++) {
      expect(world.ground(tx, hall.y0 - 1), `${tx},${hall.y0 - 1}`).toBe(Ground.Cobble);
      expect(world.ground(tx, hall.y1 + 1), `${tx},${hall.y1 + 1}`).toBe(Ground.Cobble);
    }
    for (let ty = hall.y0; ty <= hall.y1; ty++) for (const tx of [hall.x0 - 1, hall.x1 + 1]) expect(world.ground(tx, ty), `${tx},${ty}`).toBe(Ground.Cobble);
    // The reeve, the villager and the soldier are in the hall; the stairs are there too.
    for (const id of ['reeve', 'farmer', 'soldier']) {
      const npc = TOWN_NPCS.find((n) => n.id === id)!;
      expect(inRect(hall, npc.home[0], npc.home[1]), id).toBe(true);
      expect(npc.storey ?? 0, id).toBe(0);
    }
    const stairs = hall.fixtures.find((f) => f.kind === 'stairs')!;
    // A player walks from the door to the stairs, goes up, and reaches every thing of the archive.
    const w = new World(new WildsSource(DEFAULT_SEED));
    w.setDoorOpen(hall.doorX, hall.y1, true);
    const landing = stairsLanding(stairs);
    const below = reachable(w, hall.doorX, hall.y1 + 1, hall.x0, hall.y0, hall.x1, hall.y1 + 1);
    expect(below.has(key(Math.floor(landing.x / TILE_SIZE), Math.floor(landing.y / TILE_SIZE)))).toBe(true);
    const player = createPlayer(landing.x, landing.y);
    player.facing = 'up';
    expect(findInteraction(w.level(0), player, () => true)?.kind).toBe('stairs');
    expect(useStairs(w, player, stairs.tx, stairs.ty)).toBe('up');
    expect(player.storey).toBe(1);
    const up = w.level(1);
    const area = new Set<string>();
    const queue: [number, number][] = [[Math.floor(player.x / TILE_SIZE), Math.floor(player.y / TILE_SIZE)]];
    while (queue.length) {
      const [x, y] = queue.pop()!;
      if (area.has(key(x, y)) || up.solidBox(x, y)) continue;
      area.add(key(x, y));
      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    const archive = hall.storeys![0]!.fixtures;
    expect(archive.map((f) => f.kind)).toEqual(expect.arrayContaining(['bookshelf', 'coinchest', 'stairwell']));
    for (const item of archive) {
      const near = fixtureTiles(item).some(([x, y]) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(([nx, ny]) => area.has(key(nx!, ny!))));
      expect(near, `${item.kind} at ${item.tx},${item.ty}`).toBe(true);
      expect(inRect(hall, item.tx, item.ty)).toBe(true);
    }
    // Nothing of the archive is below, and the stairwell takes the player down again.
    expect(w.level(0).fixtureAt(archive[0]!.tx, archive[0]!.ty)?.kind).not.toBe(archive[0]!.kind);
    expect(useStairs(w, player, stairs.tx, stairs.ty)).toBe('down');
    expect(player.storey).toBe(0);
  });

  it('is of wood: timber frames and planks, but for the stone storey of the town hall and the chapel', () => {
    for (const b of TOWN_BUILDINGS) {
      const walls = [b.style?.walls, ...(b.storeys ?? []).map((st) => st.walls ?? b.style?.walls)];
      const wooden = walls.filter((w) => w === 'timber' || w === 'planks').length;
      if (b.id === 'chapel') expect(walls).toEqual(['gothic']);
      else if (b.id === 'town-hall') expect(walls).toEqual(['stone', 'timber']);
      else expect(wooden, b.id).toBe(walls.length);
    }
  });

  it('has lamps, a fountain and a notice board in its streets', () => {
    const kinds = TOWN_STREET_FIXTURES.map((f) => f.kind);
    expect(kinds.filter((k) => k === 'lamppost').length).toBeGreaterThan(10);
    expect(kinds).toEqual(expect.arrayContaining(['fountain', 'noticeboard']));
  });

  it('has people who talk with the player: conversations with answers that branch', () => {
    const talkers = TOWN_NPCS.filter((n) => n.content.dialog);
    expect(talkers.map((n) => n.id).sort()).toEqual(['apothecary', 'innkeeper', 'peddler', 'priest', 'reeve', 'smith', 'soldier', 'watchman']);
    for (const npc of talkers) {
      const dialog = npc.content.dialog!;
      const nodes = Object.values(dialog.nodes);
      expect(nodes.length, npc.id).toBeGreaterThanOrEqual(5);
      // The first line offers more than one way on.
      expect(dialog.nodes[dialog.start]!.answers.filter((a) => a.next).length, npc.id).toBeGreaterThanOrEqual(2);
      expect(npc.content.pages, npc.id).toBeUndefined();
    }
  });

  it('comes first in the list of NPCs: then the merchant on the road, the people of Silverspring, the survivors of the burned homesteads, Mira Wren and the people of the hamlets', () => {
    // The order is the code of each NPC on the wire.
    expect(source.npcs().slice(0, TOWN_NPCS.length)).toEqual(TOWN_NPCS);
    expect(source.npcs().slice(TOWN_NPCS.length).map((n) => n.id)).toEqual([
      'merchant',
      ...SILVERSPRING_NPCS.map((n) => n.id),
      'hale-survivor',
      'tanner-survivor',
      'mira',
      'bronzehold-sergeant',
      'whitegrove-farmer',
      'whitegrove-villager',
      'bronzehold-guard',
    ]);
  });
});

describe('Silverspring', () => {
  const s = SILVERSPRING;
  /** The tile where the north road ends: just west of the town, on its main street. */
  const gate = SILVERSPRING_SITE;

  it('stands at the end of the north road: the road comes in at the west end of its main street', () => {
    expect(s.name).toBe(SILVERSPRING_NAME);
    expect([gate.tx, gate.ty]).toEqual([s.x0 - 1, s.y0 + 10]);
    expect(source.north.on(gate.tx, gate.ty)).toBe(true);
    for (let tx = s.x0; tx <= s.x1; tx++) expect([Ground.Cobble, Ground.Floor]).toContain(world.ground(tx, gate.ty));
    // It is about 250 tiles from Ironhold, to the north-east.
    expect(Math.hypot(s.x0 - TOWN.x1, s.y1 - TOWN.y0)).toBeGreaterThan(200);
  });

  it('has three open buildings (the militia hall, the inn and the jeweller) and four shut houses', () => {
    expect(s.buildings).toHaveLength(7);
    expect(s.buildings.filter((b) => b.locked)).toHaveLength(4);
    expect(s.buildings.filter((b) => b.sign).map((b) => b.sign)).toEqual(['Militia', 'The Silver Trout', 'Jeweller']);
    for (const b of s.buildings) expect(world.buildingAt(b.doorX, b.y1)).toBe(b);
    // The building ids are unique in the world (a refuge names its building).
    const ids = [...TOWN_BUILDINGS, ...s.buildings].map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has the Silvervein across it, from its north edge to its south edge, with bridges where the main street and the lane cross it', () => {
    let water = 0;
    let bridges = 0;
    for (let ty = s.y0; ty <= s.y1; ty++) {
      for (let tx = s.x0; tx <= s.x1; tx++) {
        const plot = s.plotAt(tx, ty);
        if (plot === Plot.Water) {
          water++;
          expect(world.ground(tx, ty)).toBe(Ground.Water);
          expect(world.solidBox(tx, ty), `${tx},${ty}`).not.toBeNull();
        }
        if (plot === Plot.Bridge) {
          bridges++;
          expect(world.ground(tx, ty)).toBe(Ground.Floor);
          expect(world.solidBox(tx, ty), `${tx},${ty}`).toBeNull();
        }
      }
    }
    expect(water).toBe(2 * 24 - 12);
    expect(bridges).toBe(12);
    // The river goes on outside the town, north to its spring and south to its pool, and it is water there too.
    for (const ty of [s.y0 - 1, s.y0 - 10, s.y1 + 1, s.y1 + 10]) {
      const wet = [195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206].filter((tx) => SILVERVEIN.wet(tx, ty));
      expect(wet.length, `row ${ty}`).toBeGreaterThanOrEqual(2);
      for (const tx of wet) expect([Ground.Water, Ground.Shallows]).toContain(world.ground(tx, ty));
    }
    for (const [cx, cy] of [SILVERVEIN.spring, SILVERVEIN.pool]) expect(world.ground(Math.floor(cx), Math.floor(cy))).toBe(Ground.Water);
    expect(SILVERVEIN.spring[1]).toBeLessThan(s.y0);
    expect(SILVERVEIN.pool[1]).toBeGreaterThan(s.y1);
    // No mob lives in it.
    const rules = source.mobs();
    expect(rules.roam(202, s.y1 + 10)).toBe(false);
  });

  it('has Kasmut Parnika in the militia hall, with a conversation for a character who comes to warn the town', () => {
    const kasmut = SILVERSPRING_NPCS.find((n) => n.id === 'kasmut')!;
    expect(world.buildingAt(kasmut.home[0], kasmut.home[1])?.id).toBe('militia-hall');
    const dialog = kasmut.content.dialog!;
    expect(dialog.name).toBe('Kasmut Parnika, of the Enclave');
    expect(checkDialog(dialog)).toEqual([]);
    expect(dialog.starts?.map((st) => st.node)).toEqual(['fine', 'guard', 'early', 'held', 'himo', 'road']);
    expect(SILVERSPRING_NPCS.map((n) => n.id)).toEqual(['kasmut', 'host', 'jeweller', 'militia', 'prospector']);
  });

  it('is a town of the map', () => {
    const mark = source.landmarks().find((l) => l.name === 'Silverspring')!;
    expect(mark.kind).toBe('town');
    expect(s.has(Math.floor(mark.x / TILE_SIZE), Math.floor(mark.y / TILE_SIZE))).toBe(true);
  });
});

/** What every town checks: Ironhold (its gate: the end of the road from the home) and Silverspring (the end of the north road). */
const TOWNS = [
  { town: IRONHOLD, gate: TOWN_GATE, people: TOWN_NPCS, sign: TOWN_NAME_SIGN, look: 'iron' },
  { town: SILVERSPRING, gate: SILVERSPRING_SITE, people: SILVERSPRING_NPCS, sign: SILVERSPRING_NAME_SIGN, look: 'mithril' },
];

describe.each(TOWNS)('the town of $town.name', ({ town, gate, people, sign, look }) => {
  it('builds each building with a wall ring and one door in the south wall, and a clear doorstep', () => {
    for (const b of town.buildings) {
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
    for (const b of town.buildings) {
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
    for (const b of town.buildings.filter((b) => !b.locked)) {
      w.setDoorOpen(b.doorX, b.y1, true);
      const area = reachable(w, b.doorX, b.y1 + 1, b.x0, b.y0, b.x1, b.y1 + 1);
      expect(b.fixtures.length, b.id).toBeGreaterThan(2);
      for (const item of b.fixtures) {
        const near = fixtureTiles(item).some(([x, y]) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(([nx, ny]) => area.has(key(nx!, ny!))));
        expect(near, `${item.kind} at ${item.tx},${item.ty} in ${b.id}`).toBe(true);
      }
    }
  });

  it('has lamps and a notice board in its streets, and they and every door are reachable from the gate', () => {
    const kinds = town.streetFixtures.map((f) => f.kind);
    expect(kinds.filter((k) => k === 'lamppost').length).toBeGreaterThan(10);
    expect(kinds).toContain('noticeboard');
    const area = reachable(world, gate.tx, gate.ty, Math.min(town.x0, gate.tx), town.y0, Math.max(town.x1, gate.tx), town.y1);
    // A palisade is round the town, not a thing to reach.
    for (const f of town.streetFixtures.filter((f) => f.kind !== 'palisade')) {
      const near = fixtureTiles(f).some(([x, y]) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(([nx, ny]) => area.has(key(nx!, ny!))));
      expect(near, `${f.kind} at ${f.tx},${f.ty}`).toBe(true);
      expect(world.fixtureAt(f.tx, f.ty)).toBe(f);
    }
    for (const b of town.buildings) expect(area.has(key(b.doorX, b.y1 + 1)), b.id).toBe(true);
  });

  it('has no lamp or other thing in its streets that closes a way, such as an alley', () => {
    expect(blockers(town)).toEqual([]);
  });

  it('has people in its streets and in its buildings, each with something to say', () => {
    const inside = people.filter((n) => world.buildingAt(n.home[0], n.home[1]));
    expect(inside.length).toBeGreaterThanOrEqual(3);
    expect(people.length - inside.length).toBeGreaterThanOrEqual(2);
    const all = source.npcs().map((n) => n.id);
    expect(new Set(all).size).toBe(all.length);
    for (const npc of people) {
      expect(town.has(npc.home[0], npc.home[1]), npc.id).toBe(true);
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
  });

  it('lets its people walk about, each in its own area', () => {
    const w = new World(new WildsSource(DEFAULT_SEED));
    const crowd = new NpcCrowd(w, people, 5);
    const areas = people.map((n) => new Set(n.area.map(([x, y]) => key(x, y))));
    const moved = new Set<number>();
    const start = crowd.poses.map((p) => ({ x: p.x, y: p.y }));
    for (let t = 0; t < 90_000; t += 50) {
      crowd.step(50, []);
      crowd.poses.forEach((p, i) => {
        expect(areas[i]!.has(key(Math.floor(p.x / TILE_SIZE), Math.floor(p.y / TILE_SIZE))), people[i]!.id).toBe(true);
        if (Math.hypot(p.x - start[i]!.x, p.y - start[i]!.y) > TILE_SIZE) moved.add(i);
      });
    }
    expect(moved.size).toBe(people.length);
    // The shut doors stay shut.
    for (const b of town.buildings.filter((b) => b.locked)) expect(w.isDoorOpen(b.doorX, b.y1)).toBe(false);
  });

  it('is safe: no mob lives near it or comes into it', () => {
    const rules = source.mobs();
    for (let ty = town.y0 - 2; ty <= town.y1 + 2; ty++) for (let tx = town.x0 - 2; tx <= town.x1 + 2; tx++) expect(rules.roam(tx, ty)).toBe(false);
    for (let ty = town.y0; ty <= town.y1; ty++) for (let tx = town.x0; tx <= town.x1; tx++) expect(rules.hunt(tx, ty)).toBe(false);
    const w = new World(new WildsSource(DEFAULT_SEED));
    const horde = new Horde(w, { ...rules, population: { imp: 0, brute: 0 } }, 3);
    // A player just inside the gate, and an imp on the road outside it.
    const inside = town.has(gate.tx + 2, gate.ty) ? gate.tx + 2 : gate.tx - 2;
    const outside = town.has(gate.tx + 2, gate.ty) ? gate.tx - 4 : gate.tx + 4;
    const player: HordePlayer = { id: 1, state: createPlayer(centre(inside, gate.ty).x, centre(inside, gate.ty).y) };
    const imp = horde.spawn('imp', centre(outside, gate.ty).x, centre(outside, gate.ty).y);
    let hits = 0;
    for (let t = 0; t < 20_000; t += TICK_SECONDS * 1000) {
      hits += horde.step(TICK_SECONDS * 1000, [player]).length;
      expect(town.has(Math.floor(imp.x / TILE_SIZE), Math.floor(imp.y / TILE_SIZE))).toBe(false);
    }
    expect(hits).toBe(0);
  });

  it('shows its name over the screen when a player comes in (a big or important town)', () => {
    expect(town.title).toBe(true);
    expect(source.placeTitles()).toContainEqual({ id: town.name.toLowerCase(), title: town.name, x0: town.x0, y0: town.y0, x1: town.x1, y1: town.y1 });
  });

  it('has a name sign in the style of its dominion, beside the road where the road comes in', () => {
    expect(sign).toMatchObject({ kind: 'namesign', look, label: town.name });
    expect(sign.content?.pages?.join(' ')).toContain(`It reads: ${town.name.toUpperCase()}.`);
    const tiles = fixtureTiles(sign);
    const areas = new Set(people.flatMap((p) => p.area.map(([x, y]) => key(x, y))));
    for (const seed of SEEDS) {
      const s = new WildsSource(seed);
      const w = new World(s);
      const onRoad = (tx: number, ty: number) => [s.road, s.north, s.gate, s.trail].some((r) => r.on(tx, ty));
      // Outside the town, never on a road, and near one.
      for (const [tx, ty] of tiles) {
        expect(town.has(tx, ty)).toBe(false);
        expect(onRoad(tx, ty), `${seed}: ${tx},${ty}`).toBe(false);
        expect(w.fixtureAt(tx, ty)).toBe(sign);
      }
      expect(tiles.some(([tx, ty]) => [-2, -1, 0, 1, 2].some((d) => onRoad(tx + d, ty + 1) || onRoad(tx + d, ty + 2)))).toBe(true);
      expect(w.fixturesIn(sign.tx, sign.ty, sign.tx, sign.ty)).toContain(sign);
      // Two posts, and nothing solid between them; no tree, rock or house round it.
      expect(tiles.map(([x, y]) => w.solidBox(x, y) !== null)).toEqual([true, false, true]);
      for (let ty = sign.ty - 1; ty <= sign.ty + 1; ty++) {
        for (let tx = sign.tx - 1; tx <= sign.tx + 3; tx++) {
          expect([Decor.Tree, Decor.Rock], `${seed}: ${tx},${ty}`).not.toContain(w.decor(tx, ty));
          expect(w.buildingAt(tx, ty), `${seed}: ${tx},${ty}`).toBeNull();
        }
      }
      // Its plate (at most 80 pixels wide, over its middle) hangs over the two rows north of it: no road
      // there, and nobody of the town walks there.
      for (let ty = sign.ty - 2; ty <= sign.ty - 1; ty++) {
        for (let tx = sign.tx - 1; tx <= sign.tx + 3; tx++) {
          expect(onRoad(tx, ty), `${seed}: ${tx},${ty}`).toBe(false);
          expect(areas.has(key(tx, ty)), `${tx},${ty}`).toBe(false);
        }
      }
    }
    // A player next to its east post reads it.
    const player = createPlayer((sign.tx + 3) * TILE_SIZE + 3, sign.ty * TILE_SIZE + 12);
    player.facing = 'left';
    expect(findInteraction(world, player)).toMatchObject({ kind: 'namesign', fixture: sign });
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
    expect(findDeal(innkeeper.content.dialog!, 'ale')?.deal).toEqual({ id: 'ale', goods: 'ale', price: 2, poor: 'poor' });
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
    expect(source.landmarks().map((l) => l.kind)).toEqual(['home', 'town', 'refuge', 'town', 'town', 'town', 'refuge']);
  });
});

describe('the road through the hamlets', () => {
  it('runs from the hut through Whitegrove and Bronzehold to the south edge of Ironhold, on their lanes', () => {
    for (const seed of SEEDS) {
      const s = new WildsSource(seed);
      const w = new World(s);
      // The road ends next to each end of the lanes, and the lanes are open.
      for (const [tx, ty] of [WHITEGROVE_SOUTH, WHITEGROVE_NORTH, BRONZEHOLD_SOUTH, BRONZEHOLD_NORTH, [TOWN_SOUTH.tx, TOWN_SOUTH.ty] as const]) {
        expect(s.road.on(tx, ty), `${seed}: ${tx},${ty}`).toBe(true);
        expect(w.solidBox(tx, ty)).toBeNull();
      }
      for (const town of [WHITEGROVE, BRONZEHOLD]) {
        const [lx] = town === WHITEGROVE ? WHITEGROVE_SOUTH : BRONZEHOLD_SOUTH;
        for (let ty = town.y0; ty <= town.y1; ty++) expect(w.solidBox(lx, ty), `${town.name}: ${lx},${ty}`).toBeNull();
      }
      // A player walks from the door of the hut to the gate.
      const home = s.home();
      const area = reachable(w, home.doorX, home.y1 + 1, -60, TOWN.y0 - 4, 40, home.y1 + 10);
      expect(area.has(key(TOWN_GATE.tx, TOWN_GATE.ty)), `seed ${seed}`).toBe(true);
    }
  });

  it("puts the merchant's cart before Whitegrove, on the road from the hut", () => {
    const cart = source.cart;
    expect(cart.ty).toBeGreaterThan(WHITEGROVE.y1);
    expect(cart.ty).toBeLessThan(source.home().y0);
  });
});

/** What every hamlet checks (hamlets.ts): Whitegrove and Bronzehold, from the south end of their lanes. */
const HAMLETS = [
  { town: WHITEGROVE, entry: WHITEGROVE_SOUTH },
  { town: BRONZEHOLD, entry: BRONZEHOLD_SOUTH },
];

describe.each(HAMLETS)('the hamlet of $town.name', ({ town, entry }) => {
  it('builds each building with a wall ring and one door in the south wall, and a clear doorstep', () => {
    for (const b of town.buildings) {
      expect(world.buildingAt(b.doorX, b.y1)).toBe(b);
      expect(world.structure(b.doorX, b.y1)).toBe(Structure.Door);
      for (let ty = b.y1 + 1; ty <= b.y1 + 3; ty++) {
        for (let tx = b.doorX - 2; tx <= b.doorX + 2; tx++) expect(world.solidBox(tx, ty), `${b.id}: ${tx},${ty}`).toBeNull();
      }
    }
  });

  it('opens the doors of the open buildings, and never the doors of the shut ones; every door and thing is reachable from the road', () => {
    const w = new World(new WildsSource(DEFAULT_SEED));
    const outside = reachable(w, entry[0], entry[1], town.x0, town.y0, town.x1, entry[1]);
    for (const f of town.streetFixtures) {
      const near = fixtureTiles(f).some(([x, y]) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(([nx, ny]) => outside.has(key(nx!, ny!))));
      expect(near, `${f.kind} at ${f.tx},${f.ty}`).toBe(true);
    }
    for (const b of town.buildings) {
      expect(outside.has(key(b.doorX, b.y1 + 1)), b.id).toBe(true);
      const player = createPlayer(b.doorX * TILE_SIZE + 8, (b.y1 + 1) * TILE_SIZE + 4);
      player.facing = 'up';
      expect(useDoor(w, player, b.doorX, b.y1)).toBe(b.locked ? 'locked' : 'opened');
      if (b.locked) continue;
      const inside = reachable(w, b.doorX, b.y1 + 1, b.x0, b.y0, b.x1, b.y1 + 1);
      for (const item of b.fixtures) {
        const near = fixtureTiles(item).some(([x, y]) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(([nx, ny]) => inside.has(key(nx!, ny!))));
        expect(near, `${item.kind} at ${item.tx},${item.ty} in ${b.id}`).toBe(true);
      }
    }
  });

  it('has no thing in its lane that closes a way', () => {
    expect(blockers(town)).toEqual([]);
  });

  it('is safe: no mob lives near it or comes into it', () => {
    const rules = source.mobs();
    for (let ty = town.y0 - 2; ty <= town.y1 + 2; ty++) for (let tx = town.x0 - 2; tx <= town.x1 + 2; tx++) expect(rules.roam(tx, ty, 'skirmisher')).toBe(false);
    for (let ty = town.y0; ty <= town.y1; ty++) for (let tx = town.x0; tx <= town.x1; tx++) expect(rules.hunt(tx, ty)).toBe(false);
  });

  it('has a name sign in the style of the Iron Sovereignty, right outside the south end of its lane, beside the road', () => {
    const sign = HAMLET_SIGNS.find((f) => f.label === town.name)!;
    expect(sign).toMatchObject({ kind: 'namesign', look: 'iron', ty: entry[1] });
    expect(sign.content?.pages?.join(' ')).toContain(`It reads: ${town.name.toUpperCase()}.`);
    const tiles = fixtureTiles(sign);
    expect(tiles.map(([x]) => x)).toEqual([entry[0] - 5, entry[0] - 4, entry[0] - 3]);
    for (const seed of SEEDS) {
      const s = new WildsSource(seed);
      const w = new World(s);
      // West of the road, never on it, with one tile between its east post and the road.
      for (const [tx, ty] of tiles) {
        expect(s.road.on(tx, ty), `${seed}: ${tx},${ty}`).toBe(false);
        expect(w.fixtureAt(tx, ty)).toBe(sign);
      }
      expect(s.road.on(entry[0] - 1, entry[1])).toBe(true);
      expect(s.road.on(entry[0] - 2, entry[1])).toBe(false);
      expect(w.fixturesIn(entry[0] - 5, entry[1], entry[0], entry[1])).toContain(sign);
      // Two posts, and nothing solid between them; no tree or rock round it.
      expect(tiles.map(([x, y]) => w.solidBox(x, y) !== null)).toEqual([true, false, true]);
      for (let ty = entry[1]; ty <= entry[1] + 1; ty++) {
        for (let tx = entry[0] - 6; tx <= entry[0] - 2; tx++) expect([Decor.Tree, Decor.Rock], `${seed}: ${tx},${ty}`).not.toContain(w.decor(tx, ty));
      }
    }
    // A player next to its east post, by the road, reads it.
    const player = createPlayer((entry[0] - 2) * TILE_SIZE + 3, entry[1] * TILE_SIZE + 12);
    player.facing = 'left';
    expect(findInteraction(world, player)).toMatchObject({ kind: 'namesign', fixture: sign });
  });

  it('is a town of the map', () => {
    const mark = source.landmarks().find((l) => l.name === town.name)!;
    expect(mark.kind).toBe('town');
    expect(town.has(Math.floor(mark.x / TILE_SIZE), Math.floor(mark.y / TILE_SIZE))).toBe(true);
  });

  it('is small: its name does not show over the screen when a player comes in', () => {
    expect(town.title).toBe(false);
    expect(source.placeTitles().map((p) => p.title)).not.toContain(town.name);
  });
});

describe('the people of the hamlets', () => {
  it('each have something to say, and walk in an open area in one piece', () => {
    expect(HAMLET_NPCS.map((n) => n.id)).toEqual(['bronzehold-sergeant', 'whitegrove-farmer', 'whitegrove-villager', 'bronzehold-guard']);
    for (const npc of HAMLET_NPCS) {
      expect(WHITEGROVE.has(npc.home[0], npc.home[1]) || BRONZEHOLD.has(npc.home[0], npc.home[1]), npc.id).toBe(true);
      if (npc.content.dialog) expect(checkDialog(npc.content.dialog), npc.id).toEqual([]);
      else expect(npc.content.pages!.length, npc.id).toBeGreaterThanOrEqual(2);
      expect(npc.barks!.length, npc.id).toBeGreaterThanOrEqual(2);
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
  });
});

describe('the shrine of Whitegrove', () => {
  it('is a refuge: its point is open, inside the shrine', () => {
    const w = new World(new WildsSource(DEFAULT_SEED));
    const refuge = source.refuges().find((r) => r.id === 'whitegrove')!;
    expect(refuge.building).toBe(WHITEGROVE_SHRINE.id);
    const tx = Math.floor(refuge.x / TILE_SIZE);
    const ty = Math.floor(refuge.y / TILE_SIZE);
    expect(w.buildingAt(tx, ty)).toBe(WHITEGROVE_SHRINE);
    expect(w.solidBox(tx, ty)).toBeNull();
    expect(refugeAt(w, refuge.x, refuge.y)?.id).toBe('whitegrove');
  });

  it('shows a chalice over its door, not a word', () => {
    expect(WHITEGROVE_SHRINE.emblem).toBe('chalice');
    expect(WHITEGROVE_SHRINE.sign).toBeUndefined();
  });
});

describe('the forest of the tutorial', () => {
  it('has only goblin patrols, round the hut, the hamlets and Ironhold; imps and brutes keep the wildlands north of it', () => {
    const rules = source.mobs();
    const home = source.home();
    expect(home.y0).toBeGreaterThan(FOREST_EDGE_Y);
    expect(WHITEGROVE.y0).toBeGreaterThan(FOREST_EDGE_Y);
    expect(BRONZEHOLD.y0).toBeGreaterThan(FOREST_EDGE_Y);
    // The land round Ironhold is of the forest too; the wildlands start at its north edge.
    expect(TOWN.y0).toBe(FOREST_EDGE_Y);
    // At night the goblin patrols, by day the rare bandits; imps and brutes by day and at night north of it.
    expect(rules.areaAt!(home.doorX, home.y1 + 4)).toBe(FOREST_MOBS);
    expect(rules.areaAt!(TOWN_GATE.tx, TOWN_GATE.ty)).toBe(FOREST_MOBS);
    expect(rules.areaAt!(TOWN.x0 - 4, TOWN.y0 + 4)).toBe(FOREST_MOBS);
    expect(FOREST_MOBS.night).toEqual([{ kind: 'skirmisher', count: 3, behaviour: 'patrol' }]);
    expect(FOREST_MOBS.day.map((s) => [s.kind, s.behaviour, s.group])).toEqual([['bandit', 'ambush', [1, 3]]]);
    const wildlands = rules.areaAt!(TOWN_GATE.tx, TOWN.y0 - 1);
    expect(wildlands).toBe(WILD_MOBS);
    expect(wildlands.night).toEqual([
      { kind: 'imp', count: 4 },
      { kind: 'brute', count: 2 },
    ]);
    // By day fewer, and each one only after a wait (Fede: "less frequent during day").
    expect(wildlands.day).toEqual([
      { kind: 'imp', count: 2, every: 60_000 },
      { kind: 'brute', count: 1, every: 120_000 },
    ]);
    // Somewhere dry in the forest and in the wildlands: each kind only in its own woods.
    let forest = 0;
    let wild = 0;
    for (let ty = FOREST_EDGE_Y + 10; ty < FOREST_EDGE_Y + 60; ty += 3) {
      for (let tx = 30; tx < 90; tx += 3) {
        if (!rules.roam(tx, ty)) continue;
        forest++;
        expect(rules.roam(tx, ty, 'skirmisher')).toBe(true);
        expect(rules.roam(tx, ty, 'bandit')).toBe(true);
        expect(rules.roam(tx, ty, 'imp')).toBe(false);
        expect(rules.roam(tx, ty, 'brute')).toBe(false);
      }
    }
    for (let ty = -80; ty < -30; ty += 3) {
      for (let tx = 30; tx < 90; tx += 3) {
        if (!rules.roam(tx, ty)) continue;
        wild++;
        expect(rules.roam(tx, ty, 'skirmisher')).toBe(false);
        expect(rules.roam(tx, ty, 'bandit')).toBe(false);
        expect(rules.roam(tx, ty, 'imp')).toBe(true);
      }
    }
    expect(forest).toBeGreaterThan(20);
    expect(wild).toBeGreaterThan(20);
  });
});

