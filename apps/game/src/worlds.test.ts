import { describe, expect, it } from 'vitest';
import { WORLDS, shareWorlds } from './worlds.ts';

describe('shareWorlds', () => {
  it('keeps the worlds as they are without ids (production)', () => {
    expect(shareWorlds(WORLDS, '')).toEqual(WORLDS);
    expect(shareWorlds(WORLDS, '').every((world) => !world.multiplayer)).toBe(true);
  });

  it('shares the worlds that it names, and only those', () => {
    const worlds = shareWorlds(WORLDS, ' wilds , nowhere');
    expect(worlds.find((world) => world.id === 'wilds')?.multiplayer).toBe(true);
    expect(worlds).toHaveLength(WORLDS.length);
    expect(WORLDS.find((world) => world.id === 'wilds')?.multiplayer).toBeFalsy();
  });
});
