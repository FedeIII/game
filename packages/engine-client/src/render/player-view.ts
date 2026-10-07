import { Container, Sprite, type Texture } from 'pixi.js';
import type { Facing, PlayerState } from '@game/engine';
import type { Art } from '../assets.ts';

/** World pixels of travel for each walk frame: 8 frames make one 32-pixel cycle of two steps. */
const STRIDE = 4;

/** From the centre of the feet to just above the hood, in world pixels: where speech goes. */
export const PLAYER_HEAD_HEIGHT = 30;

/** The opacity of the copy of the player that shows through trees. */
const GHOST_ALPHA = 0.3;

const FACINGS: readonly Facing[] = ['down', 'up', 'left', 'right'];

/**
 * Shows one player. The walk animation advances with the distance moved, not with time, so
 * a slow joystick push gives a slow walk.
 */
export class PlayerView {
  /** The player and its shadow, in the depth-sorted entity layer. */
  readonly root = new Container();
  /**
   * A faint copy of the player for a layer above all props. Over the player itself it changes
   * nothing (the same pixels); over a tree that hides the player, it shows a faint figure.
   */
  readonly ghost: Sprite;
  private readonly body: Sprite;
  private readonly stand = {} as Record<Facing, Texture>;
  private readonly walk = {} as Record<Facing, Texture[]>;
  private travelled = 0;

  constructor(art: Art) {
    for (const facing of FACINGS) {
      this.stand[facing] = art.frame(`player/${facing}/stand`);
      this.walk[facing] = art.animation(`walk/${facing}`);
    }
    this.body = new Sprite(this.stand.down);
    this.ghost = new Sprite(this.stand.down);
    this.ghost.alpha = GHOST_ALPHA;
    this.root.addChild(new Sprite(art.frame('player/shadow')), this.body);
  }

  /** Places the player at (x, y), the interpolated centre of its feet, and selects the frame. */
  update(x: number, y: number, state: PlayerState, seconds: number): void {
    // The centre of the feet is also the line that sorts the player against trees and rocks.
    this.root.position.set(x, y);
    this.root.zIndex = y;
    this.ghost.position.set(x, y);

    const speed = Math.hypot(state.vx, state.vy);
    let texture: Texture;
    if (speed < 1) {
      this.travelled = 0;
      texture = this.stand[state.facing];
    } else {
      this.travelled += speed * seconds;
      const frames = this.walk[state.facing];
      texture = frames[Math.floor(this.travelled / STRIDE) % frames.length]!;
    }
    this.body.texture = texture;
    this.ghost.texture = texture;
  }
}
