import { describe, expect, it } from 'vitest';
import {
  ATTACK_TICKS,
  GUARD_TICKS,
  Horde,
  MOB_STATS,
  NO_INPUT,
  TICK_SECONDS,
  TILE_SIZE,
  World,
  createPlayer,
  stepPlayer,
  type HordePlayer,
  type Mob,
  type MobRules,
  type PlayerState,
} from '../src/index.ts';
import { houseSource, textSource } from './helpers.ts';

const TICK_MS = TICK_SECONDS * 1000;
const NONE = { imp: 0, brute: 0 } as const;
const everywhere = (population: MobRules['population'] = NONE): MobRules => ({ roam: () => true, hunt: () => true, population });

/** Runs the horde and the players together for `ms`, tick by tick; `each` sees every tick. */
function run(horde: Horde, players: HordePlayer[], ms: number, each?: (t: number, hits: [number, number][]) => void): [number, number][] {
  const all: [number, number][] = [];
  for (let t = 0; t < ms; t += TICK_MS) {
    for (const p of players) stepPlayer(p.state, NO_INPUT, horde.world);
    const hits = horde.step(TICK_MS, players);
    all.push(...hits);
    each?.(t, hits);
  }
  return all;
}

const at = (tx: number, ty: number) => ({ x: tx * TILE_SIZE + 8, y: ty * TILE_SIZE + 12 });
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('mobs', () => {
  it('wander round their home while no player is near', () => {
    const horde = new Horde(new World(textSource([])), everywhere(), 1);
    const home = at(0, 0);
    const mob = horde.spawn('imp', home.x, home.y);
    // A player far away (30 tiles): the mob stays, but it does not see it or prowl towards it.
    const far: HordePlayer = { id: 1, state: createPlayer(home.x + 30 * TILE_SIZE, home.y) };
    let furthest = 0;
    let walked = false;
    run(horde, [far], 60_000, () => {
      furthest = Math.max(furthest, dist(mob, home));
      if (mob.state === 'walk') walked = true;
    });
    expect(walked).toBe(true);
    expect(furthest).toBeLessThan(5 * TILE_SIZE);
    expect(mob.state === 'idle' || mob.state === 'walk').toBe(true);
  });

  it('run at a player they see, on a curved path, and wind up when close', () => {
    let bent = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const horde = new Horde(new World(textSource([])), everywhere(), seed);
      const start = at(0, 0);
      const mob = horde.spawn('imp', start.x, start.y);
      const player: HordePlayer = { id: 7, state: createPlayer(start.x + 6 * TILE_SIZE, start.y) };
      let wound = false;
      let off = 0;
      run(horde, [player], 4000, () => {
        // How far the mob is off the straight line from its start to the player.
        off = Math.max(off, Math.abs(mob.y - start.y));
        if (mob.state === 'windup') wound = true;
      });
      expect(wound).toBe(true);
      bent += off > 6 ? 1 : 0;
    }
    expect(bent).toBe(6);
  });

  it('do not see a player out of sight, behind a house, or in a house', () => {
    const horde = new Horde(new World(houseSource()), everywhere(), 3);
    // The house is x 2..8, y 2..6. A mob north of it and a player south of it, 7 tiles apart.
    const north = at(5, 0);
    const mob = horde.spawn('imp', north.x, north.y);
    const south: HordePlayer = { id: 1, state: createPlayer(at(5, 7).x, at(5, 7).y) };
    run(horde, [south], 3000);
    expect(mob.state === 'idle' || mob.state === 'walk').toBe(true);
    // A player inside, by the door: the mob does not hunt it either.
    const inside: HordePlayer = { id: 2, state: createPlayer(at(5, 5).x, at(5, 5).y) };
    const outside = at(5, 9);
    const other = horde.spawn('brute', outside.x, outside.y);
    run(horde, [inside], 3000);
    expect(other.state === 'idle' || other.state === 'walk').toBe(true);
  });

  it('stun the player with a hit, run away, and come back for another attack after the guard', () => {
    const horde = new Horde(new World(textSource([])), everywhere(), 5);
    const start = at(0, 0);
    const mob = horde.spawn('imp', start.x, start.y);
    const player: HordePlayer = { id: 9, state: createPlayer(start.x + 4 * TILE_SIZE, start.y) };
    const hitTimes: number[] = [];
    let ranAway = false;
    let bestRetreat = 0;
    run(horde, [player], 12_000, (t, hits) => {
      if (hits.length > 0) {
        hitTimes.push(t);
        expect(player.state.stun).toBe(MOB_STATS.imp.stunTicks);
      }
      if (mob.state === 'retreat') {
        ranAway = true;
        bestRetreat = Math.max(bestRetreat, dist(mob, player.state));
      }
    });
    expect(hitTimes.length).toBeGreaterThanOrEqual(2);
    expect(ranAway).toBe(true);
    expect(bestRetreat).toBeGreaterThan(3 * TILE_SIZE);
    // No second hit before the stun and the guard after it are over.
    const stunMs = (MOB_STATS.imp.stunTicks + GUARD_TICKS) * TICK_MS;
    for (let i = 1; i < hitTimes.length; i++) expect(hitTimes[i]! - hitTimes[i - 1]!).toBeGreaterThanOrEqual(stunMs);
  });

  it('miss a player who walks away during the wind-up', () => {
    const horde = new Horde(new World(textSource([])), everywhere(), 2);
    const start = at(0, 0);
    const mob = horde.spawn('brute', start.x, start.y);
    const state = createPlayer(start.x + 3 * TILE_SIZE, start.y);
    const player: HordePlayer = { id: 4, state };
    let hits = 0;
    let missed = false;
    for (let t = 0; t < 8000; t += TICK_MS) {
      // Walk away (east) as soon as the brute winds up.
      stepPlayer(state, mob.state === 'windup' ? { x: 1, y: 0 } : NO_INPUT, horde.world);
      hits += horde.step(TICK_MS, [player]).length;
      if (mob.state === 'strike' && mob.stateMs <= TICK_MS + 1 && hits === 0) missed = true;
    }
    expect(missed).toBe(true);
    expect(hits).toBe(0);
  });

  it('die from an attack in front, not from one behind, and are gone after the animation', () => {
    const horde = new Horde(new World(textSource([])), everywhere(), 4);
    const p = createPlayer(at(5, 5).x, at(5, 5).y);
    const front = horde.spawn('imp', p.x + 20, p.y);
    const behind = horde.spawn('brute', p.x - 24, p.y);
    const killed = horde.strike(p, 'right');
    expect(killed.map((m: Mob) => m.id)).toEqual([front.id]);
    expect(front.state).toBe('dying');
    expect(behind.state).not.toBe('dying');
    // A second blow does not kill the dying one again.
    expect(horde.strike(p, 'right')).toEqual([]);
    const watcher: HordePlayer = { id: 1, state: createPlayer(p.x, p.y + 20 * TILE_SIZE) };
    run(horde, [watcher], MOB_STATS.imp.deathMs + 50);
    expect(horde.mobs.includes(front)).toBe(false);
    expect(horde.mobs.includes(behind)).toBe(true);
  });

  it('can be hit where the attacker saw them a moment ago', () => {
    const horde = new Horde(new World(textSource([])), everywhere(), 4);
    const p = createPlayer(0, 0);
    const mob = horde.spawn('imp', 80, 0);
    expect(horde.strike(p, 'right')).toEqual([]);
    expect(horde.strike(p, 'right', () => ({ x: 18, y: 0 }))).toEqual([mob]);
  });

  it('come out of the sight of the players, up to the population of the world', () => {
    const horde = new Horde(new World(textSource([])), everywhere({ imp: 3, brute: 2 }), 8);
    const player: HordePlayer = { id: 1, state: createPlayer(0, 0) };
    const seen = new Set<number>();
    let nearest = Infinity;
    run(horde, [player], 30_000, () => {
      for (const mob of horde.mobs) {
        if (seen.has(mob.id)) continue;
        seen.add(mob.id);
        nearest = Math.min(nearest, dist(mob, player.state));
      }
    });
    expect(horde.mobs.filter((m) => m.kind === 'imp')).toHaveLength(3);
    expect(horde.mobs.filter((m) => m.kind === 'brute')).toHaveLength(2);
    expect(nearest).toBeGreaterThanOrEqual(17 * TILE_SIZE - 16);
  });

  it('never step into a building, nor out of the ground that the world lets them hunt', () => {
    // Mobs may hunt only at x < 10. A player at x 14 is out of their reach.
    const rules: MobRules = { roam: (tx) => tx < 8, hunt: (tx) => tx < 10, population: NONE };
    const horde = new Horde(new World(houseSource()), rules, 6);
    const mobs = [horde.spawn('imp', at(5, 9).x, at(5, 9).y), horde.spawn('brute', at(1, 1).x, at(1, 1).y)];
    const player: HordePlayer = { id: 1, state: createPlayer(at(10, 8).x + 1, at(10, 8).y) };
    run(horde, [player], 20_000, () => {
      for (const mob of mobs) {
        const tx = Math.floor(mob.x / TILE_SIZE);
        const ty = Math.floor(mob.y / TILE_SIZE);
        expect(tx).toBeLessThan(10);
        expect(horde.world.buildingAt(tx, ty)).toBeNull();
      }
    });
  });
});

describe('the player in a fight', () => {
  const world = new World(textSource([]));

  it('attacks with an input, stands still while it strikes, and waits for the cooldown', () => {
    const p: PlayerState = createPlayer(0, 0);
    expect(stepPlayer(p, { x: 1, y: 0, attack: 'up' }, world)).toBe(true);
    expect(p.facing).toBe('up');
    expect(p.attack).toBe(ATTACK_TICKS);
    for (let i = 0; i < ATTACK_TICKS; i++) expect(stepPlayer(p, { x: 1, y: 0, attack: 'up' }, world)).toBe(false);
    expect(p.x).toBe(0);
    expect(p.attack).toBe(0);
    // The cooldown is not over yet: the input walks instead.
    expect(stepPlayer(p, { x: 1, y: 0, attack: 'up' }, world)).toBe(false);
    let ticks = 0;
    while (!stepPlayer(p, { x: 0, y: 0, attack: 'left' }, world)) ticks++;
    expect(ticks).toBeLessThan(20);
    expect(p.facing).toBe('left');
  });

  it('cannot move or attack while stunned, and cannot be hit just after', () => {
    const horde = new Horde(world, everywhere(), 1);
    const mob = horde.spawn('imp', 12, 0);
    const p = createPlayer(0, 0);
    const players = [{ id: 1, state: p }];
    // Let the imp hit the player.
    for (let i = 0; i < 120 && p.stun === 0; i++) horde.step(TICK_MS, players);
    expect(p.stun).toBeGreaterThan(0);
    expect(mob.state).toBe('strike');
    const before = { x: p.x, y: p.y };
    expect(stepPlayer(p, { x: 1, y: 0, attack: 'right' }, world)).toBe(false);
    expect({ x: p.x, y: p.y }).toEqual(before);
    while (p.stun > 0) stepPlayer(p, NO_INPUT, world);
    expect(p.guard).toBe(GUARD_TICKS);
  });

  it('prowl towards a player who stands still, find it and attack', () => {
    const horde = new Horde(new World(textSource([])), everywhere(), 12);
    const mob = horde.spawn('brute', 20 * TILE_SIZE, 0);
    const player: HordePlayer = { id: 1, state: createPlayer(0, 0) };
    let came = false;
    run(horde, [player], 180_000, () => {
      if (mob.state === 'chase') came = true;
    });
    expect(came).toBe(true);
  });
});

