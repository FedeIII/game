import type { Pack } from './items.ts';
import { NAME_MAX, cleanName } from './net/protocol.ts';

/**
 * The player character: a name, a race, a class, a gender, a look, and the six ability scores of
 * D&D 5e. The rules come from the System Reference Document 5.1 (SRD, CC-BY-4.0): ability scores
 * by point buy, and the ability score increases of each race (with the SRD's subrace where a race
 * has one). The page and the server both use this module: the page to build a character, the
 * server to check what it stores.
 */

export const RACES = ['human', 'dwarf', 'elf', 'gnome', 'half-elf', 'halfling', 'half-orc'] as const;
export const CLASSES = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard'] as const;
export const GENDERS = ['male', 'female', 'undetermined'] as const;
export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

export type Race = (typeof RACES)[number];
export type CharacterClass = (typeof CLASSES)[number];
export type Gender = (typeof GENDERS)[number];
export type Ability = (typeof ABILITIES)[number];
export type Scores = Readonly<Record<Ability, number>>;

// ---------------------------------------------------------------- ability scores

/**
 * Point buy (SRD 5.1, "Ability Scores"): each score starts at 8, and 27 points buy increases. A
 * score costs more points as it goes up, and it can be 15 at most before the race's increases.
 */
export const POINT_BUY = {
  budget: 27,
  min: 8,
  max: 15,
  /** The total cost of a score, from 8 (free) to 15. */
  cost: { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 } as Readonly<Record<number, number>>,
} as const;

/** Every score at 8: what a new character starts with. */
export const BASE_SCORES: Scores = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };

/** The points that a score costs, or NaN for a score that point buy cannot give. */
export function pointCost(score: number): number {
  return POINT_BUY.cost[score] ?? Number.NaN;
}

/** The points that a set of base scores costs in total. */
export function pointsSpent(scores: Scores): number {
  return ABILITIES.reduce((sum, ability) => sum + pointCost(scores[ability]), 0);
}

/**
 * The ability score increases of each race (SRD 5.1). Where the SRD gives one subrace, its
 * increase is here too: hill dwarf (Wis), high elf (Int), rock gnome (Con), lightfoot halfling
 * (Cha). A half-elf also chooses two other abilities for +1 each (HALF_ELF_CHOICES).
 */
export const RACE_BONUS: Readonly<Record<Race, Partial<Scores>>> = {
  human: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
  dwarf: { con: 2, wis: 1 },
  elf: { dex: 2, int: 1 },
  gnome: { int: 2, con: 1 },
  'half-elf': { cha: 2 },
  halfling: { dex: 2, cha: 1 },
  'half-orc': { str: 2, con: 1 },
};

/** A half-elf chooses this many abilities for +1 each, and not Charisma (which already has +2). */
export const HALF_ELF_CHOICES = { count: 2, except: 'cha' as Ability } as const;

/** The number of free +1 choices of a race. */
export function bonusChoices(race: Race): number {
  return race === 'half-elf' ? HALF_ELF_CHOICES.count : 0;
}

/** The increase that a race (and its free choices) gives to each ability. */
export function raceBonus(race: Race, chosen: readonly Ability[]): Scores {
  const out: Record<Ability, number> = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  for (const ability of ABILITIES) out[ability] = RACE_BONUS[race][ability] ?? 0;
  if (bonusChoices(race) > 0) for (const ability of chosen) out[ability] += 1;
  return out;
}

/** The scores after the race's increases. */
export function finalScores(base: Scores, race: Race, chosen: readonly Ability[]): Scores {
  const bonus = raceBonus(race, chosen);
  const out: Record<Ability, number> = { ...base };
  for (const ability of ABILITIES) out[ability] = base[ability] + bonus[ability];
  return out;
}

/** The modifier of a score: (score - 10) / 2, rounded down. */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * The abilities that each class needs most (SRD 5.1, the "Quick Build" of each class, and the
 * multiclass prerequisites). The character builder marks them.
 */
export const CLASS_PRIMARY: Readonly<Record<CharacterClass, readonly Ability[]>> = {
  barbarian: ['str', 'con'],
  bard: ['cha', 'dex'],
  cleric: ['wis'],
  druid: ['wis'],
  fighter: ['str', 'con'],
  monk: ['dex', 'wis'],
  paladin: ['str', 'cha'],
  ranger: ['dex', 'wis'],
  rogue: ['dex'],
  sorcerer: ['cha', 'con'],
  warlock: ['cha'],
  wizard: ['int'],
};

/**
 * The ability that each class attacks with: it gives the damage of a blow (traits.ts). The ability
 * comes from the class, not from the item in the hand: a wizard with a plain staff strikes with
 * Intelligence, a cleric with a mace with Wisdom (Fede's decision, 2026-10-10, "Option B").
 */
export const ATTACK_ABILITY: Readonly<Record<CharacterClass, Ability>> = {
  barbarian: 'str',
  bard: 'dex',
  cleric: 'wis',
  druid: 'wis',
  fighter: 'str',
  monk: 'dex',
  paladin: 'str',
  ranger: 'dex',
  rogue: 'dex',
  sorcerer: 'cha',
  warlock: 'cha',
  wizard: 'int',
};

// ---------------------------------------------------------------- the look

/**
 * The look of a character is one 32-bit number, the skin seed that the client renders and that
 * the multiplayer protocol carries. Its low bits are the race (3 bits), the class (4 bits) and the
 * gender (2 bits); the other 23 bits are the variant: the random part (hair, colours, garments).
 * Thus every combination of race, class and gender has 2^23 looks. Any 32-bit number decodes to
 * a valid look (a value out of range wraps), so an old seed still gives a figure.
 */
export const VARIANT_BITS = 23;
export const VARIANT_MAX = 2 ** VARIANT_BITS - 1;

export interface Appearance {
  readonly race: Race;
  readonly class: CharacterClass;
  readonly gender: Gender;
  /** 0 to VARIANT_MAX. */
  readonly variant: number;
}

export function appearanceSeed(look: Appearance): number {
  const race = RACES.indexOf(look.race);
  const cls = CLASSES.indexOf(look.class);
  const gender = GENDERS.indexOf(look.gender);
  return ((look.variant & VARIANT_MAX) * 512 + gender * 128 + cls * 8 + race) >>> 0;
}

export function appearanceOf(seed: number): Appearance {
  const s = seed >>> 0;
  return {
    race: RACES[(s & 7) % RACES.length]!,
    class: CLASSES[((s >>> 3) & 15) % CLASSES.length]!,
    gender: GENDERS[((s >>> 7) & 3) % GENDERS.length]!,
    variant: s >>> 9,
  };
}

// ---------------------------------------------------------------- the character

/** The most characters that one account keeps. */
export const MAX_CHARACTERS = 12;
/** A name has at least this many characters (after cleanName). */
export const NAME_MIN = 2;

/** What the player chooses for a new character. */
export interface CharacterSheet {
  readonly name: string;
  readonly race: Race;
  readonly class: CharacterClass;
  readonly gender: Gender;
  /** The random part of the look: 0 to VARIANT_MAX. */
  readonly variant: number;
  /** The scores bought with points, before the race's increases. */
  readonly base: Scores;
  /** A half-elf's free +1 choices (HALF_ELF_CHOICES); empty for the other races. */
  readonly bonus: readonly Ability[];
}

/** Where a character was last: a world, and the centre of its feet there, in world pixels. */
export interface CharacterPlace {
  readonly world: string;
  readonly x: number;
  readonly y: number;
}

/** A stored character. */
export interface Character extends CharacterSheet {
  readonly id: string;
  /** Milliseconds since 1970. */
  readonly createdAt: number;
  /** When it last started to play, or null. */
  readonly playedAt: number | null;
  /** Where it was last, or null (it never played, or it played before the game kept places). */
  readonly place: CharacterPlace | null;
  /** What it carries (items.ts). In a shared world the server keeps it; a page never writes it. */
  readonly pack: Pack;
  /** Its hit points when it last played, or null: all of them (traits.ts, maxHp). The server keeps it. */
  readonly hp: number | null;
  /** The refuges that it has entered (WorldSource.refuges): it can wake there after a defeat. */
  readonly refuges: readonly string[];
}

/** The id of a world, as a place names it. */
const WORLD_ID = /^[a-z0-9-]{1,32}$/;
/** A place is at most this far from the origin, on each axis (world pixels): a million tiles. */
export const PLACE_LIMIT = 16_000_000;

/** Checks a place from outside (a request, a stored row): a world id and two finite numbers in range. Null if it is not one. */
export function checkPlace(raw: unknown): CharacterPlace | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  const inRange = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= PLACE_LIMIT;
  if (typeof m.world !== 'string' || !WORLD_ID.test(m.world) || !inRange(m.x) || !inRange(m.y)) return null;
  return { world: m.world, x: m.x, y: m.y };
}

/** The skin seed of a character. */
export function characterSkin(sheet: Pick<CharacterSheet, 'race' | 'class' | 'gender' | 'variant'>): number {
  return appearanceSeed(sheet);
}

export type SheetCheck = { readonly ok: true; readonly sheet: CharacterSheet } | { readonly ok: false; readonly error: string };

const isMember = <T extends string>(list: readonly T[], value: unknown): value is T => typeof value === 'string' && (list as readonly string[]).includes(value);

/**
 * Checks a character sheet from outside (a request, a stored row): every field, the point buy and
 * the bonus choices. The name is cleaned (cleanName) and must keep NAME_MIN characters.
 */
export function checkSheet(raw: unknown): SheetCheck {
  const fail = (error: string): SheetCheck => ({ ok: false, error });
  if (!raw || typeof raw !== 'object') return fail('not an object');
  const m = raw as Record<string, unknown>;
  if (typeof m.name !== 'string' || m.name.length > 4 * NAME_MAX) return fail('name');
  const name = cleanName(m.name);
  if ([...name].length < NAME_MIN) return fail('name');
  if (!isMember(RACES, m.race)) return fail('race');
  if (!isMember(CLASSES, m.class)) return fail('class');
  if (!isMember(GENDERS, m.gender)) return fail('gender');
  if (!Number.isInteger(m.variant) || (m.variant as number) < 0 || (m.variant as number) > VARIANT_MAX) return fail('variant');
  if (!m.base || typeof m.base !== 'object') return fail('base');
  const baseIn = m.base as Record<string, unknown>;
  const base: Record<Ability, number> = { ...BASE_SCORES };
  for (const ability of ABILITIES) {
    const score = baseIn[ability];
    if (!Number.isInteger(score) || (score as number) < POINT_BUY.min || (score as number) > POINT_BUY.max) return fail(`base.${ability}`);
    base[ability] = score as number;
  }
  if (pointsSpent(base) > POINT_BUY.budget) return fail('points');
  if (!Array.isArray(m.bonus)) return fail('bonus');
  const choices = bonusChoices(m.race);
  const bonus = m.bonus as unknown[];
  if (bonus.length !== choices) return fail('bonus');
  if (!bonus.every((a) => isMember(ABILITIES, a) && a !== HALF_ELF_CHOICES.except)) return fail('bonus');
  if (new Set(bonus).size !== bonus.length) return fail('bonus');
  return {
    ok: true,
    sheet: { name, race: m.race, class: m.class, gender: m.gender, variant: m.variant as number, base, bonus: bonus as Ability[] },
  };
}
