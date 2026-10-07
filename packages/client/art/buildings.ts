/**
 * Building art: stone walls, the door, the wooden floor, the slate roof pieces and the
 * furniture. Walls, the door and furniture are SDF models in the 'oblique' projection, so they
 * fill whole tiles of the ground grid; floor and roof are 2D, from tiling patterns.
 *
 * Geometry of one tile in model space: x from 0 to 16 (west to east), z from -16 (north) to 0
 * (south), y up. The pivot of every frame here is the tile's south-west corner on the ground,
 * so the client puts a sprite at (tx * 16, (ty + 1) * 16).
 */
import { Image } from './png.ts';
import { TILE, cropToContent, ramp, rgb, tileNoise } from './raster.ts';
import { HEIGHT_SCALE, box, cylinder, intersect, noise3, renderModel, sphere, subtract, union, type Material, type Part, type Sdf, type Vec3 } from './sdf.ts';
import type { Frame } from './sprites.ts';

/** Wall height in model units: 32 pixels on screen, a little taller than the player. */
const WALL_HEIGHT = 32 / HEIGHT_SCALE;
/** Stone courses: 6 per wall height. Stones are 8 units long, half-offset on odd courses. */
const COURSE = WALL_HEIGHT / 6;
const STONE = 8;
/** Joints at least this wide (model units) still show as one pixel line. */
const JOINT = 1.25;
/** The number of variants of each wall piece and roof piece; the client picks one per tile. */
export const PIECE_VARIANTS = 3;

function hash(a: number, b: number, c: number): number {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x61c88647);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- materials

const M = {
  stoneA: 0,
  stoneB: 1,
  stoneC: 2,
  mortar: 3,
  cap: 4,
  moss: 5,
  wood: 6,
  woodDark: 7,
  metal: 8,
  linen: 9,
  wine: 10,
  wax: 11,
  flame: 12,
  bookRed: 13,
  bookGreen: 14,
  bookBlue: 15,
  bookBrown: 16,
} as const;

const MATERIALS: Material[] = [
  { ramp: ramp('#121110', '#1b1917', '#252220', '#302c29', '#3c3833', '#4a453f'), dither: true },
  { ramp: ramp('#141110', '#1f1a17', '#2a231f', '#352d27', '#423830', '#51463c'), dither: true },
  { ramp: ramp('#101113', '#191b1e', '#232529', '#2e3135', '#3a3e43', '#484d53'), dither: true },
  { ramp: ramp('#0a0908', '#100f0e', '#171513', '#1e1b18') },
  { ramp: ramp('#161514', '#211f1d', '#2d2a27', '#3a3632', '#48433e', '#58524b'), dither: true },
  { ramp: ramp('#0c120b', '#121c10', '#192615', '#21311b', '#2b3f22'), dither: true },
  { ramp: ramp('#110c09', '#1b130e', '#261b13', '#32241a', '#3f2e21', '#4d392a') },
  { ramp: ramp('#0b0806', '#130d09', '#1c140e', '#251a12') },
  { ramp: ramp('#101217', '#1f232a', '#333943', '#4b535f', '#6b7581') },
  { ramp: ramp('#1f1d1a', '#2e2b27', '#3f3b35', '#524d45', '#665f55') },
  { ramp: ramp('#14070a', '#260c10', '#3a1216', '#501a1d', '#662325') },
  { ramp: ramp('#4a4436', '#655d4a', '#837a62', '#a0967b') },
  { ramp: ramp('#c8822e', '#f0b04a', '#ffe08a'), bias: 1 },
  { ramp: ramp('#1a0809', '#2e0f11', '#431618', '#582020') },
  { ramp: ramp('#0a120d', '#111f16', '#192c20', '#22392a') },
  { ramp: ramp('#0c0f18', '#141a29', '#1d253a', '#28304a') },
  { ramp: ramp('#160f09', '#24180f', '#332316', '#422e1d') },
];

// ---------------------------------------------------------------- walls

/** The depth of the grooves between stones. */
const GROOVE = 0.7;

function onJoint(x: number, y: number): boolean {
  const course = Math.floor(y / COURSE);
  const offset = course % 2 === 0 ? 0 : STONE / 2;
  const jx = (((x + offset) % STONE) + STONE) % STONE;
  return jx < JOINT || y - course * COURSE < JOINT;
}

function onCapJoint(x: number, z: number): boolean {
  const jx = ((x % STONE) + STONE) % STONE;
  const jz = ((z % STONE) + STONE) % STONE;
  return jx < JOINT || jz < JOINT;
}

/** A wall block on a tile (dx, dz tiles from the centre tile), with masonry carved into it. */
function wallBlock(dx: number, dz: number): Sdf {
  const block = box([dx * TILE, 0, dz * TILE - TILE], [dx * TILE + TILE, WALL_HEIGHT, dz * TILE]);
  const front = dz * TILE;
  return (x, y, z) => {
    let d = block(x, y, z);
    if (d > 2) return d;
    if (z > front - 1.5 && onJoint(x, y)) d += GROOVE;
    else if (y > WALL_HEIGHT - 1.5 && onCapJoint(x, z)) d += GROOVE * 0.7;
    return d + 0.25 * (noise3(x * 0.9, y * 0.9, z * 0.9, 31) - 0.5);
  };
}

/**
 * Material of masonry: stones of three tones, mortar in the joints, moss at the foot. `variant`
 * changes which stone gets which tone, so neighbouring tiles do not repeat one pattern.
 */
function masonryMaterial(variant: number) {
  return (x: number, y: number, z: number, _nx: number, ny: number, nz: number): number => {
    if (ny > 0.6) {
      if (onCapJoint(x, z)) return M.mortar;
      return hash(Math.floor(x / STONE), Math.floor(z / STONE), 7 + variant) < 0.5 ? M.cap : M.stoneA;
    }
    if (nz > 0.6) {
      if (y < 1.5 + 2.5 * noise3(x * 0.5 + variant * 9, 0, z * 0.5, 5)) return M.moss;
      if (onJoint(x, y)) return M.mortar;
      const course = Math.floor(y / COURSE);
      const stone = Math.floor((x + (course % 2 === 0 ? 0 : STONE / 2)) / STONE);
      const pick = hash(course, stone, 3 + variant * 17);
      return pick < 0.45 ? M.stoneA : pick < 0.8 ? M.stoneB : M.stoneC;
    }
    return M.stoneA;
  };
}

/**
 * Renders the centre tile of a small scene and crops it: neighbour blocks in the scene make the
 * outline appear only where the wall really ends.
 */
function wallFrame(name: string, centre: Part[], neighbours: { n: boolean; e: boolean; w: boolean }): Frame {
  const parts: Part[] = [...centre];
  const plain = masonryMaterial(0);
  if (neighbours.n) parts.push({ sdf: wallBlock(0, -1), material: plain });
  if (neighbours.e) parts.push({ sdf: wallBlock(1, 0), material: plain });
  if (neighbours.w) parts.push({ sdf: wallBlock(-1, 0), material: plain });
  const width = 3 * TILE;
  const height = 80;
  const pivotX = TILE;
  const pivotY = height - 8;
  const scene = renderModel(parts, MATERIALS, { width, height, pivotX, pivotY, yaw: 0, projection: 'oblique', stepScale: 0.6 });
  const image = new Image(TILE, 3 * TILE);
  for (let y = 0; y < 3 * TILE; y++) for (let x = 0; x < TILE; x++) image.set(x, y, scene.get(pivotX + x, pivotY - 3 * TILE + y));
  return { name, image, anchor: { x: 0, y: 1 } };
}

/**
 * Wall pieces by neighbour, `wall/<mask>/<variant>`: mask bit 1 = wall to the north, 2 = east,
 * 4 = west.
 */
function wallFrames(): Frame[] {
  const frames: Frame[] = [];
  for (let mask = 0; mask < 8; mask++) {
    for (let variant = 0; variant < PIECE_VARIANTS; variant++) {
      const centre: Part[] = [{ sdf: wallBlock(0, 0), material: masonryMaterial(variant) }];
      frames.push(wallFrame(`wall/${mask}/${variant}`, centre, { n: (mask & 1) !== 0, e: (mask & 2) !== 0, w: (mask & 4) !== 0 }));
    }
  }
  return frames;
}

// The doorway: an arch 8 units wide and about 24 tall, through the whole wall.
const ARCH_CENTRE_Y = 20.5;
const ARCH_RADIUS = 4;
const doorway = union(box([4, -1, -20], [12, ARCH_CENTRE_Y, 2]), cylinder([8, ARCH_CENTRE_Y, -8], 'z', ARCH_RADIUS, 40));

function doorFrames(): Frame[] {
  const nearArch = (x: number, y: number, z: number) => doorway(x, y, z) > -1.6 && doorway(x, y, z) < 1.6 && z > -2;
  const wall: Part = {
    sdf: subtract(wallBlock(0, 0), doorway),
    // Dressed (paler) stones round the arch.
    material: (x, y, z, nx, ny, nz) => (nearArch(x, y, z) && nz > 0.6 ? M.cap : masonryMaterial(0)(x, y, z, nx, ny, nz)),
  };
  // The door leaf: planks in the arch, a little behind the face, with two iron bands and a ring.
  const leaf: Part = {
    sdf: intersect(box([4, 0, -5], [12, ARCH_CENTRE_Y + ARCH_RADIUS, -3.5]), doorway),
    material: (x, y) => {
      if ((y > 5 && y < 6.2) || (y > 15 && y < 16.2)) return M.metal;
      return Math.abs(((x - 4) % 2.67) - 1.33) > 1.1 ? M.woodDark : M.wood;
    },
  };
  const ring: Part = { sdf: sphere([10.2, 11, -3.3], 0.75), material: M.metal };
  const sides = { n: false, e: true, w: true };
  return [wallFrame('wall/door/closed', [wall, leaf, ring], sides), wallFrame('wall/door/open', [wall], sides)];
}

// ---------------------------------------------------------------- floor

const PLANK = ramp('#120d0a', '#1b140f', '#251b14', '#2f2219', '#3a2a1f', '#46342a');

/** Wooden planks running east to west, 4 pixels wide, with board ends at random places. */
function floorTile(variant: number): Image {
  const image = new Image(TILE, TILE);
  for (let row = 0; row < 4; row++) {
    const end = Math.floor(hash(row, variant, 11) * TILE);
    const tone = hash(row, variant, 12) < 0.5 ? 2 : 3;
    for (let y = row * 4; y < row * 4 + 4; y++) {
      for (let x = 0; x < TILE; x++) {
        let shade = tone;
        if (y === row * 4) shade = 0; // the gap between two boards
        else if (x === end) shade = 1; // the end of a board
        else if (tileNoise(x, y * 3, 4, TILE, variant * 7 + row) > 0.62) shade = tone + 1; // grain
        else if (tileNoise(x, y, 2, TILE, variant * 13 + row) < 0.2) shade = tone - 1;
        image.set(x, y, PLANK[shade]!);
      }
    }
    // A nail on each side of the board end.
    if (hash(row, variant, 13) < 0.6) image.set((end + 2) % TILE, row * 4 + 2, PLANK[5]!);
  }
  return image;
}

// ---------------------------------------------------------------- roof

const SLATE = ramp('#0f1114', '#16191d', '#1e2227', '#272c32', '#31373e', '#3d444c');
const BARGE = ramp('#0d0907', '#1a120d', '#2a1d14');

/**
 * Slates on a 16x16 roof tile: 4-pixel courses with a shadow line under each, slates 3 to 6
 * pixels wide with joints at random places (the joints repeat every 16 pixels, so tiles join),
 * a tone for each slate, and a few patches of moss.
 */
const MOSS_ON_SLATE = ramp('#121a11', '#1a2616');

function slates(image: Image, light: number, seed: number): void {
  for (let course = 0; course < 4; course++) {
    // Joints for this course: walk across the tile in random steps of 3 to 6 pixels.
    const joints = new Set<number>();
    let x = Math.floor(hash(course, seed, 1) * 4);
    while (x < TILE) {
      joints.add(x);
      x += 3 + Math.floor(hash(course, x, seed + 2) * 4);
    }
    let slate = 0;
    for (let px = 0; px < TILE; px++) {
      if (joints.has(px)) slate++;
      const tone = hash(course, slate, seed + 3);
      for (let py = course * 4; py < course * 4 + 4; py++) {
        let shade = light + (tone < 0.25 ? -1 : tone > 0.88 ? 1 : 0);
        if (py % 4 === 3) shade = light - 2;
        else if (joints.has(px)) shade = light - 1;
        let colour = SLATE[Math.max(0, Math.min(SLATE.length - 1, shade))]!;
        if (py % 4 !== 3 && tileNoise(px, py, 4, TILE, seed + 7) > 0.8) colour = MOSS_ON_SLATE[py % 4 === 0 ? 0 : 1]!;
        image.set(px, py, colour);
      }
    }
  }
}

type RoofRow = 'top' | 'back' | 'ridge' | 'front' | 'eave';

function roofTile(row: RoofRow, column: 'l' | 'm' | 'r', variant: number): Image {
  const image = new Image(TILE, TILE);
  // The back slope faces away from the light; the front slope faces it.
  slates(image, row === 'top' || row === 'back' ? 2 : 3, 100 * variant + (row === 'front' ? 21 : 22) + (column === 'm' ? 0 : 50));
  if (row === 'top') {
    // The north eave: a dark edge line.
    for (let x = 0; x < TILE; x++) {
      image.set(x, 0, SLATE[0]!);
      image.set(x, 1, SLATE[1]!);
    }
  }
  if (row === 'ridge') {
    // Back slope above, ridge caps in the middle, front slope below.
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        if (y < 5) continue;
        if (y < 6) image.set(x, y, SLATE[0]!);
        else if (y < 10) image.set(x, y, SLATE[(x % 5 === 0 ? 3 : y === 6 ? 5 : 4)]!);
        else if (y < 11) image.set(x, y, SLATE[0]!);
      }
    }
  }
  if (row === 'eave') {
    for (let x = 0; x < TILE; x++) {
      image.set(x, TILE - 3, SLATE[4]!);
      image.set(x, TILE - 2, SLATE[1]!);
      image.set(x, TILE - 1, SLATE[0]!);
    }
  }
  // Barge boards on the gable edges.
  if (column !== 'm') {
    for (let y = 0; y < TILE; y++) {
      const [outer, inner] = column === 'l' ? [0, 2] : [TILE - 1, TILE - 3];
      image.set(outer, y, BARGE[0]!);
      image.set(column === 'l' ? 1 : TILE - 2, y, BARGE[2]!);
      image.set(inner, y, BARGE[1]!);
    }
  }
  return image;
}

/** Roof pieces, `roof/<row>/<column>/<variant>`. */
function roofFrames(): Frame[] {
  const frames: Frame[] = [];
  for (const row of ['top', 'back', 'ridge', 'front', 'eave'] as RoofRow[]) {
    for (const column of ['l', 'm', 'r'] as const) {
      for (let variant = 0; variant < PIECE_VARIANTS; variant++) {
        frames.push({ name: `roof/${row}/${column}/${variant}`, image: roofTile(row, column, variant) });
      }
    }
  }
  // The roof's shadow on the top of the front wall, under the eave: smooth rows, no dither
  // (a dither pattern over dark stone reads as a light checker).
  const shadow = new Image(TILE, 4);
  for (let y = 0; y < 4; y++) for (let x = 0; x < TILE; x++) shadow.set(x, y, rgb('#050406', [150, 105, 65, 30][y]!));
  frames.push({ name: 'roof/shadow', image: shadow });
  return frames;
}

// ---------------------------------------------------------------- furniture

/** Renders a piece of furniture whose footprint starts at the anchor tile's south-west corner. */
function furniture(name: string, parts: Part[], width: number, height: number): Frame {
  const pivotX = 4;
  const pivotY = height - 6;
  const image = renderModel(parts, MATERIALS, {
    width,
    height,
    pivotX,
    pivotY,
    yaw: 0,
    projection: 'oblique',
    stepScale: 0.7,
  });
  const cropped = cropToContent(image, pivotX, pivotY);
  return { name, image: cropped.image, anchor: cropped.anchor };
}

function bookshelf(): Part[] {
  const carcass = subtract(box([1, 0, -16], [15, 30, -10]), box([2.2, 2, -14.8], [13.8, 28.4, -9]));
  const parts: Part[] = [
    { sdf: carcass, material: M.wood },
    { sdf: box([2, 9.5, -15], [14, 10.6, -10]), material: M.wood },
    { sdf: box([2, 19, -15], [14, 20.1, -10]), material: M.wood },
  ];
  const colours = [M.bookRed, M.bookGreen, M.bookBlue, M.bookBrown];
  for (const [shelf, base] of [[0, 2], [1, 10.6], [2, 20.1]] as const) {
    let x = 2.4;
    for (let i = 0; x < 13; i++) {
      const width = 1.2 + hash(shelf, i, 41) * 0.9;
      const tall = 5.5 + hash(shelf, i, 42) * 2.3;
      if (hash(shelf, i, 43) > 0.12) {
        parts.push({ sdf: box([x, base, -14.6], [Math.min(x + width, 13.6), base + tall, -11]), material: colours[Math.floor(hash(shelf, i, 44) * 4)]! });
      }
      x += width + 0.15;
    }
  }
  return parts;
}

function table(): Part[] {
  const legs: Sdf[] = [[2, -12], [29, -12], [2, -5], [29, -5]].map(([x, z]) => box([x!, 0, z!], [x! + 1.6, 11, z! + 1.6]));
  return [
    { sdf: box([1, 11, -13], [31, 13, -3], 0.3), material: M.wood },
    { sdf: union(...legs), material: M.woodDark },
    { sdf: cylinder([8, 15, -8.5], 'y', 1.1, 4), material: M.wax },
    { sdf: sphere([8, 17.9, -8.5], 0.9), material: M.flame },
    { sdf: box([19, 13, -11], [25, 14.2, -6], 0.2), material: M.bookRed },
  ];
}

function bed(): Part[] {
  return [
    { sdf: box([1, 0, -30], [15, 5, -1]), material: M.woodDark },
    { sdf: box([1, 0, -31], [15, 14, -29], 0.3), material: M.wood },
    { sdf: box([1, 0, -2], [15, 8, -0.5], 0.3), material: M.wood },
    { sdf: box([2, 5, -29], [14, 8, -2], 0.8), material: M.linen },
    { sdf: box([1.6, 5, -20], [14.4, 8.8, -1.6], 0.6), material: M.wine },
    { sdf: sphere([8, 8.6, -26], 2.6), material: M.linen },
  ];
}

function chest(): Part[] {
  const body = box([2, 0, -12], [14, 7, -3], 0.3);
  const lid = intersect(cylinder([8, 7, -7.5], 'x', 4.5, 12), box([2, 7, -13], [14, 12, -2]));
  const bands = (x: number) => Math.abs(x - 4.5) < 0.7 || Math.abs(x - 11.5) < 0.7;
  return [
    { sdf: union(body, lid), material: (x) => (bands(x) ? M.metal : M.wood) },
    { sdf: box([7.2, 4.5, -3.2], [8.8, 6.8, -2.4]), material: M.metal },
  ];
}

function barrel(): Part[] {
  const centre: Vec3 = [8, 0, -8];
  const body: Sdf = (x, y, z) => {
    const r = 5 + 0.7 * Math.sin((Math.PI * Math.max(0, Math.min(13, y))) / 13);
    const across = Math.hypot(x - centre[0], z - centre[2]) - r;
    const along = Math.abs(y - 6.5) - 6.5;
    return Math.max(across, along);
  };
  return [
    {
      sdf: body,
      material: (x, y, z, _nx, ny) => {
        if (ny > 0.7) return M.woodDark;
        if (Math.abs(y - 3) < 0.7 || Math.abs(y - 10) < 0.7) return M.metal;
        const angle = Math.atan2(z - centre[2], x - centre[0]);
        return Math.abs(((angle * 6) / Math.PI) % 1) < 0.12 ? M.woodDark : M.wood;
      },
    },
  ];
}

function furnitureFrames(): Frame[] {
  return [
    furniture('furniture/bookshelf', bookshelf(), 24, 56),
    furniture('furniture/table', table(), 40, 40),
    furniture('furniture/bed', bed(), 24, 64),
    furniture('furniture/chest', chest(), 24, 32),
    furniture('furniture/barrel', barrel(), 24, 32),
  ];
}

export function buildingFrames(): Frame[] {
  const floor = [0, 1, 2, 3].map((v) => ({ name: `ground/floor/${v}`, image: floorTile(v) }));
  return [...wallFrames(), ...doorFrames(), ...floor, ...roofFrames(), ...furnitureFrames()];
}
