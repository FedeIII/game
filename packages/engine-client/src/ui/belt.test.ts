import { describe, expect, it } from 'vitest';
import { PLAIN_SCORES, type Scores } from '@game/engine';
import { BELT, beltKey, countOf, drinkTitle, drinkView } from './belt.ts';

describe('the drink belt', () => {
  it('gives each drink a fixed key: 1 healing draught, 2 strong draught, 3 antidote, 4 herbs', () => {
    expect(BELT.map(beltKey)).toEqual([1, 2, 3, 4]);
    expect(beltKey('ring')).toBe(0);
    expect(drinkTitle('draught')).toBe('Drink a healing draught (1)');
    expect(drinkTitle('herbs')).toBe('Chew a bundle of herbs (4)');
  });

  it('follows the gate rule for herbs (Medicine, WIS 13)', () => {
    const wis = (n: number) => ({ ...PLAIN_SCORES, wis: n }) as Scores;
    expect(drinkView('draught', wis(8))).toBe('open');
    expect(drinkView('herbs', wis(13))).toBe('open');
    expect(drinkView('herbs', wis(11))).toBe('hint');
    expect(drinkView('herbs', wis(10))).toBe('hidden');
    expect(drinkView('cup', wis(18))).toBe('hidden');
  });

  it('counts a kind in all its slots', () => {
    expect(countOf({ coins: 0, items: [{ kind: 'draught', count: 5 }, null, { kind: 'cup', count: 1 }, { kind: 'draught', count: 2 }] }, 'draught')).toBe(7);
  });
});
