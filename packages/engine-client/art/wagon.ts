/**
 * The wagon of the caravan of Silverspring (story phase 5): a covered cart drawn by two horses,
 * an NPC look of its own (`npc/wagon/<view>/stand`, `.../walk/<i>`, and the portrait `npc/wagon`):
 * the game draws it as a guard (guards.ts) with the frames of an NPC. An SDF model as the mobs are
 * (sdf.ts: world pixels, y up, z towards the viewer); it faces +z (the horses in front) before the
 * yaw of each view turns it.
 */
import { VIEWS, WALK_FRAMES } from './characters.ts';
import { ramp } from './raster.ts';
import { box, cylinder, ellipsoid, intersect, renderModel, roundCone, subtract, union, type Material, type Part, type Vec3 } from './sdf.ts';
import type { Frame } from './sprites.ts';

/** The frame of the wagon: room for the two horses in front and the cart behind them, in every view. */
const WAGON_FRAME = { width: 64, height: 56, pivotX: 32, pivotY: 46 } as const;

const W = { wood: 0, dark: 1, canvas: 2, iron: 3, horse: 4, mane: 5, hoof: 6 } as const;
const MATERIALS: Material[] = [];
MATERIALS[W.wood] = { ramp: ramp('#1a120a', '#2e2012', '#44301b', '#5c4226', '#765632') };
MATERIALS[W.dark] = { ramp: ramp('#0c0806', '#1a110b', '#291b11', '#392618') };
MATERIALS[W.canvas] = { ramp: ramp('#2a2620', '#4a443a', '#6e6656', '#958b75', '#b4aa8e') };
MATERIALS[W.iron] = { ramp: ramp('#0e1013', '#1b1e24', '#2c3139', '#424955') };
MATERIALS[W.horse] = { ramp: ramp('#160c06', '#26150b', '#3a2110', '#4f2e17', '#663d1f') };
MATERIALS[W.mane] = { ramp: ramp('#060504', '#100c0a', '#1c1612', '#2a221c') };
MATERIALS[W.hoof] = { ramp: ramp('#0a0908', '#1a1816', '#2c2926') };

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** The wagon in a walk phase (radians; `walk` 0 stands): the legs of the horses swing. */
function wagon(phase: number, walk: number): Part[] {
  const parts: Part[] = [];
  const cone = (a: Vec3, b: Vec3, ra: number, rb: number, material: number) => parts.push({ sdf: roundCone(a, b, ra, rb), material });
  // The cart: a bed of planks, low sides, a canvas cover on hoops, and four wheels.
  parts.push({ sdf: box([-6, 4.6, -17], [6, 6.4, -2], 0.3), material: W.wood });
  parts.push({ sdf: union(box([-6.2, 6.4, -17], [-5.4, 8.4, -2]), box([5.4, 6.4, -17], [6.2, 8.4, -2]), box([-6.2, 6.4, -17], [6.2, 8.4, -16.2])), material: W.dark });
  const hood = subtract(cylinder([0, 8.2, -9.5], 'z', 6.6, 14), cylinder([0, 8.2, -9.5], 'z', 5.6, 16));
  parts.push({ sdf: intersect(hood, box([-7, 8.2, -17], [7, 16, -2])), material: W.canvas });
  for (const z of [-4.6, -14.4]) {
    for (const side of [-1, 1]) {
      const c: Vec3 = [side * 6.8, 3.6, z];
      parts.push({ sdf: subtract(cylinder(c, 'x', 3.6, 0.9), cylinder(c, 'x', 2.6, 1.4)), material: W.dark });
      parts.push({ sdf: cylinder(c, 'x', 0.8, 1.2), material: W.iron });
    }
  }
  // The shafts, from the front of the cart to the collars of the horses.
  for (const side of [-1, 1]) cone([side * 2.4, 5.6, -2], [side * 2.4, 8.6, 9], 0.45, 0.4, W.dark);
  // Two horses side by side, their legs in a walk (one horse half a stride behind the other).
  for (const side of [-1, 1]) {
    const x = side * 3.2;
    const p = phase + (side < 0 ? 0 : Math.PI / 2);
    const bob = 0.3 * walk * Math.abs(Math.sin(p));
    const body: Vec3 = [x, 9.2 + bob, 7.6];
    parts.push({ sdf: ellipsoid(body, [2.1, 2.5, 5.4]), material: W.horse });
    const neck0 = add(body, [0, 1.4, 4.2]);
    const head: Vec3 = add(body, [0, 6.4, 8.8]);
    cone(neck0, add(head, [0, -0.6, -1.2]), 1.5, 1.0, W.horse);
    cone(add(head, [0, 0, -0.6]), add(head, [0, -1.4, 1.8]), 1.0, 0.65, W.horse);
    cone(add(neck0, [0, 1.4, -0.4]), add(head, [0, 0.6, -1.4]), 0.55, 0.45, W.mane);
    cone(add(head, [0, 0.9, -0.8]), add(head, [0, 2.0, -1.2]), 0.3, 0.1, W.horse);
    cone(add(body, [0, 0.6, -5.2]), add(body, [0, -3.4, -6.6]), 0.6, 0.3, W.mane);
    // Four legs: a fore and a hind on each side; each pair swings in turn.
    for (const [dz, lag] of [
      [3.6, 0],
      [-3.6, Math.PI],
    ] as const) {
      for (const lx of [-0.9, 0.9]) {
        const swing = 1.6 * walk * Math.sin(p + lag + (lx > 0 ? Math.PI : 0));
        const top: Vec3 = [x + lx, body[1] - 1.4, body[2] + dz];
        const foot: Vec3 = [x + lx, 0.5, body[2] + dz + swing];
        cone(top, foot, 0.65, 0.42, W.horse);
        cone(foot, add(foot, [0, -0.5, 0.2]), 0.5, 0.5, W.hoof);
      }
    }
  }
  return parts;
}

/** The frames of the wagon: a portrait, and each view standing and walking. */
export function wagonFrames(): Frame[] {
  const anchor = { x: WAGON_FRAME.pivotX / WAGON_FRAME.width, y: WAGON_FRAME.pivotY / WAGON_FRAME.height };
  const frames: Frame[] = [];
  const render = (parts: Part[], yaw: number) => renderModel(parts, MATERIALS, { ...WAGON_FRAME, yaw });
  frames.push({ name: 'npc/wagon', image: render(wagon(0, 0), 0), anchor });
  for (const view of VIEWS) {
    frames.push({ name: `npc/wagon/${view.name}/stand`, image: render(wagon(0, 0), view.yaw), anchor });
    for (let i = 0; i < WALK_FRAMES; i++) frames.push({ name: `npc/wagon/${view.name}/walk/${i}`, image: render(wagon((i / WALK_FRAMES) * 2 * Math.PI, 1), view.yaw), anchor });
  }
  return frames;
}

/** The looks that are drawn as NPCs but are not figures of characters.ts (their walks are animations too). */
export const OTHER_LOOKS = ['wagon'] as const;
