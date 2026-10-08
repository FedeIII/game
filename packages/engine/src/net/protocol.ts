import { clampInput, type Facing, type MoveInput } from '../player.ts';

/**
 * The multiplayer protocol: JSON messages over one WebSocket. The client sends its inputs, the
 * server runs every player with the same stepPlayer() and sends snapshots of the truth. See
 * docs/multiplayer.md.
 *
 * Change PROTOCOL_VERSION when a message changes. A client with another version is refused, and
 * it tells the visitor to reload the page.
 */
export const PROTOCOL_VERSION = 3;

/** Snapshots per second from the server to each client. */
export const SNAPSHOT_RATE = 20;
/** The client sends its inputs in batches: one message every this many ticks. */
export const INPUT_BATCH_TICKS = 3;
/** The most inputs in one message (half a second at TICK_RATE). */
export const MAX_INPUTS_PER_MESSAGE = 30;
/** The most door actions in one message. */
export const MAX_DOORS_PER_MESSAGE = 4;
/** The largest message, in bytes, in either direction from a client. */
export const MAX_CLIENT_MESSAGE_BYTES = 2048;

/**
 * A player's skin is a seed, a whole number from 0 to SKIN_MAX. Each client makes the skin from
 * the seed (the client's art decides what a seed looks like), so the protocol carries only the
 * number. A browser keeps its own seed, so a visitor keeps the same skin across visits.
 */
export const SKIN_MAX = 0xffffffff;

export function isSkin(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= SKIN_MAX;
}

const FACINGS: readonly Facing[] = ['down', 'up', 'left', 'right'];

export function facingCode(facing: Facing): number {
  return FACINGS.indexOf(facing);
}

export function facingFromCode(code: number): Facing {
  return FACINGS[code] ?? 'down';
}

/**
 * An input on the wire: each axis as a whole number from -100 to 100. The client applies the
 * input that it sends, not the one that it read, so the server can repeat the same step.
 */
export type WireInput = readonly [number, number];

const INPUT_SCALE = 100;

export function toWireInput(input: MoveInput): WireInput {
  const q = (v: number) => Math.max(-INPUT_SCALE, Math.min(INPUT_SCALE, Math.round(v * INPUT_SCALE)));
  return [q(input.x), q(input.y)];
}

export function fromWireInput(wire: WireInput): MoveInput {
  return clampInput({ x: wire[0] / INPUT_SCALE, y: wire[1] / INPUT_SCALE });
}

// ---------------------------------------------------------------- client to server

/** The first message: which world, the player's skin, and (optionally) the tile to start on. */
export interface HelloMessage {
  readonly t: 'hello';
  readonly v: number;
  readonly world: string;
  readonly skin: number;
  readonly at?: readonly [number, number];
}

/**
 * A door action: [seq, tx, ty, open]. It happens just before the input with sequence number
 * `seq`, and it asks for the door to be open (1) or closed (0). It carries the wish, not a
 * toggle: if another player already did the same, nothing happens.
 */
export type WireDoor = readonly [number, number, number, number];

/** A batch of inputs. `s` is the sequence number of the first input; the others follow it, one per tick. */
export interface InputMessage {
  readonly t: 'in';
  readonly s: number;
  readonly i: readonly WireInput[];
  readonly d?: readonly WireDoor[];
}

/** Asks for a pong, to measure the round trip. `c` is the client's clock, sent back as it is. */
export interface PingMessage {
  readonly t: 'ping';
  readonly c: number;
}

export type ClientMessage = HelloMessage | InputMessage | PingMessage;

// ---------------------------------------------------------------- server to client

/** A player as others see it: [id, x, y, vx, vy, facing code, skin]. Positions to 0.1 px. */
export type WirePlayer = readonly [number, number, number, number, number, number, number];

/** The reply to hello: who the player is, where it starts, and which doors are open. */
export interface WelcomeMessage {
  readonly t: 'welcome';
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly doors: readonly (readonly [number, number])[];
}

/**
 * The state of the world for one player. `ms` is the server's clock; `a` is the last input of
 * this player that the server has applied; `you` is its true state [x, y, vx, vy, facing code],
 * at full precision; `p` holds the other players. `doors` comes only when the doors changed.
 */
export interface SnapshotMessage {
  readonly t: 'snap';
  readonly ms: number;
  readonly a: number;
  readonly you: readonly [number, number, number, number, number];
  readonly p: readonly WirePlayer[];
  readonly doors?: readonly (readonly [number, number])[];
  /** The world's NPCs, in the order of WorldSource.npcs(): [x, y, vx, vy, facing code]. */
  readonly n?: readonly WireNpc[];
}

/** An NPC as the clients see it: [x, y, vx, vy, facing code]. Positions to 0.1 px. */
export type WireNpc = readonly [number, number, number, number, number];

/** Why the server does not let a client in. The client then plays alone. */
export type RefusalReason = 'version' | 'world' | 'full' | 'busy';

export interface RefusedMessage {
  readonly t: 'refused';
  readonly reason: RefusalReason;
}

export interface PongMessage {
  readonly t: 'pong';
  readonly c: number;
}

export type ServerMessage = WelcomeMessage | SnapshotMessage | RefusedMessage | PongMessage;

// ---------------------------------------------------------------- validation

const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const isPair = (v: unknown, min: number, max: number): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && isInt(v[0], min, max) && isInt(v[1], min, max);
/** Tile coordinates that a message may name: far more than any world needs, far less than 2^31. */
const TILE_LIMIT = 1_000_000;
const SEQ_LIMIT = 2 ** 31 - 1;

/**
 * Reads a message from a client. Returns null for anything that is not exactly a valid message:
 * the server must never trust the shape or the values of what a client sends.
 */
export function parseClientMessage(raw: string): ClientMessage | null {
  if (raw.length > MAX_CLIENT_MESSAGE_BYTES) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  const m = data as Record<string, unknown>;
  switch (m.t) {
    case 'hello': {
      if (!isInt(m.v, 0, SEQ_LIMIT) || typeof m.world !== 'string' || m.world.length > 32) return null;
      // A client of an older version sends no skin: let it through, so the server can tell it to reload.
      const skin = isSkin(m.skin) ? m.skin : m.v !== PROTOCOL_VERSION && m.skin === undefined ? 0 : null;
      if (skin === null) return null;
      if (m.at !== undefined && !isPair(m.at, -TILE_LIMIT, TILE_LIMIT)) return null;
      return m.at === undefined ? { t: 'hello', v: m.v, world: m.world, skin } : { t: 'hello', v: m.v, world: m.world, skin, at: m.at };
    }
    case 'in': {
      if (!isInt(m.s, 1, SEQ_LIMIT) || !Array.isArray(m.i) || m.i.length < 1 || m.i.length > MAX_INPUTS_PER_MESSAGE) return null;
      if (!m.i.every((input) => isPair(input, -INPUT_SCALE, INPUT_SCALE))) return null;
      const inputs = m.i as WireInput[];
      if (m.d === undefined) return { t: 'in', s: m.s, i: inputs };
      if (!Array.isArray(m.d) || m.d.length > MAX_DOORS_PER_MESSAGE) return null;
      const doorShaped = (d: unknown) =>
        Array.isArray(d) &&
        d.length === 4 &&
        isInt(d[0], 1, SEQ_LIMIT) &&
        isInt(d[1], -TILE_LIMIT, TILE_LIMIT) &&
        isInt(d[2], -TILE_LIMIT, TILE_LIMIT) &&
        isInt(d[3], 0, 1);
      if (!m.d.every(doorShaped)) return null;
      return { t: 'in', s: m.s, i: inputs, d: m.d as WireDoor[] };
    }
    case 'ping':
      return typeof m.c === 'number' && Number.isFinite(m.c) ? { t: 'ping', c: m.c } : null;
    default:
      return null;
  }
}

/**
 * Reads a message from the server. The server is trusted, so this checks only the type, to
 * skip a message from a newer server that this client does not know.
 */
export function parseServerMessage(raw: string): ServerMessage | null {
  try {
    const data = JSON.parse(raw) as { t?: unknown };
    return data && (data.t === 'welcome' || data.t === 'snap' || data.t === 'refused' || data.t === 'pong') ? (data as ServerMessage) : null;
  } catch {
    return null;
  }
}
