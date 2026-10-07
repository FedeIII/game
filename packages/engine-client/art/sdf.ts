/**
 * A tiny offline renderer for "pre-rendered" sprites, as Diablo made its sprites from 3D
 * models. A model is a list of parts; each part is a signed distance function (SDF) with a
 * material. The renderer casts one ray for each pixel through an orthographic camera that looks
 * down at the CAMERA_PITCH angle, lights the hit point with one fixed light, and puts the
 * result into the shades of the material. Then it adds a dark outline.
 *
 * Coordinates are in world pixels: x to the right, y up, z towards the viewer. A model stands
 * on y = 0 and faces +z (towards the camera) before the yaw turns it.
 */
import { Image } from './image.ts';
import { bayer, shadowEllipse } from './raster.ts';

export type Vec3 = readonly [number, number, number];
export type Sdf = (x: number, y: number, z: number) => number;

/** A material index, or a function of the model-space point and the world-space normal. */
export type MaterialOf = number | ((x: number, y: number, z: number, nx: number, ny: number, nz: number) => number);

export interface Part {
  readonly sdf: Sdf;
  readonly material: MaterialOf;
  /**
   * A sphere [cx, cy, cz, r] that holds the whole part, as a speed-up: far from the sphere the
   * renderer uses the distance to it, which is never more than the distance to the part, and
   * does not call `sdf`. Without it, the renderer calls `sdf` at every step.
   */
  readonly bound?: readonly [number, number, number, number];
}

export interface Material {
  /** Colours from the darkest to the lightest. */
  readonly ramp: readonly number[];
  /** Ordered dithering between two shades, for rough surfaces such as bark and stone. */
  readonly dither?: boolean;
  /** Added to the light level (-1..1). Use it for surfaces in shadow, such as a face in a hood. */
  readonly bias?: number;
}

export interface View {
  readonly width: number;
  readonly height: number;
  /** The pixel where the model origin (0, 0, 0) falls. */
  readonly pivotX: number;
  readonly pivotY: number;
  /** The turn of the model around the vertical axis, in radians. 0 faces the camera. */
  readonly yaw: number;
  /** The outline colour. Default: the darkest shade of the material at that pixel. */
  readonly outline?: number;
  /** A shadow on the ground under the origin, drawn first. */
  readonly shadow?: { readonly radiusX: number; readonly radiusY: number; readonly alpha: number };
  /** Less than 1 for parts with noise displacement, which break the distance bound. */
  readonly stepScale?: number;
  /**
   * 'pitch' (default): an orthographic camera tilted down by CAMERA_PITCH. Depth is
   * foreshortened, which suits round, small things: the player, trees, rocks.
   * 'oblique': depth is not foreshortened (1 pixel of depth = 1 pixel up), heights are scaled as
   * in 'pitch'. This matches the ground tiles, so it suits things that span whole tiles: walls,
   * doors, furniture.
   */
  readonly projection?: 'pitch' | 'oblique';
}

/** The camera looks down at this angle (radians) from the horizontal. */
export const CAMERA_PITCH = 0.42;

/** Screen pixels for each unit of height, in both projections. */
export const HEIGHT_SCALE = Math.cos(CAMERA_PITCH);

// One light for all art, fixed in the world: from the top left and a little from the front.
const LIGHT = normalize(-0.45, 0.75, 0.5);
const AMBIENT = 0.14;

function normalize(x: number, y: number, z: number): Vec3 {
  const length = Math.sqrt(x * x + y * y + z * z);
  return [x / length, y / length, z / length];
}

// ---------------------------------------------------------------- primitives

export function sphere(c: Vec3, r: number): Sdf {
  const [cx, cy, cz] = c;
  return (x, y, z) => {
    const dx = x - cx;
    const dy = y - cy;
    const dz = z - cz;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
  };
}

/** An ellipsoid (approximate distance, after Inigo Quilez). */
export function ellipsoid(c: Vec3, r: Vec3): Sdf {
  const [cx, cy, cz] = c;
  const [rx, ry, rz] = r;
  return (x, y, z) => {
    const px = (x - cx) / rx;
    const py = (y - cy) / ry;
    const pz = (z - cz) / rz;
    const k0 = Math.sqrt(px * px + py * py + pz * pz);
    const qx = px / rx;
    const qy = py / ry;
    const qz = pz / rz;
    const k1 = Math.sqrt(qx * qx + qy * qy + qz * qz);
    return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
  };
}

/** A cone with round ends: radius r1 at a, r2 at b (exact distance, after Inigo Quilez). */
export function roundCone(a: Vec3, b: Vec3, r1: number, r2: number): Sdf {
  const [ax, ay, az] = a;
  const bax = b[0] - ax;
  const bay = b[1] - ay;
  const baz = b[2] - az;
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  if (a2 <= 1e-6) return r1 >= r2 ? sphere(a, r1) : sphere(b, r2);
  const il2 = 1 / l2;
  const signRr = Math.sign(rr);
  return (x, y, z) => {
    const pax = x - ax;
    const pay = y - ay;
    const paz = z - az;
    const yv = pax * bax + pay * bay + paz * baz;
    const zv = yv - l2;
    const qx = pax * l2 - bax * yv;
    const qy = pay * l2 - bay * yv;
    const qz = paz * l2 - baz * yv;
    const x2 = qx * qx + qy * qy + qz * qz;
    const y2 = yv * yv * l2;
    const z2 = zv * zv * l2;
    const k = signRr * rr * rr * x2;
    if (Math.sign(zv) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
    if (Math.sign(yv) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
    return (Math.sqrt(x2 * a2 * il2) + yv * rr) * il2 - r1;
  };
}

/**
 * A vertical cone with flat ends: radius `bottom` at the base (y = base) and `top` at
 * y = base + height (exact distance, after Inigo Quilez).
 */
export function cappedCone(base: Vec3, height: number, bottom: number, top: number): Sdf {
  const [cx, by, cz] = base;
  const h = height / 2;
  const cy = by + h;
  const k2x = top - bottom;
  const k2y = 2 * h;
  const k2len = k2x * k2x + k2y * k2y;
  return (x, y, z) => {
    const qx = Math.sqrt((x - cx) * (x - cx) + (z - cz) * (z - cz));
    const qy = y - cy;
    const cax = qx - Math.min(qx, qy < 0 ? bottom : top);
    const cay = Math.abs(qy) - h;
    const t = Math.max(0, Math.min(1, ((top - qx) * k2x + (h - qy) * k2y) / k2len));
    const cbx = qx - top + k2x * t;
    const cby = qy - h + k2y * t;
    const sign = cbx < 0 && cay < 0 ? -1 : 1;
    return sign * Math.sqrt(Math.min(cax * cax + cay * cay, cbx * cbx + cby * cby));
  };
}

/** A box between two corners, with edges rounded by `radius` (exact distance). */
export function box(min: Vec3, max: Vec3, radius = 0): Sdf {
  const cx = (min[0] + max[0]) / 2;
  const cy = (min[1] + max[1]) / 2;
  const cz = (min[2] + max[2]) / 2;
  const hx = (max[0] - min[0]) / 2 - radius;
  const hy = (max[1] - min[1]) / 2 - radius;
  const hz = (max[2] - min[2]) / 2 - radius;
  return (x, y, z) => {
    const qx = Math.abs(x - cx) - hx;
    const qy = Math.abs(y - cy) - hy;
    const qz = Math.abs(z - cz) - hz;
    const ox = Math.max(qx, 0);
    const oy = Math.max(qy, 0);
    const oz = Math.max(qz, 0);
    return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - radius;
  };
}

/** A cylinder along an axis ('x', 'y' or 'z'), centred on `c`, with flat ends (exact distance). */
export function cylinder(c: Vec3, axis: 'x' | 'y' | 'z', radius: number, length: number): Sdf {
  const [cx, cy, cz] = c;
  const half = length / 2;
  return (x, y, z) => {
    const dx = x - cx;
    const dy = y - cy;
    const dz = z - cz;
    const along = axis === 'x' ? dx : axis === 'y' ? dy : dz;
    const across = axis === 'x' ? Math.sqrt(dy * dy + dz * dz) : axis === 'y' ? Math.sqrt(dx * dx + dz * dz) : Math.sqrt(dx * dx + dy * dy);
    const a = across - radius;
    const b = Math.abs(along) - half;
    const oa = Math.max(a, 0);
    const ob = Math.max(b, 0);
    return Math.sqrt(oa * oa + ob * ob) + Math.min(Math.max(a, b), 0);
  };
}

export function union(...sdfs: Sdf[]): Sdf {
  return (x, y, z) => {
    let d = Infinity;
    for (const sdf of sdfs) d = Math.min(d, sdf(x, y, z));
    return d;
  };
}

export function intersect(...sdfs: Sdf[]): Sdf {
  return (x, y, z) => {
    let d = -Infinity;
    for (const sdf of sdfs) d = Math.max(d, sdf(x, y, z));
    return d;
  };
}

export function subtract(from: Sdf, cut: Sdf): Sdf {
  return (x, y, z) => Math.max(from(x, y, z), -cut(x, y, z));
}

/** Smooth value noise in [0, 1] in 3D. */
export function noise3(x: number, y: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
  const fx = x - x0;
  const fy = y - y0;
  const fz = z - z0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const sz = fz * fz * (3 - 2 * fz);
  const h = (i: number, j: number, k: number): number => {
    let v = Math.imul(i, 0x27d4eb2d) ^ Math.imul(j, 0x165667b1) ^ Math.imul(k, 0x61c88647) ^ Math.imul(seed, 0x9e3779b1);
    v = Math.imul(v ^ (v >>> 15), 0x2c1b3c6d);
    v = Math.imul(v ^ (v >>> 12), 0x297a2d39);
    v ^= v >>> 15;
    return (v >>> 0) / 4294967296;
  };
  const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
  const x00 = lerp(h(x0, y0, z0), h(x0 + 1, y0, z0), sx);
  const x10 = lerp(h(x0, y0 + 1, z0), h(x0 + 1, y0 + 1, z0), sx);
  const x01 = lerp(h(x0, y0, z0 + 1), h(x0 + 1, y0, z0 + 1), sx);
  const x11 = lerp(h(x0, y0 + 1, z0 + 1), h(x0 + 1, y0 + 1, z0 + 1), sx);
  return lerp(lerp(x00, x10, sy), lerp(x01, x11, sy), sz);
}

/** Moves the surface in and out with noise: bark, needles, rough stone. */
export function displace(sdf: Sdf, amount: number, scale: number, seed: number): Sdf {
  return (x, y, z) => sdf(x, y, z) + amount * (noise3(x * scale, y * scale, z * scale, seed) - 0.5);
}

// ---------------------------------------------------------------- renderer

const FAR = 90;
const MAX_STEPS = 220;
const HIT = 0.01;
/** Closer than this to a part's bound, the renderer uses the part's own distance. */
const BOUND_MARGIN = 0.5;
/** A neighbour that is this much nearer to the camera casts a dark contact line on a pixel. */
const EDGE_DEPTH = 2;

export function renderModel(parts: readonly Part[], materials: readonly Material[], view: View): Image {
  const { width, height, pivotX, pivotY } = view;
  const stepScale = view.stepScale ?? 0.9;
  const cosYaw = Math.cos(view.yaw);
  const sinYaw = Math.sin(view.yaw);

  // The camera, in world space. A pixel maps to "screen up" u = y * upY + z * upZ. For 'pitch'
  // the rays are perpendicular to the screen; for 'oblique' they keep u constant with depth
  // not foreshortened (upZ = -1), so they slant.
  const oblique = view.projection === 'oblique';
  const upY = oblique ? HEIGHT_SCALE : Math.cos(CAMERA_PITCH);
  const upZ = oblique ? -1 : -Math.sin(CAMERA_PITCH);
  const rayLength = oblique ? Math.sqrt(1 + HEIGHT_SCALE * HEIGHT_SCALE) : 1;
  const dirY = oblique ? -1 / rayLength : -Math.sin(CAMERA_PITCH);
  const dirZ = oblique ? -HEIGHT_SCALE / rayLength : -Math.cos(CAMERA_PITCH);
  // Slanted rays travel further to cross the same depth.
  const maxT = oblique ? 4 * FAR : 2 * FAR;
  // The model turns by the yaw; the ray turns the other way instead. World to model:
  // mx = wx cos - wz sin, mz = wx sin + wz cos.
  const mdx = -dirZ * sinYaw;
  const mdz = dirZ * cosYaw;
  const mdy = dirY;

  let nearest = 0;
  const count = parts.length;
  const bounds = parts.map((p) => p.bound ?? null);
  const scene = (x: number, y: number, z: number): number => {
    let best = Infinity;
    for (let i = 0; i < count; i++) {
      const b = bounds[i];
      if (b) {
        // Outside the bound by more than BOUND_MARGIN: the distance to the bound is a safe step,
        // and it can never be a hit, so `nearest` is always a part that was really evaluated.
        const bx = x - b[0];
        const by = y - b[1];
        const bz = z - b[2];
        const outside = Math.sqrt(bx * bx + by * by + bz * bz) - b[3];
        if (outside >= best) continue;
        if (outside > BOUND_MARGIN) {
          best = outside;
          nearest = i;
          continue;
        }
      }
      const d = parts[i]!.sdf(x, y, z);
      if (d < best) {
        best = d;
        nearest = i;
      }
    }
    return best;
  };

  // When every part has a bound, rays are clipped to the box round all bounds: a ray that
  // misses the box is empty, and the march starts where the ray enters it.
  let box: [number, number, number, number, number, number] | null = null;
  if (count > 0 && bounds.every((b) => b !== null)) {
    box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (const b of bounds as (readonly [number, number, number, number])[]) {
      for (let a = 0; a < 3; a++) {
        box[a] = Math.min(box[a]!, b[a]! - b[3] - BOUND_MARGIN);
        box[a + 3] = Math.max(box[a + 3]!, b[a]! + b[3] + BOUND_MARGIN);
      }
    }
  }
  const direction = [mdx, mdy, mdz];

  const size = width * height;
  const depth = new Float32Array(size).fill(Infinity);
  const level = new Int8Array(size).fill(-1);
  const materialAt = new Int16Array(size).fill(-1);

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const sx = px + 0.5 - pivotX;
      const sy = pivotY - (py + 0.5);
      const wx = sx;
      // A start point on the ray, FAR behind the model: for 'pitch' move back along the ray
      // from the screen plane; for 'oblique' pick z = FAR and solve u for y.
      const wy = oblique ? (sy + FAR) / HEIGHT_SCALE : sy * upY - dirY * FAR;
      const wz = oblique ? FAR : sy * upZ - dirZ * FAR;
      const ox = wx * cosYaw - wz * sinYaw;
      const oy = wy;
      const oz = wx * sinYaw + wz * cosYaw;

      let t = 0;
      let end = maxT;
      if (box) {
        const origin = [ox, oy, oz];
        let enter = 0;
        let exit = maxT;
        for (let a = 0; a < 3; a++) {
          const o = origin[a]!;
          const d = direction[a]!;
          if (Math.abs(d) < 1e-9) {
            if (o < box[a]! || o > box[a + 3]!) exit = -1;
            continue;
          }
          const t1 = (box[a]! - o) / d;
          const t2 = (box[a + 3]! - o) / d;
          enter = Math.max(enter, Math.min(t1, t2));
          exit = Math.min(exit, Math.max(t1, t2));
        }
        if (exit < enter) continue;
        t = enter;
        end = exit;
      }
      let hit = false;
      for (let step = 0; step < MAX_STEPS && t < end; step++) {
        const d = scene(ox + mdx * t, oy + mdy * t, oz + mdz * t);
        if (d < HIT) {
          hit = true;
          break;
        }
        t += Math.max(d * stepScale, 0.005);
      }
      if (!hit) continue;

      const x = ox + mdx * t;
      const y = oy + mdy * t;
      const z = oz + mdz * t;
      const part = parts[nearest]!;
      const e = 0.02;
      let nx = part.sdf(x + e, y, z) - part.sdf(x - e, y, z);
      const ny = part.sdf(x, y + e, z) - part.sdf(x, y - e, z);
      let nz = part.sdf(x, y, z + e) - part.sdf(x, y, z - e);
      const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      // Model to world for the normal: wx = mx cos + mz sin, wz = -mx sin + mz cos.
      const wnx = (nx * cosYaw + nz * sinYaw) / nl;
      const wnz = (-nx * sinYaw + nz * cosYaw) / nl;
      const wny = ny / nl;
      nx = wnx;
      nz = wnz;

      const m = typeof part.material === 'number' ? part.material : part.material(x, y, z, wnx, wny, wnz);
      const material = materials[m];
      if (!material) throw new Error(`no material ${m}`);
      const dot = wnx * LIGHT[0] + wny * LIGHT[1] + wnz * LIGHT[2];
      const light = AMBIENT + (1 - AMBIENT) * (0.3 * (0.5 + 0.5 * dot) + 0.7 * Math.max(0, dot)) + (material.bias ?? 0);
      const steps = material.ramp.length - 1;
      const f = Math.max(0, Math.min(1, light)) * steps;
      const index = py * width + px;
      level[index] = Math.max(0, Math.min(steps, material.dither ? Math.floor(f + bayer(px, py)) : Math.round(f)));
      materialAt[index] = m;
      depth[index] = t;
    }
  }

  const image = new Image(width, height);
  if (view.shadow) shadowEllipse(image, pivotX, pivotY, view.shadow.radiusX, view.shadow.radiusY, view.shadow.alpha);

  const filled = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < width && y < height && level[y * width + x]! >= 0;
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const index = py * width + px;
      if (level[index]! < 0) continue;
      const material = materials[materialAt[index]!]!;
      const neighbours: [number, number][] = [[px - 1, py], [px + 1, py], [px, py - 1], [px, py + 1]];
      if (neighbours.some(([x, y]) => !filled(x, y))) {
        image.set(px, py, view.outline ?? material.ramp[0]!);
        continue;
      }
      let shade = level[index]!;
      if (neighbours.some(([x, y]) => depth[y * width + x]! < depth[index]! - EDGE_DEPTH)) shade = Math.max(0, shade - 1);
      image.set(px, py, material.ramp[shade]!);
    }
  }
  return image;
}
