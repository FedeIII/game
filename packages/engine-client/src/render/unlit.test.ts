import { describe, expect, it } from 'vitest';
import { skyAt } from '@game/engine';
import atlasData from '../generated/atlas.json';
import { litAlpha, unlitFrame } from './unlit.ts';

const DAY = { length: 48 * 60_000, noon: 0.25 };

describe('the lamps and the lit windows by day', () => {
  it('name the unlit frame of a lit frame', () => {
    expect(unlitFrame('fixture/lamppost')).toBe('fixture/lamppost/unlit');
    expect(unlitFrame('wall/stone/window')).toBe('wall/stone/window/unlit');
  });

  it('show the lit frame at night, the unlit one by day, and both at dawn and at dusk', () => {
    expect(litAlpha(skyAt(0, DAY).lights)).toBe(1);
    expect(litAlpha(skyAt(12, DAY).lights)).toBe(0);
    expect(litAlpha(skyAt(6, DAY).lights)).toBeCloseTo(0.5);
    expect(litAlpha(skyAt(20, DAY).lights)).toBeCloseTo(0.5);
    // A world without a day: always lit.
    expect(litAlpha(skyAt(12, undefined).lights)).toBe(1);
    expect(litAlpha(1.5)).toBe(1);
    expect(litAlpha(-0.5)).toBe(0);
  });

  it('have an unlit frame in the atlas for every lit window, the street lamp and the lantern of the cart', () => {
    const names = new Set(Object.keys(atlasData.frames));
    const windows = [...names].filter((name) => /^wall\/[^/]+\/window$/.test(name));
    expect(windows.length).toBeGreaterThanOrEqual(10);
    for (const frame of [...windows, 'fixture/lamppost', 'fixture/cart', 'fixture/cart-mended']) expect(names.has(unlitFrame(frame)), frame).toBe(true);
  });

  it('change smoothly: no jump from one second of the day to the next', () => {
    let last = litAlpha(skyAt(0, DAY).lights);
    for (let second = 1; second <= 48 * 60; second++) {
      const alpha = litAlpha(skyAt((second / (48 * 60)) * 24, DAY).lights);
      expect(Math.abs(alpha - last)).toBeLessThan(0.01);
      last = alpha;
    }
  });
});
