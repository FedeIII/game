import type { Facing } from '../player.ts';
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
  /** An index in PLAYER_LOOKS. */
  readonly look: number;
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
 * The other players of a multiplayer world, from the snapshots: a short history of each one,
 * and the estimate of the server's clock. `at()` interpolates them at a time a little in the
 * past, so they move smoothly although snapshots come only 20 times a second.
 */
export class Remotes {
  private readonly players = new Map<number, { look: number; samples: Sample[] }>();
  /** Recent (local arrival time - server time) values. Their minimum is the least delayed one. */
  private offsets: { localMs: number; offset: number }[] = [];

  get count(): number {
    return this.players.size;
  }

  /** Forgets everything, for a new connection. */
  clear(): void {
    this.players.clear();
    this.offsets = [];
  }

  /** Takes the other players of a snapshot that arrived at local time `localMs`. */
  apply(snapshot: SnapshotMessage, localMs: number): void {
    this.offsets.push({ localMs, offset: localMs - snapshot.ms });
    this.offsets = this.offsets.filter((o) => o.localMs > localMs - CLOCK_WINDOW_MS);
    const seen = new Set<number>();
    for (const [id, x, y, vx, vy, facing, look] of snapshot.p) {
      seen.add(id);
      let player = this.players.get(id);
      if (!player) {
        player = { look, samples: [] };
        this.players.set(id, player);
      }
      player.look = look;
      const samples = player.samples;
      if (samples.length > 0 && samples[samples.length - 1]!.ms >= snapshot.ms) continue;
      samples.push({ ms: snapshot.ms, x, y, vx, vy, facing });
      while (samples.length > 2 && samples[1]!.ms < snapshot.ms - HISTORY_MS) samples.shift();
    }
    // A player that is not in the snapshot has left.
    for (const id of this.players.keys()) if (!seen.has(id)) this.players.delete(id);
  }

  /** The other players at local time `localMs`, INTERPOLATION_DELAY_MS in the server's past. */
  at(localMs: number): RemotePlayer[] {
    if (this.offsets.length === 0) return [];
    const offset = Math.min(...this.offsets.map((o) => o.offset));
    const t = localMs - offset - INTERPOLATION_DELAY_MS;
    const out: RemotePlayer[] = [];
    for (const [id, { look, samples }] of this.players) {
      const first = samples[0];
      if (!first) continue;
      let a = first;
      let b = first;
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
      out.push({
        id,
        look,
        x: a.x + (b.x - a.x) * k,
        y: a.y + (b.y - a.y) * k,
        vx: near.vx,
        vy: near.vy,
        facing: facingFromCode(near.facing),
      });
    }
    return out;
  }
}
