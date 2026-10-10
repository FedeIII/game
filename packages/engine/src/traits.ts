import { ABILITIES, ATTACK_ABILITY, abilityModifier, appearanceOf, finalScores, type Ability, type CharacterClass, type CharacterSheet, type Scores } from './character.ts';
import { TILE_SIZE } from './constants.ts';
import {
  ATTACK_COOLDOWN_TICKS,
  ATTACK_TICKS,
  DODGE_COOLDOWN_TICKS,
  GUARD_TICKS,
  PLAIN_HP,
  PLAIN_STAMINA,
  RECOVER_TICKS,
  STAMINA_REFILL,
  isSneaking,
  type PlayerState,
} from './player.ts';

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
  /** Its most hit points (CON). */
  readonly maxHp: number;
  /** The length of a stun that a mob gives it, as a share (CON). */
  readonly stun: number;
  /** Ticks for each hit point that comes back, out of a fight (CON). */
  readonly recover: number;
  /** Its most stamina, and the stamina that comes back each second (CON). */
  readonly maxStamina: number;
  readonly staminaRefill: number;
  /** The length of a poison or of a drink, as a share (CON). */
  readonly resist: number;
  /** The damage that a blow adds on a mob in its wind-up (INT; never less than 0). */
  readonly opening: number;
  /** How far it senses a mob that hunts it, out of its view (world pixels; WIS). */
  readonly sense: number;
  /** How far it sees a hidden thing: herbs, a buried cache (world pixels; WIS; Fixture.hidden). */
  readonly seek: number;
  /** The darkness of the night outside the lights, as a share (WIS). */
  readonly night: number;
  /** The share of a price that it pays, and the share of a price that it gets for a sale (CHA). */
  readonly buyShare: number;
  readonly sellShare: number;
  /** How much less the attacks of a pack overlap on it (a share of an attack; CHA; less than 0: more). */
  readonly presence: number;
  /** How long a mob runs off after it hits it, as a share (CHA). */
  readonly daunt: number;
  /** The ticks of guard that it gives to the other players near it when a mob hits them (CHA; never less than 0). */
  readonly inspire: number;
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
/** Each point of the CON modifier: one more hit point (PLAIN_HP with 10), a share less of a stun, a second less for each hit point that comes back. */
export const HP_PER_MOD = 1;
export const STUN_PER_MOD = 0.1;
export const RECOVER_PER_MOD = 60;
/** Each point of the CON modifier: this much more stamina, and this much more of it back each second. */
export const STAMINA_PER_MOD = 10;
export const REFILL_PER_MOD = 4;
/** Each point of the CON modifier: a poison or a drink lasts this share less. */
export const RESIST_PER_MOD = 0.15;
/** It senses a mob that hunts it this many tiles away, and this many more for each point of the WIS modifier. */
export const SENSE_TILES = 8;
export const SENSE_PER_MOD = 2;
/** It sees a hidden thing this many tiles away, and this many more for each point of the WIS modifier (at least one tile). */
export const SEEK_TILES = 3;
export const SEEK_PER_MOD = 2;
/** Each point of the WIS modifier: the night is this share less dark. */
export const NIGHT_PER_MOD = 0.08;
/** Each point of the CHA modifier: a price is this share lower, and a sale gives this share more. */
export const PRICE_PER_MOD = 0.1;
/** Each point of the CHA modifier: the attacks of a pack overlap this share less, and a mob runs off this share longer after a hit. */
export const PRESENCE_PER_MOD = 0.05;
export const DAUNT_PER_MOD = 0.1;
/** Each point of the CHA modifier (above 0): this many ticks of guard for the other players within INSPIRE_RANGE. */
export const INSPIRE_PER_MOD = 6;
/** Other players this close (world pixels) get the guard of an inspiring player. */
export const INSPIRE_RANGE = 3 * TILE_SIZE;
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
export function sightOf(traits: Pick<PlayerTraits, 'sight'>, state: Parameters<typeof isSneaking>[0]): number {
  return traits.sight * (isSneaking(state) ? SNEAK_SIGHT : 1);
}

/** Whether a character's scores pass a gate. */
export function meetsGate(scores: Scores, gate: Gate): boolean {
  return scores[gate.ability] >= gate.min;
}

/** A score this much under a gate, or less, shows a clue of it (Fede's rule, 2026-10-10). */
export const GATE_HINT = 2;

/**
 * How a thing behind a gate shows to a character (Fede's rule, 2026-10-10): 'open' with the score
 * of the gate or more (the character can use it); 'hint' with a score 1 or 2 under it (a dim clue
 * with the gate, "[INT 13]", that it cannot use); 'hidden' with a lower score (nothing shows).
 */
export function gateView(scores: Scores, gate: Gate): 'open' | 'hint' | 'hidden' {
  const score = scores[gate.ability];
  if (score >= gate.min) return 'open';
  return score >= gate.min - GATE_HINT ? 'hint' : 'hidden';
}

/** The traits of a class with these final scores. */
export function traitsOf(scores: Scores, cls: CharacterClass): PlayerTraits {
  const attack = ATTACK_ABILITY[cls];
  const str = abilityModifier(scores.str);
  const dex = abilityModifier(scores.dex);
  const con = abilityModifier(scores.con);
  const int = abilityModifier(scores.int);
  const wis = abilityModifier(scores.wis);
  const cha = abilityModifier(scores.cha);
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
    maxHp: Math.max(1, PLAIN_HP + HP_PER_MOD * con),
    stun: Math.max(0.1, 1 - STUN_PER_MOD * con),
    recover: Math.max(60, RECOVER_TICKS - RECOVER_PER_MOD * con),
    maxStamina: Math.max(10, PLAIN_STAMINA + STAMINA_PER_MOD * con),
    staminaRefill: Math.max(1, STAMINA_REFILL + REFILL_PER_MOD * con),
    resist: Math.max(0.1, 1 - RESIST_PER_MOD * con),
    opening: Math.max(0, int),
    sense: (SENSE_TILES + SENSE_PER_MOD * wis) * TILE_SIZE,
    seek: Math.max(1, SEEK_TILES + SEEK_PER_MOD * wis) * TILE_SIZE,
    night: Math.max(0.1, 1 - NIGHT_PER_MOD * wis),
    buyShare: Math.max(0.5, 1 - PRICE_PER_MOD * cha),
    sellShare: Math.max(0.5, 1 + PRICE_PER_MOD * cha),
    presence: PRESENCE_PER_MOD * cha,
    daunt: Math.max(0.5, 1 + DAUNT_PER_MOD * cha),
    inspire: Math.max(0, cha) * INSPIRE_PER_MOD,
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
