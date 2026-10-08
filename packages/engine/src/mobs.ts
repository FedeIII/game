import { TILE_SIZE } from './constants.ts';
import { attackHits, canBeHit, moveAxis, stunPlayer, type Facing, type PlayerState } from './player.ts';
import { FULL_BOX, type SolidMap, type World } from './world.ts';

/**
 * Mobs: hostile creatures that live in the woods. Each one wanders round its home. When it sees
 * a player, it runs at the player on a curved path, not a straight line; close enough, it winds
 * up and strikes. A hit stuns the player for a moment, and then the mob runs away from the
 * player for a while before it comes back for another attack. One attack of a player kills a
 * mob, which dies with an animation.
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
  /** The radius of its body, for the player's attacks (world pixels). */
  readonly radius: number;
  /** Its feet box, for the collisions with the world. */
  readonly halfWidth: number;
  readonly halfHeight: number;
  /** The death animation (ms); then it is gone. */
  readonly deathMs: number;
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
    radius: 7,
    halfWidth: 3,
    halfHeight: 2,
    deathMs: 750,
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
    radius: 11,
    halfWidth: 5,
    halfHeight: 3,
    deathMs: 950,
  },
};

/**
 * What a mob does: stands (idle) or walks round its home, runs at a player (chase), winds up,
 * strikes, runs away after a hit (retreat), or dies. The order is the code on the wire.
 */
export type MobState = 'idle' | 'walk' | 'chase' | 'windup' | 'strike' | 'retreat' | 'dying';
export const MOB_STATES: readonly MobState[] = ['idle', 'walk', 'chase', 'windup', 'strike', 'retreat', 'dying'];

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
}

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
/** A mob does not chase further than this from its home (world pixels): then it goes back. */
const LEASH = 18 * TILE_SIZE;
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
/** A dying mob slides back this fast (px/s) for this long (ms): the blow throws it. */
const DEATH_SLIDE = { speed: 60, ms: 160 } as const;
/** The longest move in one go, so a mob never passes through a solid box. */
const MAX_MOVE = 6;
/** A mob that stays this close to one point while it wants to move is stuck (world pixels); after this long (ms) it changes its plan, and a chase gives up after GIVE_UP_MS. */
const STUCK_RADIUS = 8;
const STUCK_MS = 1500;
const GIVE_UP_MS = 4000;
/** The ways round an obstacle, as angles off the wished direction, nearest first. */
const DETOURS = [0.6, -0.6, 1.2, -1.2, 1.8, -1.8, 2.5, -2.5];

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
  /** The direction of the blow that killed it. */
  slideX: number;
  slideY: number;
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
  private readonly brains = new Map<number, Brain>();
  private readonly random: () => number;
  /** The world for a mob: a tile that a mob may not step on is solid. */
  private readonly ground: SolidMap;
  private nextId = 1;
  private spawnMs = SPAWN_GAP_MS;

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
    const mob: Mob = { id: this.nextId++, kind, x, y, vx: 0, vy: 0, facing: 'down', state: 'idle', stateMs: 0 };
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
    this.populate(dt, players);
    const byId = new Map(players.map((p) => [p.id, p.state]));
    for (const mob of [...this.mobs]) {
      const brain = this.brains.get(mob.id)!;
      mob.stateMs += dt;
      switch (mob.state) {
        case 'idle':
        case 'walk':
          if (this.despawn(mob, players)) break;
          if (this.notice(mob, brain, players)) break;
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
            stunPlayer(target!, stats.stunTicks);
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
      }
    }
    return hits;
  }

  /**
   * An attack from `attacker` towards `facing` kills every living mob that it hits. `at` can
   * give another position of a mob (where the attacker saw it, a moment ago): a hit there
   * counts too. Returns the mobs that it killed.
   */
  strike(attacker: { readonly x: number; readonly y: number }, facing: Facing, at?: (mob: Mob) => { x: number; y: number } | null): Mob[] {
    const killed: Mob[] = [];
    for (const mob of this.mobs) {
      if (mob.state === 'dying') continue;
      const radius = MOB_STATS[mob.kind].radius;
      const then = at?.(mob) ?? null;
      const hit =
        attackHits(attacker.x, attacker.y, facing, mob.x, mob.y, radius) || (then !== null && attackHits(attacker.x, attacker.y, facing, then.x, then.y, radius));
      if (!hit) continue;
      const brain = this.brains.get(mob.id)!;
      const dx = mob.x - attacker.x;
      const dy = mob.y - attacker.y;
      const d = Math.hypot(dx, dy) || 1;
      brain.slideX = dx / d;
      brain.slideY = dy / d;
      this.enter(mob, 'dying');
      killed.push(mob);
    }
    if (killed.length > 0) this.spawnMs = Math.max(this.spawnMs, KILL_PAUSE_MS);
    return killed;
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
      if (d < bestD && this.sees(mob, p.state)) {
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
    const fromHome = Math.hypot(mob.x - brain.home.x, mob.y - brain.home.y);
    if (brain.lostMs > MEMORY_MS || fromHome > LEASH || brain.stuckMs > GIVE_UP_MS) {
      this.giveUp(mob, brain);
      return;
    }
    if (brain.stuckMs > STUCK_MS && brain.detourMs <= 0) {
      // Stuck behind something: bend the other way round it for a moment.
      brain.curve = -brain.curve;
      brain.detour = 1.6;
      brain.detourMs = 700;
    }
    const dx = (seen ? target.x : brain.seenX) - mob.x;
    const dy = (seen ? target.y : brain.seenY) - mob.y;
    const d = Math.hypot(dx, dy);
    if (seen && d <= stats.reach && canBeHit(target)) {
      this.enter(mob, 'windup');
      mob.facing = facingTo(dx, dy, mob.facing);
      brain.timerMs = stats.windupMs;
      return;
    }
    const straight = Math.atan2(dy, dx);
    if (seen && !canBeHit(target) && d < stats.reach * 2.6) {
      // The player is stunned or just after a stun: circle round it until it can be hit.
      this.steer(mob, brain, straight + Math.sign(brain.curve) * (d < stats.reach * 1.8 ? 2.2 : Math.PI / 2), stats.chaseSpeed * 0.55, dt);
      return;
    }
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
    if (brain.target !== null && players.has(brain.target)) this.enter(mob, 'chase');
    else this.giveUp(mob, brain);
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
      this.enter(mob, 'chase');
      return;
    }
    const away = Math.atan2(mob.y - target.y, mob.x - target.x);
    this.steer(mob, brain, away + brain.curve * 0.6, stats.retreatSpeed, dt);
  }

  private die(mob: Mob, brain: Brain, dt: number): void {
    const slideMs = Math.max(0, Math.min(dt, DEATH_SLIDE.ms - (mob.stateMs - dt)));
    if (slideMs > 0) {
      const d = (DEATH_SLIDE.speed * slideMs) / 1000;
      this.move(mob, brain.slideX * d, brain.slideY * d);
    }
    if (mob.stateMs >= MOB_STATS[mob.kind].deathMs) this.remove(mob);
  }

  /** Stops the hunt and walks back home. */
  private giveUp(mob: Mob, brain: Brain): void {
    brain.target = null;
    brain.goal = { x: brain.home.x, y: brain.home.y };
    brain.stuckMs = 0;
    this.enter(mob, 'walk');
  }

  // ---------------------------------------------------------------- senses and movement

  /** Whether the mob sees the player: close, out in the open where it may go, and no building between. */
  private sees(mob: Mob, player: PlayerState, range = MOB_STATS[mob.kind].sight): boolean {
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
