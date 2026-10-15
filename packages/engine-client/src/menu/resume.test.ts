import { describe, expect, it } from 'vitest';
import { markMenuScreen, markResume, takeMenuScreen, takeResume } from './resume.ts';

/** A sessionStorage in memory. */
function memory() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

describe('the character to start again after a reload', () => {
  it('is good for one start', () => {
    const storage = memory();
    markResume('abc12345', false, storage, 1000);
    expect(takeResume(storage, 2000)).toEqual({ character: 'abc12345', sandbox: false });
    expect(takeResume(storage, 2000)).toBeNull();
  });

  it('keeps the sandbox of an admin', () => {
    const storage = memory();
    markResume('abc12345', true, storage, 1000);
    expect(takeResume(storage, 2000)).toEqual({ character: 'abc12345', sandbox: true });
  });

  it('is not used after 5 minutes, nor from storage that holds garbage', () => {
    const storage = memory();
    markResume('abc12345', false, storage, 0);
    expect(takeResume(storage, 5 * 60_000 + 1)).toBeNull();
    storage.setItem('game.resume.v1', '{not json');
    expect(takeResume(storage, 0)).toBeNull();
    expect(takeResume(null)).toBeNull();
  });
});

describe('the screen that the game menu asks for', () => {
  it('opens once: the list of characters ("Load game"), the builder ("New game") or the list for the sandbox', () => {
    const storage = memory();
    markMenuScreen('load', storage, 1000);
    expect(takeMenuScreen(storage, 2000)).toBe('load');
    expect(takeMenuScreen(storage, 2000)).toBeNull();
    markMenuScreen('new', storage, 1000);
    expect(takeMenuScreen(storage, 2000)).toBe('new');
    markMenuScreen('sandbox', storage, 1000);
    expect(takeMenuScreen(storage, 2000)).toBe('sandbox');
  });

  it('is not used when it is old, or not a screen', () => {
    const storage = memory();
    markMenuScreen('load', storage, 1000);
    expect(takeMenuScreen(storage, 1000 + 6 * 60_000)).toBeNull();
    storage.setItem('game.menu-screen.v1', JSON.stringify({ screen: 'sign-in', at: 1000 }));
    expect(takeMenuScreen(storage, 2000)).toBeNull();
    expect(takeMenuScreen(null)).toBeNull();
  });
});
