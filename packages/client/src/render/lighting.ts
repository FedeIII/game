import { Container, Sprite, Texture } from 'pixi.js';
import atlasData from '../generated/atlas.json';
import type { Art } from '../assets.ts';

/** How far the flat darkness reaches beyond the darkness texture, in world pixels. */
const COVER = 4096;

/**
 * The Diablo-style light radius: the world is dark except round the player, who carries a
 * warm, slightly flickering light. The falloff is a texture made by art/lights.ts; flat
 * sprites in the same ambient colour (from the atlas metadata) cover the rest of the screen.
 */
export class Lighting {
  readonly root = new Container();
  private readonly glow: Sprite;

  constructor(art: Art) {
    const settings = atlasData.meta.lighting;
    this.glow = new Sprite(art.frame('light/glow'));
    this.glow.blendMode = 'add';
    const darkness = new Sprite(art.frame('light/darkness'));
    const half = settings.outer;
    const block = (x: number, y: number, width: number, height: number): Sprite => {
      const sprite = new Sprite(Texture.WHITE);
      sprite.tint = settings.ambient;
      sprite.alpha = settings.ambientAlpha;
      sprite.position.set(x, y);
      sprite.width = width;
      sprite.height = height;
      return sprite;
    };
    // The glow goes under the darkness, so the darkness also dims the glow at its rim.
    this.root.addChild(
      this.glow,
      darkness,
      block(-COVER, -COVER, 2 * COVER, COVER - half),
      block(-COVER, half, 2 * COVER, COVER - half),
      block(-COVER, -half, COVER - half, 2 * half),
      block(half, -half, COVER - half, 2 * half),
    );
  }

  /** Centres the light on (x, y), on a whole world pixel so the dither stays on the grid. */
  update(x: number, y: number, seconds: number): void {
    this.root.position.set(Math.round(x), Math.round(y));
    this.glow.alpha = 0.88 + 0.07 * Math.sin(seconds * 7.3) + 0.05 * Math.sin(seconds * 13.1 + 1.7);
  }
}
