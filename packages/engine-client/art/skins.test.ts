import { describe, expect, it } from 'vitest';
import { SKIN_FRAME, SKIN_VIEWS, SKIN_WALK_FRAMES, renderSkinSheet, skinFromSeed } from './skins.ts';

describe('random player skins', () => {
  it('makes the same skin from the same seed, and different skins from different seeds', () => {
    expect(skinFromSeed(12345)).toEqual(skinFromSeed(12345));
    const looks = new Set(Array.from({ length: 50 }, (_, i) => JSON.stringify(skinFromSeed(i * 7919 + 1))));
    expect(looks.size).toBe(50);
  });

  it('uses every vibe, and varies the size, the build and the clothes', () => {
    const skins = Array.from({ length: 400 }, (_, i) => skinFromSeed(i * 104729 + 3));
    const vibes = new Set(skins.map((s) => s.vibe));
    expect([...vibes].sort()).toEqual(['gravedigger', 'knight', 'monk', 'noble', 'plague doctor', 'ranger', 'wanderer', 'witch']);
    const heights = skins.map((s) => s.spec.height);
    const builds = skins.map((s) => s.spec.build);
    expect(Math.min(...heights)).toBeLessThan(0.88);
    expect(Math.max(...heights)).toBeGreaterThan(1.12);
    expect(Math.min(...builds)).toBeLessThan(0.82);
    expect(Math.max(...builds)).toBeGreaterThan(1.3);
    for (const key of ['headwear', 'body', 'cloak', 'item'] as const) {
      expect(new Set(skins.map((s) => s.spec[key])).size, key).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps every frame of a skin inside its frame, with an empty border', () => {
    const { width, height } = SKIN_FRAME;
    // The tallest and widest kinds first: witches with staffs, broad knights, then random ones.
    const seeds = Array.from({ length: 24 }, (_, i) => (i * 2654435761) >>> 0);
    for (const seed of seeds) {
      const sheet = renderSkinSheet(skinFromSeed(seed));
      for (let row = 0; row < SKIN_VIEWS.length; row++) {
        for (let column = 0; column <= SKIN_WALK_FRAMES; column++) {
          const x0 = column * width;
          const y0 = row * height;
          for (let i = 0; i < width; i++) {
            expect(sheet.image.get(x0 + i, y0) & 0xff, `seed ${seed} top`).toBe(0);
            expect(sheet.image.get(x0 + i, y0 + height - 1) & 0xff, `seed ${seed} bottom`).toBe(0);
          }
          for (let j = 0; j < height; j++) {
            expect(sheet.image.get(x0, y0 + j) & 0xff, `seed ${seed} left`).toBe(0);
            expect(sheet.image.get(x0 + width - 1, y0 + j) & 0xff, `seed ${seed} right`).toBe(0);
          }
        }
      }
      expect(sheet.headHeight).toBeGreaterThan(22);
      expect(sheet.headHeight).toBeLessThan(height);
    }
  }, 120_000);
});
