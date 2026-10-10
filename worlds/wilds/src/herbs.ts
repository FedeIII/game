import { Decor, Ground, hash2, isGrass, naturalDecor, naturalGround, solidBox, type Fixture } from '@game/engine';
import { BUILDING_CELL } from './houses.ts';

/**
 * Herbs in the woods (Wisdom): about one patch of wild herbs in each cell of the wilds, low between
 * the trees. A patch is hidden (Fixture.hidden): a character sees it only within its `seek`. A
 * press gathers a bundle of herbs, and the patch grows again 20 minutes later (Fede's choice,
 * 2026-10-10; source.ts, HERB_LOOT).
 */

const SEED_OFFSET = 52_711;
/** A cell tries this many tiles for its patch; the first good one has it. */
const TRIES = 4;
/** A patch stands at least this far (tiles) inside the edge of its cell. */
const EDGE = 3;
/** A patch has a way out: open ground from it to a tile this far away (tiles). */
const OPEN_RADIUS = 6;

const SIDES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/** Whether a tile of natural ground is solid: water, a tree or a rock. */
export function naturalSolid(seed: number, tx: number, ty: number): boolean {
  const ground = naturalGround(seed, tx, ty);
  return solidBox(ground, naturalDecor(seed, tx, ty, ground)) !== null;
}

/**
 * The patch of herbs of a cell of the wilds, or null. `banned` says where no patch may stand (the
 * ground of a house, the road, the town); `solid` where nobody walks. A patch stands on grass, with
 * open ground on its four sides and a way out through the trees. Its own tile has nothing on it
 * (the source clears a tree or a tuft there).
 */
export function herbPatch(seed: number, cellX: number, cellY: number, banned: (tx: number, ty: number) => boolean, solid: (tx: number, ty: number) => boolean): Fixture | null {
  const span = BUILDING_CELL - 2 * EDGE;
  for (let i = 0; i < TRIES; i++) {
    const h = hash2(cellX, cellY, seed + SEED_OFFSET + i);
    const tx = cellX * BUILDING_CELL + EDGE + (h % span);
    const ty = cellY * BUILDING_CELL + EDGE + ((h >>> 12) % span);
    if (!isGrass(naturalGround(seed, tx, ty)) || banned(tx, ty)) continue;
    if (SIDES.some(([dx, dy]) => solid(tx + dx, ty + dy))) continue;
    if (!opensOut(tx, ty, solid)) continue;
    return { kind: 'herbpatch', tx, ty, hidden: true };
  }
  return null;
}

/** Whether open ground leads from (tx, ty) to a tile OPEN_RADIUS tiles away (in either axis). */
function opensOut(tx: number, ty: number, solid: (tx: number, ty: number) => boolean): boolean {
  const seen = new Set<string>([`${tx},${ty}`]);
  const queue: [number, number][] = [[tx, ty]];
  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    if (Math.max(Math.abs(x - tx), Math.abs(y - ty)) >= OPEN_RADIUS) return true;
    for (const [dx, dy] of SIDES) {
      const [nx, ny] = [x + dx, y + dy];
      const key = `${nx},${ny}`;
      if (seen.has(key) || solid(nx, ny)) continue;
      seen.add(key);
      queue.push([nx, ny]);
    }
  }
  return false;
}

/** What the ground of a patch's tile shows: the grass of the wilds, with nothing growing on it but the herbs. */
export function patchGround(seed: number, tx: number, ty: number): { ground: Ground; decor: Decor } {
  return { ground: naturalGround(seed, tx, ty), decor: Decor.None };
}
