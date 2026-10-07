/**
 * The player: a hooded wanderer with realistic proportions (about 6.5 heads tall), made from
 * SDF parts on a simple skeleton and rendered from four sides. The walk cycle has 8 frames.
 * Change the proportions in the constants below, not in the frames.
 */
import { PLAYER_LOOKS, type PlayerLook } from '@game/engine';
import { ramp } from './raster.ts';
import { ellipsoid, intersect, noise3, renderModel, roundCone, sphere, subtract, type Material, type Part, type Sdf, type Vec3 } from './sdf.ts';
import type { Frame } from './sprites.ts';

/** All player frames have the same size and anchor, so a texture change never moves the sprite. */
export const PLAYER_FRAME = { width: 32, height: 32, pivotX: 16, pivotY: 30 } as const;
export const WALK_FRAMES = 8;

const M = { cloak: 0, lining: 1, leather: 2, trousers: 3, boots: 4, face: 5, metal: 6, belt: 7, glove: 8, hair: 9, faceLit: 10 } as const;

const MATERIALS: Material[] = [
  { ramp: ramp('#14070a', '#260c10', '#3a1216', '#501a1d', '#662325', '#7c302e') }, // cloak: dark wine
  { ramp: ramp('#0a0405', '#130708', '#1c0b0c', '#26100f') }, // cloak lining
  { ramp: ramp('#130e0a', '#211810', '#312318', '#432f20', '#563c29') }, // leather jerkin
  { ramp: ramp('#121115', '#1c1a20', '#27242c', '#332f39', '#403b47') }, // trousers
  { ramp: ramp('#0b0806', '#150f0b', '#201710', '#2c2016') }, // boots
  { ramp: ramp('#1a110e', '#33221b', '#523a2d', '#73533f', '#93705a'), bias: -0.12 }, // face, in the hood's shadow
  { ramp: ramp('#101217', '#1f232a', '#333943', '#4b535f', '#6b7581', '#939dab') }, // metal
  { ramp: ramp('#0f0a07', '#1b130d', '#291d14') }, // belt
  { ramp: ramp('#0e0b09', '#1a1410', '#271e17') }, // gloves and bracers
  { ramp: ramp('#140c08', '#22150d', '#321f13', '#432a1a') }, // hair
  { ramp: ramp('#1a110e', '#33221b', '#523a2d', '#73533f', '#93705a') }, // face without a hood
];

/** A costume: the colours of the cloak, the jerkin and the hair, and the hood up or down. */
interface Look {
  readonly cloak: readonly number[];
  readonly hood: boolean;
  readonly hair?: readonly number[];
  readonly leather?: readonly number[];
}

/** Materials for a look: the player's materials with the look's colours in place. */
function materialsFor(look: Look): Material[] {
  const out = [...MATERIALS];
  out[M.cloak] = { ramp: look.cloak };
  out[M.lining] = { ramp: look.cloak.slice(0, 4) };
  if (look.hair) out[M.hair] = { ramp: look.hair };
  if (look.leather) out[M.leather] = { ramp: look.leather };
  return out;
}

const HAIR = {
  grey: ramp('#2a2a2c', '#46464a', '#66666a', '#8a8a8e'),
  chestnut: ramp('#1e0f08', '#33190d', '#4c2714', '#64351c'),
  black: ramp('#08080a', '#121216', '#1c1c22', '#28282f'),
  dark: ramp('#140c08', '#22150d', '#321f13', '#432a1a'),
  blond: ramp('#3a2c12', '#5e4a1e', '#86702e', '#b09842'),
};

/**
 * The looks of NPCs (frames `npc/<look>`, standing, facing south). Worlds pick a look by name;
 * add a look here to give a new character a costume.
 */
export const NPC_LOOKS: Record<string, Look> = {
  treasurer: { cloak: ramp('#08140d', '#0d2014', '#132c1c', '#1a3a25', '#234a30', '#2e5c3c'), hood: false, hair: HAIR.grey },
  healer: { cloak: ramp('#2a2722', '#3e3a33', '#555046', '#6e685b', '#888170', '#a29a86'), hood: true },
  bard: { cloak: ramp('#140a18', '#211028', '#30183a', '#40214d', '#522b60', '#653875'), hood: false, hair: HAIR.chestnut },
  dungeonmaster: { cloak: ramp('#120c08', '#20160e', '#2f2015', '#3f2b1c', '#503724', '#62442d'), hood: true },
  spymaster: { cloak: ramp('#060608', '#0c0c10', '#131318', '#1b1b22', '#24242c', '#2e2e38'), hood: true },
  gamer: { cloak: ramp('#080c18', '#0e1426', '#141d36', '#1b2747', '#233259', '#2d3f6c'), hood: false, hair: HAIR.black },
  smith: {
    cloak: ramp('#160a06', '#26110a', '#37190e', '#4a2213', '#5d2c18', '#71371e'),
    hood: false,
    hair: HAIR.dark,
    leather: ramp('#1c120a', '#2e1e10', '#422c18', '#583b21', '#6e4a2b'),
  },
  archivist: { cloak: ramp('#0d1014', '#151a20', '#1e252d', '#28303a', '#333d49', '#3f4b59'), hood: true },
  crier: { cloak: ramp('#14070a', '#260c10', '#3a1216', '#501a1d', '#662325', '#7c302e'), hood: false, hair: HAIR.blond },
};

// Proportions, in world pixels. The figure is about 28 pixels tall.
const HIP_Y = 14.4;
const HIP_HALF_WIDTH = 1.55;
const THIGH = 6.9;
const SHIN = 6.6;
const SHOULDER_Y = 21.0;
const SHOULDER_HALF_WIDTH = 3.25;
const UPPER_ARM = 4.5;
const FOREARM = 4.0;
const HEAD: Vec3 = [0, 25.3, 0.2];
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

/**
 * The parts of the figure at one moment of the walk. `phase` is the walk cycle angle and
 * `amount` is 0 for a stand and 1 for a full walk.
 */
function figure(phase: number, amount: number, hooded = true): Part[] {
  const swing = 0.62 * amount;
  const kneeBend = 1.05 * amount;
  const armSwing = 0.5 * amount;
  // A small forward lean of the upper body when it walks.
  const lean = 0.1 * amount;

  const legs = [-1, 1].map((side) => {
    const p = phase + (side < 0 ? 0 : Math.PI);
    const theta = swing * Math.sin(p);
    // The knee bends most while the leg swings forward, under the body.
    const knee = 0.1 + kneeBend * Math.max(0, Math.cos(p));
    const hip: Vec3 = [side * HIP_HALF_WIDTH, HIP_Y, 0];
    const kneeAt = add(hip, [0, -THIGH * Math.cos(theta), THIGH * Math.sin(theta)]);
    const shin = theta - knee;
    const ankle = add(kneeAt, [0, -SHIN * Math.cos(shin), SHIN * Math.sin(shin)]);
    const toe = add(ankle, [0, -0.45, 2.1]);
    return { hip, knee: kneeAt, ankle, toe };
  });
  // Put the lower foot on the ground. This also gives the body its up-and-down bob.
  const lift = -Math.min(...legs.map((leg) => Math.min(leg.ankle[1] - 0.9, leg.toe[1] - 0.7)));
  const up = (v: Vec3): Vec3 => [v[0], v[1] + lift, v[2]];
  // The lean moves points above the hips forward, more for higher points.
  const upper = (v: Vec3): Vec3 => up([v[0], v[1], v[2] + Math.max(0, v[1] - HIP_Y) * lean]);

  const parts: Part[] = [];
  const part = (sdf: Sdf, material: Part['material']): void => {
    parts.push({ sdf, material });
  };

  for (const leg of legs) {
    const ankle = up(leg.ankle);
    part(roundCone(up(leg.hip), up(leg.knee), 1.7, 1.35), M.trousers);
    part(roundCone(up(leg.knee), ankle, 1.35, 1.05), (_x, y) => (y < ankle[1] + 3.2 ? M.boots : M.trousers));
    part(roundCone(ankle, up(leg.toe), 1.0, 0.8), M.boots);
  }

  // Torso: hips, waist and chest, with a belt and a buckle.
  part(ellipsoid(up([0, 14.6, 0]), [2.35, 1.7, 1.65]), M.leather);
  part(ellipsoid(upper([0, 16.7, 0]), [2.25, 1.9, 1.55]), M.leather);
  part(ellipsoid(upper([0, 19.4, 0.05]), [2.9, 2.5, 1.85]), M.leather);
  part(ellipsoid(up([0, 15.4, 0]), [2.45, 0.5, 1.8]), M.belt);
  part(sphere(up([0, 15.4, 1.75]), 0.5), M.metal);

  for (const side of [-1, 1]) {
    const p = phase + (side < 0 ? 0 : Math.PI);
    // The arm swings against the leg on the same side, and bends more when it swings forward.
    const alpha = -armSwing * Math.sin(p);
    const bend = 0.3 + 0.5 * Math.max(0, alpha);
    const shoulder: Vec3 = [side * SHOULDER_HALF_WIDTH, SHOULDER_Y, 0];
    const elbow = add(shoulder, scale(unit(side * 0.16, -Math.cos(alpha), Math.sin(alpha)), UPPER_ARM));
    const forearm = unit(side * 0.06, -Math.cos(alpha + bend), Math.sin(alpha + bend));
    const wrist = add(elbow, scale(forearm, FOREARM));
    const hand = add(wrist, scale(forearm, 0.7));
    part(ellipsoid(upper(add(shoulder, [side * 0.3, 0.5, 0])), [1.6, 1.15, 1.6]), M.metal);
    part(roundCone(upper(shoulder), upper(elbow), 1.15, 1.0), M.leather);
    part(roundCone(upper(elbow), upper(wrist), 1.0, 0.85), M.glove);
    part(sphere(upper(hand), 0.85), M.glove);
  }

  // Head in a hood: a sphere with a face opening, joined to a mantle on the shoulders. With the
  // hood down, the mantle stays as a collar, and hair covers the top and back of the head.
  const face = hooded ? M.face : M.faceLit;
  part(roundCone(upper([0, 22, 0]), upper([0, 24, 0.1]), 0.85, 0.8), face);
  part(sphere(upper(HEAD), HEAD_RADIUS), face);
  const mantle = roundCone(upper([0, 23.4, -0.5]), upper([0, 21.6, -0.3]), 2.0, 3.1);
  if (hooded) {
    const hood = sphere(upper([0, 25.8, -0.3]), 2.4);
    const opening = sphere(upper([0, 25.0, 2.3]), 1.95);
    part(subtract((x, y, z) => Math.min(hood(x, y, z), mantle(x, y, z)), opening), M.cloak);
  } else {
    part(subtract(mantle, sphere(upper([0, 25.0, 2.3]), 1.95)), M.cloak);
    const [hx, hy, hz] = upper(HEAD);
    const cap = sphere([hx, hy + 0.35, hz - 0.3], HEAD_RADIUS + 0.2);
    // The hair is the part of the cap above the brow or behind the ears.
    part((x, y, z) => Math.max(cap(x, y, z), Math.min(hy + 0.4 - y, z - (hz - 0.4))), M.hair);
  }

  // The cloak: the back half of a cone from the shoulders to below the knees, with a ragged
  // hem. It trails and sways when the figure walks. The cut face is the dark lining.
  const trail = 0.9 * amount;
  const sway = 0.5 * amount * Math.sin(phase);
  const smooth = roundCone(upper([0, 22.2, -0.8]), up([sway, 7.8, -1.8 - trail]), 2.9, 4.2);
  // Vertical folds, deeper towards the hem.
  const cone: Sdf = (x, y, z) =>
    smooth(x, y, z) + 0.28 * Math.sin(Math.atan2(x, -(z + 1)) * 6) * Math.min(1, Math.max(0, (22 + lift - y) / 12));
  const front: Sdf = (_x, _y, z) => z - 0.15;
  const hem: Sdf = (x, y, z) => 7.9 + lift + 1.5 * noise3(x * 0.8, 0, z * 0.8, 7) - y;
  part(intersect(cone, front, hem), (x, y, z) => (front(x, y, z) >= Math.max(cone(x, y, z), hem(x, y, z)) - 0.05 ? M.lining : M.cloak));

  return parts;
}

/**
 * One view for each facing. Left is a real render, not a mirror of right: a mirror would also
 * mirror the light, which comes from the top left for all art.
 */
export const VIEWS = [
  { name: 'down', yaw: 0 },
  { name: 'up', yaw: Math.PI },
  { name: 'right', yaw: Math.PI / 2 },
  { name: 'left', yaw: -Math.PI / 2 },
] as const;

/**
 * The cloaks of the player looks (PLAYER_LOOKS in the engine): in a multiplayer world the server
 * gives each visitor one. All are dark and a little desaturated, so the figures stay in the
 * style; they differ enough to tell two visitors apart. 'wine' is the single player's look.
 */
const PLAYER_CLOAKS = {
  wine: null,
  moss: ramp('#0a1209', '#111e0f', '#192a15', '#22371c', '#2c4524', '#38552d'),
  ash: ramp('#121212', '#1d1d1e', '#29292b', '#363639', '#444448', '#54545a'),
  indigo: ramp('#0a0b1a', '#11142a', '#191e3c', '#22294f', '#2c3563', '#384278'),
  rust: ramp('#170b05', '#26130a', '#381c0e', '#4b2713', '#5f3219', '#743e20'),
  bone: ramp('#24211c', '#36322a', '#4a4539', '#5f5949', '#756e5b', '#8b836d'),
  plum: ramp('#150914', '#230f21', '#331630', '#441e40', '#562750', '#6a3162'),
  teal: ramp('#071312', '#0c1f1d', '#122c29', '#193a36', '#214944', '#2a5a54'),
} satisfies Record<PlayerLook, readonly number[] | null>;

/** Frames `player/<look>/<view>/stand` and `player/<look>/<view>/walk/<i>`, for every look. */
export function playerFrames(): Frame[] {
  const anchor = { x: PLAYER_FRAME.pivotX / PLAYER_FRAME.width, y: PLAYER_FRAME.pivotY / PLAYER_FRAME.height };
  const frames: Frame[] = [];
  for (const look of PLAYER_LOOKS) {
    const cloak = PLAYER_CLOAKS[look];
    const materials = cloak ? materialsFor({ cloak, hood: true }) : MATERIALS;
    for (const view of VIEWS) {
      const render = (parts: Part[]) => renderModel(parts, materials, { ...PLAYER_FRAME, yaw: view.yaw });
      frames.push({ name: `player/${look}/${view.name}/stand`, image: render(figure(0, 0)), anchor });
      for (let i = 0; i < WALK_FRAMES; i++) {
        frames.push({ name: `player/${look}/${view.name}/walk/${i}`, image: render(figure((i / WALK_FRAMES) * 2 * Math.PI, 1)), anchor });
      }
    }
  }
  return frames;
}

/** One standing frame for each NPC look, facing south, with the player's frame size and anchor. */
export function npcFrames(): Frame[] {
  const anchor = { x: PLAYER_FRAME.pivotX / PLAYER_FRAME.width, y: PLAYER_FRAME.pivotY / PLAYER_FRAME.height };
  return Object.entries(NPC_LOOKS).map(([name, look]) => ({
    name: `npc/${name}`,
    image: renderModel(figure(0, 0, look.hood), materialsFor(look), { ...PLAYER_FRAME, yaw: 0 }),
    anchor,
  }));
}
