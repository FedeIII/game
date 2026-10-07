import { describe, expect, it } from 'vitest';
import {
  PLAYER_HALF_WIDTH,
  PLAYER_SPEED,
  TICK_RATE,
  TILE_SIZE,
  clampInput,
  createPlayer,
  facingFor,
  stepPlayer,
  type Box,
  type SolidMap,
} from '../src/index.ts';

const OPEN: SolidMap = { solidBox: () => null };
const FULL: Box = [0, 0, TILE_SIZE, TILE_SIZE];

/** A map with one solid column of tiles at tile x = 2. */
const WALL: SolidMap = { solidBox: (tx) => (tx === 2 ? FULL : null) };

function steps(count: number, run: () => void): void {
  for (let i = 0; i < count; i++) run();
}

describe('stepPlayer', () => {
  it('moves at PLAYER_SPEED with full input', () => {
    const player = createPlayer(0, 0);
    steps(TICK_RATE, () => stepPlayer(player, { x: 1, y: 0 }, OPEN));
    expect(player.x).toBeCloseTo(PLAYER_SPEED, 6);
    expect(player.y).toBe(0);
  });

  it('is not faster on a diagonal', () => {
    const player = createPlayer(0, 0);
    steps(TICK_RATE, () => stepPlayer(player, { x: 1, y: 1 }, OPEN));
    expect(Math.hypot(player.x, player.y)).toBeCloseTo(PLAYER_SPEED, 6);
  });

  it('moves slowly with a small input', () => {
    const player = createPlayer(0, 0);
    steps(TICK_RATE, () => stepPlayer(player, { x: 0, y: -0.25 }, OPEN));
    expect(player.y).toBeCloseTo(-PLAYER_SPEED / 4, 6);
  });

  it('stops at a wall', () => {
    const player = createPlayer(8, 8);
    steps(TICK_RATE, () => stepPlayer(player, { x: 1, y: 0 }, WALL));
    expect(player.x).toBe(2 * TILE_SIZE - PLAYER_HALF_WIDTH);
  });

  it('slides along a wall on a diagonal', () => {
    const player = createPlayer(8, 8);
    steps(TICK_RATE, () => stepPlayer(player, { x: Math.SQRT1_2, y: Math.SQRT1_2 }, WALL));
    expect(player.x).toBe(2 * TILE_SIZE - PLAYER_HALF_WIDTH);
    expect(player.y).toBeCloseTo(8 + PLAYER_SPEED * Math.SQRT1_2, 6);
  });

  it('cannot pass a thin solid box at full speed', () => {
    const post: SolidMap = { solidBox: (tx, ty) => (tx === 3 && ty === 0 ? [7, 0, 9, 16] : null) };
    const player = createPlayer(8, 8);
    steps(TICK_RATE, () => stepPlayer(player, { x: 1, y: 0 }, post));
    expect(player.x).toBe(3 * TILE_SIZE + 7 - PLAYER_HALF_WIDTH);
  });
});

describe('clampInput', () => {
  it('limits the length to 1 and replaces values that are not finite', () => {
    const long = clampInput({ x: 3, y: 4 });
    expect(Math.hypot(long.x, long.y)).toBeCloseTo(1, 9);
    expect(clampInput({ x: Number.NaN, y: Infinity })).toEqual({ x: 0, y: 0 });
    expect(clampInput({ x: 0.5, y: 0 })).toEqual({ x: 0.5, y: 0 });
  });
});

describe('facingFor', () => {
  it('keeps the facing when there is no input', () => {
    expect(facingFor('left', { x: 0, y: 0 })).toBe('left');
  });

  it('follows the stronger axis', () => {
    expect(facingFor('down', { x: -1, y: 0.2 })).toBe('left');
    expect(facingFor('left', { x: 0.1, y: -1 })).toBe('up');
  });

  it('keeps the facing on a diagonal that still points along it', () => {
    expect(facingFor('right', { x: Math.SQRT1_2, y: Math.SQRT1_2 })).toBe('right');
    expect(facingFor('down', { x: Math.SQRT1_2, y: Math.SQRT1_2 })).toBe('down');
    expect(facingFor('up', { x: Math.SQRT1_2, y: Math.SQRT1_2 })).toBe('down');
  });
});
