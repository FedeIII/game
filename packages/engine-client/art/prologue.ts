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

/**
 * A spruce of the north: tiers of branches that droop at their tips, ragged at the edge, lit from the
 * left by the moon. `ramp` goes from the shadow to the lit needles; `rim` is the cold edge on the lit
 * side (none for a far tree). The lowest tier ends `skirt` pixels above the foot, where the trunk shows.
 */
function spruce(c: Canvas, x: number, foot: number, height: number, ramp: readonly number[], rim: number | null, seed: number, skirt = 0, trunk: number | null = null): void {
  const top = foot - height;
  const bottom = foot - skirt;
  const tiers = Math.max(3, Math.round(height / 7));
  const widest = height * 0.27;
  if (trunk !== null && skirt > 0) c.rect(Math.round(x) - 1, bottom - 4, Math.round(x) + 1, foot, trunk);
  for (let y = Math.floor(top); y <= bottom; y++) {
    const t = (y - top) / Math.max(1, bottom - top);
    const tier = (t * tiers) % 1;
    const jag = (noise1(y * 1.7, seed) - 0.5) * 2.4 * Math.min(1, t * 3);
    const half = Math.max(0.5, widest * (0.1 + 0.9 * t) * (0.42 + 0.58 * tier ** 0.8) + jag);
    const x0 = Math.round(x - half);
    const x1 = Math.round(x + half);
    for (let px = x0; px <= x1; px++) {
      const u = (px - x) / Math.max(1, half);
      const needles = noise1(px * 0.9 + y * 2.3, seed + 7) - 0.5;
      // Lit on the left; the top of each tier lies in the shadow of the tier above it.
      const shade = 0.6 - u * 0.32 - (1 - tier) * 0.28 + needles * 0.4 - t * 0.12;
      c.set(px, y, Canvas.rampAt(ramp, shade, px, y));
    }
    // The tips of a tier droop: one pixel lower at both ends.
    if (tier > 0.78 && t > 0.15) {
      c.set(x0 - 1, y + 1, ramp[0]!);
      c.set(x1 + 1, y + 1, ramp[0]!);
    }
    if (rim !== null && t > 0.05 && tier > 0.3) c.set(x0, y, rim);
  }
  c.set(Math.round(x), Math.floor(top) - 1, ramp[0]!);
}

/**
 * The character's home at night (CLAUDE.md, "The worlds": the hut of the cell (0, 0)): a log hut with
 * a steep thatch roof, a stone chimney, a lit window and a door ajar, alone in a clearing of the spruce
 * forest. The view is three-quarters: the long front wall faces the viewer, and the gable end goes
 * back to the left. The moon, high on the left, lights the gable, the thatch and the left edges of the
 * trees with a cold light; the fire inside lights the window, the door and the ground with a warm one.
 */
function hut(): PrologueScene {
  // ---- The sky: a deep night, stars, the moon on the left, and thin clouds that it lights.
  const sky = new Canvas(PROLOGUE_VIEW.w, H);
  sky.vgrad(0, 0, sky.w - 1, H - 1, hexes('#03050a', '#060912', '#0a0f1c', '#0e1526', '#131b30', '#18223a'), (t) => t ** 1.1);
  stars(sky, 181, 340, 125);
  moon(sky, 54, 30, 9, 187);
  streakClouds(sky, 188, 44, 92, hex('#0c1222'), hex('#56627e'), 54, 30, 0.7);

  // ---- Far: mountains of the north with snow, and a far line of spruces in the mist.
  const far = new Canvas(WIDE, H);
  mountains(far, peaks(112, 56, 82, 189), hexes('#0b101c', '#0f1524', '#141b2c', '#1a2336', '#212b42'), hex('#46526e'), 82, -1);
  const farTrees = hexes('#0c121e', '#101828', '#152034');
  const farLine = heights(124, 6, 30, 190);
  far.ridge(farLine, () => farTrees[0]!);
  for (let x = -4; x < far.w + 4; x += 3) spruce(far, x + noise1(x * 0.5, 191) * 2, Math.round(farLine(x)) + 3, 8 + noise1(x * 0.23, 192) * 12, farTrees, hex('#1c2840'), 193 + x);
  for (let y = 112; y < H; y++) for (let x = 0; x < far.w; x++) far.mix(x, y, hex('#3a4660'), 0.22 * Math.max(0, 1 - Math.abs(y - 128) / 14) * (0.6 + fbm2(x / 30, y / 6, 194, 3) * 0.8));

  // ---- The forest round the clearing: tall dark spruces, with the moon on their left edges.
  const forest = new Canvas(WIDE, H);
  const wood = hexes('#070b12', '#0a1018', '#0e1620', '#131d2a', '#1a2636');
  const edge = (x: number) => 136 + fbm1(x / 26, 195, 3) * 5;
  forest.ridge((x) => edge(x) - 4, (x, y) => Canvas.rampAt(hexes('#0a0f15', '#080c11'), (y - edge(x)) / 30, x, y));
  const stand = rng(196);
  for (let x = -8; x < forest.w + 8; ) {
    // Lower in the middle left, where the mountains show; taller behind the hut and at the right.
    const lift = x > 70 && x < 160 ? -12 : x > 180 ? 8 : 0;
    const h = Math.max(16, 26 + stand() * 30 + (stand() < 0.18 ? 26 : 0) + lift);
    spruce(forest, x, Math.round(edge(x)) + 2, h, wood, hex('#23324a'), 197 + x);
    x += 6 + Math.floor(stand() * 12);
  }
  // A second row in front, lower: the forest has depth.
  for (let x = -4; x < forest.w + 8; ) {
    const h = 22 + stand() * 26;
    spruce(forest, x, Math.round(edge(x)) + 6, h, hexes('#05080d', '#080d14', '#0c131c', '#121b28'), hex('#1e2b40'), 198 + x);
    x += 12 + Math.floor(stand() * 16);
  }
  // Mist at the foot of the trees.
  for (let y = 118; y < 150; y++) for (let x = 0; x < forest.w; x++) forest.mix(x, y, hex('#4a5670'), 0.16 * Math.max(0, 1 - Math.abs(y - 136) / 12) * fbm2(x / 24, y / 5, 199, 3));

  // ---- The clearing and the hut.
  const mid = new Canvas(WIDE, H);
  const lamp = hexes('#c06a2c', '#f0a048', '#ffd07a', '#fff0c0');
  const ground = hexes('#0b1012', '#0f1517', '#131b1c', '#18221f', '#1e2a26');
  const groundTop = (x: number) => 133 + fbm1(x / 20, 200, 3) * 4;
  for (let x = 0; x < mid.w; x++) {
    const t0 = Math.round(groundTop(x));
    for (let y = t0; y < H; y++) {
      const n = fbm2(x / 9, y / 4, 201, 3);
      mid.set(x, y, Canvas.rampAt(ground, 0.25 + (y - t0) / 90 + (n - 0.5) * 0.5, x, y));
    }
    // Tufts of grass on the edge of the clearing, and the moon on them.
    if (noise1(x * 1.3, 202) > 0.55) mid.set(x, t0 - 1, ground[1]!);
    if (noise1(x * 2.1, 203) > 0.72) mid.set(x, t0 - 2, ground[0]!);
  }
  const tufts = rng(204);
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(tufts() * mid.w);
    const y = 138 + Math.floor(tufts() * 42);
    mid.set(x, y, ground[3 + (tufts() < 0.3 ? 1 : 0)]!);
    if (tufts() < 0.5) mid.set(x, y - 1, ground[2]!);
  }

  // The hut, in the coordinates of the layer. The front wall runs from fx0 to fx1; the gable end goes
  // back to the left by (gdx, gdy); the ridge stands over the middle of the gable.
  const fx0 = 188;
  const fx1 = 258;
  const base = 150;
  const wallH = 26;
  const top = base - wallH;
  const gdx = -26;
  const gdy = -10;
  const gableH = 26;
  const p1: readonly [number, number] = [fx0, top];
  const p2: readonly [number, number] = [fx0 + gdx, top + gdy];
  const g: readonly [number, number] = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2 - gableH];
  const log = hexes('#140d08', '#20150d', '#2c1d12', '#3a2818', '#4a3520', '#5c442c');
  const coldLog = log.map((c) => lerpColour(c, hex('#5a6888'), 0.18));
  const stone = hexes('#141418', '#1e1e24', '#2a2a32', '#383842', '#4a4a56', '#5e5e6c');

  // The shadow of the hut on the ground, away from the moon (to the lower right).
  mid.poly(
    [
      [fx0, base + 1],
      [fx1 + 2, base + 1],
      [fx1 + 30, base + 9],
      [fx0 + 24, base + 9],
    ],
    (x, y) => lerpColour(mid.get(x, y), hex('#05080a'), 0.45),
  );

  // The gable wall: logs that go back to the left, lit by the moon.
  const gableTop = (x: number) => top + (x - fx0) * (gdy / gdx);
  for (let x = p2[0]; x <= fx0; x++) {
    const yt = Math.round(gableTop(x));
    for (let y = yt; y <= base + Math.round((x - fx0) * (gdy / gdx)); y++) {
      const r = y - yt;
      const row = r % 4;
      const course = Math.floor(r / 4);
      const tone = row === 3 ? 0.05 : row === 0 ? 0.78 : 0.55 - row * 0.08;
      const grain = noise1(x * 0.7 + course * 13.1, 205) * 0.18;
      mid.set(x, y, Canvas.rampAt(coldLog, tone + grain - (fx0 - x) / 140, x, y));
    }
  }
  // The front wall: logs along the front, in the shadow of the eave at the top.
  for (let y = top; y <= base; y++) {
    const r = y - top;
    const row = r % 4;
    const course = Math.floor(r / 4);
    for (let x = fx0 + 1; x <= fx1; x++) {
      const tone = row === 3 ? 0.04 : row === 0 ? 0.6 : 0.45 - row * 0.07;
      const grain = (noise1(x * 0.6 + course * 17.3, 206) - 0.5) * 0.22 + (noise1(course * 5.1, 207) - 0.5) * 0.15;
      const eave = y < top + 5 ? 0.25 : 0;
      mid.set(x, y, Canvas.rampAt(log, tone + grain - eave - (x - fx0) / 260, x, y));
    }
  }
  // The corner where the walls meet, and the round ends of the logs at the corners.
  for (let y = top; y <= base; y++) mid.set(fx0, y, log[1]!);
  for (let k = 0; k * 4 + 2 <= wallH; k++) {
    const yk = top + k * 4 + 1.5;
    for (const [cx, cy, cold] of [
      [fx0 - 0.5, yk, true],
      [fx1 + 1.5, yk, false],
      [p2[0] - 0.5, yk + gdy, true],
    ] as const) {
      mid.disc(cx, cy, 1.9, (x, y, d) => {
        const ring = d > 0.7 ? 0 : d > 0.35 ? 0.65 : 0.4;
        const lit = (x < cx ? 0.2 : -0.1) + (y < cy ? 0.15 : -0.1);
        return Canvas.rampAt(cold ? coldLog : log, ring + lit + 0.15, x, y);
      });
    }
  }
  // The footing: fieldstones under both walls.
  const footing = (x: number, y: number) => {
    const sx = Math.floor((x + (Math.floor(y / 3) % 2) * 2) / 5);
    const sy = Math.floor(y / 3);
    const joint = (x + (Math.floor(y / 3) % 2) * 2) % 5 === 0 || y % 3 === 0;
    const tone = 0.3 + noise1(sx * 7.3 + sy * 3.1, 208) * 0.4 - (joint ? 0.3 : 0) + ((x + y) % 5 === 1 ? 0.1 : 0);
    mid.set(x, y, Canvas.rampAt(stone, tone, x, y));
  };
  for (let x = fx0 - 1; x <= fx1 + 2; x++) for (let y = base - 1; y <= base + 2; y++) footing(x, y);
  for (let x = p2[0] - 1; x < fx0 - 1; x++) {
    const yb = Math.round(base + (x - fx0) * (gdy / gdx));
    for (let y = yb - 1; y <= yb + 2; y++) footing(x, y);
  }

  // The window: a frame, four panes with the fire behind them, a sill, and shutters open on both sides.
  const wx0 = 200;
  const wy0 = 135;
  mid.glow(wx0 + 6, wy0 + 5, 20, lamp[1]!, 0.22);
  mid.rect(wx0 - 1, wy0 - 1, wx0 + 12, wy0 + 10, log[0]!);
  for (let y = wy0; y <= wy0 + 9; y++) {
    for (let x = wx0; x <= wx0 + 11; x++) {
      const heat = 1 - Math.hypot((x - wx0 - 6) / 7, (y - wy0 - 7) / 6) * 0.6;
      mid.set(x, y, Canvas.rampAt(lamp, 0.3 + heat * 0.7 + (noise1(x * 3.1 + y * 7.7, 209) - 0.5) * 0.25, x, y));
    }
  }
  mid.rect(wx0 + 5, wy0, wx0 + 6, wy0 + 9, log[1]!);
  mid.rect(wx0, wy0 + 4, wx0 + 11, wy0 + 4, log[1]!);
  mid.rect(wx0 - 2, wy0 + 11, wx0 + 13, wy0 + 11, log[4]!);
  mid.rect(wx0 - 2, wy0 + 12, wx0 + 13, wy0 + 12, log[1]!);
  for (const [sx0, lit] of [
    [wx0 - 6, 0.5],
    [wx0 + 13, 0.35],
  ] as const) {
    for (let y = wy0 - 1; y <= wy0 + 10; y++) {
      for (let x = sx0; x < sx0 + 5; x++) mid.set(x, y, Canvas.rampAt(log, lit + ((x - sx0) % 2 === 0 ? 0.1 : -0.05) - (y === wy0 + 4 ? 0.25 : 0), x, y));
    }
    mid.line(sx0, wy0 + 9, sx0 + 4, wy0, log[1]!);
  }
  // The light of the window on the ground in front of the hut: a soft pool.
  const pool = (cx: number, cy: number, rx: number, ry: number, colour: number, strength: number) => {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const dd = Math.hypot((x - cx) / rx, (y - cy) / ry);
        if (dd < 1) mid.mix(x, y, colour, strength * (1 - dd) ** 1.5);
      }
    }
  };
  pool(wx0 + 5, base + 6, 15, 5, lamp[1]!, 0.24);

  // The door: a heavy door of planks with iron straps, ajar, the fire's light in the gap, a lintel.
  const dx0 = 226;
  const dx1 = 237;
  const dy0 = 133;
  mid.rect(dx0 - 1, dy0 - 2, dx1 + 1, dy0 - 1, log[4]!);
  mid.rect(dx0 - 1, dy0 - 1, dx1 + 1, dy0 - 1, log[2]!);
  mid.rect(dx0 - 1, dy0, dx0 - 1, base, log[0]!);
  mid.rect(dx1 + 1, dy0, dx1 + 1, base, log[0]!);
  for (let y = dy0; y <= base; y++) {
    for (let x = dx0; x <= dx0 + 3; x++) mid.set(x, y, Canvas.rampAt(lamp, 0.95 - (x - dx0) * 0.12 - (y - dy0) / 60, x, y));
    for (let x = dx0 + 4; x <= dx1; x++) {
      const plank = (x - dx0 - 4) % 3 === 0;
      mid.set(x, y, Canvas.rampAt(log, (plank ? 0.12 : 0.32) + (noise1(x * 5.3 + y * 0.4, 210) - 0.5) * 0.15 - (x - dx0) / 40, x, y));
    }
  }
  for (const sy of [dy0 + 4, base - 4]) {
    mid.rect(dx0 + 4, sy, dx1, sy, hex('#2a2a30'));
    for (let x = dx0 + 5; x <= dx1; x += 3) mid.set(x, sy, hex('#4a4a54'));
  }
  mid.set(dx0 + 5, dy0 + 10, hex('#4a4a54'));
  mid.set(dx0 + 5, dy0 + 11, hex('#2a2a30'));
  // A lantern on a hook by the door.
  mid.line(dx1 + 3, dy0 - 1, dx1 + 5, dy0 - 1, hex('#2a2a30'));
  mid.rect(dx1 + 4, dy0, dx1 + 6, dy0 + 3, hex('#1e1c1e'));
  mid.rect(dx1 + 5, dy0 + 1, dx1 + 5, dy0 + 2, lamp[3]!);
  mid.glow(dx1 + 5, dy0 + 2, 12, lamp[1]!, 0.35);

  // The thatch: first the end of the roof over the gable (straw ends), then the gable boards under it.
  const strawEnd = hexes('#120d08', '#1c150c', '#281e12', '#34281a');
  const straw = hexes('#1a140b', '#261d10', '#342816', '#44361e', '#564528', '#6a5634', '#7e6a44');
  const moss = hexes('#141c10', '#1c2716', '#26331c');
  const a: readonly [number, number] = [fx0 - 3, top + 4];
  const e: readonly [number, number] = [p2[0] - 4, p2[1] + 4];
  const d: readonly [number, number] = [g[0] - 2, g[1] - 2];
  mid.poly([d, a, e], (x, y) => Canvas.rampAt(strawEnd, 0.5 + (noise1(x * 2.7 + y * 1.9, 211) - 0.5) * 0.8 - (y - d[1]) / 80, x, y));
  mid.poly(
    [
      [p1[0] - 1, p1[1] + 2],
      [p2[0] + 2, p2[1] + 2],
      [g[0], g[1] + 9],
    ],
    (x, y) => Canvas.rampAt(coldLog, ((x - p2[0]) % 3 === 0 ? 0.15 : 0.5) + (noise1(x * 3.1 + y * 0.3, 212) - 0.5) * 0.2 - (g[1] + 22 - y) / 60, x, y),
  );
  // A small vent in the gable.
  mid.rect(Math.round(g[0]) - 1, Math.round(g[1]) + 12, Math.round(g[0]) + 1, Math.round(g[1]) + 14, log[0]!);
  // The cold light of the moon on the edge of the verge.
  mid.line(d[0], d[1], e[0], e[1], hex('#4c5670'));

  // The front slope: courses of straw from the eave up to the ridge, lit from the upper left,
  // with patches of moss, a ragged eave and a ridge of bound straw.
  const b: readonly [number, number] = [fx1 + 6, top + 4];
  const c: readonly [number, number] = [b[0] + (d[0] - a[0]), d[1]];
  const slopeX = (d[0] - a[0]) / (d[1] - a[1]);
  mid.poly([a, b, c, d], (x, y) => {
    const v = (y - d[1]) / (a[1] - d[1]);
    const along = x - (y - a[1]) * slopeX;
    // Stalks run down the slope; the layers of the thatch make soft bands across it.
    const stalks = noise1(along * 1.6 + Math.floor(v * 14) * 0.35, 213) * 0.65 + noise1(along * 0.45, 226) * 0.35;
    const band = Math.sin(v * Math.PI * 4.5) * 0.06;
    let tone = 0.36 + (stalks - 0.5) * 0.7 + band + (1 - v) * 0.16 - (along - a[0]) / 380 - Math.max(0, v - 0.82) * 1.2;
    // The moon lights the upper left of the slope.
    tone += Math.max(0, 1 - Math.hypot((along - a[0]) / 40, v / 0.7)) * 0.18;
    const mossy = fbm2(x / 6, y / 3.5, 214, 3);
    if (mossy > 0.66 && v > 0.3) return Canvas.rampAt(moss, (mossy - 0.66) * 7 + (stalks - 0.5) * 0.5, x, y);
    return Canvas.rampAt(straw, tone, x, y);
  });
  // The eave: thick, dark, with straw ends that hang down, and the shadow under it.
  for (let x = Math.round(a[0]) - 1; x <= Math.round(b[0]) + 1; x++) {
    const corner = Math.min(x - (a[0] - 1), b[0] + 1 - x);
    const thick = 3 + Math.floor(noise1(x * 1.9, 215) * 2.6) - (corner < 2 ? 2 - corner : 0);
    for (let k = -1; k <= thick; k++) {
      const end = noise1(x * 2.3 + k * 5.1, 227);
      mid.set(x, a[1] + k, Canvas.rampAt(strawEnd, k < 0 ? 0.75 : 0.55 - k * 0.12 + (end - 0.5) * 0.6, x, a[1] + k));
    }
  }
  // The shadow of the eave on the wall below it.
  for (let x = fx0 + 1; x <= fx1; x++) for (let y = a[1] + 3; y <= a[1] + 6; y++) mid.set(x, y, lerpColour(mid.get(x, y), hex('#05060a'), 0.5 - (y - a[1] - 3) * 0.12));
  // The right edge of the slope: the end of the thatch, in the shadow.
  for (let y = Math.round(c[1]); y <= b[1]; y++) {
    const xr = Math.round(c[0] + ((b[0] - c[0]) * (y - c[1])) / (b[1] - c[1]));
    mid.set(xr, y, strawEnd[1]!);
    mid.set(xr + 1, y, strawEnd[0]!);
  }
  // The left edge of the slope catches the moon.
  mid.line(a[0], a[1] - 1, d[0], d[1], hex('#6a6c74'));
  mid.line(a[0] + 1, a[1] - 1, d[0] + 1, d[1] + 1, straw[5]!);
  // The ridge: bound straw, lit on top, with pegs across it.
  for (let x = Math.round(d[0]); x <= Math.round(c[0]) + 1; x++) {
    const i = x - Math.round(d[0]);
    const scallop = Math.abs(((i % 6) - 2.5) / 2.5) < 0.5 ? 1 : 0;
    for (let y = d[1] - 2; y <= d[1] + 3 + scallop; y++) {
      const spar = (y - d[1] > 0 && y - d[1] < 3 && ((i + y) % 6 === 0 || (i - y + 60) % 6 === 0));
      const tone = y === d[1] - 2 ? 0.85 : y === d[1] + 3 + scallop ? 0.05 : 0.6 - (y - d[1]) * 0.08 - i / 260;
      mid.set(x, y, spar ? strawEnd[1]! : Canvas.rampAt(straw, tone + (noise1(i * 1.7 + y, 228) - 0.5) * 0.25, x, y));
    }
  }
  mid.line(d[0], d[1] - 2, d[0] + 26, d[1] - 2, hex('#7a7c84'));

  // The chimney of fieldstones, through the slope near the right end, with a slab on top.
  const cx0 = 238;
  const cx1 = 245;
  const cTop = 82;
  const cFoot = 110;
  for (let y = cTop; y <= cFoot; y++) {
    for (let x = cx0; x <= cx1 + 2; x++) {
      const side = x > cx1;
      const sx = Math.floor((x + (Math.floor(y / 3) % 2) * 2) / 4);
      const joint = (x + (Math.floor(y / 3) % 2) * 2) % 4 === 0 || y % 3 === 0;
      const tone = (side ? 0.12 : 0.55 - (x - cx0) * 0.04) + noise1(sx * 5.7 + Math.floor(y / 3) * 2.3, 216) * 0.25 - (joint ? 0.22 : 0);
      mid.set(x, y, Canvas.rampAt(stone, tone, x, y));
    }
  }
  mid.rect(cx0 - 1, cTop - 1, cx1 + 3, cTop, stone[4]!);
  mid.rect(cx0 - 1, cTop - 1, cx0 + 2, cTop - 1, stone[5]!);
  mid.rect(cx0 + 1, cTop - 2, cx1, cTop - 2, stone[0]!);
  // The straw round the foot of the chimney.
  for (let x = cx0 - 1; x <= cx1 + 3; x++) mid.set(x, cFoot + 1, straw[0]!);

  // A lean-to on the right, with split logs stacked under it.
  const lx0 = fx1 + 4;
  const lx1 = 292;
  for (let x = lx0; x <= lx1 + 2; x++) {
    const y = Math.round(131 + ((x - lx0) / (lx1 - lx0)) * 8);
    mid.set(x, y, log[4]!);
    mid.set(x, y + 1, log[2]!);
    mid.set(x, y + 2, log[0]!);
  }
  mid.rect(lx1, 140, lx1 + 1, base + 1, log[2]!);
  mid.rect(lx1, 140, lx1, base + 1, log[3]!);
  const pile = rng(217);
  for (let row = 0; row < 5; row++) {
    for (let x = lx0 + 3 + (row % 2) * 2; x <= lx1 - 3; x += 4) {
      const cy = base - 1 - row * 3.4;
      const lit = pile() * 0.3;
      mid.disc(x, cy, 1.8, (px, py, dd) => Canvas.rampAt(hexes('#1a120a', '#3a2a1a', '#5e4a32', '#7a6446'), dd > 0.75 ? 0.1 : 0.5 + lit + (px < x ? 0.15 : -0.1) - (py > cy ? 0.15 : 0), px, py));
    }
  }

  // A water barrel by the front corner: staves, two iron hoops, dark water with the moon in it.
  const bx = 181;
  for (let y = 140; y <= base + 2; y++) {
    const bulge = 4 + Math.sin(((y - 140) / 12) * Math.PI) * 0.8;
    for (let x = Math.round(bx - bulge); x <= Math.round(bx + bulge); x++) {
      const u = (x - bx) / bulge;
      const hoop = y === 142 || y === base - 1;
      mid.set(x, y, hoop ? Canvas.rampAt(stone, 0.35 - u * 0.25, x, y) : Canvas.rampAt(log, 0.55 - u * 0.4 - ((x - bx + 9) % 3 === 0 ? 0.15 : 0), x, y));
    }
  }
  for (let x = bx - 3; x <= bx + 3; x++) mid.set(x, 139, hex('#0a0e16'));
  mid.set(bx - 1, 139, hex('#5a6684'));
  for (let x = bx - 4; x <= bx + 4; x++) mid.set(x, 138, log[3]!);

  // The chopping block in the yard, with an axe in it.
  const kx = 280;
  const ky = 160;
  for (let y = ky; y <= ky + 5; y++) for (let x = kx - 4; x <= kx + 4; x++) mid.set(x, y, Canvas.rampAt(log, 0.35 - (x - kx) / 10 + ((x + y) % 3 === 0 ? -0.1 : 0), x, y));
  mid.disc(kx, ky, 4.2, (x, y, dd) => (y > ky ? null : Canvas.rampAt(hexes('#3a2a1a', '#5e4a32', '#7a6446', '#8e7a5a'), dd > 0.8 ? 0.2 : 0.75 - dd * 0.4 + (x < kx ? 0.1 : 0), x, y)));
  mid.line(kx + 1, ky - 1, kx + 6, ky - 8, log[4]!);
  mid.line(kx + 2, ky - 1, kx + 7, ky - 8, log[2]!);
  mid.rect(kx - 1, ky - 2, kx + 2, ky - 1, hex('#4a4a54'));
  mid.set(kx - 1, ky - 2, hex('#8a8c98'));

  // The path from the door, worn into the grass, with stones at its edges.
  const earth = hexes('#12110e', '#181612', '#1f1c16', '#27231b');
  const stones = rng(218);
  for (let y = base + 1; y < H; y++) {
    const k = (y - base) / (H - base);
    const mx = dx0 + 2 - 28 * k ** 1.5 + Math.sin(k * Math.PI) * 6;
    const half = 3 + k * 6 + (noise1(y * 0.6, 229) - 0.5) * 2;
    for (let x = Math.round(mx - half); x <= Math.round(mx + half); x++) {
      const edgeK = Math.abs(x - mx) / half;
      if (edgeK > 0.85 && noise1(x * 1.7 + y * 3.1, 219) > 0.5) continue;
      mid.set(x, y, Canvas.rampAt(earth, 0.45 + (noise1(x * 0.8 + y * 2.2, 220) - 0.5) * 0.5 - edgeK * 0.2, x, y));
    }
    if (stones() < 0.35) {
      const sx = mx + (stones() < 0.5 ? -1 : 1) * (half + 1);
      mid.set(sx, y, stone[3]!);
      mid.set(sx - 1, y, stone[4]!);
    }
  }
  // The light of the door on the threshold and the path: a pool, and a faint shaft from the gap.
  pool(dx0 + 1, base + 5, 16, 7, lamp[1]!, 0.34);

  // Rocks with the moon on their tops, and low bushes, about the clearing.
  for (const [rx, ry, rr] of [
    [150, 160, 3.2],
    [156, 162, 2],
    [302, 156, 2.6],
    [252, 170, 2.4],
    [96, 166, 3.6],
  ] as const) {
    mid.disc(rx, ry, rr, (x, y, dd) => (y > ry + 1 ? null : Canvas.rampAt(stone, 0.6 - dd * 0.45 - (x - rx) / (rr * 3) - (y - ry + rr) / (rr * 4), x, y)));
  }
  for (const [bx0, by0, bw] of [
    [132, 152, 9],
    [312, 150, 11],
    [168, 168, 7],
  ] as const) {
    for (let k = 0; k < bw * 3; k++) {
      const x = bx0 + noise1(k * 1.7, 230 + bx0) * bw;
      const y = by0 - noise1(k * 2.3, 231 + bx0) * 4 * Math.sin(((x - bx0) / bw) * Math.PI);
      mid.set(x, y, Canvas.rampAt(hexes('#0a100e', '#111a16', '#1a2620', '#24332a'), 0.3 + (bx0 + bw / 2 - x) / (bw * 2) + (by0 - y) / 8, x, y));
    }
  }

  // The signpost by the path, on its west side, pointing west.
  const spx = 202;
  const spFoot = 175;
  mid.rect(spx, spFoot - 22, spx + 1, spFoot, log[2]!);
  mid.rect(spx, spFoot - 22, spx, spFoot, coldLog[4]!);
  mid.poly(
    [
      [spx - 15, spFoot - 17.5],
      [spx - 11, spFoot - 21],
      [spx + 4, spFoot - 21],
      [spx + 4, spFoot - 14],
      [spx - 11, spFoot - 14],
    ],
    (x, y) => Canvas.rampAt(log, 0.75 - (y - spFoot + 21) * 0.07 + (x < spx - 10 ? 0.08 : 0), x, y),
  );
  mid.line(spx - 15, spFoot - 18, spx - 11, spFoot - 22, hex('#6a7290'));
  mid.line(spx - 11, spFoot - 22, spx + 4, spFoot - 22, hex('#4e5670'));
  for (let x = spx - 9; x <= spx + 1; x += 2) mid.rect(x, spFoot - 18, x, spFoot - 17, log[0]!);
  mid.rect(spx - 15, spFoot - 13, spx + 4, spFoot - 13, log[0]!);

  // A fence of stakes and rails on the left, going off into the dark.
  for (let k = 0; k < 5; k++) {
    const px = 108 + k * 13;
    const py = 146 + k;
    mid.rect(px, py - 9, px + 1, py, log[2]!);
    mid.set(px, py - 9, coldLog[4]!);
    mid.rect(px, py - 8, px, py, coldLog[3]!);
    if (k < 4) {
      for (const ry of [py - 7, py - 3]) mid.line(px + 2, ry + 1, px + 12, ry + 2, log[3]!);
    }
  }

  // ---- The near trees, very dark, at the edges, and the grass before them.
  const near = new Canvas(WIDE, H);
  const dark = hexes('#030508', '#05080c', '#080c12', '#0c121a', '#111a24');
  for (const [x, h, seed] of [
    [-8, 196, 221],
    [24, 150, 222],
    [372, 170, 223],
    [400, 196, 224],
  ] as const) spruce(near, x, H + 6, h, dark, hex('#1a2436'), seed, 8, hex('#06080a'));
  const grass = rng(225);
  for (let x = 0; x < near.w; x++) {
    if (grass() < 0.55) near.line(x, H - 1, x + (grass() < 0.5 ? -1 : 1), H - 2 - Math.floor(grass() * 6), dark[grass() < 0.7 ? 0 : 2]!);
    if (grass() < 0.05) near.set(x, H - 4 - Math.floor(grass() * 4), hex('#1e2a30'));
  }
  // Ferns on the lower left, and a mossy rock on the right.
  for (let i = 0; i < 6; i++) {
    const fx = 70 + i * 9 + Math.floor(grass() * 4);
    for (let k = 0; k < 6; k++) near.line(fx, H - 1, fx - 6 + k * 2, H - 7 - (k % 3), dark[1]!);
  }
  near.disc(318, H - 2, 7, (x, y, dd) => Canvas.rampAt(hexes('#06080c', '#0e131a', '#171e28', '#222c3a'), 0.75 - dd * 0.6 - (x - 312) / 14 + (y < H - 6 ? 0.1 : 0), x, y));

  return {
    id: 'hut',
    layers: [
      { image: sky.image, depth: 0 },
      { image: far.image, depth: 0.15 },
      { image: forest.image, depth: 0.35 },
      { image: mid.image, depth: 0.55 },
      { image: near.image, depth: 1 },
    ],
    emitters: [
      { kind: 'twinkle', layer: 0, x: 0, y: 0, w: 320, h: 110, rate: 30, colour: '#e8ecff' },
      { kind: 'smoke', layer: 3, x: cx0 + 1, y: cTop - 6, w: 6, h: 4, rate: 1.6, colour: '#2e3444' },
      { kind: 'mist', layer: 3, x: 0, y: 136, w: WIDE, h: 14, rate: 0.5, colour: '#8a96b0' },
      { kind: 'fireflies', layer: 4, x: 40, y: 124, w: 300, h: 52, rate: 10, colour: '#d8f0a0' },
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
