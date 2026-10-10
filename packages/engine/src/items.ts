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
 * that the page runs, the page has its own pack, which it does not save.
 */

/** The kinds of item. The order is the code on the wire: add a new kind at the end. */
export const ITEM_KINDS = ['imp-horn', 'brute-tusk', 'candle', 'ring', 'cup', 'herbs', 'draught', 'antidote', 'strong-draught'] as const;
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
};

/**
 * A character with this chews a bundle of herbs for a hit point (Medicine). It is here, not in
 * traits.ts with the other gates, because traits.ts imports this module through player.ts.
 */
export const MEDICINE_GATE: Gate = { ability: 'wis', min: 13 };

/** What a drink does, and the gate that a character needs to use it (none for most). */
export interface Drink {
  readonly hp?: number;
  readonly full?: boolean;
  readonly cure?: boolean;
  readonly gate?: Gate;
}

/**
 * What a drink does (the player uses it from the pack panel): a healing draught gives back 2
 * hit points, a strong draught all of them, an antidote ends a poison. A character with Medicine
 * (WIS 13) chews a bundle of herbs for 1 hit point.
 */
export const DRINKS: Readonly<Partial<Record<ItemKind, Drink>>> = {
  draught: { hp: 2 },
  'strong-draught': { full: true },
  antidote: { cure: true },
  herbs: { hp: 1, gate: MEDICINE_GATE },
};

/** Whether the pack holds all these stacks. */
export function hasItems(pack: Pack, stacks: readonly ItemStack[]): boolean {
  return stacks.every((need) => pack.items.filter((s) => s.kind === need.kind).reduce((n, s) => n + s.count, 0) >= need.count);
}

/** The pack without these stacks (the last slots of a kind first); the caller checks hasItems() first. */
export function removeFromPack(pack: Pack, stacks: readonly ItemStack[]): Pack {
  const items = pack.items.map((s) => ({ ...s }));
  for (const need of stacks) {
    let count = need.count;
    for (let i = items.length - 1; i >= 0 && count > 0; i--) {
      const slot = items[i]!;
      if (slot.kind !== need.kind) continue;
      const n = Math.min(slot.count, count);
      slot.count -= n;
      count -= n;
    }
  }
  return { coins: pack.coins, items: items.filter((s) => s.count > 0) };
}

/**
 * The player drinks one `kind` from its pack: the drink does its work, and one goes from the pack.
 * Null if it is not a drink, the character does not pass its gate, or the pack has none.
 */
export function drinkFrom(pack: Pack, kind: ItemKind, state: PlayerState, traits: Pick<PlayerTraits, 'maxHp' | 'scores'>): Pack | null {
  const drink = DRINKS[kind];
  if (!drink || state.down > 0 || !hasItems(pack, [{ kind, count: 1 }])) return null;
  if (drink.gate && !meetsGate(traits.scores, drink.gate)) return null;
  if (drink.hp) state.hp = Math.min(traits.maxHp, state.hp + drink.hp);
  if (drink.full) state.hp = traits.maxHp;
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

/** What a character carries: coins, and a stack in each used slot (at most `slots` of them). */
export interface Pack {
  readonly coins: number;
  readonly items: readonly ItemStack[];
}

export const EMPTY_PACK: Pack = { coins: 0, items: [] };

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
 * stack of its kind first, then in a free slot. Returns the new pack, what went in, and what did
 * not fit.
 */
export function addToPack(pack: Pack, loot: Loot, slots: number): { pack: Pack; taken: Loot; left: Loot } {
  const coins = Math.min(MAX_COINS, pack.coins + loot.coins);
  const items = pack.items.map((s) => ({ ...s }));
  const taken: ItemStack[] = [];
  const left: ItemStack[] = [];
  for (const stack of loot.items) {
    let count = stack.count;
    for (const slot of items) {
      if (count === 0) break;
      if (slot.kind !== stack.kind) continue;
      const room = ITEM_STACK[slot.kind] - slot.count;
      const n = Math.min(room, count);
      slot.count += n;
      count -= n;
    }
    while (count > 0 && items.length < slots) {
      const n = Math.min(ITEM_STACK[stack.kind], count);
      items.push({ kind: stack.kind, count: n });
      count -= n;
    }
    if (stack.count - count > 0) taken.push({ kind: stack.kind, count: stack.count - count });
    if (count > 0) left.push({ kind: stack.kind, count });
  }
  return { pack: { coins, items }, taken: { coins: coins - pack.coins, items: taken }, left: { coins: loot.coins - (coins - pack.coins), items: left } };
}

/** Checks a pack from outside (a stored row): known kinds, counts within their stacks, at most MAX_SLOTS. Null if it is not one. */
export function checkPack(raw: unknown): Pack | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  if (!Number.isInteger(m.coins) || (m.coins as number) < 0 || (m.coins as number) > MAX_COINS) return null;
  if (!Array.isArray(m.items) || m.items.length > MAX_SLOTS) return null;
  const items: ItemStack[] = [];
  for (const raw of m.items as unknown[]) {
    if (!raw || typeof raw !== 'object') return null;
    const s = raw as Record<string, unknown>;
    if (!isItemKind(s.kind) || !Number.isInteger(s.count) || (s.count as number) < 1 || (s.count as number) > ITEM_STACK[s.kind]) return null;
    items.push({ kind: s.kind, count: s.count as number });
  }
  return { coins: m.coins as number, items };
}

// ---------------------------------------------------------------- loot tables

/**
 * What a source of loot gives: coins from `coins[0]` to `coins[1]`, then each roll of `items`
 * (with its chance) gives one item, picked by weight.
 */
export interface LootTable {
  readonly coins?: readonly [number, number];
  readonly items?: readonly LootRoll[];
  /** The source fills again this long after a player emptied it (ms); without it, REFILL_MS (loot.ts). */
  readonly refillMs?: number;
}

export interface LootRoll {
  readonly chance: number;
  readonly pick: readonly (readonly [ItemKind, number])[];
}

/** What a kill drops into the killer's pack (Fede's choice, 2026-10-10). */
export const MOB_LOOT: Readonly<Record<MobKind, LootTable>> = {
  imp: { items: [{ chance: 1 / 3, pick: [['imp-horn', 1]] }] },
  brute: { coins: [2, 6], items: [{ chance: 1 / 2, pick: [['brute-tusk', 1]] }] },
};

/** Rolls a loot table with a random source: the same source gives the same loot. */
export function rollLoot(table: LootTable, random: () => number): Loot {
  const [min, max] = table.coins ?? [0, 0];
  const coins = min + Math.floor(random() * (max - min + 1));
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
