import { TICK_SECONDS, TILE_SIZE } from './constants.ts';
import { flyArrow, newArrow, type Arrow } from './arrows.ts';
import { MOB_LOOT, rollLoot, type Loot } from './items.ts';
import { GUARD_TICKS, attackHits, canBeHit, hitPlayer, moveAxis, normalAngle, type Facing, type PlayerState } from './player.ts';
import type { PlayerTraits } from './traits.ts';
import { FULL_BOX, type SolidMap, type World } from './world.ts';

/**
 * Mobs: hostile creatures that live in the woods. Each one wanders round its home. When it sees
 * a player, it runs at the player on a curved path, not a straight line; close enough, it winds
 * up and strikes. A hit stuns the player for a moment, and then the mob runs away from the
 * player for a while before it comes back for another attack. A player's blow takes health
 * points from a mob (Blow: the damage comes from the player's scores, traits.ts); the blow that
 * takes the last one kills it, and it dies with an animation.
 *
 * Mobs that hunt the same player take turns: they attack one after the other. The others hound
 * the player from close by, out of the reach of their blows and of the player's attacks, and the
 * next one in the line times its approach, so that its attack comes right after the one before.
 * In a pack the attacks overlap: the bigger the pack, the sooner the next one starts.
 *
 * Mobs never go into a building, and a world can keep them out of more (a town): see MobRules.
 * They do not collide with players, NPCs or each other, only with the world.
 *
 * A world gives its rules with WorldSource.mobs(). In a shared world the server runs the mobs (a
 * Room has a Horde); in a single-player world the client runs the same Horde. The horde uses
 * only its own seeded random numbers, so it is the same code everywhere.
 */

export type MobKind = 'imp' | 'brute';
export const MOB_KINDS: readonly MobKind[] = ['imp', 'brute'];

export interface MobStats {
  /** World pixels per second: walking round its home, running at a player, running away. */
  readonly wanderSpeed: number;
  readonly chaseSpeed: number;
  readonly retreatSpeed: number;
  /** It sees a player this close (world pixels), and gives up the chase beyond `forget`. */
  readonly sight: number;
  readonly forget: number;
  /** It starts an attack this close to the player; the blow lands if the player is still within `hitRange`. */
  readonly reach: number;
  readonly hitRange: number;
  /** The wind-up before the blow, and the blow itself (ms). */
  readonly windupMs: number;
  readonly strikeMs: number;
  /** It keeps running at the player during the wind-up at this speed (px/s; 0: it stands). */
  readonly windupSpeed: number;
  /** How far it lunges forward during the blow (world pixels). */
  readonly lunge: number;
  /** A hit stuns the player for this many ticks. */
  readonly stunTicks: number;
  /** After a hit it runs away for a time between these two (ms). */
  readonly retreatMs: readonly [number, number];
  /**
   * While another mob has the turn, it hounds the player at a distance between these two (world
   * pixels): out of its own reach, and out of the player's (ATTACK_REACH + radius).
   */
  readonly harass: readonly [number, number];
  /** The radius of its body, for the player's attacks (world pixels). */
  readonly radius: number;
  /** Its feet box, for the collisions with the world. */
  readonly halfWidth: number;
  readonly halfHeight: number;
  /** The death animation (ms); then it is gone. */
  readonly deathMs: number;
  /** Its health points: a blow takes Blow.damage of them (4 from a player whose scores are all 10). */
  readonly health: number;
  /** A blow pushes it this far away from the attacker (world pixels), dead or not, times Blow.push. */
  readonly knockback: number;
  /** A blow that does not kill stuns it for this long (ms), times Blow.stagger: its wind-up or its blow stops. */
  readonly hurtMs: number;
  /** The hit points that its hit takes from a player. */
  readonly hitDamage: number;
  /** Its hit poisons for this many ticks (times the player's PlayerTraits.resist); 0: no poison. */
  readonly poisonTicks: number;
}

/** The small, quick imp and the big, slow brute. The player walks at 80 px/s. */
export const MOB_STATS: Readonly<Record<MobKind, MobStats>> = {
  imp: {
    wanderSpeed: 30,
    chaseSpeed: 96,
    retreatSpeed: 80,
    sight: 112,
    forget: 200,
    reach: 15,
    hitRange: 21,
    windupMs: 280,
    strikeMs: 240,
    windupSpeed: 86,
    lunge: 7,
    stunTicks: 60,
    retreatMs: [1100, 1800],
    harass: [36, 50],
    radius: 7,
    halfWidth: 3,
    halfHeight: 2,
    deathMs: 750,
    health: 3,
    knockback: 10,
    hurtMs: 250,
    hitDamage: 1,
    // An imp's claws carry a poison (Fede's choice, 2026-10-10).
    poisonTicks: 360,
  },
  brute: {
    wanderSpeed: 16,
    chaseSpeed: 42,
    retreatSpeed: 38,
    sight: 100,
    forget: 180,
    reach: 21,
    hitRange: 28,
    windupMs: 650,
    strikeMs: 380,
    windupSpeed: 0,
    lunge: 3,
    stunTicks: 120,
    retreatMs: [1400, 2200],
    harass: [42, 56],
    radius: 11,
    halfWidth: 5,
    halfHeight: 3,
    deathMs: 950,
    health: 12,
    knockback: 18,
    hurtMs: 320,
    hitDamage: 2,
    poisonTicks: 0,
  },
};

/**
 * What a mob does: stands (idle) or walks round its home, runs at a player (chase), winds up,
 * strikes, runs away after a hit (retreat), dies, or reels from a blow that did not kill it
 * (hurt). The order is the code on the wire.
 */
export type MobState = 'idle' | 'walk' | 'chase' | 'windup' | 'strike' | 'retreat' | 'dying' | 'hurt';
export const MOB_STATES: readonly MobState[] = ['idle', 'walk', 'chase', 'windup', 'strike', 'retreat', 'dying', 'hurt'];

export interface Mob {
  readonly id: number;
  readonly kind: MobKind;
  /** The centre of its feet, in world pixels. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: Facing;
  state: MobState;
  /** Milliseconds since the state began: the animations need it. */
  stateMs: number;
  /** The health points that it has left (MobStats.health at first). */
  health: number;
}

/**
 * A player's blow (traits.ts): the health points that it takes, and its force as shares of the
 * mob's MobStats.knockback (the push) and MobStats.hurtMs (the reel).
 */
export interface Blow {
  readonly damage: number;
  readonly push: number;
  readonly stagger: number;
}

/** The blow of a player whose scores are all 10 (GUEST_TRAITS). */
export const PLAIN_BLOW: Blow = { damage: 4, push: 1, stagger: 1 };

/** Where the mobs of a world may be, and how many there are. */
export interface MobRules {
  /** Whether a mob may live and wander on a tile: it spawns there and walks round there. */
  roam(tx: number, ty: number): boolean;
  /** Whether a mob may step on a tile while it chases a player or runs away (roam, or a little more). */
  hunt(tx: number, ty: number): boolean;
  /** How many mobs of each kind live round each player. */
  readonly population: Readonly<Record<MobKind, number>>;
}

/** A player as the horde sees it: an id, and its state (a hit changes the state: a stun). */
export interface HordePlayer {
  readonly id: number;
  readonly state: PlayerState;
  /** How far mobs see it, as a share of their sight (Dexterity, sneaking: PlayerTraits.sight). Default 1. */
  readonly sight?: number;
  /** How it takes a hit: the share of a stun and of a poison (CON), and its guard after a stun (DEX). */
  readonly traits?: Pick<PlayerTraits, 'stun' | 'resist' | 'guard'>;
}

/** A mob that an arrow killed, and the player who shot it: the Room gives the drop to that player. */
export interface ShotKill {
  readonly mob: Mob;
  readonly owner: number;
}

/** A mob walks at most this far from its home while it wanders (world pixels). */
const WANDER_RADIUS = 4 * TILE_SIZE;
/**
 * A mob prowls: when it sets off on a walk, with this chance it moves its home this far towards
 * the nearest player (world pixels), but not closer to it than PROWL_NEAREST. So mobs come near
 * the players over time, and find them.
 */
const PROWL_CHANCE = 0.5;
const PROWL_STEP = 3 * TILE_SIZE;
const PROWL_NEAREST = 6 * TILE_SIZE;
/** The most tiles that a prowl searches for its way. */
const PROWL_SEARCH = 3000;
/**
 * A mob does not chase further than this from its home (world pixels): then it goes back. A mob
 * in the pack round its player (close to it) takes its home with it: the fight goes where the
 * player goes.
 */
const LEASH = 18 * TILE_SIZE;
/** A mob that gave up a hunt does not look for players for this long (ms): it walks back first. */
const REST_MS = 3000;
/** It follows a player that it cannot see any more for this long (ms), to where it saw it last. */
const MEMORY_MS = 1500;
/** Mobs of a player are counted this close to it (tiles); new ones come this far from every player (tiles). */
const POPULATION_RADIUS = 28;
const SPAWN_DISTANCE = [17, 25] as const;
/** A wandering mob this far from every player goes away (tiles). */
const DESPAWN_DISTANCE = 36;
/** At most one new mob each SPAWN_GAP_MS; after a kill, none for KILL_PAUSE_MS. */
const SPAWN_GAP_MS = 2000;
const KILL_PAUSE_MS = 6000;
/** The most mobs in a horde at once. */
const MAX_MOBS = 40;
/** The curve of a chase: the angle (radians) off the straight line, far from the player. */
const CURVE = [0.35, 0.65] as const;
/** A blow pushes a mob back (MobStats.knockback) over this long (ms), fast at first. */
const KNOCKBACK_MS = 200;
/** The longest move in one go, so a mob never passes through a solid box. */
const MAX_MOVE = 6;
/** A mob that stays this close to one point while it wants to move is stuck (world pixels); after this long (ms) it changes its plan, and a chase gives up after GIVE_UP_MS. */
const STUCK_RADIUS = 8;
const STUCK_MS = 1500;
const GIVE_UP_MS = 4000;
/** The ways round an obstacle, as angles off the wished direction, nearest first. */
const DETOURS = [0.6, -0.6, 1.2, -1.2, 1.8, -1.8, 2.5, -2.5];
/**
 * A mob in the line of a player hounds it within this distance beyond MobStats.harass (world
 * pixels); further away it runs at the player as in a chase. The next in the line stays the next
 * while it is within twice that distance.
 */
const HOUND_MARGIN = 16;
/**
 * While it hounds, it moves round the player (its goal is this many radians ahead on its circle),
 * at this share of its chase speed when it is at its distance, and faster by HOUND_PULL px/s for
 * each pixel that it is off its distance.
 */
const ORBIT = 0.4;
const HOUND_SPEED = 0.5;
const HOUND_PULL = 12;
/** Mobs that hound one player keep this far apart round it (radians). */
const SPREAD = 1.1;
/** The next in the line closes in at this share of its chase speed: it can keep up with its timed distance. */
const CLOSE_IN = 0.8;
/**
 * The attacks of a pack overlap: the next mob may start its wind-up when the attack before it has
 * this share of its length left, for each mob of the pack after the first, up to OVERLAP_MAX
 * (one mob: 0, two: 0.2, three: 0.4, four: 0.6). The pack: the mobs that hunt the player within
 * PACK_RADIUS of it (world pixels).
 */
const OVERLAP_STEP = 0.2;
const OVERLAP_MAX = 0.75;
const PACK_RADIUS = 8 * TILE_SIZE;
const TICK_MS = TICK_SECONDS * 1000;

interface Brain {
  home: { readonly x: number; readonly y: number };
  /** The player that it chases or runs from, where it saw it last, and for how long it has not seen it. */
  target: number | null;
  seenX: number;
  seenY: number;
  lostMs: number;
  /** The curve of this chase (signed radians). */
  curve: number;
  /** Where it walks to while it wanders. */
  goal: { x: number; y: number } | null;
  /** The time left in a wait, a wind-up, a blow or a retreat (ms). */
  timerMs: number;
  /** Whether the last blow hit. */
  hit: boolean;
  /** A way round an obstacle that it keeps for a moment, and for how long. */
  detour: number;
  detourMs: number;
  /**
   * How long it has wanted to move and stayed within STUCK_RADIUS of `anchor` (ms): it goes back
   * and forth in a pocket between obstacles, or it is blocked.
   */
  stuckMs: number;
  anchorX: number;
  anchorY: number;
  /** The direction of the last blow, how far it pushes (world pixels), and how long it reels (ms). */
  slideX: number;
  slideY: number;
  push: number;
  reelMs: number;
  /** When it joined the line of the mobs that hunt its target (horde ms): the line is in this order. */
  queuedMs: number;
  /** While it hounds: the distance that it keeps from the player, and for how long more (ms). */
  ring: number;
  ringMs: number;
  /** The way round the player (+1 or -1), and for how long more (ms). */
  orbit: number;
  orbitMs: number;
  /** After it gave up a hunt: how long more it does not look for players (ms). */
  restMs: number;
}

/** mulberry32: small and the same in every JavaScript engine. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The facing for a move or a look in the direction (dx, dy). */
function facingTo(dx: number, dy: number, current: Facing): Facing {
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return current;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}

const tileOf = (v: number) => Math.floor(v / TILE_SIZE);

/** The mobs of a world: they come, wander, hunt players, and die. */
export class Horde {
  readonly world: World;
  readonly rules: MobRules;
  /** The mobs, the dying ones too. step() and strike() change them. */
  readonly mobs: Mob[] = [];
  /** The arrows in flight (arrows.ts): step() flies them. */
  readonly arrows: Arrow[] = [];
  private nextArrow = 1;
  /** Mobs that arrows killed since the last takeShotKills(). */
  private shotKills: ShotKill[] = [];
  /** The guard after a stun of each player (ticks), from the last step. */
  private guards = new Map<number, number>();
  private readonly brains = new Map<number, Brain>();
  private readonly random: () => number;
  /** The world for a mob: a tile that a mob may not step on is solid. */
  private readonly ground: SolidMap;
  private nextId = 1;
  private spawnMs = SPAWN_GAP_MS;
  /** The time of the horde (ms): the sum of its steps. */
  private clockMs = 0;
  /** For each player that mobs hunt: the mob with the next turn to attack it. See nextUp(). */
  private readonly nextMob = new Map<number, number>();

  constructor(world: World, rules: MobRules, seed: number) {
    this.world = world;
    this.rules = rules;
    this.random = rng(seed);
    this.ground = { solidBox: (tx, ty) => (this.passable(tx, ty) ? world.solidBox(tx, ty) : FULL_BOX) };
  }

  /** The mobs that are alive (not dying). */
  get living(): number {
    let n = 0;
    for (const mob of this.mobs) if (mob.state !== 'dying') n++;
    return n;
  }

  /** Puts a new mob at (x, y), which is also its home. */
  spawn(kind: MobKind, x: number, y: number): Mob {
    const mob: Mob = { id: this.nextId++, kind, x, y, vx: 0, vy: 0, facing: 'down', state: 'idle', stateMs: 0, health: MOB_STATS[kind].health };
    this.mobs.push(mob);
    this.brains.set(mob.id, {
      home: { x, y },
      target: null,
      seenX: 0,
      seenY: 0,
      lostMs: 0,
      curve: 0,
      goal: null,
      timerMs: this.between(500, 3000),
      hit: false,
      detour: 0,
      detourMs: 0,
      stuckMs: 0,
      anchorX: x,
      anchorY: y,
      slideX: 0,
      slideY: 0,
      push: 0,
      reelMs: 0,
      queuedMs: 0,
      ring: MOB_STATS[kind].harass[1],
      ringMs: 0,
      orbit: 1,
      orbitMs: 0,
      restMs: 0,
    });
    return mob;
  }

  /**
   * Moves the horde on by `dtMs` (at most 250 ms count). Mobs hit the players that they reach:
   * the player's state gets a stun. Returns the hits, as [mob id, player id].
   */
  step(dtMs: number, players: readonly HordePlayer[]): [number, number][] {
    const dt = Math.min(Math.max(0, dtMs), 250);
    const hits: [number, number][] = [];
    this.clockMs += dt;
    this.populate(dt, players);
    const byId = new Map(players.map((p) => [p.id, p.state]));
    const bodies = new Map(players.map((p) => [p.id, p.traits ?? {}]));
    this.guards = new Map(players.map((p) => [p.id, p.traits?.guard ?? GUARD_TICKS]));
    for (const id of this.nextMob.keys()) if (!byId.has(id)) this.nextMob.delete(id);
    this.flyArrows(dt);
    for (const mob of [...this.mobs]) {
      const brain = this.brains.get(mob.id)!;
      mob.stateMs += dt;
      switch (mob.state) {
        case 'idle':
        case 'walk':
          if (this.despawn(mob, players)) break;
          if (brain.restMs > 0) brain.restMs -= dt;
          else if (this.notice(mob, brain, players)) break;
          this.wander(mob, brain, dt, players);
          break;
        case 'chase':
          this.chase(mob, brain, byId, dt);
          break;
        case 'windup': {
          const stats = MOB_STATS[mob.kind];
          const target = brain.target === null ? undefined : byId.get(brain.target);
          if (target) {
            // A quick mob keeps running at the player while it winds up, so running away does not save the player.
            const dx = target.x - mob.x;
            const dy = target.y - mob.y;
            if (stats.windupSpeed > 0 && Math.hypot(dx, dy) > stats.reach * 0.6) this.steer(mob, brain, Math.atan2(dy, dx), stats.windupSpeed, dt);
            else {
              mob.vx = 0;
              mob.vy = 0;
            }
            mob.facing = facingTo(dx, dy, mob.facing);
          }
          brain.timerMs -= dt;
          if (brain.timerMs > 0) break;
          // The blow: it lands if the player is still close, and not stunned or just after a stun.
          brain.hit = target !== undefined && Math.hypot(target.x - mob.x, target.y - mob.y) <= stats.hitRange && canBeHit(target);
          if (brain.hit) {
            hitPlayer(target!, stats.hitDamage, stats.stunTicks, stats.poisonTicks, bodies.get(brain.target!));
            hits.push([mob.id, brain.target!]);
          }
          this.enter(mob, 'strike');
          brain.timerMs = stats.strikeMs;
          break;
        }
        case 'strike':
          this.blow(mob, brain, byId, dt);
          break;
        case 'retreat':
          this.retreat(mob, brain, byId, dt);
          break;
        case 'dying':
          this.die(mob, brain, dt);
          break;
        case 'hurt':
          this.reel(mob, brain, byId, dt);
          break;
      }
    }
    return hits;
  }

  /**
   * An attack from `attacker` (the player `attackerId`) in the direction `aim` (radians) hits
   * every living mob in its reach. `at` can give another position of a mob (where the attacker saw
   * it, a moment ago): a hit there counts too. A blow takes `blow.damage` of a mob's health and
   * pushes it away: the one that takes the last of it kills it; another one makes it reel
   * (`hurt`), and then it goes for the attacker. Returns the mobs that it hit: the dead ones are
   * `dying`.
   */
  strike(
    attacker: { readonly x: number; readonly y: number },
    aim: number,
    at?: (mob: Mob) => { x: number; y: number } | null,
    attackerId?: number,
    blow: Blow = PLAIN_BLOW,
  ): Mob[] {
    const struck: Mob[] = [];
    for (const mob of this.mobs) {
      if (mob.state === 'dying') continue;
      const radius = MOB_STATS[mob.kind].radius;
      const then = at?.(mob) ?? null;
      const hit =
        attackHits(attacker.x, attacker.y, aim, mob.x, mob.y, radius) || (then !== null && attackHits(attacker.x, attacker.y, aim, then.x, then.y, radius));
      if (!hit) continue;
      this.hit(mob, mob.x - attacker.x, mob.y - attacker.y, blow, attackerId);
      struck.push(mob);
    }
    return struck;
  }

  /**
   * A ranger's attack: an arrow from `from` in the direction `aim`, that flies `range` world
   * pixels (arrows.ts). The next step() flies it; a kill is in takeShotKills().
   */
  shoot(from: { readonly x: number; readonly y: number }, aim: number, range: number, ownerId: number, blow: Blow = PLAIN_BLOW): Arrow {
    const arrow = newArrow(this.nextArrow++, ownerId, from.x, from.y, aim, range, blow);
    this.arrows.push(arrow);
    return arrow;
  }

  /** The mobs that arrows killed since the last call, with their shooters. */
  takeShotKills(): ShotKill[] {
    const kills = this.shotKills;
    this.shotKills = [];
    return kills;
  }

  /**
   * A blow on a mob from the direction (dx, dy): it takes `blow.damage` of its health and pushes
   * it away; the blow that takes the last of it kills it; another one makes it reel (`hurt`), and
   * then it goes for the attacker. Returns whether it died.
   */
  private hit(mob: Mob, dx: number, dy: number, blow: Blow, attackerId?: number): boolean {
    const brain = this.brains.get(mob.id)!;
    const d = Math.hypot(dx, dy) || 1;
    brain.slideX = dx / d;
    brain.slideY = dy / d;
    const stats = MOB_STATS[mob.kind];
    brain.push = stats.knockback * blow.push;
    brain.reelMs = stats.hurtMs * blow.stagger;
    mob.health = Math.max(0, mob.health - blow.damage);
    if (mob.health <= 0) {
      this.enter(mob, 'dying');
      this.spawnMs = Math.max(this.spawnMs, KILL_PAUSE_MS);
      return true;
    }
    // It reels, its wind-up or blow broken, and turns on the one who hit it.
    if (attackerId !== undefined) brain.target = attackerId;
    brain.lostMs = 0;
    mob.facing = facingTo(-dx, -dy, mob.facing);
    this.enter(mob, 'hurt');
    return false;
  }

  /** Flies the arrows: each one hits the first living mob on its way, or a thing stops it. */
  private flyArrows(dtMs: number): void {
    if (this.arrows.length === 0) return;
    const living = this.mobs.filter((m) => m.state !== 'dying');
    const targets = living.map((m) => ({ x: m.x, y: m.y, radius: MOB_STATS[m.kind].radius }));
    for (const arrow of [...this.arrows]) {
      const hit = flyArrow(arrow, this.world, dtMs / 1000, targets);
      if (hit === null) continue;
      this.arrows.splice(this.arrows.indexOf(arrow), 1);
      if (hit < 0) continue;
      const mob = living[hit]!;
      if (mob.state === 'dying') continue;
      if (this.hit(mob, Math.cos(arrow.aim), Math.sin(arrow.aim), arrow.blow, arrow.owner)) this.shotKills.push({ mob, owner: arrow.owner });
    }
  }

  /** What a mob that a blow just killed drops into its killer's pack (MOB_LOOT), from the horde's own random numbers. */
  drop(mob: Mob): Loot {
    return rollLoot(MOB_LOOT[mob.kind], this.random);
  }

  /** Whether a mob may be on a tile at all: never in a building, and only where the world lets it hunt. */
  passable(tx: number, ty: number): boolean {
    return this.world.buildingAt(tx, ty) === null && this.rules.hunt(tx, ty);
  }

  // ---------------------------------------------------------------- states

  private enter(mob: Mob, state: MobState): void {
    mob.state = state;
    mob.stateMs = 0;
    const brain = this.brains.get(mob.id);
    if (brain) {
      brain.stuckMs = 0;
      brain.anchorX = mob.x;
      brain.anchorY = mob.y;
    }
    if (state !== 'walk' && state !== 'chase' && state !== 'retreat') {
      mob.vx = 0;
      mob.vy = 0;
    }
  }

  /** Looks for a player to hunt: the nearest one that it sees. Returns whether it found one. */
  private notice(mob: Mob, brain: Brain, players: readonly HordePlayer[]): boolean {
    let best: HordePlayer | null = null;
    let bestD = Infinity;
    for (const p of players) {
      const d = Math.hypot(p.state.x - mob.x, p.state.y - mob.y);
      if (d < bestD && this.sees(mob, p.state, MOB_STATS[mob.kind].sight * (p.sight ?? 1))) {
        best = p;
        bestD = d;
      }
    }
    if (!best) return false;
    brain.target = best.id;
    brain.seenX = best.state.x;
    brain.seenY = best.state.y;
    brain.lostMs = 0;
    brain.curve = this.newCurve();
    brain.queuedMs = this.clockMs;
    this.enter(mob, 'chase');
    return true;
  }

  private wander(mob: Mob, brain: Brain, dt: number, players: readonly HordePlayer[]): void {
    const stats = MOB_STATS[mob.kind];
    if (mob.state === 'idle') {
      brain.timerMs -= dt;
      if (brain.timerMs > 0) return;
      if (this.random() < PROWL_CHANCE) this.prowl(brain, players);
      brain.goal = this.wanderGoal(brain);
      if (!brain.goal) {
        brain.timerMs = this.between(800, 2000);
        return;
      }
      brain.stuckMs = 0;
      this.enter(mob, 'walk');
    }
    const goal = brain.goal ?? brain.home;
    const dx = goal.x - mob.x;
    const dy = goal.y - mob.y;
    const d = Math.hypot(dx, dy);
    if (d < 2 || brain.stuckMs > STUCK_MS) {
      this.enter(mob, 'idle');
      brain.goal = null;
      brain.timerMs = this.between(1000, 4500);
      return;
    }
    this.steer(mob, brain, Math.atan2(dy, dx), Math.min(stats.wanderSpeed, (d * 1000) / Math.max(dt, 1)), dt);
  }

  private chase(mob: Mob, brain: Brain, players: ReadonlyMap<number, PlayerState>, dt: number): void {
    const stats = MOB_STATS[mob.kind];
    const target = brain.target === null ? undefined : players.get(brain.target);
    if (!target) {
      this.giveUp(mob, brain);
      return;
    }
    const seen = this.sees(mob, target, stats.forget);
    if (seen) {
      brain.seenX = target.x;
      brain.seenY = target.y;
      brain.lostMs = 0;
    } else {
      brain.lostMs += dt;
    }
    // In the pack round its player, a mob stays in the fight: its home goes with it, and a moment
    // stuck behind a tree does not end the hunt (it goes the other way round).
    const close = seen && Math.hypot(target.x - mob.x, target.y - mob.y) <= stats.harass[1] + 2 * HOUND_MARGIN;
    if (close) brain.home = { x: mob.x, y: mob.y };
    const fromHome = Math.hypot(mob.x - brain.home.x, mob.y - brain.home.y);
    if (brain.lostMs > MEMORY_MS || fromHome > LEASH || (!close && brain.stuckMs > GIVE_UP_MS)) {
      this.giveUp(mob, brain);
      return;
    }
    if (brain.stuckMs > STUCK_MS && brain.detourMs <= 0) {
      // Stuck behind something: bend the other way round it for a moment.
      brain.curve = -brain.curve;
      brain.orbit = -brain.orbit;
      brain.detour = 1.6;
      brain.detourMs = 700;
    }
    const dx = (seen ? target.x : brain.seenX) - mob.x;
    const dy = (seen ? target.y : brain.seenY) - mob.y;
    const d = Math.hypot(dx, dy);
    if (seen) {
      const wait = this.waitFor(mob, brain.target!, target);
      if (wait <= 0 && d <= stats.reach) {
        this.enter(mob, 'windup');
        mob.facing = facingTo(dx, dy, mob.facing);
        brain.timerMs = stats.windupMs;
        return;
      }
      if (wait > 0 && d <= stats.harass[1] + HOUND_MARGIN) {
        if (wait === Infinity) {
          // Another mob has the next turn: hound the player from out of reach.
          this.hound(mob, brain, brain.target!, target, brain.ring, 1, dt);
        } else {
          // Its turn comes in `wait` ms: close in at a pace that brings it into reach just then,
          // and straight at the player at the end.
          const radius = Math.min(stats.harass[1], stats.reach + (CLOSE_IN * stats.chaseSpeed * wait) / 1000);
          this.hound(mob, brain, brain.target!, target, radius, 0.5 * Math.min(1, (radius - stats.reach) / (stats.harass[0] - stats.reach)), dt);
        }
        return;
      }
    }
    const straight = Math.atan2(dy, dx);
    // The curve: far away the mob runs at an angle to the straight line; the angle shrinks as
    // it comes near, so the path bends round to the player.
    const bend = brain.curve * Math.max(0, Math.min(1, (d - stats.reach) / (stats.sight * 0.8)));
    this.steer(mob, brain, straight + bend, stats.chaseSpeed, dt);
  }

  /** The blow: a short lunge forward; then it runs away after a hit, or chases on after a miss. */
  private blow(mob: Mob, brain: Brain, players: ReadonlyMap<number, PlayerState>, dt: number): void {
    const stats = MOB_STATS[mob.kind];
    const lungeMs = stats.strikeMs * 0.4;
    if (mob.stateMs - dt < lungeMs) {
      const [fx, fy] = mob.facing === 'left' ? [-1, 0] : mob.facing === 'right' ? [1, 0] : mob.facing === 'up' ? [0, -1] : [0, 1];
      const share = (Math.min(mob.stateMs, lungeMs) - Math.max(0, mob.stateMs - dt)) / lungeMs;
      this.move(mob, fx * stats.lunge * share, fy * stats.lunge * share);
    }
    brain.timerMs -= dt;
    if (brain.timerMs > 0) return;
    if (brain.hit) {
      this.enter(mob, 'retreat');
      brain.timerMs = this.between(stats.retreatMs[0], stats.retreatMs[1]);
      brain.curve = this.newCurve();
      return;
    }
    if (brain.target !== null && players.has(brain.target)) {
      // A miss: it goes to the end of the line.
      brain.queuedMs = this.clockMs;
      this.enter(mob, 'chase');
    } else {
      this.giveUp(mob, brain);
    }
  }

  /** Runs away from the player that it hit, on a curve, until it is time to attack again. */
  private retreat(mob: Mob, brain: Brain, players: ReadonlyMap<number, PlayerState>, dt: number): void {
    const stats = MOB_STATS[mob.kind];
    const target = brain.target === null ? undefined : players.get(brain.target);
    brain.timerMs -= dt;
    if (!target) {
      this.giveUp(mob, brain);
      return;
    }
    if (brain.timerMs <= 0 || brain.stuckMs > STUCK_MS) {
      brain.curve = this.newCurve();
      brain.lostMs = 0;
      brain.queuedMs = this.clockMs;
      this.enter(mob, 'chase');
      return;
    }
    const away = Math.atan2(mob.y - target.y, mob.x - target.x);
    this.steer(mob, brain, away + brain.curve * 0.6, stats.retreatSpeed, dt);
  }

  private die(mob: Mob, brain: Brain, dt: number): void {
    this.knock(mob, brain, dt);
    if (mob.stateMs >= MOB_STATS[mob.kind].deathMs) this.remove(mob);
  }

  /** Reels from a blow: pushed back, facing the attacker; then it goes for the attacker. */
  private reel(mob: Mob, brain: Brain, players: ReadonlyMap<number, PlayerState>, dt: number): void {
    this.knock(mob, brain, dt);
    if (mob.stateMs < brain.reelMs) return;
    if (brain.target !== null && players.has(brain.target)) {
      brain.curve = this.newCurve();
      this.enter(mob, 'chase');
    } else {
      this.giveUp(mob, brain);
    }
  }

  /** The push of a blow, away from the attacker: fast at first, over KNOCKBACK_MS. */
  private knock(mob: Mob, brain: Brain, dt: number): void {
    const ease = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 2;
    const share = ease(mob.stateMs / KNOCKBACK_MS) - ease((mob.stateMs - dt) / KNOCKBACK_MS);
    if (share <= 0) return;
    const d = share * brain.push;
    this.move(mob, brain.slideX * d, brain.slideY * d);
  }

  /** Stops the hunt and walks back home (it does not look for players for a while). */
  private giveUp(mob: Mob, brain: Brain): void {
    brain.target = null;
    brain.restMs = REST_MS;
    brain.goal = { x: brain.home.x, y: brain.home.y };
    brain.stuckMs = 0;
    this.enter(mob, 'walk');
  }

  // ---------------------------------------------------------------- turns

  /**
   * How long the mob must wait for its turn to attack the player `playerId` (ms): 0 if it may
   * attack now, Infinity if it is not the next in the line. The turn comes when the attacks of the
   * mobs before it are over, or in a pack nearly over (overlap()), and when its blow can hit: the
   * blow comes at the end of the wind-up, so in a pack the wind-up starts a little before the
   * guard after a stun ends (the blow still comes after it).
   */
  private waitFor(mob: Mob, playerId: number, player: PlayerState): number {
    if (this.nextUp(playerId, player) !== mob.id) return Infinity;
    const overlap = this.overlap(playerId, player);
    let wait = (player.stun > 0 ? player.stun + (this.guards.get(playerId) ?? GUARD_TICKS) : player.guard) * TICK_MS - overlap * MOB_STATS[mob.kind].windupMs;
    for (const attacker of this.attackers(playerId)) {
      const stats = MOB_STATS[attacker.kind];
      const timer = this.brains.get(attacker.id)!.timerMs;
      const left = attacker.state === 'windup' ? timer + stats.strikeMs : timer;
      wait = Math.max(wait, left - overlap * (stats.windupMs + stats.strikeMs));
    }
    return Math.max(0, wait);
  }

  /** How much the attacks on the player `playerId` overlap (0 to OVERLAP_MAX): more for a bigger pack round it. */
  private overlap(playerId: number, player: PlayerState): number {
    let pack = 0;
    for (const mob of this.mobs) {
      if (mob.state === 'idle' || mob.state === 'walk' || mob.state === 'dying' || this.brains.get(mob.id)!.target !== playerId) continue;
      if (Math.hypot(mob.x - player.x, mob.y - player.y) <= PACK_RADIUS) pack++;
    }
    return Math.min(OVERLAP_MAX, OVERLAP_STEP * Math.max(0, pack - 1));
  }

  /**
   * The mob with the next turn to attack the player `playerId`, or null. It stays the next until
   * it attacks, stops the hunt, or falls far behind. A new next is the mob that has waited
   * longest in the line, among those that hunt the player close to it.
   */
  private nextUp(playerId: number, player: PlayerState): number | null {
    const kept = this.nextMob.get(playerId);
    if (kept !== undefined) {
      const mob = this.mobs.find((m) => m.id === kept);
      if (mob && mob.state === 'chase' && this.brains.get(kept)!.target === playerId && this.near(mob, player, 2)) return kept;
    }
    let best: Mob | null = null;
    let since = Infinity;
    for (const mob of this.mobs) {
      if (mob.state !== 'chase') continue;
      const brain = this.brains.get(mob.id)!;
      if (brain.target !== playerId || brain.queuedMs >= since || !this.near(mob, player, 1)) continue;
      best = mob;
      since = brain.queuedMs;
    }
    if (best) this.nextMob.set(playerId, best.id);
    else this.nextMob.delete(playerId);
    return best?.id ?? null;
  }

  /** The mobs that attack the player `playerId` now (in their wind-up or their blow). In a pack their attacks overlap. */
  private attackers(playerId: number): Mob[] {
    return this.mobs.filter((mob) => (mob.state === 'windup' || mob.state === 'strike') && this.brains.get(mob.id)!.target === playerId);
  }

  /** Whether the mob is close to the player: within its hounding distance and `margins` times HOUND_MARGIN. */
  private near(mob: Mob, player: PlayerState, margins: number): boolean {
    return Math.hypot(mob.x - player.x, mob.y - player.y) <= MOB_STATS[mob.kind].harass[1] + margins * HOUND_MARGIN;
  }

  /**
   * Hounds the player `playerId` (at `player`): the mob keeps `radius` from the player, moves
   * round it, keeps apart from the other mobs round the player, and looks at the player. It takes
   * a new distance and now and then a new way round. `freedom` (0 to 1) scales the moves round
   * the player: 0 goes straight to its distance.
   */
  private hound(mob: Mob, brain: Brain, playerId: number, player: PlayerState, radius: number, freedom: number, dt: number): void {
    const stats = MOB_STATS[mob.kind];
    brain.ringMs -= dt;
    if (brain.ringMs <= 0) {
      brain.ring = this.between(stats.harass[0], stats.harass[1]);
      brain.ringMs = this.between(700, 1600);
    }
    brain.orbitMs -= dt;
    if (brain.orbitMs <= 0) {
      if (this.random() < 0.5) brain.orbit = -brain.orbit;
      brain.orbitMs = this.between(1200, 3000);
    }
    const ax = mob.x - player.x;
    const ay = mob.y - player.y;
    const angle = Math.atan2(ay, ax);
    // Each other mob round the player that is closer than SPREAD round the circle pushes it on.
    let push = 0;
    for (const other of this.mobs) {
      if (other === mob || (other.state !== 'chase' && other.state !== 'windup' && other.state !== 'strike')) continue;
      if (this.brains.get(other.id)!.target !== playerId || !this.near(other, player, 1)) continue;
      const diff = normalAngle(angle - Math.atan2(other.y - player.y, other.x - player.x));
      if (Math.abs(diff) < SPREAD) push += (diff === 0 ? (mob.id < other.id ? 1 : -1) : Math.sign(diff)) * (SPREAD - Math.abs(diff));
    }
    const turn = freedom * Math.max(-1, Math.min(1, ORBIT * brain.orbit + push));
    const goalX = player.x + Math.cos(angle + turn) * radius;
    const goalY = player.y + Math.sin(angle + turn) * radius;
    const toGoal = Math.hypot(goalX - mob.x, goalY - mob.y);
    // Fast to its distance, slower round the player once it is there.
    const speed = Math.min(stats.chaseSpeed, stats.chaseSpeed * HOUND_SPEED + HOUND_PULL * Math.abs(Math.hypot(ax, ay) - radius));
    this.steer(mob, brain, Math.atan2(goalY - mob.y, goalX - mob.x), Math.min(speed, (toGoal * 1000) / Math.max(dt, 1)), dt);
    mob.facing = facingTo(-ax, -ay, mob.facing);
  }

  // ---------------------------------------------------------------- senses and movement

  /** Whether the mob sees the player: close, out in the open where it may go, and no building between. */
  private sees(mob: Mob, player: PlayerState, range = MOB_STATS[mob.kind].sight): boolean {
    // A defeated player is out of the fight.
    if (player.down > 0) return false;
    const dx = player.x - mob.x;
    const dy = player.y - mob.y;
    const d = Math.hypot(dx, dy);
    if (d > range || !this.passable(tileOf(player.x), tileOf(player.y))) return false;
    const steps = Math.ceil(d / 8);
    for (let i = 1; i < steps; i++) {
      if (this.world.buildingAt(tileOf(mob.x + (dx * i) / steps), tileOf(mob.y + (dy * i) / steps)) !== null) return false;
    }
    return true;
  }

  /**
   * Moves towards `heading` (radians) at `speed` for `dt`. If an obstacle is in the way, it
   * tries the ways round it, nearest first, and keeps a good one for a moment.
   */
  private steer(mob: Mob, brain: Brain, heading: number, speed: number, dt: number): void {
    const want = (speed * dt) / 1000;
    if (want <= 0) return;
    brain.detourMs -= dt;
    const tries = brain.detourMs > 0 ? [brain.detour, 0, ...DETOURS] : [0, ...DETOURS];
    let best: { x: number; y: number; gain: number; offset: number } | null = null;
    for (const offset of tries) {
      const angle = heading + offset * (brain.curve < 0 ? -1 : 1);
      const ux = Math.cos(angle);
      const uy = Math.sin(angle);
      const probe = { x: mob.x, y: mob.y };
      this.moveBody(probe, mob, ux * want, uy * want);
      // How far it got towards where it wants to go.
      const gain = ((probe.x - mob.x) * Math.cos(heading) + (probe.y - mob.y) * Math.sin(heading)) / want;
      const moved = Math.hypot(probe.x - mob.x, probe.y - mob.y) / want;
      if (moved > 0.6 && gain > 0.2) {
        best = { x: probe.x, y: probe.y, gain, offset };
        break;
      }
      if (!best || gain > best.gain) best = { x: probe.x, y: probe.y, gain, offset };
    }
    const startX = mob.x;
    const startY = mob.y;
    if (best && best.gain > 0) {
      mob.x = best.x;
      mob.y = best.y;
      if (best.offset !== 0 && best.offset !== brain.detour) {
        brain.detour = best.offset;
        brain.detourMs = 400;
      }
    }
    const mx = mob.x - startX;
    const my = mob.y - startY;
    mob.vx = (mx * 1000) / Math.max(dt, 1);
    mob.vy = (my * 1000) / Math.max(dt, 1);
    // Real progress: away from the last anchor point. Back and forth in one place is no progress.
    if (Math.hypot(mob.x - brain.anchorX, mob.y - brain.anchorY) > STUCK_RADIUS) {
      brain.anchorX = mob.x;
      brain.anchorY = mob.y;
      brain.stuckMs = 0;
    } else {
      brain.stuckMs += dt;
    }
    mob.facing = facingTo(mx, my, mob.facing);
  }

  /** Moves the mob by (dx, dy) with collisions. */
  private move(mob: Mob, dx: number, dy: number): void {
    this.moveBody(mob, mob, dx, dy);
  }

  /** Moves `body` (a mob or a probe for it) by (dx, dy) with the feet box of `mob`, in short steps. */
  private moveBody(body: { x: number; y: number }, mob: Mob, dx: number, dy: number): void {
    const { halfWidth, halfHeight } = MOB_STATS[mob.kind];
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / MAX_MOVE));
    for (let i = 0; i < n; i++) {
      moveAxis(body, this.ground, dx / n, 0, halfWidth, halfHeight);
      moveAxis(body, this.ground, 0, dy / n, halfWidth, halfHeight);
    }
  }

  // ---------------------------------------------------------------- coming and going

  /**
   * Moves the home a step towards the nearest player: PROWL_STEP along the shortest way through
   * open ground where it may roam (round a town, round a lake), to the nearest place
   * PROWL_NEAREST from the player. It searches at most PROWL_SEARCH tiles; without a way, it
   * takes a straight step if that one is open.
   */
  private prowl(brain: Brain, players: readonly HordePlayer[]): void {
    let nearest: PlayerState | null = null;
    let best = POPULATION_RADIUS * TILE_SIZE;
    for (const p of players) {
      const d = Math.hypot(p.state.x - brain.home.x, p.state.y - brain.home.y);
      if (d < best) {
        best = d;
        nearest = p.state;
      }
    }
    if (!nearest || best <= PROWL_NEAREST) return;
    const near = nearest;
    const start: [number, number] = [tileOf(brain.home.x), tileOf(brain.home.y)];
    const close = (tx: number, ty: number) => Math.hypot(tx * TILE_SIZE + 8 - near.x, ty * TILE_SIZE + 12 - near.y) <= PROWL_NEAREST;
    const key = (tx: number, ty: number) => `${tx},${ty}`;
    const from = new Map<string, string | null>([[key(...start), null]]);
    const queue: [number, number][] = [start];
    let goal: string | null = null;
    for (let head = 0; head < queue.length && from.size < PROWL_SEARCH; head++) {
      const [x, y] = queue[head]!;
      if (close(x, y)) {
        goal = key(x, y);
        break;
      }
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const) {
        const k = key(nx, ny);
        if (from.has(k) || !this.open(nx, ny)) continue;
        from.set(k, key(x, y));
        queue.push([nx, ny]);
      }
    }
    if (goal) {
      const path: string[] = [];
      for (let k: string | null = goal; k; k = from.get(k) ?? null) path.unshift(k);
      const [tx, ty] = path[Math.min(path.length - 1, PROWL_STEP / TILE_SIZE)]!.split(',').map(Number) as [number, number];
      brain.home = { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + 12 };
      return;
    }
    const step = Math.min(PROWL_STEP, best - PROWL_NEAREST);
    const x = brain.home.x + ((near.x - brain.home.x) / best) * step;
    const y = brain.home.y + ((near.y - brain.home.y) / best) * step;
    if (this.open(tileOf(x), tileOf(y))) brain.home = { x, y };
  }

  /** A place to walk to near home: an open tile where it may roam. */
  private wanderGoal(brain: Brain): { x: number; y: number } | null {
    for (let tries = 0; tries < 8; tries++) {
      const angle = this.random() * 2 * Math.PI;
      const r = this.random() * WANDER_RADIUS;
      const x = brain.home.x + Math.cos(angle) * r;
      const y = brain.home.y + Math.sin(angle) * r;
      if (this.open(tileOf(x), tileOf(y))) return { x: tileOf(x) * TILE_SIZE + TILE_SIZE / 2, y: tileOf(y) * TILE_SIZE + 12 };
    }
    return null;
  }

  /** A tile where a mob may stand still: roam ground, nothing solid on it. */
  private open(tx: number, ty: number): boolean {
    return this.rules.roam(tx, ty) && this.passable(tx, ty) && this.world.solidBox(tx, ty) === null;
  }

  /** Brings new mobs where players have fewer than the world wants, one at a time, out of their sight. */
  private populate(dt: number, players: readonly HordePlayer[]): void {
    this.spawnMs -= dt;
    if (this.spawnMs > 0 || players.length === 0) return;
    this.spawnMs = SPAWN_GAP_MS;
    if (this.living >= MAX_MOBS) return;
    let best: { player: PlayerState; kind: MobKind; short: number } | null = null;
    for (const p of players) {
      for (const kind of MOB_KINDS) {
        const want = this.rules.population[kind];
        if (!want) continue;
        let have = 0;
        for (const mob of this.mobs) {
          if (mob.kind === kind && mob.state !== 'dying' && Math.hypot(mob.x - p.state.x, mob.y - p.state.y) <= POPULATION_RADIUS * TILE_SIZE) have++;
        }
        if (want - have > (best?.short ?? 0)) best = { player: p.state, kind, short: want - have };
      }
    }
    if (!best) return;
    for (let tries = 0; tries < 16; tries++) {
      const angle = this.random() * 2 * Math.PI;
      const r = this.between(SPAWN_DISTANCE[0], SPAWN_DISTANCE[1]) * TILE_SIZE;
      const tx = tileOf(best.player.x + Math.cos(angle) * r);
      const ty = tileOf(best.player.y + Math.sin(angle) * r);
      if (!this.open(tx, ty)) continue;
      const x = tx * TILE_SIZE + TILE_SIZE / 2;
      const y = ty * TILE_SIZE + 12;
      if (players.some((p) => Math.hypot(p.state.x - x, p.state.y - y) < SPAWN_DISTANCE[0] * TILE_SIZE)) continue;
      this.spawn(best.kind, x, y);
      return;
    }
  }

  /** A wandering mob far from every player goes away. Returns whether it went. */
  private despawn(mob: Mob, players: readonly HordePlayer[]): boolean {
    const far = DESPAWN_DISTANCE * TILE_SIZE;
    if (players.some((p) => Math.hypot(p.state.x - mob.x, p.state.y - mob.y) <= far)) return false;
    this.remove(mob);
    return true;
  }

  private remove(mob: Mob): void {
    const i = this.mobs.indexOf(mob);
    if (i >= 0) this.mobs.splice(i, 1);
    this.brains.delete(mob.id);
  }

  private newCurve(): number {
    return (this.random() < 0.5 ? -1 : 1) * this.between(CURVE[0], CURVE[1]);
  }

  private between(a: number, b: number): number {
    return a + (b - a) * this.random();
  }
}
