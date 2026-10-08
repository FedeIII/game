import { TICK_SECONDS } from '../constants.ts';
import { MOB_KINDS, MOB_STATES, type MobKind, type MobState } from '../mobs.ts';
import type { Facing } from '../player.ts';
import type { NpcPose } from '../npc.ts';
import { facingFromCode, type SnapshotMessage } from './protocol.ts';

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
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly facing: Facing;
  /** Ticks left of its attack, its stun and its guard (as in PlayerState), at the time shown. */
  readonly attack: number;
  readonly stun: number;
  readonly guard: number;
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
  private readonly players = new Map<number, { skin: number; samples: Sample[] }>();
  /** The names from the last roster, by player id. */
  private names = new Map<number, string>();
  /** The NPCs of the world, by their index: a short history of each. */
  private npcs: Sample[][] = [];
  /** The mobs near the player, by id: their kind and a short history. Null until a snapshot has mobs. */
  private mobs: Map<number, { kind: MobKind; samples: Sample[] }> | null = null;
  /** Recent (local arrival time - server time) values. Their minimum is the least delayed one. */
  private offsets: { localMs: number; offset: number }[] = [];

  get count(): number {
    return this.players.size;
  }

  /** Forgets everything, for a new connection. */
  clear(): void {
    this.players.clear();
    this.names = new Map();
    this.npcs = [];
    this.mobs = null;
    this.offsets = [];
  }

  /** Takes the other players of a snapshot that arrived at local time `localMs`. */
  apply(snapshot: SnapshotMessage, localMs: number): void {
    if (snapshot.names) this.names = new Map(snapshot.names);
    this.offsets.push({ localMs, offset: localMs - snapshot.ms });
    this.offsets = this.offsets.filter((o) => o.localMs > localMs - CLOCK_WINDOW_MS);
    const seen = new Set<number>();
    for (const [id, x, y, vx, vy, facing, skin, attack, stun, guard] of snapshot.p) {
      seen.add(id);
      let player = this.players.get(id);
      if (!player) {
        player = { skin, samples: [] };
        this.players.set(id, player);
      }
      player.skin = skin;
      const samples = player.samples;
      if (samples.length > 0 && samples[samples.length - 1]!.ms >= snapshot.ms) continue;
      samples.push({ ms: snapshot.ms, x, y, vx, vy, facing, a: attack, b: stun, c: guard });
      while (samples.length > 2 && samples[1]!.ms < snapshot.ms - HISTORY_MS) samples.shift();
    }
    // A player that is not in the snapshot has left.
    for (const id of this.players.keys()) if (!seen.has(id)) this.players.delete(id);
    if (snapshot.m) {
      this.mobs ??= new Map();
      const here = new Set<number>();
      for (const [id, kind, x, y, vx, vy, facing, state, stateMs, health] of snapshot.m) {
        here.add(id);
        let mob = this.mobs.get(id);
        if (!mob) {
          mob = { kind: MOB_KINDS[kind] ?? 'imp', samples: [] };
          this.mobs.set(id, mob);
        }
        const samples = mob.samples;
        if (samples.length > 0 && samples[samples.length - 1]!.ms >= snapshot.ms) continue;
        samples.push({ ms: snapshot.ms, x, y, vx, vy, facing, a: state, b: stateMs, c: health });
        while (samples.length > 2 && samples[1]!.ms < snapshot.ms - HISTORY_MS) samples.shift();
      }
      // A mob that is not in the snapshot is gone (dead and done, or far away).
      for (const id of this.mobs.keys()) if (!here.has(id)) this.mobs.delete(id);
    }
    snapshot.n?.forEach(([x, y, vx, vy, facing], i) => {
      const samples = (this.npcs[i] ??= []);
      if (samples.length > 0 && samples[samples.length - 1]!.ms >= snapshot.ms) return;
      samples.push({ ms: snapshot.ms, x, y, vx, vy, facing });
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
      });
    }
    return out;
  }

  /** The NPCs at local time `localMs`, in their order, drawn in the past like the players. */
  npcsAt(localMs: number): NpcPose[] {
    if (this.offsets.length === 0) return [];
    const t = localMs - Math.min(...this.offsets.map((o) => o.offset)) - INTERPOLATION_DELAY_MS;
    return this.npcs.map((samples) => {
      const s = sampleAt(samples, t);
      return { x: s.x, y: s.y, vx: s.vx, vy: s.vy, facing: facingFromCode(s.facing) };
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
        x: s.x,
        y: s.y,
        vx: s.vx,
        vy: s.vy,
        facing: facingFromCode(s.facing),
        attack: ticksAt(since.a, since, t),
        stun: ticksAt(since.b, since, t),
        guard: ticksAt(since.c, since, t),
      });
    }
    return out;
  }
}
