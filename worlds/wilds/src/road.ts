import type { Building, Fixture } from '@game/engine';
import { DOOR_PATH } from './houses.ts';
import { TOWN_GATE, TOWN_NAME } from './town.ts';

/**
 * The road from the home to Thornwick, and the signpost by the home that points the way.
 *
 * The road starts below the path to the home's door and ends at the gate of the town (the east
 * end of its main street). It is a smooth curve: it leaves the home to the west and comes into
 * the town from the east. Its tiles are mud, also over water (a causeway); nothing grows on it or
 * close to it, and no house of the wilds stands on its ground.
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
  /** For each tile near the road: its distance to the middle line (tiles). */
  private readonly near = new Map<string, number>();
  /** The rectangle of the tiles in `near`. */
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;

  constructor(home: Building) {
    // A cubic curve from below the path to the door to the gate, level at both ends.
    const ax = home.doorX + 0.5;
    const ay = home.y1 + DOOR_PATH + 1.5;
    const bx = TOWN_GATE.tx + 0.5;
    const by = TOWN_GATE.ty + 0.5;
    const pull = Math.abs(ax - bx) / 2;
    const points: [number, number][] = [];
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 4);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      const x = u * u * u * ax + 3 * u * u * t * (ax - pull) + 3 * u * t * t * (bx + pull) + t * t * t * bx;
      const y = u * u * u * ay + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * by;
      points.push([x, y]);
    }
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
