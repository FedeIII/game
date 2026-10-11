import { describe, expect, it } from 'vitest';
import {
  ABILITIES,
  ATTACK_ABILITY,
  CLASSES,
  CLASS_PRIMARY,
  GUEST_TRAITS,
  PLAIN_BLOW,
  meetsGate,
  sheetTraits,
  traitsOf,
  type Ability,
  type Scores,
  PLAIN_GEAR,
  sheetKit,
} from '../src/index.ts';

const scores = (over: Partial<Scores> = {}): Scores => ({ ...(Object.fromEntries(ABILITIES.map((a) => [a, 10])) as Record<Ability, number>), ...over });

describe('the attack ability of each class (Option B)', () => {
  it('is one of the abilities that the builder marks for the class', () => {
    for (const cls of CLASSES) expect(CLASS_PRIMARY[cls]).toContain(ATTACK_ABILITY[cls]);
  });

  it('gives the damage: with the plain gear (a d8), 4 + the modifier of that ability', () => {
    expect(traitsOf(scores({ int: 17, str: 8 }), 'wizard', PLAIN_GEAR).damage).toBe(7);
    expect(traitsOf(scores({ str: 17, int: 8 }), 'wizard', PLAIN_GEAR).damage).toBe(3);
    expect(traitsOf(scores({ wis: 15 }), 'cleric', PLAIN_GEAR).damage).toBe(6);
    expect(traitsOf(scores({ dex: 8 }), 'rogue', PLAIN_GEAR).damage).toBe(3);
    expect(traitsOf(scores({ cha: 13 }), 'warlock', PLAIN_GEAR).damage).toBe(5);
    expect(traitsOf(scores({ str: 16 }), 'fighter', PLAIN_GEAR).damage).toBe(7);
  });
});

describe('Strength', () => {
  it('pushes and staggers for every class, 15% and 20% for each point of the modifier', () => {
    const strong = traitsOf(scores({ str: 17 }), 'wizard', PLAIN_GEAR);
    expect(strong.push).toBeCloseTo(1.45);
    expect(strong.stagger).toBeCloseTo(1.6);
    const weak = traitsOf(scores({ str: 8 }), 'barbarian', PLAIN_GEAR);
    expect(weak.push).toBeCloseTo(0.85);
    expect(weak.stagger).toBeCloseTo(0.8);
  });

  it('gives 6 + 2 x the modifier slots: 4 to 12', () => {
    expect(traitsOf(scores({ str: 8 }), 'bard', PLAIN_GEAR).slots).toBe(4);
    expect(traitsOf(scores({ str: 10 }), 'bard', PLAIN_GEAR).slots).toBe(6);
    expect(traitsOf(scores({ str: 17 }), 'bard', PLAIN_GEAR).slots).toBe(12);
  });

  it('lets a character wade from 13 on: a fixed gate, no roll', () => {
    expect(traitsOf(scores({ str: 12 }), 'fighter', PLAIN_GEAR).wade).toBe(false);
    expect(traitsOf(scores({ str: 13 }), 'fighter', PLAIN_GEAR).wade).toBe(true);
    expect(meetsGate(scores({ str: 13 }), { ability: 'str', min: 13 })).toBe(true);
    expect(meetsGate(scores({ str: 12 }), { ability: 'str', min: 13 })).toBe(false);
  });
});

describe('the traits of a sheet', () => {
  it('count the increases of the race, and the kit of the class', () => {
    const sheet = { race: 'half-orc', class: 'barbarian', base: { str: 15, dex: 14, con: 13, int: 8, wis: 10, cha: 8 }, bonus: [] } as const;
    const traits = sheetTraits(sheet, sheetKit(sheet));
    expect(traits.scores.str).toBe(17);
    // A greataxe (d12): 6 + 3.
    expect(traits.damage).toBe(9);
    expect(traits.wade).toBe(true);
  });

  it('of a guest are all 10: the plain blow, no wading, 6 slots', () => {
    expect(GUEST_TRAITS.damage).toBe(PLAIN_BLOW.damage);
    expect(GUEST_TRAITS.push).toBe(PLAIN_BLOW.push);
    expect(GUEST_TRAITS.stagger).toBe(PLAIN_BLOW.stagger);
    expect(GUEST_TRAITS.wade).toBe(false);
    expect(GUEST_TRAITS.slots).toBe(6);
  });
});
