import { describe, expect, it } from 'vitest';
import { EMPTY_PACK, ITEM_STACK, MAX_COINS, MOB_LOOT, addToPack, checkPack, random, rollLoot, type Pack } from '../src/index.ts';

describe('a pack', () => {
  it('puts coins in the purse and an item on its stack first, then in a free slot', () => {
    let pack: Pack = EMPTY_PACK;
    pack = addToPack(pack, { coins: 5, items: [{ kind: 'ring', count: 1 }] }, 4).pack;
    pack = addToPack(pack, { coins: 2, items: [{ kind: 'ring', count: 2 }, { kind: 'cup', count: 1 }] }, 4).pack;
    expect(pack).toEqual({ coins: 7, items: [{ kind: 'ring', count: 3 }, { kind: 'cup', count: 1 }] });
  });

  it('starts a new slot when a stack is full', () => {
    const full = { coins: 0, items: [{ kind: 'candle' as const, count: ITEM_STACK.candle }] };
    expect(addToPack(full, { coins: 0, items: [{ kind: 'candle', count: 2 }] }, 2).pack.items).toEqual([
      { kind: 'candle', count: ITEM_STACK.candle },
      { kind: 'candle', count: 2 },
    ]);
  });

  it('gives back what does not fit, and keeps the coins', () => {
    const pack = { coins: 0, items: [{ kind: 'ring' as const, count: 1 }] };
    const result = addToPack(pack, { coins: 4, items: [{ kind: 'cup', count: 1 }, { kind: 'ring', count: 1 }] }, 1);
    expect(result.pack).toEqual({ coins: 4, items: [{ kind: 'ring', count: 2 }] });
    expect(result.taken).toEqual({ coins: 4, items: [{ kind: 'ring', count: 1 }] });
    expect(result.left).toEqual({ coins: 0, items: [{ kind: 'cup', count: 1 }] });
  });

  it('holds at most MAX_COINS', () => {
    const result = addToPack({ coins: MAX_COINS - 1, items: [] }, { coins: 5, items: [] }, 4);
    expect(result.pack.coins).toBe(MAX_COINS);
    expect(result.left.coins).toBe(4);
  });

  it('is checked when it comes from the store', () => {
    expect(checkPack({ coins: 3, items: [{ kind: 'herbs', count: 2 }] })).toEqual({ coins: 3, items: [{ kind: 'herbs', count: 2 }] });
    expect(checkPack({ coins: -1, items: [] })).toBeNull();
    expect(checkPack({ coins: 0, items: [{ kind: 'sword', count: 1 }] })).toBeNull();
    expect(checkPack({ coins: 0, items: [{ kind: 'ring', count: ITEM_STACK.ring + 1 }] })).toBeNull();
    expect(checkPack('pack')).toBeNull();
  });
});

describe('loot', () => {
  it('gives the same from the same random source', () => {
    const table = { coins: [1, 9] as const, items: [{ chance: 0.5, pick: [['ring', 1], ['cup', 2]] as const }] };
    expect(rollLoot(table, random(5))).toEqual(rollLoot(table, random(5)));
  });

  it('of a brute: 2 to 6 coins always, a tusk in about one kill of two', () => {
    const rand = random(11);
    let tusks = 0;
    for (let i = 0; i < 2000; i++) {
      const drop = rollLoot(MOB_LOOT.brute, rand);
      expect(drop.coins).toBeGreaterThanOrEqual(2);
      expect(drop.coins).toBeLessThanOrEqual(6);
      tusks += drop.items.filter((s) => s.kind === 'brute-tusk').length;
    }
    expect(tusks / 2000).toBeGreaterThan(0.45);
    expect(tusks / 2000).toBeLessThan(0.55);
  });

  it('of an imp: no coins, a horn in about one kill of three', () => {
    const rand = random(12);
    let horns = 0;
    for (let i = 0; i < 3000; i++) {
      const drop = rollLoot(MOB_LOOT.imp, rand);
      expect(drop.coins).toBe(0);
      horns += drop.items.length;
    }
    expect(horns / 3000).toBeGreaterThan(0.29);
    expect(horns / 3000).toBeLessThan(0.38);
  });
});
