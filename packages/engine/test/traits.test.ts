import { describe, expect, it } from 'vitest';
import {
  formatDice,
  type CharacterClass,
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

  it('gives the damage and the attack bonus: with the plain gear (a d8), 1d8 + the modifier of that ability, and +2 + that modifier to hit', () => {
    const of = (over: Partial<Scores>, cls: CharacterClass) => {
      const t = traitsOf(scores(over), cls, PLAIN_GEAR);
      return [formatDice(t.damage), t.toHit];
    };
    expect(of({ int: 17, str: 8 }, 'wizard')).toEqual(['1d8+3', 5]);
    expect(of({ str: 17, int: 8 }, 'wizard')).toEqual(['1d8-1', 1]);
    expect(of({ wis: 15 }, 'cleric')).toEqual(['1d8+2', 4]);
    expect(of({ dex: 8 }, 'rogue')).toEqual(['1d8-1', 1]);
    expect(of({ cha: 13 }, 'warlock')).toEqual(['1d8+1', 3]);
    expect(of({ str: 16 }, 'fighter')).toEqual(['1d8+3', 5]);
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
    // A greataxe: 1d12 + 3, and +2 + 3 to hit.
    expect(formatDice(traits.damage)).toBe('1d12+3');
    expect(traits.toHit).toBe(5);
    expect(traits.wade).toBe(true);
  });

  it('of a guest are all 10: the plain blow, no wading, 6 slots', () => {
    expect(GUEST_TRAITS.damage).toEqual(PLAIN_BLOW.damage);
    expect(GUEST_TRAITS.toHit).toBe(PLAIN_BLOW.toHit);
    expect(GUEST_TRAITS.push).toBe(PLAIN_BLOW.push);
    expect(GUEST_TRAITS.stagger).toBe(PLAIN_BLOW.stagger);
    expect(GUEST_TRAITS.wade).toBe(false);
    expect(GUEST_TRAITS.slots).toBe(6);
  });
});

describe('the Tear of Tigris', () => {
  it('lets its wearer wade and swim, whatever its Strength', () => {
    const plain = traitsOf(scores({}), 'fighter', PLAIN_GEAR);
    expect([plain.wade, plain.swim]).toEqual([false, false]);
    const worn = traitsOf(scores({}), 'fighter', { ...PLAIN_GEAR, neck: 'tear-of-tigris' });
    expect([worn.wade, worn.swim]).toEqual([true, true]);
  });
});
