import { describe, expect, it } from 'vitest';
import { WORLDS, shareWorlds } from './worlds.ts';

describe('the worlds of game.azyr.io', () => {
  it('share the Wilds (since 2026-10-10)', () => {
    expect(WORLDS.find((world) => world.id === 'wilds')?.multiplayer).toBe(true);
  });
});

describe('shareWorlds', () => {
  // A world that is not shared by itself, as a new world is before it goes to production.
  const solo = { ...WORLDS[0]!, id: 'solo', multiplayer: false };

  it('keeps the worlds as they are without ids (production)', () => {
    expect(shareWorlds([solo], '')).toEqual([solo]);
    expect(shareWorlds(WORLDS, '')).toEqual(WORLDS);
  });

  it('shares the worlds that it names, and only those', () => {
    const worlds = shareWorlds([solo, { ...solo, id: 'other' }], ' solo , nowhere');
    expect(worlds.map((world) => [world.id, world.multiplayer])).toEqual([
      ['solo', true],
      ['other', false],
    ]);
    expect(solo.multiplayer).toBe(false);
  });
});

describe('the prologue of each world', () => {
  it('names only scenes that the prologue art paints', async () => {
    const art = (await import('../../../packages/engine-client/src/generated/prologue.json')).default as { scenes: { id: string }[] };
    const painted = new Set(art.scenes.map((s) => s.id));
    for (const world of WORLDS) for (const card of world.prologue ?? []) expect(painted.has(card.scene), `${world.id}: ${card.scene}`).toBe(true);
    expect(WORLDS.find((world) => world.id === 'wilds')?.prologue?.length).toBe(8);
  });
});
