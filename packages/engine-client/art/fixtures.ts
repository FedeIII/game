/**
 * Fixture art: furniture and props, as SDF models in the 'oblique' projection (they fill whole
 * tiles). Frame names are `fixture/<kind>`, the kinds of FIXTURE_TYPES in the engine; NPCs are in
 * characters.ts. The footprints must match the boxes in packages/engine/src/fixtures.ts.
 *
 * Model space: x from 0 to 16 per tile (west to east), z from 0 (the south edge of the anchor
 * tile) to -16 per tile northwards, y up. The pivot is the anchor tile's south-west corner.
 */
import { Image } from './png.ts';
import { cropToContent } from './raster.ts';
import { MATERIALS, M, hash } from './materials.ts';
import { box, cylinder, displace, ellipsoid, intersect, noise3, renderModel, roundCone, sphere, subtract, union, type Part, type Sdf, type Vec3 } from './sdf.ts';
import type { Frame } from './sprites.ts';

const PIVOT_X = 4;
const MARGIN_BELOW = 6;

function render(parts: Part[], width: number, height: number): Image {
  return renderModel(parts, MATERIALS, {
    width,
    height,
    pivotX: PIVOT_X,
    pivotY: height - MARGIN_BELOW,
    yaw: 0,
    projection: 'oblique',
    stepScale: 0.6,
  });
}

function fixture(kind: string, parts: Part[], width: number, height: number): Frame {
  const cropped = cropToContent(render(parts, width, height), PIVOT_X, height - MARGIN_BELOW);
  return { name: `fixture/${kind}`, image: cropped.image, anchor: cropped.anchor };
}

/** Tilts a shape so its south edge is lower: a reading desk, a lectern. */
function tilt(sdf: Sdf, slope: number, z0: number): Sdf {
  return (x, y, z) => sdf(x, y + (z - z0) * slope, z);
}

// ---------------------------------------------------------------- furniture of the wilds

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

/** A table two tiles wide; `extra` puts things on it. */
function tableTop(): Part[] {
  const legs: Sdf[] = [[2, -12], [29, -12], [2, -5], [29, -5]].map(([x, z]) => box([x!, 0, z!], [x! + 1.6, 11, z! + 1.6]));
  return [
    { sdf: box([1, 11, -13], [31, 13, -3], 0.3), material: M.wood },
    { sdf: union(...legs), material: M.woodDark },
  ];
}

function candle(x: number, z: number): Part[] {
  return [
    { sdf: cylinder([x, 15, z], 'y', 1.1, 4), material: M.wax },
    { sdf: sphere([x, 17.9, z], 0.9), material: M.flame },
  ];
}

function table(): Part[] {
  return [...tableTop(), ...candle(8, -8.5), { sdf: box([19, 13, -11], [25, 14.2, -6], 0.2), material: M.bookRed }];
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

function chestBody(): Sdf {
  return box([2, 0, -12], [14, 7, -3], 0.3);
}
const bands = (x: number) => Math.abs(x - 4.5) < 0.7 || Math.abs(x - 11.5) < 0.7;

function chest(): Part[] {
  const lid = intersect(cylinder([8, 7, -7.5], 'x', 4.5, 12), box([2, 7, -13], [14, 12, -2]));
  return [
    { sdf: union(chestBody(), lid), material: (x) => (bands(x) ? M.metal : M.wood) },
    { sdf: box([7.2, 4.5, -3.2], [8.8, 6.8, -2.4]), material: M.metal },
  ];
}

function barrel(): Part[] {
  const centre: Vec3 = [8, 0, -8];
  const body: Sdf = (x, y, z) => {
    const r = 5 + 0.7 * Math.sin((Math.PI * Math.max(0, Math.min(13, y))) / 13);
    return Math.max(Math.hypot(x - centre[0], z - centre[2]) - r, Math.abs(y - 6.5) - 6.5);
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

// ---------------------------------------------------------------- props of the town

/** A reading stand with an open book. */
function lectern(): Part[] {
  const top = tilt(box([3, 10, -12], [13, 11.2, -4]), 0.35, -8);
  const book = tilt(box([4.6, 11.2, -10.6], [11.4, 11.9, -5.4], 0.2), 0.35, -8);
  return [
    { sdf: box([5, 0, -11], [11, 1.2, -5], 0.3), material: M.wood },
    { sdf: box([7, 0, -9], [9, 10.5, -7]), material: M.woodDark },
    { sdf: top, material: M.wood },
    { sdf: book, material: (x) => (Math.abs(x - 8) < 0.45 ? M.woodDark : M.parchment) },
  ];
}

/** A writing desk with an open book, a quill in an ink pot, and a candle. */
function desk(): Part[] {
  return [
    ...tableTop(),
    ...candle(28, -10),
    { sdf: box([8, 13, -11], [20, 13.8, -5], 0.2), material: (x) => (Math.abs(x - 14) < 0.5 ? M.woodDark : M.parchment) },
    { sdf: cylinder([23, 14, -9], 'y', 1.1, 2.2), material: M.pieceBlack },
    { sdf: roundCone([23, 14.5, -9], [25.5, 21, -11], 0.25, 0.15), material: M.linen },
  ];
}

/** An anvil on a stump, with a hammer. */
function anvil(): Part[] {
  return [
    { sdf: cylinder([8, 2.5, -8], 'y', 5, 5), material: M.wood },
    { sdf: box([6, 4.5, -9.5], [10, 6, -6.5]), material: M.iron },
    { sdf: box([3, 6, -10], [13, 8.6, -6], 0.4), material: M.metal },
    { sdf: roundCone([13, 7.6, -8], [16, 7.9, -8], 1.3, 0.3), material: M.metal },
    { sdf: box([5, 8.6, -8.4], [9.5, 9.4, -7.6], 0.2), material: M.wood },
    { sdf: box([4, 8.6, -9.2], [6, 10.4, -6.8], 0.2), material: M.iron },
  ];
}

/** A table with a campaign map, dice and a figure. */
function maptable(): Part[] {
  const ink = (x: number, _y: number, z: number) => (noise3(x * 0.6, 0, z * 0.6, 77) > 0.68 || Math.abs(Math.sin(x * 0.7) * 2 + z + 8) < 0.35 ? M.bookBrown : M.parchment);
  return [
    ...tableTop(),
    { sdf: box([3, 13, -12], [27, 13.4, -4]), material: ink },
    { sdf: box([22, 13.4, -6.4], [23.8, 15.2, -4.6], 0.25), material: M.ivory },
    { sdf: box([25, 13.4, -7.4], [26.8, 15.2, -5.6], 0.25), material: M.dieRed },
    { sdf: roundCone([12, 13.4, -8], [12, 17.5, -8], 1.2, 0.5), material: M.metal },
    { sdf: sphere([12, 18, -8], 0.8), material: M.metal },
  ];
}

/** A table with a checkered game board and pieces. */
function boardtable(): Part[] {
  const squares = (x: number, _y: number, z: number) => ((Math.floor((x - 6) / 2.5) + Math.floor((z + 12.5) / 2.25)) % 2 === 0 ? M.ivory : M.pieceBlack);
  const parts: Part[] = [...tableTop(), { sdf: box([6, 13, -12.5], [26, 13.8, -3.5]), material: squares }];
  const pieces: [number, number, number][] = [
    [8, -11, M.dieRed], [13, -11, M.dieRed], [18, -8.8, M.dieRed], [23, -11, M.dieRed],
    [9.3, -5, M.pieceBlack], [14.3, -6.2, M.pieceBlack], [19.3, -5, M.pieceBlack], [24.3, -6.2, M.pieceBlack],
  ];
  for (const [x, z, material] of pieces) parts.push({ sdf: cylinder([x, 14.7, z], 'y', 0.85, 1.8), material });
  parts.push({ sdf: roundCone([16, 13.8, -7.8], [16, 17.5, -7.8], 1.1, 0.4), material: M.gold });
  return parts;
}

/** A standing oval mirror in a gilt frame: it shows a cold light. */
function mirror(): Part[] {
  return [
    { sdf: box([3, 0, -11], [4.2, 9, -9], 0.2), material: M.woodDark },
    { sdf: box([11.8, 0, -11], [13, 9, -9], 0.2), material: M.woodDark },
    { sdf: box([2, 0, -12], [14, 1, -8], 0.3), material: M.wood },
    { sdf: ellipsoid([8, 18, -10], [6, 10, 1.1]), material: M.gold },
    { sdf: ellipsoid([8, 18, -9.6], [4.8, 8.6, 1.2]), material: M.mirror },
  ];
}

/** A cabinet of glass bottles against the north wall. */
function apothecary(): Part[] {
  const parts: Part[] = [
    { sdf: subtract(box([1, 0, -16], [15, 30, -10]), box([2.2, 2, -14.8], [13.8, 28.4, -9])), material: M.wood },
    { sdf: box([2, 9.5, -15], [14, 10.6, -10]), material: M.wood },
    { sdf: box([2, 19, -15], [14, 20.1, -10]), material: M.wood },
  ];
  const glass = [M.bottleGreen, M.bottleRed, M.bottleAmber];
  for (const [shelf, base] of [[0, 2], [1, 10.6], [2, 20.1]] as const) {
    for (let i = 0, x = 3.2; x < 13; i++) {
      const r = 0.9 + hash(shelf, i, 51) * 0.6;
      const tall = 3 + hash(shelf, i, 52) * 3;
      const material = glass[Math.floor(hash(shelf, i, 53) * 3)]!;
      parts.push({ sdf: cylinder([x + r, base + tall / 2, -12.6], 'y', r, tall), material });
      parts.push({ sdf: sphere([x + r, base + tall + 0.4, -12.6], r * 0.55), material: M.woodDark });
      x += 2 * r + 0.6;
    }
  }
  return parts;
}

/** An open strongbox full of gold, with coins on the floor. */
function coinchest(): Part[] {
  const hollow = subtract(chestBody(), box([2.8, 2, -11.2], [13.2, 8, -3.8]));
  return [
    { sdf: hollow, material: (x) => (bands(x) ? M.metal : M.wood) },
    // The lid, thrown back and leaning against the wall behind.
    { sdf: tilt(box([2, 7, -14.6], [14, 11.5, -13], 0.3), -0.6, -13.8), material: (x) => (bands(x) ? M.metal : M.wood) },
    { sdf: intersect(ellipsoid([8, 7, -7.5], [5.4, 3, 3.9]), box([2.8, 0, -11.2], [13.2, 9.5, -3.8])), material: M.gold },
    { sdf: cylinder([14.5, 0.3, -2], 'y', 1.1, 0.6), material: M.gold },
    { sdf: cylinder([12.6, 0.3, -1.2], 'y', 1.1, 0.6), material: M.gold },
  ];
}

/** A notice board under a little roof, with papers pinned to it. */
function noticeboard(): Part[] {
  return [
    { sdf: box([2, 0, -10.5], [3.6, 22, -9]), material: M.woodDark },
    { sdf: box([28.4, 0, -10.5], [30, 22, -9]), material: M.woodDark },
    { sdf: box([2, 8, -11], [30, 20, -9.8], 0.2), material: M.wood },
    { sdf: box([5, 10, -9.8], [10.5, 17.5, -9.4]), material: M.parchment },
    { sdf: box([12.5, 11, -9.8], [18.5, 18.5, -9.4]), material: M.parchment },
    { sdf: box([21, 9.5, -9.8], [27, 15.5, -9.4]), material: M.parchment },
    { sdf: tilt(box([1, 20.5, -13], [31, 22, -7.5], 0.3), 0.3, -10), material: M.woodDark },
  ];
}

/** An iron street lamp with a lantern that is lit. */
function lamppost(): Part[] {
  // Iron bars on the edges of each face; lit glass between them.
  const lanternFrame = (x: number, y: number) =>
    Math.abs(x - 5.6) < 0.7 || Math.abs(x - 10.4) < 0.7 || Math.abs(y - 33.4) < 0.6 || Math.abs(y - 38.6) < 0.6 ? M.iron : M.lanternGlass;
  return [
    { sdf: cylinder([8, 0.75, -8], 'y', 2.2, 1.5), material: M.iron },
    { sdf: cylinder([8, 17, -8], 'y', 0.75, 32), material: M.iron },
    { sdf: box([5.5, 33, -10.5], [10.5, 39, -5.5]), material: lanternFrame },
    { sdf: roundCone([8, 39, -8], [8, 42, -8], 3.6, 0.4), material: M.iron },
  ];
}

/**
 * A signpost: a weathered post on the east side of its tile, and a board that points west, with
 * letters cut into it. (Only west: a mirror would mirror the light.)
 */
function signpost(): Part[] {
  const post = box([9.3, 0, -9], [12, 27, -7], 0.3);
  // The board: a plank from x 2 to 14, and an arrow point from x -2.5 to 2.
  const plank = box([2, 17.5, -7.4], [14, 23.5, -6.2], 0.25);
  const k = 3 / 4.5;
  const n = Math.hypot(1, k);
  const point: Sdf = (x, y, z) =>
    Math.max(box([-2.5, 17.5, -7.4], [2.2, 23.5, -6.2])(x, y, z), (y - 20.5 - k * (x + 2.5)) / n, (20.5 - y - k * (x + 2.5)) / n);
  // Letters: short cuts in a row, darker than the wood.
  const board = (x: number, y: number) => (y > 19.4 && y < 21.6 && x > 1 && x < 12.5 && hash(Math.floor(x * 1.4), 0, 61) > 0.38 ? M.woodDark : M.greyWood);
  return [
    { sdf: post, material: M.greyWood },
    { sdf: union(plank, point), material: board },
    { sdf: sphere([10.6, 22.5, -6], 0.5), material: M.metal },
    { sdf: sphere([10.6, 18.5, -6], 0.5), material: M.metal },
  ];
}

/** A round stone fountain, 3 x 3 tiles, with a basin, a pillar, an upper bowl and still water. */
function fountain(): Part[] {
  const c: Vec3 = [24, 0, -24];
  const stone = (x: number, y: number, z: number, _nx: number, ny: number) =>
    y < 1.2 + 1.5 * noise3(x * 0.4, 0, z * 0.4, 9) ? M.moss : ny > 0.7 ? M.cap : hash(Math.floor(x / 4), Math.floor(y / 3), Math.floor(z / 4)) < 0.5 ? M.stoneA : M.stoneB;
  const basin = subtract(cylinder([c[0], 3, c[2]], 'y', 21, 6), cylinder([c[0], 6, c[2]], 'y', 18.5, 6));
  const bowl = subtract(cylinder([c[0], 15, c[2]], 'y', 7, 2.4), cylinder([c[0], 16.5, c[2]], 'y', 5.8, 2));
  return [
    { sdf: basin, material: stone },
    { sdf: cylinder([c[0], 4.2, c[2]], 'y', 18.6, 0.6), material: M.water },
    { sdf: cylinder([c[0], 8, c[2]], 'y', 2.4, 14), material: stone },
    { sdf: bowl, material: stone },
    { sdf: cylinder([c[0], 15.6, c[2]], 'y', 5.9, 0.4), material: M.water },
    { sdf: sphere([c[0], 18.6, c[2]], 1.5), material: stone },
  ];
}

// The portal: a stone arch against the north wall, two tiles wide. Its glow is a separate frame,
// white, which the client tints with the colour of its light and blends additively.
const PORTAL_OPENING = union(box([7, -1, -20], [25, 22, 0]), cylinder([16, 22, -12], 'z', 9, 20));

function portalArch(): Part[] {
  const stone = (x: number, y: number, z: number, _nx: number, ny: number) => (ny > 0.7 ? M.cap : hash(Math.floor(x / 4), Math.floor(y / 3.5), 3) < 0.5 ? M.stoneA : M.stoneC);
  return [
    { sdf: subtract(box([2, 0, -15], [30, 34, -9], 0.3), PORTAL_OPENING), material: stone },
    { sdf: box([1, 0, -16], [31, 1.5, -7], 0.3), material: M.cap },
    { sdf: box([14.5, 29.5, -9.2], [17.5, 33, -8.6]), material: M.gold },
  ];
}

function portalGlow(): Part[] {
  return [{ sdf: intersect(box([7, 0, -12.5], [25, 31, -11.5]), PORTAL_OPENING), material: M.glow }];
}

function portalFrames(): Frame[] {
  const width = 40;
  const height = 64;
  const arch = render(portalArch(), width, height);
  const glow = render(portalGlow(), width, height);
  // Crop both by the arch's bounds, so the glow sits exactly in the arch.
  const cropped = cropToContent(arch, PIVOT_X, height - MARGIN_BELOW);
  const offsetX = Math.round(PIVOT_X - cropped.anchor.x * cropped.image.width);
  const offsetY = Math.round(height - MARGIN_BELOW - cropped.anchor.y * cropped.image.height);
  const glowImage = new Image(cropped.image.width, cropped.image.height);
  for (let y = 0; y < glowImage.height; y++) for (let x = 0; x < glowImage.width; x++) glowImage.set(x, y, glow.get(x + offsetX, y + offsetY));
  return [
    { name: 'fixture/portal', image: cropped.image, anchor: cropped.anchor },
    { name: 'fixture/portal-glow', image: glowImage, anchor: cropped.anchor },
  ];
}

// ---------------------------------------------------------------- themed props

/** A woven rug, 2 x 2 tiles, flat on the floor: a gold border round a field of diamonds. */
function rug(): Part[] {
  const pattern = (x: number, _y: number, z: number) => {
    if (x < 3 || x > 29 || z < -29 || z > -3) return x < 1.8 || x > 30.2 ? M.canvasBone : M.bookBrown;
    return Math.abs(((x + 32) % 8) - 4) + Math.abs(((z + 64) % 8) - 4) < 2.2 ? M.bookBrown : M.canvasWine;
  };
  return [{ sdf: box([1, 0, -31], [31, 0.5, -1]), material: pattern }];
}

function crate(): Part[] {
  const body = box([2, 0, -13], [14, 11, -4], 0.3);
  const frame = (x: number, y: number, z: number) => {
    const edge = [x - 2, 14 - x, y, 11 - y, z + 13, -4 - z].filter((d) => d < 1.3).length >= 2;
    return edge || Math.abs(x - 8 - (y - 5.5)) < 0.7 ? M.woodDark : y % 3.6 < 0.4 ? M.beam : M.wood;
  };
  return [{ sdf: body, material: frame }];
}

/** An iron cauldron on short legs over embers, full of a green brew that glows. */
function cauldron(): Part[] {
  const pot = subtract(intersect(sphere([8, 6, -8], 5.5), box([0, 0, -16], [16, 8.5, 0])), sphere([8, 7.5, -8], 4.6));
  return [
    { sdf: union(roundCone([5, 2, -6], [4, 0, -5], 0.6, 0.4), roundCone([11, 2, -6], [12, 0, -5], 0.6, 0.4), roundCone([8, 2, -11], [8, 0, -12], 0.6, 0.4)), material: M.iron },
    { sdf: pot, material: M.iron },
    { sdf: subtract(cylinder([8, 8.5, -8], 'y', 5.7, 1), cylinder([8, 8.5, -8], 'y', 4.7, 2)), material: M.metal },
    { sdf: cylinder([8, 7.9, -8], 'y', 4.7, 0.6), material: M.brew },
    { sdf: union(sphere([7, 0.5, -8], 1), sphere([9.4, 0.5, -7], 0.8)), material: M.coal },
  ];
}

/** A brass telescope on a wooden tripod, pointed at the sky. */
function telescope(): Part[] {
  const top: Vec3 = [8, 9, -8];
  return [
    { sdf: union(roundCone(top, [3, 0, -4], 0.5, 0.4), roundCone(top, [13, 0, -4], 0.5, 0.4), roundCone(top, [8, 0, -13], 0.5, 0.4)), material: M.wood },
    { sdf: roundCone([5, 9, -6], [13, 15, -11], 1.6, 1.1), material: M.gold },
    { sdf: roundCone([4, 8.3, -5.4], [5, 9, -6], 0.7, 0.8), material: M.metal },
  ];
}

/** An iron candelabra with three lit candles. */
function candelabra(): Part[] {
  const parts: Part[] = [
    { sdf: cylinder([8, 0.6, -9], 'y', 3, 1.2), material: M.iron },
    { sdf: cylinder([8, 9, -9], 'y', 0.6, 17), material: M.iron },
    { sdf: box([3, 16.2, -9.6], [13, 17.2, -8.4], 0.3), material: M.iron },
  ];
  for (const x of [3.5, 8, 12.5]) {
    parts.push({ sdf: cylinder([x, 19, -9], 'y', 0.75, 3.6), material: M.wax });
    parts.push({ sdf: sphere([x, 21.6, -9], 0.75), material: M.flame });
  }
  return parts;
}

/** A smithy's forge against the north wall, 2 tiles wide: a stone hearth of glowing coals under a hood. */
function forge(): Part[] {
  return [
    { sdf: box([1, 0, -16], [31, 9, -7], 0.4), material: (x, y) => (hash(Math.floor(x / 4), Math.floor(y / 3), 9) < 0.5 ? M.stoneA : M.stoneC) },
    { sdf: box([5, 9, -14], [27, 9.8, -9]), material: M.coal },
    { sdf: box([3, 9, -12.5], [5, 20, -10.5]), material: M.iron },
    { sdf: box([27, 9, -12.5], [29, 20, -10.5]), material: M.iron },
    { sdf: box([2, 20, -16], [30, 26, -10.5], 0.5), material: M.stoneC },
    { sdf: box([10, 26, -16], [22, 36, -12]), material: M.stoneC },
  ];
}

/** A crystal ball on a small round table. */
function crystalball(): Part[] {
  return [
    { sdf: cylinder([8, 0.4, -9], 'y', 3, 0.8), material: M.woodDark },
    { sdf: cylinder([8, 4, -9], 'y', 0.8, 7.5), material: M.woodDark },
    { sdf: cylinder([8, 8, -9], 'y', 4.5, 1), material: M.wine },
    { sdf: sphere([8, 11.3, -9], 2.6), material: M.orb },
  ];
}

/** Balance scales on a little counter, one pan lower with the weight of the coins. */
function scales(): Part[] {
  return [
    { sdf: box([2, 0, -12], [14, 8, -5], 0.3), material: M.wood },
    { sdf: cylinder([8, 12, -8.5], 'y', 0.5, 8), material: M.gold },
    { sdf: box([3, 15.6, -9], [13, 16.2, -8], 0.15), material: M.gold },
    { sdf: cylinder([3.5, 11.6, -8.5], 'y', 2, 0.4), material: M.gold },
    { sdf: cylinder([12.5, 12.8, -8.5], 'y', 2, 0.4), material: M.gold },
    { sdf: union(cylinder([4, 8.3, -6.5], 'y', 1, 0.5), cylinder([5.5, 8.3, -7], 'y', 1, 0.5)), material: M.gold },
  ];
}

// ---------------------------------------------------------------- hidden things of the wilds

/** A patch of wild herbs: low leafy clumps with a few pale buds (Wisdom finds it). */
function herbpatch(): Part[] {
  const clumps: [Vec3, number][] = [
    [[5, 1.4, -6], 2.6],
    [[10.5, 1.6, -9], 2.8],
    [[8.5, 1.2, -4.2], 2.2],
    [[11.8, 1.1, -5], 1.8],
    [[4.6, 1, -10.4], 1.9],
  ];
  const leaves = clumps.map(([c, r], i) => displace(ellipsoid(c, [r, r * 0.75, r]), 1.4, 1.1, 40 + i));
  const buds: Vec3[] = [
    [5.4, 3.3, -6.6],
    [10.2, 3.7, -9.4],
    [11.4, 3.5, -8.4],
    [8.2, 2.8, -4.6],
  ];
  return [
    { sdf: union(...leaves), material: (x, y, z) => (noise3(x * 0.9, y * 0.9, z * 0.9, 7) > 0.72 ? M.moss : M.herb) },
    { sdf: union(...buds.map((b) => sphere(b, 0.7))), material: M.herbFlower },
  ];
}

/** Dug earth over a buried box: a low, wide mound, a flat grey stone on it, and a corner of the box. */
function cache(): Part[] {
  const mound = displace(ellipsoid([8, -0.6, -8], [6.4, 2.4, 4.8]), 1, 0.8, 61);
  return [
    { sdf: mound, material: (x, y, z) => (noise3(x * 0.8, y, z * 0.8, 9) > 0.78 ? M.moss : M.soil) },
    { sdf: box([3.8, 0.8, -10.4], [8.2, 2.2, -7.4], 0.7), material: M.cap },
    { sdf: box([9, 0.2, -6.4], [12.6, 2.2, -3.8], 0.25), material: (x) => (Math.abs(x - 10.8) < 0.45 ? M.metal : M.wood) },
  ];
}

export function fixtureFrames(): Frame[] {
  return [
    fixture('bookshelf', bookshelf(), 24, 56),
    fixture('table', table(), 40, 40),
    fixture('bed', bed(), 24, 64),
    fixture('chest', chest(), 24, 32),
    fixture('barrel', barrel(), 24, 32),
    fixture('lectern', lectern(), 24, 40),
    fixture('desk', desk(), 40, 48),
    fixture('anvil', anvil(), 24, 32),
    fixture('maptable', maptable(), 40, 40),
    fixture('boardtable', boardtable(), 40, 40),
    fixture('mirror', mirror(), 24, 48),
    fixture('apothecary', apothecary(), 24, 56),
    fixture('coinchest', coinchest(), 24, 40),
    fixture('noticeboard', noticeboard(), 40, 48),
    fixture('lamppost', lamppost(), 24, 64),
    fixture('fountain', fountain(), 56, 88),
    ...portalFrames(),
    fixture('rug', rug(), 40, 48),
    fixture('crate', crate(), 24, 40),
    fixture('cauldron', cauldron(), 24, 32),
    fixture('telescope', telescope(), 24, 40),
    fixture('candelabra', candelabra(), 24, 40),
    fixture('forge', forge(), 40, 64),
    fixture('crystalball', crystalball(), 24, 32),
    fixture('scales', scales(), 24, 32),
    fixture('signpost', signpost(), 24, 40),
    fixture('herbpatch', herbpatch(), 24, 24),
    fixture('cache', cache(), 24, 24),
  ];
}
