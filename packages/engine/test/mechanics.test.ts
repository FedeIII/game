import { describe, expect, it } from 'vitest';
import {
  BLOCK_STAMINA,
  BRACE_TICKS,
  CLASH_PUSH,
  CLASH_REEL_TICKS,
  EMPTY_GEAR,
  EVADE_STAMINA,
  GUARD_BREAK_TICKS,
  GUARD_SPEED,
  GUARD_STAMINA,
  Horde,
  MOB_STATS,
  NIMBLE_MS,
  NO_INPUT,
  PARRY_PUSH,
  PARRY_STAMINA,
  PARRY_TICKS,
  PLAIN_GEAR,
  PLAIN_SCORES,
  PLAYER_SPEED,
  RAGE_TICKS,
  ROLLS,
  SHIELD_AFTER_TICKS,
  SIDE_SHARE,
  SHOVE_KNOCK_MS,
  SHOVE_STAMINA,
  SHOVE_TICKS,
  RIPOSTE_MS,
  TICK_SECONDS,
  TURN_MS,
  UNCANNY_TICKS,
  World,
  atFlank,
  braceGrade,
  braceSector,
  canDodge,
  canShove,
  createPlayer,
  inFront,
  inShape,
  lateBraceAc,
  partBraceAc,
  shapeOf,
  sheetTraits,
  stepPlayer,
  traitsOf,
  type DiceSource,
  type HordePlayer,
  type Mechanic,
  type MechanicEvent,
  type Mob,
  type MobHit,
  type MobKind,
  type MobRules,
  type MoveInput,
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

/** A horde with the mechanics `on`, one steady mob of `kind` 1 tile east of a player that it hunts (or `dx` east and `dy` south). */
function duel(on: readonly Mechanic[], dice: DiceSource, kind: MobKind = 'skirmisher', traits: HordePlayer['traits'] = { ac: 10, braceAc: 4 }, dx = 14, dy = 0) {
  const horde = new Horde(world, open, 1, dice);
  horde.mechanics = new Set(on);
  const state = tough(100, 100);
  const player: HordePlayer = { id: 1, state, traits };
  const mob = horde.spawn(kind, 100 + dx, 100 + dy, { steady: true });
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

describe('2. the riposte', () => {
  const brace = (state: PlayerState, age: number) => {
    state.brace = 10;
    state.braceAge = age;
  };

  it('an evade puts the mob off balance for 0.4 s: it reels in place, and the page hears "riposte"', () => {
    // The d20 of the mob shows 5: a miss against the brace.
    const { horde, player, state, mob } = duel(['riposte'], faces(5));
    expect(untilWindup(horde, player, mob, 20)).toBe(true);
    brace(state, 9);
    const { hit, events } = blow(horde, player, mob);
    expect(hit?.[2]).toBe(0);
    expect(events).toEqual([{ kind: 'riposte', mob: mob.id, player: 1 }]);
    expect(mob.state).toBe('hurt');
    expect(mob.exposed).toBeGreaterThan(0);
    const x = mob.x;
    // It does not wind up while it reels, and it does not move.
    for (let t = 0; t < RIPOSTE_MS - 2 * TICK_MS; t += TICK_MS) {
      horde.step(TICK_MS, [player]);
      expect(mob.state).toBe('hurt');
    }
    expect(mob.x).toBe(x);
  });

  it('the next blow on a mob off balance rolls with advantage', () => {
    // The d20 of the mob shows 5 (a miss); then the player's show 5 and 15: one d20 misses AC 15
    // with +2, the higher of two hits.
    for (const [on, hits] of [
      [['riposte'], true],
      [[], false],
    ] as const) {
      const { horde, player, state, mob } = duel(on as readonly Mechanic[], faces(5, 5, 15));
      expect(untilWindup(horde, player, mob, 20)).toBe(true);
      brace(state, 9);
      blow(horde, player, mob);
      const [result] = horde.strike(state, Math.atan2(mob.y - state.y, mob.x - state.x), undefined, 1, { toHit: 2, damage: { count: 1, sides: 8, plus: 0 }, push: 1, stagger: 1 });
      expect(result!.damage > 0).toBe(hits);
      // The opening is for one blow.
      expect(mob.exposed).toBeUndefined();
    }
  });

  it('with the grades of a brace, a sharp or a clean evade gives it, and a late one does not (Fede, 2026-10-15)', () => {
    for (const [age, kinds, state] of [
      [3, ['sharp', 'riposte'], 'hurt'],
      [9, ['riposte'], 'hurt'],
      [20, [], 'strike'],
    ] as const) {
      // The d20 of the mob shows 1: a miss in every grade.
      const duelled = duel(['grades', 'riposte'], faces(1));
      expect(untilWindup(duelled.horde, duelled.player, duelled.mob, 20)).toBe(true);
      brace(duelled.state, age);
      const { events } = blow(duelled.horde, duelled.player, duelled.mob);
      expect(events.map((e) => e.kind)).toEqual(kinds);
      expect(duelled.mob.state).toBe(state);
    }
  });

  it('without its switch the mob strikes on after a miss', () => {
    const { horde, player, state, mob } = duel([], faces(5));
    expect(untilWindup(horde, player, mob, 20)).toBe(true);
    brace(state, 9);
    blow(horde, player, mob);
    expect(mob.state).toBe('strike');
    expect(mob.exposed).toBeUndefined();
  });
});

describe('3. the front of a brace', () => {
  /** A blow on a brace of +4 (it struck to the east) from a mob at (dx, dy), with a d20 of `natural` (+4). */
  function from(on: readonly Mechanic[], natural: number, dx: number, dy: number) {
    const { horde, player, state, mob } = duel(on, faces(natural), 'skirmisher', { ac: 10, braceAc: 4 }, dx, dy);
    expect(untilWindup(horde, player, mob, 20)).toBe(true);
    state.aim = 0;
    state.brace = 10;
    state.braceAge = 9;
    const { hit, events } = blow(horde, player, mob);
    return { hits: (hit?.[2] ?? 0) > 0, events: events.map((e) => e.kind) };
  }

  it('a brace counts in full from the front, half from a side, and not at all from the back (Fede, 2026-10-15)', () => {
    // 7 + 4 = 11: it misses AC 14 (in full) and AC 12 (half), and hits AC 10.
    expect(from(['front'], 7, 14, 0)).toEqual({ hits: false, events: [] });
    expect(from(['front'], 7, 0, 14)).toEqual({ hits: false, events: ['side'] });
    expect(from(['front'], 7, -14, 0)).toEqual({ hits: true, events: ['behind'] });
    // 9 + 4 = 13: it misses AC 14, and hits AC 12 from a side.
    expect(from(['front'], 9, 14, 0).hits).toBe(false);
    expect(from(['front'], 9, 0, -14).hits).toBe(true);
  });

  it('from a side, the half comes after the grade of the brace', () => {
    // A late brace adds 2 (half of 4); from a side 1 (half of 2): 9 + 4 = 13 hits AC 11, not AC 14.
    const { horde, player, state, mob } = duel(['front', 'grades'], faces(6), 'skirmisher', { ac: 10, braceAc: 4 }, 0, 14);
    expect(untilWindup(horde, player, mob, 20)).toBe(true);
    state.aim = 0;
    state.brace = 10;
    state.braceAge = 20;
    // 6 + 4 = 10 misses AC 11.
    expect(blow(horde, player, mob).hit?.[2]).toBe(0);
  });

  it('without its switch a brace counts in full from every side', () => {
    expect(from([], 9, -14, 0)).toEqual({ hits: false, events: [] });
    expect(from([], 9, 0, 14)).toEqual({ hits: false, events: [] });
  });

  it('the sectors are quarters of the circle round the way that the player struck', () => {
    expect(braceSector(0, 0, 0, 10, 0)).toBe('front');
    expect(braceSector(0, 0, 0, 10, 9)).toBe('front');
    expect(braceSector(0, 0, 0, 10, 11)).toBe('side');
    expect(braceSector(0, 0, 0, 0, -10)).toBe('side');
    // 132 degrees off the aim: a side; 138 degrees: the back.
    expect(braceSector(0, 0, 0, -10, 11)).toBe('side');
    expect(braceSector(0, 0, 0, -10, 9)).toBe('back');
    expect(braceSector(0, 0, 0, -10, 1)).toBe('back');
    expect(braceSector(0, 0, Math.PI, -10, 0)).toBe('front');
    expect(partBraceAc(4, SIDE_SHARE)).toBe(2);
    expect(partBraceAc(1, SIDE_SHARE)).toBe(1);
    expect(partBraceAc(0, SIDE_SHARE)).toBe(0);
  });
});

describe('4. the flank', () => {
  it('a mob whose blow misses a player that jumped to its side must turn, and the next blow on it rolls with advantage', () => {
    // The d20 of the mob shows 5: a miss.
    const { horde, player, state, mob } = duel(['flank'], faces(5));
    expect(untilWindup(horde, player, mob, 20)).toBe(true);
    // A jump to the side in its wind-up: 16 px south, about 49 degrees off its aim.
    state.y += 16;
    const { hit, events } = blow(horde, player, mob);
    expect(hit?.[2]).toBe(0);
    expect(events).toEqual([{ kind: 'flank', mob: mob.id, player: 1 }]);
    expect(mob.exposed).toBeGreaterThan(0);
    // It does not wind up in its blow and its turn.
    for (let t = 0; t < MOB_STATS.skirmisher.strikeMs + TURN_MS - 2 * TICK_MS; t += TICK_MS) {
      horde.step(TICK_MS, [player]);
      expect(mob.state).not.toBe('windup');
    }
  });

  it('a player in front of the mob, or a mob without the switch, gives no flank', () => {
    for (const [on, dy] of [
      [['flank'], 0],
      [[], 16],
    ] as const) {
      const { horde, player, state, mob } = duel(on as readonly Mechanic[], faces(5));
      expect(untilWindup(horde, player, mob, 20)).toBe(true);
      state.y += dy;
      expect(blow(horde, player, mob).events).toEqual([]);
      expect(mob.exposed).toBeUndefined();
    }
  });

  it('the flank is more than 40 degrees off the aim of the blow', () => {
    expect(atFlank(0, 0, 0, 10, 0)).toBe(false);
    expect(atFlank(0, 0, 0, 10, 8)).toBe(false);
    expect(atFlank(0, 0, 0, 10, 9)).toBe(true);
    expect(atFlank(0, 0, Math.PI, -14, 16)).toBe(true);
  });
});

describe('5. the parry', () => {
  /** A fighter with a rapier at level 1: proficiency +2. */
  const FIGHTER = traitsOf(PLAIN_SCORES, 'fighter', PLAIN_GEAR);
  const toward = (state: PlayerState, mob: Mob) => Math.atan2(mob.y - state.y, mob.x - state.x);

  it('an attack in the last 0.15 s of a wind-up is a parry: the proficiency bonus goes on the AC, and a miss pushes both apart', () => {
    // The d20 of the mob shows 7: 11 hits AC 10, and misses AC 12 (10 + the proficiency bonus).
    const { horde, player, state, mob } = duel(['parry'], faces(7));
    expect(untilWindup(horde, player, mob, 140)).toBe(true);
    expect(horde.parry(state, toward(state, mob), 1, FIGHTER)).toBe(true);
    expect(state.parry).toBe(PARRY_TICKS);
    const apart = Math.hypot(mob.x - state.x, mob.y - state.y);
    const { hit, events } = blow(horde, player, mob);
    expect(hit?.[2]).toBe(0);
    expect(events).toEqual([{ kind: 'parry', mob: mob.id, player: 1 }]);
    expect(Math.hypot(mob.x - state.x, mob.y - state.y)).toBeCloseTo(apart + 2 * PARRY_PUSH, 0);
  });

  it('in the last 5 ticks the mob rolls with disadvantage, and with the riposte on the miss gives one', () => {
    // The d20s of the mob show 15, then 5: one d20 hits AC 12, the lower misses.
    const { horde, player, state, mob } = duel(['parry', 'riposte'], faces(15, 5));
    expect(untilWindup(horde, player, mob, 70)).toBe(true);
    expect(horde.parry(state, toward(state, mob), 1, FIGHTER)).toBe(true);
    const { hit, events } = blow(horde, player, mob);
    expect(hit?.[2]).toBe(0);
    expect(events.map((e) => e.kind)).toEqual(['parry', 'riposte']);
    expect(mob.exposed).toBeGreaterThan(0);
  });

  it('is no parry earlier in the wind-up, without its switch, without a weapon, or away from the mob', () => {
    const early = duel(['parry'], faces(7));
    expect(untilWindup(early.horde, early.player, early.mob, 400)).toBe(true);
    expect(early.horde.parry(early.state, toward(early.state, early.mob), 1, FIGHTER)).toBe(false);
    for (const [on, traits, away] of [
      [[], FIGHTER, false],
      [['parry'], traitsOf(PLAIN_SCORES, 'fighter', EMPTY_GEAR), false],
      [['parry'], FIGHTER, true],
    ] as const) {
      const { horde, player, state, mob } = duel(on as readonly Mechanic[], faces(7));
      expect(untilWindup(horde, player, mob, 140)).toBe(true);
      expect(horde.parry(state, toward(state, mob) + (away ? Math.PI : 0), 1, traits)).toBe(false);
      expect(state.parry).toBe(0);
    }
  });

  it('a parry ends with a hit that stuns the player', () => {
    // The d20 of the mob shows 18: a hit, parry or not.
    const { horde, player, state, mob } = duel(['parry'], faces(18));
    expect(untilWindup(horde, player, mob, 140)).toBe(true);
    horde.parry(state, toward(state, mob), 1, FIGHTER);
    expect(blow(horde, player, mob).hit?.[2]).toBeGreaterThan(0);
    expect(state.parry).toBe(0);
  });
});

describe('6. the guard stance and the shield block', () => {
  const GUARD: MoveInput = { x: 1, y: 0, guard: true };
  const on = new Set<Mechanic>(['guard']);

  it('a hold of the dodge input raises a guard: half speed, no attack, and 12 stamina each second without a shield', () => {
    const p = createPlayer(100, 100);
    expect(stepPlayer(p, { ...GUARD, attack: 0 }, world, { mechanics: on })).toBe(false);
    expect(p.guarding).toBe(true);
    expect(p.vx).toBeCloseTo(PLAYER_SPEED * GUARD_SPEED);
    expect(p.attack).toBe(0);
    for (let i = 1; i < 60; i++) stepPlayer(p, GUARD, world, { mechanics: on });
    expect(p.stamina).toBeCloseTo(100 - GUARD_STAMINA, 0);
    // With a shield it costs nothing each second.
    const s = createPlayer(100, 100);
    for (let i = 0; i < 60; i++) stepPlayer(s, GUARD, world, { mechanics: on, shield: true });
    expect(s.stamina).toBe(100);
  });

  it('drops with no stamina, and does nothing without its switch', () => {
    const p = createPlayer(100, 100);
    p.stamina = 0;
    // It used its stamina just now: none comes back yet.
    p.rest = 0;
    stepPlayer(p, GUARD, world, { mechanics: on });
    expect(p.guarding).toBe(false);
    const q = createPlayer(100, 100);
    stepPlayer(q, GUARD, world, {});
    expect(q.guarding).toBe(false);
    expect(q.vx).toBeCloseTo(PLAYER_SPEED);
  });

  // The d20s of the mob show 15, then 5: one d20 hits AC 10, the lower misses.
  it('a blow from the front rolls with disadvantage; with a shield a miss is a block, for 15 stamina', () => {
    for (const shield of [false, true]) {
      const { horde, player, state, mob } = duel(['guard'], faces(15, 5), 'skirmisher', { ac: 10, shield });
      expect(untilWindup(horde, player, mob, 20)).toBe(true);
      state.guarding = true;
      state.aim = 0;
      const { hit, events } = blow(horde, player, mob);
      expect(hit?.[2]).toBe(0);
      expect(events.map((e) => e.kind)).toEqual(shield ? ['block'] : []);
      expect(state.stamina).toBe(shield ? 100 - BLOCK_STAMINA : 100);
    }
  });

  it('a blow from the back rolls one d20', () => {
    const { horde, player, state, mob } = duel(['guard'], faces(15, 5), 'skirmisher', { ac: 10 }, -14);
    expect(untilWindup(horde, player, mob, 20)).toBe(true);
    state.guarding = true;
    state.aim = 0;
    expect(blow(horde, player, mob).hit?.[2]).toBeGreaterThan(0);
  });

  it("a bugbear's blow breaks the guard: one d20, and the player reels with no guard after it", () => {
    const { horde, player, state, mob } = duel(['guard'], faces(5), 'bugbear', { ac: 10 }, 18);
    expect(untilWindup(horde, player, mob, 20)).toBe(true);
    state.guarding = true;
    state.aim = 0;
    const { events } = blow(horde, player, mob);
    expect(events.map((e) => e.kind)).toEqual(['broken']);
    expect(state.guarding).toBe(false);
    expect(state.reel).toBe(GUARD_BREAK_TICKS);
    for (let i = 0; i < GUARD_BREAK_TICKS; i++) stepPlayer(state, GUARD, world, { mechanics: on });
    expect(state.reel).toBe(0);
    expect(state.guard).toBe(0);
  });
});

describe('7. the shove', () => {
  const FIGHTER = traitsOf(PLAIN_SCORES, 'fighter', PLAIN_GEAR);
  /** A goblin 1 tile east, and a player that rolls to the east: the d20s show `ours`, then `theirs`. */
  function shove(on: readonly Mechanic[], ours: number, theirs: number, kind: MobKind = 'skirmisher', traits = FIGHTER) {
    const { horde, player, state, mob } = duel(on, faces(ours, theirs), kind, { ac: 10 }, 14);
    const shoved = horde.shove(state, 1, 0, traits);
    return { horde, player, state, mob, shoved, events: horde.takeEvents() };
  }

  it('a roll into a mob in reach is a shove: a win knocks it down, pushes it back, and blows on it roll with advantage', () => {
    // 15 + 2 (STR 10, proficiency 2) against 5 + 2 (a goblin's DEX).
    const { state, mob, shoved, events } = shove(['shove'], 15, 5);
    expect(shoved).toBe(true);
    expect(events).toEqual([{ kind: 'shoved', mob: mob.id, player: 1 }]);
    expect(mob.state).toBe('hurt');
    expect(mob.exposed).toBe(SHOVE_KNOCK_MS);
    // It costs the stamina of a light roll, and the player stands.
    expect(state.stamina).toBe(100 - ROLLS.light.stamina);
    expect(state.shove).toBe(SHOVE_TICKS);
    expect(canDodge(state)).toBe(false);
  });

  it('a loss or a tie does nothing to the mob', () => {
    for (const [ours, theirs] of [
      [5, 15],
      [10, 10],
    ] as const) {
      const { mob, shoved, events } = shove(['shove'], ours, theirs);
      expect(shoved).toBe(true);
      expect(events.map((e) => e.kind)).toEqual(['held']);
      expect(mob.state).toBe('chase');
    }
  });

  it('a small character cannot shove a large mob (5e): "too big", no contest', () => {
    const halfling = traitsOf(PLAIN_SCORES, 'fighter', PLAIN_GEAR, 1, 'small');
    const { mob, shoved, events } = shove(['shove'], 20, 1, 'brute', halfling);
    expect(shoved).toBe(true);
    expect(events.map((e) => e.kind)).toEqual(['tooBig']);
    expect(mob.state).toBe('chase');
    expect(canShove('medium', 'large')).toBe(true);
    expect(canShove('small', 'large')).toBe(false);
  });

  it('is no shove without its switch, or away from the mob', () => {
    expect(shove([], 15, 5).shoved).toBe(false);
    const { horde, state } = duel(['shove'], faces(15, 5), 'skirmisher', { ac: 10 }, 14);
    expect(horde.shove(state, 1, Math.PI, FIGHTER)).toBe(false);
    expect(state.shove).toBe(0);
  });

  it('a character gets its size from its race, and its athletics from STR and its proficiency', () => {
    const halfling = sheetTraits({ race: 'halfling', class: 'rogue', base: { ...PLAIN_SCORES, str: 14 }, bonus: [] }, EMPTY_GEAR);
    expect(halfling.size).toBe('small');
    expect(halfling.athletics).toBe(2 + 2);
    expect(sheetTraits({ race: 'half-orc', class: 'fighter', base: PLAIN_SCORES, bonus: [] }, EMPTY_GEAR, 5).athletics).toBe(1 + 3);
  });
});

describe('8. the clash', () => {
  /** A blow with the attack bonus of a skirmisher (+4): equal d20s tie. */
  const BLOW = { toHit: 4, damage: { count: 1, sides: 8, plus: 0 }, push: 1, stagger: 1 };
  /** A duel in the last ticks of the mob's wind-up (`left` ms), and the player's blow with d20s `ours` and `theirs`. */
  function clash(on: readonly Mechanic[], ours: number, theirs: number, left = 40) {
    const { horde, player, state, mob } = duel(on, faces(ours, theirs));
    expect(untilWindup(horde, player, mob, left)).toBe(true);
    const results = horde.strike(state, Math.atan2(mob.y - state.y, mob.x - state.x), undefined, 1, BLOW, state);
    return { horde, player, state, mob, results, events: horde.takeEvents() };
  }

  it("a blow in the last 3 ticks of a wind-up meets the mob's blow: the higher roll wins, and the mob reels", () => {
    const { mob, results, events } = clash(['clash'], 15, 5);
    expect(results).toEqual([]);
    expect(events.map((e) => e.kind)).toEqual(['clashWon']);
    expect(mob.state).toBe('hurt');
    expect(mob.health).toBe(MOB_STATS.skirmisher.health);
  });

  it("a loss makes the player reel, and the mob's blow does not land", () => {
    const { horde, player, state, mob, events } = clash(['clash'], 5, 15);
    expect(events.map((e) => e.kind)).toEqual(['clashLost']);
    expect(state.reel).toBe(CLASH_REEL_TICKS);
    const hits: MobHit[] = [];
    for (let t = 0; t < 300; t += TICK_MS) hits.push(...horde.step(TICK_MS, [player]));
    expect(hits.filter(([m]) => m === mob.id)).toEqual([]);
  });

  it('a tie pushes both back', () => {
    const { state, mob, events } = clash(['clash'], 10, 10);
    expect(events.map((e) => e.kind)).toEqual(['clash']);
    expect(Math.hypot(mob.x - state.x, mob.y - state.y)).toBeGreaterThan(14 + CLASH_PUSH);
  });

  it('is a blow earlier in the wind-up, or without its switch', () => {
    for (const [on, left] of [
      [['clash'], 200],
      [[], 40],
    ] as const) {
      const { results, events } = clash(on as readonly Mechanic[], 15, 5, left);
      expect(results).toHaveLength(1);
      expect(events).toEqual([]);
    }
  });
});

describe('9. the reactions of the classes', () => {
  const on = new Set<Mechanic>(['reactions']);

  it("a wizard's brace is the spell Shield: +5 AC from every side, until 0.3 s after the brace", () => {
    // The d20 of the mob shows 10: 14 hits AC 14 (the brace), and misses AC 15 (the Shield).
    for (const [mechanics, kinds, hits] of [
      [['reactions'], ['shield'], false],
      [[], [], true],
    ] as const) {
      const { horde, player, state, mob } = duel(mechanics as readonly Mechanic[], faces(10), 'skirmisher', { ac: 10, braceAc: 4, class: 'wizard' }, -14);
      expect(untilWindup(horde, player, mob, 20)).toBe(true);
      state.aim = 0;
      state.brace = 10;
      state.braceAge = 9;
      const { hit, events } = blow(horde, player, mob);
      expect((hit?.[2] ?? 0) > 0).toBe(hits);
      expect(events.map((e) => e.kind)).toEqual(kinds);
    }
    // After the brace, the Shield holds SHIELD_AFTER_TICKS more.
    const p = createPlayer(100, 100);
    stepPlayer(p, { x: 0, y: 0, attack: 0 }, world, { brace: true, class: 'wizard', mechanics: on });
    for (let i = 0; i < 18; i++) stepPlayer(p, NO_INPUT, world, { brace: true, class: 'wizard', mechanics: on });
    stepPlayer(p, { x: -1, y: 0 }, world, { brace: true, class: 'wizard', mechanics: on });
    for (let i = 0; i < 40 && p.brace > 0; i++) stepPlayer(p, NO_INPUT, world, { brace: true, class: 'wizard', mechanics: on });
    expect(p.brace).toBe(0);
    expect(p.ward).toBe(SHIELD_AFTER_TICKS);
  });

  it('a monk in a brace takes 1d10 + DEX + level off an arrow, and catches it when nothing is left', () => {
    // The arrow hits (18), its d6 shows 3 (5 damage), and the monk's d10 shows 5 (+ 5): caught.
    const { horde, player, state } = duel(['reactions'], faces(18, 10, 10), 'goblin', { ac: 10, braceAc: 3, class: 'monk', deflect: 5 }, 60);
    const events: MechanicEvent[] = [];
    for (let t = 0; t < 4000 && events.length === 0; t += TICK_MS) {
      state.brace = 10;
      horde.step(TICK_MS, [player]);
      events.push(...horde.takeEvents());
    }
    expect(events.map((e) => e.kind)).toEqual(['caught']);
    expect(state.hp).toBe(1000);
    expect(state.stun).toBe(0);
  });

  it("a monk's guard stance costs no stamina (Patient Defense)", () => {
    const p = createPlayer(100, 100);
    for (let i = 0; i < 60; i++) stepPlayer(p, { x: 0, y: 0, guard: true }, world, { class: 'monk', mechanics: new Set<Mechanic>(['guard', 'reactions']) });
    expect(p.guarding).toBe(true);
    expect(p.stamina).toBe(100);
  });

  it('a rogue hit in its own attack takes half the damage, once in 30 s (Uncanny Dodge)', () => {
    // Every die shows its highest face: 1d6+2 is 8.
    const { horde, player, state, mob } = duel(['reactions'], faces(20), 'skirmisher', { ac: 10, class: 'rogue' });
    expect(untilWindup(horde, player, mob, 20)).toBe(true);
    state.attack = 10;
    const first = blow(horde, player, mob);
    expect(first.events.map((e) => e.kind)).toEqual(['uncanny']);
    // A natural 20 rolls the dice twice: 2d6 + 2 = 14, halved to 7.
    expect(first.hit?.[2]).toBe(7);
    expect(state.uncanny).toBe(UNCANNY_TICKS);
  });

  it('a fighter with a shield in a brace protects a companion within 1 tile: the blow rolls with disadvantage', () => {
    for (const [braced, hits] of [
      [true, false],
      [false, true],
    ] as const) {
      // The d20s of the mob show 15, then 5: one hits AC 10, the lower misses.
      const { horde, player, mob } = duel(['reactions'], faces(15, 5));
      const fighter: HordePlayer = { id: 2, state: tough(100, 112), traits: { ac: 18, class: 'fighter', shield: true } };
      expect(untilWindup(horde, player, mob, 20)).toBe(true);
      fighter.state.brace = braced ? 10 : 0;
      expect(untilWindup(horde, player, mob, 20)).toBe(true);
      let hit: MobHit | undefined;
      for (let t = 0; t < 1000 && !hit && mob.state === 'windup'; t += TICK_MS) hit = horde.step(TICK_MS, [player, fighter]).find(([m]) => m === mob.id);
      expect((hit?.[2] ?? 0) > 0).toBe(hits);
    }
  });

  it("a barbarian's first attack starts a rage that halves the damage of each hit", () => {
    const p = createPlayer(100, 100);
    stepPlayer(p, { x: 0, y: 0, attack: 0 }, world, { class: 'barbarian', mechanics: on });
    expect(p.rage).toBe(RAGE_TICKS);
    const { horde, player, state, mob } = duel(['reactions'], faces(19), 'skirmisher', { ac: 10, class: 'barbarian' });
    state.rage = 100;
    // 1d6+2 at its highest face: 8, halved to 4.
    expect(blow(horde, player, mob).hit?.[2]).toBe(4);
  });
});

describe('10. the shapes of the blows', () => {
  it('each kind has its shapes: a brute sweeps, and slams now and then', () => {
    expect(shapeOf('skirmisher', 0)).toBe('thrust');
    expect(shapeOf('bugbear', 0)).toBe('sweep');
    expect(shapeOf('brute', 0.1)).toBe('slam');
    expect(shapeOf('brute', 0.5)).toBe('sweep');
    expect(shapeOf('worg', 0)).toBe('bite');
    expect(shapeOf('imp', 0)).toBeNull();
  });

  it('a thrust is narrow, a sweep wide, a slam lands on the spot where the player stood', () => {
    // A mob at (0, 0) that aims east, with a reach of 22.
    expect(inShape('thrust', 0, 0, 0, 22, 20, 0, 0, 0)).toBe(true);
    expect(inShape('thrust', 0, 0, 0, 22, 14, 16, 0, 0)).toBe(false);
    expect(inShape('sweep', 0, 0, 0, 22, 14, 16, 0, 0)).toBe(true);
    expect(inShape('sweep', 0, 0, 0, 22, -14, 4, 0, 0)).toBe(false);
    expect(inShape('slam', 0, 0, 0, 22, 18, 4, 16, 0)).toBe(true);
    expect(inShape('slam', 0, 0, 0, 22, 16, 18, 16, 0)).toBe(false);
  });

  it('the page hears the shape when the wind-up starts, and a jump out of a thrust is not hit', () => {
    for (const [on, hits] of [
      [['shapes'], false],
      [[], true],
    ] as const) {
      const { horde, player, state, mob } = duel(on as readonly Mechanic[], faces(19));
      expect(untilWindup(horde, player, mob, 1000)).toBe(true);
      expect(horde.takeEvents().map((e) => e.kind)).toEqual(on.length ? ['thrust'] : []);
      // A jump to the side in the wind-up: 49 degrees off its aim, still in its reach.
      state.y += 16;
      const { hit } = blow(horde, player, mob);
      expect(hit !== undefined).toBe(hits);
    }
  });

  it('a slam has a longer wind-up, and a brace does not count against it', () => {
    // Find a brute that slams (one blow in three).
    for (let seed = 1; seed < 40; seed++) {
      const horde = new Horde(world, open, seed, faces(10));
      horde.mechanics = new Set<Mechanic>(['shapes']);
      const state = tough(100, 100);
      const player: HordePlayer = { id: 1, state, traits: { ac: 10, braceAc: 6 } };
      const mob = horde.spawn('brute', 118, 100, { steady: true });
      horde.provoke(mob, 1, state);
      expect(untilWindup(horde, player, mob, 2000)).toBe(true);
      if (horde.takeEvents()[0]?.kind !== 'slam') continue;
      const brain = (horde as unknown as { brains: Map<number, { timerMs: number }> }).brains.get(mob.id)!;
      expect(brain.timerMs).toBeGreaterThan(MOB_STATS.brute.windupMs);
      state.brace = 30;
      state.braceAge = 9;
      // 10 + 5 = 15: it misses AC 16 (the brace), and hits AC 10.
      expect(blow(horde, player, mob).hit?.[2]).toBeGreaterThan(0);
      return;
    }
    throw new Error('no slam');
  });
});

describe('11. the guards of the mobs', () => {
  const blowOn = (horde: Horde, state: PlayerState, mob: Mob, toHit: number) =>
    horde.strike(state, Math.atan2(mob.y - state.y, mob.x - state.x), undefined, 1, { toHit, damage: { count: 1, sides: 8, plus: 0 }, push: 1, stagger: 1 })[0]!;

  it('a hobgoblin raises its shield after its blow: the next blow on it rolls with disadvantage', () => {
    // The hobgoblin's d20 shows 1 (a miss); then the player's show 15 and 5: +10 hits AC 18 with 15 only.
    for (const [on, hits] of [
      [['mobGuards'], false],
      [[], true],
    ] as const) {
      const { horde, player, state, mob } = duel(on as readonly Mechanic[], faces(1, 15, 5), 'hobgoblin', { ac: 10 }, 16);
      const { events } = blow(horde, player, mob);
      expect(events.map((e) => e.kind)).toEqual(on.length ? ['raise'] : []);
      expect(blowOn(horde, state, mob, 10).damage > 0).toBe(hits);
    }
  });

  it('a goblin steps aside after its blow, and comes back at once', () => {
    const { horde, player, state, mob } = duel(['mobGuards'], faces(1));
    blow(horde, player, mob);
    const at = { x: mob.x, y: mob.y };
    const states = new Set<string>();
    for (let t = 0; t < MOB_STATS.skirmisher.strikeMs + NIMBLE_MS + 50; t += TICK_MS) {
      horde.step(TICK_MS, [player]);
      states.add(mob.state);
    }
    expect(states.has('retreat')).toBe(true);
    expect(['chase', 'windup']).toContain(mob.state);
    // Aside, not away: about as far from the player as before.
    expect(Math.abs(mob.y - at.y)).toBeGreaterThan(8);
    expect(Math.hypot(mob.x - state.x, mob.y - state.y)).toBeLessThan(40);
  });

  it('a bandit parries the first blow after its own: +2 AC, and the page hears "parried"', () => {
    // The bandit's d20 shows 1 (a miss); then the player's shows 11: 13 hits AC 12, not AC 14.
    for (const [on, hits] of [
      [['mobGuards'], false],
      [[], true],
    ] as const) {
      const { horde, player, state, mob } = duel(on as readonly Mechanic[], faces(1, 11), 'bandit', { ac: 10 }, 16);
      blow(horde, player, mob);
      horde.takeEvents();
      expect(blowOn(horde, state, mob, 2).damage > 0).toBe(hits);
      expect(horde.takeEvents().map((e) => e.kind)).toEqual(on.length ? ['mobParry'] : []);
    }
  });

  it('a bugbear holds its blow while its target braces, up to 0.4 s, with no glint', () => {
    const { horde, player, state, mob } = duel(['mobGuards'], faces(19), 'bugbear', { ac: 10, braceAc: 4 }, 18);
    expect(untilWindup(horde, player, mob, 20)).toBe(true);
    state.brace = 100;
    state.braceAge = 9;
    for (let t = 0; t < 300; t += TICK_MS) expect(horde.step(TICK_MS, [player])).toEqual([]);
    expect(mob.state).toBe('windup');
    expect(mob.feint).toBe(true);
    // The brace ends: the blow comes.
    state.brace = 0;
    expect(horde.step(TICK_MS, [player]).find(([m]) => m === mob.id)?.[2]).toBeGreaterThan(0);
    expect(mob.feint).toBeUndefined();
  });
});

describe('12. a price in stamina', () => {
  const brace = (state: PlayerState, age: number) => {
    state.brace = 10;
    state.braceAge = age;
  };

  it('an evade costs 10 stamina, and a sharp one nothing', () => {
    for (const [on, age, cost] of [
      [['stamina'], 9, EVADE_STAMINA],
      [['stamina', 'grades'], 3, 0],
      [[], 9, 0],
    ] as const) {
      const { horde, player, state, mob } = duel(on as readonly Mechanic[], faces(1));
      expect(untilWindup(horde, player, mob, 20)).toBe(true);
      brace(state, age);
      blow(horde, player, mob);
      expect(state.stamina).toBe(100 - cost);
    }
  });

  it('a parry costs 10, and there is none with no stamina', () => {
    const FIGHTER = traitsOf(PLAIN_SCORES, 'fighter', PLAIN_GEAR);
    for (const [stamina, parries] of [
      [100, true],
      [0, false],
    ] as const) {
      const { horde, player, state, mob } = duel(['parry', 'stamina'], faces(7));
      expect(untilWindup(horde, player, mob, 140)).toBe(true);
      state.stamina = stamina;
      expect(horde.parry(state, Math.atan2(mob.y - state.y, mob.x - state.x), 1, FIGHTER)).toBe(parries);
      if (parries) expect(state.stamina).toBe(100 - PARRY_STAMINA);
    }
  });

  it('a shove costs 20 in place of the roll', () => {
    const { horde, state } = duel(['shove', 'stamina'], faces(15, 5));
    horde.shove(state, 1, 0, traitsOf(PLAIN_SCORES, 'fighter', PLAIN_GEAR));
    expect(state.stamina).toBe(100 - SHOVE_STAMINA);
  });

  it('with no stamina a step back does not brace, and a brace drops', () => {
    const on = new Set<Mechanic>(['stamina']);
    const p = createPlayer(100, 100);
    stepPlayer(p, { x: 0, y: 0, attack: 0 }, world, { brace: true, mechanics: on });
    for (let i = 0; i < 18; i++) stepPlayer(p, NO_INPUT, world, { brace: true, mechanics: on });
    p.stamina = 0;
    p.rest = 0;
    stepPlayer(p, { x: -1, y: 0 }, world, { brace: true, mechanics: on });
    expect(p.brace).toBe(0);
    const q = createPlayer(100, 100);
    q.brace = 10;
    q.stamina = 0;
    q.rest = 0;
    stepPlayer(q, { x: -1, y: 0 }, world, { brace: true, mechanics: on });
    expect(q.brace).toBe(0);
  });
});
