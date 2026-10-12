/**
 * The scenes of the prologue (ui/prologue.ts; Fede's request, 2026-10-12): pixel-art paintings of
 * Kandrax, made at build time at 320 x 180 pixels. Each scene is a few layers, from the sky to the
 * nearest things; the page moves the nearer layers more than the far ones (parallax) and adds what
 * moves (stars that twinkle, smoke, embers, fireflies, motes of light) at the points that the scene
 * gives (`emitters`). The build packs them into an atlas of their own (src/generated/prologue.png),
 * which the page loads only when the prologue plays.
 */
import { Canvas, compose, fbm1, fbm2, hex, hexes, lerpColour, noise1, rng } from './paint.ts';
import type { Image } from './image.ts';

/** The view of the prologue (pixels of the art). */
export const PROLOGUE_VIEW = { w: 320, h: 180 } as const;
/** The width of a layer that moves: the view and room for the parallax. */
const WIDE = 384;

/** Something that moves on a layer: the page makes its particles in the box (x, y, w, h). */
export interface PrologueEmitter {
  readonly kind: 'twinkle' | 'smoke' | 'embers' | 'fireflies' | 'motes' | 'sparkles' | 'flame' | 'birds' | 'mist';
  /** The index of the layer that it moves with. */
  readonly layer: number;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** About how many particles a second (or, for twinkle, how many stars). */
  readonly rate: number;
  /** Its colour, as '#rrggbb'. */
  readonly colour: string;
}

export interface PrologueLayer {
  readonly image: Image;
  /** How much it moves with the pan: 0 does not move, 1 moves the most. */
  readonly depth: number;
}

export interface PrologueScene {
  readonly id: string;
  readonly layers: readonly PrologueLayer[];
  readonly emitters: readonly PrologueEmitter[];
}

const H = PROLOGUE_VIEW.h;

// ---------------------------------------------------------------- shared pieces

/** Stars on a night sky: dim pixels, some brighter, a few with a cross. Returns the bright ones (they twinkle). */
function stars(c: Canvas, seed: number, count: number, maxY: number): void {
  const rand = rng(seed);
  const tones = hexes('#5a6280', '#8890b0', '#b8c0d8', '#e8ecff', '#fff3d8');
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rand() * c.w);
    const y = Math.floor(rand() * rand() * maxY);
    const v = rand();
    const tone = tones[v < 0.6 ? 0 : v < 0.85 ? 1 : v < 0.95 ? 2 : v < 0.99 ? 3 : 4]!;
    c.set(x, y, tone);
    if (v > 0.985) {
      c.mix(x - 1, y, tone, 0.5);
      c.mix(x + 1, y, tone, 0.5);
      c.mix(x, y - 1, tone, 0.5);
      c.mix(x, y + 1, tone, 0.5);
    }
  }
}

/** The moon: a disc with craters and a dark side to the lower left, and a halo. */
function moon(c: Canvas, cx: number, cy: number, radius: number, seed: number): void {
  c.glow(cx, cy, radius * 3.2, hex('#7f90c0'), 0.28);
  c.glow(cx, cy, radius * 1.7, hex('#c8d2ea'), 0.25);
  const lit = hexes('#7c8098', '#a4a6b8', '#c8c6cc', '#e2ddd0', '#f4efe0');
  c.disc(cx, cy, radius, (x, y, d) => {
    const lx = (x + 0.5 - cx) / radius;
    const ly = (y + 0.5 - cy) / radius;
    let t = 0.75 + 0.35 * (lx * 0.6 - ly * 0.4) - 0.25 * d * d;
    const crater = fbm2(x / 4, y / 4, seed, 3);
    if (crater > 0.62) t -= 0.25;
    else if (crater > 0.56) t -= 0.12;
    return Canvas.rampAt(lit, t, x, y);
  });
}

/** A smooth curve of heights: `base` plus fractal noise of `amplitude` (higher noise, higher land). */
function heights(base: number, amplitude: number, scale: number, seed: number, octaves = 4): (x: number) => number {
  return (x) => base - fbm1(x / scale, seed, octaves) * amplitude;
}

/** A sharper mountain range: ridged noise (peaks, not hills). */
function peaks(base: number, amplitude: number, scale: number, seed: number): (x: number) => number {
  return (x) => {
    const n = fbm1(x / scale, seed, 5);
    const ridged = 1 - Math.abs(n * 2 - 1);
    return base - (ridged * ridged * 0.75 + n * 0.25) * amplitude;
  };
}

/**
 * A mountain range from `top`: faces that look to the light (`side`: 1 for a light on the right) are
 * lighter near the top; `ramp` goes from the dark foot to the lit crest. Snow (`snow`) covers what is
 * higher than the row `snowLine`.
 */
function mountains(c: Canvas, top: (x: number) => number, ramp: readonly number[], snow: number | null, snowLine: number, side: number): void {
  for (let x = 0; x < c.w; x++) {
    const t = Math.round(top(x));
    // The slope over a few columns: which way the face looks.
    const slope = (top(x + 2) - top(x - 2)) * side;
    const facing = Math.max(-1, Math.min(1, slope / 3));
    for (let y = Math.max(0, t); y < c.h; y++) {
      const d = y - t;
      // Gullies: darker streaks down the faces.
      const gully = fbm2(x / 3, y / 14, 61, 3);
      const light = (facing * 0.5 + 0.35) * Math.max(0, 1 - d / 40) - (gully > 0.62 ? 0.25 : 0) - d / 90;
      c.set(x, y, Canvas.rampAt(ramp, 0.25 + light, x, y));
    }
    if (snow !== null && t < snowLine) {
      const depth = (snowLine - t) * 0.55;
      for (let y = t; y < t + depth; y++) c.dither(x, y, snow, 1.05 - (y - t) / depth + facing * 0.35 - (fbm2(x / 4, y / 6, 71, 2) > 0.6 ? 0.4 : 0));
    }
  }
}

// ---------------------------------------------------------------- 1. Kandrax: the world at night

function kandrax(): PrologueScene {
  const sky = new Canvas(PROLOGUE_VIEW.w, H);
  sky.vgrad(0, 0, sky.w - 1, H - 1, hexes('#04050b', '#070a16', '#0a0f20', '#0f162c', '#141d38', '#1b2646', '#243154', '#2e3c60'), (t) => t ** 1.3);
  // The band of the sky's river of stars, across, faint.
  for (let y = 0; y < 120; y++) {
    for (let x = 0; x < sky.w; x++) {
      const along = Math.abs((y - 10) - (x - 30) * 0.35) / 22;
      if (along > 1) continue;
      const n = fbm2(x / 18, y / 18, 7, 4);
      sky.mix(x, y, hex('#6c78a8'), (1 - along) * (n - 0.35) * 0.45);
    }
  }
  stars(sky, 11, 420, 140);
  moon(sky, 252, 40, 15, 3);

  const far = new Canvas(WIDE, H);
  const farTop = peaks(106, 60, 46, 21);
  mountains(far, farTop, hexes('#1a2138', '#222b46', '#2d3858', '#3c4a70', '#55658e'), hex('#9fb0d4'), 74, 1);
  // A nearer range, darker, without snow, in front of the far one.
  const range = new Canvas(WIDE, H);
  const rangeTop = peaks(128, 34, 38, 27);
  mountains(range, rangeTop, hexes('#10152a', '#151b31', '#1b233c', '#24304e', '#33416a'), null, 0, 1);

  const mid = new Canvas(WIDE, H);
  // A wide valley: low in the middle, rising to both sides.
  const midTop = (x: number) => 150 - fbm1(x / 50, 33, 4) * 14 + ((x - 200) / 140) ** 2 * 22;
  mid.ridge(midTop, (x, y, d) => Canvas.rampAt(hexes('#1c253c', '#161d31', '#111727', '#0c111c'), Math.min(1, d / 18), x, y), (_x, slope) => (slope > 0.25 ? hex('#3f4e72') : null));
  // The river winds down the valley, and it shines in the moonlight.
  const riverAt = (y: number) => 214 + Math.sin(y / 7) * 10 + (y - 150) * 1.6;
  for (let y = 0; y < H; y++) {
    const cx = riverAt(y);
    if (y < Math.round(midTop(Math.round(cx))) + 1) continue;
    const half = 0.6 + (y - 140) * 0.18;
    for (let x = Math.floor(cx - half); x <= cx + half; x++) {
      const shine = noise1(x * 0.9 + y * 3.1, 9) > 0.7;
      mid.set(x, y, shine ? hex('#b4c4e6') : Canvas.rampAt(hexes('#2a3858', '#3a4a72', '#4c5e88'), noise1(y * 0.6 + x * 0.2, 4), x, y));
    }
  }
  // A town by the river: a few warm windows, and the glow of its hearths.
  const town = rng(5);
  for (let i = 0; i < 12; i++) {
    const x = 190 + Math.floor(town() * 26);
    const y = Math.round(midTop(x)) + 1 + Math.floor(town() * 4);
    if (Math.abs(x - riverAt(y)) < 2) continue;
    mid.set(x, y, town() < 0.5 ? hex('#f0b860') : hex('#c88440'));
  }
  mid.glow(203, Math.round(midTop(203)) + 3, 16, hex('#e0a050'), 0.16);

  const near = new Canvas(WIDE, H);
  // The forest frames the valley: tall on both sides, low in the middle.
  const edge = (x: number) => 179 - (Math.abs(x - 200) / 200) ** 1.5 * 12;
  near.ridge(edge, () => hex('#05070d'));
  const trees = rng(17);
  for (let x = -4; x < near.w + 4; x += 2 + Math.floor(trees() * 5)) {
    const side = Math.min(1, (Math.abs(x - 200) / 150) ** 1.3);
    const foot = Math.round(edge(x)) + 3;
    near.pine(x, foot, 8 + trees() * 10 + side * 52, hex('#05070d'), hex('#1c2646'), 1);
  }
  // Mist on the floor of the valley, in front of the nearer range.
  for (let y = 132; y < 160; y++) for (let x = 0; x < range.w; x++) range.mix(x, y, hex('#3a4868'), (1 - Math.abs(y - 146) / 14) * 0.35 * fbm2(x / 30, y / 8, 81, 3));

  return {
    id: 'kandrax',
    layers: [
      { image: sky.image, depth: 0 },
      { image: far.image, depth: 0.15 },
      { image: range.image, depth: 0.3 },
      { image: mid.image, depth: 0.55 },
      { image: near.image, depth: 1 },
    ],
    emitters: [
      { kind: 'twinkle', layer: 0, x: 0, y: 0, w: 320, h: 110, rate: 36, colour: '#e8ecff' },
      { kind: 'fireflies', layer: 4, x: 0, y: 140, w: WIDE, h: 36, rate: 8, colour: '#d8f0a0' },
    ],
  };
}

// ---------------------------------------------------------------- 2. The ruins of the old civilizations, at dusk

/** A body of clouds in streaks: dark, with the side toward the sun lit. */
function streakClouds(c: Canvas, seed: number, y0: number, y1: number, dark: number, lit: number, sunX: number, sunY: number, threshold = 0.6): void {
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < c.w; x++) {
      const n = fbm2(x / 46, y / 4.5, seed, 4);
      if (n < threshold) continue;
      const below = fbm2(x / 46, (y + 1) / 4.5, seed, 4) < threshold;
      const near = Math.max(0, 1 - Math.hypot(x - sunX, (y - sunY) * 2) / 230);
      c.set(x, y, below ? lerpColour(dark, lit, 0.4 + near * 0.6) : lerpColour(dark, lit, near * 0.35 * (n - threshold) * 8));
    }
  }
}

function ruins(): PrologueScene {
  const sky = new Canvas(PROLOGUE_VIEW.w, H);
  sky.vgrad(0, 0, sky.w - 1, H - 1, hexes('#170d28', '#26123a', '#3c1746', '#5c1f4a', '#822c48', '#a83f42', '#cc5e3c', '#e48846', '#f0ae5e'), (t) => t ** 0.85);
  sky.glow(86, 126, 90, hex('#ffb060'), 0.4);
  sky.disc(86, 128, 12, (x, y, d) => Canvas.rampAt(hexes('#fff0c0', '#ffd88a', '#ffbc66'), d, x, y));
  streakClouds(sky, 13, 18, 112, hex('#4a1a3e'), hex('#f2985e'), 86, 128);

  const far = new Canvas(WIDE, H);
  const plain = (x: number) => 132 - fbm1(x / 30, 51, 3) * 4;
  far.ridge(plain, (x, y, d) => Canvas.rampAt(hexes('#4a1c3a', '#3a1630', '#2c1126'), Math.min(1, d / 30), x, y));
  // Broken towers on the plain, and an aqueduct with fallen arches.
  const towers = rng(52);
  for (const tx of [30, 64, 300, 352]) {
    const tw = 6 + Math.floor(towers() * 6);
    const th = 18 + Math.floor(towers() * 26);
    const base = Math.round(plain(tx)) + 1;
    far.poly(
      [
        [tx, base],
        [tx, base - th],
        [tx + tw * 0.3, base - th + 4 + towers() * 6],
        [tx + tw * 0.6, base - th - 3],
        [tx + tw, base - th + 7],
        [tx + tw, base],
      ],
      hex('#3e1832'),
    );
  }
  for (let i = 0; i < 9; i++) {
    const ax = 150 + i * 15;
    if (i === 4 || i === 7) continue;
    const base = Math.round(plain(ax)) + 1;
    far.rect(ax, base - 22, ax + 3, base, hex('#401a34'));
    if (i < 8 && i !== 3 && i !== 6) for (let k = 0; k <= 15; k++) far.set(ax + k, base - 22 + Math.round(Math.sin((k / 15) * Math.PI) * -4) + 4, hex('#401a34'));
    far.rect(ax, base - 25, ax + 15, base - 22, i === 2 ? 0 : hex('#401a34'));
  }

  const mid = new Canvas(WIDE, H);
  const ground = (x: number) => 150 - fbm1(x / 40, 53, 3) * 6;
  mid.ridge(ground, (x, y, d) => Canvas.rampAt(hexes('#3a1630', '#2a1024', '#1e0b1a'), Math.min(1, d / 16), x, y), (_x, slope) => (slope < -0.3 ? hex('#a0503e') : null));
  const stone = hex('#2e1228');
  const lit = hex('#c86a4a');
  const face = hex('#5a2236');
  // The colossus: two legs on a plinth, broken at the thighs, a spear still upright beside them.
  const px = 236;
  const pb = Math.round(ground(px + 30));
  mid.rect(px, pb - 16, px + 60, pb, stone);
  mid.rect(px - 4, pb - 20, px + 64, pb - 16, stone);
  for (let y = pb - 20; y < pb; y++) mid.set(px - 4 + (y > pb - 16 ? 4 : 0), y, lit);
  for (let x = px - 4; x <= px + 64; x++) mid.set(x, pb - 20, lit);
  const leg = (lx: number, lean: number) => {
    // A foot, a shin, a knee, and a thigh that ends in a broken edge.
    mid.poly(
      [
        [lx - 4, pb - 20],
        [lx - 4, pb - 24],
        [lx + 1, pb - 26],
        [lx + 2 + lean, pb - 54],
        [lx + 1 + lean * 2, pb - 60],
        [lx + 2 + lean * 3, pb - 84],
        [lx + 5 + lean * 3, pb - 90],
        [lx + 8 + lean * 3, pb - 86],
        [lx + 11 + lean * 3, pb - 93],
        [lx + 13 + lean * 3, pb - 84],
        [lx + 12 + lean * 2, pb - 60],
        [lx + 11 + lean, pb - 54],
        [lx + 12, pb - 26],
        [lx + 16, pb - 22],
        [lx + 16, pb - 20],
      ],
      (x, y) => (x < lx + 3 + lean * ((pb - y) / 30) ? lit : x < lx + 7 + lean * ((pb - y) / 30) ? face : stone),
    );
  };
  leg(px + 10, -1);
  leg(px + 36, 1);
  mid.line(px + 60, pb - 20, px + 66, pb - 112, stone);
  mid.line(px + 61, pb - 20, px + 67, pb - 112, stone);
  mid.poly(
    [
      [px + 64, pb - 112],
      [px + 66, pb - 124],
      [px + 69, pb - 112],
    ],
    lit,
  );
  // The fallen head of the colossus, on its side, half in the earth: brow, nose, lips, a shut eye.
  const hx = 140;
  const hy = Math.round(ground(hx)) + 3;
  mid.disc(hx, hy - 10, 20, (x, y, d) => (y > hy ? null : x < hx - 12 || (d > 0.86 && y < hy - 18) ? lit : d > 0.7 && x < hx ? face : stone));
  const profile: [number, number][] = [
    [hx - 20, hy - 26],
    [hx - 27, hy - 22],
    [hx - 25, hy - 18],
    [hx - 31, hy - 13],
    [hx - 25, hy - 10],
    [hx - 27, hy - 7],
    [hx - 24, hy - 5],
    [hx - 25, hy - 1],
    [hx - 16, hy],
    [hx - 14, hy - 26],
  ];
  mid.poly(profile, (x) => (x < hx - 22 ? lit : face));
  mid.line(hx - 22, hy - 17, hx - 17, hy - 16, hex('#14060e'));
  mid.line(hx - 23, hy - 6, hx - 19, hy - 6, hex('#14060e'));
  // Cracks.
  mid.line(hx - 4, hy - 28, hx + 2, hy - 14, hex('#14060e'));
  mid.line(hx + 2, hy - 14, hx + 8, hy - 9, hex('#14060e'));
  // A fallen column, in drums.
  for (let k = 0; k < 4; k++) mid.disc(170 + k * 13, Math.round(ground(170 + k * 13)) - 4, 6, (x) => (x < 170 + k * 13 - 3 ? lit : stone));

  const near = new Canvas(WIDE, H);
  const rubble = (x: number) => 172 - fbm1(x / 14, 57, 4) * 10;
  near.ridge(rubble, () => hex('#12060e'), (_x, slope) => (slope < -0.5 ? hex('#6a2e2e') : null));
  const grass = rng(58);
  for (let x = 0; x < near.w; x++) if (grass() < 0.35) near.line(x, Math.round(rubble(x)), x + (grass() < 0.5 ? -1 : 1), Math.round(rubble(x)) - 2 - Math.floor(grass() * 5), hex('#12060e'));
  near.disc(40, 170, 9, (x) => (x < 34 ? hex('#6a2e2e') : hex('#12060e')));
  near.disc(330, 168, 11, (x) => (x < 322 ? hex('#6a2e2e') : hex('#12060e')));

  return {
    id: 'ruins',
    layers: [
      { image: sky.image, depth: 0 },
      { image: far.image, depth: 0.2 },
      { image: mid.image, depth: 0.55 },
      { image: near.image, depth: 1 },
    ],
    emitters: [
      { kind: 'motes', layer: 2, x: 0, y: 90, w: WIDE, h: 70, rate: 6, colour: '#ffc488' },
      { kind: 'birds', layer: 0, x: 0, y: 40, w: 320, h: 40, rate: 0.25, colour: '#2a1020' },
    ],
  };
}

// ---------------------------------------------------------------- 3. The map of the Dominions

function map(): PrologueScene {
  const W = 400;
  const paper = new Canvas(W, H);
  const ink = hex('#3a2616');
  const inkSoft = hex('#6a4a2c');
  const red = hex('#8a2a18');
  // The parchment: warm, with stains, darker and burned at the edges.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = fbm2(x / 24, y / 24, 91, 4);
      const stain = fbm2(x / 60, y / 60, 92, 3);
      const edge = Math.min(x, W - 1 - x, y + 4, H - 1 - y);
      let t = 0.35 + n * 0.5 - (stain > 0.62 ? 0.18 : 0) - Math.max(0, (12 - edge) / 12) * 0.5;
      const burn = edge + fbm2(x / 6, y / 6, 93, 2) * 6;
      if (burn < 3) {
        paper.set(x, y, hex('#1a0e06'));
        continue;
      }
      if (burn < 5) t = 0;
      paper.set(x, y, Canvas.rampAt(hexes('#5a3e22', '#8a6a42', '#a88a5c', '#bea070', '#cfb588', '#dcc69c'), t, x, y));
    }
  }
  // The land: one continent, from the Wilds of the north to the Wilds of the south.
  const cx = 228;
  const cy = 92;
  const land = (x: number, y: number) => {
    const dx = (x - cx) / 120;
    const dy = (y - cy) / 74;
    return fbm2(x / 38, y / 38, 94, 4) * 0.9 + 0.55 - Math.hypot(dx, dy) * 0.62 - Math.max(0, (cx - 40 - x) / 120);
  };
  const isLand = (x: number, y: number) => land(x, y) > 0.5;
  for (let y = 6; y < H - 6; y++) {
    for (let x = 6; x < W - 6; x++) {
      if (isLand(x, y)) {
        if (!isLand(x - 1, y) || !isLand(x + 1, y) || !isLand(x, y - 1) || !isLand(x, y + 1)) paper.set(x, y, ink);
        else if (!isLand(x - 2, y) || !isLand(x, y - 2)) paper.mix(x, y, inkSoft, 0.5);
        continue;
      }
      // The sea: the rings of the coast, as old maps draw them.
      for (const ring of [3, 6]) {
        if ((isLand(x - ring, y) || isLand(x + ring, y) || isLand(x, y - ring) || isLand(x, y + ring)) && !(isLand(x - ring + 1, y) || isLand(x + ring - 1, y) || isLand(x, y - ring + 1) || isLand(x, y + ring - 1)) && (x + y) % 2 === 0) paper.mix(x, y, inkSoft, ring === 3 ? 0.7 : 0.4);
      }
    }
  }
  const glyphRand = rng(95);
  const landAt = (x: number, y: number) => isLand(x, y) && isLand(x - 3, y) && isLand(x + 3, y) && isLand(x, y - 3) && isLand(x, y + 3);
  // The Dwarven Dominions: mountains in the east.
  for (let i = 0; i < 70; i++) {
    const x = 270 + Math.floor(glyphRand() * 60);
    const y = 40 + Math.floor(glyphRand() * 100);
    if (!landAt(x, y)) continue;
    paper.line(x - 3, y + 2, x, y - 3, ink);
    paper.line(x, y - 3, x + 3, y + 2, inkSoft);
  }
  // The desert beyond the mountains: dots.
  for (let i = 0; i < 260; i++) {
    const x = 330 + Math.floor(glyphRand() * 50);
    const y = 30 + Math.floor(glyphRand() * 120);
    if (isLand(x, y)) paper.set(x, y, inkSoft);
  }
  // The Elven Dominions: forests in the south.
  for (let i = 0; i < 120; i++) {
    const x = 160 + Math.floor(glyphRand() * 120);
    const y = 120 + Math.floor(glyphRand() * 40);
    if (!landAt(x, y)) continue;
    paper.set(x, y - 2, ink);
    paper.set(x - 1, y - 1, ink);
    paper.set(x + 1, y - 1, ink);
    paper.set(x, y - 1, inkSoft);
    paper.set(x, y, inkSoft);
  }
  // The Human Dominions: towns with towers in the north; the Central Dominions: towns and roads between.
  const castle = (x: number, y: number, capital: boolean) => {
    paper.rect(x - 2, y - 2, x + 2, y, ink);
    paper.rect(x - 2, y - 4, x - 2, y - 3, ink);
    paper.rect(x + 2, y - 4, x + 2, y - 3, ink);
    paper.rect(x, y - 5, x, y - 3, ink);
    if (capital) paper.set(x, y - 6, red);
  };
  const towns: [number, number, boolean][] = [];
  for (let i = 0; i < 40 && towns.length < 7; i++) {
    const x = 150 + Math.floor(glyphRand() * 120);
    const y = 26 + Math.floor(glyphRand() * 34);
    if (landAt(x, y) && towns.every(([tx, ty]) => Math.hypot(tx - x, ty - y) > 16)) towns.push([x, y, towns.length === 0]);
  }
  for (let i = 0; i < 60 && towns.length < 13; i++) {
    const x = 160 + Math.floor(glyphRand() * 100);
    const y = 70 + Math.floor(glyphRand() * 44);
    if (landAt(x, y) && towns.every(([tx, ty]) => Math.hypot(tx - x, ty - y) > 16)) towns.push([x, y, towns.length === 7]);
  }
  for (let i = 1; i < towns.length; i++) {
    const [ax, ay] = towns[i - 1]!;
    const [bx, by] = towns[i]!;
    if (Math.hypot(ax - bx, ay - by) > 50) continue;
    const steps = Math.ceil(Math.hypot(ax - bx, ay - by));
    for (let k = 0; k < steps; k += 2) paper.set(ax + ((bx - ax) * k) / steps, ay + ((by - ay) * k) / steps, inkSoft);
  }
  for (const [x, y, capital] of towns) castle(x, y, capital);
  // The wild lands at the north and the south: a few lonely trees.
  for (let i = 0; i < 50; i++) {
    const x = 120 + Math.floor(glyphRand() * 200);
    const y = glyphRand() < 0.5 ? 12 + Math.floor(glyphRand() * 14) : 152 + Math.floor(glyphRand() * 14);
    if (landAt(x, y)) paper.set(x, y, inkSoft);
  }
  // The Great Sea Apeiron: waves, a ship, a serpent, and a compass rose.
  for (let i = 0; i < 46; i++) {
    const x = 16 + Math.floor(glyphRand() * 120);
    const y = 14 + Math.floor(glyphRand() * 150);
    if (isLand(x, y) || isLand(x + 6, y)) continue;
    paper.set(x, y, inkSoft);
    paper.set(x + 1, y - 1, inkSoft);
    paper.set(x + 2, y, inkSoft);
    paper.set(x + 3, y - 1, inkSoft);
  }
  const sx = 70;
  const sy = 62;
  for (let k = 0; k < 3; k++) paper.disc(sx + k * 8, sy + (k % 2 === 0 ? 0 : -3), 3, (x, y, d) => (d > 0.6 && y < sy + (k % 2 === 0 ? 1 : -2) ? ink : null));
  paper.disc(sx + 26, sy - 6, 2, ink);
  paper.poly(
    [
      [100, 120],
      [114, 120],
      [111, 124],
      [103, 124],
    ],
    ink,
  );
  paper.line(107, 120, 107, 110, ink);
  paper.poly(
    [
      [108, 111],
      [113, 117],
      [108, 117],
    ],
    inkSoft,
  );
  const rx = 46;
  const ry = 136;
  for (const [dx, dy] of [
    [0, -14],
    [14, 0],
    [0, 14],
    [-14, 0],
  ] as const) {
    paper.poly(
      [
        [rx + dx, ry + dy],
        [rx + dy * 0.18, ry - dx * 0.18],
        [rx - dy * 0.18, ry + dx * 0.18],
      ],
      dy === -14 ? red : ink,
    );
  }
  paper.disc(rx, ry, 2, hex('#cfb588'));

  // The near layer: the edge of the table, and a candle that lights the map.
  const near = new Canvas(WIDE, H);
  near.glow(340, 150, 110, hex('#ffb060'), 0.22);
  // A short candle on a dish of brass, with drips.
  near.disc(340, 175, 9, (x, y, d) => (y < 173 ? null : Canvas.rampAt(hexes('#4a3018', '#8a6030', '#c89448'), 1 - d + (x < 340 ? 0.2 : -0.2), x, y)));
  for (let y = 154; y < 175; y++) for (let x = 337; x <= 343; x++) near.set(x, y, Canvas.rampAt(hexes('#a8987a', '#cfc0a0', '#e8dcc0'), x < 339 ? 0.95 : x > 341 ? 0.2 : 0.6, x, y));
  near.rect(338, 155, 338, 160, hex('#f0e6d0'));
  near.rect(342, 157, 342, 163, hex('#b8a888'));
  near.rect(340, 150, 340, 154, hex('#1a1008'));
  near.disc(340, 146, 2.6, (x, y, d) => Canvas.rampAt(hexes('#fff4c0', '#ffd070', '#ff9a30'), d + (y - 146) * 0.06, x, y));
  for (let x = 0; x < near.w; x++) for (let y = 176; y < H; y++) near.set(x, y, Canvas.rampAt(hexes('#2a180c', '#1a0e06'), (y - 176) / 4, x, y));

  return {
    id: 'map',
    layers: [
      { image: paper.image, depth: 0.5 },
      { image: near.image, depth: 1 },
    ],
    emitters: [
      { kind: 'flame', layer: 1, x: 337, y: 141, w: 6, h: 7, rate: 1, colour: '#ffd070' },
      { kind: 'motes', layer: 1, x: 220, y: 40, w: 160, h: 120, rate: 2, colour: '#ffe0a0' },
    ],
  };
}

// ---------------------------------------------------------------- 4. The wild lands, uncharted

function wild(): PrologueScene {
  const sky = new Canvas(PROLOGUE_VIEW.w, H);
  sky.vgrad(0, 0, sky.w - 1, H - 1, hexes('#242c3c', '#323c50', '#4a5468', '#6c7284', '#948f94', '#b4a49a', '#cdb6a0', '#dcc4a6'), (t) => t ** 0.9);
  sky.glow(228, 84, 80, hex('#f4d8a8'), 0.45);
  streakClouds(sky, 23, 10, 74, hex('#525a6c'), hex('#ead0a8'), 228, 84, 0.58);

  const ridges: Canvas[] = [];
  const mist = hex('#cfc4b8');
  const tones = [hexes('#8e909a', '#858893'), hexes('#6e7482', '#666c7a'), hexes('#4c5464', '#454c5c'), hexes('#2e3542', '#282e3a')];
  for (let k = 0; k < 4; k++) {
    const c = new Canvas(WIDE, H);
    const base = 104 + k * 17;
    const top = heights(base, 30 - k * 3, 70 - k * 12, 100 + k, 5);
    // Each ridge fades into the mist of the valley below it: the nearer, the less.
    c.ridge(top, (x, y) => lerpColour(Canvas.rampAt(tones[k]!, (y - top(x)) / 30, x, y), mist, Math.max(0, Math.min(0.8, (y - top(x) - 6) / (26 + k * 10))) * (1 - k * 0.18)));
    const trees = rng(110 + k);
    for (let x = 0; x < c.w; x += 2 + Math.floor(trees() * 3)) {
      if (noise1(x / 18, 140 + k) < 0.35) continue;
      c.pine(x, Math.round(top(x)) + 1, 2 + k * 2 + trees() * (2 + k * 2), tones[k]![1]!);
    }
    ridges.push(c);
  }
  // A cliff on the right, and a traveller in a cloak at its edge, looking over the land.
  const near = new Canvas(WIDE, H);
  const rock = hex('#12151c');
  const rim = hex('#9a9294');
  const cliff = (x: number) => (x < 268 ? 200 : 132 + (x - 268) * 0.08 + fbm1(x / 10, 130, 3) * 6);
  for (let x = 262; x < near.w; x++) {
    const t = Math.round(cliff(x));
    for (let y = t; y < H; y++) near.set(x, y, fbm2(x / 5, y / 7, 131, 2) > 0.66 ? hex('#1c2028') : rock);
    near.set(x, t, rim);
  }
  for (let y = Math.round(cliff(270)); y < H; y++) near.set(262 + Math.floor((y - 132) * 0.12), y, rim);
  const fx = 284;
  const fy = Math.round(cliff(fx));
  near.poly(
    [
      [fx - 4, fy],
      [fx - 3, fy - 10],
      [fx - 2, fy - 14],
      [fx + 2, fy - 14],
      [fx + 4, fy - 9],
      [fx + 6, fy],
    ],
    rock,
  );
  near.disc(fx, fy - 16, 2.2, rock);
  near.line(fx - 6, fy, fx - 7, fy - 20, rock);
  near.set(fx - 5, fy - 13, rim);
  near.set(fx - 2, fy - 18, rim);

  return {
    id: 'wild',
    layers: [
      { image: sky.image, depth: 0 },
      { image: ridges[0]!.image, depth: 0.1 },
      { image: ridges[1]!.image, depth: 0.25 },
      { image: ridges[2]!.image, depth: 0.45 },
      { image: ridges[3]!.image, depth: 0.7 },
      { image: near.image, depth: 1 },
    ],
    emitters: [
      { kind: 'birds', layer: 0, x: 0, y: 30, w: 320, h: 50, rate: 0.35, colour: '#2a2e38' },
      { kind: 'mist', layer: 3, x: 0, y: 120, w: WIDE, h: 40, rate: 0.6, colour: '#d4c8bc' },
    ],
  };
}

// ---------------------------------------------------------------- 5. The gods, who show themselves in mysterious ways

function gods(): PrologueScene {
  const sky = new Canvas(PROLOGUE_VIEW.w, H);
  sky.vgrad(0, 0, sky.w - 1, H - 1, hexes('#0a0c12', '#12151e', '#1a1e2a', '#232836', '#2c3242'), (t) => t);
  const gapX = 176;
  const gapY = 6;
  // Heavy clouds, with a break where the light comes through.
  for (let y = 0; y < 110; y++) {
    for (let x = 0; x < sky.w; x++) {
      const n = fbm2(x / 34, y / 18, 141, 5);
      const gap = Math.hypot((x - gapX) / 40, (y - gapY) / 14) - (n - 0.5) * 1.2;
      if (gap < 1) {
        sky.set(x, y, Canvas.rampAt(hexes('#fff4d8', '#f8e4b4', '#eccb8c', '#c8a070', '#8a7058'), gap ** 1.5, x, y));
        continue;
      }
      const shade = n + (y / 110) * 0.2 - Math.max(0, 1.6 - gap) * 0.25;
      sky.set(x, y, Canvas.rampAt(hexes('#2e3444', '#232836', '#1a1e2a', '#12151e', '#0c0e15'), 1 - shade, x, y));
      if (gap < 2.4 && n > 0.55) sky.mix(x, y, hex('#e8c888'), (2.4 - gap) * 0.35);
    }
  }
  // Rays of light from the break down to the hill.
  const rays = new Canvas(PROLOGUE_VIEW.w, H);
  for (let y = 10; y < H; y++) {
    for (let x = 0; x < rays.w; x++) {
      const angle = Math.atan2(x - gapX, y - gapY);
      const band = noise1(angle * 22, 151) * (0.4 + noise1(angle * 7, 152));
      if (Math.abs(angle) > 0.6) continue;
      const fade = (1 - Math.abs(angle) / 0.6) * Math.max(0, 1 - (y - 10) / 160);
      rays.mix(x, y, hex('#f4d48a'), band * fade * 0.7);
    }
  }
  const far = new Canvas(WIDE, H);
  far.ridge(heights(138, 16, 50, 153), () => hex('#151924'), (_x, slope) => (Math.abs(slope) < 0.5 ? hex('#30343e') : null));
  const mid = new Canvas(WIDE, H);
  const hill = (x: number) => 150 - Math.max(0, 1 - ((x - 208) / 90) ** 2) * 34 - fbm1(x / 20, 154, 3) * 4;
  mid.ridge(hill, () => hex('#0b0d14'), (x) => (Math.abs(x - 208) < 50 ? hex('#c8a060') : hex('#2a2e38')));
  // The shrine on the hill: a little temple, standing stones, and someone who kneels.
  const top = Math.round(hill(208));
  const dark = hex('#0b0d14');
  const gold = hex('#e8c27a');
  mid.rect(194, top - 4, 222, top, dark);
  for (const cx of [196, 203, 213, 220]) {
    mid.rect(cx, top - 18, cx + 1, top - 4, dark);
    mid.set(cx, top - 18, gold);
  }
  mid.poly(
    [
      [191, top - 18],
      [208, top - 27],
      [225, top - 18],
    ],
    dark,
  );
  mid.line(191, top - 18, 208, top - 27, gold);
  mid.line(208, top - 27, 225, top - 18, gold);
  for (const sx of [172, 180, 238, 246]) {
    const st = Math.round(hill(sx));
    mid.rect(sx, st - 9 - (sx % 3), sx + 2, st, dark);
    mid.set(sx + 1, st - 9 - (sx % 3), gold);
  }
  const kx = 186;
  const ky = Math.round(hill(kx));
  mid.poly(
    [
      [kx - 4, ky],
      [kx - 3, ky - 5],
      [kx, ky - 8],
      [kx + 3, ky - 6],
      [kx + 4, ky],
    ],
    dark,
  );
  mid.disc(kx + 1, ky - 9, 1.6, dark);
  mid.set(kx + 2, ky - 10, gold);
  const near = new Canvas(WIDE, H);
  near.ridge((x) => 174 - fbm1(x / 16, 155, 4) * 8, () => hex('#06070b'));
  const grass = rng(156);
  for (let x = 0; x < near.w; x++) if (grass() < 0.4) near.line(x, 172, x + (grass() < 0.5 ? -1 : 1), 166 - Math.floor(grass() * 7), hex('#06070b'));

  return {
    id: 'gods',
    layers: [
      { image: sky.image, depth: 0 },
      { image: far.image, depth: 0.2 },
      { image: rays.image, depth: 0 },
      { image: mid.image, depth: 0.5 },
      { image: near.image, depth: 1 },
    ],
    emitters: [{ kind: 'motes', layer: 2, x: 140, y: 40, w: 90, h: 110, rate: 10, colour: '#ffe2a0' }],
  };
}

// ---------------------------------------------------------------- 6. The Central Dominions: the Sovereignty and the Enclave

function central(): PrologueScene {
  const sky = new Canvas(PROLOGUE_VIEW.w, H);
  sky.vgrad(0, 0, sky.w - 1, H - 1, hexes('#161830', '#24223e', '#3a2c4c', '#5a3852', '#86484e', '#b0604a', '#d8844c', '#eaa458'), (t) => t ** 0.8);
  stars(sky, 161, 70, 50);
  streakClouds(sky, 162, 40, 100, hex('#3a2a46'), hex('#f0a060'), 160, 150, 0.64);

  const far = new Canvas(WIDE, H);
  const fdark = hex('#1c1426');
  // The Iron Sovereignty: a city of forges by the sea, with chimneys and cranes, red and bronze.
  far.rect(0, 128, 150, H - 1, Canvas.rampAt(hexes('#3a2c40'), 0, 0, 0));
  for (let y = 128; y < H; y++) for (let x = 0; x < 150; x++) far.set(x, y, Canvas.rampAt(hexes('#2a2038', '#3c2c42', '#5a3a42'), 0.3 + noise1(x * 0.5 + y * 7, 163) * 0.4 - (y - 128) / 90, x, y));
  for (let x = 0; x < 150; x++) if (noise1(x * 0.8, 164) > 0.7) far.set(x, 129 + Math.floor(noise1(x, 165) * 30), hex('#e89a58'));
  const city = rng(166);
  for (let x = 20; x < 150; ) {
    const w = 8 + Math.floor(city() * 12);
    const h = 14 + Math.floor(city() * 26);
    far.rect(x, 126 - h, x + w, 126, fdark);
    for (let wy = 126 - h + 3; wy < 124; wy += 4) for (let wx = x + 2; wx < x + w - 1; wx += 3) if (city() < 0.45) far.set(wx, wy, city() < 0.5 ? hex('#f0a050') : hex('#c06030'));
    if (city() < 0.45) {
      far.rect(x + 2, 126 - h - 20, x + 4, 126 - h, fdark);
      far.set(x + 3, 126 - h - 21, hex('#ff8a40'));
    }
    if (city() < 0.3) {
      far.rect(x + w - 3, 126 - h - 9, x + w - 3, 126 - h, hex('#8a6a40'));
      far.rect(x + w - 2, 126 - h - 9, x + w + 1, 126 - h - 6, hex('#a83228'));
    }
    x += w + 1 + Math.floor(city() * 3);
  }
  for (const mx of [12, 30, 44]) {
    far.line(mx, 128, mx, 104, fdark);
    far.line(mx - 5, 112, mx + 5, 112, fdark);
    far.rect(mx - 6, 126, mx + 7, 129, fdark);
  }
  // The Wilds between them: a dark forest, and a road through it.
  const wood = (x: number) => 134 - fbm1(x / 22, 167, 4) * 14 - Math.max(0, 1 - Math.abs(x - 190) / 50) * 8;
  for (let x = 140; x < 250; x++) {
    const t = Math.round(wood(x));
    for (let y = t; y < H; y++) far.set(x, y, Canvas.rampAt(hexes('#1a1a28', '#14141f', '#0e0e17'), (y - t) / 20, x, y));
    if (x % 3 === 0) far.pine(x, t + 2, 5 + noise1(x * 0.3, 168) * 8, hex('#1a1a28'));
  }
  // The Mithril Enclave: white spires and domes, and the blue light of the arcane.
  const hillE = (x: number) => 132 - Math.max(0, 1 - Math.abs(x - 300) / 70) * 20;
  far.ridge((x) => (x < 236 ? 300 : hillE(x)), (x, y) => Canvas.rampAt(hexes('#2a2440', '#201c34', '#18152a'), (y - hillE(x)) / 20, x, y));
  const white = hexes('#6a6888', '#8e8cae', '#b8b8d8', '#dcdcf0');
  const spire = (x: number, base: number, h: number, w: number) => {
    far.rect(x, base - h, x + w, base, Canvas.rampAt(white, 0.5, x, base));
    for (let y = base - h; y <= base; y++) {
      far.set(x, y, white[3]!);
      far.set(x + w, y, white[0]!);
      for (let k = x + 1; k < x + w; k++) far.set(k, y, Canvas.rampAt(white, 0.35 + (x + w - k) / (w * 3), k, y));
    }
    far.poly(
      [
        [x - 1, base - h],
        [x + w / 2, base - h - w * 2.4],
        [x + w + 1, base - h],
      ],
      (px) => (px < x + w / 2 ? white[3]! : white[1]!),
    );
    for (let y = base - h + 4; y < base - 2; y += 5) far.set(x + Math.floor(w / 2), y, hex('#7cc8ff'));
  };
  spire(266, Math.round(hillE(266)), 30, 5);
  spire(284, Math.round(hillE(284)), 48, 7);
  spire(304, Math.round(hillE(304)), 38, 6);
  spire(322, Math.round(hillE(322)), 22, 5);
  far.disc(297, Math.round(hillE(297)) - 6, 9, (x, y) => (y > Math.round(hillE(297)) - 6 ? null : Canvas.rampAt(white, 0.4 + (297 - x) / 30, x, y)));
  far.glow(287, Math.round(hillE(284)) - 72, 18, hex('#7cc8ff'), 0.6);
  far.disc(287, Math.round(hillE(284)) - 72, 2.5, hex('#d8f0ff'));

  const near = new Canvas(WIDE, H);
  near.ridge((x) => 170 - fbm1(x / 20, 169, 4) * 7, (x, y) => Canvas.rampAt(hexes('#120e18', '#0a080e'), (y - 160) / 20, x, y));
  for (let x = 0; x < near.w; x += 3) near.pine(x, 172, 4 + noise1(x * 0.2, 170) * 10, hex('#0a080e'));

  return {
    id: 'central',
    layers: [
      { image: sky.image, depth: 0 },
      { image: far.image, depth: 0.35 },
      { image: near.image, depth: 1 },
    ],
    emitters: [
      { kind: 'smoke', layer: 1, x: 20, y: 70, w: 130, h: 30, rate: 3, colour: '#4a3a44' },
      { kind: 'sparkles', layer: 1, x: 256, y: 40, w: 80, h: 90, rate: 6, colour: '#9cd8ff' },
      { kind: 'twinkle', layer: 0, x: 0, y: 0, w: 320, h: 50, rate: 10, colour: '#e8ecff' },
    ],
  };
}

// ---------------------------------------------------------------- 7. The factory of Thrain Steelforge, in Thalesferro

function factory(): PrologueScene {
  const sky = new Canvas(PROLOGUE_VIEW.w, H);
  sky.vgrad(0, 0, sky.w - 1, H - 1, hexes('#080608', '#0e0a0c', '#160e10', '#201412', '#2e1a14', '#442418', '#5c301a'), (t) => t ** 1.4);
  stars(sky, 171, 120, 60);
  const far = new Canvas(WIDE, H);
  far.ridge(heights(118, 26, 56, 172), (x, y) => Canvas.rampAt(hexes('#1a1012', '#140c0e', '#100a0a'), (y - 100) / 40, x, y), (_x, slope) => (slope > 0.3 ? hex('#3a2018') : null));

  const mid = new Canvas(WIDE, H);
  const stone = hexes('#1a1412', '#241c18', '#30261f', '#3e3128');
  const bronze = hexes('#4a2c16', '#7a4a22', '#a8692e', '#d08a3a');
  const fire = hexes('#c04a18', '#f07a28', '#ffb048', '#ffe0a0');
  const groundY = 152;
  mid.rect(0, groundY, mid.w - 1, H - 1, hex('#120c0a'));
  // The hall: a stepped block of dark stone, with wings, in the dwarven way.
  const block = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) mid.set(x, y, Canvas.rampAt(stone, 0.6 - (y - y0) / (y1 - y0 + 1) * 0.5 + ((x * 7 + y * 3) % 11 === 0 ? -0.2 : 0), x, y));
    for (let x = x0; x <= x1; x++) mid.set(x, y0, stone[3]!);
    for (let y = y0; y <= y1; y += 6) for (let x = x0; x <= x1; x++) if ((x + Math.floor(y / 6) * 5) % 12 === 0) mid.set(x, y, stone[0]!);
  };
  block(150, 96, 290, groundY);
  block(120, 112, 152, groundY);
  block(288, 112, 322, groundY);
  block(170, 80, 270, 98);
  // Furnace windows in rows, glowing.
  for (let row = 0; row < 3; row++) {
    for (let k = 0; k < 9; k++) {
      const wx = 158 + k * 14;
      const wy = 104 + row * 13;
      if (wx > 196 && wx < 236 && row > 0) continue;
      mid.rect(wx, wy, wx + 5, wy + 6, hex('#0c0806'));
      mid.rect(wx + 1, wy + 1, wx + 4, wy + 6, Canvas.rampAt(fire, 0.4 + noise1(k * 3 + row, 173) * 0.5, wx, wy));
      mid.glow(wx + 2.5, wy + 3.5, 9, hex('#ff8a30'), 0.25);
    }
  }
  for (const wx of [126, 134, 142, 296, 304, 312]) {
    mid.rect(wx, 122, wx + 3, 128, hex('#0c0806'));
    mid.rect(wx + 1, 123, wx + 2, 128, fire[1]!);
  }
  // The great gate, open, with the light of the forges spilling out on the road.
  mid.poly(
    [
      [204, groundY],
      [204, 132],
      [212, 124],
      [228, 124],
      [236, 132],
      [236, groundY],
    ],
    (x, y) => Canvas.rampAt(fire, 0.9 - (y - 124) / 60 - Math.abs(x - 220) / 40, x, y),
  );
  for (let y = 124; y <= groundY; y++) {
    mid.set(203, y, bronze[2]!);
    mid.set(237, y, bronze[1]!);
  }
  mid.glow(220, 146, 50, hex('#ff9a40'), 0.45);
  for (let y = groundY; y < H; y++) {
    const spread = 16 + (y - groundY) * 1.2;
    for (let x = Math.floor(220 - spread); x <= 220 + spread; x++) mid.mix(x, y, hex('#ffb050'), 0.35 * (1 - (y - groundY) / 30) * (1 - Math.abs(x - 220) / spread));
  }
  // A great cog of bronze over the gate.
  const gx = 220;
  const gy = 108;
  mid.disc(gx, gy, 13, (x, y, d) => {
    const angle = Math.atan2(y + 0.5 - gy, x + 0.5 - gx);
    const tooth = Math.cos(angle * 10) > 0.3;
    if (d > 0.82 && !tooth) return null;
    if (d < 0.32) return bronze[0]!;
    return Canvas.rampAt(bronze, 0.75 - (y - gy) / 30 + (x < gx ? 0.1 : -0.1), x, y);
  });
  mid.disc(gx, gy, 3, bronze[3]!);
  // Chimneys, and pipes between them.
  const chimneys = [168, 196, 244, 272];
  for (const cx of chimneys) {
    mid.rect(cx, 30, cx + 7, 96, Canvas.rampAt(stone, 0.4, cx, 30));
    for (let y = 30; y < 96; y++) {
      mid.set(cx, y, stone[3]!);
      mid.set(cx + 7, y, stone[0]!);
    }
    mid.rect(cx - 1, 28, cx + 8, 31, bronze[1]!);
    mid.glow(cx + 3.5, 27, 8, hex('#ff7a28'), 0.5);
  }
  for (let x = 175; x < 244; x++) {
    mid.set(x, 72 + Math.round(Math.sin(x / 9) * 1), bronze[1]!);
    mid.set(x, 73 + Math.round(Math.sin(x / 9) * 1), bronze[0]!);
  }
  // Rails in front, and a cart of ore.
  for (let x = 0; x < mid.w; x++) {
    mid.set(x, 160, bronze[0]!);
    mid.set(x, 163, bronze[0]!);
  }
  mid.rect(96, 152, 112, 159, hex('#2a1e16'));
  mid.rect(98, 149, 110, 152, hex('#3a2a20'));
  mid.disc(100, 160, 2, bronze[1]!);
  mid.disc(108, 160, 2, bronze[1]!);

  const near = new Canvas(WIDE, H);
  near.rect(0, 170, near.w - 1, H - 1, hex('#080606'));
  for (const [x, w, h] of [
    [20, 14, 12],
    [36, 10, 8],
    [330, 16, 14],
    [348, 12, 9],
  ] as const) {
    near.rect(x, 170 - h, x + w, 170, hex('#0c0808'));
    near.line(x, 170 - h, x + w, 170, hex('#1a1210'));
    near.line(x + w, 170 - h, x, 170, hex('#1a1210'));
  }
  near.rect(300, 120, 301, 170, hex('#0c0808'));
  near.rect(297, 116, 304, 120, hex('#0c0808'));
  near.glow(300.5, 122, 14, hex('#ffb050'), 0.6);
  near.rect(299, 120, 302, 123, hex('#ffd080'));

  return {
    id: 'factory',
    layers: [
      { image: sky.image, depth: 0 },
      { image: far.image, depth: 0.2 },
      { image: mid.image, depth: 0.5 },
      { image: near.image, depth: 1 },
    ],
    emitters: [
      ...chimneys.map((cx): PrologueEmitter => ({ kind: 'smoke', layer: 2, x: cx + 1, y: 22, w: 6, h: 4, rate: 2.5, colour: '#3a2a26' })),
      ...chimneys.map((cx): PrologueEmitter => ({ kind: 'embers', layer: 2, x: cx + 1, y: 26, w: 6, h: 3, rate: 3, colour: '#ffa040' })),
      { kind: 'embers', layer: 2, x: 206, y: 130, w: 28, h: 20, rate: 4, colour: '#ffc060' },
    ],
  };
}

// ---------------------------------------------------------------- 8. Your hut in the Wilds

function hut(): PrologueScene {
  const sky = new Canvas(PROLOGUE_VIEW.w, H);
  sky.vgrad(0, 0, sky.w - 1, H - 1, hexes('#04050a', '#070a14', '#0b1020', '#10172c', '#161f38'), (t) => t ** 1.2);
  stars(sky, 181, 300, 120);
  // A thin moon.
  sky.glow(66, 34, 30, hex('#8090c0'), 0.25);
  sky.disc(66, 34, 8, (x, y) => (Math.hypot(x + 0.5 - 70, y + 0.5 - 31) < 7.5 ? null : Canvas.rampAt(hexes('#c8c4b8', '#ece6d4'), (66 - x) / 8, x, y)));

  const far = new Canvas(WIDE, H);
  const farTop = heights(128, 18, 40, 182);
  far.ridge(farTop, () => hex('#0c1222'));
  for (let x = 0; x < far.w; x += 2) far.pine(x, Math.round(farTop(x)) + 2, 6 + noise1(x * 0.21, 183) * 14, hex('#0c1222'), hex('#18223a'), -1);

  const mid = new Canvas(WIDE, H);
  // The clearing.
  for (let y = 140; y < H; y++) for (let x = 0; x < mid.w; x++) mid.set(x, y, Canvas.rampAt(hexes('#0e1418', '#121a1e', '#162024'), (y - 140) / 40 + noise1(x * 0.4 + y, 184) * 0.2, x, y));
  // The hut: walls of planks, a roof of straw, a stone chimney, a lit window and a door ajar.
  const hx0 = 168;
  const hx1 = 232;
  const base = 156;
  const plank = hexes('#1a120c', '#24180e', '#302012', '#3c2a18');
  for (let y = 126; y <= base; y++) for (let x = hx0; x <= hx1; x++) mid.set(x, y, Canvas.rampAt(plank, (x % 5 === 0 ? 0.1 : 0.45) + (x < 200 ? 0.15 : -0.1), x, y));
  mid.glow(200, 140, 70, hex('#ffb050'), 0.18);
  const straw = hexes('#1e160c', '#2c2010', '#3c2c16', '#4e3a1c', '#644a24');
  mid.poly(
    [
      [hx0 - 8, 128],
      [200, 98],
      [hx1 + 8, 128],
    ],
    (x, y) => Canvas.rampAt(straw, 0.25 + ((x + y * 2) % 5) * 0.06 + (x < 200 ? 0.25 : 0) + noise1(x * 1.3 + y * 0.2, 185) * 0.25, x, y),
  );
  for (let x = hx0 - 8; x <= hx1 + 8; x++) mid.set(x, 128, straw[0]!);
  mid.rect(218, 96, 225, 112, hexes('#2a2826')[0]!);
  for (let y = 96; y < 112; y += 3) for (let x = 218; x <= 225; x++) if ((x + y) % 4 === 0) mid.set(x, y, hex('#3a3836'));
  // The window, warm.
  mid.rect(178, 134, 190, 144, hex('#120c08'));
  mid.rect(179, 135, 189, 143, hex('#ffc060'));
  mid.rect(184, 135, 184, 143, hex('#7a4a20'));
  mid.rect(179, 139, 189, 139, hex('#7a4a20'));
  mid.glow(184, 139, 18, hex('#ffb050'), 0.5);
  // The door, ajar: a line of light, and light on the ground before it.
  mid.rect(204, 134, 216, base, hex('#140e08'));
  mid.rect(205, 135, 206, base, hex('#ffcf70'));
  for (let y = base + 1; y < H; y++) for (let x = 196; x < 228; x++) mid.mix(x + (y - base) * 0.3, y, hex('#ffc060'), 0.3 * (1 - (y - base) / 24) * (1 - Math.abs(x - 210) / 16));
  // A woodpile, and a path from the door.
  for (let k = 0; k < 9; k++) mid.disc(240 + (k % 3) * 4, base - 1 - Math.floor(k / 3) * 3, 1.8, (x, y, d) => (d < 0.5 ? hex('#5a4024') : hex('#2a1c10')));

  const near = new Canvas(WIDE, H);
  for (const [x, h] of [
    [-6, 150],
    [16, 120],
    [42, 90],
    [300, 100],
    [330, 140],
    [362, 160],
    [384, 120],
  ] as const) near.pine(x, H + 4, h * 0.9, hex('#04060b'), hex('#141c30'), -1);
  const grass = rng(186);
  for (let x = 0; x < near.w; x++) if (grass() < 0.3) near.line(x, H - 1, x + (grass() < 0.5 ? -1 : 1), H - 3 - Math.floor(grass() * 5), hex('#04060b'));

  return {
    id: 'hut',
    layers: [
      { image: sky.image, depth: 0 },
      { image: far.image, depth: 0.25 },
      { image: mid.image, depth: 0.55 },
      { image: near.image, depth: 1 },
    ],
    emitters: [
      { kind: 'twinkle', layer: 0, x: 0, y: 0, w: 320, h: 110, rate: 30, colour: '#e8ecff' },
      { kind: 'smoke', layer: 2, x: 219, y: 90, w: 6, h: 4, rate: 1.5, colour: '#2a3040' },
      { kind: 'fireflies', layer: 3, x: 40, y: 120, w: 300, h: 56, rate: 10, colour: '#d8f0a0' },
    ],
  };
}

/** Every scene of the prologue, in order. */
export function prologueScenes(): PrologueScene[] {
  return [kandrax(), ruins(), map(), wild(), gods(), central(), factory(), hut()];
}

/** A scene as one picture with every layer at rest (previews). */
export function sceneStill(scene: PrologueScene, pan = 0): Image {
  return compose(
    PROLOGUE_VIEW.w,
    PROLOGUE_VIEW.h,
    scene.layers.map((l) => ({ image: l.image, dx: Math.round(l.depth * pan) })),
  );
}

export { lerpColour };
