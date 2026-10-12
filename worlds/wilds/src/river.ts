/**
 * The Silvervein (el río Vena de Plata in Kandrax: `Kandrax - Mundo`, 2.2.1.5, "the river that crosses
 * Silverspring", where the village pans its mithril). It rises at a spring in the hills north of
 * Silverspring, crosses the town from its north edge to its south edge (the channel of the town's map,
 * silverspring.ts), and runs on south into a pool. Outside the town it is a curve of deep water, with
 * a band of shallows at its banks (a character with Strength 13 wades them) and a bank where no tree
 * grows. Its two parts meet the town's channel straight, at the middle of its two columns.
 */

/** Tiles this close to the middle line are deep water; then shallows; then the bank (no tree, no house). */
const DEEP = 1.05;
const SHALLOW = 1.75;
const BANK = 2.8;
/** The spring and the pool: round pools of this radius (tiles), with the same bands. */
const SPRING_RADIUS = 2.6;
const POOL_RADIUS = 4.5;

export type RiverBand = 'deep' | 'shallow' | 'bank';

/** A part of a river: a cubic curve from (ax, ay) to (bx, by) (tiles, as fractions), level north to south at both ends. */
class Reach {
  readonly points: readonly (readonly [number, number])[];
  constructor(ax: number, ay: number, bx: number, by: number) {
    const pull = (by - ay) / 2;
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 4);
    const points: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      const x = u * u * u * ax + 3 * u * u * t * ax + 3 * u * t * t * bx + t * t * t * bx;
      const y = u * u * u * ay + 3 * u * u * t * (ay + pull) + 3 * u * t * t * (by - pull) + t * t * t * by;
      points.push([x, y]);
    }
    this.points = points;
  }
}

/** A river of the Wilds: its parts and its two pools, and for each tile near it, its band. */
export class River {
  readonly name: string;
  private readonly near = new Map<string, number>();
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  /** The middle of its spring and of its pool (tiles). */
  readonly spring: readonly [number, number];
  readonly pool: readonly [number, number];

  constructor(name: string, spring: readonly [number, number], reaches: readonly (readonly [number, number, number, number])[], pool: readonly [number, number]) {
    this.name = name;
    this.spring = spring;
    this.pool = pool;
    const mark = (tx: number, ty: number, d: number) => {
      if (d > BANK) return;
      const key = `${tx},${ty}`;
      if (d < (this.near.get(key) ?? Infinity)) this.near.set(key, d);
    };
    const reach = Math.ceil(BANK);
    for (const [ax, ay, bx, by] of reaches) {
      for (const [x, y] of new Reach(ax, ay, bx, by).points) {
        for (let ty = Math.floor(y) - reach; ty <= Math.floor(y) + reach; ty++) for (let tx = Math.floor(x) - reach; tx <= Math.floor(x) + reach; tx++) mark(tx, ty, Math.hypot(tx + 0.5 - x, ty + 0.5 - y));
      }
    }
    // The pools: the distance from the rim of the pool counts as from the middle line of the river.
    for (const [[cx, cy], radius] of [
      [spring, SPRING_RADIUS],
      [pool, POOL_RADIUS],
    ] as const) {
      const r = Math.ceil(radius + BANK);
      for (let ty = Math.floor(cy) - r; ty <= Math.floor(cy) + r; ty++) {
        for (let tx = Math.floor(cx) - r; tx <= Math.floor(cx) + r; tx++) mark(tx, ty, Math.max(0, Math.hypot(tx + 0.5 - cx, ty + 0.5 - cy) - radius + DEEP * 0.5));
      }
    }
    const tiles = [...this.near.keys()].map((k) => k.split(',').map(Number) as [number, number]);
    this.x0 = Math.min(...tiles.map(([x]) => x));
    this.y0 = Math.min(...tiles.map(([, y]) => y));
    this.x1 = Math.max(...tiles.map(([x]) => x));
    this.y1 = Math.max(...tiles.map(([, y]) => y));
  }

  /** The band of a tile (deep water, shallows, or the bank), or null far from the river. */
  band(tx: number, ty: number): RiverBand | null {
    const d = this.near.get(`${tx},${ty}`);
    if (d === undefined) return null;
    return d <= DEEP ? 'deep' : d <= SHALLOW ? 'shallow' : 'bank';
  }

  /** Whether the tile is water of the river (deep or shallow). */
  wet(tx: number, ty: number): boolean {
    const band = this.band(tx, ty);
    return band === 'deep' || band === 'shallow';
  }

  /** Whether the tile is on the river or its bank, where nothing grows and no house stands. */
  has(tx: number, ty: number): boolean {
    return this.near.has(`${tx},${ty}`);
  }
}

/**
 * The Silvervein of Silverspring: its spring 34 tiles north of the town, the town's channel at x 202
 * (between the columns 29 and 30 of its map), and its pool 50 tiles south of the town.
 */
export const SILVERVEIN = new River(
  'the Silvervein',
  [205.5, -223.5],
  [
    [205.5, -221, 202, -189],
    [202, -165, 196, -120],
  ],
  [196, -115.5],
);
