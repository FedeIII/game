import { describe, expect, it } from 'vitest';
import {
  ABILITIES,
  BASE_SCORES,
  CLASSES,
  GENDERS,
  POINT_BUY,
  RACES,
  VARIANT_MAX,
  abilityModifier,
  appearanceOf,
  appearanceSeed,
  checkPlace,
  checkSheet,
  finalScores,
  pointCost,
  pointsSpent,
  raceBonus,
  type CharacterSheet,
} from '../src/index.ts';

const sheet = (over: Partial<CharacterSheet> = {}): CharacterSheet => ({
  name: 'Bruenor',
  race: 'dwarf',
  class: 'fighter',
  gender: 'male',
  variant: 1234,
  base: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
  bonus: [],
  ...over,
});

describe('point buy (SRD 5.1)', () => {
  it('costs 0 to 9 points for scores 8 to 15, with 14 and 15 dearer', () => {
    expect([8, 9, 10, 11, 12, 13, 14, 15].map(pointCost)).toEqual([0, 1, 2, 3, 4, 5, 7, 9]);
    expect(pointCost(7)).toBeNaN();
    expect(pointCost(16)).toBeNaN();
    expect(pointsSpent(BASE_SCORES)).toBe(0);
  });

  it('allows the classic spreads of 27 points', () => {
    // 15, 15, 15, 8, 8, 8 and 15, 14, 13, 12, 10, 8 both cost exactly 27.
    expect(pointsSpent({ str: 15, dex: 15, con: 15, int: 8, wis: 8, cha: 8 })).toBe(POINT_BUY.budget);
    expect(pointsSpent({ str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 })).toBe(POINT_BUY.budget);
    expect(checkSheet(sheet({ base: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 } })).ok).toBe(true);
  });

  it('refuses more than 27 points, and scores out of 8 to 15', () => {
    expect(checkSheet(sheet({ base: { str: 15, dex: 15, con: 15, int: 9, wis: 8, cha: 8 } }))).toEqual({ ok: false, error: 'points' });
    expect(checkSheet(sheet({ base: { ...BASE_SCORES, str: 16 } }))).toEqual({ ok: false, error: 'base.str' });
    expect(checkSheet(sheet({ base: { ...BASE_SCORES, cha: 7 } }))).toEqual({ ok: false, error: 'base.cha' });
  });
});

describe('racial increases', () => {
  it('gives each race its SRD increases', () => {
    expect(raceBonus('human', [])).toEqual({ str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 });
    expect(raceBonus('dwarf', [])).toMatchObject({ con: 2, wis: 1, str: 0 });
    expect(raceBonus('half-orc', [])).toMatchObject({ str: 2, con: 1 });
    expect(finalScores(BASE_SCORES, 'elf', [])).toMatchObject({ dex: 10, int: 9, str: 8 });
  });

  it('lets a half-elf choose two other abilities for +1, and nobody else', () => {
    expect(raceBonus('half-elf', ['str', 'con'])).toEqual({ str: 1, dex: 0, con: 1, int: 0, wis: 0, cha: 2 });
    expect(checkSheet(sheet({ race: 'half-elf', bonus: ['str', 'con'] })).ok).toBe(true);
    expect(checkSheet(sheet({ race: 'half-elf', bonus: ['str'] }))).toEqual({ ok: false, error: 'bonus' });
    expect(checkSheet(sheet({ race: 'half-elf', bonus: ['str', 'cha'] }))).toEqual({ ok: false, error: 'bonus' });
    expect(checkSheet(sheet({ race: 'half-elf', bonus: ['str', 'str'] }))).toEqual({ ok: false, error: 'bonus' });
    expect(checkSheet(sheet({ race: 'human', bonus: ['str'] }))).toEqual({ ok: false, error: 'bonus' });
  });

  it('gives the modifier of a score', () => {
    expect([1, 8, 9, 10, 11, 15, 17, 20].map(abilityModifier)).toEqual([-5, -1, -1, 0, 0, 2, 3, 5]);
  });
});

describe('the look in one seed', () => {
  it('keeps race, class, gender and variant through a seed', () => {
    for (const race of RACES) {
      for (const cls of CLASSES) {
        for (const gender of GENDERS) {
          for (const variant of [0, 1, 4242, VARIANT_MAX]) {
            const look = { race, class: cls, gender, variant };
            const seed = appearanceSeed(look);
            expect(Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff).toBe(true);
            expect(appearanceOf(seed)).toEqual(look);
          }
        }
      }
    }
  });

  it('gives a valid look for any 32-bit number', () => {
    for (const seed of [0, 7, 15, 0x7f, 0x1ff, 0xffffffff, 2654435761]) {
      const look = appearanceOf(seed);
      expect(RACES).toContain(look.race);
      expect(CLASSES).toContain(look.class);
      expect(GENDERS).toContain(look.gender);
    }
  });
});

describe('checkSheet', () => {
  it('cleans the name and refuses a name too short', () => {
    const check = checkSheet(sheet({ name: '  Ana   de  <b>Luz</b> ' }));
    expect(check.ok && check.sheet.name).toBe('Ana de bLuzb');
    expect(checkSheet(sheet({ name: 'A' }))).toEqual({ ok: false, error: 'name' });
    expect(checkSheet(sheet({ name: '<>' }))).toEqual({ ok: false, error: 'name' });
  });

  it('refuses unknown races, classes, genders and variants', () => {
    expect(checkSheet({ ...sheet(), race: 'dragonborn' })).toEqual({ ok: false, error: 'race' });
    expect(checkSheet({ ...sheet(), class: 'artificer' })).toEqual({ ok: false, error: 'class' });
    expect(checkSheet({ ...sheet(), gender: 'x' })).toEqual({ ok: false, error: 'gender' });
    expect(checkSheet(sheet({ variant: VARIANT_MAX + 1 }))).toEqual({ ok: false, error: 'variant' });
    expect(checkSheet(sheet({ variant: 1.5 }))).toEqual({ ok: false, error: 'variant' });
    expect(checkSheet(null)).toEqual({ ok: false, error: 'not an object' });
  });

  it('keeps only the known fields', () => {
    const check = checkSheet({ ...sheet(), admin: true, base: { ...sheet().base, luck: 18 } });
    expect(check.ok).toBe(true);
    if (check.ok) {
      expect(Object.keys(check.sheet).sort()).toEqual(['base', 'bonus', 'class', 'gender', 'name', 'race', 'variant']);
      expect(Object.keys(check.sheet.base).sort()).toEqual([...ABILITIES].sort());
    }
  });
});

describe('the place of a character', () => {
  it('takes a world id and two finite numbers in range, and nothing else', () => {
    expect(checkPlace({ world: 'wilds', x: 12.5, y: -3, extra: 1 })).toEqual({ world: 'wilds', x: 12.5, y: -3 });
    for (const bad of [null, 'wilds', {}, { world: 'wilds', x: 1 }, { world: 'Wilds!', x: 1, y: 1 }, { world: 'wilds', x: Number.NaN, y: 1 }, { world: 'wilds', x: '1', y: 1 }, { world: 'wilds', x: 1, y: 1e9 }]) {
      expect(checkPlace(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});
