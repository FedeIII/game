import type { CharacterClass } from './character.ts';
import { MAX_ATTUNED, WEARABLES, attunedCount, canUse, fitsSlot, gearSlotAt, wearableOf, type Gear, type GearSlot } from './gear.ts';
import { ITEM_STACK, moveInPack, type ItemKind, type Pack, type PackSlot } from './items.ts';

/**
 * The inventory: the slots of the pack (items.ts) and the worn slots (gear.ts) together. The player
 * moves an item between them: a drag in the pack panel, or "Wear" and "Take off". The rules of the
 * slots and of the hands are the rules of D&D 5e (gear.ts).
 */

/** What a character carries and wears. */
export interface Carried {
  readonly pack: Pack;
  readonly gear: Gear;
}

/** Why an item cannot be worn there (for the panel), or null when it can. */
export type WearProblem = 'slot' | 'class' | 'attuned' | 'full';

/** The slots without the free slots at the end. */
function trimmed(items: readonly PackSlot[]): PackSlot[] {
  let end = items.length;
  while (end > 0 && items[end - 1] === null) end--;
  return items.slice(0, end);
}

/** Puts one item into slot `at` of a list of pack slots (free, or a stack of its kind with room); else false. */
function putOne(items: PackSlot[], at: number, kind: ItemKind): boolean {
  while (items.length <= at) items.push(null);
  const there = items[at];
  if (there === null || there === undefined) items[at] = { kind, count: 1 };
  else if (there.kind === kind && there.count < ITEM_STACK[kind]) items[at] = { kind, count: there.count + 1 };
  else return false;
  return true;
}

/** Puts one item into the pack: onto a stack of its kind, else into the first free slot (of `slots`). */
function stow(items: PackSlot[], kind: ItemKind, slots: number, prefer?: number): boolean {
  if (prefer !== undefined && prefer < slots && (items[prefer] ?? null) === null) return putOne(items, prefer, kind);
  for (let i = 0; i < items.length; i++) {
    const s = items[i];
    if (s && s.kind === kind && s.count < ITEM_STACK[kind]) return putOne(items, i, kind);
  }
  for (let i = 0; i < slots; i++) if ((items[i] ?? null) === null) return putOne(items, i, kind);
  return false;
}

/**
 * The character puts on `kind` (one item of slot `from` of its pack) in the worn slot `slot`. What
 * it wore there goes into the pack, into slot `from` when that slot is free now. The hands follow
 * 5e: a two-handed weapon takes off what the off hand holds, and a shield or a weapon in the off
 * hand takes off a two-handed weapon. Returns the new pack and gear, or why it cannot.
 */
export function wear(carried: Carried, from: number, slot: GearSlot, slots: number, cls: CharacterClass): Carried | WearProblem {
  const stack = carried.pack.items[from];
  if (!stack) return 'slot';
  const kind = stack.kind;
  if (!fitsSlot(kind, slot)) return 'slot';
  if (!canUse(cls, kind)) return 'class';
  const gear: Record<GearSlot, ItemKind | null> = { ...carried.gear };
  const off: ItemKind[] = [];
  const takeOff = (s: GearSlot) => {
    const worn = gear[s];
    if (worn !== null) off.push(worn);
    gear[s] = null;
  };
  takeOff(slot);
  const weapon = WEARABLES[kind]!.weapon;
  if (slot === 'main' && weapon?.twoHanded) takeOff('off');
  if (slot === 'off' && wearableOf(gear.main)?.weapon?.twoHanded) takeOff('main');
  if (WEARABLES[kind]!.attune && attunedCount(gear) >= MAX_ATTUNED) return 'attuned';
  gear[slot] = kind;
  const items = [...carried.pack.items];
  items[from] = stack.count === 1 ? null : { kind, count: stack.count - 1 };
  for (const [i, worn] of off.entries()) if (!stow(items, worn, slots, i === 0 ? from : undefined)) return 'full';
  return { pack: { coins: carried.pack.coins, items: trimmed(items) }, gear };
}

/**
 * The character takes off what it wears in `slot`, into slot `to` of its pack (free, or a stack of
 * its kind with room). On another item that fits the worn slot, the two change places (wear()).
 * Null when nothing moves.
 */
export function takeOff(carried: Carried, slot: GearSlot, to: number, slots: number, cls: CharacterClass): Carried | null {
  const kind = carried.gear[slot];
  if (kind === null || !Number.isInteger(to) || to < 0 || to >= slots) return null;
  const there = carried.pack.items[to] ?? null;
  if (there && there.kind !== kind) {
    const swapped = wear(carried, to, slot, slots, cls);
    return typeof swapped === 'string' ? null : swapped;
  }
  const items = [...carried.pack.items];
  if (!putOne(items, to, kind)) return null;
  return { pack: { coins: carried.pack.coins, items: trimmed(items) }, gear: { ...carried.gear, [slot]: null } };
}

/**
 * The player moves an item from one place to another (pack slots and worn slots, as addresses):
 * in the pack, as moveInPack; from the pack onto a worn slot, wear(); from a worn slot into the
 * pack, takeOff(); between two worn slots (the two rings, or two light weapons in the hands), the
 * two change places. Null when nothing moves.
 */
export function moveItem(carried: Carried, from: number, to: number, slots: number, cls: CharacterClass): Carried | null {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from === to) return null;
  const fromSlot = gearSlotAt(from);
  const toSlot = gearSlotAt(to);
  if (fromSlot === null && toSlot === null) {
    if (from < 0 || from >= slots) return null;
    const pack = moveInPack(carried.pack, from, to, slots);
    return pack ? { pack, gear: carried.gear } : null;
  }
  if (fromSlot === null) {
    if (from < 0 || from >= slots || toSlot === null) return null;
    const result = wear(carried, from, toSlot, slots, cls);
    return typeof result === 'string' ? null : result;
  }
  if (toSlot === null) return takeOff(carried, fromSlot, to, slots, cls);
  const a = carried.gear[fromSlot];
  const b = carried.gear[toSlot];
  if (a === null || !fitsSlot(a, toSlot) || (b !== null && !fitsSlot(b, fromSlot))) return null;
  return { pack: carried.pack, gear: { ...carried.gear, [toSlot]: a, [fromSlot]: b } };
}

/**
 * The worn slot where a press on "Wear" puts an item: its own slot; for a ring, the free hand (else
 * the left); for a weapon, the main hand. Null when it is not worn.
 */
export function wearSlotFor(gear: Gear, kind: ItemKind): GearSlot | null {
  const item = WEARABLES[kind];
  if (!item) return null;
  switch (item.place) {
    case 'ring':
      return gear['ring-left'] === null ? 'ring-left' : gear['ring-right'] === null ? 'ring-right' : 'ring-left';
    case 'hand':
      return 'main';
    case 'shield':
      return 'off';
    default:
      return item.place;
  }
}

/** Why `kind` cannot be worn in `slot` now (without the room of the pack), or null when it can. */
export function wearProblem(gear: Gear, kind: ItemKind, slot: GearSlot, cls: CharacterClass): WearProblem | null {
  if (!fitsSlot(kind, slot)) return 'slot';
  if (!canUse(cls, kind)) return 'class';
  if (WEARABLES[kind]!.attune && gear[slot] !== kind) {
    const after = { ...gear, [slot]: null };
    if (attunedCount(after) >= MAX_ATTUNED) return 'attuned';
  }
  return null;
}

/** The pack slot where "Take off" puts an item: a stack of its kind with room, else the first free slot; null when the pack is full. */
export function takeOffSlotFor(pack: Pack, kind: ItemKind, slots: number): number | null {
  const stack = pack.items.findIndex((s) => s !== null && s.kind === kind && s.count < ITEM_STACK[kind]);
  if (stack >= 0) return stack;
  for (let i = 0; i < slots; i++) if ((pack.items[i] ?? null) === null) return i;
  return null;
}

/** The gear without the item of `slot` (a worn item that the player drops); null when the slot is empty or holds another kind. */
export function dropWorn(gear: Gear, slot: GearSlot, kind: ItemKind): Gear | null {
  return gear[slot] === kind ? { ...gear, [slot]: null } : null;
}

