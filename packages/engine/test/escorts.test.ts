import { describe, expect, it } from 'vitest';
import { Companions, EMPTY_PACK, Escorts, TICK_SECONDS, TILE_SIZE, World, createPlayer, type CompanionEvent, type EscortDef, type EscortPlayer, type QuestBook } from '../src/index.ts';
import { textSource } from './helpers.ts';

const TICK_MS = TICK_SECONDS * 1000;
const at = (tx: number, ty: number) => ({ x: tx * TILE_SIZE + 8, y: ty * TILE_SIZE + 12 });

/** Himo: the character takes the scout home, to the tiles from 40 on. */
const HIMO: EscortDef = {
  companion: { id: 'himo', name: 'Himo', look: 'scout', hp: 16, fallen: 'gone' },
  when: { quest: 'raid', at: ['escort'] },
  home: (tx) => tx >= 40,
  arrive: { id: 'himo-home', quest: 'raid', to: 'home', from: ['escort'], give: { coins: 20, items: [] } },
  fall: { id: 'himo-lost', quest: 'raid', to: 'lost', from: ['escort'] },
};
const ESCORT: QuestBook = { raid: { step: 'escort', flags: [], n: 3 } };

function setup(quests: QuestBook = ESCORT) {
  const world = new World(textSource([]));
  const companions = new Companions(world);
  const escorts = new Escorts([HIMO]);
  const player: EscortPlayer = { id: 1, state: createPlayer(at(10, 5).x, at(10, 5).y), quests, pack: EMPTY_PACK };
  return { world, companions, escorts, player };
}

/** The companions follow the leader for `ms`, or until an escort ends (the Room would apply its effect then). */
function walk(companions: Companions, escorts: Escorts, player: EscortPlayer, ms: number): ReturnType<Escorts['step']> {
  const out: ReturnType<Escorts['step']> = [];
  for (let t = 0; t < ms && out.length === 0; t += TICK_MS) {
    const events = companions.step(TICK_MS, new Map([[player.id, player.state]]));
    out.push(...escorts.step(companions, [player], events));
  }
  return out;
}

describe('escorts', () => {
  it('give a character at the step its companion, next to it, once', () => {
    const { companions, escorts, player } = setup();
    escorts.step(companions, [player], []);
    escorts.step(companions, [player], []);
    expect(companions.list.map((c) => [c.def.id, c.leader])).toEqual([['himo', 1]]);
    const himo = companions.list[0]!;
    expect(Math.hypot(himo.state.x - player.state.x, himo.state.y - player.state.y)).toBeLessThan(2 * TILE_SIZE);
  });

  it('give nothing to a character without the step', () => {
    const { companions, escorts, player } = setup({ raid: { step: 'band', flags: [], n: 2 } });
    escorts.step(companions, [player], []);
    expect(companions.list).toHaveLength(0);
  });

  it('end at home: the leader gets the arrival, and the companion goes', () => {
    const { companions, escorts, player } = setup();
    escorts.step(companions, [player], []);
    // The leader goes into the home tiles, 8 tiles on; the companion follows it there.
    player.state.x = at(18, 5).x;
    walk(companions, escorts, player, 3000);
    expect(companions.list).toHaveLength(1);
    player.state.x = at(30, 5).x;
    walk(companions, escorts, player, 3000);
    player.state.x = at(42, 5).x;
    const effects = walk(companions, escorts, player, 12_000);
    expect(effects).toEqual([{ player: 1, effect: HIMO.arrive }]);
    expect(companions.list).toHaveLength(0);
  });

  it('end with a fall when the companion is gone for good', () => {
    const { companions, escorts, player } = setup();
    escorts.step(companions, [player], []);
    const himo = companions.list[0]!;
    const gone: CompanionEvent = { id: himo.id, def: 'himo', kind: 'gone' };
    companions.remove(himo.id);
    expect(escorts.step(companions, [player], [gone])).toEqual([{ player: 1, effect: HIMO.fall }]);
    // No new Himo in the same step (the fall is not applied yet).
    expect(companions.list).toHaveLength(0);
  });

  it('take the companion out when its leader is not at the step any more, or left', () => {
    const { companions, escorts, player } = setup();
    escorts.step(companions, [player], []);
    escorts.step(companions, [{ ...player, quests: { raid: { step: 'home', flags: [], n: 4 } } }], []);
    expect(companions.list).toHaveLength(0);
    escorts.step(companions, [player], []);
    expect(companions.list).toHaveLength(1);
    escorts.step(companions, [], []);
    expect(companions.list).toHaveLength(0);
    // It comes back with its leader.
    escorts.step(companions, [player], []);
    expect(companions.list).toHaveLength(1);
  });
});
