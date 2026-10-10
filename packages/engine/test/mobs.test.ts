import { describe, expect, it } from 'vitest';
import {
  ATTACK_REACH,
  ATTACK_TICKS,
  GUARD_TICKS,
  Horde,
  MOB_STATS,
  NO_INPUT,
  TICK_SECONDS,
  TILE_SIZE,
  World,
  canBeHit,
  createPlayer,
  facingAngle,
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
    const killed = horde.strike(p, 0);
    expect(killed.map((m: Mob) => m.id)).toEqual([front.id]);
    expect(front.state).toBe('dying');
    expect(behind.state).not.toBe('dying');
    // A second blow does not kill the dying one again.
    expect(horde.strike(p, 0)).toEqual([]);
    const watcher: HordePlayer = { id: 1, state: createPlayer(p.x, p.y + 20 * TILE_SIZE) };
    run(horde, [watcher], MOB_STATS.imp.deathMs + 50);
    expect(horde.mobs.includes(front)).toBe(false);
    expect(horde.mobs.includes(behind)).toBe(true);
  });

  it('die from an attack in any direction: in front of it, not beside it', () => {
    const horde = new Horde(new World(textSource([])), everywhere(), 4);
    const p = createPlayer(0, 0);
    // A mob to the south-east, and one to the north-east (90 degrees from it).
    const southEast = horde.spawn('imp', 14, 14);
    const northEast = horde.spawn('imp', 14, -14);
    expect(horde.strike(p, Math.PI / 4)).toEqual([southEast]);
    expect(northEast.state).not.toBe('dying');
    // Straight east, both are within the arc.
    const east = new Horde(new World(textSource([])), everywhere(), 4);
    east.spawn('imp', 14, 14);
    east.spawn('imp', 14, -14);
    expect(east.strike(p, 0)).toHaveLength(2);
  });

  it('can be hit where the attacker saw them a moment ago', () => {
    const horde = new Horde(new World(textSource([])), everywhere(), 4);
    const p = createPlayer(0, 0);
    const mob = horde.spawn('imp', 80, 0);
    expect(horde.strike(p, 0)).toEqual([]);
    expect(horde.strike(p, 0, () => ({ x: 18, y: 0 }))).toEqual([mob]);
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

describe('mobs that hunt one player', () => {
  /** Three imps round a player who stands still. */
  function pack(seed: number, kinds: Mob['kind'][] = ['imp', 'imp', 'imp']) {
    const horde = new Horde(new World(textSource([])), everywhere(), seed);
    const player: HordePlayer = { id: 1, state: createPlayer(0, 0) };
    const mobs = kinds.map((kind, i) => horde.spawn(kind, Math.cos((i / kinds.length) * 2 * Math.PI) * 90, Math.sin((i / kinds.length) * 2 * Math.PI) * 90));
    return { horde, player, mobs };
  }
  const attacking = (mob: Mob) => mob.state === 'windup' || mob.state === 'strike';

  it('take turns: attacks start one at a time, the others hound the player out of reach, and each one hits', () => {
    for (const kinds of [['imp', 'imp', 'imp'], ['brute', 'imp', 'brute', 'imp']] as Mob['kind'][][]) {
      const { horde, player, mobs } = pack(3, kinds);
      const hitters = new Set<number>();
      let hounded = false;
      run(horde, [player], 30_000, (_t, hits) => {
        for (const [mob] of hits) hitters.add(mob);
        // Never two wind-ups that start together.
        expect(mobs.filter((m) => m.state === 'windup' && m.stateMs <= TICK_MS + 1).length).toBeLessThanOrEqual(1);
        if (!mobs.some(attacking)) return;
        // While mobs attack, the others keep out of the reach of their blows: only the next one comes in.
        expect(mobs.filter((m) => m.state === 'chase' && dist(m, player.state) <= MOB_STATS[m.kind].hitRange).length).toBeLessThanOrEqual(1);
        for (const mob of mobs) if (mob.state === 'chase' && dist(mob, player.state) < MOB_STATS[mob.kind].harass[1] + 8) hounded = true;
      });
      expect(hounded).toBe(true);
      expect(hitters.size).toBe(kinds.length);
    }
  });

  it('hound the player from out of the reach of its attacks', () => {
    for (const kind of ['imp', 'brute'] as const) {
      const stats = MOB_STATS[kind];
      expect(stats.harass[0]).toBeGreaterThan(stats.hitRange);
      expect(stats.harass[0]).toBeGreaterThan(ATTACK_REACH + stats.radius);
    }
  });

  it('overlap their attacks more and more in a bigger pack', () => {
    // The player dodges every blow (no mob can hit it in the tick of a blow), so the attacks
    // follow one another without a stun. When a wind-up starts, how much of the attack before it
    // is left, as a share of its length: at most the overlap of the pack, and nearly that much.
    const shares = [1, 2, 3, 5].map((size) => {
      const { horde, player, mobs } = pack(4, Array.from({ length: size }, () => 'imp' as const));
      const duration = MOB_STATS.imp.windupMs + MOB_STATS.imp.strikeMs;
      const leftOf = (m: Mob) => (m.state === 'windup' ? MOB_STATS.imp.windupMs - m.stateMs + MOB_STATS.imp.strikeMs : MOB_STATS.imp.strikeMs - m.stateMs);
      let most = 0;
      let starts = 0;
      for (let t = 0; t < 20_000; t += TICK_MS) {
        stepPlayer(player.state, NO_INPUT, horde.world);
        if (mobs.some((m) => m.state === 'windup' && m.stateMs + TICK_MS >= MOB_STATS.imp.windupMs)) player.state.guard = 1;
        const before = mobs.filter(attacking);
        expect(horde.step(TICK_MS, [player])).toEqual([]);
        for (const m of mobs.filter((m) => m.state === 'windup' && m.stateMs <= TICK_MS + 1)) {
          starts++;
          for (const other of before) if (other !== m) most = Math.max(most, leftOf(other) / duration);
        }
      }
      expect(starts, `${size} imps`).toBeGreaterThan(10);
      return most;
    });
    expect(shares[0]).toBe(0);
    const overlap = [0, 0.2, 0.4, 0.75];
    shares.forEach((share, i) => {
      expect(share).toBeLessThanOrEqual(overlap[i]! + 0.05);
      if (i > 0) expect(share).toBeGreaterThan(overlap[i]! - 0.12);
    });
  });

  it('time the next blow to come right after the guard of a hit, and never in it', () => {
    const { horde, player } = pack(1);
    const hitTimes: number[] = [];
    run(horde, [player], 30_000, (t, hits) => {
      if (hits.length) hitTimes.push(t);
    });
    const guarded = (MOB_STATS.imp.stunTicks + GUARD_TICKS) * TICK_MS;
    const gaps = hitTimes.slice(1).map((t, i) => t - hitTimes[i]!);
    expect(gaps.length).toBeGreaterThanOrEqual(8);
    for (const gap of gaps) expect(gap).toBeGreaterThanOrEqual(guarded);
    // The first ones run in from far away; then the next blow comes within a moment of the guard's end.
    for (const gap of gaps.slice(2)) expect(gap).toBeLessThan(guarded + 300);
  });

  it('time the next attack to come right after a blow that misses (in a pack of two, a little before its end)', () => {
    const { horde, player, mobs } = pack(2, ['imp', 'imp']);
    const duration = MOB_STATS.imp.windupMs + MOB_STATS.imp.strikeMs;
    let first: Mob | null = null;
    let missed = false;
    let over = -1;
    let next = -1;
    for (let t = 0; t < 10_000 && next < 0; t += TICK_MS) {
      stepPlayer(player.state, NO_INPUT, horde.world);
      // The player dodges the first blow: no mob can hit it in the tick of the blow.
      if (first && !missed && first.state === 'windup' && first.stateMs + TICK_MS >= MOB_STATS.imp.windupMs) {
        player.state.guard = 1;
        missed = true;
      }
      expect(horde.step(TICK_MS, [player])).toEqual([]);
      first ??= mobs.find(attacking) ?? null;
      if (first && missed && over < 0 && !attacking(first)) over = t;
      const other = mobs.find((m) => m !== first && attacking(m));
      if (other) {
        // Not during the first one's wind-up: at most a fifth of its attack is left.
        expect(missed).toBe(true);
        if (over < 0) expect(MOB_STATS.imp.strikeMs - first!.stateMs).toBeLessThanOrEqual(0.2 * duration + TICK_MS);
        next = t;
      }
    }
    expect(next).toBeGreaterThan(0);
    // And if it starts after the end of the first one's blow, then soon after.
    if (over >= 0) expect(next - over).toBeLessThan(120);
  });

  it('stay in the fight while the player moves about: the brutes of a pack attack too', () => {
    const { horde, player, mobs } = pack(6, ['imp', 'imp', 'brute', 'brute']);
    const windups = new Map(mobs.map((m) => [m.id, 0]));
    const giveUps = new Map(mobs.map((m) => [m.id, 0]));
    const was = new Map(mobs.map((m) => [m.id, m.state as string]));
    for (let t = 0; t < 60_000; t += TICK_MS) {
      // Slowly round a wide circle, slower than a brute: far from where the mobs came from.
      const a = t / 6000;
      stepPlayer(player.state, { x: 0.4 * Math.cos(a), y: 0.4 * Math.sin(a) }, horde.world);
      horde.step(TICK_MS, [player]);
      for (const m of mobs) {
        if (m.state !== was.get(m.id)) {
          if (m.state === 'windup') windups.set(m.id, windups.get(m.id)! + 1);
          if (m.state === 'walk') giveUps.set(m.id, giveUps.get(m.id)! + 1);
          was.set(m.id, m.state);
        }
      }
    }
    for (const m of mobs) {
      expect(windups.get(m.id), `${m.kind} ${m.id} attacks`).toBeGreaterThanOrEqual(3);
      expect(giveUps.get(m.id), `${m.kind} ${m.id} gives up`).toBeLessThanOrEqual(1);
    }
  });

  it('take turns for each player alone: two players can be attacked at once', () => {
    const horde = new Horde(new World(textSource([])), everywhere(), 4);
    const a: HordePlayer = { id: 1, state: createPlayer(0, 0) };
    const b: HordePlayer = { id: 2, state: createPlayer(12 * TILE_SIZE, 0) };
    horde.spawn('imp', a.state.x + 40, a.state.y);
    horde.spawn('imp', b.state.x + 40, b.state.y);
    let both = false;
    run(horde, [a, b], 6000, () => {
      if (horde.mobs.filter((m) => m.state === 'windup' || m.state === 'strike').length === 2) both = true;
    });
    expect(both).toBe(true);
  });
});

describe('a brute in a fight', () => {
  it('takes three blows; each one pushes it away from the attacker and breaks its wind-up', () => {
    const horde = new Horde(new World(textSource([])), everywhere(), 21);
    const p = createPlayer(at(5, 5).x, at(5, 5).y);
    const players: HordePlayer[] = [{ id: 7, state: p }];
    const brute = horde.spawn('brute', p.x + 18, p.y);
    // Let it wind up.
    for (let i = 0; i < 200 && brute.state !== 'windup'; i++) horde.step(TICK_MS, players);
    expect(brute.state).toBe('windup');
    for (let blow = 1; blow <= 2; blow++) {
      // Step up to it and strike.
      p.x = brute.x - 18;
      p.y = brute.y;
      const startX = brute.x;
      expect(horde.strike(p, 0, undefined, 7)).toEqual([brute]);
      expect(brute.state).toBe('hurt');
      expect(brute.health).toBe(3 - blow);
      for (let t = 0; t < MOB_STATS.brute.hurtMs; t += TICK_MS) horde.step(TICK_MS, players);
      // Pushed back east, away from the player, and then after the player again.
      expect(brute.x - startX).toBeGreaterThan(MOB_STATS.brute.knockback - 2);
      expect(brute.state).toBe('chase');
    }
    p.x = brute.x - 18;
    p.y = brute.y;
    horde.strike(p, 0, undefined, 7);
    expect(brute.state).toBe('dying');
    expect(brute.health).toBe(0);
  });

  it('turns on the player who hit it, even if it had not seen that player', () => {
    const horde = new Horde(new World(textSource([])), everywhere(), 22);
    const p = createPlayer(0, 0);
    const brute = horde.spawn('brute', 20, 0);
    horde.strike(p, 0, undefined, 3);
    expect(brute.state).toBe('hurt');
    for (let t = 0; t <= MOB_STATS.brute.hurtMs; t += TICK_MS) horde.step(TICK_MS, [{ id: 3, state: p }]);
    expect(brute.state).toBe('chase');
  });
});

describe('the player in a fight', () => {
  const world = new World(textSource([]));

  it('attacks with an input, stands still while it strikes, and waits for the cooldown', () => {
    const p: PlayerState = createPlayer(0, 0);
    expect(stepPlayer(p, { x: 1, y: 0, attack: facingAngle('up') }, world)).toBe(true);
    expect(p.facing).toBe('up');
    expect(p.attack).toBe(ATTACK_TICKS);
    for (let i = 0; i < ATTACK_TICKS; i++) expect(stepPlayer(p, { x: 1, y: 0, attack: facingAngle('up') }, world)).toBe(false);
    expect(p.x).toBe(0);
    expect(p.attack).toBe(0);
    // The cooldown is not over yet: the input walks instead.
    expect(stepPlayer(p, { x: 1, y: 0, attack: facingAngle('up') }, world)).toBe(false);
    let ticks = 0;
    while (!stepPlayer(p, { x: 0, y: 0, attack: facingAngle('left') }, world)) ticks++;
    expect(ticks).toBeLessThan(20);
    expect(p.facing).toBe('left');
  });

  it('attacks in the exact direction of the input, and faces the nearest side', () => {
    const p: PlayerState = createPlayer(0, 0);
    expect(stepPlayer(p, { x: 0, y: 0, attack: 2.5 }, world)).toBe(true);
    expect(p.aim).toBe(2.5);
    expect(p.facing).toBe('left');
    // An angle out of range is put in (-PI, PI]; an attack without a finite direction is no attack.
    const q: PlayerState = createPlayer(0, 0);
    expect(stepPlayer(q, { x: 0, y: 0, attack: 2 * Math.PI + 1 }, world)).toBe(true);
    expect(q.aim).toBeCloseTo(1);
    expect(q.facing).toBe('down');
    expect(stepPlayer(createPlayer(0, 0), { x: 0, y: 0, attack: Number.NaN }, world)).toBe(false);
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
    expect(stepPlayer(p, { x: 1, y: 0, attack: 0 }, world)).toBe(false);
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
