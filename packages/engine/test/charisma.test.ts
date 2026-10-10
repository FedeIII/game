import { describe, expect, it } from 'vitest';
import {
  GUARD_TICKS,
  Horde,
  MOB_STATS,
  PLAIN_SCORES,
  TICK_SECONDS,
  World,
  checkDialog,
  createPlayer,
  dealPay,
  dealPrice,
  makeDeal,
  canMakeDeal,
  stepPlayer,
  traitsOf,
  type Deal,
  type Dialog,
  type HordePlayer,
  type Mob,
  type MobRules,
  type Scores,
} from '../src/index.ts';
import { textSource } from './helpers.ts';

const withCha = (cha: number) => traitsOf({ ...PLAIN_SCORES, cha } as Scores, 'fighter');
const everywhere: MobRules = { roam: () => true, hunt: () => true, population: { imp: 0, brute: 0 } };
const NO_INPUT = { x: 0, y: 0 };
const TICK_MS = TICK_SECONDS * 1000;

/** A player that does not fall: it takes many hits. */
function tough(x: number, y: number) {
  const p = createPlayer(x, y);
  p.hp = 1000;
  return p;
}

describe('the traits of Charisma', () => {
  it('scale prices, the press of a pack, the retreat of a mob and the guard that it gives', () => {
    const [low, plain, high] = [withCha(8), withCha(10), withCha(16)];
    expect([low.buyShare, plain.buyShare, high.buyShare].map((v) => +v.toFixed(2))).toEqual([1.1, 1, 0.7]);
    expect([low.sellShare, plain.sellShare, high.sellShare].map((v) => +v.toFixed(2))).toEqual([0.9, 1, 1.3]);
    expect([low.presence, plain.presence, high.presence].map((v) => +v.toFixed(2))).toEqual([-0.05, 0, 0.15]);
    expect([low.daunt, plain.daunt, high.daunt].map((v) => +v.toFixed(2))).toEqual([0.9, 1, 1.3]);
    expect([low.inspire, plain.inspire, high.inspire]).toEqual([0, 0, 18]);
  });
});

describe('prices and sales', () => {
  const ale: Deal = { id: 'ale', goods: 'ale', price: 2, poor: 'poor' };
  const draught: Deal = { id: 'buy', goods: 'draught', price: 6, poor: 'poor' };
  const ring: Deal = { id: 'sell', goods: 'coins', price: 0, pay: 5, items: [{ kind: 'ring', count: 1 }], poor: 'poor' };

  it('cost less and give more with Charisma, never less than a coin', () => {
    expect([dealPrice(ale, withCha(8)), dealPrice(ale, withCha(10)), dealPrice(ale, withCha(16))]).toEqual([2, 2, 1]);
    expect([dealPrice(draught, withCha(8)), dealPrice(draught, withCha(16))]).toEqual([7, 4]);
    expect([dealPay(ring, withCha(8)), dealPay(ring, withCha(10)), dealPay(ring, withCha(16))]).toEqual([5, 5, 7]);
    expect(dealPrice({ ...draught, price: 0 }, withCha(16))).toBe(0);
  });

  it('take the price that the player pays, and give the coins of a sale', () => {
    const p = createPlayer(0, 0);
    const pack = { coins: 4, items: [{ kind: 'ring' as const, count: 1 }] };
    expect(canMakeDeal(draught, pack, withCha(10))).toBe(false);
    expect(canMakeDeal(draught, pack, withCha(16))).toBe(true);
    expect(makeDeal(draught, pack, p, withCha(16))).toEqual({ coins: 0, items: [{ kind: 'ring', count: 1 }, { kind: 'draught', count: 1 }] });
    expect(makeDeal(ring, pack, p, withCha(16))).toEqual({ coins: 11, items: [] });
    expect(makeDeal(ring, { coins: 0, items: [] }, p, withCha(16))).toBeNull();
  });

  it('a sale must pay something, and a refuge must have a name', () => {
    const dialog = (deal: Deal): Dialog => ({ name: 'A', start: 'a', nodes: { a: { say: 'Hm?', answers: [{ text: 'Deal.', next: 'a', deal }, { text: 'Bye.' }] } } });
    expect(checkDialog(dialog({ ...ring, poor: 'a' }))).toEqual([]);
    expect(checkDialog(dialog({ ...ring, poor: 'a', pay: 0 })).length).toBeGreaterThan(0);
    expect(checkDialog(dialog({ id: 'room', goods: 'refuge', price: 0, poor: 'a' })).length).toBeGreaterThan(0);
    expect(checkDialog(dialog({ id: 'room', goods: 'refuge', refuge: 'inn', price: 0, poor: 'a' }))).toEqual([]);
  });
});

describe('the presence of Charisma in a fight', () => {
  /** A pack of `size` imps round a player with `traits`; the most of an attack left when the next starts, as a share. */
  function overlapOf(size: number, traits: HordePlayer['traits']): number {
    const horde = new Horde(new World(textSource([])), everywhere, 4);
    const player: HordePlayer = { id: 1, state: tough(0, 0), traits };
    const mobs = Array.from({ length: size }, (_, i) => horde.spawn('imp', Math.cos((i / size) * 2 * Math.PI) * 90, Math.sin((i / size) * 2 * Math.PI) * 90));
    const duration = MOB_STATS.imp.windupMs + MOB_STATS.imp.strikeMs;
    const leftOf = (m: Mob) => (m.state === 'windup' ? MOB_STATS.imp.windupMs - m.stateMs + MOB_STATS.imp.strikeMs : MOB_STATS.imp.strikeMs - m.stateMs);
    let most = 0;
    for (let t = 0; t < 20_000; t += TICK_MS) {
      stepPlayer(player.state, NO_INPUT, horde.world);
      // The player dodges every blow, so the attacks follow one another without a stun.
      if (mobs.some((m) => m.state === 'windup' && m.stateMs + TICK_MS >= MOB_STATS.imp.windupMs)) player.state.guard = 1;
      const before = mobs.filter((m) => m.state === 'windup' || m.state === 'strike');
      horde.step(TICK_MS, [player]);
      for (const m of mobs.filter((m) => m.state === 'windup' && m.stateMs <= TICK_MS + 1)) {
        for (const other of before) if (other !== m) most = Math.max(most, leftOf(other) / duration);
      }
    }
    return most;
  }

  it('makes a pack overlap its attacks less', () => {
    const plain = overlapOf(3, { presence: 0 });
    const bold = overlapOf(3, { presence: withCha(16).presence });
    expect(plain).toBeGreaterThan(0.28);
    expect(bold).toBeLessThanOrEqual(0.4 - 0.15 + 0.05);
    expect(bold).toBeLessThan(plain - 0.08);
  });

  it('makes a mob run off longer after it hits', () => {
    const retreatOf = (daunt: number) => {
      const horde = new Horde(new World(textSource([])), everywhere, 9);
      const player: HordePlayer = { id: 1, state: tough(0, 0), traits: { daunt } };
      const imp = horde.spawn('imp', 40, 0);
      let ms = 0;
      for (let t = 0; t < 20_000; t += TICK_MS) {
        stepPlayer(player.state, NO_INPUT, horde.world);
        horde.step(TICK_MS, [player]);
        if (imp.state === 'retreat') ms += TICK_MS;
        else if (ms > 0) return ms;
      }
      return ms;
    };
    const plain = retreatOf(1);
    const daunted = retreatOf(1.3);
    expect(plain).toBeGreaterThan(MOB_STATS.imp.retreatMs[0] - 2 * TICK_MS);
    expect(daunted / plain).toBeGreaterThan(1.2);
    expect(daunted / plain).toBeLessThan(1.4);
  });

  it('gives the other players near it more guard after a hit; the best one counts', () => {
    const guardAfterHit = (others: readonly HordePlayer[]) => {
      const horde = new Horde(new World(textSource([])), everywhere, 2);
      const hit: HordePlayer = { id: 1, state: tough(0, 0), traits: { guard: GUARD_TICKS } };
      horde.spawn('imp', 30, 0);
      for (let t = 0; t < 20_000; t += TICK_MS) {
        stepPlayer(hit.state, NO_INPUT, horde.world, { guard: GUARD_TICKS });
        for (const o of others) stepPlayer(o.state, NO_INPUT, horde.world);
        const hits = horde.step(TICK_MS, [hit, ...others]);
        if (hits.some(([, id]) => id === hit.id)) {
          const inspired = hit.state.inspired;
          while (hit.state.stun > 0) stepPlayer(hit.state, NO_INPUT, horde.world, { guard: GUARD_TICKS });
          return { inspired, guard: hit.state.guard };
        }
      }
      throw new Error('no hit');
    };
    // The other players stand behind the hit one, out of the imp's way.
    const near = (id: number, inspire: number, dx: number): HordePlayer => ({ id, state: tough(-dx, 0), traits: { inspire } });
    expect(guardAfterHit([])).toEqual({ inspired: 0, guard: GUARD_TICKS });
    expect(guardAfterHit([near(2, 18, 20), near(3, 6, 24)])).toEqual({ inspired: 18, guard: GUARD_TICKS + 18 });
    expect(guardAfterHit([near(2, 18, 80)])).toEqual({ inspired: 0, guard: GUARD_TICKS });
  });
});
