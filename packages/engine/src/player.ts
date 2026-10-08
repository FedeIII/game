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
  /**
   * An attack in this tick, towards this side. The client picks the side (the way the player
   * faces, or the nearest mob), so the server repeats the same step.
   */
  readonly attack?: Facing;
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
  /** Ticks left of the attack in progress (0: none). The player stands still while it strikes. */
  attack: number;
  /** Ticks before the player can attack again. */
  cooldown: number;
  /** Ticks left of a stun (0: none): the player cannot move or attack. A mob's hit stuns. */
  stun: number;
  /** Ticks left after a stun in which no mob can hit the player again. */
  guard: number;
}

/** An attack lasts this many ticks (0.3 s); a new one can start this many ticks after the last. */
export const ATTACK_TICKS = 18;
export const ATTACK_COOLDOWN_TICKS = 27;
/** After a stun, mobs cannot hit the player for this many ticks (1 s). */
export const GUARD_TICKS = 60;
/** An attack hits a mob whose centre is this close (plus the mob's radius), in front of the player. */
export const ATTACK_REACH = 22;
/** "In front": at most this angle (radians) from the side that the attack goes to. */
export const ATTACK_ARC = 1.25;

/** The speed at full input, in world pixels per second (5 tiles per second). */
export const PLAYER_SPEED = 80;

/** The feet hitbox is 10 x 6 pixels. Only the feet collide, so the head can overlap a wall. */
export const PLAYER_HALF_WIDTH = 5;
export const PLAYER_HALF_HEIGHT = 3;

export function createPlayer(x: number, y: number): PlayerState {
  return { x, y, vx: 0, vy: 0, facing: 'down', attack: 0, cooldown: 0, stun: 0, guard: 0 };
}

/** Whether the player can start an attack in its next tick. */
export function canAttack(player: PlayerState): boolean {
  return player.stun === 0 && player.attack === 0 && player.cooldown === 0;
}

/** Whether a mob can hit the player now: not stunned, and not just after a stun. */
export function canBeHit(player: PlayerState): boolean {
  return player.stun === 0 && player.guard === 0;
}

/** A hit: the player stops, its attack ends, and it cannot act for `ticks` ticks. */
export function stunPlayer(player: PlayerState, ticks: number): void {
  player.stun = Math.max(player.stun, ticks);
  player.attack = 0;
  player.vx = 0;
  player.vy = 0;
}

/** A unit vector for a facing, in world pixels (y down). */
export function facingVector(facing: Facing): readonly [number, number] {
  return facing === 'left' ? [-1, 0] : facing === 'right' ? [1, 0] : facing === 'up' ? [0, -1] : [0, 1];
}

/**
 * Whether an attack from (px, py) towards `facing` hits a thing at (x, y) with radius `radius`:
 * close enough, and in front (or so close that the side does not matter).
 */
export function attackHits(px: number, py: number, facing: Facing, x: number, y: number, radius: number): boolean {
  const dx = x - px;
  const dy = y - py;
  const d = Math.hypot(dx, dy);
  if (d > ATTACK_REACH + radius) return false;
  if (d <= radius + 4) return true;
  const [fx, fy] = facingVector(facing);
  return (dx * fx + dy * fy) / d >= Math.cos(ATTACK_ARC);
}

/**
 * Makes an input safe to use: it replaces values that are not finite with 0 and limits the
 * length to 1. The server must apply this to every input from a client.
 */
export function clampInput(input: MoveInput): MoveInput {
  const x = Number.isFinite(input.x) ? input.x : 0;
  const y = Number.isFinite(input.y) ? input.y : 0;
  const length = Math.hypot(x, y);
  const move = length > 1 ? { x: x / length, y: y / length } : { x, y };
  return input.attack ? { ...move, attack: input.attack } : move;
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
 * Moves a feet box (centre `body`, half sizes hw and hh) along one axis, then pushes it out of
 * each solid box that it overlaps. One of dx and dy must be 0. The step must be less than one
 * tile, so the box cannot pass through a solid box. Players and mobs move with it.
 */
export function moveAxis(body: { x: number; y: number }, world: SolidMap, dx: number, dy: number, hw = PLAYER_HALF_WIDTH, hh = PLAYER_HALF_HEIGHT): void {
  if (dx === 0 && dy === 0) return;
  body.x += dx;
  body.y += dy;
  const tx0 = Math.floor((body.x - hw) / TILE_SIZE);
  const tx1 = Math.floor((body.x + hw) / TILE_SIZE);
  const ty0 = Math.floor((body.y - hh) / TILE_SIZE);
  const ty1 = Math.floor((body.y + hh) / TILE_SIZE);
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const box = world.solidBox(tx, ty);
      if (!box) continue;
      const bx0 = tx * TILE_SIZE + box[0];
      const by0 = ty * TILE_SIZE + box[1];
      const bx1 = tx * TILE_SIZE + box[2];
      const by1 = ty * TILE_SIZE + box[3];
      const overlaps = body.x + hw > bx0 && body.x - hw < bx1 && body.y + hh > by0 && body.y - hh < by1;
      if (!overlaps) continue;
      if (dx > 0) body.x = bx0 - hw;
      else if (dx < 0) body.x = bx1 + hw;
      else if (dy > 0) body.y = by0 - hh;
      else body.y = by1 + hh;
    }
  }
}

/**
 * Advances one player by one tick. This is the authoritative rule: the client runs it for
 * prediction and the server runs it to decide the true state. A stunned player and a player
 * that strikes stand still. Returns true if an attack starts in this tick: the caller finds
 * what it hits (a client alone, or the server).
 */
export function stepPlayer(player: PlayerState, input: MoveInput, world: SolidMap, dt = TICK_SECONDS): boolean {
  if (player.cooldown > 0) player.cooldown--;
  if (player.stun > 0) {
    player.stun--;
    if (player.stun === 0) player.guard = GUARD_TICKS;
    player.vx = 0;
    player.vy = 0;
    return false;
  }
  if (player.guard > 0) player.guard--;
  if (player.attack > 0) {
    player.attack--;
    player.vx = 0;
    player.vy = 0;
    return false;
  }
  const move = clampInput(input);
  if (move.attack && player.cooldown === 0) {
    player.attack = ATTACK_TICKS;
    player.cooldown = ATTACK_COOLDOWN_TICKS;
    player.facing = move.attack;
    player.vx = 0;
    player.vy = 0;
    return true;
  }
  player.vx = move.x * PLAYER_SPEED;
  player.vy = move.y * PLAYER_SPEED;
  player.facing = facingFor(player.facing, move);
  // One axis at a time, so the player slides along a wall instead of a full stop.
  moveAxis(player, world, player.vx * dt, 0);
  moveAxis(player, world, 0, player.vy * dt);
  return false;
}
