import { TICK_SECONDS, TILE_SIZE } from './constants.ts';
import { attackRoll, rollDice, type DiceSource } from './dice.ts';
import { MOB_STATS, type Blow, type Horde, type HordePlayer, type Mob } from './mobs.ts';
import { ATTACK_REACH, DOWN_TICKS, PLAYER_HALF_WIDTH, attackHits, canBeHit, createPlayer, facingFor, glancePlayer, hitPlayer, resumePoint, stepPlayer, type MoveInput, type PlayerState } from './player.ts';
import type { Interaction } from './fixtures.ts';
import type { World } from './world.ts';

/**
 * Guards (story phase 5, the caravan of chapter 1.5.1): NPCs that fight. A guard has the body of a
 * player (a PlayerState: the same walk, collision, hits and defeat), a group (its caravan), and a
 * route that it walks while nothing threatens it. A guard with a blow fights: it goes for the nearest
 * mob of the story (Mob.story) or mob that hunts its group, near its group's anchor (the wagon), and
 * for a character who is an outlaw of its group (a robber); its swing is a player's (stepPlayer), and it rolls as a player's blow (Horde.strike).
 * A guard without a blow (the wagon) never fights. Mobs hunt guards as they hunt companions; an
 * outlaw's blows hit them (Guards.strike). A guard that falls dies. The Room runs them in a shared
 * world; the page in a world that it runs.
 */

/** The ids of guards start here: the ids of players are small, and those of companions start at 1,000,000. */
export const GUARD_IDS = 2_000_000;
/** A fighting guard sees a foe this far away (world pixels), and goes no further than GUARD_LEASH from its anchor: further than a goblin shoots. */
export const GUARD_SIGHT = 10 * TILE_SIZE;
export const GUARD_LEASH = 12 * TILE_SIZE;
/** A guard's hit on a character stuns it for this many ticks (as a hobgoblin's). */
const GUARD_STUN_TICKS = 70;
/** It is at a point of its route this close (world pixels). */
const ROUTE_REACH = 6;
/** A guard that talks stops for a character this close (world pixels). */
export const GUARD_HOLD = 24;
/** A guard waits when it is this many points of the route (4 for each tile) ahead of the lead of its group. */
const KEEP_WITH_LEAD = 4;
/** The radius of a guard's body, for the blows of a player (world pixels). */
export const GUARD_RADIUS = 7;

/** A kind of guard of a world: a militia of the Enclave, a wagon. */
export interface GuardDef {
  /** The id of the content ('militia', 'wagon'). */
  readonly id: string;
  /** The name over its head. */
  readonly name: string;
  /** An NPC look of the atlas (npc/<look>). */
  readonly look: string;
  /** Its most hit points and its Armour Class (5e: a guard has 11 and 16). */
  readonly hp: number;
  readonly ac: number;
  /** Its blow (5e: a spear, +3 and 1d6+1); without it, it never fights (the wagon). */
  readonly blow?: Blow;
  /** Its walk, as a share of a player's (a wagon is slow). Default 1. */
  readonly speed?: number;
  /** What it says when a character talks to it (the driver of the wagon: a conversation). Without it, nobody talks to it. */
  readonly content?: Interaction;
  /** The half size of the box that a character acts on (world pixels): the wagon is big. Default: an NPC's. */
  readonly size?: { readonly halfWidth: number; readonly halfHeight: number };
}

export interface Guard {
  readonly id: number;
  readonly def: GuardDef;
  /** Its group (a caravan): the outlaws of the group are its foes. */
  readonly group: string;
  readonly state: PlayerState;
  /** The route that it walks (world pixels), and the next point on it; it stands at its end. */
  route: readonly { readonly x: number; readonly y: number }[];
  routeIndex: number;
  /** How far it walks to the side of its route (world pixels; + to the right of the way): the militia beside the wagon. */
  readonly offset: number;
  /** Whether it stands (its caravan is attacked): it walks no further on its route. */
  halted: boolean;
  /** What it fights now: a mob (`mob`) or a character (`player`), by id. */
  target: { readonly kind: 'mob' | 'player'; readonly id: number } | null;
}

/** A character as the guards see it: its body, and the groups whose guards it robs (its foes). */
export interface GuardPlayer {
  readonly id: number;
  readonly state: PlayerState;
  readonly outlaw?: readonly string[];
  readonly traits?: { readonly ac?: number; readonly stun?: number };
}

/** What happened to a guard: it fell (its hit points came to 0), and then it is gone. */
export interface GuardEvent {
  readonly id: number;
  readonly group: string;
  readonly def: string;
  readonly kind: 'fell' | 'gone';
  /** Who brought it down: a character (`player`), or a mob (`mob`) or nobody known. */
  readonly by?: number;
}

/** What a character's blow did to a guard: its damage (0: a miss) and whether it was a critical hit. */
export interface GuardBlow {
  readonly guard: Guard;
  readonly damage: number;
  readonly crit: boolean;
}

const tileOf = (v: number) => Math.floor(v / TILE_SIZE);
const NO_MOVE: MoveInput = { x: 0, y: 0 };

/** The guards of a world. */
export class Guards {
  private readonly world: World;
  private readonly all: Guard[] = [];
  private nextId = GUARD_IDS;
  private clockMs = 0;
  /** Who struck each guard last (a character id; a mob as -id), for the events. */
  private readonly lastHit = new Map<number, number>();

  constructor(world: World) {
    this.world = world;
  }

  get list(): readonly Guard[] {
    return this.all;
  }

  /** The guards of a group. */
  ofGroup(group: string): Guard[] {
    return this.all.filter((g) => g.group === group);
  }

  /** Puts a guard next to (x, y) (the nearest open place), in `group`, on `route` (world pixels), `offset` to its side. */
  add(def: GuardDef, group: string, x: number, y: number, route: readonly { readonly x: number; readonly y: number }[] = [], offset = 0): Guard {
    const at = resumePoint(this.world, x, y);
    const state = createPlayer(at.x, at.y);
    state.hp = def.hp;
    let routeIndex = 0;
    let best = Infinity;
    route.forEach((p, i) => {
      const d = Math.hypot(p.x - at.x, p.y - at.y);
      if (d < best) {
        best = d;
        routeIndex = i;
      }
    });
    const guard: Guard = { id: this.nextId++, def, group, state, route, routeIndex, offset, halted: false, target: null };
    this.all.push(guard);
    return guard;
  }

  remove(id: number): void {
    const i = this.all.findIndex((g) => g.id === id);
    if (i >= 0) this.all.splice(i, 1);
    this.lastHit.delete(id);
  }

  /** The guards as targets for the horde: the mobs of the story hunt them (a quarry), and they bring no new mobs. */
  targets(): HordePlayer[] {
    return this.all.map((g) => ({ id: g.id, state: g.state, companion: true, quarry: true, traits: { ac: g.def.ac } }));
  }

  /**
   * Moves the guards on by `dtMs`, in ticks: a fighter goes for its target and swings at it; the
   * others walk their routes (unless their group stands). `anchors`: the point of each group that its
   * fighters keep near (its wagon). Returns what happened to them.
   */
  step(dtMs: number, horde: Horde | null, players: readonly GuardPlayer[], dice: DiceSource, anchors: ReadonlyMap<string, { readonly x: number; readonly y: number }>): GuardEvent[] {
    const events: GuardEvent[] = [];
    this.clockMs += Math.min(Math.max(0, dtMs), 250);
    const tickMs = TICK_SECONDS * 1000;
    while (this.clockMs >= tickMs) {
      this.clockMs -= tickMs;
      for (const guard of [...this.all]) this.tick(guard, horde, players, dice, anchors.get(guard.group) ?? guard.state, events);
    }
    return events;
  }

  private tick(guard: Guard, horde: Horde | null, players: readonly GuardPlayer[], dice: DiceSource, anchor: { readonly x: number; readonly y: number }, events: GuardEvent[]): void {
    const { state, def } = guard;
    const traits = { maxHp: def.hp, recover: 0, speed: def.speed ?? 1 };
    if (state.down > 0) {
      const first = state.down === DOWN_TICKS;
      if (first) events.push({ id: guard.id, group: guard.group, def: def.id, kind: 'fell', ...(this.lastHit.has(guard.id) ? { by: this.lastHit.get(guard.id)! } : {}) });
      stepPlayer(state, NO_MOVE, this.world, traits);
      if (state.down === 0) {
        // It died: it goes.
        this.remove(guard.id);
        events.push({ id: guard.id, group: guard.group, def: def.id, kind: 'gone' });
      }
      return;
    }
    const input = def.blow ? this.fight(guard, horde, players, anchor) : null;
    if (input) {
      const swung = stepPlayer(state, input, this.world, traits);
      if (swung && guard.target) this.swing(guard, horde, players, dice);
      return;
    }
    // A guard walks with the lead of its group (its first guard, the wagon): never ahead of it. A guard
    // that talks stops for a character who stands close, as an NPC does.
    const lead = this.all.find((g) => g.group === guard.group);
    const ahead = lead !== undefined && lead !== guard && guard.routeIndex > lead.routeIndex + KEEP_WITH_LEAD;
    const listener = def.content ? players.find((p) => p.state.down === 0 && Math.hypot(p.state.x - state.x, p.state.y - state.y) <= GUARD_HOLD) : undefined;
    if (listener) state.facing = facingFor(state.facing, { x: listener.state.x - state.x, y: listener.state.y - state.y });
    stepPlayer(state, guard.halted || ahead || listener ? NO_MOVE : this.walk(guard), this.world, traits);
  }

  /** The input of a fighter: at its target, or a swing when it is in reach; null with nothing to fight. */
  private fight(guard: Guard, horde: Horde | null, players: readonly GuardPlayer[], anchor: { readonly x: number; readonly y: number }): MoveInput | null {
    const { state } = guard;
    const foe = this.pick(guard, horde, players, anchor);
    guard.target = foe ? { kind: foe.kind, id: foe.id } : null;
    if (!foe) return null;
    const dx = foe.x - state.x;
    const dy = foe.y - state.y;
    const d = Math.hypot(dx, dy);
    if (d <= ATTACK_REACH + foe.radius - 4) return { x: 0, y: 0, attack: Math.atan2(dy, dx) };
    return { x: dx / d, y: dy / d };
  }

  /** The nearest foe of a fighter: a hostile mob near the anchor, or an outlaw of its group that it sees. */
  private pick(guard: Guard, horde: Horde | null, players: readonly GuardPlayer[], anchor: { readonly x: number; readonly y: number }): { kind: 'mob' | 'player'; id: number; x: number; y: number; radius: number } | null {
    const { state } = guard;
    let best: { kind: 'mob' | 'player'; id: number; x: number; y: number; radius: number } | null = null;
    let bestD = GUARD_SIGHT;
    const near = (x: number, y: number) => Math.hypot(x - anchor.x, y - anchor.y) <= GUARD_LEASH;
    // The mobs of the story, and any mob that hunts a guard of the group: not the other beasts of the woods.
    const hunters = new Set(horde ? this.all.filter((g) => g.group === guard.group).flatMap((g) => horde.huntersOf(g.id).map((m) => m.id)) : []);
    for (const mob of horde?.mobs ?? []) {
      if (mob.state === 'dying' || !near(mob.x, mob.y) || !(mob.story || hunters.has(mob.id))) continue;
      const d = Math.hypot(mob.x - state.x, mob.y - state.y);
      if (d < bestD) {
        best = { kind: 'mob', id: mob.id, x: mob.x, y: mob.y, radius: MOB_STATS[mob.kind].radius };
        bestD = d;
      }
    }
    for (const p of players) {
      if (p.state.down > 0 || !p.outlaw?.includes(guard.group)) continue;
      const d = Math.hypot(p.state.x - state.x, p.state.y - state.y);
      if (d < bestD) {
        best = { kind: 'player', id: p.id, x: p.state.x, y: p.state.y, radius: PLAYER_HALF_WIDTH };
        bestD = d;
      }
    }
    return best;
  }

  /** A swing of a fighter at its target: a blow on a mob (the horde rolls it), or an attack roll on a character. */
  private swing(guard: Guard, horde: Horde | null, players: readonly GuardPlayer[], dice: DiceSource): void {
    const { state, def, target } = guard;
    const blow = def.blow!;
    if (target!.kind === 'mob') {
      horde?.strike(state, state.aim, undefined, guard.id, blow);
      return;
    }
    const p = players.find((x) => x.id === target!.id);
    if (!p || !canBeHit(p.state) || !attackHits(state.x, state.y, state.aim, p.state.x, p.state.y, PLAYER_HALF_WIDTH, blow.reach)) return;
    const roll = attackRoll(blow.toHit, p.traits?.ac ?? 10, dice);
    if (!roll.hit) {
      glancePlayer(p.state);
      return;
    }
    hitPlayer(p.state, Math.max(1, rollDice(blow.damage, dice, roll.crit)), GUARD_STUN_TICKS, 0, p.traits);
  }

  /** The walk along the route: to its next point; at its end, it stands. */
  private walk(guard: Guard): MoveInput {
    const { state, route } = guard;
    while (guard.routeIndex < route.length && Math.hypot(route[guard.routeIndex]!.x - state.x, route[guard.routeIndex]!.y - state.y) < ROUTE_REACH + Math.abs(guard.offset)) guard.routeIndex++;
    if (guard.routeIndex >= route.length) return NO_MOVE;
    const p = route[guard.routeIndex]!;
    // To the side of the route: across the way from this point to the next.
    const q = route[Math.min(route.length - 1, guard.routeIndex + 1)]!;
    const along = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const gx = p.x - ((q.y - p.y) / along) * guard.offset;
    const gy = p.y + ((q.x - p.x) / along) * guard.offset;
    const dx = gx - state.x;
    const dy = gy - state.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return NO_MOVE;
    state.facing = facingFor(state.facing, { x: dx, y: dy });
    return { x: dx / d, y: dy / d };
  }

  /** Whether a guard is at the end of its route. */
  arrived(guard: Guard): boolean {
    return guard.route.length > 0 && guard.routeIndex >= guard.route.length;
  }

  /**
   * A character's blow (`blow`, from `attacker` in the direction `aim`) on the guards of the groups
   * that it robs (`outlaw`): each one that it reaches rolls as a blow on a mob (its AC), and a hit takes
   * its damage and stuns it a little. Other guards take nothing: a blow at a hobgoblin never hurts the
   * militia beside it.
   */
  strike(attacker: { readonly x: number; readonly y: number }, aim: number, attackerId: number, blow: Blow, outlaw: readonly string[], dice: DiceSource): GuardBlow[] {
    const out: GuardBlow[] = [];
    if (outlaw.length === 0) return out;
    for (const guard of this.all) {
      if (guard.state.down > 0 || !outlaw.includes(guard.group)) continue;
      if (!attackHits(attacker.x, attacker.y, aim, guard.state.x, guard.state.y, GUARD_RADIUS, blow.reach)) continue;
      // As a blow on a mob (mobs.ts, rollBlow): d20 and the bonus against its AC; a natural 20 doubles the dice.
      const roll = attackRoll(blow.toHit, guard.def.ac, dice);
      const damage = roll.hit ? Math.max(1, rollDice(blow.damage, dice, roll.crit)) : 0;
      const crit = roll.hit && roll.crit;
      if (damage > 0) {
        hitPlayer(guard.state, damage, 20, 0);
        this.lastHit.set(guard.id, attackerId);
      }
      out.push({ guard, damage, crit });
    }
    return out;
  }

  /** A mob's hit on a guard (the horde reports it): the guard remembers who brought it down. */
  noteHit(guardId: number, mobId: number): void {
    if (this.all.some((g) => g.id === guardId)) this.lastHit.set(guardId, -mobId);
  }
}

/** The mobs of a horde that are near a point (world pixels): alive, within `radius`. */
export function mobsNear(horde: Horde, x: number, y: number, radius: number): Mob[] {
  return horde.mobs.filter((m) => m.state !== 'dying' && Math.hypot(m.x - x, m.y - y) <= radius);
}
