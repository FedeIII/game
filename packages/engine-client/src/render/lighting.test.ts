import { describe, expect, it } from 'vitest';
import { NIGHT_SKY, skyAt } from '@game/engine';
import { ambientAlpha } from './lighting.ts';

const DAY = { length: 48 * 60_000, noon: 0.25 };

describe('the darkness over the world', () => {
  it('is the alpha of the atlas times the darkness of the world, the character and the hour', () => {
    expect(ambientAlpha(0.8, 1, NIGHT_SKY)).toBeCloseTo(0.8);
    expect(ambientAlpha(0.8, 1, skyAt(12, DAY))).toBeCloseTo(0.2);
    // Wisdom 14 (night 0.84) makes the night and the day lighter alike.
    expect(ambientAlpha(0.8, 0.84, skyAt(12, DAY))).toBeCloseTo(0.168);
    expect(ambientAlpha(0.8, 1.5, NIGHT_SKY)).toBe(1);
  });
});
