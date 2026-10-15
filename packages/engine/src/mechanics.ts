/**
 * The mechanics of combat of the melee draft (docs/drafts/combat-melee.md: its proposals), each one a
 * switch that is off by default. Only the sandbox of an admin turns them on now (the page's
 * sandbox.ts; Fede, 2026-10-15: "I test them myself"): the Room never does, so a shared world plays as
 * before, and the wire does not change. Fede tests each one alone or with others, and keeps or drops
 * it. A mechanic that stays becomes a rule of the game, without its switch.
 *
 * The player's side of a mechanic reads the switches from its StepTraits (player.ts, stepPlayer); the
 * mobs' side from Horde.mechanics.
 */

/** The mechanics, in the order of the proposals of the draft. */
export const MECHANICS = [] as const;

export type Mechanic = (typeof MECHANICS)[number];

/** The mechanics that are on. */
export type Mechanics = ReadonlySet<Mechanic>;

/** No mechanic on: the game as it is. */
export const NO_MECHANICS: Mechanics = new Set();
