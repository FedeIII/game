/**
 * How each skin attacks. A skin's class and item give its attack style; each style has four poses
 * of the figure (a short wind-up, the blow, the follow-through, the return) and an effect in the
 * game (fx.ts). All attacks reach as far (the engine decides the hits); only the look differs.
 * No Node imports: the browser renders skins with it.
 */
import type { CharacterClass } from '@game/engine';
import { figure, sway, tumble, type FigureAction, type FigureSpec, type Weapon } from './figure.ts';
import type { Part, Vec3 } from './sdf.ts';

/**
 * slash: a sword swung across. thrust: a rapier or a dagger, straight ahead. bash: a staff
 * brought down with both hands. spell: a burst of magic from an orb staff or the hands. flame: a
 * gout of fire from a lantern. miasma: a cloud of poison thrown ahead. palm: a palm strike with a
 * shock wave. punch: a fist. shoot: an arrow from a bow (a ranger: the engine flies the arrow).
 */
export type AttackStyle = 'slash' | 'thrust' | 'bash' | 'spell' | 'flame' | 'miasma' | 'palm' | 'punch' | 'shoot';
export const ATTACK_STYLES: readonly AttackStyle[] = ['slash', 'thrust', 'bash', 'spell', 'flame', 'miasma', 'palm', 'punch', 'shoot'];

/** Frames of an attack in a sheet. */
export const ATTACK_FRAMES = 4;

/** The effects (fx.ts) are drawn turned by 0, 22.5, 45 and 67.5 degrees: `fx/<style>/<turn>/<i>`. */
export const FX_TURNS = 4;

/**
 * How the game shows an effect in the direction `aim` (radians, y down), in 16 steps of 22.5
 * degrees: the drawing `fx/<style>/<turn>/<i>`, then a mirror (x to -x, first) and a rotation
 * by quarter turns (radians, clockwise). Both keep the pixel grid. The right half is the drawings
 * turned; the left half is the right half mirrored, so a blow from above stays from above.
 * `angle` is the direction shown.
 */
export function fxPlacement(aim: number): { readonly turn: number; readonly mirror: boolean; readonly rotation: number; readonly angle: number } {
  const step = ((Math.round(aim / (Math.PI / 8)) % 16) + 16) % 16;
  const mirror = step > 4 && step < 12;
  const right = mirror ? (24 - step) % 16 : step;
  const quarters = Math.floor(right / 4);
  return { turn: right % FX_TURNS, mirror, rotation: ((mirror ? -quarters : quarters) * Math.PI) / 2, angle: (step * Math.PI) / 8 };
}

/**
 * The style of a skin, from its class and what it carries. Fighters, paladins, barbarians (an
 * axe or a sword) and clerics (a mace) slash; bards (a rapier) and rogues (a dagger) thrust;
 * rangers shoot their bow; a staff bashes and an orb staff casts a spell; sorcerers and warlocks
 * cast from the hands too; monks strike with the palm. A lantern throws flame.
 */
export function attackStyle(cls: CharacterClass, spec: FigureSpec): AttackStyle {
  switch (spec.item ?? 'none') {
    case 'sword':
      return cls === 'bard' ? 'thrust' : 'slash';
    case 'axe':
    case 'mace':
      return 'slash';
    case 'dagger':
      return 'thrust';
    case 'bow':
      return 'shoot';
    case 'staff':
    case 'glaive':
      return 'bash';
    case 'orbstaff':
      return 'spell';
    case 'lantern':
      return 'flame';
    default:
      if (cls === 'sorcerer' || cls === 'warlock' || cls === 'wizard' || cls === 'druid') return 'spell';
      if (cls === 'monk') return 'palm';
      if (cls === 'rogue' || cls === 'ranger' || cls === 'bard') return 'thrust';
      if (cls === 'fighter' || cls === 'paladin' || cls === 'barbarian' || cls === 'cleric') return 'slash';
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
  // The bow out in front in the left hand; the right hand nocks, draws to the chin, lets go.
  shoot: {
    right: [
      [[0.2, -0.05, 0.98], [-0.3, 0.05, 0.95]],
      [[0.75, 0.2, -0.25], [-0.7, 0.1, 0.7]],
      [[0.75, 0.25, -0.45], [0.35, 0.35, -0.85]],
      [[0.25, -0.55, 0.6], [0.05, -0.3, 0.9]],
    ],
    left: [
      [[-0.12, 0.06, 1], [0.05, 0.04, 1]],
      [[-0.1, 0.1, 1], [0.05, 0.06, 1]],
      [[-0.1, 0.1, 1], [0.05, 0.06, 1]],
      [[-0.2, -0.4, 0.85], [0.0, -0.1, 1]],
    ],
    lean: [0.0, 0.03, 0.02, 0.0],
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
  if (style === 'slash') weapon = item === 'axe' ? { kind: 'axe' } : item === 'mace' ? { kind: 'mace' } : { kind: 'blade', length: 8.5, width: 0.42 };
  else if (style === 'thrust') weapon = item === 'sword' ? { kind: 'blade', length: 10, width: 0.3 } : { kind: 'blade', length: 3.6, width: 0.34 };
  else if ((style === 'bash' || style === 'spell') && (item === 'staff' || item === 'orbstaff' || item === 'glaive'))
    weapon = { kind: 'staff', dir: poses.staff![frame]!, orb: item === 'orbstaff', ...(item === 'glaive' ? { blade: true } : {}) };
  else if (style === 'flame') weapon = { kind: 'lantern' };
  else if (style === 'shoot') weapon = { kind: 'bow', draw: [0.4, 1, 0, 0][frame]! };
  return { right, ...(left ? { left } : {}), lean: poses.lean[frame]!, ...(weapon ? { weapon } : {}) };
}

/** Frames of a roll (a dodge) in a sheet. */
export const ROLL_FRAMES = 4;
/** In each frame of a roll: how far the legs fold up, and how far the figure has turned (radians). */
const ROLL = [
  [0.85, 0.75],
  [1, 2.3],
  [1, 3.9],
  [0.85, 5.45],
] as const;

/**
 * Frame `frame` of a roll: the tucked pose (the arms round the knees, the back bent) and the turn
 * of the whole figure, forward (figure.ts, tumble()). The game shows the frames in the way the
 * player rolls.
 */
export function rollPose(frame: number): { readonly action: FigureAction; readonly angle: number } {
  const [tuck, angle] = ROLL[frame]!;
  const right: ArmPose = [
    [0.3, -0.45, 0.85],
    [-0.3, -0.55, 0.75],
  ];
  return { action: { right, left: mirror(right), lean: 0.9 * tuck, tuck }, angle };
}

/** A tucked figure turns round this point (model space; y at the scale of the figure's height). */
const ROLL_PIVOT_Y = 8;
const ROLL_PIVOT_Z = 1.5;

/** Frames of a defeat in a sheet: the figure falls back, then lies on its back. */
export const FALL_FRAMES = 2;
/** In each frame of a fall: how far the figure has turned back (radians), and how far down it goes (model pixels). */
const FALL = [
  [-0.7, 1.5],
  [-Math.PI / 2, 11.5],
] as const;

/** The parts of frame `frame` of the fall of a defeated figure: it turns back round its hips, onto the ground. */
export function fallParts(spec: FigureSpec, frame: number): Part[] {
  const [angle, drop] = FALL[frame]!;
  const arms: ArmPose = [
    [0.55, -0.6, 0.2],
    [0.7, -0.2, 0.3],
  ];
  const action: FigureAction = { right: arms, left: mirror(arms), lean: -0.1 };
  return tumble(figure(spec, 0, 0, action), angle, [0, 13 * spec.height, 0], drop * spec.height);
}

/** The parts of frame `frame` of the roll of a figure: tucked, and turned forward round its middle. */
export function rollParts(spec: FigureSpec, frame: number): Part[] {
  const { action, angle } = rollPose(frame);
  return tumble(figure(spec, 0, 0, action), angle, [0, ROLL_PIVOT_Y * spec.height, ROLL_PIVOT_Z]);
}

/** Frames of a heavy roll in a sheet (a character with a heavy load: load.ts in the engine). */
export const HEAVY_ROLL_FRAMES = 4;
/**
 * In each frame of a heavy roll: the crouch, the tuck, the kneel, the lean forward, the turn of the
 * figure forward (radians, tumble()) and to its right (sway()), and how far down it goes (model
 * pixels). It drops low, rolls over its right shoulder and its back, and comes up on one knee.
 */
const HEAVY_ROLL = [
  { crouch: 1, tuck: 0, kneel: 0, lean: 0.9, angle: 0.55, side: 0.3, drop: 0 },
  { crouch: 0, tuck: 0.55, kneel: 0, lean: 0.8, angle: 2.0, side: 0.55, drop: 0 },
  { crouch: 0, tuck: 0.6, kneel: 0, lean: 0.8, angle: 3.8, side: 0.35, drop: 0 },
  { crouch: 0, tuck: 0, kneel: 1, lean: 0.2, angle: 0, side: 0, drop: 0 },
] as const;
/** A heavy roll turns round this point (model space; y at the scale of the figure's height): lower than a roll. */
const HEAVY_PIVOT_Y = 8;

/**
 * The parts of frame `frame` of the heavy roll of a figure (a low roll over one shoulder that ends on
 * one knee; Fede's choice, 2026-10-15): slower and lower than a roll, with less of a tuck.
 */
export function heavyRollParts(spec: FigureSpec, frame: number): Part[] {
  const pose = HEAVY_ROLL[frame]!;
  // The arms forward and down, to take the fall; on one knee, the right forearm over the knee.
  const right: ArmPose =
    pose.kneel > 0
      ? [
          [0.25, -0.75, 0.6],
          [0.1, -0.2, 1],
        ]
      : [
          [0.3, -0.5, 0.8],
          [-0.2, -0.6, 0.75],
        ];
  const left: ArmPose = pose.kneel > 0 ? [[-0.3, -0.85, 0.4], [-0.1, -0.5, 0.85]] : mirror(right);
  const action: FigureAction = { right, left, lean: pose.lean, crouch: pose.crouch, tuck: pose.tuck, kneel: pose.kneel };
  const parts = figure(spec, 0, 0, action);
  if (pose.angle === 0 && pose.side === 0) return parts;
  const pivot: Vec3 = [0, HEAVY_PIVOT_Y * spec.height, ROLL_PIVOT_Z];
  return tumble(sway(parts, pose.side, pivot), pose.angle, pivot, pose.drop * spec.height);
}

/** Frames of the sneak walk in a sheet: as many as the walk has. */
export const SNEAK_FRAMES = 8;
/** A player that sneaks: how far it crouches (FigureAction.crouch), how far it leans forward, and how long its strides are (a walk amount; 1 is a walk). */
const SNEAK = { crouch: 1, lean: 0.4, stride: 0.6 } as const;

/**
 * The parts of a figure that sneaks: in a crouch (the knees bent, the body low and forward, the
 * arms ready), at rest when `frame` is null, else in frame `frame` of the sneak walk (short strides).
 */
export function sneakParts(spec: FigureSpec, frame: number | null): Part[] {
  const action: FigureAction = { lean: SNEAK.lean, crouch: SNEAK.crouch };
  return frame === null ? figure(spec, 0, 0, action) : figure(spec, (frame / SNEAK_FRAMES) * 2 * Math.PI, SNEAK.stride, action);
}

/** Frames of an evade in a sheet: the figure sways out of a blow, to the full sway, and back. */
export const EVADE_FRAMES = 3;
/** The brace: how far the knees bend (FigureAction.crouch), how far the body leans (back: less than 0), and the stride of the feet (a walk amount). */
const BRACE = { crouch: 0.55, lean: -0.08, stride: 0.45 } as const;
/** In each frame of an evade: the sway to the side (radians, sway()), the lean back, and the crouch. */
const EVADE = [
  [0.2, -0.2, 0.65],
  [0.36, -0.32, 0.8],
  [0.16, -0.14, 0.65],
] as const;

/** The guard of each style in a brace: the arms, and the direction of a staff. The weapon is up in front, at the foe. */
const GUARDS: Readonly<Record<AttackStyle, { readonly right: ArmPose; readonly left?: 'mirror' | ArmPose; readonly staff?: Vec3 }>> = {
  // The blade raised in front, the free hand forward.
  slash: { right: [[0.3, -0.45, 0.85], [0.0, 0.75, 0.65]], left: [[-0.3, -0.6, 0.7], [0.05, 0.1, 1]] },
  // The point at the foe, the other arm up behind.
  thrust: { right: [[0.25, -0.45, 0.85], [0.0, 0.25, 1]], left: [[-0.35, -0.5, -0.75], [-0.1, 0.55, -0.4]] },
  // Both hands on the staff, across the body.
  bash: { right: [[0.25, -0.55, 0.75], [0.0, 0.1, 1]], left: 'mirror', staff: [0.55, 0.8, 0.25] },
  // The hands forward, ready to cast; a staff upright in front.
  spell: { right: [[0.25, -0.45, 0.8], [0.0, 0.3, 0.95]], left: 'mirror', staff: [0, 0.85, 0.5] },
  flame: { right: [[0.25, -0.5, 0.75], [0.0, -0.1, 1]], left: [[-0.3, -0.6, 0.7], [0.05, 0.1, 1]] },
  miasma: { right: [[0.25, -0.45, 0.8], [0.0, 0.35, 0.95]], left: [[-0.25, -0.5, 0.75], [0.0, 0.2, 1]] },
  // An open guard: both palms forward.
  palm: { right: [[0.25, -0.5, 0.75], [0.0, 0.45, 0.9]], left: [[-0.25, -0.55, 0.7], [0.0, 0.25, 1]] },
  // The bow low in front (an arrow never braces, but the sheet has the frame).
  shoot: { right: [[0.25, -0.55, 0.6], [0.05, -0.3, 0.9]], left: [[-0.2, -0.4, 0.85], [0.0, -0.1, 1]] },
  // The fists up.
  punch: { right: [[0.25, -0.6, 0.7], [0.0, 0.7, 0.7]], left: [[-0.25, -0.6, 0.7], [0.0, 0.6, 0.8]] },
};

/**
 * The pose of a brace (player.ts, BRACE_TICKS): a figure that tenses after its blow, as if to dodge.
 * The knees bend, the weight goes back a little, and the weapon is up in front, at the foe (GUARDS).
 */
export function braceAction(style: AttackStyle, spec: FigureSpec): FigureAction {
  const guard = GUARDS[style];
  const left = guard.left === 'mirror' ? mirror(guard.right) : guard.left;
  // The weapon of the attack, in the hand; a staff along the guard.
  const held = attackAction(style, ATTACK_FRAMES - 1, spec).weapon;
  const weapon = held?.kind === 'staff' && guard.staff ? { ...held, dir: guard.staff } : held?.kind === 'bow' ? { ...held, draw: 0 } : held;
  return { right: guard.right, ...(left ? { left } : {}), lean: BRACE.lean, crouch: BRACE.crouch, ...(weapon ? { weapon } : {}) };
}

/** The parts of a figure that braces: one foot back, the knees bent, the weapon ready. */
export function braceParts(spec: FigureSpec, style: AttackStyle): Part[] {
  return figure(spec, Math.PI * 0.5, BRACE.stride, braceAction(style, spec));
}

/**
 * The parts of frame `frame` of an evade (a brace that a blow reached): the braced figure sways to
 * its side round its feet, and leans back, out of the blow; then it comes back. The feet stay.
 */
export function evadeParts(spec: FigureSpec, style: AttackStyle, frame: number): Part[] {
  const [angle, lean, crouch] = EVADE[frame]!;
  const action: FigureAction = { ...braceAction(style, spec), lean, crouch };
  return sway(figure(spec, Math.PI * 0.5, BRACE.stride, action), angle, [0, 0, 0]);
}

/** Frames of a jump from a brace in a sheet (player.ts, JUMPS): the spring, the hop with the knees up, the reach for the ground. */
export const JUMP_FRAMES = 3;
/**
 * In each frame of a jump: the crouch, the tuck (the knees come up), the lean and the stride of the
 * feet. The figure keeps the guard of its brace, its weapon at the foe. The page lifts the frames
 * over the shadow on an arc (PlayerView), so the poses stand on the ground of the frame.
 */
const JUMP = [
  { crouch: 0.15, tuck: 0, lean: -0.04, stride: 0.15 },
  { crouch: 0.45, tuck: 0.32, lean: -0.08, stride: 0 },
  { crouch: 0.4, tuck: 0.08, lean: -0.06, stride: 0.4 },
] as const;

/**
 * The parts of frame `frame` of a jump from a brace (Fede's choice, 2026-10-15: frames of its own): the
 * legs push off nearly straight, fold up in the air, and reach for the ground with the knees bent. The
 * arms and the weapon stay in the guard of the brace (GUARDS).
 */
export function jumpParts(spec: FigureSpec, style: AttackStyle, frame: number): Part[] {
  const pose = JUMP[frame]!;
  const action: FigureAction = { ...braceAction(style, spec), lean: pose.lean, crouch: pose.crouch, tuck: pose.tuck };
  return figure(spec, Math.PI * 0.5, pose.stride, action);
}

/** Frames of a struggle in a sheet (a shove of the sandbox: mechanics.ts): a push, and a harder one. */
export const STRUGGLE_FRAMES = 2;
/** In each frame of a struggle: the lean in, the crouch, and the stride of the feet (one foot far back). */
const STRUGGLE = [
  { lean: 0.26, crouch: 0.45, stride: 0.7 },
  { lean: 0.36, crouch: 0.6, stride: 0.85 },
] as const;
/** The arm of a struggle that pushes: out in front at the chest, the hand on the foe. */
const PUSH: ArmPose = [
  [0.2, -0.15, 0.97],
  [0.0, 0.2, 1],
];
/** The weapon arm in a struggle: the fist up by the shoulder, so that the blade points up, out of the push. */
const HOLD_UP: ArmPose = [
  [0.3, -0.4, 0.85],
  [0.0, 0.95, 0.3],
];

/**
 * The parts of frame `frame` of a struggle (a shove of the sandbox; Fede, 2026-10-15): the figure leans
 * into the foe on bent knees, one foot far back. The free hand (or the shield) pushes on the foe, and the
 * weapon is up by the shoulder; with a staff (both hands on it), the staff pushes across the body.
 */
export function struggleParts(spec: FigureSpec, style: AttackStyle, frame: number): Part[] {
  const pose = STRUGGLE[frame]!;
  const guard = braceAction(style, spec);
  const staff = guard.weapon?.kind === 'staff' && GUARDS[style].left === 'mirror';
  const action: FigureAction = { right: staff ? PUSH : HOLD_UP, left: mirror(PUSH), lean: pose.lean, crouch: pose.crouch, ...(guard.weapon ? { weapon: guard.weapon } : {}) };
  return figure(spec, Math.PI * 0.5, pose.stride, action);
}

/** Frames of a grab in a sheet (a shove of the sandbox: mechanics.ts): the reach, the hand out, the hand back. */
export const GRAB_FRAMES = 3;
/** In each frame of a grab: the arm that reaches (upper arm, forearm), the lean, the crouch and the stride. */
const GRAB: readonly { readonly arm: ArmPose; readonly lean: number; readonly crouch: number; readonly stride: number }[] = [
  { arm: [[-0.3, -0.25, 0.92], [0.05, 0.2, 0.98]], lean: 0.14, crouch: 0.25, stride: 0.45 },
  { arm: [[-0.15, -0.05, 0.99], [0.05, 0.08, 1]], lean: 0.26, crouch: 0.35, stride: 0.65 },
  { arm: [[-0.3, -0.6, 0.75], [0.2, 0.45, 0.85]], lean: 0.08, crouch: 0.2, stride: 0.3 },
];

/**
 * The parts of frame `frame` of a grab (a shove of the sandbox; Fede, 2026-10-15): the figure reaches
 * out with its free hand, leans in on a long step, and draws the hand back when it closes on nothing.
 * The weapon is up by the shoulder, as in a struggle; with a staff (both hands on it), both arms reach.
 */
export function grabParts(spec: FigureSpec, style: AttackStyle, frame: number): Part[] {
  const pose = GRAB[frame]!;
  const guard = braceAction(style, spec);
  const staff = guard.weapon?.kind === 'staff' && GUARDS[style].left === 'mirror';
  const action: FigureAction = { right: staff ? mirror(pose.arm) : HOLD_UP, left: pose.arm, lean: pose.lean, crouch: pose.crouch, ...(guard.weapon ? { weapon: guard.weapon } : {}) };
  return figure(spec, Math.PI * 0.5, pose.stride, action);
}
