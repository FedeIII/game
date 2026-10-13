import { describe, expect, it } from 'vitest';
import { XP_THRESHOLDS, adjustedXp, sizeEncounter, thresholdsOf, xpMultiplier, type EncounterUnit } from '../src/index.ts';

/** The scouts of chapter 1.5.1: a worg with its goblin; the hobgoblin on it; the second worg with its goblin; the bugbear on it. */
const SCOUTS: readonly EncounterUnit[] = [['worg', 'goblin'], ['hobgoblin'], ['worg', 'goblin'], ['bugbear']];

/** A party of `count` characters of one level. */
const party = (count: number, level = 1): number[] => Array.from({ length: count }, () => level);

describe('the size of an encounter', () => {
  it('counts the 5e XP with the multiplier for the number of monsters', () => {
    expect([1, 2, 3, 6, 7, 11, 15].map(xpMultiplier)).toEqual([1, 1.5, 2, 2, 2.5, 3, 4]);
    expect(adjustedXp(['worg', 'goblin'])).toBe((100 + 50) * 1.5);
    expect(adjustedXp(SCOUTS.flat())).toBe(600 * 2);
    // The deadly budget of one character of each level (5e, Dungeon Master's Guide).
    expect(XP_THRESHOLDS.map((t) => t.deadly)).toEqual([100, 200, 400, 500, 1100]);
    expect(thresholdsOf(0)).toBe(XP_THRESHOLDS[0]);
    expect(thresholdsOf(9)).toBe(XP_THRESHOLDS[4]);
  });

  it('gives one character the first unit, more characters more units, and thirteen level-1 characters the whole band of the chapter', () => {
    // The chapter's band is for six level-3 characters: in XP, about thirteen of level 1.
    for (const players of [1, 2, 3, 4, 5]) expect(sizeEncounter(SCOUTS, party(players))).toEqual([['worg', 'goblin']]);
    expect(sizeEncounter(SCOUTS, party(6)).flat()).toEqual(['worg', 'goblin', 'hobgoblin']);
    expect(sizeEncounter(SCOUTS, party(12)).flat()).toEqual(['worg', 'goblin', 'hobgoblin', 'worg', 'goblin']);
    expect(sizeEncounter(SCOUTS, party(13))).toEqual(SCOUTS);
    // Never nothing: at least the first unit.
    expect(sizeEncounter([['bugbear', 'bugbear', 'bugbear']], party(1))).toHaveLength(1);
    expect(sizeEncounter(SCOUTS, [])).toEqual([['worg', 'goblin']]);
  });

  it('sizes the encounter for the levels of the characters there', () => {
    // Six level-3 characters: the band of the chapter, as the chapter made it.
    expect(sizeEncounter(SCOUTS, party(6, 3))).toEqual(SCOUTS);
    // One level-5 character has the budget of eleven of level 1.
    expect(sizeEncounter(SCOUTS, party(1, 5))).toEqual(sizeEncounter(SCOUTS, party(11)));
    // A party of mixed levels adds the budget of each one.
    expect(sizeEncounter(SCOUTS, [3, 1, 1, 1, 1, 1])).toEqual(sizeEncounter(SCOUTS, party(9)));
  });
});
