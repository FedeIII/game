/**
 * The background of the menu (Fede's request, 2026-10-12): Nivalia, a village of the Iron Sovereignty,
 * after Fede's picture on the Drive (`Images/regions/central_dominions/nivalia.png`), painted by code
 * in the pixel art of the game. A valley at sunset: the sun low on the left under dark red clouds,
 * far blue mountains, a river that winds across the plain, forested hills on the right, the village
 * of half-timbered houses in tiers round its church and spire, a path of stones that comes down to
 * the meadow, and two tall trees that frame the picture.
 *
 * One image of 384 x 216 (16:9). The page scales it by whole numbers to cover the screen and crops
 * it in the middle, so the village, the spire and the path stand in the middle third of the width.
 * The light comes from the sun on the left; the picture is darker than the photo, as the game is.
 */
import { Canvas, fbm1, fbm2, hex, hexes, lerpColour, noise1, rng } from './paint.ts';
import type { Image } from './image.ts';
import { streakClouds } from './prologue-kit.ts';
import { bayer } from './raster.ts';

/** The size of the background (pixels of the art). */
export const MENU_ART = { w: 384, h: 216 } as const;

const W = MENU_ART.w;
const H = MENU_ART.h;
/** The sun, low on the left. */
const SUN_X = 100;
const SUN_Y = 72;
/** The far horizon: the foot of the far mountains. */
const HORIZON = 96;

const smooth = (t: number) => {
  const k = Math.max(0, Math.min(1, t));
  return k * k * (3 - 2 * k);
};

/** How near a point is to the sun (1 at the sun, 0 far from it). */
const sunNear = (x: number, y: number, reach = 170) => Math.max(0, 1 - Math.hypot(x - SUN_X, (y - SUN_Y) * 1.6) / reach);

// ---------------------------------------------------------------- colours

const SKY = hexes('#130d1a', '#1f1020', '#321624', '#4c1e28', '#6a2a2a', '#8c3c2c', '#ae5630', '#cc7438', '#e09648', '#ecb866', '#f4d28c');
const CLOUD = hexes('#1c0e18', '#28121c', '#361820', '#461e24', '#582628');
const CLOUD_LIT = hexes('#7a3a2c', '#a24e30', '#c86a38', '#e48c48', '#f4b464');
/** The warm haze of the valley: far things take its colour. */
const HAZE = hex('#b4704c');
/** The haze over the far houses: duller, as they stand against the low sun. */
const DUSK = hex('#5e3e38');
const PLASTER = hexes('#2e221e', '#463428', '#5e4634', '#7a5c42', '#987656', '#b4926a');
const ROOF = hexes('#1e0e0c', '#341812', '#4e2416', '#6c321c', '#8c4424', '#ac5a2c', '#c8763a');
const TIMBER = hex('#1a0f0c');
const STONE = hexes('#1e1618', '#2c2224', '#3e3030', '#54423c', '#6e5848', '#8c7258');
const SLATE = hexes('#161420', '#22202e', '#302c3c', '#463e50', '#64566a');
const LEAF = hexes('#0b0f0a', '#10160c', '#161f10', '#1e2a14', '#2a3618', '#3a451c', '#545a24', '#767030');
const GRASS = hexes('#0c100a', '#121a0e', '#1a2412', '#243016', '#323e1a', '#4a5220', '#6c6a28', '#94843a');
const LAMP = hexes('#c06030', '#f0a050', '#ffd080');

// ---------------------------------------------------------------- the sky

/** The sky: dark wine at the top, gold at the horizon, brightest round the sun; the sun itself. */
function sky(c: Canvas): void {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = Math.min(1, (y / (HORIZON + 6)) ** 1.1 * 0.82 + sunNear(x, y) * 0.42 - (x / W) * 0.08);
      c.set(x, y, Canvas.rampAt(SKY, t, x, y));
    }
  }
  c.glow(SUN_X, SUN_Y, 70, hex('#ffb060'), 0.32);
  c.glow(SUN_X, SUN_Y, 26, hex('#ffe0a0'), 0.55);
  c.disc(SUN_X, SUN_Y, 5.5, (x, y, d) => Canvas.rampAt(hexes('#ffd890', '#fff0c8', '#fffbe8'), 1 - d * 0.9, x, y));
}

/**
 * The great clouds: dark masses that fill the top and the right of the sky. The sun, low behind them,
 * lights their edges and their undersides; the nearer to the sun, the brighter.
 */
function clouds(c: Canvas): void {
  const dense = (x: number, y: number) =>
    fbm2(x / 50, y / 15, 311, 5) * 0.95 + smooth(1 - y / 62) * 0.34 + (x / W) * 0.2 - sunNear(x, y, 110) * 0.45 - smooth((y - 50) / 20) * 0.6;
  const LIMIT = 0.66;
  const inCloud = (x: number, y: number) => dense(x, y) > LIMIT;
  for (let y = 0; y < 80; y++) {
    for (let x = 0; x < W; x++) {
      const d = dense(x, y);
      if (d <= LIMIT) continue;
      // How much cloud lies between the pixel and the sun: the light that reaches it.
      const toSunX = SUN_X - x;
      const toSunY = SUN_Y - y;
      const len = Math.hypot(toSunX, toSunY) || 1;
      let shade = 0;
      for (let k = 1; k <= 6; k++) if (inCloud(x + (toSunX / len) * k * 1.5, y + (toSunY / len) * k * 1.5)) shade++;
      const light = 1 - shade / 6;
      const near = sunNear(x, y, 300);
      const under = !inCloud(x, y + 2);
      if (light > 0.3 || under) {
        c.set(x, y, Canvas.rampAt(CLOUD_LIT, light * (0.35 + near * 0.9) + (under ? 0.12 : 0) - 0.1, x, y));
      } else {
        // Inside: dark, a little warmer near the sun and on the thin parts.
        c.set(x, y, Canvas.rampAt(CLOUD, 0.3 + near * 0.7 + light * 0.6 - (d - LIMIT) * 1.4, x, y));
      }
    }
  }
  // Long thin streaks low over the horizon, lit by the sun.
  streakClouds(c, 312, 60, 92, hex('#5a2a2c'), hex('#f0b068'), SUN_X, SUN_Y, 0.68);
  // A few birds, far away.
  const birds = rng(313);
  for (let i = 0; i < 4; i++) {
    const bx = 120 + Math.floor(birds() * 60);
    const by = 40 + Math.floor(birds() * 26);
    c.set(bx, by, hex('#1c1018'));
    c.set(bx - 1, by - 1, hex('#1c1018'));
    c.set(bx + 1, by - 1, hex('#1c1018'));
  }
}

// ---------------------------------------------------------------- the land

/** The far mountains, blue-grey in the haze; their faces to the sun a little lit. */
function farMountains(c: Canvas): void {
  const top = (x: number) =>
    HORIZON - 3 - fbm1(x / 30, 321, 4) * 7 - Math.max(0, 1 - Math.abs(x - 270) / 70) ** 1.4 * 15 - Math.max(0, 1 - Math.abs(x - 168) / 40) * 5;
  const ramp = hexes('#3a2a3a', '#46323e', '#523a44', '#64464a');
  for (let x = 0; x < W; x++) {
    const t = Math.round(top(x));
    const slope = top(x + 2) - top(x - 2);
    for (let y = t; y < HORIZON + 14; y++) {
      const lit = slope > 0 ? 0.45 : 0.1;
      c.set(x, y, lerpColour(Canvas.rampAt(ramp, lit + (y - t) / 30, x, y), HAZE, 0.25 + sunNear(x, y) * 0.5));
    }
    c.set(x, t, lerpColour(hex('#8a5a52'), HAZE, sunNear(x, t) * 0.6));
  }
}

/**
 * The valley floor, from the far plain to the meadow: fields in the haze, gold where the sun falls on
 * them (the left), darker green under the hills (the right); and the river that winds across it.
 */
function plain(c: Canvas): void {
  const fields = hexes('#141a10', '#1c2414', '#283018', '#363a1e', '#4a4626', '#64562e', '#7e6a38');
  for (let y = HORIZON - 2; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const band = noise1(y * 0.9 + fbm1(x / 40, 331, 2) * 3, 332);
      const sun = smooth(1 - x / 260) * Math.max(0, 1 - (y - HORIZON) / 60);
      const t = 0.62 - (y - HORIZON) / 90 + sun * 0.4 + (band - 0.5) * 0.25;
      c.set(x, y, lerpColour(Canvas.rampAt(fields, t, x, y), HAZE, Math.max(0, 0.45 - (y - HORIZON) / 40) + sunNear(x, y) * 0.25));
    }
  }
  // Hedges and lines of trees across the plain: thin dark strokes.
  const hedges = rng(333);
  for (let i = 0; i < 14; i++) {
    const y = HORIZON + 3 + Math.floor(hedges() * 30);
    const x0 = Math.floor(hedges() * 200);
    const len = 8 + Math.floor(hedges() * 24);
    for (let x = x0; x < x0 + len; x++) if (noise1(x * 0.7, 334 + i) > 0.35) c.mix(x, y, hex('#1e1a14'), 0.55 - (HORIZON + 30 - y) * 0.008);
  }
  // The river: from far in the plain, in loops, towards the village; wider as it comes near.
  const path: [number, number][] = [
    [70, 98],
    [92, 99],
    [112, 101],
    [104, 104],
    [90, 107],
    [96, 111],
    [114, 114],
    [118, 118],
    [104, 122],
    [96, 127],
    [104, 133],
  ];
  for (let i = 0; i + 1 < path.length; i++) {
    const [ax, ay] = path[i]!;
    const [bx, by] = path[i + 1]!;
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
    for (let k = 0; k <= steps; k++) {
      const x = ax + ((bx - ax) * k) / steps;
      const y = ay + ((by - ay) * k) / steps;
      const width = 0.6 + (y - HORIZON) / 22;
      for (let dx = -width; dx <= width; dx += 0.5) {
        c.set(x + dx, y, lerpColour(hex('#f0c27a'), hex('#c48650'), Math.abs(dx) / (width + 0.5)));
      }
      c.set(x - width - 0.5, y + 1, hex('#2a2018'));
    }
  }
}

/** The hills of the right, under a dark forest: crowns of trees, their sides to the sun lit gold. */
function forestHills(c: Canvas): void {
  const top = (x: number) => 112 - smooth((x - 120) / 180) * 26 - fbm1(x / 22, 341, 3) * 5 + Math.max(0, 1 - (x - 100) / 40) * 6;
  const ramp = hexes('#0a0e0c', '#0e140e', '#141a12', '#1a2014');
  for (let x = 110; x < W; x++) {
    const t = Math.round(top(x));
    for (let y = t; y < 140; y++) {
      const fade = smooth((y - 122) / 18);
      if (fade >= 1 || (fade > 0 && fade > bayer(x, y))) continue;
      c.set(x, y, lerpColour(Canvas.rampAt(ramp, 0.6 - (y - t) / 40 + (fbm2(x / 3, y / 3, 342, 2) - 0.5) * 0.5, x, y), hex('#5a3a34'), 0.3 * (1 - (x - 110) / 320)));
    }
  }
  // The crowns: rows of small round tops, nearer rows bigger; each lit on its left.
  const rand = rng(343);
  for (let row = 0; row < 7; row++) {
    for (let x = 112 + (row % 2) * 2; x < W + 4; x += 3 + Math.floor(rand() * 2)) {
      const y = Math.round(top(x)) + 1 + row * 4 + Math.floor(rand() * 2);
      if (y > 140) continue;
      const r = 1.4 + row * 0.25 + rand() * 0.6;
      const haze = 0.3 * (1 - (x - 110) / 320) * (1 - row / 8);
      // The sun reaches the crowns on the near side of the hill, low and from the left.
      const sun = 0.35 + smooth(1 - (x - 110) / 200) * 0.3;
      c.disc(x, y, r, (px, py, d) => {
        const lit = px + 0.5 < x - r * 0.25 && py + 0.5 < y;
        const tone = lit ? sun + (d > 0.6 ? 0.12 : 0) : 0.18 - d * 0.15;
        return lerpColour(Canvas.rampAt(LEAF, tone - row * 0.03, px, py), hex('#5a3a34'), haze);
      });
    }
  }
}

// ---------------------------------------------------------------- the village

/** The roofs: tiles of orange-brown, or of a darker brown. */
const ROOFS = [ROOF, hexes('#1a0c0c', '#2c1410', '#401c14', '#56281a', '#6e3620', '#8a4828', '#a45e34')] as const;

/**
 * The painter of the village: half-timbered houses with very steep roofs of tiles. The sun is low on
 * the left, behind them: the long roof plane that goes back to the left takes its light, and the
 * gables that face the viewer stand in the shade, with warm windows.
 */
class Village {
  readonly c: Canvas;
  readonly rand: () => number;
  /** How much of the warm haze lies on what it paints now (0 near, more far). */
  haze = 0;
  readonly chimneys: [number, number][] = [];

  constructor(c: Canvas, seed: number) {
    this.c = c;
    this.rand = rng(seed);
  }

  set(x: number, y: number, colour: number): void {
    this.c.set(x, y, lerpColour(colour, DUSK, this.haze));
  }

  shade(colour: number): number {
    return lerpColour(colour, DUSK, this.haze);
  }

  /** A window: two pixels high, lit warm or dark; two wide on a big house. */
  window(x: number, y: number, wide: boolean): void {
    const lit = this.rand() < 0.6;
    const top = lit ? LAMP[this.rand() < 0.4 ? 2 : 1]! : hex('#120a0a');
    const low = lit ? LAMP[0]! : hex('#120a0a');
    this.set(x, y, top);
    this.set(x, y + 1, low);
    if (wide) {
      this.set(x + 1, y, top);
      this.set(x + 1, y + 1, low);
    }
  }

  /** A wall of the half-timbered kind: plaster in the tone `tone`, a frame of dark timber, braces. */
  frame(x0: number, x1: number, top: number, base: number, tone: number, lit: number): void {
    for (let y = top; y <= base; y++) for (let x = x0; x <= x1; x++) this.set(x, y, Canvas.rampAt(PLASTER, tone + (x0 < x1 ? ((x1 - x) / (x1 - x0)) * lit : 0), x, y));
    for (let y = top; y <= base; y++) {
      this.set(x0, y, TIMBER);
      this.set(x1, y, TIMBER);
    }
    const floor = top + Math.round((base - top) * 0.48);
    for (let x = x0; x <= x1; x++) {
      this.set(x, top, TIMBER);
      this.set(x, floor, TIMBER);
    }
    for (let x = x0 + 4; x < x1 - 1; x += 4) for (let y = top; y <= base; y++) if (y <= floor || (x - x0) % 8 === 4) this.set(x, y, TIMBER);
    if (x1 - x0 >= 8) {
      this.c.line(x0 + 1, floor - 1, x0 + 3, top + 1, this.shade(TIMBER));
      this.c.line(x1 - 1, floor - 1, x1 - 3, top + 1, this.shade(TIMBER));
    }
  }

  /**
   * A gable house: the gable to the viewer, in the shade; the side wall and the long roof plane go
   * back to the left and up, in the light of the sun.
   */
  gable(x: number, base: number, w: number, wallH: number, depth: number): void {
    const rand = this.rand;
    const roof = ROOFS[rand() < 0.65 ? 0 : 1];
    const top = base - wallH;
    const half = w / 2;
    const roofH = Math.round(w * (0.8 + rand() * 0.3));
    const lift = Math.round(depth * 0.45);
    const apex = x + half;
    // The side wall to the left, back and up: in the sun.
    for (let k = 1; k <= depth; k++) {
      const up = Math.round((k * lift) / depth);
      for (let y = top - up + 1; y <= base - up; y++) this.set(x - k, y, Canvas.rampAt(PLASTER, 0.62 + (k % 4 === 0 ? -0.35 : 0) - (y - top + up) / (wallH * 3), x - k, y));
      this.set(x - k, base - up, TIMBER);
    }
    // The long roof plane over it: tiles in courses along the ridge, lit; the eave in shadow.
    this.c.poly(
      [
        [apex + 0.5, top - roofH],
        [apex + 0.5 - depth, top - roofH - lift],
        [x - depth - 1.5, top - lift + 1.5],
        [x - 1.5, top + 1.5],
      ],
      (px, py) => {
        // How far down the plane, from the ridge (0) to the eave (1).
        const along = (px - (apex - depth)) / Math.max(1, depth + half);
        const down = smooth((py - (top - roofH - lift * (1 - along))) / Math.max(1, roofH));
        const course = (Math.round(py - px * (roofH / Math.max(1, half)) * 0.25) % 3 === 0 ? -0.12 : 0) + (noise1(px * 1.7 + py * 0.3, 353) - 0.5) * 0.15;
        return this.shade(Canvas.rampAt(roof, 0.74 - down * 0.42 + course, px, py));
      },
    );
    // The front wall, in the shade, with its frame.
    this.frame(x, x + w, top, base, 0.12, 0.12);
    // The gable: a triangle of frame under the front edge of the roof.
    this.c.poly(
      [
        [x - 1.5, top + 0.5],
        [apex + 0.5, top - roofH],
        [x + w + 2.5, top + 0.5],
      ],
      (px, py) => {
        const inner = ((py - (top - roofH)) / roofH) * (half + 2) - 1.8;
        const edge = py >= top || Math.abs(px + 0.5 - apex) >= inner;
        if (edge) return this.shade(Canvas.rampAt(roof, px + 0.5 < apex ? 0.62 : 0.2, px, py));
        return this.shade(Canvas.rampAt(PLASTER, 0.16 + ((apex - px) / half) * 0.1, px, py));
      },
    );
    for (let y = top - roofH + 3; y < top; y++) this.set(Math.round(apex), y, TIMBER);
    this.set(Math.round(apex) - 1, top - Math.round(roofH * 0.45), TIMBER);
    this.set(Math.round(apex) + 1, top - Math.round(roofH * 0.45), TIMBER);
    if (wallH >= 7 && rand() < 0.5) this.window(Math.round(apex), top - Math.round(roofH * 0.35), false);
    // Windows, and a door on a big house.
    const wide = w >= 14;
    for (const wy of [top + 2, top + Math.round(wallH * 0.48) + 2]) {
      if (wy >= base - 2) continue;
      for (let wx = x + 2; wx < x + w - 1; wx += wide ? 5 : 4) if (rand() < 0.55) this.window(wx, wy, wide);
    }
    if (w >= 12) {
      const dx = x + Math.round(w * 0.55);
      for (let y = base - 4; y <= base; y++) for (let k = dx; k < dx + 3; k++) this.set(k, y, hex('#120a08'));
      if (rand() < 0.4) this.set(dx + 1, base - 3, LAMP[0]!);
    }
    // A chimney now and then, on the lit plane.
    if (rand() < 0.4) {
      const cx = Math.round(apex - depth * 0.55);
      const cy = top - roofH - Math.round(lift * 0.55) + 3;
      for (let y = cy - 4; y <= cy + 2; y++) for (let k = cx; k <= cx + 1; k++) this.set(k, y, Canvas.rampAt(STONE, k === cx ? 0.75 : 0.3, k, y));
      this.chimneys.push([cx, cy - 5]);
    }
  }

  /** A long house: its long side to the viewer, a steep roof with a hip lit on the left. */
  long(x: number, base: number, w: number, wallH: number): void {
    const rand = this.rand;
    const roof = ROOFS[rand() < 0.5 ? 0 : 1];
    const top = base - wallH;
    const roofH = Math.round(wallH * (1.2 + rand() * 0.4));
    const inset = Math.round(roofH * 0.6);
    this.frame(x, x + w, top, base, 0.16, 0.18);
    this.c.poly(
      [
        [x - 1.5, top + 0.5],
        [x + inset + 0.5, top - roofH],
        [x + w - inset + 0.5, top - roofH],
        [x + w + 2.5, top + 0.5],
      ],
      (px, py) => {
        const hipLeft = px + 0.5 < x + inset * ((top - py) / roofH) + 0.5;
        const hipRight = px + 0.5 > x + w + 1 - inset * ((top - py) / roofH);
        const course = (py % 3 === 0 ? -0.1 : 0) + (noise1(px * 2.1 + py, 354) - 0.5) * 0.15;
        const tone = hipLeft ? 0.85 : hipRight ? 0.12 : 0.42 - (py - top + roofH) / (roofH * 4);
        return this.shade(Canvas.rampAt(roof, tone + course, px, py));
      },
    );
    for (let wx = x + 3; wx < x + w - 2; wx += 5) if (rand() < 0.6) this.window(wx, top + 2, false);
    for (let wx = x + 3; wx < x + w - 2; wx += 5) if (rand() < 0.4) this.window(wx, top + Math.round(wallH * 0.48) + 2, false);
    if (rand() < 0.5) {
      const cx = x + w - inset - 2;
      for (let y = top - roofH + 1; y <= top - roofH + 5; y++) for (let k = cx; k <= cx + 1; k++) this.set(k, y, Canvas.rampAt(STONE, k === cx ? 0.7 : 0.3, k, y));
      this.chimneys.push([cx, top - roofH]);
    }
  }

  /** The church: a long nave, a square tower of stone and a tall spire of slate, lit from the left. */
  church(x: number, base: number): void {
    // The nave, going back to the left.
    this.gable(x + 8, base, 12, 12, 18);
    // The tower.
    const tx0 = x - 2;
    const tx1 = x + 6;
    const ttop = base - 36;
    for (let y = ttop; y <= base; y++) {
      for (let k = tx0; k <= tx1; k++) {
        const joint = y % 3 === 0 || (k + (Math.floor(y / 3) % 2) * 2) % 4 === 0;
        this.set(k, y, Canvas.rampAt(STONE, 0.78 - ((k - tx0) / (tx1 - tx0)) * 0.55 - (joint ? 0.12 : 0), k, y));
      }
    }
    // The belfry: two dark arches; a clock face.
    for (const ax of [tx0 + 2, tx1 - 2]) for (let y = ttop + 3; y <= ttop + 7; y++) this.set(ax, y, hex('#120c0e'));
    this.set(tx0 + 4, ttop + 14, hex('#c8a060'));
    // The spire: a tall cone of slate, its west face lit by the sun.
    const cx = (tx0 + tx1) / 2;
    const spireH = 32;
    this.c.poly(
      [
        [tx0 - 1.5, ttop + 0.5],
        [cx + 0.5, ttop - spireH],
        [tx1 + 2.5, ttop + 0.5],
      ],
      (px, py) => this.shade(Canvas.rampAt(SLATE, px + 0.5 < cx ? 0.9 - (ttop - py) / (spireH * 3) : 0.16, px, py)),
    );
    for (let k = tx0 - 1; k <= tx1 + 1; k++) this.set(k, ttop, STONE[1]!);
    this.set(Math.round(cx), ttop - spireH - 1, hex('#c89850'));
    this.set(Math.round(cx), ttop - spireH - 2, hex('#c89850'));
    this.set(Math.round(cx) - 1, ttop - spireH - 1, hex('#8a6438'));
    this.set(Math.round(cx) + 1, ttop - spireH - 1, hex('#8a6438'));
  }

  /** A slender tower of stone with a short spire (far, at the right of the village). */
  tower(x: number, base: number, h: number): void {
    for (let y = base - h; y <= base; y++) for (let k = x; k <= x + 4; k++) this.set(k, y, Canvas.rampAt(STONE, 0.75 - (k - x) * 0.14 - (y % 3 === 0 ? 0.1 : 0), k, y));
    this.c.poly(
      [
        [x - 1.5, base - h + 0.5],
        [x + 2.5, base - h - 9],
        [x + 6.5, base - h + 0.5],
      ],
      (px, py) => this.shade(Canvas.rampAt(SLATE, px < x + 2 ? 0.75 : 0.2, px, py)),
    );
    this.set(x + 2, base - h + 3, LAMP[1]!);
  }
}

/**
 * The village in tiers, far to near: a loose crowd of houses, smaller and hazier far away, round the
 * church in the middle; the big houses near the path lead the eye down to it.
 */
function village(c: Canvas): [number, number][] {
  const v = new Village(c, 351);
  const rand = rng(352);
  type Plan = { x: number; base: number; w: number; kind: 'gable' | 'long' | 'church' | 'tower' };
  const plans: Plan[] = [];
  // The crowd: rows that go down the slope, each one with gaps and a jitter.
  for (const [base, x0, x1, size] of [
    [114, 138, 320, 6],
    [119, 132, 336, 7],
    [125, 126, 340, 8],
    [131, 118, 344, 9],
    [138, 106, 338, 11],
  ] as const) {
    for (let x = x0 + Math.floor(rand() * 6); x < x1; ) {
      const w = size + Math.floor(rand() * (size / 2 + 2));
      // The church stands in the middle: room round it.
      if (x + w > 176 && x < 206 && base >= 125) {
        x = 206 + Math.floor(rand() * 4);
        continue;
      }
      if (rand() < 0.85) plans.push({ x, base: base + Math.floor(rand() * 3), w, kind: rand() < 0.7 ? 'gable' : 'long' });
      x += w + 3 + Math.floor(rand() * (size * 0.8));
    }
  }
  plans.push({ x: 334, base: 122, w: 5, kind: 'tower' });
  plans.push({ x: 186, base: 134, w: 20, kind: 'church' });
  // The big houses near the path.
  for (const [x, base, w, kind] of [
    [112, 158, 15, 'gable'],
    [138, 162, 17, 'gable'],
    [166, 156, 22, 'long'],
    [214, 160, 16, 'gable'],
    [258, 152, 19, 'gable'],
    [292, 147, 24, 'long'],
  ] as const) plans.push({ x, base, w, kind });
  plans.sort((a, b) => a.base - b.base);
  for (const plan of plans) {
    v.haze = Math.max(0, Math.min(0.6, (152 - plan.base) / 62));
    if (plan.kind === 'church') v.church(plan.x, plan.base);
    else if (plan.kind === 'tower') v.tower(plan.x, plan.base, 20);
    else if (plan.kind === 'long') v.long(plan.x, plan.base, plan.w, Math.round(plan.w * 0.42));
    else v.gable(plan.x, plan.base, plan.w, Math.round(plan.w * 0.62), Math.round(plan.w * (plan.base > 145 ? 0.5 + rand() * 0.3 : 0.3 + rand() * 0.3)));
  }
  return v.chimneys;
}

/** The evening mist in the valley: soft warm bands among the houses, and the smoke of the chimneys. */
function mist(c: Canvas, chimneys: readonly [number, number][]): void {
  for (let y = 108; y < 150; y++) {
    for (let x = 0; x < W; x++) {
      const n = fbm2(x / 38, y / 5, 361, 3);
      const band = Math.max(0, 1 - Math.abs(y - 127) / 20);
      c.mix(x, y, hex('#d89a6a'), Math.max(0, n - 0.42) * band * 0.55);
    }
  }
  for (const [x, y] of chimneys) {
    for (let k = 0; k < 7; k++) c.mix(x + k * 0.8 + 0.5, y - k * 1.5, hex('#8a7068'), 0.35 - k * 0.04);
    c.mix(x + 1, y - 3, hex('#8a7068'), 0.25);
  }
}

// ---------------------------------------------------------------- the meadow and the trees

/** The meadow in front: two slopes, the right one to the sun with flowers; the path of stones between them. */
function meadow(c: Canvas): void {
  const left = (x: number) => 158 + x * 0.06 + fbm1(x / 18, 371, 4) * 9 + Math.max(0, (x - 150) / 60) * 8;
  const right = (x: number) => 196 - smooth((x - 196) / 188) * 50 - fbm1(x / 24, 372, 3) * 4;
  const ground = (x: number) => (x < 196 ? left(x) : Math.min(left(x), right(x)));
  for (let x = 0; x < W; x++) {
    const t = Math.round(ground(x));
    const sunny = x > 196 ? smooth((x - 196) / 60) : 0;
    for (let y = t; y < H; y++) {
      const depth = (y - t) / 50;
      const blade = fbm2(x / 1.6, y / 5, 373, 2);
      const tone = 0.45 + sunny * 0.35 - depth * 0.5 + (blade - 0.5) * 0.5 - (y - 160) / 200;
      c.set(x, y, Canvas.rampAt(GRASS, tone, x, y));
    }
    // The top edge: the grass in the light, tufts that stand up.
    const tuft = noise1(x * 0.9, 374) > 0.55 ? 1 : 0;
    for (let k = 0; k <= tuft; k++) c.set(x, t - k, Canvas.rampAt(GRASS, 0.55 + sunny * 0.4, x, t - k));
  }
  // Blades of grass that the sun catches, and flowers on the right slope.
  const rand = rng(375);
  for (let i = 0; i < 900; i++) {
    const x = Math.floor(rand() * W);
    const top = Math.round(ground(x));
    const y = top + 2 + Math.floor(rand() * (H - top));
    const sunny = x > 196 ? smooth((x - 196) / 60) : 0.15;
    if (rand() < 0.5) c.line(x, y, x + (rand() < 0.5 ? -1 : 1), y - 2 - Math.floor(rand() * 3), Canvas.rampAt(GRASS, 0.5 + sunny * 0.45, x, y));
    if (x > 214 && rand() < 0.22 * sunny) c.set(x, y - 1, rand() < 0.6 ? hex('#e8b848') : hex('#d8783c'));
  }
  // The path of stones: from the bottom, up the slope, to the village.
  const path: [number, number, number][] = [
    [206, 216, 15],
    [200, 204, 12],
    [206, 194, 9],
    [222, 184, 7],
    [236, 174, 5],
    [244, 166, 4],
    [246, 160, 3],
  ];
  for (let i = 0; i + 1 < path.length; i++) {
    const [ax, ay, aw] = path[i]!;
    const [bx, by, bw] = path[i + 1]!;
    for (let y = by; y <= ay; y++) {
      const k = (ay - y) / Math.max(1, ay - by);
      const cx = ax + (bx - ax) * k;
      const half = aw + (bw - aw) * k;
      for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
        const stone = fbm2(x / 2.2, y / 1.6, 376, 2);
        const joint = stone < 0.42;
        const lit = (x - cx) / half < -0.2;
        c.set(x, y, Canvas.rampAt(STONE, joint ? 0.12 : 0.42 + (lit ? 0.25 : 0) + (stone - 0.5) * 0.4 - (216 - y) / 260, x, y));
      }
    }
  }
  // Boulders in the front corners, their tops lit.
  for (const [x, y, rx, ry, seed] of [
    [64, 206, 18, 11, 381],
    [22, 214, 14, 8, 382],
    [342, 200, 16, 10, 383],
  ] as const) {
    for (let py = Math.floor(y - ry); py <= y + ry; py++) {
      for (let px = Math.floor(x - rx); px <= x + rx; px++) {
        const dx = (px + 0.5 - x) / rx;
        const dy = (py + 0.5 - y) / ry;
        const rough = (fbm2(px / 4, py / 4, seed, 2) - 0.5) * 0.35;
        if (dx * dx + dy * dy > 1 + rough) continue;
        const light = -dx * 0.35 - dy * 0.55 + rough;
        c.set(px, py, Canvas.rampAt(STONE, 0.35 + light, px, py));
      }
    }
    // Moss on the top, and the shadow at the foot.
    for (let px = Math.floor(x - rx * 0.7); px <= x + rx * 0.4; px++) if (noise1(px * 0.8, seed) > 0.5) c.set(px, Math.round(y - ry * 0.8 + Math.abs(px - x) * 0.2), GRASS[4]!);
  }
}

/**
 * A tall broadleaf tree: a trunk that forks into branches, and a crown of leafy clumps. The sun from
 * the left lights the left side of each clump; gaps show the sky through the crown.
 */
function tree(c: Canvas, x: number, foot: number, clumps: readonly (readonly [number, number, number])[], seed: number): void {
  // The trunk and its branches to the clumps.
  const bark = hexes('#0e0a08', '#1a120c', '#2a1e14', '#4a3420');
  for (let y = foot - 70; y <= foot; y++) {
    const half = 2 + (y - (foot - 70)) / 30 + (y > foot - 6 ? (y - foot + 6) * 0.6 : 0);
    for (let px = Math.round(x - half); px <= Math.round(x + half); px++) c.set(px, y, Canvas.rampAt(bark, px < x - half * 0.3 ? 0.75 : 0.25, px, y));
  }
  for (const [cx, cy] of clumps) {
    const steps = Math.ceil(Math.hypot(cx - x, cy - (foot - 66)));
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const bx = x + (cx - x) * t + Math.sin(t * 3 + seed) * 2;
      const by = foot - 66 + (cy - (foot - 66)) * t;
      c.set(bx, by, bark[1]!);
      c.set(bx + 1, by, bark[1]!);
    }
  }
  // The clumps of leaves, each with smaller clumps round it, so the crown has a ragged edge.
  const rand = rng(seed + 1);
  const all: [number, number, number][] = [];
  for (const [cx, cy, r] of clumps) {
    all.push([cx, cy, r]);
    for (let k = 0; k < 4; k++) {
      const angle = rand() * Math.PI * 2;
      all.push([cx + Math.cos(angle) * r * 0.95, cy + Math.sin(angle) * r * 0.8, r * (0.35 + rand() * 0.2)]);
    }
  }
  for (const [cx, cy, r] of all) {
    for (let py = Math.floor(cy - r); py <= cy + r; py++) {
      for (let px = Math.floor(cx - r * 1.2); px <= cx + r * 1.2; px++) {
        const dx = (px + 0.5 - cx) / (r * 1.2);
        const dy = (py + 0.5 - cy) / r;
        const leaf = fbm2(px / 2.6, py / 2.6, seed, 3);
        const d = dx * dx + dy * dy;
        if (d > 0.6 + leaf * 0.7) continue;
        if (d > 0.5 && leaf < 0.38) continue;
        const light = -dx * 0.5 - dy * 0.35 + (leaf - 0.5) * 0.9;
        c.set(px, py, Canvas.rampAt(LEAF, 0.35 + light * 0.75, px, py));
      }
    }
  }
}

/** The two trees that frame the picture: a group on the left, one tall tree on the right. */
function trees(c: Canvas): void {
  tree(
    c,
    30,
    196,
    [
      [14, 50, 20],
      [38, 30, 17],
      [50, 60, 13],
      [6, 90, 18],
      [40, 86, 15],
      [62, 112, 12],
      [22, 124, 14],
      [50, 136, 11],
    ],
    391,
  );
  tree(
    c,
    52,
    200,
    [
      [74, 124, 10],
      [64, 148, 9],
    ],
    392,
  );
  tree(
    c,
    362,
    186,
    [
      [350, 16, 18],
      [376, 34, 18],
      [340, 56, 16],
      [372, 74, 17],
      [352, 98, 14],
      [380, 112, 12],
    ],
    393,
  );
}

/** The menu's background: Nivalia at sunset, 384 x 216. */
export function menuBackground(): Image {
  const c = new Canvas(W, H);
  sky(c);
  clouds(c);
  farMountains(c);
  plain(c);
  forestHills(c);
  const chimneys = village(c);
  mist(c, chimneys);
  meadow(c);
  trees(c);
  // A last veil: a little darker at the edges and the bottom, so the menu reads over the middle.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const edge = Math.max(Math.abs(x - W / 2) / (W / 2), 0) ** 3 * 0.35 + Math.max(0, (y - 150) / 66) * 0.25;
      c.mix(x, y, hex('#06040a'), edge);
    }
  }
  return c.image;
}
