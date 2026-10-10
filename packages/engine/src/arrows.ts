import { TILE_SIZE } from './constants.ts';
import type { Blow } from './mobs.ts';
import type { Box } from './world.ts';

/**
 * Arrows: a ranger's attacks fly (traits.ts, PlayerTraits.ranged). An arrow flies straight, at
 * ARROW_SPEED, until it hits the first mob on its way, a thing that stops it (a wall, a closed door,
 * a tree trunk, a rock, furniture; not water), or the end of its range. A shared world's Room
 * flies the true arrows (the Horde has them); the page of the shooter flies its own copy at once,
 * with the same function, so the blow shows without the wait for the server.
 */

/** World pixels per second. */
export const ARROW_SPEED = 240;
/** An arrow starts this far in front of the shooter's feet (world pixels). */
export const ARROW_START = 6;
/** An arrow hits a mob whose centre is this close, plus the mob's radius (world pixels). */
export const ARROW_RADIUS = 1.5;
/** The longest move in one go, so an arrow does not pass through a thing or a mob. */
const ARROW_STEP = 4;

export interface Arrow {
  readonly id: number;
  /** The id of the player who shot it. */
  readonly owner: number;
  x: number;
  y: number;
  /** Its direction (radians, as MoveInput.attack). */
  readonly aim: number;
  /** The world pixels that it can still fly. */
  left: number;
  readonly blow: Blow;
}

/** What stops an arrow: the part of a tile that it cannot fly through, or null. */
export interface ShotMap {
  shotBox(tx: number, ty: number): Box | null;
}

/** A thing that an arrow can hit: its centre and radius. */
export interface ArrowTarget {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

/** A new arrow from (x, y) in the direction `aim`, ARROW_START in front of it. */
export function newArrow(id: number, owner: number, x: number, y: number, aim: number, range: number, blow: Blow): Arrow {
  return { id, owner, x: x + Math.cos(aim) * ARROW_START, y: y + Math.sin(aim) * ARROW_START, aim, left: Math.max(0, range - ARROW_START), blow };
}

/**
 * Moves an arrow on by `dt` seconds. Returns the index of the target that it hit, -1 if it is
 * spent (a thing stopped it, or its range ended), or null if it flies on.
 */
export function flyArrow(arrow: Arrow, world: ShotMap, dt: number, targets: readonly ArrowTarget[]): number | -1 | null {
  let distance = Math.min(arrow.left, ARROW_SPEED * dt);
  const cx = Math.cos(arrow.aim);
  const cy = Math.sin(arrow.aim);
  while (distance > 0) {
    const step = Math.min(ARROW_STEP, distance);
    arrow.x += cx * step;
    arrow.y += cy * step;
    arrow.left -= step;
    distance -= step;
    const hit = targets.findIndex((t) => Math.hypot(t.x - arrow.x, t.y - arrow.y) <= t.radius + ARROW_RADIUS);
    if (hit >= 0) return hit;
    const tx = Math.floor(arrow.x / TILE_SIZE);
    const ty = Math.floor(arrow.y / TILE_SIZE);
    const box = world.shotBox(tx, ty);
    if (box) {
      const lx = arrow.x - tx * TILE_SIZE;
      const ly = arrow.y - ty * TILE_SIZE;
      if (lx >= box[0] && lx < box[2] && ly >= box[1] && ly < box[3]) return -1;
    }
  }
  return arrow.left <= 0 ? -1 : null;
}
