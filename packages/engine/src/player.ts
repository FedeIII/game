import { TICK_SECONDS, TILE_SIZE } from './constants.ts';
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
  /** A dodge (a roll) in this tick, the way the input moves (or the way the player faces). */
  readonly dodge?: boolean;
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
  /** Ticks left of a dodge (0: none): the player rolls, and no mob can hit it. */
  dodge: number;
  /** Ticks before the player can dodge again. */
  dodgeCooldown: number;
  /** The direction of the dodge in progress or of the last one (radians). */
  dodgeAim: number;
  /** Hit points (CON): a mob's hit takes some; at 0 the player is defeated (`down`). */
  hp: number;
  /** Ticks until a hit point comes back (while it has fewer than its most). */
  recover: number;
  /** Stamina (CON): a roll and the sneak walk use it. */
  stamina: number;
  /** Ticks since stamina was last used (it fills again after STAMINA_REST_TICKS). */
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
}

/** An attack lasts this many ticks (0.3 s); a new one can start this many ticks after the last. */
export const ATTACK_TICKS = 18;
export const ATTACK_COOLDOWN_TICKS = 27;
/** After a stun, mobs cannot hit the player for this many ticks (1 s). Dexterity changes it (traits.ts). */
export const GUARD_TICKS = 60;
/**
 * A dodge is a roll of DODGE_DISTANCE world pixels in DODGE_TICKS ticks (2 tiles in 0.25 s:
 * faster than an imp), in which no mob can hit the player. The next can start DODGE_COOLDOWN_TICKS
 * after it starts (1.6 s; Dexterity changes it).
 */
export const DODGE_TICKS = 15;
export const DODGE_DISTANCE = 32;
export const DODGE_COOLDOWN_TICKS = 96;
/**
 * A player that walks at this share of PLAYER_SPEED or slower, or stands, sneaks: mobs see it from
 * half as far (mobs.ts, HordePlayer.sight).
 */
export const SNEAK_SPEED = 0.5;
/** The hit points (HP) and the stamina of a player with CON 10 (traits.ts changes them). */
export const PLAIN_HP = 4;
export const PLAIN_STAMINA = 100;
/** Stamina that comes back each second (CON 10), STAMINA_REST_TICKS after it was last used. */
export const STAMINA_REFILL = 20;
export const STAMINA_REST_TICKS = 60;
/** A roll costs this much stamina; the sneak walk this much each second. */
export const DODGE_STAMINA = 35;
export const SNEAK_STAMINA = 8;
/** After a hit, the first HP comes back this many ticks later (8 s), then one every RECOVER_TICKS (CON 10). */
export const RECOVER_DELAY_TICKS = 480;
export const RECOVER_TICKS = 480;
/** A defeated player lies this many ticks (3 s); it wakes with a guard of WAKE_GUARD_TICKS. */
export const DOWN_TICKS = 180;
export const WAKE_GUARD_TICKS = 120;
/** A poison bites every POISON_EVERY ticks (one HP, never the last). */
export const POISON_EVERY = 180;
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
 * (every score 10): no wading, ATTACK_COOLDOWN_TICKS, GUARD_TICKS, DODGE_COOLDOWN_TICKS.
 */
export type StepTraits = Partial<Pick<PlayerTraits, 'wade' | 'cooldown' | 'guard' | 'dodgeCooldown' | 'maxHp' | 'recover' | 'maxStamina' | 'staminaRefill'>>;
const PLAIN: StepTraits = {};

/** Whether the centre of a player's feet is in shallow water. */
export function inShallows(world: PlayerMap, x: number, y: number): boolean {
  return world.ground?.(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE)) === Ground.Shallows;
}

const wadeMaps = new WeakMap<PlayerMap, SolidMap>();

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
  };
}

/**
 * A mob's hit: a stun (shorter with CON: `traits.stun`), `damage` hit points, and a poison of
 * `poisonTicks` (shorter with CON: `traits.resist`). The first HP comes back RECOVER_DELAY_TICKS
 * later. At 0 HP the player is defeated: it lies for DOWN_TICKS, and then its caller wakes it.
 */
export function hitPlayer(player: PlayerState, damage: number, stunTicks: number, poisonTicks: number, traits: Partial<Pick<PlayerTraits, 'stun' | 'resist'>> = {}): void {
  stunPlayer(player, Math.max(1, Math.round(stunTicks * (traits.stun ?? 1))));
  player.hp = Math.max(0, player.hp - damage);
  player.recover = RECOVER_DELAY_TICKS;
  if (poisonTicks > 0) player.poison = Math.max(player.poison, Math.round(poisonTicks * (traits.resist ?? 1)));
  if (player.hp === 0) {
    player.down = DOWN_TICKS;
    player.stun = 0;
    player.inspired = 0;
    player.dodge = 0;
    player.poison = 0;
    player.poisonClock = 0;
  }
}

/** A defeated player wakes at (x, y) with all its HP and stamina, a guard, and no poison or drink. */
export function wakePlayer(player: PlayerState, x: number, y: number, traits: Partial<Pick<PlayerTraits, 'maxHp' | 'maxStamina'>> = {}): void {
  player.x = x;
  player.y = y;
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
  player.poison = 0;
  player.poisonClock = 0;
  player.drunk = 0;
}

/** Whether the player can start an attack in its next tick. */
export function canAttack(player: PlayerState): boolean {
  return player.down === 0 && player.stun === 0 && player.attack === 0 && player.cooldown === 0 && player.dodge === 0;
}

/** Whether the player can start a dodge in its next tick: it has the stamina (and it is not in shallow water: see stepPlayer). */
export function canDodge(player: PlayerState): boolean {
  return player.down === 0 && player.stun === 0 && player.attack === 0 && player.dodge === 0 && player.dodgeCooldown === 0 && player.stamina >= DODGE_STAMINA;
}

/** Whether a mob can hit the player now: not defeated, not stunned, not just after a stun, and not in a dodge. */
export function canBeHit(player: PlayerState): boolean {
  return player.down === 0 && player.stun === 0 && player.guard === 0 && player.dodge === 0;
}

/** Whether a velocity is a sneak walk: slower than SNEAK_SPEED, but not standing. */
export function isSneakWalk(vx: number, vy: number): boolean {
  const speed = Math.hypot(vx, vy);
  return speed > 1 && speed <= PLAYER_SPEED * SNEAK_SPEED + 0.01;
}

/**
 * Whether the player sneaks: it stands, or it walks slowly (SNEAK_SPEED) with stamina left; not in
 * shallow water (the water makes it slow, not the player), not while it strikes, rolls or lies.
 */
export function isSneaking(player: Pick<PlayerState, 'vx' | 'vy' | 'attack' | 'dodge' | 'down' | 'stamina' | 'wading'>): boolean {
  if (player.attack > 0 || player.dodge > 0 || player.down > 0 || player.wading) return false;
  if (Math.hypot(player.vx, player.vy) <= 1) return true;
  return isSneakWalk(player.vx, player.vy) && player.stamina > 0;
}

/** A hit: the player stops, its attack ends, and it cannot act for `ticks` ticks. */
export function stunPlayer(player: PlayerState, ticks: number): void {
  player.stun = Math.max(player.stun, ticks);
  player.attack = 0;
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

/**
 * Whether an attack from (px, py) in the direction `aim` (radians) hits a thing at (x, y) with
 * radius `radius`: close enough, and in front (or so close that the direction does not matter).
 */
export function attackHits(px: number, py: number, aim: number, x: number, y: number, radius: number): boolean {
  const dx = x - px;
  const dy = y - py;
  const d = Math.hypot(dx, dy);
  if (d > ATTACK_REACH + radius) return false;
  if (d <= radius + 4) return true;
  return (dx * Math.cos(aim) + dy * Math.sin(aim)) / d >= Math.cos(ATTACK_ARC);
}

/**
 * Makes an input safe to use: it replaces values that are not finite with 0, limits the length
 * to 1, puts the direction of an attack in (-PI, PI], and drops an attack without a finite
 * direction. The server must apply this to every input from a client.
 */
export function clampInput(input: MoveInput): MoveInput {
  const x = Number.isFinite(input.x) ? input.x : 0;
  const y = Number.isFinite(input.y) ? input.y : 0;
  const length = Math.hypot(x, y);
  const move: { x: number; y: number; attack?: number; dodge?: boolean } = length > 1 ? { x: x / length, y: y / length } : { x, y };
  if (input.attack !== undefined && Number.isFinite(input.attack)) move.attack = normalAngle(input.attack);
  if (input.dodge === true) move.dodge = true;
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
 * Advances one player by one tick. This is the authoritative rule: the client runs it for
 * prediction and the server runs it to decide the true state. A stunned player and a player
 * that strikes stand still. A player who can wade (`traits`) walks in shallow water, slowly, and
 * does not attack there. Returns true if an attack starts in this tick: the caller finds what it
 * hits (a client alone, or the server).
 */
export function stepPlayer(player: PlayerState, input: MoveInput, world: PlayerMap, traits: StepTraits = PLAIN, dt = TICK_SECONDS): boolean {
  if (player.cooldown > 0) player.cooldown--;
  if (player.dodgeCooldown > 0) player.dodgeCooldown--;
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
  const solid = traits.wade ? wadeMap(world) : world;
  if (player.dodge > 0) {
    roll(player, world, solid, dt);
    return false;
  }
  if (player.attack > 0) {
    player.attack--;
    player.vx = 0;
    player.vy = 0;
    return false;
  }
  const input0 = clampInput(input);
  const wading = traits.wade === true && inShallows(world, player.x, player.y);
  // After an ale the walk sways: the direction turns to and fro, slowly.
  const move = player.drunk > 0 ? swayed(input0, player.drunk) : input0;
  if (move.dodge && player.dodgeCooldown === 0 && player.stamina >= DODGE_STAMINA && !wading) {
    player.stamina -= DODGE_STAMINA;
    player.rest = 0;
    // A roll the way the input moves, or the way the player faces when it stands.
    player.dodgeAim = Math.hypot(move.x, move.y) > 0.1 ? Math.atan2(move.y, move.x) : facingAngle(player.facing);
    player.facing = facingOfAngle(player.dodgeAim);
    player.dodge = DODGE_TICKS;
    player.dodgeCooldown = traits.dodgeCooldown ?? DODGE_COOLDOWN_TICKS;
    roll(player, world, solid, dt);
    return false;
  }
  if (move.attack !== undefined && player.cooldown === 0 && !wading) {
    player.attack = ATTACK_TICKS;
    player.cooldown = traits.cooldown ?? ATTACK_COOLDOWN_TICKS;
    player.aim = move.attack;
    player.facing = facingOfAngle(move.attack);
    player.vx = 0;
    player.vy = 0;
    return true;
  }
  const speed = wading ? PLAYER_SPEED * WADE_SPEED : PLAYER_SPEED;
  player.vx = move.x * speed;
  player.vy = move.y * speed;
  player.facing = facingFor(player.facing, move);
  // One axis at a time, so the player slides along a wall instead of a full stop.
  moveAxis(player, solid, player.vx * dt, 0);
  moveAxis(player, solid, 0, player.vy * dt);
  // The sneak walk uses stamina (not a slow walk in water: the water makes it slow).
  if (!wading && isSneakWalk(player.vx, player.vy) && player.stamina > 0) {
    player.stamina = Math.max(0, player.stamina - SNEAK_STAMINA * dt);
    player.rest = 0;
  }
  player.wading = traits.wade === true && inShallows(world, player.x, player.y);
  return false;
}

/** One tick of the body: hit points come back out of a fight, stamina fills, a poison bites, a drink wears off. */
function body(player: PlayerState, traits: StepTraits, dt: number): void {
  const maxHp = traits.maxHp ?? PLAIN_HP;
  if (player.hp > 0 && player.hp < maxHp) {
    if (player.recover > 0) player.recover--;
    if (player.recover === 0) {
      player.hp++;
      player.recover = traits.recover ?? RECOVER_TICKS;
    }
  }
  if (player.rest < STAMINA_REST_TICKS) player.rest++;
  else player.stamina = Math.min(traits.maxStamina ?? PLAIN_STAMINA, player.stamina + (traits.staminaRefill ?? STAMINA_REFILL) * dt);
  if (player.poison > 0) {
    player.poison--;
    player.poisonClock++;
    if (player.poisonClock >= POISON_EVERY) {
      // A poison never takes the last hit point.
      player.poisonClock = 0;
      if (player.hp > 1) {
        player.hp--;
        player.recover = RECOVER_DELAY_TICKS;
      }
    }
    if (player.poison === 0) player.poisonClock = 0;
  }
  if (player.drunk > 0) player.drunk--;
}

/** A move turned by the sway of a drink, which changes slowly with the ticks left. */
function swayed(move: MoveInput, drunk: number): MoveInput {
  const turn = DRUNK_SWAY * Math.sin(drunk * 0.05) * Math.sin(drunk * 0.013 + 1);
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  return { ...move, x: move.x * cos - move.y * sin, y: move.x * sin + move.y * cos };
}

/** One tick of a dodge: fast along its direction; walls stop it, and shallow water ends it. */
function roll(player: PlayerState, world: PlayerMap, solid: SolidMap, dt: number): void {
  player.dodge--;
  const speed = DODGE_DISTANCE / (DODGE_TICKS * TICK_SECONDS);
  player.vx = Math.cos(player.dodgeAim) * speed;
  player.vy = Math.sin(player.dodgeAim) * speed;
  moveAxis(player, solid, player.vx * dt, 0);
  moveAxis(player, solid, 0, player.vy * dt);
  if (inShallows(world, player.x, player.y)) player.dodge = 0;
}
