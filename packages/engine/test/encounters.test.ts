import { describe, expect, it } from 'vitest';
import { XP_THRESHOLDS, adjustedXp, sizeEncounter, xpMultiplier, type EncounterUnit } from '../src/index.ts';

/** The scouts of chapter 1.5.1: a worg with its goblin; the hobgoblin on it; the second worg with its goblin; the bugbear on it. */
const SCOUTS: readonly EncounterUnit[] = [['worg', 'goblin'], ['hobgoblin'], ['worg', 'goblin'], ['bugbear']];

describe('the size of an encounter', () => {
  it('counts the 5e XP with the multiplier for the number of monsters', () => {
    expect([1, 2, 3, 6, 7, 11, 15].map(xpMultiplier)).toEqual([1, 1.5, 2, 2, 2.5, 3, 4]);
    expect(adjustedXp(['worg', 'goblin'])).toBe((100 + 50) * 1.5);
    expect(adjustedXp(SCOUTS.flat())).toBe(600 * 2);
    // One level-1 character (since 2026-10-13).
    expect(XP_THRESHOLDS.deadly).toBe(100);
  });

  it('gives one character the first unit, more characters more units, and thirteen level-1 characters the whole band of the chapter', () => {
    // The chapter's band is for six level-3 characters: in XP, about thirteen of level 1.
    for (const players of [1, 2, 3, 4, 5]) expect(sizeEncounter(SCOUTS, players)).toEqual([['worg', 'goblin']]);
    expect(sizeEncounter(SCOUTS, 6).flat()).toEqual(['worg', 'goblin', 'hobgoblin']);
    expect(sizeEncounter(SCOUTS, 12).flat()).toEqual(['worg', 'goblin', 'hobgoblin', 'worg', 'goblin']);
    expect(sizeEncounter(SCOUTS, 13)).toEqual(SCOUTS);
    // Never nothing: at least the first unit.
    expect(sizeEncounter([['bugbear', 'bugbear', 'bugbear']], 1)).toHaveLength(1);
    expect(sizeEncounter(SCOUTS, 0)).toEqual([['worg', 'goblin']]);
  });
});
