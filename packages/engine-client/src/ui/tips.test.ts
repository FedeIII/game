import { describe, expect, it } from 'vitest';
import { TIP_IDS, TIP_TIMING, TipQueue, TipStore, tipParts, tipText, type TipStorage } from './tips.ts';
import { STRINGS } from './strings.ts';
import { ES } from './strings-es.ts';

/** A storage in memory, as localStorage. */
function memory(): TipStorage {
  const data = new Map<string, string>();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
}

describe('the tips', () => {
  it('keep what this browser saw, and the switch', () => {
    const storage = memory();
    const store = new TipStore(storage);
    expect(store.enabled).toBe(true);
    store.markSeen('walk');
    store.setEnabled(false);
    const again = new TipStore(storage);
    expect(again.isSeen('walk')).toBe(true);
    expect(again.isSeen('act')).toBe(false);
    expect(again.enabled).toBe(false);
    again.reset();
    const fresh = new TipStore(storage);
    expect(fresh.isSeen('walk')).toBe(false);
    expect(fresh.enabled).toBe(true);
  });

  it('work without storage, and ignore what they do not know', () => {
    const blocked: TipStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    const store = new TipStore(blocked);
    store.markSeen('map');
    expect(store.isSeen('map')).toBe(true);
    const storage = memory();
    storage.setItem('game.tips.v1', JSON.stringify({ seen: ['walk', 'nonsense', 3] }));
    expect(new TipStore(storage).isSeen('walk')).toBe(true);
  });

  it('show one at a time, each once, for a few seconds', () => {
    const store = new TipStore(memory());
    const queue = new TipQueue(store);
    queue.request('walk');
    queue.request('act');
    queue.request('walk');
    expect(queue.update(0, false)).toBe('walk');
    expect(queue.update(TIP_TIMING.show - 1, false)).toBe('walk');
    // It ends; the next waits for the pause between two tips.
    expect(queue.update(TIP_TIMING.show, false)).toBeNull();
    expect(store.isSeen('walk')).toBe(true);
    expect(queue.update(TIP_TIMING.show + TIP_TIMING.gap, false)).toBe('act');
    // A tip that was seen never comes back.
    queue.request('walk');
    expect(queue.update(3 * TIP_TIMING.show, false)).toBeNull();
    expect(queue.update(4 * TIP_TIMING.show, false)).toBeNull();
  });

  it('end when the player does the thing, and then never show', () => {
    const queue = new TipQueue(new TipStore(memory()));
    queue.request('attack');
    expect(queue.update(0, false)).toBe('attack');
    queue.done('attack', 100);
    expect(queue.update(100, false)).toBeNull();
    // Done before its moment: it never shows.
    queue.done('map', 200);
    queue.request('map');
    expect(queue.update(5000, false)).toBeNull();
  });

  it('wait while paused, and their time stops', () => {
    const queue = new TipQueue(new TipStore(memory()));
    queue.request('talk');
    expect(queue.update(0, false)).toBe('talk');
    expect(queue.update(1000, true)).toBeNull();
    expect(queue.update(1000 + 60_000, true)).toBeNull();
    // Back: the tip shows again, with the time that it had left.
    expect(queue.update(61_000, false)).toBe('talk');
    expect(queue.update(61_000 + TIP_TIMING.show - 1500, false)).toBe('talk');
  });

  it('show nothing when they are off', () => {
    const store = new TipStore(memory());
    const queue = new TipQueue(store);
    store.setEnabled(false);
    queue.request('walk');
    expect(queue.update(0, false)).toBeNull();
    store.setEnabled(true);
    expect(queue.update(10, false)).toBeNull();
  });

  it('name the keys on a keyboard and the buttons on a touch screen, in both languages', () => {
    for (const id of TIP_IDS) {
      expect(tipText(id, false).length, id).toBeGreaterThan(0);
      expect(tipText(id, true).length, id).toBeGreaterThan(0);
      // A touch screen has no keys.
      expect(tipParts(STRINGS.tips.list[id].touch).some((part) => part.key), id).toBe(false);
      expect(tipParts(ES.tips.list[id].touch).some((part) => part.key), id).toBe(false);
    }
    expect(tipParts('[E] acts. [Esc] ends.')).toEqual([
      { key: true, text: 'E' },
      { key: false, text: ' acts. ' },
      { key: true, text: 'Esc' },
      { key: false, text: ' ends.' },
    ]);
  });
});
