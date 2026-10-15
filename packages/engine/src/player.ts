import { TICK_SECONDS, TILE_SIZE } from './constants.ts';
import type { AttackWeight } from './gear.ts';
import type { LoadTier } from './load.ts';
import type { PlayerTraits } from './traits.ts';
import { Ground, type SolidMap } from './world.ts';

/**
 * The movement intent for one tick. Each axis is in [-1, 1] and the length is at most 1. A
 * keyboard gives a unit vector; a joystick gives any length, so a small push walks slowly.
 * This is the message that a client will send to the server.
 */
export interface MoveInput {
  readonly x: number;
  readonly y: number;
  /**
   * An attack in this tick, in this direction: an angle in radians (0 east, PI / 2 south: y goes
   * down). The client picks it (the mouse, the nearest mob, or the way the player walks or faces),
   * so the server repeats the same step.
   */
  readonly attack?: number;
  /** A dodge (a roll) in this tick, the way the input moves (or `face`, or the way the player faces). */
  readonly dodge?: boolean;
  /**
   * A direction to face (radians, as `attack`) while the player stands: the client gives the way to the
   * mouse pointer when it is over the world (Fede, 2026-10-14). A player that walks faces its walk.
   */
  readonly face?: number;
}

export const NO_INPUT: MoveInput = { x: 0, y: 0 };

export type Facing = 'down' | 'up' | 'left' | 'right';

export interface PlayerState {
  /** The centre of the feet hitbox, in world pixels. */
  x: number;
  y: number;
  /** The velocity that the input asked for in the last tick, in pixels per second. */
  vx: number;
  vy: number;
  facing: Facing;
  /** The direction of the attack in progress or of the last attack (radians, as MoveInput.attack). */
  aim: number;
  /** Ticks left of the attack in progress (0: none). The player stands still while it strikes. */
  attack: number;
  /** Ticks before the player can attack again. */
  cooldown: number;
  /** Ticks left of a stun (0: none): the player cannot move or attack. A mob's hit stuns. */
  stun: number;
  /** Ticks left after a stun in which no mob can hit the player again. */
  guard: number;
  /** Ticks left of a dodge (0: none): the player rolls; in its safe ticks no mob can hit it (inSafeRoll). */
  dodge: number;
  /** Ticks before the player can dodge again. */
  dodgeCooldown: number;
  /** The direction of the dodge in progress or of the last one (radians). */
  dodgeAim: number;
  /** The kind of the roll in progress or of the last one: the tier of the load at its start (ROLLS). */
  dodgeKind: LoadTier;
  /** The safe ticks of the roll in progress or of the last one: its first ticks, in which no mob can hit (inSafeRoll). */
  dodgeSafe: number;
  /**
   * The tier of what it carries now (load.ts): the kind of its next roll. Its owner sets it from the
   * pack and the gear before each step (the Room, or the page in a world that it runs).
   */
  load: LoadTier;
  /**
   * Ticks left in which a step back braces (0: none): BRACE_WINDOW_TICKS from the end of a melee
   * attack (PlayerTraits.brace).
   */
  braceWindow: number;
  /**
   * Whether the step back is held with no release since the start of the last attack: a step back held
   * into an attack does not brace after it. A move that is not back (none, or to the side) is a release,
   * in the attack or in the brace window; a new step back then braces (Fede, 2026-10-14).
   */
  heldBack: boolean;
  /**
   * Ticks left of a brace (0: none): the player stands, faces the way it struck, and a mob's attack on
   * it rolls against more AC (PlayerTraits.braceAc). It stays at 1 while the step back is held.
   */
  brace: number;
  /**
   * Ticks left of an evade (0: none): a mob's attack missed the player in its brace, and the player
   * sways out of it where it stands. Only a look: it ends with the brace (missPlayer).
   */
  evade: number;
  /** Hit points (CON): a mob's hit takes some; at 0 the player is defeated (`down`). */
  hp: number;
  /** Ticks until a hit point comes back (while it has fewer than its most). */
  recover: number;
  /** Stamina (CON): a roll, an attack and the sneak walk use it. */
  stamina: number;
  /** Ticks since stamina was last used or the last tick of a brace (it fills again after STAMINA_REST_TICKS). */
  rest: number;
  /** Ticks left of a defeat (0: none): the player lies still; then the caller wakes it (wakePlayer). */
  down: number;
  /** Ticks left of a poison (an imp's claws), and the ticks since its last bite. */
  poison: number;
  poisonClock: number;
  /** Ticks left of a drink (ale): the walk sways. */
  drunk: number;
  /** Whether it stands in shallow water (a player who can wade); set by stepPlayer. */
  wading: boolean;
  /**
   * Ticks of guard that its next guard gets on top of its own: a hit near a player with Charisma
   * sets it (Horde, PlayerTraits.inspire), and the end of the stun uses it.
   */
  inspired: number;
  /** Ticks left of the spark of a glancing blow (0: none): a mob's attack roll that missed (glancePlayer). */
  glance: number;
  /**
   * The storey that it is on (Building.storeys): 0 is the ground, 1 the storey above it. Only stairs
   * change it (interact.ts, useStairs). It moves on the map of its storey (World.level).
   */
  storey: number;
}

/** An attack lasts this many ticks (0.3 s); a new one can start this many ticks after the last. */
export const ATTACK_TICKS = 18;
export const ATTACK_COOLDOWN_TICKS = 27;
/** After a stun, mobs cannot hit the player for this many ticks (1 s). Dexterity changes it (traits.ts). */
export const GUARD_TICKS = 60;
/**
 * A dodge is a roll the way the input moves. Its kind comes from the load of the character (load.ts;
 * Fede's decisions, 2026-10-15): `distance` world pixels in `ticks` ticks, safe in its first `safe`
 * ticks (no mob can hit it then), for `stamina`. Dexterity adds to the distance and to the safe ticks
 * (PlayerTraits.rollReach, rollSafe), but an overloaded character only steps aside, with no safe tick.
 * The next roll can start DODGE_COOLDOWN_TICKS after the start of the last (1.6 s; Dexterity changes
 * it).
 */
export interface RollDef {
  /** How far it goes (world pixels; Dexterity adds to it). */
  readonly distance: number;
  /** How long it lasts. */
  readonly ticks: number;
  /** Its first ticks, in which no mob can hit (Dexterity adds to them, up to `ticks`). */
  readonly safe: number;
  /** What it costs. */
  readonly stamina: number;
}

export const ROLLS: Readonly<Record<LoadTier, RollDef>> = {
  // 2.25 tiles in 0.25 s.
  light: { distance: 36, ticks: 15, safe: 12, stamina: 30 },
  medium: { distance: 30, ticks: 15, safe: 9, stamina: 40 },
  // A low shoulder roll that ends on one knee: 1.5 tiles in 0.3 s, as fast as a walk.
  heavy: { distance: 24, ticks: 18, safe: 6, stamina: 50 },
  // A short step aside.
  over: { distance: 12, ticks: 10, safe: 0, stamina: 50 },
};
export const DODGE_COOLDOWN_TICKS = 96;
/**
 * The brace (2026-10-14, Fede's idea): a step back right after a melee attack does not walk away. In
 * the first BRACE_WINDOW_TICKS after the attack (0.15 s) a move away from the way of the attack
 * (BRACE_BACK) starts a brace: the player stands where it is, faces the way it struck, and tenses for
 * BRACE_TICKS (0.3 s), and longer while it holds the step back. A mob's blow or arrow that reaches it
 * in the brace rolls against more AC (PlayerTraits.braceAc: BRACE_AC and DEX; armourNow). A miss
 * keeps the brace, and the player sways out of the blow (an evade of EVADE_TICKS, 0.25 s: only a
 * look); a hit stuns it, and the brace ends. Then the player walks again (a step back later than the
 * window is a walk: the kite). An attack or a roll breaks a brace. Each brace needs a new step back: a
 * step back held into the attack does not brace, until a release (heldBack; Fede, 2026-10-14). A brace
 * costs no stamina, but stamina does not fill in it.
 */
export const BRACE_WINDOW_TICKS = 9;
export const BRACE_TICKS = 18;
export const EVADE_TICKS = 15;
/** A move is "back" when the cosine of its angle to the way of the attack is at most this (120 degrees or more). */
export const BRACE_BACK = -0.5;
/**
 * A player that walks at this share of PLAYER_SPEED or slower, or stands, sneaks: mobs see it from
 * half as far (mobs.ts, HordePlayer.sight).
 */
export const SNEAK_SPEED = 0.5;
/** The hit points (HP) and the stamina of a player with CON 10 (traits.ts changes them). */
export const PLAIN_HP = 18;
export const PLAIN_STAMINA = 100;
/** Stamina that comes back each second (CON 10), STAMINA_REST_TICKS after it was last used. */
export const STAMINA_REFILL = 20;
export const STAMINA_REST_TICKS = 60;
/** While the player walks, only this share of the refill comes back (Fede, 2026-10-15): staminaRefillNow. */
export const WALK_REFILL_SHARE = 0.25;
/** The sneak walk costs this much stamina each second (a roll: ROLLS). */
export const SNEAK_STAMINA = 8;
/**
 * An attack costs this much stamina, by the weight of what it attacks with (gear.ts, AttackWeight; an
 * arrow of a longbow is heavy). Only a character pays (PlayerTraits.attackStamina): guards and
 * companions do not (Fede's decisions, 2026-10-14).
 */
export const ATTACK_STAMINA: Readonly<Record<AttackWeight, number>> = { light: 4, plain: 6, heavy: 10 };
/** With less stamina than its attack costs, the attack still comes, but the next one waits this many times as long. */
export const TIRED_COOLDOWN = 2;
/** After a hit, the first HP comes back this many ticks later (8 s), then one every RECOVER_TICKS (CON 10). */
export const RECOVER_DELAY_TICKS = 480;
export const RECOVER_TICKS = 480;
/** A defeated player lies this many ticks (3 s); it wakes with a guard of WAKE_GUARD_TICKS. */
export const DOWN_TICKS = 180;
export const WAKE_GUARD_TICKS = 120;
/** A poison bites every POISON_EVERY ticks: POISON_DAMAGE hit points, never the last (about the 2d4 of a quasit's poison over its time). */
export const POISON_EVERY = 180;
export const POISON_DAMAGE = 2;
/** A drink of ale lasts this many ticks (60 s with CON 10); its sway turns the walk by up to DRUNK_SWAY radians. */
export const ALE_TICKS = 3600;
export const DRUNK_SWAY = 0.45;
/** An attack hits a mob whose centre is this close (plus the mob's radius), in front of the player. */
export const ATTACK_REACH = 22;
/** "In front": at most this angle (radians) from the side that the attack goes to. */
export const ATTACK_ARC = 1.25;

/** The speed at full input, in world pixels per second (5 tiles per second). */
export const PLAYER_SPEED = 80;
/** In shallow water a player who can wade walks at this share of the speed, and cannot attack. */
export const WADE_SPEED = 0.5;

/** A map for the movement of a player: what is solid, and (to wade) the ground of a tile. */
export interface PlayerMap extends SolidMap {
  ground?(tx: number, ty: number): Ground;
}

/**
 * What stepPlayer() needs of the traits of a player. A trait that is not given has its plain value
 * (every score 10): no wading, ATTACK_COOLDOWN_TICKS, GUARD_TICKS, DODGE_COOLDOWN_TICKS, the roll of
 * ROLLS with no Dexterity, and no brace and no stamina for an attack (a guard or a companion: only a
 * character braces and pays).
 */
export type StepTraits = Partial<
  Pick<PlayerTraits, 'wade' | 'swim' | 'cooldown' | 'guard' | 'dodgeCooldown' | 'rollReach' | 'rollSafe' | 'maxHp' | 'recover' | 'maxStamina' | 'staminaRefill' | 'speed' | 'brace' | 'attackStamina'>
>;
const PLAIN: StepTraits = {};

/** Whether the centre of a player's feet is in shallow water. */
export function inShallows(world: PlayerMap, x: number, y: number): boolean {
  return world.ground?.(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE)) === Ground.Shallows;
}

/** Whether the centre of a player's feet is in water, deep or shallow. */
export function inWater(world: PlayerMap, x: number, y: number): boolean {
  const ground = world.ground?.(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE));
  return ground === Ground.Shallows || ground === Ground.Water;
}

/** Whether a player with these traits wades where it stands: in shallows (it can wade), or in deep water too (it can swim). */
function wadingAt(world: PlayerMap, x: number, y: number, traits: StepTraits): boolean {
  if (traits.swim) return inWater(world, x, y);
  return traits.wade === true && inShallows(world, x, y);
}

const wadeMaps = new WeakMap<PlayerMap, SolidMap>();
const swimMaps = new WeakMap<PlayerMap, SolidMap>();

/** The map as a player who can swim sees it: all water is open (nothing else stands in it). */
function swimMap(world: PlayerMap): SolidMap {
  if (!world.ground) return world;
  let map = swimMaps.get(world);
  if (!map) {
    map = {
      solidBox: (tx, ty) => {
        const ground = world.ground!(tx, ty);
        return ground === Ground.Shallows || ground === Ground.Water ? null : world.solidBox(tx, ty);
      },
    };
    swimMaps.set(world, map);
  }
  return map;
}

/** The map as a player who can wade sees it: shallow water is open (nothing else stands in it). */
function wadeMap(world: PlayerMap): SolidMap {
  if (!world.ground) return world;
  let map = wadeMaps.get(world);
  if (!map) {
    map = { solidBox: (tx, ty) => (world.ground!(tx, ty) === Ground.Shallows ? null : world.solidBox(tx, ty)) };
    wadeMaps.set(world, map);
  }
  return map;
}

/** The feet hitbox is 10 x 6 pixels. Only the feet collide, so the head can overlap a wall. */
export const PLAYER_HALF_WIDTH = 5;
export const PLAYER_HALF_HEIGHT = 3;

export function createPlayer(x: number, y: number): PlayerState {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    facing: 'down',
    aim: facingAngle('down'),
    attack: 0,
    cooldown: 0,
    stun: 0,
    guard: 0,
    dodge: 0,
    dodgeCooldown: 0,
    dodgeAim: 0,
    dodgeKind: 'light',
    dodgeSafe: 0,
    load: 'light',
    braceWindow: 0,
    heldBack: false,
    brace: 0,
    evade: 0,
    hp: PLAIN_HP,
    recover: 0,
    stamina: PLAIN_STAMINA,
    rest: STAMINA_REST_TICKS,
    down: 0,
    poison: 0,
    poisonClock: 0,
    drunk: 0,
    wading: false,
    inspired: 0,
    glance: 0,
    storey: 0,
  };
}

/** The spark of a glancing blow shows this many ticks (0.3 s). */
export const GLANCE_TICKS = 18;

/**
 * A mob's hit that its attack roll lands (the caller rolls it against the player's Armour Class:
 * dice.ts, attackRoll): a stun (shorter with CON: `traits.stun`), `damage` hit points, and a poison
 * of `poisonTicks` (shorter with CON: `traits.resist`). At 0 HP the player is defeated: it lies for
 * DOWN_TICKS, and then its caller wakes it. Returns true (the player was hurt).
 */
export function hitPlayer(player: PlayerState, damage: number, stunTicks: number, poisonTicks: number, traits: Partial<Pick<PlayerTraits, 'stun' | 'resist'>> = {}): boolean {
  stunPlayer(player, Math.max(1, Math.round(stunTicks * (traits.stun ?? 1))));
  player.hp = Math.max(0, player.hp - damage);
  player.recover = RECOVER_DELAY_TICKS;
  if (poisonTicks > 0) player.poison = Math.max(player.poison, Math.round(poisonTicks * (traits.resist ?? 1)));
  if (player.hp === 0) {
    player.down = DOWN_TICKS;
    player.stun = 0;
    player.inspired = 0;
    player.dodge = 0;
    player.evade = 0;
    player.poison = 0;
    player.poisonClock = 0;
  }
  return true;
}

/** A mob's attack that its roll misses: it glances off the player's armour (a spark, no stun, no damage). */
export function glancePlayer(player: PlayerState): void {
  player.glance = GLANCE_TICKS;
}

/**
 * A mob's attack (a blow, an arrow, a guard's swing on a robber) that its roll missed. In a brace the
 * player sways out of it where it stands (an evade: a look only), and the brace goes on; else the
 * attack glances off its armour (glancePlayer).
 */
export function missPlayer(player: PlayerState): void {
  if (player.brace > 0) player.evade = EVADE_TICKS;
  else glancePlayer(player);
}

/** The Armour Class that a mob's attack roll must reach now: `ac`, and `braceAc` more in a brace (PlayerTraits.braceAc). */
export function armourNow(player: PlayerState, ac: number, braceAc = 0): number {
  return player.brace > 0 ? ac + braceAc : ac;
}

/** A defeated player wakes at (x, y) on the ground storey with all its HP and stamina, a guard, and no poison or drink. */
export function wakePlayer(player: PlayerState, x: number, y: number, traits: Partial<Pick<PlayerTraits, 'maxHp' | 'maxStamina'>> = {}): void {
  player.x = x;
  player.y = y;
  player.storey = 0;
  player.vx = 0;
  player.vy = 0;
  player.down = 0;
  player.hp = traits.maxHp ?? PLAIN_HP;
  player.recover = 0;
  player.stamina = traits.maxStamina ?? PLAIN_STAMINA;
  player.rest = STAMINA_REST_TICKS;
  player.guard = WAKE_GUARD_TICKS;
  player.stun = 0;
  player.attack = 0;
  player.dodge = 0;
  player.braceWindow = 0;
  player.heldBack = false;
  player.brace = 0;
  player.evade = 0;
  player.poison = 0;
  player.poisonClock = 0;
  player.drunk = 0;
}

/** Whether the player can start an attack in its next tick. */
export function canAttack(player: PlayerState): boolean {
  return player.down === 0 && player.stun === 0 && player.attack === 0 && player.cooldown === 0 && player.dodge === 0;
}

/** Whether the player can start a dodge in its next tick: it has the stamina of the roll of its load (and it is not in shallow water: see stepPlayer). */
export function canDodge(player: PlayerState): boolean {
  return player.down === 0 && player.stun === 0 && player.attack === 0 && player.dodge === 0 && player.dodgeCooldown === 0 && player.stamina >= ROLLS[player.load].stamina;
}

/** Whether the player is in the safe ticks of a roll (the first PlayerState.dodgeSafe ticks of it). */
export function inSafeRoll(player: Pick<PlayerState, 'dodge' | 'dodgeKind' | 'dodgeSafe'>): boolean {
  return player.dodge > 0 && ROLLS[player.dodgeKind].ticks - player.dodge <= player.dodgeSafe;
}

/**
 * Whether a mob can hit the player now: not defeated, not stunned, not just after a stun, and not in
 * the safe ticks of a roll. A brace and its evade do not stop a hit: in a brace the attack rolls
 * against more AC (armourNow).
 */
export function canBeHit(player: PlayerState): boolean {
  return player.down === 0 && player.stun === 0 && player.guard === 0 && !inSafeRoll(player);
}

/**
 * The roll of a character with these traits and this load: the distance and the safe ticks with its
 * Dexterity (an overloaded character steps aside with no safe tick).
 */
export function rollOf(load: LoadTier, traits: Pick<StepTraits, 'rollReach' | 'rollSafe'> = PLAIN): RollDef {
  const roll = ROLLS[load];
  return {
    distance: Math.max(1, roll.distance + (traits.rollReach ?? 0)),
    ticks: roll.ticks,
    safe: roll.safe === 0 ? 0 : Math.min(roll.ticks, Math.max(0, roll.safe + (traits.rollSafe ?? 0))),
    stamina: roll.stamina,
  };
}

/** Whether a velocity is a sneak walk: slower than SNEAK_SPEED, but not standing. */
export function isSneakWalk(vx: number, vy: number): boolean {
  const speed = Math.hypot(vx, vy);
  return speed > 1 && speed <= PLAYER_SPEED * SNEAK_SPEED + 0.01;
}

/**
 * Whether the player sneaks: it stands, or it walks slowly (SNEAK_SPEED) with stamina left; not in
 * shallow water (the water makes it slow, not the player), not while it strikes, braces, evades, rolls
 * or lies.
 */
export function isSneaking(player: Pick<PlayerState, 'vx' | 'vy' | 'attack' | 'dodge' | 'down' | 'stamina' | 'wading'> & Partial<Pick<PlayerState, 'brace' | 'evade'>>): boolean {
  if (player.attack > 0 || player.dodge > 0 || player.down > 0 || player.wading || (player.brace ?? 0) > 0 || (player.evade ?? 0) > 0) return false;
  if (Math.hypot(player.vx, player.vy) <= 1) return true;
  return isSneakWalk(player.vx, player.vy) && player.stamina > 0;
}

/** A hit: the player stops, its attack (and a brace) ends, and it cannot act for `ticks` ticks. */
export function stunPlayer(player: PlayerState, ticks: number): void {
  player.stun = Math.max(player.stun, ticks);
  player.attack = 0;
  // A hit after the safe ticks of a roll ends the roll.
  player.dodge = 0;
  player.braceWindow = 0;
  player.brace = 0;
  player.evade = 0;
  player.vx = 0;
  player.vy = 0;
}

/** An angle in (-PI, PI]. */
export function normalAngle(angle: number): number {
  const a = angle - 2 * Math.PI * Math.round(angle / (2 * Math.PI));
  return a === -Math.PI ? Math.PI : a;
}

/** The angle of a facing, in radians (y down). */
export function facingAngle(facing: Facing): number {
  return facing === 'right' ? 0 : facing === 'down' ? Math.PI / 2 : facing === 'left' ? Math.PI : -Math.PI / 2;
}

/** The facing nearest to a direction (radians). An exact diagonal faces up or down. */
export function facingOfAngle(angle: number): Facing {
  const a = normalAngle(angle);
  if (Math.abs(a) < Math.PI / 4) return 'right';
  if (Math.abs(a) > (3 * Math.PI) / 4) return 'left';
  return a > 0 ? 'down' : 'up';
}

/** A player that faces a direction (MoveInput.face) keeps its facing until the direction is this far past the diagonal (6 degrees). */
export const FACE_SLACK = Math.PI / 30;

/**
 * The facing for a direction to face (MoveInput.face). The current facing stays while the direction is
 * within 45 degrees + FACE_SLACK of it, so the sprite does not flicker when the mouse is near a diagonal.
 */
export function facingToward(current: Facing, angle: number): Facing {
  return Math.abs(normalAngle(angle - facingAngle(current))) <= Math.PI / 4 + FACE_SLACK ? current : facingOfAngle(angle);
}

/**
 * Whether an attack from (px, py) in the direction `aim` (radians) hits a thing at (x, y) with
 * radius `radius`: close enough, and in front (or so close that the direction does not matter).
 */
export function attackHits(px: number, py: number, aim: number, x: number, y: number, radius: number, reach = ATTACK_REACH): boolean {
  const dx = x - px;
  const dy = y - py;
  const d = Math.hypot(dx, dy);
  if (d > reach + radius) return false;
  if (d <= radius + 4) return true;
  return (dx * Math.cos(aim) + dy * Math.sin(aim)) / d >= Math.cos(ATTACK_ARC);
}

/**
 * Makes an input safe to use: it replaces values that are not finite with 0, limits the length
 * to 1, puts the directions of an attack and of `face` in (-PI, PI], and drops a direction that is
 * not finite. The server must apply this to every input from a client.
 */
export function clampInput(input: MoveInput): MoveInput {
  const x = Number.isFinite(input.x) ? input.x : 0;
  const y = Number.isFinite(input.y) ? input.y : 0;
  const length = Math.hypot(x, y);
  const move: { x: number; y: number; attack?: number; dodge?: boolean; face?: number } = length > 1 ? { x: x / length, y: y / length } : { x, y };
  if (input.attack !== undefined && Number.isFinite(input.attack)) move.attack = normalAngle(input.attack);
  if (input.dodge === true) move.dodge = true;
  if (input.face !== undefined && Number.isFinite(input.face)) move.face = normalAngle(input.face);
  return move;
}

/**
 * Selects the facing for a move. On a diagonal the current facing stays while it still points
 * along the move, so the sprite does not flicker between two directions.
 */
export function facingFor(current: Facing, move: MoveInput): Facing {
  const ax = Math.abs(move.x);
  const ay = Math.abs(move.y);
  if (ax < 0.01 && ay < 0.01) return current;
  const along =
    (current === 'left' && move.x < 0) ||
    (current === 'right' && move.x > 0) ||
    (current === 'up' && move.y < 0) ||
    (current === 'down' && move.y > 0);
  const horizontal = current === 'left' || current === 'right';
  if (along && (horizontal ? ax >= 0.7 * ay : ay >= 0.7 * ax)) return current;
  if (ax > ay) return move.x < 0 ? 'left' : 'right';
  return move.y < 0 ? 'up' : 'down';
}

/**
 * Moves a feet box (centre `body`, half sizes hw and hh) along one axis, then pushes it out of
 * each solid box that it overlaps. One of dx and dy must be 0. The step must be less than one
 * tile, so the box cannot pass through a solid box. Players and mobs move with it.
 */
export function moveAxis(body: { x: number; y: number }, world: SolidMap, dx: number, dy: number, hw = PLAYER_HALF_WIDTH, hh = PLAYER_HALF_HEIGHT): void {
  if (dx === 0 && dy === 0) return;
  body.x += dx;
  body.y += dy;
  const tx0 = Math.floor((body.x - hw) / TILE_SIZE);
  const tx1 = Math.floor((body.x + hw) / TILE_SIZE);
  const ty0 = Math.floor((body.y - hh) / TILE_SIZE);
  const ty1 = Math.floor((body.y + hh) / TILE_SIZE);
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const box = world.solidBox(tx, ty);
      if (!box) continue;
      const bx0 = tx * TILE_SIZE + box[0];
      const by0 = ty * TILE_SIZE + box[1];
      const bx1 = tx * TILE_SIZE + box[2];
      const by1 = ty * TILE_SIZE + box[3];
      const overlaps = body.x + hw > bx0 && body.x - hw < bx1 && body.y + hh > by0 && body.y - hh < by1;
      if (!overlaps) continue;
      if (dx > 0) body.x = bx0 - hw;
      else if (dx < 0) body.x = bx1 + hw;
      else if (dy > 0) body.y = by0 - hh;
      else body.y = by1 + hh;
    }
  }
}

/** Whether a feet box (centre (x, y), half sizes hw and hh) is clear of every solid box. */
export function feetFit(world: SolidMap, x: number, y: number, hw = PLAYER_HALF_WIDTH, hh = PLAYER_HALF_HEIGHT): boolean {
  for (let ty = Math.floor((y - hh) / TILE_SIZE); ty <= Math.floor((y + hh) / TILE_SIZE); ty++) {
    for (let tx = Math.floor((x - hw) / TILE_SIZE); tx <= Math.floor((x + hw) / TILE_SIZE); tx++) {
      const box = world.solidBox(tx, ty);
      if (!box) continue;
      const bx0 = tx * TILE_SIZE + box[0];
      const by0 = ty * TILE_SIZE + box[1];
      const bx1 = tx * TILE_SIZE + box[2];
      const by1 = ty * TILE_SIZE + box[3];
      if (x + hw > bx0 && x - hw < bx1 && y + hh > by0 && y - hh < by1) return false;
    }
  }
  return true;
}

/**
 * Where a player starts again at a stored point (the place of a character): the point itself if
 * its feet fit there, else the nearest open tile. The world can differ from when the point was
 * stored: a door that was open is closed now, for example.
 */
export function resumePoint(
  world: SolidMap & { findSpawn(tx: number, ty: number, clearance?: number): { x: number; y: number } },
  x: number,
  y: number,
): { x: number; y: number } {
  return feetFit(world, x, y) ? { x, y } : world.findSpawn(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE), 0);
}

/**
 * Where a character that was last at (x, y) on a storey starts again: as resumePoint() on the map of
 * that storey (World.level); on the ground storey if the storey is not there any more (a building
 * without it now).
 */
export function resumePlace(
  world: { level(storey: number): SolidMap & { findSpawn(tx: number, ty: number, clearance?: number): { x: number; y: number } } },
  x: number,
  y: number,
  storey = 0,
): { x: number; y: number; storey: number } {
  if (storey > 0) {
    const level = world.level(storey);
    const tx = Math.floor(x / TILE_SIZE);
    const ty = Math.floor(y / TILE_SIZE);
    // The storey is still there if the tile is open on it, or one near it.
    if (feetFit(level, x, y)) return { x, y, storey };
    try {
      return { ...level.findSpawn(tx, ty, 0), storey };
    } catch {
      // No such storey near: the ground storey.
    }
  }
  return { ...resumePoint(world.level(0), x, y), storey: 0 };
}

/**
 * Advances one player by one tick. This is the authoritative rule: the client runs it for
 * prediction and the server runs it to decide the true state. A stunned player and a player
 * that strikes stand still. A player who can wade (`traits`) walks in shallow water, slowly, and
 * does not attack there; one who can swim (the Tear of Tigris) does the same in deep water. A step
 * back right after a melee attack braces: the player stands for BRACE_TICKS, and longer while it holds
 * the step back. Returns true if an attack starts in this tick: the caller finds what it hits (a
 * client alone, or the server).
 */
export function stepPlayer(player: PlayerState, input: MoveInput, world: PlayerMap, traits: StepTraits = PLAIN, dt = TICK_SECONDS): boolean {
  if (player.cooldown > 0) player.cooldown--;
  if (player.dodgeCooldown > 0) player.dodgeCooldown--;
  if (player.glance > 0) player.glance--;
  if (player.down > 0) {
    // Defeated: it lies still. When `down` ends, the caller wakes it at a safe place (wakePlayer).
    player.down--;
    player.vx = 0;
    player.vy = 0;
    return false;
  }
  body(player, traits, dt);
  if (player.stun > 0) {
    player.stun--;
    if (player.stun === 0) {
      player.guard = (traits.guard ?? GUARD_TICKS) + player.inspired;
      player.inspired = 0;
    }
    player.vx = 0;
    player.vy = 0;
    return false;
  }
  if (player.guard > 0) player.guard--;
  const solid = traits.swim ? swimMap(world) : traits.wade ? wadeMap(world) : world;
  if (player.dodge > 0) {
    roll(player, world, solid, traits, dt);
    return false;
  }
  const input0 = clampInput(input);
  // After an ale the walk sways: the direction turns to and fro, slowly.
  const move = player.drunk > 0 ? swayed(input0, player.drunk) : input0;
  // A move that is not back releases a step back that was held into the attack: a new one braces.
  const back = movesBack(move, player.aim);
  if (!back) player.heldBack = false;
  if (player.attack > 0) {
    player.attack--;
    player.vx = 0;
    player.vy = 0;
    // The end of a melee attack: a step back now braces.
    if (player.attack === 0 && traits.brace) player.braceWindow = BRACE_WINDOW_TICKS;
    return false;
  }
  const wading = wadingAt(world, player.x, player.y, traits);
  const window = player.braceWindow;
  if (player.braceWindow > 0) player.braceWindow--;
  const kind = move.dodge ? rollOf(player.load, traits) : null;
  if (kind && player.dodgeCooldown === 0 && player.stamina >= kind.stamina && !wading) {
    player.braceWindow = 0;
    player.brace = 0;
    player.evade = 0;
    player.stamina -= kind.stamina;
    player.rest = 0;
    // A roll the way the input moves; when it stands, towards `face` (the mouse), or the way it faces.
    player.dodgeAim = Math.hypot(move.x, move.y) > 0.1 ? Math.atan2(move.y, move.x) : (move.face ?? facingAngle(player.facing));
    player.facing = facingOfAngle(player.dodgeAim);
    player.dodge = kind.ticks;
    player.dodgeKind = player.load;
    player.dodgeSafe = kind.safe;
    player.dodgeCooldown = traits.dodgeCooldown ?? DODGE_COOLDOWN_TICKS;
    roll(player, world, solid, traits, dt);
    return false;
  }
  if (move.attack !== undefined && player.cooldown === 0 && !wading) {
    player.braceWindow = 0;
    player.brace = 0;
    player.evade = 0;
    player.attack = ATTACK_TICKS;
    // A step back that is held into the attack does not brace after it (heldBack).
    player.heldBack = movesBack(move, move.attack);
    // The attack costs stamina (a character); with too little, the next attack waits longer.
    const cost = traits.attackStamina ?? 0;
    const tired = cost > 0 && player.stamina < cost;
    if (cost > 0) {
      player.stamina = Math.max(0, player.stamina - cost);
      player.rest = 0;
    }
    player.cooldown = (traits.cooldown ?? ATTACK_COOLDOWN_TICKS) * (tired ? TIRED_COOLDOWN : 1);
    player.aim = move.attack;
    player.facing = facingOfAngle(move.attack);
    player.vx = 0;
    player.vy = 0;
    return true;
  }
  if (player.brace === 0 && window > 0 && !wading && back && !player.heldBack) {
    player.braceWindow = 0;
    player.brace = BRACE_TICKS;
  }
  if (player.brace > 0) {
    // A brace: it stands and faces the way it struck. It lasts BRACE_TICKS, and stays at its last
    // tick while the step back is held. An evade (a miss in the brace) sways it, and ends with it.
    if (player.brace > 1 || !back) player.brace--;
    if (player.evade > 0) player.evade--;
    if (player.brace === 0) player.evade = 0;
    // Stamina does not fill in a brace: it fills again STAMINA_REST_TICKS after its end.
    player.rest = 0;
    player.facing = facingOfAngle(player.aim);
    player.vx = 0;
    player.vy = 0;
    return false;
  }
  const speed = PLAYER_SPEED * (traits.speed ?? 1) * (wading ? WADE_SPEED : 1);
  player.vx = move.x * speed;
  player.vy = move.y * speed;
  // It faces its walk; when it stands, the direction to face (the mouse), if the input gives one.
  const stands = Math.abs(move.x) < 0.01 && Math.abs(move.y) < 0.01;
  player.facing = stands && move.face !== undefined ? facingToward(player.facing, move.face) : facingFor(player.facing, move);
  // One axis at a time, so the player slides along a wall instead of a full stop.
  moveAxis(player, solid, player.vx * dt, 0);
  moveAxis(player, solid, 0, player.vy * dt);
  // The sneak walk uses stamina (not a slow walk in water: the water makes it slow).
  if (!wading && isSneakWalk(player.vx, player.vy) && player.stamina > 0) {
    player.stamina = Math.max(0, player.stamina - SNEAK_STAMINA * dt);
    player.rest = 0;
  }
  player.wading = wadingAt(world, player.x, player.y, traits);
  return false;
}

/**
 * One tick of the body: hit points come back out of a fight (only with a `recover`: a companion; a
 * character's is 0, level-3.md), stamina fills, a poison bites, a drink wears off.
 */
function body(player: PlayerState, traits: StepTraits, dt: number): void {
  const maxHp = traits.maxHp ?? PLAIN_HP;
  if (player.hp > 0 && player.hp < maxHp && (traits.recover ?? RECOVER_TICKS) > 0) {
    if (player.recover > 0) player.recover--;
    if (player.recover === 0) {
      player.hp++;
      player.recover = traits.recover ?? RECOVER_TICKS;
    }
  }
  if (player.rest < STAMINA_REST_TICKS) player.rest++;
  else player.stamina = Math.min(traits.maxStamina ?? PLAIN_STAMINA, player.stamina + staminaRefillNow(player, traits) * dt);
  if (player.poison > 0) {
    player.poison--;
    player.poisonClock++;
    if (player.poisonClock >= POISON_EVERY) {
      // A poison never takes the last hit point.
      player.poisonClock = 0;
      if (player.hp > 1) {
        player.hp = Math.max(1, player.hp - POISON_DAMAGE);
        player.recover = RECOVER_DELAY_TICKS;
      }
    }
    if (player.poison === 0) player.poisonClock = 0;
  }
  if (player.drunk > 0) player.drunk--;
}

/**
 * The stamina that comes back each second now: none in the STAMINA_REST_TICKS after a use, all of
 * `staminaRefill` while the player stands, and WALK_REFILL_SHARE of it while it walks (its velocity of
 * the last tick: a walk in water and a walk into a wall too). The sneak walk uses stamina, so none
 * comes back in it.
 */
export function staminaRefillNow(player: Pick<PlayerState, 'rest' | 'vx' | 'vy'>, traits: Pick<StepTraits, 'staminaRefill'>): number {
  if (player.rest < STAMINA_REST_TICKS) return 0;
  const refill = traits.staminaRefill ?? STAMINA_REFILL;
  return Math.hypot(player.vx, player.vy) > 1 ? refill * WALK_REFILL_SHARE : refill;
}

/** Whether a move goes away from the direction `aim` (radians): BRACE_BACK. */
function movesBack(move: MoveInput, aim: number): boolean {
  const length = Math.hypot(move.x, move.y);
  if (length < 0.1) return false;
  return (move.x * Math.cos(aim) + move.y * Math.sin(aim)) / length <= BRACE_BACK;
}

/** A move turned by the sway of a drink, which changes slowly with the ticks left. */
function swayed(move: MoveInput, drunk: number): MoveInput {
  const turn = DRUNK_SWAY * Math.sin(drunk * 0.05) * Math.sin(drunk * 0.013 + 1);
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  return { ...move, x: move.x * cos - move.y * sin, y: move.x * sin + move.y * cos };
}

/** One tick of a dodge: fast along its direction (the roll of its kind: rollOf); walls stop it, and shallow water ends it. */
function roll(player: PlayerState, world: PlayerMap, solid: SolidMap, traits: StepTraits, dt: number): void {
  player.dodge--;
  const kind = ROLLS[player.dodgeKind];
  const speed = Math.max(1, kind.distance + (traits.rollReach ?? 0)) / (kind.ticks * TICK_SECONDS);
  player.vx = Math.cos(player.dodgeAim) * speed;
  player.vy = Math.sin(player.dodgeAim) * speed;
  moveAxis(player, solid, player.vx * dt, 0);
  moveAxis(player, solid, 0, player.vy * dt);
  if (inShallows(world, player.x, player.y)) player.dodge = 0;
}
