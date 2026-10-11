import { AMBUSH_RADIUS, spawnMembers, type AmbushMember, type AmbushPlayer } from './ambushes.ts';
import { TILE_SIZE } from './constants.ts';
import { sizeEncounter } from './encounters.ts';
import type { Guard, GuardDef, GuardEvent, Guards } from './guards.ts';
import type { Horde } from './mobs.ts';
import { canApply, holds, type Conditions, type QuestEffect } from './quests.ts';
import type { World } from './world.ts';

/**
 * Convoys (story phase 5, the caravan of chapter 1.5.1): guards (guards.ts) that walk a route for a
 * character at a step (the party), and the attackers that wait for them on the way. The first member
 * is the convoy's anchor (the wagon); its fighters keep near it. When the anchor comes to the meeting
 * point, the convoy stands, and the waves of attackers come from ahead, one after the other, sized to
 * the party (encounters.ts). The waves are the ones whose conditions hold for the party then (the
 * scouts and the war band of the raid if they still live; else other hobgoblins of the clan). Ends:
 *
 * - every wave fell and the anchor lives: `saved`, and the convoy walks on to the end of its route;
 * - the anchor fell to the attackers: `lost`;
 * - a character of the party became an outlaw of the convoy (`outlaw`: it robs it), and all the
 *   fighters fell, or the anchor fell to an outlaw: `robbed` for the outlaws near.
 *
 * At the end of its route, the convoy goes. The Room runs them in a shared world; the page in a world
 * that it runs.
 */

/** A wave of attackers of a convoy. */
export interface ConvoyWave {
  /** It comes when these conditions hold for a character of the party, at the meeting point. */
  readonly when: Conditions;
  /** Its units, in order (encounters.ts: more characters there, more units). */
  readonly units: readonly (readonly AmbushMember[])[];
  /** What its fall does for each character of the party (the scouts move the raid on). */
  readonly effect?: QuestEffect;
}

export interface ConvoyDef {
  /** Its id: also the group of its guards. */
  readonly id: string;
  /** A character for whom these hold, in the area, starts it. */
  readonly when: Conditions;
  readonly inArea: (tx: number, ty: number) => boolean;
  /** The route (tiles, as fractions), from its start to its end. */
  readonly route: readonly (readonly [number, number])[];
  /** Its guards; the first one is its anchor. */
  readonly members: readonly GuardDef[];
  /** The share of the route where the attackers wait. */
  readonly meet: number;
  readonly waves: readonly ConvoyWave[];
  /** A character for whom these hold is an outlaw of its guards: they fight it, and its blows hit them. */
  readonly outlaw: Conditions;
  readonly saved: QuestEffect;
  readonly lost: QuestEffect;
  readonly robbed: QuestEffect;
}

/** The attackers come this far ahead of the anchor on the route (tiles). */
export const CONVOY_AMBUSH_AHEAD = 7;
/** A robber within this many tiles of the anchor gets the cargo. */
export const CONVOY_ROB_RADIUS = 12;

interface Run {
  readonly def: ConvoyDef;
  readonly guards: readonly Guard[];
  readonly anchor: Guard;
  readonly party: Set<number>;
  readonly route: readonly { readonly x: number; readonly y: number }[];
  readonly meetIndex: number;
  /** 'walk' to the meeting point, 'fight' the waves, 'on' to the end of the route. */
  phase: 'walk' | 'fight' | 'on';
  waves: ConvoyWave[];
  /** The mobs of the wave that fights now, and of what was there of it last time. */
  mobs: number[];
  /** The last state of each of its mobs: a mob that is gone after 'dying' fell. */
  readonly last: Map<number, string>;
}

/** The convoys of a world, and the ones that run. */
export class Convoys {
  readonly defs: readonly ConvoyDef[];
  private readonly world: World;
  private running: Run[] = [];

  constructor(world: World, defs: readonly ConvoyDef[]) {
    this.world = world;
    this.defs = defs;
  }

  /** The anchor of each running convoy, by its group: its fighters keep near it. */
  anchors(): Map<string, { readonly x: number; readonly y: number }> {
    return new Map(this.running.map((r) => [r.def.id, r.anchor.state] as const));
  }

  /** The groups whose guards a character robs (ConvoyDef.outlaw). */
  outlawOf(player: Pick<AmbushPlayer, 'quests' | 'pack'>): string[] {
    return this.defs.filter((d) => holds(d.outlaw, player.quests, player.pack)).map((d) => d.id);
  }

  /** The ids of the mobs of the waves that fight now (the debug panel). */
  get mobs(): number[] {
    return this.running.flatMap((r) => r.mobs);
  }

  /**
   * One step, after the guards and the horde moved (`events`: what happened to the guards in it):
   * the convoys stand at their meeting point, their waves come and fall, and they end; a character
   * at the step in an area starts one. Returns the effects to apply, for the characters.
   */
  step(horde: Horde, guards: Guards, players: readonly AmbushPlayer[], events: readonly GuardEvent[]): { readonly player: number; readonly effect: QuestEffect }[] {
    const out: { player: number; effect: QuestEffect }[] = [];
    const ended = new Set<ConvoyDef>();
    for (const run of [...this.running]) {
      const { def } = run;
      const give = (effect: QuestEffect, who: (p: AmbushPlayer) => boolean) => {
        for (const p of players) if (who(p) && canApply(effect, p.quests, p.pack)) out.push({ player: p.id, effect });
      };
      const inParty = (p: AmbushPlayer) => run.party.has(p.id) || Math.hypot(p.state.x - run.anchor.state.x, p.state.y - run.anchor.state.y) <= AMBUSH_RADIUS * TILE_SIZE;
      const outlawNear = (p: AmbushPlayer) => holds(def.outlaw, p.quests, p.pack) && Math.hypot(p.state.x - run.anchor.state.x, p.state.y - run.anchor.state.y) <= CONVOY_ROB_RADIUS * TILE_SIZE;
      const finish = () => {
        this.running.splice(this.running.indexOf(run), 1);
        ended.add(def);
        for (const g of run.guards) guards.remove(g.id);
      };
      // The anchor fell: to a robber (the cargo is its), or to the attackers (the cargo is lost).
      const anchorFell = events.find((e) => e.id === run.anchor.id && e.kind === 'fell');
      if (anchorFell) {
        const robber = anchorFell.by !== undefined && anchorFell.by > 0 ? players.find((p) => p.id === anchorFell.by && holds(def.outlaw, p.quests, p.pack)) : undefined;
        if (robber) give(def.robbed, outlawNear);
        else give(def.lost, inParty);
        finish();
        continue;
      }
      // Every fighter fell, and a robber is near: the cargo is its.
      const fighters = run.guards.filter((g) => g.def.blow);
      const standing = fighters.filter((g) => guards.list.includes(g) && g.state.down === 0);
      if (fighters.length > 0 && standing.length === 0 && players.some(outlawNear)) {
        give(def.robbed, outlawNear);
        finish();
        continue;
      }
      if (run.phase === 'walk' && run.anchor.routeIndex >= run.meetIndex) {
        // At the meeting point: the waves of the party now, the first one at once.
        const book = players.filter(inParty);
        run.waves = def.waves.filter((w) => book.some((p) => holds(w.when, p.quests, p.pack)));
        run.phase = 'fight';
        for (const g of run.guards) g.halted = true;
        this.nextWave(run, horde, players.filter(inParty).length);
      } else if (run.phase === 'fight') {
        let alive = 0;
        for (const id of run.mobs) {
          const mob = horde.mobs.find((m) => m.id === id);
          if (mob) {
            run.last.set(id, mob.state);
            if (mob.state !== 'dying') alive++;
          }
        }
        if (alive === 0) {
          const wave = run.waves.shift();
          if (wave?.effect) give(wave.effect, inParty);
          if (run.waves.length > 0) this.nextWave(run, horde, players.filter(inParty).length);
          else {
            run.phase = 'on';
            run.mobs = [];
            for (const g of run.guards) g.halted = false;
            give(def.saved, inParty);
          }
        }
      } else if (run.phase === 'on' && guards.arrived(run.anchor)) {
        finish();
      }
    }
    for (const def of this.defs) {
      if (ended.has(def) || this.running.some((r) => r.def === def)) continue;
      const starter = players.find((p) => p.state.down === 0 && def.inArea(tileOf(p.state.x), tileOf(p.state.y)) && holds(def.when, p.quests, p.pack));
      if (!starter) continue;
      const party = new Set(players.filter((p) => holds(def.when, p.quests, p.pack) && Math.hypot(p.state.x - starter.state.x, p.state.y - starter.state.y) <= AMBUSH_RADIUS * TILE_SIZE).map((p) => p.id));
      this.running.push(this.start(def, guards, party));
    }
    return out;
  }

  /** Puts the guards of a convoy at the start of its route, the anchor in front. */
  private start(def: ConvoyDef, guards: Guards, party: Set<number>): Run {
    const route = def.route.map(([x, y]) => ({ x: x * TILE_SIZE, y: y * TILE_SIZE }));
    const list = def.members.map((member, i) => {
      // The column: the anchor at the head, the others behind it.
      const p = route[Math.max(0, (def.members.length - 1 - i) * 6)] ?? route[0]!;
      return guards.add(member, def.id, p.x, p.y, route);
    });
    return { def, guards: list, anchor: list[0]!, party, route, meetIndex: Math.floor(route.length * def.meet), phase: 'walk', waves: [], mobs: [], last: new Map() };
  }

  /** The next wave: its units for `count` characters, from a little ahead of the anchor on the route. */
  private nextWave(run: Run, horde: Horde, count: number): void {
    const wave = run.waves[0];
    if (!wave) return;
    const units = sizeEncounter(
      wave.units.map((u) => u.map((m) => m.kind)),
      Math.max(1, count),
    ).length;
    const members = wave.units.slice(0, units).flat();
    const ahead = run.route[Math.min(run.route.length - 1, run.anchor.routeIndex + CONVOY_AMBUSH_AHEAD * 4)]!;
    const fx = tileOf(ahead.x);
    const fy = tileOf(ahead.y);
    run.mobs = spawnMembers(horde, members, (_member, i) => this.world.findSpawn(fx + (i % 3) * 2 - 2, fy + Math.floor(i / 3) * 2, 0)).map((m) => m.id);
    run.last.clear();
  }
}

const tileOf = (v: number) => Math.floor(v / TILE_SIZE);
