import { GEAR_SLOTS, type Gear } from './gear.ts';
import { ITEM_WEIGHT, packWeight, type Pack } from './items.ts';

/**
 * The load of a character (Fede's decisions, 2026-10-15; docs/features/items/load.md): what its worn
 * items and its pack weigh, in pounds (items.ts, ITEM_WEIGHT), against its carrying capacity
 * (PlayerTraits.carry: 15 x STR lb, 5e). Four tiers, after the variant encumbrance of 5e: light up to
 * a third of the capacity (5 x STR), medium up to two thirds (10 x STR), heavy up to all of it, and
 * overloaded above it. The load changes only the roll of a dodge (player.ts, ROLLS): its distance and
 * speed, its safe ticks and its stamina. The walk and the slots of the pack do not change with it.
 */
export const LOAD_TIERS = ['light', 'medium', 'heavy', 'over'] as const;
export type LoadTier = (typeof LOAD_TIERS)[number];

/** What the worn items weigh (lb). */
export function gearWeight(gear: Gear): number {
  let weight = 0;
  for (const slot of GEAR_SLOTS) {
    const kind = gear[slot];
    if (kind !== null) weight += ITEM_WEIGHT[kind];
  }
  return weight;
}

/** What a character carries (lb): its worn items, the items of its pack and its coins. */
export function loadOf(pack: Pack, gear: Gear): number {
  return gearWeight(gear) + packWeight(pack);
}

/** The tier of a load (lb) for a carrying capacity (lb). */
export function loadTier(load: number, carry: number): LoadTier {
  if (load * 3 <= carry) return 'light';
  if (load * 3 <= carry * 2) return 'medium';
  return load <= carry ? 'heavy' : 'over';
}

/** The code of a tier on the wire (its index in LOAD_TIERS), and back (light for an unknown code). */
export function loadCode(tier: LoadTier): number {
  return LOAD_TIERS.indexOf(tier);
}

export function loadFromCode(code: number): LoadTier {
  return LOAD_TIERS[code] ?? 'light';
}
