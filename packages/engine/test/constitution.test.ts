import { describe, expect, it } from 'vitest';
import {
  ALE_TICKS,
  DODGE_STAMINA,
  DOWN_TICKS,
  NO_INPUT,
  PLAIN_SCORES,
  POISON_EVERY,
  RECOVER_DELAY_TICKS,
  Room,
  STAMINA_REST_TICKS,
  TICK_RATE,
  TILE_SIZE,
  WAKE_GUARD_TICKS,
  World,
  checkDialog,
  createPlayer,
  hitPlayer,
  parseClientMessage,
  rest,
  stepPlayer,
  traitsOf,
  wakePoint,
  type Dialog,
  type NpcDef,
  type Scores,
  type SnapshotMessage,
  type WorldSource,
} from '../src/index.ts';
import { houseSource, textSource } from './helpers.ts';

const withCon = (con: number) => traitsOf({ ...PLAIN_SCORES, con } as Scores, 'fighter');
const open = new World(textSource([]));

describe('the Constitution traits', () => {
  it('give the hit points, the stun, the recovery, the stamina and the resistance', () => {
    const tough = withCon(17);
    expect(tough.maxHp).toBe(7);
    expect(tough.stun).toBeCloseTo(0.7);
    expect(tough.recover).toBe(5 * TICK_RATE);
    expect(tough.maxStamina).toBe(130);
    expect(tough.staminaRefill).toBe(32);
    expect(tough.resist).toBeCloseTo(0.55);
    const frail = withCon(8);
    expect(frail.maxHp).toBe(3);
    expect(frail.stun).toBeCloseTo(1.1);
    expect(frail.recover).toBe(9 * TICK_RATE);
    expect(frail.maxStamina).toBe(90);
  });
});

describe('a hit', () => {
  it('takes hit points and stuns for the share of the Constitution', () => {
    const p = createPlayer(0, 0);
    hitPlayer(p, 2, 120, 0, withCon(17));
    expect(p.hp).toBe(2);
    expect(p.stun).toBe(84);
    expect(p.down).toBe(0);
  });

  it('defeats the player at 0 hit points: it lies DOWN_TICKS, and nothing can hit it', () => {
    const p = createPlayer(0, 0);
    hitPlayer(p, 4, 60, 0);
    expect(p.hp).toBe(0);
    expect(p.down).toBe(DOWN_TICKS);
    expect(p.stun).toBe(0);
    for (let i = 0; i < 10; i++) stepPlayer(p, { x: 1, y: 0 }, open);
    expect(p.x).toBe(0);
    expect(p.down).toBe(DOWN_TICKS - 10);
  });

  it('of an imp poisons: a bite every 3 s, never the last hit point; less long with Constitution', () => {
    const p = createPlayer(0, 0);
    p.hp = 3;
    hitPlayer(p, 0, 1, 360, withCon(10));
    expect(p.poison).toBe(360);
    let ticks = 0;
    while (p.poison > 0) {
      stepPlayer(p, NO_INPUT, open);
      ticks++;
      if (ticks === POISON_EVERY) expect(p.hp).toBe(2);
    }
    expect(p.hp).toBe(1);
    hitPlayer(p, 0, 1, 360, withCon(10));
    for (let i = 0; i < 400; i++) stepPlayer(p, NO_INPUT, open);
    expect(p.hp).toBe(1);
    const q = createPlayer(0, 0);
    hitPlayer(q, 0, 1, 360, withCon(17));
    expect(q.poison).toBe(198);
  });
});

describe('recovery', () => {
  it('gives the first hit point 8 s after a hit, then one every 8 - mod s', () => {
    const traits = withCon(14);
    const p = createPlayer(0, 0);
    p.hp = traits.maxHp;
    hitPlayer(p, 2, 1, 0, traits);
    let ticks = 0;
    while (p.hp < traits.maxHp - 1) {
      stepPlayer(p, NO_INPUT, open, traits);
      ticks++;
    }
    expect(ticks).toBe(RECOVER_DELAY_TICKS);
    while (p.hp < traits.maxHp) {
      stepPlayer(p, NO_INPUT, open, traits);
      ticks++;
    }
    expect(ticks).toBe(RECOVER_DELAY_TICKS + traits.recover);
  });

  it('is full at once with a rest in the bed of the home', () => {
    const traits = withCon(12);
    const p = createPlayer(0, 0);
    p.hp = 1;
    p.stamina = 3;
    p.poison = 100;
    p.drunk = 100;
    rest(p, traits);
    expect(p).toMatchObject({ hp: traits.maxHp, stamina: traits.maxStamina, poison: 0, drunk: 0 });
  });
});

describe('stamina', () => {
  it('pays for a roll, and without enough there is no roll', () => {
    const p = createPlayer(100, 100);
    p.stamina = DODGE_STAMINA + 1;
    stepPlayer(p, { x: 1, y: 0, dodge: true }, open);
    expect(p.dodge).toBeGreaterThan(0);
    expect(p.stamina).toBeLessThan(2);
    const q = createPlayer(100, 100);
    q.stamina = DODGE_STAMINA - 1;
    stepPlayer(q, { x: 1, y: 0, dodge: true }, open);
    expect(q.dodge).toBe(0);
  });

  it('goes in the sneak walk (8 each second), and fills again a second after the last use', () => {
    const traits = withCon(10);
    const p = createPlayer(100, 100);
    for (let i = 0; i < TICK_RATE; i++) stepPlayer(p, { x: 0.4, y: 0 }, open, traits);
    expect(p.stamina).toBeCloseTo(traits.maxStamina - 8, 3);
    for (let i = 0; i < STAMINA_REST_TICKS; i++) stepPlayer(p, NO_INPUT, open, traits);
    expect(p.stamina).toBeCloseTo(traits.maxStamina - 8, 3);
    for (let i = 0; i < TICK_RATE; i++) stepPlayer(p, NO_INPUT, open, traits);
    expect(p.stamina).toBeCloseTo(traits.maxStamina, 3);
  });

  it('does not go in a slow walk in shallow water', () => {
    const water = new World(textSource([',,,,,,,,', ',,,,,,,,']));
    const p = createPlayer(8, 8);
    for (let i = 0; i < 30; i++) stepPlayer(p, { x: 1, y: 0 }, water, { wade: true });
    expect(p.wading).toBe(true);
    expect(p.stamina).toBe(100);
  });
});

describe('an ale', () => {
  it('makes the walk sway', () => {
    const p = createPlayer(100, 100);
    p.drunk = ALE_TICKS;
    const ys = new Set<number>();
    for (let i = 0; i < 120; i++) {
      stepPlayer(p, { x: 1, y: 0 }, open);
      ys.add(Math.round(p.y));
    }
    expect(ys.size).toBeGreaterThan(1);
    expect(p.x).toBeGreaterThan(100 + 100);
  });
});

/** The house world with a refuge, the house, and an NPC that sells ale. */
function refugeSource(): WorldSource {
  const base = houseSource();
  const dialog: Dialog = {
    name: 'Marta',
    start: 'hi',
    nodes: {
      hi: { say: 'Ale?', answers: [{ text: 'Yes. (2 coins)', next: 'ale', deal: { id: 'ale', goods: 'ale', price: 2, poor: 'poor' } }, { text: 'No.' }] },
      ale: { say: 'Here.', answers: [{ text: 'Thanks.' }] },
      poor: { say: 'Two coins.', answers: [{ text: 'Sorry.' }] },
    },
  };
  const npc: NpcDef = { id: 'marta', look: 'innkeeper', home: [12, 12], area: [[12, 12]], content: { speaker: 'fixture', dialog } };
  return { ...base, refuges: () => [{ id: 'house', building: 'house', x: 5 * TILE_SIZE + 8, y: 5 * TILE_SIZE + 12 }], npcs: () => [npc] };
}

describe('waking after a defeat', () => {
  it('is at the spawn, unless the character has entered a nearer refuge', () => {
    const world = new World(refugeSource());
    const spawn = world.spawn();
    expect(wakePoint(world, 6 * TILE_SIZE, 4 * TILE_SIZE, [])).toEqual(spawn);
    expect(wakePoint(world, 6 * TILE_SIZE, 4 * TILE_SIZE, ['house'])).toEqual({ x: 5 * TILE_SIZE + 8, y: 5 * TILE_SIZE + 12 });
    // From far south the spawn (south of the house) is nearer.
    expect(wakePoint(world, 5 * TILE_SIZE, 40 * TILE_SIZE, ['house'])).toEqual(spawn);
  });
});

describe('Constitution in a shared world', () => {
  it('wakes a defeated player at the spawn when its defeat is over, with all its hit points and half its coins', () => {
    const room = new Room(new World(refugeSource()));
    const p = room.join(0, 1, [20, 20], '', undefined, { traits: withCon(12), pack: { coins: 9, items: [] } })!;
    expect(room.welcome(p).hp).toBe(5);
    hitPlayer(p.state, 99, 60, 0);
    const quiet = Array.from({ length: 30 }, () => [0, 0] as const);
    for (let s = 1; s <= DOWN_TICKS; s += 30) room.input(p.id, { t: 'in', s, i: quiet }, s * 16);
    expect(p.state.down).toBe(0);
    expect(p.state).toMatchObject({ hp: 5, guard: WAKE_GUARD_TICKS });
    expect([p.state.x, p.state.y]).toEqual([room.world.spawn().x, room.world.spawn().y]);
    expect(p.pack.coins).toBe(5);
    let snap: SnapshotMessage | null = null;
    room.broadcast(0, (_id, m) => (snap = m));
    expect(snap!.wk).toBe(4);
    expect(snap!.pk).toEqual([5, []]);
  });

  it('notes a refuge that the player enters, and comes back with the hit points of the last visit', () => {
    const room = new Room(new World(refugeSource()));
    const p = room.join(0, 1, [5, 10], '', undefined, { traits: withCon(10), hp: 2, refuges: [] })!;
    expect(p.state.hp).toBe(2);
    p.state.x = 5 * TILE_SIZE + 8;
    p.state.y = 4 * TILE_SIZE + 8;
    room.tick(0);
    room.tick(50);
    expect(p.refuges).toEqual(['house']);
    let snap: SnapshotMessage | null = null;
    room.broadcast(0, (_id, m) => (snap = m));
    expect(snap!.rf).toEqual(['house']);
    // A player who leaves while it lies defeated wakes first.
    hitPlayer(p.state, 9, 1, 0);
    room.settle(p.id);
    expect(p.state.down).toBe(0);
    expect(p.state.hp).toBe(4);
  });

  it('sells an ale next to the NPC, for its price, and never without the coins', () => {
    expect(parseClientMessage('{"t":"deal","npc":0,"deal":"ale"}')).toEqual({ t: 'deal', npc: 0, deal: 'ale' });
    expect(parseClientMessage('{"t":"deal","npc":-1,"deal":"ale"}')).toBeNull();
    const room = new Room(new World(refugeSource()));
    const poor = room.join(0, 1, [12, 13], '', undefined, { traits: withCon(10), pack: { coins: 1, items: [] } })!;
    const rich = room.join(0, 2, [12, 13], '', undefined, { traits: withCon(17), pack: { coins: 5, items: [] } })!;
    const far = room.join(0, 3, [30, 30], '', undefined, { traits: withCon(10), pack: { coins: 5, items: [] } })!;
    room.tick(0);
    room.tick(20);
    room.deal(poor.id, 0, 'ale');
    room.deal(rich.id, 0, 'ale');
    room.deal(far.id, 0, 'ale');
    room.deal(rich.id, 0, 'beer');
    expect([poor.pack.coins, rich.pack.coins, far.pack.coins]).toEqual([1, 3, 5]);
    expect(rich.state.drunk).toBe(Math.round(ALE_TICKS * 0.55));
    expect(poor.state.drunk).toBe(0);
  });
});

describe('a dialog with a deal', () => {
  it('needs the node for too few coins, and an answer that goes on', () => {
    const good: Dialog = {
      name: 'A',
      start: 'a',
      nodes: { a: { say: 'Buy?', answers: [{ text: 'Yes', next: 'b', deal: { id: 'x', goods: 'ale', price: 1, poor: 'c' } }] }, b: { say: 'Ok.', answers: [{ text: 'Bye' }] }, c: { say: 'No.', answers: [{ text: 'Bye' }] } },
    };
    expect(checkDialog(good)).toEqual([]);
    const bad: Dialog = { ...good, nodes: { ...good.nodes, a: { say: 'Buy?', answers: [{ text: 'Yes', deal: { id: 'x', goods: 'ale', price: 1, poor: 'd' } }] } } };
    expect(checkDialog(bad).length).toBeGreaterThan(0);
  });
});
