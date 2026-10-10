import { describe, expect, it } from 'vitest';
import { ITEM_KINDS, PLAIN_SCORES, type Scores } from '@game/engine';
import { BELT, beltKey, countOf, drinkTitle, drinkView } from './belt.ts';
import { packOrder } from './pack-panel.ts';

describe('the order of the pack panel', () => {
  it('shows drinks first, then what goes into brews, then trinkets; the fuller stack of a kind first', () => {
    const order = packOrder([
      { kind: 'candle', count: 1 },
      { kind: 'imp-horn', count: 3 },
      { kind: 'imp-horn', count: 10 },
      { kind: 'antidote', count: 1 },
      { kind: 'herbs', count: 2 },
      { kind: 'draught', count: 4 },
    ]);
    expect(order.map((s) => `${s.kind} ${s.count}`)).toEqual(['draught 4', 'antidote 1', 'herbs 2', 'imp-horn 10', 'imp-horn 3', 'candle 1']);
  });

  it('has a place for every kind of item', () => {
    expect(packOrder(ITEM_KINDS.map((kind) => ({ kind, count: 1 })))).toHaveLength(ITEM_KINDS.length);
  });
});

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
    expect(countOf({ coins: 0, items: [{ kind: 'draught', count: 5 }, { kind: 'cup', count: 1 }, { kind: 'draught', count: 2 }] }, 'draught')).toBe(7);
  });
});
