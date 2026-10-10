/**
 * Item icons, as SDF models (pitch projection, like the small props): the pack panel shows them
 * at 2x, on a dark slot. Frame names are `item/<kind>` for the kinds of ITEM_KINDS in the engine,
 * and `item/coin` for the coins of the purse. Each icon is 16 x 16, the model on the ground in
 * the middle, as large as the frame lets it be.
 *
 * The icons have materials of their own, a little lighter than the world's: a slot has no torch
 * to light it. They keep the dark, desaturated colours of the rest of the art.
 */
import { ramp } from './raster.ts';
import { cylinder, ellipsoid, renderModel, roundCone, sphere, subtract, union, type Material, type Part, type Sdf, type Vec3 } from './sdf.ts';
import type { Frame } from './sprites.ts';

const SIZE = 16;

const I = { gold: 0, silver: 1, pewter: 2, bone: 3, horn: 4, root: 5, wax: 6, wick: 7, leaf: 8, string: 9, garnet: 10, red: 11, green: 12, amber: 13, glass: 14 } as const;
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

export function itemFrames(): Frame[] {
  return [
    icon('coin', coin()),
    icon('imp-horn', impHorn()),
    icon('brute-tusk', bruteTusk()),
    icon('candle', candle()),
    icon('ring', ring()),
    icon('cup', cup()),
    icon('herbs', herbs()),
    icon('draught', bottle(I.red)),
    icon('antidote', bottle(I.green)),
    icon('strong-draught', bottle(I.amber, true)),
  ];
}
