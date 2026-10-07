import { Container, Sprite, type Texture } from 'pixi.js';
import { PLAYER_HALF_HEIGHT, type PlayerState } from '@game/shared';
import type { Art } from '../assets.ts';

/** World pixels of travel for each frame of the walk cycle. */
const STRIDE = 10;

/**
 * Shows one player. The walk animation advances with the distance moved, not with time, so
 * a slow joystick push gives a slow walk.
 */
export class PlayerView {
  readonly root = new Container();
  private readonly body: Sprite;
  private readonly stand: Record<'down' | 'up' | 'side', Texture>;
  private readonly walk: Record<'down' | 'up' | 'side', Texture[]>;
  private travelled = 0;

  constructor(art: Art) {
    const shadow = new Sprite(art.frame('player/shadow'));
    shadow.y = -1;
    this.stand = { down: art.frame('player/down/0'), up: art.frame('player/up/0'), side: art.frame('player/side/0') };
    this.walk = { down: art.animation('walk/down'), up: art.animation('walk/up'), side: art.animation('walk/side') };
    this.body = new Sprite(this.stand.down);
    this.root.addChild(shadow, this.body);
  }

  /** Places the player at (x, y), the interpolated centre of its feet, and selects the frame. */
  update(x: number, y: number, state: PlayerState, seconds: number): void {
    // The root is at the bottom of the feet: that line sorts the player against trees and rocks.
    this.root.position.set(x, y + PLAYER_HALF_HEIGHT);
    this.root.zIndex = this.root.position.y;

    const view = state.facing === 'left' || state.facing === 'right' ? 'side' : state.facing;
    this.body.scale.x = state.facing === 'left' ? -1 : 1;
    const speed = Math.hypot(state.vx, state.vy);
    if (speed < 1) {
      this.travelled = 0;
      this.body.texture = this.stand[view];
      return;
    }
    this.travelled += speed * seconds;
    const frames = this.walk[view];
    this.body.texture = frames[Math.floor(this.travelled / STRIDE) % frames.length]!;
  }
}
