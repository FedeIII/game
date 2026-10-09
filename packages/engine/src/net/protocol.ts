import { TILE_SIZE } from '../constants.ts';
import { MOB_KINDS, MOB_STATES, type Mob, type MobKind, type MobState } from '../mobs.ts';
import { clampInput, normalAngle, type Facing, type MoveInput } from '../player.ts';

/**
 * The multiplayer protocol: JSON messages over one WebSocket. The client sends its inputs, the
 * server runs every player with the same stepPlayer() and sends snapshots of the truth. See
 * docs/multiplayer.md.
 *
 * Change PROTOCOL_VERSION when a message changes. A client with another version is refused, and
 * it tells the visitor to reload the page.
 */
export const PROTOCOL_VERSION = 8;

/** Snapshots per second from the server to each client. */
export const SNAPSHOT_RATE = 20;
/** The client sends its inputs in batches: one message every this many ticks. */
export const INPUT_BATCH_TICKS = 3;
/** The most inputs in one message (half a second at TICK_RATE). */
export const MAX_INPUTS_PER_MESSAGE = 30;
/** The most door actions in one message. */
export const MAX_DOORS_PER_MESSAGE = 4;
/** The most attacks in one message (an attack and its cooldown take 27 ticks). */
export const MAX_ATTACKS_PER_MESSAGE = 4;
/** The server sends the mobs this close to a player (world pixels): far beyond the screen. */
export const MOB_SEND_RADIUS = 30 * TILE_SIZE;
/** The largest message, in bytes, in either direction from a client. */
export const MAX_CLIENT_MESSAGE_BYTES = 2048;

/**
 * A player's skin is a seed, a whole number from 0 to SKIN_MAX. Each client makes the skin from
 * the seed (the client's art decides what a seed looks like), so the protocol carries only the
 * number. A browser keeps its own seed, so a visitor keeps the same skin across visits.
 */
export const SKIN_MAX = 0xffffffff;

/** The longest name, in characters. */
export const NAME_MAX = 16;

/** The id of a stored character (an account's): lowercase letters and digits. */
export const CHARACTER_ID = /^[a-z0-9]{8,40}$/;

/**
 * A name as every visitor sees it: Latin letters (with accents), digits, spaces and ' . _ -
 * only; spaces joined; at most NAME_MAX characters. Anything else is removed. An empty name is
 * no name. The client cleans a name before it saves it, and the server cleans what it gets.
 */
export function cleanName(raw: string): string {
  const kept = raw.normalize('NFC').replace(/[^\p{Script=Latin}\p{Nd} '._-]/gu, '');
  return [...kept.replace(/\s+/g, ' ').trim()].slice(0, NAME_MAX).join('').trim();
}

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

/** A direction on the wire (an attack's) is a whole number from 0 to AIM_STEPS - 1: steps of 1.4 degrees. */
export const AIM_STEPS = 256;

/** The code of a direction (radians): 0 east, AIM_STEPS / 4 south. */
export function aimCode(angle: number): number {
  const code = Math.round((normalAngle(angle) * (AIM_STEPS / 2)) / Math.PI);
  return ((code % AIM_STEPS) + AIM_STEPS) % AIM_STEPS;
}

/** The direction (radians, in (-PI, PI]) of a code. */
export function aimFromCode(code: number): number {
  const c = ((Math.round(code) % AIM_STEPS) + AIM_STEPS) % AIM_STEPS;
  return ((c > AIM_STEPS / 2 ? c - AIM_STEPS : c) * Math.PI) / (AIM_STEPS / 2);
}

/**
 * An input on the wire: each axis as a whole number from -100 to 100, and for an attack a third
 * number, 1 + the code of its direction (aimCode). The client applies the input that it sends,
 * not the one that it read, so the server can repeat the same step.
 */
export type WireInput = readonly [number, number] | readonly [number, number, number];

const INPUT_SCALE = 100;

export function toWireInput(input: MoveInput): WireInput {
  const q = (v: number) => Math.max(-INPUT_SCALE, Math.min(INPUT_SCALE, Math.round(v * INPUT_SCALE)));
  const attack = clampInput(input).attack;
  return attack !== undefined ? [q(input.x), q(input.y), 1 + aimCode(attack)] : [q(input.x), q(input.y)];
}

export function fromWireInput(wire: WireInput): MoveInput {
  const move = { x: wire[0] / INPUT_SCALE, y: wire[1] / INPUT_SCALE };
  return clampInput(wire.length === 3 ? { ...move, attack: aimFromCode(wire[2] - 1) } : move);
}

// ---------------------------------------------------------------- client to server

/**
 * The first message: which world, the player's skin and name, and (optionally) the tile to start
 * on. On a server with accounts, `character` names the account's character to play: the server
 * then takes the skin and the name from the stored character, not from the message.
 */
export interface HelloMessage {
  readonly t: 'hello';
  readonly v: number;
  readonly world: string;
  readonly skin: number;
  readonly at?: readonly [number, number];
  /** Cleaned (cleanName); '' for no name. */
  readonly name?: string;
  /** A character id (CHARACTER_ID). */
  readonly character?: string;
}

/**
 * A door action: [seq, tx, ty, open]. It happens just before the input with sequence number
 * `seq`, and it asks for the door to be open (1) or closed (0). It carries the wish, not a
 * toggle: if another player already did the same, nothing happens.
 */
export type WireDoor = readonly [number, number, number, number];

/**
 * When the attack of input `seq` started, the client showed the mobs as they were at server time
 * `viewMs` (it draws them a little in the past): [seq, viewMs]. The server checks the hit there
 * too (within limits), so a blow that looked right on the screen lands.
 */
export type WireAttack = readonly [number, number];

/** A batch of inputs. `s` is the sequence number of the first input; the others follow it, one per tick. */
export interface InputMessage {
  readonly t: 'in';
  readonly s: number;
  readonly i: readonly WireInput[];
  readonly d?: readonly WireDoor[];
  readonly k?: readonly WireAttack[];
}

/**
 * A new skin for the player (the visitor chose a new look). The room applies at most one change
 * every SKIN_CHANGE_GAP_MS for each player: the last one asked for.
 */
export interface SkinMessage {
  readonly t: 'skin';
  readonly skin: number;
}

/** A new name for the player ('' for none). The others see it over the player's head. */
export interface NameMessage {
  readonly t: 'name';
  readonly name: string;
}

/** Asks for a pong, to measure the round trip. `c` is the client's clock, sent back as it is. */
export interface PingMessage {
  readonly t: 'ping';
  readonly c: number;
}

export type ClientMessage = HelloMessage | InputMessage | SkinMessage | NameMessage | PingMessage;

/** A player's skin changes at most this often (ms): every change makes every other client render a skin. */
export const SKIN_CHANGE_GAP_MS = 2000;

// ---------------------------------------------------------------- server to client

/**
 * A player as others see it: [id, x, y, vx, vy, facing code, skin, attack, stun, guard, aim
 * code]: attack, stun and guard are the ticks left, as in PlayerState; the aim code is the
 * direction of its attack (aimCode). Positions to 0.1 px.
 */
export type WirePlayer = readonly [number, number, number, number, number, number, number, number, number, number, number];

/** A player's own true state: [x, y, vx, vy, facing code, attack, cooldown, stun, guard, aim code]. */
export type WireSelf = readonly [number, number, number, number, number, number, number, number, number, number];

/** A mob: [id, kind code, x, y, vx, vy, facing code, state code, ms in the state, health left]. Positions to 0.1 px. */
export type WireMob = readonly [number, number, number, number, number, number, number, number, number, number];

export function mobKindCode(kind: MobKind): number {
  return MOB_KINDS.indexOf(kind);
}

export function mobStateCode(state: MobState): number {
  return MOB_STATES.indexOf(state);
}

/** A mob as the wire carries it. */
export function toWireMob(mob: Mob): WireMob {
  const round = (v: number) => Math.round(v * 10) / 10;
  return [
    mob.id,
    mobKindCode(mob.kind),
    round(mob.x),
    round(mob.y),
    Math.round(mob.vx),
    Math.round(mob.vy),
    facingCode(mob.facing),
    mobStateCode(mob.state),
    Math.round(mob.stateMs),
    mob.health,
  ];
}

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
 * this player that the server has applied; `you` is its true state (WireSelf), at full
 * precision; `p` holds the other players. `doors` comes only when the doors changed.
 */
export interface SnapshotMessage {
  readonly t: 'snap';
  readonly ms: number;
  readonly a: number;
  readonly you: WireSelf;
  readonly p: readonly WirePlayer[];
  readonly doors?: readonly (readonly [number, number])[];
  /** The world's NPCs, in the order of WorldSource.npcs(): [x, y, vx, vy, facing code]. */
  readonly n?: readonly WireNpc[];
  /**
   * Lines that NPCs said since the last snapshot: [npc index, line index in its barks]. Every
   * player gets them at the same time; the client shows each over its NPC for a few seconds.
   */
  readonly b?: readonly (readonly [number, number])[];
  /** The names of the players that have one, [id, name]: all of them, and only when one changed. */
  readonly names?: readonly (readonly [number, string])[];
  /** In a world with mobs: the mobs near this player (within MOB_SEND_RADIUS). */
  readonly m?: readonly WireMob[];
}

/** An NPC as the clients see it: [x, y, vx, vy, facing code]. Positions to 0.1 px. */
export type WireNpc = readonly [number, number, number, number, number];

/** Why the server does not let a client in. The client then plays alone. */
/** `account`: the server has accounts, and the visitor is not signed in or the character is not its own. */
export type RefusalReason = 'version' | 'world' | 'full' | 'busy' | 'account';

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
      if (m.name !== undefined && (typeof m.name !== 'string' || m.name.length > 4 * NAME_MAX)) return null;
      const name = typeof m.name === 'string' ? cleanName(m.name) : '';
      if (m.character !== undefined && (typeof m.character !== 'string' || !CHARACTER_ID.test(m.character))) return null;
      return {
        t: 'hello',
        v: m.v,
        world: m.world,
        skin,
        name,
        ...(m.at === undefined ? {} : { at: m.at as [number, number] }),
        ...(m.character === undefined ? {} : { character: m.character }),
      };
    }
    case 'in': {
      if (!isInt(m.s, 1, SEQ_LIMIT) || !Array.isArray(m.i) || m.i.length < 1 || m.i.length > MAX_INPUTS_PER_MESSAGE) return null;
      const inputShaped = (v: unknown) =>
        isPair(v, -INPUT_SCALE, INPUT_SCALE) ||
        (Array.isArray(v) && v.length === 3 && isInt(v[0], -INPUT_SCALE, INPUT_SCALE) && isInt(v[1], -INPUT_SCALE, INPUT_SCALE) && isInt(v[2], 1, AIM_STEPS));
      if (!m.i.every(inputShaped)) return null;
      const inputs = m.i as WireInput[];
      let attacks: WireAttack[] | undefined;
      if (m.k !== undefined) {
        const attackShaped = (k: unknown) => Array.isArray(k) && k.length === 2 && isInt(k[0], 1, SEQ_LIMIT) && typeof k[1] === 'number' && Number.isFinite(k[1]);
        if (!Array.isArray(m.k) || m.k.length > MAX_ATTACKS_PER_MESSAGE || !m.k.every(attackShaped)) return null;
        attacks = m.k as WireAttack[];
      }
      if (m.d === undefined) return attacks ? { t: 'in', s: m.s, i: inputs, k: attacks } : { t: 'in', s: m.s, i: inputs };
      if (!Array.isArray(m.d) || m.d.length > MAX_DOORS_PER_MESSAGE) return null;
      const doorShaped = (d: unknown) =>
        Array.isArray(d) &&
        d.length === 4 &&
        isInt(d[0], 1, SEQ_LIMIT) &&
        isInt(d[1], -TILE_LIMIT, TILE_LIMIT) &&
        isInt(d[2], -TILE_LIMIT, TILE_LIMIT) &&
        isInt(d[3], 0, 1);
      if (!m.d.every(doorShaped)) return null;
      return attacks ? { t: 'in', s: m.s, i: inputs, d: m.d as WireDoor[], k: attacks } : { t: 'in', s: m.s, i: inputs, d: m.d as WireDoor[] };
    }
    case 'skin':
      return isSkin(m.skin) ? { t: 'skin', skin: m.skin } : null;
    case 'name':
      return typeof m.name === 'string' && m.name.length <= 4 * NAME_MAX ? { t: 'name', name: cleanName(m.name) } : null;
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
