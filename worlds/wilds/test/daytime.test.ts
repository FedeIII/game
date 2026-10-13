import { describe, expect, it } from 'vitest';
import { hourOf, skyAt } from '@game/engine';
import { wilds } from '../src/index.ts';

const MINUTE = 60_000;

describe('the day of the Wilds', () => {
  it('lasts 48 real minutes, with a dim, overcast noon (Fede, 2026-10-13)', () => {
    expect(wilds.day).toEqual({ length: 48 * MINUTE, noon: 0.25 });
    expect(wilds.darkness).toBe(1);
  });

  it('is full night at midnight and a quarter of the night at noon, from the real clock', () => {
    const midnight = Date.UTC(2026, 9, 13) - (Date.UTC(2026, 9, 13) % (48 * MINUTE));
    expect(hourOf(midnight, wilds.day!)).toBe(0);
    expect(skyAt(hourOf(midnight, wilds.day!), wilds.day).darkness).toBe(1);
    expect(skyAt(hourOf(midnight + 24 * MINUTE, wilds.day!), wilds.day)).toEqual({ hour: 12, darkness: 0.25, lights: 0 });
  });
});
