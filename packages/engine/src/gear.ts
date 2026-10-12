import type { CharacterClass, Scores } from './character.ts';
import { dice, type Dice } from './dice.ts';
import type { ItemKind } from './items.ts';

// This module imports only types: traits.ts uses it when the engine loads (GUEST_TRAITS), and a
// value import here would make a loop of modules.

/** The modifier of a score (character.ts, abilityModifier). */
function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Equipment: what a character wears, in the slots of D&D 5e (the DMG, "Wearing and Wielding
 * Items"): one headwear, an amulet, a cloak, a suit of armour, bracers, gloves, a belt, boots, two
 * rings, and the two hands. Fede's decisions, 2026-10-11 (docs/drafts/equipment.md): the 5e slots,
 * Armour Class (AC) that turns a share of the mob hits into glancing blows, the damage from the
 * class and the die of the weapon together, and the 5e starting kit of each class.
 *
 * A worn item uses no slot of the pack, and a defeat does not take it. The player moves items between
 * the pack and the worn slots (inventory.ts). In a shared world the server
 * owns the gear (the store keeps it with the character); in a world that the page runs, the page
 * has its own, which it does not save.
 */

/** The slots, in the order of the wire. */
export const GEAR_SLOTS = ['head', 'neck', 'cloak', 'armour', 'bracers', 'gloves', 'belt', 'feet', 'ring-left', 'ring-right', 'main', 'off'] as const;
export type GearSlot = (typeof GEAR_SLOTS)[number];

/** What a character wears: an item kind in each slot, or null. */
export type Gear = Readonly<Record<GearSlot, ItemKind | null>>;

/**
 * The worn slots that show on the figure in the world: the item in the main hand and the off hand
 * (a weapon, a shield; protocol 20), and the armour (protocol 21). The other players get them
 * (`lk`), so they see them too.
 */
export const SHOWN_SLOTS = ['main', 'off', 'armour'] as const;
export type ShownSlot = (typeof SHOWN_SLOTS)[number];

/** What shows of a character's gear: the kind in each shown slot, or null. */
export type ShownGear = Readonly<Record<ShownSlot, ItemKind | null>>;

/** What shows of some gear (SHOWN_SLOTS). */
export function shownGear(gear: Gear): ShownGear {
  return { main: gear.main, off: gear.off, armour: gear.armour };
}

/** Whether two shown gears are the same. */
export function sameShown(a: ShownGear, b: ShownGear): boolean {
  return SHOWN_SLOTS.every((slot) => a[slot] === b[slot]);
}

export const EMPTY_GEAR: Gear = {
  head: null,
  neck: null,
  cloak: null,
  armour: null,
  bracers: null,
  gloves: null,
  belt: null,
  feet: null,
  'ring-left': null,
  'ring-right': null,
  main: null,
  off: null,
};

/** The armour of 5e: light (+ DEX), medium (+ DEX, at most +2), heavy (no DEX). */
export type ArmourType = 'light' | 'medium' | 'heavy';

export interface ArmourDef {
  readonly type: ArmourType;
  readonly ac: number;
  /** Below this Strength, the character walks slower (HEAVY_SPEED). */
  readonly str?: number;
  /** Disadvantage on Stealth in 5e: mobs see a sneaking character from NOISY_SIGHT, not SNEAK_SIGHT. */
  readonly noisy?: boolean;
}

/** The die of a weapon (5e). Its base damage in the game is half of it (DIE_BASE). */
export type Die = 4 | 6 | 8 | 10 | 12;

export interface WeaponDef {
  readonly die: Die;
  /** The die with both hands on it, when the off hand is empty (5e: versatile). */
  readonly versatile?: Die;
  /** Light (5e): its attacks are quicker (LIGHT_TICKS), and it can go into the off hand. */
  readonly light?: boolean;
  /** Heavy (5e): a heavy melee weapon attacks slower (HEAVY_TICKS). */
  readonly heavy?: boolean;
  readonly twoHanded?: boolean;
  /** Its attacks are arrows (arrows.ts). */
  readonly ranged?: boolean;
  /** Reach (5e): it hits REACH_BONUS further. */
  readonly reach?: boolean;
  /** A martial weapon (5e); else a simple one. */
  readonly martial?: boolean;
  /** A spellcasting focus: the class of that focus casts its cantrip with it (CANTRIP). */
  readonly focus?: Focus;
}

export type Focus = 'arcane' | 'druidic';

/** Where an item goes: one slot, a ring finger, a hand (a weapon), or the off hand (a shield). */
export type Place = 'head' | 'neck' | 'cloak' | 'armour' | 'bracers' | 'gloves' | 'belt' | 'feet' | 'ring' | 'hand' | 'shield';

/** An item that a character can wear, and what it does. */
export interface Wearable {
  readonly place: Place;
  readonly armour?: ArmourDef;
  /** The AC that a shield adds. */
  readonly shield?: number;
  readonly weapon?: WeaponDef;
  /** It works only for a character attuned to it (5e): at most MAX_ATTUNED of them. */
  readonly attune?: boolean;
  /** It adds this to each score for every gate (traits.ts): a luck charm. */
  readonly luck?: number;
  /** A magic bonus: to the AC (an armour, a shield, a cloak, a ring), or to the damage of a weapon or a focus. */
  readonly bonus?: number;
  /** The plain item that a magic one is (a longsword +1 is a longsword): for proficiency and for the look. */
  readonly base?: ItemKind;
  /** AC that it adds while the character wears no armour and no shield (bracers of defence). */
  readonly unarmoured?: number;
  /** Scores that it raises to these values, when they are lower (gauntlets of ogre power: STR 19). */
  readonly sets?: Partial<Scores>;
  /** Scores that it adds to, at most MAX_RAISED (a belt of dwarvenkind: CON + 2). */
  readonly adds?: Partial<Scores>;
  /** Quiet steps (boots of elvenkind): mobs see a sneaking character from QUIET_SIGHT. */
  readonly quiet?: boolean;
  /** Its wearer walks in deep water as in shallows (the Tear of Tigris, story phase 9). */
  readonly swim?: boolean;
}

/** A score that an item adds to goes at most this high (5e: 20). */
export const MAX_RAISED = 20;

/** The items that a character can wear (SRD 5.1). The other kinds of ITEM_KINDS are not worn. */
export const WEARABLES: Readonly<Partial<Record<ItemKind, Wearable>>> = {
  ring: { place: 'ring' },
  'leather-armour': { place: 'armour', armour: { type: 'light', ac: 11 } },
  'studded-leather': { place: 'armour', armour: { type: 'light', ac: 12 } },
  'scale-mail': { place: 'armour', armour: { type: 'medium', ac: 14, noisy: true } },
  'chain-mail': { place: 'armour', armour: { type: 'heavy', ac: 16, str: 13, noisy: true } },
  'splint-armour': { place: 'armour', armour: { type: 'heavy', ac: 17, str: 15, noisy: true } },
  'plate-armour': { place: 'armour', armour: { type: 'heavy', ac: 18, str: 15, noisy: true } },
  shield: { place: 'shield', shield: 2 },
  longsword: { place: 'hand', weapon: { die: 8, versatile: 10, martial: true } },
  shortsword: { place: 'hand', weapon: { die: 6, light: true, martial: true } },
  rapier: { place: 'hand', weapon: { die: 8, martial: true } },
  greataxe: { place: 'hand', weapon: { die: 12, heavy: true, twoHanded: true, martial: true } },
  mace: { place: 'hand', weapon: { die: 6 } },
  longbow: { place: 'hand', weapon: { die: 8, heavy: true, twoHanded: true, ranged: true, martial: true } },
  glaive: { place: 'hand', weapon: { die: 10, heavy: true, twoHanded: true, reach: true, martial: true } },
  // A staff that is a focus: for another class it is a quarterstaff.
  'arcane-staff': { place: 'hand', weapon: { die: 6, versatile: 8, focus: 'arcane' } },
  'druid-staff': { place: 'hand', weapon: { die: 6, versatile: 8, focus: 'druidic' } },
  // A stone of good luck (5e: +1 to ability checks): +1 for every gate.
  'luck-amulet': { place: 'neck', attune: true, luck: 1 },
  // Magic items of the SRD: rare loot.
  'longsword-plus-1': { place: 'hand', base: 'longsword', bonus: 1, weapon: { die: 8, versatile: 10, martial: true } },
  'cloak-of-protection': { place: 'cloak', attune: true, bonus: 1 },
  'ring-of-protection': { place: 'ring', attune: true, bonus: 1 },
  'bracers-of-defence': { place: 'bracers', attune: true, unarmoured: 2 },
  'gauntlets-of-ogre-power': { place: 'gloves', attune: true, sets: { str: 19 } },
  'headband-of-intellect': { place: 'head', attune: true, sets: { int: 19 } },
  'amulet-of-health': { place: 'neck', attune: true, sets: { con: 19 } },
  'belt-of-dwarvenkind': { place: 'belt', attune: true, adds: { con: 2 } },
  'boots-of-elvenkind': { place: 'feet', quiet: true },
  // The relic of the shrine of Tigris (story phase 9): its wearer walks in deep water as in shallows.
  'tear-of-tigris': { place: 'neck', attune: true, swim: true },
};

/** The item as a wearable, or null. */
export function wearableOf(kind: ItemKind | null): Wearable | null {
  return kind === null ? null : (WEARABLES[kind] ?? null);
}

/** At most this many worn items that need attunement (5e). */
export const MAX_ATTUNED = 3;

/** What a class can use (SRD 5.1, the proficiencies of each class). */
export interface Proficiency {
  readonly armour: readonly ArmourType[];
  readonly shield: boolean;
  readonly simple: boolean;
  readonly martial: boolean;
  /** Weapons of the other group that it can use too. */
  readonly weapons: readonly ItemKind[];
}

const STAFFS: readonly ItemKind[] = ['arcane-staff', 'druid-staff'];
const ALL_ARMOUR: readonly ArmourType[] = ['light', 'medium', 'heavy'];

export const PROFICIENCY: Readonly<Record<CharacterClass, Proficiency>> = {
  barbarian: { armour: ['light', 'medium'], shield: true, simple: true, martial: true, weapons: [] },
  bard: { armour: ['light'], shield: false, simple: true, martial: false, weapons: ['longsword', 'rapier', 'shortsword'] },
  cleric: { armour: ['light', 'medium'], shield: true, simple: true, martial: false, weapons: [] },
  druid: { armour: ['light', 'medium'], shield: true, simple: false, martial: false, weapons: ['mace', ...STAFFS] },
  fighter: { armour: ALL_ARMOUR, shield: true, simple: true, martial: true, weapons: [] },
  monk: { armour: [], shield: false, simple: true, martial: false, weapons: ['shortsword'] },
  paladin: { armour: ALL_ARMOUR, shield: true, simple: true, martial: true, weapons: [] },
  ranger: { armour: ['light', 'medium'], shield: true, simple: true, martial: true, weapons: [] },
  rogue: { armour: ['light'], shield: false, simple: true, martial: false, weapons: ['longsword', 'rapier', 'shortsword'] },
  sorcerer: { armour: [], shield: false, simple: false, martial: false, weapons: STAFFS },
  warlock: { armour: ['light'], shield: false, simple: true, martial: false, weapons: [] },
  wizard: { armour: [], shield: false, simple: false, martial: false, weapons: STAFFS },
};

/** Whether a class can use (wear or wield) an item. Items that are not armour, shields or weapons: always. */
export function canUse(cls: CharacterClass, kind: ItemKind): boolean {
  const item = WEARABLES[kind];
  if (!item) return false;
  const p = PROFICIENCY[cls];
  if (item.armour) return p.armour.includes(item.armour.type);
  if (item.shield) return p.shield;
  if (item.weapon) return p.weapons.includes(item.base ?? kind) || (item.weapon.martial ? p.martial : p.simple);
  return true;
}

/** Whether an item can go into a slot (by its place; not the rules of the hands: handsAfter). */
export function fitsSlot(kind: ItemKind, slot: GearSlot): boolean {
  const item = WEARABLES[kind];
  if (!item) return false;
  switch (item.place) {
    case 'ring':
      return slot === 'ring-left' || slot === 'ring-right';
    case 'hand':
      return slot === 'main' || (slot === 'off' && item.weapon?.light === true);
    case 'shield':
      return slot === 'off';
    default:
      return item.place === slot;
  }
}

// ---------------------------------------------------------------- what the gear gives

/** The dice of a weapon's die (5e): one die of it (a d8 gives 1d8); the modifier comes in traits.ts. */
export function dieBase(die: Die): Dice {
  return dice(1, die);
}

/** An unarmed strike (5e: 1 + the mod). */
export const UNARMED_BASE: Dice = dice(0, 0, 1);
/** A monk's martial arts at level 1 (5e: d4 + DEX): its unarmed strike, as quick as a light weapon. */
export const MARTIAL_ARTS_BASE: Dice = dice(1, 4);
/**
 * The cantrip of a spellcaster with an empty main hand or with its focus (CASTER_FOCUS), at level 1:
 * fire bolt and eldritch blast (1d10), produce flame (1d8).
 */
export const CANTRIP_BASE: Readonly<Partial<Record<CharacterClass, Dice>>> = { druid: dice(1, 8), sorcerer: dice(1, 10), warlock: dice(1, 10), wizard: dice(1, 10) };
export const CASTER_FOCUS: Readonly<Partial<Record<CharacterClass, Focus>>> = { druid: 'druidic', sorcerer: 'arcane', warlock: 'arcane', wizard: 'arcane' };
/** A rogue's sneak attack at level 1 (1d6): on a mob that does not hunt the rogue. */
export const SNEAK_ATTACK: Dice = dice(1, 6);
/** A light weapon attacks this many ticks quicker; so does a light weapon in the off hand. */
export const LIGHT_TICKS = 2;
/** A heavy melee weapon attacks this many ticks slower. */
export const HEAVY_TICKS = 4;
/**
 * A reach weapon hits this much further (world pixels): half a tile. A mob that waits for its turn
 * stays a little out of the usual reach (MobStats.harass); with a glaive the player can hit one
 * that comes close, but not one at the far edge.
 */
export const REACH_BONUS = 8;
/** Below the Strength of a heavy armour, the character walks at this share of its speed (5e: 10 ft less). */
export const HEAVY_SPEED = 0.75;
/** In a noisy armour, mobs see a sneaking character from this share of their sight (not SNEAK_SIGHT). */
export const NOISY_SIGHT = 0.75;
/** With quiet steps (boots of elvenkind), from this share; quiet steps in a noisy armour: SNEAK_SIGHT (5e: advantage and disadvantage cancel). */
export const QUIET_SIGHT = 0.35;
/** How a character attacks with its gear: the base of its damage and the kind of its attack. */
export interface AttackGear {
  /** The dice of its damage, before the mod of the attack ability (5e: the weapon's die). */
  readonly base: Dice;
  /** A magic bonus to the damage. */
  readonly bonus: number;
  /** What it attacks with: a weapon, its cantrip, martial arts, or an unarmed strike. */
  readonly kind: 'weapon' | 'cantrip' | 'martial-arts' | 'unarmed';
  /** Ticks quicker (less than 0: slower) than the usual time between attacks. */
  readonly quicker: number;
  /** Whether its attacks are arrows. */
  readonly ranged: boolean;
  /** Whether it holds the weapon with both hands (a two-handed weapon, or a versatile one with an empty off hand). */
  readonly twoHands: boolean;
  /** How much further it hits than the usual reach (REACH_BONUS for a reach weapon, else 0). */
  readonly reach: number;
}

/** How a class attacks with this gear. */
export function attackGear(gear: Gear, cls: CharacterClass): AttackGear {
  const main = wearableOf(gear.main);
  const off = wearableOf(gear.off);
  const offQuicker = off?.weapon?.light ? LIGHT_TICKS : 0;
  const cantrip = CANTRIP_BASE[cls];
  if (cantrip !== undefined && (!main || (main.weapon?.focus && main.weapon.focus === CASTER_FOCUS[cls]))) {
    return { base: cantrip, bonus: main?.bonus ?? 0, kind: 'cantrip', quicker: offQuicker, ranged: false, twoHands: false, reach: 0 };
  }
  if (!main?.weapon) {
    return cls === 'monk'
      ? { base: MARTIAL_ARTS_BASE, bonus: 0, kind: 'martial-arts', quicker: LIGHT_TICKS + offQuicker, ranged: false, twoHands: false, reach: 0 }
      : { base: UNARMED_BASE, bonus: 0, kind: 'unarmed', quicker: offQuicker, ranged: false, twoHands: false, reach: 0 };
  }
  const weapon = main.weapon;
  const twoHands = weapon.twoHanded === true || (weapon.versatile !== undefined && gear.off === null);
  const die = weapon.versatile !== undefined && gear.off === null ? weapon.versatile : weapon.die;
  const ranged = weapon.ranged === true;
  const quicker = (weapon.light ? LIGHT_TICKS : 0) - (weapon.heavy && !ranged ? HEAVY_TICKS : 0) + offQuicker;
  return { base: dieBase(die), bonus: main.bonus ?? 0, kind: 'weapon', quicker, ranged, twoHands, reach: weapon.reach ? REACH_BONUS : 0 };
}

/** The Armour Class of a character (5e): its armour and DEX, its shield, the defence of its class, magic. */
export function armourClass(gear: Gear, scores: Scores, cls: CharacterClass): number {
  const dex = abilityModifier(scores.dex);
  const armour = wearableOf(gear.armour);
  const off = wearableOf(gear.off);
  const shield = off?.shield ?? 0;
  let ac: number;
  if (!armour?.armour) {
    // Unarmoured defence: a barbarian adds CON; a monk without a shield adds WIS.
    ac = 10 + dex;
    if (cls === 'barbarian') ac += abilityModifier(scores.con);
    if (cls === 'monk' && shield === 0) ac += abilityModifier(scores.wis);
  } else {
    const { type, ac: base } = armour.armour;
    ac = base + (type === 'light' ? dex : type === 'medium' ? Math.min(dex, 2) : 0);
  }
  let bonus = 0;
  for (const slot of GEAR_SLOTS) {
    const item = wearableOf(gear[slot]);
    if (item?.bonus && !item.weapon) bonus += item.bonus;
    // Bracers of defence: only without armour and a shield.
    if (item?.unarmoured && !armour?.armour && shield === 0) bonus += item.unarmoured;
  }
  return ac + shield + bonus;
}

/** The luck of the worn items: it adds to each score for every gate. */
export function gearLuck(gear: Gear): number {
  return GEAR_SLOTS.reduce((sum, slot) => sum + (wearableOf(gear[slot])?.luck ?? 0), 0);
}

/** The heavy armour that is too heavy for this Strength, or null. */
export function tooHeavy(gear: Gear, scores: Scores): ArmourDef | null {
  const armour = wearableOf(gear.armour)?.armour;
  return armour?.str !== undefined && scores.str < armour.str ? armour : null;
}

/** Whether the worn armour is noisy. */
export function isNoisy(gear: Gear): boolean {
  return wearableOf(gear.armour)?.armour?.noisy === true;
}

/** Whether the character steps quietly (boots of elvenkind). */
export function isQuiet(gear: Gear): boolean {
  return GEAR_SLOTS.some((slot) => wearableOf(gear[slot])?.quiet === true);
}

/** Whether a worn item lets the character walk in deep water (Wearable.swim). */
export function gearSwims(gear: Gear): boolean {
  return GEAR_SLOTS.some((slot) => wearableOf(gear[slot])?.swim === true);
}

/** The scores with what the worn items set and add (gauntlets of ogre power, a belt of dwarvenkind). */
export function wornScores(scores: Scores, gear: Gear): Scores {
  let out: Record<keyof Scores, number> | null = null;
  for (const slot of GEAR_SLOTS) {
    const item = wearableOf(gear[slot]);
    if (!item?.sets && !item?.adds) continue;
    out ??= { ...scores };
    for (const [ability, value] of Object.entries(item.sets ?? {}) as [keyof Scores, number][]) out[ability] = Math.max(out[ability], value);
    for (const [ability, value] of Object.entries(item.adds ?? {}) as [keyof Scores, number][]) out[ability] = Math.max(out[ability], Math.min(MAX_RAISED, out[ability] + value));
  }
  return out ?? scores;
}

/** How many worn items need attunement. */
export function attunedCount(gear: Gear): number {
  return GEAR_SLOTS.reduce((n, slot) => n + (wearableOf(gear[slot])?.attune ? 1 : 0), 0);
}

// ---------------------------------------------------------------- the kits

/**
 * The 5e starting kit of a class (SRD 5.1), only what it wears: the daggers, the packs and the
 * tools stay out (the pack is small). It depends on the class only, so the builder shows it before
 * the scores: a fighter takes chain mail, a longsword and a shield (without STR 13, it walks slower
 * in the chain mail, and it can take it off).
 */
export function kitOf(cls: CharacterClass): Gear {
  const kit = (worn: Partial<Record<GearSlot, ItemKind>>): Gear => ({ ...EMPTY_GEAR, ...worn });
  switch (cls) {
    case 'barbarian':
      return kit({ main: 'greataxe' });
    case 'bard':
      return kit({ main: 'rapier', armour: 'leather-armour' });
    case 'cleric':
      return kit({ main: 'mace', off: 'shield', armour: 'scale-mail' });
    case 'druid':
      return kit({ main: 'druid-staff', off: 'shield', armour: 'leather-armour' });
    case 'fighter':
      return kit({ main: 'longsword', off: 'shield', armour: 'chain-mail' });
    case 'monk':
      return kit({});
    case 'paladin':
      return kit({ main: 'longsword', off: 'shield', armour: 'chain-mail' });
    case 'ranger':
      return kit({ main: 'longbow', armour: 'leather-armour' });
    case 'rogue':
      return kit({ main: 'shortsword', armour: 'leather-armour' });
    case 'sorcerer':
      return kit({});
    case 'warlock':
      return kit({ armour: 'leather-armour' });
    case 'wizard':
      return kit({ main: 'arcane-staff' });
  }
}

// ---------------------------------------------------------------- addresses

/**
 * A place in the inventory: a slot of the pack (0 to MAX_SLOTS - 1), or a worn slot (GEAR_BASE +
 * its index in GEAR_SLOTS). The messages `move` and `put` use these numbers.
 */
export const GEAR_BASE = 32;

export function gearAddress(slot: GearSlot): number {
  return GEAR_BASE + GEAR_SLOTS.indexOf(slot);
}

/** The worn slot of an address, or null (a slot of the pack, or nothing). */
export function gearSlotAt(address: number): GearSlot | null {
  return GEAR_SLOTS[address - GEAR_BASE] ?? null;
}

// ---------------------------------------------------------------- checks

/**
 * Checks gear from outside (a stored row): an object with a known kind or null for each slot, each
 * kind in a slot that fits it, at most MAX_ATTUNED attuned items, and no item in the off hand with
 * a two-handed weapon. Null if it is not gear.
 */
export function checkGear(raw: unknown): Gear | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const m = raw as Record<string, unknown>;
  const gear: Record<GearSlot, ItemKind | null> = { ...EMPTY_GEAR };
  for (const slot of GEAR_SLOTS) {
    const value = m[slot] ?? null;
    if (value === null) continue;
    if (typeof value !== 'string' || !(value in WEARABLES) || !fitsSlot(value as ItemKind, slot)) return null;
    gear[slot] = value as ItemKind;
  }
  if (attunedCount(gear) > MAX_ATTUNED) return null;
  if (gear.off !== null && wearableOf(gear.main)?.weapon?.twoHanded) return null;
  return gear;
}

/** The worn items, in the order of the slots. */
export function wornItems(gear: Gear): ItemKind[] {
  return GEAR_SLOTS.map((slot) => gear[slot]).filter((kind): kind is ItemKind => kind !== null);
}
