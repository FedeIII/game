import { Container, Sprite, type Texture } from 'pixi.js';
import { FX_TURNS, fxPlacement } from '../../art/attacks.ts';
import type { Art } from '../assets.ts';
import { ARROW_TINT } from './player-view.ts';

/** An arrow flies at the height of a chest: this far above the point that the engine flies (world pixels). */
const ARROW_HEIGHT = 12;

/** An arrow to draw: where it is (the engine's point, on the ground) and its direction. */
export interface ArrowLook {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly aim: number;
}

/**
 * The arrows in flight (arrows.ts), in the depth-sorted entity layer: the drawing of fx/arrow
 * nearest to the direction, placed in 16 directions as the effects of attacks are (fxPlacement).
 */
export class ArrowViews {
  private readonly frames: Texture[];
  private readonly layer: Container;
  private readonly sprites = new Map<number, Sprite>();

  constructor(art: Art, entityLayer: Container) {
    this.frames = Array.from({ length: FX_TURNS }, (_, turn) => art.frame(`fx/arrow/${turn}`));
    this.layer = entityLayer;
  }

  update(arrows: readonly ArrowLook[]): void {
    const here = new Set<number>();
    for (const arrow of arrows) {
      here.add(arrow.id);
      let sprite = this.sprites.get(arrow.id);
      if (!sprite) {
        sprite = new Sprite(this.frames[0]);
        sprite.tint = ARROW_TINT;
        this.layer.addChild(sprite);
        this.sprites.set(arrow.id, sprite);
      }
      const place = fxPlacement(arrow.aim);
      const texture = this.frames[place.turn]!;
      sprite.texture = texture;
      sprite.anchor.copyFrom(texture.defaultAnchor ?? { x: 0.5, y: 0.5 });
      sprite.rotation = place.rotation;
      sprite.scale.x = place.mirror ? -1 : 1;
      sprite.position.set(Math.round(arrow.x), Math.round(arrow.y - ARROW_HEIGHT));
      sprite.zIndex = arrow.y;
    }
    for (const [id, sprite] of this.sprites) {
      if (here.has(id)) continue;
      sprite.destroy();
      this.sprites.delete(id);
    }
  }
}
