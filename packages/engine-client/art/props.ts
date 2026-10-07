/**
 * Trees and rocks, rendered from SDF models with the same camera and light as the player.
 * The origin of each model is the centre of its trunk (or rock) on the ground; terrain.ts puts
 * that point on the centre of the solid box of the tile.
 */
import { random, ramp, cropToContent } from './raster.ts';
import { cappedCone, displace, ellipsoid, noise3, renderModel, roundCone, type Material, type Part, type Sdf, type Vec3 } from './sdf.ts';
import type { Frame } from './sprites.ts';

const NEEDLE_RAMP = ramp('#050a08', '#09120e', '#0e1a15', '#14241c', '#1b2f24', '#25402f', '#33533c');
const NEEDLES: Material = { ramp: NEEDLE_RAMP, dither: true };
/** Needles in the shade of the tier above. */
const NEEDLES_SHADED: Material = { ramp: NEEDLE_RAMP, dither: true, bias: -0.3 };
const BARK: Material = { ramp: ramp('#0b0908', '#15100d', '#1f1813', '#2a2019', '#362a20'), dither: true };
const DEAD_BARK: Material = { ramp: ramp('#0c0b0a', '#171513', '#22201c', '#2e2b26', '#3b3731', '#4a453d'), dither: true };
const STONE: Material = { ramp: ramp('#101113', '#1a1c1f', '#24272b', '#2f3338', '#3c4147', '#4f555c'), dither: true };
const MOSS: Material = { ramp: ramp('#0c120b', '#121c10', '#192615', '#21311b', '#2b3f22'), dither: true };

function render(parts: Part[], materials: Material[], width: number, height: number, shadowRadius: number): Frame['image'] {
  return renderModel(parts, materials, {
    width,
    height,
    pivotX: width / 2,
    pivotY: height - 8,
    yaw: 0,
    stepScale: 0.55,
    shadow: { radiusX: shadowRadius, radiusY: shadowRadius * 0.42, alpha: 0x78 },
  });
}

function frame(name: string, image: Frame['image'], width: number, height: number): Frame {
  const cropped = cropToContent(image, width / 2, height - 8);
  return { name, image: cropped.image, anchor: cropped.anchor };
}

/**
 * A dark spruce: a trunk under stacked tiers of needles. Each tier is a ragged cone with a
 * flat base (a round base would swell down into the tier below). A tier is twice as tall as
 * the space between tiers, so the skirt of each tier stands out over the tier below. Needles
 * just under the next skirt are in its shade.
 */
function spruce(seed: number, height: number, radius: number): Part[] {
  const parts: Part[] = [{ sdf: roundCone([0, -1, 0], [0, height * 0.35, 0], 2.0, 1.2), material: 1 }];
  const tiers = 6;
  const spacing = (height - 12) / tiers;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const base = 5 + i * spacing;
    const next = base + spacing;
    const cone = displace(cappedCone([0, base, 0], spacing * 1.9, radius * (1 - 0.78 * t) + 0.8, 0.4), 1.5, 0.85, seed + i);
    const nextRadius = radius * (1 - 0.78 * Math.min(1, (i + 1) / (tiers - 1))) + 0.8;
    parts.push({
      sdf: cone,
      material: (x, y, z) => (i < tiers - 1 && y > next - 1.8 && Math.hypot(x, z) < nextRadius ? 2 : 0),
    });
  }
  parts.push({ sdf: roundCone([0, height - 7, 0], [0, height, 0], 1.4, 0.2), material: 0 });
  return parts;
}

/** A dead tree: a crooked trunk, roots and bare branches that split twice. */
function deadTree(seed: number): Part[] {
  const rand = random(seed);
  const parts: Part[] = [];
  const bark = (sdf: Sdf): void => {
    parts.push({ sdf: displace(sdf, 0.45, 1.3, seed), material: 0 });
  };
  const trunk: Vec3[] = [[0, -1, 0], [0.8, 6, 0.3], [-0.6, 12, -0.2], [0.5, 19, 0.1]];
  const radii = [2.7, 2.2, 1.8, 1.4];
  for (let i = 0; i < trunk.length - 1; i++) bark(roundCone(trunk[i]!, trunk[i + 1]!, radii[i]!, radii[i + 1]!));
  for (let k = 0; k < 4; k++) {
    const angle = (k / 4) * Math.PI * 2 + rand();
    bark(roundCone([0, 1.4, 0], [Math.cos(angle) * 4.2, -0.5, Math.sin(angle) * 3.2], 1.25, 0.45));
  }
  const branch = (start: Vec3, dir: Vec3, length: number, radius: number, depth: number): void => {
    // A kink in the middle makes the branch crooked.
    const kink = (rand() - 0.5) * 0.8;
    const mid: Vec3 = [start[0] + dir[0] * length * 0.5 + kink, start[1] + dir[1] * length * 0.5, start[2] + dir[2] * length * 0.5 - kink];
    const end: Vec3 = [start[0] + dir[0] * length, start[1] + dir[1] * length, start[2] + dir[2] * length];
    const middle = radius * 0.85;
    bark(roundCone(start, mid, radius, middle));
    bark(roundCone(mid, end, middle, radius * 0.7));
    if (depth === 0) return;
    for (let k = 0; k < 2; k++) {
      const spread = (rand() - 0.5) * 1.6;
      const x = dir[0] + spread;
      const y = dir[1] + 0.3 + rand() * 0.3;
      const z = dir[2] + (rand() - 0.5) * 1.2;
      const l = Math.sqrt(x * x + y * y + z * z);
      branch(end, [x / l, y / l, z / l], length * 0.68, Math.max(0.55, radius * 0.62), depth - 1);
    }
  };
  const starts: [Vec3, number, number][] = [
    [trunk[2]!, -1, 1.15],
    [trunk[3]!, 1, 1.0],
    [trunk[3]!, -0.4, 0.95],
    [trunk[2]!, 0.8, 0.9],
  ];
  for (const [start, side, radius] of starts) {
    const x = side * (0.7 + rand() * 0.4);
    const y = 0.6 + rand() * 0.5;
    const z = (rand() - 0.5) * 0.8;
    const l = Math.sqrt(x * x + y * y + z * z);
    branch(start, [x / l, y / l, z / l], 8.5 + rand() * 3, radius, 2);
  }
  return parts;
}

/** A boulder with a smaller stone beside it, and moss on the surfaces that face up. */
function rock(seed: number): Part[] {
  const mossy = (x: number, y: number, z: number, _nx: number, ny: number): number =>
    ny > 0.5 && noise3(x * 0.5, y * 0.5, z * 0.5, seed + 9) > 0.42 ? 1 : 0;
  return [
    { sdf: displace(ellipsoid([0, 2.6, 0], [6.0, 4.2, 4.6]), 1.2, 0.5, seed), material: mossy },
    { sdf: displace(ellipsoid([4.6, 1.1, 2.4], [2.4, 1.8, 2.0]), 0.8, 0.7, seed + 1), material: mossy },
  ];
}

export function propFrames(): Frame[] {
  return [
    frame('prop/tree/0', render(spruce(11, 54, 12), [NEEDLES, BARK, NEEDLES_SHADED], 60, 84, 10), 60, 84),
    frame('prop/tree/1', render(spruce(23, 42, 10), [NEEDLES, BARK, NEEDLES_SHADED], 52, 72, 8.5), 52, 72),
    frame('prop/tree/2', render(deadTree(37), [DEAD_BARK], 64, 72, 7), 64, 72),
    frame('prop/rock/0', render(rock(5), [STONE, MOSS], 28, 24, 7.5), 28, 24),
  ];
}
