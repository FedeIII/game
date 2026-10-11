import { describe, expect, it } from 'vitest';
import {
  AVERAGE_DICE,
  Ambushes,
  EMPTY_PACK,
  Horde,
  NO_INPUT,
  SEAT_GAP,
  TICK_SECONDS,
  TILE_SIZE,
  World,
  createPlayer,
  stepPlayer,
  type AmbushDef,
  type AmbushPlayer,
  type MobRules,
  type QuestBook,
} from '../src/index.ts';
import { textSource } from './helpers.ts';

const TICK_MS = TICK_SECONDS * 1000;
const everywhere: MobRules = { roam: () => true, hunt: () => true, population: {} };
const at = (tx: number, ty: number) => ({ x: tx * TILE_SIZE + 8, y: ty * TILE_SIZE + 12 });

/** The scouts of chapter 1.5.1, waiting in tiles 10 to 20 of row 5. */
const SCOUTS: AmbushDef = {
  id: 'scouts',
  inArea: (tx, ty) => tx >= 10 && tx <= 20 && Math.abs(ty - 5) <= 2,
  when: { quest: 'raid', at: ['asked'] },
  from: [
    [8, 5],
    [24, 5],
  ],
  units: [
    [{ kind: 'worg' }, { kind: 'goblin', rides: 0, seat: 1 }],
    [{ kind: 'hobgoblin', rides: 0, seat: 0 }],
    [{ kind: 'worg' }, { kind: 'goblin', rides: 3, seat: 1 }],
    [{ kind: 'bugbear', rides: 3, seat: 0 }],
  ],
  effect: { id: 'raid-scouts', quest: 'raid', to: 'scouts', from: ['asked'], give: { coins: 0, items: [{ kind: 'badger-fur', count: 2 }] } },
};
const ASKED: QuestBook = { raid: { step: 'asked', flags: [], n: 1 } };

function setup(players: number) {
  const world = new World(textSource([]));
  const horde = new Horde(world, everywhere, 3, AVERAGE_DICE);
  const ambushes = new Ambushes(world, [SCOUTS]);
  const list: AmbushPlayer[] = Array.from({ length: players }, (_, i) => {
    const state = createPlayer(at(12, 5).x + i * 8, at(12, 5).y);
    state.hp = 1000;
    return { id: i + 1, state, quests: ASKED, pack: EMPTY_PACK };
  });
  return { world, horde, ambushes, list };
}

describe('riders', () => {
  it('sit on their mount and go with it, the goblin behind; they jump off when the mount hunts', () => {
    const world = new World(textSource([]));
    const horde = new Horde(world, everywhere, 3, AVERAGE_DICE);
    const worg = horde.spawn('worg', at(5, 5).x, at(5, 5).y);
    const hob = horde.spawnRider('hobgoblin', worg, 0);
    const gob = horde.spawnRider('goblin', worg, 1);
    expect([hob.state, gob.state]).toEqual(['ride', 'ride']);
    expect(hob.mount).toBe(worg.id);
    // A player that the worg does not see (far, and sight 0, but near enough that the mobs stay): the worg wanders, and the riders with it.
    const far = { id: 9, state: createPlayer(at(30, 25).x, at(30, 25).y), sight: 0 };
    for (let t = 0; t < 6000; t += TICK_MS) {
      horde.step(TICK_MS, [far]);
      expect(Math.hypot(hob.x - worg.x, hob.y - worg.y)).toBeLessThan(1);
      const behind = Math.hypot(gob.x - worg.x, gob.y - worg.y);
      expect(behind).toBeGreaterThan(SEAT_GAP - 1);
      expect(behind).toBeLessThan(SEAT_GAP + 1);
    }
    // A player near: the worg hunts it, and the riders get off and go for it too.
    const near = { id: 1, state: createPlayer(worg.x + 70, worg.y) };
    near.state.hp = 1000;
    for (let t = 0; t < 1500 && hob.state === 'ride'; t += TICK_MS) {
      stepPlayer(near.state, NO_INPUT, world);
      horde.step(TICK_MS, [near]);
    }
    expect(horde.mobs).toHaveLength(3);
    expect(hob.state).not.toBe('ride');
    expect(gob.state).not.toBe('ride');
    expect(hob.mount).toBeUndefined();
    expect(horde.huntersOf(1).map((m) => m.kind).sort()).toEqual(['goblin', 'hobgoblin', 'worg']);
  });

  it('falls off its mount when a blow reaches it', () => {
    const world = new World(textSource([]));
    const horde = new Horde(world, everywhere, 3, AVERAGE_DICE);
    const worg = horde.spawn('worg', 100, 100);
    const gob = horde.spawnRider('goblin', worg, 0);
    horde.strike({ x: gob.x - 18, y: gob.y }, 0, undefined, 1);
    expect(gob.state).not.toBe('ride');
    expect(gob.mount).toBeUndefined();
  });
});

describe('an ambush', () => {
  it('starts for a character at the step in its area, from the end furthest from it, and sized to the characters there', () => {
    const one = setup(1);
    one.ambushes.step(one.horde, one.list);
    expect(one.horde.mobs.map((m) => [m.kind, m.state])).toEqual([
      ['worg', 'idle'],
      ['goblin', 'ride'],
    ]);
    // The end furthest from the character (it stands at tile 12): tile 24.
    expect(Math.floor(one.horde.mobs[0]!.x / TILE_SIZE)).toBeGreaterThanOrEqual(20);
    // Only once while it runs.
    one.ambushes.step(one.horde, one.list);
    expect(one.horde.mobs).toHaveLength(2);
    const two = setup(2);
    two.ambushes.step(two.horde, two.list);
    expect(two.horde.mobs.map((m) => m.kind)).toEqual(['worg', 'goblin', 'hobgoblin']);
    const six = setup(6);
    six.ambushes.step(six.horde, six.list);
    expect(six.horde.mobs.map((m) => m.kind)).toEqual(['worg', 'goblin', 'hobgoblin', 'worg', 'goblin', 'bugbear']);
  });

  it('does not start for a character without the step, or out of the area', () => {
    const { horde, ambushes, list } = setup(1);
    ambushes.step(horde, [{ ...list[0]!, quests: {} }]);
    ambushes.step(horde, [{ ...list[0]!, state: createPlayer(at(40, 40).x, at(40, 40).y) }]);
    expect(horde.mobs).toHaveLength(0);
  });

  it('ends when all its mobs fell: the quest moves on for the characters there, with the reward', () => {
    const { horde, ambushes, list } = setup(1);
    ambushes.step(horde, list);
    for (const mob of horde.mobs) mob.health = 1;
    // Strike them all where they stand.
    for (const mob of [...horde.mobs]) horde.strike({ x: mob.x - 18, y: mob.y }, 0, undefined, 1);
    let effects: ReturnType<Ambushes['step']> = [];
    for (let t = 0; t < 3000 && effects.length === 0; t += TICK_MS) {
      horde.step(TICK_MS, list);
      effects = ambushes.step(horde, list);
    }
    expect(effects).toEqual([{ player: 1, effect: SCOUTS.effect }]);
    // It does not start again for a character at the next step.
    ambushes.step(horde, [{ ...list[0]!, quests: { raid: { step: 'scouts', flags: [], n: 2 } } }]);
    expect(horde.mobs).toHaveLength(0);
  });

  it('waits again when its mobs go away (nobody near them), without an end', () => {
    const { horde, ambushes, list } = setup(1);
    ambushes.step(horde, list);
    expect(horde.mobs).toHaveLength(2);
    // The character goes far away: the mobs go too.
    const gone = [{ ...list[0]!, state: createPlayer(at(200, 200).x, at(200, 200).y) }];
    let effects: ReturnType<Ambushes['step']> = [];
    for (let t = 0; t < 2000; t += TICK_MS) {
      horde.step(TICK_MS, gone);
      effects.push(...ambushes.step(horde, gone));
    }
    expect(horde.mobs).toHaveLength(0);
    expect(effects).toEqual([]);
    // Back in the grove: the scouts are there again.
    ambushes.step(horde, list);
    expect(horde.mobs).toHaveLength(2);
  });
});

/** The war band of chapter 1.5.1: it marches along row 5 from tile 10 to tile 60 (4 points a tile, as a Road). */
const ROUTE: readonly (readonly [number, number])[] = Array.from({ length: 201 }, (_, i) => [10.5 + i / 4, 5.5] as const);
const BAND: AmbushDef = {
  id: 'band',
  inArea: (tx, ty) => tx >= 5 && tx <= 60 && Math.abs(ty - 5) <= 3,
  when: { quest: 'raid', at: ['scouts'] },
  from: [],
  units: [[{ kind: 'devastator' }, { kind: 'hobgoblin' }], [{ kind: 'hobgoblin' }], [{ kind: 'hobgoblin' }]],
  effect: { id: 'raid-band', quest: 'raid', to: 'band', from: ['scouts'] },
  march: { route: ROUTE, speed: 36, arrive: { id: 'raid-arrived', quest: 'raid', to: 'raid', from: ['scouts'] } },
};
const SCOUTED: QuestBook = { raid: { step: 'scouts', flags: [], n: 2 } };

describe('a band that marches', () => {
  function band(players: number, x = 6) {
    const world = new World(textSource([]));
    const horde = new Horde(world, everywhere, 3, AVERAGE_DICE);
    const ambushes = new Ambushes(world, [BAND]);
    // The characters stand behind the start of the route, and do not see the band (sight 0).
    const list: (AmbushPlayer & { sight: number })[] = Array.from({ length: players }, (_, i) => ({ id: i + 1, state: createPlayer(at(x, 5).x, at(x, 5).y + i * 4), quests: SCOUTED, pack: EMPTY_PACK, sight: 0 }));
    return { horde, ambushes, list };
  }

  it('starts at the beginning of its route, in a column with its leader at the head, sized to the characters there', () => {
    const { horde, ambushes, list } = band(1);
    ambushes.step(horde, list);
    expect(horde.mobs.map((m) => m.kind)).toEqual(['devastator', 'hobgoblin']);
    const [lead, next] = horde.mobs;
    expect(lead!.x).toBeGreaterThan(next!.x);
    expect(Math.abs(lead!.y - at(10, 5).y)).toBeLessThan(TILE_SIZE);
    const three = band(3);
    three.ambushes.step(three.horde, three.list);
    expect(three.horde.mobs.map((m) => m.kind)).toEqual(['devastator', 'hobgoblin', 'hobgoblin', 'hobgoblin']);
  });

  it('walks its route at its pace with nobody near, and never goes away', () => {
    const { horde, ambushes, list } = band(1);
    ambushes.step(horde, list);
    const lead = horde.mobs[0]!;
    const x0 = lead.x;
    // The character goes far away: the band marches on all the same.
    const far = [{ ...list[0]!, state: createPlayer(at(300, 300).x, at(300, 300).y) }];
    for (let t = 0; t < 10_000; t += TICK_MS) {
      horde.step(TICK_MS, far);
      ambushes.step(horde, far);
    }
    expect(horde.mobs).toHaveLength(2);
    // About 36 px a second, along the row.
    expect(lead.x - x0).toBeGreaterThan(300);
    expect(lead.x - x0).toBeLessThan(380);
    expect(Math.abs(lead.y - at(10, 5).y)).toBeLessThan(TILE_SIZE);
  });

  it('comes in at the end of its route: the party gets the arrival, and the band goes', () => {
    const { horde, ambushes, list } = band(1);
    ambushes.step(horde, list);
    let effects: ReturnType<Ambushes['step']> = [];
    for (let t = 0; t < 60_000 && effects.length === 0; t += TICK_MS) {
      horde.step(TICK_MS, list);
      effects = ambushes.step(horde, list);
    }
    expect(effects).toEqual([{ player: 1, effect: BAND.march!.arrive }]);
    expect(horde.mobs).toHaveLength(0);
  });

  it('ends with its own end when all its mobs fall on the way', () => {
    const { horde, ambushes, list } = band(1);
    ambushes.step(horde, list);
    for (const mob of horde.mobs) mob.health = 1;
    for (const mob of [...horde.mobs]) horde.strike({ x: mob.x - 18, y: mob.y }, 0, undefined, 1);
    let effects: ReturnType<Ambushes['step']> = [];
    for (let t = 0; t < 3000 && effects.length === 0; t += TICK_MS) {
      horde.step(TICK_MS, list);
      effects = ambushes.step(horde, list);
    }
    expect(effects).toEqual([{ player: 1, effect: BAND.effect }]);
  });

  it('goes back to its route after a hunt, and walks on', () => {
    const world = new World(textSource([]));
    const horde = new Horde(world, everywhere, 3, AVERAGE_DICE);
    const hob = horde.spawn('hobgoblin', at(10, 5).x, at(10, 5).y);
    horde.march(
      hob,
      ROUTE.map(([x, y]) => ({ x: x * TILE_SIZE, y: y * TILE_SIZE })),
      36,
    );
    // Pulled off the route, with nobody to hunt: it walks back to the route and on along it.
    hob.y += 6 * TILE_SIZE;
    const far = { id: 9, state: createPlayer(at(300, 300).x, at(300, 300).y), sight: 0 };
    for (let t = 0; t < 8000; t += TICK_MS) horde.step(TICK_MS, [far]);
    expect(Math.abs(hob.y - at(10, 5).y)).toBeLessThan(TILE_SIZE);
    expect(hob.x).toBeGreaterThan(at(12, 5).x);
  });
});
