/**
 * The two dominions of the prologue (art/prologue.ts; Fede, 2026-10-12): the Iron Sovereignty and the
 * Mithril Enclave, each in a scene of its own. The age is medieval, with no modern towers. The Iron
 * Sovereignty is a European port of stone and timber; the Mithril Enclave is a town of the Arabic
 * middle ages with a magical tone. The light comes from the top left, as in the rest of the game.
 *
 * The page draws the name of the dominion on a band over rows 30 to 64 for a few seconds, so the
 * landmarks (the keep, the gold dome) stand mostly below it.
 */
import { Canvas, fbm1, fbm2, hex, hexes, noise1, rng } from './paint.ts';
import { H, PROLOGUE_VIEW, WIDE, moon, mountains, peaks, stars, streakClouds, type PrologueEmitter, type PrologueScene } from './prologue-kit.ts';

/** The warm light of lamps and windows: dim, lit, bright. */
const LAMP = hexes('#c06030', '#f0a050', '#ffd080');

const smooth = (t: number) => {
  const k = Math.max(0, Math.min(1, t));
  return k * k * (3 - 2 * k);
};

// ---------------------------------------------------------------- the Iron Sovereignty

const STONE = hexes('#160f1a', '#211726', '#2e2030', '#3e2c38', '#584044', '#7c5a50');
const SLATE = hexes('#110e1a', '#1a1626', '#262034', '#383046', '#524460');
const TILE = hexes('#24141a', '#341a1e', '#4a2622', '#64342a', '#844a34');
const PLASTER = hexes('#3a2a2e', '#4c3838', '#604842', '#78584c');
const HULL = hexes('#140c0c', '#22140f', '#341e16', '#52301e', '#6c4228');
const TIMBER = hex('#1a1014');

/** The painter of the Sovereignty: stone, timber and tiles, lit from the west (left). */
class IronPainter {
  readonly c: Canvas;
  /** The lit windows: the bay mirrors them. */
  readonly windows: [number, number][] = [];
  readonly chimneys: [number, number][] = [];

  constructor(c: Canvas) {
    this.c = c;
  }

  window(x: number, y: number, w = 1, h = 2): void {
    this.c.rect(x, y, x + w - 1, y + h - 1, LAMP[(x * 3 + y) % 3 === 0 ? 2 : 1]!);
    this.windows.push([x, y]);
  }

  /** Masonry: courses of stone; the west face (to the sun) is lighter. */
  masonry(x0: number, y0: number, x1: number, y1: number, light = 0.3): void {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const joint = y % 3 === 0 || (x + (Math.floor(y / 3) % 2) * 2) % 5 === 0;
        this.c.set(x, y, Canvas.rampAt(STONE, light + (1 - (x - x0) / Math.max(1, x1 - x0)) * 0.18 - (joint ? 0.14 : 0), x, y));
      }
      this.c.set(x0, y, STONE[4]!);
    }
  }

  /** Square merlons on the top of a wall, from x0 to x1, on the row y. */
  battlements(x0: number, x1: number, y: number): void {
    for (let x = x0; x <= x1; x++) if ((x - x0) % 4 < 2) this.c.rect(x, y - 2, x, y - 1, Canvas.rampAt(STONE, 0.55 - ((x - x0) / (x1 - x0 + 1)) * 0.2, x, y));
  }

  /** A round tower with a cone of slate (cone 0: no cone). */
  roundTower(cx: number, top: number, bottom: number, r: number, cone: number): void {
    for (let y = top; y <= bottom; y++) {
      for (let x = cx - r; x <= cx + r; x++) this.c.set(x, y, Canvas.rampAt(STONE, 0.62 - ((x - cx + r) / (2 * r)) * 0.5 - (y % 3 === 0 ? 0.12 : 0), x, y));
    }
    if (cone > 0) {
      this.c.poly(
        [
          [cx - r - 1.5, top + 1],
          [cx + 0.5, top - cone],
          [cx + r + 2.5, top + 1],
        ],
        (x, y) => Canvas.rampAt(SLATE, 0.2 + (x <= cx ? 0.45 : 0) + ((y - top + cone) / cone) * 0.15, x, y),
      );
      this.c.set(cx, top - cone - 1, SLATE[3]!);
    }
  }

  /** A house: a timber frame filled with plaster, and a steep roof of tiles (a gable, or hipped). */
  house(x: number, base: number, w: number, wallH: number, rand: () => number): void {
    const c = this.c;
    const top = base - wallH;
    for (let y = top; y <= base; y++) for (let k = x; k <= x + w; k++) c.set(k, y, Canvas.rampAt(PLASTER, 0.85 - ((k - x) / w) * 0.45, k, y));
    // The frame: corner posts, a beam between the floors, and a brace.
    for (let y = top; y <= base; y++) {
      c.set(x, y, TIMBER);
      c.set(x + w, y, TIMBER);
    }
    const floor = top + Math.round(wallH / 2);
    for (let k = x; k <= x + w; k++) c.set(k, floor, TIMBER);
    if (rand() < 0.5) c.line(x + w - 1, floor - 1, x + w - 3, top + 1, TIMBER);
    for (let wy = top + 2; wy < base - 1; wy += 4) for (let wx = x + 2; wx < x + w - 1; wx += 3) if (rand() < 0.3) this.window(wx, wy);
    const roofH = Math.round(w * (0.8 + rand() * 0.4));
    const shade = (px: number, py: number, ridge: number) => Canvas.rampAt(TILE, 0.2 + (px < ridge ? 0.45 : 0.05) + (py % 2 === 0 ? 0.1 : 0), px, py);
    if (rand() < 0.6) {
      c.poly(
        [
          [x - 1.5, top + 0.5],
          [x + w / 2 + 0.5, top - roofH],
          [x + w + 2.5, top + 0.5],
        ],
        (px, py) => shade(px, py, x + w / 2),
      );
    } else {
      const inset = Math.round(roofH * 0.55);
      c.poly(
        [
          [x - 1.5, top + 0.5],
          [x + inset, top - roofH],
          [x + w + 1 - inset, top - roofH],
          [x + w + 2.5, top + 0.5],
        ],
        (px, py) => shade(px, py, x + inset),
      );
    }
    if (rand() < 0.35) {
      const cx = x + 2;
      const cy = top - Math.round(roofH * 0.6);
      c.rect(cx, cy, cx + 1, top - 1, STONE[2]!);
      c.set(cx, cy, STONE[4]!);
      this.chimneys.push([cx, cy]);
    }
  }

  /** A cog at anchor, its bow to the left: castles fore and aft, a mast, the sail furled on its yard. */
  cog(x: number, y: number, w: number): void {
    const c = this.c;
    // The hull: round at both ends, the planks in strakes, the wale lit.
    c.poly(
      [
        [x - 2, y - 6],
        [x + w + 2, y - 7],
        [x + w, y - 1],
        [x + w - 4, y + 2],
        [x + 3, y + 2],
        [x, y - 1],
      ],
      (px, py) => Canvas.rampAt(HULL, 0.62 - ((px - x) / w) * 0.4 - ((py - y + 6) % 3 === 0 ? 0.14 : 0), px, py),
    );
    for (let px = x - 1; px <= x + w + 1; px++) c.set(px, y - 6 - (px > x + w - 2 ? 1 : 0), HULL[4]!);
    // The castles: aft (right) high, fore (left) low, each with a rail.
    c.rect(x + w - 6, y - 11, x + w + 1, y - 7, HULL[2]!);
    c.rect(x + w - 6, y - 12, x + w + 1, y - 12, HULL[4]!);
    for (let px = x + w - 5; px <= x + w; px += 2) c.set(px, y - 13, HULL[3]!);
    c.rect(x - 2, y - 9, x + 3, y - 7, HULL[2]!);
    c.rect(x - 2, y - 10, x + 3, y - 10, HULL[4]!);
    const mast = x + Math.round(w * 0.46);
    c.rect(mast, y - 25, mast, y - 7, HULL[1]!);
    c.set(mast, y - 26, HULL[3]!);
    // The yard, with the sail rolled up on it, lit on its west end.
    c.rect(mast - 7, y - 21, mast + 7, y - 20, hex('#5a4a4c'));
    c.rect(mast - 7, y - 21, mast - 3, y - 21, hex('#8a7268'));
    c.rect(mast - 6, y - 19, mast + 6, y - 19, hex('#2e2430'));
    // The stays, faint.
    c.line(mast, y - 24, x - 3, y - 10, hex('#3a2a30'));
    c.line(mast, y - 24, x + w, y - 13, hex('#3a2a30'));
    this.window(x + w - 2, y - 10, 1, 1);
    this.window(x + 1, y - 4, 1, 1);
    c.set(mast + 1, y - 24, LAMP[2]!);
    this.windows.push([mast + 1, y]);
  }
}

/**
 * The Iron Sovereignty at dusk: its capital, Iron Bay, a busy port on the Great Sea Ápeiron. The sun
 * has just set into the sea to the west (left). Behind, the dark Western Peaks; on the right, the
 * castle on its crag; between them the town in tiers, the church, and the forge terrace with fire in
 * its stacks; at the shore, the warehouses, a crane, the shipyard with a hull on the stocks, the
 * harbour wall and the sea gate; in the bay, cogs at anchor and the beacon on the mole.
 */
export function ironScene(): PrologueScene {
  // ---- The sky: dusk, with the glow of the sun low in the west.
  const sky = new Canvas(PROLOGUE_VIEW.w, H);
  sky.vgrad(0, 0, sky.w - 1, H - 1, hexes('#12142a', '#1c1c36', '#2c2442', '#46304c', '#6a3c4e', '#94504c', '#c0704a', '#e09a54', '#f0bc6c'), (t) => t ** 0.85);
  sky.glow(30, 134, 160, hex('#ffb060'), 0.32);
  sky.glow(30, 134, 56, hex('#ffe0a0'), 0.35);
  stars(sky, 201, 70, 46);
  streakClouds(sky, 202, 30, 106, hex('#3a2a46'), hex('#f8b070'), 30, 132, 0.62);

  // ---- The Western Peaks, far behind, in the haze of the evening.
  const range = new Canvas(WIDE, H);
  const crest = (x: number) => peaks(122, 46, 64, 203)(x) + Math.max(0, 1 - Math.abs(x - 30) / 90) * 14;
  mountains(range, crest, hexes('#1a1626', '#221c32', '#2e2640', '#3e3048', '#584252'), null, 0, -1);
  for (let x = 0; x < range.w; x++) {
    for (let y = Math.max(0, Math.round(crest(x))); y < range.h; y++) range.mix(x, y, hex('#6a4456'), 0.22 + ((y - crest(x)) / 50) * 0.3);
  }

  // ---- The city.
  const city = new Canvas(WIDE, H);
  const p = new IronPainter(city);
  const shore = 130;
  /** The ground: the quay, the slope of the town, and the crag of the castle. */
  const hill = (x: number) => {
    if (x < 96) return 127;
    if (x < 252) return 127 - 31 * smooth((x - 96) / 156);
    if (x < 270) return 96 - ((x - 252) / 18) * 10;
    if (x < 344) return 86;
    return 86 + smooth((x - 344) / 40) * 30;
  };
  for (let x = 0; x < WIDE; x++) {
    for (let y = Math.round(hill(x)); y < shore; y++) {
      const crag = x > 246 ? (fbm2(x / 4, y / 3, 204, 2) > 0.56 ? 0.2 : 0) + (fbm2(x / 3, y / 2, 205, 2) > 0.62 ? 0.24 : 0) - (fbm2(x / 2, y / 5, 210, 2) > 0.68 ? 0.15 : 0) : 0;
      city.set(x, y, Canvas.rampAt(STONE, 0.14 + crag - (y - hill(x)) / 150 + (x > 246 && y - hill(x) < 2 ? 0.25 : 0), x, y));
    }
  }

  // The houses climb the slope in three rows; the back row (highest) first.
  const town = rng(206);
  for (const row of [0, 1, 2]) {
    for (let x = 98 + row * 3; x < 246; ) {
      const w = 6 + Math.floor(town() * 6);
      const wallH = 7 + Math.floor(town() * 5) - row;
      const base = Math.min(124, Math.round(hill(x + w / 2)) + 4 + row * 8);
      const church = x + w > 134 && x < 176 && row < 2;
      const forge = x + w > 194 && x < 250 && row < 2;
      if (!church && !forge) p.house(x, base, w, wallH, town);
      x += w + 1 + Math.floor(town() * 2);
    }
  }

  // The church: a nave, and a bell tower with a tall spire of slate.
  p.masonry(148, 104, 172, 120, 0.3);
  city.poly(
    [
      [146.5, 104.5],
      [160.5, 92],
      [174.5, 104.5],
    ],
    (x, y) => Canvas.rampAt(SLATE, 0.25 + (x < 160 ? 0.4 : 0) + (y % 2 === 0 ? 0.08 : 0), x, y),
  );
  for (const wx of [153, 158, 163, 168]) p.window(wx, 109, 1, 4);
  p.masonry(138, 76, 147, 120, 0.35);
  p.battlements(138, 147, 76);
  city.poly(
    [
      [137.5, 75.5],
      [142.5, 50],
      [147.5, 75.5],
    ],
    (x) => Canvas.rampAt(SLATE, x <= 142 ? 0.7 : 0.25, x, 60),
  );
  city.set(142, 49, STONE[5]!);
  city.set(142, 48, STONE[5]!);
  city.rect(141, 47, 143, 47, STONE[4]!);
  p.window(142, 82, 1, 3);
  p.window(141, 94, 3, 3);
  city.set(142, 95, LAMP[0]!);

  // The forge terrace: a retaining wall, a long hall of smithies with fire in its doors, and stacks.
  const forges: [number, number][] = [];
  p.masonry(194, 104, 250, 118, 0.28);
  p.masonry(198, 90, 246, 104, 0.32);
  city.poly(
    [
      [196.5, 90.5],
      [200.5, 84],
      [244.5, 84],
      [248.5, 90.5],
    ],
    (x, y) => Canvas.rampAt(SLATE, 0.2 + (x < 222 ? 0.3 : 0.1) + (y % 2 === 0 ? 0.08 : 0), x, y),
  );
  for (const dx of [201, 212, 223, 234]) {
    city.poly(
      [
        [dx, 104],
        [dx, 97],
        [dx + 1, 95],
        [dx + 6, 95],
        [dx + 7, 97],
        [dx + 7, 104],
      ],
      (x, y) => Canvas.rampAt(LAMP, 1 - (y - 95) / 12 - Math.abs(x - dx - 3.5) / 9, x, y),
    );
    // An anvil and the smith, dark against the fire.
    city.rect(dx + 2, 102, dx + 5, 103, TIMBER);
    city.rect(dx + 3, 104, dx + 4, 104, TIMBER);
    city.glow(dx + 3.5, 101, 9, hex('#ff8a40'), 0.35);
  }
  for (const sx of [203, 219, 235]) {
    p.masonry(sx, 66, sx + 4, 88, 0.32);
    for (const ry of [72, 80]) city.rect(sx, ry, sx + 4, ry, STONE[0]!);
    city.rect(sx - 1, 65, sx + 5, 66, STONE[3]!);
    city.rect(sx, 64, sx + 4, 64, LAMP[0]!);
    city.glow(sx + 2.5, 63, 7, hex('#ff8a40'), 0.45);
    forges.push([sx + 1, 58]);
  }

  // A road climbs the crag to the castle gate, with a torch at each bend.
  const road: [number, number][] = [
    [266, 120],
    [300, 112],
    [276, 102],
    [304, 92],
  ];
  for (let i = 0; i + 1 < road.length; i++) {
    const [ax, ay] = road[i]!;
    const [bx, by] = road[i + 1]!;
    city.line(ax, ay, bx, by, STONE[4]!);
    city.line(ax, ay + 1, bx, by + 1, STONE[1]!);
  }
  for (const [tx, ty] of road.slice(1)) {
    city.rect(tx, ty - 3, tx, ty - 1, TIMBER);
    city.set(tx, ty - 4, LAMP[2]!);
    city.glow(tx, ty - 4, 6, hex('#ff9a40'), 0.45);
  }

  // The castle on the crag: curtain walls, two round towers and a square keep with corner turrets.
  p.masonry(272, 74, 342, 86, 0.25);
  p.battlements(272, 342, 74);
  p.roundTower(272, 64, 86, 5, 12);
  p.roundTower(342, 66, 86, 5, 11);
  p.masonry(298, 50, 318, 86, 0.3);
  p.battlements(297, 319, 50);
  for (const tx of [296, 316]) {
    p.masonry(tx, 44, tx + 3, 50, 0.35);
    p.battlements(tx, tx + 3, 44);
  }
  p.window(303, 57);
  p.window(312, 57);
  p.window(307, 66);
  p.window(303, 75, 1, 1);
  p.window(284, 79, 1, 1);
  p.window(330, 79, 1, 1);
  // The gate of the castle, and a banner of the Sovereignty, wine red, on the keep.
  city.rect(306, 80, 309, 86, hex('#0e080c'));
  city.rect(308, 30, 308, 43, TIMBER);
  city.rect(309, 31, 315, 32, hex('#a8443c'));
  city.rect(309, 33, 314, 34, hex('#7c302e'));
  city.set(316, 32, hex('#7c302e'));

  // The warehouses on the quay: tall gables of timber, a loading door on each floor and a hoist beam.
  for (const [wx, ww, wh] of [
    [62, 15, 15],
    [80, 13, 12],
  ] as const) {
    const top = 127 - wh;
    p.masonry(wx, top, wx + ww, 127, 0.26);
    const peak = top - Math.round(ww * 0.7);
    city.poly(
      [
        [wx - 0.5, top + 0.5],
        [wx + ww / 2 + 0.5, peak],
        [wx + ww + 1.5, top + 0.5],
      ],
      (px, py) => Canvas.rampAt(PLASTER, (px < wx + ww / 2 ? 0.75 : 0.35) - (py % 3 === 0 ? 0.15 : 0), px, py),
    );
    const mid = wx + Math.round(ww / 2);
    city.line(wx - 0.5, top, mid, peak, TIMBER);
    city.line(mid, peak, wx + ww + 1, top, TIMBER);
    city.rect(mid - 2, 121, mid + 2, 127, hex('#100a0c'));
    city.rect(mid - 1, top + 3, mid + 1, top + 6, hex('#100a0c'));
    p.window(mid - 1, top + 4, 3, 2);
    city.rect(mid, peak + 3, mid + 4, peak + 3, TIMBER);
    city.rect(mid + 4, peak + 4, mid + 4, top + 2, hex('#3a2e34'));
  }
  // A treadwheel crane of the port, with a crate on its rope.
  city.rect(99, 100, 100, 127, TIMBER);
  city.line(99, 101, 114, 94, TIMBER);
  city.line(100, 106, 106, 101, TIMBER);
  city.disc(98.5, 122.5, 4.5, (x, y, d) => (d > 0.7 ? HULL[2]! : d < 0.25 ? HULL[1]! : null));
  city.rect(114, 95, 114, 108, hex('#3a2e34'));
  city.rect(112, 109, 116, 112, HULL[3]!);
  city.rect(112, 109, 116, 109, HULL[4]!);

  // The harbour wall along the shore, with a sea gate.
  p.masonry(104, 122, 266, shore, 0.3);
  p.battlements(104, 266, 122);
  p.masonry(180, 106, 190, shore, 0.35);
  p.battlements(180, 190, 106);
  city.poly(
    [
      [182, shore],
      [182, 123],
      [185, 120],
      [188, 123],
      [188, shore],
    ],
    (x, y) => Canvas.rampAt(LAMP, 0.9 - (y - 120) / 14, x, y),
  );
  p.window(185, 110, 1, 2);

  // The shipyard: a hull on the stocks, its planks on the lower half and its ribs above, in scaffolds.
  city.rect(0, 125, 60, 129, HULL[1]!);
  for (let x = 0; x <= 60; x += 4) city.set(x, 125, HULL[3]!);
  const keel = 120;
  const bottom = (x: number) => keel - Math.max(0, (14 - x) * 0.6) ** 1.25 - Math.max(0, (x - 44) * 0.75) ** 1.25;
  const sheer = (x: number) => 104 + ((x - 30) / 22) ** 2 * 4 - (x > 48 ? (x - 48) * 1.2 : 0);
  for (let x = 6; x <= 54; x++) {
    const b = Math.round(bottom(x));
    const s = Math.round(sheer(x));
    const planked = Math.round(b - (b - s) * 0.55);
    for (let y = planked; y <= b; y++) city.set(x, y, Canvas.rampAt(HULL, 0.75 - ((x - 6) / 48) * 0.35 - (y % 2 === 0 ? 0.12 : 0) - (y === b ? 0.3 : 0), x, y));
    // The ribs over the planks: the sky shows between them.
    if (x % 3 === 0) for (let y = s; y < planked; y++) city.set(x, y, HULL[2]!);
    city.set(x, s, HULL[3]!);
  }
  for (const sx of [10, 20, 30, 40, 48]) city.rect(sx, Math.round(bottom(sx)) + 1, sx, 125, TIMBER);
  city.line(14, 124, 22, Math.round(bottom(22)) - 2, TIMBER);
  city.line(46, 124, 38, Math.round(bottom(38)) - 2, TIMBER);
  for (const px of [4, 58]) city.rect(px, 96, px, 125, TIMBER);
  city.rect(4, 100, 58, 100, HULL[2]!);
  city.rect(4, 112, 58, 112, HULL[2]!);
  // Sheer legs: two poles that lean together over the bow, with a tackle.
  city.line(52, 125, 60, 84, TIMBER);
  city.line(68, 125, 60, 84, TIMBER);
  city.rect(60, 85, 60, 98, hex('#3a2e34'));

  // The bay: dark water, with streaks of the sky (warm toward the sunset) and the lights in it.
  const water = hexes('#4a3444', '#38283c', '#2a1e32', '#201828', '#181220');
  for (let y = shore; y < H; y++) {
    for (let x = 0; x < WIDE; x++) {
      city.set(x, y, Canvas.rampAt(water, (y - shore) / 40 + (noise1(x * 0.2 + y * 3.7, 207) - 0.5) * 0.25, x, y));
      const streak = noise1(x * 0.18 + y * 11.3, 208);
      const sunward = Math.max(0, 1 - Math.abs(x - 30) / 150);
      if (y % 2 === 1 && streak > 0.82 - sunward * 0.18) city.set(x, y, hex(sunward > 0.55 && y < shore + 24 ? '#e09058' : y < shore + 10 ? '#b06a50' : '#6a4048'));
    }
  }
  // The castle's crag goes down into the sea, and a mole runs out from its foot with a beacon.
  p.masonry(296, 136, WIDE - 1, 141, 0.3);
  p.battlements(296, WIDE - 1, 136);
  p.roundTower(302, 108, 136, 4, 0);
  // The lantern room of the beacon: a fire behind posts, under a cone of slate.
  city.rect(297, 99, 307, 107, hex('#1a1014'));
  city.rect(298, 100, 306, 106, LAMP[1]!);
  city.rect(300, 102, 304, 105, LAMP[2]!);
  for (const px of [298, 302, 306]) city.rect(px, 100, px, 106, hex('#1a1014'));
  city.poly(
    [
      [296.5, 99.5],
      [302.5, 90],
      [308.5, 99.5],
    ],
    (x, y) => Canvas.rampAt(SLATE, x <= 302 ? 0.65 : 0.2, x, y),
  );
  city.glow(302, 103, 22, hex('#ffa040'), 0.5);

  // Cogs at anchor.
  p.cog(130, 150, 24);
  p.cog(212, 143, 18);
  p.cog(258, 158, 28);
  // A small boat that rows home.
  city.poly(
    [
      [76, 146],
      [88, 146],
      [86, 148],
      [78, 148],
    ],
    HULL[2]!,
  );
  city.set(82, 144, TIMBER);
  city.set(82, 145, TIMBER);
  city.line(79, 149, 74, 152, hex('#6a4048'));
  city.line(85, 149, 90, 151, hex('#6a4048'));

  // The bay mirrors the lights: short broken streaks under each one, and a column under the beacon.
  const shimmer = rng(209);
  for (const [wx, wy] of p.windows) {
    if (shimmer() < 0.35) continue;
    const from = Math.max(shore + 2, wy + 4);
    for (let y = from; y < Math.min(H, from + 22); y += 3) if (shimmer() < 0.35) city.rect(wx - 1 + Math.floor(shimmer() * 2), y, wx + Math.floor(shimmer() * 2), y, LAMP[0]!);
  }
  for (let y = 143; y < H; y += 2) if (shimmer() < 0.75) city.rect(300 + Math.floor(shimmer() * 3), y, 302 + Math.floor(shimmer() * 3), y, y < 160 ? LAMP[1]! : LAMP[0]!);

  // ---- The near quay: dark stone, bollards, a rowing boat, cargo, and a lantern on a post.
  const near = new Canvas(WIDE, H);
  const dark = hexes('#2a1c22', '#1a1218', '#120c12', '#0a070b');
  for (let x = 0; x < WIDE; x++) {
    const lit = Math.max(0, 1 - Math.abs(x - 238) / 70);
    for (let y = 164; y < H; y++) {
      const joint = (y - 164) % 4 === 3 || (x + (Math.floor((y - 164) / 4) % 2) * 5) % 10 === 0;
      near.set(x, y, Canvas.rampAt(dark, (y === 164 ? 0 : 0.35) + (y - 164) / 30 + (joint ? 0.25 : 0) - lit * 0.3, x, y));
    }
    if (lit > 0.3 && x % 2 === 0) near.set(x, 164, hex('#6a4430'));
  }
  for (const bx of [36, 148, 286]) {
    near.rect(bx - 2, 158, bx + 2, 164, dark[2]!);
    near.rect(bx - 3, 156, bx + 3, 157, dark[1]!);
    near.set(bx - 3, 156, dark[0]!);
  }
  // A rope from the first bollard to the boat tied below the quay.
  near.poly(
    [
      [52, 156],
      [98, 156],
      [93, 163],
      [57, 163],
    ],
    (x, y) => Canvas.rampAt(dark, y === 156 ? 0 : 0.45 + (y % 2 === 0 ? 0.15 : 0), x, y),
  );
  for (let x = 53; x <= 97; x++) near.set(x, 156, hex(x < 70 ? '#7a5a50' : '#5a4044'));
  near.rect(73, 152, 74, 156, dark[1]!);
  near.line(76, 156, 86, 151, dark[1]!);
  for (let x = 38; x <= 54; x++) near.set(x, Math.round(158 + Math.sin(((x - 38) / 16) * Math.PI) * 2), dark[0]!);
  // Cargo of the port: barrels and crates, lit on their west sides by the lantern.
  for (const [cx, cw, ch] of [
    [316, 10, 10],
    [328, 8, 14],
    [338, 12, 8],
  ] as const) {
    near.rect(cx, 164 - ch, cx + cw, 163, dark[2]!);
    near.rect(cx, 164 - ch, cx + cw, 164 - ch, dark[0]!);
    near.rect(cx, 164 - ch, cx, 163, dark[0]!);
    near.line(cx + 1, 163, cx + cw - 1, 165 - ch, dark[1]!);
  }
  for (const bx of [356, 366]) {
    near.disc(bx, 157, 5, (x, y, d) => Canvas.rampAt(dark, 0.3 + d * 0.5 + (x < bx ? -0.2 : 0.1) + (y % 4 === 0 ? 0.25 : 0), x, y));
    near.rect(bx - 5, 157, bx + 5, 163, dark[2]!);
    near.rect(bx - 5, 159, bx + 5, 159, dark[0]!);
  }
  // The lantern: a post, an arm, and a box of warm light.
  near.rect(232, 118, 233, 164, dark[2]!);
  near.rect(230, 163, 235, 164, dark[1]!);
  near.set(232, 119, dark[0]!);
  near.rect(233, 120, 238, 120, dark[2]!);
  near.rect(236, 121, 240, 128, dark[2]!);
  near.rect(237, 122, 239, 126, LAMP[2]!);
  near.set(238, 127, LAMP[1]!);
  near.glow(238, 124, 44, hex('#ffa050'), 0.32);
  near.glow(238, 124, 12, hex('#ffd890'), 0.4);
  near.set(234, 140, dark[0]!);

  return {
    id: 'iron',
    layers: [
      { image: sky.image, depth: 0 },
      { image: range.image, depth: 0.15 },
      { image: city.image, depth: 0.45 },
      { image: near.image, depth: 1 },
    ],
    emitters: [
      { kind: 'twinkle', layer: 0, x: 0, y: 0, w: 320, h: 44, rate: 10, colour: '#e8ecff' },
      { kind: 'birds', layer: 0, x: 0, y: 52, w: 320, h: 30, rate: 0.12, colour: '#1a1420' },
      ...p.chimneys.map(([x, y]): PrologueEmitter => ({ kind: 'smoke', layer: 2, x: x - 1, y: y - 4, w: 3, h: 4, rate: 0.7, colour: '#4a3a44' })),
      ...forges.map(([x, y]): PrologueEmitter => ({ kind: 'smoke', layer: 2, x: x - 1, y, w: 4, h: 5, rate: 1.1, colour: '#4a3a44' })),
      ...forges.map(([x, y]): PrologueEmitter => ({ kind: 'embers', layer: 2, x, y: y + 4, w: 4, h: 3, rate: 1.6, colour: '#ffa040' })),
      { kind: 'flame', layer: 2, x: 300, y: 101, w: 5, h: 6, rate: 1, colour: '#ffb040' },
      { kind: 'mist', layer: 2, x: 0, y: 134, w: WIDE, h: 18, rate: 0.35, colour: '#b08890' },
      { kind: 'flame', layer: 3, x: 236, y: 120, w: 5, h: 5, rate: 1, colour: '#ffd070' },
    ],
  };
}

// ---------------------------------------------------------------- the Mithril Enclave

const IVORY = hexes('#2a2236', '#3e3448', '#5c5064', '#837080', '#ab9290', '#d2b8a0');
const GOLD = hexes('#3a2618', '#664020', '#94642c', '#c08e40', '#e8c06c', '#fff0b0');
const CEDAR = hexes('#1e1214', '#30201c', '#4a3024');
const ARCANE = hexes('#3a68a8', '#7cc8ff', '#d8f0ff');

/** The painter of the Enclave: white stone, carved cedar, gold domes and the blue light of the arcane. */
class EnclavePainter {
  readonly c: Canvas;
  /** Where the arcane light shines on the lanterns of the minarets. */
  readonly sparks: [number, number][] = [];

  constructor(c: Canvas) {
    this.c = c;
  }

  /** A block of white stone, its west face (to the light) lit. */
  ashlar(x0: number, y0: number, x1: number, y1: number, light = 0.45): void {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) this.c.set(x, y, Canvas.rampAt(IVORY, light - ((x - x0) / Math.max(1, x1 - x0)) * 0.35 + (y === y0 ? 0.2 : 0) - (x === x1 ? 0.15 : 0), x, y));
      if (y < y0 + (y1 - y0) / 2) this.c.set(x0, y, IVORY[4]!);
    }
  }

  /** A horseshoe arch, 3 pixels wide, lit from within (blue for the arcane, or a lamp). */
  arch(x: number, y: number, h: number, colour: number): void {
    this.c.rect(x, y + 1, x + 2, y + h - 1, colour);
    this.c.set(x + 1, y, colour);
    this.c.set(x, y + h - 1, IVORY[2]!);
    this.c.set(x + 2, y + h - 1, IVORY[2]!);
  }

  /** An onion dome: a pointed top, the widest part low down, and a narrower foot on the drum. */
  onion(cx: number, base: number, r: number, h: number, ramp: readonly number[]): void {
    for (let y = base - h; y <= base; y++) {
      const t = (y - (base - h)) / h;
      const half = t < 0.62 ? r * Math.sin((t / 0.62) * (Math.PI / 2)) ** 1.6 : r * (1 - ((t - 0.62) / 0.38) ** 2 * 0.3);
      for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
        const across = (x + 0.5 - cx) / Math.max(0.5, half);
        this.c.set(x, y, Canvas.rampAt(ramp, 0.75 - across * 0.4 - t * 0.25 + (y % 3 === 0 && t > 0.3 ? -0.08 : 0), x, y));
      }
    }
    this.c.rect(cx, base - h - 3, cx, base - h - 1, ramp[3]!);
    this.c.set(cx, base - h - 4, ramp[5]!);
  }

  /** A minaret: a slender shaft, a gallery of carved cedar, a lantern lit blue, and a small gold dome. */
  minaret(cx: number, base: number, h: number): void {
    const c = this.c;
    const top = base - h;
    this.ashlar(cx - 2, top + 8, cx + 2, base, 0.55);
    for (let y = top + 14; y < base - 6; y += 16) this.arch(cx - 1, y, 4, ARCANE[0]!);
    // The gallery: a ring of cedar on brackets, and a rail.
    c.rect(cx - 4, top + 7, cx + 4, top + 8, CEDAR[2]!);
    c.set(cx - 3, top + 9, CEDAR[1]!);
    c.set(cx + 3, top + 9, CEDAR[1]!);
    for (let x = cx - 4; x <= cx + 4; x += 2) c.set(x, top + 6, CEDAR[1]!);
    c.rect(cx - 4, top + 5, cx + 4, top + 5, CEDAR[2]!);
    this.ashlar(cx - 1, top + 1, cx + 1, top + 5, 0.6);
    c.rect(cx, top + 2, cx, top + 4, ARCANE[1]!);
    this.onion(cx, top + 1, 2.2, 5, GOLD);
    this.sparks.push([cx, top + 3]);
  }

  /** A slender cypress, lit on its west side. */
  cypress(x: number, foot: number, h: number): void {
    for (let y = foot - h; y <= foot; y++) {
      const t = (y - foot + h) / h;
      const half = Math.max(0.5, Math.sin(Math.min(1, t * 1.3) * Math.PI * 0.62) * 2.2);
      for (let k = Math.round(x - half); k <= Math.round(x + half); k++) this.c.set(k, y, k < x ? hex('#24304a') : hex('#121624'));
    }
  }

  /** A house: a white cube with a flat roof, small arched windows and sometimes a screen of cedar. */
  house(x: number, base: number, w: number, h: number, light: number, rand: () => number): void {
    const c = this.c;
    this.ashlar(x, base - h, x + w, base, light);
    c.rect(x, base - h - 1, x + w, base - h - 1, IVORY[3]!);
    for (let wx = x + 2; wx < x + w - 1; wx += 3) if (rand() < 0.42) c.rect(wx, base - h + 2, wx, base - h + 3, rand() < 0.45 ? ARCANE[1]! : LAMP[1]!);
    if (rand() < 0.3) {
      c.rect(x + 1, base - h + 3, x + 3, base - h + 5, CEDAR[1]!);
      c.set(x + 2, base - h + 4, CEDAR[2]!);
    }
    // A small dome on some roofs, and a parapet on others.
    const roll = rand();
    if (roll < 0.18 && w >= 6) this.onion(x + Math.round(w / 2), base - h - 1, 2.6, 5, IVORY);
    else if (roll < 0.45) for (let k = x; k <= x + w; k += 2) c.set(k, base - h - 2, IVORY[3]!);
  }
}

/**
 * The Mithril Enclave by night: its capital, Great Bwini, on a hill by the sea under the snowy
 * mountains of the north. At the top, the Great Temple of Bwini with its gold dome and four
 * minarets; the white town climbs to it inside a wall with a horseshoe gate that glows blue; the
 * arcane light hangs over the dome. The temple serves a god of thunder and storms: a storm stands
 * over the mountains to the east, with a bolt of lightning.
 */
export function mithrilScene(): PrologueScene {
  // ---- The sky: deep blue, the last of the evening low in the west, and a storm in the east.
  const sky = new Canvas(PROLOGUE_VIEW.w, H);
  sky.vgrad(0, 0, sky.w - 1, H - 1, hexes('#080a1a', '#0c1024', '#12182e', '#1a223e', '#24304e', '#34405e', '#4a4c6c', '#6a5a78', '#8c6a7e'), (t) => t ** 0.9);
  sky.glow(10, 140, 120, hex('#c08070'), 0.18);
  stars(sky, 211, 150, 96);
  moon(sky, 46, 26, 8, 212);

  // ---- The mountains of the north, with snow (the Columnas de Plata), lit from the west.
  const range = new Canvas(WIDE, H);
  const crest = peaks(112, 66, 40, 214);
  mountains(range, crest, hexes('#121830', '#1a2240', '#242e52', '#344068', '#4a5a86'), hex('#c8d4ec'), 78, -1);
  for (let x = 0; x < range.w; x++) for (let y = 104; y < range.h; y++) range.mix(x, y, hex('#3a4468'), (y - 104) / 60);
  // The storm: a heavy bank of cloud over the eastern mountains. It hides their tops; the moon lights
  // its crown, and the lightning lights it from within. The bolt strikes the lowest saddle under it.
  let strike = 250;
  for (let x = 236; x < 290; x++) if (crest(x) > crest(strike)) strike = x;
  const struck = Math.round(crest(strike));
  const cloud = (x: number, y: number) => fbm2(x / 26, y / 11, 213, 4) * 0.9 + 0.62 - Math.hypot((x - 268) / 96, (y - 48) / (y < 48 ? 30 : 16)) * 0.8;
  for (let y = 10; y < 80; y++) {
    for (let x = 160; x < range.w; x++) {
      const v = cloud(x, y);
      if (v < 0.5) continue;
      const crown = cloud(x, y - 2) < 0.5;
      const flash = Math.max(0, 1 - Math.hypot(x - strike, (y - 58) * 1.6) / 44);
      let colour = Canvas.rampAt(hexes('#0c0e1e', '#141830', '#1e2440', '#2c3656', '#46567e'), 0.2 + (v - 0.5) * 1.1 - (y - 26) / 140 + flash * 0.85, x, y);
      if (crown) colour = Canvas.rampAt(hexes('#3a4468', '#5a6690', '#7e8ab0'), 0.5 - (x - 200) / 300, x, y);
      range.set(x, y, colour);
    }
  }
  // Rain under the cloud: faint slanted streaks down to the peaks.
  const rain = rng(224);
  for (let i = 0; i < 90; i++) {
    const x = 196 + rain() * 150;
    const y0 = 52 + rain() * 14;
    if (cloud(x, y0 - 3) < 0.5) continue;
    for (let k = 0; k < 8; k++) if (y0 + k < crest(x - k * 0.3)) range.mix(x - k * 0.3, y0 + k, hex('#6a7aa8'), 0.3);
  }
  // The bolt: a jagged line with a branch, white in its core and blue at its side.
  const bolt: [number, number][] = [[strike - 6, 56]];
  const jag = rng(225);
  for (let y = 60; y < struck; y += 4) bolt.push([strike + Math.round((jag() - 0.5) * 7), y]);
  bolt.push([strike, struck]);
  range.glow(strike, (56 + struck) / 2, 30, hex('#8aa8ff'), 0.3);
  for (let i = 0; i + 1 < bolt.length; i++) {
    const [ax, ay] = bolt[i]!;
    const [bx, by] = bolt[i + 1]!;
    range.line(ax + 1, ay, bx + 1, by, hex('#7aa0e8'));
    range.line(ax, ay, bx, by, hex('#f0f8ff'));
  }
  const [fx, fy] = bolt[2]!;
  range.line(fx, fy, fx - 7, fy + 6, hex('#9cc0f4'));
  range.line(fx - 7, fy + 6, fx - 9, fy + 11, hex('#7aa0e8'));
  range.glow(strike, struck, 10, hex('#c8e0ff'), 0.45);

  // ---- The coast: the sea to the west (left), and the dark hills round the town.
  const coast = new Canvas(WIDE, H);
  const sea = hexes('#3a4468', '#2c3456', '#222844', '#181d34', '#121628');
  const horizon = 122;
  for (let y = horizon; y < H; y++) {
    for (let x = 0; x < 150; x++) {
      coast.set(x, y, Canvas.rampAt(sea, (y - horizon) / 30 + (noise1(x * 0.25 + y * 4.1, 215) - 0.5) * 0.2, x, y));
      // The moon in the water: broken bright streaks under it.
      const glint = noise1(x * 0.4 + y * 9.1, 216);
      if (y % 2 === 0 && Math.abs(x - 50) < 10 - (y - horizon) * 0.1 && glint > 0.55) coast.set(x, y, hex(y < horizon + 12 ? '#c8d0e8' : '#7c88b0'));
    }
  }
  const hills = (x: number) => (x < 96 ? 999 : 130 - fbm1(x / 34, 217, 3) * 12 - smooth((x - 96) / 50) * 4);
  coast.ridge(hills, (x, y, d) => Canvas.rampAt(hexes('#262a46', '#1e2038', '#181a2e', '#121424'), d / 26, x, y), (x, slope) => (slope > 0 ? hex('#3e4466') : null));
  // The beach where the hills meet the sea.
  for (let x = 92; x < 120; x++) {
    const t = Math.round(Math.min(hills(Math.max(96, x)), H));
    for (let y = horizon; y < Math.min(H, t + 2); y++) if (x - 92 > (y - horizon) * 0.6) coast.set(x, y, Canvas.rampAt(hexes('#2c3050', '#20243e'), (y - horizon) / 30, x, y));
  }

  // ---- The town on its hill.
  const town = new Canvas(WIDE, H);
  const p = new EnclavePainter(town);
  const T = 184;
  const hill = (x: number) => 142 - 42 * smooth(1 - Math.abs(x - T) / 132);
  town.ridge(
    (x) => (Math.abs(x - T) < 142 ? hill(x) : 999),
    (x, y) => Canvas.rampAt(hexes('#2a2440', '#201c34', '#18152a', '#120f20'), (y - hill(x)) / 22, x, y),
  );
  // The houses climb the hill in tiers, from the wall up to the terrace of the temple.
  const rand = rng(218);
  for (let tier = 4; tier >= 0; tier--) {
    const base = 126 - tier * 6;
    const reach = 118 - tier * 21;
    for (let x = T - reach; x < T + reach; ) {
      const w = 5 + Math.floor(rand() * 5);
      const h = 6 + Math.floor(rand() * 4);
      const temple = tier >= 3 && x + w > T - 44 && x < T + 44;
      if (!temple) p.house(x, base, w, h, 0.4 + tier * 0.04, rand);
      x += w + 1 + Math.floor(rand() * 2);
    }
  }
  // The Great Temple of Bwini: a terrace with an arcade, two small domes, a drum and the gold dome.
  p.ashlar(T - 42, 98, T + 42, 114, 0.5);
  for (let k = 0; k < 11; k++) p.arch(T - 39 + k * 7, 104, 8, k % 4 === 1 ? LAMP[1]! : ARCANE[1]!);
  for (let x = T - 42; x <= T + 42; x++) town.set(x, 101, (x - T) % 4 === 0 ? IVORY[2]! : IVORY[4]!);
  for (let x = T - 42; x <= T + 42; x += 4) {
    town.rect(x, 96, x + 2, 97, IVORY[4]!);
    town.set(x + 1, 95, IVORY[5]!);
  }
  for (const side of [-1, 1]) {
    const sx = T + side * 30;
    p.ashlar(sx - 6, 88, sx + 6, 97, 0.5);
    p.arch(sx - 1, 90, 5, ARCANE[1]!);
    p.onion(sx, 88, 6, 12, IVORY);
  }
  p.ashlar(T - 16, 80, T + 16, 97, 0.55);
  for (let x = T - 13; x < T + 14; x += 6) p.arch(x, 85, 6, ARCANE[1]!);
  p.onion(T, 80, 16, 30, GOLD);
  p.minaret(T - 54, 114, 72);
  p.minaret(T + 54, 114, 70);
  p.minaret(T - 104, 126, 52);
  p.minaret(T + 106, 126, 48);
  // The town wall at the foot of the hill: pointed merlons, towers, and the horseshoe gate.
  const wallTop = 127;
  for (let x = T - 124; x <= T + 124; x++) {
    for (let y = wallTop; y < 142; y++) town.set(x, y, Canvas.rampAt(IVORY, 0.36 - (y - wallTop) / 40 + (y % 4 === 0 ? -0.08 : 0) - (x - T + 124) / 1100, x, y));
    const m = (x - T) % 5;
    if (Math.abs(m) < 3) town.set(x, wallTop - 1, IVORY[2]!);
    if (Math.abs(m) === 1) town.set(x, wallTop - 2, IVORY[3]!);
  }
  for (const tx of [T - 120, T - 66, T + 62, T + 118]) {
    p.ashlar(tx - 4, wallTop - 8, tx + 4, 142, 0.42);
    for (let x = tx - 4; x <= tx + 4; x += 2) {
      town.set(x, wallTop - 9, IVORY[3]!);
      town.set(x, wallTop - 10, IVORY[4]!);
    }
    p.arch(tx - 1, wallTop - 4, 4, LAMP[1]!);
  }
  town.poly(
    [
      [T - 6, 142],
      [T - 6, 133],
      [T - 5, 130],
      [T, 128],
      [T + 5, 130],
      [T + 6, 133],
      [T + 6, 142],
    ],
    (x, y) => Canvas.rampAt(ARCANE, 0.95 - (y - 128) / 16 - Math.abs(x - T) / 12, x, y),
  );
  for (let y = 128; y < 142; y++) {
    town.set(T - 7, y, IVORY[4]!);
    town.set(T + 7, y, IVORY[1]!);
  }
  town.glow(T, 136, 16, ARCANE[1]!, 0.4);
  // The road from the gate down the hill, pale in the arcane light, with lamps of blue glass.
  for (let y = 142; y < H; y++) {
    const t = (y - 142) / (H - 142);
    const mid = T - t * t * 70;
    const half = 3 + t * 9;
    for (let x = Math.round(mid - half); x <= Math.round(mid + half); x++) town.set(x, y, Canvas.rampAt(hexes('#1c1a30', '#2a2844', '#3c3a5c', '#56567e'), 0.75 - t * 0.6 - Math.abs(x - mid) / (half * 3), x, y));
  }
  for (const [lx, ly] of [
    [T - 12, 146],
    [T + 10, 146],
    [T - 26, 156],
    [T + 2, 158],
  ] as const) {
    town.rect(lx, ly - 4, lx, ly, hex('#120f20'));
    town.set(lx, ly - 5, ARCANE[2]!);
    town.glow(lx, ly - 5, 8, ARCANE[1]!, 0.4);
  }
  // Cypresses on the hill and outside the wall.
  for (const [x, h] of [
    [T - 132, 14],
    [T - 128, 18],
    [T - 86, 12],
    [T - 32, 10],
    [T + 34, 11],
    [T + 82, 15],
    [T + 116, 13],
    [T + 142, 17],
    [T + 148, 12],
  ] as const) p.cypress(x, Math.min(142, Math.round(hill(x)) + 1), h);
  // The arcane light that hangs over the dome, with a thread of light down to the finial.
  for (let y = 30; y < 46; y++) if (y % 2 === 0) town.mix(T, y, ARCANE[1]!, 0.6 - (y - 30) / 40);
  town.glow(T, 22, 24, ARCANE[1]!, 0.55);
  town.glow(T, 22, 8, ARCANE[2]!, 0.55);
  town.disc(T, 22, 2.5, ARCANE[2]!);
  town.set(T - 4, 22, ARCANE[2]!);
  town.set(T + 4, 22, ARCANE[2]!);
  town.set(T, 18, ARCANE[2]!);
  town.set(T, 26, ARCANE[2]!);
  for (const [x, y] of p.sparks) town.glow(x, y, 6, ARCANE[1]!, 0.35);
  // The dome takes the arcane light on its top.
  for (let y = 50; y < 62; y++) for (let x = T - 8; x <= T + 8; x++) if ((town.get(x, y) & 0xff) === 255 && (x + y) % 3 === 0) town.mix(x, y, ARCANE[2]!, 0.25);

  // ---- The near hill: dark ground, date palms and cypresses against the town.
  const near = new Canvas(WIDE, H);
  const ground = (x: number) => 164 - fbm1(x / 26, 219, 4) * 9 - Math.max(0, 1 - Math.abs(x - 30) / 50) * 8 - Math.max(0, 1 - Math.abs(x - 350) / 46) * 10;
  near.ridge(ground, (x, y) => Canvas.rampAt(hexes('#121424', '#0c0d18', '#08080f'), (y - ground(x)) / 14, x, y), (x, slope) => (slope < 0 ? hex('#262c48') : null));
  const shade = hex('#08080f');
  const rim = hex('#2e3a62');
  /** A date palm: a bent trunk, and fronds that droop from its crown. */
  const palm = (x: number, foot: number, h: number, lean: number, seed: number) => {
    let cx = x;
    for (let i = 0; i <= h; i++) {
      const t = i / h;
      cx = x + lean * t * t * h * 0.35;
      near.set(cx, foot - i, shade);
      near.set(cx + 1, foot - i, i % 3 === 0 ? rim : shade);
      if (t < 0.4) near.set(cx - 1, foot - i, shade);
    }
    const cy = foot - h;
    const r = rng(seed);
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2 + r() * 0.3;
      const len = h * (0.32 + r() * 0.14);
      for (let s = 0; s <= len; s++) {
        const px = cx + Math.cos(a) * s;
        const py = cy + Math.sin(a) * s * 0.45 + (s / len) ** 2 * len * 0.55;
        near.set(px, py, shade);
        if (s > 2 && s < len - 1) near.set(px, py + 1, shade);
        if (s % 2 === 0 && s > 2) near.set(px + Math.sin(a), py + 2, shade);
      }
    }
    near.disc(cx, cy + 1, 2, shade);
  };
  palm(18, 162, 44, 0.5, 220);
  palm(40, 160, 34, -0.6, 221);
  palm(338, 160, 48, -0.45, 222);
  palm(364, 158, 36, 0.4, 223);
  const cypress = (x: number, foot: number, h: number) => {
    for (let y = foot - h; y <= foot; y++) {
      const t = (y - foot + h) / h;
      const half = Math.max(0.5, Math.sin(Math.min(1, t * 1.3) * Math.PI * 0.62) * 3);
      for (let k = Math.round(x - half); k <= Math.round(x + half); k++) near.set(k, y, shade);
      near.set(Math.round(x + half), y, t > 0.1 && y % 2 === 0 ? rim : shade);
    }
  };
  cypress(62, 162, 26);
  cypress(316, 160, 22);
  // A lantern of the arcane on a post by the path.
  near.rect(250, 150, 250, 168, shade);
  near.rect(248, 146, 252, 150, shade);
  near.rect(249, 147, 251, 149, ARCANE[2]!);
  near.glow(250, 148, 22, ARCANE[1]!, 0.35);

  return {
    id: 'mithril',
    layers: [
      { image: sky.image, depth: 0 },
      { image: range.image, depth: 0.12 },
      { image: coast.image, depth: 0.28 },
      { image: town.image, depth: 0.45 },
      { image: near.image, depth: 1 },
    ],
    emitters: [
      { kind: 'twinkle', layer: 0, x: 0, y: 0, w: 176, h: 70, rate: 18, colour: '#e8ecff' },
      { kind: 'mist', layer: 2, x: 60, y: 128, w: 320, h: 16, rate: 0.45, colour: '#6a7aa8' },
      { kind: 'sparkles', layer: 3, x: T - 70, y: 10, w: 140, h: 90, rate: 7, colour: '#9cd8ff' },
      { kind: 'motes', layer: 3, x: T - 8, y: 118, w: 16, h: 22, rate: 2.5, colour: '#9cd8ff' },
      { kind: 'fireflies', layer: 4, x: 0, y: 132, w: WIDE, h: 34, rate: 7, colour: '#b8e4ff' },
    ],
  };
}
