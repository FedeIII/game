import { describe, expect, it } from 'vitest';
import {
  AVERAGE_DICE,
  ITEM_STACK,
  LEVEL_XP,
  PLAIN_GEAR,
  PLAIN_SCORES,
  PROTOCOL_VERSION,
  Room,
  TILE_SIZE,
  World,
  checkAdminCommand,
  createPlayer,
  hourOf,
  levelOf,
  parseClientMessage,
  setQuestStep,
  shiftToHour,
  spawnBeside,
  teleport,
  traitsOf,
  Horde,
  type DayCycle,
  type QuestDef,
  type SnapshotMessage,
} from '../src/index.ts';
import { mobHouseSource } from './helpers.ts';

const DAY: DayCycle = { length: 48 * 60 * 1000, noon: 0.25 };
const QUESTS: readonly QuestDef[] = [
  {
    id: 'road',
    title: 'The road',
    steps: [
      { id: 'go', journal: 'Go.' },
      { id: 'done', journal: 'Done.', end: true },
    ],
  },
];

describe('the admin tools: the commands', () => {
  it('reads only exact commands', () => {
    expect(checkAdminCommand({ do: 'hour', hour: 13.5 })).toEqual({ do: 'hour', hour: 13.5 });
    expect(checkAdminCommand({ do: 'hour', hour: null })).toEqual({ do: 'hour', hour: null });
    expect(checkAdminCommand({ do: 'go', at: [-12, 3] })).toEqual({ do: 'go', at: [-12, 3] });
    expect(checkAdminCommand({ do: 'give', kind: 'coins', count: 500 })).toEqual({ do: 'give', kind: 'coins', count: 500 });
    expect(checkAdminCommand({ do: 'give', kind: 'longsword', count: 2 })).toEqual({ do: 'give', kind: 'longsword', count: 2 });
    expect(checkAdminCommand({ do: 'xp', xp: 900 })).toEqual({ do: 'xp', xp: 900 });
    expect(checkAdminCommand({ do: 'mob', kind: 'imp', count: 3 })).toEqual({ do: 'mob', kind: 'imp', count: 3 });
    expect(checkAdminCommand({ do: 'quest', quest: 'road', step: 'go' })).toEqual({ do: 'quest', quest: 'road', step: 'go' });
    expect(checkAdminCommand({ do: 'quest', quest: 'road', step: null })).toEqual({ do: 'quest', quest: 'road', step: null });
    for (const bad of [
      null,
      [],
      { do: 'fly' },
      { do: 'hour', hour: 25 },
      { do: 'hour', hour: '12' },
      { do: 'go', at: [1.5, 2] },
      { do: 'go', at: [1] },
      { do: 'go', at: [1e9, 0] },
      { do: 'give', kind: 'dragon', count: 1 },
      { do: 'give', kind: 'ring', count: 0 },
      { do: 'give', kind: 'ring', count: 100 },
      { do: 'xp', xp: -1 },
      { do: 'mob', kind: 'imp', count: 9 },
      { do: 'mob', kind: 'dragon', count: 1 },
      { do: 'quest', quest: 'Road!', step: 'go' },
      { do: 'quest', quest: 'road' },
    ]) {
      expect(checkAdminCommand(bad)).toBeNull();
    }
  });

  it('goes on the wire as the message admin', () => {
    expect(PROTOCOL_VERSION).toBe(49);
    expect(parseClientMessage(JSON.stringify({ t: 'admin', c: { do: 'give', kind: 'ring', count: 1 } }))).toEqual({ t: 'admin', c: { do: 'give', kind: 'ring', count: 1 } });
    expect(parseClientMessage(JSON.stringify({ t: 'admin', c: { do: 'give', kind: 'ring', count: -1 } }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ t: 'admin' }))).toBeNull();
  });

  it('shifts the clock to the hour that it asks for, and the day goes on from there', () => {
    for (const clock of [0, 1_760_000_123_456, 1_760_001_999_999]) {
      for (const hour of [0, 5.5, 13, 23.75]) {
        const shift = shiftToHour(clock, hour, DAY);
        expect(shift).toBeGreaterThanOrEqual(0);
        expect(shift).toBeLessThan(DAY.length);
        expect(hourOf(clock + shift, DAY)).toBeCloseTo(hour, 6);
        // One real minute later the hour is half an hour on (a day of 48 minutes).
        expect(hourOf(clock + shift + 60_000, DAY)).toBeCloseTo((hour + 0.5) % 24, 6);
      }
    }
  });

  it('sets a quest at a step, keeps its flags, and takes it back', () => {
    const book = { road: { step: 'go', flags: ['goblins'], n: 4 }, other: { step: 'x', flags: [], n: 7 } };
    const done = setQuestStep(book, QUESTS, 'road', 'done');
    expect(done).toEqual({ road: { step: 'done', flags: ['goblins'], n: 8 }, other: book.other });
    expect(setQuestStep({}, QUESTS, 'road', 'go')).toEqual({ road: { step: 'go', flags: [], n: 1 } });
    expect(setQuestStep(book, QUESTS, 'road', null)).toEqual({ other: book.other });
    // Nothing to change, or no such quest or step.
    expect(setQuestStep(book, QUESTS, 'road', 'go')).toBeNull();
    expect(setQuestStep({}, QUESTS, 'road', null)).toBeNull();
    expect(setQuestStep(book, QUESTS, 'road', 'lost')).toBeNull();
    expect(setQuestStep(book, QUESTS, 'ashes', 'go')).toBeNull();
  });

  it('teleports to the open tile nearest to a tile, on the ground storey', () => {
    const world = new World(mobHouseSource());
    const state = createPlayer(5 * TILE_SIZE, 10 * TILE_SIZE);
    state.storey = 1;
    state.dodge = 4;
    state.hp = 7;
    expect(teleport(state, world, 40, -30)).toBe(true);
    expect([state.x, state.y, state.storey, state.dodge, state.hp]).toEqual([40 * TILE_SIZE + 8, -30 * TILE_SIZE + 8, 0, 0, 7]);
    // A wall of the house (2..8, 2..6) is not open: the nearest open tile.
    expect(teleport(state, world, 2, 2)).toBe(true);
    expect(world.solidBox(Math.floor(state.x / TILE_SIZE), Math.floor(state.y / TILE_SIZE))).toBeNull();
  });

  it('puts mobs beside a player as ?mob= does', () => {
    const world = new World(mobHouseSource());
    const horde = new Horde(world, world.source.mobs!()!, 1, AVERAGE_DICE);
    const imps = spawnBeside(horde, world, 'imp', 3, 20 * TILE_SIZE + 8, 20 * TILE_SIZE + 8);
    expect(imps.map((m) => [Math.floor(m.x / TILE_SIZE), Math.floor(m.y / TILE_SIZE)])).toEqual([
      [25, 18],
      [25, 20],
      [25, 22],
    ]);
    // A kind that patrols comes as one group, 8 tiles east; one that ambushes lurks 3 tiles east.
    expect(spawnBeside(horde, world, 'skirmisher', 2, 20 * TILE_SIZE, 20 * TILE_SIZE)).toHaveLength(2);
    const bandits = spawnBeside(horde, world, 'bandit', 2, 20 * TILE_SIZE, 20 * TILE_SIZE);
    expect(bandits.every((m) => m.state === 'lurk')).toBe(true);
    expect(horde.mobs).toHaveLength(7);
  });
});

describe('the admin tools in a room', () => {
  const traitsFor = (gear: typeof PLAIN_GEAR, level: number) => traitsOf(PLAIN_SCORES, 'fighter', gear, level);
  const roomWith = () => {
    let clock = 1_760_000_000_000;
    const room = new Room(new World(mobHouseSource()), { dice: AVERAGE_DICE, day: DAY, clock: () => clock, quests: QUESTS });
    const p = room.join(0, 1, [5, 10], 'Tordek', undefined, { traits: traitsFor(PLAIN_GEAR, 1), traitsFor, gear: PLAIN_GEAR })!;
    return { room, p, later: (ms: number) => (clock += ms) };
  };
  const snapshot = (room: Room, id: number, ms: number): SnapshotMessage => {
    let snap: SnapshotMessage | null = null;
    room.broadcast(ms, (to, message) => {
      if (to === id) snap = message;
    });
    return snap!;
  };

  it('moves the hour for every player, and a new player gets it in its welcome', () => {
    const { room, p, later } = roomWith();
    const other = room.join(0, 2, [6, 10])!;
    snapshot(room, p.id, 10);
    expect(room.admin(p.id, { do: 'hour', hour: 22 }, 20)).toBe(true);
    expect(room.sky.hour).toBeCloseTo(22, 6);
    // Both players get the shift once.
    const shift = room.hourShift;
    expect(snapshot(room, other.id, 30).hs).toBe(shift);
    expect(snapshot(room, other.id, 80).hs).toBeUndefined();
    const late = room.join(100, 3, [7, 10])!;
    expect(room.welcome(late).hs).toBe(shift);
    // The day goes on, and the mobs and NPCs follow the shifted hour: night at 22, day at 7.
    later(60_000);
    room.tick(200);
    room.tick(250);
    expect(room.sky.hour).toBeCloseTo(22.5, 6);
    expect(room.horde!.daytime).toBe(false);
    room.admin(p.id, { do: 'hour', hour: 7 }, 300);
    room.tick(350);
    expect(room.horde!.daytime).toBe(true);
    // The real clock again: no shift, and a snapshot says 0.
    room.admin(p.id, { do: 'hour', hour: null }, 400);
    expect(room.hourShift).toBe(0);
    expect(snapshot(room, other.id, 450).hs).toBe(0);
    expect(room.welcome(room.join(500, 4, [8, 10])!).hs).toBeUndefined();
  });

  it('teleports the character, and gives it coins and items (what does not fit falls at its feet)', () => {
    const { room, p } = roomWith();
    expect(room.admin(p.id, { do: 'go', at: [60, -40] }, 10)).toBe(true);
    expect([Math.floor(p.state.x / TILE_SIZE), Math.floor(p.state.y / TILE_SIZE)]).toEqual([60, -40]);
    snapshot(room, p.id, 20);
    room.admin(p.id, { do: 'give', kind: 'coins', count: 250 }, 30);
    room.admin(p.id, { do: 'give', kind: 'draught', count: 99 }, 40);
    expect(p.pack.coins).toBe(250);
    const snap = snapshot(room, p.id, 50);
    expect(snap.pk![0]).toBe(250);
    expect(snap.l).toHaveLength(2);
    // The pack is full: the rest lies at its feet.
    const carried = p.pack.items.reduce((n, s) => n + (s?.count ?? 0), 0);
    const lying = room.piles.list.reduce((n, pile) => n + pile.count, 0);
    expect(carried).toBe(p.traits.slots * ITEM_STACK.draught);
    expect(lying).toBe(99 - carried);
  });

  it('sets the XP: the level and the hit points follow, up and down', () => {
    const { room, p } = roomWith();
    const level1 = p.traits.maxHp;
    room.admin(p.id, { do: 'xp', xp: LEVEL_XP[2]! }, 10);
    expect(p.xp).toBe(900);
    expect(p.traits.level).toBe(3);
    expect(p.state.hp).toBe(p.traits.maxHp);
    expect(snapshot(room, p.id, 20).xp).toBe(900);
    room.admin(p.id, { do: 'xp', xp: 0 }, 30);
    expect(levelOf(p.xp)).toBe(1);
    expect(p.traits.maxHp).toBe(level1);
    expect(p.state.hp).toBe(level1);
    expect(snapshot(room, p.id, 40).xp).toBe(0);
  });

  it('puts mobs beside the character, and sets a quest at a step', () => {
    const { room, p } = roomWith();
    expect(room.admin(p.id, { do: 'mob', kind: 'brute', count: 2 }, 10)).toBe(true);
    expect(room.horde!.mobs.filter((m) => m.kind === 'brute')).toHaveLength(2);
    snapshot(room, p.id, 20);
    expect(room.admin(p.id, { do: 'quest', quest: 'road', step: 'done' }, 30)).toBe(true);
    expect(p.quests.road?.step).toBe('done');
    expect(snapshot(room, p.id, 40).qs).toEqual([['road', 'done', 1, []]]);
    // A quest or a step that the world does not have changes nothing.
    expect(room.admin(p.id, { do: 'quest', quest: 'road', step: 'lost' }, 50)).toBe(false);
    expect(room.admin(p.id, { do: 'quest', quest: 'road', step: null }, 60)).toBe(true);
    expect(p.quests).toEqual({});
  });
});
