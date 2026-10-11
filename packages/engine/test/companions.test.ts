import { describe, expect, it } from 'vitest';
import {
  AVERAGE_DICE,
  COMPANION_IDS,
  Companions,
  FOLLOW_LEASH,
  Horde,
  Remotes,
  Room,
  TICK_SECONDS,
  TILE_SIZE,
  World,
  createPlayer,
  followPath,
  type CompanionDef,
  type CompanionEvent,
  type MobRules,
  type PlayerState,
  type SnapshotMessage,
} from '../src/index.ts';
import { houseSource, textSource } from './helpers.ts';

const SCOUT: CompanionDef = { id: 'scout', name: 'Himo', look: 'crier', hp: 4, fallen: 'gone' };
const FRIEND: CompanionDef = { id: 'friend', name: 'Brys', look: 'crier', hp: 4, fallen: 'wakes' };
const TICK_MS = TICK_SECONDS * 1000;
const at = (tx: number, ty: number) => ({ x: tx * TILE_SIZE + 8, y: ty * TILE_SIZE + 12 });
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

/** Runs the companions for `ms`; `move` can move the leader each tick. */
function run(companions: Companions, leader: PlayerState, ms: number, move?: (t: number) => void): CompanionEvent[] {
  const events: CompanionEvent[] = [];
  for (let t = 0; t < ms; t += TICK_MS) {
    move?.(t);
    events.push(...companions.step(TICK_MS, new Map([[1, leader]])));
  }
  return events;
}

describe('a companion', () => {
  it('follows its leader as it walks away, and stops about a tile from it', () => {
    const world = new World(textSource([]));
    const leader = createPlayer(at(5, 5).x, at(5, 5).y);
    const companions = new Companions(world);
    const c = companions.add(SCOUT, 1, leader.x - 16, leader.y);
    expect(c.id).toBeGreaterThanOrEqual(COMPANION_IDS);
    // The leader walks 10 tiles east at the speed of a player, then stands.
    run(companions, leader, 6000, (t) => {
      if (t < 2000) leader.x += 80 * TICK_SECONDS;
    });
    expect(dist(c.state, leader)).toBeLessThan(2 * TILE_SIZE);
    expect(dist(c.state, leader)).toBeGreaterThan(8);
    expect(c.mode).toBe('follow');
  });

  it('walks round a wall of rocks to its leader on the other side', () => {
    const rows = ['', '', '....R....', '....R....', '....R....', '....R....', '.........'];
    const world = new World(textSource(rows));
    const leader = createPlayer(at(7, 3).x, at(7, 3).y);
    const companions = new Companions(world);
    const c = companions.add(SCOUT, 1, at(1, 3).x, at(1, 3).y);
    // The way goes round the end of the wall, over it or under it, never through a rock.
    const way = followPath(world, [1, 3], [7, 3])!;
    expect(way.some(([tx, ty]) => tx === 4 && ty >= 2 && ty <= 5)).toBe(false);
    expect(way.at(-1)).toEqual([7, 3]);
    run(companions, leader, 8000);
    expect(dist(c.state, leader)).toBeLessThan(2 * TILE_SIZE);
  });

  it('opens a closed door on its way into a house', () => {
    const world = new World(houseSource());
    // The leader stands inside the house; the door (5, 6) is closed.
    const leader = createPlayer(at(5, 4).x, at(5, 4).y);
    const companions = new Companions(world);
    const c = companions.add(SCOUT, 1, at(5, 9).x, at(5, 9).y);
    expect(world.isDoorOpen(5, 6)).toBe(false);
    run(companions, leader, 8000);
    expect(world.isDoorOpen(5, 6)).toBe(true);
    expect(companions.takeDoors()).toBe(true);
    expect(dist(c.state, leader)).toBeLessThan(2 * TILE_SIZE);
  });

  it('waits when there is no way (deep water between), and follows again when its leader comes back', () => {
    const rows = ['....~....', '....~....', '....~....', '....~....', '....~....'];
    const tall = [...rows, ...rows, ...rows, ...rows, ...rows, ...rows, ...rows, ...rows, ...rows, ...rows, ...rows, ...rows];
    const world = new World(textSource(tall));
    // Row 30: the ends of the water are 30 rows away, more than the search of a way.
    const leader = createPlayer(at(7, 30).x, at(7, 30).y);
    const companions = new Companions(world);
    const c = companions.add(SCOUT, 1, at(2, 30).x, at(2, 30).y);
    const events = run(companions, leader, 1000);
    expect(events.map((e) => e.kind)).toContain('lost');
    expect(c.mode).toBe('wait');
    const still = { x: c.state.x, y: c.state.y };
    run(companions, leader, 1000);
    expect(dist(c.state, still)).toBeLessThan(1);
    // The leader comes back across (it waded, or it went round): the companion follows again.
    leader.x = at(1, 30).x;
    const back = run(companions, leader, 2000);
    expect(back.map((e) => e.kind)).toContain('found');
    expect(c.mode).toBe('follow');
  });

  it('waits when its leader is more than the leash away', () => {
    const world = new World(textSource([]));
    const leader = createPlayer(at(5 + FOLLOW_LEASH + 2, 5).x, at(5, 5).y);
    const companions = new Companions(world);
    const c = companions.add(SCOUT, 1, at(5, 5).x, at(5, 5).y);
    run(companions, leader, 500);
    expect(c.mode).toBe('wait');
  });

  it('catches up: far behind, it walks faster than its leader', () => {
    const world = new World(textSource([]));
    const leader = createPlayer(at(14, 5).x, at(14, 5).y);
    const companions = new Companions(world);
    const c = companions.add(SCOUT, 1, at(4, 5).x, at(4, 5).y);
    const before = dist(c.state, leader);
    // Both walk east at the speed of a player for a second: the companion gains on its leader.
    run(companions, leader, 1000, () => (leader.x += 80 * TICK_SECONDS));
    expect(dist(c.state, leader)).toBeLessThan(before - 10);
  });
});

describe('mobs and companions', () => {
  const everywhere = (imps = 0): MobRules => ({ roam: () => true, hunt: () => true, population: { imp: imps, brute: 0 } });

  it('hunt and hit a companion; one that is "gone" leaves the world when it falls', () => {
    const world = new World(textSource([]));
    const horde = new Horde(world, everywhere(), 5);
    const companions = new Companions(world);
    const leader = createPlayer(at(30, 30).x, at(30, 30).y);
    leader.down = 1_000_000;
    const c = companions.add(SCOUT, 1, at(5, 5).x, at(5, 5).y);
    horde.spawn('imp', at(8, 5).x, at(8, 5).y);
    const events: CompanionEvent[] = [];
    let hits = 0;
    for (let t = 0; t < 60_000 && !events.some((e) => e.kind === 'gone'); t += TICK_MS) {
      events.push(...companions.step(TICK_MS, new Map([[1, leader]])));
      hits += horde.step(TICK_MS, companions.targets()).filter(([, id]) => id === c.id).length;
    }
    expect(hits).toBeGreaterThan(0);
    expect(events.map((e) => e.kind)).toEqual(expect.arrayContaining(['fell', 'gone']));
    expect(companions.list).toHaveLength(0);
  });

  it('a companion that "wakes" stands again with all its hit points', () => {
    const world = new World(textSource([]));
    const companions = new Companions(world);
    const leader = createPlayer(at(6, 5).x, at(6, 5).y);
    const c = companions.add(FRIEND, 1, at(5, 5).x, at(5, 5).y);
    c.state.hp = 0;
    c.state.down = 10;
    const events = run(companions, leader, 1000);
    expect(events.map((e) => e.kind)).toEqual(['fell']);
    expect(c.state.down).toBe(0);
    expect(c.state.hp).toBe(FRIEND.hp);
    expect(companions.list).toHaveLength(1);
  });

  it('bring no new mobs: the world fills round players only', () => {
    const world = new World(textSource([]));
    const horde = new Horde(world, everywhere(4), 5);
    const companions = new Companions(world);
    companions.add(SCOUT, 1, at(5, 5).x, at(5, 5).y);
    for (let t = 0; t < 30_000; t += 100) horde.step(100, companions.targets());
    expect(horde.mobs).toHaveLength(0);
  });
});

describe('companions in a shared world', () => {
  it('follow their leader in the Room, go in the snapshots, and leave with their leader', () => {
    const room = new Room(new World(textSource([])), { dice: AVERAGE_DICE });
    const leader = room.join(0, 1, [5, 5])!;
    const other = room.join(0, 2, [6, 5])!;
    const c = room.addCompanion(SCOUT, leader.id)!;
    expect(room.addCompanion(SCOUT, 999)).toBeNull();
    // The leader walks east; the Room ticks.
    let ms = 0;
    for (; ms < 3000; ms += 50) {
      if (ms < 1000) leader.state.x += 80 * 0.05;
      room.tick(ms);
    }
    expect(Math.hypot(c.state.x - leader.state.x, c.state.y - leader.state.y)).toBeLessThan(2 * TILE_SIZE);
    const snaps = new Map<number, SnapshotMessage>();
    room.broadcast(ms, (id, m) => snaps.set(id, m));
    const wire = snaps.get(other.id)!.cp!;
    expect(wire).toHaveLength(1);
    expect(wire[0]!.slice(0, 3)).toEqual([c.id, 'crier', 'Himo']);
    expect(wire[0]![13]).toBe(leader.id);
    const remotes = new Remotes();
    remotes.apply(snaps.get(other.id)!, 1000);
    expect(remotes.companionsAt(2000)).toMatchObject([{ id: c.id, name: 'Himo', look: 'crier', hp: 4, maxHp: 4, leader: leader.id }]);
    room.leave(leader.id);
    expect(room.companions.list).toHaveLength(0);
    snaps.clear();
    room.broadcast(ms + 50, (id, m) => snaps.set(id, m));
    expect(snaps.get(other.id)!.cp).toBeUndefined();
  });
});

