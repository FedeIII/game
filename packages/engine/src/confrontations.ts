import { TILE_SIZE } from './constants.ts';
import { MOB_STATS, type Horde, type MobKind } from './mobs.ts';
import { canApply, holds, type Conditions, type QuestBook, type QuestEffect } from './quests.ts';
import type { Pack } from './items.ts';
import type { PlayerState } from './player.ts';

/**
 * Sure confrontations (Fede, 2026-10-13: "force a single confrontation with goblins for new players if
 * they are there during the day"): a character for whom `when` holds, in `area` at `hours`, meets one
 * group of `kind` once. When the character has been outside in the area for SETTLE_MS, the group comes
 * ahead of it, out of its view (Horde.spawnAhead), and behaves as its kind does (the goblins patrol).
 * When a mob of that kind hunts the character (it saw it: a startle, a chase), the meeting is done:
 * `met` applies (a flag of a quest), so `when` does not hold any more. A meeting with any group of
 * that kind counts (the goblins of the night too). A group that is gone (the character went on, far
 * from it), or that did not meet the character in WAIT_MS, comes again ahead of it. The Room runs them
 * in a shared world; the page in a world that it runs.
 */
export interface ConfrontationDef {
  readonly id: string;
  readonly kind: MobKind;
  /** The size of its group; without it, the kind's (MobStats.patrol or ambush), else 1. */
  readonly group?: readonly [number, number];
  /** The characters that get it (a new character: on the road to Ironhold, without the flag of `met`). */
  readonly when: Conditions;
  /** Where: a rectangle of tiles, from (x0, y0) to (x1, y1), with sides that can be infinite. */
  readonly area: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };
  /** When: by day (Horde.daytime), at night, or at any hour. */
  readonly hours: 'day' | 'night' | 'any';
  /** What the meeting applies: a flag on a quest, so that `when` does not hold any more. */
  readonly met: QuestEffect;
}

/** A character as the confrontations see it. */
export interface ConfrontationPlayer {
  readonly id: number;
  readonly state: PlayerState;
  readonly quests: QuestBook;
  readonly pack: Pack;
}

/** A character must be outside in the area this long (ms) before its group comes. */
export const SETTLE_MS = 6000;
/** A group that did not meet its character in this long (ms) comes again ahead of it. */
export const WAIT_MS = 90_000;
/** A group goes (to come again) only when its character is this far from each of its mobs (tiles): out of view. */
const OUT_OF_VIEW = 17;

interface Run {
  readonly mobs: readonly number[];
  readonly since: number;
}

export class Confrontations {
  readonly defs: readonly ConfrontationDef[];
  /** The group of each character ("<def id>:<player id>"), and since when each one is in the area (ms). */
  private readonly runs = new Map<string, Run>();
  private readonly arrived = new Map<string, number>();
  private clock = 0;

  constructor(defs: readonly ConfrontationDef[]) {
    this.defs = defs;
  }

  /** Moves them on by `dtMs`: groups come, and the meetings apply `met` (the caller applies the effects). */
  step(dtMs: number, horde: Horde, players: readonly ConfrontationPlayer[]): { readonly player: number; readonly effect: QuestEffect }[] {
    this.clock += Math.max(0, dtMs);
    const out: { player: number; effect: QuestEffect }[] = [];
    if (this.defs.length === 0) return out;
    const keys = new Set<string>();
    for (const def of this.defs) {
      for (const p of players) {
        const key = `${def.id}:${p.id}`;
        if (!holds(def.when, p.quests, p.pack)) continue;
        keys.add(key);
        // The meeting: a mob of the kind hunts the character.
        if (horde.huntersOf(p.id).some((m) => m.kind === def.kind) && canApply(def.met, p.quests, p.pack)) {
          out.push({ player: p.id, effect: def.met });
          this.runs.delete(key);
          this.arrived.delete(key);
          continue;
        }
        const run = this.runs.get(key);
        if (run) {
          const alive = horde.mobs.filter((m) => run.mobs.includes(m.id) && m.state !== 'dying');
          const late = this.clock - run.since > WAIT_MS;
          const unseen = alive.every((m) => Math.hypot(m.x - p.state.x, m.y - p.state.y) > OUT_OF_VIEW * TILE_SIZE);
          if (alive.length === 0 || (late && unseen)) {
            // It went, or it waited in vain: it goes out of view, and comes again ahead of the character.
            horde.dismiss(alive.map((m) => m.id));
            this.runs.delete(key);
          }
          continue;
        }
        if (!this.ready(def, p, horde)) {
          this.arrived.delete(key);
          continue;
        }
        const since = this.arrived.get(key) ?? this.clock;
        this.arrived.set(key, since);
        if (this.clock - since < SETTLE_MS) continue;
        const group = def.group ?? MOB_STATS[def.kind].patrol?.group ?? MOB_STATS[def.kind].ambush?.group ?? [1, 1];
        const others = players.filter((o) => o !== p).map((o) => o.state);
        const mobs = horde.spawnAhead(def.kind, group, p.state, others);
        if (mobs.length > 0) this.runs.set(key, { mobs: mobs.map((m) => m.id), since: this.clock });
      }
    }
    // The characters that left, or for whom it does not hold any more: their groups stay as mobs of the area.
    for (const key of [...this.runs.keys()]) if (!keys.has(key)) this.runs.delete(key);
    for (const key of [...this.arrived.keys()]) if (!keys.has(key)) this.arrived.delete(key);
    return out;
  }

  /** Whether a group may come for the character now: in the area, at the hour, outside, on the ground, not defeated, where mobs may go (not a town). */
  private ready(def: ConfrontationDef, p: ConfrontationPlayer, horde: Horde): boolean {
    const tx = Math.floor(p.state.x / TILE_SIZE);
    const ty = Math.floor(p.state.y / TILE_SIZE);
    const { x0, y0, x1, y1 } = def.area;
    if (tx < x0 || tx > x1 || ty < y0 || ty > y1) return false;
    if (def.hours !== 'any' && horde.daytime !== (def.hours === 'day')) return false;
    return p.state.down === 0 && p.state.storey === 0 && horde.passable(tx, ty);
  }
}
