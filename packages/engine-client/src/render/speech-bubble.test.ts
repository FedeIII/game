import { describe, expect, it } from 'vitest';
import { placeBubble } from './speech-bubble.ts';

const VIEW = { x: 100, y: 50, width: 400, height: 240 };
const TAIL_WIDTH = 5;

/** The middle of the tail's tip, in world pixels: the tip is the middle column of the tail. */
function tipOf(place: { left: number; tail: number }): number {
  return place.left + place.tail + (TAIL_WIDTH - 1) / 2 + 0.5;
}

describe('the place of a speech bubble', () => {
  it('stands centred over the speaker, with the tail in the middle of its bottom edge', () => {
    for (const width of [40, 41, 120]) {
      const place = placeBubble({ x: 300, y: 170 }, width, 20, VIEW);
      expect(place.tail).toBe(Math.floor((width - TAIL_WIDTH) / 2));
      expect(Math.abs(place.left + width / 2 - 300)).toBeLessThanOrEqual(1);
      expect(Math.abs(tipOf(place) - 300)).toBeLessThanOrEqual(1);
    }
  });

  it('stays inside the screen near an edge, and its tail still points at the speaker', () => {
    for (const width of [60, 61, 200]) {
      for (const x of [VIEW.x + 6, VIEW.x + 20.4, VIEW.x + VIEW.width - 6, VIEW.x + VIEW.width - 20.6]) {
        const place = placeBubble({ x, y: 170 }, width, 20, VIEW);
        expect(place.left).toBeGreaterThanOrEqual(VIEW.x);
        expect(place.left + width).toBeLessThanOrEqual(VIEW.x + VIEW.width);
        expect(place.left === Math.round(x - width / 2)).toBe(false);
        expect(Math.abs(tipOf(place) - x)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('keeps the tail on the straight part of the bottom edge for a speaker off the screen', () => {
    const width = 80;
    const west = placeBubble({ x: VIEW.x - 50, y: 170 }, width, 20, VIEW);
    expect(west.tail).toBe(1);
    const east = placeBubble({ x: VIEW.x + VIEW.width + 50, y: 170 }, width, 20, VIEW);
    expect(east.tail).toBe(width - TAIL_WIDTH - 1);
  });

  it('gives whole world pixels', () => {
    const place = placeBubble({ x: 123.7, y: 98.2 }, 47, 21, { x: 0.3, y: 0.6, width: 400.5, height: 240.5 });
    expect(Number.isInteger(place.left)).toBe(true);
    expect(Number.isInteger(place.top)).toBe(true);
    expect(Number.isInteger(place.tail)).toBe(true);
  });
});
