import { describe, expect, it } from 'vitest';
import { PLAIN_GEAR, PLAIN_SCORES, Room, TILE_SIZE, WEARABLES, World, checkDialog, gearAddress, kitOf, traitsOf, type DialogAnswer, type ItemKind, type Pack } from '@game/engine';
import { DEFAULT_SEED, MAGIC_CHANCE, MAGIC_ITEMS, SMITH, SMITH_PRICES, TOWN_NPCS, WildsSource, smithPays } from '../src/index.ts';

const answers = (): DialogAnswer[] => Object.values(SMITH.nodes).flatMap((n) => n.answers);
const deals = (prefix: 'buy-' | 'sell-') => answers().flatMap((a) => (a.deal?.id.startsWith(prefix) ? [a.deal] : []));
const smith = TOWN_NPCS.findIndex((n) => n.id === 'smith');
const besideSmith = () => {
  const [tx, ty] = TOWN_NPCS[smith]!.home;
  return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + 12 };
};

describe('the smith of Thornwick', () => {
  it('has a good conversation, and the smith of the town has it', () => {
    expect(checkDialog(SMITH)).toEqual([]);
    expect(TOWN_NPCS[smith]!.content.dialog).toBe(SMITH);
  });

  it('sells every armour, the shield and every weapon, but not the staffs', () => {
    const sold = new Set(deals('buy-').map((d) => d.goods));
    for (const kind of Object.keys(SMITH_PRICES) as (keyof typeof SMITH_PRICES)[]) {
      const staff = WEARABLES[kind]?.weapon?.focus !== undefined;
      expect(sold.has(kind), kind).toBe(!staff);
    }
    for (const deal of deals('buy-')) expect(deal.price).toBe(SMITH_PRICES[deal.goods as keyof typeof SMITH_PRICES]);
    expect(SMITH_PRICES['plate-armour']).toBe(150);
  });

  it('buys all of it back for half of the price, at least 1 coin, from the pack only', () => {
    const bought = deals('sell-');
    expect(new Set(bought.flatMap((d) => d.items!.map((s) => s.kind)))).toEqual(new Set(Object.keys(SMITH_PRICES)));
    for (const deal of bought) {
      const kind = deal.items![0]!.kind as keyof typeof SMITH_PRICES;
      expect(deal.pay).toBe(smithPays(kind));
      expect(deal.pay).toBe(Math.max(1, Math.floor(SMITH_PRICES[kind] / 2)));
    }
    expect(smithPays('mace')).toBe(1);
  });

  it('shows no price in the text of an answer: the panel adds it', () => {
    for (const a of answers()) expect(a.text).not.toMatch(/coin|\d/);
  });

  it('sells chain mail through the server, and buys it back; a worn piece must come off first', () => {
    const room = new Room(new World(new WildsSource(DEFAULT_SEED)));
    const traits = traitsOf(PLAIN_SCORES, 'fighter', PLAIN_GEAR);
    const pack: Pack = { coins: 30, items: [] };
    const p = room.join(0, 1, undefined, '', besideSmith(), { traits, traitsFor: (g) => traitsOf(PLAIN_SCORES, 'fighter', g), pack, gear: kitOf('fighter') })!;
    room.deal(p.id, { npc: smith }, 'buy-chain-mail');
    expect(p.pack).toEqual({ coins: 12, items: [{ kind: 'chain-mail', count: 1 }] });
    // Too few coins for plate: nothing changes.
    room.deal(p.id, { npc: smith }, 'buy-plate-armour');
    expect(p.pack.coins).toBe(12);
    room.deal(p.id, { npc: smith }, 'sell-chain-mail');
    expect(p.pack).toEqual({ coins: 21, items: [] });
    // The worn shield: not in the pack, so no sale; off, and then sold.
    room.deal(p.id, { npc: smith }, 'sell-shield');
    expect(p.pack.coins).toBe(21);
    room.move(p.id, gearAddress('off'), 0);
    room.deal(p.id, { npc: smith }, 'sell-shield');
    expect(p.pack).toEqual({ coins: 23, items: [] });
    expect(p.gear.off).toBeNull();
  });

  it('sells nothing to a player far from it', () => {
    const room = new Room(new World(new WildsSource(DEFAULT_SEED)));
    const traits = traitsOf(PLAIN_SCORES, 'fighter', PLAIN_GEAR);
    const p = room.join(0, 1, [-12, 3], '', undefined, { traits, pack: { coins: 30, items: [] } })!;
    room.deal(p.id, { npc: smith }, 'buy-mace');
    expect(p.pack.coins).toBe(30);
    const kinds: ItemKind[] = p.pack.items.flatMap((s) => (s ? [s.kind] : []));
    expect(kinds).toEqual([]);
  });
});

describe('magic items in the Wilds', () => {
  it('are items to wear, and the smith neither sells nor buys them', () => {
    for (const [kind] of MAGIC_ITEMS) {
      expect(WEARABLES[kind], kind).toBeDefined();
      expect(kind in SMITH_PRICES, kind).toBe(false);
    }
    expect(MAGIC_CHANCE).toEqual({ locked: 1 / 16, barred: 1 / 8, cache: 1 / 6 });
  });
});

