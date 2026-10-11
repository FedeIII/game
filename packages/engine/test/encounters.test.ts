import { describe, expect, it } from 'vitest';
import { XP_THRESHOLDS, adjustedXp, sizeEncounter, xpMultiplier, type EncounterUnit } from '../src/index.ts';

/** The scouts of chapter 1.5.1: a worg with its goblin; the hobgoblin on it; the second worg with its goblin; the bugbear on it. */
const SCOUTS: readonly EncounterUnit[] = [['worg', 'goblin'], ['hobgoblin'], ['worg', 'goblin'], ['bugbear']];

describe('the size of an encounter', () => {
  it('counts the 5e XP with the multiplier for the number of monsters', () => {
    expect([1, 2, 3, 6, 7, 11, 15].map(xpMultiplier)).toEqual([1, 1.5, 2, 2, 2.5, 3, 4]);
    expect(adjustedXp(['worg', 'goblin'])).toBe((100 + 50) * 1.5);
    expect(adjustedXp(SCOUTS.flat())).toBe(600 * 2);
    expect(XP_THRESHOLDS.deadly).toBe(400);
  });

  it('gives one character the first unit, more characters more units, and six the whole band of the chapter', () => {
    expect(sizeEncounter(SCOUTS, 1)).toEqual([['worg', 'goblin']]);
    expect(sizeEncounter(SCOUTS, 2).flat()).toEqual(['worg', 'goblin', 'hobgoblin']);
    expect(sizeEncounter(SCOUTS, 3).flat()).toEqual(['worg', 'goblin', 'hobgoblin', 'worg', 'goblin']);
    expect(sizeEncounter(SCOUTS, 4).flat()).toHaveLength(6);
    expect(sizeEncounter(SCOUTS, 6)).toEqual(SCOUTS);
    // Never nothing: at least the first unit.
    expect(sizeEncounter([['bugbear', 'bugbear', 'bugbear']], 1)).toHaveLength(1);
    expect(sizeEncounter(SCOUTS, 0)).toEqual([['worg', 'goblin']]);
  });
});
