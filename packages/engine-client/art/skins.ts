/**
 * Player skins. A skin is a seed (a 32-bit number) that holds the look of a character: its race,
 * its class and its gender (appearanceOf() in @game/engine), and a variant for the random parts.
 * The race gives the silhouette (height, build, the size of the head), the skin tones, the hair
 * colours, beards, pointed ears and tusks. The class gives the garments, the headwear, what the
 * figure carries and the colour families. The gender gives the width of the shoulders, beards and
 * the hair cut. Inside these, the variant picks proportions, hair, colours and details. Every
 * client makes the same skin from the same seed, so a visitor only sends the seed. All the
 * colours are dark and muted, and all skins are the one figure of figure.ts, so they stay in the
 * style of the game.
 *
 * The browser renders a skin at run time (in a worker, see src/skins/), so this module has no
 * Node imports. Change SKIN_VERSION when a seed would give a different picture: the clients
 * keep rendered skins in localStorage under that version.
 */
import { appearanceOf, type Appearance, type CharacterClass, type Gender, type Race } from '@game/engine';
import { ATTACK_FRAMES, ATTACK_STANCE, FALL_FRAMES, ROLL_FRAMES, attackAction, attackStyle, fallParts, rollParts, type AttackStyle } from './attacks.ts';
import {
  figure,
  figureMaterials,
  figureTop,
  type BodyCut,
  type CloakCut,
  type Ears,
  type FigureSpec,
  type HairCut,
  type Headwear,
  type Item,
  type Palette,
} from './figure.ts';
import { Image } from './image.ts';
import { HEIGHT_SCALE, renderModel } from './sdf.ts';

export const SKIN_VERSION = 6;

/**
 * A skin frame is larger than the atlas's player frame: room for tall figures and hats, and for a
 * staff over the head or a rapier at full reach in an attack.
 */
export const SKIN_FRAME = { width: 56, height: 56, pivotX: 28, pivotY: 50 } as const;
/** The part of a frame round the figure at rest, for a preview: 32 x 48, the feet 42 from its top. */
export const SKIN_PORTRAIT = { x: SKIN_FRAME.pivotX - 16, y: SKIN_FRAME.pivotY - 42, width: 32, height: 48 } as const;
/** The views of a sheet, one row each, in this order. */
export const SKIN_VIEWS = [
  { name: 'down', yaw: 0 },
  { name: 'up', yaw: Math.PI },
  { name: 'right', yaw: Math.PI / 2 },
  { name: 'left', yaw: -Math.PI / 2 },
] as const;
/** Columns of a sheet: the stand, then the walk frames, the attack frames, the roll frames and the fall frames. */
export const SKIN_WALK_FRAMES = 8;
export const SKIN_ATTACK_FRAMES = ATTACK_FRAMES;
export const SKIN_ROLL_FRAMES = ROLL_FRAMES;
export const SKIN_FALL_FRAMES = FALL_FRAMES;

export interface Skin {
  readonly seed: number;
  readonly appearance: Appearance;
  readonly spec: FigureSpec;
  readonly palette: Palette;
}

export interface SkinSheet {
  /** SKIN_VIEWS rows by 1 + SKIN_WALK_FRAMES + SKIN_ATTACK_FRAMES + SKIN_ROLL_FRAMES + SKIN_FALL_FRAMES columns of SKIN_FRAME. */
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
  /** Saffron: the robes of monks. */
  saffron: { h: [26, 38], s: [0.45, 0.58], l: [0.32, 0.4] },
  /** Grey-brown fur. */
  fur: { h: [24, 40], s: [0.08, 0.2], l: [0.3, 0.42] },
} as const satisfies Record<string, Family>;
type FamilyName = keyof typeof FAMILY;

function colour(r: Rng, name: FamilyName, n = 6, lightScale = 1): number[] {
  const f = FAMILY[name];
  return tone(between(r, f.h[0], f.h[1]), between(r, f.s[0], f.s[1]), between(r, f.l[0], f.l[1]) * lightScale, n);
}

type Tone = readonly [number, number, number];

const METALS: readonly Tone[] = [
  [215, 0.12, 0.6],
  [215, 0.08, 0.38],
  [42, 0.42, 0.48],
  [25, 0.4, 0.42],
];
/** Gilded metal: for paladins, and now and then for clerics and bards. */
const GOLD: Tone = [42, 0.44, 0.52];
/** Ivory, for tusks and horns. */
const IVORY = tone(40, 0.2, 0.74, 4);

/** The light of magic (the last shade tints a spell): fire, green, violet, cold blue. */
function magic(h: number): number[] {
  return [hex(h, 0.45, 0.32), hex(h, 0.55, 0.55), hex(h, 0.6, 0.78)];
}

// ---------------------------------------------------------------- races

interface RaceLook {
  readonly height: readonly [number, number];
  readonly build: readonly [number, number];
  readonly head: readonly [number, number];
  /** The brightest shade of the face: hue, saturation, light. */
  readonly skin: readonly Tone[];
  readonly hair: readonly Tone[];
  /** The chance of a beard for a male (an undetermined figure has a third of it, a female none). */
  readonly beard: number;
  /** The length of a male's beard (figure.ts: 1 is short). */
  readonly beardLength: readonly [number, number];
  readonly ears?: Ears;
  readonly tusks?: boolean;
  readonly nose?: boolean;
}

/** Skin tones from pale to deep brown. */
const HUMAN_SKIN: readonly Tone[] = [
  [24, 0.32, 0.62],
  [22, 0.3, 0.52],
  [28, 0.28, 0.46],
  [26, 0.34, 0.4],
  [20, 0.36, 0.32],
  [18, 0.34, 0.24],
];
const HUMAN_HAIR: readonly Tone[] = [
  [230, 0.1, 0.16],
  [25, 0.35, 0.24],
  [18, 0.45, 0.3],
  [8, 0.5, 0.32],
  [42, 0.4, 0.46],
  [0, 0, 0.5],
  [40, 0.06, 0.68],
];

const RACE_LOOKS: Readonly<Record<Race, RaceLook>> = {
  human: { height: [0.94, 1.08], build: [0.92, 1.18], head: [0.95, 1.05], skin: HUMAN_SKIN, hair: HUMAN_HAIR, beard: 0.5, beardLength: [1, 1.6] },
  // Short and very broad, a big head, ruddy skin, and the beards of the males reach the chest.
  dwarf: {
    height: [0.72, 0.8],
    build: [1.34, 1.5],
    head: [1.08, 1.16],
    skin: [
      [16, 0.4, 0.54],
      [18, 0.38, 0.46],
      [22, 0.34, 0.39],
      [20, 0.36, 0.3],
    ],
    hair: [
      [10, 0.5, 0.32],
      [20, 0.5, 0.36],
      [25, 0.35, 0.24],
      [230, 0.1, 0.16],
      [0, 0, 0.5],
      [40, 0.06, 0.66],
    ],
    beard: 1,
    beardLength: [1.7, 2.1],
  },
  // Tall and slender, a small head, fair or olive skin, long pointed ears.
  elf: {
    height: [1.06, 1.15],
    build: [0.76, 0.86],
    head: [0.9, 0.96],
    skin: [
      [28, 0.24, 0.64],
      [30, 0.22, 0.56],
      [36, 0.22, 0.48],
      [32, 0.26, 0.4],
    ],
    hair: [
      [40, 0.06, 0.7],
      [44, 0.4, 0.52],
      [230, 0.1, 0.16],
      [18, 0.45, 0.34],
      [25, 0.35, 0.24],
    ],
    beard: 0,
    beardLength: [1, 1],
    ears: 'long',
  },
  // Very small, a big head and a big nose.
  gnome: {
    height: [0.6, 0.66],
    build: [0.86, 0.96],
    head: [1.24, 1.32],
    skin: [
      [24, 0.36, 0.58],
      [20, 0.38, 0.48],
      [26, 0.3, 0.41],
      [18, 0.34, 0.31],
    ],
    hair: [
      [40, 0.05, 0.7],
      [20, 0.5, 0.36],
      [25, 0.35, 0.24],
      [8, 0.5, 0.32],
      [0, 0, 0.5],
    ],
    beard: 0.55,
    beardLength: [1, 1.5],
    nose: true,
  },
  'half-elf': {
    height: [1.0, 1.1],
    build: [0.84, 1.0],
    head: [0.93, 1.0],
    skin: HUMAN_SKIN.slice(0, 5),
    hair: [...HUMAN_HAIR, [40, 0.06, 0.7]],
    beard: 0.12,
    beardLength: [1, 1.2],
    ears: 'short',
  },
  // Small and round: a small figure with a fuller build than a gnome, curly brown hair.
  halfling: {
    height: [0.63, 0.69],
    build: [0.98, 1.12],
    head: [1.1, 1.16],
    skin: [
      [26, 0.36, 0.6],
      [24, 0.34, 0.52],
      [28, 0.32, 0.43],
      [22, 0.34, 0.35],
    ],
    hair: [
      [25, 0.35, 0.26],
      [18, 0.45, 0.3],
      [38, 0.35, 0.4],
      [230, 0.1, 0.16],
    ],
    beard: 0.06,
    beardLength: [1, 1],
  },
  // Big and broad, grey-green skin, dark hair and small tusks.
  'half-orc': {
    height: [1.06, 1.14],
    build: [1.28, 1.44],
    head: [1.0, 1.08],
    skin: [
      [95, 0.26, 0.52],
      [105, 0.24, 0.47],
      [86, 0.22, 0.5],
      [115, 0.2, 0.43],
      [75, 0.2, 0.46],
    ],
    hair: [
      [230, 0.1, 0.14],
      [25, 0.3, 0.2],
      [0, 0, 0.4],
    ],
    beard: 0.1,
    beardLength: [1, 1.2],
    tusks: true,
  },
};

/** How the gender changes the figure: the scale of the height and the build. */
const GENDER_SHAPE: Readonly<Record<Gender, { readonly height: number; readonly build: number }>> = {
  male: { height: 1, build: 1.05 },
  female: { height: 0.96, build: 0.88 },
  undetermined: { height: 0.98, build: 0.95 },
};

// ---------------------------------------------------------------- classes

/** What a class kit gets: the random stream, the race and the gender. */
interface Ctx {
  readonly r: Rng;
  readonly race: Race;
  readonly look: RaceLook;
  readonly gender: Gender;
}

interface Made {
  readonly spec: FigureSpec;
  readonly palette: Palette;
}

/** The parts of a spec that a class kit chooses; the race and the gender give the rest. */
type Kit = Omit<FigureSpec, 'height' | 'build' | 'head' | 'beard' | 'ears' | 'tusks' | 'nose' | 'beardLength'> & {
  /** The build of the class: a barbarian is broader, a wizard thinner. */
  readonly buildScale?: number;
  /** A longer beard than the race's (a wizard's). */
  readonly beardLength?: readonly [number, number];
  /** The chance of a beard, times the race's. */
  readonly beardScale?: number;
};

/** The colours that every skin needs; the class changes what it cares about. */
function basePalette(c: Ctx, cloak: FamilyName): Palette {
  const { r, look } = c;
  const cloakRamp = colour(r, cloak);
  const [sh, ss, sl] = pick(r, look.skin);
  const [hh, hs, hl] = pick(r, look.hair);
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
    mask: look.tusks ? IVORY : colour(r, 'bone', 4),
    // Wood a little lighter than the atlas's, so a staff, a haft or a bow shows on dark cloth.
    wood: tone(between(r, 22, 34), between(r, 0.28, 0.38), between(r, 0.3, 0.38), 5),
  };
}

/** A headwear; races with pointed ears wear hoods, cowls and helms less often, so their ears show. */
function headwear(c: Ctx, items: readonly (readonly [Headwear, number])[]): Headwear {
  const hides = (h: Headwear) => h === 'hood' || h === 'cowl' || h === 'helm' || h === 'beak';
  return weighted(c.r, c.look.ears ? items.map(([h, w]) => [h, hides(h) ? w * 0.3 : w] as const) : items);
}

/** A hair cut: females wear it long more often, males short or bald more often. */
function hairCut(c: Ctx, shown: boolean, bald = 2): HairCut {
  if (!shown) return 'short';
  const cuts: Record<Gender, readonly (readonly [HairCut, number])[]> = {
    male: [['short', 5], ['none', bald], ['tail', 2], ['long', 1.5]],
    female: [['long', 5], ['tail', 3], ['short', 2]],
    undetermined: [['short', 3], ['long', 3], ['tail', 2], ['none', bald / 2]],
  };
  return weighted(c.r, cuts[c.gender]);
}

const KITS: Readonly<Record<CharacterClass, (c: Ctx) => { kit: Kit; palette: (p: Palette) => Palette }>> = {
  // Bare chest and arms, a fur mantle, a great axe (or a great sword).
  barbarian(c) {
    const { r } = c;
    const helm = chance(r, 0.18);
    // Only a male goes bare-chested; the others wear a fur or leather vest.
    const vest = c.gender !== 'male' || chance(r, 0.3);
    const fur = colour(r, 'fur');
    return {
      kit: {
        headwear: helm ? 'helm' : 'bare',
        hair: helm ? 'none' : weighted(r, [['long', 4], ['tail', 3], ['short', 2], ['none', 1]]),
        cloak: weighted<CloakCut>(r, [['short', 6], ['none', 3], ['long', 1]]),
        body: 'jerkin',
        pauldrons: chance(r, 0.2),
        scarf: false,
        pouch: chance(r, 0.4),
        horns: helm,
        item: weighted<Item>(r, [['axe', 3], ['sword', 1]]),
        buildScale: 1.08,
      },
      palette: (p) => ({
        ...p,
        cloak: fur,
        lining: fur.slice(0, 4),
        garment: vest ? colour(r, 'fur', 5, 0.85) : p.skin,
        trousers: colour(r, pick(r, ['umber', 'black', 'fur'] as const), 5, 0.75),
        glove: colour(r, 'umber', 3, 0.75),
        belt: colour(r, 'umber', 3, 0.6),
      }),
    };
  },
  // Rich colours, a brim hat with a feather, a short cape, a rapier.
  bard(c) {
    const { r } = c;
    const hat = chance(r, 0.6);
    const bright = pick(r, ['wine', 'teal', 'ochre', 'plum', 'indigo', 'rust'] as const);
    return {
      kit: {
        headwear: hat ? 'brim' : 'bare',
        hair: hairCut(c, true, 0.5),
        cloak: weighted<CloakCut>(r, [['short', 6], ['none', 3], ['long', 1]]),
        body: 'jerkin',
        pauldrons: false,
        scarf: chance(r, 0.4),
        pouch: chance(r, 0.4),
        feather: hat && chance(r, 0.9),
        circlet: !hat && chance(r, 0.2),
        item: 'sword',
      },
      palette: (p) => ({
        ...p,
        cloak: colour(r, bright),
        lining: colour(r, pick(r, ['ochre', 'bone', 'wine'] as const), 4),
        garment: colour(r, pick(r, ['wine', 'teal', 'ochre', 'plum', 'indigo'] as const), 5),
        hat: colour(r, pick(r, ['black', 'wine', 'indigo', 'umber'] as const), 4, 0.9),
        scarf: colour(r, pick(r, ['bone', 'ochre', 'wine', 'teal'] as const), 4, 1.1),
        ...(chance(r, 0.3) ? { metal: tone(GOLD[0], GOLD[1], GOLD[2]) } : {}),
      }),
    };
  },
  // Armour or a robe under a tabard in holy colours, a mace and often a shield.
  cleric(c) {
    const { r } = c;
    const armour = chance(r, 0.6);
    const head = headwear(c, [['bare', 5], ['helm', 2], ['cowl', 2]]);
    const holy = pick(r, ['bone', 'bone', 'ochre', 'wine', 'indigo'] as const);
    return {
      kit: {
        headwear: head,
        hair: hairCut(c, head === 'bare'),
        cloak: weighted<CloakCut>(r, [['short', 4], ['long', 3], ['none', 3]]),
        body: armour ? 'armour' : 'robe',
        pauldrons: armour && chance(r, 0.5),
        scarf: false,
        pouch: chance(r, 0.3),
        tabard: armour || chance(r, 0.5),
        circlet: head === 'bare' && chance(r, 0.25),
        shield: chance(r, 0.65),
        item: 'mace',
      },
      palette: (p) => ({
        ...p,
        cloak: colour(r, holy),
        lining: colour(r, holy, 4, 0.7),
        garment: armour ? p.garment : colour(r, pick(r, ['bone', 'ash', 'umber'] as const), 5),
        ...(chance(r, 0.35) ? { metal: tone(GOLD[0], GOLD[1], GOLD[2] - 0.04) } : {}),
      }),
    };
  },
  // A robe or leathers in greens and browns, antlers or a hood, a staff (or a living orb).
  druid(c) {
    const { r } = c;
    const head = headwear(c, [['hood', 4], ['bare', 5]]);
    const orb = chance(r, 0.4);
    return {
      kit: {
        headwear: head,
        hair: hairCut(c, head === 'bare', 1),
        cloak: weighted<CloakCut>(r, [['long', 4], ['short', 3], ['none', 2]]),
        body: weighted<BodyCut>(r, [['robe', 6], ['jerkin', 4]]),
        pauldrons: false,
        scarf: chance(r, 0.2),
        pouch: chance(r, 0.6),
        antlers: chance(r, 0.5),
        item: orb ? 'orbstaff' : 'staff',
      },
      palette: (p) => ({
        ...p,
        cloak: colour(r, pick(r, ['moss', 'moss', 'umber', 'teal', 'fur'] as const)),
        garment: colour(r, pick(r, ['moss', 'umber', 'ochre'] as const), 5),
        belt: colour(r, pick(r, ['umber', 'moss'] as const), 3, 0.8),
        glass: magic(between(r, 95, 140)),
      }),
    };
  },
  // Armour and pauldrons, a helm or a bare head, a sword and often a shield.
  fighter(c) {
    const { r } = c;
    const head = headwear(c, [['helm', 5], ['bare', 5]]);
    return {
      kit: {
        headwear: head,
        hair: head === 'helm' ? 'none' : hairCut(c, true),
        cloak: weighted<CloakCut>(r, [['short', 5], ['none', 3], ['long', 2]]),
        body: 'armour',
        pauldrons: chance(r, 0.85),
        scarf: false,
        pouch: false,
        tabard: chance(r, 0.35),
        horns: head === 'helm' && chance(r, 0.1),
        shield: chance(r, 0.65),
        item: 'sword',
        buildScale: 1.04,
      },
      palette: (p) => {
        const heraldry = colour(r, pick(r, ['wine', 'indigo', 'black', 'moss', 'rust'] as const));
        return { ...p, cloak: heraldry, lining: heraldry.slice(0, 4) };
      },
    };
  },
  // A saffron or earthen robe with a sash, a shaven head, no weapon: the palm.
  monk(c) {
    const { r } = c;
    const head = headwear(c, [['bare', 15], ['cowl', 3], ['brim', 2]]);
    const robe = pick(r, ['saffron', 'saffron', 'rust', 'umber', 'bone', 'ash'] as const);
    return {
      kit: {
        headwear: head,
        hair: head === 'bare' ? weighted<HairCut>(r, [['none', 5], ['short', 3], ['tail', 2]]) : 'none',
        cloak: head === 'cowl' ? 'none' : weighted<CloakCut>(r, [['none', 8], ['short', 2]]),
        body: weighted<BodyCut>(r, [['robe', 7], ['jerkin', 3]]),
        pauldrons: false,
        scarf: false,
        pouch: chance(r, 0.3),
        item: 'none',
        buildScale: 0.97,
      },
      palette: (p) => {
        const cloth = colour(r, robe);
        return { ...p, cloak: cloth, lining: cloth.slice(0, 4), garment: colour(r, robe, 5), belt: colour(r, pick(r, ['wine', 'black', 'ochre', 'indigo'] as const), 3), glove: p.skin.slice(1, 4) };
      },
    };
  },
  // Gilded armour, a bright tabard and cape, a circlet or a helm, a sword and a shield.
  paladin(c) {
    const { r } = c;
    const head = headwear(c, [['helm', 4], ['bare', 6]]);
    const holy = pick(r, ['bone', 'wine', 'indigo', 'ochre'] as const);
    return {
      kit: {
        headwear: head,
        hair: head === 'helm' ? 'none' : hairCut(c, true, 1),
        cloak: weighted<CloakCut>(r, [['long', 5], ['short', 4], ['none', 1]]),
        body: 'armour',
        pauldrons: true,
        scarf: false,
        pouch: false,
        tabard: chance(r, 0.9),
        circlet: head === 'bare' && chance(r, 0.55),
        shield: chance(r, 0.7),
        item: 'sword',
        buildScale: 1.04,
      },
      palette: (p) => ({
        ...p,
        cloak: colour(r, holy, 6, 1.1),
        lining: colour(r, holy, 4, 0.8),
        metal: chance(r, 0.6) ? tone(GOLD[0], GOLD[1], GOLD[2]) : tone(215, 0.1, 0.64),
      }),
    };
  },
  // A hood, greens and browns, a short cloak (or a quiver on the back), a bow in the left hand.
  ranger(c) {
    const { r } = c;
    const head = headwear(c, [['hood', 6], ['bare', 4]]);
    const cloak = weighted<CloakCut>(r, [['short', 6], ['none', 4]]);
    return {
      kit: {
        headwear: head,
        hair: hairCut(c, head === 'bare', 0.5),
        cloak,
        body: 'jerkin',
        pauldrons: chance(r, 0.15),
        scarf: chance(r, 0.4),
        pouch: chance(r, 0.7),
        quiver: cloak === 'none',
        item: 'bow',
      },
      palette: (p) => {
        const green = colour(r, pick(r, ['moss', 'moss', 'umber', 'teal'] as const));
        return { ...p, cloak: green, lining: green.slice(0, 4), garment: colour(r, pick(r, ['umber', 'moss'] as const), 5), scarf: colour(r, pick(r, ['bone', 'moss', 'ochre'] as const), 4) };
      },
    };
  },
  // A dark hood, a scarf over the face, dark leathers, daggers.
  rogue(c) {
    const { r } = c;
    const head = headwear(c, [['hood', 7], ['bare', 3]]);
    return {
      kit: {
        headwear: head,
        hair: hairCut(c, head === 'bare', 1),
        cloak: weighted<CloakCut>(r, [['short', 5], ['long', 3], ['none', 2]]),
        body: 'jerkin',
        pauldrons: false,
        scarf: chance(r, 0.75),
        pouch: chance(r, 0.6),
        item: 'dagger',
        buildScale: 0.95,
      },
      palette: (p) => {
        const dark = colour(r, pick(r, ['black', 'ash', 'plum', 'indigo', 'umber'] as const));
        return { ...p, cloak: dark, lining: dark.slice(0, 4), garment: colour(r, pick(r, ['black', 'umber', 'ash'] as const), 5), scarf: colour(r, pick(r, ['ash', 'wine', 'umber'] as const), 4) };
      },
    };
  },
  // A vivid robe, a bare head with wild hair, magic from the hands (now and then an orb).
  sorcerer(c) {
    const { r } = c;
    const head = headwear(c, [['bare', 8], ['cowl', 2]]);
    const vivid = pick(r, ['wine', 'plum', 'teal', 'indigo', 'rust'] as const);
    return {
      kit: {
        headwear: head,
        hair: head === 'bare' ? weighted<HairCut>(r, c.gender === 'male' ? [['short', 3], ['long', 3], ['tail', 2]] : [['long', 6], ['tail', 2], ['short', 1]]) : 'short',
        cloak: weighted<CloakCut>(r, [['none', 4], ['long', 3], ['short', 3]]),
        body: weighted<BodyCut>(r, [['robe', 6], ['jerkin', 4]]),
        pauldrons: false,
        scarf: chance(r, 0.25),
        pouch: chance(r, 0.3),
        circlet: head === 'bare' && chance(r, 0.3),
        item: chance(r, 0.25) ? 'orbstaff' : 'none',
        buildScale: 0.95,
      },
      palette: (p) => ({ ...p, cloak: colour(r, vivid), garment: colour(r, pick(r, [vivid, 'black', 'plum'] as const), 5), glass: magic(between(r, 8, 32)) }),
    };
  },
  // Black and plum, a cowl or a hood, small horns now and then, an orb or bare hands.
  warlock(c) {
    const { r } = c;
    const head = headwear(c, [['cowl', 4], ['hood', 3], ['bare', 3]]);
    return {
      kit: {
        headwear: head,
        hair: hairCut(c, head === 'bare', 1),
        cloak: weighted<CloakCut>(r, [['long', 6], ['short', 2], ['none', 2]]),
        body: weighted<BodyCut>(r, [['robe', 5], ['jerkin', 5]]),
        pauldrons: chance(r, 0.15),
        scarf: false,
        pouch: chance(r, 0.4),
        horns: chance(r, 0.35),
        item: chance(r, 0.5) ? 'orbstaff' : 'none',
      },
      palette: (p) => {
        const dark = colour(r, pick(r, ['black', 'plum', 'black', 'teal'] as const), 6, 0.9);
        return { ...p, cloak: dark, lining: colour(r, pick(r, ['wine', 'plum'] as const), 4, 0.8), garment: colour(r, pick(r, ['black', 'plum'] as const), 5), glass: magic(chance(r, 0.5) ? between(r, 95, 125) : between(r, 272, 292)) };
      },
    };
  },
  // A pointed hat, a long robe, a long beard (males), a staff or an orb staff.
  wizard(c) {
    const { r } = c;
    const head = headwear(c, [['witch', 13], ['cowl', 4], ['bare', 3]]);
    return {
      kit: {
        headwear: head,
        hair: head === 'cowl' ? 'short' : hairCut(c, true, 1.5),
        cloak: weighted<CloakCut>(r, [['none', 6], ['long', 4]]),
        body: weighted<BodyCut>(r, [['robe', 17], ['jerkin', 3]]),
        pauldrons: false,
        scarf: chance(r, 0.15),
        pouch: chance(r, 0.4),
        item: chance(r, 0.55) ? 'orbstaff' : 'staff',
        buildScale: 0.93,
        beardScale: 1.6,
        beardLength: [1.5, 2.2],
      },
      palette: (p) => {
        const robe = colour(r, pick(r, ['indigo', 'plum', 'ash', 'umber', 'teal', 'black'] as const));
        return { ...p, cloak: robe, lining: robe.slice(0, 4), garment: chance(r, 0.6) ? colour(r, pick(r, ['indigo', 'plum', 'ash', 'umber', 'teal'] as const), 5) : robe.slice(1, 6), hat: chance(r, 0.6) ? robe.slice(1, 5) : p.hat, glass: magic(between(r, 192, 215)) };
      },
    };
  },
};

function make(appearance: Appearance, r: Rng): Made {
  const look = RACE_LOOKS[appearance.race];
  const c: Ctx = { r, race: appearance.race, look, gender: appearance.gender };
  const shape = GENDER_SHAPE[appearance.gender];
  const { kit, palette } = KITS[appearance.class](c);
  const { buildScale = 1, beardScale = 1, beardLength: classBeard, ...worn } = kit;
  const beardChance = appearance.gender === 'male' ? look.beard : appearance.gender === 'undetermined' ? look.beard / 3 : 0;
  const beard = chance(r, Math.min(1, beardChance * beardScale));
  const [b0, b1] = classBeard && appearance.gender === 'male' ? [Math.max(classBeard[0], look.beardLength[0]), Math.max(classBeard[1], look.beardLength[1])] : look.beardLength;
  const beardLength = beard ? between(r, b0, b1) : 1;
  const spec: FigureSpec = {
    height: Math.min(1.17, between(r, look.height[0], look.height[1]) * shape.height),
    build: Math.min(1.5, between(r, look.build[0], look.build[1]) * shape.build * buildScale),
    head: between(r, look.head[0], look.head[1]),
    ...worn,
    // A scarf over the face hides a beard and tusks; a helm hides the hair.
    beard: beard && !(worn.scarf && appearance.class === 'rogue'),
    ...(beard && beardLength > 1.05 ? { beardLength } : {}),
    ...(look.ears ? { ears: look.ears } : {}),
    ...(look.tusks ? { tusks: true } : {}),
    ...(look.nose ? { nose: true } : {}),
  };
  return { spec, palette: palette(basePalette(c, 'ash')) };
}

/** The skin of a seed. The same seed gives the same skin in every client. */
export function skinFromSeed(seed: number): Skin {
  const appearance = appearanceOf(seed);
  const r = rng(seed ^ 0x5eed5);
  return { seed: seed >>> 0, appearance, ...make(appearance, r) };
}

// ---------------------------------------------------------------- names

/** First names: short, old and dark. Each fits with every title below in 16 characters. */
const FIRST_NAMES = [
  'Aldric', 'Bram', 'Corvin', 'Dagny', 'Edda', 'Fenn', 'Garrick', 'Hesk', 'Isolde', 'Jorund', 'Kael', 'Lenna',
  'Mordin', 'Nyx', 'Osric', 'Petra', 'Quill', 'Rowan', 'Sable', 'Tamsin', 'Ulric', 'Vesna', 'Wendel', 'Ysra',
  'Zora', 'Brenn', 'Cass', 'Dorian', 'Elric', 'Galen', 'Hild', 'Ivo', 'Ketil', 'Lorne', 'Mabe', 'Nell',
  'Orla', 'Perrin', 'Rook', 'Silas', 'Thane', 'Una', 'Varn', 'Wyn', 'Agna', 'Bertil', 'Cyne', 'Ebba',
];

/** How each class is called: templates with {n} for the first name, for a male, a female and anyone. */
const NAME_TEMPLATES: Readonly<Record<CharacterClass, Readonly<Record<Gender, readonly string[]>>>> = {
  barbarian: { male: ['{n} the Red', '{n} Ironhide'], female: ['{n} the Red', '{n} Ironhide'], undetermined: ['{n} the Red', '{n} Ironhide'] },
  bard: { male: ['{n} Lark', 'Minstrel {n}'], female: ['{n} Lark', 'Minstrel {n}'], undetermined: ['{n} Lark', 'Minstrel {n}'] },
  cleric: { male: ['Brother {n}', 'Father {n}'], female: ['Sister {n}', 'Mother {n}'], undetermined: ['{n} the Pious'] },
  druid: { male: ['{n} Oakheart', '{n} of the Fen'], female: ['{n} Oakheart', '{n} of the Fen'], undetermined: ['{n} Oakheart', '{n} of the Fen'] },
  fighter: { male: ['{n} Vane', 'Sir {n}'], female: ['{n} Vane', 'Dame {n}'], undetermined: ['{n} Vane', '{n} Blade'] },
  monk: { male: ['Brother {n}'], female: ['Sister {n}'], undetermined: ['{n} the Still'] },
  paladin: { male: ['Sir {n}', 'Sir {n} Vane'], female: ['Dame {n}', 'Dame {n} Vane'], undetermined: ['{n} the Just'] },
  ranger: { male: ['{n} Ashwood', '{n} Thorn'], female: ['{n} Ashwood', '{n} Thorn'], undetermined: ['{n} Ashwood', '{n} Thorn'] },
  rogue: { male: ['{n} Quickhand', 'Sly {n}'], female: ['{n} Quickhand', 'Sly {n}'], undetermined: ['{n} Quickhand', 'Sly {n}'] },
  sorcerer: { male: ['{n} Emberborn', '{n} the Wild'], female: ['{n} Emberborn', '{n} the Wild'], undetermined: ['{n} Emberborn', '{n} the Wild'] },
  warlock: { male: ['{n} Nightshade', 'Old {n}'], female: ['{n} Nightshade', 'Mother {n}'], undetermined: ['{n} Nightshade', 'Old {n}'] },
  wizard: { male: ['{n} the Grey', 'Master {n}'], female: ['{n} the Grey', 'Mistress {n}'], undetermined: ['{n} the Grey', 'Magus {n}'] },
};

/**
 * The name of a skin, for a figure without a chosen name: a first name, and a title that fits
 * its class and gender (a cleric is "Brother Aldric", a paladin "Dame Petra"). The same seed gives
 * the same name in every client, so the others see it too, and it stays with the look.
 */
export function skinName(seed: number): string {
  const { class: cls, gender } = appearanceOf(seed);
  // Its own stream of random numbers: the look of a seed does not change with the names.
  const r = rng((seed ^ 0x6e616d65) >>> 0);
  const first = pick(r, FIRST_NAMES);
  const name = pick(r, NAME_TEMPLATES[cls][gender]).replace('{n}', first);
  return name.length <= 16 ? name : first;
}

/** What a skin is and wears, for tests and previews. */
export function describeSkin(skin: Skin): string {
  const { spec, appearance: a } = skin;
  const extras = (['ears', 'tusks', 'nose', 'shield', 'quiver', 'antlers', 'feather', 'horns', 'circlet', 'tabard'] as const).filter((key) => spec[key]);
  return `${a.gender} ${a.race} ${a.class}: ${spec.headwear}${spec.hair !== 'none' ? `, ${spec.hair} hair` : ''}${spec.beard ? `, beard ${(spec.beardLength ?? 1).toFixed(1)}` : ''}, ${spec.body}, ${spec.cloak} cloak, ${spec.item ?? 'none'}${extras.length ? `, ${extras.join(' ')}` : ''}, h ${spec.height.toFixed(2)}, w ${spec.build.toFixed(2)}`;
}

export type { BodyCut, CloakCut, Ears, HairCut, Headwear, Item };

/** How a skin attacks (attacks.ts): from its class and its item. */
export function skinAttack(skin: Skin): AttackStyle {
  return attackStyle(skin.appearance.class, skin.spec);
}

/** Renders the sheet of a skin: every view, the stand, the walk, the attack, the roll and the fall. */
export function renderSkinSheet(skin: Skin): SkinSheet {
  const { width, height } = SKIN_FRAME;
  const image = new Image(width * (1 + SKIN_WALK_FRAMES + SKIN_ATTACK_FRAMES + SKIN_ROLL_FRAMES + SKIN_FALL_FRAMES), height * SKIN_VIEWS.length);
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
    for (let f = 0; f < SKIN_ROLL_FRAMES; f++) {
      image.draw(renderModel(rollParts(skin.spec, f), materials, { ...SKIN_FRAME, yaw: view.yaw }), (1 + SKIN_WALK_FRAMES + SKIN_ATTACK_FRAMES + f) * width, row * height);
    }
    for (let f = 0; f < SKIN_FALL_FRAMES; f++) {
      const column = 1 + SKIN_WALK_FRAMES + SKIN_ATTACK_FRAMES + SKIN_ROLL_FRAMES + f;
      image.draw(renderModel(fallParts(skin.spec, f), materials, { ...SKIN_FRAME, yaw: view.yaw }), column * width, row * height);
    }
  });
  return { image, headHeight: Math.round(figureTop(skin.spec) * HEIGHT_SCALE) + 4 };
}
