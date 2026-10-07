import { TICK_SECONDS, TILE_SIZE } from './constants.ts';
import type { SolidMap } from './world.ts';

/**
 * The movement intent for one tick. Each axis is in [-1, 1] and the length is at most 1. A
 * keyboard gives a unit vector; a joystick gives any length, so a small push walks slowly.
 * This is the message that a client will send to the server.
 */
export interface MoveInput {
  readonly x: number;
  readonly y: number;
}

export const NO_INPUT: MoveInput = { x: 0, y: 0 };

export type Facing = 'down' | 'up' | 'left' | 'right';

export interface PlayerState {
  /** The centre of the feet hitbox, in world pixels. */
  x: number;
  y: number;
  /** The velocity that the input asked for in the last tick, in pixels per second. */
  vx: number;
  vy: number;
  facing: Facing;
}

/** The speed at full input, in world pixels per second (5 tiles per second). */
export const PLAYER_SPEED = 80;

/** The feet hitbox is 10 x 6 pixels. Only the feet collide, so the head can overlap a wall. */
export const PLAYER_HALF_WIDTH = 5;
export const PLAYER_HALF_HEIGHT = 3;

export function createPlayer(x: number, y: number): PlayerState {
  return { x, y, vx: 0, vy: 0, facing: 'down' };
}

/**
 * Makes an input safe to use: it replaces values that are not finite with 0 and limits the
 * length to 1. The server must apply this to every input from a client.
 */
export function clampInput(input: MoveInput): MoveInput {
  const x = Number.isFinite(input.x) ? input.x : 0;
  const y = Number.isFinite(input.y) ? input.y : 0;
  const length = Math.hypot(x, y);
  return length > 1 ? { x: x / length, y: y / length } : { x, y };
}

/**
 * Selects the facing for a move. On a diagonal the current facing stays while it still points
 * along the move, so the sprite does not flicker between two directions.
 */
export function facingFor(current: Facing, move: MoveInput): Facing {
  const ax = Math.abs(move.x);
  const ay = Math.abs(move.y);
  if (ax < 0.01 && ay < 0.01) return current;
  const along =
    (current === 'left' && move.x < 0) ||
    (current === 'right' && move.x > 0) ||
    (current === 'up' && move.y < 0) ||
    (current === 'down' && move.y > 0);
  const horizontal = current === 'left' || current === 'right';
  if (along && (horizontal ? ax >= 0.7 * ay : ay >= 0.7 * ax)) return current;
  if (ax > ay) return move.x < 0 ? 'left' : 'right';
  return move.y < 0 ? 'up' : 'down';
}

/**
 * Moves the player along one axis, then pushes it out of each solid box that it overlaps.
 * One of dx and dy must be 0. The speed is less than one tile per tick, so the player cannot
 * pass through a box.
 */
function moveAxis(player: PlayerState, world: SolidMap, dx: number, dy: number): void {
  if (dx === 0 && dy === 0) return;
  player.x += dx;
  player.y += dy;
  const tx0 = Math.floor((player.x - PLAYER_HALF_WIDTH) / TILE_SIZE);
  const tx1 = Math.floor((player.x + PLAYER_HALF_WIDTH) / TILE_SIZE);
  const ty0 = Math.floor((player.y - PLAYER_HALF_HEIGHT) / TILE_SIZE);
  const ty1 = Math.floor((player.y + PLAYER_HALF_HEIGHT) / TILE_SIZE);
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const box = world.solidBox(tx, ty);
      if (!box) continue;
      const bx0 = tx * TILE_SIZE + box[0];
      const by0 = ty * TILE_SIZE + box[1];
      const bx1 = tx * TILE_SIZE + box[2];
      const by1 = ty * TILE_SIZE + box[3];
      const overlaps =
        player.x + PLAYER_HALF_WIDTH > bx0 &&
        player.x - PLAYER_HALF_WIDTH < bx1 &&
        player.y + PLAYER_HALF_HEIGHT > by0 &&
        player.y - PLAYER_HALF_HEIGHT < by1;
      if (!overlaps) continue;
      if (dx > 0) player.x = bx0 - PLAYER_HALF_WIDTH;
      else if (dx < 0) player.x = bx1 + PLAYER_HALF_WIDTH;
      else if (dy > 0) player.y = by0 - PLAYER_HALF_HEIGHT;
      else player.y = by1 + PLAYER_HALF_HEIGHT;
    }
  }
}

/**
 * Advances one player by one tick. This is the authoritative movement rule: the client runs
 * it for prediction and the server will run it to decide the true position.
 */
export function stepPlayer(player: PlayerState, input: MoveInput, world: SolidMap, dt = TICK_SECONDS): void {
  const move = clampInput(input);
  player.vx = move.x * PLAYER_SPEED;
  player.vy = move.y * PLAYER_SPEED;
  player.facing = facingFor(player.facing, move);
  // One axis at a time, so the player slides along a wall instead of a full stop.
  moveAxis(player, world, player.vx * dt, 0);
  moveAxis(player, world, 0, player.vy * dt);
}
