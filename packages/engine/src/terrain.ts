import { fbm, hash01 } from './noise.ts';
import { Decor, Ground } from './world.ts';

/**
 * A toolkit for natural terrain from a seed: lakes with sandy shores, winding mud paths, two
 * kinds of grass, forests where no two trees touch, and scattered rocks, tufts, flowers and
 * pebbles. Worlds use it as it is (the wilds) or for their outskirts (a town).
 */

// Seed offsets. Each noise field has its own offset, so the fields do not correlate.
const ELEVATION = 0;
const PATHS = 7_001;
const LUSH = 13_007;
const FOREST = 19_009;
const SCATTER = 23_011;
const TREE_PICK = 29_017;

export function naturalGround(seed: number, tx: number, ty: number): Ground {
  const elevation = fbm(tx / 56, ty / 56, seed + ELEVATION, 4);
  if (elevation < 0.34) return Ground.Water;
  if (elevation < 0.37) return Ground.Sand;
  const path = Math.abs(fbm(tx / 44, ty / 44, seed + PATHS, 3) - 0.5);
  if (path < 0.0105) return Ground.Dirt;
  return fbm(tx / 18, ty / 18, seed + LUSH, 3) > 0.55 ? Ground.DarkGrass : Ground.Grass;
}

export function isGrass(ground: Ground): boolean {
  return ground === Ground.Grass || ground === Ground.DarkGrass;
}

/**
 * A tree grows on a tile when the tile's forest value is over `threshold` and its random value
 * is the largest in its 3x3 neighbourhood. Thus no two trees touch, also across chunk borders.
 * A threshold of 0 makes a forest everywhere.
 */
export function hasTree(seed: number, tx: number, ty: number, threshold = 0.53): boolean {
  if (threshold > 0 && fbm(tx / 26, ty / 26, seed + FOREST, 3) < threshold) return false;
  const own = hash01(tx, ty, seed + TREE_PICK);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if ((dx !== 0 || dy !== 0) && hash01(tx + dx, ty + dy, seed + TREE_PICK) >= own) return false;
    }
  }
  return true;
}

export function naturalDecor(seed: number, tx: number, ty: number, ground: Ground, treeThreshold = 0.53): Decor {
  if (ground === Ground.Water) return Decor.None;
  if (isGrass(ground) && hasTree(seed, tx, ty, treeThreshold)) return Decor.Tree;
  const roll = hash01(tx, ty, seed + SCATTER);
  if (roll < 0.006 && ground !== Ground.Sand) return Decor.Rock;
  if (isGrass(ground)) {
    if (roll < 0.035) return Decor.Flowers;
    if (roll < 0.13) return Decor.Tuft;
  } else if (roll < 0.07) {
    return Decor.Pebbles;
  }
  return Decor.None;
}
