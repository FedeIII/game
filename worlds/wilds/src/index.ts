import type { WorldDefinition } from '@game/engine';
import { WildsSource } from './source.ts';
import { QUESTS } from './quests.ts';
import { TEXTS_ES } from './text-es.ts';

export { BUILDING_CELL, CANDLE, DOOR_PATH, generateHouse } from './houses.ts';
export { HOME_CELL, HOME_ID, generateHome, homeStart } from './home.ts';
export { BAND_AREA, BAND_SPAN, CAMP_OFFSET, CAMP_SHARE, GROVE_SPAN, Grove, NORTH_ROAD_START, Road, RoadStretch, SILVERSPRING_SITE, campSite, campTrail, cartSpot, homeRoad, northRoad, signpost } from './road.ts';
export { CAMP, CAMP_GATE, CAMP_STAKE } from './camp.ts';
export { HALE, MARROW, RUINS, RUIN_NPCS, TANNER, brandTile } from './ruins.ts';
export { River, SILVERVEIN } from './river.ts';
export { CARAVAN_MEET, CART_SAFE, MAGIC_CHANCE, MAGIC_ITEMS, WildsSource } from './source.ts';
export { TEXTS_ES } from './text-es.ts';
export { ARGUMENT, IRONHOLD, PLOT, TOWN, TOWN_BUILDINGS, TOWN_CACHE, TOWN_GATE, TOWN_NAME, TOWN_NPCS, TOWN_SCENES, TOWN_STREET_FIXTURES, inTown } from './town.ts';
export { SILVERSPRING, SILVERSPRING_NAME, SILVERSPRING_NPCS } from './silverspring.ts';
export { SEEKER_CAMP_SITE, SEEKER_TRAIL, WREN, WREN_GATE, WREN_NPCS } from './wren.ts';
export { SEEKER_CAMP, SEEKER_STAKE } from './seekers.ts';
export { ALTAR_TILE, SHRINE_FIXTURES, SHRINE_RECT } from './shrine.ts';
export { Plot, Town, type TownPlan } from './towns.ts';
export {
  APOTHECARY,
  ATHLETICS_GATE,
  HOST,
  INNKEEPER,
  INSIGHT_GATE,
  JEWELLER,
  KASMUT,
  KEEN_GATE,
  MERCHANT,
  MILITIA,
  MIRA,
  MITHRIL_COST,
  MITHRIL_PRICE,
  PEDDLER,
  PERSUASION_GATE,
  PRIEST,
  REEVE,
  SELA,
  SMITH,
  SMITH_PRICES,
  SOLDIER,
  SURVIVOR_HALE,
  SURVIVOR_TANNER,
  WAGON_DRIVER,
  WATCHMAN,
  smithPays,
} from './dialogs.ts';
export {
  ASHES,
  ASHES_RELIC,
  TEAR_TAKEN,
  CAMP_TAKEN,
  SELA_FREE,
  STONE_BACK,
  ASHES_HELD,
  ASHES_LATE,
  ASHES_NEXT,
  ASHES_SYMBOL,
  CARAVAN,
  CARAVAN_FINE,
  CARAVAN_FINE_COINS,
  CARAVAN_HEARD,
  CARAVAN_LOST,
  CARAVAN_REWARD,
  CARAVAN_ROB,
  CARAVAN_ROBBED,
  CARAVAN_SAVED,
  CART,
  CART_HELP,
  CART_LEVER,
  CART_LIFT,
  CART_MEND,
  CART_REWARD,
  HIMO_FREE,
  HIMO_HOME,
  HIMO_LOST,
  HIMO_REWARD,
  MIRA_STONE,
  MIRA_STONE_AFTER,
  QUESTS,
  RAID,
  RAID_ARRIVED,
  RAID_ASKED,
  RAID_BAND,
  RAID_DEFENDED,
  RAID_HEARD,
  RAID_SCOUTS,
  RAID_TITLE,
  RAID_TITLE_PERMIT,
  READ_LETTER,
  RUIN_HALE,
  RUIN_MARROW,
  RUIN_TANNER,
  TELL_REEVE,
  WREN_REWARD,
} from './quests.ts';

/** The seed of the wilds when the URL gives none. */
export const DEFAULT_SEED = 20261007;

/**
 * The wilds: an endless dark forest with lakes, paths and lonely stone houses, the town of
 * Ironhold (Ferrozar in Spanish) to the west of the home, and Silverspring at the end of the north road. Shared since 2026-10-10 (Fede's decision): every visitor is
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
    cart: "A merchant's cart, loaded with crates and a sack.",
    stake: 'A thick post, driven deep into the ground.',
    campfire: 'A fire in a ring of stones.',
    brand: 'A charred plank.',
    standard: 'A standard of grey cloth with a red phoenix.',
    menhir: 'A standing stone, carved with waves.',
    altar: 'An old altar of stone.',
  },
  // What each item is, and what it is for here (the pack panel adds what a drink does).
  items: {
    'imp-horn': 'Torn from an imp. Corwin, the peddler of Ironhold, buys it, and the cauldron needs one for an antidote.',
    'brute-tusk': 'Torn from a brute. Corwin, the peddler of Ironhold, buys it, and the cauldron needs one for a strong draught.',
    candle: 'A stub of old wax. Corwin, the peddler of Ironhold, buys it.',
    ring: 'Silver, with a dark red stone. Corwin, the peddler of Ironhold, buys it.',
    cup: 'Old, dented pewter. Corwin, the peddler of Ironhold, buys it.',
    herbs: 'Bitter leaves from the woods. The cauldron of Ironhold brews them into draughts.',
    draught: 'Isolde, the apothecary of Ironhold, sells it. The cauldron makes it from two bundles of herbs.',
    antidote: 'Isolde, the apothecary of Ironhold, sells it. The cauldron makes it from herbs and an imp horn.',
    'strong-draught': 'Isolde, the apothecary of Ironhold, sells it. The cauldron makes it from two bundles of herbs and a brute tusk.',
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
    crowbar: "A bar of dark iron from the smith of Ironhold. The merchant on the road needs it for the cart.",
    'badger-fur': 'A thick grey fur from the packs of the hobgoblin scouts. Corwin, the peddler of Ironhold, buys it.',
    mithril: 'A nugget of mithril from the Silvervein, the river of Silverspring, light as a feather. The smith of Ironhold buys it.',
    'mithril-permit': 'The permit of Silverspring, sealed by Kasmut Parnika: the jeweller of Silverspring sells mithril at cost to its holder.',
    'wave-stone': 'A flat stone from the pool of the Silvervein, carved with three waves. In the dark, the grooves hold a cold blue light.',
    'tear-of-tigris': 'The relic of the shrine of Tigris: a drop of clear crystal in silver, always cool. Its wearer walks in deep water as in shallows.',
    'warden-orders': 'Orders in a neat hand, sealed in grey: "Each cell keeps to itself. Verath speaks to each in dreams. Take the Tear back at any cost. The towns of the plain are next: bigger ones, older relics."',
  },
  // The story (quests.ts): the letter of Thrain Steelforge, the merchant's cart.
  quests: QUESTS,
  // The texts in Spanish, with the Spanish names of Kandrax (Fede's decision, 2026-10-11).
  texts: { es: TEXTS_ES },
  darkness: 1,
  multiplayer: true,
};
