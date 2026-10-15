import { Ground, type Fixture, type NpcDef } from '@game/engine';
import { BRONZEHOLD_GUARD, FARMER, SERGEANT } from './dialogs.ts';
import { LAMP, Town, nameSign, type Plan, type Tile } from './towns.ts';

/**
 * The two hamlets on the road from the hut to Ironhold (Fede, 2026-10-13: the tutorial; chapter 1.5.1
 * of Kandrax, [A.2] "Picos de Poniente ⇒ Ferrozar"): Whitegrove (Arboleda Blanca), where a farmer at a
 * market stall waits for the merchant of the broken cart, and Bronzehold (Bronzal), a post of the
 * guards of the Iron Sovereignty. Both stand near the northern edge of the Sovereignty, south of
 * Ironhold. The road comes in at the south end of each street and leaves at its north end (road.ts).
 *
 * Plans of the town builder (towns.ts), one character per tile, north at the top:
 *   .  garden    T  a tree    =  cobblestones    :  the dirt lane
 *   1-4  the buildings    L  a lamp post    N  the notice board (2 x 1)    b  a barrel    x  a crate
 *   s  scales    t  a table (2 x 1)    S  the standard of the Sovereignty
 */

// ---------------------------------------------------------------- Whitegrove

/** The north-west tile of Whitegrove. */
const WHITEGROVE_X0 = -20;
const WHITEGROVE_Y0 = 88;
/** The column of the middle of the lane, where the road comes in and goes out. */
const WHITEGROVE_LANE = 9;

const WHITEGROVE_MAP = [
  '..T.....:::....T...',
  '........:::........',
  '.1111111:::2222222.',
  '.1111111:::2222222.',
  '.1111111:::2222222.',
  '.1111111:::2222222.',
  '.1111111:::2222222.',
  '........L::........',
  '........:::........',
  '...=============...',
  '...=bxs======NN=...',
  '...=tt========L=...',
  '...=============...',
  '........:::........',
  '.3333333:::4444444.',
  '.3333333:::4444444.',
  '.3333333:::4444444.',
  '.3333333:::4444444.',
  '.3333333:::4444444.',
  '........:::........',
  '........:::........',
  'T.......:::.......T',
];

export const WHITEGROVE_NAME = 'Whitegrove';

const WHITEGROVE_BUILDINGS: readonly Plan[] = [
  {
    id: 'whitegrove-farm',
    style: { walls: 'timber', roof: 'thatch' },
    floor: Ground.FloorEarth,
    roofProps: [{ name: 'chimney', column: 1 }],
    plan: ['#######', '#x..bB#', '#tt..B#', '#.....#', '#+#D#+#'],
    things: {
      x: { kind: 'crate', pages: ['Sacks of lentils, tied with twine, and a few of beans.'] },
      b: { kind: 'barrel', pages: ['Rainwater, with a leaf floating in it.'] },
      t: { kind: 'table', pages: ['A bowl of cold lentils and a heel of bread. Somebody ate in a hurry.'] },
      B: { kind: 'bed', pages: ['A narrow bed. It is not mine.'] },
    },
  },
  {
    id: 'whitegrove-house',
    style: { walls: 'planks', roof: 'shingle' },
    floor: Ground.Floor,
    plan: ['#######', '#.....#', '#.....#', '#.....#', '#+#D#+#'],
    locked: 'A dog barks inside, and nobody comes.',
  },
  {
    id: 'whitegrove-shrine',
    emblem: 'chalice',
    style: { walls: 'stone', roof: 'slate' },
    floor: Ground.FloorStone,
    plan: ['#######', '#c.l.c#', '#.....#', '#.....#', '#+#D#+#'],
    things: {
      c: { kind: 'candelabra', pages: ['Candle stubs, left by travellers. A few still burn.'] },
      l: {
        kind: 'lectern',
        pages: ['A book of prayers for the road. Travellers write their names in it before they go north.'],
        lore: [{ gate: { ability: 'int', dc: 10 }, pages: ['The names thin out after the spring. The last pages are blank.'] }],
      },
    },
  },
  {
    id: 'whitegrove-cottage',
    style: { walls: 'timber', roof: 'thatch' },
    floor: Ground.FloorEarth,
    roofProps: [{ name: 'chimney', column: 5 }],
    plan: ['#######', '#.....#', '#.....#', '#.....#', '#+#D#+#'],
    locked: 'The shutters are closed. Somebody coughs inside, and nobody answers.',
  },
];

const WHITEGROVE_THINGS: Readonly<Record<string, Fixture>> = {
  L: { kind: 'lamppost', tx: 0, ty: 0, light: LAMP },
  b: { kind: 'barrel', tx: 0, ty: 0, content: { pages: ['A barrel of dried beans. A price is chalked on it.'] } },
  x: { kind: 'crate', tx: 0, ty: 0, content: { pages: ['Sacks of lentils, ready to go. Each one is heavy.'] } },
  s: { kind: 'scales', tx: 0, ty: 0, content: { pages: ['The farmer\'s scales. The weights are worn smooth.'] } },
  t: { kind: 'table', tx: 0, ty: 0, content: { pages: ['The market stall: lentils, beans and onions, and nobody to buy them.'] } },
  N: {
    kind: 'noticeboard',
    tx: 0,
    ty: 0,
    content: { pages: ['WANTED: a cart to Bronzehold. Ask the farmer.', 'Under it: THE SHRINE IS OPEN TO ALL WHO TRAVEL.'] },
  },
};

/** Whitegrove, built from its plan. */
export const WHITEGROVE = new Town({
  name: WHITEGROVE_NAME,
  x0: WHITEGROVE_X0,
  y0: WHITEGROVE_Y0,
  map: WHITEGROVE_MAP,
  buildings: WHITEGROVE_BUILDINGS,
  things: WHITEGROVE_THINGS,
});

/** The tiles just outside the two ends of the lane: the road from the hut ends at the south one, the road to Bronzehold starts at the north one. */
export const WHITEGROVE_SOUTH: Tile = [WHITEGROVE.x0 + WHITEGROVE_LANE, WHITEGROVE.y1 + 1];
export const WHITEGROVE_NORTH: Tile = [WHITEGROVE.x0 + WHITEGROVE_LANE, WHITEGROVE.y0 - 1];

/** The shrine of Whitegrove: a refuge (source.ts, REFUGES). */
export const WHITEGROVE_SHRINE = WHITEGROVE.buildings.find((b) => b.id === 'whitegrove-shrine')!;

// ---------------------------------------------------------------- Bronzehold

/** The north-west tile of Bronzehold. */
const BRONZEHOLD_X0 = -45;
const BRONZEHOLD_Y0 = 38;
const BRONZEHOLD_LANE = 9;

const BRONZEHOLD_MAP = [
  '..T.....:::.....T..',
  '........:::........',
  '.1111111:::2222222.',
  '.1111111:::2222222.',
  '.1111111:::2222222.',
  '.1111111:::2222222.',
  '.1111111:::2222222.',
  '.1111111:::........',
  '........:::........',
  '........:::........',
  '.......L:::..x.b...',
  '...==S==========...',
  '...=============...',
  '........:::........',
  '.3333333:::4444444.',
  '.3333333:::4444444.',
  '.3333333:::4444444.',
  '.3333333:::4444444.',
  '.3333333:::4444444.',
  '........:::........',
  '........:::........',
  'T.......:::.......T',
];

export const BRONZEHOLD_NAME = 'Bronzehold';

const BRONZEHOLD_BUILDINGS: readonly Plan[] = [
  {
    id: 'bronzehold-post',
    sign: 'Guard post',
    style: { walls: 'stone', roof: 'battlement' },
    floor: Ground.FloorStone,
    roofProps: [{ name: 'flag-wine', column: 3 }],
    plan: ['#######', '#x..xb#', '#mm...#', '#...K.#', '#.....#', '#+#D#+#'],
    things: {
      x: { kind: 'crate', pages: ['Spears and shields, stamped with the anvil of the Sovereignty.'] },
      b: { kind: 'barrel', pages: ['Water, and a ladle on a chain.'] },
      m: {
        kind: 'maptable',
        pages: ['A map of the frontier. Pins mark the road to Ironhold, and more of them stand north-east of it.'],
        lore: [{ gate: { ability: 'int', dc: 11 }, pages: ['The new pins all point one way: towards Silverspring, in the lands of the Enclave.'] }],
      },
    },
    people: {
      K: {
        id: 'bronzehold-sergeant',
        look: 'soldier',
        doorstep: true,
        dialog: SERGEANT,
        barks: ['Shields clean, spears sharp.', 'Another day on the edge of nothing.', 'Ironhold sends no news. Bad sign.'],
        greeting: 'Keep to the road, {name}.',
      },
    },
  },
  {
    id: 'bronzehold-house',
    style: { walls: 'stone', roof: 'slate' },
    floor: Ground.FloorStone,
    roofProps: [{ name: 'chimney', column: 5 }],
    plan: ['#######', '#.....#', '#.....#', '#.....#', '#+#D#+#'],
    locked: 'Barred from inside. A voice says: "Come back by day."',
  },
  {
    id: 'bronzehold-forge',
    style: { walls: 'stone', roof: 'slate' },
    floor: Ground.FloorStone,
    roofProps: [{ name: 'chimney', column: 1 }],
    plan: ['#######', '#ff.a.#', '#.....#', '#.....#', '#+#D#+#'],
    things: {
      f: { kind: 'forge', pages: ['A small forge, cold today. Bronze filings shine in the ash.'] },
      a: { kind: 'anvil', pages: ['An old anvil with a bell for a voice. The hamlet has its name from the bronze bells cast here.'] },
    },
  },
  {
    id: 'bronzehold-cottage',
    style: { walls: 'planks', roof: 'shingle' },
    floor: Ground.Floor,
    plan: ['#######', '#.....#', '#.....#', '#.....#', '#+#D#+#'],
    locked: 'Empty. The family went south when the woods filled with goblins.',
  },
];

const BRONZEHOLD_THINGS: Readonly<Record<string, Fixture>> = {
  L: { kind: 'lamppost', tx: 0, ty: 0, light: LAMP },
  x: { kind: 'crate', tx: 0, ty: 0, content: { pages: ['Arrows in bundles of twenty, for the guard post.'] } },
  b: { kind: 'barrel', tx: 0, ty: 0 },
  S: { kind: 'standard', look: 'iron', tx: 0, ty: 0, content: { pages: ['The standard of the Iron Sovereignty: an anvil on wine red.'] } },
};

/** Bronzehold, built from its plan. */
export const BRONZEHOLD = new Town({
  name: BRONZEHOLD_NAME,
  x0: BRONZEHOLD_X0,
  y0: BRONZEHOLD_Y0,
  map: BRONZEHOLD_MAP,
  buildings: BRONZEHOLD_BUILDINGS,
  things: BRONZEHOLD_THINGS,
});

export const BRONZEHOLD_SOUTH: Tile = [BRONZEHOLD.x0 + BRONZEHOLD_LANE, BRONZEHOLD.y1 + 1];
export const BRONZEHOLD_NORTH: Tile = [BRONZEHOLD.x0 + BRONZEHOLD_LANE, BRONZEHOLD.y0 - 1];

// ---------------------------------------------------------------- name signs

/**
 * The name sign of a hamlet (nameSign(), towns.ts): right outside the south end of its lane, west of the
 * road that comes in there, in the style of the Iron Sovereignty (`look: 'iron'`). Its east post stands
 * one tile west of the road, so its plate never hangs over the road (a plate is in the text layer, over a
 * player there). A hamlet is small: no title over the screen.
 */
function hamletSign(town: Town, lane: number, pages: readonly string[]): Fixture {
  return nameSign(town, 'iron', town.x0 + lane - 5, town.y1 + 1, pages);
}

/** The name signs of Whitegrove and Bronzehold, in the woods just outside them (source.ts). */
export const HAMLET_SIGNS: readonly Fixture[] = [
  hamletSign(WHITEGROVE, WHITEGROVE_LANE, ['It reads: WHITEGROVE. Over the name, the anvil of the Iron Sovereignty.']),
  hamletSign(BRONZEHOLD, BRONZEHOLD_LANE, ['It reads: BRONZEHOLD. Over the name, the anvil of the Iron Sovereignty.']),
];

// ---------------------------------------------------------------- people in the streets

const WALKERS: readonly NpcDef[] = [
  {
    id: 'whitegrove-farmer',
    look: 'farmer',
    home: WHITEGROVE.at(7, 11),
    area: WHITEGROVE.streetArea(3, 9, 15, 12),
    content: { speaker: 'fixture', dialog: FARMER },
    barks: ['Lentils! Beans! ...Nobody.', 'Where is that man?', 'Rain tonight. My knee says so.'],
    greeting: 'Good day, {name}.',
  },
  {
    id: 'whitegrove-villager',
    look: 'homesteader',
    home: WHITEGROVE.at(9, 16),
    area: WHITEGROVE.streetArea(8, 13, 10, 21),
    content: {
      speaker: 'fixture',
      pages: ['The shrine is open day and night. Step inside once, and the road remembers you, they say.', 'Mind the goblins in the woods. They run, mostly.'],
    },
    barks: ['Another one for the road.', 'Birches and lentils. That is Whitegrove.', 'Who walks so late?'],
    // At night the villager goes into the shut cottage by the lane (NpcDef.night: the people without a
    // post go home at night, Fede's choice of 2026-10-13), across the garden in front of its door.
    night: { tile: WHITEGROVE.at(14, 19), way: [WHITEGROVE.at(11, 19), WHITEGROVE.at(12, 19), WHITEGROVE.at(13, 19), WHITEGROVE.at(14, 19)] },
  },
  {
    id: 'bronzehold-guard',
    look: 'watchman',
    home: BRONZEHOLD.at(9, 4),
    area: BRONZEHOLD.streetArea(8, 0, 10, 9),
    content: { speaker: 'fixture', dialog: BRONZEHOLD_GUARD },
    barks: ['Halt. ...Go on, then.', 'Nothing on the road. Nothing ever is.', 'Is it my watch again?'],
  },
];

/** The NPCs of the two hamlets: the people of the buildings, then the people of the streets. Their order is their code on the wire: add new people at the end. */
export const HAMLET_NPCS: readonly NpcDef[] = [...WHITEGROVE.residents, ...BRONZEHOLD.residents, ...WALKERS];
