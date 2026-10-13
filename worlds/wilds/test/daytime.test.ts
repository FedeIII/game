import { describe, expect, it } from 'vitest';
import { Room, World, clockAtHour, hourOf, skyAt } from '@game/engine';
import { WildsSource, wilds } from '../src/index.ts';

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

  it('gives the hour to the mobs and the NPCs of a Room from its clock; without a clock it is night', () => {
    const at = (hour: number) => {
      const room = new Room(new World(new WildsSource(1)), { day: wilds.day, clock: () => clockAtHour(hour, wilds.day!) });
      room.tick(0);
      room.tick(50);
      return { sky: room.sky.hour, day: room.horde!.daytime, night: room.npcs!.night };
    };
    expect(at(12)).toEqual({ sky: 12, day: true, night: false });
    expect(at(23)).toEqual({ sky: 23, day: false, night: true });
    const plain = new Room(new World(new WildsSource(1)));
    plain.tick(0);
    plain.tick(50);
    expect([plain.horde!.daytime, plain.npcs!.night]).toEqual([false, true]);
  });
});
