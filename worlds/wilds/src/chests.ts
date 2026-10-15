import type { Ability, Gate, LootTable } from '@game/engine';

/**
 * What the chests of the houses of the wilds hold, and the checks that guard some of them: the lock
 * of a chest (DEX) and the boards across the door of a barred house (STR).
 *
 * The DC of a guard follows what the chest holds (Fede, 2026-10-15; docs/features/abilities/checks.md):
 * at the start of the game, from DC 10 (a coin at most, and one small thing) to DC 13 (the most coins
 * of the start, and two things). A chest with an important item would be DC 16, and a chest of a bank
 * with a magic item DC 20: not in the Wilds now.
 */

/** The small things of a chest: one small thing in each chest (Fede's choice, 2026-10-10). */
export const TRINKETS = [
  ['candle', 3],
  ['ring', 1],
  ['cup', 2],
  ['herbs', 3],
] as const;

/**
 * The magic items of the SRD (gear.ts), by weight: rare loot in the richest guarded chests (CHEST_GRADES)
 * and in the buried cache of Ironhold (1 in 6). The common ones come more often.
 */
export const MAGIC_ITEMS = [
  ['longsword-plus-1', 3],
  ['cloak-of-protection', 3],
  ['boots-of-elvenkind', 3],
  ['ring-of-protection', 2],
  ['bracers-of-defence', 2],
  ['gauntlets-of-ogre-power', 2],
  ['headband-of-intellect', 2],
  ['belt-of-dwarvenkind', 2],
  ['amulet-of-health', 1],
] as const;
/** The chance of a magic item in the buried cache of Ironhold (the guarded chests: CHEST_GRADES). */
export const MAGIC_CHANCE = { cache: 1 / 6 } as const;

/**
 * A chest without a guard: one small thing, and a coin or two in one chest of three (coins are scarce,
 * Fede, 2026-10-13: docs/game-design.md, "Coins").
 */
export const CHEST_LOOT: LootTable = { coins: [1, 2], coinChance: 1 / 3, items: [{ chance: 1, pick: TRINKETS }] };

/**
 * A grade of a guarded chest: the DC of its guard, what it holds, and how often a lock (`lock`) and
 * the boards of a barred house (`boards`) guard a chest of this grade (weights).
 */
export interface ChestGrade {
  readonly dc: number;
  readonly loot: LootTable;
  readonly lock: number;
  readonly boards: number;
}

/**
 * The guarded chests of the start of the game, from the poorest to the richest. A higher DC guards
 * more (a test checks it). A lock is more often on a poor chest; the boards of a barred house more
 * often keep a rich one (a family boarded its house with its goods inside).
 */
export const CHEST_GRADES: readonly ChestGrade[] = [
  // A coin in two chests of three, and one small thing.
  { dc: 10, loot: { coins: [1, 1], coinChance: 2 / 3, items: [{ chance: 1, pick: TRINKETS }] }, lock: 3, boards: 1 },
  // 1 or 2 coins in one chest of two, one small thing, and a second one in one chest of three.
  {
    dc: 11,
    loot: { coins: [1, 2], coinChance: 1 / 2, items: [{ chance: 1, pick: TRINKETS }, { chance: 1 / 3, pick: TRINKETS }] },
    lock: 3,
    boards: 2,
  },
  // 1 to 3 coins in one chest of two, a second thing in one of two, a magic item in one of 8.
  {
    dc: 12,
    loot: {
      coins: [1, 3],
      coinChance: 1 / 2,
      items: [
        { chance: 1, pick: TRINKETS },
        { chance: 1 / 2, pick: TRINKETS },
        { chance: 1 / 8, pick: MAGIC_ITEMS },
      ],
    },
    lock: 2,
    boards: 3,
  },
  // The most coins of the start (2 to 4, in two chests of three), two things, a magic item in one of 4.
  {
    dc: 13,
    loot: {
      coins: [2, 4],
      coinChance: 2 / 3,
      items: [
        { chance: 1, pick: TRINKETS },
        { chance: 1, pick: TRINKETS },
        { chance: 1 / 4, pick: MAGIC_ITEMS },
      ],
    },
    lock: 1,
    boards: 3,
  },
];

/** The grade of a guarded chest for a number from 0 to 1 (from the seed), by the weights of its guard. */
export function chestGrade(guard: 'lock' | 'boards', r: number): ChestGrade {
  const total = CHEST_GRADES.reduce((sum, g) => sum + g[guard], 0);
  let x = r * total;
  for (const grade of CHEST_GRADES) {
    x -= grade[guard];
    if (x < 0) return grade;
  }
  return CHEST_GRADES[CHEST_GRADES.length - 1]!;
}

/** The check of a guard of a chest of this grade: a lock is DEX, the boards of a barred door STR. */
export function guardGate(guard: 'lock' | 'boards', grade: ChestGrade): Gate {
  const ability: Ability = guard === 'lock' ? 'dex' : 'str';
  return { ability, dc: grade.dc };
}

/** What a chest holds behind a guard of this DC: the loot of its grade (the poorest for an unknown DC). */
export function guardedLoot(dc: number): LootTable {
  return (CHEST_GRADES.find((g) => g.dc === dc) ?? CHEST_GRADES[0]!).loot;
}
