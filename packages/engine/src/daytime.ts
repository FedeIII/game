/**
 * The time of day (docs/features/game/day-and-night.md). A world with a day cycle
 * (`WorldDefinition.day`) goes from night to day and back: one day and one night last
 * `DayCycle.length` real milliseconds. The hour comes from a clock in milliseconds since 1970
 * (UTC), so every page with a correct clock shows the same hour as the others, with no message
 * from the server. The engine never reads a clock: the caller gives it, so the server can use the
 * same hour later.
 */

/** The day of a world. */
export interface DayCycle {
  /** One day and one night, in real milliseconds. */
  readonly length: number;
  /** The share of the night's darkness in the middle of the day: 0 is full light, 1 is night all day. */
  readonly noon: number;
}

/**
 * The hours of a day (24 for every length): the night ends at `dawn`, the full day starts at `day`,
 * the dusk starts at `dusk`, and the night starts at `night`.
 */
export const DAY_HOURS = { dawn: 5, day: 7, dusk: 19, night: 21 } as const;

/** The sky at an hour. */
export interface Sky {
  /** The hour, from 0 (midnight) to 24. */
  readonly hour: number;
  /** The share of the night's darkness: 1 at night, `DayCycle.noon` by day. */
  readonly darkness: number;
  /** How much the lights (a torch, lamps, windows, candles) show: 1 at night, 0 by day. */
  readonly lights: number;
}

/** The sky of a world without a day cycle: always night. */
export const NIGHT_SKY: Sky = { hour: 0, darkness: 1, lights: 1 };

/** The hour at `clock` (milliseconds since 1970, UTC), from 0 (midnight) to 24. */
export function hourOf(clock: number, cycle: DayCycle): number {
  const into = ((clock % cycle.length) + cycle.length) % cycle.length;
  return (into / cycle.length) * 24;
}

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** How much of the day it is at an hour: 0 at night, 1 by day, a smooth change at dawn and at dusk. */
export function daylight(hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  if (h < DAY_HOURS.dawn || h >= DAY_HOURS.night) return 0;
  if (h < DAY_HOURS.day) return smoothstep((h - DAY_HOURS.dawn) / (DAY_HOURS.day - DAY_HOURS.dawn));
  if (h < DAY_HOURS.dusk) return 1;
  return 1 - smoothstep((h - DAY_HOURS.dusk) / (DAY_HOURS.night - DAY_HOURS.dusk));
}

/** The sky of a world at an hour. Without a day cycle, it is always night. */
export function skyAt(hour: number, cycle: DayCycle | undefined): Sky {
  if (!cycle) return { ...NIGHT_SKY, hour };
  const light = daylight(hour);
  return { hour, darkness: 1 - (1 - cycle.noon) * light, lights: 1 - light };
}
