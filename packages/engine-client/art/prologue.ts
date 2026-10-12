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
import { H, PROLOGUE_VIEW, WIDE, heights, moon, mountains, peaks, stars, streakClouds, type PrologueEmitter, type PrologueScene } from './prologue-kit.ts';
import { mapScene } from './prologue-map.ts';
import { ironScene, mithrilScene } from './prologue-dominions.ts';

export { PROLOGUE_VIEW, type PrologueEmitter, type PrologueLayer, type PrologueScene } from './prologue-kit.ts';

/** The sound under each scene (src/audio/sounds.ts, AMBIENCES). */
const AMBIENCE_OF: Readonly<Record<string, string>> = { kandrax: 'night', ruins: 'wind', map: 'candle', wild: 'gale', gods: 'wind', iron: 'town', mithril: 'shrine', factory: 'forge', hut: 'hearth' };

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

// ---------------------------------------------------------------- 3. The map: Fede's map of Thrain (art/prologue-map.ts)

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

// ---------------------------------------------------------------- 6 and 7. The Iron Sovereignty and the Mithril Enclave (art/prologue-dominions.ts)

// ---------------------------------------------------------------- 8. The factory of Thrain Steelforge, in Thalesferro

/**
 * The factory of Thrain Steelforge at dusk, after Fede's pictures of it on the Drive
 * (`Images/regions/central_dominions/fabrica_forjacero`): towers of brick and copper plates with
 * steep roofs and pinnacles, round towers with a gallery and a cone, tall stacks with iron rings,
 * a long hall with dormers and rows of arched windows, bridges on arches, and a yard of cobbles with
 * barrels. It is medieval, with a pinch of steampunk (the stacks, the pipes, the cog): the only
 * place in the prologue with it. The sun sets to the west (left), as the light of the game comes.
 */
function factory(): PrologueScene {
  const sky = new Canvas(PROLOGUE_VIEW.w, H);
  sky.vgrad(0, 0, sky.w - 1, H - 1, hexes('#0c1020', '#121a2e', '#1c2640', '#2c3450', '#46405a', '#6a4c5c', '#965e56', '#c47a50', '#e09c58'), (t) => t ** 0.9);
  stars(sky, 171, 40, 40);
  sky.glow(40, 150, 120, hex('#ffb060'), 0.3);
  streakClouds(sky, 172, 24, 112, hex('#2a2a40'), hex('#f4b868'), 40, 150, 0.62);

  // ---- Far: Thalesferro behind the walls of the factory, in the haze of the dusk.
  const far = new Canvas(WIDE, H);
  const haze = hexes('#2c2a40', '#3a3248', '#4a3a4e', '#5c4450');
  far.ridge(heights(132, 22, 60, 172), (x, y) => Canvas.rampAt(haze, 0.7 - (y - 110) / 50, x, y));
  const roofs = rng(173);
  for (let x = 0; x < WIDE; ) {
    const w = 6 + Math.floor(roofs() * 8);
    const h = 6 + Math.floor(roofs() * 8);
    const base = 146;
    far.rect(x, base - h, x + w, base + 10, haze[0]!);
    far.poly(
      [
        [x - 1, base - h + 0.5],
        [x + w / 2 + 0.5, base - h - w * 0.7],
        [x + w + 2, base - h + 0.5],
      ],
      haze[1]!,
    );
    if (roofs() < 0.4) far.set(x + 2 + Math.floor(roofs() * (w - 3)), base - h + 3, hex('#c88a50'));
    if (roofs() < 0.12) {
      // A distant tower with a cone, or a stack of a workshop.
      const tx = x + Math.floor(w / 2);
      if (roofs() < 0.5) {
        far.rect(tx - 2, base - h - 22, tx + 2, base - h, haze[0]!);
        far.poly(
          [
            [tx - 3, base - h - 21.5],
            [tx + 0.5, base - h - 32],
            [tx + 4, base - h - 21.5],
          ],
          haze[1]!,
        );
      } else far.rect(tx - 1, base - h - 26, tx + 1, base - h, haze[0]!);
    }
    x += w + 2;
  }

  // ---- Mid: the factory.
  const mid = new Canvas(WIDE, H);
  const groundY = 150;
  const brick = hexes('#1c0f0c', '#2c1810', '#3e2214', '#56301a', '#744222', '#94582c', '#b8743a');
  const copper = hexes('#1e1412', '#33201a', '#4e2e20', '#6c3e26', '#8e5430', '#b4703c');
  const slate = hexes('#12121c', '#1c1c2a', '#28283a', '#3a3a50', '#525068');
  const iron = hexes('#14100e', '#241c18', '#3a2e26', '#5a4836');
  const fire = hexes('#c04a18', '#f07a28', '#ffb048', '#ffe0a0');
  /** Brick: courses in a running bond, lighter to the west (the sun), darker low down. */
  const bricks = (x0: number, y0: number, x1: number, y1: number, light = 0.4) => {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const joint = y % 2 === 0 || (x + (Math.floor(y / 2) % 2) * 2) % 4 === 0;
        mid.set(x, y, Canvas.rampAt(brick, light - ((x - x0) / Math.max(1, x1 - x0)) * 0.25 - ((y - y0) / 200) - (joint ? 0.1 : 0), x, y));
      }
      mid.set(x0, y, brick[5]!);
    }
  };
  /** Copper plates in lozenges on a square tower (as on the tall towers of the pictures). */
  const plates = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const seam = (x - x0 + y) % 8 === 0 || (x - x0 - y + 400) % 8 === 0;
        mid.set(x, y, Canvas.rampAt(copper, 0.5 - ((x - x0) / Math.max(1, x1 - x0)) * 0.35 - (seam ? 0.15 : 0), x, y));
      }
      mid.set(x0, y, copper[5]!);
      mid.set(x1, y, copper[1]!);
    }
    for (let y = y0 + 12; y < y1; y += 14) for (let x = x0; x <= x1; x++) mid.set(x, y, iron[2]!);
  };
  /** An arched window or door: dark, or lit from within. */
  const archway = (x: number, y: number, w: number, h: number, lit: number | null) => {
    const r = w / 2;
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        const dy = py + 0.5 - (y + r);
        if (dy < 0 && Math.hypot(px + 0.5 - (x + r), dy) > r) continue;
        mid.set(px, py, lit === null ? hex('#0c0806') : Canvas.rampAt(fire, 0.25 + (lit - (py - y) / h) * 0.6, px, py));
      }
    }
  };
  const glows: [number, number, number][] = [];
  const litArch = (x: number, y: number, w: number, h: number, heat = 0.7) => {
    archway(x, y, w, h, heat);
    glows.push([x + w / 2, y + h / 2, Math.max(6, w * 1.6)]);
  };
  /** A cone or a steep pyramid of a roof, lit on its west half. */
  const cone = (cx: number, base: number, half: number, h: number, ramp: readonly number[]) => {
    mid.poly(
      [
        [cx - half, base + 0.5],
        [cx + 0.5, base - h],
        [cx + half + 1, base + 0.5],
      ],
      (x, y) => Canvas.rampAt(ramp, (x <= cx ? 0.7 : 0.25) - ((y - base + h) / h) * 0.1 + (y % 3 === 0 ? -0.08 : 0), x, y),
    );
    mid.rect(cx, base - h - 3, cx, base - h - 1, iron[2]!);
  };
  /** A rail of iron along a walk: a bar, and posts. */
  const rail = (x0: number, x1: number, y: number) => {
    for (let x = x0; x <= x1; x++) {
      mid.set(x, y, iron[3]!);
      if ((x - x0) % 3 === 0) mid.set(x, y + 1, iron[2]!);
      mid.set(x, y + 2, iron[1]!);
    }
  };

  // The long hall: walls of brick, a steep roof of copper with dormers, and rows of arched windows.
  bricks(64, 96, 300, groundY, 0.45);
  mid.poly(
    [
      [62, 96.5],
      [76, 74],
      [290, 74],
      [302, 96.5],
    ],
    (x, y) => Canvas.rampAt(copper, 0.55 - (y - 74) / 60 + ((x + y) % 6 === 0 ? -0.15 : 0) + (x < 76 ? 0.2 : 0), x, y),
  );
  for (let x = 62; x <= 302; x++) mid.set(x, 96, copper[0]!);
  for (let x = 76; x <= 290; x++) mid.set(x, 74, copper[5]!);
  for (let dx = 90; dx < 290; dx += 22) {
    if (dx > 120 && dx < 160) continue;
    bricks(dx, 82, dx + 6, 92, 0.5);
    cone(dx + 3, 82, 4, 5, copper);
    archway(dx + 2, 85, 3, 6, 0.6);
  }
  for (let x = 72; x < 296; x += 9) {
    if (x > 124 && x < 156) continue;
    archway(x, 101, 5, 10, ((x - 72) / 9) % 3 === 1 ? null : 0.4);
  }
  // The walk along the hall, on brackets of iron, and its rail.
  for (let x = 64; x <= 300; x++) {
    mid.set(x, 117, iron[2]!);
    mid.set(x, 118, iron[1]!);
  }
  for (let x = 68; x <= 300; x += 12) mid.line(x, 119, x + 3, 122, iron[1]!);
  rail(64, 300, 113);
  // A pipe of copper along the wall, and the arches of the forges at the foot of the hall.
  for (let x = 64; x <= 300; x++) {
    mid.set(x, 124, copper[4]!);
    mid.set(x, 125, copper[2]!);
  }
  for (let x = 70; x < 296; x += 14) {
    if (x > 122 && x < 158) continue;
    if ((x / 14) % 2 === 1) litArch(x, 130, 9, 20, 0.85);
    else archway(x, 130, 9, 20, null);
    mid.set(x + 11, 131, fire[3]!);
    glows.push([x + 11, 131, 5]);
  }

  // The stacks: tall cylinders of brick with rings of iron.
  const stacks: [number, number, number][] = [
    [96, 22, 96],
    [168, 12, 96],
    [246, 26, 96],
    [322, 34, 104],
  ];
  const stack = (cx: number, top: number, foot: number) => {
    for (let y = top; y < foot; y++) {
      for (let x = cx - 3; x <= cx + 3; x++) {
        const joint = y % 2 === 0;
        mid.set(x, y, Canvas.rampAt(brick, 0.65 - ((x - cx + 3) / 6) * 0.5 - (joint ? 0.08 : 0), x, y));
      }
    }
    for (let y = top + 6; y < foot - 4; y += 11) mid.rect(cx - 4, y, cx + 4, y + 1, Canvas.rampAt(iron, 0.7, cx, y));
    mid.rect(cx - 4, top - 2, cx + 4, top, iron[3]!);
    mid.glow(cx, top - 3, 6, hex('#ff8a3a'), 0.5);
  };
  for (const [cx, top, foot] of stacks) stack(cx, top, foot);

  // The two tall towers of copper plates, with steep roofs and pinnacles on their corners.
  const tallTower = (x0: number, x1: number, top: number, roof: number, windowsTo: number) => {
    plates(x0, top, x1, groundY);
    // The cornice, and the roof with its pinnacles.
    mid.rect(x0 - 1, top - 2, x1 + 1, top, iron[2]!);
    mid.rect(x0 - 1, top - 2, x1 + 1, top - 2, iron[3]!);
    cone((x0 + x1) / 2, top - 2, (x1 - x0) / 2 + 1, roof, slate);
    for (const px of [x0, x1]) {
      mid.rect(px - 1, top - 6, px + 1, top - 3, copper[3]!);
      cone(px, top - 6, 1.5, 6, slate);
    }
    // Small arched windows, and a round one under the roof.
    for (let y = top + 18; y + 6 < windowsTo; y += 16) for (let x = x0 + 4; x < x1 - 3; x += 7) archway(x, y, 3, 6, (x + y) % 3 === 0 ? null : 0.55);
    mid.disc((x0 + x1) / 2 + 0.5, top + 8, 3, hex('#0c0806'));
    mid.disc((x0 + x1) / 2 + 0.5, top + 8, 2, fire[2]!);
  };
  tallTower(118, 140, 44, 30, 126);
  tallTower(160, 188, 34, 34, 98);
  // The great gate under the great tower, open on the fire of the forges.
  litArch(166, 122, 17, 28, 1);
  for (let y = 122; y <= groundY; y++) {
    mid.set(165, y, copper[5]!);
    mid.set(183, y, copper[1]!);
  }
  // A great cog of bronze over the gate: the sign of the house of Steelforge.
  const gx = 174.5;
  const gy = 108;
  mid.disc(gx, gy, 9, (x, y, d) => {
    const angle = Math.atan2(y + 0.5 - gy, x + 0.5 - gx);
    if (d > 0.78 && Math.cos(angle * 8) < 0.2) return null;
    if (d < 0.3) return copper[1]!;
    return Canvas.rampAt(copper, 0.85 - (y - gy) / 24 - (x - gx) / 24, x, y);
  });
  mid.disc(gx, gy, 2, copper[5]!);

  // The round towers: a body of brick, a gallery with a rail, and a cone of copper.
  const roundTower = (cx: number, r: number, top: number, roof: number) => {
    for (let y = top; y <= groundY; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const joint = y % 2 === 0 || (x + (Math.floor(y / 2) % 2) * 2) % 4 === 0;
        mid.set(x, y, Canvas.rampAt(brick, 0.7 - ((x - cx + r) / (2 * r)) * 0.6 - (joint ? 0.08 : 0), x, y));
      }
    }
    for (let y = top + 16; y < groundY - 10; y += 14) archway(cx - 1, y, 3, 6, (y / 14) % 2 < 1 ? 0.5 : null);
    // The gallery: wider than the body, on brackets.
    for (let x = cx - r - 2; x <= cx + r + 2; x++) {
      mid.set(x, top, iron[2]!);
      mid.set(x, top + 1, iron[1]!);
    }
    for (let k = -r; k <= r; k += 3) mid.line(cx + k, top + 2, cx + k + (k < 0 ? 1 : -1), top + 4, iron[1]!);
    rail(cx - r - 2, cx + r + 2, top - 3);
    bricks(cx - r + 1, top - 10, cx + r - 1, top - 1, 0.55);
    for (let x = cx - r + 3; x < cx + r - 2; x += 4) archway(x, top - 8, 2, 5, 0.6);
    cone(cx, top - 10, r + 1, roof, copper);
  };
  roundTower(46, 9, 56, 28);
  roundTower(228, 8, 62, 26);

  // Bridges on arches: one from the round tower to the left edge, one to the right. Their arches are
  // open, and Thalesferro shows through them.
  const bridge = (x0: number, x1: number, deck: number) => {
    bricks(x0, deck, x1, groundY, 0.35);
    rail(x0, x1, deck - 4);
    for (let x = x0; x <= x1; x++) mid.set(x, deck, brick[5]!);
    const span = x1 - x0;
    const cx = (x0 + x1) / 2;
    const r = span / 2 - 5;
    for (let y = deck + 6; y <= groundY; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot((x + 0.5 - cx) / r, Math.max(0, deck + 6 + r * 0.8 - y - 0.5) / (r * 0.8));
        if (d <= 1 && Math.abs(x + 0.5 - cx) < r) mid.set(x, y, 0);
        else if (d <= 1.12 && Math.abs(x + 0.5 - cx) < r + 2) mid.set(x, y, brick[1]!);
      }
    }
  };
  bridge(-4, 36, 98);
  bridge(238, 300, 104);
  bridge(300, 386, 104);
  // Brackets of lamps on the walls.
  for (const [lx, ly] of [
    [112, 132],
    [146, 132],
    [196, 132],
    [212, 132],
  ] as const) {
    mid.rect(lx, ly, lx + 1, ly + 2, fire[3]!);
    glows.push([lx + 1, ly + 1, 8]);
  }

  // The yard: cobbles, warm where the fire of the gate and the arches falls on them.
  const cobble = hexes('#16100e', '#201814', '#2c201a', '#3a2c22', '#4a382a');
  for (let y = groundY + 1; y < H; y++) {
    const row = y - groundY;
    const stride = 3 + Math.floor(row / 8);
    for (let x = 0; x < mid.w; x++) {
      const k = (x + (Math.floor(row / 2) % 2) * Math.floor(stride / 2)) % stride;
      const t = (row % 2 === 0 || k === 0 ? 0.1 : 0.45) + noise1(x * 0.7 + y * 3, 174) * 0.2 - row / 80;
      mid.set(x, y, Canvas.rampAt(cobble, t, x, y));
    }
  }
  for (let y = groundY + 1; y < H; y++) {
    const spread = 12 + (y - groundY) * 1.4;
    for (let x = Math.floor(gx - spread); x <= gx + spread; x++) mid.mix(x, y, hex('#ffb050'), 0.4 * (1 - (y - groundY) / 30) * (1 - Math.abs(x - gx) / spread));
  }
  for (const [x, y, r] of glows) mid.glow(x, y, r, hex('#ff9a40'), 0.3);
  mid.glow(gx, 140, 40, hex('#ff9a40'), 0.35);

  // ---- Near: barrels and crates in the yard, and a lamp on a post.
  const near = new Canvas(WIDE, H);
  const oak = hexes('#140c08', '#22140c', '#341e10', '#4a2c16', '#6a4020');
  const barrel = (x: number, foot: number, w: number, h: number) => {
    for (let y = foot - h; y <= foot; y++) {
      const t = (y - foot + h) / h;
      const bulge = Math.sin(t * Math.PI) * 1.5;
      for (let px = Math.round(x - bulge); px <= Math.round(x + w + bulge); px++) {
        const across = (px - x + bulge) / (w + 2 * bulge);
        const hoop = Math.abs(t - 0.2) < 0.05 || Math.abs(t - 0.8) < 0.05;
        near.set(px, y, hoop ? Canvas.rampAt(iron, 0.9 - across * 0.8, px, y) : Canvas.rampAt(oak, 0.85 - across * 0.85 + ((px - x) % 3 === 0 ? -0.12 : 0), px, y));
      }
    }
    for (let px = x; px <= x + w; px++) near.set(px, foot - h, oak[2]!);
  };
  const crate = (x: number, foot: number, s: number) => {
    near.rect(x, foot - s, x + s, foot, oak[2]!);
    near.rect(x, foot - s, x + s, foot - s, oak[4]!);
    near.rect(x, foot - s, x, foot, oak[3]!);
    near.line(x + 1, foot - 1, x + s - 1, foot - s + 1, oak[1]!);
    near.rect(x + s, foot - s, x + s, foot, oak[0]!);
  };
  near.rect(0, 172, near.w - 1, H - 1, hex('#0a0706'));
  barrel(6, 176, 14, 22);
  barrel(26, 177, 12, 18);
  barrel(14, 154, 11, 14);
  crate(44, 176, 12);
  crate(330, 177, 14);
  crate(346, 177, 10);
  barrel(358, 178, 13, 20);
  near.rect(300, 116, 301, 172, iron[1]!);
  near.rect(297, 112, 304, 116, iron[1]!);
  near.rect(298, 116, 303, 116, iron[2]!);
  near.glow(300.5, 118, 16, hex('#ffb050'), 0.55);
  near.rect(299, 116, 302, 119, hex('#ffd080'));

  return {
    id: 'factory',
    layers: [
      { image: sky.image, depth: 0 },
      { image: far.image, depth: 0.2 },
      { image: mid.image, depth: 0.5 },
      { image: near.image, depth: 1 },
    ],
    emitters: [
      ...stacks.map(([cx, top]): PrologueEmitter => ({ kind: 'smoke', layer: 2, x: cx - 3, y: top - 8, w: 6, h: 4, rate: 2.5, colour: '#5a4038' })),
      ...stacks.map(([cx, top]): PrologueEmitter => ({ kind: 'embers', layer: 2, x: cx - 3, y: top - 4, w: 6, h: 3, rate: 3, colour: '#ffa040' })),
      { kind: 'embers', layer: 2, x: 168, y: 126, w: 14, h: 20, rate: 4, colour: '#ffc060' },
      { kind: 'twinkle', layer: 0, x: 0, y: 0, w: 320, h: 36, rate: 6, colour: '#e8ecff' },
    ],
  };
}

// ---------------------------------------------------------------- 9. Your hut in the Wilds

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
  return [kandrax(), ruins(), mapScene(), wild(), gods(), ironScene(), mithrilScene(), factory(), hut()].map((scene) => ({ ...scene, ambience: AMBIENCE_OF[scene.id] }));
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
