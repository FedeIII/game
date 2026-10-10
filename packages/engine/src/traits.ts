import { ABILITIES, ATTACK_ABILITY, abilityModifier, appearanceOf, finalScores, type Ability, type CharacterClass, type CharacterSheet, type Scores } from './character.ts';
import { TILE_SIZE } from './constants.ts';
import { ATTACK_COOLDOWN_TICKS, ATTACK_TICKS, DODGE_COOLDOWN_TICKS, GUARD_TICKS, isSneaking, type PlayerState } from './player.ts';

/**
 * What the ability scores of a character give in the game: the damage and the force of its blows,
 * what it can walk through, how much it carries. The page and the server make the same traits
 * from the same sheet: the server from the stored character (a client cannot send its own), the
 * page for its prediction. See docs/drafts/abilities.md.
 *
 * Two kinds of effect: a scale (a number changes with the modifier of a score: -1 to +3) and a
 * gate (a fixed limit on a score opens something: Gate). A gate is never a roll of a die.
 */
export interface PlayerTraits {
  /** The scores after the race's increases. */
  readonly scores: Scores;
  /** The ability that the class attacks with (ATTACK_ABILITY). */
  readonly attack: Ability;
  /** The health points that a blow takes from a mob: BASE_DAMAGE + the modifier of the attack ability. */
  readonly damage: number;
  /** The push of a blow, as a share of the mob's knockback (STR, for every class). */
  readonly push: number;
  /** How long a mob reels from a blow, as a share of its hurtMs (STR, for every class). */
  readonly stagger: number;
  /** Whether the character can walk in shallow water (WADE_GATE). */
  readonly wade: boolean;
  /** The slots of its pack (items.ts). */
  readonly slots: number;
  /** Ticks from the start of an attack to the start of the next (DEX). */
  readonly cooldown: number;
  /** Ticks after a stun in which no mob can hit it (DEX). */
  readonly guard: number;
  /** Ticks from the start of a dodge to the start of the next (DEX). */
  readonly dodgeCooldown: number;
  /** How far mobs see it, as a share of their sight (DEX); half of that while it sneaks. */
  readonly sight: number;
  /** Whether its attacks are arrows (a ranger's bow), and how far an arrow flies (world pixels; DEX). */
  readonly ranged: boolean;
  readonly range: number;
}

/** A fixed limit on a score: a thing opens for a character with at least `min` in `ability`. */
export interface Gate {
  readonly ability: Ability;
  readonly min: number;
}

/** A blow takes this many health points, plus the modifier of the attack ability (at least 1). */
export const BASE_DAMAGE = 4;
/** Each point of the STR modifier pushes a mob this share further, and makes it reel this share longer. */
export const PUSH_PER_MOD = 0.15;
export const STAGGER_PER_MOD = 0.2;
/** The pack has this many slots, and this many more for each point of the STR modifier. */
export const PACK_SLOTS = 6;
export const SLOTS_PER_MOD = 2;
/** Each point of the DEX modifier: this many ticks less between attacks, more of the guard, less between dodges. */
export const COOLDOWN_PER_MOD = 2;
export const GUARD_PER_MOD = 9;
export const DODGE_PER_MOD = 12;
/** Each point of the DEX modifier: mobs see this share less far. */
export const SIGHT_PER_MOD = 0.08;
/** An arrow flies this many tiles, and one more for each point of the DEX modifier. */
export const RANGE_TILES = 5;
/** The usual gate: a score of 13 or more. */
export const GATE_SCORE = 13;
/** A character with this can walk in shallow water. */
export const WADE_GATE: Gate = { ability: 'str', min: GATE_SCORE };
/** The usual boards on a barred door (Building.barred): a world can use another gate. */
export const FORCE_GATE: Gate = { ability: 'str', min: GATE_SCORE };
/** The usual lock of a chest (Fixture.lock). */
export const PICK_GATE: Gate = { ability: 'dex', min: GATE_SCORE };

/** While a player sneaks (isSneaking), mobs see it from this share of the distance. */
export const SNEAK_SIGHT = 0.5;

/** How far mobs see a player now, as a share of their sight (HordePlayer.sight): its Dexterity, and half of that while it sneaks. */
export function sightOf(traits: Pick<PlayerTraits, 'sight'>, state: Pick<PlayerState, 'vx' | 'vy' | 'attack' | 'dodge'>): number {
  return traits.sight * (isSneaking(state) ? SNEAK_SIGHT : 1);
}

/** Whether a character's scores pass a gate. */
export function meetsGate(scores: Scores, gate: Gate): boolean {
  return scores[gate.ability] >= gate.min;
}

/** The traits of a class with these final scores. */
export function traitsOf(scores: Scores, cls: CharacterClass): PlayerTraits {
  const attack = ATTACK_ABILITY[cls];
  const str = abilityModifier(scores.str);
  const dex = abilityModifier(scores.dex);
  return {
    scores,
    attack,
    damage: Math.max(1, BASE_DAMAGE + abilityModifier(scores[attack])),
    push: 1 + PUSH_PER_MOD * str,
    stagger: 1 + STAGGER_PER_MOD * str,
    wade: meetsGate(scores, WADE_GATE),
    slots: Math.max(1, PACK_SLOTS + SLOTS_PER_MOD * str),
    // Never shorter than the attack itself.
    cooldown: Math.max(ATTACK_TICKS + 1, ATTACK_COOLDOWN_TICKS - COOLDOWN_PER_MOD * dex),
    guard: Math.max(0, GUARD_TICKS + GUARD_PER_MOD * dex),
    dodgeCooldown: Math.max(1, DODGE_COOLDOWN_TICKS - DODGE_PER_MOD * dex),
    sight: Math.max(0.1, 1 - SIGHT_PER_MOD * dex),
    ranged: cls === 'ranger',
    range: (RANGE_TILES + dex) * TILE_SIZE,
  };
}

/** The traits of a stored character. */
export function sheetTraits(sheet: Pick<CharacterSheet, 'base' | 'race' | 'bonus' | 'class'>): PlayerTraits {
  return traitsOf(finalScores(sheet.base, sheet.race, sheet.bonus), sheet.class);
}

/** Every score at 10 (every modifier 0). */
export const PLAIN_SCORES: Scores = Object.fromEntries(ABILITIES.map((a) => [a, 10])) as Record<Ability, number>;

/** The traits of a player without a character (a guest): every score 10, and the class of its look. */
export function guestTraits(skin: number): PlayerTraits {
  return traitsOf(PLAIN_SCORES, appearanceOf(skin).class);
}

/** Every score at 10, a fighter: the plain traits (tests, and a player without a look). */
export const GUEST_TRAITS: PlayerTraits = traitsOf(PLAIN_SCORES, 'fighter');
