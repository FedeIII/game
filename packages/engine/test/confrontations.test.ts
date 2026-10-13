import { describe, expect, it } from 'vitest';
import {
  AVERAGE_DICE,
  Confrontations,
  Horde,
  SETTLE_MS,
  TICK_SECONDS,
  TILE_SIZE,
  WAIT_MS,
  World,
  applyEffect,
  createPlayer,
  holds,
  type ConfrontationDef,
  type ConfrontationPlayer,
  type MobRules,
  type QuestBook,
} from '../src/index.ts';
import { EMPTY_PACK } from '../src/index.ts';
import { textSource } from './helpers.ts';

/**
 * A sure confrontation (Fede, 2026-10-13: "force a single confrontation with goblins for new players if
 * they are there during the day"): a group that a character meets once, ahead of it, by day.
 */

const TICK_MS = TICK_SECONDS * 1000;
/** Mobs may go everywhere east of x = -20 (west of it: a town). No mob comes by itself. */
const rules: MobRules = { roam: (tx) => tx > -20, hunt: (tx) => tx > -20, population: {} };
const DEF: ConfrontationDef = {
  id: 'first-goblins',
  kind: 'skirmisher',
  when: [
    { quest: 'road', at: ['go'] },
    { quest: 'road', flag: 'goblins', not: true },
  ],
  area: { x0: -Infinity, y0: 0, x1: Infinity, y1: Infinity },
  hours: 'day',
  met: { id: 'goblins-met', quest: 'road', from: ['go'], flag: 'goblins' },
};
const ON_ROAD: QuestBook = { road: { step: 'go', flags: [], n: 1 } };

/** A character whose book the test changes. */
interface Character {
  readonly id: number;
  readonly state: ConfrontationPlayer['state'];
  quests: QuestBook;
  readonly pack: ConfrontationPlayer['pack'];
}

function setup(tx = 0, ty = 10): { horde: Horde; confront: Confrontations; player: Character } {
  const horde = new Horde(new World(textSource([])), rules, 3, AVERAGE_DICE);
  horde.daytime = true;
  const state = createPlayer(tx * TILE_SIZE + 8, ty * TILE_SIZE + 12);
  state.hp = 1000;
  return { horde, confront: new Confrontations([DEF]), player: { id: 1, state, quests: ON_ROAD, pack: EMPTY_PACK } };
}

/** Runs the horde and the confrontations for `ms`, and applies their effects to the book, as the Room does; returns the effects. */
function run(horde: Horde, confront: Confrontations, player: Character, ms: number): string[] {
  const out: string[] = [];
  for (let t = 0; t < ms; t += TICK_MS) {
    horde.step(TICK_MS, [player]);
    for (const { effect } of confront.step(TICK_MS, horde, [player])) {
      out.push(effect.id);
      player.quests = applyEffect(effect, player.quests, player.pack, 6)!.book;
    }
  }
  return out;
}

describe('a quest condition with a flag', () => {
  it('holds when the quest has the flag, and `not` turns it round', () => {
    const flagged: QuestBook = { road: { step: 'go', flags: ['goblins'], n: 1 } };
    expect(holds({ quest: 'road', flag: 'goblins' }, flagged, EMPTY_PACK)).toBe(true);
    expect(holds({ quest: 'road', flag: 'goblins' }, ON_ROAD, EMPTY_PACK)).toBe(false);
    expect(holds(DEF.when, ON_ROAD, EMPTY_PACK)).toBe(true);
    expect(holds(DEF.when, flagged, EMPTY_PACK)).toBe(false);
    expect(holds(DEF.when, {}, EMPTY_PACK)).toBe(false);
  });
});

describe('a sure confrontation', () => {
  it('brings one group ahead of the character by day, after it is a moment in the area', () => {
    const { horde, confront, player } = setup();
    run(horde, confront, player, SETTLE_MS - 500);
    expect(horde.mobs).toEqual([]);
    run(horde, confront, player, 1000);
    expect(horde.mobs.length).toBeGreaterThanOrEqual(2);
    expect(horde.mobs.length).toBeLessThanOrEqual(3);
    expect(horde.mobs.every((m) => m.kind === 'skirmisher')).toBe(true);
    // Ahead of it (it faces down: south), out of its view.
    const lead = horde.mobs[0]!;
    expect(lead.y).toBeGreaterThan(player.state.y);
    expect(Math.hypot(lead.x - player.state.x, lead.y - player.state.y)).toBeGreaterThan(16 * TILE_SIZE);
    // One group only.
    run(horde, confront, player, 20_000);
    expect(new Set(horde.mobs.map((m) => m.id)).size).toBeLessThanOrEqual(3);
  });

  it('is done when the group hunts the character: `met` applies once', () => {
    const { horde, confront, player } = setup();
    run(horde, confront, player, SETTLE_MS + 500);
    const lead = horde.mobs[0]!;
    // The character walks up to the patrol: it startles and hunts.
    player.state.x = lead.x;
    player.state.y = lead.y - 5 * TILE_SIZE;
    const effects = run(horde, confront, player, 2000);
    expect(effects).toEqual(['goblins-met']);
    expect(player.quests.road!.flags).toEqual(['goblins']);
  });

  it('brings nothing at night, outside its area, in a town, or for a character with the flag', () => {
    const night = setup();
    night.horde.daytime = false;
    run(night.horde, night.confront, night.player, SETTLE_MS * 3);
    expect(night.horde.mobs).toEqual([]);
    const north = setup(0, -10);
    run(north.horde, north.confront, north.player, SETTLE_MS * 3);
    expect(north.horde.mobs).toEqual([]);
    const town = setup(-30, 10);
    run(town.horde, town.confront, town.player, SETTLE_MS * 3);
    expect(town.horde.mobs).toEqual([]);
    const done = setup();
    done.player = { ...done.player, quests: { road: { step: 'go', flags: ['goblins'], n: 1 } } };
    run(done.horde, done.confront, done.player, SETTLE_MS * 3);
    expect(done.horde.mobs).toEqual([]);
  });

  it('brings the group again ahead of the character when it waited in vain, out of view', () => {
    const { horde, confront, player } = setup();
    run(horde, confront, player, SETTLE_MS + 500);
    const first = horde.mobs.map((m) => m.id);
    expect(first.length).toBeGreaterThan(0);
    // The character goes far away to the east; the old group goes, and a new one comes ahead of it.
    player.state.x += 60 * TILE_SIZE;
    player.state.facing = 'right';
    run(horde, confront, player, WAIT_MS + SETTLE_MS + 2000);
    const now = horde.mobs.filter((m) => m.state !== 'dying');
    expect(now.length).toBeGreaterThan(0);
    expect(now.every((m) => !first.includes(m.id))).toBe(true);
    expect(now.every((m) => m.x > player.state.x)).toBe(true);
  });
});
