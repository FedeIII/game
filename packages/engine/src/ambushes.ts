import { TILE_SIZE } from './constants.ts';
import { sizeEncounter } from './encounters.ts';
import type { Horde, Mob, MobKind, MobState } from './mobs.ts';
import { canApply, holds, type Conditions, type QuestBook, type QuestEffect } from './quests.ts';
import type { Pack } from './items.ts';
import type { PlayerState } from './player.ts';
import type { World } from './world.ts';

/**
 * Ambushes (story phase 3): mobs of the story that wait for a character at a quest step in an area
 * (the scouts of the hobgoblins in the grove). When such a character comes into the area, the mobs
 * come from the end of the area that is furthest from it; their number follows the characters there
 * (encounters.ts). When all of them have fallen, the quest moves on for every character at the step
 * near the area. If they go away instead (nobody near them any more), the ambush waits again. The
 * Room runs them in a shared world; the page in a world that it runs.
 *
 * A band that marches (`march`, the war band of story phase 4b) starts at the beginning of a route
 * and walks it (Horde.march); its mobs never go away. If one of them comes to the end of the route,
 * the band is in: the march ends with `arrive` for the characters of the party, and the band goes.
 */

/** A mob of an ambush; it rides the mob at index `rides` of the whole list (its mount), in seat `seat` (0 in front), until the pair hunts. */
export interface AmbushMember {
  readonly kind: MobKind;
  readonly rides?: number;
  readonly seat?: number;
}

export interface AmbushDef {
  readonly id: string;
  /** Whether a tile is in the area of the ambush. */
  readonly inArea: (tx: number, ty: number) => boolean;
  /** The conditions of a character that starts it, and that its end moves on: a quest at a step. */
  readonly when: Conditions;
  /** Where the mobs come from (tiles): the point furthest from the character that starts it. */
  readonly from: readonly (readonly [number, number])[];
  /** The units in order (encounters.ts, sizeEncounter): more characters there, more units. */
  readonly units: readonly (readonly AmbushMember[])[];
  /** What the end does for each character at the step near the area (the quest moves on, a reward). */
  readonly effect: QuestEffect;
  /**
   * A band that marches: it starts at the first point of `route` (tiles, as fractions), its mobs in a
   * column behind it, and walks it at `speed` (px/s) while it does not hunt (`from` does not count).
   * When one of its mobs comes to the end, `arrive` applies for the characters of the party; without
   * `arrive`, the band stays there (the raid, in the main street of the town).
   */
  readonly march?: { readonly route: readonly (readonly [number, number])[]; readonly speed: number; readonly arrive?: QuestEffect };
  /**
   * A raid (an event, the war band in Silverspring): its mobs may go into a town (Horde.unleash,
   * MobRules.raid), and the NPCs with these ids take shelter while it runs (NpcCrowd.setAlarm).
   */
  readonly raid?: { readonly shelter: readonly string[] };
}

/** How the mobs of a marching band stand in their column: this many points of the route apart (Road: 4 points for each tile). */
export const MARCH_GAP = 6;

/** A character as the ambushes see it. */
export interface AmbushPlayer {
  readonly id: number;
  readonly state: PlayerState;
  readonly quests: QuestBook;
  readonly pack: Pack;
}

/** The characters within this many tiles count as "there" (level-3.md), and get the end. */
export const AMBUSH_RADIUS = 12;

interface Running {
  readonly def: AmbushDef;
  readonly mobs: readonly number[];
  /** The characters at the step when it started: they get the end, near or far. */
  readonly players: ReadonlySet<number>;
  /** The last state of each of its mobs: a mob that is gone after 'dying' fell. */
  readonly last: Map<number, MobState>;
}

/** The ambushes of a world, and the ones that run. */
export class Ambushes {
  readonly defs: readonly AmbushDef[];
  private readonly world: World;
  private running: Running[] = [];

  constructor(world: World, defs: readonly AmbushDef[]) {
    this.world = world;
    this.defs = defs;
  }

  /** The ids of the mobs of the ambushes that run (the debug panel). */
  get mobs(): number[] {
    return this.running.flatMap((r) => r.mobs);
  }

  /** The ids of the NPCs that take shelter now: those of the raids that run. */
  get sheltered(): Set<string> {
    return new Set(this.running.flatMap((r) => r.def.raid?.shelter ?? []));
  }

  /**
   * One step: an ambush ends when all its mobs fell (the effects to apply, for the characters), or it
   * stops when they went away; a character at the step in an area starts one (the horde gets the mobs).
   */
  step(horde: Horde, players: readonly AmbushPlayer[]): { readonly player: number; readonly effect: QuestEffect }[] {
    const out: { player: number; effect: QuestEffect }[] = [];
    // An ambush that ends now does not start again in this step: its effects are not applied yet.
    const ended = new Set<AmbushDef>();
    for (const run of [...this.running]) {
      // A band that came to the end of its route: it goes, and the party gets `arrive`.
      const arrive = run.def.march?.arrive;
      if (arrive && run.mobs.some((id) => horde.arrived(id) && horde.mobs.some((m) => m.id === id && m.state !== 'dying'))) {
        this.running.splice(this.running.indexOf(run), 1);
        ended.add(run.def);
        horde.dismiss(run.mobs);
        for (const p of players) if (run.players.has(p.id) && holds(run.def.when, p.quests, p.pack) && canApply(arrive, p.quests, p.pack)) out.push({ player: p.id, effect: arrive });
        continue;
      }
      let alive = 0;
      let fled = false;
      for (const id of run.mobs) {
        const mob = horde.mobs.find((m) => m.id === id);
        if (mob) {
          run.last.set(id, mob.state);
          alive++;
        } else if (run.last.get(id) !== 'dying') fled = true;
      }
      if (alive > 0) continue;
      this.running.splice(this.running.indexOf(run), 1);
      ended.add(run.def);
      if (fled) continue;
      for (const p of players) {
        const near = run.players.has(p.id) || this.nearArea(run.def, p.state);
        if (near && holds(run.def.when, p.quests, p.pack) && canApply(run.def.effect, p.quests, p.pack)) out.push({ player: p.id, effect: run.def.effect });
      }
    }
    for (const def of this.defs) {
      if (ended.has(def) || this.running.some((r) => r.def === def)) continue;
      const starter = players.find((p) => p.state.down === 0 && def.inArea(tileOf(p.state.x), tileOf(p.state.y)) && holds(def.when, p.quests, p.pack) && canApply(def.effect, p.quests, p.pack));
      if (!starter) continue;
      const there = players.filter((p) => Math.hypot(p.state.x - starter.state.x, p.state.y - starter.state.y) <= AMBUSH_RADIUS * TILE_SIZE);
      const party = new Set(there.filter((p) => holds(def.when, p.quests, p.pack)).map((p) => p.id));
      this.running.push({ def, mobs: this.spawn(def, horde, starter.state, there.length), players: party, last: new Map() });
    }
    return out;
  }

  /** Puts the mobs of an ambush for `count` characters at its point furthest from (x, y); a band that marches, in its column at the start of its route. */
  private spawn(def: AmbushDef, horde: Horde, at: { readonly x: number; readonly y: number }, count: number): number[] {
    const units = sizeEncounter(
      def.units.map((u) => u.map((m) => m.kind)),
      count,
    ).length;
    const members = def.units.slice(0, units).flat();
    const route = def.march?.route.map(([x, y]) => ({ x: x * TILE_SIZE, y: y * TILE_SIZE }));
    const [fx, fy] = route ? [0, 0] : [...def.from].sort((a, b) => Math.hypot(b[0] * TILE_SIZE - at.x, b[1] * TILE_SIZE - at.y) - Math.hypot(a[0] * TILE_SIZE - at.x, a[1] * TILE_SIZE - at.y))[0]!;
    const walkers = members.filter((m) => m.rides === undefined).length;
    let walker = 0;
    const mobs = spawnMembers(horde, members, (_member, i) => {
      if (!route) return this.world.findSpawn(fx + (i % 3) * 2 - 2, fy + Math.floor(i / 3) * 2, 0);
      // The column: the first mob at the head, the others behind it on the route.
      const p = route[Math.min(route.length - 1, (walkers - 1 - walker++) * MARCH_GAP)]!;
      return this.world.findSpawn(Math.floor(p.x / TILE_SIZE), Math.floor(p.y / TILE_SIZE), 0);
    });
    if (route) for (const mob of mobs) if (mob.mount === undefined) horde.march(mob, route, def.march!.speed);
    if (def.raid) for (const mob of mobs) horde.unleash(mob);
    return mobs.map((m) => m.id);
  }

  private nearArea(def: AmbushDef, state: PlayerState): boolean {
    const tx = tileOf(state.x);
    const ty = tileOf(state.y);
    for (let dy = -AMBUSH_RADIUS; dy <= AMBUSH_RADIUS; dy += 3) for (let dx = -AMBUSH_RADIUS; dx <= AMBUSH_RADIUS; dx += 3) if (def.inArea(tx + dx, ty + dy)) return true;
    return false;
  }
}

const tileOf = (v: number) => Math.floor(v / TILE_SIZE);

/**
 * Puts the members of an encounter into the horde: a rider on the mob at index `rides` of the list
 * (its mount), the others where `place` says (world pixels; it gets the member and its index).
 */
export function spawnMembers(horde: Horde, members: readonly AmbushMember[], place: (member: AmbushMember, index: number) => { readonly x: number; readonly y: number }): Mob[] {
  const mobs: Mob[] = [];
  members.forEach((member, i) => {
    const mount = member.rides === undefined ? undefined : mobs[member.rides];
    if (mount) {
      mobs[i] = horde.spawnRider(member.kind, mount, member.seat ?? 0);
      return;
    }
    const spot = place(member, i);
    mobs[i] = horde.spawn(member.kind, spot.x, spot.y);
  });
  // The mobs of the story: they also hunt the guards of a caravan (HordePlayer.quarry).
  for (const mob of mobs) mob.story = true;
  return mobs;
}

