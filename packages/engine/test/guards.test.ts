import { describe, expect, it } from 'vitest';
import {
  AVERAGE_DICE,
  GUARD_IDS,
  Guards,
  Horde,
  NO_INPUT,
  TICK_SECONDS,
  TILE_SIZE,
  World,
  createPlayer,
  dice,
  stepPlayer,
  type GuardDef,
  type GuardEvent,
  type GuardPlayer,
  type HordePlayer,
  type MobRules,
} from '../src/index.ts';
import { textSource } from './helpers.ts';

const TICK_MS = TICK_SECONDS * 1000;
const at = (tx: number, ty: number) => ({ x: tx * TILE_SIZE + 8, y: ty * TILE_SIZE + 12 });
const everywhere: MobRules = { roam: () => true, hunt: () => true, population: {} };
/** A militia of the Enclave (5e: a guard) and the wagon of a caravan. */
const MILITIA: GuardDef = { id: 'militia', name: 'Militia', look: 'militia', hp: 11, ac: 16, blow: { toHit: 3, damage: dice(1, 6, 1), push: 1, stagger: 1, opening: 0 } };
const WAGON: GuardDef = { id: 'wagon', name: 'Wagon', look: 'wagon', hp: 30, ac: 11, speed: 0.5 };
const ROUTE = Array.from({ length: 81 }, (_, i) => at(10 + i / 4, 5));

function setup() {
  const world = new World(textSource([]));
  const horde = new Horde(world, everywhere, 3, AVERAGE_DICE);
  const guards = new Guards(world);
  return { world, horde, guards };
}

/** Runs the guards and the horde for `ms`; the players stand. */
function run(world: World, horde: Horde, guards: Guards, players: GuardPlayer[], ms: number, anchor?: { x: number; y: number }): GuardEvent[] {
  const events: GuardEvent[] = [];
  for (let t = 0; t < ms; t += TICK_MS) {
    for (const p of players) stepPlayer(p.state, NO_INPUT, world);
    const anchors = new Map(anchor ? [['caravan', anchor] as const] : []);
    events.push(...guards.step(TICK_MS, horde, players, AVERAGE_DICE, anchors));
    const targets: HordePlayer[] = [...players.map((p) => ({ id: p.id, state: p.state, sight: 0 })), ...guards.targets()];
    horde.step(TICK_MS, targets);
  }
  return events;
}

describe('guards', () => {
  it('walk their route while nothing threatens them; a wagon walks at half the pace; a halted guard stands', () => {
    const { world, horde, guards } = setup();
    const militia = guards.add(MILITIA, 'patrol', ROUTE[0]!.x, ROUTE[0]!.y, ROUTE);
    expect(militia.id).toBeGreaterThanOrEqual(GUARD_IDS);
    run(world, horde, guards, [], 2000);
    // A player walks 80 px/s; alone, the militia walks about 160 px in 2 s.
    expect(militia.state.x - ROUTE[0]!.x).toBeGreaterThan(120);
    // The wagon walks at half the pace; a militia behind it keeps with it, and never goes ahead of it.
    const caravan = setup();
    const wagon = caravan.guards.add(WAGON, 'caravan', ROUTE[8]!.x, ROUTE[8]!.y + 8, ROUTE);
    const escort = caravan.guards.add(MILITIA, 'caravan', ROUTE[0]!.x, ROUTE[0]!.y, ROUTE);
    run(caravan.world, caravan.horde, caravan.guards, [], 2000);
    expect(wagon.state.x - ROUTE[8]!.x).toBeGreaterThan(50);
    expect(wagon.state.x - ROUTE[8]!.x).toBeLessThan(100);
    expect(escort.state.x).toBeLessThan(wagon.state.x + 1.5 * TILE_SIZE);
    wagon.halted = true;
    const x = wagon.state.x;
    run(caravan.world, caravan.horde, caravan.guards, [], 1000);
    expect(wagon.state.x).toBe(x);
    void world;
    void horde;
    void guards;
  });

  it('fight a hostile mob near their wagon until it falls, and the mob fights them', () => {
    const { world, horde, guards } = setup();
    const militia = guards.add(MILITIA, 'caravan', at(10, 5).x, at(10, 5).y);
    const hob = horde.spawn('hobgoblin', at(13, 5).x, at(13, 5).y);
    // A mob of the story (an attacker of the caravan); a tough one, so that it lives long enough to turn on the militia.
    hob.story = true;
    hob.health = 60;
    let hunted = false;
    for (let t = 0; t < 8000; t += 500) {
      run(world, horde, guards, [], 500, at(10, 5));
      if (horde.huntersOf(militia.id).includes(hob)) hunted = true;
    }
    expect(hob.health).toBeLessThan(60);
    expect(hunted).toBe(true);
    // A mob that it can finish falls.
    const weak = horde.spawn('goblin', at(8, 5).x, at(8, 5).y);
    weak.story = true;
    run(world, horde, guards, [], 6000, at(10, 5));
    expect(horde.mobs.includes(weak)).toBe(false);
  });

  it('leave a character alone, but fight an outlaw of their group; its blows hit them, a plain blow does not', () => {
    const { world, horde, guards } = setup();
    const militia = guards.add(MILITIA, 'caravan', at(10, 5).x, at(10, 5).y);
    const friend: GuardPlayer = { id: 1, state: createPlayer(at(11, 5).x, at(11, 5).y) };
    friend.state.hp = 1000;
    run(world, horde, guards, [friend], 3000, at(10, 5));
    expect(friend.state.hp).toBe(1000);
    const blow = { toHit: 99, damage: dice(0, 0, 4), push: 1, stagger: 1, opening: 0 };
    // A blow of a character who is not an outlaw: nothing.
    expect(guards.strike(friend.state, Math.atan2(militia.state.y - friend.state.y, militia.state.x - friend.state.x), 1, blow, [], AVERAGE_DICE)).toEqual([]);
    const robber: GuardPlayer = { id: 2, state: createPlayer(at(11, 5).x, at(11, 5).y), outlaw: ['caravan'] };
    robber.state.hp = 1000;
    const hits = guards.strike(robber.state, Math.atan2(militia.state.y - robber.state.y, militia.state.x - robber.state.x), 2, blow, ['caravan'], AVERAGE_DICE);
    expect(hits.map((h) => [h.guard.id, h.damage])).toEqual([[militia.id, 4]]);
    expect(militia.state.hp).toBe(7);
    run(world, horde, guards, [friend, robber], 4000, at(10, 5));
    expect(robber.state.hp).toBeLessThan(1000);
    expect(friend.state.hp).toBe(1000);
  });

  it('leave the beasts of the woods alone, and the beasts leave them alone', () => {
    const { world, horde, guards } = setup();
    const militia = guards.add(MILITIA, 'caravan', at(10, 5).x, at(10, 5).y);
    const imp = horde.spawn('imp', at(12, 5).x, at(12, 5).y);
    run(world, horde, guards, [], 4000, at(10, 5));
    expect(imp.health).toBe(7);
    expect(militia.state.hp).toBe(11);
  });

  it('never fight without a blow (the wagon)', () => {
    const { world, horde, guards } = setup();
    guards.add(WAGON, 'caravan', at(10, 5).x, at(10, 5).y);
    const hob = horde.spawn('hobgoblin', at(12, 5).x, at(12, 5).y);
    hob.story = true;
    const robber: GuardPlayer = { id: 2, state: createPlayer(at(11, 5).x, at(11, 5).y), outlaw: ['caravan'] };
    robber.state.hp = 1000;
    run(world, horde, guards, [robber], 3000, at(10, 5));
    expect(robber.state.hp).toBe(1000);
    expect(hob.health).toBe(11);
  });

  it('fall, and then go, when their hit points come to 0, with who brought them down', () => {
    const { world, horde, guards } = setup();
    const militia = guards.add(MILITIA, 'caravan', at(10, 5).x, at(10, 5).y);
    const robber: GuardPlayer = { id: 2, state: createPlayer(at(11, 5).x, at(11, 5).y), outlaw: ['caravan'] };
    guards.strike(robber.state, Math.atan2(militia.state.y - robber.state.y, militia.state.x - robber.state.x), 2, { toHit: 99, damage: dice(0, 0, 50), push: 1, stagger: 1, opening: 0 }, ['caravan'], AVERAGE_DICE);
    const events = run(world, horde, guards, [], 4000, at(10, 5));
    expect(events.map((e) => [e.kind, e.def, e.by ?? null])).toEqual([
      ['fell', 'militia', 2],
      ['gone', 'militia', null],
    ]);
    expect(guards.list).toHaveLength(0);
  });
});
