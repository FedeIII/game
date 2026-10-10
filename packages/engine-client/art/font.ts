/**
 * The pixel font for text in the world (speech, labels), and the speech bubble frame.
 *
 * Each glyph is a text grid: '#' is ink, '.' is empty, rows are separated by spaces. Capitals
 * and digits are 7 rows tall (rows 0-6), lowercase letters have a 5-row body (rows 2-6), and
 * descenders use rows 7-8. The glyphs are white: the client tints them. Frame names are
 * `font/<char code>`; the frame width is the advance before the letter spacing.
 */
import { Image } from './png.ts';
import { grid, rgb } from './raster.ts';
import type { Frame } from './sprites.ts';

/** Font metrics. build.ts writes them into the atlas JSON (meta.font) for the client. */
export const FONT = {
  /** Rows in each glyph frame. */
  height: 9,
  /** From one line of text to the next. */
  lineHeight: 11,
  /** Empty columns between two glyphs. */
  spacing: 1,
  /** The frame for a character that the font does not have. */
  fallback: 'font/fallback',
} as const;

export const GLYPHS: Record<string, string> = {
  ' ': '... ... ... ... ... ... ...',
  '!': '# # # # # . #',
  '"': '#.# #.#',
  '#': '.#.#. .#.#. ##### .#.#. ##### .#.#. .#.#.',
  '%': '##... ##..# ...#. ..#.. .#... #..## ...##',
  '&': '.##.. #..#. #.#.. .#... #.#.# #..#. .##.#',
  "'": '# #',
  '(': '.# #. #. #. #. #. .#',
  ')': '#. .# .# .# .# .# #.',
  '*': '... #.# .#. #.#',
  '+': '... ... .#. ### .#.',
  ',': '.. .. .. .. .. .# .# #.',
  '-': '... ... ... ###',
  '.': '. . . . . . #',
  '/': '..# ..# .#. .#. .#. #.. #..',
  ':': '. . # . . . #',
  ';': '.. .. .# .. .. .# .# #.',
  '<': '... ..# .#. #.. .#. ..#',
  '=': '... ... ### ... ###',
  '>': '... #.. .#. ..# .#. #..',
  '?': '.###. #...# ....# ...#. ..#.. ..... ..#..',
  '[': '## #. #. #. #. #. ##',
  ']': '## .# .# .# .# .# ##',
  _: '.... .... .... .... .... .... .... ####',

  '0': '.###. #...# #..## #.#.# ##..# #...# .###.',
  '1': '.#. ##. .#. .#. .#. .#. ###',
  '2': '.###. #...# ....# ...#. ..#.. .#... #####',
  '3': '.###. #...# ....# ..##. ....# #...# .###.',
  '4': '...#. ..##. .#.#. #..#. ##### ...#. ...#.',
  '5': '##### #.... ####. ....# ....# #...# .###.',
  '6': '.###. #.... #.... ####. #...# #...# .###.',
  '7': '##### ....# ...#. ..#.. ..#.. ..#.. ..#..',
  '8': '.###. #...# #...# .###. #...# #...# .###.',
  '9': '.###. #...# #...# .#### ....# ....# .###.',

  A: '.###. #...# #...# ##### #...# #...# #...#',
  B: '####. #...# #...# ####. #...# #...# ####.',
  C: '.###. #...# #.... #.... #.... #...# .###.',
  D: '####. #...# #...# #...# #...# #...# ####.',
  E: '##### #.... #.... ####. #.... #.... #####',
  F: '##### #.... #.... ####. #.... #.... #....',
  G: '.###. #...# #.... #.### #...# #...# .###.',
  H: '#...# #...# #...# ##### #...# #...# #...#',
  I: '### .#. .#. .#. .#. .#. ###',
  J: '..### ...#. ...#. ...#. #..#. #..#. .##..',
  K: '#...# #..#. #.#.. ##... #.#.. #..#. #...#',
  L: '#.... #.... #.... #.... #.... #.... #####',
  M: '#...# ##.## #.#.# #.#.# #...# #...# #...#',
  N: '#...# ##..# #.#.# #.#.# #..## #...# #...#',
  O: '.###. #...# #...# #...# #...# #...# .###.',
  P: '####. #...# #...# ####. #.... #.... #....',
  Q: '.###. #...# #...# #...# #.#.# #..#. .##.#',
  R: '####. #...# #...# ####. #.#.. #..#. #...#',
  S: '.###. #...# #.... .###. ....# #...# .###.',
  T: '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
  U: '#...# #...# #...# #...# #...# #...# .###.',
  V: '#...# #...# #...# #...# .#.#. .#.#. ..#..',
  W: '#...# #...# #...# #.#.# #.#.# ##.## #...#',
  X: '#...# #...# .#.#. ..#.. .#.#. #...# #...#',
  Y: '#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..',
  Z: '##### ....# ...#. ..#.. .#... #.... #####',

  a: '.... .... .##. ...# .### #..# .###',
  b: '#... #... ###. #..# #..# #..# ###.',
  c: '.... .... .### #... #... #... .###',
  d: '...# ...# .### #..# #..# #..# .###',
  e: '.... .... .##. #..# #### #... .###',
  f: '.## #.. ### #.. #.. #.. #..',
  g: '.... .... .### #..# #..# #..# .### ...# .##.',
  h: '#... #... ###. #..# #..# #..# #..#',
  i: '# . # # # # #',
  j: '.# .. .# .# .# .# .# .# #.',
  k: '#... #... #..# #.#. ##.. #.#. #..#',
  l: '#. #. #. #. #. #. .#',
  m: '..... ..... ##.#. #.#.# #.#.# #.#.# #.#.#',
  n: '.... .... ###. #..# #..# #..# #..#',
  o: '.... .... .##. #..# #..# #..# .##.',
  p: '.... .... ###. #..# #..# #..# ###. #... #...',
  q: '.... .... .### #..# #..# #..# .### ...# ...#',
  r: '.... .... #.## ##.. #... #... #...',
  s: '.... .... .### #... .##. ...# ###.',
  t: '.#. .#. ### .#. .#. .#. ..#',
  u: '.... .... #..# #..# #..# #..# .###',
  v: '..... ..... #...# #...# .#.#. .#.#. ..#..',
  w: '..... ..... #...# #.#.# #.#.# #.#.# .#.#.',
  x: '..... ..... #...# .#.#. ..#.. .#.#. #...#',
  y: '.... .... #..# #..# #..# #..# .### ...# .##.',
  z: '.... .... #### ...# .##. #... ####',

  // Spanish and typography. Accented capitals are drawn as plain capitals (no room above them).
  á: '..#. .#.. .##. ...# .### #..# .###',
  é: '..#. .#.. .##. #..# #### #... .###',
  í: '.# #. .. #. #. #. #.',
  ó: '..#. .#.. .##. #..# #..# #..# .##.',
  ú: '..#. .#.. #..# #..# #..# #..# .###',
  ü: '#..# .... #..# #..# #..# #..# .###',
  ñ: '.#.# #.#. ###. #..# #..# #..# #..#',
  '¿': '..... ..... ..#.. ..... ..#.. .#... #.... #...# .###.',
  '¡': '. . # . # # # # #',
  '·': '. . . #',
  '—': '....... ....... ....... #######',
  '–': '.... .... .... ####',
};

const FALLBACK = '#### #..# #..# #..# #..# #..# ####';

// ---------------------------------------------------------------- small font

/**
 * The small font for name tags over players: capitals and digits 5 rows tall (the world font's
 * are 7), 3 columns wide except M, N and W. It has no lowercase: the client shows a name in
 * these small capitals. Frames `smallfont/<char code>`; build.ts writes the metrics into the
 * atlas JSON (meta.smallFont).
 */
export const SMALL_FONT = {
  height: 5,
  lineHeight: 7,
  spacing: 1,
  fallback: 'smallfont/fallback',
} as const;

export const SMALL_GLYPHS: Record<string, string> = {
  ' ': '.. .. .. .. ..',
  "'": '# # . . .',
  '-': '... ... ### ... ...',
  '+': '... .#. ### .#. ...',
  '.': '. . . . #',
  _: '... ... ... ... ###',
  A: '.#. #.# ### #.# #.#',
  B: '##. #.# ##. #.# ##.',
  C: '.## #.. #.. #.. .##',
  D: '##. #.# #.# #.# ##.',
  E: '### #.. ##. #.. ###',
  F: '### #.. ##. #.. #..',
  G: '.## #.. #.# #.# .##',
  H: '#.# #.# ### #.# #.#',
  I: '### .#. .#. .#. ###',
  J: '..# ..# ..# #.# .#.',
  K: '#.# #.# ##. #.# #.#',
  L: '#.. #.. #.. #.. ###',
  M: '#...# ##.## #.#.# #...# #...#',
  N: '#..# ##.# #.## #..# #..#',
  O: '.#. #.# #.# #.# .#.',
  P: '##. #.# ##. #.. #..',
  Q: '.#. #.# #.# ##. .##',
  R: '##. #.# ##. #.# #.#',
  S: '.## #.. .#. ..# ##.',
  T: '### .#. .#. .#. .#.',
  U: '#.# #.# #.# #.# ###',
  V: '#.# #.# #.# #.# .#.',
  W: '#...# #...# #.#.# ##.## #...#',
  X: '#.# #.# .#. #.# #.#',
  Y: '#.# #.# .#. .#. .#.',
  Z: '### ..# .#. #.. ###',
  '0': '### #.# #.# #.# ###',
  '1': '.#. ##. .#. .#. ###',
  '2': '##. ..# .#. #.. ###',
  '3': '##. ..# .#. ..# ##.',
  '4': '#.# #.# ### ..# ..#',
  '5': '### #.. ##. ..# ##.',
  '6': '.## #.. ### #.# ###',
  '7': '### ..# .#. .#. .#.',
  '8': '### #.# ### #.# ###',
  '9': '### #.# ### ..# ##.',
};

const SMALL_FALLBACK = '### #.# #.# #.# ###';

function smallGlyph(spec: string, name: string): Image {
  const rows = spec.split(' ');
  if (rows.length !== SMALL_FONT.height) throw new Error(`small glyph ${name} has ${rows.length} rows, not ${SMALL_FONT.height}`);
  return grid(rows, { '#': 0xffffffff });
}

function glyph(spec: string, name: string): Image {
  const rows = spec.split(' ');
  if (rows.length > FONT.height) throw new Error(`glyph ${name} has ${rows.length} rows, more than ${FONT.height}`);
  const width = rows[0]!.length;
  while (rows.length < FONT.height) rows.push('.'.repeat(width));
  return grid(rows, { '#': 0xffffffff });
}

// ---------------------------------------------------------------- speech bubble

/** Same colours as the HTML GUI theme (style.css): dark panel, dried-blood border. */
const BUBBLE = { '#': rgb('#7a302e'), f: rgb('#080608', 224) };

/** A frame with corners cut by one pixel. A NineSliceSprite stretches its middle. */
const BUBBLE_FRAME = ['.###.', '#fff#', '#fff#', '#fff#', '.###.'];
/** The tail. Its top row covers the bubble's bottom border, which opens the frame there. */
const BUBBLE_TAIL = ['#fff#', '.#f#.', '..#..'];
/** "More pages": a small triangle in the bubble's bottom-right corner. */
const MORE = ['#####', '.###.', '..#..'];
/** A wooden sign board, a 9-slice: dark edge, planks with a lit top. */
const SIGN = ['.#####.', '#lllll#', '#wwwww#', '#wWwww#', '#wwwWw#', '#wwwww#', '.#####.'];
const SIGN_COLOURS = { '#': rgb('#140d09'), l: rgb('#5a3f2a'), w: rgb('#3d2a1c'), W: rgb('#33231a') };

// ---------------------------------------------------------------- mouse cursor

/**
 * The mouse cursor over the world: a short sword that points up and left, its tip on the top-left
 * pixel (the hot spot). A parchment edge on the steel (lit from the top left), a brass guard with
 * a wine-red stone, and a dark outline, so it reads on dark and on lit ground.
 */
const CURSOR = [
  'WKK.......',
  'KWSK......',
  'KDWSK..K..',
  '.KDWSKKGK.',
  '..KDWKGK..',
  '...KKRK...',
  '...KgKLK..',
  '..KgK.KlK.',
  '...K...KGK',
  '........K.',
];
const CURSOR_COLOURS = {
  K: rgb('#0b0809'),
  W: rgb('#d8ccb0'),
  S: rgb('#a39c90'),
  D: rgb('#5f5954'),
  R: rgb('#b03a3e'),
  G: rgb('#9a7a44'),
  g: rgb('#5e4626'),
  L: rgb('#4a3224'),
  l: rgb('#2c1d15'),
};

export function fontFrames(): Frame[] {
  const frames: Frame[] = Object.entries(GLYPHS).map(([ch, spec]) => ({ name: `font/${ch.charCodeAt(0)}`, image: glyph(spec, ch) }));
  frames.push({ name: FONT.fallback, image: glyph(FALLBACK, 'fallback') });
  for (const [ch, spec] of Object.entries(SMALL_GLYPHS)) frames.push({ name: `smallfont/${ch.charCodeAt(0)}`, image: smallGlyph(spec, ch) });
  frames.push({ name: SMALL_FONT.fallback, image: smallGlyph(SMALL_FALLBACK, 'fallback') });
  frames.push({ name: 'ui/bubble', image: grid(BUBBLE_FRAME, BUBBLE) });
  frames.push({ name: 'ui/bubble-tail', image: grid(BUBBLE_TAIL, BUBBLE), anchor: { x: 0.5, y: 0 } });
  frames.push({ name: 'ui/more', image: grid(MORE, { '#': 0xd8ccb0ff }) });
  frames.push({ name: 'ui/sign', image: grid(SIGN, SIGN_COLOURS) });
  // The hot spot is the centre of the top-left pixel.
  frames.push({ name: 'ui/cursor', image: grid(CURSOR, CURSOR_COLOURS), anchor: { x: 0.5 / CURSOR[0]!.length, y: 0.5 / CURSOR.length } });
  return frames;
}
