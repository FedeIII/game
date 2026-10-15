import { describe, expect, it } from 'vitest';
import { MOB_LOOT, MOB_STATS, dialogDeals, killXp, levelOf, type Dialog, type ItemKind, type LootTable, type MobKind, type QuestEffect } from '@game/engine';
import {
  ASHES_HELD,
  ASHES_RELIC,
  CAMP_TAKEN,
  CARAVAN_SAVED,
  CART_LIFT,
  CHEST_GRADES,
  CHEST_LOOT,
  DEFAULT_SEED,
  DREAM_REFUSE,
  HIMO_HOME,
  LENTILS_GIVE,
  LENTILS_WET_REWARD,
  PEDDLER,
  QUESTS,
  RAID_BAND,
  RAID_SCOUTS,
  RAID_TITLE_PERMIT,
  ROAD_ARRIVED,
  RUIN_TANNER,
  SMITH,
  TOWN_CACHE,
  WildsSource,
  type ChestGrade,
} from '../src/index.ts';
import * as questModule from '../src/quests.ts';

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

/** The chest tables of the houses: an ordinary chest, and the grades of a guarded chest (chests.ts), each with its weight behind a lock and behind boards. */
function chestTables(): { chest: LootTable; grades: readonly ChestGrade[] } {
  return { chest: CHEST_LOOT, grades: CHEST_GRADES };
}

/** The mean value of a guarded chest behind a lock or behind boards: its grades, by their weights. */
function guardedValue(guard: 'lock' | 'boards'): number {
  const total = CHEST_GRADES.reduce((sum, g) => sum + g[guard], 0);
  return CHEST_GRADES.reduce((sum, g) => sum + (meanValue(g.loot) * g[guard]) / total, 0);
}

/**
 * The model: the roaming mobs that a character kills in chapter 1, alone (the goblins of the forest on
 * the road at night, a rare ambush of bandits there by day, then the wildlands).
 */
const KILLS: Partial<Record<MobKind, number>> = { skirmisher: 9, bandit: 3, imp: 12, brute: 4 };
/** The chests that it opens: ordinary, locked (DEX 10 to 13), barred (STR 10 to 13), and the buried cache (WIS 13). */
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
      guardedValue('lock') * OPENED.locked +
      guardedValue('boards') * OPENED.barred +
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
    for (const table of [chests.chest, ...chests.grades.map((g) => g.loot)]) expect(table.coinChance).toBeLessThan(1);
  });
});

/**
 * The XP of a game of chapter 1, alone (experience.ts; Fede, 2026-10-14): the effects of the quests by
 * their best way, and the kills of the model above (KILLS, STORY_KILLS). The Ash Warden goes in ash:
 * no kill.
 */
const XP_WAY: readonly QuestEffect[] = [
  ROAD_ARRIVED,
  CART_LIFT,
  LENTILS_GIVE,
  RUIN_TANNER,
  ASHES_HELD,
  CAMP_TAKEN,
  ASHES_RELIC,
  DREAM_REFUSE,
  RAID_SCOUTS,
  RAID_BAND,
  HIMO_HOME,
  RAID_TITLE_PERMIT,
  CARAVAN_SAVED,
];
const killsXp = (kills: Partial<Record<MobKind, number>>) => Object.entries(kills).reduce((sum, [kind, n]) => sum + killXp(MOB_STATS[kind as MobKind].cr) * n, 0);

describe('the experience of the Wilds', () => {
  it('quests give more than half of the XP of a game of chapter 1 (the model)', () => {
    const quests = XP_WAY.reduce((sum, e) => sum + (e.xp ?? 0), 0);
    const kills = killsXp(KILLS) + killsXp(STORY_KILLS);
    expect(quests / (quests + kills)).toBeGreaterThan(0.5);
  });

  it('takes a character of chapter 1 to level 3, for which the chapter was made, but not to level 4', () => {
    const total = XP_WAY.reduce((sum, e) => sum + (e.xp ?? 0), 0) + killsXp(KILLS) + killsXp(STORY_KILLS);
    expect(levelOf(total)).toBe(3);
    // The road and its small quests (the tutorial) end at level 1; the first steps after it bring level 2.
    const road = [ROAD_ARRIVED, CART_LIFT, LENTILS_GIVE].reduce((sum, e) => sum + (e.xp ?? 0), 0) + killsXp({ skirmisher: KILLS.skirmisher, bandit: KILLS.bandit });
    expect(levelOf(road)).toBe(1);
    expect(levelOf(road + (RUIN_TANNER.xp ?? 0))).toBe(2);
  });

  it('gives XP in every quest', () => {
    const effects = (Object.values(questModule) as unknown[]).filter((e): e is QuestEffect => typeof e === 'object' && e !== null && 'quest' in e && (((e as QuestEffect).xp ?? 0) > 0));
    for (const quest of QUESTS) expect(effects.some((e) => e.quest === quest.id), quest.id).toBe(true);
  });
});
