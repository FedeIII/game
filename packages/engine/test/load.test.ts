import { describe, expect, it } from 'vitest';
import {
  CARRY_PER_STR,
  EMPTY_GEAR,
  EMPTY_PACK,
  ITEM_KINDS,
  ITEM_WEIGHT,
  PLAIN_GEAR,
  PLAIN_SCORES,
  Prediction,
  ROLLS,
  Room,
  World,
  gearWeight,
  kitOf,
  loadCode,
  loadFromCode,
  loadOf,
  loadTier,
  packWeight,
  traitsOf,
  type Pack,
  type Scores,
  type SnapshotMessage,
} from '../src/index.ts';
import { textSource } from './helpers.ts';

const withStr = (str: number) => traitsOf({ ...PLAIN_SCORES, str } as Scores, 'fighter', PLAIN_GEAR);

describe('the weight of items', () => {
  it('is a multiple of half a pound for every kind, and the armour weighs as in 5e', () => {
    for (const kind of ITEM_KINDS) expect((ITEM_WEIGHT[kind] * 2) % 1).toBe(0);
    expect([ITEM_WEIGHT['leather-armour'], ITEM_WEIGHT['chain-mail'], ITEM_WEIGHT['plate-armour'], ITEM_WEIGHT.shield]).toEqual([10, 55, 65, 6]);
  });

  it('adds up the pack, its coins in whole pounds, and the worn items', () => {
    const pack: Pack = { coins: 120, items: [{ kind: 'draught', count: 3 }, null, { kind: 'brute-tusk', count: 4 }] };
    expect(packWeight(pack)).toBe(2 + 1.5 + 8);
    expect(gearWeight(kitOf('fighter'))).toBe(55 + 6 + 3);
    expect(loadOf(pack, kitOf('fighter'))).toBe(11.5 + 64);
    expect(loadOf(EMPTY_PACK, EMPTY_GEAR)).toBe(0);
  });
});

describe('the load', () => {
  it('gives a character a carrying capacity of 15 x STR, with the Strength of its worn items', () => {
    expect(withStr(10).carry).toBe(150);
    expect(withStr(8).carry).toBe(8 * CARRY_PER_STR);
    const ogre = traitsOf(PLAIN_SCORES, 'fighter', { ...PLAIN_GEAR, gloves: 'gauntlets-of-ogre-power' });
    expect(ogre.carry).toBe(19 * CARRY_PER_STR);
  });

  it('has four tiers: up to 5, 10 and 15 x STR, and overloaded above', () => {
    const carry = withStr(10).carry;
    expect([0, 50, 50.5, 100, 100.5, 150, 150.5].map((load) => loadTier(load, carry))).toEqual(['light', 'light', 'medium', 'medium', 'heavy', 'heavy', 'over']);
  });

  it('of a fighter in its kit is light with STR 13, and medium with less', () => {
    expect(loadTier(gearWeight(kitOf('fighter')), withStr(13).carry)).toBe('light');
    expect(loadTier(gearWeight(kitOf('fighter')), withStr(12).carry)).toBe('medium');
  });

  it('has a code on the wire', () => {
    for (const tier of ['light', 'medium', 'heavy', 'over'] as const) expect(loadFromCode(loadCode(tier))).toBe(tier);
    expect(loadFromCode(9)).toBe('light');
  });
});

describe('the roll of a load in a shared world', () => {
  const world = () => new World(textSource([]));
  // Two suits of plate armour in the pack: 130 lb, heavy for STR 10 (more than 100 lb).
  const heavy: Pack = { coins: 0, items: [{ kind: 'plate-armour', count: 1 }, { kind: 'plate-armour', count: 1 }] };

  it('comes from the pack and the gear that the server keeps, and its client repeats it', () => {
    const room = new Room(world());
    const traits = withStr(10);
    const p = room.join(0, 1, [10, 10], '', undefined, { traits, pack: heavy })!;
    let snap: SnapshotMessage | null = null;
    room.broadcast(0, (id, message) => {
      if (id === p.id) snap = message;
    });
    expect(loadFromCode(snap!.you[29])).toBe('heavy');
    const prediction = new Prediction();
    prediction.traits = traits;
    const client = world();
    const mine = { ...p.state };
    prediction.reconcile(mine, client, snap!, []);
    expect(mine.load).toBe('heavy');
    // A roll: the client predicts the heavy roll at once, and the server makes the same.
    prediction.step(mine, client, { x: 1, y: 0, dodge: true });
    expect([mine.dodgeKind, mine.dodgeSafe]).toEqual(['heavy', ROLLS.heavy.safe]);
    room.input(p.id, { t: 'in', s: 1, i: [[100, 0, 0, 1]] }, 16);
    expect([p.state.dodgeKind, p.state.dodge, p.state.dodgeSafe]).toEqual(['heavy', ROLLS.heavy.ticks - 1, ROLLS.heavy.safe]);
    expect([mine.dodge, mine.x]).toEqual([p.state.dodge, p.state.x]);
    room.broadcast(16, (id, message) => {
      if (id === p.id) snap = message;
    });
    prediction.reconcile(mine, client, snap!, []);
    expect([mine.dodgeKind, mine.dodge, mine.dodgeSafe, mine.x]).toEqual(['heavy', p.state.dodge, p.state.dodgeSafe, p.state.x]);
  });

  it('changes with the pack: the same character rolls light without the armour', () => {
    const room = new Room(world());
    const p = room.join(0, 1, [10, 10], '', undefined, { traits: withStr(10), pack: EMPTY_PACK })!;
    room.input(p.id, { t: 'in', s: 1, i: [[100, 0, 0, 1]] }, 16);
    expect(p.state.dodgeKind).toBe('light');
  });
});
