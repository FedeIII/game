/**
 * Random player skins. A skin is a seed (a 32-bit number); the seed gives a "vibe" (wanderer,
 * knight, monk, witch, ranger, plague doctor, noble, gravedigger), and inside the vibe random
 * proportions, garments, details and colours. Every client makes the same skin from the same
 * seed, so a visitor only sends the seed. All the colours are dark and muted, and all skins
 * are the one figure of figure.ts, so they stay in the style of the game.
 *
 * The browser renders a skin at run time (in a worker, see src/skins/), so this module has no
 * Node imports. Change SKIN_VERSION when a seed would give a different picture: the clients
 * keep rendered skins in localStorage under that version.
 */
import { ATTACK_FRAMES, ATTACK_STANCE, attackAction, attackStyle, type AttackStyle } from './attacks.ts';
import { figure, figureMaterials, figureTop, type BodyCut, type CloakCut, type FigureSpec, type HairCut, type Headwear, type Item, type Palette } from './figure.ts';
import { Image } from './image.ts';
import { HEIGHT_SCALE, renderModel } from './sdf.ts';

export const SKIN_VERSION = 2;

/** A skin frame is taller than the atlas's player frame: room for tall figures and hats. */
export const SKIN_FRAME = { width: 32, height: 48, pivotX: 16, pivotY: 42 } as const;
/** The views of a sheet, one row each, in this order. */
export const SKIN_VIEWS = [
  { name: 'down', yaw: 0 },
  { name: 'up', yaw: Math.PI },
  { name: 'right', yaw: Math.PI / 2 },
  { name: 'left', yaw: -Math.PI / 2 },
] as const;
/** Columns of a sheet: the stand, then the walk frames, then the attack frames. */
export const SKIN_WALK_FRAMES = 8;
export const SKIN_ATTACK_FRAMES = ATTACK_FRAMES;

export interface Skin {
  readonly seed: number;
  readonly vibe: string;
  readonly spec: FigureSpec;
  readonly palette: Palette;
}

export interface SkinSheet {
  /** SKIN_VIEWS rows by 1 + SKIN_WALK_FRAMES + SKIN_ATTACK_FRAMES columns of SKIN_FRAME. */
  readonly image: Image;
  /** From the feet to just above the head or hat, in screen pixels: speech goes there. */
  readonly headHeight: number;
}

// ---------------------------------------------------------------- randomness

type Rng = () => number;

/** mulberry32: small, fast, and the same in every JavaScript engine. */
function rng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (r: Rng, a: number, b: number) => a + (b - a) * r();
const chance = (r: Rng, p: number) => r() < p;
function pick<T>(r: Rng, items: readonly T[]): T {
  return items[Math.floor(r() * items.length)]!;
}
function weighted<T>(r: Rng, items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((sum, [, w]) => sum + w, 0);
  let x = r() * total;
  for (const [item, w] of items) {
    x -= w;
    if (x < 0) return item;
  }
  return items[items.length - 1]![0];
}

// ---------------------------------------------------------------- colours

function hex(h: number, s: number, l: number): number {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return ((f(0) << 24) | (f(8) << 16) | (f(4) << 8) | 0xff) >>> 0;
}

/**
 * A ramp of `n` shades of one hue, from near black to `light`. The dark shades are a little
 * less saturated, as in the hand-made ramps of the game.
 */
function tone(h: number, s: number, light: number, n = 6): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    out.push(hex(((h % 360) + 360) % 360, s * (0.7 + 0.3 * t), light * (0.16 + 0.84 * t)));
  }
  return out;
}

/** A colour family: a hue range, a saturation range and a light range for its brightest shade. */
interface Family {
  readonly h: readonly [number, number];
  readonly s: readonly [number, number];
  readonly l: readonly [number, number];
}

const FAMILY = {
  wine: { h: [348, 368], s: [0.38, 0.5], l: [0.28, 0.36] },
  moss: { h: [92, 135], s: [0.2, 0.38], l: [0.24, 0.32] },
  ash: { h: [200, 230], s: [0.04, 0.12], l: [0.28, 0.38] },
  umber: { h: [18, 34], s: [0.3, 0.45], l: [0.26, 0.34] },
  indigo: { h: [218, 245], s: [0.3, 0.45], l: [0.28, 0.36] },
  plum: { h: [282, 312], s: [0.25, 0.4], l: [0.26, 0.34] },
  teal: { h: [168, 192], s: [0.25, 0.4], l: [0.24, 0.32] },
  bone: { h: [34, 46], s: [0.1, 0.2], l: [0.4, 0.5] },
  black: { h: [200, 260], s: [0.03, 0.1], l: [0.14, 0.19] },
  ochre: { h: [36, 48], s: [0.3, 0.42], l: [0.3, 0.36] },
  rust: { h: [12, 24], s: [0.42, 0.55], l: [0.3, 0.36] },
} as const satisfies Record<string, Family>;
type FamilyName = keyof typeof FAMILY;

function colour(r: Rng, name: FamilyName, n = 6, lightScale = 1): number[] {
  const f = FAMILY[name];
  return tone(between(r, f.h[0], f.h[1]), between(r, f.s[0], f.s[1]), between(r, f.l[0], f.l[1]) * lightScale, n);
}

/** Skin tones, from pale to deep brown: the brightest shade of the face. */
const SKIN_TONES: readonly (readonly [number, number, number])[] = [
  [24, 0.32, 0.62],
  [22, 0.3, 0.52],
  [28, 0.28, 0.46],
  [26, 0.34, 0.4],
  [20, 0.36, 0.32],
  [18, 0.34, 0.24],
];
const HAIR_COLOURS: readonly (readonly [number, number, number])[] = [
  [230, 0.1, 0.16],
  [25, 0.35, 0.24],
  [18, 0.45, 0.3],
  [8, 0.5, 0.32],
  [42, 0.4, 0.46],
  [0, 0, 0.5],
  [40, 0.06, 0.68],
];
const METALS: readonly (readonly [number, number, number])[] = [
  [215, 0.12, 0.6],
  [215, 0.08, 0.38],
  [42, 0.42, 0.48],
  [25, 0.4, 0.42],
];

/** The colours that every skin needs; a vibe changes what it cares about. */
function basePalette(r: Rng, cloak: FamilyName): Palette {
  const cloakRamp = colour(r, cloak);
  const [sh, ss, sl] = pick(r, SKIN_TONES);
  const [hh, hs, hl] = pick(r, HAIR_COLOURS);
  const [mh, ms, ml] = pick(r, METALS);
  return {
    cloak: cloakRamp,
    lining: cloakRamp.slice(0, 4),
    garment: colour(r, pick(r, ['umber', 'umber', 'black', 'ash'] as const), 5),
    trousers: colour(r, pick(r, ['ash', 'black', 'umber', 'moss'] as const), 5, 0.8),
    boots: colour(r, pick(r, ['umber', 'black'] as const), 4, 0.6),
    skin: tone(sh, ss, sl, 5),
    metal: tone(mh, ms, ml, 6),
    belt: colour(r, 'umber', 3, 0.7),
    glove: colour(r, pick(r, ['umber', 'black'] as const), 3, 0.6),
    hair: tone(hh, hs, hl, 4),
    hat: colour(r, pick(r, ['black', 'umber', 'ash'] as const), 4, 0.9),
    scarf: colour(r, pick(r, ['wine', 'bone', 'ochre', 'moss', 'indigo'] as const), 4),
    mask: colour(r, 'bone', 4),
  };
}

// ---------------------------------------------------------------- vibes

interface Made {
  readonly spec: FigureSpec;
  readonly palette: Palette;
}

const proportions = (r: Rng, height: readonly [number, number], build: readonly [number, number]) => ({
  height: between(r, height[0], height[1]),
  build: between(r, build[0], build[1]),
  head: between(r, 0.9, 1.1),
});

/** The glow of an orb: ghostly green, pale violet or cold blue. */
function orbGlass(r: Rng): number[] {
  const h = pick(r, [120, 275, 205, 160]);
  return [hex(h, 0.45, 0.32), hex(h, 0.55, 0.55), hex(h, 0.6, 0.78)];
}

const VIBES: readonly { readonly name: string; readonly weight: number; make(r: Rng): Made }[] = [
  {
    // The hooded wanderer of the game, in other colours and shapes.
    name: 'wanderer',
    weight: 22,
    make(r) {
      const palette = basePalette(r, pick(r, ['wine', 'moss', 'ash', 'umber', 'indigo', 'plum', 'teal'] as const));
      return {
        palette,
        spec: {
          ...proportions(r, [0.86, 1.14], [0.85, 1.2]),
          headwear: 'hood',
          hair: 'short',
          beard: chance(r, 0.3),
          cloak: weighted<CloakCut>(r, [['long', 4], ['short', 1]]),
          body: 'jerkin',
          pauldrons: chance(r, 0.6),
          scarf: chance(r, 0.25),
          pouch: chance(r, 0.4),
          item: weighted<Item>(r, [['none', 5], ['staff', 2], ['lantern', 2], ['sword', 2]]),
        },
      };
    },
  },
  {
    // A sellsword in plate: broad, a helm or a bare head, a cape in dark heraldic colours.
    name: 'knight',
    weight: 12,
    make(r) {
      const palette = basePalette(r, pick(r, ['wine', 'indigo', 'black', 'moss'] as const));
      const helm = chance(r, 0.6);
      return {
        palette,
        spec: {
          ...proportions(r, [0.98, 1.16], [1.1, 1.36]),
          headwear: helm ? 'helm' : 'bare',
          hair: helm ? 'none' : pick(r, ['short', 'short', 'none', 'tail'] as const),
          beard: chance(r, 0.45),
          cloak: weighted<CloakCut>(r, [['short', 5], ['long', 3], ['none', 2]]),
          body: 'armour',
          pauldrons: true,
          scarf: false,
          pouch: false,
          tabard: chance(r, 0.55),
          horns: helm && chance(r, 0.3),
          item: weighted<Item>(r, [['sword', 4], ['none', 1]]),
        },
      };
    },
  },
  {
    // A monk or a pilgrim: a cowl or a wide hat, a long robe with a rope belt.
    name: 'monk',
    weight: 12,
    make(r) {
      const robe = pick(r, ['umber', 'ash', 'black', 'wine', 'bone'] as const);
      const base = basePalette(r, robe);
      const hat = chance(r, 0.3);
      return {
        palette: { ...base, garment: base.cloak, belt: colour(r, 'bone', 3, 0.8) },
        spec: {
          ...proportions(r, [0.86, 1.06], [0.95, 1.25]),
          headwear: hat ? 'brim' : 'cowl',
          hair: pick(r, ['none', 'short'] as const),
          beard: chance(r, 0.4),
          cloak: hat ? weighted<CloakCut>(r, [['long', 1], ['none', 1]]) : 'none',
          body: 'robe',
          pauldrons: false,
          scarf: false,
          pouch: chance(r, 0.5),
          item: weighted<Item>(r, [['none', 3], ['staff', 3], ['lantern', 2]]),
        },
      };
    },
  },
  {
    // A witch or an occultist: thin and tall, a pointed hat or a cowl, a robe, long hair.
    name: 'witch',
    weight: 12,
    make(r) {
      const base = basePalette(r, pick(r, ['plum', 'moss', 'black', 'teal', 'wine'] as const));
      const hat = chance(r, 0.6);
      return {
        palette: {
          ...base,
          hat: chance(r, 0.5) ? base.cloak.slice(0, 4) : base.hat,
          garment: colour(r, pick(r, ['black', 'plum', 'moss'] as const), 5),
          glass: orbGlass(r),
        },
        spec: {
          ...proportions(r, [0.94, 1.16], [0.78, 0.95]),
          headwear: hat ? 'witch' : 'cowl',
          hair: pick(r, ['long', 'long', 'short'] as const),
          beard: false,
          cloak: weighted<CloakCut>(r, [['long', 3], ['none', 2]]),
          body: weighted<BodyCut>(r, [['robe', 7], ['jerkin', 3]]),
          pauldrons: false,
          scarf: chance(r, 0.2),
          pouch: chance(r, 0.5),
          item: weighted<Item>(r, [['orbstaff', 5], ['staff', 2], ['none', 3]]),
        },
      };
    },
  },
  {
    // A ranger or a hunter: greens and browns, a short cloak, a scarf, bags on the belt.
    name: 'ranger',
    weight: 12,
    make(r) {
      const base = basePalette(r, pick(r, ['moss', 'umber', 'moss', 'teal'] as const));
      const hood = chance(r, 0.5);
      return {
        palette: { ...base, garment: colour(r, pick(r, ['umber', 'moss'] as const), 5) },
        spec: {
          ...proportions(r, [0.9, 1.1], [0.85, 1.08]),
          headwear: hood ? 'hood' : 'bare',
          hair: hood ? 'short' : pick(r, ['short', 'tail', 'long'] as const),
          beard: chance(r, 0.3),
          cloak: weighted<CloakCut>(r, [['short', 3], ['long', 2]]),
          body: 'jerkin',
          pauldrons: chance(r, 0.2),
          scarf: chance(r, 0.45),
          pouch: chance(r, 0.75),
          item: weighted<Item>(r, [['sword', 2], ['staff', 1], ['none', 2]]),
        },
      };
    },
  },
  {
    // A plague doctor: a beaked mask, a wide hat, a long dark coat.
    name: 'plague doctor',
    weight: 6,
    make(r) {
      const base = basePalette(r, pick(r, ['black', 'ash', 'umber'] as const));
      return {
        palette: { ...base, garment: colour(r, 'black', 5), hat: colour(r, 'black', 4, 0.9), mask: colour(r, pick(r, ['bone', 'bone', 'umber'] as const), 4) },
        spec: {
          ...proportions(r, [0.98, 1.16], [0.88, 1.08]),
          headwear: 'beak',
          hair: 'none',
          beard: false,
          cloak: weighted<CloakCut>(r, [['long', 1], ['none', 1]]),
          body: 'robe',
          pauldrons: false,
          scarf: false,
          pouch: chance(r, 0.4),
          item: weighted<Item>(r, [['staff', 3], ['lantern', 2], ['none', 1]]),
        },
      };
    },
  },
  {
    // A fallen noble: slim and tall, rich dark colours, a short cape, gilded metal.
    name: 'noble',
    weight: 9,
    make(r) {
      const base = basePalette(r, pick(r, ['wine', 'indigo', 'black', 'teal', 'plum'] as const));
      const hat = chance(r, 0.3);
      return {
        palette: { ...base, metal: tone(42, between(r, 0.38, 0.48), between(r, 0.46, 0.54)), garment: colour(r, pick(r, ['wine', 'indigo', 'black', 'plum'] as const), 5) },
        spec: {
          ...proportions(r, [1.0, 1.16], [0.82, 1.0]),
          headwear: hat ? 'brim' : 'bare',
          hair: pick(r, ['long', 'short', 'tail'] as const),
          beard: chance(r, 0.3),
          cloak: weighted<CloakCut>(r, [['short', 3], ['long', 2]]),
          body: 'jerkin',
          pauldrons: chance(r, 0.3),
          scarf: chance(r, 0.3),
          pouch: false,
          circlet: !hat && chance(r, 0.5),
          item: weighted<Item>(r, [['sword', 3], ['none', 2]]),
        },
      };
    },
  },
  {
    // A gravedigger or a farmhand: short and broad, earth colours, a hat or a bare head.
    name: 'gravedigger',
    weight: 12,
    make(r) {
      const base = basePalette(r, pick(r, ['umber', 'ash', 'ochre', 'moss'] as const));
      const hat = chance(r, 0.45);
      return {
        palette: { ...base, garment: colour(r, pick(r, ['umber', 'ochre', 'ash'] as const), 5) },
        spec: {
          ...proportions(r, [0.82, 0.98], [1.08, 1.36]),
          headwear: hat ? 'brim' : 'bare',
          hair: pick(r, ['short', 'none', 'short'] as const),
          beard: chance(r, 0.5),
          cloak: weighted<CloakCut>(r, [['none', 3], ['short', 2]]),
          body: 'jerkin',
          pauldrons: false,
          scarf: chance(r, 0.35),
          pouch: chance(r, 0.5),
          item: weighted<Item>(r, [['lantern', 4], ['staff', 1], ['none', 2]]),
        },
      };
    },
  },
];

/** The skin of a seed. The same seed gives the same skin in every client. */
export function skinFromSeed(seed: number): Skin {
  const r = rng(seed ^ 0x5eed5);
  const vibe = weighted(r, VIBES.map((v) => [v, v.weight] as const));
  return { seed: seed >>> 0, vibe: vibe.name, ...vibe.make(r) };
}

/** The headwear and the hair of a spec, for tests and previews. */
export function describeSkin(skin: Skin): string {
  const { spec } = skin;
  return `${skin.vibe}: ${spec.headwear}${spec.hair !== 'none' ? `, ${spec.hair} hair` : ''}, ${spec.body}, ${spec.cloak} cloak, ${spec.item ?? 'none'}, h ${spec.height.toFixed(2)}, w ${spec.build.toFixed(2)}`;
}

export type { BodyCut, CloakCut, HairCut, Headwear, Item };

/** How a skin attacks (attacks.ts): from its vibe and its item. */
export function skinAttack(skin: Skin): AttackStyle {
  return attackStyle(skin.vibe, skin.spec);
}

/** Renders the sheet of a skin: every view, the stand, the walk and the attack. */
export function renderSkinSheet(skin: Skin): SkinSheet {
  const { width, height } = SKIN_FRAME;
  const image = new Image(width * (1 + SKIN_WALK_FRAMES + SKIN_ATTACK_FRAMES), height * SKIN_VIEWS.length);
  const materials = figureMaterials(skin.palette);
  const style = skinAttack(skin);
  SKIN_VIEWS.forEach((view, row) => {
    for (let column = 0; column <= SKIN_WALK_FRAMES; column++) {
      const parts = column === 0 ? figure(skin.spec, 0, 0) : figure(skin.spec, ((column - 1) / SKIN_WALK_FRAMES) * 2 * Math.PI, 1);
      image.draw(renderModel(parts, materials, { ...SKIN_FRAME, yaw: view.yaw }), column * width, row * height);
    }
    for (let f = 0; f < SKIN_ATTACK_FRAMES; f++) {
      const [phase, amount] = ATTACK_STANCE[f]!;
      const parts = figure(skin.spec, phase, amount, attackAction(style, f, skin.spec));
      image.draw(renderModel(parts, materials, { ...SKIN_FRAME, yaw: view.yaw }), (1 + SKIN_WALK_FRAMES + f) * width, row * height);
    }
  });
  return { image, headHeight: Math.round(figureTop(skin.spec) * HEIGHT_SCALE) + 4 };
}
