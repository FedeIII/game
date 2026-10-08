import {
  CHUNK_SIZE,
  Decor,
  Ground,
  emptyChunk,
  fbm,
  inRect,
  naturalDecor,
  naturalGround,
  structureIn,
  type Building,
  type Chunk,
  type Fixture,
  type NpcDef,
  type World,
  type WorldSource,
} from '@game/engine';
import { BOUNDS, HOUSES, NPCS, OUTDOOR, Plot, SPAWN, fixturesByTile, floorOf, plotAt } from './layout.ts';

/** The seed of the forest round the town, and of the variety of its tiles. */
const TOWN_SEED = 4242;

function inBounds(tx: number, ty: number): boolean {
  return tx >= BOUNDS.x0 && tx <= BOUNDS.x1 && ty >= BOUNDS.y0 && ty <= BOUNDS.y1;
}

/**
 * The town of Azyr: a hand-made plan (layout.ts) in the middle of an endless forest. Inside the
 * town: cobbled streets, gardens with flowers and a few trees, eight houses (each with its own
 * floor) and the things of the plaza and the lane. Outside: the engine's natural terrain, with a
 * forest everywhere.
 */
export class TownSource implements WorldSource {
  readonly seed = TOWN_SEED;
  private readonly tiles = fixturesByTile();

  chunk(cx: number, cy: number): Chunk {
    const chunk = emptyChunk(cx, cy);
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const tx = cx * CHUNK_SIZE + lx;
        const ty = cy * CHUNK_SIZE + ly;
        const index = ly * CHUNK_SIZE + lx;
        const house = HOUSES.find((h) => inRect(h, tx, ty));
        if (house) {
          chunk.ground[index] = floorOf(house);
          chunk.structure[index] = structureIn(house, tx, ty);
          continue;
        }
        const outdoor = this.tiles.get(`${tx},${ty}`);
        if (outdoor) chunk.structure[index] = outdoor.code;
        if (!inBounds(tx, ty)) {
          // The forest: trees everywhere (threshold 0), on the engine's natural ground.
          const ground = naturalGround(this.seed, tx, ty);
          chunk.ground[index] = ground;
          chunk.decor[index] = naturalDecor(this.seed, tx, ty, ground, 0);
        } else if (plotAt(tx, ty) === Plot.Street) {
          chunk.ground[index] = Ground.Cobble;
        } else {
          // Gardens: two kinds of grass, with tufts and flowers, and a tree where the plan says.
          const ground = fbm(tx / 9, ty / 9, this.seed, 2) > 0.56 ? Ground.DarkGrass : Ground.Grass;
          chunk.ground[index] = ground;
          const decor = naturalDecor(this.seed, tx, ty, ground, 2);
          chunk.decor[index] = plotAt(tx, ty) === Plot.Tree ? Decor.Tree : decor === Decor.Rock ? Decor.None : decor;
        }
      }
    }
    return chunk;
  }

  buildingAt(tx: number, ty: number): Building | null {
    return HOUSES.find((h) => inRect(h, tx, ty)) ?? null;
  }

  buildingsIn(x0: number, y0: number, x1: number, y1: number): Building[] {
    return HOUSES.filter((h) => h.x1 >= x0 && h.x0 <= x1 && h.y1 >= y0 && h.y0 <= y1);
  }

  fixtureAt(tx: number, ty: number): Fixture | null {
    return this.tiles.get(`${tx},${ty}`)?.fixture ?? null;
  }

  fixturesIn(x0: number, y0: number, x1: number, y1: number): Fixture[] {
    return [...HOUSES.flatMap((h) => h.fixtures), ...OUTDOOR].filter((f) => f.tx >= x0 && f.tx <= x1 && f.ty >= y0 && f.ty <= y1);
  }

  spawn(world: World): { x: number; y: number } {
    return world.findSpawn(SPAWN.tx, SPAWN.ty, 1);
  }

  npcs(): readonly NpcDef[] {
    return NPCS;
  }
}
