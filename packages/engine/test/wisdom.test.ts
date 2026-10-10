import { describe, expect, it } from 'vitest';
import {
  CHUNK_SIZE,
  DRINKS,
  ITEM_KINDS,
  MEDICINE_GATE,
  PLAIN_SCORES,
  Room,
  Spoils,
  TILE_SIZE,
  World,
  createPlayer,
  drinkFrom,
  findInteraction,
  fixtureTiles,
  random,
  traitsOf,
  type Fixture,
  type LootTable,
  type Scores,
  type SnapshotMessage,
  type WorldSource,
} from '../src/index.ts';
import { houseSource, mobHouseSource } from './helpers.ts';

const withWis = (wis: number) => traitsOf({ ...PLAIN_SCORES, wis } as Scores, 'fighter');

/** A patch of herbs on the grass south of the house, at (12, 12): hidden, and it grows again after 20 minutes. */
const PATCH: Fixture = { kind: 'herbpatch', tx: 12, ty: 12, hidden: true };
const HERBS: LootTable = { items: [{ chance: 1, pick: [['herbs', 1]] }], refillMs: 20 * 60_000 };

function herbSource(): WorldSource {
  const base = houseSource();
  return {
    ...base,
    chunk(cx, cy) {
      const chunk = base.chunk(cx, cy);
      const [tx, ty, code] = fixtureTiles(PATCH)[0]!;
      if (Math.floor(tx / CHUNK_SIZE) === cx && Math.floor(ty / CHUNK_SIZE) === cy) chunk.structure[(ty - cy * CHUNK_SIZE) * CHUNK_SIZE + (tx - cx * CHUNK_SIZE)] = code;
      return chunk;
    },
    fixtureAt: (tx, ty) => (tx === PATCH.tx && ty === PATCH.ty ? PATCH : base.fixtureAt(tx, ty)),
    fixturesIn: () => [PATCH],
    loot: (fixture) => (fixture.kind === 'herbpatch' ? HERBS : null),
  };
}

describe('the traits of Wisdom', () => {
  it('scale the sense of danger, the eye for hidden things and the night', () => {
    expect([withWis(8).sense, withWis(10).sense, withWis(16).sense]).toEqual([6 * TILE_SIZE, 8 * TILE_SIZE, 14 * TILE_SIZE]);
    expect([withWis(8).seek, withWis(10).seek, withWis(17).seek]).toEqual([1 * TILE_SIZE, 3 * TILE_SIZE, 9 * TILE_SIZE]);
    expect(withWis(8).night).toBeCloseTo(1.08);
    expect(withWis(10).night).toBe(1);
    expect(withWis(16).night).toBeCloseTo(0.76);
  });
});

describe('Medicine', () => {
  it('lets a character with WIS 13 chew a bundle of herbs for a hit point', () => {
    expect(DRINKS.herbs).toEqual({ hp: 1, gate: MEDICINE_GATE });
    const pack = { coins: 0, items: [{ kind: 'herbs' as const, count: 2 }] };
    const p = createPlayer(0, 0);
    p.hp = 1;
    expect(drinkFrom(pack, 'herbs', p, withWis(12))).toBeNull();
    expect(p.hp).toBe(1);
    expect(drinkFrom(pack, 'herbs', p, withWis(13))).toEqual({ coins: 0, items: [{ kind: 'herbs', count: 1 }] });
    expect(p.hp).toBe(2);
  });

  it('is checked by the server', () => {
    const room = new Room(new World(houseSource()));
    const pack = { coins: 0, items: [{ kind: 'herbs' as const, count: 1 }] };
    const dull = room.join(0, 1, undefined, '', undefined, { traits: withWis(12), hp: 1, pack })!;
    const wise = room.join(0, 2, undefined, '', undefined, { traits: withWis(14), hp: 1, pack })!;
    for (const p of [dull, wise]) room.drink(p.id, ITEM_KINDS.indexOf('herbs'));
    expect(dull.state.hp).toBe(1);
    expect(dull.pack.items).toEqual([{ kind: 'herbs', count: 1 }]);
    expect(wise.state.hp).toBe(2);
    expect(wise.pack.items).toEqual([]);
  });
});

describe('hidden herbs', () => {
  it('are a target, though they do not collide', () => {
    const world = new World(herbSource());
    expect(world.solidBox(12, 12)).toBeNull();
    const p = createPlayer(12 * TILE_SIZE + 8, 11 * TILE_SIZE + 12);
    p.facing = 'down';
    expect(findInteraction(world, p, () => true)?.fixture).toBe(PATCH);
  });

  it('give a bundle to the first player, and grow again after 20 minutes', () => {
    const world = new World(herbSource());
    const spoils = new Spoils(world, random(1));
    const traits = withWis(10);
    const empty = { coins: 0, items: [] };
    const first = spoils.open(PATCH, empty, traits, 0);
    expect(first !== null && first !== 'locked' && first.pack.items).toEqual([{ kind: 'herbs', count: 1 }]);
    const second = spoils.open(PATCH, empty, traits, 1000);
    expect(second !== null && second !== 'locked' && second.taken.items).toEqual([]);
    spoils.tick(19 * 60_000, []);
    const early = spoils.open(PATCH, empty, traits, 19 * 60_000);
    expect(early !== null && early !== 'locked' && early.taken.items).toEqual([]);
    spoils.tick(20 * 60_000 + 1000, []);
    const later = spoils.open(PATCH, empty, traits, 20 * 60_000 + 1000);
    expect(later !== null && later !== 'locked' && later.taken.items).toEqual([{ kind: 'herbs', count: 1 }]);
  });
});

describe('the mobs that hunt a player', () => {
  it('are in its snapshot, and only in its own', () => {
    const room = new Room(new World(mobHouseSource()));
    const a = room.join(0, 1, [5, 12], '', undefined, { traits: withWis(10) })!;
    const b = room.join(0, 2, [30, 30], '', undefined, { traits: withWis(10) })!;
    const horde = room.horde!;
    const imp = horde.spawn('imp', a.state.x + 14, a.state.y);
    const idle = horde.spawn('imp', a.state.x - 60, a.state.y);
    // A blow makes the imp go for its attacker.
    horde.strike(a.state, 0, undefined, a.id, { damage: 1, push: 1, stagger: 1, opening: 0 });
    expect(horde.huntersOf(a.id).map((m) => m.id)).toEqual([imp.id]);
    expect(horde.huntersOf(b.id)).toEqual([]);
    const snaps = new Map<number, SnapshotMessage>();
    room.broadcast(0, (id, m) => snaps.set(id, m));
    expect(snaps.get(a.id)!.h).toEqual([imp.id]);
    expect(snaps.get(b.id)!.h).toBeUndefined();
    expect(snaps.get(a.id)!.h).not.toContain(idle.id);
  });
});
