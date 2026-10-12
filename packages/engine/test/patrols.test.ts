import { describe, expect, it } from 'vitest';
import {
  AVERAGE_DICE,
  HIDE_MS,
  Horde,
  MOB_KINDS,
  MOB_STATES,
  MOB_STATS,
  NO_INPUT,
  PLAYER_SPEED,
  STARTLE_MS,
  TICK_SECONDS,
  TILE_SIZE,
  World,
  createPlayer,
  dice,
  stepPlayer,
  toWireMob,
  type HordePlayer,
  type Mob,
  type MobKind,
  type MobRules,
  type PlayerState,
} from '../src/index.ts';
import { textSource } from './helpers.ts';

/**
 * The goblins of the forest on the road to Ironhold (the tutorial, docs/drafts/tutorial.md): the
 * skirmisher patrols with its group, startles when it sees a player, then flees or fights; a player
 * catches one that flees; one that gets away hides and goes back to its loop. A world chooses where
 * they live (MobRules.populationAt, roam with the kind).
 */

const TICK_MS = TICK_SECONDS * 1000;
const at = (tx: number, ty: number) => ({ x: tx * TILE_SIZE + 8, y: ty * TILE_SIZE + 12 });
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
/** A player with many hit points: these tests watch what the goblins do, not a defeat. */
const tough = (x: number, y: number): PlayerState => {
  const p = createPlayer(x, y);
  p.hp = 1000;
  return p;
};
/** Open grass everywhere, and no mob comes by itself. */
const open: MobRules = { roam: () => true, hunt: () => true, population: {} };

/** Runs the horde and the players for `ms`, tick by tick; `each` sees every tick (its time in ms). */
function run(horde: Horde, players: HordePlayer[], ms: number, each?: (t: number) => void | boolean): void {
  for (let t = 0; t < ms; t += TICK_MS) {
    for (const p of players) stepPlayer(p.state, NO_INPUT, horde.world);
    horde.step(TICK_MS, players);
    if (each?.(t) === true) return;
  }
}

/** A patrol of three at the tile (0, 0) of an open world, with the seed `seed`. */
function patrol(seed: number, size = 3): { horde: Horde; members: Mob[] } {
  const horde = new Horde(new World(textSource([])), open, seed, AVERAGE_DICE);
  const home = at(0, 0);
  return { horde, members: horde.spawnPatrol('skirmisher', home.x, home.y, size) };
}

/** Runs until the patrol startles at `player` (it stands 6 tiles away, in sight); returns the time. */
function startle(horde: Horde, members: Mob[], player: HordePlayer): number {
  let when = -1;
  run(horde, [player], 5000, (t) => {
    if (members.some((m) => m.state === 'startled')) {
      when = t;
      return true;
    }
  });
  return when;
}

describe('the goblins of the forest (the tutorial)', () => {
  it('are the SRD goblin with a scimitar, slower than a player, and on the wire as new codes', () => {
    const s = MOB_STATS.skirmisher;
    expect([s.health, s.ac, s.toHit, s.xp]).toEqual([7, 15, 4, 50]);
    expect(s.damage).toEqual(dice(1, 6, 2));
    expect(s.arrowRange).toBeUndefined();
    expect(s.chaseSpeed).toBeLessThan(PLAYER_SPEED);
    expect(s.patrol!.fleeSpeed).toBeLessThan(PLAYER_SPEED);
    expect(s.patrol!.group).toEqual([2, 3]);
    // New codes at the end: the old kinds and states keep theirs.
    expect(MOB_KINDS.indexOf('skirmisher')).toBe(12);
    expect(MOB_STATES.slice(10)).toEqual(['startled', 'flee']);
    const mob = { id: 1, kind: 'skirmisher' as MobKind, x: 0, y: 0, vx: 0, vy: 0, facing: 'down' as const, state: 'flee' as const, stateMs: 0, health: 7 };
    expect(toWireMob(mob)[1]).toBe(12);
    expect(toWireMob(mob)[7]).toBe(11);
  });

  it('walk a loop together round the place where they came, while no player is near', () => {
    const { horde, members } = patrol(3);
    const home = at(0, 0);
    // A player far away (30 tiles): the patrol stays, and does not see it.
    const far: HordePlayer = { id: 1, state: tough(home.x + 30 * TILE_SIZE, home.y) };
    const angles = new Set<number>();
    let furthest = 0;
    let apart = 0;
    run(horde, [far], 40_000, () => {
      const lead = members[0]!;
      furthest = Math.max(furthest, dist(lead, home));
      angles.add(Math.floor(((Math.atan2(lead.y - home.y, lead.x - home.x) + Math.PI) / (2 * Math.PI)) * 8));
      apart = Math.max(apart, ...members.map((m) => dist(m, lead)));
      for (const m of members) expect(m.state).toBe('walk');
    });
    // Round the place: on every side of it, never far from it, and the group stays together.
    expect(angles.size).toBeGreaterThanOrEqual(7);
    expect(furthest).toBeLessThan(8 * TILE_SIZE);
    expect(apart).toBeLessThan(3 * TILE_SIZE);
  });

  it('stop short together when one of them sees a player, for a moment, then flee or fight', () => {
    const { horde, members } = patrol(5);
    const home = at(0, 0);
    const player: HordePlayer = { id: 9, state: tough(home.x + 6 * TILE_SIZE, home.y) };
    const began = startle(horde, members, player);
    expect(began).toBeGreaterThanOrEqual(0);
    // The whole group stops short at once, and looks at the player.
    expect(members.map((m) => m.state)).toEqual(['startled', 'startled', 'startled']);
    let ended = -1;
    run(horde, [player], 2000, (t) => {
      if (ended < 0 && members.some((m) => m.state === 'startled')) {
        for (const m of members) if (m.state === 'startled') expect(Math.hypot(m.vx, m.vy)).toBe(0);
      }
      if (ended < 0 && members.every((m) => m.state !== 'startled')) ended = t;
    });
    expect(ended + TICK_MS).toBeGreaterThanOrEqual(STARTLE_MS - 2 * TICK_MS);
    expect(ended + TICK_MS).toBeLessThanOrEqual(STARTLE_MS + 2 * TICK_MS);
  });

  it('in a group, at least one flees and at least one fights; which ones, the dice decide', () => {
    const counts = new Set<number>();
    for (let seed = 1; seed <= 20; seed++) {
      const { horde, members } = patrol(seed);
      const home = at(0, 0);
      const player: HordePlayer = { id: 9, state: tough(home.x + 6 * TILE_SIZE, home.y) };
      startle(horde, members, player);
      run(horde, [player], STARTLE_MS + 100);
      const fleeing = members.filter((m) => m.state === 'flee').length;
      expect(fleeing, `seed ${seed}`).toBeGreaterThanOrEqual(1);
      expect(fleeing, `seed ${seed}`).toBeLessThanOrEqual(2);
      counts.add(fleeing);
    }
    // Both ways happen: one flees, or two flee.
    expect([...counts].sort()).toEqual([1, 2]);
  });

  it('flee slower than a player runs: a player catches one, and it turns and fights', () => {
    const { horde, members } = patrol(2);
    const home = at(0, 0);
    const player: HordePlayer = { id: 9, state: tough(home.x + 6 * TILE_SIZE, home.y) };
    startle(horde, members, player);
    run(horde, [player], STARTLE_MS + 50);
    const runner = members.find((m) => m.state === 'flee')!;
    expect(runner).toBeDefined();
    // The player runs straight at it (80 px/s), tick by tick.
    let fastest = 0;
    let caught = -1;
    for (let t = 0; t < 8000 && caught < 0; t += TICK_MS) {
      const dx = runner.x - player.state.x;
      const dy = runner.y - player.state.y;
      const d = Math.hypot(dx, dy) || 1;
      const step = Math.min(d, (PLAYER_SPEED * TICK_MS) / 1000);
      player.state.x += (dx / d) * step;
      player.state.y += (dy / d) * step;
      horde.step(TICK_MS, [player]);
      if (runner.state === 'flee') fastest = Math.max(fastest, Math.hypot(runner.vx, runner.vy));
      else caught = t;
    }
    expect(fastest).toBeGreaterThan(0);
    expect(fastest).toBeLessThan(PLAYER_SPEED);
    expect(caught).toBeGreaterThan(0);
    expect(['chase', 'windup', 'strike']).toContain(runner.state);
  });

  it('get away from a player that does not follow, hide for a while, and go back to their loop', () => {
    const { horde, members } = patrol(2);
    const home = at(0, 0);
    const player: HordePlayer = { id: 9, state: tough(home.x + 6 * TILE_SIZE, home.y) };
    startle(horde, members, player);
    run(horde, [player], STARTLE_MS + 50);
    const runner = members.find((m) => m.state === 'flee')!;
    // The others fight the player; the runner runs until it is far, then it hides.
    let hidAt = -1;
    run(horde, [player], 10_000, (t) => {
      if (runner.state === 'idle') {
        hidAt = t;
        return true;
      }
    });
    expect(hidAt).toBeGreaterThan(0);
    expect(dist(runner, player.state)).toBeGreaterThan(MOB_STATS.skirmisher.forget - 10);
    // It hides: it stands where it is for HIDE_MS.
    const hideX = runner.x;
    const hideY = runner.y;
    run(horde, [player], HIDE_MS - 500, () => {
      expect(runner.state).toBe('idle');
      expect([runner.x, runner.y]).toEqual([hideX, hideY]);
    });
    // Then it walks back to its loop (or startles again, if it sees the player on the way).
    let moved = false;
    run(horde, [player], 3000, () => {
      if (runner.state === 'walk' || runner.state === 'startled') moved = true;
    });
    expect(moved).toBe(true);
  });

  it('fight when a blow reaches one that flees', () => {
    const { horde, members } = patrol(2);
    const home = at(0, 0);
    const player: HordePlayer = { id: 9, state: tough(home.x + 6 * TILE_SIZE, home.y) };
    startle(horde, members, player);
    run(horde, [player], STARTLE_MS + 50);
    const runner = members.find((m) => m.state === 'flee')!;
    const aim = Math.atan2(runner.y - player.state.y, runner.x - player.state.x);
    horde.strike({ x: runner.x - Math.cos(aim) * 10, y: runner.y - Math.sin(aim) * 10 }, aim, undefined, player.id, { toHit: 99, damage: dice(0, 0, 1), push: 1, stagger: 1 });
    expect(runner.state).toBe('hurt');
    run(horde, [player], 600);
    expect(['chase', 'windup', 'strike', 'retreat']).toContain(runner.state);
  });
});

describe('the mobs of an area (MobRules.populationAt)', () => {
  it('bring the goblins of a forest in groups, and keep imps and brutes out of it', () => {
    // West of x = 0 a forest of goblins; east of it the usual imps and brutes.
    const forest = (tx: number) => tx < 0;
    const rules: MobRules = {
      roam: (tx, _ty, kind) => (kind === 'skirmisher' ? forest(tx) : !forest(tx)),
      hunt: () => true,
      population: { imp: 3, brute: 1 },
      populationAt: (tx) => (forest(tx) ? { skirmisher: 4 } : { imp: 3, brute: 1 }),
    };
    const horde = new Horde(new World(textSource([])), rules, 4, AVERAGE_DICE);
    const west: HordePlayer = { id: 1, state: tough(at(-120, 0).x, at(-120, 0).y) };
    const east: HordePlayer = { id: 2, state: tough(at(120, 0).x, at(120, 0).y) };
    run(horde, [west, east], 60_000);
    const near = (p: HordePlayer) => horde.mobs.filter((m) => dist(m, p.state) < 30 * TILE_SIZE);
    const goblins = near(west);
    expect(goblins.length).toBeGreaterThanOrEqual(4);
    expect(goblins.every((m) => m.kind === 'skirmisher' && m.x < 0)).toBe(true);
    const others = near(east);
    expect(others.length).toBeGreaterThan(0);
    expect(others.every((m) => (m.kind === 'imp' || m.kind === 'brute') && m.x >= 0)).toBe(true);
  });
});
