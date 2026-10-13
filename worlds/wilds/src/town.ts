import { Ground, type Building, type Fixture, type NpcDef, type SceneDef } from '@game/engine';
import { APOTHECARY, CAULDRON, INNKEEPER, INSIGHT_GATE, KEEN_GATE, LORE_GATE, PEDDLER, PRIEST, REEVE, SMITH, SOLDIER, WATCHMAN } from './dialogs.ts';
import { CARAVAN_HEARD, RAID_HEARD, ROAD_ARRIVED } from './quests.ts';
import { LAMP, Town, nameSign, type Plan, type Tile } from './towns.ts';
import { DREAM_BED } from './dream.ts';

/**
 * Ironhold: the town north of the hut, past Whitegrove and Bronzehold (docs/story/world.md). The road
 * from the hut (road.ts) comes in at its south edge (TOWN_SOUTH), and a signpost by the hut points
 * the way.
 *
 * The plan of the town, one character per tile, north at the top (towns.ts); its north-west tile
 * is (TOWN.x0, TOWN.y0). The main street runs from east to west; at its east end is the gate
 * (TOWN_GATE), where a road goes north along the town to the north road. Four buildings face the street from the north, with a small square and a
 * fountain between them; five more stand back to back with the street and face the lane in the
 * south, by the lake. Alleys between them join the street and the lane. Five buildings open (the
 * inn, the smithy, the chapel, the apothecary and the reeve's house) and four are shut for good.
 * In front of each door the ground stays clear: no lamp, prop or tree in the 5 x 3 tiles below it
 * (a test checks it).
 *
 *   .  garden    T  a tree    =  cobblestones    :  the dirt lane    1-9  BUILDINGS[n - 1]
 *   F  the fountain (3 x 3)    N  the notice board (2 x 1)    L  a lamp post    b  a barrel    x  a crate
 */
const MAP = [
  '.T.......T.......T...................T.....T.',
  '.............................................',
  '..1111111111...............3333333...........',
  '..1111111111...........T...3333333...........',
  '..1111111111.2222222.......3333333.444444..T.',
  '..1111111111.2222222=======3333333.444444....',
  '..1111111111.2222222NNFFF==3333333.444444....',
  '..1111111111.2222222==FFF==3333333.444444.T..',
  '..1111111111.2222222==FFF==3333333.444444....',
  '..1111111111.2222222=======3333333.444444....',
  'xL========L========bL=====L======L======xL===',
  '=============================================',
  '=============================================',
  'b====L=================L=========L=======L===',
  '==5555555==========777777777==8888888========',
  '==5555555==666666==777777777==8888888==99999=',
  '==5555555==666666==777777777==8888888==99999=',
  '==5555555==666666==777777777==8888888==99999=',
  '==5555555==666666==777777777==8888888==99999=',
  '==5555555==666666==777777777==8888888==99999=',
  ':::::::::::::::::::::::::::::::::::::::::::::',
  'b::::::::L::::::::L:::::::::L::::::::L::::::x',
  'T........T..................T...............T',
];

export const TOWN_NAME = 'Ironhold';

/** The rectangle of the town, in tiles (inclusive). */

/** The buildings, in the order of their digits in MAP. */
const BUILDINGS: readonly Plan[] = [
  {
    id: 'inn',
    sign: 'The Crooked Lantern',
    style: { walls: 'timber', roof: 'shingle' },
    floor: Ground.Floor,
    roofProps: [
      { name: 'chimney', column: 2 },
      { name: 'vane', column: 7 },
    ],
    plan: [
      '##########',
      '#bbx.aaca#',
      '#.S......#',
      '#.tt..ttB#',
      '#.V.....B#',
      '#K..M..gg#',
      '#........#',
      '#+##D##+##',
    ],
    things: {
      b: { kind: 'barrel', pages: ['Ale. It smells better than it tastes.'] },
      x: { kind: 'crate', pages: ['Turnips, and one very old onion.'] },
      a: { kind: 'apothecary', pages: ['Bottles of cider, of ale, and of something green.'] },
      c: { kind: 'candelabra' },
      t: { kind: 'table', pages: ['A sticky table. Someone has cut a crow into it.'] },
      g: { kind: 'boardtable', pages: ['A game of dice, left half played.'] },
      B: { kind: 'bed', pages: ['A narrow bed by the east wall. It is not mine.'], restFor: 'inn', variant: DREAM_BED },
    },
    people: {
      K: {
        id: 'innkeeper',
        look: 'innkeeper',
        doorstep: true,
        dialog: INNKEEPER,
        barks: ['Another round?', 'Wipe your boots. The woods come in on them.', 'The fire is free. The ale is not.'],
        greeting: '{name}! Sit, sit. The fire is warm.',
      },
      M: {
        id: 'minstrel',
        look: 'bard',
        pages: [
          'A song for a traveller? I only know sad ones.',
          'This one is about a miller who walked into the woods and came back wrong.',
          '...Perhaps another night.',
        ],
        barks: ['La la... no. Again.', "Who has a rhyme for 'imp'?", 'One more song, then bed.'],
        greeting: 'Ah, {name}! I will put you in a song.',
      },
      // A soldier of the Sovereignty and a villager at a table: they plot against the caravan of Silverspring (the scene PLOT).
      S: {
        id: 'inn-soldier',
        look: 'soldier',
        pages: ['Drink your ale, and mind your own business.', 'The Sovereignty pays for my ale. It pays well.'],
        barks: ['Another round.', 'Quiet, you.', 'Not here. Later.'],
        greeting: '{name}. Keep walking.',
      },
      V: {
        id: 'drinker',
        look: 'farmer',
        pages: ['I only came in for an ale.', 'Nobody saw me here. Understand?'],
        barks: ['Hm.', 'Another one, Marta.', 'Who is asking?'],
        greeting: 'Evening, {name}. ...Did you hear something?',
      },
    },
  },
  {
    id: 'smithy',
    sign: 'Smithy',
    style: { walls: 'stone', roof: 'slate' },
    floor: Ground.FloorStone,
    roofProps: [{ name: 'chimney', column: 1 }],
    plan: [
      '#######',
      '#ff.ab#',
      '#.....#',
      '#..K.x#',
      '#.....#',
      '#+#D#+#',
    ],
    things: {
      f: { kind: 'forge', pages: ['The forge is hot. The coals breathe.'] },
      a: { kind: 'anvil', pages: ['Dents on dents. The smith hits hard.'] },
      b: { kind: 'barrel', pages: ['Water for the hot iron.'] },
      x: { kind: 'crate', pages: ['Nails, horseshoes and broken blades.'] },
    },
    people: {
      K: {
        id: 'smith',
        look: 'smith',
        doorstep: true,
        // He sells armour, a shield and weapons, and buys them back (dialogs.ts).
        dialog: SMITH,
        barks: ['Hot iron waits for nobody.', 'More blades. Always more blades.', 'Where are my tongs?'],
        greeting: '{name}. Good to see you whole.',
      },
    },
  },
  {
    id: 'chapel',
    emblem: 'chalice',
    style: { walls: 'gothic', roof: 'slate' },
    floor: Ground.FloorStone,
    roofProps: [{ name: 'spire', column: 3 }],
    plan: [
      '#######',
      '#c.l.c#',
      '#.....#',
      '#.rr..#',
      '#.rr..#',
      '#...K.#',
      '#.....#',
      '#+#D#+#',
    ],
    things: {
      c: { kind: 'candelabra', pages: ['The candles never go out. Someone sees to that.'] },
      l: {
        kind: 'lectern',
        pages: ['An old book of prayers, open at the prayer for travellers.'],
        lore: [{ gate: LORE_GATE, pages: ['In the margin, in small letters: "Who sleeps once under this roof wakes under it." The chapel keeps the lost.'] }],
      },
      r: { kind: 'rug' },
    },
    people: {
      K: {
        id: 'priest',
        look: 'priest',
        doorstep: true,
        // The old books of the chapel know the phoenix of the burned homesteads (dialogs.ts).
        dialog: PRIEST,
        barks: ['Peace on this house.', 'The light holds.', 'Pray, and keep to the road.'],
        greeting: 'Peace, {name}.',
      },
    },
  },
  {
    id: 'chandler',
    sign: 'Chandler',
    style: { walls: 'planks', roof: 'shingle' },
    floor: Ground.Floor,
    plan: [
      '######',
      '#xx..#',
      '#....#',
      '#....#',
      '#....#',
      '##D###',
    ],
    things: { x: { kind: 'crate' } },
    locked: 'Boarded up. A note on the door says: CLOSED. GONE SOUTH.',
  },
  {
    id: 'apothecary',
    sign: 'Apothecary',
    style: { walls: 'planks', roof: 'thatch' },
    floor: Ground.FloorEarth,
    roofProps: [{ name: 'chimney', column: 5 }],
    plan: [
      '#######',
      '#aa.uw#',
      '#.....#',
      '#.K.s.#',
      '#.....#',
      '#+#D#+#',
    ],
    things: {
      a: {
        kind: 'apothecary',
        pages: ['Jars of roots, of powders, and of dried things with legs.'],
        lore: [{ gate: LORE_GATE, pages: ['Labels in an old hand: "Two bundles of herbs, boiled, close a wound." "With the horn of an imp, they draw out its poison."'] }],
      },
      u: { kind: 'cauldron', dialog: CAULDRON },
      w: { kind: 'crystalball', pages: ['Cloudy glass. You see only your own face.'] },
      s: { kind: 'scales', pages: ['Small brass scales, for very small doses.'] },
    },
    people: {
      K: {
        id: 'apothecary',
        look: 'healer',
        doorstep: true,
        dialog: APOTHECARY,
        barks: ['Salt, salt and more salt.', 'Who took my ashroot?', 'Do not touch the green jar.'],
        greeting: '{name}. Still in one piece, I see.',
      },
    },
  },
  {
    id: 'cottage',
    style: { walls: 'rubble', roof: 'thatch' },
    floor: Ground.FloorEarth,
    plan: [
      '######',
      '#....#',
      '#....#',
      '#....#',
      '###D##',
    ],
    locked: 'Locked. Nobody answers.',
  },
  {
    id: 'reeve',
    sign: 'Reeve',
    style: { walls: 'brick', roof: 'clay' },
    floor: Ground.Floor,
    roofProps: [{ name: 'flag-wine', column: 4 }],
    plan: [
      '#########',
      '#bb.mm.k#',
      '#.....F.#',
      '#.dd..K.#',
      '#.S.....#',
      '#+#+D+#+#',
    ],
    things: {
      b: {
        kind: 'bookshelf',
        pages: ['Ledgers of taxes, of births and of deaths. More deaths, lately.'],
        lore: [{ gate: LORE_GATE, pages: ['The numbers do not add up. The granary took in grain all summer, and no cart took any out.'] }],
      },
      m: {
        kind: 'maptable',
        pages: ['A map of the valley. The woods round the town are inked black.'],
        lore: [{ gate: LORE_GATE, pages: ['Small marks in the black: an X by each house in the woods that its family boarded up.'] }],
      },
      k: { kind: 'coinchest', pages: ["The town's strongbox. Locked, and nearly empty."] },
      d: { kind: 'desk', pages: ['Letters to the families who left. None of them is sent.'] },
    },
    people: {
      K: {
        id: 'reeve',
        look: 'treasurer',
        dialog: REEVE,
        barks: ['Taxes, taxes...', 'Another letter with no answer.', 'The gate, the lamps. Always the lamps.'],
        greeting: 'Good evening, {name}.',
      },
      // A villager who came for news of the hills, and a soldier of the Sovereignty (the scene ARGUMENT).
      F: {
        id: 'farmer',
        look: 'farmer',
        pages: ['My brother farms by the hills. I have not heard from him for a week.', 'The reeve says to wait. I am tired of waiting.'],
        barks: ['Hobgoblins. In our hills.', 'Somebody must do something.', 'Wait, wait, always wait.'],
        greeting: '{name}! Any news from the hills?',
      },
      S: {
        id: 'soldier',
        look: 'soldier',
        dialog: SOLDIER,
        barks: ['Move along.', 'The Sovereignty keeps this town safe.', 'Hills, hills. Always the hills.'],
        greeting: '{name}. Keep out of trouble.',
      },
    },
  },
  {
    id: 'granary',
    sign: 'Granary',
    style: { walls: 'timber', roof: 'thatch' },
    floor: Ground.FloorEarth,
    plan: [
      '#######',
      '#.....#',
      '#.....#',
      '#.....#',
      '#.....#',
      '###D###',
    ],
    locked: 'The doors are barred from the inside.',
  },
  {
    id: 'house',
    style: { walls: 'stone', roof: 'slate' },
    floor: Ground.Floor,
    roofProps: [{ name: 'chimney', column: 1 }],
    plan: [
      '#####',
      '#...#',
      '#...#',
      '#...#',
      '##D##',
    ],
    locked: 'Locked. Through a crack you see an empty room, and thick dust.',
  },
];


/** The things of the streets by their character in MAP: a template, without its place. */
const STREET_THINGS: Readonly<Record<string, Fixture>> = {
  F: { kind: 'fountain', tx: 0, ty: 0 },
  N: {
    kind: 'noticeboard',
    tx: 0,
    ty: 0,
    content: {
      pages: ['NOTICE. The gate shuts at dusk. Keep to the lamps. By order of the Reeve.', 'Under it, in another hand: LOST, one grey goat. Answers to nothing.'],
      lore: [{ gate: LORE_GATE, pages: ['A third notice, half torn off: the names of the families who boarded up their houses in the woods. "Goods left inside at the owner\'s risk."'] }],
    },
  },
  L: { kind: 'lamppost', tx: 0, ty: 0, light: LAMP },
  b: { kind: 'barrel', tx: 0, ty: 0 },
  x: { kind: 'crate', tx: 0, ty: 0 },
};


/** Ironhold, built from its plan (towns.ts). It is the big town of the tutorial: its name shows over the screen when a player comes in. */
export const IRONHOLD = new Town({ name: TOWN_NAME, x0: -52, y0: -8, map: MAP, buildings: BUILDINGS, things: STREET_THINGS, title: true });

/** The rectangle of the town, in tiles (inclusive). */
export const TOWN = { x0: IRONHOLD.x0, y0: IRONHOLD.y0, x1: IRONHOLD.x1, y1: IRONHOLD.y1 } as const;

/** The east gate: the tile just east of the town, in the middle of the main street. The north road starts from it (road.ts). */
export const TOWN_GATE = { tx: TOWN.x1 + 1, ty: TOWN.y0 + 11 } as const;
/**
 * Where the road from the hut comes in (Fede, 2026-10-12 and 2026-10-13: the hut is south of
 * Ironhold): the tile just south of the town, below an open garden tile of its south edge, and the
 * lane behind the houses of the south side above that.
 */
export const TOWN_SOUTH = { tx: TOWN.x0 + 20, ty: TOWN.y1 + 1 } as const;

/**
 * The name sign of Ironhold (nameSign(), towns.ts), in the style of the Iron Sovereignty: by the road
 * from the hut, west of it, as the signs of the hamlets, but two rows south of the town (not one), so
 * that its plate does not hang over the lane, where Brann walks.
 */
export const TOWN_NAME_SIGN: Fixture = nameSign(IRONHOLD, 'iron', TOWN_SOUTH.tx - 5, TOWN_SOUTH.ty + 1, [
  'It reads: IRONHOLD. Over the name, the anvil of the Iron Sovereignty.',
]);

export const TOWN_BUILDINGS: readonly Building[] = IRONHOLD.buildings;

/** The fountain, the notice board, the lamps and the props of the streets. */
export const TOWN_STREET_FIXTURES: readonly Fixture[] = IRONHOLD.streetFixtures;

/** The floor of a building of the town. */
export function townFloor(building: Building): Ground {
  return IRONHOLD.floor(building);
}

/** Whether a tile is in the town's rectangle. */
export function inTown(tx: number, ty: number): boolean {
  return IRONHOLD.has(tx, ty);
}

/**
 * The savings of the old couple of the cottage, buried in the garden across the lane from their
 * door, a few steps to the west (the reeve tells of it, with Wisdom 13: dialogs.ts). It is hidden
 * (Fixture.hidden): a character sees it only close by.
 */
export const TOWN_CACHE: Fixture = { kind: 'cache', tx: TOWN.x0 + 10, ty: TOWN.y0 + 22, hidden: true };

// ---------------------------------------------------------------- people in the streets

const at = (c: number, r: number): Tile => IRONHOLD.at(c, r);
const streetArea = (c0: number, r0: number, c1: number, r1: number): Tile[] => IRONHOLD.streetArea(c0, r0, c1, r1);

const WALKERS: readonly NpcDef[] = [
  {
    // Brann watches the south entry, where the road from the hut comes in (TOWN_SOUTH; Fede, 2026-10-13).
    id: 'watchman',
    look: 'watchman',
    home: at(20, 21),
    area: streetArea(16, 20, 24, 21),
    content: { speaker: 'fixture', dialog: WATCHMAN },
    barks: ['Nothing comes up this road unseen.', 'Keep to the lamps.', 'A quiet night. Too quiet.'],
    greeting: 'Evening, {name}. Keep to the lamps.',
  },
  {
    id: 'peddler',
    look: 'dungeonmaster',
    home: at(15, 12),
    area: streetArea(2, 11, 37, 12),
    content: { speaker: 'fixture', dialog: PEDDLER },
    barks: ['Pots and pins!', 'Fine pins, nearly new!', 'Who needs a pot? Anybody?'],
    greeting: '{name}! My best customer!',
  },
  {
    id: 'widow',
    look: 'archivist',
    home: at(25, 8),
    area: streetArea(20, 5, 26, 9),
    content: {
      speaker: 'fixture',
      pages: ['The fountain was dry for three summers.', 'Then one night it filled again. Nobody knows why.', 'I come here to listen to it. It sounds like rain.'],
    },
    barks: ['Listen... like rain.', 'Three summers dry.', 'My husband built that wall.'],
    greeting: 'Hello, {name}. Listen... like rain.',
  },
  {
    id: 'child',
    look: 'child',
    home: at(12, 20),
    area: [...streetArea(0, 20, 44, 21), ...streetArea(17, 14, 18, 19)],
    content: {
      speaker: 'fixture',
      pages: ['Are you an adventurer? Have you seen the imps?', 'Mother says they cannot come past the lamps.', 'I am not scared. Much.'],
    },
    barks: ['Catch me if you can!', 'I saw an imp! I think.', 'Not scared, not scared!'],
    greeting: '{name}! Did you see an imp?',
  },
];

/** The NPCs of the town: the people of the buildings, then the people of the streets. */
export const TOWN_NPCS: readonly NpcDef[] = [...IRONHOLD.residents, ...WALKERS];

const REEVE_HOUSE = TOWN_BUILDINGS.find((b) => b.id === 'reeve')!;

/**
 * The argument in the house of the reeve (chapter 1.5.1 of Kandrax, "Incursión Hobgoblin"): a
 * character who started the quest of the burned homesteads (quests.ts, ashes) and comes to the house
 * hears the reeve, a villager and a soldier of the Sovereignty argue. Hobgoblins go through the hills to Silverspring;
 * they took the scout Himo, and the scout Brys escaped. With Wisdom 13, the character also hears what
 * the soldier says low. At its end, the quest of the raid starts (scenes.ts).
 */
export const ARGUMENT: SceneDef = {
  id: 'argument',
  area: { x0: REEVE_HOUSE.x0, y0: REEVE_HOUSE.y0, x1: REEVE_HOUSE.x1, y1: REEVE_HOUSE.y1 + 2 },
  when: [{ quest: 'ashes' }, { quest: 'raid', not: true }],
  lines: [
    { npc: 'reeve', text: '...and they go straight for Silverspring. Brys says that there were two squads of them.' },
    { npc: 'farmer', text: 'And Himo?' },
    { npc: 'reeve', text: 'They took him. Brys thinks that he is still alive.' },
    { npc: 'farmer', text: 'We must warn Silverspring!' },
    { npc: 'soldier', text: 'And leave Ironhold with no defence? One messenger alone dies in those hills.' },
    { npc: 'farmer', text: 'Then send soldiers with the messenger!' },
    { npc: 'soldier', text: 'My soldiers stay here. That is my last word.' },
    { npc: 'soldier', text: 'Let the hobgoblins have Silverspring. It saves the Sovereignty the work.', gate: INSIGHT_GATE },
    { npc: 'reeve', text: 'Enough! ...You, by the door. Come here. I need a word with you.' },
  ],
  effect: RAID_HEARD,
};

const INN_HOUSE = TOWN_BUILDINGS.find((b) => b.id === 'inn')!;

/**
 * The plot in the Crooked Lantern (chapter 1.5.1, "Asalto a la Caravana"; story phase 5): a character
 * who knows of the hobgoblins (the raid at `asked` or later) hears a soldier of the Sovereignty and a
 * villager plan to send the hobgoblins against a caravan of Silverspring. The chapter has three lines
 * at three difficulties: with Wisdom 15 the character hears all of them, with 13 two, and else the
 * last one; and if it listens on, where the attack will be. At its end, the quest of the caravan starts.
 */
export const PLOT: SceneDef = {
  id: 'plot',
  area: { x0: INN_HOUSE.x0, y0: INN_HOUSE.y0, x1: INN_HOUSE.x1, y1: INN_HOUSE.y1 + 2 },
  when: [{ quest: 'raid', at: ['asked', 'scouts', 'band', 'escort', 'home', 'lost', 'raid', 'defended', 'title'] }, { quest: 'caravan', not: true }],
  lines: [
    { npc: 'drinker', text: '...and you think that they go without an escort?', gate: KEEN_GATE },
    { npc: 'inn-soldier', text: 'Two militia, badly trained by an old woman of the Enclave. Nothing that troubles us.', gate: KEEN_GATE },
    { npc: 'drinker', text: 'How many men do we need to... finish the job?', gate: INSIGHT_GATE },
    { npc: 'inn-soldier', text: 'That is the beauty of it. With the right word, we send the hobgoblins straight at the caravan. They do the dirty work.', gate: INSIGHT_GATE },
    { npc: 'drinker', text: 'And the Sovereignty knows of this?' },
    { npc: 'inn-soldier', text: 'My friend, it was the idea of the Sovereignty. They want no part of the cargo, only proof that the caravan never came.' },
    { npc: 'inn-soldier', text: 'It leaves Silverspring by the north road. Half a day out, the hobgoblins wait for it.' },
  ],
  effect: CARAVAN_HEARD,
};

/**
 * The arrival in Ironhold (Fede, 2026-10-13: the first quest, ROAD, ends when the character reaches the
 * town): a character on the road comes into the town, and the child in the lane, by the south edge where
 * the road comes in, sees it first.
 */
export const ARRIVAL: SceneDef = {
  id: 'arrival',
  area: { x0: IRONHOLD.x0, y0: IRONHOLD.y0, x1: IRONHOLD.x1, y1: IRONHOLD.y1 },
  when: { quest: 'road', at: ['go'] },
  lines: [
    { npc: 'child', text: 'Mother! A stranger, up the south road!' },
    { npc: 'child', text: 'Are you here for the reeve? Her house is on the lane, by the granary.' },
  ],
  effect: ROAD_ARRIVED,
};

/** The scenes of the town. */
export const TOWN_SCENES: readonly SceneDef[] = [ARGUMENT, PLOT, ARRIVAL];
