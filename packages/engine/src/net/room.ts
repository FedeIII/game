import { CHUNK_SIZE, TICK_RATE, TILE_SIZE } from '../constants.ts';
import { canReachDoor, canReachPile, reachableFixture, useDoor, type Feet } from '../interact.ts';
import { EMPTY_GEAR, gearSlotAt, sameShown, shownGear, type Gear } from '../gear.ts';
import { dropWorn, moveItem, ownedPack, unwearFor } from '../inventory.ts';
import { EMPTY_PACK, ITEM_KINDS, addToPack, drinkFrom, lootIsEmpty, removeFromSlot, type Loot, type Pack } from '../items.ts';
import { Spoils } from '../loot.ts';
import { Piles, dropPoint, tossPoint } from '../piles.ts';
import { createPlayer, resumePoint, stepPlayer, wakePlayer, type PlayerState } from '../player.ts';
import { DEAL_RANGE, findDealAnswer, findEffectAnswer, makeDeal, type Dialog } from '../dialog.ts';
import { EMPTY_BOOK, applyEffect, holds, type Conditions, type QuestBook, type QuestEffect } from '../quests.ts';
import { SCENE_MARGIN, inScene } from '../scenes.ts';
import { rollingDice, type DiceSource } from '../dice.ts';
import { Ambushes } from '../ambushes.ts';
import { Escorts } from '../escorts.ts';
import { Convoys } from '../convoys.ts';
import { Guards, type GuardEvent } from '../guards.ts';
import { fixtureContent } from '../fixtures.ts';
import { CHUNK_PIXELS } from '../constants.ts';
import { Companions, type Companion, type CompanionDef, type CompanionEvent } from '../companions.ts';
import { Horde, type HordePlayer } from '../mobs.ts';
import { random } from '../noise.ts';
import { NpcCrowd } from '../npc.ts';
import { guestGear, guestTraits, meetsGate, sightOf, type Gate, type PlayerTraits } from '../traits.ts';
import { refugeAt, wakePoint, type World } from '../world.ts';
import {
  MOB_SEND_RADIUS,
  PILE_SEND_RADIUS,
  SKIN_CHANGE_GAP_MS,
  cleanName,
  aimCode,
  facingCode,
  fromWireInput,
  toWireLoot,
  toWireMob,
  toWireGear,
  toWireLook,
  toWirePack,
  toWireBook,
  toWireBlow,
  toWirePile,
  toWireToss,
  type InputMessage,
  type SnapshotMessage,
  type WelcomeMessage,
  type WireDoor,
  type WireLook,
  type WireLoot,
  type WireMob,
  type WireArrow,
  type WireCompanion,
  type WireNpc,
  type WirePick,
  type WirePile,
  type WireBlow,
  type WirePlayer,
  type WireUse,
} from './protocol.ts';

/**
 * Inputs that a player may send per second: a little more than TICK_RATE, because the clocks of
 * the client and the server do not run at exactly the same speed. The burst covers a late batch.
 * An input over the limit is skipped: the player does not move in that tick, and the client
 * corrects itself from the next snapshot. So a fast clock cannot make a player faster.
 */
const INPUT_RATE = TICK_RATE * 1.1;
const INPUT_BURST = TICK_RATE * 1.5;
/**
 * A start tile from the client (`at` in the hello) must be this close to the place of the player's
 * character, or else to the world's spawn, in tiles.
 */
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
  /** A random source for the seeds of the NPCs and the mobs. */
  readonly random?: () => number;
  /** Where the dice of the fights and the draughts come from (dice.ts); without it, the horde's own random numbers. Tests: AVERAGE_DICE. */
  readonly dice?: DiceSource;
}

/** A rest in a bed of the player's own (Interaction.rest): all hit points and stamina back, no poison or drink. */
export function rest(state: PlayerState, traits: Pick<PlayerTraits, 'maxHp' | 'maxStamina'>): void {
  state.hp = traits.maxHp;
  state.recover = 0;
  state.stamina = traits.maxStamina;
  state.poison = 0;
  state.poisonClock = 0;
  state.drunk = 0;
}

/** A set of chunk keys ("cx,cy") as [cx, cy] pairs. */
export function exploredList(explored: ReadonlySet<string>): [number, number][] {
  return [...explored].map((key) => key.split(',').map(Number) as [number, number]);
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
  /** What its scores and its gear give (from its stored character; without one, guestTraits() of its look). */
  traits: PlayerTraits;
  /** The traits of its scores with other gear (JoinCharacter.traitsFor), or null: the traits do not change. */
  readonly traitsFor: ((gear: Gear) => PlayerTraits) | null;
  /** What it carries. The server saves it with the character. */
  pack: Pack;
  /** What it wears (gear.ts). The server saves it with the character. */
  gear: Gear;
  /** Whether the gear changed since the last snapshot. */
  gearChanged: boolean;
  /** The looks version that its client has (Room.looksVersion). */
  looksVersion: number;
  /** Whether the pack changed since the last snapshot, and the loot that it got since then. */
  packChanged: boolean;
  loot: WireLoot[];
  /** The refuges that its character has entered (WorldSource.refuges), and whether they changed since the last snapshot. */
  refuges: string[];
  refugesChanged: boolean;
  /** Its character's quest book (quests.ts), and whether it changed since the last snapshot. The server saves it with the character. */
  quests: QuestBook;
  questsChanged: boolean;
  /** The coins that a defeat took, when it woke since the last snapshot (else null). */
  woke: number | null;
  /** What its blows and arrows did since the last snapshot (protocol 26): its client shows the numbers. */
  blows: WireBlow[];
  /** The chunks that its character has seen ("cx,cy"), and those that it saw since the last snapshot. */
  readonly explored: Set<string>;
  newlyExplored: [number, number][];
  /** The piles near it that its client has, as a key (ids and counts): a snapshot carries them when they change. */
  pileKey: string;
}

/** A key for a list of piles on the wire: their ids and counts, so a snapshot carries the piles only when they change. */
function pileKey(piles: readonly WirePile[]): string {
  return piles.map((p) => `${p[0]}:${p[4]}`).join(',');
}

/** The most chunks that a character keeps as seen (a square of 128 x 128 chunks: 4096 tiles across). */
export const MAX_EXPLORED = 16_384;

/** The chunks that a player at (x, y) sees: its chunk and the eight round it. */
export function seenChunks(x: number, y: number): [number, number][] {
  const cx = Math.floor(x / CHUNK_PIXELS);
  const cy = Math.floor(y / CHUNK_PIXELS);
  const out: [number, number][] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) out.push([cx + dx, cy + dy]);
  return out;
}

/** The character of a player who joins: its traits, its pack and gear, its hit points and its refuges. */
export interface JoinCharacter {
  /** Its traits with its gear. */
  readonly traits: PlayerTraits;
  /** Its traits with other gear: the room calls it when the gear changes. Without it, the traits stay. */
  readonly traitsFor?: (gear: Gear) => PlayerTraits;
  readonly pack?: Pack;
  /** What it wears; without it, nothing. */
  readonly gear?: Gear;
  /** Null or none: all of them. */
  readonly hp?: number | null;
  readonly refuges?: readonly string[];
  /** Its quest book; without it, empty. */
  readonly quests?: QuestBook;
  /** The chunks that it has seen, [cx, cy]. */
  readonly explored?: readonly (readonly [number, number])[];
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
  /** Where the dice come from (the draughts; the horde rolls its fights with the same). */
  readonly dice: DiceSource;
  /** The ambushes of the story (ambushes.ts): the scouts in the grove. */
  readonly ambushes: Ambushes;
  /** The escorts of the story (escorts.ts): Himo, whom a character takes home. */
  readonly escorts: Escorts;
  /** The NPCs that fight (guards.ts: the militia and the wagon of a caravan), and the convoys that they walk in (convoys.ts). */
  readonly guards: Guards;
  readonly convoys: Convoys;
  /** The players whose quest book the room changed by itself (an ambush that ended), for the server to save. */
  private questSaves = new Set<number>();
  /** The NPCs that follow players (companions.ts): a quest adds them (addCompanion). */
  readonly companions: Companions;
  /** What happened to the companions since the last takeCompanionEvents() (for the quests). */
  private companionEvents: CompanionEvent[] = [];
  /** Goes up each time a player comes or goes, or what shows of its gear changes. A snapshot carries the looks when it changed. */
  private looksVersion = 0;
  /** The world's walking NPCs, or null if it has none. */
  readonly npcs: NpcCrowd | null;
  private lastTickMs: number | null = null;
  /** NPC lines since the last broadcast. */
  private barks: (readonly [number, number])[] = [];
  /** The world's mobs, or null if it has none. */
  readonly horde: Horde | null;
  /** Where the mobs were at each tick of the last TRAIL_MS: [time, mob id -> x, y]. */
  private trail: { ms: number; at: Map<number, readonly [number, number]> }[] = [];
  /** Mob hits on players and mob kills so far (for the logs and tests). */
  hits = 0;
  kills = 0;
  /** The loot of the world: chests and barred doors. */
  readonly spoils: Spoils;
  /** The items on the ground. */
  readonly piles: Piles;

  constructor(world: World, options: RoomOptions = {}) {
    this.world = world;
    this.maxPlayers = options.maxPlayers ?? 50;
    this.random = options.random ?? null;
    const defs = world.source.npcs?.() ?? [];
    this.npcs = defs.length > 0 ? new NpcCrowd(world, defs, Math.floor((this.random?.() ?? 0.5) * 0xffffffff)) : null;
    const rules = world.source.mobs?.();
    this.horde = rules ? new Horde(world, rules, Math.floor((this.random?.() ?? 0.25) * 0xffffffff), options.dice) : null;
    this.dice = options.dice ?? this.horde?.dice ?? rollingDice(random(Math.floor((this.random?.() ?? 0.6) * 0xffffffff)));
    this.spoils = new Spoils(world, random(Math.floor((this.random?.() ?? 0.75) * 0xffffffff)));
    this.piles = new Piles(world);
    this.companions = new Companions(world);
    this.ambushes = new Ambushes(world, world.source.ambushes?.() ?? []);
    this.escorts = new Escorts(world.source.escorts?.() ?? []);
    this.guards = new Guards(world);
    this.convoys = new Convoys(world, world.source.convoys?.() ?? []);
    if (this.horde) {
      // A robber's arrows hit the guards of the convoy that it robs.
      this.horde.arrowBodies = (owner) => {
        const player = this.players.get(owner);
        return player ? this.guards.bodies(this.convoys.outlawOf(player)) : [];
      };
      this.horde.onArrowBody = (owner, id, blow) => void this.guards.shot(id, owner, blow, this.dice);
    }
  }

  /**
   * An effect of the story that the room applies by itself (the end of an ambush, of an escort):
   * the book and the pack of player `id` change, what does not fit falls at its feet, and the server
   * saves the book at once (takeQuestSaves).
   */
  private applyStory(id: number, effect: QuestEffect, nowMs: number): void {
    const player = this.players.get(id);
    const result = player ? applyEffect(effect, player.quests, player.pack, player.traits.slots) : null;
    if (!player || !result) return;
    player.quests = result.book;
    player.questsChanged = true;
    player.pack = result.pack;
    player.packChanged = true;
    if (result.left.items.length > 0) this.piles.put(player.state.x, player.state.y, result.left.items, nowMs, player.state);
    if (!lootIsEmpty(result.taken) || !lootIsEmpty(result.left)) player.loot.push(toWireLoot('drop', result.taken, !lootIsEmpty(result.left)));
    this.questSaves.add(id);
  }

  /** The players whose quest book the room changed by itself since the last call (the server saves them). */
  takeQuestSaves(): number[] {
    const ids = [...this.questSaves];
    this.questSaves.clear();
    return ids;
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
    let companionEvents: CompanionEvent[] = [];
    if (this.companions.list.length > 0) {
      // Companions follow their leaders (before the mobs, which hunt them too).
      const leaders = new Map([...this.players.values()].map((p) => [p.id, p.state] as const));
      companionEvents = this.companions.step(dt, leaders);
      this.companionEvents.push(...companionEvents);
      if (this.companions.takeDoors()) this.doorVersion++;
    }
    // The guards fight and walk (before the mobs, which hunt them too); an outlaw is a foe of their convoy.
    let guardEvents: GuardEvent[] = [];
    if (this.guards.list.length > 0) {
      const guardPlayers = [...this.players.values()].map((p) => ({ id: p.id, state: p.state, outlaw: this.convoys.outlawOf(p), traits: p.traits }));
      guardEvents = this.guards.step(dt, this.horde, guardPlayers, this.dice, this.convoys.anchors());
    }
    if (this.escorts.defs.length > 0) {
      // The escorts: a character at the step gets its companion; one that comes home or falls ends the escort.
      const people = [...this.players.values()].map((p) => ({ id: p.id, state: p.state, quests: p.quests, pack: p.pack }));
      for (const { player: id, effect } of this.escorts.step(this.companions, people, companionEvents)) this.applyStory(id, effect, nowMs);
    }
    if (this.horde) {
      // A mob's hit stuns the player's true state; its client learns it from the next snapshot.
      // Mobs see a player from less far with Dexterity, and less again while it sneaks.
      const players: HordePlayer[] = [...this.players.values()].map((p) => ({ id: p.id, state: p.state, sight: sightOf(p.traits, p.state), traits: p.traits }));
      players.push(...this.companions.targets(), ...this.guards.targets());
      // The attacks that hit (a miss glances off: the player's state shows its spark).
      this.hits += this.horde.step(dt, players).filter((hit) => hit[2] > 0).length;
      for (const result of this.horde.takeShotResults()) this.players.get(result.owner)?.blows.push(toWireBlow(result));
      // The ambushes of the story: they start for a character at their step in their area, and their end moves the quest on.
      const people = [...this.players.values()].map((p) => ({ id: p.id, state: p.state, quests: p.quests, pack: p.pack }));
      for (const { player: id, effect } of this.ambushes.step(this.horde, people)) this.applyStory(id, effect, nowMs);
      // During a raid, the people of the town take shelter.
      this.npcs?.setAlarm(this.ambushes.sheltered);
      // The convoys: they start, meet their attackers, and end (saved, lost, robbed).
      if (this.convoys.defs.length > 0) for (const { player: id, effect } of this.convoys.step(this.horde, this.guards, people, guardEvents)) this.applyStory(id, effect, nowMs);
      for (const { mob, owner } of this.horde.takeShotKills()) {
        this.kills++;
        const shooter = this.players.get(owner);
        if (shooter) this.give(shooter, this.horde.drop(mob), mob, nowMs);
      }
      this.trail.push({ ms: nowMs, at: new Map(this.horde.mobs.map((m) => [m.id, [m.x, m.y] as const])) });
      while (this.trail.length > 2 && this.trail[0]!.ms < nowMs - TRAIL_MS) this.trail.shift();
    }
    if (this.spoils.tick(nowMs, [...this.players.values()].map((p) => p.state))) this.doorVersion++;
    this.piles.tick(nowMs);
    // A character that comes into a refuge (the chapel) can wake there after a defeat; and it
    // remembers the land that it sees (the map).
    for (const player of this.players.values()) {
      const refuge = refugeAt(this.world, player.state.x, player.state.y);
      if (refuge && !player.refuges.includes(refuge.id)) {
        player.refuges.push(refuge.id);
        player.refugesChanged = true;
      }
      this.explore(player);
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
   * Adds a player with its skin seed, or returns null if the room is full. `place` is where the
   * player's character was last (the server's own record, at full precision); `at` is the tile
   * that the client asks for (where it is now: after a reconnection, it may have walked on).
   *
   * - With a place: the player starts there (resumePoint). When `at` is another tile, close to
   *   the place, the player starts near `at`.
   * - Without one (a new character): near `at` if that is close to the world's spawn, or else on
   *   the spawn itself, indoors too (the Wilds: in the home, the house of the cell (0, 0)).
   *
   * `character` gives the player's traits, pack and gear (from its stored character); without it,
   * the player has guestTraits() of its look, the kit of its class (guestGear) and an empty pack.
   */
  join(
    nowMs: number,
    skin: number,
    at?: readonly [number, number],
    name = '',
    place?: { readonly x: number; readonly y: number },
    character?: JoinCharacter,
  ): RoomPlayer | null {
    if (this.players.size >= this.maxPlayers) return null;
    const anchor = place ?? this.world.spawn();
    const home = [Math.floor(anchor.x / TILE_SIZE), Math.floor(anchor.y / TILE_SIZE)] as const;
    const near = at && Math.max(Math.abs(at[0] - home[0]), Math.abs(at[1] - home[1])) <= MAX_START_DISTANCE;
    const atPlace = place && (!at || (at[0] === home[0] && at[1] === home[1]));
    const start = atPlace
      ? resumePoint(this.world, place.x, place.y)
      : near
        ? this.world.findSpawn(at[0], at[1], 0)
        : resumePoint(this.world, anchor.x, anchor.y);
    const traits = character?.traits ?? guestTraits(skin);
    const traitsFor = character ? (character.traitsFor ?? null) : (gear: Gear) => guestTraits(skin, gear);
    const state = createPlayer(start.x, start.y);
    // A character comes back with the hit points that it had (all of them after a defeat), and all its stamina.
    const hp = character?.hp ?? null;
    state.hp = hp === null || hp <= 0 ? traits.maxHp : Math.min(hp, traits.maxHp);
    if (state.hp < traits.maxHp) state.recover = traits.recover;
    state.stamina = traits.maxStamina;
    const player: RoomPlayer = {
      id: this.nextId++,
      skin,
      wantedSkin: null,
      skinChangedMs: -Infinity,
      name: cleanName(name),
      // The first snapshot carries the names of everyone already there.
      namesVersion: -1,
      state,
      seq: 0,
      tokens: INPUT_BURST,
      refilledMs: nowMs,
      doorVersion: this.doorVersion,
      traits,
      traitsFor,
      pack: character?.pack ?? EMPTY_PACK,
      gear: character ? (character.gear ?? EMPTY_GEAR) : guestGear(skin),
      gearChanged: false,
      // The first snapshot carries the looks of everyone already there.
      looksVersion: -1,
      packChanged: false,
      loot: [],
      refuges: [...(character?.refuges ?? [])],
      refugesChanged: false,
      quests: character?.quests ?? EMPTY_BOOK,
      questsChanged: false,
      woke: null,
      blows: [],
      explored: new Set((character?.explored ?? []).map(([cx, cy]) => `${cx},${cy}`)),
      newlyExplored: [],
      pileKey: '',
    };
    this.explore(player);
    player.newlyExplored = [];
    this.players.set(player.id, player);
    if (player.name) this.namesVersion++;
    this.looksVersion++;
    return player;
  }

  /** Puts a companion next to player `leader`, following it; null without that player. */
  addCompanion(def: CompanionDef, leader: number): Companion | null {
    const player = this.players.get(leader);
    return player ? this.companions.add(def, leader, player.state.x, player.state.y) : null;
  }

  /** What happened to the companions since the last call: they fell, went, stopped or follow again. */
  takeCompanionEvents(): CompanionEvent[] {
    const events = this.companionEvents;
    this.companionEvents = [];
    return events;
  }

  /** A player who leaves while it lies defeated wakes first: the server saves where it woke, and what it lost. */
  settle(id: number): void {
    const player = this.players.get(id);
    if (player && player.state.down > 0) this.wake(player);
  }

  leave(id: number): void {
    this.settle(id);
    // Its companions go with it (a quest puts them back at the next join).
    for (const companion of this.companions.ofLeader(id)) this.companions.remove(companion.id);
    if (this.players.get(id)?.name) this.namesVersion++;
    if (this.players.has(id)) this.looksVersion++;
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
    player.packChanged = false;
    player.gearChanged = false;
    player.questsChanged = false;
    const piles = this.pilesNear(player);
    player.pileKey = pileKey(piles);
    return {
      t: 'welcome',
      id: player.id,
      x: player.state.x,
      y: player.state.y,
      doors: this.world.openDoorList(),
      fd: this.world.forcedDoorList(),
      pk: toWirePack(player.pack),
      gr: toWireGear(player.gear),
      qs: toWireBook(player.quests),
      pl: piles,
      hp: player.state.hp,
      rf: [...player.refuges],
      ex: exploredList(player.explored),
    };
  }

  /** The piles near a player, as the wire carries them. */
  private pilesNear(player: RoomPlayer): WirePile[] {
    return this.piles.near(player.state.x, player.state.y, PILE_SEND_RADIUS).map(toWirePile);
  }

  /**
   * Applies a batch of inputs from a player, with its door actions, the chests that it opens and
   * the piles that it picks up, in order. An input that the room has applied before (a repeat) is
   * ignored.
   */
  input(id: number, message: InputMessage, nowMs: number): void {
    const player = this.players.get(id);
    if (!player) return;
    player.tokens = Math.min(INPUT_BURST, player.tokens + (Math.max(0, nowMs - player.refilledMs) / 1000) * INPUT_RATE);
    player.refilledMs = nowMs;
    const doors = message.d ?? [];
    const uses = message.u ?? [];
    const picks = message.g ?? [];
    const last = message.s + message.i.length - 1;
    // A door action (or a chest, or a pile) for an input that the room already has happens now.
    for (const door of doors) if (door[0] <= player.seq) this.door(player, door);
    for (const use of uses) if (use[0] <= player.seq) this.use(player, use, nowMs);
    for (const pick of picks) if (pick[0] <= player.seq) this.pick(player, pick);
    message.i.forEach((wire, k) => {
      const seq = message.s + k;
      if (seq <= player.seq) return;
      for (const door of doors) if (door[0] === seq) this.door(player, door);
      for (const use of uses) if (use[0] === seq) this.use(player, use, nowMs);
      for (const pick of picks) if (pick[0] === seq) this.pick(player, pick);
      player.seq = seq;
      if (player.tokens < 1) return;
      player.tokens -= 1;
      // The last tick of a defeat: after it the player wakes at a safe place.
      const waking = player.state.down === 1;
      const struckNow = stepPlayer(player.state, fromWireInput(wire), this.world, player.traits);
      if (waking) this.wake(player);
      if (struckNow && this.horde) {
        // The blow lands where the mobs are now, or where its client showed them (not too long ago).
        const view = message.k?.find((attack) => attack[0] === seq)?.[1] ?? nowMs - DEFAULT_REWIND_MS;
        const then = Math.max(nowMs - MAX_REWIND_MS, Math.min(nowMs, view));
        if (player.traits.ranged) {
          // A ranger's arrow flies from here; the horde's next steps fly it (and give its kill).
          this.horde.shoot(player.state, player.state.aim, player.traits.range, player.id, player.traits);
          return;
        }
        const struck = this.horde.strike(player.state, player.state.aim, (mob) => this.mobAt(mob.id, then), player.id, player.traits);
        // A robber's blow also hits the guards of the convoy that it robs.
        const outlaw = this.convoys.outlawOf(player);
        if (outlaw.length > 0) this.guards.strike(player.state, player.state.aim, player.id, player.traits, outlaw, this.dice);
        for (const result of struck) {
          // Its client shows what the dice did (a number, a miss) when this comes.
          player.blows.push(toWireBlow(result));
          if (result.mob.state !== 'dying') continue;
          this.kills++;
          this.give(player, this.horde.drop(result.mob), result.mob, nowMs);
        }
      }
    });
    // And one for an input that has not come yet happens after this batch.
    for (const door of doors) if (door[0] > Math.max(last, player.seq)) this.door(player, door);
    for (const use of uses) if (use[0] > Math.max(last, player.seq)) this.use(player, use, nowMs);
    for (const pick of picks) if (pick[0] > Math.max(last, player.seq)) this.pick(player, pick);
  }

  /** Puts what a kill dropped into the killer's pack; what does not fit falls on the ground at the mob (`at`). */
  private give(player: RoomPlayer, drop: Loot, at: { readonly x: number; readonly y: number }, nowMs: number): void {
    if (lootIsEmpty(drop)) return;
    const { pack, taken, left } = addToPack(player.pack, drop, player.traits.slots);
    player.pack = pack;
    if (!lootIsEmpty(taken)) player.packChanged = true;
    if (left.items.length > 0) this.piles.put(at.x, at.y, left.items, nowMs, at);
    player.loot.push(toWireLoot('drop', taken, !lootIsEmpty(left)));
  }

  /**
   * A defeated player wakes: at its home, or at the nearest refuge that its character has entered,
   * with all its hit points; a defeat takes half of its coins.
   */
  private wake(player: RoomPlayer): void {
    const at = wakePoint(this.world, player.state.x, player.state.y, player.refuges);
    wakePlayer(player.state, at.x, at.y, player.traits);
    const lost = Math.floor(player.pack.coins / 2);
    if (lost > 0) {
      player.pack = { coins: player.pack.coins - lost, items: player.pack.items };
      player.packChanged = true;
    }
    player.woke = lost;
  }

  /**
   * A purchase from an NPC: the player must be near it, and have the coins; then the coins go, and
   * the goods come (an ale: a drink).
   */
  deal(id: number, from: { readonly npc?: number; readonly at?: readonly [number, number] }, dealId: string): void {
    const player = this.players.get(id);
    if (!player || player.state.down > 0) return;
    let dialog: Dialog | undefined;
    if (from.npc !== undefined) {
      const pose = this.npcs?.poses[from.npc];
      if (!pose || Math.hypot(pose.x - player.state.x, pose.y - player.state.y) > DEAL_RANGE) return;
      dialog = this.world.source.npcs?.()[from.npc]?.content.dialog;
    } else if (from.at) {
      const [tx, ty] = from.at;
      const fixture = this.world.fixtureAt(tx, ty);
      if (!fixture || Math.hypot(tx * TILE_SIZE + TILE_SIZE / 2 - player.state.x, ty * TILE_SIZE + TILE_SIZE / 2 - player.state.y) > DEAL_RANGE) return;
      dialog = fixture.content?.dialog;
    }
    const answer = dialog ? findDealAnswer(dialog, dealId) : null;
    if (!answer?.deal || (answer.gate && !meetsGate(player.traits.scores, answer.gate)) || !holds(answer.when, player.quests, player.pack)) return;
    // A person who does not deal with this character (a wanted robber).
    if (dialog?.refuse && holds(dialog.refuse.when, player.quests, player.pack)) return;
    const pack = makeDeal(answer.deal, player.pack, player.state, player.traits);
    if (!pack) return;
    player.pack = pack;
    player.packChanged = true;
    // A room at the inn: the character gets the refuge (it wakes there, and the bed rests it).
    const refuge = answer.deal.goods === 'refuge' ? answer.deal.refuge : undefined;
    if (refuge && !player.refuges.includes(refuge) && this.world.source.refuges?.().some((r) => r.id === refuge)) {
      player.refuges.push(refuge);
      player.refugesChanged = true;
    }
  }

  /**
   * An effect on a quest (quests.ts): an answer to an NPC (`npc`), a thing that the player reads
   * (`at`, the letter), or the end of a scene that it overheard (`scene`, scenes.ts). The player must
   * be near the NPC or the thing (DEAL_RANGE), or in the area of the scene (SCENE_MARGIN round it),
   * pass the gate of the answer, and the conditions of the answer or the scene must hold; then the
   * effect must apply (canApply).
   * It changes the book and the pack: the reward goes into the pack (the client shows it), and what
   * does not fit falls at the player's feet. Returns whether the book changed (the server saves it).
   */
  quest(id: number, from: { readonly npc?: number; readonly at?: readonly [number, number]; readonly scene?: string; readonly guard?: number }, effectId: string, nowMs: number): boolean {
    const player = this.players.get(id);
    if (!player || player.state.down > 0) return false;
    let found: { readonly effect?: QuestEffect; readonly gate?: Gate; readonly when?: Conditions } | null = null;
    if (from.guard !== undefined) {
      // A guard that talks (the driver of the wagon).
      const guard = this.guards.list.find((g) => g.id === from.guard);
      if (!guard || guard.state.down > 0 || Math.hypot(guard.state.x - player.state.x, guard.state.y - player.state.y) > DEAL_RANGE) return false;
      const dialog = guard.def.content?.dialog;
      found = dialog ? findEffectAnswer(dialog, effectId) : null;
    } else if (from.npc !== undefined) {
      const pose = this.npcs?.poses[from.npc];
      if (!pose || Math.hypot(pose.x - player.state.x, pose.y - player.state.y) > DEAL_RANGE) return false;
      const dialog = this.world.source.npcs?.()[from.npc]?.content.dialog;
      found = dialog ? findEffectAnswer(dialog, effectId) : null;
    } else if (from.at) {
      const [tx, ty] = from.at;
      const fixture = this.world.fixtureAt(tx, ty);
      if (!fixture || Math.hypot(tx * TILE_SIZE + TILE_SIZE / 2 - player.state.x, ty * TILE_SIZE + TILE_SIZE / 2 - player.state.y) > DEAL_RANGE) return false;
      // What the thing says and does for this character (its variant, Fixture.variant.content).
      const content = fixtureContent(fixture, player.quests, player.pack);
      found = content?.effect?.id === effectId ? { effect: content.effect } : content?.dialog ? findEffectAnswer(content.dialog, effectId) : null;
    } else if (from.scene !== undefined) {
      // The end of a scene that the player overheard: it must stand in (or near) its area.
      const scene = this.world.source.scenes?.().find((s) => s.id === from.scene);
      const tx = Math.floor(player.state.x / TILE_SIZE);
      const ty = Math.floor(player.state.y / TILE_SIZE);
      if (!scene || scene.effect.id !== effectId || !inScene(scene, tx, ty, SCENE_MARGIN)) return false;
      found = { effect: scene.effect, when: scene.when };
    }
    const effect = found?.effect;
    // What the character wears counts too (ownedPack): the Tear on its neck, which Verath takes in the dream.
    if (!effect || (found!.gate && !meetsGate(player.traits.scores, found!.gate)) || !holds(found!.when, player.quests, ownedPack(player))) return false;
    const carried = effect.take ? unwearFor(player, effect.take) : player;
    const result = applyEffect(effect, player.quests, carried.pack, player.traits.slots);
    if (!result) return false;
    if (carried.gear !== player.gear) this.dress(player, carried.gear);
    player.quests = result.book;
    player.questsChanged = true;
    player.pack = result.pack;
    player.packChanged = true;
    if (result.left.items.length > 0) this.piles.put(player.state.x, player.state.y, result.left.items, nowMs, player.state);
    if (!lootIsEmpty(result.taken) || !lootIsEmpty(result.left)) player.loot.push(toWireLoot('drop', result.taken, !lootIsEmpty(result.left)));
    return true;
  }

  /** The player drinks one item of its pack (a draught): its work is done, and one goes from the pack. */
  drink(id: number, code: number): void {
    const player = this.players.get(id);
    const kind = ITEM_KINDS[code];
    if (!player || !kind) return;
    const pack = drinkFrom(player.pack, kind, player.state, player.traits, this.dice);
    if (!pack) return;
    player.pack = pack;
    player.packChanged = true;
  }

  /**
   * The player puts `count` items of slot `slot` of its pack (of the kind with code `code`) on the
   * ground: just in front of it (dropPoint), or tossed towards `at` (tossPoint). `slot` can be a
   * worn slot (an address, gear.ts): the character takes the item off and drops it. Nothing happens
   * if the slot does not hold them, or while the player lies defeated.
   */
  put(id: number, request: { readonly slot: number; readonly kind: number; readonly count: number; readonly at?: readonly [number, number] }, nowMs: number): void {
    const player = this.players.get(id);
    if (!player) return;
    // Its client changed its own pack at once: the next snapshot gives the truth, also when nothing happens.
    player.packChanged = true;
    player.gearChanged = true;
    const kind = ITEM_KINDS[request.kind];
    if (!kind || player.state.down > 0) return;
    const worn = gearSlotAt(request.slot);
    if (worn !== null) {
      const gear = request.count === 1 ? dropWorn(player.gear, worn, kind) : null;
      if (!gear) return;
      this.dress(player, gear);
    } else {
      const pack = removeFromSlot(player.pack, request.slot, kind, request.count);
      if (!pack) return;
      player.pack = pack;
    }
    const at = request.at ? tossPoint(this.world, player.state, request.at[0], request.at[1]) : dropPoint(this.world, player.state);
    this.piles.put(at.x, at.y, [{ kind, count: request.count }], nowMs, player.state);
  }

  /**
   * The player moves an item from `from` to `to` (addresses: pack slots and worn slots): a stack in
   * the pack, or an item that its character puts on or takes off (moveItem). A defeated character
   * moves stacks in its pack, but it does not change what it wears.
   */
  move(id: number, from: number, to: number): void {
    const player = this.players.get(id);
    if (!player) return;
    // Its client moved the item at once: the next snapshot gives the truth, also when nothing moves.
    player.packChanged = true;
    const worn = gearSlotAt(from) !== null || gearSlotAt(to) !== null;
    if (worn) player.gearChanged = true;
    if (worn && player.state.down > 0) return;
    const moved = moveItem({ pack: player.pack, gear: player.gear }, from, to, player.traits.slots, player.traits.class);
    if (!moved) return;
    player.pack = moved.pack;
    if (moved.gear !== player.gear) this.dress(player, moved.gear);
  }

  /** New gear for a player: its traits follow it (its Armour Class, its damage, its walk), and the others see what shows of it. */
  private dress(player: RoomPlayer, gear: Gear): void {
    if (!sameShown(shownGear(player.gear), shownGear(gear))) this.looksVersion++;
    player.gear = gear;
    player.gearChanged = true;
    if (!player.traitsFor) return;
    player.traits = player.traitsFor(gear);
    // An amulet of health that comes off takes its hit points with it.
    player.state.hp = Math.min(player.state.hp, player.traits.maxHp);
    player.state.stamina = Math.min(player.state.stamina, player.traits.maxStamina);
  }

  /** The player picks up a pile, if it can reach it: what fits goes into the pack, the rest stays on the ground. */
  private pick(player: RoomPlayer, [, pileId]: WirePick): void {
    const pile = this.piles.get(pileId);
    if (!pile || player.state.down > 0 || !canReachPile(player.state, pile)) return;
    const result = this.piles.take(pileId, player.pack, player.traits.slots);
    if (!result) return;
    player.pack = result.pack;
    if (!lootIsEmpty(result.taken)) player.packChanged = true;
    player.loot.push(toWireLoot('pile', result.taken, !lootIsEmpty(result.left)));
  }

  /** Notes the chunks that the player sees now, for its map. */
  private explore(player: RoomPlayer): void {
    if (player.explored.size >= MAX_EXPLORED) return;
    for (const [cx, cy] of seenChunks(player.state.x, player.state.y)) {
      const key = `${cx},${cy}`;
      if (player.explored.has(key)) continue;
      player.explored.add(key);
      player.newlyExplored.push([cx, cy]);
    }
  }

  /** Acts on a fixture for a player, if it can reach it: a bed rests it; a chest gives its loot (what fits goes into the pack, the rest stays). */
  private use(player: RoomPlayer, [, tx, ty]: WireUse, nowMs: number): void {
    const fixture = reachableFixture(this.world, player.state, tx, ty);
    // A bed rests, unless its variant has something else for this character (a dream).
    if (fixture && fixtureContent(fixture, player.quests, player.pack)?.rest && (!fixture.content?.restFor || player.refuges.includes(fixture.content.restFor))) {
      rest(player.state, player.traits);
      return;
    }
    const opened = fixture ? this.spoils.open(fixture, player.pack, player.traits, nowMs) : null;
    if (!opened) return;
    if (opened === 'locked') {
      player.loot.push(toWireLoot('locked', { coins: 0, items: [] }, false));
      return;
    }
    player.pack = opened.pack;
    if (!lootIsEmpty(opened.taken)) player.packChanged = true;
    player.loot.push(toWireLoot('chest', opened.taken, opened.full));
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
      packed.set(p.id, [p.id, round(s.x), round(s.y), Math.round(s.vx), Math.round(s.vy), facingCode(s.facing), p.skin, s.attack, s.stun, s.guard, aimCode(s.aim), s.dodge, s.down]);
    }
    const doors = this.world.openDoorList();
    const forced = this.world.forcedDoorList();
    const barks = this.barks;
    this.barks = [];
    const tosses = this.piles.takeTosses().flatMap((toss) => {
      const pile = this.piles.get(toss.pile);
      return pile ? [{ wire: toWireToss(toss), x: pile.x, y: pile.y }] : [];
    });
    const names: [number, string][] = [];
    for (const p of this.players.values()) if (p.name) names.push([p.id, p.name]);
    const looks: [number, WireLook][] = [...this.players.values()].map((p) => [p.id, toWireLook(shownGear(p.gear))]);
    const mobs: WireMob[] | null = this.horde ? this.horde.mobs.map(toWireMob) : null;
    const arrows: WireArrow[] = (this.horde?.arrows ?? []).map((a) => [a.id, a.owner, round(a.x), round(a.y), aimCode(a.aim)]);
    // The guards go as companions without a leader (leader 0).
    const guards: WireCompanion[] = this.guards.list.map(({ id, def, state: c }) => [id, def.look, def.name, round(c.x), round(c.y), Math.round(c.vx), Math.round(c.vy), facingCode(c.facing), c.hp, def.hp, c.stun, c.guard, c.down, 0, c.attack]);
    const companions: WireCompanion[] = this.companions.list.map(({ id, def, state: c, leader }) => [
      id,
      def.look,
      def.name,
      round(c.x),
      round(c.y),
      Math.round(c.vx),
      Math.round(c.vy),
      facingCode(c.facing),
      c.hp,
      def.hp,
      c.stun,
      c.guard,
      c.down,
      leader,
      c.attack,
    ]);
    companions.push(...guards);
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
      const relooked = p.looksVersion !== this.looksVersion;
      p.looksVersion = this.looksVersion;
      const pack = p.packChanged;
      p.packChanged = false;
      const gear = p.gearChanged;
      p.gearChanged = false;
      const loot = p.loot;
      p.loot = [];
      const refuges = p.refugesChanged;
      p.refugesChanged = false;
      const quests = p.questsChanged;
      p.questsChanged = false;
      const woke = p.woke;
      p.woke = null;
      const blows = p.blows;
      p.blows = [];
      const explored = p.newlyExplored;
      p.newlyExplored = [];
      const piles = this.pilesNear(p);
      const key = pileKey(piles);
      const pilesChanged = key !== p.pileKey;
      p.pileKey = key;
      const tossed = tosses.filter((t) => Math.hypot(t.x - s.x, t.y - s.y) <= PILE_SEND_RADIUS).map((t) => t.wire);
      const hunters = this.horde ? this.horde.huntersOf(p.id).map((m) => m.id) : [];
      send(p.id, {
        t: 'snap',
        ms,
        a: p.seq,
        you: [
          s.x,
          s.y,
          s.vx,
          s.vy,
          facingCode(s.facing),
          s.attack,
          s.cooldown,
          s.stun,
          s.guard,
          aimCode(s.aim),
          s.dodge,
          s.dodgeCooldown,
          s.dodgeAim,
          s.hp,
          s.recover,
          s.stamina,
          s.rest,
          s.down,
          s.poison,
          s.poisonClock,
          s.drunk,
          s.wading ? 1 : 0,
          s.inspired,
          s.glance,
        ],
        p: others,
        ...(changed ? { doors, fd: forced } : {}),
        ...(pack ? { pk: toWirePack(p.pack) } : {}),
        ...(gear ? { gr: toWireGear(p.gear) } : {}),
        ...(loot.length > 0 ? { l: loot } : {}),
        ...(pilesChanged ? { pl: piles } : {}),
        ...(tossed.length > 0 ? { ts: tossed } : {}),
        ...(refuges ? { rf: [...p.refuges] } : {}),
        ...(quests ? { qs: toWireBook(p.quests) } : {}),
        ...(blows.length > 0 ? { bl: blows } : {}),
        ...(woke !== null ? { wk: woke } : {}),
        ...(explored.length > 0 ? { ex: explored } : {}),
        ...(npcs ? { n: npcs } : {}),
        ...(barks.length > 0 ? { b: barks } : {}),
        ...(renamed ? { names } : {}),
        ...(relooked ? { lk: looks } : {}),
        // The mobs near this player only: the others are far off its screen.
        ...(mobs ? { m: mobs.filter((m) => Math.hypot(m[2] - s.x, m[3] - s.y) <= MOB_SEND_RADIUS) } : {}),
        ...(arrows.length > 0 ? { ar: arrows.filter((a) => Math.hypot(a[2] - s.x, a[3] - s.y) <= MOB_SEND_RADIUS) } : {}),
        ...(hunters.length > 0 ? { h: hunters } : {}),
        ...(companions.length > 0 ? { cp: companions.filter((c) => Math.hypot(c[3] - s.x, c[4] - s.y) <= MOB_SEND_RADIUS) } : {}),
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
    const result = useDoor(this.world, player.state, tx, ty, others, player.traits);
    if (result === 'opened' || result === 'closed' || result === 'forced') this.doorVersion++;
  }
}
