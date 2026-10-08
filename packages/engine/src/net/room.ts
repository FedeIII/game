import { CHUNK_SIZE, TICK_RATE, TILE_SIZE } from '../constants.ts';
import { canReachDoor, useDoor, type Feet } from '../interact.ts';
import { createPlayer, stepPlayer, type PlayerState } from '../player.ts';
import { Horde, type HordePlayer } from '../mobs.ts';
import { NpcCrowd } from '../npc.ts';
import type { World } from '../world.ts';
import {
  MOB_SEND_RADIUS,
  SKIN_CHANGE_GAP_MS,
  cleanName,
  facingCode,
  fromWireInput,
  toWireMob,
  type InputMessage,
  type SnapshotMessage,
  type WelcomeMessage,
  type WireDoor,
  type WireMob,
  type WireNpc,
  type WirePlayer,
} from './protocol.ts';

/**
 * Inputs that a player may send per second: a little more than TICK_RATE, because the clocks of
 * the client and the server do not run at exactly the same speed. The burst covers a late batch.
 * An input over the limit is skipped: the player does not move in that tick, and the client
 * corrects itself from the next snapshot. So a fast clock cannot make a player faster.
 */
const INPUT_RATE = TICK_RATE * 1.1;
const INPUT_BURST = TICK_RATE * 1.5;
/** A start tile from the client (?at=) must be this close to the world's spawn, in tiles. */
const MAX_START_DISTANCE = 64;
/** Keep the chunks this far round the players (in chunks) when the room trims its memory. */
const CHUNK_MARGIN = 2;
/**
 * An attack is checked against the mobs as its client showed them (the client says when), but
 * never further back than this (ms); without that word, this far back.
 */
const MAX_REWIND_MS = 500;
const DEFAULT_REWIND_MS = 150;
/** The room keeps where the mobs were for this long (ms), for those checks. */
const TRAIL_MS = 700;

export interface RoomOptions {
  /** The most players at once. Default 50. */
  readonly maxPlayers?: number;
  /** A random source for the spread of start points. Without it, everyone starts on the spawn. */
  readonly random?: () => number;
}

/** One player in a room, as the server sees it. */
export interface RoomPlayer {
  readonly id: number;
  /** The skin seed that the player's client sent (it can change: see setSkin). */
  skin: number;
  /** A skin asked for and not applied yet (too soon after the last change), and when the last change was. */
  wantedSkin: number | null;
  skinChangedMs: number;
  /** The name that the others see over the player ('' for none), and the name version its client has. */
  name: string;
  namesVersion: number;
  /** The true state. Only the room changes it. */
  readonly state: PlayerState;
  /** The last input sequence number that the room has applied or skipped. */
  seq: number;
  /** The input rate limit: a token bucket. */
  tokens: number;
  refilledMs: number;
  /** The door version that this player's client has. */
  doorVersion: number;
}

/**
 * A shared world on the server: the true state of every player and of the doors. The server
 * calls it; it does no network and keeps no clock, so tests can run it directly.
 *
 * Inputs are applied when they arrive, in the order of their sequence numbers. Players do not
 * collide with each other, so each one's movement depends only on the world and the doors.
 */
export class Room {
  readonly world: World;
  readonly maxPlayers: number;
  private readonly random: (() => number) | null;
  private readonly players = new Map<number, RoomPlayer>();
  private nextId = 1;
  /** Goes up each time a door opens or closes. A snapshot carries the doors when it changed. */
  private doorVersion = 0;
  /** Goes up each time a name appears, changes or goes. A snapshot carries the names when it changed. */
  private namesVersion = 0;
  /** The world's walking NPCs, or null if it has none. */
  readonly npcs: NpcCrowd | null;
  private lastTickMs: number | null = null;
  /** NPC lines since the last broadcast. */
  private barks: (readonly [number, number])[] = [];
  /** The world's mobs, or null if it has none. */
  readonly horde: Horde | null;
  /** Where the mobs were at each tick of the last TRAIL_MS: [time, mob id -> x, y]. */
  private trail: { ms: number; at: Map<number, readonly [number, number]> }[] = [];
  /** Mob hits and kills so far (for the logs and tests). */
  hits = 0;
  kills = 0;

  constructor(world: World, options: RoomOptions = {}) {
    this.world = world;
    this.maxPlayers = options.maxPlayers ?? 50;
    this.random = options.random ?? null;
    const defs = world.source.npcs?.() ?? [];
    this.npcs = defs.length > 0 ? new NpcCrowd(world, defs, Math.floor((this.random?.() ?? 0.5) * 0xffffffff)) : null;
    const rules = world.source.mobs?.();
    this.horde = rules ? new Horde(world, rules, Math.floor((this.random?.() ?? 0.25) * 0xffffffff)) : null;
  }

  /**
   * Moves the world on to `nowMs`: the NPCs walk. The server calls it before each broadcast.
   * The time between two calls counts at most 250 ms, so a stall does not make NPCs jump.
   */
  tick(nowMs: number): void {
    const dt = this.lastTickMs === null ? 0 : Math.max(0, nowMs - this.lastTickMs);
    this.lastTickMs = nowMs;
    if (dt === 0) return;
    if (this.npcs) {
      const feet = [...this.players.values()].map((p) => p.state);
      const events = this.npcs.step(dt, feet);
      if (events.doors) this.doorVersion++;
      this.barks.push(...events.barks);
    }
    if (this.horde) {
      // A mob's hit stuns the player's true state; its client learns it from the next snapshot.
      const players: HordePlayer[] = [...this.players.values()].map((p) => ({ id: p.id, state: p.state }));
      this.hits += this.horde.step(dt, players).length;
      this.trail.push({ ms: nowMs, at: new Map(this.horde.mobs.map((m) => [m.id, [m.x, m.y] as const])) });
      while (this.trail.length > 2 && this.trail[0]!.ms < nowMs - TRAIL_MS) this.trail.shift();
    }
  }

  /** Where mob `id` was at time `ms` (between two ticks of the trail), or null if the trail does not know. */
  private mobAt(id: number, ms: number): { x: number; y: number } | null {
    let before: (typeof this.trail)[number] | null = null;
    let after: (typeof this.trail)[number] | null = null;
    for (const entry of this.trail) {
      if (entry.ms <= ms) before = entry;
      else {
        after = entry;
        break;
      }
    }
    const a = before?.at.get(id);
    const b = after?.at.get(id);
    if (a && b) {
      const k = (ms - before!.ms) / (after!.ms - before!.ms);
      return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k };
    }
    const one = a ?? b;
    return one ? { x: one[0], y: one[1] } : null;
  }

  get size(): number {
    return this.players.size;
  }

  player(id: number): RoomPlayer | null {
    return this.players.get(id) ?? null;
  }

  /**
   * Adds a player with its skin seed, or returns null if the room is full. The player starts
   * near `at` (a tile) if that is close to the spawn, or else near the world's spawn.
   */
  join(nowMs: number, skin: number, at?: readonly [number, number], name = ''): RoomPlayer | null {
    if (this.players.size >= this.maxPlayers) return null;
    const spawn = this.world.spawn();
    const home = [Math.floor(spawn.x / TILE_SIZE), Math.floor(spawn.y / TILE_SIZE)] as const;
    const near = at && Math.max(Math.abs(at[0] - home[0]), Math.abs(at[1] - home[1])) <= MAX_START_DISTANCE;
    const start = near ? this.world.findSpawn(at[0], at[1], 0) : this.spread(home[0], home[1]);
    const player: RoomPlayer = {
      id: this.nextId++,
      skin,
      wantedSkin: null,
      skinChangedMs: -Infinity,
      name: cleanName(name),
      // The first snapshot carries the names of everyone already there.
      namesVersion: -1,
      state: createPlayer(start.x, start.y),
      seq: 0,
      tokens: INPUT_BURST,
      refilledMs: nowMs,
      doorVersion: this.doorVersion,
    };
    this.players.set(player.id, player);
    if (player.name) this.namesVersion++;
    return player;
  }

  leave(id: number): void {
    if (this.players.get(id)?.name) this.namesVersion++;
    this.players.delete(id);
  }

  /** A new name for a player ('' for none). */
  setName(id: number, name: string): void {
    const player = this.players.get(id);
    const clean = cleanName(name);
    if (!player || player.name === clean) return;
    player.name = clean;
    this.namesVersion++;
  }

  /**
   * A new skin for a player. It applies at once, or, if the last change was less than
   * SKIN_CHANGE_GAP_MS ago, as soon as that time has passed (the last skin asked for wins).
   */
  setSkin(id: number, skin: number, nowMs: number): void {
    const player = this.players.get(id);
    if (!player) return;
    player.wantedSkin = skin;
    this.applySkin(player, nowMs);
  }

  private applySkin(player: RoomPlayer, nowMs: number): void {
    if (player.wantedSkin === null || nowMs - player.skinChangedMs < SKIN_CHANGE_GAP_MS) return;
    if (player.wantedSkin !== player.skin) {
      player.skin = player.wantedSkin;
      player.skinChangedMs = nowMs;
    }
    player.wantedSkin = null;
  }

  /** The first message for a new player. */
  welcome(player: RoomPlayer): WelcomeMessage {
    player.doorVersion = this.doorVersion;
    return { t: 'welcome', id: player.id, x: player.state.x, y: player.state.y, doors: this.world.openDoorList() };
  }

  /**
   * Applies a batch of inputs from a player, with its door actions, in order. An input that the
   * room has applied before (a repeat) is ignored.
   */
  input(id: number, message: InputMessage, nowMs: number): void {
    const player = this.players.get(id);
    if (!player) return;
    player.tokens = Math.min(INPUT_BURST, player.tokens + (Math.max(0, nowMs - player.refilledMs) / 1000) * INPUT_RATE);
    player.refilledMs = nowMs;
    const doors = message.d ?? [];
    const last = message.s + message.i.length - 1;
    // A door action for an input that the room already has happens now.
    for (const door of doors) if (door[0] <= player.seq) this.door(player, door);
    message.i.forEach((wire, k) => {
      const seq = message.s + k;
      if (seq <= player.seq) return;
      for (const door of doors) if (door[0] === seq) this.door(player, door);
      player.seq = seq;
      if (player.tokens < 1) return;
      player.tokens -= 1;
      if (stepPlayer(player.state, fromWireInput(wire), this.world) && this.horde) {
        // The blow lands where the mobs are now, or where its client showed them (not too long ago).
        const view = message.k?.find((attack) => attack[0] === seq)?.[1] ?? nowMs - DEFAULT_REWIND_MS;
        const then = Math.max(nowMs - MAX_REWIND_MS, Math.min(nowMs, view));
        this.kills += this.horde.strike(player.state, player.state.facing, (mob) => this.mobAt(mob.id, then)).length;
      }
    });
    // And one for an input that has not come yet happens after this batch.
    for (const door of doors) if (door[0] > Math.max(last, player.seq)) this.door(player, door);
  }

  /**
   * The snapshot for each player, given to `send`, except to those that `skip` names. The
   * other players are packed once for all.
   * Positions of others are rounded to 0.1 px; a player's own state is exact, because its
   * client replays its inputs from it.
   */
  broadcast(nowMs: number, send: (id: number, message: SnapshotMessage) => void, skip: (id: number) => boolean = () => false): void {
    const ms = Math.round(nowMs);
    const round = (v: number) => Math.round(v * 10) / 10;
    const packed = new Map<number, WirePlayer>();
    for (const p of this.players.values()) {
      this.applySkin(p, nowMs);
      const s = p.state;
      packed.set(p.id, [p.id, round(s.x), round(s.y), Math.round(s.vx), Math.round(s.vy), facingCode(s.facing), p.skin, s.attack, s.stun, s.guard]);
    }
    const doors = this.world.openDoorList();
    const barks = this.barks;
    this.barks = [];
    const names: [number, string][] = [];
    for (const p of this.players.values()) if (p.name) names.push([p.id, p.name]);
    const mobs: WireMob[] | null = this.horde ? this.horde.mobs.map(toWireMob) : null;
    const npcs: WireNpc[] | null = this.npcs
      ? this.npcs.poses.map((n) => [round(n.x), round(n.y), Math.round(n.vx), Math.round(n.vy), facingCode(n.facing)])
      : null;
    for (const p of this.players.values()) {
      // A client that cannot take more now (a slow connection) gets the next one, doors included.
      if (skip(p.id)) continue;
      const others: WirePlayer[] = [];
      for (const [id, wire] of packed) if (id !== p.id) others.push(wire);
      const s = p.state;
      const changed = p.doorVersion !== this.doorVersion;
      p.doorVersion = this.doorVersion;
      const renamed = p.namesVersion !== this.namesVersion;
      p.namesVersion = this.namesVersion;
      send(p.id, {
        t: 'snap',
        ms,
        a: p.seq,
        you: [s.x, s.y, s.vx, s.vy, facingCode(s.facing), s.attack, s.cooldown, s.stun, s.guard],
        p: others,
        ...(changed ? { doors } : {}),
        ...(npcs ? { n: npcs } : {}),
        ...(barks.length > 0 ? { b: barks } : {}),
        ...(renamed ? { names } : {}),
        // The mobs near this player only: the others are far off its screen.
        ...(mobs ? { m: mobs.filter((m) => Math.hypot(m[2] - s.x, m[3] - s.y) <= MOB_SEND_RADIUS) } : {}),
      });
    }
  }

  /** Forgets the chunks far from every player, so a long walk does not fill the memory. */
  trimChunks(): void {
    if (this.players.size === 0) return;
    let minCx = Infinity;
    let minCy = Infinity;
    let maxCx = -Infinity;
    let maxCy = -Infinity;
    for (const { state } of this.players.values()) {
      const cx = Math.floor(state.x / TILE_SIZE / CHUNK_SIZE);
      const cy = Math.floor(state.y / TILE_SIZE / CHUNK_SIZE);
      minCx = Math.min(minCx, cx);
      minCy = Math.min(minCy, cy);
      maxCx = Math.max(maxCx, cx);
      maxCy = Math.max(maxCy, cy);
    }
    this.world.forgetChunksOutside(minCx - CHUNK_MARGIN, minCy - CHUNK_MARGIN, maxCx + CHUNK_MARGIN, maxCy + CHUNK_MARGIN);
  }

  /** Applies a door wish if the player can reach the door. A door never closes on anyone. */
  private door(player: RoomPlayer, [, tx, ty, open]: WireDoor): void {
    if (!canReachDoor(this.world, player.state, tx, ty)) return;
    if (this.world.isDoorOpen(tx, ty) === (open === 1)) return;
    // A door never closes on anyone: the other players, or an NPC in the doorway.
    const others: Feet[] = [...(this.npcs?.poses ?? [])];
    for (const p of this.players.values()) if (p !== player) others.push(p.state);
    if (useDoor(this.world, player.state, tx, ty, others) !== 'blocked') this.doorVersion++;
  }

  /** A start point near the spawn tile, a little apart from the others when there is a random source. */
  private spread(tx: number, ty: number): { x: number; y: number } {
    const random = this.random;
    if (!random) return this.world.findSpawn(tx, ty, 1);
    const dx = Math.floor(random() * 5) - 2;
    const dy = Math.floor(random() * 3) - 1;
    return this.world.findSpawn(tx + dx, ty + dy, 1);
  }
}
