import { describe, expect, it } from 'vitest';
import { EMPTY_PACK, ITEM_STACK, MAX_COINS, MOB_LOOT, addToPack, checkPack, moveInPack, random, removeFromPack, removeFromSlot, rollLoot, usedSlots, type Pack } from '../src/index.ts';

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
    // A free slot is null; the free slots at the end go.
    expect(checkPack({ coins: 0, items: [null, { kind: 'cup', count: 1 }, null] })).toEqual({ coins: 0, items: [null, { kind: 'cup', count: 1 }] });
    expect(checkPack({ coins: 0, items: [0] })).toBeNull();
  });

  it('keeps each stack in its slot: a stack that goes leaves a free slot, and a new one takes the first free slot', () => {
    const ring = { kind: 'ring' as const, count: 2 };
    const cup = { kind: 'cup' as const, count: 1 };
    const herbs = { kind: 'herbs' as const, count: 3 };
    let pack: Pack = { coins: 0, items: [ring, cup, herbs] };
    pack = removeFromPack(pack, [{ kind: 'cup', count: 1 }]);
    expect(pack.items).toEqual([ring, null, herbs]);
    expect(usedSlots(pack)).toBe(2);
    pack = removeFromSlot(pack, 2, 'herbs', 3)!;
    expect(pack.items).toEqual([ring]);
    expect(removeFromSlot(pack, 0, 'cup', 1)).toBeNull();
    expect(removeFromSlot(pack, 0, 'ring', 3)).toBeNull();
    expect(removeFromSlot(pack, 1, 'ring', 1)).toBeNull();
    pack = { coins: 0, items: [null, ring, null] };
    expect(addToPack(pack, { coins: 0, items: [cup, herbs] }, 4).pack.items).toEqual([cup, ring, herbs]);
    // Every slot is in use, but for one beyond the slots of this pack.
    expect(addToPack({ coins: 0, items: [ring, cup] }, { coins: 0, items: [herbs] }, 2).left.items).toEqual([herbs]);
  });

  it('moves a stack to another slot', () => {
    const pack: Pack = { coins: 1, items: [{ kind: 'ring', count: 4 }, { kind: 'cup', count: 1 }, null, { kind: 'ring', count: 3 }] };
    // Onto a free slot, onto a stack of another kind, onto a stack of its kind (the rest stays).
    expect(moveInPack(pack, 1, 2, 6)!.items).toEqual([{ kind: 'ring', count: 4 }, null, { kind: 'cup', count: 1 }, { kind: 'ring', count: 3 }]);
    expect(moveInPack(pack, 1, 5, 6)!.items).toEqual([{ kind: 'ring', count: 4 }, null, null, { kind: 'ring', count: 3 }, null, { kind: 'cup', count: 1 }]);
    expect(moveInPack(pack, 0, 1, 6)!.items).toEqual([{ kind: 'cup', count: 1 }, { kind: 'ring', count: 4 }, null, { kind: 'ring', count: 3 }]);
    expect(moveInPack(pack, 0, 3, 6)!.items).toEqual([{ kind: 'ring', count: 2 }, { kind: 'cup', count: 1 }, null, { kind: 'ring', count: 5 }]);
    expect(moveInPack(pack, 3, 0, 6)!.items).toEqual([{ kind: 'ring', count: 5 }, { kind: 'cup', count: 1 }, null, { kind: 'ring', count: 2 }]);
    // The last stack to a slot before it: the free slots at the end go.
    expect(moveInPack(pack, 3, 2, 6)!.items).toEqual([{ kind: 'ring', count: 4 }, { kind: 'cup', count: 1 }, { kind: 'ring', count: 3 }]);
    expect(moveInPack(pack, 3, 2, 6)!.coins).toBe(1);
    // A full stack of its kind: the two change places.
    const full: Pack = { coins: 0, items: [{ kind: 'ring', count: ITEM_STACK.ring }, { kind: 'ring', count: 1 }] };
    expect(moveInPack(full, 1, 0, 4)!.items).toEqual([{ kind: 'ring', count: 1 }, { kind: 'ring', count: ITEM_STACK.ring }]);
    // Nothing to move, the same slot, or a slot beyond the pack.
    expect(moveInPack(pack, 2, 0, 6)).toBeNull();
    expect(moveInPack(pack, 1, 1, 6)).toBeNull();
    expect(moveInPack(pack, 1, 6, 6)).toBeNull();
    expect(moveInPack(pack, 1, -1, 6)).toBeNull();
  });
});

describe('loot', () => {
  it('gives the same from the same random source', () => {
    const table = { coins: [1, 9] as const, items: [{ chance: 0.5, pick: [['ring', 1], ['cup', 2]] as const }] };
    expect(rollLoot(table, random(5))).toEqual(rollLoot(table, random(5)));
  });

  it('of a brute: 1 or 2 coins in about one kill of three, a tusk in about one kill of two', () => {
    const rand = random(11);
    let tusks = 0;
    let paid = 0;
    for (let i = 0; i < 2000; i++) {
      const drop = rollLoot(MOB_LOOT.brute, rand);
      expect(drop.coins).toBeGreaterThanOrEqual(0);
      expect(drop.coins).toBeLessThanOrEqual(2);
      if (drop.coins > 0) paid++;
      tusks += drop.items.filter((s) => s.kind === 'brute-tusk').length;
    }
    expect(paid / 2000).toBeGreaterThan(0.29);
    expect(paid / 2000).toBeLessThan(0.38);
    expect(tusks / 2000).toBeGreaterThan(0.45);
    expect(tusks / 2000).toBeLessThan(0.55);
  });

  it('gives the coins only in their chance, and always without one', () => {
    const rand = random(13);
    let paid = 0;
    for (let i = 0; i < 4000; i++) {
      const drop = rollLoot({ coins: [3, 3], coinChance: 0.25 }, rand);
      expect([0, 3]).toContain(drop.coins);
      if (drop.coins > 0) paid++;
    }
    expect(paid / 4000).toBeGreaterThan(0.22);
    expect(paid / 4000).toBeLessThan(0.28);
    for (let i = 0; i < 100; i++) expect(rollLoot({ coins: [3, 3] }, rand).coins).toBe(3);
  });

  it('of a goblin of the forest: a coin in about one kill of four', () => {
    const rand = random(14);
    let coins = 0;
    for (let i = 0; i < 4000; i++) coins += rollLoot(MOB_LOOT.skirmisher, rand).coins;
    expect(coins / 4000).toBeGreaterThan(0.22);
    expect(coins / 4000).toBeLessThan(0.28);
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
