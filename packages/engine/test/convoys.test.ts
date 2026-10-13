import { describe, expect, it } from 'vitest';
import {
  AVERAGE_DICE,
  Convoys,
  EMPTY_PACK,
  Guards,
  Horde,
  NO_INPUT,
  TICK_SECONDS,
  TILE_SIZE,
  World,
  createPlayer,
  dice,
  stepPlayer,
  type AmbushPlayer,
  type ConvoyDef,
  type GuardDef,
  type HordePlayer,
  type MobRules,
  type QuestBook,
} from '../src/index.ts';
import { textSource } from './helpers.ts';

const TICK_MS = TICK_SECONDS * 1000;
const at = (tx: number, ty: number) => ({ x: tx * TILE_SIZE + 8, y: ty * TILE_SIZE + 12 });
const everywhere: MobRules = { roam: () => true, hunt: () => true, population: {} };
const MILITIA: GuardDef = { id: 'militia', name: 'Militia', look: 'militia', hp: 11, ac: 16, cr: 1 / 8, blow: { toHit: 3, damage: dice(1, 6, 1), push: 1, stagger: 1, opening: 0 } };
const WAGON: GuardDef = { id: 'wagon', name: 'Wagon', look: 'wagon', hp: 30, ac: 11, cr: 0, speed: 0.6 };
/** The caravan walks row 5 from tile 60 west to tile 0; it meets its attackers halfway. */
const ROUTE = Array.from({ length: 241 }, (_, i) => [60.5 - i / 4, 5.5] as const);
const CARAVAN: ConvoyDef = {
  id: 'caravan',
  when: { quest: 'caravan', at: ['heard'] },
  inArea: (tx, ty) => tx >= 20 && tx <= 40 && Math.abs(ty - 5) <= 4,
  route: ROUTE,
  members: [WAGON, MILITIA, MILITIA],
  meet: 0.4,
  waves: [
    { when: { quest: 'raid', at: ['asked'] }, units: [[{ kind: 'goblin' }]], effect: { id: 'raid-scouts', quest: 'raid', to: 'scouts', from: ['asked'] } },
    { when: { quest: 'raid', at: ['asked', 'scouts'] }, units: [[{ kind: 'hobgoblin' }]] },
    { when: { quest: 'raid', at: ['asked', 'scouts'], not: true }, units: [[{ kind: 'imp' }]] },
  ],
  outlaw: { quest: 'caravan', at: ['robbing'] },
  saved: { id: 'caravan-saved', quest: 'caravan', to: 'saved', from: ['heard'] },
  lost: { id: 'caravan-lost', quest: 'caravan', to: 'lost', from: ['heard'] },
  robbed: { id: 'caravan-robbed', quest: 'caravan', to: 'robbed', from: ['robbing'] },
};

function setup(quests: QuestBook) {
  const world = new World(textSource([]));
  const horde = new Horde(world, everywhere, 3, AVERAGE_DICE);
  const guards = new Guards(world);
  const convoys = new Convoys(world, [CARAVAN]);
  const state = createPlayer(at(30, 7).x, at(30, 7).y);
  state.hp = 10_000;
  const player: AmbushPlayer & { quests: QuestBook } = { id: 1, state, quests, pack: EMPTY_PACK };
  return { world, horde, guards, convoys, player };
}

/** Runs everything for `ms` (or until an effect), applying nothing; the player stands (unseen: sight 0). */
function run(s: ReturnType<typeof setup>, ms: number, onTick?: () => void): ReturnType<Convoys['step']> {
  const out: ReturnType<Convoys['step']> = [];
  for (let t = 0; t < ms && out.length === 0; t += TICK_MS) {
    stepPlayer(s.player.state, NO_INPUT, s.world);
    const outlaw = s.convoys.outlawOf(s.player);
    const events = s.guards.step(TICK_MS, s.horde, [{ id: 1, state: s.player.state, outlaw }], AVERAGE_DICE, s.convoys.anchors());
    const targets: HordePlayer[] = [{ id: 1, state: s.player.state, sight: 0 }, ...s.guards.targets()];
    s.horde.step(TICK_MS, targets);
    out.push(...s.convoys.step(s.horde, s.guards, [s.player], events));
    onTick?.();
  }
  return out;
}

describe('a convoy', () => {
  it('starts for a character at the step in its area: the wagon in front, its militia behind, on the route', () => {
    const s = setup({ caravan: { step: 'heard', flags: [], n: 1 } });
    s.convoys.step(s.horde, s.guards, [s.player], []);
    expect(s.guards.list.map((g) => g.def.id)).toEqual(['wagon', 'militia', 'militia']);
    expect(s.guards.list[0]!.state.x).toBeLessThan(s.guards.list[2]!.state.x);
    // Not for a character without the step.
    const other = setup({});
    other.convoys.step(other.horde, other.guards, [other.player], []);
    expect(other.guards.list).toHaveLength(0);
  });

  it('meets the scouts and then the war band if they live; when the last wave falls, it is saved and walks on', () => {
    const s = setup({ caravan: { step: 'heard', flags: [], n: 1 }, raid: { step: 'asked', flags: [], n: 2 } });
    const kinds = new Set<string>();
    const effects = run(s, 120_000, () => {
      for (const m of s.horde.mobs) kinds.add(m.kind);
    });
    // The first wave's end moves the raid on (its effect), before the convoy is saved.
    expect(effects.map((e) => e.effect.id)).toEqual(['raid-scouts']);
    s.player.quests = { ...s.player.quests, raid: { step: 'scouts', flags: [], n: 3 } };
    const more = run(s, 120_000, () => {
      for (const m of s.horde.mobs) kinds.add(m.kind);
    });
    expect(more.map((e) => e.effect.id)).toEqual(['caravan-saved']);
    expect(kinds).toEqual(new Set(['goblin', 'hobgoblin']));
    expect(s.guards.list.every((g) => !g.halted)).toBe(true);
  });

  it('meets other attackers when the scouts and the band are dead', () => {
    const s = setup({ caravan: { step: 'heard', flags: [], n: 1 }, raid: { step: 'title', flags: [], n: 9 } });
    const kinds = new Set<string>();
    const effects = run(s, 120_000, () => {
      for (const m of s.horde.mobs) kinds.add(m.kind);
    });
    expect(effects.map((e) => e.effect.id)).toEqual(['caravan-saved']);
    expect(kinds).toEqual(new Set(['imp']));
  });

  it('is lost when the attackers break the wagon', () => {
    const s = setup({ caravan: { step: 'heard', flags: [], n: 1 }, raid: { step: 'title', flags: [], n: 9 } });
    s.convoys.step(s.horde, s.guards, [s.player], []);
    // The militia are gone, and the wagon is weak.
    for (const g of s.guards.list.filter((g) => g.def.blow)) s.guards.remove(g.id);
    s.guards.list[0]!.state.hp = 1;
    const effects = run(s, 120_000);
    expect(effects.map((e) => e.effect.id)).toEqual(['caravan-lost']);
    expect(s.guards.list).toHaveLength(0);
  });

  it('is robbed by an outlaw who brings its militia down: the cargo is its', () => {
    const s = setup({ caravan: { step: 'heard', flags: [], n: 1 }, raid: { step: 'title', flags: [], n: 9 } });
    s.convoys.step(s.horde, s.guards, [s.player], []);
    s.player.quests = { ...s.player.quests, caravan: { step: 'robbing', flags: [], n: 2 } };
    const kill = { toHit: 99, damage: dice(0, 0, 99), push: 1, stagger: 1, opening: 0 };
    for (const g of s.guards.list.filter((g) => g.def.blow)) {
      Object.assign(s.player.state, { x: g.state.x - 12, y: g.state.y });
      s.guards.strike(s.player.state, 0, 1, kill, ['caravan'], AVERAGE_DICE);
    }
    const effects = run(s, 5000);
    expect(effects.map((e) => e.effect.id)).toEqual(['caravan-robbed']);
    expect(s.guards.list).toHaveLength(0);
  });
});
