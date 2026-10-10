import { describe, expect, it } from 'vitest';
import { Decor, Ground, TILE_SIZE, World, checkDialog, createPlayer, findInteraction, fixtureTiles, type Dialog } from '@game/engine';
import { APOTHECARY, BUILDING_CELL, DEFAULT_SEED, INNKEEPER, INSIGHT_GATE, REEVE, TOWN, TOWN_BUILDINGS, TOWN_CACHE, TOWN_GATE, WATCHMAN, WildsSource } from '../src/index.ts';

const SEEDS = [DEFAULT_SEED, 1, 7, 42, 1234];
const key = (x: number, y: number) => `${x},${y}`;

/** The tiles that a player can walk to from (sx, sy) within `radius` tiles of it. */
function reachable(w: World, sx: number, sy: number, radius: number): Set<string> {
  const seen = new Set<string>();
  const queue: [number, number][] = [[sx, sy]];
  while (queue.length) {
    const [x, y] = queue.pop()!;
    if (Math.abs(x - sx) > radius || Math.abs(y - sy) > radius || seen.has(key(x, y)) || w.solidBox(x, y)) continue;
    seen.add(key(x, y));
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return seen;
}

describe('the herbs of the wilds', () => {
  it('grow in most cells, hidden, on open grass away from houses, the road and the town', () => {
    for (const seed of SEEDS) {
      const source = new WildsSource(seed);
      const world = new World(source);
      let patches = 0;
      for (let cy = -5; cy <= 5; cy++) {
        for (let cx = -5; cx <= 5; cx++) {
          const patch = source.herbs(cx, cy);
          if (!patch) continue;
          patches++;
          const where = `seed ${seed}, cell ${cx},${cy}`;
          expect(patch.kind).toBe('herbpatch');
          expect(patch.hidden).toBe(true);
          expect(Math.floor(patch.tx / BUILDING_CELL)).toBe(cx);
          expect(Math.floor(patch.ty / BUILDING_CELL)).toBe(cy);
          expect(world.fixtureAt(patch.tx, patch.ty), where).toBe(patch);
          expect(world.fixturesIn(patch.tx, patch.ty, patch.tx, patch.ty)).toContain(patch);
          expect(world.structure(patch.tx, patch.ty)).toBe(fixtureTiles(patch)[0]![2]);
          expect([Ground.Grass, Ground.DarkGrass]).toContain(world.ground(patch.tx, patch.ty));
          expect(world.decor(patch.tx, patch.ty)).toBe(Decor.None);
          expect(world.solidBox(patch.tx, patch.ty)).toBeNull();
          // Not in or near the town, a house or the road.
          expect(patch.tx < TOWN.x0 - 4 || patch.tx > TOWN.x1 + 4 || patch.ty < TOWN.y0 - 4 || patch.ty > TOWN.y1 + 4, where).toBe(true);
          for (const house of source.buildingsIn(patch.tx - 12, patch.ty - 12, patch.tx + 12, patch.ty + 12)) {
            const near = patch.tx >= house.x0 - 2 && patch.tx <= house.x1 + 2 && patch.ty >= house.y0 - 2 && patch.ty <= house.y1 + 4;
            expect(near, where).toBe(false);
          }
          expect(source.road.clear(patch.tx, patch.ty), where).toBe(false);
          // A player can walk to it from away: open ground leads out from it.
          const area = reachable(world, patch.tx, patch.ty, 6);
          expect([...area].some((k) => k.split(',').map(Number).some((v, i) => Math.abs(v - (i === 0 ? patch.tx : patch.ty)) === 6)), where).toBe(true);
          // It gives a bundle of herbs, and grows again after 20 minutes.
          expect(source.loot(patch)).toEqual({ items: [{ chance: 1, pick: [['herbs', 1]] }], refillMs: 20 * 60_000 });
        }
      }
      expect(patches, `seed ${seed}`).toBeGreaterThan(121 * 0.6);
    }
  });

  it('are a target for the action button next to them', () => {
    const source = new WildsSource(DEFAULT_SEED);
    const world = new World(source);
    const patch = [1, 2, 3, 4].map((c) => source.herbs(c, 2)).find((p) => p !== null)!;
    const p = createPlayer(patch.tx * TILE_SIZE + 8, (patch.ty - 1) * TILE_SIZE + 12);
    p.facing = 'down';
    expect(findInteraction(world, p, (_kind, fixture) => fixture !== null && source.loot(fixture) !== null)?.fixture).toBe(patch);
  });
});

describe('the buried cache of Thornwick', () => {
  const source = new WildsSource(DEFAULT_SEED);
  const world = new World(source);

  it('lies hidden in the garden across the lane from the cottage, and gives the savings', () => {
    const cottage = TOWN_BUILDINGS.find((b) => b.id === 'cottage')!;
    expect(TOWN_CACHE.hidden).toBe(true);
    expect(world.fixtureAt(TOWN_CACHE.tx, TOWN_CACHE.ty)).toBe(TOWN_CACHE);
    expect(world.solidBox(TOWN_CACHE.tx, TOWN_CACHE.ty)).toBeNull();
    // South of the cottage's door, past the lane, a few steps to the west, in a garden.
    expect(TOWN_CACHE.ty).toBeGreaterThan(cottage.y1 + 2);
    expect(cottage.doorX - TOWN_CACHE.tx).toBeGreaterThanOrEqual(2);
    expect(cottage.doorX - TOWN_CACHE.tx).toBeLessThanOrEqual(5);
    expect([Ground.Grass, Ground.DarkGrass]).toContain(world.ground(TOWN_CACHE.tx, TOWN_CACHE.ty));
    expect(world.decor(TOWN_CACHE.tx, TOWN_CACHE.ty)).toBe(Decor.None);
    // Not in front of any door.
    for (const b of TOWN_BUILDINGS) expect(Math.abs(TOWN_CACHE.tx - b.doorX) <= 2 && TOWN_CACHE.ty > b.y1 && TOWN_CACHE.ty <= b.y1 + 3, b.id).toBe(false);
    const loot = source.loot(TOWN_CACHE)!;
    expect(loot.coins).toEqual([8, 20]);
    expect(loot.items![0]).toEqual({ chance: 1, pick: [['ring', 1]] });
  });

  it('can be reached from the gate', () => {
    const area = reachable(world, TOWN_GATE.tx, TOWN_GATE.ty, 60);
    expect(area.has(key(TOWN_CACHE.tx, TOWN_CACHE.ty))).toBe(true);
  });
});

describe('insight in the conversations of Thornwick', () => {
  const insight = (dialog: Dialog) => Object.values(dialog.nodes).flatMap((n) => n.answers.filter((a) => a.gate === INSIGHT_GATE));

  it('gives each of the four people one answer behind WIS 13', () => {
    expect(INSIGHT_GATE).toEqual({ ability: 'wis', min: 13 });
    for (const dialog of [WATCHMAN, INNKEEPER, APOTHECARY, REEVE]) {
      expect(insight(dialog), dialog.name).toHaveLength(1);
      expect(checkDialog(dialog), dialog.name).toEqual([]);
    }
  });

  it('lets the reeve tell where the cache is, and the apothecary that herbs grow in the woods', () => {
    const [reeve] = insight(REEVE);
    expect(REEVE.nodes[reeve!.next!]!.say).toContain('across the lane from their door');
    const [apothecary] = insight(APOTHECARY);
    expect(APOTHECARY.nodes[apothecary!.next!]!.say).toContain('between the trees');
  });
});
