import { TICK_SECONDS } from '../constants.ts';
import { MOB_KINDS, MOB_STATES, type MobKind, type MobState } from '../mobs.ts';
import type { Facing } from '../player.ts';
import type { NpcPose } from '../npc.ts';
import type { ShownGear } from '../gear.ts';
import { aimFromCode, facingFromCode, fromWireLook, type SnapshotMessage } from './protocol.ts';

/**
 * The other players are drawn this far in the past, between two snapshots that have both
 * arrived. Two snapshot intervals: one late or lost snapshot does not make them jump.
 */
export const INTERPOLATION_DELAY_MS = 100;
/** The clock estimate uses the snapshots of this many last milliseconds. */
const CLOCK_WINDOW_MS = 2000;
/** Keep this much history for each player. */
const HISTORY_MS = 1000;

/** Another player, where the client draws it now. */
export interface RemotePlayer {
  readonly id: number;
  /** The skin seed. */
  readonly skin: number;
  /** The name over its head; '' for none. */
  readonly name: string;
  /** What shows of its gear (gear.ts, SHOWN_SLOTS), or null before the server said it. */
  readonly look: ShownGear | null;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly facing: Facing;
  /** The direction of its attack (radians, as PlayerState.aim). */
  readonly aim: number;
  /** Ticks left of its attack, its stun, its guard, its dodge, its defeat, its brace and its evade (as in PlayerState), at the time shown. */
  readonly attack: number;
  readonly stun: number;
  readonly guard: number;
  readonly dodge: number;
  readonly down: number;
  readonly brace: number;
  readonly evade: number;
  /** The storey of a building that it is on (PlayerState.storey). */
  readonly storey: number;
}

/** A companion from the server (companions.ts), where the client draws it now. */
export interface RemoteCompanion {
  readonly id: number;
  readonly look: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly facing: Facing;
  readonly hp: number;
  readonly maxHp: number;
  /** Ticks left of its stun, its guard and its defeat, at the time shown. */
  readonly stun: number;
  readonly guard: number;
  readonly down: number;
  /** Ticks left of its attack (a guard that fights), at the time shown. */
  readonly attack: number;
  /** The id of the player that it follows (0: a guard). */
  readonly leader: number;
}

/** An arrow in flight from the server, where the client draws it now. */
export interface RemoteArrow {
  readonly id: number;
  /** The player who shot it. */
  readonly owner: number;
  readonly x: number;
  readonly y: number;
  readonly aim: number;
}

/** A mob from the server, where the client draws it now. */
export interface RemoteMob {
  readonly id: number;
  readonly kind: MobKind;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly facing: Facing;
  readonly state: MobState;
  /** Milliseconds in its state, at the time shown. */
  readonly stateMs: number;
  /** The blows that it can still take. */
  readonly health: number;
  /** In a rite: the runes that it has left (Mob.runes). */
  readonly runes?: number;
  /** While its weapon burns (Mob.burning): its time left is not sent. */
  readonly burning?: number;
}

interface Sample {
  readonly ms: number;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly facing: number;
  /** Counters that run down with time: a player's attack, stun and guard (ticks), or a mob's state, ms in it and health. */
  readonly a?: number;
  readonly b?: number;
  readonly c?: number;
  /** A player's aim code (aimCode), or an arrow's. */
  readonly d?: number;
  /** A player's dodge and defeat (ticks); a mob's runes left in a rite, and whether its weapon burns. */
  readonly e?: number;
  readonly f?: number;
  /** A player's storey; an NPC that is away (1: in its house for the night). */
  readonly g?: number;
  /** A player's brace and evade (ticks). */
  readonly h?: number;
  readonly i?: number;
}

const TICK_MS = TICK_SECONDS * 1000;

/**
 * The state at time `t` from a history of samples (in time order, at least one): between the
 * two samples round `t`, the position interpolated and the rest from the nearer one. Before the
 * first sample it is the first; after the last it is the last (no guess).
 */
function sampleAt(samples: readonly Sample[], t: number): Sample & { readonly since: Sample } {
  let a = samples[0]!;
  let b = a;
  for (const s of samples) {
    if (s.ms <= t) a = s;
    if (s.ms >= t) {
      b = s;
      break;
    }
    b = s;
  }
  const span = b.ms - a.ms;
  const k = span > 0 ? Math.max(0, Math.min(1, (t - a.ms) / span)) : 1;
  const near = k < 0.5 ? a : b;
  // `since`: the last sample at or before `t`; counters run on from it.
  return { ms: t, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, vx: near.vx, vy: near.vy, facing: near.facing, since: a.ms <= t ? a : samples[0]! };
}

/** A tick counter of a sample, run down to time `t`. */
const ticksAt = (value: number | undefined, sample: Sample, t: number) => Math.max(0, (value ?? 0) - Math.max(0, Math.floor((t - sample.ms) / TICK_MS)));

/**
 * The other players of a multiplayer world, from the snapshots: a short history of each one,
 * and the estimate of the server's clock. `at()` interpolates them at a time a little in the
 * past, so they move smoothly although snapshots come only 20 times a second.
 */
export class Remotes {
  /** The other players near the player (the server sends those within PLAYER_SEND_RADIUS), by id. */
  private readonly players = new Map<number, { skin: number; samples: Sample[] }>();
  /** The number of other players in the world, near or far, from the last snapshot. */
  private everyone = 0;
  /** The companions near the player, by id: what does not change, and a short history. */
  private companions = new Map<number, { look: string; name: string; maxHp: number; leader: number; samples: Sample[] }>();
  /** The names from the last roster, by player id. */
  private names = new Map<number, string>();
  /** What shows of the gear of each player, from the last list of looks, by player id. */
  private looks = new Map<number, ShownGear>();
  /** The NPCs of the world, by their index: a short history of each. */
  private npcs: Sample[][] = [];
  /** The mobs near the player, by id: their kind and a short history. Null until a snapshot has mobs. */
  private mobs: Map<number, { kind: MobKind; samples: Sample[] }> | null = null;
  /** The arrows in flight near the player, by id: their shooter and a short history. */
  private arrows = new Map<number, { owner: number; samples: Sample[] }>();
  /** Recent (local arrival time - server time) values. Their minimum is the least delayed one. */
  private offsets: { localMs: number; offset: number }[] = [];

  /** The number of other players near the player: those that it can see. */
  get count(): number {
    return this.players.size;
  }

  /** The number of other players in the world, near or far. */
  get inWorld(): number {
    return this.everyone;
  }

  /** Forgets everything, for a new connection. */
  clear(): void {
    this.players.clear();
    this.everyone = 0;
    this.names = new Map();
    this.looks = new Map();
    this.companions.clear();
    this.npcs = [];
    this.mobs = null;
    this.arrows.clear();
    this.offsets = [];
  }

  /** Takes the other players of a snapshot that arrived at local time `localMs`. */
  apply(snapshot: SnapshotMessage, localMs: number): void {
    if (snapshot.names) this.names = new Map(snapshot.names);
    if (snapshot.lk) this.looks = new Map(snapshot.lk.map(([id, look]) => [id, fromWireLook(look)]));
    this.offsets.push({ localMs, offset: localMs - snapshot.ms });
    this.offsets = this.offsets.filter((o) => o.localMs > localMs - CLOCK_WINDOW_MS);
    this.everyone = snapshot.o;
    const seen = new Set<number>();
    for (const [id, x, y, vx, vy, facing, skin, attack, stun, guard, aim, dodge, down, storey, brace, evade] of snapshot.p) {
      seen.add(id);
      let player = this.players.get(id);
      if (!player) {
        player = { skin, samples: [] };
        this.players.set(id, player);
      }
      player.skin = skin;
      const samples = player.samples;
      if (samples.length > 0 && samples[samples.length - 1]!.ms >= snapshot.ms) continue;
      samples.push({ ms: snapshot.ms, x, y, vx, vy, facing, a: attack, b: stun, c: guard, d: aim, e: dodge, f: down, g: storey, h: brace, i: evade });
      while (samples.length > 2 && samples[1]!.ms < snapshot.ms - HISTORY_MS) samples.shift();
    }
    // The companions near the player; one that is not in the snapshot went (or is far).
    const near = new Set<number>();
    for (const [id, look, name, x, y, vx, vy, facing, hp, maxHp, stun, guard, down, leader, attack] of snapshot.cp ?? []) {
      near.add(id);
      let companion = this.companions.get(id);
      if (!companion) {
        companion = { look, name, maxHp, leader, samples: [] };
        this.companions.set(id, companion);
      }
      companion.leader = leader;
      const samples = companion.samples;
      if (samples.length > 0 && samples[samples.length - 1]!.ms >= snapshot.ms) continue;
      samples.push({ ms: snapshot.ms, x, y, vx, vy, facing, a: stun, b: guard, c: hp, e: down, f: attack });
      while (samples.length > 2 && samples[1]!.ms < snapshot.ms - HISTORY_MS) samples.shift();
    }
    for (const id of this.companions.keys()) if (!near.has(id)) this.companions.delete(id);
    // A player that is not in the snapshot has left, or is far away now.
    for (const id of this.players.keys()) if (!seen.has(id)) this.players.delete(id);
    if (snapshot.m) {
      this.mobs ??= new Map();
      const here = new Set<number>();
      for (const [id, kind, x, y, vx, vy, facing, state, stateMs, health, runes, burning] of snapshot.m) {
        here.add(id);
        let mob = this.mobs.get(id);
        if (!mob) {
          mob = { kind: MOB_KINDS[kind] ?? 'imp', samples: [] };
          this.mobs.set(id, mob);
        }
        const samples = mob.samples;
        if (samples.length > 0 && samples[samples.length - 1]!.ms >= snapshot.ms) continue;
        samples.push({ ms: snapshot.ms, x, y, vx, vy, facing, a: state, b: stateMs, c: health, e: runes, f: burning });
        while (samples.length > 2 && samples[1]!.ms < snapshot.ms - HISTORY_MS) samples.shift();
      }
      // A mob that is not in the snapshot is gone (dead and done, or far away).
      for (const id of this.mobs.keys()) if (!here.has(id)) this.mobs.delete(id);
    }
    if (snapshot.m) {
      // Arrows come with the mobs: a snapshot of a world with mobs has every arrow near the player.
      const flying = new Set<number>();
      for (const [id, owner, x, y, aim] of snapshot.ar ?? []) {
        flying.add(id);
        let arrow = this.arrows.get(id);
        if (!arrow) {
          arrow = { owner, samples: [] };
          this.arrows.set(id, arrow);
        }
        if (arrow.samples.length > 0 && arrow.samples[arrow.samples.length - 1]!.ms >= snapshot.ms) continue;
        arrow.samples.push({ ms: snapshot.ms, x, y, vx: 0, vy: 0, facing: 0, d: aim });
        while (arrow.samples.length > 2 && arrow.samples[1]!.ms < snapshot.ms - HISTORY_MS) arrow.samples.shift();
      }
      // An arrow that is not in the snapshot has hit or stopped; it shows until the time shown passes its last sample.
      for (const [id, arrow] of this.arrows) if (!flying.has(id) && arrow.samples[arrow.samples.length - 1]!.ms < snapshot.ms - HISTORY_MS) this.arrows.delete(id);
    }
    snapshot.n?.forEach(([x, y, vx, vy, facing, away], i) => {
      const samples = (this.npcs[i] ??= []);
      if (samples.length > 0 && samples[samples.length - 1]!.ms >= snapshot.ms) return;
      samples.push({ ms: snapshot.ms, x, y, vx, vy, facing, ...(away ? { g: 1 } : {}) });
      while (samples.length > 2 && samples[1]!.ms < snapshot.ms - HISTORY_MS) samples.shift();
    });
  }

  /** Whether the server has sent the NPCs (a world with NPCs, after the first snapshot). */
  get hasNpcs(): boolean {
    return this.npcs.length > 0;
  }

  /** Whether the server sends mobs (a world with mobs, after the first snapshot). */
  get hasMobs(): boolean {
    return this.mobs !== null;
  }

  /**
   * The server time that the client shows at local time `localMs`: the players, NPCs and mobs
   * are drawn as they were then. An attack tells the server this time.
   */
  viewTime(localMs: number): number {
    if (this.offsets.length === 0) return 0;
    return localMs - Math.min(...this.offsets.map((o) => o.offset)) - INTERPOLATION_DELAY_MS;
  }

  /** The companions at local time `localMs`, drawn in the past like the players. */
  companionsAt(localMs: number): RemoteCompanion[] {
    if (this.offsets.length === 0) return [];
    const t = this.viewTime(localMs);
    const out: RemoteCompanion[] = [];
    for (const [id, { look, name, maxHp, leader, samples }] of this.companions) {
      if (samples.length === 0) continue;
      const s = sampleAt(samples, t);
      const since = s.since;
      out.push({
        id,
        look,
        name,
        x: s.x,
        y: s.y,
        vx: s.vx,
        vy: s.vy,
        facing: facingFromCode(s.facing),
        hp: since.c ?? maxHp,
        maxHp,
        stun: ticksAt(since.a, since, t),
        guard: ticksAt(since.b, since, t),
        down: ticksAt(since.e, since, t),
        attack: ticksAt(since.f, since, t),
        leader,
      });
    }
    return out;
  }

  /** The mobs at local time `localMs`, drawn in the past like the players. */
  mobsAt(localMs: number): RemoteMob[] {
    if (!this.mobs || this.offsets.length === 0) return [];
    const t = this.viewTime(localMs);
    const out: RemoteMob[] = [];
    for (const [id, { kind, samples }] of this.mobs) {
      if (samples.length === 0 || samples[0]!.ms > t + 200) continue;
      const s = sampleAt(samples, t);
      const since = s.since;
      out.push({
        id,
        kind,
        x: s.x,
        y: s.y,
        vx: s.vx,
        vy: s.vy,
        facing: facingFromCode(s.facing),
        state: MOB_STATES[since.a ?? 0] ?? 'idle',
        stateMs: (since.b ?? 0) + Math.max(0, t - since.ms),
        health: since.c ?? 1,
        ...(since.e ? { runes: since.e } : {}),
        ...(since.f ? { burning: 1 } : {}),
      });
    }
    return out;
  }

  /** The arrows at local time `localMs`, drawn in the past like the mobs; an arrow goes after its last sample. */
  arrowsAt(localMs: number): RemoteArrow[] {
    if (this.offsets.length === 0) return [];
    const t = this.viewTime(localMs);
    const out: RemoteArrow[] = [];
    for (const [id, { owner, samples }] of this.arrows) {
      if (samples.length === 0 || samples[0]!.ms > t || samples[samples.length - 1]!.ms < t) continue;
      const s = sampleAt(samples, t);
      out.push({ id, owner, x: s.x, y: s.y, aim: aimFromCode(s.since.d ?? 0) });
    }
    return out;
  }

  /** The NPCs at local time `localMs`, in their order, drawn in the past like the players. */
  npcsAt(localMs: number): NpcPose[] {
    if (this.offsets.length === 0) return [];
    const t = localMs - Math.min(...this.offsets.map((o) => o.offset)) - INTERPOLATION_DELAY_MS;
    return this.npcs.map((samples) => {
      const s = sampleAt(samples, t);
      // Away (in its house for the night) from the last sample at or before the time shown.
      return { x: s.x, y: s.y, vx: s.vx, vy: s.vy, facing: facingFromCode(s.facing), ...(s.since.g === 1 ? { away: true } : {}) };
    });
  }

  /** The other players at local time `localMs`, INTERPOLATION_DELAY_MS in the server's past. */
  at(localMs: number): RemotePlayer[] {
    if (this.offsets.length === 0) return [];
    const offset = Math.min(...this.offsets.map((o) => o.offset));
    const t = localMs - offset - INTERPOLATION_DELAY_MS;
    const out: RemotePlayer[] = [];
    for (const [id, { skin, samples }] of this.players) {
      if (samples.length === 0) continue;
      const s = sampleAt(samples, t);
      const since = s.since;
      out.push({
        id,
        skin,
        name: this.names.get(id) ?? '',
        look: this.looks.get(id) ?? null,
        x: s.x,
        y: s.y,
        vx: s.vx,
        vy: s.vy,
        facing: facingFromCode(s.facing),
        aim: aimFromCode(since.d ?? 0),
        attack: ticksAt(since.a, since, t),
        stun: ticksAt(since.b, since, t),
        guard: ticksAt(since.c, since, t),
        dodge: ticksAt(since.e, since, t),
        down: ticksAt(since.f, since, t),
        // A held brace stays at 1 (player.ts): its ticks show as they came, not counted down.
        brace: since.h ?? 0,
        evade: ticksAt(since.i, since, t),
        storey: since.g ?? 0,
      });
    }
    return out;
  }
}
