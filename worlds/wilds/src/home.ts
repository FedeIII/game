import { TILE_SIZE, type Building, type Fixture } from '@game/engine';
import { BUILDING_CELL, CANDLE, DOOR_PATH } from './houses.ts';
import { READ_LETTER } from './quests.ts';
import { DREAM_BED } from './dream.ts';

/**
 * The player's home: a small hut in the middle of the wilds, in the cell (0, 0). Every character
 * starts here, inside, by the door. It is always the same hut in the same place for a seed: the
 * dry spot of the cell nearest its middle (WildsSource keeps its ground dry in any case).
 */
export const HOME_ID = 'home';
export const HOME_CELL = [0, 0] as const;

/** Outer size, walls included: an interior of 5 x 4 tiles. */
const WIDTH = 7;
const HEIGHT = 6;
const CELL_MARGIN = 2;

/** What the things of the home say (the action button). */
const TEXTS = {
  bed: ['Your bed. The straw is fresh.'],
  chest: ['Your chest. Nothing in it yet.'],
  bookshelf: ['Your few books. You know them by heart.'],
  // The letter of Thrain Steelforge: to read it starts the story (quests.ts, READ_LETTER).
  table: [
    'Your table. A letter lies by the candle, sealed with a hammer and an anvil.',
    'It is from Thrain Steelforge: "Homesteads burn in the Wilds, one after another, and nobody knows who burns them. Find out for me."',
    '"Begin in Ironhold, west down the road. The reeve there, Elama Rothenel, wrote to me first. Thrain."',
  ],
  barrel: ['Water from the stream. Cold, and good.'],
} as const;

/** The hut with its walls from (x0, y0). The door is in the middle of the south wall. */
function hut(x0: number, y0: number): Building {
  const x1 = x0 + WIDTH - 1;
  const y1 = y0 + HEIGHT - 1;
  const ix0 = x0 + 1;
  const iy0 = y0 + 1;
  const doorX = x0 + 3;
  const say = (kind: keyof typeof TEXTS) => ({ content: { pages: [...TEXTS[kind]] } });
  // The column of the door and the row inside the south wall stay free (a test walks to each thing).
  const fixtures: Fixture[] = [
    // The bed rests the player: all its hit points and stamina back (Interaction.rest).
    // A character at `relic` dreams in it (dream.ts).
    { kind: 'bed', tx: ix0, ty: iy0 + 1, content: { pages: [...TEXTS.bed], rest: true }, variant: DREAM_BED },
    { kind: 'chest', tx: ix0, ty: iy0 + 2, ...say('chest') },
    { kind: 'bookshelf', tx: ix0 + 4, ty: iy0, ...say('bookshelf') },
    { kind: 'table', tx: ix0 + 3, ty: iy0 + 1, light: CANDLE, content: { pages: [...TEXTS.table], effect: READ_LETTER } },
    { kind: 'barrel', tx: ix0 + 4, ty: iy0 + 3, ...say('barrel') },
  ];
  return {
    id: HOME_ID,
    x0,
    y0,
    x1,
    y1,
    doorX,
    fixtures,
    style: { walls: 'timber', roof: 'thatch' },
    windows: [x0 + 5],
    roofProps: [{ name: 'chimney', tx: x0 + 1 }],
  };
}

/**
 * The home of a seed. `isWater` tells if a tile is water: the hut goes to the place nearest the
 * middle of its cell where it, the ring round it and the approach to its door are dry. If the
 * cell has no such place, it stays in the middle, and the source makes its ground dry.
 */
export function generateHome(isWater: (tx: number, ty: number) => boolean): Building {
  const [cellX, cellY] = HOME_CELL;
  const minX = cellX * BUILDING_CELL + CELL_MARGIN;
  const minY = cellY * BUILDING_CELL + CELL_MARGIN;
  const maxX = (cellX + 1) * BUILDING_CELL - CELL_MARGIN - WIDTH;
  const maxY = (cellY + 1) * BUILDING_CELL - CELL_MARGIN - HEIGHT;
  const midX = Math.round((minX + maxX) / 2);
  const midY = Math.round((minY + maxY) / 2);
  const dry = (x0: number, y0: number) => {
    for (let ty = y0 - 1; ty <= y0 + HEIGHT - 1 + DOOR_PATH; ty++) {
      for (let tx = x0 - 1; tx <= x0 + WIDTH; tx++) if (isWater(tx, ty)) return false;
    }
    return true;
  };
  const places: [number, number][] = [];
  for (let y0 = minY; y0 <= maxY; y0++) for (let x0 = minX; x0 <= maxX; x0++) places.push([x0, y0]);
  places.sort((a, b) => Math.hypot(a[0] - midX, a[1] - midY) - Math.hypot(b[0] - midX, b[1] - midY) || a[1] - b[1] || a[0] - b[0]);
  const [x0, y0] = places.find(([x, y]) => dry(x, y)) ?? [midX, midY];
  return hut(x0, y0);
}

/** Where a character starts: inside the home, on the tile north of the door. */
export function homeStart(home: Building): { x: number; y: number } {
  return { x: (home.doorX + 0.5) * TILE_SIZE, y: (home.y1 - 0.5) * TILE_SIZE };
}
