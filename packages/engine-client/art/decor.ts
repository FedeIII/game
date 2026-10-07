/** Flat decor, drawn into the ground chunks: dead grass, dark flowers, mushrooms, stones, bones. */
import { grid, rgb } from './raster.ts';
import type { Frame } from './sprites.ts';

const blank = '................';

/** Pads a short list of rows to 16, centred low in the tile. */
function rows(lines: string[], top: number): string[] {
  const out = Array.from({ length: 16 }, () => blank);
  lines.forEach((line, i) => (out[top + i] = line));
  return out;
}

const STRAW = { a: rgb('#4d4a2e'), b: rgb('#38361f'), c: rgb('#232715'), d: rgb('#11130b') };

const TUFTS = [
  rows(['.......a........', '....a..b..a.....', '....b.ab..b.a...', '.....bcbcb.b....', '.....cccccc.....', '......dddd......'], 7),
  rows(['..........a.....', '...a.....ab.a...', '...b.a....bcb...', '..bcb.....ccc...', '..ccc.....ddd...', '..ddd...........'], 8),
];

const FLOWER_ROWS = rows(
  [
    '..........p.....',
    '....p....pcq....',
    '...pcq....q.....',
    '....q.....g.....',
    '....g.....g.....',
    '....g..p........',
    '......pcq.......',
    '.......q........',
    '.......g........',
  ],
  4,
);

const FLOWERS: Record<string, { p: string; q: string; c: string }> = {
  blood: { p: '#6e1a1f', q: '#45100f', c: '#9a8446' },
  violet: { p: '#4d3263', q: '#2e1d40', c: '#8a7a40' },
  pale: { p: '#8f8c80', q: '#5e5c53', c: '#7a6a3a' },
};

const MUSHROOM_ROWS = rows(
  [
    '..........rr....',
    '....rrr..rRwr...',
    '...rRwrr..rrrr..',
    '...rrrrr...sS...',
    '....sS.....sS...',
    '....sS....ddd...',
    '...dddd.........',
  ],
  7,
);
const MUSHROOM = { r: rgb('#4f1f16'), R: rgb('#703526'), w: rgb('#a39a84'), s: rgb('#7d7564'), S: rgb('#514b40'), d: rgb('#0b0a08') };

const STONE_ROWS = rows(['..........nn....', '....nn....NNk...', '...nNNk...kk....', '....kk..........', '........nk......'], 9);
const STONE = { n: rgb('#46433f'), N: rgb('#33312e'), k: rgb('#121110') };

const BONE_ROWS = rows(
  [
    '...WwwW.........',
    '..WwwwwW........',
    '..WkwkwW........',
    '...WwwW..ww..ww.',
    '...kWkW...wWWw..',
    '....kk...WW..WW.',
  ],
  7,
);
const BONE = { w: rgb('#9c9686'), W: rgb('#6c675b'), k: rgb('#110f0d') };

export function decorFrames(): Frame[] {
  const frames: Frame[] = TUFTS.map((r, i) => ({ name: `decor/tuft/${i}`, image: grid(r, STRAW) }));
  Object.values(FLOWERS).forEach((c, i) => {
    frames.push({ name: `decor/flowers/${i}`, image: grid(FLOWER_ROWS, { p: rgb(c.p), q: rgb(c.q), c: rgb(c.c), g: rgb('#1b2213') }) });
  });
  frames.push({ name: `decor/flowers/${Object.keys(FLOWERS).length}`, image: grid(MUSHROOM_ROWS, MUSHROOM) });
  frames.push({ name: 'decor/stones/0', image: grid(STONE_ROWS, STONE) });
  frames.push({ name: 'decor/bones/0', image: grid(BONE_ROWS, BONE) });
  return frames;
}
