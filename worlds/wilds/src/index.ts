import type { WorldDefinition } from '@game/engine';
import { WildsSource } from './source.ts';

export { BUILDING_CELL, CANDLE, DOOR_PATH, generateHouse } from './houses.ts';
export { HOME_CELL, HOME_ID, generateHome, homeStart } from './home.ts';
export { Road, signpost } from './road.ts';
export { MAGIC_CHANCE, MAGIC_ITEMS, WildsSource } from './source.ts';
export { TOWN, TOWN_BUILDINGS, TOWN_CACHE, TOWN_GATE, TOWN_NAME, TOWN_NPCS, TOWN_STREET_FIXTURES, inTown } from './town.ts';
export { APOTHECARY, INNKEEPER, INSIGHT_GATE, PEDDLER, PERSUASION_GATE, REEVE, SMITH, SMITH_PRICES, WATCHMAN, smithPays } from './dialogs.ts';

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
  // What each item is, and what it is for here (the pack panel adds what a drink does).
  items: {
    'imp-horn': 'Torn from an imp. Corwin, the peddler of Thornwick, buys it, and the cauldron needs one for an antidote.',
    'brute-tusk': 'Torn from a brute. Corwin, the peddler of Thornwick, buys it, and the cauldron needs one for a strong draught.',
    candle: 'A stub of old wax. Corwin, the peddler of Thornwick, buys it.',
    ring: 'Silver, with a dark red stone. Corwin, the peddler of Thornwick, buys it.',
    cup: 'Old, dented pewter. Corwin, the peddler of Thornwick, buys it.',
    herbs: 'Bitter leaves from the woods. The cauldron of Thornwick brews them into draughts.',
    draught: 'Isolde, the apothecary of Thornwick, sells it. The cauldron makes it from two bundles of herbs.',
    antidote: 'Isolde, the apothecary of Thornwick, sells it. The cauldron makes it from herbs and an imp horn.',
    'strong-draught': 'Isolde, the apothecary of Thornwick, sells it. The cauldron makes it from two bundles of herbs and a brute tusk.',
    'leather-armour': 'Boiled leather, stiff and scarred. It turns a claw now and then.',
    'scale-mail': 'Scales of steel on leather, like the skin of a fish. It rattles at each step.',
    'chain-mail': 'Thousands of small steel rings. Heavy on the shoulders, and loud.',
    'splint-armour': 'Strips of steel on leather. It stops nearly every blow, and it is very heavy.',
    shield: 'Oak boards in an iron rim. Old dents on its face.',
    longsword: 'A long, straight blade. With both hands on the grip, it hits harder.',
    shortsword: 'A short, quick blade for close work.',
    rapier: 'A thin blade for the thrust, with a swept guard.',
    greataxe: 'A heavy head on a long haft. Slow to swing, terrible when it lands.',
    mace: 'A head of flanged iron on a short haft.',
    longbow: 'A tall bow of yew. The string sings.',
    'arcane-staff': 'A staff with a blue stone at its top. A mage casts through it.',
    'druid-staff': 'A crooked staff, still green at the top. A druid casts through it.',
    'luck-amulet': 'A charm of bone with a drop of amber. They say that it brings luck.',
    'studded-leather': 'Leather set with rivets of iron. Light, and a little harder to cut.',
    'plate-armour': 'Shaped plates of steel from head to foot. The best armour in the land, and the heaviest.',
    'longsword-plus-1': 'An old blade that never dulls. A faint blue light runs along its edge.',
    'cloak-of-protection': 'A grey cloak that is never wet. Blows slide off it.',
    'ring-of-protection': 'A plain band with a blue stone. The air round it is a little cold.',
    'bracers-of-defence': 'Two cuffs of dark leather and silver. They turn blows from bare arms.',
    'gauntlets-of-ogre-power': 'Heavy gloves of iron and hide. In them, your grip could crush a stone.',
    'headband-of-intellect': 'A thin band of silver with a clear gem. Thoughts come quick and sharp.',
    'amulet-of-health': 'A red stone on a chain. Its warmth goes into the blood.',
    'belt-of-dwarvenkind': 'A broad belt with a buckle of a bearded face. It makes you hardy.',
    'boots-of-elvenkind': 'Soft boots of grey leather. Your steps make no sound in them.',
    glaive: 'A heavy blade on a long pole. It keeps a claw at a distance.',
  },
  darkness: 1,
  multiplayer: true,
};
