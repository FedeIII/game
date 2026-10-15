import { describe, expect, it } from 'vitest';
import {
  AVERAGE_DICE,
  ALE_TICKS,
  ATTACK_COOLDOWN_TICKS,
  ATTACK_STAMINA,
  ROLLS,
  DOWN_TICKS,
  NO_INPUT,
  PLAIN_SCORES,
  POISON_DAMAGE,
  POISON_EVERY,
  Room,
  STAMINA_REST_TICKS,
  TICK_RATE,
  TILE_SIZE,
  TIRED_COOLDOWN,
  WAKE_GUARD_TICKS,
  WALK_REFILL_SHARE,
  World,
  checkDialog,
  createPlayer,
  hitPlayer,
  kitOf,
  parseClientMessage,
  rest,
  staminaRefillNow,
  stepPlayer,
  traitsOf,
  wakePoint,
  type Dialog,
  type NpcDef,
  type Scores,
  type SnapshotMessage,
  type WorldSource,
  PLAIN_GEAR,
} from '../src/index.ts';
import { houseSource, textSource } from './helpers.ts';

const withCon = (con: number) => traitsOf({ ...PLAIN_SCORES, con } as Scores, 'fighter', PLAIN_GEAR);
const open = new World(textSource([]));

describe('the Constitution traits', () => {
  it('give the hit points of level 1, the stun, the stamina and the resistance; no recovery by itself', () => {
    // A fighter (d10) at level 1: the die at its most and the CON modifier (5e; level 1 since 2026-10-13).
    const tough = withCon(17);
    expect(tough.maxHp).toBe(10 + 3);
    expect(tough.stun).toBeCloseTo(0.7);
    expect(tough.recover).toBe(0);
    expect(tough.maxStamina).toBe(130);
    expect(tough.staminaRefill).toBe(32);
    expect(tough.resist).toBeCloseTo(0.55);
    const frail = withCon(8);
    expect(frail.maxHp).toBe(10 - 1);
    expect(frail.stun).toBeCloseTo(1.1);
    expect(frail.recover).toBe(0);
    expect(frail.maxStamina).toBe(90);
  });
});

describe('a hit', () => {
  it('takes hit points and stuns for the share of the Constitution', () => {
    const p = createPlayer(0, 0);
    p.hp = 31;
    hitPlayer(p, 9, 120, 0, withCon(17));
    expect(p.hp).toBe(22);
    expect(p.stun).toBe(84);
    expect(p.down).toBe(0);
  });

  it('defeats the player at 0 hit points: it lies DOWN_TICKS, and nothing can hit it', () => {
    const p = createPlayer(0, 0);
    hitPlayer(p, p.hp + 5, 60, 0);
    expect(p.hp).toBe(0);
    expect(p.down).toBe(DOWN_TICKS);
    expect(p.stun).toBe(0);
    for (let i = 0; i < 10; i++) stepPlayer(p, { x: 1, y: 0 }, open);
    expect(p.x).toBe(0);
    expect(p.down).toBe(DOWN_TICKS - 10);
  });

  it('of an imp poisons: a bite of 2 every 3 s, never the last hit point; less long with Constitution', () => {
    const p = createPlayer(0, 0);
    p.hp = 5;
    hitPlayer(p, 0, 1, 360, withCon(10));
    expect(p.poison).toBe(360);
    let ticks = 0;
    while (p.poison > 0) {
      stepPlayer(p, NO_INPUT, open);
      ticks++;
      if (ticks === POISON_EVERY) expect(p.hp).toBe(5 - POISON_DAMAGE);
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
  it('gives no hit point back by itself, as at the table (level-3.md)', () => {
    const traits = withCon(14);
    const p = createPlayer(0, 0);
    p.hp = traits.maxHp;
    hitPlayer(p, 7, 1, 0, traits);
    for (let i = 0; i < 60 * TICK_RATE; i++) stepPlayer(p, NO_INPUT, open, traits);
    expect(p.hp).toBe(traits.maxHp - 7);
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
    p.stamina = ROLLS.light.stamina + 1;
    stepPlayer(p, { x: 1, y: 0, dodge: true }, open);
    expect(p.dodge).toBeGreaterThan(0);
    expect(p.stamina).toBeLessThan(2);
    const q = createPlayer(100, 100);
    q.stamina = ROLLS.light.stamina - 1;
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

  it('comes back at a quarter of the rate in a walk (Fede, 2026-10-15)', () => {
    const traits = withCon(14); // 28 each second: 7 in a walk
    expect(WALK_REFILL_SHARE).toBe(0.25);
    const walker = createPlayer(100, 100);
    const stander = createPlayer(100, 100);
    for (const p of [walker, stander]) {
      p.stamina = 10;
      p.rest = 0;
    }
    // The second after the use: nothing comes back, walk or not.
    for (let i = 0; i < STAMINA_REST_TICKS; i++) {
      stepPlayer(walker, { x: 1, y: 0 }, open, traits);
      stepPlayer(stander, NO_INPUT, open, traits);
    }
    expect(walker.stamina).toBe(10);
    expect(stander.stamina).toBe(10);
    for (let i = 0; i < TICK_RATE; i++) {
      stepPlayer(walker, { x: 1, y: 0 }, open, traits);
      stepPlayer(stander, NO_INPUT, open, traits);
    }
    expect(walker.stamina).toBeCloseTo(10 + 7, 3);
    expect(stander.stamina).toBeCloseTo(10 + 28, 3);
    // The walk stops: all of the refill comes back from the next tick.
    stepPlayer(walker, NO_INPUT, open, traits);
    for (let i = 0; i < TICK_RATE; i++) stepPlayer(walker, NO_INPUT, open, traits);
    expect(walker.stamina).toBeCloseTo(10 + 7 + 7 / TICK_RATE + 28, 3);
  });

  it('gives the refill of now: none after a use, all of it at rest, a quarter in a walk', () => {
    const traits = withCon(10);
    const p = createPlayer(100, 100);
    p.rest = STAMINA_REST_TICKS - 1;
    expect(staminaRefillNow(p, traits)).toBe(0);
    p.rest = STAMINA_REST_TICKS;
    expect(staminaRefillNow(p, traits)).toBe(20);
    p.vx = 80;
    expect(staminaRefillNow(p, traits)).toBe(5);
    // A player without traits (every score 10): the same.
    expect(staminaRefillNow(p, {})).toBe(5);
  });

  it('comes back at a quarter of the rate in a walk through shallow water', () => {
    const water = new World(textSource([',,,,,,,,', ',,,,,,,,']));
    const p = createPlayer(8, 8);
    p.stamina = 50;
    for (let i = 0; i < TICK_RATE; i++) stepPlayer(p, { x: 1, y: 0 }, water, { wade: true });
    expect(p.wading).toBe(true);
    // The first tick stands (no walk yet), then a walk: 5 each second.
    expect(p.stamina).toBeCloseTo(50 + 20 / TICK_RATE + (5 * (TICK_RATE - 1)) / TICK_RATE, 3);
  });

  it('pays for an attack by the weight of what it attacks with: light 4, plain 6, heavy 10 (an arrow of a longbow too)', () => {
    const cost = (cls: Parameters<typeof kitOf>[0], gear = kitOf(cls)) => traitsOf(PLAIN_SCORES, cls, gear).attackStamina;
    expect(ATTACK_STAMINA).toEqual({ light: 4, plain: 6, heavy: 10 });
    expect(cost('rogue')).toBe(4); // a shortsword
    expect(cost('monk')).toBe(4); // martial arts
    expect(cost('fighter')).toBe(6); // a longsword
    expect(cost('wizard')).toBe(6); // a cantrip
    expect(cost('cleric', PLAIN_GEAR)).toBe(6); // an unarmed strike
    expect(cost('barbarian')).toBe(10); // a greataxe
    expect(cost('ranger')).toBe(10); // a longbow
    const traits = traitsOf(PLAIN_SCORES, 'barbarian', kitOf('barbarian'));
    const p = createPlayer(100, 100);
    expect(stepPlayer(p, { x: 0, y: 0, attack: 0 }, open, traits)).toBe(true);
    expect(p.stamina).toBe(traits.maxStamina - 10);
    expect(p.cooldown).toBe(traits.cooldown);
    // The attack is a use: stamina fills again a second after it.
    expect(p.rest).toBe(0);
  });

  it('gives a slower attack without enough stamina: the attack comes, and the next one waits twice as long', () => {
    const traits = traitsOf(PLAIN_SCORES, 'barbarian', kitOf('barbarian'));
    const p = createPlayer(100, 100);
    p.stamina = 7;
    expect(stepPlayer(p, { x: 0, y: 0, attack: 0 }, open, traits)).toBe(true);
    expect(p.stamina).toBe(0);
    expect(p.cooldown).toBe(TIRED_COOLDOWN * traits.cooldown);
    let ticks = 0;
    while (!stepPlayer(p, { x: 0, y: 0, attack: 0 }, open, traits)) ticks++;
    expect(ticks).toBe(TIRED_COOLDOWN * traits.cooldown - 1);
  });

  it('is not paid for the swing of a guard or a companion (traits without attackStamina)', () => {
    const p = createPlayer(100, 100);
    p.stamina = 0;
    expect(stepPlayer(p, { x: 0, y: 0, attack: 0 }, open, { maxHp: 11, recover: 0 })).toBe(true);
    // No cost, no slower attack, and the refill goes on.
    expect(p.stamina).toBeGreaterThan(0);
    expect(p.rest).toBe(STAMINA_REST_TICKS);
    expect(p.cooldown).toBe(ATTACK_COOLDOWN_TICKS);
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
    const room = new Room(new World(refugeSource()), { dice: AVERAGE_DICE });
    const p = room.join(0, 1, [20, 20], '', undefined, { traits: withCon(12), pack: { coins: 9, items: [] } })!;
    // A fighter with CON 12 at level 1: 10 + 1.
    expect(room.welcome(p).hp).toBe(11);
    hitPlayer(p.state, 99, 60, 0);
    const quiet = Array.from({ length: 30 }, () => [0, 0] as const);
    for (let s = 1; s <= DOWN_TICKS; s += 30) room.input(p.id, { t: 'in', s, i: quiet }, s * 16);
    expect(p.state.down).toBe(0);
    expect(p.state).toMatchObject({ hp: 11, guard: WAKE_GUARD_TICKS });
    expect([p.state.x, p.state.y]).toEqual([room.world.spawn().x, room.world.spawn().y]);
    expect(p.pack.coins).toBe(5);
    let snap: SnapshotMessage | null = null;
    room.broadcast(0, (_id, m) => (snap = m));
    expect(snap!.wk).toBe(4);
    expect(snap!.pk).toEqual([5, []]);
  });

  it('notes a refuge that the player enters, and comes back with the hit points of the last visit', () => {
    const room = new Room(new World(refugeSource()), { dice: AVERAGE_DICE });
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
    expect(p.state.hp).toBe(10);
  });

  it('sells an ale next to the NPC, for its price, and never without the coins', () => {
    expect(parseClientMessage('{"t":"deal","npc":0,"deal":"ale"}')).toEqual({ t: 'deal', npc: 0, deal: 'ale' });
    expect(parseClientMessage('{"t":"deal","npc":-1,"deal":"ale"}')).toBeNull();
    const room = new Room(new World(refugeSource()), { dice: AVERAGE_DICE });
    const poor = room.join(0, 1, [12, 13], '', undefined, { traits: withCon(10), pack: { coins: 1, items: [] } })!;
    const rich = room.join(0, 2, [12, 13], '', undefined, { traits: withCon(17), pack: { coins: 5, items: [] } })!;
    const far = room.join(0, 3, [30, 30], '', undefined, { traits: withCon(10), pack: { coins: 5, items: [] } })!;
    room.tick(0);
    room.tick(20);
    room.deal(poor.id, { npc: 0 }, 'ale');
    room.deal(rich.id, { npc: 0 }, 'ale');
    room.deal(far.id, { npc: 0 }, 'ale');
    room.deal(rich.id, { npc: 0 }, 'beer');
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
