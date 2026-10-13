import { describe, expect, it } from 'vitest';
import { DAY_HOURS, NIGHT_SKY, clockAtHour, daylight, hourOf, isDaytime, skyAt, skyAtClock, type DayCycle } from '../src/index.ts';

const MINUTE = 60_000;
const DAY: DayCycle = { length: 48 * MINUTE, noon: 0.25 };

describe('the time of day', () => {
  it('goes round the 24 hours once in the length of a day, from the real clock', () => {
    expect(hourOf(0, DAY)).toBe(0);
    expect(hourOf(24 * MINUTE, DAY)).toBe(12);
    expect(hourOf(2 * MINUTE, DAY)).toBe(1);
    expect(hourOf(48 * MINUTE, DAY)).toBe(0);
    expect(hourOf(-2 * MINUTE, DAY)).toBe(23);
    // A clock of today: the same moment gives the same hour on every page.
    const now = Date.UTC(2026, 9, 13, 18, 30);
    expect(hourOf(now, DAY)).toBe(hourOf(now, DAY));
    expect(hourOf(now, DAY)).toBeGreaterThanOrEqual(0);
    expect(hourOf(now, DAY)).toBeLessThan(24);
  });

  it('is night, then dawn, the day, dusk and night again', () => {
    expect(daylight(0)).toBe(0);
    expect(daylight(DAY_HOURS.dawn - 0.01)).toBe(0);
    expect(daylight(6)).toBeCloseTo(0.5);
    expect(daylight(DAY_HOURS.day)).toBe(1);
    expect(daylight(12)).toBe(1);
    expect(daylight(DAY_HOURS.dusk - 0.01)).toBe(1);
    expect(daylight(20)).toBeCloseTo(0.5);
    expect(daylight(DAY_HOURS.night)).toBe(0);
    expect(daylight(23.99)).toBe(0);
    expect(daylight(24)).toBe(0);
  });

  it('gives 24 real minutes of full day and 16 of night in a day of 48 minutes', () => {
    let day = 0;
    let night = 0;
    for (let minute = 0; minute < 48; minute += 0.25) {
      const light = daylight(hourOf((minute + 0.125) * MINUTE, DAY));
      if (light === 1) day += 0.25;
      if (light === 0) night += 0.25;
    }
    expect(day).toBe(24);
    expect(night).toBe(16);
  });

  it('changes the light smoothly: no jump from one second to the next', () => {
    let last = skyAt(hourOf(0, DAY), DAY);
    for (let second = 1; second <= 48 * 60; second++) {
      const sky = skyAt(hourOf(second * 1000, DAY), DAY);
      expect(Math.abs(sky.darkness - last.darkness)).toBeLessThan(0.01);
      expect(Math.abs(sky.lights - last.lights)).toBeLessThan(0.01);
      last = sky;
    }
  });

  it('keeps the darkness of the night at night, and a quarter of it at noon with the lights out', () => {
    expect(skyAt(2, DAY)).toEqual({ hour: 2, darkness: 1, lights: 1 });
    expect(skyAt(12, DAY)).toEqual({ hour: 12, darkness: 0.25, lights: 0 });
    const dusk = skyAt(20, DAY);
    expect(dusk.darkness).toBeCloseTo(0.625);
    expect(dusk.lights).toBeCloseTo(0.5);
  });

  it('is always night in a world without a day cycle', () => {
    expect(skyAt(12, undefined)).toEqual({ ...NIGHT_SKY, hour: 12 });
  });

  it('is day for the mobs and the NPCs from 6:00 to 20:00, where the lights show at half', () => {
    expect(isDaytime(skyAt(5.9, DAY))).toBe(false);
    expect(isDaytime(skyAt(6, DAY))).toBe(true);
    expect(isDaytime(skyAt(12, DAY))).toBe(true);
    expect(isDaytime(skyAt(20, DAY))).toBe(true);
    expect(isDaytime(skyAt(20.1, DAY))).toBe(false);
    expect(isDaytime(skyAt(0, DAY))).toBe(false);
    expect(isDaytime(skyAt(12, undefined))).toBe(false);
  });

  it('gives the sky of a clock, and a clock at a fixed hour for a test server', () => {
    expect(hourOf(clockAtHour(12, DAY), DAY)).toBe(12);
    expect(hourOf(clockAtHour(25, DAY), DAY)).toBe(1);
    expect(skyAtClock(clockAtHour(12, DAY), DAY)).toEqual(skyAt(12, DAY));
    expect(skyAtClock(clockAtHour(12, DAY), undefined)).toEqual(NIGHT_SKY);
  });
});
