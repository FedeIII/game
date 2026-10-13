import { Ground, type Fixture, type NpcDef } from '@game/engine';
import { HOST, JEWELLER, KASMUT, LORE_GATE, MILITIA } from './dialogs.ts';
import { SILVERSPRING_SITE } from './road.ts';
import { LAMP, Town, nameSign, type Plan } from './towns.ts';
import { DREAM_BED } from './dream.ts';

/**
 * Silverspring: the mithril village of the Mithril Enclave, at the end of the north road, about
 * 250 tiles north-east of Ironhold (story phase 4, chapter 1.5.1 of Kandrax). The Silvervein (el
 * río Vena de Plata in Kandrax: river.ts) comes down from a spring in the hills and crosses the town
 * from north to south, with mithril dust in it; the people pan the dust and a jeweller works it. A
 * militia of volunteers defends it, trained by Kasmut Parnika, a veteran of the Enclave.
 *
 * The plan of the town, one character per tile, north at the top (towns.ts). The north road comes
 * in at the west end of the main street (road.ts, SILVERSPRING_SITE). Three buildings face the
 * street from the north (the militia hall, the inn and the jeweller), four houses face the lane in
 * the south, and two bridges of planks cross the river.
 *
 *   .  garden    T  a tree    =  cobblestones    :  the dirt lane    ~  water    h  a bridge
 *   1-7  BUILDINGS[n - 1]    N  the notice board (2 x 1)    L  a lamp post    b  a barrel    x  a crate
 */
const MAP = [
  'T........T.........T.....T...~~....T.....T',
  '.............................~~...........',
  '..11111111111==2222222222....~~...........',
  '..11111111111==2222222222....~~...3333333.',
  '..11111111111==2222222222....~~...3333333.',
  '..11111111111==2222222222==..~~b==3333333.',
  '..11111111111==2222222222==..~~===3333333.',
  '..11111111111==2222222222x=..~~===3333333.',
  '..11111111111==2222222222b=..~~==x3333333.',
  '=L=NN========L=============L=hh==L========',
  '=============================hh===========',
  '=============================hh===========',
  '====L===========L=========L==hh===L=====L=',
  'x=4444444==5555555===========~~==7777777==',
  '==4444444==5555555==6666666==~~==7777777==',
  '==4444444==5555555==6666666==~~==7777777==',
  '==4444444==5555555==6666666==~~==7777777==',
  '==4444444==5555555==6666666==~~==7777777==',
  '==4444444==5555555==6666666==~~==7777777==',
  'b::::::::::::::::::::::::::::hh::::::::::x',
  ':::::::::L::::::::L::::::::L:hh:L:::::::L:',
  '.............................~~...........',
  '.............................~~...........',
  'T.........T........T....T....~~.....T....T',
];

export const SILVERSPRING_NAME = 'Silverspring';

/** The row of the main street where the north road comes in, from the west. */
const GATE_ROW = 10;

/** The buildings, in the order of their digits in MAP. */
const BUILDINGS: readonly Plan[] = [
  {
    id: 'militia-hall',
    sign: 'Militia',
    style: { walls: 'stone', roof: 'battlement' },
    floor: Ground.FloorStone,
    roofProps: [{ name: 'flag-silver', column: 5 }],
    plan: [
      '###########',
      '#xx.mm.k.b#',
      '#.........#',
      '#.dd...K..#',
      '#..rr.....#',
      '#..rr.....#',
      '#+#+#D#+#+#',
    ],
    things: {
      x: { kind: 'crate', pages: ['Spears, and more spears. Some of them are pick handles with a blade tied on.'] },
      m: {
        kind: 'maptable',
        pages: ['A map of the hills between Silverspring and Ironhold. Pins mark where the panners saw tracks.'],
        lore: [{ gate: LORE_GATE, pages: ['The pins make a line. Whatever made the tracks comes from the south-west, straight at Silverspring.'] }],
      },
      k: { kind: 'coinchest', pages: ["The pay chest of the militia. A note inside says: 'Owed: everything.'"] },
      b: { kind: 'barrel', pages: ['Water, and a ladle. Kasmut drills them hard.'] },
      d: { kind: 'desk', pages: ['Letters to the Enclave that ask for soldiers. The answers ask for patience.'] },
      r: { kind: 'rug' },
    },
    people: {
      K: {
        id: 'kasmut',
        look: 'veteran',
        doorstep: true,
        dialog: KASMUT,
        barks: ['Spears up! ...They are not even here.', 'Thirty years of this.', 'Watch the hills. Always the hills.'],
        greeting: '{name}. Keep your weapon clean.',
      },
    },
  },
  {
    id: 'trout',
    sign: 'The Silver Trout',
    style: { walls: 'timber', roof: 'clay' },
    floor: Ground.Floor,
    roofProps: [
      { name: 'chimney', column: 2 },
      { name: 'vane', column: 7 },
    ],
    plan: [
      '##########',
      '#bb.aac.B#',
      '#.......B#',
      '#.tt..tt.#',
      '#........#',
      '#K....gg.#',
      '#+##D##+##',
    ],
    things: {
      b: { kind: 'barrel', pages: ['Cider from the valley, and river water to cut it.'] },
      a: { kind: 'apothecary', pages: ['Bottles of cider, and a jar of pickled trout.'] },
      c: { kind: 'candelabra' },
      t: { kind: 'table', pages: ['A scrubbed table. Someone has carved a trout into its edge.'] },
      g: { kind: 'boardtable', pages: ['A game of stones. The panners play it for pinches of dust.'] },
      // The bed of the town's guest (story phase 4d: the title of the raid gives the refuge).
      B: { kind: 'bed', pages: ['A clean bed under a quilt of blue wool. It is not mine.'], restFor: 'trout', variant: DREAM_BED },
    },
    people: {
      K: {
        id: 'host',
        look: 'host',
        doorstep: true,
        dialog: HOST,
        barks: ['Shut the door!', 'Cider, cider, nobody wants the cider.', 'The last barrel. The very last.'],
        greeting: '{name}! Come in out of the wind.',
      },
    },
  },
  {
    id: 'jeweller',
    sign: 'Jeweller',
    style: { walls: 'brick', roof: 'indigo' },
    floor: Ground.FloorStone,
    roofProps: [{ name: 'chimney', column: 5 }],
    plan: [
      '#######',
      '#w.a.s#',
      '#.....#',
      '#.K.c.#',
      '#.....#',
      '#+#D#+#',
    ],
    things: {
      w: {
        kind: 'crystalball',
        pages: ['A ball of clear glass. In its middle, a thread of silver light turns slowly.'],
        lore: [{ gate: LORE_GATE, pages: ['Work of the Enclave: a spell of finding, closed in glass. It glows when mithril is near.'] }],
      },
      a: { kind: 'anvil', pages: ['A small anvil, polished like a mirror.'] },
      s: { kind: 'scales', pages: ['Scales for dust. The weights are no bigger than seeds.'] },
      c: { kind: 'candelabra' },
    },
    people: {
      K: {
        id: 'jeweller',
        look: 'jeweller',
        // She sells mithril to a character with the permit of Silverspring (dialogs.ts).
        dialog: JEWELLER,
        barks: ['Light as a breath...', 'Steady hands, steady hands.', 'Where are the small tongs?'],
        greeting: '{name}. Mind the dust: it is worth more than you.',
      },
    },
  },
  {
    id: 'panner-house',
    style: { walls: 'planks', roof: 'thatch' },
    floor: Ground.FloorEarth,
    roofProps: [{ name: 'chimney', column: 1 }],
    plan: ['#######', '#.....#', '#.....#', '#.....#', '#.....#', '###D###'],
    locked: 'Locked. Behind the shutters, somebody holds their breath.',
  },
  {
    id: 'miner-house',
    style: { walls: 'timber', roof: 'slate' },
    floor: Ground.Floor,
    plan: ['#######', '#.....#', '#.....#', '#.....#', '#.....#', '###D###'],
    locked: "Locked. A voice inside says: 'Come back when the hills are quiet.'",
  },
  {
    id: 'assay-house',
    style: { walls: 'brick', roof: 'clay' },
    floor: Ground.Floor,
    plan: ['#######', '#.....#', '#.....#', '#.....#', '###D###'],
    locked: 'Barred. A pan, a sieve and a pick lean against the door.',
  },
  {
    id: 'stream-house',
    style: { walls: 'stone', roof: 'copper' },
    floor: Ground.FloorStone,
    roofProps: [{ name: 'chimney', column: 5 }],
    plan: ['#######', '#.....#', '#.....#', '#.....#', '#.....#', '###D###'],
    locked: 'Locked. A dog barks inside, then stops.',
  },
];

/** The things of the streets by their character in MAP: a template, without its place. */
const STREET_THINGS: Readonly<Record<string, Fixture>> = {
  N: {
    kind: 'noticeboard',
    tx: 0,
    ty: 0,
    content: {
      pages: ['NOTICE. Every able hand to the militia hall at dawn. By order of K. Parnika.', 'Under it: FOUND, one silver ring with a trout on it. Ask at the inn.'],
      lore: [{ gate: LORE_GATE, pages: ['A newer notice: the Enclave raises the price that it pays for mithril dust. Under it, in chalk: "And the price of bread?"'] }],
    },
  },
  L: { kind: 'lamppost', tx: 0, ty: 0, light: LAMP },
  b: { kind: 'barrel', tx: 0, ty: 0 },
  x: { kind: 'crate', tx: 0, ty: 0 },
};

/**
 * Silverspring, built from its plan: the north road comes in at the west end of its main street. It is
 * important for the story: its name shows over the screen when a player comes in.
 */
export const SILVERSPRING = new Town({
  name: SILVERSPRING_NAME,
  x0: SILVERSPRING_SITE.tx + 1,
  y0: SILVERSPRING_SITE.ty - GATE_ROW,
  map: MAP,
  buildings: BUILDINGS,
  things: STREET_THINGS,
  title: true,
});

/**
 * The name sign of Silverspring (nameSign(), towns.ts), in the style of the Mithril Enclave (`look:
 * 'mithril'`: posts of white stone with gold caps, a plate of dark blue in a silver frame, and the silver
 * peaks of the Silver Columns on blue; Fede's choice, 2026-10-13). It stands outside the west end of the
 * main street, north of the road that comes in there from the west, with one tile between its east post
 * and the edge of the road; its plate hangs north of it, never over the road.
 */
export const SILVERSPRING_NAME_SIGN: Fixture = nameSign(SILVERSPRING, 'mithril', SILVERSPRING.x0 - 6, SILVERSPRING.y0 + GATE_ROW - 2, [
  'It reads: SILVERSPRING. Over the name, the silver peaks of the Mithril Enclave.',
]);

// ---------------------------------------------------------------- people in the streets

const WALKERS: readonly NpcDef[] = [
  {
    id: 'militia',
    look: 'militia',
    home: SILVERSPRING.at(2, 10),
    area: SILVERSPRING.streetArea(0, 9, 9, 12),
    content: { speaker: 'fixture', dialog: MILITIA },
    barks: ['Halt! ...Oh, it is you.', 'My arms ache.', 'Spear up, spear down. Spear up...'],
    greeting: '{name}! Welcome back to Silverspring.',
  },
  {
    id: 'prospector',
    look: 'prospector',
    home: SILVERSPRING.at(26, 7),
    area: SILVERSPRING.streetArea(25, 5, 33, 12),
    // During the raid, he hides behind the crates by the inn (NpcDef.shelter).
    shelter: SILVERSPRING.at(25, 5),
    // At night he goes home to the panner's house in the lane (NpcDef.night: the people without a post
    // go home at night, Fede's choice of 2026-10-13): down the alley by the river, and west on the lane.
    night: { tile: SILVERSPRING.at(5, 19), way: [...SILVERSPRING.streetArea(28, 13, 28, 18), ...SILVERSPRING.streetArea(5, 19, 28, 19)] },
    content: {
      speaker: 'fixture',
      pages: [
        'See the glitter in the water? Mithril dust. A whole day of panning for a pinch.',
        'The Silvervein rises at a spring in the hills, north of the town. A gift of Simtu, the priests say.',
        'The Sovereignty wants this river. Over my bones.',
      ],
    },
    barks: ['A pinch, a pinch...', 'Cold water, cold hands.', 'There! ...No. Sand.'],
    greeting: 'Mind your boots in the river, {name}.',
  },
];

/** The NPCs of Silverspring: the people of the buildings, then the people of the streets. */
export const SILVERSPRING_NPCS: readonly NpcDef[] = [...SILVERSPRING.residents, ...WALKERS];
