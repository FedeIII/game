import { describe, expect, it } from 'vitest';
import { AVERAGE_DICE, Room, World, attackRoll, averageDice, dice, edgeOf, formatDice, rollDice, rollingDice, toWireBlow, type DiceSource, type SnapshotMessage } from '../src/index.ts';
import { mobHouseSource } from './helpers.ts';

/** A source that rolls the same share of each die (0: a natural 1; 0.999: the highest face). */
const fixed = (share: number): DiceSource => ({ kind: 'roll', random: () => share });

/** A small seeded generator, for rolls that look random but are the same each run. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

describe('dice', () => {
  it('read as 5e writes them, and have their average', () => {
    expect(formatDice(dice(1, 8, 3))).toBe('1d8+3');
    expect(formatDice(dice(2, 6))).toBe('2d6');
    expect(formatDice(dice(1, 8, -1))).toBe('1d8-1');
    expect(formatDice(dice(0, 0, 1))).toBe('1');
    expect(averageDice(dice(1, 8, 3))).toBe(7);
    expect(averageDice(dice(2, 6, 3))).toBe(10);
    expect(averageDice(dice(2, 4, 2))).toBe(7);
  });

  it('roll from 1 to their sides each, never below 0, and twice the dice on a critical hit', () => {
    const roll = rollingDice(seeded(7));
    const seen = new Set<number>();
    for (let i = 0; i < 400; i++) {
      const r = rollDice(dice(1, 6), roll);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(6);
      seen.add(r);
    }
    expect(seen.size).toBe(6);
    expect(rollDice(dice(1, 4, -5), fixed(0))).toBe(0);
    expect(rollDice(dice(2, 6, 3), fixed(0.999), true)).toBe(4 * 6 + 3);
    expect(rollDice(dice(2, 6, 3), AVERAGE_DICE)).toBe(10);
  });

  it('make an attack roll: d20 + the bonus against the AC; a natural 20 always hits (critical), a natural 1 always misses', () => {
    expect(attackRoll(4, 15, fixed(0.5))).toEqual({ hit: true, crit: false, natural: 11 });
    expect(attackRoll(4, 16, fixed(0.5))).toEqual({ hit: false, crit: false, natural: 11 });
    expect(attackRoll(-10, 30, fixed(0.999))).toEqual({ hit: true, crit: true, natural: 20 });
    expect(attackRoll(30, 5, fixed(0))).toEqual({ hit: false, crit: false, natural: 1 });
    expect(attackRoll(0, 99, AVERAGE_DICE).hit).toBe(true);
  });

  it('hit about as 5e says: +5 against AC 15 hits 55% of the time', () => {
    const roll = rollingDice(seeded(11));
    let hits = 0;
    for (let i = 0; i < 4000; i++) if (attackRoll(5, 15, roll).hit) hits++;
    expect(hits / 4000).toBeGreaterThan(0.5);
    expect(hits / 4000).toBeLessThan(0.6);
  });
});

describe('advantage and disadvantage', () => {
  it('take the higher or the lower of two d20 (5e), and cancel out', () => {
    // Two dice: the first shows 4, the second 17.
    const two = (): DiceSource => {
      const faces = [3.5 / 20, 16.5 / 20];
      let i = 0;
      return { kind: 'roll', random: () => faces[i++ % 2]! };
    };
    expect(attackRoll(0, 10, two(), 1).natural).toBe(17);
    expect(attackRoll(0, 10, two(), -1).natural).toBe(4);
    expect(attackRoll(0, 10, two(), 0).natural).toBe(4);
    expect(edgeOf(true, true)).toBe(0);
    expect(edgeOf(true, false)).toBe(1);
    expect(edgeOf(false, true)).toBe(-1);
  });

  it('change the odds as 5e says: +5 against AC 15 hits 55% alone, 80% with advantage, 30% with disadvantage', () => {
    for (const [edge, share] of [
      [1, 0.7975],
      [-1, 0.3025],
    ] as const) {
      const roll = rollingDice(seeded(11));
      let hits = 0;
      for (let i = 0; i < 20000; i++) if (attackRoll(5, 15, roll, edge).hit) hits++;
      expect(Math.abs(hits / 20000 - share)).toBeLessThan(0.015);
    }
  });
});

describe('the results of the blows in a shared world', () => {
  it('go to the player who struck, in its next snapshot (protocol 26), and to no other', () => {
    const room = new Room(new World(mobHouseSource()), { dice: AVERAGE_DICE });
    const a = room.join(0, 1, [5, 10])!;
    const b = room.join(0, 2, [5, 12])!;
    const imp = room.horde!.spawn('imp', a.state.x + 18, a.state.y);
    room.input(a.id, { t: 'in', s: 1, i: [[0, 0, 4]] }, 100);
    const sent = new Map<number, SnapshotMessage>();
    room.broadcast(0, (id, m) => sent.set(id, m));
    expect(sent.get(a.id)!.bl).toHaveLength(1);
    expect(sent.get(a.id)!.bl![0]![0]).toBe(imp.id);
    expect(sent.get(a.id)!.bl![0]![1]).toBeGreaterThan(0);
    expect(sent.get(b.id)!.bl).toBeUndefined();
    room.broadcast(50, (id, m) => sent.set(id, m));
    expect(sent.get(a.id)!.bl).toBeUndefined();
    expect(toWireBlow({ mob: imp, damage: 0, crit: false })).toEqual([imp.id, 0, 0]);
  });
});
