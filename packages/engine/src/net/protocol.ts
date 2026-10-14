import { TILE_SIZE } from '../constants.ts';
import { EMPTY_GEAR, GEAR_BASE, GEAR_SLOTS, SHOWN_SLOTS, fitsSlot, type Gear, type GearSlot, type ShownGear, type ShownSlot } from '../gear.ts';
import { ITEM_KINDS, ITEM_STACK, MAX_SLOTS, type ItemKind, type ItemStack, type Loot, type Pack, type PackSlot } from '../items.ts';
import { MOB_KINDS, MOB_STATES, type Mob, type MobKind, type MobState } from '../mobs.ts';
import type { Pile, Toss } from '../piles.ts';
import { clampInput, normalAngle, type Facing, type MoveInput } from '../player.ts';
import { QUEST_ID, checkQuests, type QuestBook } from '../quests.ts';

/**
 * The multiplayer protocol: JSON messages over one WebSocket. The client sends its inputs, the
 * server runs every player with the same stepPlayer() and sends snapshots of the truth. See
 * docs/multiplayer.md.
 *
 * Change PROTOCOL_VERSION when a message changes. A client with another version is refused, and
 * it tells the visitor to reload the page.
 */
export const PROTOCOL_VERSION = 45;

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
/** The most chests opened in one message. */
export const MAX_USES_PER_MESSAGE = 2;
/** The most piles picked up in one message. */
export const MAX_PICKS_PER_MESSAGE = 2;
/** The most uses of stairs in one message (protocol 39). */
export const MAX_STAIRS_PER_MESSAGE = 2;
/** The server sends the mobs this close to a player (world pixels): far beyond the screen. */
export const MOB_SEND_RADIUS = 30 * TILE_SIZE;
/** The server sends the other players this close to a player (world pixels): far beyond the screen (protocol 38). */
export const PLAYER_SEND_RADIUS = 30 * TILE_SIZE;
/** The server sends the piles (items on the ground) this close to a player (world pixels). */
export const PILE_SEND_RADIUS = 30 * TILE_SIZE;
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
 * An input on the wire: each axis as a whole number from -100 to 100; for an attack a third
 * number, 1 + the code of its direction (aimCode), or 0 for none; for a dodge a fourth number, 1
 * (0 for none); for a direction to face (MoveInput.face; protocol 45) a fifth number, 1 + its code.
 * The client applies the input that it sends, not the one that it read, so the server can repeat
 * the same step.
 */
export type WireInput =
  | readonly [number, number]
  | readonly [number, number, number]
  | readonly [number, number, number, number]
  | readonly [number, number, number, number, number];

const INPUT_SCALE = 100;

export function toWireInput(input: MoveInput): WireInput {
  const q = (v: number) => Math.max(-INPUT_SCALE, Math.min(INPUT_SCALE, Math.round(v * INPUT_SCALE)));
  const { attack, dodge, face } = clampInput(input);
  const a = attack !== undefined ? 1 + aimCode(attack) : 0;
  if (face !== undefined) return [q(input.x), q(input.y), a, dodge ? 1 : 0, 1 + aimCode(face)];
  if (dodge) return [q(input.x), q(input.y), a, 1];
  return a > 0 ? [q(input.x), q(input.y), a] : [q(input.x), q(input.y)];
}

export function fromWireInput(wire: WireInput): MoveInput {
  const move: { x: number; y: number; attack?: number; dodge?: boolean; face?: number } = { x: wire[0] / INPUT_SCALE, y: wire[1] / INPUT_SCALE };
  if (wire.length >= 3 && wire[2]! > 0) move.attack = aimFromCode(wire[2]! - 1);
  if (wire.length >= 4 && wire[3] === 1) move.dodge = true;
  if (wire.length === 5 && wire[4]! > 0) move.face = aimFromCode(wire[4]! - 1);
  return clampInput(move);
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

/**
 * A chest that the player opens: [seq, tx, ty], a tile of the chest. It happens just before the
 * input with sequence number `seq`, as a door action. The server answers with loot (WireLoot).
 */
export type WireUse = readonly [number, number, number];

/**
 * A pile on the ground that the player picks up: [seq, pile id]. It happens just before the input
 * with sequence number `seq`, as a door action, so the server checks the reach where the player
 * was. The server answers with loot (WireLoot, source 3).
 */
export type WirePick = readonly [number, number];

/**
 * Stairs (or a stairwell) that the player uses: [seq, tx, ty], a tile of them on its storey
 * (interact.ts, useStairs; protocol 39). It happens just before the input with sequence number
 * `seq`, as a door action, and the client takes the player to the other storey at once, as the
 * server does.
 */
export type WireStairs = readonly [number, number, number];

/** A batch of inputs. `s` is the sequence number of the first input; the others follow it, one per tick. */
export interface InputMessage {
  readonly t: 'in';
  readonly s: number;
  readonly i: readonly WireInput[];
  readonly d?: readonly WireDoor[];
  readonly k?: readonly WireAttack[];
  readonly u?: readonly WireUse[];
  readonly g?: readonly WirePick[];
  /** Stairs that the player used (protocol 39). */
  readonly c?: readonly WireStairs[];
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

/**
 * A deal in a conversation (dialog.ts, Deal): with an NPC (`npc`: its index in WorldSource.npcs())
 * or with a fixture (`at`: a tile of it, the cauldron), and `deal`, the id of the deal in its dialog.
 * The server checks that the NPC or the fixture is near, the gate of the answer, and the coins and
 * items; then it takes them and gives the goods.
 */
export interface DealMessage {
  readonly t: 'deal';
  readonly npc?: number;
  readonly at?: readonly [number, number];
  readonly deal: string;
}

/** The player drinks one item of its pack (items.ts, DRINKS): `kind` is its code (ITEM_KINDS). */
export interface DrinkMessage {
  readonly t: 'drink';
  readonly kind: number;
}

/**
 * The player puts `count` items from slot `slot` of its pack on the ground; the slot must hold
 * them, of `kind` (its code, ITEM_KINDS). `slot` can be a worn slot too (an address: gear.ts,
 * GEAR_BASE), with a count of 1. Without `at`, they fall just in front of the player (dropPoint);
 * with `at` (a point of the world, in whole pixels), the player tosses them towards it
 * (tossPoint). They lie there as a pile (piles.ts) until someone picks them up.
 */
export interface PutMessage {
  readonly t: 'put';
  readonly slot: number;
  readonly kind: number;
  readonly count: number;
  readonly at?: readonly [number, number];
}

/**
 * The player moves an item from `from` to `to`: slots of its pack, or worn slots (addresses:
 * gear.ts, GEAR_BASE). Between pack slots it moves a stack (moveInPack); onto a worn slot the
 * character puts the item on, and from one it takes it off (inventory.ts, moveItem).
 */
export interface MoveMessage {
  readonly t: 'move';
  readonly from: number;
  readonly to: number;
}

/**
 * An effect on a quest (quests.ts, QuestEffect): an answer in a conversation with an NPC (`npc`: its
 * index in WorldSource.npcs()), a thing that the player reads (`at`: a tile of it, the letter), or
 * the end of a scene that it overheard (`scene`: its id; protocol 24), and `effect`, the id of the
 * effect there. The server checks the nearness (or the area of the scene), the gate and the
 * conditions, and the effect; then it changes the book and the pack (protocol 23).
 */
export interface QuestMessage {
  readonly t: 'quest';
  readonly npc?: number;
  readonly at?: readonly [number, number];
  readonly scene?: string;
  /** A guard that talks (guards.ts, GuardDef.content: the wagon of the caravan), by its id (protocol 31). */
  readonly guard?: number;
  readonly effect: string;
}

export type ClientMessage = HelloMessage | InputMessage | SkinMessage | NameMessage | PingMessage | DealMessage | DrinkMessage | PutMessage | MoveMessage | QuestMessage;

/** What a blow did to a mob (mobs.ts, BlowResult): [mob id, damage (0: a miss), 1 for a critical hit else 0]. */
export type WireBlow = readonly [number, number, 0 | 1];

export function toWireBlow(result: { readonly mob: { readonly id: number }; readonly damage: number; readonly crit: boolean }): WireBlow {
  return [result.mob.id, result.damage, result.crit ? 1 : 0];
}

/** A quest book on the wire: [quest, step, order, flags] for each quest (quests.ts). */
export type WireBook = readonly (readonly [string, string, number, readonly string[]])[];

export function toWireBook(book: QuestBook): WireBook {
  return Object.entries(book).map(([quest, e]) => [quest, e.step, e.n, [...e.flags]] as const);
}

/** A book from the wire (checkQuests checks it). */
export function fromWireBook(wire: WireBook): QuestBook {
  return checkQuests(Object.fromEntries(wire.map(([quest, step, n, flags]) => [quest, { step, n, flags }])));
}

/** A player's skin changes at most this often (ms): every change makes every other client render a skin. */
export const SKIN_CHANGE_GAP_MS = 2000;

// ---------------------------------------------------------------- server to client

/**
 * A player as others see it: [id, x, y, vx, vy, facing code, skin, attack, stun, guard, aim
 * code, dodge, down, storey, brace, evade]: attack, stun, guard, dodge, down, brace and evade are
 * the ticks left, as in PlayerState; the aim code is the direction of its attack (aimCode); the
 * storey is the storey of a building that it is on (0: the ground; protocol 39). The brace and the
 * evade: protocol 42 (a held brace stays at 1: protocol 43). Positions to 0.1 px.
 */
export type WirePlayer = readonly [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];

/**
 * A player's own true state: [x, y, vx, vy, facing code, attack, cooldown, stun, guard, aim code,
 * dodge, dodge cooldown, dodge direction (radians, exact), hp, recover, stamina (exact), rest,
 * down, poison, poison clock, drunk, wading (0 or 1), inspired, glance, storey (protocol 39), brace
 * window, brace, evade (protocol 42), held back (0 or 1: PlayerState.heldBack, protocol 44)].
 */
export type WireSelf = readonly [
  number, number, number, number, number, number, number, number, number, number, number, number, number,
  number, number, number, number, number, number, number, number, number, number, number, number,
  number, number, number, number,
];

/**
 * A companion (companions.ts): [id, look, name, x, y, vx, vy, facing code, hp, most hp, stun,
 * guard, down, the id of its leader]. Positions to 0.1 px; stun, guard and down are ticks.
 */
/**
 * A companion or a guard: [id, look, name, x, y, vx, vy, facing code, hp, most hp, stun, guard, down,
 * leader (0 for a guard), ticks left of its attack (protocol 32)].
 */
export type WireCompanion = readonly [number, string, string, number, number, number, number, number, number, number, number, number, number, number, number];

/** An arrow in flight: [id, the id of its shooter, x, y, aim code]. Positions to 0.1 px. */
export type WireArrow = readonly [number, number, number, number, number];

/** A mob: [id, kind code, x, y, vx, vy, facing code, state code, ms in the state, health left]. Positions to 0.1 px. */
/**
 * A mob on the wire: [id, kind code, x, y, vx, vy, facing code, state code, ms in the state, health,
 * runes left in a rite (0 outside one), 1 while its weapon burns else 0] (the last two: protocol 29).
 */
export type WireMob = readonly [number, number, number, number, number, number, number, number, number, number, number, number];

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
    mob.runes ?? 0,
    mob.burning !== undefined ? 1 : 0,
  ];
}

/** Items on the wire: [item code (ITEM_KINDS), count]. */
export type WireStacks = readonly (readonly [number, number])[];

/** The slots of a pack on the wire, in order: [item code, count], or null for a free slot. */
export type WireSlots = readonly (readonly [number, number] | null)[];

/** A pack on the wire: [coins, slots]. */
export type WirePack = readonly [number, WireSlots];

/** The gear on the wire: an item code (ITEM_KINDS) for each worn slot, in the order of GEAR_SLOTS, or -1 for an empty one. */
export type WireGear = readonly number[];

export function toWireGear(gear: Gear): WireGear {
  return GEAR_SLOTS.map((slot) => {
    const kind = gear[slot];
    return kind === null ? -1 : ITEM_KINDS.indexOf(kind);
  });
}

/** The gear of the wire; a code that this client does not know, or a kind that does not fit its slot, shows as empty. */
export function fromWireGear(wire: WireGear): Gear {
  const gear: Record<GearSlot, ItemKind | null> = { ...EMPTY_GEAR };
  GEAR_SLOTS.forEach((slot, i) => {
    const kind = ITEM_KINDS[wire[i] ?? -1];
    if (kind && fitsSlot(kind, slot)) gear[slot] = kind;
  });
  return gear;
}

/** What shows of a player's gear on the wire: an item code for each slot of SHOWN_SLOTS, or -1 for none. */
export type WireLook = readonly number[];

export function toWireLook(shown: ShownGear): WireLook {
  return SHOWN_SLOTS.map((slot) => {
    const kind = shown[slot];
    return kind === null ? -1 : ITEM_KINDS.indexOf(kind);
  });
}

/** The shown gear of the wire; a code that this client does not know, or a kind that does not fit its slot, shows as nothing. */
export function fromWireLook(wire: WireLook): ShownGear {
  const shown = Object.fromEntries(SHOWN_SLOTS.map((slot) => [slot, null])) as Record<ShownSlot, ItemKind | null>;
  SHOWN_SLOTS.forEach((slot, i) => {
    const kind = ITEM_KINDS[wire[i] ?? -1];
    if (kind && fitsSlot(kind, slot)) shown[slot] = kind;
  });
  return shown;
}

/** Whether a number is an address of the inventory: a slot of the pack, or a worn slot. */
function isAddress(value: unknown): value is number {
  return isInt(value, 0, MAX_SLOTS - 1) || isInt(value, GEAR_BASE, GEAR_BASE + GEAR_SLOTS.length - 1);
}

export function toWireStacks(items: readonly ItemStack[]): WireStacks {
  return items.map((s) => [ITEM_KINDS.indexOf(s.kind), s.count] as const);
}

/** The stacks of the wire; a code that this client does not know is left out. */
export function fromWireStacks(wire: WireStacks): ItemStack[] {
  const out: ItemStack[] = [];
  for (const [code, count] of wire) {
    const kind = ITEM_KINDS[code];
    if (kind) out.push({ kind, count });
  }
  return out;
}

export function toWirePack(pack: Pack): WirePack {
  return [pack.coins, pack.items.map((s) => (s ? ([ITEM_KINDS.indexOf(s.kind), s.count] as const) : null))];
}

/** A pack of the wire; a slot with a code that this client does not know shows as free. */
export function fromWirePack(wire: WirePack): Pack {
  return {
    coins: wire[0],
    items: wire[1].map((slot): PackSlot => {
      const kind = slot ? ITEM_KINDS[slot[0]] : undefined;
      return slot && kind ? { kind, count: slot[1] } : null;
    }),
  };
}

/**
 * Loot that the player got: [source, coins, stacks, full]. Source 0: a chest that it opened (no
 * coins and no stacks: the chest is empty); 1: what a mob that it killed dropped; 2: a chest with
 * a lock that the player could not pick (no loot); 3: a pile on the ground that it picked up.
 * Full 1: the pack is full, and something stayed in the chest or on the ground.
 */
export type WireLoot = readonly [0 | 1 | 2 | 3, number, WireStacks, 0 | 1];

export const LOOT_SOURCES = ['chest', 'drop', 'locked', 'pile'] as const;
export type LootSource = (typeof LOOT_SOURCES)[number];

export function toWireLoot(source: LootSource, loot: Loot, full: boolean): WireLoot {
  return [LOOT_SOURCES.indexOf(source) as 0 | 1 | 2 | 3, loot.coins, toWireStacks(loot.items), full ? 1 : 0];
}

/** A pile on the ground (piles.ts): [id, x, y, item code (ITEM_KINDS), count, storey (protocol 39)]. Positions in whole pixels. */
export type WirePile = readonly [number, number, number, number, number, number];

export function toWirePile(pile: Pile): WirePile {
  return [pile.id, pile.x, pile.y, ITEM_KINDS.indexOf(pile.kind), pile.count, pile.storey ?? 0];
}

/** The piles of the wire; a pile of a kind that this client does not know is left out. */
export function fromWirePiles(wire: readonly WirePile[]): Pile[] {
  const out: Pile[] = [];
  for (const [id, x, y, code, count, storey] of wire) {
    const kind = ITEM_KINDS[code];
    if (kind) out.push({ id, x, y, kind, count, ...(storey > 0 ? { storey } : {}) });
  }
  return out;
}

/** A toss (piles.ts): [pile id, x, y]: items fell from (x, y) onto that pile. Positions in whole pixels. */
export type WireToss = readonly [number, number, number];

export function toWireToss(toss: Toss): WireToss {
  return [toss.pile, toss.fromX, toss.fromY];
}

export function fromWireToss([pile, fromX, fromY]: WireToss): Toss {
  return { pile, fromX, fromY };
}

/** The reply to hello: who the player is, where it starts, which doors are open and forced, its pack, HP and refuges, and the piles near it. */
export interface WelcomeMessage {
  readonly t: 'welcome';
  readonly id: number;
  readonly x: number;
  readonly y: number;
  /** The storey where it starts (Building.storeys; protocol 39): 0, the ground. */
  readonly st: number;
  /** Its hit points now (the server keeps them with the character). */
  readonly hp: number;
  readonly rf: readonly string[];
  /** The chunks that its character has seen, [cx, cy] (the map). */
  readonly ex: readonly (readonly [number, number])[];
  readonly doors: readonly (readonly [number, number])[];
  /** The barred doors that are forced now (World.forcedDoorList). */
  readonly fd: readonly (readonly [number, number])[];
  readonly pk: WirePack;
  /** What its character wears (gear.ts). */
  readonly gr: WireGear;
  /** Its character's quest book (protocol 23). */
  readonly qs: WireBook;
  /** Its character's XP (protocol 41): its level comes from it (experience.ts). */
  readonly xp: number;
  /** The piles on the ground near the player (within PILE_SEND_RADIUS). */
  readonly pl: readonly WirePile[];
}

/**
 * The state of the world for one player. `ms` is the server's clock; `a` is the last input of
 * this player that the server has applied; `you` is its true state (WireSelf), at full
 * precision; `p` holds the other players near it, and `o` counts all of them. `doors` comes
 * only when the doors changed.
 */
export interface SnapshotMessage {
  readonly t: 'snap';
  readonly ms: number;
  readonly a: number;
  readonly you: WireSelf;
  /** The other players within PLAYER_SEND_RADIUS of this player (protocol 38: before, all of them). */
  readonly p: readonly WirePlayer[];
  /** The number of other players in the world, near or far (protocol 38). */
  readonly o: number;
  readonly doors?: readonly (readonly [number, number])[];
  /** The forced doors: it comes with `doors`. */
  readonly fd?: readonly (readonly [number, number])[];
  /** The player's pack, when it changed. */
  readonly pk?: WirePack;
  /** What the player wears, when it changed. */
  readonly gr?: WireGear;
  /** The player's quest book, when it changed (protocol 23). Only the player gets its own book. */
  readonly qs?: WireBook;
  /** The player's XP, when it changed (protocol 41: a kill, a quest). Only the player gets its own. */
  readonly xp?: number;
  /** What the player's blows and arrows did since the last snapshot (protocol 26): [mob id, damage (0: a miss), 1 for a critical hit]. */
  readonly bl?: readonly WireBlow[];
  /** What shows of the gear of every player (SHOWN_SLOTS), `[id, look]`, when one changed or a player came or went (protocol 20). */
  readonly lk?: readonly (readonly [number, WireLook])[];
  /** The loot that the player got since the last snapshot. */
  readonly l?: readonly WireLoot[];
  /** The piles on the ground near this player (within PILE_SEND_RADIUS): all of them, when they changed. */
  readonly pl?: readonly WirePile[];
  /** The tosses onto piles near this player since the last snapshot: the client shows the items fall. */
  readonly ts?: readonly WireToss[];
  /** The companions near this player (within MOB_SEND_RADIUS), when there are some (protocol 22). */
  readonly cp?: readonly WireCompanion[];
  /** In a world with mobs: the arrows in flight near this player (within MOB_SEND_RADIUS). */
  readonly ar?: readonly WireArrow[];
  /** The refuges that the player's character has entered, when they changed (WorldSource.refuges). */
  readonly rf?: readonly string[];
  /** The coins that a defeat took, when the player woke since the last snapshot. */
  readonly wk?: number;
  /** Chunks that the player's character saw for the first time, [cx, cy] (the map). */
  readonly ex?: readonly (readonly [number, number])[];
  /** The world's NPCs, in the order of WorldSource.npcs(): [x, y, vx, vy, facing code, away?]. */
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
  /** In a world with mobs: the ids of the mobs that hunt this player (Horde.huntersOf), when there are any. */
  readonly h?: readonly number[];
}

/**
 * An NPC as the clients see it: [x, y, vx, vy, facing code], and a 1 at the end while it is away (in its
 * house for the night: NpcPose.away; the clients do not show it). Positions to 0.1 px.
 */
export type WireNpc = readonly [number, number, number, number, number, 1?];

/** Why the server does not let a client in. The client then plays alone. */
/** `account`: the server has accounts, and the visitor is not signed in or the character is not its own. */
/** `elsewhere`: the account signed in on another device, which ended this session (it can come at any time). */
export type RefusalReason = 'version' | 'world' | 'full' | 'busy' | 'account' | 'elsewhere';

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
        (Array.isArray(v) && v.length === 3 && isInt(v[0], -INPUT_SCALE, INPUT_SCALE) && isInt(v[1], -INPUT_SCALE, INPUT_SCALE) && isInt(v[2], 1, AIM_STEPS)) ||
        (Array.isArray(v) &&
          v.length === 4 &&
          isInt(v[0], -INPUT_SCALE, INPUT_SCALE) &&
          isInt(v[1], -INPUT_SCALE, INPUT_SCALE) &&
          isInt(v[2], 0, AIM_STEPS) &&
          v[3] === 1) ||
        (Array.isArray(v) &&
          v.length === 5 &&
          isInt(v[0], -INPUT_SCALE, INPUT_SCALE) &&
          isInt(v[1], -INPUT_SCALE, INPUT_SCALE) &&
          isInt(v[2], 0, AIM_STEPS) &&
          isInt(v[3], 0, 1) &&
          isInt(v[4], 1, AIM_STEPS));
      if (!m.i.every(inputShaped)) return null;
      const inputs = m.i as WireInput[];
      let attacks: WireAttack[] | undefined;
      if (m.k !== undefined) {
        const attackShaped = (k: unknown) => Array.isArray(k) && k.length === 2 && isInt(k[0], 1, SEQ_LIMIT) && typeof k[1] === 'number' && Number.isFinite(k[1]);
        if (!Array.isArray(m.k) || m.k.length > MAX_ATTACKS_PER_MESSAGE || !m.k.every(attackShaped)) return null;
        attacks = m.k as WireAttack[];
      }
      let doors: WireDoor[] | undefined;
      if (m.d !== undefined) {
        const doorShaped = (d: unknown) =>
          Array.isArray(d) &&
          d.length === 4 &&
          isInt(d[0], 1, SEQ_LIMIT) &&
          isInt(d[1], -TILE_LIMIT, TILE_LIMIT) &&
          isInt(d[2], -TILE_LIMIT, TILE_LIMIT) &&
          isInt(d[3], 0, 1);
        if (!Array.isArray(m.d) || m.d.length > MAX_DOORS_PER_MESSAGE || !m.d.every(doorShaped)) return null;
        doors = m.d as WireDoor[];
      }
      let uses: WireUse[] | undefined;
      if (m.u !== undefined) {
        const useShaped = (u: unknown) =>
          Array.isArray(u) && u.length === 3 && isInt(u[0], 1, SEQ_LIMIT) && isInt(u[1], -TILE_LIMIT, TILE_LIMIT) && isInt(u[2], -TILE_LIMIT, TILE_LIMIT);
        if (!Array.isArray(m.u) || m.u.length > MAX_USES_PER_MESSAGE || !m.u.every(useShaped)) return null;
        uses = m.u as WireUse[];
      }
      let picks: WirePick[] | undefined;
      if (m.g !== undefined) {
        const pickShaped = (g: unknown) => Array.isArray(g) && g.length === 2 && isInt(g[0], 1, SEQ_LIMIT) && isInt(g[1], 1, SEQ_LIMIT);
        if (!Array.isArray(m.g) || m.g.length > MAX_PICKS_PER_MESSAGE || !m.g.every(pickShaped)) return null;
        picks = m.g as WirePick[];
      }
      let stairs: WireStairs[] | undefined;
      if (m.c !== undefined) {
        const stairsShaped = (c: unknown) =>
          Array.isArray(c) && c.length === 3 && isInt(c[0], 1, SEQ_LIMIT) && isInt(c[1], -TILE_LIMIT, TILE_LIMIT) && isInt(c[2], -TILE_LIMIT, TILE_LIMIT);
        if (!Array.isArray(m.c) || m.c.length > MAX_STAIRS_PER_MESSAGE || !m.c.every(stairsShaped)) return null;
        stairs = m.c as WireStairs[];
      }
      return {
        t: 'in',
        s: m.s,
        i: inputs,
        ...(doors ? { d: doors } : {}),
        ...(attacks ? { k: attacks } : {}),
        ...(uses ? { u: uses } : {}),
        ...(picks ? { g: picks } : {}),
        ...(stairs ? { c: stairs } : {}),
      };
    }
    case 'skin':
      return isSkin(m.skin) ? { t: 'skin', skin: m.skin } : null;
    case 'name':
      return typeof m.name === 'string' && m.name.length <= 4 * NAME_MAX ? { t: 'name', name: cleanName(m.name) } : null;
    case 'ping':
      return typeof m.c === 'number' && Number.isFinite(m.c) ? { t: 'ping', c: m.c } : null;
    case 'deal': {
      if (typeof m.deal !== 'string' || !/^[a-z0-9-]{1,32}$/.test(m.deal)) return null;
      if (isInt(m.npc, 0, 1000) && m.at === undefined) return { t: 'deal', npc: m.npc, deal: m.deal };
      if (m.npc === undefined && isPair(m.at, -TILE_LIMIT, TILE_LIMIT)) return { t: 'deal', at: m.at as [number, number], deal: m.deal };
      return null;
    }
    case 'quest': {
      if (typeof m.effect !== 'string' || !QUEST_ID.test(m.effect)) return null;
      const from = [m.npc, m.at, m.scene, m.guard].filter((v) => v !== undefined).length;
      if (from !== 1) return null;
      if (isInt(m.npc, 0, 1000)) return { t: 'quest', npc: m.npc, effect: m.effect };
      if (isInt(m.guard, 0, 0x7fffffff)) return { t: 'quest', guard: m.guard, effect: m.effect };
      if (isPair(m.at, -TILE_LIMIT, TILE_LIMIT)) return { t: 'quest', at: m.at as [number, number], effect: m.effect };
      if (typeof m.scene === 'string' && QUEST_ID.test(m.scene)) return { t: 'quest', scene: m.scene, effect: m.effect };
      return null;
    }
    case 'drink':
      return isInt(m.kind, 0, 255) ? { t: 'drink', kind: m.kind } : null;
    case 'put': {
      const kind = ITEM_KINDS[m.kind as number];
      if (!isAddress(m.slot) || !isInt(m.kind, 0, 255) || !kind || !isInt(m.count, 1, ITEM_STACK[kind])) return null;
      if (m.at !== undefined && !isPair(m.at, -TILE_LIMIT * TILE_SIZE, TILE_LIMIT * TILE_SIZE)) return null;
      return { t: 'put', slot: m.slot, kind: m.kind, count: m.count, ...(m.at === undefined ? {} : { at: m.at as [number, number] }) };
    }
    case 'move':
      return isAddress(m.from) && isAddress(m.to) && m.from !== m.to ? { t: 'move', from: m.from, to: m.to } : null;
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
