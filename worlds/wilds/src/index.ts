import type { WorldDefinition } from '@game/engine';
import { WildsSource } from './source.ts';

export { BUILDING_CELL, CANDLE, DOOR_PATH, generateHouse } from './houses.ts';
export { HOME_CELL, HOME_ID, generateHome, homeStart } from './home.ts';
export { Road, signpost } from './road.ts';
export { WildsSource } from './source.ts';
export { TOWN, TOWN_BUILDINGS, TOWN_CACHE, TOWN_GATE, TOWN_NAME, TOWN_NPCS, TOWN_STREET_FIXTURES, inTown } from './town.ts';
export { APOTHECARY, INNKEEPER, INSIGHT_GATE, PEDDLER, PERSUASION_GATE, REEVE, WATCHMAN } from './dialogs.ts';

/** The seed of the wilds when the URL gives none. */
export const DEFAULT_SEED = 20261007;

/**
 * The wilds: an endless dark forest with lakes, paths and lonely stone houses, and the town of
 * Thornwick to the west of the home. Shared since 2026-10-10 (Fede's decision): every visitor is
 * in the same Wilds, and a new character starts in the home, the house of the cell (0, 0).
 */
export const wilds: WorldDefinition = {
  id: 'wilds',
  name: 'The Wilds',
  createSource: (seed) => new WildsSource(seed ?? DEFAULT_SEED),
  examine: {
    tree: "It's a tree",
    rock: "It's a rock",
    bookshelf: 'Old books. The ink has faded.',
    table: 'A candle still burns. Someone was here.',
    bed: 'A narrow bed. The blanket smells of smoke.',
    chest: 'A heavy chest with iron bands.',
    barrel: 'A barrel of sour wine.',
    crate: 'An old crate, nailed shut.',
    lamppost: 'A lamp. Someone keeps it lit.',
    fountain: 'Clear, cold water. A few coins shine at the bottom.',
    candelabra: 'Tall candles in an iron stand.',
    signpost: 'An old signpost.',
  },
  darkness: 1,
  multiplayer: true,
};
