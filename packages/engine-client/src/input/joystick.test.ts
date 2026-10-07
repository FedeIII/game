import { describe, expect, it } from 'vitest';
import { STICK_RADIUS, stickVector } from './joystick.ts';

describe('stickVector', () => {
  it('gives no input inside the deadzone', () => {
    expect(stickVector(0, 0)).toEqual({ x: 0, y: 0 });
    expect(stickVector(5, 5)).toEqual({ x: 0, y: 0 });
  });

  it('gives full input at the rim, in the direction of the thumb', () => {
    const v = stickVector(0, -STICK_RADIUS);
    expect(v.x).toBeCloseTo(0, 9);
    expect(v.y).toBeCloseTo(-1, 9);
  });

  it('rises with the push between the deadzone and the rim', () => {
    const half = stickVector(STICK_RADIUS * 0.59, 0);
    expect(half.x).toBeGreaterThan(0.4);
    expect(half.x).toBeLessThan(0.6);
    expect(half.y).toBe(0);
  });

  it('never gives more than full input', () => {
    const v = stickVector(STICK_RADIUS * 3, STICK_RADIUS * 3);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1, 9);
  });
});
