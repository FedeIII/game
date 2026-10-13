import { describe, expect, it } from 'vitest';
import { AVERAGE_DICE, GUEST_TRAITS, Room, SETTLE_MS, TILE_SIZE, World, clockAtHour, type QuestBook } from '@game/engine';
import { FIRST_GOBLINS, FOREST_EDGE_Y, WildsSource, wilds } from '../src/index.ts';

/**
 * A new character on the road to Ironhold meets one patrol of goblins in the forest by day (Fede,
 * 2026-10-13: "force a single confrontation with goblins for new players if they are there during the
 * day"). The server owns it: the Room brings the patrol and sets the flag of the road.
 */

const ON_ROAD: QuestBook = { road: { step: 'go', flags: [], n: 1 } };
const at = (tx: number, ty: number) => ({ x: tx * TILE_SIZE + 8, y: ty * TILE_SIZE + 12 });

function noon(): Room {
  return new Room(new World(new WildsSource(1)), { dice: AVERAGE_DICE, day: wilds.day, clock: () => clockAtHour(12, wilds.day!) });
}

/** Ticks the room every 50 ms from `from` for `ms`; returns the time at the end. */
function tick(room: Room, from: number, ms: number): number {
  let t = from;
  for (; t < from + ms; t += 50) room.tick(t);
  return t;
}

describe('the first goblins of a new character', () => {
  it('is a confrontation of the goblins in the forest, by day, for a character on the road without the flag', () => {
    expect(FIRST_GOBLINS.kind).toBe('skirmisher');
    expect(FIRST_GOBLINS.hours).toBe('day');
    expect(FIRST_GOBLINS.area.y0).toBeGreaterThan(FOREST_EDGE_Y);
    expect(FIRST_GOBLINS.met).toMatchObject({ quest: 'road', from: ['go'], flag: 'goblins' });
    expect(new WildsSource(1).confrontations()).toEqual([FIRST_GOBLINS]);
  });

  it('brings one patrol by day; when it hunts the character, the road gets its flag, and no other patrol comes', () => {
    const room = noon();
    const player = room.join(0, 1, undefined, '', at(10, 112), { traits: GUEST_TRAITS, quests: ON_ROAD })!;
    let t = tick(room, 0, SETTLE_MS + 1500);
    const goblins = room.horde!.mobs.filter((m) => m.kind === 'skirmisher');
    expect(goblins.length).toBeGreaterThanOrEqual(2);
    // The character walks up to the patrol: it startles and hunts, and the meeting is done.
    player.state.x = goblins[0]!.x;
    player.state.y = goblins[0]!.y - 5 * TILE_SIZE;
    t = tick(room, t, 2000);
    expect(player.quests.road!.flags).toEqual(['goblins']);
    expect(room.takeQuestSaves()).toContain(player.id);
    // Elsewhere in the forest by day, no patrol comes for it any more.
    const seen = new Set(room.horde!.mobs.map((m) => m.id));
    player.state.x = at(60, 112).x;
    player.state.y = at(60, 112).y;
    player.state.hp = 100;
    player.state.down = 0;
    tick(room, t, SETTLE_MS * 4);
    expect(room.horde!.mobs.filter((m) => m.kind === 'skirmisher' && !seen.has(m.id))).toEqual([]);
  });

  it('brings none to a character that came to Ironhold, or that did not read the letter', () => {
    for (const quests of [{ road: { step: 'arrived', flags: [], n: 1 } }, {}] as QuestBook[]) {
      const room = noon();
      room.join(0, 1, undefined, '', at(10, 112), { traits: GUEST_TRAITS, quests });
      tick(room, 0, SETTLE_MS * 4);
      expect(room.horde!.mobs.filter((m) => m.kind === 'skirmisher')).toEqual([]);
    }
  });
});
