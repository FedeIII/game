import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE, Decor, Ground, World } from '@game/engine';
import { DEFAULT_SEED, WildsSource } from '../src/index.ts';

const newWorld = (seed: number) => new World(new WildsSource(seed));
const generateChunk = (seed: number, cx: number, cy: number) => new WildsSource(seed).chunk(cx, cy);

describe('world generation', () => {
  it('gives the same chunk for the same seed and coordinates', () => {
    const a = generateChunk(DEFAULT_SEED, 3, -2);
    const b = generateChunk(DEFAULT_SEED, 3, -2);
    expect(a.ground).toEqual(b.ground);
    expect(a.decor).toEqual(b.decor);
  });

  it('gives a different world for a different seed', () => {
    const a = generateChunk(1, 0, 0);
    const b = generateChunk(2, 0, 0);
    expect(a.ground).not.toEqual(b.ground);
  });

  it('finds tiles at negative coordinates in the correct chunk', () => {
    const world = newWorld(DEFAULT_SEED);
    const chunk = generateChunk(DEFAULT_SEED, -1, -1);
    const last = CHUNK_SIZE - 1;
    expect(world.ground(-1, -1)).toBe(chunk.ground[last * CHUNK_SIZE + last]);
    expect(world.decor(-CHUNK_SIZE, -1)).toBe(chunk.decor[last * CHUNK_SIZE]);
  });

  it('makes every ground type and never puts two trees next to each other', () => {
    const world = newWorld(DEFAULT_SEED);
    const seen = new Set<number>();
    let trees = 0;
    for (let ty = -100; ty < 100; ty++) {
      for (let tx = -100; tx < 100; tx++) {
        seen.add(world.ground(tx, ty));
        if (world.decor(tx, ty) !== Decor.Tree) continue;
        trees++;
        for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]] as const) {
          expect(world.decor(tx + dx, ty + dy), `tree at ${tx},${ty}`).not.toBe(Decor.Tree);
        }
      }
    }
    // Every ground: the cobblestones and the stone floors are in the town of Thornwick.
    expect([...seen].sort()).toEqual(Object.values(Ground).sort());
    expect(trees).toBeGreaterThan(100);
  });

  it('never puts decor on water', () => {
    const world = newWorld(DEFAULT_SEED);
    for (let ty = -64; ty < 64; ty++) {
      for (let tx = -64; tx < 64; tx++) {
        if (world.ground(tx, ty) === Ground.Water) expect(world.decor(tx, ty)).toBe(Decor.None);
      }
    }
  });

  it('spawns on an open tile with open tiles all around it', () => {
    for (const seed of [DEFAULT_SEED, 1, 42, 99_999]) {
      const world = newWorld(seed);
      const spawn = world.findSpawn();
      const tx = Math.floor(spawn.x / 16);
      const ty = Math.floor(spawn.y / 16);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) expect(world.solidBox(tx + dx, ty + dy)).toBeNull();
      }
    }
  });

  it('forgets chunks outside a range', () => {
    const world = newWorld(DEFAULT_SEED);
    world.chunk(0, 0);
    world.chunk(5, 5);
    world.forgetChunksOutside(-1, -1, 1, 1);
    expect(world.chunkCount).toBe(1);
  });
});
