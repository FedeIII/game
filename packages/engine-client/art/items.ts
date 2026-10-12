/**
 * Item icons, as SDF models (pitch projection, like the small props): the pack panel shows them
 * at 2x, on a dark slot. Frame names are `item/<kind>` for the kinds of ITEM_KINDS in the engine,
 * and `item/coin` for the coins of the purse. Each icon is 16 x 16, the model on the ground in
 * the middle, as large as the frame lets it be.
 *
 * The same models, smaller and with a shadow, are the items on the ground (`pile/<kind>`, anchor
 * on the point where the item lies), and `pile/glint` is the small spark that shows a pile in the
 * dark (white: the game tints it). `pile/<kind>/bare` is the same item without its shadow, and
 * `pile/shadow` the shadow alone: an item in the air (a drop that falls), and the faint shine of a
 * pile.
 *
 * The icons have materials of their own, a little lighter than the world's: a slot has no torch
 * to light it. They keep the dark, desaturated colours of the rest of the art. On the ground the
 * lighter colours help a player to find what fell.
 */
import { Image } from './image.ts';
import { cropToContent, ramp, shadowEllipse } from './raster.ts';
import { box, cylinder, displace, ellipsoid, intersect, renderModel, roundCone, sphere, subtract, union, type Material, type MaterialOf, type Part, type Sdf, type Vec3 } from './sdf.ts';
import { hash } from './materials.ts';
import type { Frame } from './sprites.ts';

const SIZE = 16;

const I = {
  gold: 0,
  silver: 1,
  pewter: 2,
  bone: 3,
  horn: 4,
  root: 5,
  wax: 6,
  wick: 7,
  leaf: 8,
  string: 9,
  garnet: 10,
  red: 11,
  green: 12,
  amber: 13,
  glass: 14,
  leather: 15,
  steel: 16,
  iron: 17,
  wood: 18,
  arcane: 19,
  dark: 20,
  cloth: 21,
} as const;
const ICON_MATERIALS: Material[] = [
  { ramp: ramp('#3a2a0c', '#6a4e16', '#9a7624', '#c49c3a', '#e0c060', '#f4dc8a'), bias: 0.15 },
  { ramp: ramp('#2a2e34', '#4e555e', '#78808a', '#a2aab4', '#cdd4dc'), bias: 0.2 },
  { ramp: ramp('#22252a', '#3c4148', '#5a6068', '#7c838c', '#9ea5ae'), bias: 0.15 },
  { ramp: ramp('#4a4436', '#6c6450', '#908770', '#b4aa8e', '#d4cbad'), bias: 0.15 },
  { ramp: ramp('#1a1210', '#2e201c', '#46302a', '#5e423a'), bias: 0.1 },
  { ramp: ramp('#1c140e', '#2e2218', '#423224', '#56422f') },
  { ramp: ramp('#5a5040', '#7e735c', '#a2967a', '#c4b99a'), bias: 0.15 },
  { ramp: ramp('#0a0806', '#16100c', '#22180f') },
  { ramp: ramp('#14200e', '#223416', '#344c20', '#4a662e', '#64843e'), bias: 0.15 },
  { ramp: ramp('#3a3324', '#5a503a', '#7a6e52', '#9a8d6c'), bias: 0.1 },
  { ramp: ramp('#3a0a10', '#6a1820', '#a02a30', '#d0504a'), bias: 0.4 },
  // The brews in their bottles: they glow a little, as a lantern's glass.
  { ramp: ramp('#3a0a0e', '#701820', '#b02a2e', '#e8584a'), bias: 0.35 },
  { ramp: ramp('#0e2a12', '#1c5022', '#348a3a', '#6cc060'), bias: 0.35 },
  { ramp: ramp('#3a2408', '#6e4612', '#b07420', '#e8b048'), bias: 0.35 },
  { ramp: ramp('#2a3036', '#4a545c', '#76828c', '#a8b4bc'), bias: 0.2 },
  // The equipment (gear.ts): leather, the steel of blades and mail, dark iron, wood, the glow of an
  // arcane orb, and the dark of the gaps between plates.
  { ramp: ramp('#24160e', '#3c2618', '#583824', '#764e32', '#906440'), bias: 0.1 },
  { ramp: ramp('#262b31', '#454d56', '#6c7680', '#98a2ac', '#c4ccd4'), bias: 0.2 },
  { ramp: ramp('#18191c', '#2a2c30', '#3e4146', '#565a60'), bias: 0.1 },
  { ramp: ramp('#3a2814', '#5a4024', '#7a5a36', '#9a7648', '#b48e5a'), bias: 0.15 },
  { ramp: ramp('#14204a', '#24387a', '#3e5cb0', '#7a9ae0'), bias: 0.4 },
  { ramp: ramp('#0c0a0a', '#181414', '#241e1c') },
  // The grey cloth of an elven cloak and boots.
  { ramp: ramp('#1c2024', '#30363c', '#4a525a', '#66707a', '#8892a0'), bias: 0.15 },
];

/** A ring of radius `major` round the axis z through `c`, with a tube of radius `minor`: it stands facing the viewer. */
function torusZ(c: Vec3, major: number, minor: number): Sdf {
  const [cx, cy, cz] = c;
  return (x, y, z) => Math.hypot(Math.hypot(x - cx, y - cy) - major, z - cz) - minor;
}

/** A curved, tapering thing (a horn, a tusk): round cones through the points, from `r0` to `r1`. */
function curve(points: readonly Vec3[], r0: number, r1: number): Sdf {
  const parts: Sdf[] = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const t0 = i / (points.length - 1);
    const t1 = (i + 1) / (points.length - 1);
    parts.push(roundCone(points[i]!, points[i + 1]!, r0 + (r1 - r0) * t0, r0 + (r1 - r0) * t1));
  }
  return union(...parts);
}

function icon(kind: string, parts: Part[]): Frame {
  const image = renderModel(parts, ICON_MATERIALS, { width: SIZE, height: SIZE, pivotX: 8, pivotY: 13, yaw: 0, stepScale: 0.7 });
  return { name: `item/${kind}`, image };
}

/** An item on the ground is this much smaller than its icon (about 11 px tall: a third of a person). */
const PILE_SCALE = 0.7;

/** The parts of a model at `k` times their size. */
function scaled(parts: readonly Part[], k: number): Part[] {
  return parts.map((part) => {
    const { sdf, material, bound } = part;
    const scaledMaterial: MaterialOf = typeof material === 'number' ? material : (x, y, z, nx, ny, nz) => material(x / k, y / k, z / k, nx, ny, nz);
    return {
      sdf: (x: number, y: number, z: number) => sdf(x / k, y / k, z / k) * k,
      material: scaledMaterial,
      ...(bound ? { bound: [bound[0] * k, bound[1] * k, bound[2] * k, bound[3] * k] as const } : {}),
    };
  });
}

/** The frame of an item on the ground, and its pivot: the point where it lies. */
const PILE_FRAME = { width: 14, height: 14, pivotX: 7, pivotY: 11 } as const;
/** The soft shadow under an item on the ground. */
const PILE_SHADOW = { radiusX: 4, radiusY: 1.7, alpha: 0x70 } as const;

/**
 * An item on the ground: its model, small, with a soft shadow (`pile/<kind>`), and without it
 * (`pile/<kind>/bare`); the anchor of both is the point where it lies.
 */
function pile(kind: string, parts: Part[]): Frame[] {
  const { width, height, pivotX, pivotY } = PILE_FRAME;
  const render = (shadow: boolean): Image =>
    renderModel(scaled(parts, PILE_SCALE), ICON_MATERIALS, { width, height, pivotX, pivotY, yaw: 0, stepScale: 0.6, ...(shadow ? { shadow: PILE_SHADOW } : {}) });
  const shadowed = cropToContent(render(true), pivotX, pivotY);
  const bare = cropToContent(render(false), pivotX, pivotY);
  return [
    { name: `pile/${kind}`, image: shadowed.image, anchor: shadowed.anchor },
    { name: `pile/${kind}/bare`, image: bare.image, anchor: bare.anchor },
  ];
}

/** The shadow of an item on the ground, alone (`pile/shadow`): under an item in the air. */
function pileShadow(): Frame {
  const { width, height, pivotX, pivotY } = PILE_FRAME;
  const image = new Image(width, height);
  shadowEllipse(image, pivotX, pivotY, PILE_SHADOW.radiusX, PILE_SHADOW.radiusY, PILE_SHADOW.alpha);
  const cropped = cropToContent(image, pivotX, pivotY);
  return { name: 'pile/shadow', image: cropped.image, anchor: cropped.anchor };
}

/** A spark of 5 x 5 pixels: a bright centre and four short, fainter rays. */
function glint(): Image {
  const image = new Image(5, 5);
  image.set(2, 2, 0xffffffff);
  for (const [x, y] of [[1, 2], [3, 2], [2, 1], [2, 3]] as const) image.set(x, y, 0xffffffc0);
  for (const [x, y] of [[0, 2], [4, 2], [2, 0], [2, 4]] as const) image.set(x, y, 0xffffff50);
  return image;
}

/** A stack of coins, and one beside it. */
function coin(): Part[] {
  const stack = union(
    cylinder([-1.8, 0.6, 0], 'y', 3.6, 1.2),
    cylinder([-1.4, 1.8, 0.3], 'y', 3.6, 1.2),
    cylinder([-1.9, 3, -0.2], 'y', 3.6, 1.2),
    cylinder([-1.5, 4.2, 0.1], 'y', 3.6, 1.2),
  );
  return [{ sdf: union(stack, cylinder([4, 0.6, 2.4], 'y', 3, 1.2)), material: I.gold }];
}

/** An imp's horn: dark at the root, pale at the tip, curved up. */
function impHorn(): Part[] {
  const points: Vec3[] = [
    [-6, 2, 0],
    [-2.5, 2.6, 0],
    [1, 4.6, 0],
    [3.6, 8, 0],
    [4.6, 12, 0],
  ];
  return [{ sdf: curve(points, 2.2, 0.45), material: (x) => (x < -1 ? I.horn : I.bone) }];
}

/** A brute's tusk: big, yellowed, with a rough root. */
function bruteTusk(): Part[] {
  const points: Vec3[] = [
    [-6.2, 2.6, 0],
    [-2.4, 2.9, 0],
    [1.6, 4.6, 0],
    [4.4, 8, 0],
    [5.4, 12, 0],
  ];
  return [{ sdf: curve(points, 2.8, 0.55), material: (x) => (x < -4.4 ? I.root : I.bone) }];
}

/** A stub of a candle on a small dish, not lit. */
function candle(): Part[] {
  return [
    { sdf: cylinder([0, 0.5, 0], 'y', 4.6, 1), material: I.pewter },
    { sdf: cylinder([0, 4, 0], 'y', 2.4, 6.2), material: I.wax },
    { sdf: roundCone([0, 7, 0], [0.3, 8.6, 0], 0.45, 0.3), material: I.wick },
  ];
}

/** A silver ring with a garnet, standing. */
function ring(): Part[] {
  return [
    { sdf: torusZ([0, 5.4, 0], 3.7, 1.5), material: I.silver },
    { sdf: ellipsoid([0, 10.2, 0.6], [1.7, 1.4, 1.4]), material: I.garnet },
  ];
}

/** A pewter cup with a handle. */
function cup(): Part[] {
  const body = subtract(cylinder([-1.2, 4.6, 0], 'y', 4, 9.2), cylinder([-1.2, 6, 0], 'y', 3, 9.2));
  const handle = subtract(torusZ([3, 4.8, 0], 2.4, 0.8), cylinder([0.4, 4.8, 0], 'y', 2.6, 12));
  return [{ sdf: union(body, handle), material: I.pewter }];
}

/** A bundle of herbs: stems tied together, leaves at the top. */
function herbs(): Part[] {
  const stems = union(
    roundCone([0, 0.8, 0], [-4.6, 10, 0], 0.7, 0.5),
    roundCone([0, 0.8, 0], [0, 11.4, 0.5], 0.7, 0.5),
    roundCone([0, 0.8, 0], [4.6, 10, -0.4], 0.7, 0.5),
  );
  const leaves = union(
    ellipsoid([-4.8, 10.2, 0], [2, 1.4, 1.2]),
    ellipsoid([-2.4, 11.8, 0.3], [1.5, 2, 1.2]),
    ellipsoid([0.2, 12.2, 0.4], [1.6, 1.8, 1.2]),
    ellipsoid([2.8, 11.6, 0], [1.6, 1.8, 1.2]),
    ellipsoid([4.9, 10, -0.3], [2, 1.4, 1.2]),
  );
  return [
    { sdf: stems, material: I.leaf },
    { sdf: leaves, material: I.leaf },
    { sdf: cylinder([0, 3.6, 0], 'y', 1.7, 1.8), material: I.string },
  ];
}

/** A small bottle with a long neck and a cork, full of a brew of `liquid`: round, or tall (`tall`). */
function bottle(liquid: number, tall = false): Part[] {
  const height = tall ? 10 : 7.2;
  const body = tall ? ellipsoid([0, 5, 0], [3, 5, 3]) : sphere([0, 3.6, 0], 3.6);
  return [
    { sdf: body, material: liquid },
    { sdf: cylinder([0, height + 1.6, 0], 'y', 1.2, 3.6), material: I.glass },
    { sdf: cylinder([0, height + 3.8, 0], 'y', 1.4, 1.4), material: I.root },
  ];
}

/** A blade from `a` (the hilt end) to `b` (the tip), flat in z: wide `width`, tapering at the tip. */
function blade(a: Vec3, b: Vec3, width: number): Sdf {
  const flat = 0.6;
  const [ax, ay] = a;
  const [bx, by] = b;
  const length = Math.hypot(bx - ax, by - ay);
  const ux = (bx - ax) / length;
  const uy = (by - ay) / length;
  return (x, y, z) => {
    const px = x - ax;
    const py = y - ay;
    const along = px * ux + py * uy;
    const across = Math.abs(-px * uy + py * ux);
    const t = Math.min(1, Math.max(0, along / length));
    // Full width up to 70% of the length, then down to a point.
    const half = (width / 2) * (t < 0.7 ? 1 : (1 - t) / 0.3);
    const outside = Math.max(-along, along - length, across - half);
    return Math.max(outside, Math.abs(z) - flat);
  };
}

/** A sword: the blade from the guard up to the tip, a cross guard, a grip and a pommel. Long, short or thin. */
function sword(length: number, width: number, swept = false): Part[] {
  // Along a diagonal from the bottom left (the pommel) to the top right (the tip).
  const dir: Vec3 = [0.66, 0.75, 0];
  const at = (t: number, side = 0): Vec3 => [-6 + dir[0] * t - dir[1] * side, 0.6 + dir[1] * t + dir[0] * side, 0];
  const guard = 3.4;
  const parts: Part[] = [
    { sdf: blade(at(guard), at(guard + length), width), material: I.silver },
    { sdf: roundCone(at(guard, -2.6), at(guard, 2.6), 0.75, 0.75), material: I.gold },
    { sdf: roundCone(at(0.8), at(guard), 0.8, 0.8), material: I.leather },
    { sdf: sphere(at(0.4), 1.1), material: I.gold },
  ];
  if (swept) parts.push({ sdf: torusZ(at(guard - 0.5), 1.7, 0.4), material: I.gold });
  return parts;
}

/** A suit of armour, standing: a body with shoulders and a neck, in `material` (a function for a pattern). */
function cuirass(material: MaterialOf, extra: Part[] = []): Part[] {
  const body = union(box([-4.2, 1.2, -1.6], [4.2, 9.6, 1.6], 1.4), sphere([-3.8, 9.6, 0], 2), sphere([3.8, 9.6, 0], 2));
  const shape = subtract(body, union(ellipsoid([0, 11.4, 0], [1.9, 1.7, 3]), ellipsoid([-6.4, 6.6, 0], [1.6, 2.6, 3]), ellipsoid([6.4, 6.6, 0], [1.6, 2.6, 3])));
  return [{ sdf: shape, material }, ...extra];
}

/** The rivets of a studded leather: small spheres of iron in rows on the front of the body. */
function studs(): Part[] {
  const rivets: Sdf[] = [];
  for (const y of [2.4, 4.8, 7.2]) for (const x of [-2.8, -0.9, 0.9, 2.8]) rivets.push(sphere([x, y, 1.5], 0.55));
  return [{ sdf: union(...rivets), material: I.steel }];
}

/** A greataxe: a long haft and a broad head of two crescents at its top. */
function greataxe(): Part[] {
  const head = subtract(
    intersect(ellipsoid([1.6, 9.4, 0], [5, 3.6, 0.5]), box([-6, 5, -1], [6.5, 14, 1])),
    union(ellipsoid([1.6, 13.6, 0], [2.4, 1.8, 2]), ellipsoid([1.6, 5.2, 0], [2.4, 1.8, 2])),
  );
  return [
    { sdf: roundCone([-4.6, 0.6, 0], [2, 12.8, 0], 0.9, 0.8), material: I.wood },
    { sdf: head, material: I.silver },
    { sdf: sphere([1.6, 9.4, 0], 1), material: I.iron },
  ];
}

/** A glaive: a long shaft from the bottom left to the top right, and a broad curved blade at its end. */
function glaive(): Part[] {
  const head = subtract(ellipsoid([4.4, 11.2, 0], [2.4, 3.4, 0.5]), ellipsoid([6.2, 12.4, 0], [1.6, 2.6, 2]));
  return [
    { sdf: roundCone([-6, 0.4, 0], [3.4, 9.6, 0], 0.75, 0.7), material: I.wood },
    { sdf: head, material: I.silver },
    { sdf: sphere([3.3, 9.4, 0], 0.8), material: I.iron },
  ];
}

/** A mace: a haft, and a head with flanges. */
function mace(): Part[] {
  const head = union(
    sphere([2.6, 9.8, 0], 2.5),
    ...[0, 1, 2, 3, 4, 5].map((i) => {
      const a = (i / 6) * Math.PI * 2;
      return ellipsoid([2.6 + Math.cos(a) * 2.4, 9.8 + Math.sin(a) * 2.4, 0], [1.2, 1.2, 0.9]);
    }),
  );
  return [
    { sdf: roundCone([-4.8, 0.6, 0], [2, 8.4, 0], 0.85, 0.8), material: I.wood },
    { sdf: sphere([-5, 0.4, 0], 1), material: I.iron },
    { sdf: head, material: I.steel },
  ];
}

/** A longbow: a tall curve of wood, a grip of leather, and its string. */
function longbow(): Part[] {
  const limb: Vec3[] = [
    [-1, 0.4, 0],
    [1.4, 2.6, 0],
    [2.6, 6.2, 0],
    [1.4, 9.8, 0],
    [-1, 12.4, 0],
  ];
  return [
    { sdf: curve(limb, 0.85, 0.7), material: I.wood },
    { sdf: roundCone([2.4, 5, 0], [2.4, 7.4, 0], 1, 1), material: I.leather },
    { sdf: roundCone([-1, 0.4, 0], [-1, 12.4, 0], 0.3, 0.3), material: I.bone },
  ];
}

/** A staff: a long shaft of wood with its head (an orb of `orb`, held by prongs) at the top. */
function staff(orb: number, gnarled: boolean): Part[] {
  const shaft: Vec3[] = gnarled
    ? [
        [-3.4, 0.4, 0],
        [-2.2, 4, 0],
        [-2.6, 7.4, 0],
        [-1.2, 10.4, 0],
      ]
    : [
        [-3.2, 0.4, 0],
        [-1.2, 10.6, 0],
      ];
  const top: Vec3 = gnarled ? [-0.6, 12.2, 0] : [-0.8, 12.4, 0];
  const parts: Part[] = [
    { sdf: curve(shaft, 0.95, 0.85), material: I.wood },
    { sdf: sphere(top, 1.9), material: orb },
  ];
  if (gnarled) parts.push({ sdf: union(ellipsoid([1.2, 11.6, 0], [1.6, 0.8, 0.6]), ellipsoid([-2.4, 12.6, 0], [1.4, 0.7, 0.6])), material: I.leaf });
  else parts.push({ sdf: union(roundCone([-1.2, 10.6, 0], [-2.6, 12.6, 0], 0.35, 0.25), roundCone([-1.2, 10.6, 0], [0.8, 12.8, 0], 0.35, 0.25)), material: I.gold });
  return parts;
}

/** A round shield: wood boards in an iron rim, an iron boss in the middle; it faces the viewer. */
function shield(): Part[] {
  const c: Vec3 = [0, 6.6, 0];
  return [
    { sdf: cylinder(c, 'z', 5.4, 1.2), material: (x) => (Math.floor((x + 6) / 2.2) % 2 === 0 ? I.wood : I.leather) },
    { sdf: torusZ(c, 5.4, 0.7), material: I.iron },
    { sdf: sphere([0, 6.6, 0.8], 1.5), material: I.steel },
  ];
}

/** An amulet: a cord in a loop, and a charm of bone with an amber stone. */
function amulet(): Part[] {
  return [
    { sdf: subtract(torusZ([0, 8.2, 0], 3.6, 0.35), box([-5, 3.5, -2], [5, 6.4, 2])), material: I.string },
    { sdf: cylinder([0, 4.2, 0], 'z', 2.4, 0.9), material: I.bone },
    { sdf: sphere([0, 4.2, 0.6], 1.2), material: I.amber },
  ];
}

/** A ring of radius `major` round the axis y through `c` (it lies flat), with a tube of radius `minor`. */
function torusY(c: Vec3, major: number, minor: number): Sdf {
  const [cx, cy, cz] = c;
  return (x, y, z) => Math.hypot(Math.hypot(x - cx, z - cz) - major, y - cy) - minor;
}

/** A longsword +1: the longsword, with a blue stone in its pommel and its guard. */
function magicSword(): Part[] {
  const parts = sword(12, 2.4);
  return [parts[0]!, { ...parts[1]!, material: I.arcane }, parts[2]!, { ...parts[3]!, material: I.arcane }];
}

/** A cloak, folded over a hook: grey cloth that widens to its hem, and a gold clasp at the neck. */
function cloak(): Part[] {
  const cloth: Sdf = (x, y, z) => {
    // A tall shape that widens from the neck (y 12) to the hem (y 1), thin in z, with soft folds.
    const t = Math.min(1, Math.max(0, (12 - y) / 11));
    const half = 1.6 + 4 * t + 0.35 * Math.sin(x * 2.2);
    return Math.max(Math.abs(x) - half, Math.abs(z) - 1.1 - 0.4 * Math.sin(x * 1.6 + 1), y - 12, 0.8 - y);
  };
  return [
    { sdf: cloth, material: I.cloth },
    { sdf: sphere([0, 11.4, 1.2], 1.1), material: I.gold },
  ];
}

/** A ring with a stone of `stone`, standing. */
function stoneRing(stone: number): Part[] {
  return [
    { sdf: torusZ([0, 5.4, 0], 3.7, 1.5), material: I.silver },
    { sdf: ellipsoid([0, 10.2, 0.6], [1.7, 1.4, 1.4]), material: stone },
  ];
}

/** A pair of cuffs: leather with silver bands, side by side. */
function bracers(): Part[] {
  const cuff = (x: number): Part[] => [
    { sdf: subtract(cylinder([x, 5.6, 0], 'y', 2.2, 9), cylinder([x, 5.6, 0], 'y', 1.4, 10)), material: I.leather },
    { sdf: union(torusY([x, 2.2, 0], 2.25, 0.4), torusY([x, 9, 0], 2.25, 0.4)), material: I.silver },
  ];
  return [...cuff(-2.8), ...cuff(2.8)];
}

/** A big gauntlet: a cuff, the back of the hand and four thick fingers of iron. */
function gauntlet(): Part[] {
  const fingers = union(...[-2.1, -0.7, 0.7, 2.1].map((x) => roundCone([x, 7.4, 0], [x * 1.1, 11.6, 0.4], 0.75, 0.65)));
  return [
    { sdf: cylinder([0, 2.4, 0], 'y', 3, 4.6), material: I.leather },
    { sdf: box([-3, 4.4, -1.4], [3, 8, 1.4], 1), material: I.iron },
    { sdf: fingers, material: I.iron },
    { sdf: roundCone([3, 5.6, 0], [5, 8.4, 0.4], 0.8, 0.7), material: I.iron },
  ];
}

/** A headband: a band of gold that stands as on a head, and a blue gem on its front. */
function headband(): Part[] {
  return [
    { sdf: (x, y, z) => Math.max(Math.abs(Math.hypot(x / 5.2, z / 3.6) * 3.6 - 3.6) - 0.6, Math.abs(y - 5) - 1), material: I.gold },
    { sdf: ellipsoid([0, 5.4, 3.8], [1.5, 1.9, 1]), material: I.arcane },
  ];
}

/** A broad belt that lies in a loop, with a big gold buckle in front. */
function belt(): Part[] {
  const loop = subtract((x, y, z) => Math.max(Math.hypot(x / 5.6, z / 4.4) * 4.4 - 4.4, Math.abs(y - 3) - 1.4), (x, y, z) => Math.hypot(x / 4.6, z / 3.4) * 3.4 - 3.4);
  return [
    { sdf: loop, material: I.leather },
    { sdf: box([-1.6, 1.2, 3.6], [1.6, 4.8, 4.8], 0.4), material: I.gold },
  ];
}

/** A pair of soft boots of grey leather, side by side, the toes to the right. */
function boots(): Part[] {
  const boot = (x: number, z: number): Sdf => union(cylinder([x, 6.6, z], 'y', 1.5, 8.6), ellipsoid([x + 1.6, 1.6, z], [2.8, 1.6, 1.6]));
  return [{ sdf: union(boot(-3.4, -0.6), boot(0.8, 0.6)), material: I.cloth }];
}

/** A lever of dark iron (the smith's, for the merchant's cart): a straight bar with a hook and a split claw at the top. */
function crowbar(): Part[] {
  return [
    { sdf: roundCone([-5.6, 0.6, 0], [3.2, 10, 0], 0.7, 0.65), material: I.iron },
    { sdf: union(roundCone([3.2, 10, 0], [5.4, 11, 0], 0.65, 0.6), roundCone([5.4, 11, 0], [6.6, 9.4, 0], 0.6, 0.35)), material: I.iron },
    { sdf: roundCone([-5.6, 0.6, 0], [-6.6, -0.2, 0], 0.7, 0.3), material: I.steel },
  ];
}

/** A sack of lentils (the farmer of Whitegrove's): a fat bag of coarse cloth, its neck tied with string, a few lentils spilled at its foot. */
function lentils(): Part[] {
  const bag = displace(ellipsoid([0, 4.4, 0], [5, 4.6, 4]), 0.35, 1.4, 83);
  const neck = roundCone([0.3, 8.2, 0], [0.8, 10.8, 0], 1.9, 1.2);
  const spill = union(sphere([4.6, 0.6, 1.4], 0.65), sphere([5.8, 0.5, 0.4], 0.6), sphere([4, 0.5, 2.6], 0.55));
  return [
    { sdf: union(bag, neck), material: I.leather },
    { sdf: cylinder([0.5, 8.7, 0], 'y', 2.05, 0.9), material: I.string },
    { sdf: spill, material: I.amber },
  ];
}

/** A badger fur, rolled and tied: grey with the black and white stripes of the head at one end. */
function badgerFur(): Part[] {
  const roll = roundCone([-5, 3.2, 0], [4.6, 3.2, 0], 3.1, 2.8);
  const stripe = (x: number, y: number, z: number) => (x > 2.4 ? (Math.abs(z) < 0.9 ? I.bone : I.dark) : Math.abs(((x + 20) % 3) - 1.5) < 0.25 ? I.dark : I.pewter);
  return [
    { sdf: roll, material: stripe },
    { sdf: union(roundCone([-1.2, 3.2, -3.2], [-1.2, 3.2, 3.2], 0.45, 0.45), roundCone([2, 3.2, -3], [2, 3.2, 3], 0.45, 0.45)), material: I.leather },
  ];
}

/** A nugget of mithril: a small lump of pale silver with a cold blue gleam. */
function mithril(): Part[] {
  return [
    { sdf: displace(ellipsoid([0, 3, 0], [4.2, 3, 3.4]), 0.9, 1.1, 61), material: (x, y, z) => (hash(Math.floor(x * 2), Math.floor(y * 2), Math.floor(z * 2)) < 0.22 ? I.arcane : I.silver) },
  ];
}

/** The permit of Silverspring: a roll of parchment tied with a cord, and a seal of blue wax. */
function permit(): Part[] {
  return [
    { sdf: roundCone([-5.4, 2.2, 0], [5.4, 2.2, 0], 2.1, 2.1), material: I.bone },
    { sdf: roundCone([0, 2.2, -2.3], [0, 2.2, 2.3], 0.4, 0.4), material: I.string },
    { sdf: ellipsoid([0, 2.4, 2.4], [1.6, 1.6, 0.6]), material: I.arcane },
  ];
}

/** The wave stone of the Wren homestead (story phase 7): a flat grey stone, carved with waves that hold a cold blue light. */
function waveStone(): Part[] {
  const groove = (x: number, y: number) => Math.abs((((y + Math.sin(x * 0.9) * 0.7) % 1.7) + 1.7) % 1.7 - 0.85) < 0.24;
  return [{ sdf: displace(ellipsoid([0, 3, 0], [5, 3.4, 2.2]), 0.35, 0.8, 23), material: (x, y, z) => (z > 1.2 && groove(x, y) ? I.arcane : I.pewter) }];
}

/** The Tear of Tigris (story phase 9): a drop of clear blue crystal in a cage of silver, on a fine chain. */
function tear(): Part[] {
  return [
    { sdf: subtract(torusZ([0, 8.6, 0], 3.4, 0.3), box([-5, 4.5, -2], [5, 6.8, 2])), material: I.silver },
    { sdf: union(sphere([0, 3.4, 0.2], 1.9), roundCone([0, 3.4, 0.2], [0, 6.6, 0.2], 1.9, 0.25)), material: I.arcane },
    { sdf: subtract(roundCone([0, 3.4, 0.2], [0, 6.6, 0.2], 2.15, 0.45), roundCone([0, 3.4, 0.2], [0, 6.6, 0.2], 1.9, 0.25)), material: (_x, y) => (Math.abs(((y * 1.4) % 1.4) - 0.7) < 0.25 ? I.silver : I.glass) },
  ];
}

/** The orders of the Ash Warden (story phase 9): a folded letter with a seal of grey wax. */
function orders(): Part[] {
  return [
    { sdf: box([-5, 0.6, -3.6], [5, 1.6, 3.6], 0.3), material: I.bone },
    { sdf: box([-5, 1.6, -3.6], [1, 2.4, 3.6], 0.3), material: I.bone },
    { sdf: cylinder([1.2, 2.6, 0], 'y', 1.4, 0.6), material: I.pewter },
  ];
}

/** The model of each kind of item (ITEM_KINDS). */
const MODELS: readonly (readonly [string, () => Part[]])[] = [
  ['imp-horn', impHorn],
  ['brute-tusk', bruteTusk],
  ['candle', candle],
  ['ring', ring],
  ['cup', cup],
  ['herbs', herbs],
  ['draught', () => bottle(I.red)],
  ['antidote', () => bottle(I.green)],
  ['strong-draught', () => bottle(I.amber, true)],
  ['leather-armour', () => cuirass(I.leather, [{ sdf: box([-4.4, 3.4, -1.9], [4.4, 4.4, 1.9], 0.3), material: I.dark }])],
  // Rows of scales, one row half a scale over from the next.
  ['scale-mail', () => cuirass((x, y) => ((Math.floor(y / 1.6) + Math.floor(x / 1.8 + (Math.floor(y / 1.6) % 2) * 0.5)) % 2 === 0 ? I.silver : I.leather))],
  // Small rings: a fine check of steel and dark iron.
  ['chain-mail', () => cuirass((x, y) => ((Math.floor(x * 1.4) + Math.floor(y * 1.4)) % 2 === 0 ? I.steel : I.iron))],
  // Upright strips of steel on leather.
  ['splint-armour', () => cuirass((x, y) => (y < 2.6 || y > 9.6 ? I.leather : Math.floor((x + 6) / 1.6) % 2 === 0 ? I.steel : I.dark))],
  ['shield', shield],
  ['longsword', () => sword(12, 2.4)],
  ['shortsword', () => sword(8, 2.6)],
  ['rapier', () => sword(13, 1.4, true)],
  ['greataxe', greataxe],
  ['mace', mace],
  ['longbow', longbow],
  ['arcane-staff', () => staff(I.arcane, false)],
  ['druid-staff', () => staff(I.green, true)],
  ['luck-amulet', amulet],
  // Leather with rows of iron rivets.
  ['studded-leather', () => cuirass(I.leather, studs())],
  // Smooth steel, a dark band at the waist, and big plates on the shoulders.
  [
    'plate-armour',
    () =>
      cuirass((x, y) => (y > 3.2 && y < 4.4 ? I.dark : I.silver), [
        { sdf: union(ellipsoid([-4.2, 9.8, 0], [2.4, 1.6, 2.2]), ellipsoid([4.2, 9.8, 0], [2.4, 1.6, 2.2])), material: I.steel },
      ]),
  ],
  ['longsword-plus-1', magicSword],
  ['cloak-of-protection', cloak],
  ['ring-of-protection', () => stoneRing(I.arcane)],
  ['bracers-of-defence', bracers],
  ['gauntlets-of-ogre-power', gauntlet],
  ['headband-of-intellect', headband],
  ['amulet-of-health', () => [...amulet().slice(0, 2), { sdf: sphere([0, 4.2, 0.6], 1.2), material: I.red }]],
  ['belt-of-dwarvenkind', belt],
  ['boots-of-elvenkind', boots],
  ['glaive', glaive],
  ['crowbar', crowbar],
  ['badger-fur', badgerFur],
  ['mithril', mithril],
  ['mithril-permit', permit],
  ['wave-stone', waveStone],
  ['tear-of-tigris', tear],
  ['warden-orders', orders],
  ['lentils', lentils],
];

export function itemFrames(): Frame[] {
  return [
    icon('coin', coin()),
    ...MODELS.map(([kind, model]) => icon(kind, model())),
    ...MODELS.flatMap(([kind, model]) => pile(kind, model())),
    pileShadow(),
    { name: 'pile/glint', image: glint(), anchor: { x: 0.5, y: 0.5 } },
  ];
}
