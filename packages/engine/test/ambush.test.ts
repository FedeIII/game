import { describe, expect, it } from 'vitest';
import {
  AVERAGE_DICE,
  Horde,
  MOB_KINDS,
  MOB_LOOT,
  MOB_STATES,
  MOB_STATS,
  NO_INPUT,
  PLAYER_SPEED,
  TICK_SECONDS,
  TILE_SIZE,
  World,
  createPlayer,
  dice,
  kindBehaviour,
  populationArea,
  stepPlayer,
  toWireMob,
  type HordePlayer,
  type Mob,
  type MobArea,
  type MobRules,
  type PlayerState,
} from '../src/index.ts';
import { textSource } from './helpers.ts';

/**
 * The mobs of an area follow the hour (Fede, 2026-10-13; docs/features/game/day-and-night.md): an area
 * gives its mobs by day and at night (MobArea), with a frequency and a behaviour. The bandits of the
 * forest by day ambush a player: they hide (state 'lurk'), creep after it unseen and spring at it.
 */

const TICK_MS = TICK_SECONDS * 1000;
const MINUTE = 60_000;
const at = (tx: number, ty: number) => ({ x: tx * TILE_SIZE + 8, y: ty * TILE_SIZE + 12 });
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
/** A player with many hit points: these tests watch what the mobs do, not a defeat. */
const tough = (x: number, y: number): PlayerState => {
  const p = createPlayer(x, y);
  p.hp = 1000;
  return p;
};
/** Open grass everywhere, and no mob comes by itself. */
const open: MobRules = { roam: () => true, hunt: () => true, population: {} };

/** Runs the horde and the players for `ms`, tick by tick; `each` sees every tick (its time in ms) and can stop the run. */
function run(horde: Horde, players: HordePlayer[], ms: number, each?: (t: number) => void | boolean): void {
  for (let t = 0; t < ms; t += TICK_MS) {
    for (const p of players) stepPlayer(p.state, NO_INPUT, horde.world);
    horde.step(TICK_MS, players);
    if (each?.(t) === true) return;
  }
}

/** A forest as the Wilds' (FOREST_MOBS): goblin patrols at night, rare bandits by day. */
const FOREST: MobArea = {
  night: [{ kind: 'skirmisher', count: 3, behaviour: 'patrol' }],
  day: [{ kind: 'bandit', count: 3, behaviour: 'ambush', group: [1, 3], every: 2 * MINUTE }],
};
const forest: MobRules = { roam: () => true, hunt: () => true, population: {}, areaAt: () => FOREST };

describe('the bandit', () => {
  it('is the SRD bandit, at the level of a goblin, and on the wire as new codes', () => {
    const s = MOB_STATS.bandit;
    expect([s.health, s.ac, s.toHit, s.xp]).toEqual([11, 12, 3, 25]);
    expect(s.damage).toEqual(dice(1, 6, 1));
    expect(s.chaseSpeed).toBeLessThan(PLAYER_SPEED);
    expect(s.ambush!.creepSpeed).toBeLessThan(PLAYER_SPEED);
    expect(s.ambush!.group).toEqual([1, 3]);
    expect(kindBehaviour('bandit')).toBe('ambush');
    expect(kindBehaviour('skirmisher')).toBe('patrol');
    expect(kindBehaviour('imp')).toBe('wander');
    // Coins are scarce: a coin or two in one kill of three.
    expect(MOB_LOOT.bandit).toEqual({ coins: [1, 2], coinChance: 1 / 3 });
    // New codes at the end: the old kinds and states keep theirs.
    expect(MOB_KINDS.indexOf('bandit')).toBe(13);
    expect(MOB_STATES.indexOf('lurk')).toBe(12);
    const mob: Mob = { id: 1, kind: 'bandit', x: 0, y: 0, vx: 0, vy: 0, facing: 'down', state: 'lurk', stateMs: 0, health: 11 };
    expect(toWireMob(mob)[1]).toBe(13);
    expect(toWireMob(mob)[7]).toBe(12);
  });
});

describe('the mobs of an area by day and at night (MobArea)', () => {
  it('is the same by day and at night for a plain population', () => {
    const area = populationArea({ brute: 2, imp: 4 });
    expect(area.night).toEqual([
      { kind: 'imp', count: 4 },
      { kind: 'brute', count: 2 },
    ]);
    expect(area.day).toBe(area.night);
  });

  it('brings goblin patrols at night, and at dawn they go away out of view', () => {
    const horde = new Horde(new World(textSource([])), forest, 3, AVERAGE_DICE);
    const player: HordePlayer = { id: 1, state: tough(at(0, 0).x, at(0, 0).y) };
    run(horde, [player], 20_000);
    const goblins = horde.mobs.filter((m) => m.kind === 'skirmisher');
    expect(goblins.length).toBeGreaterThanOrEqual(2);
    expect(horde.mobs.some((m) => m.kind === 'bandit')).toBe(false);
    // Day: while the player could see them, they stay; out of its view, they go.
    horde.daytime = true;
    const far = Math.min(...goblins.map((m) => dist(m, player.state)));
    expect(far).toBeGreaterThan(17 * TILE_SIZE - 1);
    run(horde, [player], 1000);
    expect(horde.mobs.some((m) => m.kind === 'skirmisher')).toBe(false);
  });

  it('keeps a mob of the area while a player is close enough to see it go', () => {
    const horde = new Horde(new World(textSource([])), forest, 5, AVERAGE_DICE);
    const player: HordePlayer = { id: 1, state: tough(at(0, 0).x, at(0, 0).y) };
    run(horde, [player], 20_000);
    const goblins = horde.mobs.filter((m) => m.kind === 'skirmisher');
    expect(goblins.length).toBeGreaterThan(0);
    // The player walks up to them before the dawn: they stay while it is near.
    player.state.x = goblins[0]!.x - 12 * TILE_SIZE;
    player.state.y = goblins[0]!.y;
    horde.daytime = true;
    horde.step(TICK_MS, [player]);
    expect(horde.mobs).toContain(goblins[0]);
  });

  it('brings the rare bandits by day only after their wait, as a hidden group ahead of the player', () => {
    const horde = new Horde(new World(textSource([])), forest, 7, AVERAGE_DICE);
    horde.daytime = true;
    const player: HordePlayer = { id: 1, state: tough(at(0, 0).x, at(0, 0).y) };
    // The first wait is from half of `every` to one and a half times it: none in the first minute.
    run(horde, [player], MINUTE - 1000);
    expect(horde.mobs).toEqual([]);
    let came = -1;
    run(horde, [player], 3 * MINUTE, (t) => {
      if (horde.mobs.length > 0) {
        came = t;
        return true;
      }
    });
    expect(came).toBeGreaterThanOrEqual(0);
    const group = horde.mobs;
    expect(group.length).toBeGreaterThanOrEqual(1);
    expect(group.length).toBeLessThanOrEqual(3);
    expect(group.every((m) => m.kind === 'bandit' && m.state === 'lurk')).toBe(true);
    // Ahead of the player (it faces down: south), 11 to 15 tiles away.
    const d = dist(group[0]!, player.state);
    expect(d).toBeGreaterThan(10 * TILE_SIZE);
    expect(d).toBeLessThan(16.5 * TILE_SIZE);
    expect(group[0]!.y).toBeGreaterThan(player.state.y);
    // Lurkers do not hunt: no mark of the sense for them.
    expect(horde.huntersOf(1)).toEqual([]);
  });

  it('comes seldom: a group about every `every` round a player, not at once after a fight', () => {
    const horde = new Horde(new World(textSource([])), forest, 11, AVERAGE_DICE);
    horde.daytime = true;
    const player: HordePlayer = { id: 1, state: tough(at(0, 0).x, at(0, 0).y) };
    const seen = new Set<number>();
    let groups = 0;
    run(horde, [player], 20 * MINUTE, () => {
      const fresh = horde.mobs.filter((m) => !seen.has(m.id));
      if (fresh.length > 0) groups++;
      fresh.forEach((m) => seen.add(m.id));
      // The player kills each bandit at once: the area wants more, but they wait.
      for (const m of horde.mobs) if (m.state !== 'dying') horde.strike(m, 0, undefined, 1, { toHit: 99, damage: dice(0, 0, 99), push: 0, stagger: 0 });
    });
    // 20 minutes with a mean wait of 2 minutes: about 10 groups, never one at each spawn gap.
    expect(groups).toBeGreaterThanOrEqual(5);
    expect(groups).toBeLessThanOrEqual(20);
  });
});

describe('an ambush', () => {
  /** An ambush of `size` bandits at (tx, ty) of an open world. */
  function ambush(tx: number, ty: number, size: number, seed = 1): { horde: Horde; members: Mob[] } {
    const horde = new Horde(new World(textSource([])), open, seed, AVERAGE_DICE);
    return { horde, members: horde.spawnAmbush('bandit', at(tx, ty).x, at(tx, ty).y, size) };
  }

  it('creeps after a player that stands, holds still close to it, then springs at it', () => {
    const { horde, members } = ambush(14, 0, 3);
    const player: HordePlayer = { id: 1, state: tough(at(0, 0).x, at(0, 0).y) };
    const start = dist(members[0]!, player.state);
    let held = -1;
    let sprang = -1;
    run(horde, [player], 20_000, (t) => {
      const lead = members[0]!;
      if (held < 0 && lead.state === 'lurk' && dist(lead, player.state) <= MOB_STATS.bandit.ambush!.hold && lead.vx === 0 && lead.vy === 0) held = t;
      if (members.every((m) => m.state !== 'lurk')) {
        sprang = t;
        return true;
      }
    });
    expect(dist(members[0]!, player.state)).toBeLessThan(start);
    expect(held).toBeGreaterThan(0);
    expect(sprang).toBeGreaterThan(held);
    // It held still for its hold time before it sprang.
    expect(sprang - held).toBeGreaterThanOrEqual(MOB_STATS.bandit.ambush!.holdMs - 200);
    expect(horde.huntersOf(1).length).toBe(3);
  });

  it('springs at once at a player that walks into it', () => {
    const { horde, members } = ambush(4, 0, 2);
    const player: HordePlayer = { id: 1, state: tough(at(0, 0).x, at(0, 0).y) };
    let sprang = false;
    for (let t = 0; t < 3000 && !sprang; t += TICK_MS) {
      stepPlayer(player.state, { x: 1, y: 0 }, horde.world);
      horde.step(TICK_MS, [player]);
      sprang = members.every((m) => m.state === 'chase');
    }
    expect(sprang).toBe(true);
    const nearest = Math.min(...members.map((m) => dist(m, player.state)));
    expect(nearest).toBeLessThanOrEqual(MOB_STATS.bandit.ambush!.spring + PLAYER_SPEED * TICK_SECONDS * 2);
  });

  it('follows a player that walks on, unseen, slower than the player', () => {
    const { horde, members } = ambush(-10, 0, 1);
    const player: HordePlayer = { id: 1, state: tough(at(0, 0).x, at(0, 0).y) };
    const before = { x: members[0]!.x, y: members[0]!.y };
    for (let t = 0; t < 4000; t += TICK_MS) {
      stepPlayer(player.state, { x: 1, y: 0 }, horde.world);
      horde.step(TICK_MS, [player]);
    }
    const lurker = members[0]!;
    expect(lurker.state).toBe('lurk');
    expect(lurker.x).toBeGreaterThan(before.x + 4 * TILE_SIZE);
    expect(dist(lurker, player.state)).toBeGreaterThan(10 * TILE_SIZE);
  });

  it('springs at a blow, and the blow takes the struck one unaware (a sneak attack)', () => {
    const { horde, members } = ambush(1, 0, 3);
    const player = tough(at(0, 0).x, at(0, 0).y);
    const target = members[0]!;
    const blow = { toHit: 99, damage: dice(1, 4), push: 0, stagger: 0, sneak: dice(1, 6) };
    const result = horde.strike(player, Math.atan2(target.y - player.y, target.x - player.x), undefined, 1, blow).find((r) => r.mob === target);
    expect(result).toBeDefined();
    // 1d4 (2.5) + the sneak 1d6 (3.5), at their averages.
    expect(result!.damage).toBeGreaterThanOrEqual(5);
    expect(members.every((m) => m.state === 'chase' || m.state === 'hurt')).toBe(true);
  });

  it('hides again after a hunt that it gives up', () => {
    const { horde, members } = ambush(14, 0, 1);
    const player: HordePlayer = { id: 1, state: tough(at(0, 0).x, at(0, 0).y) };
    run(horde, [player], 20_000, () => members[0]!.state === 'chase');
    expect(members[0]!.state).toBe('chase');
    // The player is far away (out of the bandit's sight, but not so far that the bandit goes away):
    // the bandit gives up, rests, and lurks again.
    player.state.x = members[0]!.x + 30 * TILE_SIZE;
    player.state.y = members[0]!.y;
    run(horde, [player], 8000);
    expect(horde.mobs).toContain(members[0]);
    expect(members[0]!.state).toBe('lurk');
  });

  it('does not stalk a player in a place where it may not go (a town), or a defeated one', () => {
    const rules: MobRules = { roam: () => true, hunt: (tx) => tx < 0, population: {} };
    const horde = new Horde(new World(textSource([])), rules, 1, AVERAGE_DICE);
    const [bandit] = horde.spawnAmbush('bandit', at(-10, 0).x, at(-10, 0).y, 1);
    const inTown: HordePlayer = { id: 1, state: tough(at(2, 0).x, at(2, 0).y) };
    const before = { x: bandit!.x, y: bandit!.y };
    run(horde, [inTown], 3000);
    expect(bandit!.state).toBe('lurk');
    expect(dist(bandit!, before)).toBeLessThan(1);
    const down: HordePlayer = { id: 2, state: tough(at(-14, 0).x, at(-14, 0).y) };
    down.state.down = 100;
    run(horde, [down], 1000);
    expect(bandit!.state).toBe('lurk');
  });
});
