import { describe, expect, it } from 'vitest';
import { directionIndex, edgePoint } from './marks.ts';

const VIEW = { x: 0, y: 0, width: 200, height: 100 };

describe('the marks at the edge of the screen', () => {
  it('show nothing for a target on the screen', () => {
    expect(edgePoint(VIEW, { x: 150, y: 50 })).toBeNull();
  });

  it('sit inside the edge, on the line from the middle to the target', () => {
    const east = edgePoint(VIEW, { x: 400, y: 50 })!;
    expect(east).toEqual({ x: 190, y: 50, angle: 0 });
    const north = edgePoint(VIEW, { x: 100, y: -300 })!;
    expect(north.x).toBeCloseTo(100);
    expect(north.y).toBeCloseTo(10);
    const corner = edgePoint(VIEW, { x: 400, y: 400 })!;
    expect(corner.x).toBeLessThanOrEqual(190);
    expect(corner.y).toBeCloseTo(90);
  });

  it('point in 16 directions, clockwise from east', () => {
    expect(directionIndex(0)).toBe(0);
    expect(directionIndex(Math.PI / 2)).toBe(4);
    expect(directionIndex(Math.PI)).toBe(8);
    expect(directionIndex(-Math.PI / 2)).toBe(12);
    expect(directionIndex(Math.PI / 8 + 0.01)).toBe(1);
  });
});
