import { dice, rollDice, type Dice, type DiceSource } from './dice.ts';
import type { MobKind } from './mobs.ts';
import type { PlayerState } from './player.ts';
import { meetsGate, type Gate, type PlayerTraits } from './traits.ts';

/**
 * Items and the pack. A character carries coins in a purse and items in the slots of its pack:
 * each slot holds one kind of item, up to the stack of that kind. The number of slots comes from
 * Strength (PlayerTraits.slots). Items come from mobs (a kill can drop one) and from chests
 * (loot.ts) and from herbs in the woods. Herbs and trophies go into brews at the cauldron
 * (dialog.ts, Deal), and a character with Medicine chews herbs (DRINKS).
 *
 * In a shared world the server owns the pack (the store keeps it with the character); in a world
 * that the page runs, the page has its own pack, which it does not save. A character also wears
 * items: armour, a shield, a weapon (gear.ts); it moves them between the pack and its worn slots
 * (inventory.ts).
 */

/** The kinds of item. The order is the code on the wire: add a new kind at the end. */
export const ITEM_KINDS = [
  'imp-horn',
  'brute-tusk',
  'candle',
  'ring',
  'cup',
  'herbs',
  'draught',
  'antidote',
  'strong-draught',
  // Equipment (gear.ts, 2026-10-11): what a character wears.
  'leather-armour',
  'scale-mail',
  'chain-mail',
  'splint-armour',
  'shield',
  'longsword',
  'shortsword',
  'rapier',
  'greataxe',
  'mace',
  'longbow',
  'arcane-staff',
  'druid-staff',
  'luck-amulet',
  // The smith of Ironhold sells them too (2026-10-11).
  'studded-leather',
  'plate-armour',
  // Magic items of the SRD (gear.ts), rare loot (2026-10-11).
  'longsword-plus-1',
  'cloak-of-protection',
  'ring-of-protection',
  'bracers-of-defence',
  'gauntlets-of-ogre-power',
  'headband-of-intellect',
  'amulet-of-health',
  'belt-of-dwarvenkind',
  'boots-of-elvenkind',
  // A reach weapon (2026-10-11).
  'glaive',
  // Quest items (2026-10-11): the smith's lever for the merchant's cart.
  'crowbar',
  // The loot of the scouts of the hobgoblins (chapter 1.5.1): the peddler buys it.
  'badger-fur',
  // Silverspring (story phase 4d): a nugget of mithril, and the permit that lets a character buy it at cost.
  'mithril',
  'mithril-permit',
  // The Ashen Seekers (story phase 7): the carved stone of the Wren homestead, the key of the shrine of Tigris.
  'wave-stone',
  // The shrine of Tigris (story phase 9): the relic, and the orders that the Ash Warden dropped.
  'tear-of-tigris',
  'warden-orders',
  // The road to Ironhold (the tutorial, 2026-10-13): the farmer of Whitegrove sends a sack of lentils to Bronzehold.
  'lentils',
  // The same sack after a wade (2026-10-13): the water ruins the lentils (WorldSource.wadeEffects).
  'wet-lentils',
] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

/** The most of a kind in one slot. */
export const ITEM_STACK: Readonly<Record<ItemKind, number>> = {
  'imp-horn': 10,
  'brute-tusk': 10,
  candle: 5,
  ring: 5,
  cup: 5,
  herbs: 10,
  draught: 5,
  antidote: 5,
  'strong-draught': 5,
  'leather-armour': 1,
  'scale-mail': 1,
  'chain-mail': 1,
  'splint-armour': 1,
  shield: 1,
  longsword: 1,
  shortsword: 1,
  rapier: 1,
  greataxe: 1,
  mace: 1,
  longbow: 1,
  'arcane-staff': 1,
  'druid-staff': 1,
  'luck-amulet': 1,
  'studded-leather': 1,
  'plate-armour': 1,
  'longsword-plus-1': 1,
  'cloak-of-protection': 1,
  'ring-of-protection': 1,
  'bracers-of-defence': 1,
  'gauntlets-of-ogre-power': 1,
  'headband-of-intellect': 1,
  'amulet-of-health': 1,
  'belt-of-dwarvenkind': 1,
  'boots-of-elvenkind': 1,
  glaive: 1,
  crowbar: 1,
  'badger-fur': 5,
  mithril: 10,
  'mithril-permit': 1,
  'wave-stone': 1,
  'tear-of-tigris': 1,
  'warden-orders': 1,
  lentils: 1,
  'wet-lentils': 1,
};

/**
 * The weight of one item, in pounds (lb), from the SRD 5.1 where it gives one (Fede's decision,
 * 2026-10-15: a weight for each item, for the load of a character, load.ts). Each weight is a
 * multiple of 0.5, so a sum is exact. A ring, an amulet, a candle and a paper weigh nothing.
 */
export const ITEM_WEIGHT: Readonly<Record<ItemKind, number>> = {
  'imp-horn': 0.5,
  'brute-tusk': 2,
  candle: 0,
  ring: 0,
  cup: 1,
  herbs: 0.5,
  draught: 0.5,
  antidote: 0.5,
  'strong-draught': 0.5,
  'leather-armour': 10,
  'scale-mail': 45,
  'chain-mail': 55,
  'splint-armour': 60,
  shield: 6,
  longsword: 3,
  shortsword: 2,
  rapier: 2,
  greataxe: 7,
  mace: 4,
  longbow: 2,
  'arcane-staff': 4,
  'druid-staff': 4,
  'luck-amulet': 0,
  'studded-leather': 13,
  'plate-armour': 65,
  'longsword-plus-1': 3,
  'cloak-of-protection': 1,
  'ring-of-protection': 0,
  'bracers-of-defence': 1,
  'gauntlets-of-ogre-power': 1,
  'headband-of-intellect': 0,
  'amulet-of-health': 0,
  'belt-of-dwarvenkind': 1,
  'boots-of-elvenkind': 1,
  glaive: 6,
  crowbar: 5,
  'badger-fur': 2,
  mithril: 1,
  'mithril-permit': 0,
  'wave-stone': 2,
  'tear-of-tigris': 0,
  'warden-orders': 0,
  // A sack of lentils for a guard post; the water makes it heavier.
  lentils: 10,
  'wet-lentils': 12,
};

/** This many coins weigh one pound (5e). */
export const COINS_PER_POUND = 50;

/** The weight of what a pack holds (lb): its items, and its coins in whole pounds. */
export function packWeight(pack: Pack): number {
  let weight = Math.floor(pack.coins / COINS_PER_POUND);
  for (const slot of pack.items) if (slot) weight += ITEM_WEIGHT[slot.kind] * slot.count;
  return weight;
}

/**
 * A character with this chews a bundle of herbs for 1d4 hit points (Medicine): an easy action, for a
 * small reward (docs/features/abilities/checks.md). It is here, not in traits.ts with the other
 * gates, because traits.ts imports this module through player.ts.
 */
export const MEDICINE_GATE: Gate = { ability: 'wis', dc: 10 };

/** What a drink does, and the gate that a character needs to use it (none for most). */
export interface Drink {
  /** The hit points that it gives back (5e dice). */
  readonly hp?: Dice;
  readonly cure?: boolean;
  readonly gate?: Gate;
}

/**
 * What a drink does (the player uses it from the pack panel), as 5e (level-3.md): a healing draught
 * (a potion of healing) gives back 2d4+2 hit points, a strong draught (a potion of greater healing)
 * 4d4+4, an antidote ends a poison. A character with Medicine (MEDICINE_GATE, WIS 10) chews a bundle
 * of herbs for 1d4 hit points.
 */
export const DRINKS: Readonly<Partial<Record<ItemKind, Drink>>> = {
  draught: { hp: dice(2, 4, 2) },
  'strong-draught': { hp: dice(4, 4, 4) },
  antidote: { cure: true },
  herbs: { hp: dice(1, 4), gate: MEDICINE_GATE },
};

/** Whether the pack holds all these stacks. */
export function hasItems(pack: Pack, stacks: readonly ItemStack[]): boolean {
  return stacks.every((need) => stacksOf(pack).filter((s) => s.kind === need.kind).reduce((n, s) => n + s.count, 0) >= need.count);
}

/**
 * The pack without these stacks (the last slots of a kind first); the caller checks hasItems()
 * first. A slot that becomes empty stays in its place as a free slot.
 */
export function removeFromPack(pack: Pack, stacks: readonly ItemStack[]): Pack {
  const items = [...pack.items];
  for (const need of stacks) {
    let count = need.count;
    for (let i = items.length - 1; i >= 0 && count > 0; i--) {
      const slot = items[i];
      if (!slot || slot.kind !== need.kind) continue;
      const n = Math.min(slot.count, count);
      items[i] = n === slot.count ? null : { kind: slot.kind, count: slot.count - n };
      count -= n;
    }
  }
  return { coins: pack.coins, items: trimmed(items) };
}

/**
 * The pack without `count` items of slot `slot`, which must hold at least that many of `kind`;
 * else null. A slot that becomes empty stays in its place as a free slot.
 */
export function removeFromSlot(pack: Pack, slot: number, kind: ItemKind, count: number): Pack | null {
  const stack = pack.items[slot];
  if (!stack || stack.kind !== kind || !Number.isInteger(count) || count < 1 || count > stack.count) return null;
  const items = [...pack.items];
  items[slot] = count === stack.count ? null : { kind, count: stack.count - count };
  return { coins: pack.coins, items: trimmed(items) };
}

/**
 * The player moves the stack of slot `from` onto slot `to` (one of its `slots` slots). On a free
 * slot, the stack goes there. On a stack of another kind, the two stacks change places. On a stack
 * of the same kind, it fills that stack, and what does not fit stays in `from`; when that stack is
 * full already, the two change places. Null when nothing moves.
 */
export function moveInPack(pack: Pack, from: number, to: number, slots: number): Pack | null {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from === to || to < 0 || to >= slots) return null;
  const moving = pack.items[from];
  if (!moving) return null;
  const items = [...pack.items];
  while (items.length <= to) items.push(null);
  const there = items[to] ?? null;
  const room = there && there.kind === moving.kind ? Math.min(ITEM_STACK[there.kind] - there.count, moving.count) : 0;
  if (there && room > 0) {
    items[to] = { kind: there.kind, count: there.count + room };
    items[from] = room === moving.count ? null : { kind: moving.kind, count: moving.count - room };
  } else {
    items[to] = moving;
    items[from] = there;
  }
  return { coins: pack.coins, items: trimmed(items) };
}

/**
 * The player drinks one `kind` from its pack: the drink does its work, and one goes from the pack.
 * Null if it is not a drink, the character does not pass its gate, or the pack has none.
 */
export function drinkFrom(pack: Pack, kind: ItemKind, state: PlayerState, traits: Pick<PlayerTraits, 'maxHp' | 'scores'>, source: DiceSource): Pack | null {
  const drink = DRINKS[kind];
  if (!drink || state.down > 0 || !hasItems(pack, [{ kind, count: 1 }])) return null;
  if (drink.gate && !meetsGate(traits.scores, drink.gate)) return null;
  if (drink.hp) state.hp = Math.min(traits.maxHp, state.hp + rollDice(drink.hp, source));
  if (drink.cure) {
    state.poison = 0;
    state.poisonClock = 0;
  }
  if (state.hp >= traits.maxHp) state.recover = 0;
  return removeFromPack(pack, [{ kind, count: 1 }]);
}

/** The most coins in a purse. */
export const MAX_COINS = 99_999;
/** The most slots that any pack can have (the slots of STR 17, with some room). */
export const MAX_SLOTS = 16;

export interface ItemStack {
  readonly kind: ItemKind;
  readonly count: number;
}

/** One slot of a pack: the stack in it, or null for a free slot. */
export type PackSlot = ItemStack | null;

/**
 * What a character carries: coins, and its slots in order (at most `slots` of them). Each slot
 * holds a stack or nothing (null): the player puts each stack where it wants it (moveInPack), and
 * a stack keeps its slot until it goes. The list never ends with a free slot.
 */
export interface Pack {
  readonly coins: number;
  readonly items: readonly PackSlot[];
}

export const EMPTY_PACK: Pack = { coins: 0, items: [] };

/** The stacks of a pack in the order of their slots, without the free slots. */
export function stacksOf(pack: Pack): ItemStack[] {
  return pack.items.filter((s): s is ItemStack => s !== null);
}

/** How many slots of a pack hold a stack. */
export function usedSlots(pack: Pack): number {
  return pack.items.reduce((n, s) => (s ? n + 1 : n), 0);
}

/** The slots without the free slots at the end. */
function trimmed(items: readonly PackSlot[]): PackSlot[] {
  let end = items.length;
  while (end > 0 && items[end - 1] === null) end--;
  return items.slice(0, end);
}

/** Things to put in a pack: coins and stacks (a chest's contents, a drop). */
export interface Loot {
  readonly coins: number;
  readonly items: readonly ItemStack[];
}

export const NO_LOOT: Loot = { coins: 0, items: [] };

export function isItemKind(value: unknown): value is ItemKind {
  return typeof value === 'string' && (ITEM_KINDS as readonly string[]).includes(value);
}

export function lootIsEmpty(loot: Loot): boolean {
  return loot.coins === 0 && loot.items.length === 0;
}

/**
 * Puts loot into a pack with `slots` slots: the coins always (up to MAX_COINS), each item on a
 * stack of its kind first, then in the first free slot. Returns the new pack, what went in, and
 * what did not fit.
 */
export function addToPack(pack: Pack, loot: Loot, slots: number): { pack: Pack; taken: Loot; left: Loot } {
  const coins = Math.min(MAX_COINS, pack.coins + loot.coins);
  const items = [...pack.items];
  const taken: ItemStack[] = [];
  const left: ItemStack[] = [];
  for (const stack of loot.items) {
    let count = stack.count;
    for (let i = 0; i < items.length && count > 0; i++) {
      const slot = items[i];
      if (!slot || slot.kind !== stack.kind) continue;
      const n = Math.min(ITEM_STACK[slot.kind] - slot.count, count);
      items[i] = { kind: slot.kind, count: slot.count + n };
      count -= n;
    }
    while (count > 0) {
      const hole = items.indexOf(null);
      const at = hole >= 0 && hole < slots ? hole : items.length < slots ? items.length : -1;
      if (at < 0) break;
      const n = Math.min(ITEM_STACK[stack.kind], count);
      items[at] = { kind: stack.kind, count: n };
      count -= n;
    }
    if (stack.count - count > 0) taken.push({ kind: stack.kind, count: stack.count - count });
    if (count > 0) left.push({ kind: stack.kind, count });
  }
  return { pack: { coins, items }, taken: { coins: coins - pack.coins, items: taken }, left: { coins: loot.coins - (coins - pack.coins), items: left } };
}

/**
 * Checks a pack from outside (a stored row): known kinds, counts within their stacks, null for a
 * free slot, at most MAX_SLOTS slots. Null if it is not one.
 */
export function checkPack(raw: unknown): Pack | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  if (!Number.isInteger(m.coins) || (m.coins as number) < 0 || (m.coins as number) > MAX_COINS) return null;
  if (!Array.isArray(m.items) || m.items.length > MAX_SLOTS) return null;
  const items: PackSlot[] = [];
  for (const raw of m.items as unknown[]) {
    if (raw === null) {
      items.push(null);
      continue;
    }
    if (typeof raw !== 'object') return null;
    const s = raw as Record<string, unknown>;
    if (!isItemKind(s.kind) || !Number.isInteger(s.count) || (s.count as number) < 1 || (s.count as number) > ITEM_STACK[s.kind]) return null;
    items.push({ kind: s.kind, count: s.count as number });
  }
  return { coins: m.coins as number, items: trimmed(items) };
}

// ---------------------------------------------------------------- loot tables

/**
 * What a source of loot gives: coins from `coins[0]` to `coins[1]` (only in `coinChance` of the
 * rolls), then each roll of `items` (with its chance) gives one item, picked by weight.
 */
export interface LootTable {
  readonly coins?: readonly [number, number];
  /** The chance that the coins come (0 to 1); without it, always. Coins are scarce (docs/game-design.md, "Coins"). */
  readonly coinChance?: number;
  readonly items?: readonly LootRoll[];
  /** The source fills again this long after a player emptied it (ms); without it, REFILL_MS (loot.ts). */
  readonly refillMs?: number;
}

export interface LootRoll {
  readonly chance: number;
  readonly pick: readonly (readonly [ItemKind, number])[];
}

/**
 * What a kill drops into the killer's pack (Fede's choice, 2026-10-10). Coins are scarce (Fede,
 * 2026-10-13: docs/game-design.md, "Coins"): most kills give none, and a kill that gives some gives
 * a coin or two, so that the rewards of the quests are the most of a character's income.
 */
export const MOB_LOOT: Readonly<Record<MobKind, LootTable>> = {
  imp: { items: [{ chance: 1 / 3, pick: [['imp-horn', 1]] }] },
  brute: { coins: [1, 2], coinChance: 1 / 3, items: [{ chance: 1 / 2, pick: [['brute-tusk', 1]] }] },
  goblin: { coins: [1, 1], coinChance: 1 / 4 },
  worg: {},
  hobgoblin: { coins: [1, 2], coinChance: 1 / 3 },
  bugbear: { coins: [1, 3], coinChance: 1 / 2 },
  // The chapter's loot of the war band: a splint armour and the hobgoblin luck amulet.
  devastator: {
    coins: [2, 5],
    items: [
      { chance: 1, pick: [['luck-amulet', 1]] },
      { chance: 1, pick: [['splint-armour', 1]] },
    ],
  },
  // The Ashen Seekers (story phases 7 to 9): the hounds and the watchers carry nothing; the Ash Warden
  // never dies (it goes in ash at half of its hit points).
  hound: {},
  watcher: {},
  seeker: { coins: [1, 2], coinChance: 1 / 3, items: [{ chance: 0.2, pick: [['draught', 1]] }] },
  adept: {
    coins: [1, 2],
    coinChance: 1 / 3,
    items: [
      {
        chance: 0.25,
        pick: [
          ['draught', 1],
          ['antidote', 1],
        ],
      },
    ],
  },
  warden: {},
  // A goblin of the forest (the tutorial): a coin in one kill of four.
  skirmisher: { coins: [1, 1], coinChance: 1 / 4 },
  // A bandit of the forest by day: a robber carries a little of what it took, a coin or two in one kill of three.
  bandit: { coins: [1, 2], coinChance: 1 / 3 },
};

/** Rolls a loot table with a random source: the same source gives the same loot. */
export function rollLoot(table: LootTable, random: () => number): Loot {
  const [min, max] = table.coins ?? [0, 0];
  let coins = min + Math.floor(random() * (max - min + 1));
  if (table.coinChance !== undefined && random() >= table.coinChance) coins = 0;
  const items: ItemStack[] = [];
  for (const roll of table.items ?? []) {
    if (random() >= roll.chance) continue;
    const total = roll.pick.reduce((sum, [, w]) => sum + w, 0);
    let x = random() * total;
    let kind = roll.pick[roll.pick.length - 1]![0];
    for (const [k, weight] of roll.pick) {
      x -= weight;
      if (x < 0) {
        kind = k;
        break;
      }
    }
    const same = items.findIndex((s) => s.kind === kind);
    if (same >= 0) items[same] = { kind, count: items[same]!.count + 1 };
    else items.push({ kind, count: 1 });
  }
  return { coins, items };
}
