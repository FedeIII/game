import { describe, expect, it } from 'vitest';
import {
  EMPTY_PACK,
  Horde,
  ITEM_KINDS,
  PLAIN_SCORES,
  Room,
  TILE_SIZE,
  World,
  blowDamage,
  canMakeDeal,
  checkDialog,
  createPlayer,
  drinkFrom,
  gateView,
  makeDeal,
  parseClientMessage,
  seenChunks,
  traitsOf,
  type Deal,
  type Dialog,
  type MobRules,
  type Scores,
  type SnapshotMessage,
  type WorldSource,
} from '../src/index.ts';
import { houseSource, textSource } from './helpers.ts';

const withInt = (int: number) => traitsOf({ ...PLAIN_SCORES, int } as Scores, 'fighter');
const everywhere: MobRules = { roam: () => true, hunt: () => true, population: { imp: 0, brute: 0 } };

describe('the display of a gate (Fede\'s rule)', () => {
  it('is open with the score, a clue 1 or 2 under it, and nothing lower', () => {
    const gate = { ability: 'int', min: 13 } as const;
    const view = (int: number) => gateView({ ...PLAIN_SCORES, int } as Scores, gate);
    expect([view(15), view(13), view(12), view(11), view(10), view(8)]).toEqual(['open', 'open', 'hint', 'hint', 'hidden', 'hidden']);
  });
});

describe('the opening of a wind-up', () => {
  it('adds the INT modifier to a blow on a mob in its wind-up, and never takes any away', () => {
    expect(withInt(17).opening).toBe(3);
    expect(withInt(8).opening).toBe(0);
    const blow = { damage: 4, push: 1, stagger: 1, opening: 3 };
    expect(blowDamage(blow, { state: 'windup' })).toBe(7);
    expect(blowDamage(blow, { state: 'chase' })).toBe(4);
  });

  it('kills a brute in its wind-up sooner', () => {
    const horde = new Horde(new World(textSource([])), everywhere, 4);
    const brute = horde.spawn('brute', 18, 0);
    brute.state = 'windup';
    horde.strike({ x: 0, y: 0 }, 0, undefined, 1, { damage: 6, push: 1, stagger: 1, opening: 3 });
    expect(brute.health).toBe(3);
  });
});

describe('drinks', () => {
  it('heal, cure and go from the pack', () => {
    const traits = withInt(10);
    const p = createPlayer(0, 0);
    p.hp = 1;
    p.poison = 200;
    const pack = { coins: 0, items: [{ kind: 'draught' as const, count: 2 }, { kind: 'antidote' as const, count: 1 }, { kind: 'strong-draught' as const, count: 1 }] };
    const a = drinkFrom(pack, 'draught', p, traits)!;
    expect(p.hp).toBe(3);
    expect(a.items[0]).toEqual({ kind: 'draught', count: 1 });
    const b = drinkFrom(a, 'antidote', p, traits)!;
    expect(p.poison).toBe(0);
    expect(b.items.some((s) => s.kind === 'antidote')).toBe(false);
    drinkFrom(b, 'strong-draught', p, traits);
    expect(p.hp).toBe(traits.maxHp);
    expect(drinkFrom(pack, 'herbs', p, traits)).toBeNull();
    expect(drinkFrom(EMPTY_PACK, 'draught', p, traits)).toBeNull();
  });
});

describe('a deal that takes items (a brew)', () => {
  const brew: Deal = { id: 'draught', goods: 'draught', price: 0, items: [{ kind: 'herbs', count: 2 }], poor: 'short' };

  it('takes the items and puts the goods in the pack', () => {
    const p = createPlayer(0, 0);
    const pack = { coins: 3, items: [{ kind: 'herbs' as const, count: 3 }] };
    expect(canMakeDeal(brew, pack, withInt(10))).toBe(true);
    expect(makeDeal(brew, pack, p, withInt(10))).toEqual({ coins: 3, items: [{ kind: 'herbs', count: 1 }, { kind: 'draught', count: 1 }] });
  });

  it('needs the items, and room for the goods', () => {
    const p = createPlayer(0, 0);
    expect(canMakeDeal(brew, { coins: 0, items: [{ kind: 'herbs', count: 1 }] }, withInt(10))).toBe(false);
    const full = { coins: 0, items: [{ kind: 'herbs' as const, count: 3 }, { kind: 'ring' as const, count: 1 }] };
    expect(canMakeDeal(brew, full, { slots: 2, buyShare: 1 })).toBe(false);
    expect(makeDeal(brew, full, p, { slots: 2, resist: 1, buyShare: 1, sellShare: 1 })).toBeNull();
  });
});

describe('a dialog with gates', () => {
  it('needs an answer without a gate in each node, and a way to end it without a gate', () => {
    const gate = { ability: 'int', min: 13 } as const;
    const good: Dialog = { name: 'A', start: 'a', nodes: { a: { say: 'Hm?', answers: [{ text: 'Clever.', next: 'b', gate }, { text: 'Bye.' }] }, b: { say: 'Yes.', answers: [{ text: 'Bye.' }] } } };
    expect(checkDialog(good)).toEqual([]);
    const allGated: Dialog = { name: 'A', start: 'a', nodes: { a: { say: 'Hm?', answers: [{ text: 'Clever.', gate }] } } };
    expect(checkDialog(allGated).length).toBeGreaterThan(0);
  });
});

/** The house world, with a cauldron by the house that brews a draught (INT 13). */
function cauldronSource(): WorldSource {
  const base = houseSource();
  const cauldron = {
    kind: 'cauldron' as const,
    tx: 12,
    ty: 12,
    content: {
      dialog: {
        name: 'Pot',
        start: 'pot',
        nodes: {
          pot: {
            say: 'It bubbles.',
            answers: [
              { text: 'Brew.', next: 'done', gate: { ability: 'int', min: 13 } as const, deal: { id: 'draught', goods: 'draught', price: 0, items: [{ kind: 'herbs', count: 2 }], poor: 'short' } as const },
              { text: 'Leave.' },
            ],
          },
          done: { say: 'Done.', answers: [{ text: 'Leave.' }] },
          short: { say: 'No.', answers: [{ text: 'Leave.' }] },
        },
      } satisfies Dialog,
    },
  };
  return { ...base, fixtureAt: (tx, ty) => (tx === 12 && ty === 12 ? cauldron : base.fixtureAt(tx, ty)), fixturesIn: () => [cauldron] };
}

describe('Intelligence in a shared world', () => {
  it('brews at a fixture only with the gate of the answer, the items, and nearness', () => {
    expect(parseClientMessage('{"t":"deal","at":[12,12],"deal":"draught"}')).toEqual({ t: 'deal', at: [12, 12], deal: 'draught' });
    expect(parseClientMessage('{"t":"deal","npc":0,"at":[12,12],"deal":"draught"}')).toBeNull();
    const room = new Room(new World(cauldronSource()));
    const herbs = { coins: 0, items: [{ kind: 'herbs' as const, count: 2 }] };
    const wise = room.join(0, 1, [12, 13], '', undefined, { traits: withInt(13), pack: herbs })!;
    const dull = room.join(0, 2, [12, 13], '', undefined, { traits: withInt(12), pack: herbs })!;
    const far = room.join(0, 3, [30, 30], '', undefined, { traits: withInt(16), pack: herbs })!;
    for (const p of [wise, dull, far]) room.deal(p.id, { at: [12, 12] }, 'draught');
    expect(wise.pack.items).toEqual([{ kind: 'draught', count: 1 }]);
    expect(dull.pack).toEqual(herbs);
    expect(far.pack).toEqual(herbs);
  });

  it('lets a player drink from its pack through the server', () => {
    expect(parseClientMessage('{"t":"drink","kind":6}')).toEqual({ t: 'drink', kind: 6 });
    const room = new Room(new World(houseSource()));
    const p = room.join(0, 1, undefined, '', undefined, { traits: withInt(10), hp: 1, pack: { coins: 0, items: [{ kind: 'draught', count: 1 }] } })!;
    room.drink(p.id, ITEM_KINDS.indexOf('draught'));
    expect(p.state.hp).toBe(3);
    expect(p.pack.items).toEqual([]);
    room.drink(p.id, ITEM_KINDS.indexOf('draught'));
    expect(p.state.hp).toBe(3);
  });

  it('keeps the chunks that a character sees, and sends the new ones', () => {
    expect(seenChunks(10, 10)).toHaveLength(9);
    const room = new Room(new World(houseSource()));
    const p = room.join(0, 1, [5, 10], '', undefined, { traits: withInt(10), explored: [[40, 40]] })!;
    const welcome = room.welcome(p);
    expect(welcome.ex).toContainEqual([40, 40]);
    expect(welcome.ex).toContainEqual([0, 0]);
    p.state.x = 3 * 32 * TILE_SIZE;
    room.tick(0);
    room.tick(50);
    let snap: SnapshotMessage | null = null;
    room.broadcast(0, (_id, m) => (snap = m));
    expect(snap!.ex).toContainEqual([3, 0]);
    expect(snap!.ex).toContainEqual([4, 1]);
  });
});
