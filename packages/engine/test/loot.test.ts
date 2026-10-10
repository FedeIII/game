import { describe, expect, it } from 'vitest';
import {
  ABILITIES,
  EMPTY_PACK,
  REBAR_MS,
  REBAR_RADIUS,
  REFILL_MS,
  Spoils,
  TILE_SIZE,
  World,
  createPlayer,
  random,
  traitsOf,
  useDoor,
  type Ability,
} from '../src/index.ts';
import { LOOT_CHEST, lootHouseSource } from './helpers.ts';

const withStr = (str: number) => traitsOf({ ...(Object.fromEntries(ABILITIES.map((a) => [a, 10])) as Record<Ability, number>), str }, 'fighter');
/** Someone at the door of the house (5, 6), and someone far away. */
const AT_DOOR = { x: 5 * TILE_SIZE + 8, y: 7 * TILE_SIZE + 4 };
const FAR = { x: (REBAR_RADIUS + 10) * TILE_SIZE, y: 0 };

describe('a chest', () => {
  it('gives its loot once, then it is empty, and it fills again after REFILL_MS', () => {
    const spoils = new Spoils(new World(lootHouseSource()), random(1));
    const first = spoils.open(LOOT_CHEST, EMPTY_PACK, 6, 0)!;
    expect(first.taken).toEqual({ coins: 3, items: [{ kind: 'ring', count: 1 }] });
    expect(first.pack).toEqual({ coins: 3, items: [{ kind: 'ring', count: 1 }] });
    expect(first.full).toBe(false);
    expect(spoils.open(LOOT_CHEST, first.pack, 6, 1000)!.taken).toEqual({ coins: 0, items: [] });
    spoils.tick(REFILL_MS - 1, []);
    expect(spoils.open(LOOT_CHEST, first.pack, 6, REFILL_MS - 1)!.taken.coins).toBe(0);
    spoils.tick(REFILL_MS + 1000, []);
    expect(spoils.open(LOOT_CHEST, first.pack, 6, REFILL_MS + 1000)!.taken.coins).toBe(3);
  });

  it('keeps what does not fit in a full pack', () => {
    const spoils = new Spoils(new World(lootHouseSource()), random(1));
    const full = { coins: 0, items: [{ kind: 'cup' as const, count: 1 }] };
    const opened = spoils.open(LOOT_CHEST, full, 1, 0)!;
    expect(opened.taken).toEqual({ coins: 3, items: [] });
    expect(opened.full).toBe(true);
    // With room, the ring that stayed in it comes out.
    expect(spoils.open(LOOT_CHEST, opened.pack, 2, 10)!.taken).toEqual({ coins: 0, items: [{ kind: 'ring', count: 1 }] });
  });

  it('is not a source of loot without a loot table', () => {
    const spoils = new Spoils(new World(lootHouseSource()), random(1));
    expect(spoils.isSource(LOOT_CHEST)).toBe(true);
    expect(spoils.isSource({ kind: 'barrel', tx: 3, ty: 3 })).toBe(false);
    expect(spoils.open({ kind: 'barrel', tx: 3, ty: 3 }, EMPTY_PACK, 6, 0)).toBeNull();
  });
});

describe('a barred door', () => {
  it('stays closed for a character with STR 12, and its boards break for STR 13', () => {
    const world = new World(lootHouseSource(true));
    const p = createPlayer(AT_DOOR.x, AT_DOOR.y);
    expect(useDoor(world, p, 5, 6)).toBe('barred');
    expect(useDoor(world, p, 5, 6, [], withStr(12))).toBe('barred');
    expect(world.isDoorOpen(5, 6)).toBe(false);
    expect(useDoor(world, p, 5, 6, [], withStr(13))).toBe('forced');
    expect(world.isDoorOpen(5, 6)).toBe(true);
    expect(world.forcedDoorList()).toEqual([[5, 6]]);
    // Now it is an ordinary door, for everyone.
    expect(world.doorBar(5, 6)).toBeNull();
    p.y += 8;
    expect(useDoor(world, p, 5, 6)).toBe('closed');
    expect(useDoor(world, p, 5, 6)).toBe('opened');
  });

  it('gets its boards again after REBAR_MS with nobody near, and the chest inside fills again', () => {
    const world = new World(lootHouseSource(true));
    const spoils = new Spoils(world, random(2));
    useDoor(world, createPlayer(AT_DOOR.x, AT_DOOR.y), 5, 6, [], withStr(14));
    spoils.tick(0, [AT_DOOR]);
    const looted = spoils.open(LOOT_CHEST, EMPTY_PACK, 6, 0)!;
    expect(looted.taken.coins).toBe(3);
    // A chest in a barred house does not fill by itself.
    spoils.tick(REFILL_MS + 1000, [AT_DOOR]);
    expect(spoils.open(LOOT_CHEST, looted.pack, 6, REFILL_MS + 1000)!.taken.coins).toBe(0);
    // While someone is near, the boards do not come back.
    expect(spoils.tick(REFILL_MS + REBAR_MS, [AT_DOOR])).toBe(false);
    expect(world.doorBar(5, 6)).toBeNull();
    // Nobody near: the time counts from the last one who was.
    const last = REFILL_MS + REBAR_MS;
    expect(spoils.tick(last + REBAR_MS - 1000, [FAR])).toBe(false);
    expect(spoils.tick(last + REBAR_MS + 1000, [FAR])).toBe(true);
    expect(world.doorBar(5, 6)).toEqual({ ability: 'str', min: 13 });
    expect(world.isDoorOpen(5, 6)).toBe(false);
    expect(spoils.open(LOOT_CHEST, looted.pack, 6, last + REBAR_MS + 2000)!.taken.coins).toBe(3);
  });
});
