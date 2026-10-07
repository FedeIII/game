import { Container, RenderTexture, Sprite, Texture, type Renderer } from 'pixi.js';
import atlasData from '../generated/atlas.json';
import type { Art } from '../assets.ts';
import type { Rect } from './camera.ts';

/** A light in the world. */
export interface LightSource {
  /** The centre, in world pixels. */
  readonly x: number;
  readonly y: number;
  /** World pixels to full darkness. The nearest radius of the atlas is used. */
  readonly radius: number;
  /** The colour of the warm glow, 0xRRGGBB. */
  readonly colour: number;
  /** A flame flickers; a portal does not. */
  readonly flicker: boolean;
  /** Makes each flame flicker at its own pace. */
  readonly seed: number;
}

/** The player's torch. */
export const TORCH = { radius: 150, colour: 0xff8a3c } as const;

/**
 * Diablo-style light: the world is dark, and each light erases a hole in the darkness and adds
 * a warm glow. Each frame, the darkness is drawn into a small texture with one texel per world
 * pixel (the ambient colour, minus a dithered hole for each light), and that texture is laid over
 * the world. So the light falls off in pixel-art steps on the world grid, at any zoom.
 * `darkness` (0..1) scales the ambient darkness: a world can be less dark than night.
 */
export class Lighting {
  readonly root = new Container();
  private readonly renderer: Renderer;
  private readonly glows = new Container();
  private readonly map = new Sprite();
  private readonly contents = new Container();
  private readonly ambient = new Sprite(Texture.WHITE);
  private readonly holeTextures: { radius: number; texture: Texture }[];
  private readonly glowTexture: Texture;
  private readonly holes: Sprite[] = [];
  private readonly glowSprites: Sprite[] = [];
  private texture: RenderTexture | null = null;

  constructor(art: Art, renderer: Renderer, darkness: number) {
    const settings = atlasData.meta.lighting;
    this.renderer = renderer;
    this.holeTextures = settings.radii.map((radius) => ({ radius, texture: art.frame(`light/hole/${radius}`) }));
    this.glowTexture = art.frame('light/glow');
    this.ambient.tint = settings.ambient;
    this.ambient.alpha = settings.ambientAlpha * darkness;
    this.contents.addChild(this.ambient);
    // The glows go under the darkness, so the darkness also dims a glow at its rim.
    this.root.addChild(this.glows, this.map);
  }

  /** Redraws the darkness for the view and the lights. `time` is in seconds. */
  update(view: Rect, lights: readonly LightSource[], time: number): void {
    // One texel per world pixel, a little larger than the view, on whole world pixels.
    const x0 = Math.floor(view.x) - 2;
    const y0 = Math.floor(view.y) - 2;
    const width = Math.ceil(view.width) + 4;
    const height = Math.ceil(view.height) + 4;
    if (!this.texture || this.texture.width !== width || this.texture.height !== height) {
      this.texture?.destroy(true);
      this.texture = RenderTexture.create({ width, height, resolution: 1, scaleMode: 'nearest', antialias: false });
      this.map.texture = this.texture;
    }
    this.ambient.width = width;
    this.ambient.height = height;

    lights.forEach((light, i) => {
      const flicker = light.flicker ? 0.93 + 0.04 * Math.sin(time * 7.3 + light.seed) + 0.03 * Math.sin(time * 13.1 + light.seed * 1.7) : 1;
      const hole = this.pooled(this.holes, i, this.contents, () => {
        const sprite = new Sprite();
        sprite.anchor.set(0.5);
        sprite.blendMode = 'erase';
        return sprite;
      });
      hole.texture = this.holeFor(light.radius);
      hole.position.set(Math.round(light.x) - x0, Math.round(light.y) - y0);
      hole.alpha = flicker;
      const glow = this.pooled(this.glowSprites, i, this.glows, () => {
        const sprite = new Sprite(this.glowTexture);
        sprite.anchor.set(0.5);
        sprite.blendMode = 'add';
        return sprite;
      });
      glow.position.set(Math.round(light.x), Math.round(light.y));
      // The glow covers about two thirds of the light, in whole-pixel scale steps.
      glow.scale.set(Math.max(0.5, Math.round((light.radius / this.glowTexture.width) * 2 * 0.66 * 4) / 4));
      glow.tint = light.colour;
      glow.alpha = flicker;
    });
    for (let i = lights.length; i < this.holes.length; i++) {
      this.holes[i]!.visible = false;
      this.glowSprites[i]!.visible = false;
    }

    this.renderer.render({ container: this.contents, target: this.texture, clear: true });
    this.map.position.set(x0, y0);
  }

  private holeFor(radius: number): Texture {
    let best = this.holeTextures[0]!;
    for (const hole of this.holeTextures) if (Math.abs(hole.radius - radius) < Math.abs(best.radius - radius)) best = hole;
    return best.texture;
  }

  private pooled(pool: Sprite[], i: number, parent: Container, make: () => Sprite): Sprite {
    let sprite = pool[i];
    if (!sprite) {
      sprite = make();
      pool.push(sprite);
      parent.addChild(sprite);
    }
    sprite.visible = true;
    return sprite;
  }
}
