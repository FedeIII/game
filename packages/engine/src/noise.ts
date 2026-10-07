/**
 * Deterministic hash and noise functions. They use only integer math and Math.floor, so the
 * client and the server get the same world from the same seed.
 */

/** Hashes a lattice point and a seed to an unsigned 32-bit integer. */
export function hash2(x: number, y: number, seed: number): number {
  let h = (seed | 0) ^ Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  h ^= h >>> 15;
  return h >>> 0;
}

/** Hashes a lattice point and a seed to a number in [0, 1). */
export function hash01(x: number, y: number, seed: number): number {
  return hash2(x, y, seed) / 4294967296;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Smooth value noise in [0, 1], with one random value on each integer lattice point. */
export function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const sx = smooth(x - x0);
  const sy = smooth(y - y0);
  const top = lerp(hash01(x0, y0, seed), hash01(x0 + 1, y0, seed), sx);
  const bottom = lerp(hash01(x0, y0 + 1, seed), hash01(x0 + 1, y0 + 1, seed), sx);
  return lerp(top, bottom, sy);
}

/** Fractal noise: the sum of octaves of value noise, normalized to [0, 1]. */
export function fbm(x: number, y: number, seed: number, octaves: number): number {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amplitude * valueNoise(x * frequency, y * frequency, seed + i * 1013);
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return sum / norm;
}

/** Mulberry32: a small seeded random generator. Use it only with a seed made from world data. */
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
