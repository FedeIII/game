import { CHUNK_SIZE, Decor, Ground, emptyChunk, inRect, structureIn, type Building, type Fixture, type LootTable, type MobRules, type WorldSource } from '../src/index.ts';

/**
 * A small world from a text map, for engine tests: '.' grass, 'T' tree, 'R' rock, '~' water,
 * ',' shallow water.
 * Row 0 is ty = 0 and column 0 is tx = 0; outside the map is grass.
 */
export function textSource(rows: readonly string[]): WorldSource {
  const at = (tx: number, ty: number) => rows[ty]?.[tx] ?? '.';
  return {
    seed: 1,
    chunk(cx, cy) {
      const chunk = emptyChunk(cx, cy);
      for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
          const ch = at(cx * CHUNK_SIZE + lx, cy * CHUNK_SIZE + ly);
          chunk.ground[ly * CHUNK_SIZE + lx] = ch === '~' ? Ground.Water : ch === ',' ? Ground.Shallows : Ground.Grass;
          chunk.decor[ly * CHUNK_SIZE + lx] = ch === 'T' ? Decor.Tree : ch === 'R' ? Decor.Rock : Decor.None;
        }
      }
      return chunk;
    },
    buildingAt: () => null,
    buildingsIn: () => [],
    fixtureAt: () => null,
    fixturesIn: () => [],
    spawn: (world) => world.findSpawn(),
  };
}

/**
 * Grass with one small house: walls x 2..8, y 2..6, the door at (5, 6). For door and
 * multiplayer tests. The spawn is south of the door.
 */
export function houseSource(extra: Partial<Building> = {}): WorldSource {
  const house: Building = { id: 'house', x0: 2, y0: 2, x1: 8, y1: 6, doorX: 5, fixtures: [], ...extra };
  return {
    seed: 1,
    chunk(cx, cy) {
      const chunk = emptyChunk(cx, cy);
      for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
          const tx = cx * CHUNK_SIZE + lx;
          const ty = cy * CHUNK_SIZE + ly;
          const i = ly * CHUNK_SIZE + lx;
          chunk.ground[i] = Ground.Grass;
          if (inRect(house, tx, ty)) {
            chunk.ground[i] = Ground.Floor;
            chunk.structure[i] = structureIn(house, tx, ty);
          }
        }
      }
      return chunk;
    },
    buildingAt: (tx, ty) => (inRect(house, tx, ty) ? house : null),
    buildingsIn: () => [house],
    fixtureAt: (tx, ty) => house.fixtures.find((f) => f.tx === tx && f.ty === ty) ?? null,
    fixturesIn: () => [...house.fixtures],
    spawn: (world) => world.findSpawn(5, 9, 1),
  };
}

/** The chest of lootHouseSource(), on the tile north of the door, against the corridor. */
export const LOOT_CHEST: Fixture = { kind: 'chest', tx: 4, ty: 4 };
/** What that chest gives: 3 coins and a ring. */
export const CHEST_LOOT: LootTable = { coins: [3, 3], items: [{ chance: 1, pick: [['ring', 1]] }] };

/** The house world with a chest that gives CHEST_LOOT; `barred`: the door has boards (STR 13). */
export function lootHouseSource(barred = false): WorldSource {
  const source = houseSource({ fixtures: [LOOT_CHEST], ...(barred ? { barred: { ability: 'str', min: 13 } } : {}) });
  return { ...source, loot: (fixture) => (fixture.kind === 'chest' ? CHEST_LOOT : null) };
}

/** The house world with mobs: they may go anywhere outside the house; none come by themselves. */
export function mobHouseSource(population: MobRules['population'] = { imp: 0, brute: 0 }): WorldSource {
  return { ...houseSource(), mobs: () => ({ roam: () => true, hunt: () => true, population }) };
}
