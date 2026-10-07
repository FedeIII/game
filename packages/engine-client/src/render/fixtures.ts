import { Container, Sprite } from 'pixi.js';
import { TILE_SIZE, fixtureType, type Fixture, type World } from '@game/engine';
import type { Art } from '../assets.ts';
import type { Rect } from './camera.ts';
import type { LightSource } from './lighting.ts';

/** Look further than the screen for fixtures, so a light appears before its fixture does. */
const MARGIN_TILES = 12;

interface FixtureView {
  readonly fixture: Fixture;
  readonly sprite: Sprite;
  /** The additive glow of a portal, tinted with the colour of its light. */
  readonly glow: Sprite | null;
}

function key(fixture: Fixture): string {
  return `${fixture.kind}@${fixture.tx},${fixture.ty}`;
}

/**
 * Shows the fixtures near the camera (furniture, props, NPCs), in the depth-sorted entity layer.
 * A fixture stands on its anchor tile's south-west corner and sorts by its type's depth line.
 * NPCs use the frame of their look (`npc/<look>`); a portal gets a glow in the colour of its
 * light, which pulses. `lights()` gives the lights of the fixtures that are shown.
 */
export class Fixtures {
  private readonly world: World;
  private readonly art: Art;
  private readonly layer: Container;
  private readonly views = new Map<string, FixtureView>();

  constructor(world: World, art: Art, entityLayer: Container) {
    this.world = world;
    this.art = art;
    this.layer = entityLayer;
  }

  get count(): number {
    return this.views.size;
  }

  update(view: Rect, seconds: number): void {
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
        this.views.delete(k);
      }
    }
    // Portals breathe: the glow brightens and dims slowly, each one at its own pace.
    for (const built of this.views.values()) {
      if (built.glow) built.glow.alpha = 0.5 + 0.12 * Math.sin(seconds * 1.7 + built.fixture.tx * 0.7);
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
    const sprite = new Sprite(this.art.frame(isNpc ? `npc/${fixture.look ?? 'crier'}` : `fixture/${fixture.kind}`));
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
    return { fixture, sprite, glow };
  }
}
