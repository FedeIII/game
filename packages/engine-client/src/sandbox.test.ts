import { describe, expect, it } from 'vitest';
import { AVERAGE_DICE, CHUNK_SIZE, Ground, Horde, MOB_STATS, World, createPlayer, emptyChunk, hitPlayer, traitsOf, PLAIN_GEAR, PLAIN_SCORES, type WorldSource } from '@game/engine';
import { DEFAULT_SANDBOX, FOE_COUNT, FOE_HP, RESTART_MS, SANDBOX_HP, SandboxFight, loadSandbox, sandboxRules, sandboxTraits, saveSandbox } from './sandbox.ts';

/** Open grass everywhere. */
const grass: WorldSource = {
  seed: 1,
  chunk(cx, cy) {
    const chunk = emptyChunk(cx, cy);
    chunk.ground.fill(Ground.Grass, 0, CHUNK_SIZE * CHUNK_SIZE);
    return chunk;
  },
  buildingAt: () => null,
  buildingsIn: () => [],
  fixtureAt: () => null,
  fixturesIn: () => [],
  spawn: (world) => world.findSpawn(),
};

/** A storage in memory. */
function memory() {
  const items = new Map<string, string>();
  return { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value) };
}

function fight() {
  const world = new World(grass);
  const horde = new Horde(world, sandboxRules({ roam: () => true, hunt: () => true, population: { imp: 4 } }), 1, AVERAGE_DICE);
  const traits = sandboxTraits(traitsOf(PLAIN_SCORES, 'fighter', PLAIN_GEAR));
  const player = createPlayer(0, 0);
  const sandbox = new SandboxFight(horde, world, { x: 200, y: 200 }, 'skirmisher');
  sandbox.start(player, traits, 0);
  return { horde, traits, player, sandbox };
}

describe('the sandbox of an admin', () => {
  it('gives the character ten times its hit points, and no other mob comes', () => {
    const plain = traitsOf(PLAIN_SCORES, 'fighter', PLAIN_GEAR);
    expect(sandboxTraits(plain).maxHp).toBe(plain.maxHp * SANDBOX_HP);
    expect(sandboxRules({ roam: () => true, hunt: () => true, population: { imp: 4 } }).population).toEqual({});
  });

  it('starts a fight: the character at the glade with all its hit points, and three foes with five times theirs that hunt it', () => {
    const { horde, traits, player } = fight();
    expect([player.x, player.y]).toEqual([200, 200]);
    expect(player.hp).toBe(traits.maxHp);
    expect(horde.mobs).toHaveLength(FOE_COUNT);
    for (const mob of horde.mobs) {
      expect(mob.kind).toBe('skirmisher');
      expect(mob.health).toBe(MOB_STATS.skirmisher.health * FOE_HP);
      expect(mob.state).toBe('chase');
    }
  });

  it('starts again a moment after the last foe falls, with new foes', () => {
    const { horde, traits, player, sandbox } = fight();
    const first = [...horde.mobs];
    for (const mob of first) mob.state = 'dying';
    expect(sandbox.tick(player, traits, 1000)).toBe(false);
    expect(sandbox.wins).toBe(1);
    expect(sandbox.last?.won).toBe(true);
    expect(sandbox.tick(player, traits, 1000 + RESTART_MS - 1)).toBe(false);
    expect(sandbox.tick(player, traits, 1000 + RESTART_MS)).toBe(true);
    expect(horde.mobs).toHaveLength(FOE_COUNT);
    expect(horde.mobs.some((m) => first.includes(m))).toBe(false);
    expect(sandbox.log.won).toBeNull();
  });

  it('counts a defeat once, and the page starts it again when the character would wake', () => {
    const { traits, player, sandbox } = fight();
    hitPlayer(player, 10_000, 30, 0);
    expect(player.down).toBeGreaterThan(0);
    sandbox.tick(player, traits, 500);
    sandbox.tick(player, traits, 600);
    expect(sandbox.losses).toBe(1);
    expect(sandbox.last?.won).toBe(false);
    sandbox.start(player, traits, 3500);
    expect(player.down).toBe(0);
    expect(player.hp).toBe(traits.maxHp);
  });

  it('counts the blows and the attacks of a fight', () => {
    const { horde, sandbox } = fight();
    const mob = horde.mobs[0]!;
    sandbox.blows([
      { mob, damage: 7, crit: false },
      { mob, damage: 0, crit: false },
    ]);
    sandbox.attacks([
      [mob.id, 0, 5],
      [mob.id, 0, 0],
      [mob.id, 3, 4],
    ]);
    expect(sandbox.log).toMatchObject({ blows: 2, hits: 1, attacks: 2, struck: 1, damage: 5 });
  });

  it('keeps the choice of the panel in the browser, and reads nothing or garbage as the default', () => {
    const storage = memory();
    expect(loadSandbox(storage)).toEqual(DEFAULT_SANDBOX);
    saveSandbox({ foe: 'brute', mechanics: [] }, storage);
    expect(loadSandbox(storage)).toEqual({ foe: 'brute', mechanics: [] });
    storage.setItem('game.sandbox.v1', JSON.stringify({ foe: 'dragon', mechanics: ['flying', 3] }));
    expect(loadSandbox(storage)).toEqual(DEFAULT_SANDBOX);
    storage.setItem('game.sandbox.v1', '{not json');
    expect(loadSandbox(storage)).toEqual(DEFAULT_SANDBOX);
    expect(loadSandbox(null)).toEqual(DEFAULT_SANDBOX);
  });
});
