import { Container, NineSliceSprite, Sprite, type Texture } from 'pixi.js';
import { DEFAULT_STYLE, Structure, TILE_SIZE, hash2, type Building, type World } from '@game/engine';
import type { Art } from '../assets.ts';
import type { Rect } from './camera.ts';
import type { LightSource } from './lighting.ts';
import type { PixelFont } from './pixel-text.ts';

/** How opaque the front wall is while the player is inside: enough to see the room behind it. */
const FRONT_WALL_INSIDE_ALPHA = 0.35;
/** How fast the roof and the front wall fade (per second, as a fraction of what remains). */
const FADE_RATE = 10;
/** Wall tops are drawn 32 pixels above the ground; the roof sits on them. */
const WALL_HEIGHT = 32;
/** The ridge line of a roof: this many pixels below the top of its ridge row. */
const RIDGE_LINE = 8;
/** The bottom of a sign: this many pixels above the ground, just over the arch of the door. */
const SIGN_BOTTOM = 25;
/** Look further than the screen for buildings, so a big one appears before its edge does. */
const MARGIN_TILES = 16;
const LOOK_SEED = 0x6b1d;
/** The sign text colour: the parchment of the GUI theme. */
const INK = 0xd8ccb0;
/** A lit window throws a little warm light onto the street. */
const WINDOW_LIGHT = { radius: 48, colour: 0xffa850, y: -17 } as const;

interface BuildingView {
  readonly building: Building;
  readonly sprites: Sprite[];
  /** The south wall, door included: it fades while the player is inside. */
  readonly front: Container[];
  /** The sign hangs outside the front wall: it goes away while the player is inside. */
  readonly sign: Container | null;
  readonly door: Sprite;
  /** The door state that the door sprite shows. */
  doorOpen: boolean;
  readonly roof: Container;
  alpha: number;
}

/**
 * Shows the buildings near the camera: walls, the door, the roof and the sign. Walls and the door
 * are in the depth-sorted entity layer; the sign is text, so it goes in the text layer (its own
 * CRT settings, above the darkness). Fixtures inside buildings are drawn by Fixtures. While the
 * player is inside a building, its roof and its sign fade out and its front wall fades to
 * FRONT_WALL_INSIDE_ALPHA.
 */
export class Buildings {
  private readonly world: World;
  private readonly art: Art;
  private readonly layer: Container;
  private readonly textLayer: Container;
  private readonly font: PixelFont;
  private readonly views = new Map<string, BuildingView>();
  private readonly wallVariants = new Map<string, Texture[]>();
  private readonly roofVariants = new Map<string, Texture[]>();

  constructor(world: World, art: Art, entityLayer: Container, textLayer: Container, font: PixelFont) {
    this.world = world;
    this.art = art;
    this.layer = entityLayer;
    this.textLayer = textLayer;
    this.font = font;
  }

  /** Makes the buildings near the view, removes far ones, and fades roofs and fronts. */
  update(view: Rect, inside: Building | null, seconds: number): void {
    const x0 = Math.floor(view.x / TILE_SIZE) - MARGIN_TILES;
    const y0 = Math.floor(view.y / TILE_SIZE) - MARGIN_TILES;
    const x1 = Math.ceil((view.x + view.width) / TILE_SIZE) + MARGIN_TILES;
    const y1 = Math.ceil((view.y + view.height) / TILE_SIZE) + MARGIN_TILES;
    const near = new Set<string>();
    for (const building of this.world.buildingsIn(x0, y0, x1, y1)) {
      near.add(building.id);
      if (!this.views.has(building.id)) this.views.set(building.id, this.make(building));
    }
    // Keep a building a little longer than necessary: no rebuild when the player walks to and fro.
    for (const [id, built] of this.views) {
      const b = built.building;
      const far = b.x1 < x0 - MARGIN_TILES || b.x0 > x1 + MARGIN_TILES || b.y1 < y0 - MARGIN_TILES || b.y0 > y1 + MARGIN_TILES;
      if (!near.has(id) && far) {
        for (const sprite of built.sprites) sprite.destroy();
        built.sign?.destroy({ children: true });
        built.roof.destroy({ children: true });
        this.views.delete(id);
      }
    }

    const step = Math.min(1, seconds * FADE_RATE);
    for (const built of this.views.values()) {
      // A door can change without this client: another visitor, an NPC, the server.
      const open = this.world.isDoorOpen(built.building.doorX, built.building.y1);
      if (open !== built.doorOpen) this.refreshDoor(built.building.doorX, built.building.y1);
      const target = built.building === inside ? 0 : 1;
      built.alpha += (target - built.alpha) * step;
      if (Math.abs(target - built.alpha) < 0.01) built.alpha = target;
      built.roof.alpha = built.alpha;
      built.roof.visible = built.alpha > 0;
      const front = FRONT_WALL_INSIDE_ALPHA + (1 - FRONT_WALL_INSIDE_ALPHA) * built.alpha;
      for (const item of built.front) item.alpha = front;
      if (built.sign) {
        built.sign.alpha = built.alpha;
        built.sign.visible = built.alpha > 0;
      }
    }
  }

  /** Shows the door on (tx, ty) open or closed, after a change of its state. */
  refreshDoor(tx: number, ty: number): void {
    const building = this.world.buildingAt(tx, ty);
    const built = building && this.views.get(building.id);
    if (!built) return;
    built.door.texture = this.doorTexture(built.building, tx, ty);
    built.doorOpen = this.world.isDoorOpen(tx, ty);
  }

  /** The lights of the lit windows of the buildings that are shown, in world pixels. */
  lights(): LightSource[] {
    const out: LightSource[] = [];
    for (const { building } of this.views.values()) {
      for (const tx of building.windows ?? []) {
        out.push({
          x: tx * TILE_SIZE + TILE_SIZE / 2,
          y: (building.y1 + 1) * TILE_SIZE + WINDOW_LIGHT.y,
          radius: WINDOW_LIGHT.radius,
          colour: WINDOW_LIGHT.colour,
          flicker: true,
          seed: tx * 7 + building.y1,
        });
      }
    }
    return out;
  }

  /** The door open, closed, or boarded up (a building that is shut for good). */
  private doorTexture(building: Building, tx: number, ty: number): Texture {
    const walls = (building.style ?? DEFAULT_STYLE).walls;
    const state = building.locked !== undefined ? 'boarded' : this.world.isDoorOpen(tx, ty) ? 'open' : 'closed';
    return this.art.frame(`wall/${walls}/door/${state}`);
  }

  private wallTexture(building: Building, tx: number, ty: number): Texture {
    const walls = (building.style ?? DEFAULT_STYLE).walls;
    if (this.world.structure(tx, ty) === Structure.Window) return this.art.frame(`wall/${walls}/window`);
    const solid = (x: number, y: number) => {
      const s = this.world.structure(x, y);
      return s === Structure.Wall || s === Structure.Door || s === Structure.Window;
    };
    const mask = (solid(tx, ty - 1) ? 1 : 0) | (solid(tx + 1, ty) ? 2 : 0) | (solid(tx - 1, ty) ? 4 : 0);
    const key = `${walls}/${mask}`;
    let variants = this.wallVariants.get(key);
    if (!variants) {
      variants = this.art.variants(`wall/${key}`);
      this.wallVariants.set(key, variants);
    }
    return variants[hash2(tx, ty, LOOK_SEED) % variants.length]!;
  }

  private roofTexture(roof: string, row: string, column: string, tx: number, ty: number): Texture {
    const key = `${roof}/${row}/${column}`;
    let variants = this.roofVariants.get(key);
    if (!variants) {
      variants = this.art.variants(`roof/${key}`);
      this.roofVariants.set(key, variants);
    }
    return variants[hash2(tx, ty, LOOK_SEED + 1) % variants.length]!;
  }

  /** A wooden board with the building's name, centred over the door. */
  private sign(building: Building, text: string): Container {
    const lines = this.font.wrap(text, 120);
    const width = Math.max(...lines.map((l) => this.font.measure(l))) + 8;
    const height = (lines.length - 1) * this.font.lineHeight + this.font.height + 5;
    const sign = new Container();
    const board = new NineSliceSprite({ texture: this.art.frame('ui/sign'), leftWidth: 2, topHeight: 2, rightWidth: 2, bottomHeight: 2 });
    board.width = width;
    board.height = height;
    const label = this.font.layout(lines, INK);
    label.position.set(4, 3);
    sign.addChild(board, label);
    sign.position.set(
      Math.round(building.doorX * TILE_SIZE + TILE_SIZE / 2 - width / 2),
      (building.y1 + 1) * TILE_SIZE - SIGN_BOTTOM - height,
    );
    this.textLayer.addChild(sign);
    return sign;
  }

  private make(building: Building): BuildingView {
    const { x0, y0, x1, y1, doorX } = building;
    const sprites: Sprite[] = [];
    const front: Container[] = [];
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
        const sprite = place(new Sprite(isDoor ? this.doorTexture(building, tx, ty) : this.wallTexture(building, tx, ty)), tx, ty, 8);
        if (ty === y1) front.push(sprite);
        if (isDoor) door = sprite;
      }
    }
    const sign = building.sign ? this.sign(building, building.sign) : null;

    // The roof sits on the wall tops: rows of slate tiles from the north eave to the south eave.
    // Seen from the south, the back slope shows above the ridge and the front slope below it.
    const roof = new Container();
    const roofStyle = (building.style ?? DEFAULT_STYLE).roof;
    const rows = y1 - y0 + 1;
    const ridge = Math.max(1, Math.round(rows / 2 - 1));
    for (let r = 0; r < rows; r++) {
      const row = r === 0 ? 'top' : r < ridge ? 'back' : r === ridge ? 'ridge' : r === rows - 1 ? 'eave' : 'front';
      for (let tx = x0; tx <= x1; tx++) {
        const column = tx === x0 ? 'l' : tx === x1 ? 'r' : 'm';
        const tile = new Sprite(this.roofTexture(roofStyle, row, column, tx, y0 + r));
        tile.position.set(tx * TILE_SIZE, (y0 + r) * TILE_SIZE - WALL_HEIGHT);
        roof.addChild(tile);
      }
    }
    for (let tx = x0; tx <= x1; tx++) {
      const shadow = new Sprite(this.art.frame('roof/shadow'));
      shadow.position.set(tx * TILE_SIZE, (y1 + 1) * TILE_SIZE - WALL_HEIGHT);
      roof.addChild(shadow);
    }
    // Chimneys, flags and spires stand on the ridge, in the middle of their column.
    for (const prop of building.roofProps ?? []) {
      const sprite = new Sprite(this.art.frame(`roof/${prop.name}`));
      sprite.position.set(prop.tx * TILE_SIZE + TILE_SIZE / 2, (y0 + ridge) * TILE_SIZE - WALL_HEIGHT + RIDGE_LINE);
      roof.addChild(sprite);
    }
    // Just in front of the south wall: above everything in the building, below what stands south of it.
    roof.zIndex = y1 * TILE_SIZE + 8.5;
    this.layer.addChild(roof);

    if (!door) throw new Error(`building ${building.id} has no door`);
    return { building, sprites, front, sign, door, doorOpen: this.world.isDoorOpen(doorX, y1), roof, alpha: 1 };
  }
}
