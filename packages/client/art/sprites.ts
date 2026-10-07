/**
 * Placeholder art for the POC. Hand-drawn sprites are text grids (one character per pixel);
 * ground tiles, edges, trees and rocks come from seeded procedures. build.ts packs the result
 * into one atlas. When real art comes from Aseprite, it replaces these entries with the same
 * frame names.
 */
import { Image } from './png.ts';

export interface Frame {
  readonly name: string;
  readonly image: Image;
  /** The point of the sprite that sits on its position, as a fraction of the size. */
  readonly anchor?: { readonly x: number; readonly y: number };
}

export interface Art {
  readonly frames: Frame[];
  readonly animations: Record<string, string[]>;
}

const TILE = 16;

// ---------------------------------------------------------------- helpers

/** Mulberry32: a small seeded random generator, so every build gives the same art. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function int(rand: () => number, max: number): number {
  return Math.floor(rand() * max);
}

/** Makes an image from text rows. '.' is transparent; other characters come from the palette. */
function grid(rows: readonly string[], palette: Readonly<Record<string, number>>): Image {
  const width = rows[0]!.length;
  const image = new Image(width, rows.length);
  rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`grid row ${y} has ${row.length} pixels, expected ${width}: "${row}"`);
    for (let x = 0; x < width; x++) {
      const ch = row[x]!;
      if (ch === '.') continue;
      const colour = palette[ch];
      if (colour === undefined) throw new Error(`no palette colour for "${ch}" in row ${y}`);
      image.set(x, y, colour);
    }
  });
  return image;
}

/** Replaces some rows of a grid. Use it to make animation frames from a base pose. */
function withRows(rows: readonly string[], changes: Readonly<Record<number, string>>): string[] {
  return rows.map((row, y) => changes[y] ?? row);
}

function fill(width: number, height: number, rgba: number): Image {
  const image = new Image(width, height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) image.set(x, y, rgba);
  return image;
}

/** Turns an image 90 degrees clockwise. */
function rotate(image: Image): Image {
  const out = new Image(image.height, image.width);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) out.set(image.height - 1 - y, x, image.get(x, y));
  }
  return out;
}

function rotateTimes(image: Image, turns: number): Image {
  let out = image;
  for (let i = 0; i < turns; i++) out = rotate(out);
  return out;
}

function shadowEllipse(image: Image, cx: number, cy: number, rx: number, ry: number, alpha: number): void {
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) image.set(x, y, 0x10101800 | alpha);
    }
  }
}

// ---------------------------------------------------------------- ground tiles

interface GroundColours {
  readonly base: number;
  readonly light: number;
  readonly dark: number;
  readonly accent: number;
}

/** Ground types in blend order: a type with a higher index draws its edge over a lower one. */
export const GROUND_COLOURS = {
  water: { base: 0x3a7bc8ff, light: 0x5b9ae0ff, dark: 0x3270bcff, accent: 0x9cc8f2ff },
  sand: { base: 0xe0c88cff, light: 0xecd9a6ff, dark: 0xc9ad70ff, accent: 0xb89a62ff },
  dirt: { base: 0xa07850ff, light: 0xb68c60ff, dark: 0x87633fff, accent: 0x6e5134ff },
  grass: { base: 0x4f9a3cff, light: 0x66b24bff, dark: 0x418632ff, accent: 0x7cc45cff },
  darkgrass: { base: 0x3f8536ff, light: 0x4f9842ff, dark: 0x33722cff, accent: 0x5ea74cff },
} as const satisfies Record<string, GroundColours>;

export type GroundName = keyof typeof GROUND_COLOURS;

/** The number of random variants of each ground tile. */
export const GROUND_VARIANTS: Record<GroundName, number> = {
  water: 3,
  sand: 3,
  dirt: 3,
  grass: 4,
  darkgrass: 3,
};

function grassTile(c: GroundColours, seed: number): Image {
  const rand = random(seed);
  const image = fill(TILE, TILE, c.base);
  for (let i = 0; i < 14; i++) image.set(int(rand, TILE), int(rand, TILE), c.dark);
  // Small blades: a light tip over a dark root.
  for (let i = 0; i < 9; i++) {
    const x = int(rand, TILE);
    const y = 1 + int(rand, TILE - 1);
    image.set(x, y, c.dark);
    image.set(x, y - 1, c.light);
    if (rand() < 0.4) image.set((x + 1) % TILE, y - 1, c.light);
  }
  for (let i = 0; i < 2; i++) image.set(int(rand, TILE), int(rand, TILE), c.accent);
  return image;
}

function speckledTile(c: GroundColours, seed: number, light: number, dark: number, accent: number): Image {
  const rand = random(seed);
  const image = fill(TILE, TILE, c.base);
  for (let i = 0; i < light; i++) image.set(int(rand, TILE), int(rand, TILE), c.light);
  for (let i = 0; i < dark; i++) image.set(int(rand, TILE), int(rand, TILE), c.dark);
  for (let i = 0; i < accent; i++) image.set(int(rand, TILE), int(rand, TILE), c.accent);
  return image;
}

function waterTile(c: GroundColours, seed: number): Image {
  const rand = random(seed);
  const image = fill(TILE, TILE, c.base);
  for (let i = 0; i < 10; i++) image.set(int(rand, TILE), int(rand, TILE), c.dark);
  // Short horizontal ripples.
  for (let i = 0; i < 3; i++) {
    const x = int(rand, TILE);
    const y = int(rand, TILE);
    const length = 2 + int(rand, 3);
    for (let k = 0; k < length; k++) image.set((x + k) % TILE, y, c.light);
    if (rand() < 0.5) image.set((x + 1) % TILE, (y + TILE - 1) % TILE, c.accent);
  }
  return image;
}

function groundTile(name: GroundName, variant: number): Image {
  const c = GROUND_COLOURS[name];
  const seed = 1000 * (Object.keys(GROUND_COLOURS).indexOf(name) + 1) + variant;
  switch (name) {
    case 'water':
      return waterTile(c, seed);
    case 'sand':
      return speckledTile(c, seed, 14, 8, 2);
    case 'dirt':
      return speckledTile(c, seed, 12, 14, 3);
    case 'grass':
    case 'darkgrass':
      return grassTile(c, seed);
  }
}

/**
 * Edge pieces. A tile draws the edge of a neighbour with a higher blend order over itself, so
 * borders between ground types look ragged instead of square. "n" is the piece for a
 * neighbour to the north; e, s and w are the same piece turned.
 */
export const EDGE_SIDES = ['n', 'e', 's', 'w'] as const;
export const EDGE_CORNERS = ['nw', 'ne', 'se', 'sw'] as const;

function edgePieces(name: GroundName): Frame[] {
  const c = GROUND_COLOURS[name];
  const source = groundTile(name, 0);
  const rand = random(7000 + Object.keys(GROUND_COLOURS).indexOf(name));

  // A depth for each column: a random walk between 2 and 5 pixels that starts and ends at 3,
  // so pieces on neighbouring tiles meet.
  const depth: number[] = [];
  let d = 3;
  for (let x = 0; x < TILE; x++) {
    const toEnd = TILE - 1 - x;
    d += rand() < 0.35 ? -1 : rand() < 0.55 ? 1 : 0;
    d = Math.max(2, Math.min(5, d));
    if (toEnd < Math.abs(d - 3)) d += d > 3 ? -1 : 1;
    depth.push(x === 0 || toEnd === 0 ? 3 : d);
  }
  const north = new Image(TILE, TILE);
  for (let x = 0; x < TILE; x++) {
    for (let y = 0; y < depth[x]!; y++) north.set(x, y, y === depth[x]! - 1 ? c.dark : source.get(x, y));
  }

  // The corner piece is a quarter disc in the north-west corner.
  const corner = new Image(TILE, TILE);
  const r = 4.6;
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const dist = Math.hypot(x + 0.5, y + 0.5);
      if (dist < r) corner.set(x, y, dist > r - 1.2 ? c.dark : source.get(x, y));
    }
  }

  return [
    ...EDGE_SIDES.map((side, turns) => ({ name: `edge/${name}/${side}`, image: rotateTimes(north, turns) })),
    ...EDGE_CORNERS.map((side, turns) => ({ name: `edge/${name}/${side}`, image: rotateTimes(corner, turns) })),
  ];
}

// ---------------------------------------------------------------- props: trees and rocks

/** Size of the tree sprite. Its anchor is the base of the trunk. */
const TREE_W = 32;
const TREE_H = 38;
const TREE_BASE_Y = 34;

function tree(): Image {
  const image = new Image(TREE_W, TREE_H);
  const rand = random(4242);
  shadowEllipse(image, 16, TREE_BASE_Y - 0.5, 10.5, 3.2, 0x50);

  // Trunk: columns 13..18, with a lit left side and a dark right side.
  const bark = [0x2e1c10ff, 0x8a5a34ff, 0x6b4428ff, 0x6b4428ff, 0x4e2f1bff, 0x2e1c10ff];
  for (let y = 21; y < TREE_BASE_Y; y++) {
    bark.forEach((colour, i) => image.set(13 + i, y, colour));
  }
  image.set(12, TREE_BASE_Y - 1, 0x2e1c10ff);
  image.set(19, TREE_BASE_Y - 1, 0x2e1c10ff);
  for (let x = 13; x <= 18; x++) image.set(x, TREE_BASE_Y, 0x2e1c10ff);

  // Canopy: a bumpy disc, lit from the top left, with an outline.
  const cx = 16;
  const cy = 13;
  const inside = (x: number, y: number): boolean => {
    const dx = x + 0.5 - cx;
    const dy = y + 0.5 - cy;
    const angle = Math.atan2(dy, dx);
    const radius = 12.2 + 1.3 * Math.sin(6 * angle + 0.5) + 0.6 * Math.sin(11 * angle + 1.3);
    return Math.hypot(dx, dy) < radius && y < 27;
  };
  const leaves = { highlight: 0x7cc561ff, light: 0x4f9e48ff, base: 0x2f7a3aff, dark: 0x235c2eff, outline: 0x163d22ff };
  for (let y = 0; y < TREE_H; y++) {
    for (let x = 0; x < TREE_W; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      if (edge) {
        image.set(x, y, leaves.outline);
        continue;
      }
      const nx = (x + 0.5 - cx) / 12;
      const ny = (y + 0.5 - cy) / 12;
      // Leaf clumps: a coarse random pattern that moves the light level up or down.
      const clump = (Math.sin(x * 1.7 + Math.cos(y * 1.3) * 2) + Math.sin(y * 1.9 - x * 0.7)) * 0.13;
      const light = -0.55 * nx - 0.75 * ny + clump + (rand() - 0.5) * 0.12;
      const colour =
        light > 0.55 && rand() < 0.7
          ? leaves.highlight
          : light > 0.12
            ? leaves.light
            : light > -0.4
              ? leaves.base
              : leaves.dark;
      image.set(x, y, colour);
    }
  }
  return image;
}

function rock(): Image {
  const image = new Image(TILE, TILE);
  shadowEllipse(image, 8, 14.5, 7, 2, 0x50);
  const cx = 8;
  const cy = 10;
  const inside = (x: number, y: number): boolean => {
    const dx = (x + 0.5 - cx) / 6.4;
    const dy = (y + 0.5 - cy) / 5;
    return dx * dx + dy * dy < 1 && y < 15;
  };
  const stone = { highlight: 0xc3c6ccff, light: 0xa5a9b1ff, base: 0x878c96ff, dark: 0x6a6e78ff, outline: 0x45474fff };
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      const light = -0.6 * ((x + 0.5 - cx) / 6.4) - 0.8 * ((y + 0.5 - cy) / 5);
      image.set(
        x,
        y,
        edge
          ? stone.outline
          : light > 0.6
            ? stone.highlight
            : light > 0.15
              ? stone.light
              : light > -0.45
                ? stone.base
                : stone.dark,
      );
    }
  }
  // A crack.
  image.set(9, 9, stone.dark);
  image.set(10, 10, stone.dark);
  image.set(10, 11, stone.dark);
  return image;
}

// ---------------------------------------------------------------- flat decor

const PLANT = { l: 0x7cc45cff, m: 0x5aa843ff, d: 0x2f6a28ff };
const blank = '................';

const TUFTS: string[][] = [
  [
    blank, blank, blank, blank, blank, blank, blank, blank,
    '.....l...l......',
    '.....l.l.l......',
    '....dl.l.ld.....',
    '.....dlmld......',
    '......ddd.......',
    blank, blank, blank,
  ],
  [
    blank, blank, blank, blank, blank, blank, blank, blank, blank,
    '..........l.....',
    '.........ll.l...',
    '...l.....dlml...',
    '..lml.....ddd...',
    '..ddd...........',
    blank, blank,
  ],
];

const FLOWER_ROWS = [
  blank, blank, blank, blank,
  '..........p.....',
  '....p....pcp....',
  '...pcp....p.....',
  '....p.....g.....',
  '....g.....g.....',
  '....g..p........',
  '......pcp.......',
  '.......p........',
  '.......g........',
  blank, blank, blank,
];

const FLOWER_COLOURS: Record<string, number> = {
  red: 0xe04848ff,
  yellow: 0xf2d14bff,
  white: 0xf4f1e8ff,
  blue: 0x6f8ff0ff,
};

const PEBBLE_ROWS = [
  blank, blank, blank, blank, blank, blank, blank, blank, blank,
  '..........nn....',
  '....nn....NNk...',
  '...nNNk...kk....',
  '....kk..........',
  '........nk......',
  blank, blank,
];
const PEBBLE_PALETTE = { n: 0xb8b2a6ff, N: 0x958f84ff, k: 0x5e5a52ff };

// ---------------------------------------------------------------- player

const PLAYER_PALETTE = {
  k: 0x23202eff, // outline and eyes
  h: 0x6b3f24ff, // hair
  H: 0x8f5a32ff, // hair highlight
  s: 0xf3c39cff, // skin
  S: 0xd99a76ff, // skin shade
  t: 0x3b78c9ff, // tunic
  L: 0x5d97e3ff, // tunic light
  T: 0x2a5796ff, // tunic shade and arms
  b: 0x5e3b22ff, // belt
  B: 0xe8c25aff, // buckle
  p: 0x4a4560ff, // trousers
  o: 0x5a3a24ff, // boots
};

const PLAYER_DOWN = [
  '................',
  '.....kkkkkk.....',
  '....kHHhhhhk....',
  '...kHhhhhhhhk...',
  '...khhhhhhhhk...',
  '...khsshhsshk...',
  '...khsssssshk...',
  '...kssksskssk...',
  '....kSssssSk....',
  '...kkttttttkk...',
  '...kTtLttLtTk...',
  '...kTttttttTk...',
  '...ksbbBBbbsk...',
  '....kppppppk....',
  '....kppkkppk....',
  '....koo..ook....',
];

const PLAYER_UP = [
  '................',
  '.....kkkkkk.....',
  '....khhhhhhk....',
  '...khhHHhhhhk...',
  '...khHhhhhhhk...',
  '...khhhhhhhhk...',
  '...khhhhhhhhk...',
  '...kshhhhhhsk...',
  '....khhhhhhk....',
  '...kkttttttkk...',
  '...kTttttttTk...',
  '...kTttttttTk...',
  '...ksbbbbbbsk...',
  '....kppppppk....',
  '....kppkkppk....',
  '....koo..ook....',
];

/** Facing right. The left-facing frames are the same sprite, flipped at render time. */
const PLAYER_SIDE = [
  '................',
  '.....kkkkk......',
  '....kHHhhhk.....',
  '...kHhhhhhhk....',
  '...khhhhhhhk....',
  '...khhhhhssk....',
  '...khhhSsssk....',
  '...khhhsskssk...',
  '....khhssssk....',
  '....kttttLk.....',
  '....ktTTttk.....',
  '....ktTTttk.....',
  '....kbssbbk.....',
  '....kpppppk.....',
  '....kpppppk.....',
  '....kooooook....',
];

// Walk frames for the front and back views: one foot lifted, then the other.
const FRONT_STEP_LEFT = { 14: '....kppkkook....', 15: '....kook.kkk....' };
const FRONT_STEP_RIGHT = { 14: '....kookkppk....', 15: '....kkk.kook....' };
// Side view: a stride, with the arm swung back, then forward.
const SIDE_STRIDE = { 14: '...kppk.kppk....', 15: '..kook...kook...' };
const SIDE_ARM_BACK = { 10: '....kTTtttk.....', 11: '....kTTtttk.....', 12: '....kssbbbk.....' };
const SIDE_ARM_FORWARD = { 10: '....kttTTtk.....', 11: '....kttTTtk.....', 12: '....kbbssbk.....' };

function playerFrames(): Frame[] {
  const anchor = { x: 0.5, y: 1 };
  const frame = (name: string, rows: string[]): Frame => ({ name, image: grid(rows, PLAYER_PALETTE), anchor });
  return [
    frame('player/down/0', PLAYER_DOWN),
    frame('player/down/1', withRows(PLAYER_DOWN, FRONT_STEP_LEFT)),
    frame('player/down/2', withRows(PLAYER_DOWN, FRONT_STEP_RIGHT)),
    frame('player/up/0', PLAYER_UP),
    frame('player/up/1', withRows(PLAYER_UP, FRONT_STEP_LEFT)),
    frame('player/up/2', withRows(PLAYER_UP, FRONT_STEP_RIGHT)),
    frame('player/side/0', PLAYER_SIDE),
    frame('player/side/1', withRows(withRows(PLAYER_SIDE, SIDE_STRIDE), SIDE_ARM_BACK)),
    frame('player/side/2', withRows(withRows(PLAYER_SIDE, SIDE_STRIDE), SIDE_ARM_FORWARD)),
  ];
}

function playerShadow(): Image {
  const image = new Image(12, 4);
  shadowEllipse(image, 6, 2, 6, 2, 0x48);
  return image;
}

// ---------------------------------------------------------------- everything

export function buildArt(): Art {
  const frames: Frame[] = [];
  for (const name of Object.keys(GROUND_COLOURS) as GroundName[]) {
    for (let v = 0; v < GROUND_VARIANTS[name]; v++) frames.push({ name: `ground/${name}/${v}`, image: groundTile(name, v) });
    if (name !== 'water') frames.push(...edgePieces(name));
  }
  TUFTS.forEach((rows, i) => frames.push({ name: `decor/tuft/${i}`, image: grid(rows, PLANT) }));
  for (const [colour, petal] of Object.entries(FLOWER_COLOURS)) {
    frames.push({ name: `decor/flowers/${colour}`, image: grid(FLOWER_ROWS, { p: petal, c: 0xf6c34aff, g: PLANT.d }) });
  }
  frames.push({ name: 'decor/pebbles/0', image: grid(PEBBLE_ROWS, PEBBLE_PALETTE) });
  frames.push({ name: 'prop/tree', image: tree(), anchor: { x: 0.5, y: TREE_BASE_Y / TREE_H } });
  frames.push({ name: 'prop/rock', image: rock(), anchor: { x: 0.5, y: 1 } });
  frames.push(...playerFrames());
  frames.push({ name: 'player/shadow', image: playerShadow(), anchor: { x: 0.5, y: 0.5 } });

  // A walk cycle is: step, stand, other step, stand.
  const walk = (view: string): string[] => [1, 0, 2, 0].map((i) => `player/${view}/${i}`);
  return {
    frames,
    animations: { 'walk/down': walk('down'), 'walk/up': walk('up'), 'walk/side': walk('side') },
  };
}
