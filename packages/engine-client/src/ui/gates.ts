import type { Gate } from '@game/engine';

/**
 * The gates that the page applies, each with its own DC (docs/features/abilities/checks.md). A world
 * gives the gates of its content itself (Interaction.lore, DialogAnswer.gate, Fixture.lock,
 * Building.barred), each with its DC.
 *
 * Intelligence (Fede's choice, 2026-10-10): the health bar of a mob (read the foe: a lasting help in a
 * fight) and the glint of its wind-up (harder: the moment of an opening).
 */
export const READ_FOE_GATE: Gate = { ability: 'int', dc: 13 };
export const READ_OPENING_GATE: Gate = { ability: 'int', dc: 15 };

/** The detail of the map by Intelligence: the houses and the road, the names and refuges, the barred houses and locked chests. */
export const MAP_HOUSES = 11;
export const MAP_NAMES = 13;
export const MAP_SECRETS = 15;

/** Wisdom: the arrow to the home (an easy action, +2 because it helps at all times). */
export const HOMEWARD_GATE: Gate = { ability: 'wis', dc: 12 };

/** Charisma: the greeting by name (an easy action, +2: people must know the character a little). */
export const REPUTATION_GATE: Gate = { ability: 'cha', dc: 12 };
