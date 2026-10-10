import type { Gate } from '@game/engine';

/**
 * The gates of Intelligence that the page applies (Fede's choice, 2026-10-10): the health bar of a
 * mob (read the foe), the glint of its wind-up, and the usual gate of lore (a world gives its own
 * lore gates with Interaction.lore and DialogAnswer.gate; the Wilds use INT 13).
 */
export const READ_FOE_GATE: Gate = { ability: 'int', min: 13 };
export const READ_OPENING_GATE: Gate = { ability: 'int', min: 15 };
export const LORE_GATE: Gate = { ability: 'int', min: 13 };

/** The detail of the map by Intelligence: the houses and the road, the names and refuges, the barred houses and locked chests. */
export const MAP_HOUSES = 11;
export const MAP_NAMES = 13;
export const MAP_SECRETS = 15;
