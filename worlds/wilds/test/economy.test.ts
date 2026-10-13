import { describe, expect, it } from 'vitest';
import { MOB_LOOT, dialogDeals, type Dialog, type ItemKind, type LootTable, type MobKind, type QuestEffect } from '@game/engine';
import {
  ASHES_HELD,
  CARAVAN_SAVED,
  CART_LIFT,
  DEFAULT_SEED,
  HIMO_HOME,
  LENTILS_GIVE,
  LENTILS_WET_REWARD,
  PEDDLER,
  RAID_SCOUTS,
  SMITH,
  TOWN_CACHE,
  WildsSource,
} from '../src/index.ts';

/**
 * Coins are scarce (Fede, 2026-10-13; docs/game-design.md, "Coins"): the rewards of the quests are more
 * than half of what a character earns. These tests use a model of a game of chapter 1, alone, with our
 * estimate of what a character kills and opens on the way. An item counts at what a trader of the world
 * pays for it (the peddler, the smith); an item that nobody buys counts as nothing.
 */

/** What the traders pay for one item of each kind, at Charisma 10 (the sales of their shops). */
function salePrices(dialogs: readonly Dialog[]): Map<ItemKind, number> {
  const out = new Map<ItemKind, number>();
  for (const dialog of dialogs) {
    for (const { deal } of dialogDeals(dialog)) {
      if (deal.goods !== 'coins' || deal.items?.length !== 1) continue;
      const kind = deal.items[0]!.kind;
      out.set(kind, Math.max(out.get(kind) ?? 0, deal.pay ?? 0));
    }
  }
  return out;
}
const SALE = salePrices([PEDDLER, SMITH]);
const sale = (kind: ItemKind) => SALE.get(kind) ?? 0;

/** The mean of the coins of a loot table. */
const meanCoins = (table: LootTable) => (table.coins ? ((table.coins[0] + table.coins[1]) / 2) * (table.coinChance ?? 1) : 0);

/** The mean of what a loot table gives, in coins: its coins and the sale price of its items. */
function meanValue(table: LootTable): number {
  let items = 0;
  for (const roll of table.items ?? []) {
    const total = roll.pick.reduce((sum, [, w]) => sum + w, 0);
    items += roll.chance * roll.pick.reduce((sum, [kind, w]) => sum + (sale(kind) * w) / total, 0);
  }
  return meanCoins(table) + items;
}

/** What a quest effect gives, in coins. */
const effectValue = (effect: QuestEffect) => (effect.give?.coins ?? 0) + (effect.give?.items ?? []).reduce((sum, s) => sum + sale(s.kind) * s.count, 0);

/** The chest tables of the houses: an ordinary chest, a locked one, and the chest of a barred house. */
function chestTables(): { chest: LootTable; locked: LootTable; barred: LootTable } {
  const source = new WildsSource(DEFAULT_SEED);
  const found: Partial<Record<'chest' | 'locked' | 'barred', LootTable>> = {};
  for (let cy = -8; cy < 8; cy++) {
    for (let cx = -8; cx < 8; cx++) {
      const house = source.house(cx, cy);
      const chest = house?.fixtures.find((f) => f.kind === 'chest');
      const table = chest ? source.loot(chest) : null;
      if (!house || !chest || !table) continue;
      found[house.barred ? 'barred' : chest.lock ? 'locked' : 'chest'] = table;
    }
  }
  return { chest: found.chest!, locked: found.locked!, barred: found.barred! };
}

/**
 * The model: the roaming mobs that a character kills in chapter 1, alone (the goblins of the forest on
 * the road at night, a rare ambush of bandits there by day, then the wildlands).
 */
const KILLS: Partial<Record<MobKind, number>> = { skirmisher: 9, bandit: 3, imp: 12, brute: 4 };
/** The chests that it opens: ordinary, locked (DEX 13), barred (STR 13), and the buried cache (WIS 13). */
const OPENED = { chest: 12, locked: 2, barred: 2, cache: 1 } as const;
/** The quests that it finishes, by their best way. */
const REWARDS: readonly QuestEffect[] = [CART_LIFT, LENTILS_GIVE, RAID_SCOUTS, HIMO_HOME, CARAVAN_SAVED, ASHES_HELD];
/**
 * The mobs of the fights of the quests (the ambushes, alone: encounters.ts): the scouts' worg and goblin,
 * the Devastator and a hobgoblin, two cinder hounds and their watcher, a blade and an adept. Only a quest
 * brings them, so what they drop counts with the quests.
 */
const STORY_KILLS: Partial<Record<MobKind, number>> = { worg: 1, goblin: 1, devastator: 1, hobgoblin: 1, hound: 2, watcher: 1, seeker: 1, adept: 1 };

const killValue = (kills: Partial<Record<MobKind, number>>) =>
  Object.entries(kills).reduce((sum, [kind, n]) => sum + meanValue(MOB_LOOT[kind as MobKind]) * n, 0);

describe('the economy of the Wilds', () => {
  it('reads what the traders pay from the sales of their shops', () => {
    // An empty table would count every item as nothing, and the model would pass for a wrong reason.
    expect([sale('ring'), sale('brute-tusk'), sale('plate-armour'), sale('mithril')]).toEqual([5, 4, 75, 10]);
  });

  it('quests give more than half of the coins of a game of chapter 1 (the model)', () => {
    const chests = chestTables();
    const cache = new WildsSource(DEFAULT_SEED).loot(TOWN_CACHE)!;
    const quests = REWARDS.reduce((sum, e) => sum + effectValue(e), 0) + killValue(STORY_KILLS);
    const others =
      killValue(KILLS) +
      meanValue(chests.chest) * OPENED.chest +
      meanValue(chests.locked) * OPENED.locked +
      meanValue(chests.barred) * OPENED.barred +
      meanValue(cache) * OPENED.cache;
    expect(quests / (quests + others)).toBeGreaterThan(0.5);
  });

  it('a kill outside the story and an ordinary chest give at most half of the pay for wet lentils, in coins, on average', () => {
    // Fede, 2026-10-13: 2 coins of the 5 for the lentils must be a big save.
    for (const kind of Object.keys(MOB_LOOT) as MobKind[]) {
      if (kind === 'devastator') continue;
      expect(meanCoins(MOB_LOOT[kind]), kind).toBeLessThanOrEqual(LENTILS_WET_REWARD / 2);
    }
    expect(meanCoins(chestTables().chest)).toBeLessThanOrEqual(LENTILS_WET_REWARD / 2);
  });

  it('a chest has no coins at times', () => {
    const chests = chestTables();
    for (const table of [chests.chest, chests.locked, chests.barred]) expect(table.coinChance).toBeLessThan(1);
  });
});
