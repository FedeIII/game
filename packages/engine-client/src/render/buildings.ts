import { Container, NineSliceSprite, Sprite, type Texture } from 'pixi.js';
import { DEFAULT_STYLE, Ground, Structure, TILE_SIZE, hash2, storeyCount, storeyWindows, upperStorey, type Building, type World } from '@game/engine';
import type { Art } from '../assets.ts';
import type { Rect } from './camera.ts';
import type { LightSource } from './lighting.ts';
import { shadowedText } from './name-tag.ts';
import type { PixelFont } from './pixel-text.ts';
import { tw } from '../i18n.ts';
import { GROUND_NAME } from './terrain.ts';

/** How opaque the front wall is while the player is inside: enough to see the room behind it. */
const FRONT_WALL_INSIDE_ALPHA = 0.35;
/** The roof style of a building without a roof (a burned homestead): nothing is drawn over it. */
const ROOFLESS = 'none';
/** How fast the roof and the front wall fade (per second, as a fraction of what remains). */
const FADE_RATE = 10;
/** Each storey of a wall is 32 pixels high; the roof sits on the top of the top storey. */
const WALL_HEIGHT = 32;
/** The ridge line of a roof: this many pixels below the top of its ridge row. */
const RIDGE_LINE = 8;
/** The bottom of a sign: this many pixels above the ground, just over the arch of the door. */
const SIGN_BOTTOM = 25;
/** Look further than the screen for buildings, so a big one appears before its edge does. */
const MARGIN_TILES = 16;
const LOOK_SEED = 0x6b1d;
/** A lit window throws a little warm light onto the street. */
const WINDOW_LIGHT = { radius: 48, colour: 0xffa850, y: -17 } as const;

type DoorState = 'open' | 'closed' | 'boarded';

interface BuildingView {
  readonly building: Building;
  readonly sprites: Sprite[];
  /**
   * The walls, a stack of sprites on each tile of them: one for each storey, from the ground up (the
   * door is the ground storey of its tile). `front`: the tile is in the south wall.
   */
  readonly stacks: { readonly ty: number; readonly front: boolean; readonly sprites: Sprite[] }[];
  /** The floor of the storey above the ground where the player is (Building.storeys), and its storey: the storey that stands on the ground. */
  floor: Container | null;
  floorStorey: number;
  /** The sign hangs outside the front wall: it goes away while the player is inside. */
  readonly sign: Container | null;
  readonly door: Sprite;
  /** The door state that the door sprite shows. */
  doorState: DoorState;
  readonly roof: Container;
  alpha: number;
}

/**
 * Shows the buildings near the camera: walls, the door, the roof and the sign. Walls and the door
 * are in the depth-sorted entity layer; the sign (a name or an emblem) goes in the text layer (its own
 * CRT settings, above the darkness). Fixtures inside buildings are drawn by Fixtures. While the
 * player is inside a building, its roof and its sign fade out and its front wall fades to
 * FRONT_WALL_INSIDE_ALPHA.
 *
 * A building with storeys (Building.storeys) has walls of one storey (32 pixels) for each, each
 * storey in its own wall set and with its own windows, and the roof on the top one. While the player
 * is inside, the storeys of its front wall above the player's storey go, as the roof does. While the
 * player is on a storey above the ground, the building shows from that storey up: its walls stand on
 * the ground, and the floor of that storey covers the ground storey (in the floor layer, over the
 * ground and under everything that stands).
 */
export class Buildings {
  private readonly world: World;
  private readonly art: Art;
  private readonly layer: Container;
  private readonly floorLayer: Container;
  private readonly textLayer: Container;
  private readonly font: PixelFont;
  private readonly views = new Map<string, BuildingView>();
  private readonly wallVariants = new Map<string, Texture[]>();
  private readonly roofVariants = new Map<string, Texture[]>();

  constructor(world: World, art: Art, entityLayer: Container, textLayer: Container, font: PixelFont, floorLayer: Container) {
    this.world = world;
    this.art = art;
    this.layer = entityLayer;
    this.floorLayer = floorLayer;
    this.textLayer = textLayer;
    this.font = font;
  }

  /**
   * Makes the buildings near the view, removes far ones, and fades roofs and fronts. `inside` is the
   * building that the player is in, and `storey` its storey (PlayerState.storey).
   */
  update(view: Rect, inside: Building | null, seconds: number, storey = 0): void {
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
        built.floor?.destroy({ children: true });
        built.sign?.destroy({ children: true });
        built.roof.destroy({ children: true });
        this.views.delete(id);
      }
    }

    const step = Math.min(1, seconds * FADE_RATE);
    for (const built of this.views.values()) {
      // A door can change without this client: another visitor, an NPC, the server.
      if (this.doorState(built.building, built.building.doorX, built.building.y1) !== built.doorState) this.refreshDoor(built.building.doorX, built.building.y1);
      const target = built.building === inside ? 0 : 1;
      built.alpha += (target - built.alpha) * step;
      if (Math.abs(target - built.alpha) < 0.01) built.alpha = target;
      built.roof.alpha = built.alpha;
      built.roof.visible = built.alpha > 0;
      // The storey that stands on the ground: the player's, while it is inside.
      const base = built.building === inside ? storey : 0;
      const front = FRONT_WALL_INSIDE_ALPHA + (1 - FRONT_WALL_INSIDE_ALPHA) * built.alpha;
      for (const stack of built.stacks) {
        stack.sprites.forEach((sprite, level) => {
          sprite.visible = level >= base && (level === base || !stack.front || built.alpha > 0);
          sprite.y = (stack.ty + 1) * TILE_SIZE - (level - base) * WALL_HEIGHT;
          // The front wall: its storey on the ground fades, and the storeys over it go.
          if (stack.front) sprite.alpha = level === base ? front : built.alpha;
        });
      }
      this.showFloor(built, base);
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
    built.doorState = this.doorState(built.building, tx, ty);
    built.door.texture = this.doorTexture(built.building, built.doorState);
  }

  /** The lights of the lit windows of the buildings that are shown, in world pixels: a window of a storey above the ground lights its wall. */
  lights(): LightSource[] {
    const out: LightSource[] = [];
    for (const { building, floorStorey: base } of this.views.values()) {
      for (let storey = base; storey < storeyCount(building); storey++) {
        for (const tx of storeyWindows(building, storey)) {
          out.push({
            x: tx * TILE_SIZE + TILE_SIZE / 2,
            y: (building.y1 + 1) * TILE_SIZE + WINDOW_LIGHT.y - (storey - base) * WALL_HEIGHT,
            radius: WINDOW_LIGHT.radius,
            colour: WINDOW_LIGHT.colour,
            flicker: true,
            seed: tx * 7 + building.y1 + storey * 13,
          });
        }
      }
    }
    return out;
  }

  /**
   * Shows the floor of a storey above the ground over the inside of the building (the player is on
   * it), or no floor (storey 0). The floor of the ground storey is in the ground chunks.
   */
  private showFloor(built: BuildingView, storey: number): void {
    if (built.floorStorey === storey) return;
    built.floor?.destroy({ children: true });
    built.floor = null;
    built.floorStorey = storey;
    const level = upperStorey(built.building, storey);
    if (!level) return;
    const { x0, y0, x1, y1 } = built.building;
    const variants = this.art.variants(`ground/${GROUND_NAME[level.floor ?? Ground.Floor]}`);
    const floor = new Container();
    for (let ty = y0 + 1; ty < y1; ty++) {
      for (let tx = x0 + 1; tx < x1; tx++) {
        const tile = new Sprite(variants[hash2(tx, ty, LOOK_SEED + 2 + storey) % variants.length]!);
        tile.position.set(tx * TILE_SIZE, ty * TILE_SIZE);
        floor.addChild(tile);
      }
    }
    this.floorLayer.addChild(floor);
    built.floor = floor;
  }

  /** The door open, closed, or boarded up (a building that is shut for good, or barred and not forced). */
  private doorState(building: Building, tx: number, ty: number): DoorState {
    if (building.locked !== undefined || this.world.doorBar(tx, ty)) return 'boarded';
    return this.world.isDoorOpen(tx, ty) ? 'open' : 'closed';
  }

  private doorTexture(building: Building, state: DoorState): Texture {
    return this.art.frame(`wall/${(building.style ?? DEFAULT_STYLE).walls}/door/${state}`);
  }

  /** The wall set of a storey of the building: its own (Storey.walls), or the building's. */
  private wallsOf(building: Building, storey: number): string {
    return upperStorey(building, storey)?.walls ?? (building.style ?? DEFAULT_STYLE).walls;
  }

  /** The wall of a storey of the building on a tile of its walls: a window, or a wall that joins its neighbours. */
  private wallTexture(building: Building, tx: number, ty: number, storey = 0): Texture {
    const walls = this.wallsOf(building, storey);
    if (ty === building.y1 && tx !== building.x0 && tx !== building.x1 && storeyWindows(building, storey).includes(tx)) return this.art.frame(`wall/${walls}/window`);
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

  /**
   * A wooden board centred over the door, with the building's name or its emblem. The name is drawn
   * as the names over heads are: the small font, the parchment ink and a 1-pixel shadow. The emblem
   * (`ui/emblem/<name>`) has its shadow in its frame.
   */
  private sign(building: Building): Container | null {
    let content: Container;
    let width: number;
    let height: number;
    if (building.emblem) {
      content = new Sprite(this.art.frame(`ui/emblem/${building.emblem}`));
      content.position.set(3, 3);
      width = content.width + 5;
      height = content.height + 5;
    } else if (building.sign) {
      const lines = this.font.wrap(tw(building.sign), 120);
      // The shadow adds a pixel to the right and below the letters.
      width = Math.max(...lines.map((l) => this.font.measure(l))) + 1 + 8;
      height = (lines.length - 1) * this.font.lineHeight + this.font.height + 1 + 6;
      content = shadowedText(this.font, lines);
      content.position.set(4, 3);
    } else {
      return null;
    }
    const sign = new Container();
    const board = new NineSliceSprite({ texture: this.art.frame('ui/sign'), leftWidth: 2, topHeight: 2, rightWidth: 2, bottomHeight: 2 });
    board.width = width;
    board.height = height;
    sign.addChild(board, content);
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
    const stacks: BuildingView['stacks'] = [];
    let door: Sprite | null = null;
    // Walls stand on their tile's south-west corner and sort by the tile's middle line.
    const place = (sprite: Sprite, tx: number, ty: number, depth: number): Sprite => {
      sprite.position.set(tx * TILE_SIZE, (ty + 1) * TILE_SIZE);
      sprite.zIndex = ty * TILE_SIZE + depth;
      this.layer.addChild(sprite);
      sprites.push(sprite);
      return sprite;
    };
    const storeys = storeyCount(building);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (tx !== x0 && tx !== x1 && ty !== y0 && ty !== y1) continue;
        const isDoor = tx === doorX && ty === y1;
        const sprite = place(new Sprite(isDoor ? this.doorTexture(building, this.doorState(building, tx, ty)) : this.wallTexture(building, tx, ty)), tx, ty, 8);
        if (isDoor) door = sprite;
        const stack = { ty, front: ty === y1, sprites: [sprite] };
        // The storeys above: the same wall, one storey higher each time, over the top of the one under it.
        for (let storey = 1; storey < storeys; storey++) {
          const above = place(new Sprite(this.wallTexture(building, tx, ty, storey)), tx, ty, 8 + storey * 0.01);
          above.y -= storey * WALL_HEIGHT;
          stack.sprites.push(above);
        }
        stacks.push(stack);
      }
    }
    const sign = this.sign(building);
    const roofHeight = storeys * WALL_HEIGHT;

    // The roof sits on the wall tops: rows of slate tiles from the north eave to the south eave.
    // Seen from the south, the back slope shows above the ridge and the front slope below it.
    const roof = new Container();
    const roofStyle = (building.style ?? DEFAULT_STYLE).roof;
    // A burned house has no roof (the style 'none'): its walls stand open to the sky.
    const rows = roofStyle === ROOFLESS ? 0 : y1 - y0 + 1;
    const ridge = Math.max(1, Math.round(rows / 2 - 1));
    for (let r = 0; r < rows; r++) {
      const row = r === 0 ? 'top' : r < ridge ? 'back' : r === ridge ? 'ridge' : r === rows - 1 ? 'eave' : 'front';
      for (let tx = x0; tx <= x1; tx++) {
        const column = tx === x0 ? 'l' : tx === x1 ? 'r' : 'm';
        const tile = new Sprite(this.roofTexture(roofStyle, row, column, tx, y0 + r));
        tile.position.set(tx * TILE_SIZE, (y0 + r) * TILE_SIZE - roofHeight);
        roof.addChild(tile);
      }
    }
    for (let tx = x0; tx <= x1 && rows > 0; tx++) {
      const shadow = new Sprite(this.art.frame('roof/shadow'));
      shadow.position.set(tx * TILE_SIZE, (y1 + 1) * TILE_SIZE - roofHeight);
      roof.addChild(shadow);
    }
    // Chimneys, flags and spires stand on the ridge, in the middle of their column.
    for (const prop of building.roofProps ?? []) {
      const sprite = new Sprite(this.art.frame(`roof/${prop.name}`));
      sprite.position.set(prop.tx * TILE_SIZE + TILE_SIZE / 2, (y0 + ridge) * TILE_SIZE - roofHeight + RIDGE_LINE);
      roof.addChild(sprite);
    }
    // Just in front of the south wall: above everything in the building, below what stands south of it.
    roof.zIndex = y1 * TILE_SIZE + 8.5;
    this.layer.addChild(roof);

    if (!door) throw new Error(`building ${building.id} has no door`);
    return { building, sprites, stacks, floor: null, floorStorey: 0, sign, door, doorState: this.doorState(building, doorX, y1), roof, alpha: 1 };
  }
}
