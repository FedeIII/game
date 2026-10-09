/**
 * Building art, in styles: every wall style has wall pieces, a door (open and closed) and a lit
 * window; every roof style has roof pieces. All styles share the dark gothic palette and the
 * light from the top left, but each has its own hand-made look. Walls, doors and windows are SDF
 * models in the 'oblique' projection (they fill whole tiles of the ground grid); roofs and floors
 * are 2D, from tiling patterns.
 *
 * Frame names:
 *   wall/<walls>/<mask>/<variant>   mask bit 1 = wall to the north, 2 = east, 4 = west
 *   wall/<walls>/door/open|closed   wall/<walls>/window
 *   roof/<roof>/<row>/<column>/<variant>, roof/shadow
 *   roof/<prop> for the things on a roof (ROOF_PROPS): chimney, vane, spire, moon, flag-wine...
 *     The pivot of a roof prop is its foot, which the client puts on the ridge.
 *   ground/floor/N (wood), ground/floorstone/N, ground/floorearth/N
 *
 * Geometry of one tile in model space: x from 0 to 16 (west to east), z from -16 (north) to 0
 * (south), y up. The pivot of every wall frame is the tile's south-west corner on the ground, so
 * the client puts a sprite at (tx * 16, (ty + 1) * 16).
 */
import { Image } from './png.ts';
import { TILE, cropToContent, ramp, rgb, tileNoise } from './raster.ts';
import { MATERIALS, M, hash } from './materials.ts';
import { HEIGHT_SCALE, box, cylinder, intersect, noise3, renderModel, sphere, subtract, union, type Part, type Sdf } from './sdf.ts';
import type { Frame } from './sprites.ts';

/** Wall height in model units: 32 pixels on screen, a little taller than the player. */
const H = 32 / HEIGHT_SCALE;

const mod = (a: number, n: number) => ((a % n) + n) % n;

// ---------------------------------------------------------------- wall styles

type Face = 'front' | 'top';
type Arch = 'round' | 'pointed' | 'square';

interface WallStyle {
  readonly variants: number;
  /** How far (model units) the surface goes into the wall at a point: joints, gaps. Negative: it stands out. */
  relief(x: number, y: number, z: number, face: Face, variant: number): number;
  material(x: number, y: number, z: number, nx: number, ny: number, nz: number, variant: number): number;
  /** Surface roughness: the amplitude of a fine noise on the surface. */
  readonly rough: number;
  readonly arch: Arch;
  /** The material of the door leaf at a point of it. */
  leaf(x: number, y: number): number;
  /** The material of window frames, sills and mullions. */
  readonly frame: number;
  /** The material of the window glass at a point of it. It is lit from inside. */
  glass(x: number, y: number): number;
}

const plankDoor = (body: number, bands: number) => (x: number, y: number) => {
  if ((y > 5 && y < 6.2) || (y > 15 && y < 16.2)) return bands;
  return Math.abs(mod(x - 4, 2.67) - 1.33) > 1.1 ? M.woodDark : body;
};

// Stone masonry: six courses of stones, half-offset, with moss at the foot.
const COURSE = H / 6;
const STONE = 8;
const JOINT = 1.25;
const onJoint = (x: number, y: number) => {
  const course = Math.floor(y / COURSE);
  return mod(x + (course % 2 === 0 ? 0 : STONE / 2), STONE) < JOINT || y - course * COURSE < JOINT;
};
const onCapJoint = (x: number, z: number) => mod(x, STONE) < JOINT || mod(z, STONE) < JOINT;

const stone: WallStyle = {
  variants: 3,
  relief: (x, y, z, face) => (face === 'front' ? (onJoint(x, y) ? 0.7 : 0) : onCapJoint(x, z) ? 0.5 : 0),
  material(x, y, z, _nx, ny, nz, variant) {
    if (ny > 0.6) {
      if (onCapJoint(x, z)) return M.mortar;
      return hash(Math.floor(x / STONE), Math.floor(z / STONE), 7 + variant) < 0.5 ? M.cap : M.stoneA;
    }
    if (nz > 0.6) {
      if (y < 1.5 + 2.5 * noise3(x * 0.5 + variant * 9, 0, z * 0.5, 5)) return M.moss;
      if (onJoint(x, y)) return M.mortar;
      const course = Math.floor(y / COURSE);
      const pick = hash(course, Math.floor((x + (course % 2 === 0 ? 0 : STONE / 2)) / STONE), 3 + variant * 17);
      return pick < 0.45 ? M.stoneA : pick < 0.8 ? M.stoneB : M.stoneC;
    }
    return M.stoneA;
  },
  rough: 0.25,
  arch: 'round',
  leaf: plankDoor(M.wood, M.metal),
  frame: M.cap,
  glass: () => M.lanternGlass,
};

// Timber frame: dark oak posts, rails and braces standing out of plaster panels.
const POST = 1.6;
const RAILS: [number, number][] = [
  [0, 2.2],
  [H / 2 - 0.9, H / 2 + 0.9],
  [H - 2.4, H + 1],
];
function nearSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
  return Math.hypot(px - ax - t * (bx - ax), py - ay - t * (by - ay));
}
function onBeam(x: number, y: number, variant: number): boolean {
  const xr = mod(x, TILE);
  if (xr < POST || xr > TILE - POST) return true;
  if (RAILS.some(([a, b]) => y >= a && y <= b)) return true;
  // A brace in the lower or the upper panel, leaning one way or the other from tile to tile.
  const tile = Math.floor(x / TILE) + variant;
  const lean = mod(tile, 2) === 0;
  const lower = mod(tile, 3) !== 2;
  const [y0, y1] = lower ? [2.2, H / 2 - 0.9] : [H / 2 + 0.9, H - 2.4];
  return lean ? nearSegment(xr, y, POST, y0, TILE - POST, y1) < 0.9 : nearSegment(xr, y, POST, y1, TILE - POST, y0) < 0.9;
}
const timber: WallStyle = {
  variants: 2,
  relief: (x, y, _z, face, variant) => (face === 'front' && onBeam(x, y, variant) ? -0.7 : 0),
  material: (x, y, _z, _nx, ny, nz, variant) => (ny > 0.6 ? M.beam : nz > 0.6 && !onBeam(x, y, variant) ? M.plaster : M.beam),
  rough: 0.15,
  arch: 'square',
  leaf: plankDoor(M.wood, M.iron),
  frame: M.beam,
  glass: () => M.lanternGlass,
};

// A plank hut: weathered vertical boards, warped, with two battens and dark gaps.
const BOARD = 3.2;
const battenAt = (y: number) => (y > H * 0.28 && y < H * 0.28 + 1.6) || (y > H * 0.72 && y < H * 0.72 + 1.6);
const planks: WallStyle = {
  variants: 2,
  relief(x, y, _z, face, variant) {
    if (face === 'top') return 0;
    const board = Math.floor(mod(x, TILE) / BOARD);
    if (mod(x, TILE) - board * BOARD < 0.45) return 0.7;
    if (battenAt(y)) return -0.5;
    return 0.25 * Math.sin(y * 0.15 + board * 2.1 + variant * 1.3);
  },
  material(x, y, z, _nx, ny, nz) {
    if (ny > 0.6) return M.greyWood;
    if (nz > 0.6 && (battenAt(y) || mod(x, TILE) % BOARD < 0.45)) return M.beam;
    return noise3(x * 0.4, y * 0.15, z, 21) > 0.7 ? M.beam : M.greyWood;
  },
  rough: 0.2,
  arch: 'square',
  leaf: plankDoor(M.greyWood, M.iron),
  frame: M.beam,
  glass: () => M.lanternGlass,
};

// Brick: twelve courses of small dark-red bricks, some burnt black, under a black stone coping.
const BRICK_COURSE = H / 12;
const BRICK = TILE / 3;
const brickJoint = (x: number, y: number) => {
  const course = Math.floor(y / BRICK_COURSE);
  return mod(x + (course % 2 === 0 ? 0 : BRICK / 2), BRICK) < 0.55 || y - course * BRICK_COURSE < 0.55;
};
const brick: WallStyle = {
  variants: 2,
  relief: (x, y, _z, face) => (face === 'front' && brickJoint(x, y) ? 0.5 : 0),
  material(x, y, _z, _nx, ny, nz, variant) {
    if (ny > 0.6) return M.blackStone;
    if (nz < 0.6) return M.brick;
    if (brickJoint(x, y)) return M.mortar;
    const course = Math.floor(y / BRICK_COURSE);
    const which = Math.floor((x + (course % 2 === 0 ? 0 : BRICK / 2)) / BRICK);
    return hash(course, which, 61 + variant) < 0.12 ? M.blackStone : M.brick;
  },
  rough: 0.15,
  arch: 'square',
  leaf: (x, y) => (Math.abs(mod(x - 4, 2.67) - 1.33) < 0.25 && mod(y, 4) < 0.8 ? M.metal : M.beam),
  frame: M.blackStone,
  glass: () => M.redGlass,
};

// Rubble: fieldstones of every size in thick mortar, bulging, with moss.
function rubbleCell(u: number, v: number): { d1: number; d2: number; id: number } {
  const cw = TILE / 3;
  const ch = 5;
  const ci = Math.floor(u / cw);
  const cj = Math.floor(v / ch);
  let d1 = Infinity;
  let d2 = Infinity;
  let id = 0;
  for (let j = cj - 1; j <= cj + 1; j++) {
    for (let i = ci - 1; i <= ci + 1; i++) {
      const key = mod(i, 3);
      const px = (i + 0.2 + 0.6 * hash(key, j, 71)) * cw;
      const py = (j + 0.2 + 0.6 * hash(key, j, 72)) * ch;
      const d = Math.hypot(u - px, v - py);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        id = key * 1000 + j;
      } else if (d < d2) d2 = d;
    }
  }
  return { d1, d2, id };
}
const rubble: WallStyle = {
  variants: 2,
  relief(x, y, z, face) {
    const { d1, d2 } = face === 'front' ? rubbleCell(x, y) : rubbleCell(x, z);
    return d2 - d1 < 0.8 ? 0.9 : -0.3 * Math.max(0, 1 - d1 / 3);
  },
  material(x, y, z, _nx, ny, nz, variant) {
    const front = nz > 0.6;
    const { d1, d2, id } = front ? rubbleCell(x, y) : rubbleCell(x, z);
    if (d2 - d1 < 0.8) return M.mortar;
    if (front && (y < 2 + 3 * noise3(x * 0.3, 0, variant, 3) || noise3(x * 0.25, y * 0.25, variant, 4) > 0.74)) return M.moss;
    if (ny > 0.6) return M.cap;
    return hash(id, variant, 5) < 0.3 ? M.stoneA : M.rubble;
  },
  rough: 0.3,
  arch: 'round',
  leaf: plankDoor(M.wood, M.metal),
  frame: M.cap,
  glass: () => M.lanternGlass,
};

// Gothic: tall blocks of black dressed stone, a plinth and a string course, a pointed arch.
const ASHLAR = H / 4;
const ashlarJoint = (x: number, y: number) => {
  const course = Math.floor(y / ASHLAR);
  return mod(x + (course % 2 === 0 ? 0 : 4), 8) < 0.5 || y - course * ASHLAR < 0.5;
};
const plinth = (y: number) => y < 3;
const stringCourse = (y: number) => y > H * 0.66 && y < H * 0.66 + 1.3;
const gothic: WallStyle = {
  variants: 2,
  relief(x, y, _z, face) {
    if (face === 'top') return 0;
    if (plinth(y) || stringCourse(y)) return -0.6;
    return ashlarJoint(x, y) ? 0.4 : 0;
  },
  material(x, y, _z, _nx, ny, nz) {
    if (ny > 0.6 || nz < 0.6) return M.blackStone;
    if (plinth(y) || stringCourse(y)) return M.stoneC;
    return ashlarJoint(x, y) ? M.mortar : M.blackStone;
  },
  rough: 0.12,
  arch: 'pointed',
  leaf: (x, y) => (Math.abs(mod(x - 4, 2.67) - 1.33) < 0.25 && mod(y, 4) < 0.8 ? M.metal : M.beam),
  frame: M.blackStone,
  // Stained glass: diamonds of red in blue.
  glass: (x, y) => (Math.abs(mod(x + y, 3) - 1.5) + Math.abs(mod(x - y, 3) - 1.5) < 0.9 ? M.stainedRed : M.stainedBlue),
};

// Canvas: a striped tent wall with soft folds, a rope hem and a wooden rail on top.
function canvas(stripe: number, ground: number): WallStyle {
  return {
    variants: 2,
    relief(x, y, _z, face) {
      if (face === 'top') return 0;
      return 0.35 * Math.sin((mod(x, 8) / 8) * Math.PI * 2) - (y < 1.6 ? 0.2 : 0);
    },
    material(x, y, _z, _nx, ny, nz) {
      if (ny > 0.6 || (nz > 0.6 && y > H - 1.5)) return M.wood;
      if (y < 1.6) return M.beam;
      return mod(x, 8) < 4 ? stripe : ground;
    },
    rough: 0.05,
    arch: 'square',
    leaf: (x) => (mod(x, 2.6) < 0.6 ? M.woodDark : stripe),
    frame: M.wood,
    glass: () => M.lanternGlass,
  };
}

// Painted boards: teal clapboard with chipped paint and pale corner trim.
const CLAP = 3.5;
const trim = (x: number) => mod(x, TILE) < 1.2 || mod(x, TILE) > TILE - 1.2;
const painted: WallStyle = {
  variants: 2,
  relief(x, y, _z, face) {
    if (face === 'top') return 0;
    if (trim(x)) return -0.4;
    return mod(y, CLAP) < 0.6 ? 0.5 : 0;
  },
  material(x, y, z, _nx, ny, nz, variant) {
    // A dark oak rail on top: pale paint up there would glare in the torchlight.
    if (ny > 0.6) return M.beam;
    if (nz < 0.6 || trim(x)) return M.canvasBone;
    if (mod(y, CLAP) < 0.6) return M.beam;
    return noise3(x * 0.5, y * 0.5, z + variant * 3, 17) > 0.7 ? M.greyWood : M.paintTeal;
  },
  rough: 0.12,
  arch: 'square',
  leaf: plankDoor(M.canvasWine, M.canvasBone),
  frame: M.canvasBone,
  glass: () => M.lanternGlass,
};

export const WALL_STYLES: Record<string, WallStyle> = {
  stone,
  timber,
  planks,
  brick,
  rubble,
  gothic,
  canvas: canvas(M.canvasWine, M.canvasBone),
  painted,
};

/** A wall block on a tile (dx, dz tiles from the centre tile), with the style's relief. */
function wallBlock(style: WallStyle, dx: number, dz: number, variant: number): Sdf {
  const block = box([dx * TILE, 0, dz * TILE - TILE], [dx * TILE + TILE, H, dz * TILE]);
  const front = dz * TILE;
  return (x, y, z) => {
    let d = block(x, y, z);
    if (d > 2) return d;
    if (z > front - 1.5) d += style.relief(x, y, z, 'front', variant);
    else if (y > H - 1.5) d += style.relief(x, y, z, 'top', variant);
    return d + style.rough * (noise3(x * 0.9, y * 0.9, z * 0.9, 31) - 0.5);
  };
}

function styleMaterial(style: WallStyle, variant: number) {
  return (x: number, y: number, z: number, nx: number, ny: number, nz: number) => style.material(x, y, z, nx, ny, nz, variant);
}

/**
 * Renders the centre tile of a small scene and crops it: neighbour blocks in the scene make the
 * outline appear only where the wall really ends.
 */
function wallFrame(name: string, style: WallStyle, centre: Part[], neighbours: { n: boolean; e: boolean; w: boolean }): Frame {
  const parts: Part[] = [...centre];
  const plain = styleMaterial(style, 0);
  if (neighbours.n) parts.push({ sdf: wallBlock(style, 0, -1, 0), material: plain });
  if (neighbours.e) parts.push({ sdf: wallBlock(style, 1, 0, 0), material: plain });
  if (neighbours.w) parts.push({ sdf: wallBlock(style, -1, 0, 0), material: plain });
  const width = 3 * TILE;
  const height = 80;
  const pivotX = TILE;
  const pivotY = height - 8;
  const scene = renderModel(parts, MATERIALS, { width, height, pivotX, pivotY, yaw: 0, projection: 'oblique', stepScale: 0.6 });
  const image = new Image(TILE, 3 * TILE);
  for (let y = 0; y < 3 * TILE; y++) for (let x = 0; x < TILE; x++) image.set(x, y, scene.get(pivotX + x, pivotY - 3 * TILE + y));
  return { name, image, anchor: { x: 0, y: 1 } };
}

/** A shape turned by `angle` (radians, counterclockwise as seen from the south) round (cx, cy) in the plane of a wall. */
function turned(sdf: Sdf, cx: number, cy: number, angle: number): Sdf {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return (x, y, z) => sdf(cx + (x - cx) * c + (y - cy) * s, cy - (x - cx) * s + (y - cy) * c, z);
}

/** The shape of an opening of the style: a door through the wall, or a window recess. */
function opening(arch: Arch, x0: number, x1: number, y0: number, spring: number, z0: number, z1: number): Sdf {
  const cx = (x0 + x1) / 2;
  const r = (x1 - x0) / 2;
  const body = box([x0, y0, z0], [x1, spring, z1]);
  const depth = z1 - z0;
  const zc = (z0 + z1) / 2;
  switch (arch) {
    case 'round':
      return union(body, cylinder([cx, spring, zc], 'z', r, depth));
    case 'pointed': {
      // Two circles with the width as radius, centred on the opposite springers.
      const width = x1 - x0;
      const point = intersect(cylinder([x1, spring, zc], 'z', width, depth), cylinder([x0, spring, zc], 'z', width, depth), box([x0, spring - 0.1, z0], [x1, spring + width, z1]));
      return union(body, point);
    }
    case 'square':
      return box([x0, y0, z0], [x1, spring + r, z1]);
  }
}

function styleFrames(name: string, style: WallStyle): Frame[] {
  const frames: Frame[] = [];
  for (let mask = 0; mask < 8; mask++) {
    for (let variant = 0; variant < style.variants; variant++) {
      const centre: Part[] = [{ sdf: wallBlock(style, 0, 0, variant), material: styleMaterial(style, variant) }];
      frames.push(wallFrame(`wall/${name}/${mask}/${variant}`, style, centre, { n: (mask & 1) !== 0, e: (mask & 2) !== 0, w: (mask & 4) !== 0 }));
    }
  }
  const sides = { n: false, e: true, w: true };

  // The door: an opening through the whole wall; closed, a leaf a little behind the face.
  const doorway = opening(style.arch, 4, 12, -1, style.arch === 'pointed' ? 18 : 20.5, -20, 2);
  const wall: Part = {
    sdf: subtract(wallBlock(style, 0, 0, 0), doorway),
    material: (x, y, z, nx, ny, nz) => {
      const near = doorway(x, y, z) > -1.6 && doorway(x, y, z) < 1.6 && z > -2 && nz > 0.6;
      return near ? style.frame : style.material(x, y, z, nx, ny, nz, 0);
    },
  };
  const leaf: Part = { sdf: intersect(box([4, 0, -5], [12, 32, -3.5]), doorway), material: (x, y) => style.leaf(x, y) };
  const ring: Part = { sdf: sphere([10.2, 11, -3.3], 0.75), material: M.metal };
  frames.push(wallFrame(`wall/${name}/door/closed`, style, [wall, leaf, ring], sides));
  frames.push(wallFrame(`wall/${name}/door/open`, style, [wall], sides));
  // Boarded up (a building that is shut for good): two planks nailed across the closed door, a
  // little askew, with a nail at each end.
  const boards = [
    { y: 7, angle: 0.12 },
    { y: 16.5, angle: -0.16 },
  ];
  const planks: Part[] = boards.map(({ y, angle }) => ({ sdf: turned(box([1.5, y - 1.6, -0.6], [14.5, y + 1.6, 0.8]), 8, y, angle), material: M.wood }));
  const nails: Part[] = boards.flatMap(({ y, angle }) => [-5, 5].map((dx) => ({ sdf: sphere([8 + dx, y + dx * Math.sin(angle), 1], 0.55), material: M.metal })));
  frames.push(wallFrame(`wall/${name}/door/boarded`, style, [wall, leaf, ring, ...planks, ...nails], sides));

  // The window: a recess with lit glass, a cross of mullions and a sill that stands out.
  const recess = opening(style.arch, 4.5, 11.5, 12, style.arch === 'pointed' ? 20 : 22, -3, 2);
  const glassShape = intersect(box([4.5, 12, -2.8], [11.5, 30, -2.2]), recess);
  frames.push(
    wallFrame(
      `wall/${name}/window`,
      style,
      [
        { sdf: subtract(wallBlock(style, 0, 0, 1 % style.variants), recess), material: styleMaterial(style, 1 % style.variants) },
        { sdf: glassShape, material: (x, y) => (Math.abs(x - 8) < 0.5 || Math.abs(y - 18.5) < 0.5 ? style.frame : style.glass(x, y)) },
        { sdf: box([4, 11, -1.2], [12, 12.2, 1]), material: style.frame },
      ],
      sides,
    ),
  );
  return frames;
}

// ---------------------------------------------------------------- floors

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
        if (y === row * 4) shade = 0;
        else if (x === end) shade = 1;
        else if (tileNoise(x, y * 3, 4, TILE, variant * 7 + row) > 0.62) shade = tone + 1;
        else if (tileNoise(x, y, 2, TILE, variant * 13 + row) < 0.2) shade = tone - 1;
        image.set(x, y, PLANK[shade]!);
      }
    }
    if (hash(row, variant, 13) < 0.6) image.set((end + 2) % TILE, row * 4 + 2, PLANK[5]!);
  }
  return image;
}

const FLAG = ramp('#0e0f10', '#17181a', '#202225', '#2a2c30', '#35383c', '#43464b');

/** Flagstones: two rows of slabs of different lengths, with dark joints and a few cracks. */
function floorStoneTile(variant: number): Image {
  const image = new Image(TILE, TILE);
  for (let row = 0; row < 2; row++) {
    const cut = 5 + Math.floor(hash(row, variant, 31) * 6);
    for (let y = row * 8; y < row * 8 + 8; y++) {
      for (let x = 0; x < TILE; x++) {
        const slab = x < cut ? 0 : 1;
        const tone = 2 + (hash(row, slab, variant + 32) < 0.4 ? 1 : 0);
        let shade = tone;
        if (y === row * 8 || x === 0 || x === cut) shade = 0;
        else if (y === row * 8 + 1 || x === 1 || x === cut + 1) shade = tone + 1;
        else if (tileNoise(x, y, 4, TILE, variant * 5 + row) > 0.72) shade = tone - 1;
        image.set(x, y, FLAG[shade]!);
      }
    }
  }
  if (hash(variant, 0, 33) < 0.5) for (let i = 0; i < 4; i++) image.set(9 + i, 3 + (i >> 1), FLAG[0]!);
  return image;
}

const EARTH = ramp('#120e0a', '#19130e', '#211a13', '#2a2118', '#352a1f');
const STRAW = rgb('#4a3d22');

/** Packed earth, mottled, with a few blades of straw. */
function floorEarthTile(variant: number): Image {
  const image = new Image(TILE, TILE);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const n = 0.6 * tileNoise(x, y, 4, TILE, variant * 3) + 0.4 * tileNoise(x, y, 2, TILE, variant * 3 + 1);
      image.set(x, y, EARTH[Math.max(0, Math.min(4, Math.round(1 + n * 2.6)))]!);
    }
  }
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(hash(i, variant, 41) * 14);
    const y = Math.floor(hash(i, variant, 42) * TILE);
    image.set(x, y, STRAW);
    image.set(x + 1, y, STRAW);
    if (hash(i, variant, 43) < 0.5) image.set(x + 2, y, STRAW);
  }
  return image;
}

// ---------------------------------------------------------------- roof styles

type RoofRow = 'top' | 'back' | 'ridge' | 'front' | 'eave';
type Column = 'l' | 'm' | 'r';
const ROWS: RoofRow[] = ['top', 'back', 'ridge', 'front', 'eave'];
const COLUMNS: Column[] = ['l', 'm', 'r'];
const ROOF_VARIANTS = 3;

/** The back slope faces away from the light: one shade darker than the front slope. */
const lightOf = (row: RoofRow) => (row === 'top' || row === 'back' ? 0 : 1);

/** Courses of a roof: joints at random places, repeating every 16 pixels. */
function courseJoints(course: number, seed: number, min: number, spread: number): Set<number> {
  const joints = new Set<number>();
  let x = Math.floor(hash(course, seed, 1) * 4);
  while (x < TILE) {
    joints.add(x);
    x += min + Math.floor(hash(course, x, seed + 2) * spread);
  }
  return joints;
}

function edges(image: Image, column: Column, colours: readonly number[]): void {
  if (column === 'm') return;
  for (let y = 0; y < TILE; y++) {
    const outer = column === 'l' ? 0 : TILE - 1;
    const inner = column === 'l' ? 1 : TILE - 2;
    image.set(outer, y, colours[0]!);
    image.set(inner, y, colours[2] ?? colours[1]!);
    image.set(column === 'l' ? 2 : TILE - 3, y, colours[1]!);
  }
}

const SLATE = ramp('#0f1114', '#16191d', '#1e2227', '#272c32', '#31373e', '#3d444c');
const BARGE = ramp('#0d0907', '#1a120d', '#2a1d14');
const MOSS_ON_ROOF = ramp('#121a11', '#1a2616');

function slateTile(row: RoofRow, column: Column, variant: number): Image {
  const image = new Image(TILE, TILE);
  const light = 2 + lightOf(row);
  const seed = 100 * variant + (row === 'front' ? 21 : 22) + (column === 'm' ? 0 : 50);
  for (let course = 0; course < 4; course++) {
    const joints = courseJoints(course, seed, 3, 4);
    let slate = 0;
    for (let px = 0; px < TILE; px++) {
      if (joints.has(px)) slate++;
      const tone = hash(course, slate, seed + 3);
      for (let py = course * 4; py < course * 4 + 4; py++) {
        let shade = light + (tone < 0.25 ? -1 : tone > 0.88 ? 1 : 0);
        if (py % 4 === 3) shade = light - 2;
        else if (joints.has(px)) shade = light - 1;
        let colour = SLATE[Math.max(0, Math.min(5, shade))]!;
        if (py % 4 !== 3 && tileNoise(px, py, 4, TILE, seed + 7) > 0.8) colour = MOSS_ON_ROOF[py % 4 === 0 ? 0 : 1]!;
        image.set(px, py, colour);
      }
    }
  }
  if (row === 'top') for (let x = 0; x < TILE; x++) (image.set(x, 0, SLATE[0]!), image.set(x, 1, SLATE[1]!));
  if (row === 'ridge') {
    for (let y = 5; y < 11; y++) {
      for (let x = 0; x < TILE; x++) image.set(x, y, y === 5 || y === 10 ? SLATE[0]! : SLATE[x % 5 === 0 ? 3 : y === 6 ? 5 : 4]!);
    }
  }
  if (row === 'eave') for (let x = 0; x < TILE; x++) (image.set(x, TILE - 3, SLATE[4]!), image.set(x, TILE - 2, SLATE[1]!), image.set(x, TILE - 1, SLATE[0]!));
  edges(image, column, BARGE);
  return image;
}

const SHINGLE = ramp('#120c08', '#1c130d', '#271b12', '#332418', '#402e1f', '#4e3826');

/** Wooden shingles: courses of 4 pixels, rounded lower corners, moss in patches. */
function shingleTile(row: RoofRow, column: Column, variant: number): Image {
  const image = new Image(TILE, TILE);
  const light = 2 + lightOf(row);
  const seed = 200 * variant + (row === 'front' ? 31 : 32);
  for (let course = 0; course < 4; course++) {
    const joints = courseJoints(course, seed, 3, 3);
    let shingle = 0;
    for (let px = 0; px < TILE; px++) {
      if (joints.has(px)) shingle++;
      const tone = hash(course, shingle, seed + 3);
      const bottom = course * 4 + 3;
      for (let py = course * 4; py < course * 4 + 4; py++) {
        let shade = light + (tone < 0.3 ? -1 : tone > 0.85 ? 1 : 0);
        if (py === bottom && (joints.has(px) || joints.has((px + 1) % TILE))) shade = 0; // rounded corners
        else if (py === bottom) shade = light - 1;
        else if (joints.has(px)) shade = light - 2;
        let colour = SHINGLE[Math.max(0, Math.min(5, shade))]!;
        if (tileNoise(px, py, 4, TILE, seed + 9) > 0.78) colour = MOSS_ON_ROOF[py % 2]!;
        image.set(px, py, colour);
      }
    }
  }
  if (row === 'top') for (let x = 0; x < TILE; x++) image.set(x, 0, SHINGLE[0]!);
  if (row === 'ridge') for (let y = 6; y < 10; y++) for (let x = 0; x < TILE; x++) image.set(x, y, y === 6 || y === 9 ? SHINGLE[0]! : SHINGLE[x % 4 === 0 ? 2 : 4]!);
  if (row === 'eave') for (let x = 0; x < TILE; x++) (image.set(x, TILE - 2, SHINGLE[1]!), image.set(x, TILE - 1, SHINGLE[0]!));
  edges(image, column, BARGE);
  return image;
}

const STRAWS = ramp('#130e07', '#1c150b', '#261d10', '#312616', '#3d301c', '#4a3b23');

/** Thatch: straw in streaks, bound in bands, with a thick, ragged, rounded eave. */
function thatchTile(row: RoofRow, column: Column, variant: number): Image {
  const image = new Image(TILE, TILE);
  const light = 2 + lightOf(row);
  const seed = 300 * variant + (row === 'front' ? 41 : 42);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const streak = tileNoise(x, 0, 2, TILE, seed) - 0.5;
      let shade = light + Math.round(streak * 2.4 + (tileNoise(x, y, 4, TILE, seed + 1) - 0.5));
      if (y % 7 === 3 && row !== 'eave') shade -= 2; // the binding
      image.set(x, y, STRAWS[Math.max(0, Math.min(5, shade))]!);
    }
  }
  if (row === 'ridge') {
    for (let y = 5; y < 11; y++) for (let x = 0; x < TILE; x++) image.set(x, y, STRAWS[(x + y) % 4 < 2 ? 1 : 3]!);
  }
  if (row === 'eave') {
    // A thick edge, darker downwards, and ragged straws hanging below it.
    for (let x = 0; x < TILE; x++) {
      for (let y = 9; y < TILE; y++) image.set(x, y, STRAWS[Math.max(0, 4 - (y - 9))]!);
      const hang = Math.floor(hash(x, variant, 44) * 3);
      for (let y = TILE - hang; y < TILE; y++) image.set(x, y, 0);
    }
  }
  if (column !== 'm') {
    for (let y = 0; y < TILE; y++) {
      const ragged = Math.floor(hash(y, variant, 45) * 2);
      for (let i = 0; i < 2 + ragged; i++) image.set(column === 'l' ? i : TILE - 1 - i, y, i < 1 + ragged - 1 ? 0 : STRAWS[0]!);
    }
  }
  return image;
}

/** Canvas: vertical stripes in two colours, a rope on the ridge, bunting along the eave. */
function canvasTile(stripeA: readonly number[], stripeB: readonly number[]) {
  return (row: RoofRow, column: Column, variant: number): Image => {
    const image = new Image(TILE, TILE);
    const light = 2 + lightOf(row);
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const colours = x % 8 < 4 ? stripeA : stripeB;
        // A soft sag between the poles: lighter in the middle of each stripe.
        const fold = x % 4 === 1 || x % 4 === 2 ? 1 : 0;
        image.set(x, y, colours[Math.max(0, Math.min(colours.length - 1, light - 1 + fold))]!);
      }
    }
    if (row === 'ridge') for (let x = 0; x < TILE; x++) (image.set(x, 7, BARGE[0]!), image.set(x, 8, x % 3 === 0 ? BARGE[2]! : BARGE[1]!));
    if (row === 'top') for (let x = 0; x < TILE; x++) image.set(x, 0, BARGE[0]!);
    if (row === 'eave') {
      // Bunting: small flags pointing down, in the two colours, with gaps between them.
      for (let x = 0; x < TILE; x++) {
        image.set(x, 9, BARGE[0]!);
        const flag = Math.floor(x / 4);
        const within = x % 4;
        for (let y = 10; y < TILE; y++) {
          const depth = y - 10;
          const inside = depth < 4 && within >= Math.ceil(depth / 2) && within <= 3 - Math.ceil(depth / 2) + (depth === 0 ? 0 : -0);
          image.set(x, y, inside ? (flag % 2 === 0 ? stripeA : stripeB)[3]! : 0);
        }
      }
    }
    edges(image, column, BARGE);
    void variant;
    return image;
  };
}

const BATTLE = ramp('#0f1010', '#181a19', '#222423', '#2c2f2d', '#383b38', '#464a46');

/** A flat stone roof inside a parapet; the eave row is the parapet with crenels. */
function battlementTile(row: RoofRow, column: Column, variant: number): Image {
  const image = new Image(TILE, TILE);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      // Flagstones, 8 x 5, with joints.
      const r = Math.floor(y / 5);
      const joint = y % 5 === 0 || mod(x + (r % 2) * 4 + variant * 2, 8) === 0;
      image.set(x, y, BATTLE[joint ? 0 : 2 + (hash(r, Math.floor((x + (r % 2) * 4) / 8), variant + 50) < 0.3 ? 1 : 0)]!);
    }
  }
  if (row === 'top') for (let x = 0; x < TILE; x++) for (let y = 0; y < 4; y++) image.set(x, y, BATTLE[y === 0 ? 0 : y === 1 ? 4 : 3]!);
  if (row === 'eave') {
    // The parapet: merlons (pale stone) and crenels (dark gaps) on top, then its face.
    for (let x = 0; x < TILE; x++) {
      const merlon = x % 8 < 5;
      for (let y = 6; y < TILE; y++) {
        if (y < 10 && !merlon) continue;
        const top = y === (merlon ? 6 : 10);
        image.set(x, y, BATTLE[top ? 5 : y === TILE - 1 ? 0 : x % 8 === 0 || x % 8 === 4 ? 1 : 3]!);
      }
    }
  }
  if (column !== 'm') {
    for (let y = 0; y < TILE; y++) {
      for (let i = 0; i < 3; i++) image.set(column === 'l' ? i : TILE - 1 - i, y, BATTLE[i === 0 ? 0 : i === 1 ? 4 : 3]!);
    }
  }
  return image;
}

const CLAY = ramp('#160806', '#250d09', '#36130d', '#481a12', '#5a2318', '#6c2d1f');

/** Clay tiles: barrel tiles in courses, each with a lit and a shaded side. */
function clayTile(row: RoofRow, column: Column, variant: number): Image {
  const image = new Image(TILE, TILE);
  const light = 2 + lightOf(row);
  for (let y = 0; y < TILE; y++) {
    const course = Math.floor(y / 4);
    for (let x = 0; x < TILE; x++) {
      const tile = Math.floor(x / 4);
      const tone = hash(course, tile, variant + 60) < 0.25 ? -1 : 0;
      const within = x % 4;
      let shade = light + tone + (within === 1 ? 1 : within === 3 ? -1 : 0);
      if (within === 0) shade = 0;
      if (y % 4 === 3) shade -= 1;
      image.set(x, y, CLAY[Math.max(0, Math.min(5, shade))]!);
    }
  }
  if (row === 'ridge') for (let y = 6; y < 10; y++) for (let x = 0; x < TILE; x++) image.set(x, y, CLAY[y === 6 ? 5 : y === 9 ? 0 : x % 6 === 0 ? 1 : 3]!);
  if (row === 'eave') for (let x = 0; x < TILE; x++) image.set(x, TILE - 1, x % 4 === 0 ? 0 : CLAY[0]!);
  edges(image, column, BARGE);
  return image;
}

const COPPER = ramp('#0b1512', '#11221d', '#172f28', '#1e3d33', '#284d40', '#376552');

/** Verdigris copper: standing seams every 4 pixels, streaks, an iron cresting on the ridge. */
function copperTile(row: RoofRow, column: Column, variant: number): Image {
  const image = new Image(TILE, TILE);
  const light = 2 + lightOf(row);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      let shade = light + Math.round((tileNoise(x, y * 0.3, 2, TILE, variant + 70) - 0.5) * 2);
      if (x % 4 === 0) shade = light + 2;
      else if (x % 4 === 1) shade = light - 2;
      image.set(x, y, COPPER[Math.max(0, Math.min(5, shade))]!);
    }
  }
  if (row === 'ridge') {
    for (let x = 0; x < TILE; x++) {
      image.set(x, 8, BARGE[0]!);
      image.set(x, 9, BARGE[0]!);
      if (x % 4 === 2) (image.set(x, 7, BARGE[0]!), image.set(x, 6, BARGE[1]!));
    }
  }
  if (row === 'eave') for (let x = 0; x < TILE; x++) (image.set(x, TILE - 2, BARGE[1]!), image.set(x, TILE - 1, BARGE[0]!));
  if (row === 'top') for (let x = 0; x < TILE; x++) image.set(x, 0, BARGE[0]!);
  edges(image, column, ramp('#0a0d0c', '#16201c', '#24342d'));
  return image;
}

const INDIGO = ramp('#07071a', '#0d0f27', '#141a3a', '#1c244c', '#262f60', '#323d74');

/** Fish-scale slates in indigo: rounded scales in courses of 4 pixels, each offset by half a scale. */
function indigoTile(row: RoofRow, column: Column, variant: number): Image {
  const image = new Image(TILE, TILE);
  const light = 2 + lightOf(row);
  for (let y = 0; y < TILE; y++) {
    const course = Math.floor(y / 4);
    const v = y % 4;
    const offset = (course % 2) * 2;
    for (let x = 0; x < TILE; x++) {
      const u = mod(x + offset, 4);
      const scale = Math.floor((x + offset) / 4);
      let shade = light + (hash(course, scale, variant + 80) < 0.2 ? -1 : 0);
      if (v === 3 && (u === 0 || u === 3)) shade = 0; // the round foot of the scale: a gap
      else if (v === 3 || u === 0) shade -= 1; // the rim
      else if (v === 0 && u === 1) shade += 1; // a glint on the top
      image.set(x, y, INDIGO[Math.max(0, Math.min(5, shade))]!);
    }
  }
  if (row === 'ridge') for (let x = 0; x < TILE; x++) (image.set(x, 7, BARGE[0]!), image.set(x, 8, BARGE[2]!), image.set(x, 9, BARGE[0]!));
  if (row === 'eave') for (let x = 0; x < TILE; x++) (image.set(x, TILE - 2, INDIGO[1]!), image.set(x, TILE - 1, INDIGO[0]!));
  if (row === 'top') for (let x = 0; x < TILE; x++) image.set(x, 0, INDIGO[0]!);
  edges(image, column, BARGE);
  return image;
}

const STRIPE_WINE = ramp('#14060a', '#220b0f', '#341014', '#46161a', '#581e20');
const STRIPE_BONE = ramp('#1c1a16', '#2a2721', '#39352d', '#48433a', '#575146');

export const ROOF_STYLES: Record<string, (row: RoofRow, column: Column, variant: number) => Image> = {
  slate: slateTile,
  shingle: shingleTile,
  thatch: thatchTile,
  canvas: canvasTile(STRIPE_WINE, STRIPE_BONE),
  indigo: indigoTile,
  battlement: battlementTile,
  clay: clayTile,
  copper: copperTile,
};

// ---------------------------------------------------------------- roof props

const IRON = ramp('#08080a', '#141418', '#222228', '#34343c', '#4a4a54');
const LEAD = ramp('#0c0c10', '#18181f', '#25252f', '#343442', '#454556');
const DULL_GOLD = ramp('#2a2210', '#4a3c1a', '#6a5628', '#8a7238');
const FLAG_WINE = ramp('#2a0a0e', '#4a1218', '#6a1c22', '#86262c');
const FLAG_GREEN = ramp('#0c2416', '#163a24', '#225234', '#2e6a44');

/** The names of the things that can stand on a roof (`roof/<name>`). */
export const ROOF_PROPS = ['chimney', 'vane', 'spire', 'moon', 'flag-wine', 'flag-green'] as const;

/** A pole of iron, 2 pixels wide, lit on its left side, from y0 to y1 (inclusive). */
function pole(image: Image, x: number, y0: number, y1: number): void {
  for (let y = y0; y <= y1; y++) (image.set(x, y, IRON[3]!), image.set(x + 1, y, IRON[1]!));
}

/** A pennant on a pole: a triangle with its base on the pole, with a ripple and its own shading. */
function flag(colours: readonly number[]): Frame {
  const image = new Image(14, 26);
  pole(image, 1, 2, 25);
  image.set(1, 1, DULL_GOLD[3]!);
  image.set(2, 1, DULL_GOLD[1]!);
  for (let i = 0; i < 7; i++) {
    const length = 10 - Math.abs(i - 3) * 3;
    for (let k = 0; k < length; k++) {
      const x = 3 + k;
      const ripple = k >= 4 && k < 7 ? 1 : 0; // the cloth dips where the wind folds it
      const y = 3 + i + ripple;
      const edge = k === length - 1 || i === 0 || i === 6;
      const shade = edge ? 0 : i < 3 ? 3 : i === 3 ? 2 : 1;
      image.set(x, y, colours[ripple && shade > 1 ? shade - 1 : shade]!);
    }
  }
  return { name: `roof/flag-${colours === FLAG_WINE ? 'wine' : 'green'}`, image, anchor: { x: 1 / 14, y: 1 } };
}

/** A weather vane: an arrow over a pole, with the four arms of the compass below it. */
function vane(): Frame {
  const image = new Image(13, 22);
  pole(image, 6, 4, 21);
  for (let x = 1; x <= 11; x++) image.set(x, 5, IRON[x < 6 ? 3 : 2]!);
  for (const [x, y] of [[10, 4], [11, 5], [10, 6], [9, 3], [9, 7]] as const) image.set(x, y, IRON[3]!);
  for (const [x, y] of [[1, 3], [2, 4], [1, 7], [2, 6], [0, 2], [0, 8]] as const) image.set(x, y, IRON[2]!);
  for (let x = 3; x <= 9; x++) image.set(x, 11, IRON[x === 6 ? 3 : 2]!);
  image.set(6, 3, DULL_GOLD[3]!);
  return { name: 'roof/vane', image, anchor: { x: 6 / 13, y: 1 } };
}

/** A slender lead spire with a gilded ball and a spike at the top. */
function spire(): Frame {
  const image = new Image(9, 24);
  for (let y = 6; y < 24; y++) {
    const half = Math.round(((y - 6) / 17) * 3.5);
    for (let x = 4 - half; x <= 4 + half; x++) {
      const left = x < 4;
      const shade = x === 4 - half || x === 4 + half ? 0 : left ? 3 : x === 4 ? 2 : 1;
      image.set(x, y, LEAD[(y - 6) % 6 === 5 && shade > 0 ? shade - 1 : shade]!);
    }
  }
  for (const [x, y, c] of [[4, 0, 2], [4, 1, 2], [3, 3, 3], [4, 3, 2], [5, 3, 1], [3, 4, 2], [4, 4, 1], [5, 4, 0], [4, 2, 3]] as const) {
    image.set(x, y, (y < 2 ? IRON : DULL_GOLD)[c]!);
  }
  image.set(4, 5, IRON[2]!);
  return { name: 'roof/spire', image, anchor: { x: 4 / 9, y: 1 } };
}

/** A pale crescent moon of beaten gold on an iron pole. */
function moon(): Frame {
  const image = new Image(11, 22);
  pole(image, 4, 9, 21);
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 11; x++) {
      const outer = Math.hypot(x - 5, y - 4) <= 4.3;
      const inner = Math.hypot(x - 7, y - 3.2) <= 3.4;
      if (!outer || inner) continue;
      const shade = Math.hypot(x - 5, y - 4) > 3.5 ? 1 : x < 4 && y < 5 ? 3 : 2;
      image.set(x, y, DULL_GOLD[shade]!);
    }
  }
  return { name: 'roof/moon', image, anchor: { x: 4 / 11, y: 1 } };
}

function roofPropFrames(): Frame[] {
  return [flag(FLAG_WINE), flag(FLAG_GREEN), vane(), spire(), moon()];
}

function roofFrames(): Frame[] {
  const frames: Frame[] = [];
  for (const [name, tile] of Object.entries(ROOF_STYLES)) {
    for (const row of ROWS) {
      for (const column of COLUMNS) {
        for (let variant = 0; variant < ROOF_VARIANTS; variant++) {
          frames.push({ name: `roof/${name}/${row}/${column}/${variant}`, image: tile(row, column, variant) });
        }
      }
    }
  }
  // The roof's shadow on the top of the front wall, under the eave: smooth rows, no dither.
  const shadow = new Image(TILE, 4);
  for (let y = 0; y < 4; y++) for (let x = 0; x < TILE; x++) shadow.set(x, y, rgb('#050406', [150, 105, 65, 30][y]!));
  frames.push({ name: 'roof/shadow', image: shadow });

  frames.push(...roofPropFrames());
  // A brick chimney with a stone cap, standing on the roof; its pivot is the middle of its foot.
  const chimney = renderModel(
    [
      { sdf: box([0, 0, -6], [6, 12, 0]), material: (x, y) => (brickJoint(x * 2.7, y * 1.2) ? M.mortar : M.brick) },
      { sdf: box([-0.6, 12, -6.6], [6.6, 13.6, 0.6], 0.2), material: M.cap },
      { sdf: box([1.4, 12.5, -4.6], [4.6, 14, -1.4]), material: M.pieceBlack },
    ],
    MATERIALS,
    { width: 16, height: 32, pivotX: 4, pivotY: 26, yaw: 0, projection: 'oblique', stepScale: 0.7 },
  );
  const cropped = cropToContent(chimney, 7, 26);
  frames.push({ name: 'roof/chimney', image: cropped.image, anchor: cropped.anchor });
  return frames;
}

export function buildingFrames(): Frame[] {
  const floors: Frame[] = [];
  for (let v = 0; v < 4; v++) {
    floors.push({ name: `ground/floor/${v}`, image: floorTile(v) });
    floors.push({ name: `ground/floorstone/${v}`, image: floorStoneTile(v) });
    floors.push({ name: `ground/floorearth/${v}`, image: floorEarthTile(v) });
  }
  const walls = Object.entries(WALL_STYLES).flatMap(([name, style]) => styleFrames(name, style));
  return [...walls, ...floors, ...roofFrames()];
}
