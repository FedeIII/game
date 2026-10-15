import { describe, expect, it } from 'vitest';
import {
  BLOCK_STAMINA,
  BRACE_TICKS,
  CLASH_PUSH,
  CLASH_REEL_TICKS,
  EMPTY_GEAR,
  GUARD_BREAK_TICKS,
  GUARD_SPEED,
  GUARD_STAMINA,
  Horde,
  MOB_STATS,
  NO_INPUT,
  PARRY_PUSH,
  PARRY_TICKS,
  PLAIN_GEAR,
  PLAIN_SCORES,
  PLAYER_SPEED,
  ROLLS,
  SHOVE_KNOCK_MS,
  SHOVE_TICKS,
  RIPOSTE_MS,
  TICK_SECONDS,
  TURN_MS,
  World,
  atFlank,
  braceGrade,
  canDodge,
  canShove,
  createPlayer,
  inFront,
  lateBraceAc,
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

/** A horde with the mechanics `on`, one steady mob of `kind` 1 tile east of a player that it hunts (or `dx` east). */
function duel(on: readonly Mechanic[], dice: DiceSource, kind: MobKind = 'skirmisher', traits: HordePlayer['traits'] = { ac: 10, braceAc: 4 }, dx = 14) {
  const horde = new Horde(world, open, 1, dice);
  horde.mechanics = new Set(on);
  const state = tough(100, 100);
  const player: HordePlayer = { id: 1, state, traits };
  const mob = horde.spawn(kind, 100 + dx, 100, { steady: true });
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

  it('with the grades of a brace, only a sharp evade gives it', () => {
    const { horde, player, state, mob } = duel(['grades', 'riposte'], faces(5));
    expect(untilWindup(horde, player, mob, 20)).toBe(true);
    brace(state, 9);
    const { events } = blow(horde, player, mob);
    expect(events).toEqual([]);
    expect(mob.state).toBe('strike');
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
  // The d20 of the mob shows 9: 13 hits the plain AC 10, and misses the AC of the brace, 14.
  it('a brace counts against a blow from its front, and not from its back', () => {
    for (const [dx, hits] of [
      [14, false],
      [-14, true],
    ] as const) {
      const { horde, player, state, mob } = duel(['front'], faces(9), 'skirmisher', { ac: 10, braceAc: 4 }, dx);
      expect(untilWindup(horde, player, mob, 20)).toBe(true);
      // It struck to the east, and braces.
      state.aim = 0;
      state.brace = 10;
      state.braceAge = 9;
      const { hit, events } = blow(horde, player, mob);
      expect((hit?.[2] ?? 0) > 0).toBe(hits);
      expect(events).toEqual(hits ? [{ kind: 'behind', mob: mob.id, player: 1 }] : []);
    }
  });

  it('without its switch a brace counts from every side', () => {
    const { horde, player, state, mob } = duel([], faces(9), 'skirmisher', { ac: 10, braceAc: 4 }, -14);
    expect(untilWindup(horde, player, mob, 20)).toBe(true);
    state.aim = 0;
    state.brace = 10;
    state.braceAge = 9;
    expect(blow(horde, player, mob).hit?.[2]).toBe(0);
  });

  it('the front is the half of the circle round the way that the player struck', () => {
    expect(inFront(0, 0, 0, 10, 0)).toBe(true);
    expect(inFront(0, 0, 0, 0, 10)).toBe(true);
    expect(inFront(0, 0, 0, -1, 10)).toBe(false);
    expect(inFront(0, 0, Math.PI, -10, 1)).toBe(true);
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
