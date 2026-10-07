import { Container, RenderTexture, Sprite, type Renderer, type Texture } from 'pixi.js';
import { CHUNK_PIXELS, CHUNK_SIZE, Decor, Ground, TILE_SIZE, hash2, type World } from '@game/shared';
import type { Art } from '../assets.ts';
import type { Rect } from './camera.ts';

const GROUND_NAME: Record<Ground, string> = {
  [Ground.Water]: 'water',
  [Ground.Sand]: 'sand',
  [Ground.Dirt]: 'dirt',
  [Ground.Grass]: 'grass',
  [Ground.DarkGrass]: 'darkgrass',
};

/** A ground type with a higher order draws its edge over a neighbour with a lower order. */
const BLEND_ORDER: Record<Ground, number> = {
  [Ground.Water]: 0,
  [Ground.Sand]: 1,
  [Ground.Dirt]: 2,
  [Ground.Grass]: 3,
  [Ground.DarkGrass]: 4,
};

/**
 * Trees and rocks stand on the centre of the solid box of their tile (see solidBox() in the
 * shared world), in tile-local pixels. This point is also their depth for the sort.
 */
const PROP_FOOT = { tree: { x: 8, y: 13 }, rock: { x: 8, y: 11 } } as const;

/** One in this many stone tiles shows bones instead. */
const BONES_ONE_IN = 6;

// Neighbour offsets for the edge pieces: the four sides, then the four corners.
const SIDES = [
  { name: 'n', dx: 0, dy: -1 },
  { name: 'e', dx: 1, dy: 0 },
  { name: 's', dx: 0, dy: 1 },
  { name: 'w', dx: -1, dy: 0 },
] as const;
const CORNERS = [
  { name: 'nw', dx: -1, dy: -1 },
  { name: 'ne', dx: 1, dy: -1 },
  { name: 'se', dx: 1, dy: 1 },
  { name: 'sw', dx: -1, dy: 1 },
] as const;

/** A seed for the random choices of the renderer (variants and flips). They are visual only. */
const LOOK_SEED = 0x5eed;

interface ChunkView {
  readonly ground: Sprite;
  readonly texture: RenderTexture;
  readonly props: Sprite[];
}

/**
 * Shows the world around the camera. Each chunk of ground tiles, edges and flat decor is
 * drawn once into its own texture, so a frame draws one sprite for each chunk instead of
 * thousands of tile sprites. Trees and rocks are separate sprites in the entity layer,
 * because they must sort with the player by depth.
 */
export class Terrain {
  private readonly renderer: Renderer;
  private readonly world: World;
  private readonly art: Art;
  private readonly groundLayer: Container;
  private readonly entityLayer: Container;
  private readonly views = new Map<string, ChunkView>();
  /** The container and sprite pool that chunk drawing reuses. */
  private readonly scratch = new Container();
  private readonly pool: Sprite[] = [];
  private readonly textures: {
    readonly ground: Record<Ground, Texture[]>;
    readonly tufts: Texture[];
    readonly flowers: Texture[];
    readonly stones: Texture[];
    readonly bones: Texture[];
    readonly trees: Texture[];
    readonly rocks: Texture[];
  };

  constructor(renderer: Renderer, world: World, art: Art, groundLayer: Container, entityLayer: Container) {
    this.renderer = renderer;
    this.world = world;
    this.art = art;
    this.groundLayer = groundLayer;
    this.entityLayer = entityLayer;
    const ground = {} as Record<Ground, Texture[]>;
    for (const g of Object.values(Ground)) ground[g] = art.variants(`ground/${GROUND_NAME[g]}`);
    this.textures = {
      ground,
      tufts: art.variants('decor/tuft'),
      flowers: art.variants('decor/flowers'),
      stones: art.variants('decor/stones'),
      bones: art.variants('decor/bones'),
      trees: art.variants('prop/tree'),
      rocks: art.variants('prop/rock'),
    };
  }

  get chunkCount(): number {
    return this.views.size;
  }

  /**
   * Makes the chunks that touch the view (with a margin) and removes the far chunks. It makes
   * at most `budget` new chunks, nearest first, so a fast camera does not stall a frame.
   */
  update(view: Rect, budget: number): void {
    const margin = CHUNK_PIXELS / 2;
    const minCx = Math.floor((view.x - margin) / CHUNK_PIXELS);
    const minCy = Math.floor((view.y - margin) / CHUNK_PIXELS);
    const maxCx = Math.floor((view.x + view.width + margin) / CHUNK_PIXELS);
    const maxCy = Math.floor((view.y + view.height + margin) / CHUNK_PIXELS);

    // Keep one more ring than necessary, so a player who walks to and fro on a chunk border
    // does not make the same chunk again and again.
    for (const [key, chunk] of this.views) {
      const [cx, cy] = key.split(',').map(Number) as [number, number];
      if (cx < minCx - 1 || cx > maxCx + 1 || cy < minCy - 1 || cy > maxCy + 1) {
        chunk.ground.destroy();
        chunk.texture.destroy(true);
        for (const prop of chunk.props) prop.destroy();
        this.views.delete(key);
      }
    }
    this.world.forgetChunksOutside(minCx - 2, minCy - 2, maxCx + 2, maxCy + 2);

    const missing: { cx: number; cy: number; distance: number }[] = [];
    const centreX = (view.x + view.width / 2) / CHUNK_PIXELS - 0.5;
    const centreY = (view.y + view.height / 2) / CHUNK_PIXELS - 0.5;
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        if (!this.views.has(`${cx},${cy}`)) missing.push({ cx, cy, distance: Math.hypot(cx - centreX, cy - centreY) });
      }
    }
    missing.sort((a, b) => a.distance - b.distance);
    for (const { cx, cy } of missing.slice(0, budget)) this.views.set(`${cx},${cy}`, this.makeChunk(cx, cy));
  }

  private makeChunk(cx: number, cy: number): ChunkView {
    let used = 0;
    const put = (texture: Texture, x: number, y: number, flip = false): void => {
      let sprite = this.pool[used];
      if (!sprite) {
        sprite = new Sprite();
        this.pool.push(sprite);
        this.scratch.addChild(sprite);
      }
      sprite.texture = texture;
      sprite.visible = true;
      sprite.scale.x = flip ? -1 : 1;
      sprite.position.set(flip ? x + TILE_SIZE : x, y);
      used++;
    };

    const props: Sprite[] = [];
    const world = this.world;
    const textures = this.textures;
    const pick = (list: Texture[], look: number): Texture => list[look % list.length]!;
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const tx = cx * CHUNK_SIZE + lx;
        const ty = cy * CHUNK_SIZE + ly;
        const px = lx * TILE_SIZE;
        const py = ly * TILE_SIZE;
        const ground = world.ground(tx, ty);
        const look = hash2(tx, ty, LOOK_SEED);

        put(pick(textures.ground[ground], look), px, py);
        this.putEdges(put, tx, ty, ground, px, py);

        const decor = world.decor(tx, ty);
        const flip = ((look >>> 8) & 1) === 1;
        const look2 = look >>> 9;
        if (decor === Decor.Tuft) put(pick(textures.tufts, look2), px, py, flip);
        else if (decor === Decor.Flowers) put(pick(textures.flowers, look2), px, py, flip);
        else if (decor === Decor.Pebbles) {
          put(look2 % BONES_ONE_IN === 0 ? pick(textures.bones, look2 >>> 4) : pick(textures.stones, look2 >>> 4), px, py, flip);
        } else if (decor === Decor.Tree || decor === Decor.Rock) {
          const tree = decor === Decor.Tree;
          const foot = tree ? PROP_FOOT.tree : PROP_FOOT.rock;
          const prop = new Sprite(pick(tree ? textures.trees : textures.rocks, look2));
          prop.position.set(tx * TILE_SIZE + foot.x, ty * TILE_SIZE + foot.y);
          // No mirror: the light in the prop art comes from the top left.
          prop.zIndex = prop.position.y;
          this.entityLayer.addChild(prop);
          props.push(prop);
        }
      }
    }
    for (let i = used; i < this.pool.length; i++) this.pool[i]!.visible = false;

    const texture = RenderTexture.create({
      width: CHUNK_PIXELS,
      height: CHUNK_PIXELS,
      resolution: 1,
      scaleMode: 'nearest',
      antialias: false,
    });
    this.renderer.render({ container: this.scratch, target: texture, clear: true });
    const ground = new Sprite(texture);
    ground.position.set(cx * CHUNK_PIXELS, cy * CHUNK_PIXELS);
    this.groundLayer.addChild(ground);
    return { ground, texture, props };
  }

  /** Draws the edges of each neighbour that has a higher blend order, lowest order first. */
  private putEdges(
    put: (texture: Texture, x: number, y: number) => void,
    tx: number,
    ty: number,
    ground: Ground,
    px: number,
    py: number,
  ): void {
    const world = this.world;
    const own = BLEND_ORDER[ground];
    const side = SIDES.map((s) => world.ground(tx + s.dx, ty + s.dy));
    const corner = CORNERS.map((c) => world.ground(tx + c.dx, ty + c.dy));
    const higher = new Set<Ground>();
    for (const g of [...side, ...corner]) if (BLEND_ORDER[g] > own) higher.add(g);
    if (higher.size === 0) return;

    for (const g of [...higher].sort((a, b) => BLEND_ORDER[a] - BLEND_ORDER[b])) {
      const name = GROUND_NAME[g];
      SIDES.forEach((s, i) => {
        if (side[i] === g) put(this.art.frame(`edge/${name}/${s.name}`), px, py);
      });
      // A corner piece is only necessary when neither side next to the corner has this edge.
      CORNERS.forEach((c, i) => {
        const beside = [side[i]!, side[(i + 3) % 4]!];
        if (corner[i] === g && beside[0] !== g && beside[1] !== g) put(this.art.frame(`edge/${name}/${c.name}`), px, py);
      });
    }
  }
}
