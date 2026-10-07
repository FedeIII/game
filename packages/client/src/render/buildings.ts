import { Container, Sprite, type Texture } from 'pixi.js';
import { BUILDING_CELL, Structure, TILE_SIZE, hash2, type Building, type FurnitureKind, type World } from '@game/shared';
import type { Art } from '../assets.ts';
import type { Rect } from './camera.ts';

/** How opaque the front wall is while the player is inside: enough to see the room behind it. */
const FRONT_WALL_INSIDE_ALPHA = 0.35;
/** How fast the roof and the front wall fade (per second, as a fraction of what remains). */
const FADE_RATE = 10;
/** Wall tops are drawn 32 pixels above the ground; the roof sits on them. */
const WALL_HEIGHT = 32;
const LOOK_SEED = 0x6b1d;

/**
 * The depth line of each piece of furniture: the middle of its footprint, in pixels below the
 * top of its anchor tile. It sorts the piece against the player.
 */
const FURNITURE_DEPTH: Record<FurnitureKind, number> = { bookshelf: 3, table: 8, bed: 0, chest: 8.5, barrel: 8 };

interface BuildingView {
  readonly building: Building;
  readonly sprites: Sprite[];
  /** The south wall, door included: it fades while the player is inside. */
  readonly frontWall: Sprite[];
  readonly door: Sprite;
  readonly roof: Container;
  alpha: number;
}

/**
 * Shows the buildings near the camera: walls, the door, furniture and the roof, all in the
 * depth-sorted entity layer. While the player is inside a building, its roof fades out and its
 * front wall fades to FRONT_WALL_INSIDE_ALPHA.
 */
export class Buildings {
  private readonly world: World;
  private readonly art: Art;
  private readonly layer: Container;
  private readonly views = new Map<string, BuildingView>();
  private readonly wallVariants = new Map<number, Texture[]>();
  private readonly roofVariants = new Map<string, Texture[]>();

  constructor(world: World, art: Art, entityLayer: Container) {
    this.world = world;
    this.art = art;
    this.layer = entityLayer;
  }

  /** Makes the buildings near the view, removes far ones, and fades roofs and front walls. */
  update(view: Rect, inside: Building | null, seconds: number): void {
    const margin = BUILDING_CELL * TILE_SIZE;
    const minX = Math.floor((view.x - margin) / (BUILDING_CELL * TILE_SIZE));
    const maxX = Math.floor((view.x + view.width + margin) / (BUILDING_CELL * TILE_SIZE));
    const minY = Math.floor((view.y - margin) / (BUILDING_CELL * TILE_SIZE));
    const maxY = Math.floor((view.y + view.height + margin) / (BUILDING_CELL * TILE_SIZE));
    for (const [id, built] of this.views) {
      const [cx, cy] = id.split(',').map(Number) as [number, number];
      if (cx < minX - 1 || cx > maxX + 1 || cy < minY - 1 || cy > maxY + 1) {
        for (const sprite of built.sprites) sprite.destroy();
        built.roof.destroy({ children: true });
        this.views.delete(id);
      }
    }
    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        const building = this.world.building(cx, cy);
        if (building && !this.views.has(building.id)) this.views.set(building.id, this.make(building));
      }
    }

    const step = Math.min(1, seconds * FADE_RATE);
    for (const built of this.views.values()) {
      const target = built.building === inside ? 0 : 1;
      built.alpha += (target - built.alpha) * step;
      if (Math.abs(target - built.alpha) < 0.01) built.alpha = target;
      built.roof.alpha = built.alpha;
      built.roof.visible = built.alpha > 0;
      const front = FRONT_WALL_INSIDE_ALPHA + (1 - FRONT_WALL_INSIDE_ALPHA) * built.alpha;
      for (const sprite of built.frontWall) sprite.alpha = front;
    }
  }

  /** Shows the door on (tx, ty) open or closed, after a change of its state. */
  refreshDoor(tx: number, ty: number): void {
    const building = this.world.buildingAt(tx, ty);
    const built = building && this.views.get(building.id);
    if (built) built.door.texture = this.doorTexture(tx, ty);
  }

  private doorTexture(tx: number, ty: number): Texture {
    return this.art.frame(this.world.isDoorOpen(tx, ty) ? 'wall/door/open' : 'wall/door/closed');
  }

  private wallTexture(tx: number, ty: number): Texture {
    const solid = (x: number, y: number) => {
      const s = this.world.structure(x, y);
      return s === Structure.Wall || s === Structure.Door;
    };
    const mask = (solid(tx, ty - 1) ? 1 : 0) | (solid(tx + 1, ty) ? 2 : 0) | (solid(tx - 1, ty) ? 4 : 0);
    let variants = this.wallVariants.get(mask);
    if (!variants) {
      variants = this.art.variants(`wall/${mask}`);
      this.wallVariants.set(mask, variants);
    }
    return variants[hash2(tx, ty, LOOK_SEED) % variants.length]!;
  }

  private roofTexture(row: string, column: string, tx: number, ty: number): Texture {
    const key = `${row}/${column}`;
    let variants = this.roofVariants.get(key);
    if (!variants) {
      variants = this.art.variants(`roof/${key}`);
      this.roofVariants.set(key, variants);
    }
    return variants[hash2(tx, ty, LOOK_SEED + 1) % variants.length]!;
  }

  private make(building: Building): BuildingView {
    const { x0, y0, x1, y1, doorX } = building;
    const sprites: Sprite[] = [];
    const frontWall: Sprite[] = [];
    let door: Sprite | null = null;
    // Walls stand on their tile's south-west corner and sort by the tile's middle line.
    const place = (sprite: Sprite, tx: number, ty: number, depth: number): Sprite => {
      sprite.position.set(tx * TILE_SIZE, (ty + 1) * TILE_SIZE);
      sprite.zIndex = ty * TILE_SIZE + depth;
      this.layer.addChild(sprite);
      sprites.push(sprite);
      return sprite;
    };
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (tx !== x0 && tx !== x1 && ty !== y0 && ty !== y1) continue;
        const isDoor = tx === doorX && ty === y1;
        const sprite = place(new Sprite(isDoor ? this.doorTexture(tx, ty) : this.wallTexture(tx, ty)), tx, ty, 8);
        if (ty === y1) frontWall.push(sprite);
        if (isDoor) door = sprite;
      }
    }
    for (const item of building.furniture) place(new Sprite(this.art.frame(`furniture/${item.kind}`)), item.tx, item.ty, FURNITURE_DEPTH[item.kind]);

    // The roof sits on the wall tops: rows of slate tiles from the north eave to the south eave.
    // Seen from the south, the back slope shows above the ridge and the front slope below it.
    const roof = new Container();
    const rows = y1 - y0 + 1;
    const ridge = Math.max(1, Math.round(rows / 2 - 1));
    for (let r = 0; r < rows; r++) {
      const row = r === 0 ? 'top' : r < ridge ? 'back' : r === ridge ? 'ridge' : r === rows - 1 ? 'eave' : 'front';
      for (let tx = x0; tx <= x1; tx++) {
        const column = tx === x0 ? 'l' : tx === x1 ? 'r' : 'm';
        const tile = new Sprite(this.roofTexture(row, column, tx, y0 + r));
        tile.position.set(tx * TILE_SIZE, (y0 + r) * TILE_SIZE - WALL_HEIGHT);
        roof.addChild(tile);
      }
    }
    for (let tx = x0; tx <= x1; tx++) {
      const shadow = new Sprite(this.art.frame('roof/shadow'));
      shadow.position.set(tx * TILE_SIZE, (y1 + 1) * TILE_SIZE - WALL_HEIGHT);
      roof.addChild(shadow);
    }
    // Just in front of the south wall: above everything in the building, below what stands south of it.
    roof.zIndex = y1 * TILE_SIZE + 8.5;
    this.layer.addChild(roof);

    if (!door) throw new Error(`building ${building.id} has no door`);
    return { building, sprites, frontWall, door, roof, alpha: 1 };
  }
}
