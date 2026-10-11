import type { Building, Fixture } from '@game/engine';
import { DOOR_PATH } from './houses.ts';
import { TOWN, TOWN_GATE, TOWN_NAME, inTown } from './town.ts';

/**
 * The roads of the Wilds, and the signpost by the home that points the way.
 *
 * The road to Ironhold starts below the path to the home's door and ends at the gate of the town
 * (the east end of its main street). The north road (story phase 3, chapter 1.5.1) leaves the
 * north-east corner of the town for Silverspring, about 250 tiles to the north-east, through the
 * grove (Grove). A road is a smooth curve, level at both ends. Its tiles are mud, also over water (a
 * causeway); nothing grows on it or close to it (except in the grove), and no house of the wilds
 * stands on its ground.
 */

/** Tiles this close to the middle line of the road (tiles) are road; this close, nothing grows. */
const HALF_WIDTH = 1.05;
const CLEAR = 2.3;

/** The signpost: on the west side of the path to the home's door, two tiles below the door. */
export function signpost(home: Building): Fixture {
  return {
    kind: 'signpost',
    tx: home.doorX - 2,
    ty: home.y1 + 2,
    content: { pages: [`It reads: ${TOWN_NAME.toUpperCase()}. The arrow points west, down the road.`, 'Under it, cut with a knife: KEEP TO THE ROAD.'] },
  };
}

export class Road {
  /** The middle line, from the home to the gate (tiles, as fractions). */
  readonly points: readonly (readonly [number, number])[];
  /** For each tile near the road: its distance to the middle line (tiles). */
  private readonly near = new Map<string, number>();
  /** The rectangle of the tiles in `near`. */
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;

  /** A road from (ax, ay) to (bx, by) (tiles, as fractions): a cubic curve, level at both ends. */
  constructor(ax: number, ay: number, bx: number, by: number) {
    const pull = (Math.sign(bx - ax) * Math.abs(ax - bx)) / 2;
    const points: [number, number][] = [];
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 4);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      const x = u * u * u * ax + 3 * u * u * t * (ax + pull) + 3 * u * t * t * (bx - pull) + t * t * t * bx;
      const y = u * u * u * ay + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * by;
      points.push([x, y]);
    }
    this.points = points;
    const reach = Math.ceil(CLEAR);
    for (const [x, y] of points) {
      for (let ty = Math.floor(y) - reach; ty <= Math.floor(y) + reach; ty++) {
        for (let tx = Math.floor(x) - reach; tx <= Math.floor(x) + reach; tx++) {
          const d = Math.hypot(tx + 0.5 - x, ty + 0.5 - y);
          if (d > CLEAR) continue;
          const key = `${tx},${ty}`;
          if (d < (this.near.get(key) ?? Infinity)) this.near.set(key, d);
        }
      }
    }
    const tiles = [...this.near.keys()].map((k) => k.split(',').map(Number) as [number, number]);
    this.x0 = Math.min(...tiles.map(([x]) => x));
    this.y0 = Math.min(...tiles.map(([, y]) => y));
    this.x1 = Math.max(...tiles.map(([x]) => x));
    this.y1 = Math.max(...tiles.map(([, y]) => y));
  }

  /** Whether the tile is on the road. */
  on(tx: number, ty: number): boolean {
    return (this.near.get(`${tx},${ty}`) ?? Infinity) <= HALF_WIDTH;
  }

  /** Whether the tile is on the road or close to it, where nothing grows. */
  clear(tx: number, ty: number): boolean {
    return this.near.has(`${tx},${ty}`);
  }
}

/**
 * Where the merchant's cart stands (its anchor, the west one of its two tiles): just north of the
 * road, beside it, with the road under it, where the merchant walks. The first such place from
 * three fifths of the way to the town (so a character from the home comes to it before the town),
 * then back towards the home. Never in the town.
 */
export function cartSpot(road: Road): { tx: number; ty: number } {
  const n = road.points.length;
  const from = Math.floor(n * 0.6);
  const order = [...Array.from({ length: n - from }, (_, i) => from + i), ...Array.from({ length: from }, (_, i) => from - 1 - i)];
  for (const i of order) {
    const [x, y] = road.points[i]!;
    const tx = Math.floor(x) - 1;
    const ty = Math.floor(y) - 2;
    const fits = [0, 1].every((dx) => road.clear(tx + dx, ty) && !road.on(tx + dx, ty) && road.on(tx + dx, ty + 1) && !inTown(tx + dx, ty) && !inTown(tx + dx, ty + 1));
    if (fits) return { tx, ty };
  }
  throw new Error('the road has no place for the cart');
}

/** The road from the home to the gate of Ironhold: from below the path to the home's door. */
export function homeRoad(home: Building): Road {
  return new Road(home.doorX + 0.5, home.y1 + DOOR_PATH + 1.5, TOWN_GATE.tx + 0.5, TOWN_GATE.ty + 0.5);
}

/** Where the north road leaves Ironhold: the tile east of the north-east corner of the town, a row in. */
export const NORTH_ROAD_START = { tx: TOWN.x1 + 1, ty: TOWN.y0 + 1 } as const;
/** Where the north road ends: the site of Silverspring, about 250 tiles north-east of the town (Fede's choice, 2026-10-11). */
export const SILVERSPRING_SITE = { tx: NORTH_ROAD_START.tx + 178, ty: NORTH_ROAD_START.ty - 172 } as const;

/** The north road, from Ironhold to Silverspring. */
export function northRoad(): Road {
  return new Road(NORTH_ROAD_START.tx + 0.5, NORTH_ROAD_START.ty + 0.5, SILVERSPRING_SITE.tx + 0.5, SILVERSPRING_SITE.ty + 0.5);
}

/** The grove: this share of the north road (from Ironhold), and its trees this far from the middle line (tiles). */
export const GROVE_SPAN = [0.36, 0.46] as const;
export const GROVE_RADIUS = 7;

/**
 * The grove on the north road (chapter 1.5.1: the scouts of the hobgoblins ambush the characters
 * "when they cross a wooded area"): a stretch where trees grow close on both sides of the road,
 * right to its edge. The road itself stays open.
 */
export class Grove {
  /** For each tile of the grove: its distance to the middle line of the road (tiles). */
  private readonly near = new Map<string, number>();
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  /** The points of the road where the grove begins (from Ironhold) and ends (tiles). */
  readonly start: readonly [number, number];
  readonly end: readonly [number, number];

  constructor(road: Road) {
    const n = road.points.length;
    const first = Math.floor(n * GROVE_SPAN[0]);
    const last = Math.floor(n * GROVE_SPAN[1]);
    for (let i = first; i <= last; i++) {
      const [x, y] = road.points[i]!;
      for (let ty = Math.floor(y) - GROVE_RADIUS; ty <= Math.floor(y) + GROVE_RADIUS; ty++) {
        for (let tx = Math.floor(x) - GROVE_RADIUS; tx <= Math.floor(x) + GROVE_RADIUS; tx++) {
          const d = Math.hypot(tx + 0.5 - x, ty + 0.5 - y);
          if (d > GROVE_RADIUS) continue;
          const key = `${tx},${ty}`;
          if (d < (this.near.get(key) ?? Infinity)) this.near.set(key, d);
        }
      }
    }
    this.start = road.points[first]!;
    this.end = road.points[last]!;
    const tiles = [...this.near.keys()].map((k) => k.split(',').map(Number) as [number, number]);
    this.x0 = Math.min(...tiles.map(([x]) => x));
    this.y0 = Math.min(...tiles.map(([, y]) => y));
    this.x1 = Math.max(...tiles.map(([x]) => x));
    this.y1 = Math.max(...tiles.map(([, y]) => y));
  }

  /** Whether the tile is in the grove. */
  has(tx: number, ty: number): boolean {
    return this.near.has(`${tx},${ty}`);
  }

  /** The distance of a tile of the grove to the middle line of the road, or Infinity. */
  distance(tx: number, ty: number): number {
    return this.near.get(`${tx},${ty}`) ?? Infinity;
  }
}
