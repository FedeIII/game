import { describe, expect, it } from 'vitest';
import { AVERAGE_DICE, Horde, MOB_STATS, NO_INPUT, TICK_SECONDS, TILE_SIZE, World, createPlayer, stepPlayer, type HordePlayer, type MobRules, type PlayerState } from '../src/index.ts';
import { textSource } from './helpers.ts';

/**
 * The foes of the sandbox of an admin (the page's sandbox.ts; docs/features/game/sandbox.md): steady
 * mobs with more hit points, that hunt the player at once and never flee, whatever their kind does.
 */

const TICK_MS = TICK_SECONDS * 1000;
const open: MobRules = { roam: () => true, hunt: () => true, population: {} };
const tough = (x: number, y: number): PlayerState => {
  const p = createPlayer(x, y);
  p.hp = 1000;
  return p;
};

function run(horde: Horde, players: HordePlayer[], ms: number, each?: () => void): void {
  for (let t = 0; t < ms; t += TICK_MS) {
    for (const p of players) stepPlayer(p.state, NO_INPUT, horde.world);
    horde.step(TICK_MS, players);
    each?.();
  }
}

describe('a steady foe', () => {
  it('has the hit points that it was given', () => {
    const horde = new Horde(new World(textSource([])), open, 1, AVERAGE_DICE);
    const mob = horde.spawn('skirmisher', 100, 100, { health: 5 * MOB_STATS.skirmisher.health, steady: true });
    expect(mob.health).toBe(35);
    expect(mob.maxHealth).toBe(35);
    // A plain mob keeps its stat block.
    expect(horde.spawn('skirmisher', 100, 100).maxHealth).toBeUndefined();
  });

  it('of a kind that patrols never startles or flees: it hunts the player that it sees', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const horde = new Horde(new World(textSource([])), open, seed, AVERAGE_DICE);
      const goblins = [0, 1, 2].map((i) => horde.spawn('skirmisher', 100, 100 + i * 12, { steady: true }));
      const player: HordePlayer = { id: 1, state: tough(100 + 5 * TILE_SIZE, 110) };
      const states = new Set<string>();
      run(horde, [player], 4000, () => goblins.forEach((g) => states.add(g.state)));
      expect(states.has('startled')).toBe(false);
      expect(states.has('flee')).toBe(false);
      expect(states.has('chase')).toBe(true);
    }
  });

  it('of a kind that ambushes never lurks', () => {
    const horde = new Horde(new World(textSource([])), open, 3, AVERAGE_DICE);
    const bandit = horde.spawn('bandit', 100, 100, { steady: true });
    run(horde, [{ id: 1, state: tough(100 + 30 * TILE_SIZE, 100) }], 3000);
    expect(bandit.state).not.toBe('lurk');
  });

  it('that is provoked hunts the player at once, from out of its sight', () => {
    const horde = new Horde(new World(textSource([])), open, 4, AVERAGE_DICE);
    const goblin = horde.spawn('skirmisher', 100, 100, { steady: true });
    const player = tough(100 + 9 * TILE_SIZE, 100);
    horde.provoke(goblin, 1, player);
    expect(goblin.state).toBe('chase');
    expect(horde.huntersOf(1)).toEqual([goblin]);
  });
});
