import { describe, expect, it } from 'vitest';
import {
  BRACE_TICKS,
  Horde,
  NO_INPUT,
  TICK_SECONDS,
  World,
  braceGrade,
  createPlayer,
  lateBraceAc,
  stepPlayer,
  type DiceSource,
  type HordePlayer,
  type Mechanic,
  type MechanicEvent,
  type Mob,
  type MobHit,
  type MobKind,
  type MobRules,
  type PlayerState,
} from '../src/index.ts';
import { textSource } from './helpers.ts';

/**
 * The mechanics of the melee draft (mechanics.ts; docs/drafts/combat-melee.md), which only the sandbox
 * of an admin turns on: each one changes the fight only with its switch.
 */

const TICK_MS = TICK_SECONDS * 1000;
const open: MobRules = { roam: () => true, hunt: () => true, population: {} };
const world = new World(textSource([]));

/** Dice whose d20s show these faces, round and round (other dice too). */
function faces(...naturals: number[]): DiceSource {
  let i = 0;
  return { kind: 'roll', random: () => (naturals[i++ % naturals.length]! - 0.5) / 20 };
}

function tough(x: number, y: number): PlayerState {
  const p = createPlayer(x, y);
  p.hp = 1000;
  return p;
}

/** A horde with the mechanics `on`, one steady mob of `kind` 1 tile east of a player that it hunts. */
function duel(on: readonly Mechanic[], dice: DiceSource, kind: MobKind = 'skirmisher', traits: HordePlayer['traits'] = { ac: 10, braceAc: 4 }) {
  const horde = new Horde(world, open, 1, dice);
  horde.mechanics = new Set(on);
  const state = tough(100, 100);
  const player: HordePlayer = { id: 1, state, traits };
  const mob = horde.spawn(kind, 114, 100, { steady: true });
  horde.provoke(mob, 1, state);
  return { horde, player, state, mob };
}

/** Runs the horde (the player does not move) until the mob's wind-up has `left` ms or less; returns false if it never winds up. */
function untilWindup(horde: Horde, player: HordePlayer, mob: Mob, left = 0): boolean {
  for (let t = 0; t < 5000; t += TICK_MS) {
    if (mob.state === 'windup' && (horde as unknown as { brains: Map<number, { timerMs: number }> }).brains.get(mob.id)!.timerMs <= left) return true;
    horde.step(TICK_MS, [player]);
  }
  return false;
}

/** Runs the horde until the mob's blow lands; returns its attack and the events of the mechanics. */
function blow(horde: Horde, player: HordePlayer, mob: Mob): { hit: MobHit | undefined; events: MechanicEvent[] } {
  expect(untilWindup(horde, player, mob, 1000)).toBe(true);
  for (let t = 0; t < 2000 && mob.state === 'windup'; t += TICK_MS) {
    const hit = horde.step(TICK_MS, [player]).find(([m]) => m === mob.id);
    if (hit) return { hit, events: horde.takeEvents() };
  }
  return { hit: undefined, events: horde.takeEvents() };
}

describe('1. the grades of a brace', () => {
  it('grade a brace by its age: sharp in its first 6 ticks, clean to 12, late after', () => {
    expect([1, 6, 7, 12, 13, 100].map(braceGrade)).toEqual(['sharp', 'sharp', 'clean', 'clean', 'late', 'late']);
    expect([lateBraceAc(4), lateBraceAc(5), lateBraceAc(1)]).toEqual([2, 2, 1]);
  });

  it('count the ticks of a brace from its start, also in a jump', () => {
    const p = createPlayer(100, 100);
    stepPlayer(p, { x: 0, y: 0, attack: 0 }, world, { brace: true });
    for (let i = 0; i < 18; i++) stepPlayer(p, NO_INPUT, world, { brace: true });
    stepPlayer(p, { x: -1, y: 0 }, world, { brace: true });
    expect(p.brace).toBe(BRACE_TICKS - 1);
    expect(p.braceAge).toBe(1);
    stepPlayer(p, { x: -1, y: 0 }, world, { brace: true });
    expect(p.braceAge).toBe(2);
  });

  // The d20 of the mob shows 15, then 5: a skirmisher (+4) hits AC 14 with the first, and misses with the lower.
  const brace = (state: PlayerState, age: number) => {
    state.brace = 10;
    state.braceAge = age;
  };

  it('a sharp brace gives the mob disadvantage: the lower d20 misses, and the page hears "sharp"', () => {
    const { horde, player, state, mob } = duel(['grades'], faces(15, 5));
    expect(untilWindup(horde, player, mob, 20)).toBe(true);
    brace(state, 3);
    const { hit, events } = blow(horde, player, mob);
    expect(hit?.[2]).toBe(0);
    expect(state.evade).toBeGreaterThan(0);
    expect(events).toEqual([{ kind: 'sharp', mob: mob.id, player: 1 }]);
  });

  it('a clean brace rolls one d20 against the AC of the brace, as without the grades', () => {
    for (const on of [['grades'], []] as Mechanic[][]) {
      const { horde, player, state, mob } = duel(on, faces(15, 5));
      expect(untilWindup(horde, player, mob, 20)).toBe(true);
      brace(state, on.length ? 9 : 3);
      const { hit, events } = blow(horde, player, mob);
      // 15 + 4 = 19 against 10 + 4: a hit.
      expect(hit?.[2]).toBeGreaterThan(0);
      expect(events).toEqual([]);
    }
  });

  it('a late brace (or a held one) counts only half of what the brace adds to the AC', () => {
    // 10 + 4 = 14 hits AC 14 (a clean brace) and AC 12 (late: 10 + 2); 9 + 4 = 13 misses AC 14, hits AC 12.
    for (const [age, hits] of [
      [9, false],
      [20, true],
    ] as const) {
      const { horde, player, state, mob } = duel(['grades'], faces(9));
      expect(untilWindup(horde, player, mob, 20)).toBe(true);
      brace(state, age);
      const { hit } = blow(horde, player, mob);
      expect((hit?.[2] ?? 0) > 0).toBe(hits);
    }
  });
});
