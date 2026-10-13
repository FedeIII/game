/**
 * Experience and levels (Fede's decisions of 2026-10-14; docs/features/game/levels.md). A character
 * starts at level 1 and rises to MAX_LEVEL with the XP of the 5e table. Kills and quests give XP:
 *
 * - A kill gives the XP of the challenge rating of the mob (its level: the 5e CR of its stat block,
 *   MobStats.cr) divided by KILL_XP_DIVISOR: a kill is much easier in this game than at the table.
 *   Each character whose blow hit the mob gets it.
 * - A quest gives the XP of its effects (QuestEffect.xp). The quests give more than half of the XP
 *   of a character, as of its coins (docs/game-design.md).
 *
 * The level of a mob or of an NPC that fights is only for these calculations: no screen shows it.
 */

/** The highest level of a character (Fede, 2026-10-14: up to level 5, with the 5e numbers). */
export const MAX_LEVEL = 5;

/** The XP that a character needs for each level (5e, Player's Handbook): index 0 is level 1. */
export const LEVEL_XP: readonly number[] = [0, 300, 900, 2700, 6500];

/** The most XP that the store keeps for a character: far more than the last level needs. */
export const MAX_XP = 1_000_000;

/** The level of a character with this much XP: 1 to MAX_LEVEL. */
export function levelOf(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= LEVEL_XP[level]!) level++;
  return level;
}

/** Where a character is on its way to the next level: the XP of its level, the XP of the next one (null at MAX_LEVEL), and the share of the way (0 to 1). */
export interface LevelProgress {
  readonly level: number;
  readonly xp: number;
  readonly from: number;
  readonly to: number | null;
  readonly share: number;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelOf(xp);
  const from = LEVEL_XP[level - 1]!;
  const to = level < MAX_LEVEL ? LEVEL_XP[level]! : null;
  return { level, xp, from, to, share: to === null ? 1 : Math.min(1, Math.max(0, (xp - from) / (to - from))) };
}

/**
 * The XP of a challenge rating (5e, Monster Manual). CR 0 gives 0 here: in this game a creature of
 * CR 0 never fights (a watcher of the Seekers, the wagon of a caravan).
 */
const CR_XP: readonly (readonly [number, number])[] = [
  [0, 0],
  [1 / 8, 25],
  [1 / 4, 50],
  [1 / 2, 100],
  [1, 200],
  [2, 450],
  [3, 700],
  [4, 1100],
  [5, 1800],
];

/** The challenge ratings that the game knows (CR_XP). */
export const CHALLENGE_RATINGS: readonly number[] = CR_XP.map(([cr]) => cr);

/** The 5e XP of a challenge rating; 0 for one that the game does not know. */
export function crXp(cr: number): number {
  return CR_XP.find(([rating]) => rating === cr)?.[1] ?? 0;
}

/**
 * A kill gives the XP of the challenge rating divided by this (Fede, 2026-10-14: a kill is much
 * easier in this game than in 5e). An admin can change it for the admin's own characters (the
 * settings); the other characters always have this one.
 */
export const KILL_XP_DIVISOR = 10;
/** The divisor that an admin can choose: a whole number in this range (1: the XP of 5e). */
export const MIN_XP_DIVISOR = 1;
export const MAX_XP_DIVISOR = 100;

/** The XP that a kill of a creature of this challenge rating gives to each character that hit it. */
export function killXp(cr: number, divisor: number = KILL_XP_DIVISOR): number {
  return Math.round(crXp(cr) / divisor);
}

/** Checks a divisor from outside (a request, a stored row): a whole number from MIN_XP_DIVISOR to MAX_XP_DIVISOR, else null. */
export function checkXpDivisor(raw: unknown): number | null {
  return Number.isInteger(raw) && (raw as number) >= MIN_XP_DIVISOR && (raw as number) <= MAX_XP_DIVISOR ? (raw as number) : null;
}

/** Checks the XP of a stored character: a whole number from 0 to MAX_XP, else 0. */
export function checkXp(raw: unknown): number {
  return Number.isInteger(raw) && (raw as number) >= 0 ? Math.min(raw as number, MAX_XP) : 0;
}
