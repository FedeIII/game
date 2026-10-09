import { describe, expect, it } from 'vitest';
import { FX_TURNS, fxPlacement } from './attacks.ts';

describe('the direction of an attack effect', () => {
  it('shows each of the 16 directions with a drawn turn, a mirror and quarter turns', () => {
    for (let step = 0; step < 16; step++) {
      const aim = (step * Math.PI) / 8;
      const place = fxPlacement(aim);
      expect(place.turn).toBeGreaterThanOrEqual(0);
      expect(place.turn).toBeLessThan(FX_TURNS);
      expect(Number.isInteger(place.rotation / (Math.PI / 2))).toBe(true);
      // The drawing faces turn x 22.5 degrees; mirror it (x to -x), then rotate it.
      const t = (place.turn * Math.PI) / 8;
      const x = Math.cos(t) * (place.mirror ? -1 : 1);
      const y = Math.sin(t);
      const shown = Math.atan2(x * Math.sin(place.rotation) + y * Math.cos(place.rotation), x * Math.cos(place.rotation) - y * Math.sin(place.rotation));
      expect(Math.cos(shown - aim)).toBeCloseTo(1, 9);
      expect(Math.cos(place.angle - aim)).toBeCloseTo(1, 9);
    }
  });

  it('rounds to the nearest of the 16 directions, and mirrors only the left half', () => {
    expect(fxPlacement(0.1)).toMatchObject({ turn: 0, mirror: false, rotation: 0 });
    expect(fxPlacement(-0.3)).toMatchObject({ turn: 3, mirror: false, rotation: (3 * Math.PI) / 2 });
    expect(fxPlacement(Math.PI)).toMatchObject({ turn: 0, mirror: true, rotation: -0 });
    expect(fxPlacement(Math.PI / 2).mirror).toBe(false);
    expect(fxPlacement(-Math.PI / 2).mirror).toBe(false);
  });
});
