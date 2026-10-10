import { TILE_SIZE } from './constants.ts';
import type { Fixture } from './fixtures.ts';
import type { Feet } from './interact.ts';
import { NO_LOOT, addToPack, lootIsEmpty, rollLoot, type Loot, type Pack } from './items.ts';
import type { World } from './world.ts';

/** A chest fills again this long after a player emptied it (ms). The chest of a barred house fills when its door is barred again. */
export const REFILL_MS = 30 * 60_000;
/** A forced door gets its boards again after this long (ms) with no player within REBAR_RADIUS tiles of it. */
export const REBAR_MS = 30 * 60_000;
export const REBAR_RADIUS = 30;
/** The barred doors are checked this often (ms), not in every tick. */
const CHECK_MS = 1000;

/** What opening a chest did: the new pack, what went in, and whether something stayed in the chest (the pack is full). */
export interface Opened {
  readonly pack: Pack;
  readonly taken: Loot;
  readonly full: boolean;
}

interface ChestState {
  /** What is still in it. */
  left: Loot;
  /** When it became empty, or null while something is in it. */
  emptiedMs: number | null;
  /** Whether it stands in a barred house: then only the bar coming back fills it. */
  readonly barred: boolean;
  /** The door of its house. */
  readonly door: string;
}

/**
 * The state of the loot of a world over time: what is left in each chest that a player opened,
 * and the barred doors that a player forced. One loot per chest for every player of a world: the
 * first one takes it, and the chest fills again later (Fede's choice, 2026-10-10). A forced door
 * gets its boards again after a long time with nobody near, and the chest of its house fills
 * again at the same moment.
 *
 * A shared world's Room has one (the server decides); a world that the page runs has its own.
 * It knows no clock: the caller gives the time.
 */
export class Spoils {
  private readonly world: World;
  private readonly random: () => number;
  private readonly chests = new Map<string, ChestState>();
  /** For each forced door: when a player was last near it (ms). */
  private readonly near = new Map<string, number>();
  private checkedMs = -Infinity;

  constructor(world: World, random: () => number) {
    this.world = world;
    this.random = random;
  }

  /** Whether a fixture is a source of loot (its world gives it a loot table). */
  isSource(fixture: Fixture): boolean {
    return (this.world.source.loot?.(fixture) ?? null) !== null;
  }

  /**
   * A player with `pack` (and `slots` slots) opens the chest `fixture`: it takes what fits, and
   * the rest stays in the chest. Null if the fixture gives no loot.
   */
  open(fixture: Fixture, pack: Pack, slots: number, nowMs: number): Opened | null {
    const table = this.world.source.loot?.(fixture) ?? null;
    if (!table) return null;
    const key = `${fixture.tx},${fixture.ty}`;
    let chest = this.chests.get(key);
    if (!chest) {
      const house = this.world.buildingAt(fixture.tx, fixture.ty);
      chest = { left: rollLoot(table, this.random), emptiedMs: null, barred: house?.barred !== undefined, door: house ? `${house.doorX},${house.y1}` : '' };
      this.chests.set(key, chest);
    }
    if (chest.emptiedMs !== null) return { pack, taken: NO_LOOT, full: false };
    const result = addToPack(pack, chest.left, slots);
    chest.left = result.left;
    if (lootIsEmpty(result.left)) chest.emptiedMs = nowMs;
    return { pack: result.pack, taken: result.taken, full: !lootIsEmpty(result.left) };
  }

  /**
   * Moves time on to `nowMs`: chests that were empty long enough fill again, and a forced door
   * with no player near for REBAR_MS gets its boards again (closed). Returns whether a door
   * changed (a server then sends the doors).
   */
  tick(nowMs: number, players: readonly Feet[]): boolean {
    if (nowMs - this.checkedMs < CHECK_MS) return false;
    this.checkedMs = nowMs;
    for (const [key, chest] of this.chests) {
      if (!chest.barred && chest.emptiedMs !== null && nowMs - chest.emptiedMs >= REFILL_MS) this.chests.delete(key);
    }
    let changed = false;
    const forced = this.world.forcedDoorList();
    const keys = new Set(forced.map(([tx, ty]) => `${tx},${ty}`));
    for (const key of this.near.keys()) if (!keys.has(key)) this.near.delete(key);
    const radius = REBAR_RADIUS * TILE_SIZE;
    for (const [tx, ty] of forced) {
      const key = `${tx},${ty}`;
      const cx = tx * TILE_SIZE + TILE_SIZE / 2;
      const cy = ty * TILE_SIZE + TILE_SIZE / 2;
      if (!this.near.has(key) || players.some((p) => Math.hypot(p.x - cx, p.y - cy) <= radius)) {
        this.near.set(key, nowMs);
        continue;
      }
      if (nowMs - this.near.get(key)! < REBAR_MS) continue;
      // Nobody has been near for a long time: the boards come back, and the house's chest fills again.
      this.world.setDoorOpen(tx, ty, false);
      this.world.setDoorForced(tx, ty, false);
      this.near.delete(key);
      for (const [chestKey, chest] of this.chests) if (chest.door === key) this.chests.delete(chestKey);
      changed = true;
    }
    return changed;
  }
}
