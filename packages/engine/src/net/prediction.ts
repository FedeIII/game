import { Structure } from '../buildings.ts';
import { useDoor, type DoorResult, type Feet } from '../interact.ts';
import { stepPlayer, type MoveInput, type PlayerState } from '../player.ts';
import type { World } from '../world.ts';
import {
  INPUT_BATCH_TICKS,
  aimFromCode,
  facingFromCode,
  fromWireInput,
  toWireInput,
  type InputMessage,
  type SnapshotMessage,
  type WelcomeMessage,
  type WireAttack,
  type WireDoor,
  type WireInput,
} from './protocol.ts';

interface PendingInput {
  readonly seq: number;
  readonly input: WireInput;
  /** Door wishes that happened just before this input: [tx, ty, open]. */
  readonly doors: (readonly [number, number, boolean])[];
}

/** Applies a door wish to the world, as the room does: only a change, never onto someone. */
function wishDoor(world: World, player: PlayerState, tx: number, ty: number, open: boolean, others: readonly Feet[]): void {
  if (world.structure(tx, ty) !== Structure.Door || world.isDoorOpen(tx, ty) === open) return;
  useDoor(world, player, tx, ty, others);
}

/**
 * Client-side prediction for the local player in a multiplayer world. The client moves its
 * player at once with each input, as the server will, and keeps the inputs that the server has
 * not applied yet. When a snapshot comes, it takes the true state, and applies those inputs
 * again on top of it (reconciliation). When the two agree, which is the normal case, nothing
 * visible happens.
 */
export class Prediction {
  /** The sequence number of the last input. */
  private seq = 0;
  private pending: PendingInput[] = [];
  /** Door wishes since the last tick: they go with the next input. */
  private nextDoors: (readonly [number, number, boolean])[] = [];
  private batch: WireInput[] = [];
  private batchFirst = 1;
  private batchDoors: WireDoor[] = [];
  private batchAttacks: WireAttack[] = [];
  /** The open doors in the server's last word. */
  private serverDoors: readonly (readonly [number, number])[] = [];

  /** Inputs that the server has not confirmed. Many of them mean that the server is not there. */
  get unconfirmed(): number {
    return this.pending.length;
  }

  /** Starts over with the welcome of a new connection: its start point and its doors. */
  reset(player: PlayerState, world: World, welcome: WelcomeMessage): void {
    this.seq = 0;
    this.pending = [];
    this.nextDoors = [];
    this.batch = [];
    this.batchDoors = [];
    this.batchAttacks = [];
    this.batchFirst = 1;
    this.serverDoors = welcome.doors;
    world.setOpenDoors(welcome.doors);
    player.x = welcome.x;
    player.y = welcome.y;
    player.vx = 0;
    player.vy = 0;
    // A new player on the server: no fight in progress.
    player.attack = 0;
    player.cooldown = 0;
    player.stun = 0;
    player.guard = 0;
  }

  /**
   * Runs one tick of the local player with the input (as it goes on the wire), and keeps it.
   * `viewMs` is the server time at which the client shows the mobs now: an attack that starts
   * in this tick sends it along. Returns whether an attack starts.
   */
  step(player: PlayerState, world: World, input: MoveInput, viewMs = 0): boolean {
    const wire = toWireInput(input);
    this.seq++;
    this.pending.push({ seq: this.seq, input: wire, doors: this.nextDoors });
    for (const [tx, ty, open] of this.nextDoors) this.batchDoors.push([this.seq, tx, ty, open ? 1 : 0]);
    this.nextDoors = [];
    if (this.batch.length === 0) this.batchFirst = this.seq;
    this.batch.push(wire);
    const struck = stepPlayer(player, fromWireInput(wire), world);
    if (struck) this.batchAttacks.push([this.seq, Math.round(viewMs)]);
    return struck;
  }

  /** Uses a door at once, and keeps the wish to send it with the next input. */
  door(player: PlayerState, world: World, tx: number, ty: number, others: readonly Feet[]): DoorResult {
    const result = useDoor(world, player, tx, ty, others);
    if (result !== 'blocked') this.nextDoors.push([tx, ty, result === 'opened']);
    return result;
  }

  /** The inputs to send, once every INPUT_BATCH_TICKS ticks; null when it is not time yet. */
  takeBatch(): InputMessage | null {
    if (this.batch.length < INPUT_BATCH_TICKS) return null;
    const message: InputMessage = {
      t: 'in',
      s: this.batchFirst,
      i: this.batch,
      ...(this.batchDoors.length > 0 ? { d: this.batchDoors } : {}),
      ...(this.batchAttacks.length > 0 ? { k: this.batchAttacks } : {}),
    };
    this.batch = [];
    this.batchDoors = [];
    this.batchAttacks = [];
    return message;
  }

  /**
   * Takes the true state from a snapshot and applies the unconfirmed inputs again. Returns how
   * far the predicted position moved, so the view can hide a small correction.
   */
  reconcile(player: PlayerState, world: World, snapshot: SnapshotMessage, others: readonly Feet[]): { dx: number; dy: number } {
    const before = { x: player.x, y: player.y };
    if (snapshot.doors) this.serverDoors = snapshot.doors;
    this.pending = this.pending.filter((p) => p.seq > snapshot.a);
    world.setOpenDoors(this.serverDoors);
    const [x, y, vx, vy, facing, attack, cooldown, stun, guard, aim] = snapshot.you;
    player.x = x;
    player.y = y;
    player.vx = vx;
    player.vy = vy;
    player.facing = facingFromCode(facing);
    player.aim = aimFromCode(aim);
    player.attack = attack;
    player.cooldown = cooldown;
    player.stun = stun;
    player.guard = guard;
    for (const p of this.pending) {
      for (const [tx, ty, open] of p.doors) wishDoor(world, player, tx, ty, open, others);
      stepPlayer(player, fromWireInput(p.input), world);
    }
    for (const [tx, ty, open] of this.nextDoors) wishDoor(world, player, tx, ty, open, others);
    return { dx: player.x - before.x, dy: player.y - before.y };
  }
}
