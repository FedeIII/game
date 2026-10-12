import type { Building, Fixture } from '@game/engine';
import { BRONZEHOLD_NORTH, BRONZEHOLD_SOUTH, WHITEGROVE_NORTH, WHITEGROVE_SOUTH } from './hamlets.ts';
import { DOOR_PATH } from './houses.ts';
import { TOWN, TOWN_GATE, TOWN_SOUTH, inTown } from './town.ts';

/**
 * The roads of the Wilds, and the signpost by the home that points the way.
 *
 * The road to Ironhold (Fede, 2026-10-12 and 2026-10-13: the hut is south of Ironhold, near the
 * northern edge of the Iron Sovereignty; the road of chapter 1.5.1 passes Arboleda Blanca and Bronzal)
 * starts below the path to the home's door, goes west and turns north to Whitegrove, crosses it and
 * Bronzehold on their streets (hamlets.ts), and ends at the south edge of Ironhold, below its lane
 * (TOWN_SOUTH). The north road (story phase 3, chapter 1.5.1) leaves the north-east corner of the town for
 * Silverspring, about 250 tiles to the north-east, through the grove (Grove). A road is a chain of
 * smooth curves (legs); each leg leaves and enters its ends along a heading. Its tiles are mud, also
 * over water (a causeway); nothing grows on it or close to it (except in the grove), and no house of
 * the wilds stands on its ground.
 */

/** Tiles this close to the middle line of the road (tiles) are road; this close, nothing grows. */
const HALF_WIDTH = 1.05;
const CLEAR = 2.3;

/** The signpost: on the west side of the path to the home's door, two tiles below the door. The road leaves west, and turns north. */
export function signpost(home: Building): Fixture {
  return {
    kind: 'signpost',
    tx: home.doorX - 2,
    ty: home.y1 + 2,
    content: { pages: ['It reads: WHITEGROVE, BRONZEHOLD, IRONHOLD. The arrow points west, along the road.', 'Under it, cut with a knife: KEEP TO THE ROAD.'] },
  };
}

/** Which way a road leaves or enters an end of a leg: along x (east or west) or along y (north or south). */
export type Heading = 'x' | 'y';

/** A leg of a road: a smooth curve from `from` to `to` (tiles, as fractions), along `start` and `end` at its ends (x by default). */
export interface Leg {
  readonly from: readonly [number, number];
  readonly to: readonly [number, number];
  readonly start?: Heading;
  readonly end?: Heading;
}

/** The points of a leg: a cubic curve whose ends go along their headings. */
function legPoints(leg: Leg): [number, number][] {
  const [ax, ay] = leg.from;
  const [bx, by] = leg.to;
  const c1 = (leg.start ?? 'x') === 'x' ? [ax + (bx - ax) / 2, ay] : [ax, ay + (by - ay) / 2];
  const c2 = (leg.end ?? 'x') === 'x' ? [bx - (bx - ax) / 2, by] : [bx, by - (by - ay) / 2];
  const points: [number, number][] = [];
  const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 4);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x = u * u * u * ax + 3 * u * u * t * c1[0]! + 3 * u * t * t * c2[0]! + t * t * t * bx;
    const y = u * u * u * ay + 3 * u * u * t * c1[1]! + 3 * u * t * t * c2[1]! + t * t * t * by;
    points.push([x, y]);
  }
  return points;
}

export class Road {
  /** The middle line, from its start to its end (tiles, as fractions): the points of its legs, in order. */
  readonly points: readonly (readonly [number, number])[];
  /** For each tile near the road: its distance to the middle line (tiles). */
  private readonly near = new Map<string, number>();
  /** The rectangle of the tiles in `near`. */
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;

  /** A road of legs, one after the other (each leg starts where the one before it ends, or a place between them joins them). */
  constructor(legs: readonly Leg[]) {
    const points = legs.flatMap(legPoints);
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

/** A road of one leg, from (ax, ay) to (bx, by) (tiles, as fractions), level (along x) at both ends. */
export function road(ax: number, ay: number, bx: number, by: number): Road {
  return new Road([{ from: [ax, ay], to: [bx, by] }]);
}

/**
 * Where the merchant's cart stands (its anchor, the west one of its two tiles): beside the road, off
 * it, on its cleared ground, where the merchant walks on the road next to it. Where the road runs east
 * and west, the cart stands just north of it; where it runs north and south, just east of it. The
 * first such place from three fifths of the way along `road` (the leg from the home to Whitegrove:
 * chapter 1.5.1 puts the cart before Arboleda Blanca), then back towards the home. Never in a town.
 */
export function cartSpot(road: Road): { tx: number; ty: number } {
  const n = road.points.length;
  const from = Math.floor(n * 0.6);
  const order = [...Array.from({ length: n - from }, (_, i) => from + i), ...Array.from({ length: from }, (_, i) => from - 1 - i)];
  const off = (tx: number, ty: number) => [0, 1].every((dx) => road.clear(tx + dx, ty) && !road.on(tx + dx, ty) && !inTown(tx + dx, ty));
  for (const i of order) {
    const [x, y] = road.points[i]!;
    // North of a road that runs east and west: the road under both tiles.
    const north = { tx: Math.floor(x) - 1, ty: Math.floor(y) - 2 };
    if (off(north.tx, north.ty) && [0, 1].every((dx) => road.on(north.tx + dx, north.ty + 1) && !inTown(north.tx + dx, north.ty + 1))) return north;
    // East of a road that runs north and south: the cart right after the east edge of the road, which
    // runs on in the rows above and below it. (The chunk clears the cart's own tiles: source.ts.)
    const ty = Math.floor(y);
    let edge = Number.NEGATIVE_INFINITY;
    for (let tx = Math.floor(x) - 3; tx <= Math.floor(x) + 3; tx++) if (road.on(tx, ty)) edge = tx;
    const east = { tx: edge + 1, ty };
    const beside = [0, 1].every((dx) => !road.on(east.tx + dx, ty) && !inTown(east.tx + dx, ty));
    if (Number.isFinite(edge) && beside && road.on(edge, ty - 1) && road.on(edge, ty + 1)) return east;
  }
  throw new Error('the road has no place for the cart');
}

/**
 * The legs of the road from the home to Ironhold: from below the path to the home's door west and then
 * north to the south end of Whitegrove's street; from its north end to the south end of Bronzehold's
 * street; from its north end north to the south edge of Ironhold (TOWN_SOUTH). The streets of the two
 * hamlets join the legs.
 */
export function homeLegs(home: Building): Leg[] {
  const mid = ([tx, ty]: readonly [number, number]) => [tx + 0.5, ty + 0.5] as const;
  return [
    { from: [home.doorX + 0.5, home.y1 + DOOR_PATH + 1.5], to: mid(WHITEGROVE_SOUTH), start: 'x', end: 'y' },
    { from: mid(WHITEGROVE_NORTH), to: mid(BRONZEHOLD_SOUTH), start: 'y', end: 'y' },
    { from: mid(BRONZEHOLD_NORTH), to: [TOWN_SOUTH.tx + 0.5, TOWN_SOUTH.ty + 0.5], start: 'y', end: 'y' },
  ];
}

/** The road from the home to Ironhold (homeLegs). */
export function homeRoad(home: Building): Road {
  return new Road(homeLegs(home));
}

/** Where the north road leaves Ironhold: the tile east of the north-east corner of the town, a row in. */
export const NORTH_ROAD_START = { tx: TOWN.x1 + 1, ty: TOWN.y0 + 1 } as const;
/** Where the north road ends: the site of Silverspring, about 250 tiles north-east of the town (Fede's choice, 2026-10-11). */
export const SILVERSPRING_SITE = { tx: NORTH_ROAD_START.tx + 178, ty: NORTH_ROAD_START.ty - 172 } as const;

/**
 * The way from the east gate of Ironhold (the east end of its main street) north along the town to the
 * start of the north road: the gate stays open, and joins the road to Silverspring.
 */
export function gateRoad(): Road {
  return new Road([{ from: [TOWN_GATE.tx + 0.5, TOWN_GATE.ty + 0.5], to: [NORTH_ROAD_START.tx + 0.5, NORTH_ROAD_START.ty + 0.5], start: 'y', end: 'y' }]);
}

/** The north road, from Ironhold to Silverspring. */
export function northRoad(): Road {
  return road(NORTH_ROAD_START.tx + 0.5, NORTH_ROAD_START.ty + 0.5, SILVERSPRING_SITE.tx + 0.5, SILVERSPRING_SITE.ty + 0.5);
}

/** The grove: this share of the north road (from Ironhold), and its trees this far from the middle line (tiles). */
export const GROVE_SPAN = [0.36, 0.46] as const;
export const GROVE_RADIUS = 7;

/**
 * A stretch of a road: the tiles within `radius` tiles of its middle line between two shares of its
 * length (from its start). The grove is one; the war band marches on another (source.ts).
 */
export class RoadStretch {
  /** For each tile of the stretch: its distance to the middle line of the road (tiles). */
  private readonly near = new Map<string, number>();
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  /** The points of the road where the stretch begins (from its start) and ends (tiles). */
  readonly start: readonly [number, number];
  readonly end: readonly [number, number];

  constructor(road: Road, span: readonly [number, number], radius: number) {
    const n = road.points.length;
    const first = Math.floor(n * span[0]);
    const last = Math.min(n - 1, Math.floor(n * span[1]));
    for (let i = first; i <= last; i++) {
      const [x, y] = road.points[i]!;
      for (let ty = Math.floor(y) - radius; ty <= Math.floor(y) + radius; ty++) {
        for (let tx = Math.floor(x) - radius; tx <= Math.floor(x) + radius; tx++) {
          const d = Math.hypot(tx + 0.5 - x, ty + 0.5 - y);
          if (d > radius) continue;
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

  /** Whether the tile is in the stretch. */
  has(tx: number, ty: number): boolean {
    return this.near.has(`${tx},${ty}`);
  }

  /** The distance of a tile of the stretch to the middle line of the road, or Infinity. */
  distance(tx: number, ty: number): number {
    return this.near.get(`${tx},${ty}`) ?? Infinity;
  }
}

/**
 * The grove on the north road (chapter 1.5.1: the scouts of the hobgoblins ambush the characters
 * "when they cross a wooded area"): a stretch where trees grow close on both sides of the road,
 * right to its edge. The road itself stays open.
 */
export class Grove extends RoadStretch {
  constructor(road: Road) {
    super(road, GROVE_SPAN, GROVE_RADIUS);
  }
}

/**
 * The war band (story phase 4b) marches on the north road from this share of its length, a little
 * beyond the grove, to its end at the gate of Silverspring. A character at the step on the road
 * from the grove to Silverspring (this far from it, tiles) starts it.
 */
export const BAND_SPAN = [GROVE_SPAN[1] + 0.07, 1] as const;
export const BAND_AREA = { span: [GROVE_SPAN[0], 0.97], radius: 10 } as const;

/**
 * The camp of the war band (story phase 4b; chapter 1.5.1): in the hills off the north road, between
 * the grove and Silverspring. Its middle is CAMP_OFFSET tiles off the point of the road at CAMP_SHARE
 * of its length, to the north-west, and a trail leads to it from the road.
 */
export const CAMP_SHARE = 0.66;
export const CAMP_OFFSET = [-13, -13] as const;

/** The middle of the camp of the war band (tiles). */
export function campSite(): { tx: number; ty: number } {
  const north = northRoad();
  const [x, y] = north.points[Math.floor(north.points.length * CAMP_SHARE)]!;
  return { tx: Math.floor(x) + CAMP_OFFSET[0], ty: Math.floor(y) + CAMP_OFFSET[1] };
}

/** The trail from the north road to the camp: from the point of the road at CAMP_SHARE to `to` (the camp's way in, tiles). */
export function campTrail(to: { tx: number; ty: number }): Road {
  const north = northRoad();
  const [x, y] = north.points[Math.floor(north.points.length * CAMP_SHARE)]!;
  return road(x, y, to.tx + 0.5, to.ty + 0.5);
}
