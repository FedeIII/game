import { describe, expect, it } from 'vitest';
import {
  AVERAGE_DICE,
  PLAIN_GEAR,
  PLAIN_SCORES,
  Room,
  World,
  checkDialog,
  dialogDeals,
  findDeal,
  shopWares,
  traitsOf,
  wareDeal,
  type Dialog,
  type Gate,
  type NpcDef,
  type Scores,
  type Shop,
  type WorldSource,
} from '../src/index.ts';
import { houseSource } from './helpers.ts';

const CHA_13: Gate = { ability: 'cha', dc: 13 };
const withCha = (cha: number) => traitsOf({ ...PLAIN_SCORES, cha } as Scores, 'fighter', PLAIN_GEAR);

/** A trader: draughts and rings, a friend's price behind CHA 13, a ring of the guild for a member only. */
const SHOP: Shop = {
  buy: [
    { id: 'buy-draught', kind: 'draught', price: 6 },
    { id: 'buy-guild', kind: 'ring', price: 2, when: { quest: 'guild', at: ['member'] } },
  ],
  sell: [{ id: 'sell-ring', kind: 'ring', price: 5, says: 'A fine ring.' }],
  bought: 'Drink it.',
  sold: 'Thank you.',
};
const FRIEND: Shop = { buy: [{ id: 'friend-draught', kind: 'draught', price: 4 }] };

const TRADER: Dialog = {
  name: 'Trader',
  start: 'hi',
  refuse: { when: { quest: 'caravan', at: ['robbing'] }, node: 'wanted' },
  nodes: {
    hi: {
      say: 'Buy something.',
      answers: [
        { text: 'Show me.', next: 'wares', shop: SHOP },
        { text: 'I want to sell.', next: 'wares', shop: SHOP, tab: 'sell' },
        { text: 'A friend price?', next: 'friend', gate: CHA_13, shop: FRIEND },
        { text: 'Bye.' },
      ],
    },
    wares: { say: 'My wares.', answers: [{ text: 'Bye.' }] },
    friend: { say: 'For a friend.', answers: [{ text: 'Bye.' }] },
    wanted: { say: 'Not you.', answers: [{ text: 'Bye.' }] },
  },
};

function traderSource(): WorldSource {
  const npc: NpcDef = { id: 'trader', look: 'innkeeper', home: [12, 12], area: [[12, 12]], content: { speaker: 'fixture', dialog: TRADER } };
  return { ...houseSource(), npcs: () => [npc] };
}

describe('a shop', () => {
  it('makes a deal of each trade: an item for coins, or coins for an item', () => {
    expect(wareDeal(SHOP.buy![0]!, 'buy')).toEqual({ id: 'buy-draught', goods: 'draught', price: 6 });
    expect(wareDeal(SHOP.sell![0]!, 'sell')).toEqual({ id: 'sell-ring', goods: 'coins', price: 0, pay: 5, items: [{ kind: 'ring', count: 1 }] });
    expect(shopWares(FRIEND, 'sell')).toEqual([]);
  });

  it('gives the server every deal of a dialog, with the gates and the conditions of its answer and its ware', () => {
    expect(dialogDeals(TRADER).map((offer) => offer.deal.id)).toEqual(['buy-draught', 'buy-guild', 'sell-ring', 'buy-draught', 'buy-guild', 'sell-ring', 'friend-draught']);
    expect(findDeal(TRADER, 'friend-draught')).toMatchObject({ gates: [CHA_13], when: [] });
    expect(findDeal(TRADER, 'buy-guild')).toMatchObject({ gates: [], when: [{ quest: 'guild', at: ['member'] }] });
    expect(findDeal(TRADER, 'buy-ale')).toBeNull();
  });

  it('is good in a good dialog, and checkDialog finds the problems of a bad one', () => {
    expect(checkDialog(TRADER)).toEqual([]);
    const withAnswer = (answer: Dialog['nodes'][string]['answers'][number]): Dialog => ({
      ...TRADER,
      nodes: { ...TRADER.nodes, hi: { say: 'Buy something.', answers: [answer, { text: 'Bye.' }] } },
    });
    const bad = (answer: Dialog['nodes'][string]['answers'][number]) => checkDialog(withAnswer(answer)).filter((p) => p.includes('shop'));
    expect(bad({ text: 'Show me.', shop: SHOP })).toHaveLength(1);
    expect(bad({ text: 'Show me.', next: 'wares', shop: {} })).toHaveLength(1);
    expect(bad({ text: 'Show me.', next: 'wares', shop: FRIEND, tab: 'sell' })).toHaveLength(1);
    expect(bad({ text: 'Show me.', next: 'wares', shop: { buy: [{ id: 'free', kind: 'cup', price: 0 }] } })).toHaveLength(1);
    expect(bad({ text: 'Show me.', next: 'wares', shop: { buy: [{ id: 'a', kind: 'cup', price: 1 }, { id: 'b', kind: 'cup', price: 2 }] } })).toHaveLength(1);
    // Two trades with one id must be the same: the server finds a deal by its id.
    const twice: Dialog = { ...TRADER, nodes: { ...TRADER.nodes, wares: { say: 'My wares.', answers: [{ text: 'More.', next: 'hi', shop: { buy: [{ id: 'buy-draught', kind: 'draught', price: 9 }] } }, { text: 'Bye.' }] } } };
    expect(checkDialog(twice)).toContain('two deals have the id "buy-draught"');
  });
});

describe('a shop through the server', () => {
  const join = (room: Room, cha: number, pack = { coins: 20, items: [] as { kind: 'ring'; count: number }[] }) =>
    room.join(0, 1, [12, 13], '', undefined, { traits: withCha(cha), pack })!;

  it('sells and buys one item at a time, for the price after Charisma', () => {
    const room = new Room(new World(traderSource()), { dice: AVERAGE_DICE });
    const plain = join(room, 10, { coins: 20, items: [{ kind: 'ring', count: 2 }] });
    const charming = join(room, 16);
    room.tick(0);
    room.tick(20);
    room.deal(plain.id, { npc: 0 }, 'buy-draught');
    room.deal(charming.id, { npc: 0 }, 'buy-draught');
    expect([plain.pack.coins, charming.pack.coins]).toEqual([14, 16]);
    room.deal(plain.id, { npc: 0 }, 'sell-ring');
    expect(plain.pack).toEqual({ coins: 19, items: [{ kind: 'ring', count: 1 }, { kind: 'draught', count: 1 }] });
    // Nothing to sell: nothing changes.
    room.deal(charming.id, { npc: 0 }, 'sell-ring');
    expect(charming.pack.coins).toBe(16);
  });

  it('checks the gate of the answer that opens the shop, the conditions of a ware, and a robber', () => {
    const room = new Room(new World(traderSource()), { dice: AVERAGE_DICE });
    const plain = join(room, 10);
    const charming = join(room, 16);
    const robber = room.join(0, 1, [12, 13], '', undefined, { traits: withCha(16), pack: { coins: 20, items: [] }, quests: { caravan: { step: 'robbing', flags: [], n: 0 } } })!;
    const member = room.join(0, 1, [12, 13], '', undefined, { traits: withCha(10), pack: { coins: 20, items: [] }, quests: { guild: { step: 'member', flags: [], n: 0 } } })!;
    room.tick(0);
    room.tick(20);
    for (const p of [plain, charming, robber]) room.deal(p.id, { npc: 0 }, 'friend-draught');
    expect([plain.pack.coins, charming.pack.coins, robber.pack.coins]).toEqual([20, 17, 20]);
    for (const p of [plain, member]) room.deal(p.id, { npc: 0 }, 'buy-guild');
    expect([plain.pack.coins, member.pack.coins]).toEqual([20, 18]);
  });
});
