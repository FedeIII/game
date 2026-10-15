import type { Race } from './character.ts';
import type { MobKind } from './mobs.ts';

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
export const MECHANICS = ['grades', 'riposte', 'front', 'flank', 'parry', 'guard', 'shove', 'clash'] as const;

export type Mechanic = (typeof MECHANICS)[number];

/** The mechanics that are on. */
export type Mechanics = ReadonlySet<Mechanic>;

/** No mechanic on: the game as it is. */
export const NO_MECHANICS: Mechanics = new Set();

/**
 * Something that a mechanic did in a fight, for the page to show (a word over the player or a mob):
 * `sharp`, a sharp evade (the grades of a brace); `riposte`, a mob off balance after an evade (the
 * riposte); `behind`, a blow from the side or the back of a brace (the front of a brace); `flank`, a
 * mob that must turn to a player at its side (the flank); `parry`, a blow that a parry turned (the
 * parry); `block`, a blow that a shield turned, and `broken`, a heavy blow that broke a guard (the
 * guard stance); `shoved`, a mob that a shove knocked down, `held`, a mob that a shove did not move, and
 * `tooBig`, a mob too big to shove (the shove); `clash`, `clashWon` and `clashLost`, two blows that met:
 * a tie, a win and a loss of the player (the clash).
 */
export type MechanicEventKind = 'sharp' | 'riposte' | 'behind' | 'flank' | 'parry' | 'block' | 'broken' | 'shoved' | 'held' | 'tooBig' | 'clash' | 'clashWon' | 'clashLost';

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

// ---------------------------------------------------------------- 3. the front of a brace

/**
 * The front of a brace (proposal 3): a brace counts only against a blow from its front, from a mob
 * within FRONT_ANGLE of the way that the player struck (PlayerState.aim). A blow from the side or the
 * back rolls against the plain AC, and a miss glances off. With one mob nothing changes; with two or
 * three the player must keep them in front of it (positioning).
 */
export const FRONT_ANGLE = Math.PI / 2;

/** Whether (x, y) is in front of a player at (px, py) that faces `aim` (radians): within `angle` of it. */
export function inFront(px: number, py: number, aim: number, x: number, y: number, angle = FRONT_ANGLE): boolean {
  const dx = x - px;
  const dy = y - py;
  const d = Math.hypot(dx, dy);
  if (d < 1) return true;
  return (dx * Math.cos(aim) + dy * Math.sin(aim)) / d >= Math.cos(angle) - 1e-9;
}

// ---------------------------------------------------------------- 4. the flank

/**
 * The flank (proposal 4, the sidestep: the jump from a brace is its move; this is the rest of it). A mob
 * aims its blow when its wind-up starts. When its blow does not hit, and the player is then more than
 * FLANK_ANGLE off that aim (a jump to the side in the wind-up), the player is at its flank: the mob must
 * turn for TURN_MS before its next wind-up, and the next blow of the player on it, in its blow and its
 * turn, rolls with advantage (the optional rule of 5e for flanking; Mob.exposed).
 */
export const FLANK_ANGLE = (40 * Math.PI) / 180;
export const TURN_MS = 400;

/** Whether a player at (x, y) is at the flank of a mob at (mx, my) that aims its blow at `aim` (radians). */
export function atFlank(mx: number, my: number, aim: number, x: number, y: number): boolean {
  return !inFront(mx, my, aim, x, y, FLANK_ANGLE);
}

// ---------------------------------------------------------------- 5. the parry

/**
 * The parry (proposal 5; the reaction Parry of the SRD knight and bandit captain): an attack of a
 * melee weapon while a mob's blow comes, in the last PARRY_WINDOW_TICKS of its wind-up, is a parry, not
 * a blow: the weapon meets the mob's weapon. The player stands in its guard (PlayerState.parry) and its
 * proficiency bonus goes on its AC against that blow; in the last SHARP_PARRY_TICKS the mob also rolls
 * with disadvantage (the draft: a sure parry), and a miss then gives a riposte (with the riposte on).
 * A miss is a parry: the steel rings, and both step back PARRY_PUSH. A hit takes its damage, as
 * before. Earlier than the window, an attack is a blow into the wind-up, as before (the INT opening).
 * Not a bow, not an empty hand.
 */
export const PARRY_WINDOW_TICKS = 9;
export const SHARP_PARRY_TICKS = 5;
/** The player stands in its guard this long (ticks) after the start of a parry. */
export const PARRY_TICKS = 15;
/** A parry pushes the player and the mob this far apart (world pixels). */
export const PARRY_PUSH = 4;

// ---------------------------------------------------------------- 6. the guard stance and the shield block

/**
 * The guard stance (proposal 6; the Dodge action of 5e, from the front only): a hold of the dodge input
 * (MoveInput.guard; a tap stays a roll) raises a guard. The player walks at GUARD_SPEED, faces the way of
 * its aim (the mouse, or the way it struck), and does not attack or roll. A blow from its front (within
 * FRONT_ANGLE) rolls with disadvantage. The guard costs GUARD_STAMINA each second; with a shield it is
 * a block, and costs BLOCK_STAMINA for each blow that it turns, and nothing each second. With no
 * stamina the guard drops. A heavy blow (a bugbear's, or a slam: the shapes of the blows) breaks the
 * guard: no disadvantage, and the player reels for GUARD_BREAK_TICKS (PlayerState.reel: no guard after
 * it, as after a stun).
 */
export const GUARD_SPEED = 0.5;
export const GUARD_STAMINA = 12;
export const BLOCK_STAMINA = 15;
export const GUARD_BREAK_TICKS = 30;

// ---------------------------------------------------------------- 7. the shove

/**
 * The shove (proposal 7; the Shove of 5e): a roll forward into a mob in reach (the way of the roll
 * within SHOVE_ARC of the way to the mob) is a shove, not a roll. It costs the stamina of the roll, and
 * the player stands SHOVE_TICKS. The dice: d20 + the player's STR modifier and proficiency bonus
 * (PlayerTraits.athletics) against d20 + the better of the mob's STR and DEX modifiers (MOB_BODY); a tie
 * goes to the mob. A win knocks the mob down for SHOVE_KNOCK_MS (it cannot wind up, and blows on it roll
 * with advantage: Mob.exposed) and pushes it SHOVE_PUSH back. A loss does nothing. A player cannot
 * shove a mob more than one size larger (5e): a halfling or a gnome cannot shove a brute or a worg.
 */
export const SHOVE_ARC = Math.PI / 4;
export const SHOVE_TICKS = 12;
export const SHOVE_KNOCK_MS = 800;
export const SHOVE_PUSH = 16;

/** The sizes of 5e, from small to big. */
export const SIZES = ['tiny', 'small', 'medium', 'large', 'huge'] as const;
export type Size = (typeof SIZES)[number];

/** The size of each race (5e): a gnome and a halfling are small. */
export const RACE_SIZE: Readonly<Record<Race, Size>> = {
  human: 'medium',
  dwarf: 'medium',
  elf: 'medium',
  gnome: 'small',
  'half-elf': 'medium',
  halfling: 'small',
  'half-orc': 'medium',
};

/** The body of each kind of mob for a shove (its SRD stat block): its size and its STR and DEX modifiers. */
export const MOB_BODY: Readonly<Record<MobKind, { readonly size: Size; readonly str: number; readonly dex: number }>> = {
  imp: { size: 'tiny', str: -3, dex: 3 },
  brute: { size: 'large', str: 3, dex: 0 },
  goblin: { size: 'small', str: -1, dex: 2 },
  worg: { size: 'large', str: 3, dex: 1 },
  hobgoblin: { size: 'medium', str: 1, dex: 1 },
  bugbear: { size: 'medium', str: 2, dex: 2 },
  devastator: { size: 'medium', str: 1, dex: 1 },
  hound: { size: 'medium', str: 3, dex: 1 },
  watcher: { size: 'medium', str: 0, dex: 2 },
  seeker: { size: 'medium', str: 2, dex: 0 },
  adept: { size: 'medium', str: 0, dex: 0 },
  warden: { size: 'medium', str: 3, dex: 1 },
  skirmisher: { size: 'small', str: -1, dex: 2 },
  bandit: { size: 'medium', str: 0, dex: 1 },
};

/** Whether a player of size `player` can shove a mob of size `mob`: at most one size larger (5e). */
export function canShove(player: Size, mob: Size): boolean {
  return SIZES.indexOf(mob) - SIZES.indexOf(player) <= 1;
}

// ---------------------------------------------------------------- 8. the clash

/**
 * The clash (proposal 8): a blow of the player that starts in the last CLASH_TICKS of the wind-up of a
 * mob that hunts it, face to face (the mob in the reach of the blow), meets the mob's blow: each side
 * rolls its attack (d20 + its attack bonus), and the higher wins. Nobody takes damage, and the mob's
 * blow does not land. The mob that loses reels (as from a blow); the player that loses reels for
 * CLASH_REEL_TICKS (PlayerState.reel: no guard after it). A tie: both step CLASH_PUSH back, and the mob
 * stops its blow for CLASH_PAUSE_MS. With the parry on, an attack in the last ticks of a wind-up is a
 * parry: the parry comes first.
 */
export const CLASH_TICKS = 3;
export const CLASH_REEL_TICKS = 24;
export const CLASH_PUSH = 4;
export const CLASH_PAUSE_MS = 250;
