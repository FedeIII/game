/**
 * The mobs: the imp (small and quick: a hunched little devil with horns, bat wings and claws)
 * and the brute (big and slow: a hulking grey ghoul with tusks and a spiked club). The hobgoblin
 * band (2026-10-11): the goblin (a small archer with a short bow), the worg (a big black wolf), the
 * hobgoblin (a soldier in a helm and scale, with a sword and a shield) and the bugbear (big and
 * hairy, with a spiked mace); the leader of the war band, the Hobgoblin Devastator (story phase 4b:
 * a hobgoblin in a hooded robe, with a staff and an ember at its top). The Ashen Seekers (story phases
 * 7 to 9): the cinder hound (a grey dog with embers in its back), and the Seekers in robes of ash with
 * masks of bone and the red phoenix on the brow: the watcher (no weapon), the blade (a sword), the
 * cinder adept (a staff with an ember) and the Ash Warden (taller, with a crest of bone). The goblin of
 * the forest on the road to Ironhold (the tutorial): the skirmisher, a goblin with a curved scimitar and
 * a small round shield. The bandit of the same forest by day: a robber in a hood of dark leather, with a
 * scarf of rust red over its face and a scimitar; it ambushes, so it also crouches and creeps (the
 * frames `crouch` and `creep/<i>`). All are SDF models (sdf.ts) in poses: a stand, a walk, a wind-up, a
 * blow and a death. Their eyes glow: the build lists the eye pixels of each frame
 * (meta.mobEyes), and the game draws them above the darkness.
 *
 * Model space as in figure.ts: world pixels, y up, z towards the viewer (the front of the mob).
 */
import { VIEWS } from './characters.ts';
import { Image } from './image.ts';
import { ramp, shadowEllipse } from './raster.ts';
import { ellipsoid, roundCone, sphere, type Material, type Part, type Sdf, type Vec3 } from './sdf.ts';
import { renderModel, type RenderInfo } from './sdf.ts';
import type { Frame } from './sprites.ts';

export type MobKind = 'imp' | 'brute' | 'goblin' | 'worg' | 'hobgoblin' | 'bugbear' | 'devastator' | 'hound' | 'watcher' | 'seeker' | 'adept' | 'warden' | 'skirmisher' | 'bandit';
const KINDS: readonly MobKind[] = ['imp', 'brute', 'goblin', 'worg', 'hobgoblin', 'bugbear', 'devastator', 'hound', 'watcher', 'seeker', 'adept', 'warden', 'skirmisher', 'bandit'];
/** The kinds that ambush (MobStats.ambush in the engine): they have the frames `crouch` and `creep/<i>`. */
export const CROUCHING: readonly MobKind[] = ['bandit'];

/** Material slots of a mob. */
const MM = { hide: 0, belly: 1, horn: 2, claw: 3, eye: 4, mouth: 5, cloth: 6, wood: 7, metal: 8, wing: 9 } as const;

/**
 * One pose of a mob: the walk cycle, and how far into a wind-up, a blow or a death it is (0..1);
 * `reel` tips it back from a blow that did not kill it.
 */
export interface MobPose {
  readonly phase: number;
  readonly walk: number;
  readonly windup: number;
  readonly strike: number;
  readonly death: number;
  readonly reel?: number;
  /** A crouch (0..1): low on bent knees, the body forward (an ambush that hides or creeps). */
  readonly crouch?: number;
  /**
   * A struggle (0..1, a little more for the hardest push): the body leans in, both hands and the shield
   * forward, one foot back (a shove of the sandbox).
   */
  readonly grapple?: number;
  /** A fall after a shove (0..1): thrown back, and over on its back, its eyes open (1: it lies). */
  readonly floored?: number;
  /** A rise after a shove (0..1): from a seat on the ground, up on bent knees (1: it stands). */
  readonly rise?: number;
}

const POSE: MobPose = { phase: 0, walk: 0, windup: 0, strike: 0, death: 0 };

/** The frame of each kind: room for a raised club and for a body on the ground. */
export const MOB_FRAMES: Readonly<Record<MobKind, { width: number; height: number; pivotX: number; pivotY: number }>> = {
  imp: { width: 32, height: 32, pivotX: 16, pivotY: 26 },
  brute: { width: 64, height: 72, pivotX: 32, pivotY: 60 },
  goblin: { width: 40, height: 40, pivotX: 20, pivotY: 32 },
  worg: { width: 64, height: 52, pivotX: 32, pivotY: 40 },
  hobgoblin: { width: 56, height: 60, pivotX: 28, pivotY: 48 },
  bugbear: { width: 68, height: 76, pivotX: 34, pivotY: 62 },
  devastator: { width: 56, height: 68, pivotX: 28, pivotY: 52 },
  hound: { width: 52, height: 44, pivotX: 26, pivotY: 34 },
  watcher: { width: 48, height: 60, pivotX: 24, pivotY: 48 },
  seeker: { width: 56, height: 60, pivotX: 28, pivotY: 48 },
  adept: { width: 56, height: 68, pivotX: 28, pivotY: 52 },
  warden: { width: 64, height: 72, pivotX: 32, pivotY: 56 },
  skirmisher: { width: 40, height: 40, pivotX: 20, pivotY: 32 },
  bandit: { width: 56, height: 60, pivotX: 28, pivotY: 48 },
};

/** Frames of each animation (`creep`: the kinds of CROUCHING only; `struggle`, `fall` and `rise`: SHOVE_ANIMATED only). */
export const MOB_ANIMATIONS = { walk: 6, windup: 2, strike: 2, die: 6, creep: 6, struggle: 2, fall: 3, rise: 2 } as const;
/**
 * The kinds with the frames of a shove of the sandbox: `struggle/<i>`, `fall/<i>` and `rise/<i>` (Fede,
 * 2026-10-15: the goblins of the sandbox only). The page shows other frames for the other kinds.
 */
export const SHOVE_ANIMATED: readonly MobKind[] = ['skirmisher'];

/** The colour of the glow of the eyes, for the game. */
export const MOB_EYE_GLOW: Readonly<Record<MobKind, number>> = {
  imp: 0xffa040,
  brute: 0xff4a2a,
  goblin: 0xffd040,
  worg: 0xffe27a,
  hobgoblin: 0xff6a20,
  bugbear: 0xff8a30,
  devastator: 0xff7a2a,
  hound: 0xff7a2a,
  watcher: 0xff9a40,
  seeker: 0xff8a30,
  adept: 0xffb050,
  warden: 0xff5a20,
  skirmisher: 0xffd040,
  // A bandit's eyes are a man's: a faint pale glint under the hood.
  bandit: 0xc8b898,
};

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
  // A grey-green goblin in rags of leather, with a bow of dark wood.
  goblin: materials({
    hide: ramp('#0b0f0a', '#141b12', '#1f281b', '#2b3725', '#384630', '#46553b'),
    belly: ramp('#10140d', '#1b2116', '#272f20', '#343e2b', '#424d36'),
    horn: ramp('#1c1a14', '#3a352a', '#5a5242', '#7e745e'),
    claw: ramp('#16130f', '#332d24', '#554c3d', '#7b705a'),
    eye: ramp('#ffb81a', '#ffd84a', '#fff09a'),
    mouth: ramp('#050203', '#120405', '#22090a'),
    cloth: ramp('#0d0907', '#1a120c', '#291c12', '#382719', '#47321f'),
    wood: ramp('#0c0806', '#1a110b', '#291b11', '#392618', '#4a311f'),
    metal: ramp('#101217', '#1f232a', '#333943', '#4b535f', '#6b7581'),
    wing: ramp('#2a2620', '#4a443a', '#6e6656', '#958b75'),
  }),
  // A goblin of the forest: the same grey-green hide, a jerkin of dark red leather, a scimitar of
  // dull iron with a grip of wood, and a small round shield of wood.
  skirmisher: materials({
    hide: ramp('#0b0f0a', '#141b12', '#1f281b', '#2b3725', '#384630', '#46553b'),
    belly: ramp('#10140d', '#1b2116', '#272f20', '#343e2b', '#424d36'),
    horn: ramp('#1c1a14', '#3a352a', '#5a5242', '#7e745e'),
    claw: ramp('#16130f', '#332d24', '#554c3d', '#7b705a'),
    eye: ramp('#ffb81a', '#ffd84a', '#fff09a'),
    mouth: ramp('#050203', '#120405', '#22090a'),
    cloth: ramp('#100707', '#1e0d0b', '#2e1510', '#3f1e16', '#50281c'),
    wood: ramp('#0c0806', '#1a110b', '#291b11', '#392618', '#4a311f'),
    metal: ramp('#0f1114', '#1d2026', '#2f343c', '#454c56', '#606a76', '#808a96'),
    wing: ramp('#2a2620', '#4a443a', '#6e6656', '#958b75'),
  }),
  // A bandit: weathered skin, a jerkin of brown leather (cloth), trousers of dark grey wool (belly), a
  // hood, a cape, boots and a belt of near-black leather (horn), a scarf of rust red over the face
  // (wing), a scimitar of dull iron.
  bandit: materials({
    hide: ramp('#1e120c', '#311e14', '#47301f', '#5e412b', '#765438', '#8c6646'),
    belly: ramp('#09090a', '#111113', '#1a1a1c', '#242326', '#2e2d30'),
    horn: ramp('#060505', '#0d0b09', '#15120f', '#1f1a15', '#29231c'),
    claw: ramp('#16130f', '#332d24', '#554c3d', '#7b705a'),
    eye: ramp('#5e5446', '#8c7f68', '#b8a98c'),
    mouth: ramp('#050203', '#120405', '#22090a'),
    cloth: ramp('#0b0907', '#15110d', '#211b14', '#2e261c', '#3c3224', '#4a3e2c'),
    wood: ramp('#0c0806', '#1a110b', '#291b11', '#392618', '#4a311f'),
    metal: ramp('#0f1114', '#1d2026', '#2f343c', '#454c56', '#606a76', '#808a96'),
    wing: ramp('#160705', '#2a0d09', '#40140d', '#561c12', '#6c2517'),
  }),
  // A black wolf with a grey muzzle and belly.
  worg: materials({
    hide: ramp('#060607', '#0d0d0f', '#151518', '#1e1e22', '#28282d', '#33333a'),
    belly: ramp('#121214', '#1d1d20', '#2a2a2e', '#38383d', '#47474d'),
    horn: ramp('#2a261e', '#4a4436', '#6e6652', '#958b72'),
    claw: ramp('#16130f', '#332d24', '#554c3d', '#7b705a'),
    eye: ramp('#ffd03a', '#ffe27a', '#fff4c0'),
    mouth: ramp('#070203', '#160506', '#2a0b0c'),
    cloth: ramp('#0b0806', '#170f0a', '#24180f'),
    wood: ramp('#0e0906', '#1b120c', '#2a1c12'),
    metal: ramp('#0f1115', '#1d2027', '#30353e'),
    wing: ramp('#0a0405', '#160809', '#240d0e'),
  }),
  // A dusky orange-red soldier in iron scale, with a helm and a round shield.
  hobgoblin: materials({
    hide: ramp('#140805', '#220e08', '#33160c', '#461f10', '#5a2915', '#6e331a'),
    belly: ramp('#1a0c07', '#2b140b', '#3e1d10', '#522715', '#66321b'),
    horn: ramp('#1a1210', '#2e201c', '#46302a', '#5e423a'),
    claw: ramp('#16130f', '#332d24', '#554c3d', '#7b705a'),
    eye: ramp('#ff4a14', '#ff8a30', '#ffc070'),
    mouth: ramp('#050203', '#120405', '#22090a'),
    cloth: ramp('#12070a', '#200c10', '#311216', '#43191c', '#562023'),
    wood: ramp('#0e0906', '#1b120c', '#2a1c12', '#3a2819', '#4b3420'),
    metal: ramp('#0e1013', '#1b1e24', '#2c3139', '#424955', '#5d6674', '#7e8896'),
    wing: ramp('#1c120a', '#2e1e10', '#422c18', '#583b21'),
  }),
  // A big brown bugbear: shaggy fur, a bear's snout, a mace with iron spikes.
  bugbear: materials({
    hide: ramp('#0e0906', '#1a110b', '#271a10', '#352316', '#442d1c', '#543823', '#64432a'),
    belly: ramp('#140d08', '#21160e', '#2f2014', '#3e2b1b', '#4e3722'),
    horn: ramp('#241f17', '#41392c', '#635845', '#887b61'),
    claw: ramp('#16130f', '#332d24', '#554c3d', '#7b705a'),
    eye: ramp('#ff6a1a', '#ffa03a', '#ffd27a'),
    mouth: ramp('#050203', '#120405', '#22090a'),
    cloth: ramp('#0b0806', '#170f0a', '#24180f', '#322115', '#402b1b'),
    wood: ramp('#0e0906', '#1b120c', '#2a1c12', '#3a2819', '#4b3420', '#5c4028'),
    metal: ramp('#0f1115', '#1d2027', '#30353e', '#474e59', '#646d7a', '#8a94a2'),
    wing: ramp('#0a0405', '#160809', '#240d0e'),
  }),
  // The Devastator: the hide of a hobgoblin, a robe of black and wine with a hood, a staff of dark
  // wood, and an ember at its top (the eye material: it glows above the darkness, as the eyes do).
  devastator: materials({
    hide: ramp('#140805', '#220e08', '#33160c', '#461f10', '#5a2915', '#6e331a'),
    belly: ramp('#1a0c07', '#2b140b', '#3e1d10', '#522715', '#66321b'),
    horn: ramp('#1a1210', '#2e201c', '#46302a', '#5e423a'),
    claw: ramp('#16130f', '#332d24', '#554c3d', '#7b705a'),
    eye: ramp('#ff4a14', '#ff8a30', '#ffc070'),
    mouth: ramp('#050203', '#120405', '#22090a'),
    cloth: ramp('#08060a', '#100b12', '#1a111c', '#261626', '#341c30', '#43223a'),
    wood: ramp('#1a120a', '#2e2012', '#44301b', '#5c4226', '#765632', '#8e6a3e'),
    metal: ramp('#0e1013', '#1b1e24', '#2c3139', '#424955', '#5d6674', '#7e8896'),
    wing: ramp('#2a0a0e', '#4a1218', '#6a1c22', '#86262c'),
  }),
  // The cinder hound: grey as cold ash, darker on the belly, with embers (the eye material) in its back.
  hound: materials({
    hide: ramp('#0e0d0d', '#1a1817', '#262321', '#34302d', '#433e3a', '#544e49'),
    belly: ramp('#0a0909', '#141211', '#1e1b19', '#2a2623'),
    horn: ramp('#2a261e', '#4a4436', '#6e6652'),
    claw: ramp('#16130f', '#332d24', '#554c3d'),
    eye: ramp('#ff5a14', '#ff8a30', '#ffc070'),
    mouth: ramp('#070203', '#1c0605', '#3a0e08'),
    cloth: ramp('#0b0806', '#170f0a', '#24180f'),
    wood: ramp('#0e0906', '#1b120c', '#2a1c12'),
    metal: ramp('#0f1115', '#1d2027', '#30353e'),
    wing: ramp('#0a0405', '#160809', '#240d0e'),
  }),
  // A watcher of the Seekers: a robe of charcoal, a sash of dark red, a mask of bone.
  watcher: materials({
    hide: ramp('#140c08', '#24160e', '#382316', '#4c301f', '#603e28'),
    belly: ramp('#1a100b', '#2a1a12', '#3e281b'),
    horn: ramp('#2e2a24', '#56503f', '#847b66', '#b0a78e', '#d2c9ae'),
    claw: ramp('#16130f', '#332d24', '#554c3d'),
    eye: ramp('#ff6a1a', '#ffa03a', '#ffd27a'),
    mouth: ramp('#050203', '#120405', '#22090a'),
    cloth: ramp('#070707', '#0f0e0e', '#191717', '#242120', '#302c2a', '#3c3734'),
    wood: ramp('#0e0906', '#1b120c', '#2a1c12'),
    metal: ramp('#0e1013', '#1b1e24', '#2c3139', '#424955'),
    wing: ramp('#1e0608', '#360c0e', '#521416', '#6c1c1c'),
  }),
  // A blade of the Seekers: a robe of ash grey, a sash of rust red, a mask of bone, a bright blade.
  seeker: materials({
    hide: ramp('#140c08', '#24160e', '#382316', '#4c301f', '#603e28'),
    belly: ramp('#1a100b', '#2a1a12', '#3e281b'),
    horn: ramp('#2e2a24', '#56503f', '#847b66', '#b0a78e', '#d2c9ae'),
    claw: ramp('#16130f', '#332d24', '#554c3d'),
    eye: ramp('#ff6a1a', '#ffa03a', '#ffd27a'),
    mouth: ramp('#050203', '#120405', '#22090a'),
    cloth: ramp('#0c0b0b', '#181615', '#252220', '#34302d', '#443f3b', '#554f4a'),
    wood: ramp('#0e0906', '#1b120c', '#2a1c12', '#3a2819'),
    metal: ramp('#0e1013', '#1b1e24', '#2c3139', '#424955', '#5d6674', '#8a94a2'),
    wing: ramp('#240a06', '#40120a', '#5e1c0e', '#7a2812'),
  }),
  // A cinder adept: the robe of a blade, a staff of black wood, and an ember at its top.
  adept: materials({
    hide: ramp('#140c08', '#24160e', '#382316', '#4c301f', '#603e28'),
    belly: ramp('#1a100b', '#2a1a12', '#3e281b'),
    horn: ramp('#2e2a24', '#56503f', '#847b66', '#b0a78e', '#d2c9ae'),
    claw: ramp('#16130f', '#332d24', '#554c3d'),
    eye: ramp('#ff7a1a', '#ffb03a', '#ffe08a'),
    mouth: ramp('#050203', '#120405', '#22090a'),
    cloth: ramp('#0e0c0b', '#1b1816', '#2a2522', '#3a3430', '#4b443f'),
    wood: ramp('#070605', '#100d0b', '#1a1512', '#251e19'),
    metal: ramp('#0e1013', '#1b1e24', '#2c3139', '#424955'),
    wing: ramp('#2e0c04', '#521a08', '#76280c', '#9a3a12'),
  }),
  // The Ash Warden: a robe of black, a mantle of crimson, a mask and a crest of bone.
  warden: materials({
    hide: ramp('#140c08', '#24160e', '#382316', '#4c301f', '#603e28'),
    belly: ramp('#1a100b', '#2a1a12', '#3e281b'),
    horn: ramp('#2e2a24', '#56503f', '#847b66', '#b0a78e', '#d2c9ae', '#e8e0c8'),
    claw: ramp('#16130f', '#332d24', '#554c3d'),
    eye: ramp('#ff3a10', '#ff6a20', '#ffa060'),
    mouth: ramp('#050203', '#120405', '#22090a'),
    cloth: ramp('#050505', '#0b0a0a', '#131111', '#1c1919', '#262222'),
    wood: ramp('#0e0906', '#1b120c', '#2a1c12'),
    metal: ramp('#0c0d10', '#181a1f', '#272b32', '#3b414b', '#565e6a', '#7c8592'),
    wing: ramp('#1c0204', '#380608', '#580c0e', '#781414', '#962020'),
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

// ---------------------------------------------------------------- the goblin, the hobgoblin and the bugbear

/** What makes one humanoid of the band different from the others (humanoid()). */
interface Build {
  /** The height of the hips, the chest and the shoulders (model pixels). */
  readonly hip: number;
  readonly chest: number;
  /** Half the width of the shoulders, and the thickness of the limbs. */
  readonly shoulders: number;
  readonly limb: number;
  /** The radius of the head, and its kind: big ears (goblin), a heavy jaw (hobgoblin), a bear's snout (bugbear). */
  readonly head: number;
  readonly face: 'goblin' | 'hobgoblin' | 'bugbear' | 'mask' | 'hood';
  /** The length of the arms, as a share of the length of the legs. */
  readonly arms: number;
  /** A hunch: the chest forward of the hips (model pixels). */
  readonly hunch: number;
  readonly weapon: 'bow' | 'sword' | 'mace' | 'staff' | 'scimitar' | 'none';
  readonly shield?: boolean;
  /** The size of the shield, as a share of the round shield of the hobgoblin (1: that size). */
  readonly shieldSize?: number;
  /** A helm and a coat of scale (the hobgoblin). */
  readonly armour?: boolean;
  /** Tufts of fur on the shoulders, the back and the arms (the bugbear). */
  readonly fur?: boolean;
  /** A long robe to the feet, and a hood in place of the helm (the Devastator). */
  readonly robe?: boolean;
  /** A crest of bone on the mask, swept back as the wings of a phoenix (the Ash Warden). */
  readonly crest?: boolean;
  /** Clothes over all of the body: a jerkin with sleeves, trousers, and boots and a belt of leather (horn) (the bandit). */
  readonly clothed?: boolean;
}

const GOBLIN: Build = { hip: 6.6, chest: 10.4, shoulders: 2.1, limb: 0.75, head: 2.3, face: 'goblin', arms: 1.0, hunch: 1.0, weapon: 'bow' };
const HOBGOBLIN: Build = { hip: 10.2, chest: 16.4, shoulders: 3.6, limb: 1.15, head: 2.4, face: 'hobgoblin', arms: 0.95, hunch: 0.2, weapon: 'sword', shield: true, armour: true };
const BUGBEAR: Build = { hip: 12.0, chest: 19.6, shoulders: 4.9, limb: 1.7, head: 3.0, face: 'bugbear', arms: 1.15, hunch: 1.4, weapon: 'mace', fur: true };
const DEVASTATOR: Build = { hip: 10.0, chest: 16.0, shoulders: 3.4, limb: 1.1, head: 2.4, face: 'hobgoblin', arms: 0.95, hunch: 0.6, weapon: 'staff', robe: true };
const SEEKER: Build = { hip: 10.0, chest: 15.8, shoulders: 3.3, limb: 1.05, head: 2.3, face: 'mask', arms: 0.95, hunch: 0.3, weapon: 'sword', robe: true };
const WATCHER: Build = { hip: 9.8, chest: 15.4, shoulders: 3.0, limb: 0.95, head: 2.2, face: 'mask', arms: 0.95, hunch: 0.1, weapon: 'none', robe: true };
const ADEPT: Build = { ...SEEKER, hunch: 0.5, weapon: 'staff' };
const WARDEN: Build = { hip: 10.6, chest: 17.0, shoulders: 3.7, limb: 1.15, head: 2.4, face: 'mask', arms: 1.0, hunch: 0.2, weapon: 'sword', robe: true, crest: true };
/** The goblin of the forest: the goblin's body, a scimitar in the right hand and a small round shield on the left arm. */
const SKIRMISHER: Build = { ...GOBLIN, hunch: 0.9, weapon: 'scimitar', shield: true, shieldSize: 0.55 };
/** The bandit: a man in a hood and a scarf, in clothes of leather, with a scimitar. */
const BANDIT: Build = { hip: 10.0, chest: 15.6, shoulders: 3.2, limb: 1.0, head: 2.3, face: 'hood', arms: 0.95, hunch: 0.3, weapon: 'scimitar', clothed: true };

/**
 * A humanoid of the hobgoblin band. The legs walk as the imp's do; the arms rest, wind up and
 * strike with the weapon. The goblin draws its bow in the wind-up and looses in the blow; the
 * hobgoblin lifts its sword and cuts down; the bugbear swings its mace over its head.
 */
function humanoid(pose: MobPose, b: Build): Part[] {
  const m = new Model();
  const { phase, walk, windup, strike } = pose;
  const kneel = Math.min(1, pose.death / 0.35);
  const thigh = b.hip * 0.5;
  const shin = b.hip * 0.52;
  const low = pose.crouch ?? 0;
  // A struggle: it leans in, its knees bent, one foot forward and one back.
  const grapple = pose.grapple ?? 0;
  const crouch = (b.weapon === 'bow' ? 0.25 * windup : 0.3 * windup + 0.15 * strike) + 1.5 * low + 0.55 * grapple;
  const legs: Leg[] = [-1, 1].map((side) => {
    const p = phase + (side < 0 ? 0 : Math.PI);
    const swing = 0.5 * walk * Math.sin(p);
    const theta = 0.15 + swing + 0.5 * crouch + 1.1 * kneel + (b.weapon === 'bow' ? 0 : 0.3 * strike * (side < 0 ? 1 : -0.3)) + grapple * (side < 0 ? 0.35 : -0.75);
    const hip: Vec3 = [side * b.shoulders * 0.45, b.hip, -0.3];
    const knee = add(hip, [side * 0.15, -thigh * Math.cos(theta), thigh * Math.sin(theta)]);
    const phi = theta - 0.45 - 0.5 * walk * Math.max(0, Math.cos(p)) - 0.6 * crouch - 2.2 * kneel;
    const ankle = add(knee, [0, -shin * Math.cos(phi), shin * Math.sin(phi)]);
    const toe = add(ankle, [side * 0.1, -0.5, b.limb * 1.6 * (1 - kneel) + 0.3]);
    return { hip, knee, ankle, toe };
  });
  const lift = -Math.min(...legs.map((l) => Math.min(l.ankle[1] - b.limb * 0.7, l.toe[1] - b.limb * 0.5, l.knee[1] - b.limb)));
  const up = (v: Vec3): Vec3 => [v[0], v[1] + lift, v[2]];
  const legMaterial = b.armour ? MM.cloth : b.clothed ? MM.belly : MM.hide;
  for (const leg of legs) {
    m.chain([up(leg.hip), up(leg.knee), up(leg.ankle)], [b.limb * 1.25, b.limb, b.limb * 0.8], legMaterial);
    m.cone(up(leg.ankle), up(leg.toe), b.limb * 0.85, b.limb * 0.6, b.armour ? MM.metal : b.clothed ? MM.horn : MM.hide);
    // Boots to the middle of the shin.
    if (b.clothed) m.cone(up(leg.ankle), up(mix(leg.ankle, leg.knee, 0.55)), b.limb * 0.92, b.limb * 0.98, MM.horn);
  }

  // The body leans forward with the hunch, back in a wind-up, forward in the blow.
  const bob = 0.35 * walk * Math.abs(Math.sin(phase));
  const lean = b.hunch + (b.weapon === 'bow' ? 0 : -0.8 * windup + 1.8 * strike) + 3.4 * low + 3.0 * grapple;
  const pelvis = up([0, b.hip + 0.6 + bob, 0]);
  const chest = up([0, b.chest + bob - 0.2 * strike, lean]);
  const torso = b.armour ? MM.metal : b.weapon === 'bow' || b.face === 'mask' || b.clothed ? MM.cloth : MM.hide;
  m.cone(pelvis, chest, b.shoulders * 0.75, b.shoulders * 0.95, torso);
  m.ellipsoid(add(mix(pelvis, chest, 0.25), [0, 0, 0.2]), [b.shoulders * 0.85, b.limb * 1.2, b.shoulders * 0.6], b.armour ? MM.cloth : MM.cloth);
  if (b.armour) {
    // A coat of scale over a red tunic: rows of plates on the chest.
    for (let row = 0; row < 3; row++) m.ellipsoid(add(mix(pelvis, chest, 0.4 + row * 0.22), [0, 0, b.shoulders * 0.55]), [b.shoulders * 0.8, b.limb * 0.5, 0.45], MM.metal);
  }
  if (b.fur) {
    for (const [x, y, z] of [[-3.2, 0.6, -1.4], [3.2, 0.6, -1.4], [0, 1.0, -2.6], [-1.6, -2.2, -2.8], [1.8, -2.6, -2.6]] as const) {
      m.ellipsoid(add(chest, [x, y, z]), [2.2, 2.0, 1.6], MM.hide);
    }
  }
  for (const side of [-1, 1]) m.sphere(add(chest, [side * b.shoulders, 0.2, -0.2]), b.limb * 1.3, b.armour ? MM.metal : b.robe || b.clothed ? MM.cloth : MM.hide);
  if (b.clothed) {
    // A belt of dark leather with a pouch, a strap across the chest, and a short cape on the back.
    m.ellipsoid(add(pelvis, [0, 0.5, 0.1]), [b.shoulders * 0.82, b.limb * 0.45, b.shoulders * 0.62], MM.horn);
    m.ellipsoid(add(pelvis, [b.shoulders * 0.55, 0.0, b.shoulders * 0.45]), [0.9, 1.0, 0.6], MM.horn);
    m.cone(add(chest, [-b.shoulders * 0.7, 0.2, b.shoulders * 0.45]), add(mix(pelvis, chest, 0.3), [b.shoulders * 0.6, 0, b.shoulders * 0.55]), 0.35, 0.35, MM.horn);
    m.ellipsoid(add(chest, [0, -1.6, -b.shoulders * 0.62]), [b.shoulders * 1.05, 3.2, 0.6], MM.horn);
  }
  if (b.robe) {
    // A robe from the chest to the feet, wide at the hem, with a band of wine at the waist.
    m.cone(add(chest, [0, -1.0, 0]), up([0, b.limb * 0.6, lean * 0.3]), b.shoulders * 0.9, b.shoulders * 1.12, MM.cloth);
    m.ellipsoid(add(pelvis, [0, 0.4, 0.1]), [b.shoulders * 1.0, b.limb * 0.55, b.shoulders * 0.75], MM.wing);
  }

  // The head.
  const head = add(chest, [0, b.head * 1.25 + b.limb * 0.6 - 0.4 * grapple, 0.6 + b.hunch * 0.4 - 0.4 * windup + 0.7 * grapple]);
  const eye = pose.death > 0.2 ? MM.mouth : MM.eye;
  m.sphere(head, b.head, MM.hide);
  if (b.face === 'goblin') {
    // A long hooked nose, a wide mouth, and long ears out to the sides.
    m.cone(add(head, [0, 0.1, b.head * 0.8]), add(head, [0, -0.7, b.head * 1.45]), 0.55, 0.3, MM.hide);
    m.ellipsoid(add(head, [0, -b.head * 0.55, b.head * 0.75]), [1.1, 0.18, 0.3], MM.mouth);
    for (const side of [-1, 1]) {
      m.sphere(add(head, [side * 0.8, 0.35, b.head * 0.78]), 0.45, eye);
      m.cone(add(head, mirror([b.head * 0.8, 0.4, -0.1], side)), add(head, mirror([b.head * 2.1, 1.0, -0.6], side)), 0.55, 0.1, MM.hide);
    }
  } else if (b.face === 'hobgoblin') {
    // A flat face with a heavy jaw, under an iron helm with a crest and cheek plates.
    m.ellipsoid(add(head, [0, -b.head * 0.55, b.head * 0.45]), [b.head * 0.85, b.head * 0.5, b.head * 0.6], MM.hide);
    m.ellipsoid(add(head, [0, -b.head * 0.55, b.head * 0.98]), [0.9, 0.16, 0.25], MM.mouth);
    for (const side of [-1, 1]) m.sphere(add(head, [side * 0.8, 0.05, b.head * 0.82]), 0.42, eye);
    if (b.robe) {
      // A deep hood over the head and the shoulders, open in front.
      m.ellipsoid(add(head, [0, b.head * 0.3, -0.5]), [b.head * 1.2, b.head * 1.1, b.head * 1.05], MM.cloth);
      m.cone(add(head, [0, b.head * 0.9, -0.9]), add(head, [0, b.head * 1.6, -2.4]), b.head * 0.55, 0.2, MM.cloth);
    } else {
      m.ellipsoid(add(head, [0, b.head * 0.35, -0.1]), [b.head * 1.08, b.head * 0.75, b.head * 1.08], MM.metal);
      m.ellipsoid(add(head, [0, b.head * 1.05, -0.3]), [0.35, b.head * 0.45, b.head * 0.95], MM.cloth);
      for (const side of [-1, 1]) m.ellipsoid(add(head, [side * b.head * 0.85, -b.head * 0.25, 0.3]), [0.3, b.head * 0.6, b.head * 0.55], MM.metal);
    }
  } else if (b.face === 'mask') {
    // A deep hood, and in it a mask of bone with ember eyes and the red phoenix on its brow.
    m.ellipsoid(add(head, [0, b.head * 0.3, -0.5]), [b.head * 1.2, b.head * 1.1, b.head * 1.05], MM.cloth);
    m.cone(add(head, [0, b.head * 0.9, -0.9]), add(head, [0, b.head * 1.5, -2.2]), b.head * 0.5, 0.2, MM.cloth);
    m.ellipsoid(add(head, [0, -b.head * 0.1, b.head * 0.72]), [b.head * 0.78, b.head * 0.95, b.head * 0.42], MM.horn);
    for (const side of [-1, 1]) m.sphere(add(head, [side * 0.75, 0.15, b.head * 1.02]), 0.36, eye);
    for (const side of [-1, 1]) m.cone(add(head, [0, b.head * 0.42, b.head * 1.1]), add(head, [side * 0.9, b.head * 0.8, b.head * 1.0]), 0.22, 0.08, MM.wing);
    if (b.crest) {
      // The crest: three blades of bone from the brow, up and back, as wings that rise.
      for (const side of [-1, 0, 1]) m.cone(add(head, [side * 0.7, b.head * 0.7, b.head * 0.6]), add(head, [side * 2.2, b.head * 2.1, -b.head * 0.6]), 0.45, 0.08, MM.horn);
    }
  } else if (b.face === 'hood') {
    // A man's face in a deep hood of leather, and a scarf of rust red over the nose and the mouth, its
    // ends down the back: a robber of the road.
    m.ellipsoid(add(head, [0, b.head * 0.3, -0.4]), [b.head * 1.15, b.head * 1.08, b.head * 1.05], MM.horn);
    m.cone(add(head, [0, b.head * 0.85, -0.8]), add(head, [0, b.head * 1.25, -2.0]), b.head * 0.45, 0.2, MM.horn);
    m.ellipsoid(add(head, [0, 0.15, b.head * 0.62]), [b.head * 0.72, b.head * 0.42, b.head * 0.55], MM.hide);
    for (const side of [-1, 1]) m.sphere(add(head, [side * 0.72, 0.25, b.head * 0.95]), 0.3, eye);
    m.ellipsoid(add(head, [0, -b.head * 0.48, b.head * 0.42]), [b.head * 0.98, b.head * 0.58, b.head * 0.72], MM.wing);
    m.cone(add(head, [0.5, -b.head * 0.6, -b.head * 0.55]), add(head, [1.0, -b.head * 1.9, -b.head * 1.15]), 0.55, 0.25, MM.wing);
  } else {
    // A bear's head: a broad snout with a dark nose, small round ears, shaggy cheeks.
    m.ellipsoid(add(head, [0, -b.head * 0.35, b.head * 0.85]), [b.head * 0.55, b.head * 0.45, b.head * 0.6], MM.belly);
    m.sphere(add(head, [0, -b.head * 0.15, b.head * 1.38]), 0.55, MM.mouth);
    m.ellipsoid(add(head, [0, -b.head * 0.7, b.head * 1.05]), [0.9, 0.16 + 0.3 * strike, 0.3], MM.mouth);
    for (const side of [-1, 1]) {
      m.sphere(add(head, [side * 1.0, 0.35, b.head * 0.78]), 0.5, eye);
      m.sphere(add(head, [side * b.head * 0.75, b.head * 0.85, -0.2]), b.head * 0.32, MM.hide);
      m.ellipsoid(add(head, [side * b.head * 0.85, -b.head * 0.35, 0]), [b.head * 0.45, b.head * 0.55, b.head * 0.6], MM.hide);
    }
  }

  // The arms. The right hand (+x) holds the weapon; the left holds the bow or the shield.
  const armLen = b.hip * 0.5 * b.arms;
  const hands: Record<number, Vec3> = {};
  for (const side of [-1, 1]) {
    const p = phase + (side < 0 ? Math.PI : 0);
    const shoulder = add(chest, [side * b.shoulders, -0.2, -0.2]);
    const sway = walk * Math.sin(p);
    let elbowD: Vec3;
    let wristD: Vec3;
    if (b.weapon === 'bow') {
      // The left arm holds the bow out in front; the right draws the string back to the chin.
      const rest = { elbow: [side * 0.4, -armLen, 0.6 + 0.8 * sway] as Vec3, wrist: [side * -0.1, -armLen * 0.9, 1.0 + 0.9 * sway] as Vec3 };
      const aim =
        side < 0
          ? { elbow: [0.2, 0.2, armLen * 0.95] as Vec3, wrist: [0.2, 0.1, armLen * 0.95] as Vec3 }
          : { elbow: [0.5, 0.0, armLen * 0.7] as Vec3, wrist: [-1.4, 0.4, -armLen * 0.35 + 1.2 * (1 - windup)] as Vec3 };
      const loose = side < 0 ? aim : { elbow: [0.9, 0.2, -armLen * 0.2] as Vec3, wrist: [0.6, 0.2, -armLen * 0.6] as Vec3 };
      const ready = Math.max(windup, strike > 0 ? 1 : 0);
      elbowD = mix(mix(rest.elbow, aim.elbow, ready), loose.elbow, strike);
      wristD = mix(mix(rest.wrist, aim.wrist, ready), loose.wrist, strike);
    } else if (side < 0 && b.shield) {
      // The shield arm: across the body, the shield in front.
      elbowD = [-0.6, -armLen * 0.7, armLen * 0.45];
      wristD = [0.9, 0.1, armLen * 0.6 + 0.3 * windup];
    } else if (side > 0 || b.weapon === 'mace') {
      // The weapon arm (both arms for the mace): down at rest, up and back in the wind-up, down in front in the blow.
      const rest = { elbow: [side * 0.6, -armLen, 0.5 + 0.9 * sway] as Vec3, wrist: [side * -0.2, -armLen * 0.95, 1.1 + 1.0 * sway] as Vec3 };
      const raised = { elbow: [side * 0.9 - (b.weapon === 'mace' ? 0.6 : 0), armLen * 0.75, -armLen * 0.35] as Vec3, wrist: [side * -0.5 - (b.weapon === 'mace' ? 0.6 : 0), armLen * 0.8, armLen * 0.1] as Vec3 };
      const smash = { elbow: [side * -0.4, -armLen * 0.3, armLen * 0.85] as Vec3, wrist: [side * -0.9, -armLen * 0.45, armLen * 0.8] as Vec3 };
      elbowD = mix(mix(rest.elbow, raised.elbow, windup), smash.elbow, strike);
      wristD = mix(mix(rest.wrist, raised.wrist, windup), smash.wrist, strike);
    } else {
      elbowD = [side * 0.6, -armLen, 0.5 + 0.9 * sway];
      wristD = [side * -0.2, -armLen * 0.95, 1.1 + 1.0 * sway];
    }
    if (grapple > 0) {
      // A struggle: both arms out in front at the chest, the hands (and the shield) on the foe.
      const k = Math.min(1, grapple);
      elbowD = mix(elbowD, [side * -0.2, -armLen * 0.25, armLen * 0.8], k);
      wristD = mix(wristD, [side * -0.35, armLen * 0.15, armLen * 0.8], k);
    }
    const elbow = add(shoulder, elbowD);
    const wrist = add(elbow, wristD);
    m.chain([shoulder, elbow, wrist], [b.limb * 1.1, b.limb * 0.95, b.limb * 0.85], b.fur ? MM.hide : b.armour || b.robe || b.clothed ? MM.cloth : MM.hide);
    if (b.armour) m.cone(elbow, mix(elbow, wrist, 0.85), b.limb * 1.05, b.limb * 0.95, MM.metal);
    m.sphere(wrist, b.limb * 0.95, MM.hide);
    hands[side] = wrist;
  }

  const grip = hands[1]!;
  const off = hands[-1]!;
  if (b.weapon === 'none') {
    // No weapon: the hands rest in the sleeves.
  } else if (b.weapon === 'bow') {
    // A short bow, upright in the left hand, its string to the right hand while it draws.
    const top = add(off, [0, 5.2, -0.9]);
    const bottom = add(off, [0, -5.2, -0.9]);
    m.chain([bottom, add(off, [0, -2.8, 0.7]), off, add(off, [0, 2.8, 0.7]), top], [0.38, 0.48, 0.55, 0.48, 0.38], MM.wood);
    const nock = windup > 0.05 && strike === 0 ? grip : add(off, [0, 0, -1.0]);
    m.cone(top, nock, 0.1, 0.1, MM.horn);
    m.cone(nock, bottom, 0.1, 0.1, MM.horn);
    if (windup > 0.05 && strike === 0) m.cone(grip, add(off, [0, 0, 1.6]), 0.14, 0.12, MM.wood);
    // A quiver on the back.
    m.cone(add(chest, [-0.8, -2.6, -1.8]), add(chest, [1.2, 2.2, -2.4]), 0.85, 0.95, MM.cloth);
    for (const k of [-0.4, 0.3]) m.cone(add(chest, [1.2 + k, 2.2, -2.4]), add(chest, [1.6 + k, 3.6, -2.6]), 0.12, 0.12, MM.wing);
  } else {
    // The weapon points down at rest, back over the shoulder in the wind-up, forward and down in the
    // blow. A staff stands upright at rest, and goes high over the head in the wind-up (and the rite).
    const staff = b.weapon === 'staff';
    const hang: Vec3 = staff ? [0.2, 8, 1.0] : [0.4, -6, 3.8];
    const back: Vec3 = staff ? [-0.3, 8, -2.4] : [-0.4, 4, -7.5];
    const down: Vec3 = staff ? [-0.4, -4, 8] : [-0.4, -6.5, 7];
    // In a struggle the blade points up and back, out of the way of the push.
    const held: Vec3 = [1.2, 6, -2.5];
    const along = mix(mix(mix(hang, back, windup), down, strike), held, Math.min(1, grapple));
    const n = Math.hypot(...along);
    const dir: Vec3 = [along[0] / n, along[1] / n, along[2] / n];
    const at = (k: number): Vec3 => add(grip, [dir[0] * k, dir[1] * k, dir[2] * k]);
    if (b.weapon === 'sword') {
      m.cone(at(-1.2), at(0.6), 0.45, 0.45, MM.wood);
      m.cone(at(0.6), at(0.9), 1.3, 1.3, MM.metal);
      m.cone(at(0.9), at(8.6), 0.6, 0.15, MM.metal);
    } else if (b.weapon === 'scimitar') {
      // A short curved blade: wide near its tip, and bent back from the edge (a goblin's scimitar).
      // The bend: across the blade, level (the blade's direction crossed with up).
      const across = Math.hypot(dir[2], dir[0]) || 1;
      const bend: Vec3 = [-dir[2] / across, 0, dir[0] / across];
      const curve = (k: number, off: number): Vec3 => add(at(k), [bend[0] * off, bend[1] * off, bend[2] * off]);
      m.cone(at(-1.0), at(0.5), 0.4, 0.4, MM.wood);
      m.cone(at(0.5), at(0.75), 1.0, 1.0, MM.metal);
      m.chain([at(0.75), curve(3.4, 0.35), curve(5.6, 0.9), curve(7.0, 1.6)], [0.45, 0.6, 0.55, 0.12], MM.metal);
    } else if (staff) {
      // A staff of dark wood, taller than its bearer, with an ember in an iron claw at its top.
      m.cone(at(-7.5), at(13.4), 0.6, 0.5, MM.wood);
      const top = at(14.6);
      for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) m.cone(at(13.2), add(top, [x * 1.3, 0.9, z * 1.3]), 0.3, 0.12, MM.metal);
      m.sphere(top, 1.1, MM.eye);
    } else {
      m.cone(at(-1.4), at(9), 0.8, 0.95, MM.wood);
      const head = at(10.4);
      m.sphere(head, 2.2, MM.metal);
      for (const [x, y, z] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const) m.cone(head, add(head, [x * 3.4, y * 3.4, z * 3.4]), 0.55, 0.08, MM.metal);
    }
  }
  if (b.shield) {
    // A round shield of wood with an iron rim and boss, on the left forearm.
    const k = b.shieldSize ?? 1;
    const centre = add(off, [-0.4 * k, 0.4 * k, 1.0 * k]);
    m.ellipsoid(centre, [3.4 * k, 3.6 * k, 0.5], MM.wood);
    m.ellipsoid(add(centre, [0, 0, 0.35]), [1.0 * k, 1.0 * k, 0.45], MM.metal);
    m.cone(add(centre, [-3.2 * k, 0, 0]), add(centre, [3.2 * k, 0, 0]), 0.3, 0.3, MM.metal);
  }
  return m.parts;
}

// ---------------------------------------------------------------- the worg

/**
 * The worg: a big black wolf on four legs, its body along z (the head to the front). Its legs
 * walk in a trot; in the wind-up it crouches with its head low; in the blow it leaps with its jaws
 * open and its front legs out.
 */
function worg(pose: MobPose, embers = false): Part[] {
  const m = new Model();
  const { phase, walk, windup, strike } = pose;
  const kneel = Math.min(1, pose.death / 0.35);
  const crouch = 0.7 * windup;
  const stretch = strike;
  const bodyY = 8.4 - 1.6 * crouch + 1.4 * stretch - 3.5 * kneel;
  const bob = 0.4 * walk * Math.abs(Math.sin(phase));
  const front: Vec3 = [0, bodyY + 0.6 + bob, 4.4 + 1.6 * stretch];
  const back: Vec3 = [0, bodyY + bob + 0.4 * crouch, -4.6];
  // The legs: front and back, a trot (one front leg with the other back leg).
  for (const end of [1, -1]) {
    for (const side of [-1, 1]) {
      const p = phase + (side * end > 0 ? 0 : Math.PI);
      const swing = walk * Math.sin(p);
      const reach = end > 0 ? 2.2 * stretch : -1.6 * stretch;
      const top = add(end > 0 ? front : back, [side * 2.2, -0.8, end > 0 ? -0.6 : 0.4]);
      const foot: Vec3 = [side * 2.0, 0.6, top[2] + 1.8 * swing + reach + (end > 0 ? 0.6 : -0.6) * crouch];
      const knee = add(mix(top, foot, 0.5), [0, 0.4 * walk * Math.max(0, Math.cos(p)) + 1.6 * stretch * (end > 0 ? 1 : 0), end > 0 ? -1.0 : 1.4]);
      m.chain([top, knee, foot], [1.35, 0.85, 0.6], MM.hide);
      m.ellipsoid(add(foot, [0, -0.1, 0.5]), [0.75, 0.45, 1.0], MM.hide);
    }
  }
  // The body: a deep chest and a lean waist, with a ruff of fur.
  m.cone(back, front, 2.6, 3.4, MM.hide);
  m.ellipsoid(add(front, [0, -1.6, 0.6]), [2.4, 1.8, 2.4], MM.belly);
  m.ellipsoid(add(front, [0, 1.2, -0.6]), [3.0, 2.2, 2.6], MM.hide);
  // The neck and the head, low in the crouch, out in the leap.
  const head = add(front, [0, 2.6 - 2.8 * crouch - 0.6 * stretch, 3.2 + 1.2 * stretch]);
  m.cone(add(front, [0, 1.0, 0.8]), head, 2.4, 1.8, MM.hide);
  m.sphere(head, 2.0, MM.hide);
  const jaw = 0.25 + 1.3 * stretch + 0.3 * crouch;
  const snout = add(head, [0, -0.3, 2.9]);
  m.cone(add(head, [0, 0.1, 1.0]), snout, 1.25, 0.8, MM.hide);
  m.cone(add(head, [0, -0.8, 1.0]), add(snout, [0, -0.9 - jaw, -0.2]), 0.9, 0.55, MM.belly);
  m.ellipsoid(add(head, [0, -0.6 - jaw * 0.4, 2.2]), [0.7, 0.2 + jaw * 0.35, 1.0], MM.mouth);
  m.sphere(add(snout, [0, 0.3, 0.6]), 0.42, MM.mouth);
  for (const side of [-1, 1]) {
    m.sphere(add(head, [side * 0.85, 0.55, 1.45]), 0.4, pose.death > 0.2 ? MM.mouth : MM.eye);
    m.cone(add(head, [side * 1.0, 1.4, -0.2]), add(head, [side * 1.3, 3.1 - 0.8 * crouch, -0.8 - 0.8 * crouch]), 0.65, 0.1, MM.hide);
  }
  if (embers) {
    // The cinder hound: embers in the cracks of its back and its flanks (they glow as eyes do).
    // On the surface of the body (a cone of radius 2.6 at the back to 3.4 at the front).
    for (const [t, a] of [[0.12, 0], [0.35, 0.5], [0.55, -0.45], [0.8, 0.1], [0.45, 1.35], [0.25, -1.4]] as const) {
      const r = 2.6 + 0.8 * t;
      m.sphere(add(mix(back, front, t), [Math.sin(a) * r, Math.cos(a) * r, 0]), 0.5, MM.eye);
    }
  }
  // The tail: out behind, down in the crouch, up in the leap.
  const tail0 = add(back, [0, 0.6, -2.2]);
  const sway = 0.8 * walk * Math.sin(phase * 2);
  m.chain([tail0, add(tail0, [sway * 0.5, -1.0 - 1.2 * crouch + 1.6 * stretch, -2.6]), add(tail0, [sway, -2.6 - 1.4 * crouch + 2.4 * stretch, -4.6])], [1.0, 1.1, 0.5], MM.hide);
  return m.parts;
}

// ---------------------------------------------------------------- frames

const MODELS: Readonly<Record<MobKind, (pose: MobPose) => Part[]>> = {
  imp: (pose) => scaled(imp(pose), 1.25),
  brute: (pose) => scaled(brute(pose), 1.2),
  goblin: (pose) => scaled(humanoid(pose, GOBLIN), 1.3),
  worg: (pose) => scaled(worg(pose), 1.3),
  hobgoblin: (pose) => scaled(humanoid(pose, HOBGOBLIN), 1.1),
  bugbear: (pose) => scaled(humanoid(pose, BUGBEAR), 1.15),
  devastator: (pose) => scaled(humanoid(pose, DEVASTATOR), 1.12),
  hound: (pose) => scaled(worg(pose, true), 1.05),
  watcher: (pose) => scaled(humanoid(pose, WATCHER), 1.1),
  seeker: (pose) => scaled(humanoid(pose, SEEKER), 1.1),
  adept: (pose) => scaled(humanoid(pose, ADEPT), 1.1),
  warden: (pose) => scaled(humanoid(pose, WARDEN), 1.18),
  skirmisher: (pose) => scaled(humanoid(pose, SKIRMISHER), 1.3),
  bandit: (pose) => scaled(humanoid(pose, BANDIT), 1.12),
};

/** The model of a kind in a pose, with the death's fall. */
export function mobModel(kind: MobKind, pose: MobPose): Part[] {
  const parts = MODELS[kind](pose);
  const d = pose.death;
  const small = kind === 'imp' || kind === 'goblin' || kind === 'skirmisher';
  if (pose.reel) return tilt(parts, -0.24 * pose.reel, 0.06 * pose.reel, 0, small ? -1.5 : -2);
  if (pose.floored !== undefined) {
    // Thrown back after a shove, then over on its back; it does not sink into a heap (it is alive).
    const f = pose.floored;
    return tilt(parts, -0.3 - 1.25 * f * f, 0.12 * f, 1.6 * Math.max(0, (f - 0.5) / 0.5), small ? -1.5 : -2);
  }
  if (pose.rise !== undefined) {
    // From a seat on the ground (tipped back, low), up on bent knees (the model crouches).
    const r = 1 - pose.rise;
    return tilt(parts, -0.75 * r, 0, 1.4 * r, small ? -1.5 : -2);
  }
  if (d <= 0) return parts;
  if (kind === 'worg' || kind === 'hound') {
    // Down on its legs (in the model), then over on its side.
    const fall = Math.max(0, (d - 0.3) / 0.7);
    return tilt(parts, 0, 1.4 * fall * fall, 2.2 * Math.max(0, (d - 0.7) / 0.3), 0);
  }
  if (small) {
    // Thrown back, then over on its back, then it sinks into a heap.
    const fall = Math.min(1, d / 0.7);
    return tilt(parts, -0.25 - 1.3 * fall * fall, 0.25 * fall, 2.2 * Math.max(0, (d - 0.55) / 0.45), -1.5);
  }
  // Down on the knees first (in the model), then over on its face.
  const fall = Math.max(0, (d - 0.3) / 0.7);
  return tilt(parts, 1.45 * fall * fall - 0.1 * Math.min(1, d / 0.3), 0, 3.5 * Math.max(0, (d - 0.7) / 0.3), 4);
}

/** The poses of the animations, in order; a kind of CROUCHING also crouches and creeps. */
export function mobPoses(kind?: MobKind): { name: string; pose: MobPose }[] {
  const out: { name: string; pose: MobPose }[] = [{ name: 'stand', pose: POSE }];
  if (kind && CROUCHING.includes(kind)) {
    out.push({ name: 'crouch', pose: { ...POSE, crouch: 1 } });
    for (let i = 0; i < MOB_ANIMATIONS.creep; i++) out.push({ name: `creep/${i}`, pose: { ...POSE, crouch: 1, walk: 0.55, phase: (i / MOB_ANIMATIONS.creep) * 2 * Math.PI } });
  }
  for (let i = 0; i < MOB_ANIMATIONS.walk; i++) out.push({ name: `walk/${i}`, pose: { ...POSE, walk: 1, phase: (i / MOB_ANIMATIONS.walk) * 2 * Math.PI } });
  out.push({ name: 'windup/0', pose: { ...POSE, windup: 0.55 } }, { name: 'windup/1', pose: { ...POSE, windup: 1 } });
  out.push({ name: 'strike/0', pose: { ...POSE, windup: 0.25, strike: 0.85 } }, { name: 'strike/1', pose: { ...POSE, strike: 1 } });
  out.push({ name: 'hurt', pose: { ...POSE, windup: 0.3, reel: 1 } });
  for (let i = 0; i < MOB_ANIMATIONS.die; i++) out.push({ name: `die/${i}`, pose: { ...POSE, strike: i === 0 ? 0.3 : 0, death: (i + 1) / MOB_ANIMATIONS.die } });
  if (kind && SHOVE_ANIMATED.includes(kind)) {
    // A shove of the sandbox: the struggle (a push, and a harder one), the fall after a lost struggle, the rise.
    out.push({ name: 'struggle/0', pose: { ...POSE, grapple: 0.9 } }, { name: 'struggle/1', pose: { ...POSE, grapple: 1.2 } });
    for (let i = 0; i < MOB_ANIMATIONS.fall; i++) out.push({ name: `fall/${i}`, pose: { ...POSE, floored: (i + 1) / MOB_ANIMATIONS.fall } });
    out.push({ name: 'rise/0', pose: { ...POSE, crouch: 0.85, rise: 0.25 } }, { name: 'rise/1', pose: { ...POSE, crouch: 0.45, rise: 0.75 } });
  }
  return out;
}

/** The size of the shadow of each kind (pixels). */
const SHADOWS: Readonly<Record<MobKind, readonly [number, number]>> = {
  imp: [14, 6],
  brute: [28, 9],
  goblin: [14, 6],
  worg: [30, 9],
  hobgoblin: [20, 7],
  bugbear: [28, 9],
  devastator: [20, 7],
  hound: [24, 8],
  watcher: [18, 7],
  seeker: [20, 7],
  adept: [20, 7],
  warden: [22, 8],
  skirmisher: [14, 6],
  bandit: [20, 7],
};

/**
 * The frames of the mobs, `mob/<kind>/<view>/<pose>` (stand, walk/i, windup/i, strike/i, hurt,
 * die/i; for CROUCHING also crouch and creep/i), their shadows `mob/<kind>/shadow`, and the eye pixels
 * of each frame.
 */
export function mobFrames(): { frames: Frame[]; eyes: Record<string, number[]> } {
  const frames: Frame[] = [];
  const eyes: Record<string, number[]> = {};
  for (const kind of KINDS) {
    const size = MOB_FRAMES[kind];
    const anchor = { x: size.pivotX / size.width, y: size.pivotY / size.height };
    for (const view of VIEWS) {
      for (const { name, pose } of mobPoses(kind)) {
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
    const [sw, sh] = SHADOWS[kind];
    const shadow = new Image(sw, sh);
    shadowEllipse(shadow, shadow.width / 2, shadow.height / 2, shadow.width / 2 - 0.5, shadow.height / 2, 0x80);
    frames.push({ name: `mob/${kind}/shadow`, image: shadow, anchor: { x: 0.5, y: 0.5 } });
  }
  return { frames, eyes };
}
