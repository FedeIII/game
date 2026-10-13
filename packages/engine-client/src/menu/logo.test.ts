import { describe, expect, it } from 'vitest';
import { logoScale } from './logo.ts';

/** The size of the logo sheet's frames (src/generated/menu-logo.json). */
const SHEET = { width: 209, height: 65, frames: 15, pad: 10 };
const letters = SHEET.width - 2 * SHEET.pad;

describe('the scale of the logo of the menu', () => {
  it('fills a desktop screen to its height share, in whole pixels', () => {
    expect(logoScale({ width: 1280, height: 800, ratio: 1 }, SHEET, true)).toBe(3);
    expect(logoScale({ width: 1440, height: 900, ratio: 2 }, SHEET, true)).toBe(8);
  });

  it('keeps the letters inside the width of a phone, in whole device pixels', () => {
    for (const [width, height, ratio] of [
      [412, 915, 2.625],
      [390, 844, 3],
      [360, 800, 3],
      [320, 568, 2],
    ] as const) {
      const device = logoScale({ width, height, ratio }, SHEET, true);
      expect(Number.isInteger(device)).toBe(true);
      expect((letters * device) / ratio).toBeLessThanOrEqual(width - 32);
      // Not much smaller than the room: one more device pixel would not fit.
      expect((letters * (device + 1)) / ratio).toBeGreaterThan(width - 40);
    }
  });

  it('is about half of that over a panel, and never under one pixel', () => {
    expect(logoScale({ width: 1280, height: 800, ratio: 1 }, SHEET, false)).toBe(2);
    expect(logoScale({ width: 1440, height: 900, ratio: 2 }, SHEET, false)).toBe(4);
    expect(logoScale({ width: 200, height: 200, ratio: 1 }, SHEET, true)).toBe(1);
    expect(logoScale({ width: 200, height: 200, ratio: 1 }, SHEET, false)).toBe(1);
  });
});
