import { describe, expect, it } from 'vitest';
import { EMPTY_BOOK, PLAIN_GEAR, PLAIN_SCORES, kitOf, traitsOf, type Dialog, type Gear, type Pack, type Scores, type Shop } from '@game/engine';
import { Conversation } from './conversation.ts';
import { wareRows, type TraderFacts } from './shop-panel.ts';

const SHOP: Shop = {
  buy: [
    { id: 'buy-draught', kind: 'draught', price: 6 },
    { id: 'buy-plate', kind: 'plate-armour', price: 150 },
    { id: 'buy-secret', kind: 'antidote', price: 4, gate: { ability: 'cha', dc: 13 } },
    { id: 'buy-permit', kind: 'mithril', price: 5, when: { has: 'mithril-permit' } },
  ],
  sell: [
    { id: 'sell-ring', kind: 'ring', price: 5 },
    { id: 'sell-shield', kind: 'shield', price: 2 },
    { id: 'sell-cup', kind: 'cup', price: 3 },
  ],
};

const facts = (pack: Pack, cha = 10, gear: Gear = PLAIN_GEAR): TraderFacts => ({
  pack,
  gear,
  book: EMPTY_BOOK,
  traits: traitsOf({ ...PLAIN_SCORES, cha } as Scores, 'fighter', gear),
});

describe('the rows of a shop', () => {
  it('give the price for the player, and why a purchase cannot go', () => {
    const rows = wareRows(SHOP, 'buy', facts({ coins: 10, items: [{ kind: 'draught', count: 2 }] }));
    expect(rows.map((r) => [r.ware.id, r.coins, r.have, r.problem])).toEqual([
      ['buy-draught', 6, 2, null],
      ['buy-plate', 150, 0, 'coins'],
    ]);
    // Charisma: a better price; CHA 11 is 1 or 2 short of the gate, so the ware shows dim.
    const charming = wareRows(SHOP, 'buy', facts({ coins: 10, items: [] }, 16));
    expect(charming.map((r) => [r.ware.id, r.coins, r.problem])).toEqual([
      ['buy-draught', 4, null],
      ['buy-plate', 105, 'coins'],
      ['buy-secret', 3, null],
    ]);
    expect(wareRows(SHOP, 'buy', facts({ coins: 10, items: [] }, 11)).find((r) => r.ware.id === 'buy-secret')?.problem).toBe('gate');
  });

  it('show a ware with conditions only when they hold, and no room as a problem', () => {
    const permit: Pack = { coins: 10, items: [{ kind: 'mithril-permit', count: 1 }] };
    expect(wareRows(SHOP, 'buy', facts(permit)).map((r) => r.ware.id)).toContain('buy-permit');
    const full: Pack = { coins: 10, items: Array.from({ length: 6 }, () => ({ kind: 'candle' as const, count: 10 })) };
    expect(wareRows(SHOP, 'buy', facts(full)).find((r) => r.ware.id === 'buy-draught')?.problem).toBe('room');
  });

  it('put the items that the player has first on the side to sell, and say why the others cannot go', () => {
    const rows = wareRows(SHOP, 'sell', facts({ coins: 0, items: [{ kind: 'cup', count: 3 }] }, 10, kitOf('fighter')));
    expect(rows.map((r) => [r.ware.id, r.coins, r.have, r.problem])).toEqual([
      ['sell-cup', 3, 3, null],
      ['sell-ring', 5, 0, 'none'],
      // The fighter wears its shield: it must take it off first.
      ['sell-shield', 2, 0, 'worn'],
    ]);
  });
});

describe('an answer that opens a shop', () => {
  it('goes on to its node, where the conversation waits while the shop is open', () => {
    const dialog: Dialog = {
      name: 'Corwin',
      start: 'hi',
      nodes: {
        hi: { say: 'I buy things.', answers: [{ text: 'What do you buy?', next: 'buys', shop: SHOP, tab: 'sell' }, { text: 'Bye.' }] },
        buys: { say: 'Rings and cups.', answers: [{ text: 'Bye.' }] },
      },
    };
    const talk = new Conversation(dialog);
    expect(talk.choose(0)?.say).toBe('Rings and cups.');
    expect(talk.id).toBe('buys');
  });
});
