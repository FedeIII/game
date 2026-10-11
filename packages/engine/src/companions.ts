import { Structure } from './buildings.ts';
import { TICK_SECONDS, TILE_SIZE } from './constants.ts';
import type { HordePlayer } from './mobs.ts';
import { standPoint } from './npc.ts';
import { RECOVER_TICKS, createPlayer, facingFor, resumePoint, stepPlayer, wakePlayer, type MoveInput, type PlayerState } from './player.ts';
import type { World } from './world.ts';

/**
 * Companions: NPCs that follow a player through the world (docs/drafts/companions.md; Fede's
 * decision, 2026-10-11: the escort of the scout Himo). A companion has the body of a player (the
 * same walk, collision and hits: a PlayerState), a leader, and a mode: it follows the leader on
 * the shortest way of tiles, or it waits when it cannot. Mobs hunt it as they hunt a player
 * (Horde, HordePlayer.companion); it does not fight back. In a shared world the Room runs them;
 * a page that runs its world runs its own.
 */

/** A companion of a world or of a quest. */
export interface CompanionDef {
  /** The id of the content ('himo'): the events and the quests name it. */
  readonly id: string;
  /** The name over its head. */
  readonly name: string;
  /** An NPC look of the atlas (npc/<look>). */
  readonly look: string;
  /** Its most hit points (5e: as its stat block; a scout has 16). */
  readonly hp: number;
  /** Its Armour Class: a mob's attack roll must reach it (5e). Without it, COMPANION_AC. */
  readonly ac?: number;
  /** What a defeat does: 'gone', it dies (it leaves the world); 'wakes', it lies DOWN_TICKS (player.ts) and stands with all its hit points. */
  readonly fallen: 'gone' | 'wakes';
}

export type CompanionMode = 'follow' | 'wait';

export interface Companion {
  /** Its id: COMPANION_IDS and up, so that it is never the id of a player (the horde hunts both). */
  readonly id: number;
  readonly def: CompanionDef;
  /** The id of the player that it follows. */
  leader: number;
  readonly state: PlayerState;
  mode: CompanionMode;
}

/** What happened to a companion: its hit points came to 0, it went, it stopped (no way to its leader), it follows again. */
export interface CompanionEvent {
  readonly id: number;
  readonly def: string;
  readonly kind: 'fell' | 'gone' | 'lost' | 'found';
}

/** The ids of companions start here: the ids of players are small. */
export const COMPANION_IDS = 1_000_000;
/** It stands still this close to its leader (world pixels): about one tile. */
export const FOLLOW_NEAR = 20;
/** More than this many tiles behind, it walks CATCH_UP times faster. */
export const CATCH_UP_TILES = 4;
export const CATCH_UP = 1.2;
/** Its leader more than this many tiles away: it waits. */
export const FOLLOW_LEASH = 20;
/** It looks for a way at most this many tiles round it (on each axis). */
export const FOLLOW_SEARCH = 24;
/** It finds the way again this often (ms), and when its leader goes to another tile. */
export const REPATH_MS = 500;
/** The ticks for each hit point that comes back out of a fight: a player's with CON 10. */
const COMPANION_RECOVER = RECOVER_TICKS;
/** The Armour Class of a companion without one (5e: leather armour and DEX +1). */
export const COMPANION_AC = 12;

interface Brain {
  path: [number, number][];
  /** The tile of the leader when the path was made ("tx,ty"). */
  pathFor: string;
  repathMs: number;
  /** Whether the last search found no way: it waits until a search finds one. */
  noWay: boolean;
  wasDown: boolean;
  /** Where it was STUCK_TICKS ago, to see that it does not move while it walks (a corner): it finds the way again. */
  lastX: number;
  lastY: number;
  stuckTicks: number;
}

/** A companion that walks and moves less than 2 px in this many ticks is stuck: it finds its way again. */
const STUCK_TICKS = 30;

const tileOf = (v: number) => Math.floor(v / TILE_SIZE);
const key = (tx: number, ty: number) => `${tx},${ty}`;

/**
 * The shortest way of tiles from `from` to `to` (four directions), through tiles that a body can
 * walk: open ground, and doors that are not locked or barred. It searches at most FOLLOW_SEARCH
 * tiles round `from`. Returns the tiles after `from`, the last one `to`; null without a way.
 */
export function followPath(world: World, from: readonly [number, number], to: readonly [number, number]): [number, number][] | null {
  const start = key(from[0], from[1]);
  const goal = key(to[0], to[1]);
  if (start === goal) return [];
  if (Math.abs(to[0] - from[0]) > FOLLOW_SEARCH || Math.abs(to[1] - from[1]) > FOLLOW_SEARCH) return null;
  const walkable = (tx: number, ty: number): boolean => {
    if (world.structure(tx, ty) === Structure.Door) return !world.isDoorLocked(tx, ty) && world.doorBar(tx, ty) === null;
    return world.solidBox(tx, ty) === null;
  };
  const cameFrom = new Map<string, string | null>([[start, null]]);
  const queue: [number, number][] = [[from[0], from[1]]];
  for (let head = 0; head < queue.length; head++) {
    const [x, y] = queue[head]!;
    if (key(x, y) === goal) break;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const) {
      const k = key(nx, ny);
      if (cameFrom.has(k) || Math.abs(nx - from[0]) > FOLLOW_SEARCH || Math.abs(ny - from[1]) > FOLLOW_SEARCH) continue;
      if (k !== goal && !walkable(nx, ny)) continue;
      cameFrom.set(k, key(x, y));
      queue.push([nx, ny]);
    }
  }
  if (!cameFrom.has(goal)) return null;
  const path: [number, number][] = [];
  for (let k: string | null = goal; k && k !== start; k = cameFrom.get(k) ?? null) {
    const [x, y] = k.split(',').map(Number);
    path.unshift([x!, y!]);
  }
  return path;
}

/** The companions of a world. */
export class Companions {
  private readonly world: World;
  private readonly all: Companion[] = [];
  private readonly brains = new Map<number, Brain>();
  private nextId = COMPANION_IDS;
  private clockMs = 0;
  /** The doors that companions opened since the last call of takeDoors() (a shared world sends the doors then). */
  private openedDoors = false;

  constructor(world: World) {
    this.world = world;
  }

  get list(): readonly Companion[] {
    return this.all;
  }

  /** Puts a companion into the world next to (x, y) (the nearest open place), following `leader`. */
  add(def: CompanionDef, leader: number, x: number, y: number): Companion {
    const at = resumePoint(this.world, x, y);
    const state = createPlayer(at.x, at.y);
    state.hp = def.hp;
    const companion: Companion = { id: this.nextId++, def, leader, state, mode: 'follow' };
    this.all.push(companion);
    this.brains.set(companion.id, { path: [], pathFor: '', repathMs: 0, noWay: false, wasDown: false, lastX: at.x, lastY: at.y, stuckTicks: 0 });
    return companion;
  }

  remove(id: number): Companion | null {
    const i = this.all.findIndex((c) => c.id === id);
    if (i < 0) return null;
    this.brains.delete(id);
    return this.all.splice(i, 1)[0]!;
  }

  /** The companions that follow a player. */
  ofLeader(leader: number): Companion[] {
    return this.all.filter((c) => c.leader === leader);
  }

  /** Whether companions opened a door since the last call. */
  takeDoors(): boolean {
    const opened = this.openedDoors;
    this.openedDoors = false;
    return opened;
  }

  /** The companions as targets for the horde: mobs hunt them, but they bring no new mobs. */
  targets(): HordePlayer[] {
    return this.all.map((c) => ({ id: c.id, state: c.state, companion: true, traits: { ac: c.def.ac ?? COMPANION_AC } }));
  }

  /**
   * Moves the companions on by `dtMs`, in ticks of TICK_SECONDS (as a player): each one follows
   * its leader (`leaders`: the states of the players by id), or waits. Returns what happened.
   */
  step(dtMs: number, leaders: ReadonlyMap<number, PlayerState>): CompanionEvent[] {
    const events: CompanionEvent[] = [];
    this.clockMs += Math.min(Math.max(0, dtMs), 250);
    const tickMs = TICK_SECONDS * 1000;
    while (this.clockMs >= tickMs) {
      this.clockMs -= tickMs;
      for (const companion of [...this.all]) this.tick(companion, leaders.get(companion.leader) ?? null, events);
    }
    return events;
  }

  private tick(companion: Companion, leader: PlayerState | null, events: CompanionEvent[]): void {
    const brain = this.brains.get(companion.id)!;
    const { state, def } = companion;
    const traits = { maxHp: def.hp, recover: COMPANION_RECOVER, speed: 1 };
    // A defeat: it falls (an event), lies DOWN_TICKS, and then it goes or it stands again.
    if (state.down > 0 && !brain.wasDown) events.push({ id: companion.id, def: def.id, kind: 'fell' });
    brain.wasDown = state.down > 0;
    if (state.down > 0) {
      stepPlayer(state, NO_MOVE, this.world, traits);
      if (state.down === 0) {
        brain.wasDown = false;
        if (def.fallen === 'gone') {
          this.remove(companion.id);
          events.push({ id: companion.id, def: def.id, kind: 'gone' });
          return;
        }
        wakePlayer(state, state.x, state.y, { maxHp: def.hp });
      }
      return;
    }
    const input = leader ? this.follow(companion, brain, leader, events) : NO_MOVE;
    // Stuck on a corner while it walks: a new way at once (it may go to the centre of its tile first).
    if (input !== NO_MOVE && ++brain.stuckTicks >= STUCK_TICKS) {
      if (Math.hypot(state.x - brain.lastX, state.y - brain.lastY) < 2) {
        brain.repathMs = 0;
        brain.path.unshift([tileOf(state.x), tileOf(state.y)]);
      }
      brain.stuckTicks = 0;
      brain.lastX = state.x;
      brain.lastY = state.y;
    }
    const far = leader !== null && Math.hypot(leader.x - state.x, leader.y - state.y) > CATCH_UP_TILES * TILE_SIZE;
    stepPlayer(state, input, this.world, { ...traits, speed: far ? CATCH_UP : 1 });
    // Standing, it looks at its leader.
    if (leader && input === NO_MOVE) state.facing = facingFor(state.facing, { x: leader.x - state.x, y: leader.y - state.y });
  }

  /** Where the companion walks now: along its way to the leader, straight to it when close, or nowhere. */
  private follow(companion: Companion, brain: Brain, leader: PlayerState, events: CompanionEvent[]): MoveInput {
    const { state } = companion;
    const dx = leader.x - state.x;
    const dy = leader.y - state.y;
    const d = Math.hypot(dx, dy);
    const setMode = (mode: CompanionMode) => {
      if (companion.mode === mode) return;
      companion.mode = mode;
      events.push({ id: companion.id, def: companion.def.id, kind: mode === 'wait' ? 'lost' : 'found' });
    };
    if (d > FOLLOW_LEASH * TILE_SIZE) {
      setMode('wait');
      brain.path = [];
      return NO_MOVE;
    }
    // Next to its leader, it is with it again.
    if (d <= FOLLOW_NEAR) {
      setMode('follow');
      return NO_MOVE;
    }
    const here: [number, number] = [tileOf(state.x), tileOf(state.y)];
    const there: [number, number] = [tileOf(leader.x), tileOf(leader.y)];
    brain.repathMs -= TICK_SECONDS * 1000;
    if (brain.pathFor !== key(...there) || brain.repathMs <= 0) {
      const path = followPath(this.world, here, there);
      brain.pathFor = key(...there);
      brain.repathMs = REPATH_MS;
      brain.noWay = path === null;
      brain.path = path ?? [];
    }
    if (brain.noWay) {
      setMode('wait');
      return NO_MOVE;
    }
    setMode('follow');
    // A tile that it stands on is behind it, once it is near the middle of it.
    while (brain.path.length > 0 && brain.path[0]![0] === here[0] && brain.path[0]![1] === here[1]) {
      const middle = standPoint(here[0], here[1]);
      if (Math.hypot(middle.x - state.x, middle.y - state.y) > 3 && brain.path.length > 1) break;
      brain.path.shift();
    }
    // Close (the next tile is the leader's): straight at the leader.
    if (brain.path.length <= 1) return toward(dx, dy);
    const [nx, ny] = brain.path[0]!;
    if (this.world.structure(nx, ny) === Structure.Door && !this.world.isDoorOpen(nx, ny)) {
      this.world.setDoorOpen(nx, ny, true);
      this.openedDoors = true;
    }
    const goal = standPoint(nx, ny);
    return toward(goal.x - state.x, goal.y - state.y);
  }
}

const NO_MOVE: MoveInput = { x: 0, y: 0 };

/** A walk in the direction (dx, dy), at full speed. */
function toward(dx: number, dy: number): MoveInput {
  const d = Math.hypot(dx, dy);
  return d < 0.5 ? NO_MOVE : { x: dx / d, y: dy / d };
}
