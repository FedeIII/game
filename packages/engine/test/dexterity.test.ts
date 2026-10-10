import { describe, expect, it } from 'vitest';
import {
  ATTACK_COOLDOWN_TICKS,
  DODGE_COOLDOWN_TICKS,
  DODGE_DISTANCE,
  DODGE_TICKS,
  EMPTY_PACK,
  GUARD_TICKS,
  Horde,
  MOB_STATS,
  NO_INPUT,
  PLAIN_SCORES,
  Room,
  Spoils,
  TICK_SECONDS,
  TILE_SIZE,
  World,
  appearanceSeed,
  canBeHit,
  createPlayer,
  fromWireInput,
  guestTraits,
  isSneaking,
  parseClientMessage,
  sightOf,
  stepPlayer,
  stunPlayer,
  toWireInput,
  traitsOf,
  type CharacterClass,
  type MobRules,
  type Scores,
  type SnapshotMessage,
} from '../src/index.ts';
import { LOOT_CHEST, lootHouseSource, mobHouseSource, textSource } from './helpers.ts';

const TICK_MS = TICK_SECONDS * 1000;
const withDex = (dex: number, cls: CharacterClass = 'rogue') => traitsOf({ ...PLAIN_SCORES, dex } as Scores, cls);
const everywhere: MobRules = { roam: () => true, hunt: () => true, population: { imp: 0, brute: 0 } };

describe('the Dexterity traits', () => {
  it('give the cooldown, the guard, the dodge and the sight of mobs', () => {
    const quick = withDex(17);
    expect(quick.cooldown).toBe(ATTACK_COOLDOWN_TICKS - 6);
    expect(quick.guard).toBe(GUARD_TICKS + 27);
    expect(quick.dodgeCooldown).toBe(DODGE_COOLDOWN_TICKS - 36);
    expect(quick.sight).toBeCloseTo(0.76);
    const slow = withDex(8);
    expect(slow.cooldown).toBe(29);
    expect(slow.guard).toBe(51);
    expect(slow.dodgeCooldown).toBe(108);
    expect(slow.sight).toBeCloseTo(1.08);
  });

  it('make a ranger shoot, 5 tiles and one more for each point of the modifier', () => {
    expect(withDex(10, 'ranger').ranged).toBe(true);
    expect(withDex(10, 'ranger').range).toBe(5 * TILE_SIZE);
    expect(withDex(17, 'ranger').range).toBe(8 * TILE_SIZE);
    expect(withDex(17, 'rogue').ranged).toBe(false);
  });

  it('of a guest come from the class of its look', () => {
    expect(guestTraits(appearanceSeed({ race: 'elf', class: 'ranger', gender: 'female', variant: 3 })).ranged).toBe(true);
    expect(guestTraits(appearanceSeed({ race: 'elf', class: 'wizard', gender: 'female', variant: 3 })).attack).toBe('int');
  });
});

describe('a dodge', () => {
  const open = new World(textSource([]));

  it('rolls DODGE_DISTANCE the way the player walks, and no mob can hit it meanwhile', () => {
    const p = createPlayer(100, 100);
    stepPlayer(p, { x: 1, y: 0, dodge: true }, open);
    expect(canBeHit(p)).toBe(false);
    for (let i = 1; i < DODGE_TICKS; i++) stepPlayer(p, NO_INPUT, open);
    expect(p.dodge).toBe(0);
    expect(p.x).toBeCloseTo(100 + DODGE_DISTANCE, 6);
    expect(canBeHit(p)).toBe(true);
  });

  it('goes the way the player faces when it stands, and the next waits for the cooldown of its Dexterity', () => {
    const traits = withDex(16);
    const p = createPlayer(100, 100);
    p.facing = 'up';
    stepPlayer(p, { x: 0, y: 0, dodge: true }, open, traits);
    for (let i = 1; i < DODGE_TICKS; i++) stepPlayer(p, NO_INPUT, open, traits);
    expect(p.y).toBeCloseTo(100 - DODGE_DISTANCE, 6);
    let ticks = DODGE_TICKS;
    while (p.dodge === 0) {
      stepPlayer(p, { x: 0, y: 1, dodge: true }, open, traits);
      ticks++;
    }
    expect(ticks).toBe(traits.dodgeCooldown + 1);
  });

  it('is not possible in a stun, and does not start in shallow water', () => {
    const p = createPlayer(100, 100);
    stunPlayer(p, 10);
    stepPlayer(p, { x: 1, y: 0, dodge: true }, open);
    expect(p.dodge).toBe(0);
    const water = new World(textSource([',,,,', ',,,,']));
    const w = createPlayer(24, 8);
    stepPlayer(w, { x: 1, y: 0, dodge: true }, water, { wade: true });
    expect(w.dodge).toBe(0);
  });

  it('is stopped by a wall', () => {
    const p = createPlayer(5 * TILE_SIZE - 10, 8);
    const wall = new World(textSource(['.....R']));
    stepPlayer(p, { x: 1, y: 0, dodge: true }, wall);
    for (let i = 1; i < DODGE_TICKS; i++) stepPlayer(p, NO_INPUT, wall);
    expect(p.x).toBeLessThan(5 * TILE_SIZE + 2 + 1);
  });
});

describe('quicker attacks and a longer guard', () => {
  it('take the cooldown and the guard of the traits', () => {
    const world = new World(textSource([]));
    const traits = withDex(17);
    const p = createPlayer(0, 0);
    expect(stepPlayer(p, { x: 0, y: 0, attack: 0 }, world, traits)).toBe(true);
    let ticks = 0;
    while (!stepPlayer(p, { x: 0, y: 0, attack: 0 }, world, traits)) ticks++;
    expect(ticks + 1).toBe(traits.cooldown);
    stunPlayer(p, 1);
    stepPlayer(p, NO_INPUT, world, traits);
    expect(p.guard).toBe(traits.guard);
  });
});

describe('sneaking', () => {
  it('is a slow walk or standing, not a strike or a roll', () => {
    expect(isSneaking({ vx: 0, vy: 0, attack: 0, dodge: 0 })).toBe(true);
    expect(isSneaking({ vx: 40, vy: 0, attack: 0, dodge: 0 })).toBe(true);
    expect(isSneaking({ vx: 80, vy: 0, attack: 0, dodge: 0 })).toBe(false);
    expect(isSneaking({ vx: 0, vy: 0, attack: 3, dodge: 0 })).toBe(false);
    expect(sightOf(withDex(17), { vx: 0, vy: 0, attack: 0, dodge: 0 })).toBeCloseTo(0.38);
  });

  it('keeps a mob from noticing a player out of its shorter sight', () => {
    const notices = (sight: number) => {
      const horde = new Horde(new World(textSource([])), everywhere, 5);
      const imp = horde.spawn('imp', 200, 200);
      const p = createPlayer(200 + MOB_STATS.imp.sight * 0.7, 200);
      for (let t = 0; t < 4000; t += TICK_MS) horde.step(TICK_MS, [{ id: 1, state: p, sight }]);
      return imp.state === 'chase' || imp.state === 'windup' || imp.state === 'strike';
    };
    expect(notices(1)).toBe(true);
    expect(notices(0.5)).toBe(false);
  });
});

describe('arrows', () => {
  // A player near the shooter, whom the mobs do not see: without players, mobs go away.
  const watcher = (x: number, y: number) => [{ id: 9, state: createPlayer(x, y), sight: 0 }];
  it('hit the first mob on their way, and the kill goes to the shooter', () => {
    const horde = new Horde(new World(textSource([])), everywhere, 6);
    const near = horde.spawn('imp', 140, 100);
    const far = horde.spawn('imp', 180, 100);
    horde.shoot({ x: 100, y: 100 }, 0, 100, 9, { damage: 4, push: 1, stagger: 1 });
    for (let t = 0; t < 500; t += TICK_MS) horde.step(TICK_MS, watcher(100, 100));
    expect(near.state).toBe('dying');
    expect(far.state).not.toBe('dying');
    expect(horde.arrows).toHaveLength(0);
    expect(horde.takeShotKills()).toEqual([{ mob: near, owner: 9 }]);
    expect(horde.takeShotKills()).toEqual([]);
  });

  it('stop at a tree and at the end of their range, and fly over water', () => {
    const world = new World(textSource(['..........', '..~~~..T..', '..........']));
    const horde = new Horde(world, everywhere, 7);
    // Along the trunk of the tree (the bottom of its tile).
    const beyond = horde.spawn('imp', 9 * TILE_SIZE + 8, TILE_SIZE + 13);
    horde.shoot({ x: 8, y: TILE_SIZE + 13 }, 0, 400, 1);
    for (let t = 0; t < 2000; t += TICK_MS) horde.step(TICK_MS, watcher(8, 8));
    expect(beyond.state).not.toBe('dying');
    const short = new Horde(world, everywhere, 8);
    const out = short.spawn('imp', 140, 2 * TILE_SIZE + 8);
    short.shoot({ x: 8, y: 2 * TILE_SIZE + 8 }, 0, 5 * TILE_SIZE, 1);
    for (let t = 0; t < 2000; t += TICK_MS) short.step(TICK_MS, watcher(8, 8));
    expect(out.state).not.toBe('dying');
    const wet = new Horde(world, everywhere, 9);
    const across = wet.spawn('imp', 6 * TILE_SIZE, TILE_SIZE + 8);
    wet.shoot({ x: 8, y: TILE_SIZE + 8 }, 0, 400, 1);
    for (let t = 0; t < 2000; t += TICK_MS) wet.step(TICK_MS, watcher(8, 8));
    expect(across.state).toBe('dying');
  });
});

describe('a locked chest', () => {
  it('opens only for Dexterity 13, each time', () => {
    const base = lootHouseSource();
    const locked = { ...LOOT_CHEST, lock: { ability: 'dex' as const, min: 13 } };
    const source = { ...base, loot: () => ({ coins: [2, 2] as const }) };
    const spoils = new Spoils(new World(source), () => 0.5);
    expect(spoils.open(locked, EMPTY_PACK, withDex(12), 0)).toBe('locked');
    const opened = spoils.open(locked, EMPTY_PACK, withDex(13), 0);
    expect(opened).not.toBe('locked');
    expect(opened && opened !== 'locked' ? opened.taken.coins : -1).toBe(2);
  });
});

describe('Dexterity in a shared world', () => {
  it('sends a dodge in the input, and refuses a bad one', () => {
    expect(toWireInput({ x: 1, y: 0, dodge: true })).toEqual([100, 0, 0, 1]);
    expect(fromWireInput([100, 0, 0, 1])).toEqual({ x: 1, y: 0, dodge: true });
    expect(fromWireInput(toWireInput({ x: 0, y: 1, attack: 0, dodge: true })).attack).toBeCloseTo(0);
    expect(parseClientMessage('{"t":"in","s":1,"i":[[0,0,0,1]]}')).toEqual({ t: 'in', s: 1, i: [[0, 0, 0, 1]] });
    expect(parseClientMessage('{"t":"in","s":1,"i":[[0,0,0,2]]}')).toBeNull();
    expect(parseClientMessage('{"t":"in","s":1,"i":[[0,0,0]]}')).toBeNull();
  });

  it('lets a ranger shoot a brute dead from afar: the drop goes to the ranger, and the snapshots carry the arrow', () => {
    const room = new Room(new World(mobHouseSource()));
    const p = room.join(0, 1, [5, 10], '', undefined, { traits: withDex(16, 'ranger') })!;
    const brute = room.horde!.spawn('brute', p.state.x + 60, p.state.y);
    room.input(p.id, { t: 'in', s: 1, i: [[0, 0, 1]] }, 0);
    expect(room.horde!.arrows).toHaveLength(1);
    let snap: SnapshotMessage | null = null;
    room.broadcast(0, (_id, message) => (snap = message));
    expect(snap!.ar).toHaveLength(1);
    expect(snap!.ar![0]![1]).toBe(p.id);
    // Four arrows of 4 damage (DEX 16: +3 is for the ranger's damage too: 7) kill a brute of 12 in two.
    const quiet = Array.from({ length: 30 }, () => [0, 0] as const);
    room.input(p.id, { t: 'in', s: 2, i: [...quiet.slice(0, 21), [0, 0, 1]] }, 50);
    for (let t = 100; t < 1500; t += 50) {
      room.tick(t);
      brute.x = p.state.x + 60;
    }
    expect(brute.state).toBe('dying');
    expect(p.pack.coins).toBeGreaterThanOrEqual(2);
  });

  it('shows the dodge of a player to the others', () => {
    const room = new Room(new World(mobHouseSource()));
    const a = room.join(0, 1, [5, 10])!;
    const b = room.join(0, 2, [8, 10])!;
    room.input(a.id, { t: 'in', s: 1, i: [[100, 0, 0, 1]] }, 0);
    let seen: SnapshotMessage | null = null;
    room.broadcast(0, (id, message) => {
      if (id === b.id) seen = message;
    });
    expect(seen!.p.find((w) => w[0] === a.id)![11]).toBe(DODGE_TICKS - 1);
  });
});
