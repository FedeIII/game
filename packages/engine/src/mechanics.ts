/**
 * The mechanics of combat of the melee draft (docs/drafts/combat-melee.md: its proposals), each one a
 * switch that is off by default. Only the sandbox of an admin turns them on now (the page's
 * sandbox.ts; Fede, 2026-10-15: "I test them myself"): the Room never does, so a shared world plays as
 * before, and the wire does not change. Fede tests each one alone or with others, and keeps or drops
 * it. A mechanic that stays becomes a rule of the game, without its switch.
 *
 * The player's side of a mechanic reads the switches from its StepTraits (player.ts, stepPlayer); the
 * mobs' side from Horde.mechanics. Where the draft gives a sure effect (no roll), the sandbox gives
 * the dice an edge instead (Fede, 2026-10-15: "adapt them to dice whenever it makes more sense").
 */

/** The mechanics, in the order of the proposals of the draft. */
export const MECHANICS = ['grades', 'riposte'] as const;

export type Mechanic = (typeof MECHANICS)[number];

/** The mechanics that are on. */
export type Mechanics = ReadonlySet<Mechanic>;

/** No mechanic on: the game as it is. */
export const NO_MECHANICS: Mechanics = new Set();

/**
 * Something that a mechanic did in a fight, for the page to show (a word over the player or a mob):
 * `sharp`, a sharp evade (the grades of a brace); `riposte`, a mob off balance after an evade (the
 * riposte).
 */
export type MechanicEventKind = 'sharp' | 'riposte';

export interface MechanicEvent {
  readonly kind: MechanicEventKind;
  /** The mob, and the player (an id of HordePlayer). */
  readonly mob: number;
  readonly player: number;
}

// ---------------------------------------------------------------- 1. the grades of a brace

/**
 * The grade of a brace (proposal 1): the time from its start to a mob's blow. `sharp` in its first
 * SHARP_TICKS (0.1 s): the mob rolls with disadvantage against the AC of the brace (the draft: a sure
 * evade). `clean` up to CLEAN_TICKS (0.2 s): the AC of the brace, as without the grades. `late` after it,
 * also while the step back is held: the tension goes, and only half of what the brace adds to the AC
 * counts (LATE_SHARE; at least 1).
 */
export type BraceGrade = 'sharp' | 'clean' | 'late';

export const SHARP_TICKS = 6;
export const CLEAN_TICKS = 12;
export const LATE_SHARE = 0.5;

/** The grade of a brace that began `age` ticks ago (PlayerState.braceAge: 1 in its first tick). */
export function braceGrade(age: number): BraceGrade {
  return age <= SHARP_TICKS ? 'sharp' : age <= CLEAN_TICKS ? 'clean' : 'late';
}

/** What a late brace adds to the AC: LATE_SHARE of `braceAc`, rounded down, at least 1. */
export function lateBraceAc(braceAc: number): number {
  return Math.max(1, Math.floor(braceAc * LATE_SHARE));
}

// ---------------------------------------------------------------- 2. the riposte

/**
 * The riposte (proposal 2; the Riposte of the Battle Master, and advantage): an evade puts the mob off
 * balance for RIPOSTE_MS. It reels in place (state 'hurt', with no push and no flash): it cannot wind up.
 * The next blow of the player on it in that time rolls with advantage and adds the INT opening, as on a
 * mob in its wind-up (Mob.exposed). With the grades of a brace, only a sharp evade gives it.
 */
export const RIPOSTE_MS = 400;
