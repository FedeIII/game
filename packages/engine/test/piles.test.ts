import { describe, expect, it } from 'vitest';
import {
  ABILITIES,
  EMPTY_PACK,
  ITEM_KINDS,
  ITEM_STACK,
  MAX_PILES,
  PILE_MS,
  Piles,
  Room,
  TILE_SIZE,
  World,
  canReachPile,
  createPlayer,
  dropPoint,
  findInteraction,
  fromWirePiles,
  parseClientMessage,
  toWirePile,
  traitsOf,
  type Ability,
  type ItemStack,
  type Pack,
  type PlayerTraits,
  type SnapshotMessage,
} from '../src/index.ts';
import { houseSource, mobHouseSource, textSource } from './helpers.ts';

const strength = (str: number): PlayerTraits =>
  traitsOf({ ...(Object.fromEntries(ABILITIES.map((a) => [a, 10])) as Record<Ability, number>), str }, 'fighter');
const stack = (kind: ItemStack['kind'], count: number): ItemStack => ({ kind, count });

/** The last snapshot that the room sends to player `id`. */
function snapshotOf(room: Room, id: number, nowMs = 0): SnapshotMessage {
  let found: SnapshotMessage | null = null;
  room.broadcast(nowMs, (to, m) => {
    if (to === id) found = m;
  });
  return found!;
}

describe('piles on the ground', () => {
  it('lays a stack at the point, and another kind on a free spot near it', () => {
    const piles = new Piles(new World(textSource([])));
    const [a] = piles.put(100.4, 200.6, [stack('ring', 2)], 0);
    expect(a).toMatchObject({ x: 100, y: 201, kind: 'ring', count: 2 });
    const [b] = piles.put(100, 201, [stack('cup', 1)], 0);
    expect(Math.hypot(b!.x - a!.x, b!.y - a!.y)).toBeGreaterThanOrEqual(8);
    expect(piles.size).toBe(2);
  });

  it('puts a stack onto a pile of its kind close by, up to the stack, then starts a new pile', () => {
    const piles = new Piles(new World(textSource([])));
    piles.put(100, 100, [stack('candle', 3)], 0);
    piles.put(102, 101, [stack('candle', 4)], 0);
    expect(piles.list.map((p) => p.count)).toEqual([ITEM_STACK.candle, 2]);
  });

  it('never lays a pile in a wall, a tree or water, and keeps the piles apart', () => {
    // Water on the tiles x 0..2, grass east of it. The point is in the water, 8 px from the shore.
    const world = new World(textSource(['~~~', '~~~', '~~~']));
    const piles = new Piles(world);
    for (const kind of ['ring', 'cup', 'candle'] as const) piles.put(40, 24, [stack(kind, 1)], 0);
    for (const pile of piles.list) {
      expect(world.solidBox(Math.floor(pile.x / TILE_SIZE), Math.floor(pile.y / TILE_SIZE))).toBeNull();
      for (const other of piles.list) if (other !== pile) expect(Math.hypot(other.x - pile.x, other.y - pile.y)).toBeGreaterThanOrEqual(8);
    }
    // With no free spot at all (the middle of a lake), a pile lies on the point itself.
    expect(piles.put(24, 24, [stack('herbs', 1)], 0)[0]).toMatchObject({ x: 24, y: 24 });
  });

  it('drops a stack in front of the player, but never through a wall', () => {
    const world = new World(houseSource());
    // Inside the house, facing the north wall (its inside face is at y = 48): at the feet.
    const inside = { x: 4 * TILE_SIZE + 8, y: 3 * TILE_SIZE + 4, facing: 'up' as const };
    expect(dropPoint(world, inside)).toEqual({ x: inside.x, y: inside.y });
    // Outside, facing open grass: 10 px ahead.
    expect(dropPoint(world, { x: 40, y: 200, facing: 'right' })).toEqual({ x: 50, y: 200 });
    // The free spots round a point next to the wall stay on its side of the wall.
    const piles = new Piles(world);
    for (const kind of ITEM_KINDS) piles.put(inside.x, inside.y, [stack(kind, 1)], 0);
    for (const pile of piles.list) expect(pile.y).toBeGreaterThanOrEqual(3 * TILE_SIZE);
  });

  it('gives what fits, and leaves the rest on the ground', () => {
    const piles = new Piles(new World(textSource([])));
    const [pile] = piles.put(0, 0, [stack('herbs', 7)], 0);
    const nearly: Pack = { coins: 0, items: [stack('herbs', 5)] };
    const result = piles.take(pile!.id, nearly, 1)!;
    expect(result.pack.items).toEqual([stack('herbs', 10)]);
    expect(result.left.items).toEqual([stack('herbs', 2)]);
    expect(piles.get(pile!.id)!.count).toBe(2);
    // A full pack takes nothing, and the pile stays as it is.
    const full: Pack = { coins: 0, items: [stack('cup', 1)] };
    const version = piles.version;
    expect(piles.take(pile!.id, full, 1)!.taken.items).toEqual([]);
    expect(piles.version).toBe(version);
    expect(piles.take(pile!.id, EMPTY_PACK, 4)!.pack.items).toEqual([stack('herbs', 2)]);
    expect(piles.get(pile!.id)).toBeNull();
    expect(piles.take(pile!.id, EMPTY_PACK, 4)).toBeNull();
  });

  it(`clears a pile after ${PILE_MS / 60_000} minutes, and the oldest ones beyond ${MAX_PILES}`, () => {
    const piles = new Piles(new World(textSource([])));
    piles.put(0, 0, [stack('ring', 1)], 0);
    expect(piles.tick(PILE_MS - 1)).toBe(false);
    expect(piles.tick(PILE_MS)).toBe(true);
    expect(piles.size).toBe(0);
    for (let i = 0; i <= MAX_PILES; i++) piles.put(i * 40, 0, [stack('cup', 1)], 0);
    expect(piles.size).toBe(MAX_PILES);
    expect(piles.list[0]!.x).toBe(40);
  });

  it('is a target of the action button within the reach of every action', () => {
    const world = new World(textSource([]));
    const player = createPlayer(100, 100);
    const pile = { id: 1, x: 100, y: 110, kind: 'ring' as const, count: 1 };
    expect(canReachPile(player, pile)).toBe(true);
    expect(findInteraction(world, player, () => true, [], [pile])?.pile).toBe(pile);
    // A pile under the feet wins over a thing in front of the player (a door, a tree).
    const tree = new World(textSource(['', '', '', '', '', '', '.T']));
    const below = createPlayer(16 + 8, 6 * 16 + 2);
    expect(findInteraction(tree, below)?.kind).toBe('tree');
    expect(findInteraction(tree, below, () => true, [], [{ ...pile, x: below.x, y: below.y }])?.kind).toBe('pile');
    const far = { ...pile, y: 130 };
    expect(canReachPile(player, far)).toBe(false);
    expect(findInteraction(world, player, () => true, [], [far])).toBeNull();
  });

  it('goes on the wire as [id, x, y, item code, count]', () => {
    const pile = { id: 7, x: 3, y: -4, kind: 'antidote' as const, count: 2 };
    expect(toWirePile(pile)).toEqual([7, 3, -4, ITEM_KINDS.indexOf('antidote'), 2]);
    expect(fromWirePiles([toWirePile(pile), [8, 0, 0, 999, 1]])).toEqual([pile]);
  });
});

describe('piles in a shared world', () => {
  it('reads the messages to drop and to pick up', () => {
    expect(parseClientMessage('{"t":"put","kind":3,"count":2}')).toEqual({ t: 'put', kind: 3, count: 2 });
    expect(parseClientMessage('{"t":"put","kind":3,"count":6}')).toBeNull();
    expect(parseClientMessage('{"t":"put","kind":99,"count":1}')).toBeNull();
    expect(parseClientMessage('{"t":"put","kind":"0","count":1}')).toBeNull();
    expect(parseClientMessage('{"t":"in","s":1,"i":[[0,0]],"g":[[1,5]]}')).toEqual({ t: 'in', s: 1, i: [[0, 0]], g: [[1, 5]] });
    expect(parseClientMessage('{"t":"in","s":1,"i":[[0,0]],"g":[[1,5],[1,6],[1,7]]}')).toBeNull();
    expect(parseClientMessage('{"t":"in","s":1,"i":[[0,0]],"g":[[1,-5]]}')).toBeNull();
  });

  it('lets a player drop items where it stands, and another one pick them up', () => {
    const room = new Room(new World(houseSource()));
    const a = room.join(0, 1, [5, 10], '', undefined, { traits: strength(10), pack: { coins: 0, items: [stack('ring', 3)] } })!;
    const b = room.join(0, 2, [5, 10], '', undefined, { traits: strength(10) })!;
    expect(room.welcome(b).pl).toEqual([]);
    room.put(a.id, ITEM_KINDS.indexOf('ring'), 2, 0);
    expect(a.pack.items).toEqual([stack('ring', 1)]);
    // More than the pack holds: nothing happens.
    room.put(a.id, ITEM_KINDS.indexOf('ring'), 2, 0);
    expect(a.pack.items).toEqual([stack('ring', 1)]);
    const [pile] = room.piles.list;
    expect(pile).toMatchObject({ kind: 'ring', count: 2 });
    // A little in front of the player (it faces down at the start), where it can see the pile and reach it.
    expect(a.state.facing).toBe('down');
    expect(pile!.y - a.state.y).toBeGreaterThan(5);
    expect(canReachPile(a.state, pile!)).toBe(true);
    const seen = snapshotOf(room, b.id);
    expect(seen.pk).toBeUndefined();
    expect(seen.pl).toEqual([toWirePile(pile!)]);
    // The piles go only when they change.
    expect(snapshotOf(room, b.id).pl).toBeUndefined();
    room.input(b.id, { t: 'in', s: 1, i: [[0, 0]], g: [[1, pile!.id]] }, 10);
    expect(b.pack.items).toEqual([stack('ring', 2)]);
    const got = snapshotOf(room, b.id);
    expect(got.l).toEqual([[3, 0, [[ITEM_KINDS.indexOf('ring'), 2]], 0]]);
    expect(got.pl).toEqual([]);
  });

  it('gives a pile only to a player who can reach it', () => {
    const room = new Room(new World(houseSource()));
    const a = room.join(0, 1, [5, 10], '', undefined, { traits: strength(10), pack: { coins: 0, items: [stack('cup', 1)] } })!;
    const far = room.join(0, 2, [12, 10], '', undefined, { traits: strength(10) })!;
    room.put(a.id, ITEM_KINDS.indexOf('cup'), 1, 0);
    room.input(far.id, { t: 'in', s: 1, i: [[0, 0]], g: [[1, room.piles.list[0]!.id]] }, 10);
    expect(far.pack).toEqual(EMPTY_PACK);
    expect(room.piles.size).toBe(1);
  });

  it('lays what does not fit in the pack of the killer on the ground at the mob', () => {
    const room = new Room(new World(mobHouseSource()));
    // Six slots, each with a full stack of something else: a tusk cannot go in.
    const full: Pack = { coins: 0, items: [stack('imp-horn', 10), stack('candle', 5), stack('ring', 5), stack('cup', 5), stack('herbs', 10), stack('draught', 5)] };
    const p = room.join(0, 1, [5, 10], '', undefined, { traits: strength(10), pack: full })!;
    const quiet = Array.from({ length: 29 }, () => [0, 0] as const);
    let seq = 1;
    for (let kill = 0; kill < 20 && room.piles.size === 0; kill++) {
      const brute = room.horde!.spawn('brute', p.state.x + 20, p.state.y);
      const inputs = [[0, 0, 4], ...quiet, [0, 0, 4], ...quiet, [0, 0, 4], ...quiet] as const;
      room.input(p.id, { t: 'in', s: seq, i: inputs as never }, 100 + kill * 2000);
      seq += inputs.length;
      expect(brute.state).toBe('dying');
      room.tick(1000 + kill * 2000);
      room.tick(2000 + kill * 2000);
    }
    const [pile] = room.piles.list;
    expect(pile).toMatchObject({ kind: 'brute-tusk', count: 1 });
    expect(Math.abs(pile!.x - (p.state.x + 20))).toBeLessThanOrEqual(20);
    expect(p.pack.items).toEqual(full.items);
    expect(p.pack.coins).toBeGreaterThan(0);
  });
});
