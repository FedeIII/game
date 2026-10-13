import { MAX_LEVEL } from './experience.ts';
import { mobXp, type MobKind } from './mobs.ts';

/**
 * The encounters of the story, sized to the players there (docs/drafts/level-3.md, Fede's decision
 * of 2026-10-11; levels since 2026-10-14). A chapter of Kandrax makes an encounter for a party of
 * about six level-3 characters; the game sizes it for the characters that are there, at their levels.
 * The game keeps its monsters in order, as units (a worg with its goblin; then the hobgoblin; ...),
 * and takes the units in that order while the encounter stays under the 5e "deadly" budget of the
 * characters that are there, at least the first unit. With six level-3 characters the encounter is
 * the chapter's whole.
 */

/** The XP thresholds of one character of each level (5e, Dungeon Master's Guide): index 0 is level 1. */
export const XP_THRESHOLDS: readonly { readonly easy: number; readonly medium: number; readonly hard: number; readonly deadly: number }[] = [
  { easy: 25, medium: 50, hard: 75, deadly: 100 },
  { easy: 50, medium: 100, hard: 150, deadly: 200 },
  { easy: 75, medium: 150, hard: 225, deadly: 400 },
  { easy: 125, medium: 250, hard: 375, deadly: 500 },
  { easy: 250, medium: 500, hard: 750, deadly: 1100 },
];

/** The thresholds of a character of this level (1 to MAX_LEVEL). */
export function thresholdsOf(level: number): (typeof XP_THRESHOLDS)[number] {
  return XP_THRESHOLDS[Math.min(MAX_LEVEL, Math.max(1, Math.floor(level))) - 1]!;
}

/** The multiplier of the 5e encounter budget for a number of monsters. */
export function xpMultiplier(monsters: number): number {
  if (monsters <= 1) return 1;
  if (monsters === 2) return 1.5;
  if (monsters <= 6) return 2;
  if (monsters <= 10) return 2.5;
  if (monsters <= 14) return 3;
  return 4;
}

/**
 * The adjusted XP of a group of monsters (5e): the sum of their XP times the multiplier for their
 * number. A monster without XP (a watcher of the Seekers, which never fights) does not count.
 */
export function adjustedXp(kinds: readonly MobKind[]): number {
  const fighters = kinds.filter((kind) => mobXp(kind) > 0);
  return fighters.reduce((sum, kind) => sum + mobXp(kind), 0) * xpMultiplier(fighters.length);
}

/** A unit of an encounter: monsters that come together (a worg and its goblin). */
export type EncounterUnit = readonly MobKind[];

/**
 * The units of an encounter for the characters there, at these levels: the longest beginning of
 * `units` whose adjusted XP stays under the deadly budget of the party (at least the first unit; a
 * party of nobody counts as one level-1 character).
 */
export function sizeEncounter(units: readonly EncounterUnit[], levels: readonly number[]): EncounterUnit[] {
  const budget = levels.length === 0 ? thresholdsOf(1).deadly : levels.reduce((sum, level) => sum + thresholdsOf(level).deadly, 0);
  const out: EncounterUnit[] = [];
  for (const unit of units) {
    const next = [...out, unit];
    if (out.length > 0 && adjustedXp(next.flat()) >= budget) break;
    out.push(unit);
  }
  return out;
}
