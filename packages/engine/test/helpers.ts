import { CHUNK_SIZE, Decor, Ground, emptyChunk, type WorldSource } from '../src/index.ts';

/**
 * A small world from a text map, for engine tests: '.' grass, 'T' tree, 'R' rock, '~' water.
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
          chunk.ground[ly * CHUNK_SIZE + lx] = ch === '~' ? Ground.Water : Ground.Grass;
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
