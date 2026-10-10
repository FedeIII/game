import { describe, expect, it } from 'vitest';
import { markResume, takeResume } from './resume.ts';

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
    markResume('abc12345', storage, 1000);
    expect(takeResume(storage, 2000)).toBe('abc12345');
    expect(takeResume(storage, 2000)).toBeNull();
  });

  it('is not used after 5 minutes, nor from storage that holds garbage', () => {
    const storage = memory();
    markResume('abc12345', storage, 0);
    expect(takeResume(storage, 5 * 60_000 + 1)).toBeNull();
    storage.setItem('game.resume.v1', '{not json');
    expect(takeResume(storage, 0)).toBeNull();
    expect(takeResume(null)).toBeNull();
  });
});
