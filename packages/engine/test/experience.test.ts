import { describe, expect, it } from 'vitest';
import {
  AVERAGE_DICE,
  KILL_XP_DIVISOR,
  LEVEL_XP,
  MAX_LEVEL,
  MOB_KINDS,
  MOB_STATS,
  PLAIN_GEAR,
  PLAIN_SCORES,
  Room,
  World,
  checkXp,
  checkXpDivisor,
  crXp,
  formatDice,
  guestTraits,
  killXp,
  levelOf,
  levelProgress,
  mobXp,
  traitsOf,
  type SnapshotMessage,
} from '../src/index.ts';
import { mobHouseSource } from './helpers.ts';

describe('the levels of a character', () => {
  it('rise with the XP of the 5e table, up to level 5', () => {
    expect(LEVEL_XP).toEqual([0, 300, 900, 2700, 6500]);
    expect([0, 299, 300, 899, 900, 2699, 2700, 6499, 6500, 999_999].map(levelOf)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    expect(MAX_LEVEL).toBe(5);
    expect(levelProgress(600)).toEqual({ level: 2, xp: 600, from: 300, to: 900, share: 0.5 });
    expect(levelProgress(7000)).toEqual({ level: 5, xp: 7000, from: 6500, to: null, share: 1 });
  });

  it('give the hit points, the proficiency bonus and the dice of 5e at each level', () => {
    const fighter = (level: number) => traitsOf({ ...PLAIN_SCORES, str: 16, con: 14 }, 'fighter', PLAIN_GEAR, level);
    // A d10 at its most and +2 at level 1, then 6 + 2 for each level.
    expect([1, 2, 3, 4, 5].map((level) => fighter(level).maxHp)).toEqual([12, 20, 28, 36, 44]);
    // +2 to hit, +3 from level 5.
    expect([1, 4, 5].map((level) => fighter(level).toHit)).toEqual([2 + 3, 2 + 3, 3 + 3]);
    expect(fighter(3).level).toBe(3);
    // A rogue's sneak attack: 1d6, 2d6 at level 3, 3d6 at level 5.
    const rogue = (level: number) => traitsOf(PLAIN_SCORES, 'rogue', { ...PLAIN_GEAR, main: 'shortsword' }, level);
    expect([1, 2, 3, 4, 5].map((level) => formatDice(rogue(level).sneak))).toEqual(['1d6', '1d6', '2d6', '2d6', '3d6']);
    // A cantrip has two dice from level 5; a monk's martial arts a d6.
    const empty = { ...PLAIN_GEAR, main: null };
    expect([4, 5].map((level) => formatDice(traitsOf(PLAIN_SCORES, 'wizard', empty, level).damage))).toEqual(['1d10', '2d10']);
    expect([4, 5].map((level) => formatDice(traitsOf(PLAIN_SCORES, 'monk', empty, level).damage))).toEqual(['1d4', '1d6']);
    // Without a level: level 1.
    expect(traitsOf(PLAIN_SCORES, 'fighter', PLAIN_GEAR)).toEqual(traitsOf(PLAIN_SCORES, 'fighter', PLAIN_GEAR, 1));
  });

  it('checks the XP and the divisor that come from outside', () => {
    expect([checkXp(450), checkXp(-1), checkXp(2.5), checkXp('9'), checkXp(null), checkXp(5_000_000)]).toEqual([450, 0, 0, 0, 0, 1_000_000]);
    expect([checkXpDivisor(1), checkXpDivisor(100), checkXpDivisor(0), checkXpDivisor(101), checkXpDivisor(2.5), checkXpDivisor('3')]).toEqual([1, 100, null, null, null, null]);
  });
});

describe('the level of a mob', () => {
  it('is the challenge rating of its 5e stat block, and gives the XP of 5e to the encounters', () => {
    for (const kind of MOB_KINDS) expect(crXp(MOB_STATS[kind].cr), kind).toBe(mobXp(kind));
    expect([mobXp('bandit'), mobXp('skirmisher'), mobXp('worg'), mobXp('brute'), mobXp('warden'), mobXp('watcher')]).toEqual([25, 50, 100, 200, 450, 0]);
  });

  it('gives a tenth of that XP for a kill (Fede, 2026-10-14), or the share of another divisor', () => {
    expect(KILL_XP_DIVISOR).toBe(10);
    expect([1 / 8, 1 / 4, 1 / 2, 1, 2, 0].map((cr) => killXp(cr))).toEqual([3, 5, 10, 20, 45, 0]);
    expect(killXp(1 / 4, 1)).toBe(50);
  });
});

/** An attack to the east (aim code 4) after a quiet tick or more: an input batch. */
const strike = (seq: number) => ({ t: 'in' as const, s: seq, i: [[0, 0, 4] as const] });

describe('the XP of a kill in a shared world', () => {
  it('goes to each character whose blow hit the mob, with its own divisor', () => {
    const room = new Room(new World(mobHouseSource()), { dice: AVERAGE_DICE });
    const a = room.join(0, 1, [5, 10])!;
    const b = room.join(0, 1, [5, 10])!;
    const watcher = room.join(0, 1, [5, 10])!;
    const imp = room.horde!.spawn('imp', a.state.x + 18, a.state.y);
    imp.health = 1000;
    room.input(a.id, strike(1), 100);
    expect(imp.health).toBeLessThan(1000);
    expect([a.xp, b.xp]).toEqual([0, 0]);
    // B gives the last blow; both hit it; the third player never did.
    imp.health = 1;
    room.input(b.id, strike(1), 120);
    expect(imp.state).toBe('dying');
    expect([a.xp, b.xp, watcher.xp]).toEqual([5, 5, 0]);
    // An admin's own divisor: 1 gives the XP of 5e.
    room.setXpDivisor(a.id, 1);
    const brute = room.horde!.spawn('brute', a.state.x + 18, a.state.y);
    brute.health = 1;
    const quiet = Array.from({ length: 40 }, () => [0, 0] as const);
    room.input(a.id, { t: 'in', s: 2, i: [...quiet, [0, 0, 4]] }, 2000);
    expect(brute.state).toBe('dying');
    expect(a.xp).toBe(5 + 200);
  });

  it('raises the level of a character: its traits and its hit points follow, and its client hears the XP', () => {
    const room = new Room(new World(mobHouseSource()), { dice: AVERAGE_DICE });
    const p = room.join(0, 1, [5, 10])!;
    expect(room.welcome(p).xp).toBe(0);
    room.setXpDivisor(p.id, 1);
    const before = p.traits.maxHp;
    p.state.hp = 3;
    const quiet = Array.from({ length: 40 }, () => [0, 0] as const);
    for (const [i, seq] of [1, 42].entries()) {
      const brute = room.horde!.spawn('brute', p.state.x + 18, p.state.y);
      brute.health = 1;
      room.input(p.id, { t: 'in', s: seq, i: [[0, 0, 4], ...quiet] }, 100 + i * 3000);
      expect(brute.state).toBe('dying');
    }
    expect(p.xp).toBe(400);
    expect(p.traits.level).toBe(2);
    expect(p.traits.maxHp).toBe(guestTraits(1, p.gear, 2).maxHp);
    expect(p.traits.maxHp).toBeGreaterThan(before);
    // The level adds its hit points to those that the character has.
    expect(p.state.hp).toBe(3 + p.traits.maxHp - before);
    const snaps: SnapshotMessage[] = [];
    room.broadcast(5000, (_id, message) => snaps.push(message));
    room.broadcast(5050, (_id, message) => snaps.push(message));
    expect(snaps.map((s) => s.xp)).toEqual([400, undefined]);
  });

  it('starts a character at the level of its stored XP', () => {
    const room = new Room(new World(mobHouseSource()), { dice: AVERAGE_DICE });
    const traitsFor = (gear: typeof PLAIN_GEAR, level: number) => traitsOf(PLAIN_SCORES, 'fighter', gear, level);
    const p = room.join(0, 1, [5, 10], 'Tordek', undefined, { traits: traitsFor(PLAIN_GEAR, levelOf(950)), traitsFor, gear: PLAIN_GEAR, xp: 950 })!;
    expect(room.welcome(p).xp).toBe(950);
    expect(p.traits.level).toBe(3);
    expect(p.state.hp).toBe(p.traits.maxHp);
    // What it wears keeps its level.
    room.move(p.id, 32 + 10, 0);
    expect(p.traits.level).toBe(3);
  });
});
