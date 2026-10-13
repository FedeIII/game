/**
 * The logo of the game on the main menu (Fede's request, 2026-10-13): "WORLD OF" small, in the pixel
 * font of the game between two rules, over a big "KANDRAX". The letters of KANDRAX are cut by code
 * (vector shapes with wedge serifs; the K and the X are taller), then painted as metal: a face of
 * bronze that holds the sunset of the picture behind the menu (pale gold above a dark horizon line,
 * fire below it), a bevel lit from the top left, a near-black outline, a dark red rim and a red glow
 * that fades out round the letters, and a few glints.
 *
 * The sheet has `MENU_LOGO_FRAMES` frames, one under the other: the first is the logo at rest; the
 * others are a shine that sweeps over the metal from left to right. The page plays them now and then
 * (menu/logo.ts). build.ts writes the sheet (`menu-logo.png`) and its size (`menu-logo.json`: the size
 * of a frame, the number of frames, and `pad`, the room for the glow on each side).
 */
import { Canvas, hex, hexes, lerpColour } from './paint.ts';
import type { Image } from './image.ts';
import { GLYPHS } from './font.ts';
import { bayer } from './raster.ts';

/** The frames of the sheet: the logo at rest, then the shine. */
export const MENU_LOGO_FRAMES = 15;

/** Cap height of the inner letters (A N D R A). */
const CAP = 26;
/** How far the K and the X reach above and below the inner letters. */
const BIG = 4;
/** Room round the letters for the outline and the glow. */
const PAD = 10;
/** The line of "WORLD OF": its glyphs are 7 rows tall. */
const SMALL = 7;
/** Rows between "WORLD OF" and the top of the inner letters. */
const GAP = 4;

type Point = readonly [number, number];
interface Shape {
  readonly points: readonly Point[];
  readonly cut?: boolean;
}

const add = (...points: Point[]): Shape => ({ points });
const cut = (...points: Point[]): Shape => ({ points, cut: true });
const box = (x0: number, y0: number, x1: number, y1: number): Shape => add([x0, y0], [x1, y0], [x1, y1], [x0, y1]);
/** A slanted stroke: its top edge from tx0 to tx1 at y0, its bottom edge from bx0 to bx1 at y1. */
const stroke = (tx0: number, tx1: number, y0: number, bx0: number, bx1: number, y1: number): Shape => add([tx0, y0], [tx1, y0], [bx1, y1], [bx0, y1]);
/** Half of an ellipse (the right side), as a polygon. */
function halfEllipse(cx: number, cy: number, rx: number, ry: number, hole = false): Shape {
  const points: Point[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / 24;
    points.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return hole ? { points, cut: true } : { points };
}
/** A wedge serif under a stem from x0 to x1 that stands on the line y: it flares out to two points. */
const footSerif = (x0: number, x1: number, y: number, left = 3, right = 3): Shape => add([x0 - left, y], [x1 + right, y], [x1, y - 3.5], [x0, y - 3.5]);
/** A wedge serif on the top of a stem from x0 to x1 that hangs from the line y. */
const headSerif = (x0: number, x1: number, y: number, left = 3, right = 3): Shape => add([x0 - left, y], [x1 + right, y], [x1, y + 3.5], [x0, y + 3.5]);

/** The pixel in the middle of the bar of an A, where a ruby sits. */
const AGEM: Point = [10, 17];

/**
 * The letters of KANDRAX. y 0 is the top of the inner letters and CAP their foot; the K and the X
 * reach BIG further each way. A thick stroke is 5 pixels, a thin one 2 to 3.
 */
const LETTERS: Record<string, () => Shape[]> = {
  K: () => {
    const top = -BIG;
    const foot = CAP + BIG;
    const join = CAP * 0.5;
    return [
      box(0, top, 5.5, foot),
      headSerif(0, 5.5, top),
      footSerif(0, 5.5, foot),
      // The arm: thin, up to a long spike.
      stroke(17, 20.5, top, 5.5, 9, join + 3),
      add([15, top], [23, top], [19, top + 3.5]),
      // The leg: thick, from the arm down to a flared foot.
      stroke(6, 11.5, join - 3, 16, 22, foot),
      footSerif(16, 22, foot, 2, 3),
    ];
  },
  A: () => [
    // The thin leg and the thick leg meet in a spike over the cap line.
    stroke(9, 11.5, 0, 1, 3.5, CAP),
    stroke(9, 14.5, 0, 16, 21.5, CAP),
    add([9, 0.5], [14.5, 0.5], [11.25, -3.5]),
    box(3, 16, 18, 18.5),
    // The setting of the ruby (GEM) in the middle of the bar.
    add([AGEM[0] - 3.5, AGEM[1] + 0.5], [AGEM[0] + 0.5, AGEM[1] - 3.5], [AGEM[0] + 4.5, AGEM[1] + 0.5], [AGEM[0] + 0.5, AGEM[1] + 4.5]),
    footSerif(1, 3.5, CAP, 3, 2),
    footSerif(16, 21.5, CAP, 2, 3),
  ],
  N: () => [
    box(0, 0, 2.5, CAP),
    box(15, 0, 17.5, CAP),
    stroke(0, 5.5, 0, 12, 17.5, CAP),
    headSerif(0, 5.5, 0, 3, 0),
    footSerif(0, 2.5, CAP),
    headSerif(15, 17.5, 0),
  ],
  D: () => [
    box(0, 0, 5.5, CAP),
    headSerif(0, 5.5, 0, 3, 0),
    footSerif(0, 5.5, CAP, 3, 0),
    box(5.5, 0, 8, 3),
    box(5.5, CAP - 3, 8, CAP),
    halfEllipse(8, CAP / 2, 11.5, CAP / 2),
    halfEllipse(8, CAP / 2, 6, CAP / 2 - 3, true),
  ],
  R: () => {
    const bowl = 14;
    return [
      box(0, 0, 5.5, CAP),
      headSerif(0, 5.5, 0, 3, 0),
      footSerif(0, 5.5, CAP),
      box(5.5, 0, 8, 2.5),
      box(5.5, bowl - 2.5, 8, bowl),
      halfEllipse(8, bowl / 2, 10, bowl / 2),
      halfEllipse(8, bowl / 2, 5.5, bowl / 2 - 2.5, true),
      // The leg, thick, with a kick at its foot.
      stroke(8, 13, bowl - 1.5, 14.5, 20, CAP),
      footSerif(14.5, 20, CAP, 1, 3),
    ];
  },
  X: () => {
    const top = -BIG;
    const foot = CAP + BIG;
    return [
      stroke(0, 5.5, top, 15, 20.5, foot),
      stroke(16.5, 19.5, top, 1, 4, foot),
      headSerif(0, 5.5, top),
      footSerif(15, 20.5, foot),
      headSerif(16.5, 19.5, top),
      footSerif(1, 4, foot),
    ];
  },
};

const WORD = 'KANDRAX';
/** Columns between two letters of KANDRAX. */
const KERN = 2;

/** True if the point is in the polygon (even-odd rule). */
function inside(points: readonly Point[], x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[i]!;
    const [bx, by] = points[j]!;
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) hit = !hit;
  }
  return hit;
}

/** A mask of pixels: the shapes, sampled at the middle of each pixel. */
class Mask {
  readonly w: number;
  readonly h: number;
  readonly on: Uint8Array;
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.on = new Uint8Array(w * h);
  }
  at(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.on[y * this.w + x] === 1;
  }
  set(x: number, y: number): void {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.on[y * this.w + x] = 1;
  }
  /** Draws the shapes with their origin at (ox, oy): first all that add, then all that cut. */
  draw(shapes: readonly Shape[], ox: number, oy: number): void {
    const local = new Mask(this.w, this.h);
    for (const pass of [false, true]) {
      for (const shape of shapes) {
        if (Boolean(shape.cut) !== pass) continue;
        const xs = shape.points.map(([x]) => x + ox);
        const ys = shape.points.map(([, y]) => y + oy);
        for (let y = Math.max(0, Math.floor(Math.min(...ys))); y <= Math.min(this.h - 1, Math.ceil(Math.max(...ys))); y++) {
          for (let x = Math.max(0, Math.floor(Math.min(...xs))); x <= Math.min(this.w - 1, Math.ceil(Math.max(...xs))); x++) {
            if (!inside(shape.points, x + 0.5 - ox, y + 0.5 - oy)) continue;
            if (pass) local.on[y * this.w + x] = 0;
            else local.set(x, y);
          }
        }
      }
    }
    for (let i = 0; i < local.on.length; i++) if (local.on[i]) this.on[i] = 1;
  }
}

/** The columns of a letter's pixels from its origin (its serifs can reach left of it). */
function extent(shapes: readonly Shape[]): [number, number] {
  const probe = new Mask(80, 60);
  probe.draw(shapes, 20, 15);
  let lo = Infinity;
  let hi = -Infinity;
  for (let y = 0; y < probe.h; y++) {
    for (let x = 0; x < probe.w; x++) {
      if (!probe.at(x, y)) continue;
      lo = Math.min(lo, x - 20);
      hi = Math.max(hi, x - 20);
    }
  }
  return [lo, hi];
}

/** The glyphs of "WORLD OF" from the game's font, letter-spaced. */
const TITLE_SMALL = 'WORLD OF';
const SMALL_SPACING = 3;

function smallWidth(): number {
  let w = 0;
  for (const ch of TITLE_SMALL) w += GLYPHS[ch]!.split(' ')[0]!.length + SMALL_SPACING;
  return w - SMALL_SPACING;
}

function drawSmall(mask: Mask, ox: number, oy: number): void {
  let x = ox;
  for (const ch of TITLE_SMALL) {
    const rows = GLYPHS[ch]!.split(' ');
    rows.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) if (row[rx] === '#') mask.set(x + rx, oy + ry);
    });
    x += rows[0]!.length + SMALL_SPACING;
  }
}

// ---------------------------------------------------------------- colours

/** The metal of KANDRAX from its top to its foot: pale gold, gold, a dark horizon, then the fire of the sunset. */
const FACE: readonly (readonly [number, number])[] = [
  [0.0, hex('#fff4cc')],
  [0.16, hex('#f6d98a')],
  [0.34, hex('#dcaa52')],
  [0.5, hex('#9a6426')],
  [0.505, hex('#2a1008')],
  [0.56, hex('#2a1008')],
  [0.565, hex('#5a1a0e')],
  [0.7, hex('#9a2c16')],
  [0.84, hex('#d4562a')],
  [0.93, hex('#f08a3c')],
  [1.0, hex('#a83a1c')],
];
/** The metal of "WORLD OF" and the rules: steel, pale above. */
const STEEL = hexes('#f4efe2', '#d8d2c4', '#aeaab0', '#86848e');
const LIT = hex('#fff8dc');
const SHADE = hex('#2a0e08');
const OUTLINE = hex('#140806');
const RIM = hex('#5c1410');
const GLOW = hex('#b02a1c');
const SHINE = hex('#fffbea');
const HALO = hex('#0a0406');
/** The ruby: lit, middle, dark, darkest. */
const GEM = hexes('#ff8a74', '#d8282a', '#8a1018', '#3c0408');

/** The colour of the face at t (0 the top of the inner letters, 1 their foot), dithered between the stops. */
function faceAt(t: number, x: number, y: number): number {
  const k = Math.max(0, Math.min(1, t));
  for (let i = 1; i < FACE.length; i++) {
    const [t1, c1] = FACE[i]!;
    const [t0, c0] = FACE[i - 1]!;
    if (k > t1) continue;
    const share = (k - t0) / Math.max(1e-6, t1 - t0);
    // Two steps between stops, dithered: the pixel-art way to grade a colour.
    const step = Math.min(2, Math.floor(share * 2 + bayer(x, y)));
    return lerpColour(c0, c1, step / 2);
  }
  return FACE[FACE.length - 1]![1];
}

/** Distance (in pixels, 8 ways) from each pixel of the mask to the nearest pixel outside it, up to `max`. */
function depth(mask: Mask, max: number): Uint8Array {
  const d = new Uint8Array(mask.w * mask.h);
  for (let i = 0; i < d.length; i++) d[i] = mask.on[i] ? max : 0;
  for (let pass = 1; pass < max; pass++) {
    for (let y = 0; y < mask.h; y++) {
      for (let x = 0; x < mask.w; x++) {
        const i = y * mask.w + x;
        if (d[i]! <= pass) continue;
        let near = Infinity;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) near = Math.min(near, mask.at(x + dx, y + dy) ? d[(y + dy) * mask.w + x + dx]! : 0);
        if (near < pass) d[i] = pass;
      }
    }
  }
  return d;
}

/** The logo sheet: `MENU_LOGO_FRAMES` frames of the logo, one under the other. */
export function menuLogo(): { image: Image; width: number; height: number; frames: number; pad: number } {
  // The letters of KANDRAX side by side, each by its own extent.
  const letters = [...WORD].map((ch) => LETTERS[ch]!());
  const extents = letters.map(extent);
  const wordWidth = extents.reduce((sum, [lo, hi]) => sum + hi - lo + 1, 0) + KERN * (letters.length - 1);
  const W = wordWidth + 2 * PAD;
  const top = PAD + SMALL + GAP + BIG;
  const H = top + CAP + BIG + PAD;

  // The origin of each letter: its shapes are drawn from there.
  const origins: number[] = [];
  const big = new Mask(W, H);
  let x = PAD;
  letters.forEach((shapes, i) => {
    const [lo, hi] = extents[i]!;
    origins.push(x - lo);
    big.draw(shapes, x - lo, top);
    x += hi - lo + 1 + KERN;
  });

  // "WORLD OF" in the middle over the word, and a rule on each side of it, with a diamond at each end.
  const small = new Mask(W, H);
  const sw = smallWidth();
  const sx = Math.round((W - sw) / 2);
  const sy = PAD;
  drawSmall(small, sx, sy);
  const ruleY = sy + 3;
  const diamond = (cx: number, cy: number, r: number) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r + Math.abs(dy); dx <= r - Math.abs(dy); dx++) small.set(cx + dx, cy + dy);
  };
  const ruleIn = 6;
  const ruleOut = PAD + 14;
  for (let rx = ruleOut; rx <= sx - ruleIn; rx++) small.set(rx, ruleY);
  for (let rx = sx + sw - 1 + ruleIn; rx <= W - 1 - ruleOut; rx++) small.set(rx, ruleY);
  diamond(sx - ruleIn + 2, ruleY, 2);
  diamond(sx + sw - 1 + ruleIn - 2, ruleY, 2);
  diamond(ruleOut - 2, ruleY, 1);
  diamond(W - 1 - ruleOut + 2, ruleY, 1);

  const all = new Mask(W, H);
  for (let i = 0; i < all.on.length; i++) all.on[i] = big.on[i]! | small.on[i]!;

  // The rings round the letters: how far each pixel outside is from the nearest letter pixel.
  const reach = 9;
  const far = new Float32Array(W * H).fill(Infinity);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!all.at(x, y)) continue;
      for (let dy = -reach; dy <= reach; dy++) {
        for (let dx = -reach; dx <= reach; dx++) {
          const i = (y + dy) * W + x + dx;
          if (x + dx < 0 || y + dy < 0 || x + dx >= W || y + dy >= H) continue;
          far[i] = Math.min(far[i]!, Math.hypot(dx, dy));
        }
      }
    }
  }

  const base = new Canvas(W, H);
  // The glow: red, in steps, fading out. Inside it, a dark halo, so that the letters stand out from the sky.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = far[y * W + x]!;
      if (d === 0 || d > reach) continue;
      const k = Math.ceil((1 - d / reach) * 5) / 5;
      base.mix(x, y, GLOW, 0.55 * k * k);
      if (d < 5) base.mix(x, y, HALO, 0.5 * Math.ceil((1 - d / 5) * 3) / 3);
    }
  }
  // The shadow: the letters again, three pixels down and two right, dark.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (all.at(x - 2, y - 3)) base.mix(x, y, HALO, 0.8);
  // The dark red rim, then the near-black outline.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = far[y * W + x]!;
      if (d > 0 && d < 2.3) base.set(x, y, d < 1.5 ? OUTLINE : RIM);
    }
  }

  // The metal of KANDRAX: the face, and a bevel from the depth of each pixel.
  const deep = depth(big, 3);
  const h = (x: number, y: number) => (big.at(x, y) ? deep[y * W + x]! : 0);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!big.at(x, y)) continue;
      let c = faceAt((y - top) / CAP, x, y);
      // Light from the top left: the edges that face it are bright, the others dark.
      const slope = h(x + 1, y) + h(x, y + 1) + h(x + 1, y + 1) - h(x - 1, y) - h(x, y - 1) - h(x - 1, y - 1);
      // Two pixels of bevel: the outer one strong, the inner one soft.
      const at = deep[y * W + x]!;
      if (at === 1 && slope > 0) c = lerpColour(c, LIT, 0.65);
      else if (at === 1 && slope < 0) c = lerpColour(c, SHADE, 0.7);
      else if (at === 2 && slope > 1) c = lerpColour(c, LIT, 0.25);
      else if (at === 2 && slope < -1) c = lerpColour(c, SHADE, 0.3);
      base.set(x, y, c);
    }
  }
  // The rubies in the bars of the A's: a diamond of red, lit from the top left, with a spark.
  const ruby = (cx: number, cy: number) => {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2 + Math.abs(dy); dx <= 2 - Math.abs(dy); dx++) {
        const lit = -(dx + dy);
        base.set(cx + dx, cy + dy, lit >= 2 ? GEM[0]! : lit >= 0 ? GEM[1]! : lit >= -1 ? GEM[2]! : GEM[3]!);
      }
    }
    base.set(cx - 1, cy - 1, SHINE);
  };
  // The steel of "WORLD OF" and the rules: pale above, a bright top edge.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!small.at(x, y)) continue;
      const t = (y - sy) / (SMALL - 1);
      let c = Canvas.rampAt(STEEL, t, x, y);
      if (!small.at(x, y - 1)) c = lerpColour(c, LIT, 0.5);
      base.set(x, y, c);
    }
  }
  // Glints: small stars of light on the upper left of the metal.
  const glint = (gx: number, gy: number, r: number) => {
    base.set(gx, gy, SHINE);
    for (let k = 1; k <= r; k++) {
      const share = 1 - k / (r + 1);
      for (const [dx, dy] of [
        [k, 0],
        [-k, 0],
        [0, k],
        [0, -k],
      ] as const) {
        base.mix(gx + dx, gy + dy, SHINE, 0.95 * share);
      }
    }
  };
  // Glints on the top of the K, on the spike of the first A and on the head of the X; a ruby in each A.
  const glints: [number, number, number][] = [];
  [...WORD].forEach((ch, i) => {
    const ox = origins[i]!;
    if (ch === 'K') glints.push([ox + 1, top - BIG + 1, 3]);
    if (ch === 'A' && i === 1) glints.push([ox + 11, top - 2, 4]);
    if (ch === 'X') glints.push([ox + 18, top - BIG + 1, 2]);
    if (ch === 'A') ruby(ox + AGEM[0], top + AGEM[1]);
  });
  for (const [px, py, r] of glints) glint(px, py, r);

  // The sheet: the logo at rest, then the shine, a slanted band of light that crosses the metal.
  const sheet = new Canvas(W, H * MENU_LOGO_FRAMES);
  for (let f = 0; f < MENU_LOGO_FRAMES; f++) {
    const centre = f === 0 ? -Infinity : -12 + ((W + 36) * (f - 1)) / (MENU_LOGO_FRAMES - 2);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let c = base.get(x, y);
        if (all.at(x, y)) {
          // A slanted band: three pixels of strong light, and one of soft light on each side.
          const u = Math.abs(x + (y - H / 2) * 0.6 - centre);
          if (u < 1.5) c = lerpColour(c, SHINE, 0.8);
          else if (u < 3) c = lerpColour(c, SHINE, 0.4);
        }
        if (c !== 0) sheet.image.set(x, f * H + y, c);
      }
    }
  }
  return { image: sheet.image, width: W, height: H, frames: MENU_LOGO_FRAMES, pad: PAD };
}
