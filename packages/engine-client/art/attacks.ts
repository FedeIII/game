/**
 * How each skin attacks. A skin's vibe and item give its attack style; each style has four poses
 * of the figure (a short wind-up, the blow, the follow-through, the return) and an effect in the
 * game (fx.ts). All attacks reach as far (the engine decides the hits); only the look differs.
 * No Node imports: the browser renders skins with it.
 */
import type { FigureAction, FigureSpec, Weapon } from './figure.ts';
import type { Vec3 } from './sdf.ts';

/**
 * slash: a sword swung across. thrust: a rapier or a dagger, straight ahead. bash: a staff
 * brought down with both hands. spell: a burst of magic from an orb staff or the hands. flame: a
 * gout of fire from a lantern. miasma: a cloud of poison thrown ahead. palm: a palm strike with a
 * shock wave. punch: a fist.
 */
export type AttackStyle = 'slash' | 'thrust' | 'bash' | 'spell' | 'flame' | 'miasma' | 'palm' | 'punch';
export const ATTACK_STYLES: readonly AttackStyle[] = ['slash', 'thrust', 'bash', 'spell', 'flame', 'miasma', 'palm', 'punch'];

/** Frames of an attack in a sheet. */
export const ATTACK_FRAMES = 4;

/** The style of a skin, from its vibe and what it carries. */
export function attackStyle(vibe: string, spec: FigureSpec): AttackStyle {
  switch (spec.item ?? 'none') {
    case 'sword':
      return vibe === 'noble' ? 'thrust' : 'slash';
    case 'staff':
      return 'bash';
    case 'orbstaff':
      return 'spell';
    case 'lantern':
      return 'flame';
    default:
      if (vibe === 'witch') return 'spell';
      if (vibe === 'monk') return 'palm';
      if (vibe === 'plague doctor') return 'miasma';
      if (vibe === 'ranger' || vibe === 'noble') return 'thrust';
      if (vibe === 'knight') return 'slash';
      return 'punch';
  }
}

type ArmPose = readonly [Vec3, Vec3];
/** Mirrors an arm pose to the other side (x). */
const mirror = ([u, f]: ArmPose): ArmPose => [
  [-u[0], u[1], u[2]],
  [-f[0], f[1], f[2]],
];

interface StylePoses {
  readonly right: readonly ArmPose[];
  /** The other arm: 'mirror' (both hands on a staff, or both hands in a spell) or its own poses. */
  readonly left?: 'mirror' | readonly ArmPose[];
  readonly lean: readonly number[];
  /** The direction of a staff in each frame. */
  readonly staff?: readonly Vec3[];
}

/** An arm that hangs at the side, a little bent: for the free arm in a blow. */
const BACK: ArmPose = [
  [-0.25, -0.75, -0.55],
  [-0.1, -0.85, 0.2],
];

const POSES: Readonly<Record<AttackStyle, StylePoses>> = {
  slash: {
    right: [
      [[0.55, 0.65, -0.35], [0.1, 0.95, -0.25]],
      [[0.25, 0.3, 0.95], [-0.35, 0.15, 0.95]],
      [[-0.1, -0.15, 0.95], [-0.6, -0.35, 0.7]],
      [[0.15, -0.6, 0.6], [-0.2, -0.7, 0.6]],
    ],
    left: [BACK, BACK, BACK, BACK],
    lean: [-0.04, 0.12, 0.16, 0.06],
  },
  thrust: {
    right: [
      [[0.3, -0.3, -0.85], [0.0, 0.1, 1]],
      [[0.08, 0.06, 1], [0.0, 0.05, 1]],
      [[0.08, 0.02, 1], [0.0, 0.0, 1]],
      [[0.25, -0.5, 0.6], [0.05, -0.2, 0.9]],
    ],
    left: [BACK, [[-0.3, -0.4, -0.85], [-0.1, 0.5, -0.4]], [[-0.3, -0.4, -0.85], [-0.1, 0.5, -0.4]], BACK],
    lean: [-0.03, 0.2, 0.22, 0.06],
  },
  bash: {
    right: [
      [[0.35, 0.85, -0.3], [0.0, 0.95, 0.2]],
      [[0.2, 0.5, 0.85], [0.0, 0.15, 1]],
      [[0.1, -0.1, 1], [0.0, -0.45, 0.85]],
      [[0.2, -0.5, 0.75], [0.0, -0.55, 0.65]],
    ],
    left: 'mirror',
    lean: [-0.08, 0.1, 0.22, 0.1],
    staff: [
      [0, 0.6, -0.8],
      [0, 0.35, 0.95],
      [0, -0.55, 0.8],
      [0, -0.3, 0.95],
    ],
  },
  spell: {
    right: [
      [[0.35, 0.5, 0.3], [0.0, 0.8, 0.5]],
      [[0.15, 0.2, 1], [0.0, 0.15, 1]],
      [[0.15, 0.3, 1], [0.0, 0.25, 1]],
      [[0.25, -0.4, 0.7], [0.05, -0.1, 0.95]],
    ],
    left: 'mirror',
    lean: [-0.06, 0.1, 0.12, 0.04],
    staff: [
      [0, 0.95, 0.2],
      [0, 0.45, 0.9],
      [0, 0.5, 0.85],
      [0, 0.8, 0.5],
    ],
  },
  flame: {
    right: [
      [[0.35, -0.5, -0.6], [0.05, -0.5, -0.5]],
      [[0.2, 0.15, 1], [0.0, 0.3, 1]],
      [[0.2, 0.2, 1], [0.0, 0.4, 0.95]],
      [[0.25, -0.5, 0.6], [0.0, -0.6, 0.6]],
    ],
    left: [BACK, BACK, BACK, BACK],
    lean: [-0.04, 0.12, 0.14, 0.05],
  },
  miasma: {
    right: [
      [[0.3, -0.6, -0.5], [0.1, -0.5, -0.6]],
      [[0.25, 0.1, 1], [0.0, 0.45, 0.9]],
      [[0.2, 0.35, 0.95], [0.0, 0.6, 0.8]],
      [[0.25, -0.45, 0.6], [0.05, -0.4, 0.8]],
    ],
    left: [BACK, BACK, BACK, BACK],
    lean: [-0.03, 0.1, 0.12, 0.04],
  },
  palm: {
    right: [
      [[0.3, -0.4, -0.8], [0.0, 0.2, 1]],
      [[0.05, 0.1, 1], [0.0, 0.12, 1]],
      [[0.05, 0.1, 1], [0.0, 0.12, 1]],
      [[0.25, -0.5, 0.6], [0.0, 0.0, 1]],
    ],
    left: [
      [[-0.3, -0.5, 0.6], [-0.05, 0.2, 1]],
      [[-0.3, -0.4, -0.85], [0.0, 0.25, 1]],
      [[-0.3, -0.4, -0.85], [0.0, 0.25, 1]],
      BACK,
    ],
    lean: [-0.05, 0.22, 0.24, 0.06],
  },
  punch: {
    right: [
      [[0.3, -0.35, -0.85], [0.0, 0.35, 0.95]],
      [[0.08, 0.12, 1], [0.0, 0.08, 1]],
      [[0.08, 0.1, 1], [0.0, 0.05, 1]],
      [[0.25, -0.55, 0.6], [0.0, 0.1, 1]],
    ],
    left: [
      [[-0.25, -0.5, 0.6], [0.0, 0.5, 0.85]],
      [[-0.3, -0.35, -0.85], [0.0, 0.4, 0.9]],
      [[-0.3, -0.35, -0.85], [0.0, 0.4, 0.9]],
      BACK,
    ],
    lean: [-0.04, 0.18, 0.2, 0.05],
  },
};

/** The legs in an attack: a stance with the feet apart (a walk phase and amount for `figure`). */
export const ATTACK_STANCE: readonly (readonly [number, number])[] = [
  [Math.PI * 0.5, 0.25],
  [Math.PI * 0.5, 0.55],
  [Math.PI * 0.5, 0.6],
  [Math.PI * 0.5, 0.3],
];

/** The pose of frame `frame` (0 to ATTACK_FRAMES - 1) of an attack in `style`, for a figure `spec`. */
export function attackAction(style: AttackStyle, frame: number, spec: FigureSpec): FigureAction {
  const poses = POSES[style];
  const right = poses.right[frame]!;
  const left = poses.left === 'mirror' ? mirror(right) : poses.left?.[frame];
  let weapon: Weapon | undefined;
  const item = spec.item ?? 'none';
  if (style === 'slash') weapon = { kind: 'blade', length: 8.5, width: 0.42 };
  else if (style === 'thrust') weapon = item === 'sword' ? { kind: 'blade', length: 10, width: 0.3 } : { kind: 'blade', length: 3.6, width: 0.34 };
  else if ((style === 'bash' || style === 'spell') && (item === 'staff' || item === 'orbstaff')) weapon = { kind: 'staff', dir: poses.staff![frame]!, orb: item === 'orbstaff' };
  else if (style === 'flame') weapon = { kind: 'lantern' };
  return { right, ...(left ? { left } : {}), lean: poses.lean[frame]!, ...(weapon ? { weapon } : {}) };
}
