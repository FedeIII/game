import { TILE_SIZE } from './constants.ts';
import type { Fixture, Interaction } from './fixtures.ts';
import type { Actor } from './interact.ts';
import type { Facing } from './player.ts';
import type { World } from './world.ts';

/**
 * NPCs that walk: each one wanders its own area of tiles, stops for a while (sometimes a long
 * while), looks round, and walks on. A player who comes close stops it, and it turns to face the
 * player, so a dialog is never cut by an NPC that walks away. NPCs do not collide with players
 * (as players do not collide with each other).
 *
 * A world gives its NPCs with WorldSource.npcs(). In a shared world the server runs them (a
 * Room has an NpcCrowd) and sends their poses in the snapshots; in a single-player world, or
 * while the server is not there, the client runs the same NpcCrowd. The crowd uses only its own
 * seeded random numbers, so it is the same code everywhere.
 */

export interface NpcDef {
  /** Unique in its world. */
  readonly id: string;
  /** The look in the art: frames npc/<look>/<view>/... */
  readonly look: string;
  /** The tile where it starts. It must be in `area`. */
  readonly home: readonly [number, number];
  /** The tiles where it may stand and walk. They must be open, and connected. */
  readonly area: readonly (readonly [number, number])[];
  /** What it says when a player talks to it. */
  readonly content: Interaction;
}

/** Where an NPC is and how it moves: the same shape as a player's pose. */
export interface NpcPose {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: Facing;
}

/** World pixels per second: a calm walk (players walk at 80). */
export const NPC_SPEED = 28;
/** A player whose feet are this close (world pixels) stops an NPC. */
export const NPC_HOLD_RADIUS = 22;
/** The feet box of an NPC round its position, for the action button: as the player's, a little narrower. */
export const NPC_HALF_WIDTH = 4;
export const NPC_HALF_HEIGHT = 3;

/** The NPCs as actors for findInteraction(): where each one is now, with its fixture. */
export function npcActors(defs: readonly NpcDef[], poses: readonly { readonly x: number; readonly y: number }[]): Actor[] {
  return poses.map((pose, i) => ({ x: pose.x, y: pose.y, halfWidth: NPC_HALF_WIDTH, halfHeight: NPC_HALF_HEIGHT, fixture: npcFixture(defs[i]!) }));
}

/** Where an NPC stands on a tile: the middle, a little south of the centre, like the player. */
export function standPoint(tx: number, ty: number): { x: number; y: number } {
  return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + 12 };
}

const fixtures = new WeakMap<NpcDef, Fixture>();

/**
 * The NPC as a target of the action button: a fixture of kind 'npc' at its home tile, with its
 * content. The same object every time, so a dialog stays with the NPC while it moves.
 */
export function npcFixture(def: NpcDef): Fixture {
  let fixture = fixtures.get(def);
  if (!fixture) {
    fixture = { kind: 'npc', tx: def.home[0], ty: def.home[1], look: def.look, content: def.content };
    fixtures.set(def, fixture);
  }
  return fixture;
}

/** What happened in a step that others must know: for now, nothing. Later: doors, speech. */
export interface NpcEvents {
  readonly doors: boolean;
}

interface Brain {
  readonly area: ReadonlySet<string>;
  readonly tiles: readonly (readonly [number, number])[];
  /** The last tile it stood on or reached. */
  tile: [number, number];
  path: [number, number][];
  /** While it stands: the time left before it walks on, and before it looks round. */
  waitMs: number;
  lookMs: number;
}

const key = (tx: number, ty: number) => `${tx},${ty}`;
const FACINGS: readonly Facing[] = ['down', 'left', 'right', 'up'];

/** mulberry32: small and the same in every JavaScript engine. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The facing for a move or a look in the direction (dx, dy). */
function facingTo(dx: number, dy: number, current: Facing): Facing {
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return current;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}

/** The NPCs of a world, and their walks. */
export class NpcCrowd {
  readonly world: World;
  readonly defs: readonly NpcDef[];
  /** One pose for each def, in order. step() changes them. */
  readonly poses: readonly NpcPose[];
  private readonly brains: Brain[];
  private readonly random: () => number;

  constructor(world: World, defs: readonly NpcDef[], seed: number) {
    this.world = world;
    this.defs = defs;
    this.random = rng(seed);
    this.poses = defs.map((def) => ({ ...standPoint(def.home[0], def.home[1]), vx: 0, vy: 0, facing: 'down' as Facing }));
    this.brains = defs.map((def) => {
      const area = new Set(def.area.map(([tx, ty]) => key(tx, ty)));
      if (!area.has(key(def.home[0], def.home[1]))) throw new Error(`npc ${def.id}: home is not in its area`);
      // A random first stop, so the NPCs of a town do not all set off at once.
      return { area, tiles: def.area, tile: [def.home[0], def.home[1]], path: [], waitMs: this.between(500, 6000), lookMs: this.between(1500, 4000) };
    });
  }

  /** Moves every NPC by `dtMs` milliseconds. `players` are the feet of the players near or far. */
  step(dtMs: number, players: readonly { readonly x: number; readonly y: number }[]): NpcEvents {
    const dt = Math.min(dtMs, 250);
    this.brains.forEach((brain, i) => {
      const pose = this.poses[i]! as NpcPose;
      // A player close by: stop, and face the nearest one.
      let nearest: { x: number; y: number } | null = null;
      let best = NPC_HOLD_RADIUS;
      for (const p of players) {
        const d = Math.hypot(p.x - pose.x, p.y - pose.y);
        if (d < best) {
          best = d;
          nearest = p;
        }
      }
      if (nearest) {
        pose.vx = 0;
        pose.vy = 0;
        pose.facing = facingTo(nearest.x - pose.x, nearest.y - pose.y, pose.facing);
        return;
      }
      if (brain.path.length === 0) this.stand(brain, pose, dt);
      else this.walk(brain, pose, dt);
    });
    return { doors: false };
  }

  private stand(brain: Brain, pose: NpcPose, dt: number): void {
    pose.vx = 0;
    pose.vy = 0;
    brain.lookMs -= dt;
    if (brain.lookMs <= 0) {
      // Look round now and then; mostly towards the room (south).
      pose.facing = this.random() < 0.4 ? 'down' : FACINGS[Math.floor(this.random() * FACINGS.length)]!;
      brain.lookMs = this.between(1500, 4500);
    }
    brain.waitMs -= dt;
    if (brain.waitMs > 0) return;
    const target = brain.tiles[Math.floor(this.random() * brain.tiles.length)]!;
    brain.path = this.route(brain, target);
    if (brain.path.length === 0) brain.waitMs = this.between(500, 2000);
  }

  private walk(brain: Brain, pose: NpcPose, dt: number): void {
    let budget = (NPC_SPEED * dt) / 1000;
    const startX = pose.x;
    const startY = pose.y;
    while (budget > 0 && brain.path.length > 0) {
      const [tx, ty] = brain.path[0]!;
      const goal = standPoint(tx, ty);
      const dx = goal.x - pose.x;
      const dy = goal.y - pose.y;
      const d = Math.hypot(dx, dy);
      if (d <= budget) {
        pose.x = goal.x;
        pose.y = goal.y;
        budget -= d;
        brain.tile = [tx, ty];
        brain.path.shift();
      } else {
        pose.x += (dx / d) * budget;
        pose.y += (dy / d) * budget;
        budget = 0;
      }
    }
    const mx = pose.x - startX;
    const my = pose.y - startY;
    pose.facing = facingTo(mx, my, pose.facing);
    if (brain.path.length === 0) {
      // Arrived: a stop of a varied length; now and then a long one.
      const r = this.random();
      brain.waitMs = r < 0.7 ? this.between(1500, 6000) : r < 0.95 ? this.between(6000, 14000) : this.between(15000, 25000);
      brain.lookMs = this.between(800, 3000);
      pose.vx = 0;
      pose.vy = 0;
    } else {
      pose.vx = (mx / dt) * 1000;
      pose.vy = (my / dt) * 1000;
    }
  }

  /** The tiles from the NPC's tile to `target`, through its area (four directions), without the first. */
  private route(brain: Brain, target: readonly [number, number]): [number, number][] {
    const start = key(brain.tile[0], brain.tile[1]);
    const goal = key(target[0], target[1]);
    if (start === goal) return [];
    const from = new Map<string, string | null>([[start, null]]);
    const queue: [number, number][] = [brain.tile];
    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      if (key(x, y) === goal) break;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const) {
        const k = key(nx, ny);
        if (!brain.area.has(k) || from.has(k)) continue;
        from.set(k, key(x, y));
        queue.push([nx, ny]);
      }
    }
    if (!from.has(goal)) return [];
    const path: [number, number][] = [];
    for (let k: string | null = goal; k && k !== start; k = from.get(k) ?? null) {
      const [x, y] = k.split(',').map(Number);
      path.unshift([x!, y!]);
    }
    return path;
  }

  private between(a: number, b: number): number {
    return a + (b - a) * this.random();
  }
}
