/**
 * The map of the prologue (Fede's request, 2026-10-12): Thrain's map of the Central Dominions, after
 * Fede's `mapa_thrain.png` on the Drive (`Images/maps`), in the pixel art of the game. The map is a
 * portrait parchment that lies on a dark table; the view goes down it over the card (`rise`), from
 * Grimhollow in the north to Iron Bay and Auranthia in the south. A candle burns on the table, and an
 * inkwell with a quill stands by the map.
 *
 * The coordinates of the map are those of a 208 x 303 frame over Fede's picture. The names of the
 * places are on two layers of their own, one for each language (`lang`); the Spanish layer has the
 * names of Kandrax, the English one the names of the game (docs/drafts/story-razed-villages.md).
 */
import { Canvas, fbm2, hex, hexes, lerpColour, noise1, rng } from './paint.ts';
import { SMALL_FONT, SMALL_GLYPHS } from './font.ts';
import { PROLOGUE_VIEW, type PrologueScene } from './prologue-kit.ts';

type Point = readonly [number, number];

/** The map frame: Fede's picture at 208 pixels wide. */
const MAP_W = 208;
const MAP_H = 303;
/** Where the map frame lies on the table layer. */
const PAPER_X = 56;
const PAPER_Y = 8;
/** The table layer: the view and the length of the pan. */
const TABLE_W = PROLOGUE_VIEW.w;
const TABLE_H = 320;
const RISE = TABLE_H - PROLOGUE_VIEW.h;
/** The near layer (the candle, the inkwell) rises more: it is nearer to the eye. */
const NEAR_RISE = Math.round(RISE * 1.2);

const INK = hex('#3a2616');
const INK_SOFT = hex('#6a4a2c');
const RED = hex('#8a2a18');
/** The parchment, from its burned edge to its palest. */
const PARCHMENT = hexes('#5a3e22', '#8a6a42', '#a88a5c', '#bea070', '#cfb588', '#dcc69c');
/** The halo round a name: the pale parchment, so that a name reads over hatching and trees. */
const HALO = hex('#d2b98c');

// ---------------------------------------------------------------- the shape of the land

/** The coast, from the north edge of the map down the west and along the south: the land is east of it. */
const COAST: readonly Point[] = [
  [144, -3], [143, 8], [142, 15], [140, 24], [136, 31], [128, 37], [118, 41], [106, 45], [94, 47], [86, 48],
  [80, 49], [76, 51], [73, 55], [71, 61], [71, 70], [70, 80], [68, 88], [64, 92], [61, 97], [61, 103],
  [59, 108], [57, 113], [55, 120], [51, 128], [49, 134], [47, 140], [45, 146], [45, 151], [44, 156], [40, 161],
  [36, 166], [33, 172], [31, 179], [31, 186], [32, 193], [35, 199], [40, 204], [45, 208], [46, 214], [46, 220],
  [45, 227], [45, 234], [46, 240], [49, 246], [54, 251], [60, 255], [66, 259], [73, 263], [80, 266], [90, 268],
  [100, 270], [110, 270], [120, 271], [130, 272], [138, 274], [143, 276], [147, 279], [152, 282], [158, 284], [164, 287],
  [168, 291], [171, 296], [175, 301], [178, 306],
];
/** The land: the coast, closed round the east of the map. */
const LAND: readonly Point[] = [...COAST, [MAP_W + 3, 306], [MAP_W + 3, -3]];

/** Whether the point is inside the polygon (even-odd rule). */
function inside(points: readonly Point[], x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[i]!;
    const [bx, by] = points[j]!;
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) hit = !hit;
  }
  return hit;
}

/** A smooth curve through the points (Catmull-Rom), as points about `step` pixels apart. */
function curve(points: readonly Point[], step = 0.25): Point[] {
  const out: Point[] = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;
    const n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const at = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([at(p0[0], p1[0], p2[0], p3[0]), at(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(points[points.length - 1]!);
  return out;
}

// ---------------------------------------------------------------- what is on the map

/** The rivers: the Vintral, the Argén, and the river of Auranthia. */
const RIVERS: readonly (readonly Point[])[] = [
  [[84, 53], [95, 56], [105, 60], [116, 64], [125, 70], [134, 76], [140, 79], [150, 82], [160, 84], [170, 86], [180, 87], [187, 88]],
  [[188, 199], [175, 201], [160, 201], [145, 201], [132, 203], [118, 207], [104, 210], [92, 209], [80, 207], [70, 208], [60, 210], [52, 213], [47, 215]],
  [[186, 235], [181, 242], [176, 249], [173, 255], [172, 262], [172, 270], [172, 280], [174, 290], [177, 299], [178, 306]],
];

/** The roads: dotted, between the towns (Fede liked them on the first map). */
const ROADS: readonly (readonly Point[])[] = [
  // Navanor to Vibranza, north of the Vintral.
  [[85, 49], [98, 52], [112, 58], [124, 65], [133, 71], [139, 74]],
  // Navanor down the coast to Great Bwini.
  [[79, 55], [77, 70], [76, 85], [72, 100], [66, 116], [58, 132], [50, 146]],
  // Great Bwini to Orris, and on to Saxum.
  [[49, 149], [62, 149], [78, 147], [96, 144], [112, 141], [123, 140]],
  [[127, 138], [131, 134], [134, 131]],
  // Great Bwini down the coast to Iron Bay.
  [[46, 155], [42, 166], [38, 178], [38, 190], [41, 200], [46, 210]],
  // Iron Bay to the shrine in the Céfiro forest, and on to Alfenstein.
  [[51, 219], [62, 221], [76, 222], [92, 220], [104, 218]],
  [[109, 220], [114, 230], [119, 240], [126, 249]],
  // Alfenstein to Branchvale, along the coast to Puerto Eluviano, and on to Auranthia.
  [[126, 254], [117, 260], [107, 266]],
  [[108, 270], [120, 268], [132, 270], [141, 273]],
  [[146, 274], [155, 271], [163, 266], [169, 262]],
  // Vibranza north to Silverhaven and Grimhollow.
  [[142, 75], [148, 62], [155, 48], [162, 34], [169, 22]],
  [[175, 17], [179, 15]],
];

/** The mountains: each peak as its foot (x, y), half width and height. */
type Peak = readonly [number, number, number, number];
function range(points: readonly Point[], seed: number, size: number): Peak[] {
  const rand = rng(seed);
  const out: Peak[] = [];
  for (const [x, y] of curve(points, 5)) {
    if (rand() < 0.3) continue;
    const h = size * (0.45 + rand() * 0.75);
    out.push([Math.round(x + (rand() - 0.5) * 4), Math.round(y + (rand() - 0.5) * 5), Math.round(h * (0.75 + rand() * 0.35)), Math.round(h)]);
    // Now and then a small peak in front of it.
    if (rand() < 0.3) out.push([Math.round(x + (rand() - 0.5) * 6), Math.round(y + 3 + rand() * 3), Math.round(h * 0.4), Math.round(h * 0.45)]);
  }
  return out;
}

/** The town icons. */
type Place = { readonly kind: 'castle' | 'capital' | 'village' | 'diamond' | 'ring'; readonly x: number; readonly y: number };
const PLACES: readonly Place[] = [
  { kind: 'diamond', x: 182, y: 14 },
  { kind: 'village', x: 172, y: 18 },
  { kind: 'castle', x: 81, y: 50 },
  { kind: 'castle', x: 140, y: 77 },
  { kind: 'capital', x: 46, y: 150 },
  { kind: 'ring', x: 136, y: 131 },
  { kind: 'village', x: 125, y: 140 },
  { kind: 'diamond', x: 106, y: 218 },
  { kind: 'diamond', x: 52, y: 212 },
  { kind: 'capital', x: 49, y: 219 },
  { kind: 'village', x: 126, y: 252 },
  { kind: 'village', x: 104, y: 269 },
  { kind: 'diamond', x: 124, y: 264 },
  { kind: 'village', x: 143, y: 275 },
  { kind: 'capital', x: 172, y: 262 },
];

/** A name on the map: its lines, the middle of its first line and its top row. */
type Label = { readonly lines: readonly string[]; readonly x: number; readonly y: number };
const LABELS_ES: readonly Label[] = [
  { lines: ['GRIMHOLLOW'], x: 185, y: 3 },
  { lines: ['SILVERHAVEN'], x: 184, y: 23 },
  { lines: ['NAVANOR'], x: 80, y: 57 },
  { lines: ['VIBRANZA'], x: 136, y: 84 },
  { lines: ['GRAN BWINI'], x: 72, y: 153 },
  { lines: ['SAXUM'], x: 137, y: 122 },
  { lines: ['ORRIS'], x: 125, y: 146 },
  { lines: ['COLUMNAS', 'DE PLATA'], x: 184, y: 128 },
  { lines: ['BOSQUE CEFIRO'], x: 112, y: 194 },
  { lines: ['MONTE TERRAFAR'], x: 180, y: 219 },
  { lines: ['BAHIA DEL', 'HIERRO'], x: 23, y: 206 },
  { lines: ['THALESFERRO'], x: 23, y: 227 },
  { lines: ['ALFENSTEIN'], x: 153, y: 249 },
  { lines: ['BRANCHVALE'], x: 92, y: 258 },
  { lines: ['PUERTO ELUVIANO'], x: 143, y: 282 },
  { lines: ['AURANTHIA'], x: 188, y: 268 },
  { lines: ['MAR APEIRON'], x: 34, y: 275 },
];
const LABELS_EN: readonly Label[] = [
  { lines: ['GRIMHOLLOW'], x: 185, y: 3 },
  { lines: ['SILVERHAVEN'], x: 184, y: 23 },
  { lines: ['NAVANOR'], x: 80, y: 57 },
  { lines: ['VIBRANZA'], x: 136, y: 84 },
  { lines: ['GREAT BWINI'], x: 74, y: 153 },
  { lines: ['SAXUM'], x: 137, y: 122 },
  { lines: ['ORRIS'], x: 125, y: 146 },
  { lines: ['MOUNT TERRAFAR'], x: 180, y: 219 },
  { lines: ['IRON BAY'], x: 23, y: 209 },
  { lines: ['THALESFERRO'], x: 23, y: 227 },
  { lines: ['ALFENSTEIN'], x: 153, y: 249 },
  { lines: ['BRANCHVALE'], x: 92, y: 258 },
  { lines: ['AURANTHIA'], x: 188, y: 268 },
  { lines: ['GREAT SEA', 'APEIRON'], x: 34, y: 271 },
];

// ---------------------------------------------------------------- drawing helpers

/** The width of a name in the small font. */
function textWidth(text: string): number {
  let w = 0;
  for (const ch of text) w += SMALL_GLYPHS[ch]!.split(' ')[0]!.length + SMALL_FONT.spacing;
  return w - SMALL_FONT.spacing;
}

/** Writes a name in the small font on a layer of names: a halo of parchment, then the ink. */
function writeLabel(c: Canvas, label: Label): void {
  const pixels: Point[] = [];
  label.lines.forEach((line, row) => {
    let x = PAPER_X + Math.round(label.x - textWidth(line) / 2);
    const y = PAPER_Y + label.y + row * SMALL_FONT.lineHeight;
    for (const ch of line) {
      const rows = SMALL_GLYPHS[ch]!.split(' ');
      rows.forEach((bits, gy) => {
        for (let gx = 0; gx < bits.length; gx++) if (bits[gx] === '#') pixels.push([x + gx, y + gy]);
      });
      x += rows[0]!.length + SMALL_FONT.spacing;
    }
  });
  for (const [x, y] of pixels) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) c.set(x + dx, y + dy, HALO);
  for (const [x, y] of pixels) c.set(x, y, INK);
}

/** A small picture from a grid of characters: '#' ink, '+' soft ink, 'r' red, 'o' pale parchment, '.' nothing. */
function stamp(c: Canvas, rows: readonly string[], x0: number, y0: number): void {
  const colours: Record<string, number> = { '#': INK, '+': INK_SOFT, r: RED, o: PARCHMENT[5]!, p: PARCHMENT[4]! };
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const colour = colours[row[x]!];
      if (colour !== undefined) c.set(x0 + x, y0 + y, colour);
    }
  });
}

/** A castle: two towers and a gate; a capital flies a red flag. */
const CASTLE = ['#.#.#.#', '#+#+#+#', '#+++++#', '#+#.#+#', '#+#.#+#', '#######'];
const FLAG = ['.rr', '.r.', '.#.'];
/** A village: two huts. */
const VILLAGE = ['..#....', '.#+#.#.', '#+++#+#', '.#.##+#', '.#.#.#.'];
/** A place of note: a diamond in a ring. */
const DIAMOND = ['..#..', '.#o#.', '#o#o#', '.#o#.', '..#..'];
/** A ruin: a broken ring. */
const RING = ['.##.', '#..#', '#...', '.##.'];

/**
 * The ship, drawn in ink as old maps draw them (Fede: "a little more draw-y" than the first one): a
 * square sail that the wind fills, its outline and seams in ink and the parchment through it, shade
 * strokes on the side away from the light; a red pennant; a curved hull with a raised stern, a line
 * of planks and hatching under it; a bowsprit; and strokes of waves. (x0, y0) is its top left.
 */
function ship(c: Canvas, x0: number, y0: number): void {
  const at = (points: readonly Point[]) => points.map(([x, y]) => [x0 + x, y0 + y] as const);
  const outline = (points: readonly Point[], colour: number) => {
    const p = at(points);
    for (let i = 0; i < p.length; i++) c.line(p[i]![0], p[i]![1], p[(i + 1) % p.length]![0], p[(i + 1) % p.length]![1], colour);
  };
  // The sail: taller than it is wide, bellied out to the bow.
  const sail: Point[] = [[6, 4], [18, 4], [20, 7], [20, 12], [18, 16], [12, 15], [6, 16], [5, 12], [5, 7]];
  c.poly(at(sail).map(([x, y]) => [x + 0.5, y + 0.5] as const), (x, y) => (x - x0 > 16 && (x + y) % 2 === 0 ? INK_SOFT : PARCHMENT[5]!));
  outline(sail, INK);
  c.line(x0 + 9, y0 + 5, x0 + 8, y0 + 14, INK_SOFT);
  c.line(x0 + 13, y0 + 5, x0 + 14, y0 + 9, INK_SOFT);
  c.line(x0 + 14, y0 + 10, x0 + 13, y0 + 14, INK_SOFT);
  // The yard, the mast, and the pennant.
  c.line(x0 + 4, y0 + 3, x0 + 20, y0 + 3, INK);
  c.line(x0 + 12, y0, x0 + 12, y0 + 2, INK);
  c.line(x0 + 12, y0 + 16, x0 + 12, y0 + 18, INK);
  c.set(x0 + 13, y0, RED);
  c.set(x0 + 14, y0, RED);
  c.set(x0 + 15, y0 + 1, RED);
  c.set(x0 + 13, y0 + 1, RED);
  // The hull: deep and curved, a raised stern to the left, the bow to the right.
  const hull: Point[] = [[0, 14], [4, 14], [5, 18], [19, 18], [21, 16], [24, 15], [22, 21], [18, 24], [6, 24], [2, 21]];
  c.poly(at(hull).map(([x, y]) => [x + 0.5, y + 0.5] as const), (x, y) => (y - y0 >= 22 && (x + y) % 2 === 0 ? INK_SOFT : PARCHMENT[5]!));
  outline(hull, INK);
  c.line(x0 + 2, y0 + 20, x0 + 22, y0 + 20, INK_SOFT);
  c.line(x0 + 1, y0 + 16, x0 + 4, y0 + 16, INK_SOFT);
  c.set(x0 + 2, y0 + 15, INK);
  // The bowsprit.
  c.line(x0 + 24, y0 + 15, x0 + 27, y0 + 12, INK);
  // The waves.
  for (const [wx, wy] of [[-3, 25], [5, 27], [13, 26], [21, 27], [26, 24]] as const) {
    for (const [dx, dy] of [[0, 0], [1, -1], [2, -1], [3, 0], [4, 0]] as const) c.set(x0 + wx + dx, y0 + wy + dy, dx === 4 ? INK_SOFT : INK);
  }
}

/** The compass rose: north in red. */
const ROSE = [
  '......r......',
  '.....rrr.....',
  '.....rrr.....',
  '....+.r.+....',
  '...+..r..+...',
  '..+...r...+..',
  '.#####o#####.',
  '#.....#.....#',
  '..+...#...+..',
  '...+..#..+...',
  '....+.#.+....',
  '.....###.....',
  '......#......',
];

// ---------------------------------------------------------------- the scene

export function mapScene(): PrologueScene {
  // ---- The land, the sea, and how far each point of the sea is from the land.
  const land = new Uint8Array(MAP_W * MAP_H);
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) land[y * MAP_W + x] = inside(LAND, x + 0.5, y + 0.5) ? 1 : 0;
  const isLand = (x: number, y: number) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H && land[y * MAP_W + x] === 1;
  const far = new Float32Array(MAP_W * MAP_H).fill(Infinity);
  const queue: number[] = [];
  for (let i = 0; i < land.length; i++) {
    if (land[i]) {
      far[i] = 0;
      queue.push(i);
    }
  }
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q]!;
    const x = i % MAP_W;
    const y = (i - x) / MAP_W;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      const j = ny * MAP_W + nx;
      if (far[j]! > far[i]! + 1) {
        far[j] = far[i]! + 1;
        queue.push(j);
      }
    }
  }
  const distance = (x: number, y: number) => far[Math.max(0, Math.min(MAP_H - 1, y)) * MAP_W + Math.max(0, Math.min(MAP_W - 1, x))]!;

  const table = new Canvas(TABLE_W, TABLE_H);
  // ---- The table: dark planks along the map, with grain, gaps and a knot or two.
  const wood = hexes('#0c0603', '#140a05', '#1c0f07', '#26150a', '#321c0e');
  for (let y = 0; y < TABLE_H; y++) {
    for (let x = 0; x < TABLE_W; x++) {
      const plank = Math.floor((x + 7) / 23);
      const grain = noise1(x * 0.9 + plank * 13.1, 301) * 0.5 + fbm2(x / 3, y / 40 + plank * 7, 302, 3) * 0.5;
      const edge = Math.min(Math.abs(x - TABLE_W / 2) / (TABLE_W / 2), 1);
      let t = 0.25 + grain * 0.45 - edge * edge * 0.25 + (plank % 2) * 0.06;
      if ((x + 7) % 23 === 0) t = 0;
      table.set(x, y, Canvas.rampAt(wood, t, x, y));
    }
  }
  // The shadow of the parchment on the table, to the bottom right (the light comes from the top left).
  for (let y = PAPER_Y + 3; y < PAPER_Y + MAP_H + 4; y++) for (let x = PAPER_X + 3; x < PAPER_X + MAP_W + 3; x++) table.mix(x, y, hex('#050302'), 0.7);

  // ---- The parchment: pale land, a darker sea, stains, and a burned edge.
  const paperAt = (x: number, y: number) => {
    const n = fbm2(x / 20, y / 20, 311, 4);
    const stain = fbm2(x / 50, y / 50, 312, 3);
    return { n, stain: stain > 0.64 ? 0.14 : stain > 0.6 ? 0.06 : 0 };
  };
  const paper = new Canvas(MAP_W, MAP_H);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const { n, stain } = paperAt(x, y);
      let t: number;
      if (isLand(x, y)) t = 0.74 + (n - 0.5) * 0.36 - stain;
      else {
        // The sea: darker, and paler near the coast of the south-west, where Fede's map glows.
        const d = distance(x, y);
        const glow = y > 190 ? Math.max(0, 1 - d / 16) * 0.32 : Math.max(0, 1 - d / 5) * 0.12;
        t = 0.4 + (n - 0.5) * 0.3 - stain + glow;
      }
      paper.set(x, y, Canvas.rampAt(PARCHMENT, t, x, y));
    }
  }
  // The pencil strokes of the sea: long, leaning like '/', thicker in patches.
  const strokes = rng(313);
  for (let gy = -12; gy < MAP_H + 12; gy += 2) {
    for (let gx = -8; gx < MAP_W; gx += 2) {
      const x = gx + Math.floor(strokes() * 2);
      const y = gy + Math.floor(strokes() * 2);
      const patch = fbm2(x / 22, y / 14, 314, 3);
      const d = distance(x, y);
      const calm = y > 190 ? Math.max(0, 1 - d / 14) : Math.max(0, 1 - d / 4);
      const density = (patch > 0.58 ? 0.55 : patch > 0.48 ? 0.3 : 0.14) * (1 - calm);
      if (strokes() > density) continue;
      const length = 4 + Math.floor(strokes() * 8);
      const strength = 0.35 + strokes() * 0.35 + (patch > 0.58 ? 0.15 : 0);
      for (let k = 0; k < length; k++) {
        const px = x + Math.floor(k / 2);
        const py = y - k;
        if (px < 0 || py < 0 || px >= MAP_W || py >= MAP_H || isLand(px, py) || distance(px, py) < 2) continue;
        paper.mix(px, py, INK_SOFT, strength * (k === 0 || k === length - 1 ? 0.6 : 1));
      }
    }
  }
  // Small marks of grass on the land, in loose bands.
  const grass = rng(315);
  for (let i = 0; i < 1400; i++) {
    const x = Math.floor(grass() * MAP_W);
    const y = Math.floor(grass() * MAP_H);
    if (!isLand(x, y) || !isLand(x + 3, y) || distance(x, y) > 0 || fbm2(x / 12, y / 5, 316, 2) < 0.55) continue;
    paper.mix(x, y, INK_SOFT, 0.5);
    paper.mix(x + 2, y, INK_SOFT, 0.4);
  }
  // The coast: a line of ink on the edge of the land, and a softer one on the sea side of it.
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const here = isLand(x, y);
      const edge = (nx: number, ny: number) => nx >= 0 && ny >= 0 && nx < MAP_W && ny < MAP_H && isLand(nx, ny) !== here;
      if (!(edge(x - 1, y) || edge(x + 1, y) || edge(x, y - 1) || edge(x, y + 1))) continue;
      if (here) paper.set(x, y, INK);
      else paper.mix(x, y, INK_SOFT, 0.7);
    }
  }
  // The rivers: thin, in the softer ink, and the ground clear round them (no trees on the banks).
  const banks: Point[] = [];
  for (const river of RIVERS) {
    let last = '';
    for (const [x, y] of curve(river)) {
      const key = `${Math.round(x)},${Math.round(y)}`;
      if (key === last) continue;
      last = key;
      paper.set(Math.round(x), Math.round(y), INK_SOFT);
      banks.push([x, y]);
    }
  }
  const nearRiver = (x: number, y: number, r: number) => banks.some(([bx, by]) => Math.abs(bx - x) < r && Math.abs(by - y) < r);
  // The roads: dots of soft ink, two pixels apart.
  for (const road of ROADS) {
    let along = 0;
    let prev: Point | null = null;
    for (const p of curve(road, 0.2)) {
      if (prev) along += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      prev = p;
      if (along >= 2) {
        along -= 2;
        const x = Math.round(p[0]);
        const y = Math.round(p[1]);
        if (isLand(x, y)) paper.set(x, y, INK_SOFT);
      }
    }
  }

  // ---- The forests: small round trees of ink, the lower ones in front.
  const trees: Point[] = [];
  const grove = (cx: number, cy: number, rx: number, ry: number, seed: number, fill: number) => {
    const rand = rng(seed);
    for (let y = cy - ry; y <= cy + ry; y += 4) {
      for (let x = cx - rx + ((y - cy + ry) % 8 === 0 ? 0 : 2); x <= cx + rx; x += 4) {
        const tx = x + Math.floor(rand() * 2);
        const ty = y + Math.floor(rand() * 2);
        const d = Math.hypot((tx - cx) / rx, (ty - cy) / ry);
        const ragged = fbm2(tx / 7, ty / 7, seed + 1, 2) * 0.5;
        if (d > 0.75 + ragged || rand() > fill || fbm2(tx / 5, ty / 5, seed + 2, 2) < 0.27) continue;
        if (!isLand(tx - 1, ty) || !isLand(tx + 2, ty + 3) || distance(tx, ty) > 0) continue;
        // No tree on a river bank, nor on a place (the places in a forest stand in a clearing).
        if (nearRiver(tx + 0.5, ty + 1.5, 3) || PLACES.some((p) => Math.abs(p.x - tx - 1) < 7 && ty - p.y < 5 && p.y - ty < 9)) continue;
        trees.push([tx, ty]);
      }
    }
  };
  grove(154, 15, 13, 12, 321, 0.85);
  grove(60, 141, 12, 7, 322, 0.75);
  grove(57, 220, 10, 12, 323, 0.7);
  grove(115, 211, 32, 52, 324, 0.95);
  trees.sort((p, q) => p[1] - q[1] || p[0] - q[0]);
  for (const [x, y] of trees) {
    // A crown lit from the top left, its shade to the bottom right, and a trunk.
    stamp(paper, ['.++.', '+oo#', '+o+#', '.##.', '..#.'], x - 1, y - 1);
  }
  // ---- The mountains: peaks of ink, the shade to the east hatched; the back ones first.
  const peaks: Peak[] = [
    ...range([[66, 138], [74, 132], [82, 127], [89, 124]], 331, 9),
    ...range([[104, 129], [114, 127], [124, 133], [131, 136], [146, 142], [156, 146], [164, 151], [168, 158], [172, 164]], 332, 10),
    ...range([[178, 158], [186, 161], [194, 162], [202, 166]], 333, 9),
    ...range([[46, 205], [52, 204], [59, 207]], 334, 5),
    // Monte Terrafar: a ring of peaks round one great peak.
    ...range([[172, 205], [176, 196], [184, 190], [194, 192], [202, 198], [205, 208]], 335, 11),
    ...range([[176, 212], [186, 214], [196, 213], [204, 214]], 336, 7),
    [181, 203, 9, 17],
    [197, 205, 9, 18],
    [189, 209, 13, 26],
  ];
  peaks.sort((p, q) => p[1] - q[1]);
  for (const [cx, foot, half, h] of peaks) {
    const top = foot - h;
    // A kink in each slope: a peak is never a clean triangle.
    const kink = (side: number, y: number) => (y > top + h * 0.35 && y < top + h * 0.55 ? side * 0.8 : 0);
    for (let y = top; y <= foot; y++) {
      const w = ((y - top) / h) * half;
      const left = Math.round(cx - w + kink(1, y));
      const right = Math.round(cx + w + kink(1, y));
      for (let x = left; x <= right; x++) {
        // The face to the light keeps the parchment; the face to the east is hatched, more near the top.
        const { n, stain } = paperAt(x, y);
        paper.set(x, y, Canvas.rampAt(PARCHMENT, 0.8 + (n - 0.5) * 0.3 - stain, x, y));
        const shade = (x - cx) / Math.max(1, w);
        if (x > cx && x % 2 === 0 && y < foot - (1 - shade) * h * 0.4) paper.set(x, y, shade > 0.6 && y < top + h * 0.6 ? INK : INK_SOFT);
        else if (x > cx + 1 && shade > 0.5 && (x + y) % 4 === 1) paper.set(x, y, INK_SOFT);
      }
      paper.set(left, y, y > top + 1 ? INK_SOFT : INK);
      paper.set(right, y, INK);
    }
    paper.set(cx, top, INK);
    // The ridge down the middle, and a gully down the shaded face of a big peak.
    if (h > 7) paper.line(cx, top + 1, cx + 1, top + Math.round(h * 0.5), INK);
    if (h > 14) paper.line(cx + 2, top + 4, cx + Math.round(half * 0.5), foot - 2, INK);
  }

  // ---- The places, the ship and the compass rose.
  for (const p of PLACES) {
    if (p.kind === 'castle' || p.kind === 'capital') {
      stamp(paper, CASTLE, p.x - 3, p.y - 5);
      if (p.kind === 'capital') stamp(paper, FLAG, p.x - 4, p.y - 8);
    } else if (p.kind === 'village') stamp(paper, VILLAGE, p.x - 3, p.y - 3);
    else if (p.kind === 'diamond') stamp(paper, DIAMOND, p.x - 2, p.y - 2);
    else stamp(paper, RING, p.x - 2, p.y - 2);
  }
  // Thalesferro, by Iron Bay: a cluster of houses round the factory.
  stamp(paper, ['.#...#.', '#+#.#+#', '#+#+###', '#####+#', '.#+#+#.'], 47, 224);
  ship(paper, 9, 94);
  stamp(paper, ROSE, 18, 22);
  // The N over the rose: the same in both languages.
  stamp(paper, ['#..#', '##.#', '#.##', '#..#', '#..#'], 23, 15);

  // ---- The edge: darker, and burned in places.
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const edge = Math.min(x, MAP_W - 1 - x, y, MAP_H - 1 - y);
      const burn = edge + fbm2(x / 5, y / 5, 341, 2) * 5 - 1;
      if (burn < 1) paper.image.set(x, y, 0);
      else if (burn < 2.2) paper.set(x, y, hex('#1a0e06'));
      else if (burn < 4) paper.set(x, y, lerpColour(PARCHMENT[0]!, paper.get(x, y), 0.4));
      else if (edge < 10) paper.mix(x, y, PARCHMENT[0]!, ((10 - edge) / 10) * 0.35);
    }
  }
  table.image.draw(paper.image, PAPER_X, PAPER_Y);

  // ---- The names, one layer for each language.
  const names = (labels: readonly Label[]) => {
    const c = new Canvas(TABLE_W, TABLE_H);
    for (const label of labels) writeLabel(c, label);
    return c;
  };
  const english = names(LABELS_EN);
  const spanish = names(LABELS_ES);

  // ---- The near layer: the candle on the right, the inkwell and the quill on the left.
  const near = new Canvas(TABLE_W, PROLOGUE_VIEW.h + NEAR_RISE);
  const candleX = 292;
  const wick = 222;
  near.glow(candleX, wick, 130, hex('#ffb060'), 0.2);
  near.glow(candleX, wick, 40, hex('#ffc880'), 0.12);
  // Its shadow on the table, long to the bottom right? No: the candle is the light. The dish's shadow is round under it.
  near.disc(candleX + 1, wick + 31, 11, (x, y, d) => (d > 0.55 ? hex('#050302', 160) : null));
  // A dish of brass, seen from above and in front.
  near.disc(candleX, wick + 30, 10, (x, y, d) => Canvas.rampAt(hexes('#3a2410', '#6a4420', '#a0702c', '#d0a050'), 1 - d * 0.8 + (x < candleX ? 0.15 : -0.2) + (y < wick + 30 ? 0.1 : -0.15), x, y));
  near.disc(candleX, wick + 30, 5, (x, y, d) => Canvas.rampAt(hexes('#2a1a0c', '#4a3018', '#6a4420'), 0.6 - d * 0.5, x, y));
  // The candle: a short stick of wax with drips, lit from the flame on its top.
  for (let y = wick + 4; y < wick + 30; y++) {
    for (let x = candleX - 3; x <= candleX + 3; x++) near.set(x, y, Canvas.rampAt(hexes('#8a7a5e', '#b8a888', '#d8ccae', '#eee4cc'), x < candleX - 1 ? 0.95 : x > candleX + 1 ? 0.25 : 0.65, x, y));
  }
  near.disc(candleX, wick + 4, 3.5, (x, y, d) => Canvas.rampAt(hexes('#c8b898', '#e8dcc0', '#f6eedc'), 1 - d, x, y));
  near.rect(candleX - 2, wick + 5, candleX - 2, wick + 11, hex('#f6eedc'));
  near.rect(candleX + 2, wick + 6, candleX + 2, wick + 15, hex('#a89878'));
  near.rect(candleX, wick + 1, candleX, wick + 3, hex('#1a1008'));
  // The inkwell: a squat bottle of dark glass with a short neck, a shine on it, and a quill that leans to the left.
  const wellX = 30;
  const wellY = 118;
  const glass = hexes('#060508', '#0e0c12', '#1a1720', '#2a2632', '#3e3a48');
  near.disc(wellX + 3, wellY + 12, 8, (x, y, d) => (d > 0.3 ? hex('#050302', 150) : null));
  for (let y = wellY + 2; y <= wellY + 12; y++) {
    // The body: round shoulders, straight sides, a rounded foot.
    const inset = y < wellY + 4 ? wellY + 4 - y : y > wellY + 11 ? 1 : 0;
    for (let x = wellX - 6 + inset; x <= wellX + 6 - inset; x++) near.set(x, y, Canvas.rampAt(glass, 0.75 - ((x - wellX + 6) / 12) * 0.7 + (y < wellY + 4 ? 0.15 : 0), x, y));
  }
  near.rect(wellX - 2, wellY - 1, wellX + 2, wellY + 1, glass[2]!);
  near.rect(wellX - 1, wellY - 1, wellX + 1, wellY - 1, hex('#030204'));
  near.rect(wellX - 4, wellY + 4, wellX - 4, wellY + 8, hex('#6a6878'));
  near.set(wellX - 3, wellY + 3, hex('#8a8898'));
  near.line(wellX, wellY - 1, wellX - 14, wellY - 30, hex('#d8ccb0'));
  for (let k = 0; k < 20; k++) {
    const x = wellX - 4 - k * 0.5;
    const y = wellY - 10 - k;
    const vane = Math.round(Math.sin((k / 20) * Math.PI) * 3);
    for (let v = 1; v <= vane; v++) {
      near.set(Math.round(x) - v, Math.round(y) + Math.floor(v / 2), k % 3 === 0 ? hex('#8a7e6a') : hex('#c8bca0'));
      near.set(Math.round(x) + v, Math.round(y) + Math.floor(v / 2), hex('#6a604e'));
    }
  }

  return {
    id: 'map',
    layers: [
      { image: table.image, depth: 0, rise: RISE },
      { image: english.image, depth: 0, rise: RISE, lang: 'en' },
      { image: spanish.image, depth: 0, rise: RISE, lang: 'es' },
      { image: near.image, depth: 0, rise: NEAR_RISE },
    ],
    emitters: [
      { kind: 'flame', layer: 3, x: candleX - 3, y: wick - 7, w: 6, h: 7, rate: 1, colour: '#ffd070' },
      { kind: 'motes', layer: 3, x: candleX - 90, y: wick - 90, w: 120, h: 130, rate: 2, colour: '#ffe0a0' },
    ],
  };
}
