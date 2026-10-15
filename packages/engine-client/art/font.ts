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
  // The brackets of the tag of a gate, "[STR 13]", before a line of a speech bubble.
  '[': '## #. #. #. ##',
  ']': '## .# .# .# ##',
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

// ---------------------------------------------------------------- tiny font

/**
 * The tiny font for the texts of a fight over a player or a mob (render/fight-numbers.ts: the numbers
 * of the dice and the words of the mechanics; Fede, 2026-10-15): capitals and digits 4 rows tall, 3
 * columns wide except M, N and W, on the grid of the world's pixels. It has no lowercase, and an accented
 * letter draws as the plain one. Frames `tinyfont/<char code>`; build.ts writes the metrics into the atlas
 * JSON (meta.tinyFont).
 */
export const TINY_FONT = {
  height: 4,
  lineHeight: 6,
  spacing: 1,
  fallback: 'tinyfont/fallback',
} as const;

export const TINY_GLYPHS: Record<string, string> = {
  ' ': '.. .. .. ..',
  "'": '# # . .',
  '-': '... ### ... ...',
  '+': '.#. ### .#. ...',
  '.': '. . . #',
  A: '.#. #.# ### #.#',
  B: '##. ### #.# ##.',
  C: '.## #.. #.. .##',
  D: '##. #.# #.# ##.',
  E: '### ##. #.. ###',
  F: '### ##. #.. #..',
  G: '.## #.. #.# .##',
  H: '#.# ### #.# #.#',
  I: '### .#. .#. ###',
  J: '..# ..# #.# .#.',
  K: '#.# ##. ##. #.#',
  L: '#.. #.. #.. ###',
  M: '#...# ##.## #.#.# #...#',
  N: '#..# ##.# #.## #..#',
  O: '.#. #.# #.# .#.',
  P: '##. #.# ##. #..',
  Q: '.#. #.# ##. .##',
  R: '##. #.# ##. #.#',
  S: '.## #.. ..# ##.',
  T: '### .#. .#. .#.',
  U: '#.# #.# #.# ###',
  V: '#.# #.# #.# .#.',
  W: '#...# #.#.# #.#.# .#.#.',
  X: '#.# .#. .#. #.#',
  Y: '#.# #.# .#. .#.',
  Z: '### ..# .#. ###',
  '0': '### #.# #.# ###',
  '1': '.#. ##. .#. ###',
  '2': '##. ..# .#. ###',
  '3': '### .## ..# ###',
  '4': '#.# ### ..# ..#',
  '5': '### ##. ..# ##.',
  '6': '#.. ### #.# ###',
  '7': '### ..# .#. .#.',
  '8': '### ### #.# ###',
  '9': '### #.# ### ..#',
};

const TINY_FALLBACK = '### #.# #.# ###';

function tinyGlyph(spec: string, name: string): Image {
  const rows = spec.split(' ');
  if (rows.length !== TINY_FONT.height) throw new Error(`tiny glyph ${name} has ${rows.length} rows, not ${TINY_FONT.height}`);
  return grid(rows, { '#': 0xffffffff });
}

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

/**
 * The emblems on a sign board in place of a name (Building.emblem, render/buildings.ts), each painted
 * in pale gold with a 1-pixel shadow to the right and below, as the names are. The chalice is for a
 * shrine or a chapel (Fede's decision, 2026-10-13): a wide bowl, a stem with a knot, a foot. The light
 * comes from the top left: a lit rim and west edge, a dark east edge.
 */
const EMBLEMS: Readonly<Record<string, readonly string[]>> = {
  chalice: [
    'hhhhhhhhH',
    'HHGGGGGGD',
    'HGGGGGGGD',
    '.HGGGGGD.',
    '..HGGGD..',
    '...HGD...',
    '....G....',
    '...HGD...',
    '....G....',
    '..HGGGD..',
    '.HGGGGGD.',
  ],
};
const EMBLEM_COLOURS: Readonly<Record<string, number>> = { h: rgb('#e6d6a4'), H: rgb('#c9ad6a'), G: rgb('#9c7c40'), D: rgb('#5e4626') };
/** The shadow of an emblem: the dark edge of the sign board. */
const EMBLEM_SHADOW = SIGN_COLOURS['#'];

/** An emblem with its shadow: one pixel wider and taller than its grid. */
function emblem(rows: readonly string[]): Image {
  const image = new Image(rows[0]!.length + 1, rows.length + 1);
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== '.') image.set(x + 1, y + 1, EMBLEM_SHADOW);
  }));
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== '.') image.set(x, y, EMBLEM_COLOURS[ch]!);
  }));
  return image;
}

/**
 * The plate of a name sign of the Iron Sovereignty (render/fixtures.ts): dark iron in a wine-red frame,
 * with a rivet in each corner and a pale top edge (the light comes from the top left). It stretches as
 * a nine-slice, 3 pixels on each side.
 */
const IRON_SIGN = ['.#####.', '#wwwww#', '#wrhrw#', '#wiiiw#', '#wrirw#', '#wwwww#', '.#####.'];
const IRON_SIGN_COLOURS = { '#': rgb('#0b0c0f'), w: rgb('#501a1d'), r: rgb('#4b535f'), h: rgb('#2d3139'), i: rgb('#1a1d24') };
/** The shield of the Iron Sovereignty over the plate: an anvil of pale iron on wine red, the horn to the west. */
const IRON_CREST = [
  '#########',
  '#hhwwwww#',
  '#hwwwwww#',
  '#aaaaaaw#',
  '#wwAAAww#',
  '#wwwAwww#',
  '#wwAAAww#',
  '#wwwwwww#',
  '.#wwwww#.',
  '..#www#..',
  '...#w#...',
  '....#....',
];
const IRON_CREST_COLOURS = { '#': rgb('#0b0c0f'), w: rgb('#501a1d'), h: rgb('#662325'), a: rgb('#a0a8b2'), A: rgb('#6b7581') };

/**
 * The plate of a name sign of the Mithril Enclave: dark blue in a silver frame, with a gold rivet in
 * each corner and a paler top edge. It stretches as a nine-slice, 3 pixels on each side.
 */
const MITHRIL_SIGN = ['.#####.', '#sssss#', '#sghgs#', '#sbbbs#', '#sgbgs#', '#sssss#', '.#####.'];
const MITHRIL_SIGN_COLOURS = { '#': rgb('#0a0d12'), s: rgb('#4e6276'), g: rgb('#8a6e2e'), h: rgb('#22324a'), b: rgb('#141e2c') };
/**
 * The shield of the Mithril Enclave over the plate (Fede's choice, 2026-10-13): the silver peaks of the
 * Silver Columns on blue, a tall peak between two lower ones, with snow on their tops. The light comes
 * from the top left: the west slopes are lit, the east slopes are in shade.
 */
const MITHRIL_CREST = [
  '###########',
  '#hhbbbbbbb#',
  '#hbbbWbbbb#',
  '#bbbbWsbbb#',
  '#bbbWLSbbb#',
  '#bWbLLSbWb#',
  '#WLsLLSWLs#',
  '#LLSSSLLLS#',
  '#LLSSSLLLS#',
  '.#bbbbbbb#.',
  '..#bbbbb#..',
  '...#bbb#...',
  '....#b#....',
  '.....#.....',
];
const MITHRIL_CREST_COLOURS = {
  '#': rgb('#0a0d12'),
  b: rgb('#1b2a3a'),
  h: rgb('#26394d'),
  W: rgb('#d2d8de'),
  s: rgb('#8e9aa8'),
  L: rgb('#8ea4ba'),
  S: rgb('#4e6276'),
};

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
  for (const [ch, spec] of Object.entries(TINY_GLYPHS)) frames.push({ name: `tinyfont/${ch.charCodeAt(0)}`, image: tinyGlyph(spec, ch) });
  frames.push({ name: TINY_FONT.fallback, image: tinyGlyph(TINY_FALLBACK, 'fallback') });
  frames.push({ name: 'ui/bubble', image: grid(BUBBLE_FRAME, BUBBLE) });
  frames.push({ name: 'ui/bubble-tail', image: grid(BUBBLE_TAIL, BUBBLE), anchor: { x: 0.5, y: 0 } });
  frames.push({ name: 'ui/more', image: grid(MORE, { '#': 0xd8ccb0ff }) });
  frames.push({ name: 'ui/sign', image: grid(SIGN, SIGN_COLOURS) });
  for (const [name, rows] of Object.entries(EMBLEMS)) frames.push({ name: `ui/emblem/${name}`, image: emblem(rows) });
  frames.push({ name: 'ui/namesign/iron', image: grid(IRON_SIGN, IRON_SIGN_COLOURS) });
  frames.push({ name: 'ui/crest/iron', image: grid(IRON_CREST, IRON_CREST_COLOURS) });
  frames.push({ name: 'ui/namesign/mithril', image: grid(MITHRIL_SIGN, MITHRIL_SIGN_COLOURS) });
  frames.push({ name: 'ui/crest/mithril', image: grid(MITHRIL_CREST, MITHRIL_CREST_COLOURS) });
  // The hot spot is the centre of the top-left pixel.
  frames.push({ name: 'ui/cursor', image: grid(CURSOR, CURSOR_COLOURS), anchor: { x: 0.5 / CURSOR[0]!.length, y: 0.5 / CURSOR.length } });
  return frames;
}
