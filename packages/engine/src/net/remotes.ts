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
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly facing: Facing;
}

interface Sample {
  readonly ms: number;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly facing: number;
}

/**
 * The state at time `t` from a history of samples (in time order, at least one): between the
 * two samples round `t`, the position interpolated and the rest from the nearer one. Before the
 * first sample it is the first; after the last it is the last (no guess).
 */
function sampleAt(samples: readonly Sample[], t: number): Sample {
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
  return { ms: t, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, vx: near.vx, vy: near.vy, facing: near.facing };
}

/**
 * The other players of a multiplayer world, from the snapshots: a short history of each one,
 * and the estimate of the server's clock. `at()` interpolates them at a time a little in the
 * past, so they move smoothly although snapshots come only 20 times a second.
 */
export class Remotes {
  private readonly players = new Map<number, { skin: number; samples: Sample[] }>();
  /** The NPCs of the world, by their index: a short history of each. */
  private npcs: Sample[][] = [];
  /** Recent (local arrival time - server time) values. Their minimum is the least delayed one. */
  private offsets: { localMs: number; offset: number }[] = [];

  get count(): number {
    return this.players.size;
  }

  /** Forgets everything, for a new connection. */
  clear(): void {
    this.players.clear();
    this.npcs = [];
    this.offsets = [];
  }

  /** Takes the other players of a snapshot that arrived at local time `localMs`. */
  apply(snapshot: SnapshotMessage, localMs: number): void {
    this.offsets.push({ localMs, offset: localMs - snapshot.ms });
    this.offsets = this.offsets.filter((o) => o.localMs > localMs - CLOCK_WINDOW_MS);
    const seen = new Set<number>();
    for (const [id, x, y, vx, vy, facing, skin] of snapshot.p) {
      seen.add(id);
      let player = this.players.get(id);
      if (!player) {
        player = { skin, samples: [] };
        this.players.set(id, player);
      }
      player.skin = skin;
      const samples = player.samples;
      if (samples.length > 0 && samples[samples.length - 1]!.ms >= snapshot.ms) continue;
      samples.push({ ms: snapshot.ms, x, y, vx, vy, facing });
      while (samples.length > 2 && samples[1]!.ms < snapshot.ms - HISTORY_MS) samples.shift();
    }
    // A player that is not in the snapshot has left.
    for (const id of this.players.keys()) if (!seen.has(id)) this.players.delete(id);
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
      out.push({ id, skin, x: s.x, y: s.y, vx: s.vx, vy: s.vy, facing: facingFromCode(s.facing) });
    }
    return out;
  }
}
