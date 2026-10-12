import { MOB_STATS, type MobKind } from './mobs.ts';

/**
 * The encounters of the story, sized to the players there (docs/drafts/level-3.md, Fede's decision
 * of 2026-10-11). A chapter of Kandrax makes an encounter for a party of about six level-3
 * characters. The game keeps its monsters in order, as units (a worg with its goblin; then the
 * hobgoblin; ...), and takes the units in that order while the encounter stays under the 5e "deadly"
 * budget of the characters that are there, at least the first unit. With six characters the
 * encounter is the chapter's whole.
 */

/** The XP thresholds of one level-3 character (5e, Dungeon Master's Guide). */
export const XP_THRESHOLDS = { easy: 75, medium: 150, hard: 225, deadly: 400 } as const;

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
  const fighters = kinds.filter((kind) => MOB_STATS[kind].xp > 0);
  return fighters.reduce((sum, kind) => sum + MOB_STATS[kind].xp, 0) * xpMultiplier(fighters.length);
}

/** A unit of an encounter: monsters that come together (a worg and its goblin). */
export type EncounterUnit = readonly MobKind[];

/**
 * The units of an encounter for `players` level-3 characters: the longest beginning of `units` whose
 * adjusted XP stays under the deadly budget of the party (at least the first unit, for at least one
 * character).
 */
export function sizeEncounter(units: readonly EncounterUnit[], players: number): EncounterUnit[] {
  const budget = XP_THRESHOLDS.deadly * Math.max(1, players);
  const out: EncounterUnit[] = [];
  for (const unit of units) {
    const next = [...out, unit];
    if (out.length > 0 && adjustedXp(next.flat()) >= budget) break;
    out.push(unit);
  }
  return out;
}
