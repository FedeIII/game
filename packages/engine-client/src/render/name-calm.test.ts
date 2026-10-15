import { describe, expect, it } from 'vitest';
import { NameCalm } from './name-tag.ts';

describe('the name over the own character', () => {
  it('hides while the character is busy (a fight, a move), and comes back after a calm time, with a fade', () => {
    const calm = new NameCalm(2500, 0.3);
    // At rest from the start: it shows.
    expect(calm.update(0, 0.016, false)).toBe(1);
    // A fight or a walk: it fades out over 0.3 s.
    expect(calm.update(100, 0.15, true)).toBeCloseTo(0.5);
    expect(calm.update(250, 0.15, true)).toBe(0);
    // Calm again: it waits 2.5 s from the last busy moment, then fades in.
    expect(calm.update(2700, 0.016, false)).toBe(0);
    expect(calm.update(2760, 0.15, false)).toBeCloseTo(0.5);
    expect(calm.update(2900, 0.15, false)).toBe(1);
  });

  it('starts the wait again at each busy moment', () => {
    const calm = new NameCalm(2500, 0.3);
    calm.update(0, 1, true);
    calm.update(2000, 1, true);
    expect(calm.update(4000, 1, false)).toBe(0);
    expect(calm.update(4600, 1, false)).toBe(1);
  });
});
