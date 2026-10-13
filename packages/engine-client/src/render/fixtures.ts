import { Container, NineSliceSprite, Sprite } from 'pixi.js';
import { TILE_SIZE, fixtureType, type Conditions, type Fixture, type World } from '@game/engine';
import type { Art } from '../assets.ts';
import type { Rect } from './camera.ts';
import type { LightSource } from './lighting.ts';
import { shadowedText } from './name-tag.ts';
import type { PixelFont } from './pixel-text.ts';
import { tw } from '../i18n.ts';

/** Look further than the screen for fixtures, so a light appears before its fixture does. */
const MARGIN_TILES = 12;
/** A hidden thing fades in over this many world pixels at the edge of the seeker's sight. */
const SEEK_FADE = 8;
/** The bottom of the plate of a label (Fixture.label): this many pixels above the south edge of the thing. */
const PLATE_BOTTOM = 20;
/** The shield over a plate goes this many pixels down over its top edge. */
const CREST_OVERLAP = 4;

/** Who looks for hidden things (Fixture.hidden): where its feet are, and how far it sees them (PlayerTraits.seek). */
export interface Seeker {
  readonly x: number;
  readonly y: number;
  readonly range: number;
}

interface FixtureView {
  readonly fixture: Fixture;
  readonly sprite: Sprite;
  /** The additive glow of a portal, tinted with the colour of its light. */
  readonly glow: Sprite | null;
  /** The plate with the name of a name sign (Fixture.label), in the text layer. */
  readonly plate: Container | null;
}

/** How much of a hidden thing a seeker sees: 1 within its range, 0 beyond it, a fade between. */
function seen(fixture: Fixture, seeker: Seeker | null): number {
  if (!seeker) return 0;
  const d = Math.hypot(fixture.tx * TILE_SIZE + TILE_SIZE / 2 - seeker.x, fixture.ty * TILE_SIZE + TILE_SIZE / 2 - seeker.y);
  return Math.max(0, Math.min(1, (seeker.range + SEEK_FADE - d) / (2 * SEEK_FADE)));
}

function key(fixture: Fixture): string {
  return `${fixture.kind}@${fixture.tx},${fixture.ty}`;
}

/** The frame of a thing: `fixture/<kind>`, or `fixture/<kind>/<look>` for a thing with a style (a name sign). */
function frameOf(fixture: Fixture): string {
  return fixture.look ? `fixture/${fixture.kind}/${fixture.look}` : `fixture/${fixture.kind}`;
}

/**
 * Shows the fixtures near the camera (furniture, props, NPCs), in the depth-sorted entity layer.
 * A fixture stands on its anchor tile's south-west corner and sorts by its type's depth line.
 * NPCs use the frame of their look (`npc/<look>`); a portal gets a glow in the colour of its
 * light, which pulses. A thing with a label (a name sign) gets a plate with the name over its middle,
 * in the text layer (above the darkness, as the signs of the buildings), in the small font and in the
 * style of its look (`ui/namesign/<look>`, and the shield `ui/crest/<look>` over it). `lights()` gives
 * the lights of the fixtures that are shown.
 */
export class Fixtures {
  private readonly world: World;
  private readonly art: Art;
  private readonly layer: Container;
  private readonly textLayer: Container;
  private readonly font: PixelFont;
  private readonly views = new Map<string, FixtureView>();
  /** Whether conditions hold for the player (its quests and pack): a fixture with a variant shows it then (Fixture.variant). */
  private holds: (when: Conditions) => boolean = () => false;

  constructor(world: World, art: Art, entityLayer: Container, textLayer: Container, smallFont: PixelFont) {
    this.world = world;
    this.art = art;
    this.layer = entityLayer;
    this.textLayer = textLayer;
    this.font = smallFont;
  }

  get count(): number {
    return this.views.size;
  }

  /** How to read the conditions of the variants: the player's quest book and pack. */
  setHolds(holds: (when: Conditions) => boolean): void {
    this.holds = holds;
  }

  /** Shows the fixtures in and near `view`. A hidden one shows only within the range of `seeker` (none: never). */
  update(view: Rect, seconds: number, seeker: Seeker | null = null): void {
    const x0 = Math.floor(view.x / TILE_SIZE) - MARGIN_TILES;
    const y0 = Math.floor(view.y / TILE_SIZE) - MARGIN_TILES;
    const x1 = Math.ceil((view.x + view.width) / TILE_SIZE) + MARGIN_TILES;
    const y1 = Math.ceil((view.y + view.height) / TILE_SIZE) + MARGIN_TILES;
    const near = new Set<string>();
    for (const fixture of this.world.fixturesIn(x0, y0, x1, y1)) {
      const k = key(fixture);
      near.add(k);
      if (!this.views.has(k)) this.views.set(k, this.make(fixture));
    }
    for (const [k, built] of this.views) {
      const { tx, ty } = built.fixture;
      const far = tx < x0 - MARGIN_TILES || tx > x1 + MARGIN_TILES || ty < y0 - MARGIN_TILES || ty > y1 + MARGIN_TILES;
      if (!near.has(k) && far) {
        built.sprite.destroy();
        built.glow?.destroy();
        built.plate?.destroy({ children: true });
        this.views.delete(k);
      }
    }
    // Portals breathe: the glow brightens and dims slowly, each one at its own pace.
    for (const built of this.views.values()) {
      if (built.glow) built.glow.alpha = 0.5 + 0.12 * Math.sin(seconds * 1.7 + built.fixture.tx * 0.7);
      if (built.fixture.hidden) built.sprite.alpha = seen(built.fixture, seeker);
      const variant = built.fixture.variant;
      if (variant) {
        const texture = this.art.frame(this.holds(variant.when) ? variant.frame : frameOf(built.fixture));
        if (built.sprite.texture !== texture) {
          built.sprite.texture = texture;
          // The two frames have their own crops: each has its anchor.
          built.sprite.anchor.copyFrom(texture.defaultAnchor ?? { x: 0, y: 1 });
        }
      }
    }
  }

  /** The lights of the fixtures that are shown, in world pixels. */
  lights(): LightSource[] {
    const out: LightSource[] = [];
    for (const { fixture } of this.views.values()) {
      const light = fixture.light;
      if (!light) continue;
      out.push({
        x: fixture.tx * TILE_SIZE + light.x,
        y: (fixture.ty + 1) * TILE_SIZE + light.y,
        radius: light.radius,
        colour: light.colour,
        flicker: fixture.kind !== 'portal',
        seed: fixture.tx * 31 + fixture.ty,
      });
    }
    return out;
  }

  /** Where the head of an NPC is, in world pixels: its lines go over it. */
  static headOf(fixture: Fixture): { x: number; y: number } {
    return { x: fixture.tx * TILE_SIZE + TILE_SIZE / 2, y: fixture.ty * TILE_SIZE + 12 - 30 };
  }

  private make(fixture: Fixture): FixtureView {
    const type = fixtureType(fixture.kind);
    const isNpc = fixture.kind === 'npc';
    const sprite = new Sprite(this.art.frame(isNpc ? `npc/${fixture.look ?? 'crier'}` : frameOf(fixture)));
    // An NPC stands on the middle of its tile, a little south of the centre, like the player.
    if (isNpc) sprite.position.set(fixture.tx * TILE_SIZE + TILE_SIZE / 2, fixture.ty * TILE_SIZE + 12);
    else sprite.position.set(fixture.tx * TILE_SIZE, (fixture.ty + 1) * TILE_SIZE);
    sprite.zIndex = fixture.ty * TILE_SIZE + type.depth;
    this.layer.addChild(sprite);
    let glow: Sprite | null = null;
    if (fixture.kind === 'portal') {
      glow = new Sprite(this.art.frame('fixture/portal-glow'));
      glow.position.copyFrom(sprite.position);
      glow.zIndex = sprite.zIndex + 0.01;
      glow.blendMode = 'add';
      glow.tint = fixture.light?.colour ?? 0xffffff;
      this.layer.addChild(glow);
    }
    return { fixture, sprite, glow, plate: fixture.label ? this.plate(fixture, fixture.label) : null };
  }

  /**
   * The plate with the name of a name sign, centred over the middle of the thing's footprint: the name
   * in the small font with a shadow, as on the signs of the buildings, and the shield of its style over it.
   */
  private plate(fixture: Fixture, english: string): Container {
    const lines = this.font.wrap(tw(english), 120);
    // The shadow adds a pixel to the right and below the letters.
    const width = Math.max(...lines.map((l) => this.font.measure(l))) + 1 + 8;
    const height = (lines.length - 1) * this.font.lineHeight + this.font.height + 1 + 7;
    const plate = new Container();
    const look = fixture.look ?? '';
    const board = new NineSliceSprite({ texture: this.art.tryFrame(`ui/namesign/${look}`) ?? this.art.frame('ui/sign'), leftWidth: 3, topHeight: 3, rightWidth: 3, bottomHeight: 3 });
    board.width = width;
    board.height = height;
    const label = shadowedText(this.font, lines);
    label.position.set(4, 4);
    plate.addChild(board, label);
    const crestTexture = this.art.tryFrame(`ui/crest/${look}`);
    if (crestTexture) {
      const crest = new Sprite(crestTexture);
      crest.position.set(Math.round((width - crest.width) / 2), CREST_OVERLAP - crest.height);
      plate.addChild(crest);
    }
    const tiles = fixtureType(fixture.kind).tiles;
    const span = (Math.max(...tiles.map((t) => t.dx)) - Math.min(...tiles.map((t) => t.dx)) + 1) * TILE_SIZE;
    plate.position.set(Math.round(fixture.tx * TILE_SIZE + span / 2 - width / 2), (fixture.ty + 1) * TILE_SIZE - PLATE_BOTTOM - height);
    this.textLayer.addChild(plate);
    return plate;
  }
}
