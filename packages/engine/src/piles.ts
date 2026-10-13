import { TILE_SIZE } from './constants.ts';
import { ITEM_STACK, addToPack, type ItemKind, type ItemStack, type Loot, type Pack } from './items.ts';
import type { Facing } from './player.ts';
import { isWet, type TileMap } from './world.ts';

/**
 * Items on the ground. A player drops a stack from its pack (in front of it, or tossed towards a
 * point: tossPoint), and a kill drops at the mob what does not fit in the killer's pack. Each stack
 * lies as a pile at one point of the world, and any player can pick it up with the action button. A
 * pile goes after PILE_MS.
 *
 * In a shared world the Room keeps the piles, in memory: a restart of the server clears them. In a
 * world that the page runs, the page keeps its own.
 */

/** One stack on the ground, at (x, y) in world pixels (whole numbers). */
export interface Pile {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly kind: ItemKind;
  readonly count: number;
  /** The storey where it lies (Building.storeys); none: the ground. */
  readonly storey?: number;
}

/** The storey of a pile (Pile.storey). */
export function pileStorey(pile: Pick<Pile, 'storey'>): number {
  return pile.storey ?? 0;
}

/** A pile goes this long after it came, or after a player last put more on it (ms). */
export const PILE_MS = 10 * 60_000;
/** The most piles in a world: when another one comes, the oldest one goes. */
export const MAX_PILES = 400;
/** The box of a pile round its point, for the reach of the action button (world pixels). */
export const PILE_HALF_WIDTH = 5;
export const PILE_HALF_HEIGHT = 4;
/** Two piles lie at least this far apart, so each one shows; a stack goes onto a pile of its kind this close. */
const PILE_GAP = 8;
/** A player drops a stack this far in front of its feet (world pixels), so it does not stand on it and hide it. */
const DROP_AHEAD = 10;
/** The farthest that a player tosses a stack from its feet, towards a point that it chose (world pixels). */
export const TOSS_REACH = 3 * TILE_SIZE;
/** The most tosses that wait for the next snapshot (or frame): more are not shown. */
const MAX_TOSSES = 64;
/** A line between two points is clear when every point this far apart on it is open ground. */
const LINE_STEP = 4;
/** Where a new pile may lie round the point where it falls: the point, then two rings. */
const SPOTS: readonly (readonly [number, number])[] = [
  [0, 0],
  ...ring(PILE_GAP, 8),
  ...ring(2 * PILE_GAP, 12),
];

function ring(radius: number, count: number): [number, number][] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    return [Math.round(Math.cos(angle) * radius), Math.round(Math.sin(angle) * radius)];
  });
}

/** Whether a point is in the solid part of its tile: a wall, a closed door, a tree, a rock, a fixture, or water. */
function solidPoint(world: TileMap, x: number, y: number): boolean {
  const tx = Math.floor(x / TILE_SIZE);
  const ty = Math.floor(y / TILE_SIZE);
  const box = world.solidBox(tx, ty);
  if (!box) return false;
  const lx = x - tx * TILE_SIZE;
  const ly = y - ty * TILE_SIZE;
  return lx >= box[0] && lx < box[2] && ly >= box[1] && ly < box[3];
}

/** Whether a point of the world is open ground: a pile may lie there. */
function openPoint(world: TileMap, x: number, y: number): boolean {
  return !solidPoint(world, x, y);
}

/** Whether a point stops a pile on its way to a spot: a solid point that is not water (a wall, a door, a tree). */
function blockingPoint(world: TileMap, x: number, y: number): boolean {
  return solidPoint(world, x, y) && !isWet(world.ground(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE)));
}

/** Whether nothing stops a pile on the line from (x0, y0) to (x1, y1): no wall, door, tree or fixture (water does not). */
function clearLine(world: TileMap, x0: number, y0: number, x1: number, y1: number): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / LINE_STEP));
  for (let i = 1; i <= steps; i++) if (blockingPoint(world, x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps)) return false;
  return true;
}

const AHEAD: Readonly<Record<Facing, readonly [number, number]>> = {
  down: [0, DROP_AHEAD],
  up: [0, -DROP_AHEAD],
  left: [-DROP_AHEAD, 0],
  right: [DROP_AHEAD, 0],
};

/**
 * Where a player drops a stack: a little in front of its feet, the way that it faces, when that is
 * open ground and nothing stands between; else at its feet.
 */
export function dropPoint(world: TileMap, player: { readonly x: number; readonly y: number; readonly facing: Facing }): { x: number; y: number } {
  const [dx, dy] = AHEAD[player.facing];
  const x = player.x + dx;
  const y = player.y + dy;
  return openPoint(world, x, y) && clearLine(world, player.x, player.y, x, y) ? { x, y } : { x: player.x, y: player.y };
}

/**
 * Where a stack lands that a player tosses towards (x, y): it dragged the stack from its pack onto
 * the world there. The point, but at most TOSS_REACH from the player's feet; nearer when something
 * stands in the way (a wall, a door, a tree, a thing): the farthest point of open ground on the line
 * before it. Water does not stop a toss, but a stack does not land on it. At the feet when no point
 * is open.
 */
export function tossPoint(world: TileMap, player: { readonly x: number; readonly y: number }, x: number, y: number): { x: number; y: number } {
  let dx = x - player.x;
  let dy = y - player.y;
  const distance = Math.hypot(dx, dy);
  if (distance > TOSS_REACH) {
    dx *= TOSS_REACH / distance;
    dy *= TOSS_REACH / distance;
  }
  const steps = Math.max(1, Math.ceil(Math.min(distance, TOSS_REACH) / LINE_STEP));
  let best = { x: Math.round(player.x), y: Math.round(player.y) };
  for (let i = 1; i <= steps; i++) {
    const px = Math.round(player.x + (dx * i) / steps);
    const py = Math.round(player.y + (dy * i) / steps);
    if (blockingPoint(world, px, py)) break;
    if (openPoint(world, px, py)) best = { x: px, y: py };
  }
  return best;
}

interface Lying {
  pile: Pile;
  until: number;
}

/**
 * Items fell onto a pile: from (fromX, fromY), the feet of the player who dropped them or the mob
 * that died. The screen shows them fly from there to the pile (render/piles.ts).
 */
export interface Toss {
  readonly pile: number;
  readonly fromX: number;
  readonly fromY: number;
}

/** What a player took from a pile: the new pack, what went in, and what stayed on the ground. */
export interface Taken {
  readonly pack: Pack;
  readonly taken: Loot;
  readonly left: Loot;
}

/** The piles of a world. */
export class Piles {
  private readonly world: TileMap & { level(storey: number): TileMap };
  private lying: Lying[] = [];
  private tosses: Toss[] = [];
  private nextId = 1;
  /** Goes up each time a pile comes, changes or goes. */
  version = 0;

  constructor(world: TileMap & { level(storey: number): TileMap }) {
    this.world = world;
  }

  /** Every pile, the oldest first. */
  get list(): Pile[] {
    return this.lying.map((l) => l.pile);
  }

  get size(): number {
    return this.lying.length;
  }

  get(id: number): Pile | null {
    return this.lying.find((l) => l.pile.id === id)?.pile ?? null;
  }

  /** The piles within `radius` world pixels of (x, y). */
  near(x: number, y: number, radius: number): Pile[] {
    const out: Pile[] = [];
    for (const { pile } of this.lying) if (Math.abs(pile.x - x) <= radius && Math.abs(pile.y - y) <= radius && Math.hypot(pile.x - x, pile.y - y) <= radius) out.push(pile);
    return out;
  }

  /**
   * Puts stacks on the ground round (x, y): each one first onto a pile of its kind close by that
   * has room, then as a new pile on a free spot of open ground near the point. Returns the piles
   * that came or changed. With `from` (where the items come from), each of them is a toss too. On a
   * storey above the ground (`storey`), they lie on that storey.
   */
  put(x: number, y: number, stacks: readonly ItemStack[], nowMs: number, from?: { readonly x: number; readonly y: number }, storey = 0): Pile[] {
    const changed: Pile[] = [];
    const px = Math.round(x);
    const py = Math.round(y);
    for (const stack of stacks) {
      let count = stack.count;
      for (const lying of this.lying) {
        if (count === 0) break;
        const { pile } = lying;
        if (pile.kind !== stack.kind || pileStorey(pile) !== storey || Math.hypot(pile.x - px, pile.y - py) > PILE_GAP) continue;
        const n = Math.min(ITEM_STACK[pile.kind] - pile.count, count);
        if (n <= 0) continue;
        lying.pile = { ...pile, count: pile.count + n };
        lying.until = nowMs + PILE_MS;
        count -= n;
        changed.push(lying.pile);
      }
      while (count > 0) {
        const n = Math.min(ITEM_STACK[stack.kind], count);
        const [sx, sy] = this.spot(px, py, storey);
        const pile: Pile = { id: this.nextId++, x: sx, y: sy, kind: stack.kind, count: n, ...(storey > 0 ? { storey } : {}) };
        this.lying.push({ pile, until: nowMs + PILE_MS });
        if (this.lying.length > MAX_PILES) this.lying.shift();
        count -= n;
        changed.push(pile);
      }
    }
    if (changed.length > 0) this.version++;
    if (from) {
      for (const id of new Set(changed.map((p) => p.id))) this.tosses.push({ pile: id, fromX: Math.round(from.x), fromY: Math.round(from.y) });
      if (this.tosses.length > MAX_TOSSES) this.tosses.splice(0, this.tosses.length - MAX_TOSSES);
    }
    return changed;
  }

  /** The tosses since the last call, the oldest first. */
  takeTosses(): Toss[] {
    const tosses = this.tosses;
    this.tosses = [];
    return tosses;
  }

  /**
   * A free spot of open ground near (x, y), with nothing solid between it and the point (so never
   * on the other side of a wall), or the point itself when every spot is taken.
   */
  private spot(x: number, y: number, storey: number): readonly [number, number] {
    const level = this.world.level(storey);
    for (const [dx, dy] of SPOTS) {
      const sx = x + dx;
      const sy = y + dy;
      if (!openPoint(level, sx, sy) || !clearLine(level, x, y, sx, sy)) continue;
      if (this.lying.some(({ pile }) => pileStorey(pile) === storey && Math.hypot(pile.x - sx, pile.y - sy) < PILE_GAP)) continue;
      return [sx, sy];
    }
    return [x, y];
  }

  /**
   * A player with `pack` and `slots` slots picks up the pile `id`: what fits goes into the pack, the
   * rest stays on the ground. Null if there is no such pile.
   */
  take(id: number, pack: Pack, slots: number): Taken | null {
    const index = this.lying.findIndex((l) => l.pile.id === id);
    if (index < 0) return null;
    const lying = this.lying[index]!;
    const result = addToPack(pack, { coins: 0, items: [{ kind: lying.pile.kind, count: lying.pile.count }] }, slots);
    const left = result.left.items[0]?.count ?? 0;
    if (left === lying.pile.count) return result;
    if (left === 0) this.lying.splice(index, 1);
    else lying.pile = { ...lying.pile, count: left };
    this.version++;
    return result;
  }

  /** Removes the piles whose time is over. Returns whether one went. */
  tick(nowMs: number): boolean {
    const before = this.lying.length;
    this.lying = this.lying.filter((l) => l.until > nowMs);
    if (this.lying.length === before) return false;
    this.version++;
    return true;
  }
}
