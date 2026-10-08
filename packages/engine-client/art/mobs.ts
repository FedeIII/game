/**
 * The mobs: the imp (small and quick: a hunched little devil with horns, bat wings and claws)
 * and the brute (big and slow: a hulking grey ghoul with tusks and a spiked club). Both are SDF
 * models (sdf.ts) in poses: a stand, a walk, a wind-up, a blow and a death. Their eyes glow: the
 * build lists the eye pixels of each frame (meta.mobEyes), and the game draws them above the
 * darkness.
 *
 * Model space as in figure.ts: world pixels, y up, z towards the viewer (the front of the mob).
 */
import { VIEWS } from './characters.ts';
import { Image } from './image.ts';
import { ramp, shadowEllipse } from './raster.ts';
import { ellipsoid, roundCone, sphere, type Material, type Part, type Sdf, type Vec3 } from './sdf.ts';
import { renderModel, type RenderInfo } from './sdf.ts';
import type { Frame } from './sprites.ts';

export type MobKind = 'imp' | 'brute';

/** Material slots of a mob. */
const MM = { hide: 0, belly: 1, horn: 2, claw: 3, eye: 4, mouth: 5, cloth: 6, wood: 7, metal: 8, wing: 9 } as const;

/** One pose of a mob: the walk cycle, and how far into a wind-up, a blow or a death it is (0..1). */
export interface MobPose {
  readonly phase: number;
  readonly walk: number;
  readonly windup: number;
  readonly strike: number;
  readonly death: number;
}

const POSE: MobPose = { phase: 0, walk: 0, windup: 0, strike: 0, death: 0 };

/** The frame of each kind: room for a raised club and for a body on the ground. */
export const MOB_FRAMES: Readonly<Record<MobKind, { width: number; height: number; pivotX: number; pivotY: number }>> = {
  imp: { width: 32, height: 32, pivotX: 16, pivotY: 26 },
  brute: { width: 64, height: 72, pivotX: 32, pivotY: 60 },
};

/** Frames of each animation. */
export const MOB_ANIMATIONS = { walk: 6, windup: 2, strike: 2, die: 6 } as const;

/** The colour of the glow of the eyes, for the game. */
export const MOB_EYE_GLOW: Readonly<Record<MobKind, number>> = { imp: 0xffa040, brute: 0xff4a2a };

const PALETTES: Readonly<Record<MobKind, Material[]>> = {
  imp: materials({
    hide: ramp('#100506', '#1d0a0a', '#2e110f', '#431914', '#59221a', '#702d21'),
    belly: ramp('#1a0d0b', '#2b1711', '#3f2318', '#553021', '#6a3e2b'),
    horn: ramp('#0c0a08', '#1c1712', '#302820', '#463b2e', '#5e523f'),
    claw: ramp('#16130f', '#332d24', '#554c3d', '#7b705a'),
    eye: ramp('#ff6a1a', '#ffa03a', '#ffd27a'),
    mouth: ramp('#050203', '#120405', '#22090a'),
    cloth: ramp('#0d0907', '#1a120c', '#291c12', '#382719'),
    wood: ramp('#0f0a07', '#1d140d', '#2c1f14', '#3d2b1c', '#4e3824'),
    metal: ramp('#101217', '#1f232a', '#333943', '#4b535f', '#6b7581'),
    wing: ramp('#0a0405', '#160809', '#240d0e', '#331414', '#431c1b'),
  }),
  brute: materials({
    hide: ramp('#0c0f0b', '#151a13', '#1f261c', '#2b3427', '#384332', '#47533f', '#57634d'),
    belly: ramp('#11130e', '#1c2017', '#282e21', '#353c2c', '#434a37', '#525943'),
    horn: ramp('#241f17', '#41392c', '#635845', '#887b61', '#a89a7c'),
    claw: ramp('#16130f', '#332d24', '#554c3d', '#7b705a'),
    eye: ramp('#ff3a14', '#ff7a30', '#ffc070'),
    mouth: ramp('#050203', '#120405', '#22090a'),
    cloth: ramp('#0b0806', '#170f0a', '#24180f', '#322115', '#402b1b'),
    wood: ramp('#0e0906', '#1b120c', '#2a1c12', '#3a2819', '#4b3420', '#5c4028'),
    metal: ramp('#0f1115', '#1d2027', '#30353e', '#474e59', '#646d7a', '#8a94a2'),
    wing: ramp('#0a0405', '#160809', '#240d0e'),
  }),
};

function materials(p: Record<keyof typeof MM, readonly number[]>): Material[] {
  const out: Material[] = [];
  for (const [name, index] of Object.entries(MM)) out[index] = { ramp: p[name as keyof typeof MM], ...(name === 'eye' ? { bias: 0.9 } : {}) };
  return out;
}

// ---------------------------------------------------------------- shapes

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mix = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mirror = (v: Vec3, side: number): Vec3 => [v[0] * side, v[1], v[2]];

class Model {
  readonly parts: Part[] = [];
  sphere(c: Vec3, r: number, material: number): void {
    this.parts.push({ sdf: sphere(c, r), material, bound: [c[0], c[1], c[2], r] });
  }
  ellipsoid(c: Vec3, radii: Vec3, material: number): void {
    this.parts.push({ sdf: ellipsoid(c, radii), material, bound: [c[0], c[1], c[2], Math.max(...radii)] });
  }
  cone(a: Vec3, b: Vec3, ra: number, rb: number, material: number): void {
    const half = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 2;
    this.parts.push({ sdf: roundCone(a, b, ra, rb), material, bound: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, half + Math.max(ra, rb)] });
  }
  /** A chain of cones through the points, with the radii at each point. */
  chain(points: readonly Vec3[], radii: readonly number[], material: number): void {
    for (let i = 0; i + 1 < points.length; i++) this.cone(points[i]!, points[i + 1]!, radii[i]!, radii[i + 1]!, material);
  }
}

/**
 * The whole model turned about a point on the ground: `pitch` tips the top forward (+z; negative
 * tips it back), `roll` tips it to the side (+x), then it sinks by `sink`. For deaths.
 */
function tilt(parts: readonly Part[], pitch: number, roll: number, sink: number, pivotZ: number): Part[] {
  if (pitch === 0 && roll === 0 && sink === 0) return [...parts];
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const forward = (x: number, y: number, z: number): Vec3 => {
    const z0 = z - pivotZ;
    // Pitch about the x axis, then roll about the z axis.
    const y1 = y * cp - z0 * sp;
    const z1 = y * sp + z0 * cp;
    const x2 = x * cr + y1 * sr;
    const y2 = -x * sr + y1 * cr;
    return [x2, y2 - sink, z1 + pivotZ];
  };
  return parts.map((part) => {
    const sdf: Sdf = (x, y, z) => {
      const y2 = y + sink;
      const x1 = x * cr - y2 * sr;
      const y1 = x * sr + y2 * cr;
      const z1 = z - pivotZ;
      const yy = y1 * cp + z1 * sp;
      const zz = -y1 * sp + z1 * cp;
      return part.sdf(x1, yy, zz + pivotZ);
    };
    const b = part.bound;
    const bound = b ? ([...forward(b[0], b[1], b[2]), b[3]] as const) : undefined;
    return { sdf, material: part.material, ...(bound ? { bound } : {}) };
  });
}

/** The whole model `k` times bigger (about the origin on the ground). */
function scaled(parts: readonly Part[], k: number): Part[] {
  return parts.map((part) => {
    const b = part.bound;
    return {
      sdf: (x: number, y: number, z: number) => part.sdf(x / k, y / k, z / k) * k,
      material: typeof part.material === 'number' ? part.material : (x, y, z, nx, ny, nz) => (part.material as Exclude<Part['material'], number>)(x / k, y / k, z / k, nx, ny, nz),
      ...(b ? { bound: [b[0] * k, b[1] * k, b[2] * k, b[3] * k] as const } : {}),
    };
  });
}

/** Two legs that end on the ground; returns the lift that puts the lower foot on y = 0. */
interface Leg {
  hip: Vec3;
  knee: Vec3;
  ankle: Vec3;
  toe: Vec3;
}

// ---------------------------------------------------------------- the imp

function imp(pose: MobPose): Part[] {
  const m = new Model();
  const { phase, walk, windup, strike } = pose;
  const crouch = 0.55 * windup + 0.2 * strike;
  const legs: Leg[] = [-1, 1].map((side) => {
    const p = phase + (side < 0 ? 0 : Math.PI);
    const swing = 0.7 * walk * Math.sin(p);
    const theta = 0.55 + swing + 0.6 * crouch - 0.5 * strike * (side < 0 ? 1 : -0.4);
    const hip: Vec3 = [side * 1.45, 6.1, -0.6];
    const knee = add(hip, [side * 0.15, -3.0 * Math.cos(theta), 3.0 * Math.sin(theta)]);
    const phi = theta - 1.55 - 0.5 * crouch - 0.4 * walk * Math.max(0, Math.cos(p));
    const ankle = add(knee, [0, -3.1 * Math.cos(phi), 3.1 * Math.sin(phi)]);
    const toe = add(ankle, [side * 0.1, -0.9, 1.5]);
    return { hip, knee, ankle, toe };
  });
  const lift = -Math.min(...legs.map((l) => Math.min(l.ankle[1] - 0.55, l.toe[1] - 0.4)));
  const up = (v: Vec3): Vec3 => [v[0], v[1] + lift, v[2]];
  for (const leg of legs) {
    m.chain([up(leg.hip), up(leg.knee), up(leg.ankle)], [1.15, 0.85, 0.6], MM.hide);
    m.cone(up(leg.ankle), up(leg.toe), 0.55, 0.35, MM.hide);
    for (const k of [-1, 0, 1]) m.cone(up(leg.toe), up(add(leg.toe, [k * 0.45, -0.25, 0.8])), 0.25, 0.08, MM.claw);
  }

  const bob = 0.4 * walk * Math.abs(Math.sin(phase));
  const pelvis = up(add([0, 6.2, -0.4], [0, bob, 0.9 * strike]));
  const chest = up(add([0, 9.0 + bob, 1.3], add(mix([0, 0, 0], [0, 0.6, -0.9], windup), mix([0, 0, 0], [0, -1.2, 2.2], strike))));
  m.cone(pelvis, chest, 1.75, 2.25, MM.hide);
  // The belly: lighter, in front.
  m.ellipsoid(add(mix(pelvis, chest, 0.45), [0, 0, 1.1]), [1.45, 1.75, 0.9], MM.belly);

  // The head: big, forward of the chest, with a snout, a brow, horns and pointed ears.
  const head = add(chest, add([0, 2.2, 1.3], mix([0, 0, 0], [0, -0.3, -0.7], windup)));
  const eye = pose.death > 0.2 ? MM.mouth : MM.eye;
  m.sphere(head, 2.1, MM.hide);
  m.ellipsoid(add(head, [0, 0.95, 1.1]), [1.4, 0.32, 0.55], MM.hide);
  m.ellipsoid(add(head, [0, -1.0, 1.3]), [1.35, 0.85 + 0.35 * strike, 1.1], MM.hide);
  m.ellipsoid(add(head, [0, -1.2 - 0.2 * strike, 2.15]), [0.95, 0.22 + 0.3 * strike, 0.35], MM.mouth);
  for (const side of [-1, 1]) {
    m.sphere(add(head, [side * 0.85, 0.25, 1.75]), 0.58, eye);
    m.chain([add(head, mirror([1.0, 1.45, 0.2], side)), add(head, mirror([1.85, 2.9, 0.05], side)), add(head, mirror([2.35, 4.1, -0.7], side))], [0.6, 0.4, 0.1], MM.horn);
    m.cone(add(head, mirror([1.8, 0.3, 0.1], side)), add(head, mirror([3.5, 0.75, -0.4], side)), 0.45, 0.08, MM.hide);
  }

  // The arms: long and thin, the claws down at rest, up over the head in the wind-up, forward in the blow.
  for (const side of [-1, 1]) {
    const p = phase + (side < 0 ? Math.PI : 0);
    const shoulder = add(chest, [side * 1.85, 0.25, -0.2]);
    const rest = { elbow: [side * 0.6, -2.5, 0.8 + 0.9 * walk * Math.sin(p)] as Vec3, wrist: [side * -0.15, -2.4, 0.9 + 1.1 * walk * Math.sin(p)] as Vec3 };
    const raised = { elbow: [side * 1.1, 1.6, -0.9] as Vec3, wrist: [side * 0.1, 2.3, 0.4] as Vec3 };
    const forward = { elbow: [side * 0.45, -0.5, 2.5] as Vec3, wrist: [side * -0.35, -0.5, 2.6] as Vec3 };
    const elbowD = mix(mix(rest.elbow, raised.elbow, windup), forward.elbow, strike);
    const wristD = mix(mix(rest.wrist, raised.wrist, windup), forward.wrist, strike);
    const elbow = add(shoulder, elbowD);
    const wrist = add(elbow, wristD);
    m.chain([shoulder, elbow, wrist], [0.75, 0.55, 0.45], MM.hide);
    const along = wristD;
    const n = Math.hypot(...along) || 1;
    const dir: Vec3 = [along[0] / n, along[1] / n, along[2] / n];
    for (const k of [-1, 0, 1]) m.cone(wrist, add(wrist, [dir[0] * 1.2 + k * 0.4, dir[1] * 1.2, dir[2] * 1.2 + Math.abs(k) * -0.2]), 0.3, 0.07, MM.claw);
  }

  // Bat wings on the back: a bony edge and a membrane; they beat with the walk.
  const beat = 0.6 * walk * Math.sin(phase * 2) + 0.9 * windup - 0.4 * strike;
  for (const side of [-1, 1]) {
    const root = add(chest, [side * 0.9, 0.9, -1.5]);
    const elbow = add(root, [side * 1.6, 2.1 + beat, -0.9]);
    const tip = add(elbow, [side * 1.7, -0.3 + beat * 0.6, -0.5]);
    m.chain([root, elbow, tip], [0.3, 0.24, 0.08], MM.horn);
    m.ellipsoid(add(mix(root, tip, 0.55), [0, -0.9, -0.15]), [1.75, 1.3 + 0.2 * beat, 0.16], MM.wing);
  }

  // A thin tail with a barb; it sways.
  const sway = 0.9 * Math.sin(phase + 0.6) * walk;
  const tail0 = add(pelvis, [0, -0.3, -1.4]);
  const tail1 = add(pelvis, [sway * 0.5, -1.6, -3.2]);
  const tail2 = add(pelvis, [sway, 0.4, -4.6]);
  m.chain([tail0, tail1, tail2], [0.55, 0.38, 0.2], MM.hide);
  m.cone(tail2, add(tail2, [0, 0.9, -0.6]), 0.45, 0.06, MM.horn);
  return m.parts;
}

// ---------------------------------------------------------------- the brute

function brute(pose: MobPose): Part[] {
  const m = new Model();
  const { phase, walk, windup, strike } = pose;
  // The death starts on the knees: the legs fold.
  const kneel = Math.min(1, pose.death / 0.35);
  const legs: Leg[] = [-1, 1].map((side) => {
    const p = phase + (side < 0 ? 0 : Math.PI);
    const swing = 0.32 * walk * Math.sin(p);
    const theta = 0.12 + swing + 0.35 * strike + 1.2 * kneel;
    const hip: Vec3 = [side * 2.9, 11.2, -0.3];
    const knee = add(hip, [side * 0.55, -5.0 * Math.cos(theta), 5.0 * Math.sin(theta)]);
    const phi = theta - 0.3 - 0.5 * walk * Math.max(0, Math.cos(p)) - 0.4 * strike - 2.3 * kneel;
    const ankle = add(knee, [side * -0.2, -5.2 * Math.cos(phi), 5.2 * Math.sin(phi)]);
    const toe = add(ankle, [side * 0.2, -0.6, 2.3 * (1 - kneel) + 0.4]);
    return { hip, knee, ankle, toe };
  });
  const lift = -Math.min(...legs.map((l) => Math.min(l.ankle[1] - 1.2, l.toe[1] - 1.0, l.knee[1] - 1.4)));
  const up = (v: Vec3): Vec3 => [v[0], v[1] + lift, v[2]];
  for (const leg of legs) {
    m.chain([up(leg.hip), up(leg.knee), up(leg.ankle)], [2.5, 2.0, 1.6], MM.hide);
    m.cone(up(leg.ankle), up(leg.toe), 1.5, 1.15, MM.hide);
  }

  // The upper body leans back in the wind-up and far forward in the blow.
  const hipY = 11.5;
  const lean = -0.18 * windup + 0.5 * strike + 0.05 * walk;
  const rock = 0.6 * walk * Math.sin(phase);
  const upper = (v: Vec3): Vec3 => up([v[0] + rock * Math.max(0, v[1] - hipY) * 0.04, v[1] - Math.max(0, v[1] - hipY) * Math.abs(lean) * 0.25, v[2] + Math.max(0, v[1] - hipY) * lean]);
  const bob = 0.5 * walk * Math.abs(Math.cos(phase));

  m.ellipsoid(up([0, 11.8 + bob, -0.2]), [4.3, 2.4, 3.0], MM.cloth);
  m.ellipsoid(up([0, 12.3 + bob, 0.1]), [4.55, 0.75, 3.15], MM.cloth);
  m.ellipsoid(up([0, 9.6 + bob, 2.1]), [2.4, 2.6, 0.7], MM.cloth);
  m.ellipsoid(upper([0, 15.4 + bob, 1.0]), [4.5, 3.7, 3.5], MM.belly);
  m.ellipsoid(upper([0, 19.8 + bob, 0.3]), [6.1, 3.7, 3.7], MM.hide);
  m.ellipsoid(upper([0, 22.0 + bob, -1.3]), [5.2, 2.9, 3.3], MM.hide);
  for (const side of [-1, 1]) m.sphere(upper([side * 5.8, 21.6 + bob, -0.1]), 2.75, MM.hide);
  // A strap across the chest with a rusted buckle.
  m.cone(upper([-4.6, 22.0 + bob, 1.6]), upper([3.6, 15.8 + bob, 3.5]), 0.55, 0.55, MM.cloth);
  m.sphere(upper([-0.4, 19.0 + bob, 3.35]), 0.6, MM.metal);

  // The head: small, low between the shoulders, with a heavy brow, a jaw and tusks.
  const head = upper([0, 23.2 + bob, 3.2]);
  m.sphere(head, 2.3, MM.hide);
  m.ellipsoid(add(head, [0, 0.9, 1.5]), [2.05, 0.4, 0.75], MM.hide);
  m.ellipsoid(add(head, [0, -1.2, 1.05]), [2.15, 1.25, 1.55], MM.hide);
  m.ellipsoid(add(head, [0, -1.0, 2.45]), [1.2, 0.2, 0.3], MM.mouth);
  for (const side of [-1, 1]) {
    m.sphere(add(head, [side * 0.85, 0.15, 2.1]), 0.5, pose.death > 0.2 ? MM.mouth : MM.eye);
    m.cone(add(head, [side * 1.0, -1.45, 2.25]), add(head, [side * 1.35, 0.15, 2.85]), 0.4, 0.1, MM.horn);
  }

  // The arms: long and thick, to the knees. The right hand holds the club; in the wind-up both
  // hands lift it over the head, in the blow they bring it down in front.
  const fists: Record<number, Vec3> = {};
  for (const side of [-1, 1]) {
    const p = phase + (side < 0 ? Math.PI : 0);
    const shoulder = upper([side * 6.4, 21.3 + bob, 0.3]);
    const rest = { elbow: [side * 1.2, -5.4, 0.7 + 1.0 * walk * Math.sin(p)] as Vec3, wrist: [side * -0.2, -5.0, 1.3 + 1.4 * walk * Math.sin(p)] as Vec3 };
    const raised = { elbow: [side * 0.6 - 0.8, 4.2, -1.8] as Vec3, wrist: [side * -1.4 - 1.0, 4.0, 0.4] as Vec3 };
    const smash = { elbow: [side * -0.8, -1.8, 4.4] as Vec3, wrist: [side * -1.6, -2.4, 4.4] as Vec3 };
    const elbow = add(shoulder, mix(mix(rest.elbow, raised.elbow, windup), smash.elbow, strike));
    const wrist = add(elbow, mix(mix(rest.wrist, raised.wrist, windup), smash.wrist, strike));
    m.chain([shoulder, elbow, wrist], [2.3, 1.95, 1.75], MM.hide);
    const fist = add(wrist, [0, -1.0, 0.5]);
    m.sphere(fist, 1.85, MM.hide);
    fists[side] = fist;
  }
  // The club: a rough log that grows thick at its head, with iron spikes.
  const grip = fists[1]!;
  const hang: Vec3 = [0.6, -7.5, 4.2];
  const back: Vec3 = [-0.6, 3.5, -9.0];
  const down: Vec3 = [-0.4, -7.8, 7.6];
  const along = mix(mix(hang, back, windup), down, strike);
  const n = Math.hypot(...along);
  const dir: Vec3 = [along[0] / n, along[1] / n, along[2] / n];
  const end = add(grip, [dir[0] * 11, dir[1] * 11, dir[2] * 11]);
  m.cone(add(grip, [-dir[0] * 1.6, -dir[1] * 1.6, -dir[2] * 1.6]), mix(grip, end, 0.55), 0.95, 1.4, MM.wood);
  m.cone(mix(grip, end, 0.5), end, 1.55, 2.45, MM.wood);
  // An iron band round the club head.
  m.cone(mix(grip, end, 0.62), mix(grip, end, 0.7), 1.85, 1.95, MM.metal);
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const at = mix(grip, end, 0.82 + 0.06 * a);
    // Spikes out of the club head, square to the club.
    const side: Vec3 = [a * 1.0, b * 0.6 + (a === 0 ? 0.4 : 0), b !== 0 ? b * 0.8 : 0.3];
    m.cone(at, add(at, [side[0] * 3.2, side[1] * 3.2, side[2] * 3.2]), 0.55, 0.08, MM.metal);
  }
  return m.parts;
}

// ---------------------------------------------------------------- frames

const MODELS: Readonly<Record<MobKind, (pose: MobPose) => Part[]>> = { imp: (pose) => scaled(imp(pose), 1.25), brute: (pose) => scaled(brute(pose), 1.2) };

/** The model of a kind in a pose, with the death's fall. */
export function mobModel(kind: MobKind, pose: MobPose): Part[] {
  const parts = MODELS[kind](pose);
  const d = pose.death;
  if (d <= 0) return parts;
  if (kind === 'imp') {
    // Thrown back, then over on its back, then it sinks into a heap.
    const fall = Math.min(1, d / 0.7);
    return tilt(parts, -0.25 - 1.3 * fall * fall, 0.25 * fall, 2.2 * Math.max(0, (d - 0.55) / 0.45), -1.5);
  }
  // Down on the knees first (in the model), then over on its face.
  const fall = Math.max(0, (d - 0.3) / 0.7);
  return tilt(parts, 1.45 * fall * fall - 0.1 * Math.min(1, d / 0.3), 0, 3.5 * Math.max(0, (d - 0.7) / 0.3), 4);
}

/** The poses of the animations, in order. */
export function mobPoses(): { name: string; pose: MobPose }[] {
  const out: { name: string; pose: MobPose }[] = [{ name: 'stand', pose: POSE }];
  for (let i = 0; i < MOB_ANIMATIONS.walk; i++) out.push({ name: `walk/${i}`, pose: { ...POSE, walk: 1, phase: (i / MOB_ANIMATIONS.walk) * 2 * Math.PI } });
  out.push({ name: 'windup/0', pose: { ...POSE, windup: 0.55 } }, { name: 'windup/1', pose: { ...POSE, windup: 1 } });
  out.push({ name: 'strike/0', pose: { ...POSE, windup: 0.25, strike: 0.85 } }, { name: 'strike/1', pose: { ...POSE, strike: 1 } });
  for (let i = 0; i < MOB_ANIMATIONS.die; i++) out.push({ name: `die/${i}`, pose: { ...POSE, strike: i === 0 ? 0.3 : 0, death: (i + 1) / MOB_ANIMATIONS.die } });
  return out;
}

/**
 * The frames of the mobs, `mob/<kind>/<view>/<pose>` (stand, walk/i, windup/i, strike/i,
 * die/i), their shadows `mob/<kind>/shadow`, and the eye pixels of each frame.
 */
export function mobFrames(): { frames: Frame[]; eyes: Record<string, number[]> } {
  const frames: Frame[] = [];
  const eyes: Record<string, number[]> = {};
  for (const kind of ['imp', 'brute'] as const) {
    const size = MOB_FRAMES[kind];
    const anchor = { x: size.pivotX / size.width, y: size.pivotY / size.height };
    for (const view of VIEWS) {
      for (const { name, pose } of mobPoses()) {
        const info: RenderInfo = {};
        const image = renderModel(mobModel(kind, pose), PALETTES[kind], { ...size, yaw: view.yaw }, info);
        const frameName = `mob/${kind}/${view.name}/${name}`;
        frames.push({ name: frameName, image, anchor });
        const lit: number[] = [];
        info.materialAt!.forEach((material, i) => {
          if (material === MM.eye) lit.push(i % size.width, Math.floor(i / size.width));
        });
        if (lit.length > 0) eyes[frameName] = lit;
      }
    }
    const shadow = kind === 'imp' ? new Image(14, 6) : new Image(28, 9);
    shadowEllipse(shadow, shadow.width / 2, shadow.height / 2, shadow.width / 2 - 0.5, shadow.height / 2, 0x80);
    frames.push({ name: `mob/${kind}/shadow`, image: shadow, anchor: { x: 0.5, y: 0.5 } });
  }
  return { frames, eyes };
}
