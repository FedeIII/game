/**
 * The human figure of the game, as parameters: proportions (height, build, head) and what it
 * wears (headwear, hair, cloak, body garment, details). The player's wanderer, the NPCs and the
 * random player skins (skins.ts) are all this one model with other parameters and colours, so
 * they share one style. It has no Node imports: the browser renders skins with it at run time.
 *
 * Model space: world pixels, y up, z towards the viewer; the figure stands on y = 0. With the
 * default proportions it is about 28 pixels tall (6.5 heads).
 */
import { ellipsoid, intersect, noise3, roundCone, sphere, subtract, type Material, type Part, type Sdf, type Vec3 } from './sdf.ts';

/** Material slots of a figure. A Palette gives the colours of each. */
export const FM = {
  cloak: 0,
  lining: 1,
  garment: 2,
  trousers: 3,
  boots: 4,
  face: 5,
  metal: 6,
  belt: 7,
  glove: 8,
  hair: 9,
  faceLit: 10,
  hat: 11,
  scarf: 12,
  mask: 13,
  wood: 14,
  /** Lit from inside: a lantern's glass, a staff's orb. */
  glass: 15,
} as const;

export type Headwear = 'hood' | 'cowl' | 'bare' | 'brim' | 'witch' | 'helm' | 'beak';
export type HairCut = 'none' | 'short' | 'long' | 'tail';
export type CloakCut = 'long' | 'short' | 'none';
export type BodyCut = 'jerkin' | 'robe' | 'armour';
/**
 * What the figure carries: a staff in the right hand (with an orb or a knob), a sword at the left
 * hip, a lantern in the right hand, an axe upright in the right hand, a mace that hangs from the
 * right hand, a dagger at the right hip, or a bow in the left hand.
 */
export type Item = 'none' | 'staff' | 'orbstaff' | 'sword' | 'lantern' | 'axe' | 'mace' | 'dagger' | 'bow';
/** Pointed ears: short (a half-elf) or long (an elf). */
export type Ears = 'short' | 'long';

export interface FigureSpec {
  /** The scale of all heights: 1 is about 28 pixels. */
  readonly height: number;
  /** The scale of all widths and of the thickness of the limbs. */
  readonly build: number;
  /** The scale of the head. */
  readonly head: number;
  readonly headwear: Headwear;
  /** The hair, where the headwear shows it. */
  readonly hair: HairCut;
  readonly beard: boolean;
  readonly cloak: CloakCut;
  readonly body: BodyCut;
  /** Metal plates on the shoulders. */
  readonly pauldrons: boolean;
  readonly scarf: boolean;
  /** A small bag on the belt. */
  readonly pouch: boolean;
  /** A cloth panel over the chest, in the colour of the cloak (over armour, for a knight). */
  readonly tabard?: boolean;
  /** Horns: large on a helm, small on a bare head, a hood or a cowl. */
  readonly horns?: boolean;
  /** A thin metal band round the head (on hair). */
  readonly circlet?: boolean;
  readonly item?: Item;
  /** Pointed ears, where the headwear shows the sides of the head (bare, a brim or a pointed hat). */
  readonly ears?: Ears;
  /** Two small tusks from the lower jaw. */
  readonly tusks?: boolean;
  /** A big round nose. */
  readonly nose?: boolean;
  /** The length of a beard: 1 (the default) is short; 2 reaches the chest. */
  readonly beardLength?: number;
  /** A round shield on the left forearm (the arm on the -x side). */
  readonly shield?: boolean;
  /** A quiver of arrows on the back. */
  readonly quiver?: boolean;
  /** Antlers on the head (with a bare head, a hood or a cowl). */
  readonly antlers?: boolean;
  /** A feather in the band of a brim hat. */
  readonly feather?: boolean;
}

/**
 * A pose for an attack (attacks.ts makes them). Each arm points along two directions in model
 * space, [upper arm, forearm]; `right` is the arm on the +x side, whose hand holds the item.
 * `lean` bends the upper body forward. `weapon` is what that hand holds during the attack.
 */
export interface FigureAction {
  readonly right: readonly [Vec3, Vec3];
  readonly left?: readonly [Vec3, Vec3];
  readonly lean: number;
  readonly weapon?: Weapon;
  /** 0 to 1: the legs fold up under the body, for a roll (see tumble()). Default 0. */
  readonly tuck?: number;
}

/**
 * A blade along the forearm (a sword, a rapier, a dagger: its length and width), a staff in the
 * hand along `dir` (with an orb at its end, or a knob), or a lantern held out.
 */
export type Weapon =
  | { readonly kind: 'blade'; readonly length: number; readonly width: number }
  | { readonly kind: 'staff'; readonly dir: Vec3; readonly orb: boolean }
  | { readonly kind: 'lantern' }
  | { readonly kind: 'axe' }
  | { readonly kind: 'mace' }
  /** The bow held out in the left hand, its string drawn back to the right hand by `draw` (0 to 1), with an arrow on it while drawn. */
  | { readonly kind: 'bow'; readonly draw: number };

/** The player's hooded wanderer. */
export const WANDERER: FigureSpec = {
  height: 1,
  build: 1,
  head: 1,
  headwear: 'hood',
  hair: 'short',
  beard: false,
  cloak: 'long',
  body: 'jerkin',
  pauldrons: true,
  scarf: false,
  pouch: false,
};

/** The colours of a figure: a ramp (darkest first) for each material slot except the lit face. */
export interface Palette {
  readonly cloak: readonly number[];
  readonly lining: readonly number[];
  readonly garment: readonly number[];
  readonly trousers: readonly number[];
  readonly boots: readonly number[];
  /** Skin. The face in the shadow of a hood or a brim uses it a little darker. */
  readonly skin: readonly number[];
  readonly metal: readonly number[];
  readonly belt: readonly number[];
  readonly glove: readonly number[];
  readonly hair: readonly number[];
  readonly hat: readonly number[];
  readonly scarf: readonly number[];
  readonly mask: readonly number[];
  readonly wood?: readonly number[];
  readonly glass?: readonly number[];
}

const WOOD = [0x0f0a07ff, 0x1d140dff, 0x2c1f14ff, 0x3d2b1cff, 0x4e3824ff];
const LANTERN_GLASS = [0xc8822eff, 0xf0b04aff, 0xffe08aff];

export function figureMaterials(p: Palette): Material[] {
  const out: Material[] = [];
  out[FM.cloak] = { ramp: p.cloak };
  out[FM.lining] = { ramp: p.lining };
  out[FM.garment] = { ramp: p.garment };
  out[FM.trousers] = { ramp: p.trousers };
  out[FM.boots] = { ramp: p.boots };
  out[FM.face] = { ramp: p.skin, bias: -0.12 };
  out[FM.metal] = { ramp: p.metal };
  out[FM.belt] = { ramp: p.belt };
  out[FM.glove] = { ramp: p.glove };
  out[FM.hair] = { ramp: p.hair };
  out[FM.faceLit] = { ramp: p.skin };
  out[FM.hat] = { ramp: p.hat };
  out[FM.scarf] = { ramp: p.scarf };
  out[FM.mask] = { ramp: p.mask };
  out[FM.wood] = { ramp: p.wood ?? WOOD };
  out[FM.glass] = { ramp: p.glass ?? LANTERN_GLASS, bias: 0.6 };
  return out;
}

// Proportions at scale 1, in world pixels.
const HIP_Y = 14.4;
const HIP_HALF_WIDTH = 1.55;
const THIGH = 6.9;
const SHIN = 6.6;
const SHOULDER_Y = 21.0;
const SHOULDER_HALF_WIDTH = 3.25;
const UPPER_ARM = 4.5;
const FOREARM = 4.0;
const HEAD_Y = 25.3;
const HEAD_Z = 0.2;
const HEAD_RADIUS = 1.9;

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k];
}

function unit(x: number, y: number, z: number): Vec3 {
  const length = Math.sqrt(x * x + y * y + z * z);
  return [x / length, y / length, z / length];
}

/** A shape and a sphere that holds it (for Part.bound). */
interface Shape {
  readonly sdf: Sdf;
  readonly bound: readonly [number, number, number, number];
}

const S = (c: Vec3, r: number): Shape => ({ sdf: sphere(c, r), bound: [c[0], c[1], c[2], r] });
const E = (c: Vec3, radii: Vec3): Shape => ({ sdf: ellipsoid(c, radii), bound: [c[0], c[1], c[2], Math.max(...radii)] });
const C = (a: Vec3, b: Vec3, ra: number, rb: number): Shape => {
  const half = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 2;
  return { sdf: roundCone(a, b, ra, rb), bound: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, half + Math.max(ra, rb)] };
};
/** A shape with another shape cut away; it stays inside the first one's bound. */
const cut = (shape: Shape, away: Sdf): Shape => ({ sdf: subtract(shape.sdf, away), bound: shape.bound });
/** Two shapes as one part; the bound holds both. */
const join = (a: Shape, b: Shape): Shape => {
  const [ax, ay, az, ar] = a.bound;
  const [bx, by, bz, br] = b.bound;
  const d = Math.hypot(bx - ax, by - ay, bz - az);
  if (d + br <= ar) return { sdf: (x, y, z) => Math.min(a.sdf(x, y, z), b.sdf(x, y, z)), bound: a.bound };
  if (d + ar <= br) return { sdf: (x, y, z) => Math.min(a.sdf(x, y, z), b.sdf(x, y, z)), bound: b.bound };
  const r = (d + ar + br) / 2;
  const t = d > 0 ? (r - ar) / d : 0;
  return {
    sdf: (x, y, z) => Math.min(a.sdf(x, y, z), b.sdf(x, y, z)),
    bound: [ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t, r],
  };
};

/** A flat round disc (a shield): centre, unit normal, radius and half thickness, with soft edges. */
const disc = (c: Vec3, n: Vec3, radius: number, half: number): Shape => ({
  sdf: (x, y, z) => {
    const px = x - c[0];
    const py = y - c[1];
    const pz = z - c[2];
    const along = px * n[0] + py * n[1] + pz * n[2];
    const qx = px - along * n[0];
    const qy = py - along * n[1];
    const qz = pz - along * n[2];
    const radial = Math.sqrt(qx * qx + qy * qy + qz * qz) - (radius - 0.2);
    const axial = Math.abs(along) - (half - 0.2);
    return Math.min(Math.max(radial, axial), 0) + Math.hypot(Math.max(radial, 0), Math.max(axial, 0)) - 0.2;
  },
  bound: [c[0], c[1], c[2], radius + 0.1],
});

/** A curve through points, as round cones from point to point; the bound holds all of them. */
const curve = (points: readonly Vec3[], radii: readonly number[]): Shape => {
  const segments = points.slice(1).map((b, i) => roundCone(points[i]!, b, radii[i]!, radii[i + 1]!));
  const lo = [0, 1, 2].map((a) => Math.min(...points.map((p) => p[a]!)));
  const hi = [0, 1, 2].map((a) => Math.max(...points.map((p) => p[a]!)));
  const centre: Vec3 = [(lo[0]! + hi[0]!) / 2, (lo[1]! + hi[1]!) / 2, (lo[2]! + hi[2]!) / 2];
  const reach = Math.max(...points.map((p) => Math.hypot(p[0] - centre[0], p[1] - centre[1], p[2] - centre[2])));
  return {
    sdf: (x, y, z) => {
      let d = Infinity;
      for (const segment of segments) d = Math.min(d, segment(x, y, z));
      return d;
    },
    bound: [centre[0], centre[1], centre[2], reach + Math.max(...radii)],
  };
};

/** How high the top of the figure is (head, hood or hat), in model units above the ground. */
export function figureTop(spec: FigureSpec): number {
  const head = HEAD_Y * spec.height;
  const k = spec.head;
  // Antlers rise above a hood or a bare head.
  if (spec.antlers && (spec.headwear === 'bare' || spec.headwear === 'hood' || spec.headwear === 'cowl')) return head + 4.6 * k;
  if (spec.feather && spec.headwear === 'brim') return head + 4.3 * k;
  switch (spec.headwear) {
    case 'witch':
      return head + 7.4 * k;
    case 'brim':
    case 'beak':
      return head + 3.6 * k;
    case 'cowl':
      return head + 3.9 * k;
    case 'hood':
      return head + 2.9 * k;
    default:
      return head + 2.3 * k;
  }
}

/**
 * The parts of the figure at one moment of the walk. `phase` is the walk cycle angle and
 * `amount` is 0 for a stand and 1 for a full walk.
 */
export function figure(spec: FigureSpec, phase: number, amount: number, action?: FigureAction): Part[] {
  const h = spec.height;
  const w = spec.build;
  const k = spec.head;
  /** Limbs grow thicker with the build, but less than the torso does. */
  const limb = Math.pow(w, 0.6);
  /** The depth of the torso grows a little with the build. */
  const zs = 0.75 + 0.25 * w;
  const robe = spec.body === 'robe';

  const swing = (robe ? 0.48 : 0.62) * amount;
  const kneeBend = 1.05 * amount;
  const armSwing = 0.5 * amount;
  // A small forward lean of the upper body when it walks; an attack adds its own.
  const lean = 0.1 * amount + (action?.lean ?? 0);
  const hipY = HIP_Y * h;

  const tuck = action?.tuck ?? 0;
  const legs = [-1, 1].map((side) => {
    const p = phase + (side < 0 ? 0 : Math.PI);
    // A tuck folds the thighs up to the front and the shins back under them.
    const theta = swing * Math.sin(p) + 2.0 * tuck;
    // The knee bends most while the leg swings forward, under the body.
    const knee = 0.1 + kneeBend * Math.max(0, Math.cos(p)) + 2.7 * tuck;
    const hip: Vec3 = [side * HIP_HALF_WIDTH * w, hipY, 0];
    const kneeAt = add(hip, [0, -THIGH * h * Math.cos(theta), THIGH * h * Math.sin(theta)]);
    const shin = theta - knee;
    const ankle = add(kneeAt, [0, -SHIN * h * Math.cos(shin), SHIN * h * Math.sin(shin)]);
    const toe = add(ankle, [0, -0.45, 2.1]);
    return { hip, knee: kneeAt, ankle, toe };
  });
  // Put the lower foot on the ground. This also gives the body its up-and-down bob.
  const lift = -Math.min(...legs.map((leg) => Math.min(leg.ankle[1] - 0.9, leg.toe[1] - 0.7)));
  const up = (v: Vec3): Vec3 => [v[0], v[1] + lift, v[2]];
  // The lean moves points above the hips forward, more for higher points.
  const upper = (v: Vec3): Vec3 => up([v[0], v[1], v[2] + Math.max(0, v[1] - hipY) * lean]);

  const parts: Part[] = [];
  const part = (shape: Shape, material: Part['material']): void => {
    parts.push({ sdf: shape.sdf, material, bound: shape.bound });
  };

  // ---------------------------------------------------------------- legs
  for (const leg of legs) {
    const ankle = up(leg.ankle);
    part(C(up(leg.hip), up(leg.knee), 1.7 * limb, 1.35 * limb), FM.trousers);
    part(C(up(leg.knee), ankle, 1.35 * limb, 1.05 * limb), (_x, y) => (y < ankle[1] + 3.2 ? FM.boots : FM.trousers));
    part(C(ankle, up(leg.toe), 1.0 * limb, 0.8 * limb), FM.boots);
  }

  // ---------------------------------------------------------------- torso
  const chest = spec.body === 'armour' ? FM.metal : FM.garment;
  part(E(up([0, 14.6 * h, 0]), [2.35 * w, 1.7 * h, 1.65 * zs]), FM.garment);
  part(E(upper([0, 16.7 * h, 0]), [2.25 * w, 1.9 * h, 1.55 * zs]), chest);
  part(E(upper([0, 19.4 * h, 0.05]), [2.9 * w, 2.5 * h, 1.85 * zs]), chest);
  part(E(up([0, 15.4 * h, 0]), [2.45 * w, 0.5, 1.8 * zs]), FM.belt);
  if (!robe) part(S(up([0, 15.4 * h, 1.75 * zs]), 0.5), FM.metal);
  if (spec.pouch) part(E(up([1.95 * w, 14.5 * h, 0.9 * zs]), [0.75, 0.95, 0.65]), FM.belt);
  if (robe) {
    // A long skirt from the waist to the ankles, with folds; it sways as the figure walks.
    const sway = 0.5 * amount * Math.sin(phase);
    const top = up([0, 15.2 * h, 0]);
    const skirt = C(top, up([sway, 1.7, -0.2]), 2.5 * w, 3.5 * w + 0.4);
    const folds: Sdf = (x, y, z) => skirt.sdf(x, y, z) + 0.22 * Math.sin(Math.atan2(x, z) * 7) * Math.min(1, Math.max(0, (top[1] - y) / 8));
    part({ sdf: folds, bound: [skirt.bound[0], skirt.bound[1], skirt.bound[2], skirt.bound[3] + 0.3] }, FM.garment);
  }

  // ---------------------------------------------------------------- arms
  const hands: Record<number, Vec3> = {};
  /** The direction of the right forearm, for a weapon along it. */
  let rightForearm: Vec3 = [0, -1, 0];
  for (const side of [-1, 1]) {
    const p = phase + (side < 0 ? 0 : Math.PI);
    // The arm swings against the leg on the same side, and bends more when it swings forward.
    const alpha = -armSwing * Math.sin(p);
    const bend = 0.3 + 0.5 * Math.max(0, alpha);
    const shoulder: Vec3 = [side * SHOULDER_HALF_WIDTH * w, SHOULDER_Y * h, 0];
    let elbow = add(shoulder, scale(unit(side * 0.16, -Math.cos(alpha), Math.sin(alpha)), UPPER_ARM * h));
    let forearm = unit(side * 0.06, -Math.cos(alpha + bend), Math.sin(alpha + bend));
    // An attack puts the arm where it says.
    const posed = side === 1 ? action?.right : action?.left;
    if (posed) {
      elbow = add(shoulder, scale(unit(...posed[0]), UPPER_ARM * h));
      forearm = unit(...posed[1]);
    }
    if (side === 1) rightForearm = forearm;
    const wrist = add(elbow, scale(forearm, FOREARM * h));
    const hand = add(wrist, scale(forearm, 0.7));
    hands[side] = upper(hand);
    if (spec.pauldrons) part(E(upper(add(shoulder, [side * 0.3, 0.5, 0])), [1.6 * limb, 1.15, 1.6 * limb]), FM.metal);
    part(C(upper(shoulder), upper(elbow), 1.15 * limb, 1.0 * limb), robe ? FM.garment : spec.body === 'armour' ? FM.metal : FM.garment);
    part(C(upper(elbow), upper(wrist), 1.0 * limb, 0.85 * limb), FM.glove);
    part(S(upper(hand), 0.85 * limb), FM.glove);
  }

  // ---------------------------------------------------------------- head
  const head = upper([0, HEAD_Y * h, HEAD_Z]);
  const at = (d: Vec3): Vec3 => [head[0] + d[0] * k, head[1] + d[1] * k, head[2] + d[2] * k];
  const shaded = spec.headwear === 'hood' || spec.headwear === 'cowl' || spec.headwear === 'brim' || spec.headwear === 'witch' || spec.headwear === 'beak';
  const skin = shaded ? FM.face : FM.faceLit;
  part(C(upper([0, 22 * h, 0]), upper([0, 24 * h, 0.1]), 0.85 * k, 0.8 * k), skin);
  part(S(head, HEAD_RADIUS * k), spec.headwear === 'beak' ? FM.mask : skin);
  if (spec.beard && (spec.beardLength ?? 1) > 1) {
    // A long beard: from the chin down over the chest, narrower at its end.
    const l = spec.beardLength!;
    part(C(at([0, -1.3, 1.05]), at([0, -1.3 - 1.9 * (l - 0.6), 1.2 + 0.25 * (l - 1)]), 1.3 * k, 0.75 * k), FM.hair);
  } else if (spec.beard) part(E(at([0, -1.45, 1.05]), [1.3 * k, 1.25 * k, 1.0 * k]), FM.hair);
  // A big round nose; tusks from the lower jaw (they show over a short beard).
  if (spec.nose) part(S(at([0, -0.5, 2.05]), 0.72 * k), skin);
  if (spec.tusks) {
    for (const side of [-1, 1]) part(C(at([side * 0.62, -1.55, 1.7]), at([side * 0.8, -0.65, 2.4]), 0.38 * k, 0.18 * k), FM.mask);
  }

  // The face opening of a hood, and the mantle on the shoulders under it.
  const opening = sphere(at([0, -0.3, 2.1]), 1.95 * k);
  const mantle = C(upper([0, head[1] - lift - 1.9 * k, -0.5]), upper([0, 21.6 * h, -0.3]), 2.0 * k, 3.1 * w);
  const hood = (radius: number, rise: number, back: number): Shape => cut(join(S(at([0, rise, -back]), radius * k), mantle), opening);

  const hair = (): void => {
    if (spec.hair === 'none') return;
    const cap = sphere(at([0, 0.35, -0.3]), (HEAD_RADIUS + 0.2) * k);
    const [hx, hy, hz] = head;
    // The hair is the part of the cap above the brow or behind the ears.
    const capSdf: Sdf = (x, y, z) => Math.max(cap(x, y, z), Math.min(hy + 0.4 * k - y, z - (hz - 0.4 * k)));
    part({ sdf: capSdf, bound: [hx, hy + 0.35 * k, hz - 0.3 * k, (HEAD_RADIUS + 0.3) * k] }, FM.hair);
    if (spec.hair === 'long') part(C(at([0, 0.3, -1.1]), at([0, -4.4, -1.5]), 1.85 * k, 1.5 * k), FM.hair);
    if (spec.hair === 'tail') part(C(at([0, 0.6, -1.8]), at([0, -2.6, -2.7]), 0.6 * k, 0.35 * k), FM.hair);
  };
  const brim = (radius: number, y: number): void => {
    part(E(at([0, y, -0.1]), [radius * k, 0.34 * k, radius * k]), FM.hat);
  };
  const collar = (): void => {
    if (spec.cloak !== 'none') part(cut(mantle, opening), FM.cloak);
  };

  switch (spec.headwear) {
    case 'hood':
      part(hood(2.4, 0.5, 0.5), FM.cloak);
      break;
    case 'cowl':
      // A deep monk's cowl that ends in a point behind the head.
      part(hood(2.75, 0.7, 0.8), FM.cloak);
      part(C(at([0, 1.5, -1.6]), at([0, 3.4, -3.4]), 1.0 * k, 0.3 * k), FM.cloak);
      break;
    case 'bare':
      collar();
      hair();
      break;
    case 'brim':
      collar();
      hair();
      brim(4.3, 1.3);
      part(C(at([0, 1.2, -0.1]), at([0, 3.0, -0.2]), 2.0 * k, 1.75 * k), FM.hat);
      part(E(at([0, 1.65, -0.1]), [2.05 * k, 0.35 * k, 2.05 * k]), FM.belt);
      break;
    case 'witch':
      collar();
      hair();
      brim(4.0, 1.4);
      part(C(at([0, 1.6, -0.1]), at([0, 4.5, -0.9]), 2.0 * k, 0.9 * k), FM.hat);
      part(C(at([0, 4.5, -0.9]), at([0, 7.0, -2.5]), 0.9 * k, 0.2 * k), FM.hat);
      break;
    case 'helm': {
      collar();
      const shell = S(at([0, 0.35, -0.1]), 2.2 * k);
      part(cut(shell, sphere(at([0, -0.75, 2.25]), 1.5 * k)), FM.metal);
      part(C(at([0, 0.9, 2.05]), at([0, -0.7, 2.2]), 0.3 * k, 0.25 * k), FM.metal);
      if (spec.cloak === 'none') part(C(upper([0, 23 * h, -0.2]), upper([0, 21.6 * h, -0.2]), 1.7 * k, 2.6 * w), FM.metal);
      break;
    }
    case 'beak':
      // A plague doctor: a hood under a wide brim, and a long beaked mask.
      part(hood(2.35, 0.4, 0.5), FM.cloak);
      brim(4.4, 1.5);
      part(C(at([0, 1.4, -0.1]), at([0, 3.1, -0.2]), 2.0 * k, 1.75 * k), FM.hat);
      part(C(at([0, -0.25, 1.6]), at([0, -1.7, 4.7]), 0.95 * k, 0.25 * k), FM.mask);
      break;
  }

  if (spec.tabard) part(E(upper([0, 17.6 * h, 1.15 * zs]), [1.7 * w, 3.3 * h, 0.65]), FM.cloak);
  if (spec.horns && spec.headwear === 'helm') {
    for (const side of [-1, 1]) part(C(at([side * 1.7, 1.0, -0.2]), at([side * 3.0, 2.6, -0.6]), 0.55 * k, 0.15 * k), FM.mask);
  }
  if (spec.circlet && (spec.headwear === 'bare' || spec.headwear === 'helm')) part(E(at([0, 0.95, -0.1]), [2.05 * k, 0.28 * k, 2.05 * k]), FM.metal);
  if (spec.ears && (spec.headwear === 'bare' || spec.headwear === 'brim' || spec.headwear === 'witch')) {
    // Pointed ears out of the sides of the head, up and back.
    // The tips reach past the outline of the head (up and back), or they would not show.
    const tip: Vec3 = spec.ears === 'long' ? [4.0, 2.2, -1.5] : [3.2, 1.25, -0.9];
    for (const side of [-1, 1]) part(C(at([side * 1.6, -0.2, 0]), at([side * tip[0], tip[1], tip[2]]), 0.62 * k, 0.14 * k), skin);
  }
  const openHead = spec.headwear === 'bare' || spec.headwear === 'hood' || spec.headwear === 'cowl';
  if (spec.horns && openHead) {
    for (const side of [-1, 1]) part(curve([at([side * 1.1, 1.2, 0.4]), at([side * 1.9, 2.6, 0.1]), at([side * 2.1, 3.5, -0.7])], [0.55 * k, 0.32 * k, 0.12 * k]), FM.mask);
  }
  if (spec.antlers && openHead) {
    for (const side of [-1, 1]) {
      // A beam up and out, and two tines from it.
      const base = at([side * 1.0, 1.5, -0.3]);
      const mid = at([side * 1.9, 3.1, -0.6]);
      part(curve([base, mid, at([side * 2.7, 4.5, -1.1])], [0.36 * k, 0.26 * k, 0.12 * k]), FM.wood);
      part(C(mid, at([side * 1.6, 4.2, 0.3]), 0.22 * k, 0.1 * k), FM.wood);
      part(C(at([side * 1.45, 2.3, -0.45]), at([side * 2.5, 2.9, 0.35]), 0.2 * k, 0.1 * k), FM.wood);
    }
  }
  if (spec.feather && spec.headwear === 'brim') part(C(at([1.8, 1.6, -0.5]), at([3.1, 5.0, -2.4]), 0.62 * k, 0.12 * k), FM.scarf);

  // ---------------------------------------------------------------- what it carries
  const right = hands[1]!;
  const weapon = action?.weapon;
  // In an attack the weapon is in the hand: a staff or a lantern moves there; a sword leaves its scabbard.
  const inHand = spec.item === 'staff' || spec.item === 'orbstaff' || spec.item === 'lantern' || spec.item === 'axe' || spec.item === 'mace';
  const carried = weapon && inHand ? 'none' : (spec.item ?? 'none');
  if (weapon?.kind === 'blade') {
    const f = rightForearm;
    // The guard across the blade, then the blade, thin to a point.
    const guard = add(right, scale(f, 0.55));
    const across = unit(-f[2], 0, f[0]);
    part(C(add(guard, scale(across, -0.9)), add(guard, scale(across, 0.9)), 0.28, 0.28), FM.metal);
    part(C(add(right, scale(f, 0.7)), add(right, scale(f, 0.7 + weapon.length)), weapon.width, 0.12), FM.metal);
  } else if (weapon?.kind === 'staff') {
    const d = unit(...weapon.dir);
    const foot = add(right, scale(d, -6 * h));
    const top = add(right, scale(d, 13 * h));
    part(C(foot, top, 0.42, 0.42), FM.wood);
    if (weapon.orb) part(S(add(top, scale(d, 1.0)), 1.0), FM.glass);
    else part(S(add(top, scale(d, 0.3)), 0.7), FM.wood);
  } else if (weapon?.kind === 'axe' || weapon?.kind === 'mace') {
    // A haft along the forearm; an axe has a wedge of a blade across it at the end, a mace a head.
    const f = rightForearm;
    const long = weapon.kind === 'axe';
    const end = add(right, scale(f, long ? 7.2 : 4.6));
    // Parts thinner than a radius of about 0.45 fall between the rays: a haft must be this thick.
    part(C(add(right, scale(f, -1.2)), end, 0.46, 0.44), FM.wood);
    if (long) {
      const across = unit(-f[2], 0.35, f[0]);
      const neck = add(end, scale(f, -0.6));
      part(C(neck, add(neck, scale(across, 2.1)), 1.35, 0.7), FM.metal);
      part(C(neck, add(neck, scale(across, -0.9)), 0.55, 0.2), FM.metal);
    } else {
      part(S(end, 1.35), FM.metal);
      part(S(add(end, scale(f, 1.1)), 0.5), FM.metal);
    }
  } else if (weapon?.kind === 'lantern') {
    const lantern = add(right, add(scale(rightForearm, 1.4), [0, -0.6, 0]));
    part(E(lantern, [0.75, 1.0, 0.75]), FM.glass);
    part(S(add(lantern, [0, 1.05, 0]), 0.5), FM.metal);
    part(E(add(lantern, [0, -1.0, 0]), [0.8, 0.25, 0.8]), FM.metal);
  }
  switch (carried) {
    case 'staff':
    case 'orbstaff': {
      // Held upright in the right hand, from the ground to above the head.
      const foot: Vec3 = [right[0] + 0.5, Math.max(0.5, right[1] - 11.5 * h), right[2] + 0.4];
      const top: Vec3 = [right[0] + 0.5, right[1] + 17 * h, right[2] - 0.3];
      part(C(foot, top, 0.42, 0.42), FM.wood);
      if (spec.item === 'orbstaff') part(S(add(top, [0, 1.0, 0]), 1.0), FM.glass);
      else part(S(add(top, [0, 0.3, 0]), 0.7), FM.wood);
      break;
    }
    case 'lantern': {
      // Hangs from the right hand: a cage of metal round lit glass.
      const lantern = add(right, [0.2, -1.9, 0.2]);
      part(E(lantern, [0.75, 1.0, 0.75]), FM.glass);
      part(S(add(lantern, [0, 1.05, 0]), 0.5), FM.metal);
      part(E(add(lantern, [0, -1.0, 0]), [0.8, 0.25, 0.8]), FM.metal);
      break;
    }
    case 'sword': {
      // In its scabbard on the left hip, the hilt forward (unless the sword is out, in an attack).
      const hip = up([-2.15 * w, 15.0 * h, 0.7 * zs]);
      part(C(hip, add(hip, [-0.5, -7.2 * h, -2.4]), 0.45, 0.38), FM.belt);
      if (weapon?.kind === 'blade') break;
      part(C(add(hip, [0.05, 0.2, 0.15]), add(hip, [0.25, 2.0 * h, 0.75]), 0.3, 0.3), FM.metal);
      part(E(add(hip, [0.05, 0.25, 0.15]), [0.9, 0.22, 0.35]), FM.metal);
      break;
    }
    case 'axe': {
      // A great axe upright in the right hand, from the knee to above the head, as a staff is
      // held; the blade near its top, out to the side.
      const foot = add(right, [0.5, -5.2 * h, 0.4]);
      const top = add(right, [0.5, 13.5 * h, -0.3]);
      part(C(foot, top, 0.46, 0.44), FM.wood);
      const head = add(top, [0, -1.8 * h, 0]);
      part(C(head, add(head, [2.3, -0.4, 0.15]), 1.55, 0.8), FM.metal);
      part(C(head, add(head, [-1.0, 0.1, 0]), 0.6, 0.2), FM.metal);
      break;
    }
    case 'mace': {
      // Upright in the right hand, the head at the height of the chest.
      const grip = add(right, [0.4, -1.2 * h, 0.35]);
      const head = add(right, [0.45, 5.4 * h, 0.15]);
      part(C(grip, head, 0.46, 0.46), FM.wood);
      part(S(head, 1.4), FM.metal);
      part(S(add(head, [0, 1.35, 0]), 0.5), FM.metal);
      break;
    }
    case 'dagger': {
      // In a short sheath at the front of the belt, on the right, the hilt up (unless it is out,
      // in an attack). At the hip it would hide behind the arm.
      const hip = up([1.3 * w, 15.2 * h, 1.75 * zs]);
      part(C(hip, add(hip, [0.7, -3.2 * h, 0.35]), 0.48, 0.34), FM.belt);
      if (weapon?.kind === 'blade') break;
      part(C(add(hip, [0, 0.2, 0]), add(hip, [-0.25, 1.45 * h, 0.1]), 0.4, 0.38), FM.metal);
      part(E(add(hip, [0, 0.25, 0]), [0.9, 0.3, 0.4]), FM.metal);
      break;
    }
    case 'bow': {
      const grip = hands[-1]!;
      const span = 6.6 * h;
      if (weapon?.kind === 'bow') {
        // Held out in front: the curve of wood bends away from the archer, and the string goes
        // back to the right hand as far as it is drawn, with an arrow on it.
        const bow: Vec3[] = [-1, -0.5, 0, 0.5, 1].map((t) => add(grip, [0.25, span * 0.85 * t, 1.6 * (1 - t * t)]));
        part(curve(bow, [0.38, 0.46, 0.55, 0.46, 0.38]), FM.wood);
        const nock = weapon.draw > 0 ? add(right, [0, 0, 0.3]) : add(grip, [0.25, 0, -0.2]);
        part(C(bow[0]!, nock, 0.24, 0.24), FM.mask);
        part(C(nock, bow[4]!, 0.24, 0.24), FM.mask);
        if (weapon.draw > 0) {
          const tip = add(grip, [0.25, 0.1, 3.4]);
          part(C(nock, tip, 0.3, 0.3), FM.wood);
          part(C(tip, add(tip, [0, 0, 0.9]), 0.55, 0.15), FM.metal);
        }
        break;
      }
      // In the left hand: a tall curve of wood, its middle out to the side, and its string.
      const points: Vec3[] = [-1, -0.5, 0, 0.5, 1].map((t) => add(grip, [-0.3 - 1.7 * (1 - t * t), span * t, 0.25]));
      part(curve(points, [0.38, 0.46, 0.55, 0.46, 0.38]), FM.wood);
      part(C(points[0]!, points[4]!, 0.24, 0.24), FM.mask);
      break;
    }
    case 'none':
      break;
  }

  if (spec.shield) {
    // On the left forearm, its face out and to the front, a metal boss in the middle.
    const hand = hands[-1]!;
    const n = unit(-0.6, 0.12, 0.8);
    const centre = add(hand, [-0.75, 1.6 * h, 0.75]);
    const radius = 2.2 + 0.5 * w;
    part(disc(centre, n, radius, 0.45), FM.cloak);
    part(S(add(centre, scale(n, 0.45)), 0.6), FM.metal);
  }

  if (spec.quiver) {
    // On the back, from the right hip to above the left shoulder, with the fletching out of it.
    const bottom = upper([1.0 * w, 15.2 * h, -1.9 * zs]);
    const top = upper([-1.4 * w, 23.2 * h, -2.2 * zs]);
    part(C(bottom, top, 0.75, 0.85), FM.belt);
    part(E(add(top, [-0.35, 0.9, -0.1]), [0.75, 0.75, 0.6]), FM.scarf);
  }

  if (spec.scarf) {
    part(E(upper([0, 22.3 * h, 0.15]), [1.95 * w, 0.8, 1.7 * zs]), FM.scarf);
    part(C(upper([0.8 * w, 21.8 * h, 1.45 * zs]), upper([1.15 * w, 18.6 * h, 1.95 * zs]), 0.55, 0.45), FM.scarf);
  }

  // ---------------------------------------------------------------- cloak
  // The back half of a cone from the shoulders down, with a ragged hem and vertical folds. It
  // trails and sways when the figure walks. The cut face is the dark lining.
  if (spec.cloak !== 'none') {
    const long = spec.cloak === 'long';
    const trail = (long ? 0.9 : 0.5) * amount;
    const sway = (long ? 0.5 : 0.3) * amount * Math.sin(phase);
    const hemY = (long ? 7.9 : 13.2) * h;
    const top = upper([0, 22.2 * h, -0.8]);
    const bottom = up([sway, hemY - 0.1, (long ? -1.8 : -1.5) * zs - trail]);
    const smooth = C(top, bottom, 2.9 * w, (long ? 4.2 : 3.5) * w);
    const cone: Sdf = (x, y, z) =>
      smooth.sdf(x, y, z) + 0.28 * Math.sin(Math.atan2(x, -(z + 1)) * 6) * Math.min(1, Math.max(0, (22 * h + lift - y) / 12));
    const front: Sdf = (_x, _y, z) => z - 0.15;
    const hem: Sdf = (x, y, z) => hemY + lift + 1.5 * noise3(x * 0.8, 0, z * 0.8, 7) - y;
    part(
      { sdf: intersect(cone, front, hem), bound: [smooth.bound[0], smooth.bound[1], smooth.bound[2], smooth.bound[3] + 0.3] },
      (x, y, z) => (front(x, y, z) >= Math.max(cone(x, y, z), hem(x, y, z)) - 0.05 ? FM.lining : FM.cloak),
    );
  }

  return parts;
}

/**
 * Turns a figure round the x axis through `pivot` by `angle` (radians): with a positive angle the
 * top goes forward (+z) and down, a forward roll. For the roll of a dodge, with a tucked pose.
 */
export function tumble(parts: readonly Part[], angle: number, pivot: Vec3, drop = 0): Part[] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const [, py, pz] = pivot;
  // A point of the turned figure comes from this point of the figure (`drop` moves the turned figure down).
  const back = (y0: number, z: number): [number, number] => {
    const y = y0 + drop;
    const dy = y - py;
    const dz = z - pz;
    return [py + dy * cos + dz * sin, pz - dy * sin + dz * cos];
  };
  return parts.map((p) => {
    const sdf: Sdf = (x, y, z) => {
      const [by, bz] = back(y, z);
      return p.sdf(x, by, bz);
    };
    const material = p.material;
    const turned: Part['material'] =
      typeof material === 'number'
        ? material
        : (x, y, z, nx, ny, nz) => {
            const [by, bz] = back(y, z);
            return material(x, by, bz, nx, ny * cos + nz * sin, -ny * sin + nz * cos);
          };
    if (!p.bound) return { sdf, material: turned };
    const [bx, by, bz, br] = p.bound;
    const dy = by - py;
    const dz = bz - pz;
    return { sdf, material: turned, bound: [bx, py + dy * cos - dz * sin - drop, pz + dy * sin + dz * cos, br] as const };
  });
}
