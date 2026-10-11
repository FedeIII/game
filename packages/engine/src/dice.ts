/**
 * Dice, as in 5e (docs/drafts/level-3.md): a blow, a mob's hit and a draught roll their dice. The
 * rolls come from a dice source: random numbers (the server's in a shared world, the page's in a
 * world that it runs), or the average of the dice, for tests (then every attack hits).
 */

/** `count` dice of `sides` sides, plus `plus` (1d8+3: { count: 1, sides: 8, plus: 3 }). */
export interface Dice {
  readonly count: number;
  readonly sides: number;
  readonly plus: number;
}

/** Where the dice come from: random numbers from 0 to 1, or the average of the dice (tests). */
export type DiceSource = { readonly kind: 'roll'; readonly random: () => number } | { readonly kind: 'average' };

/** The source that gives the average of the dice, and lets every attack hit (tests). */
export const AVERAGE_DICE: DiceSource = { kind: 'average' };

/** A source of rolls from random numbers from 0 to 1 (Math.random, a seeded generator). */
export function rollingDice(random: () => number): DiceSource {
  return { kind: 'roll', random };
}

/** `count` dice of `sides`, with `plus`. */
export function dice(count: number, sides: number, plus = 0): Dice {
  return { count, sides, plus };
}

/** The dice with more added: a modifier, a magic bonus. */
export function plusDice(d: Dice, plus: number): Dice {
  return { count: d.count, sides: d.sides, plus: d.plus + plus };
}

/** The dice as a player reads them: "1d8+3", "2d6", "1d4-1", "4". */
export function formatDice(d: Dice): string {
  const roll = d.count > 0 && d.sides > 0 ? `${d.count}d${d.sides}` : '';
  if (!roll) return String(d.plus);
  return d.plus === 0 ? roll : `${roll}${d.plus > 0 ? '+' : ''}${d.plus}`;
}

/** The average of the dice, rounded down (5e: the fixed damage of a stat block). */
export function averageDice(d: Dice): number {
  return Math.floor((d.count * (d.sides + 1)) / 2) + d.plus;
}

/** One die of `sides` sides: 1 to `sides`. */
function die(sides: number, source: DiceSource): number {
  if (source.kind === 'average') return (sides + 1) / 2;
  return 1 + Math.min(sides - 1, Math.floor(source.random() * sides));
}

/** Rolls the dice; a critical hit rolls the dice twice (5e). Never less than 0. */
export function rollDice(d: Dice, source: DiceSource, crit = false): number {
  if (source.kind === 'average') return Math.max(0, averageDice({ ...d, count: crit ? 2 * d.count : d.count }));
  let sum = d.plus;
  for (let i = 0; i < d.count * (crit ? 2 : 1); i++) sum += die(d.sides, source);
  return Math.max(0, sum);
}

/** The result of an attack roll: whether it hits, and whether it is a critical hit (a natural 20). */
export interface AttackRoll {
  readonly hit: boolean;
  readonly crit: boolean;
  /** The d20 (0 for the average source). */
  readonly natural: number;
}

/**
 * An attack roll (5e): d20 + `toHit` against `ac`. A natural 20 always hits, as a critical hit; a
 * natural 1 always misses. The average source always hits, without a critical hit.
 */
export function attackRoll(toHit: number, ac: number, source: DiceSource): AttackRoll {
  if (source.kind === 'average') return { hit: true, crit: false, natural: 0 };
  const natural = die(20, source);
  if (natural === 20) return { hit: true, crit: true, natural };
  if (natural === 1) return { hit: false, crit: false, natural };
  return { hit: natural + toHit >= ac, crit: false, natural };
}
