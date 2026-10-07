import { Container, Sprite, type Texture } from 'pixi.js';
import type { Facing } from '@game/engine';
import type { Art } from '../assets.ts';

/** World pixels of travel for each walk frame: 8 frames make one 32-pixel cycle of two steps. */
const STRIDE = 4;

/** The wanderer of the atlas: from the centre of the feet to just above the hood, in world pixels. */
const ATLAS_HEAD_HEIGHT = 30;

/** A tint for a player whose skin is not ready yet: a darker wanderer, for a moment. */
const PENDING_TINT = 0x6a6a6a;

const FACINGS: readonly Facing[] = ['down', 'up', 'left', 'right'];

/** What the view needs of a player: the local PlayerState, or another player from Remotes. */
export interface PlayerPose {
  readonly vx: number;
  readonly vy: number;
  readonly facing: Facing;
}

/** The frames of one look of the player: a stand and a walk for each facing. */
export interface PlayerTextures {
  readonly stand: Readonly<Record<Facing, Texture>>;
  readonly walk: Readonly<Record<Facing, readonly Texture[]>>;
  /** From the centre of the feet to just above the head or hat, in world pixels: speech goes there. */
  readonly headHeight: number;
}

/** The hooded wanderer of the atlas: the look of a player whose own skin is not ready. */
export function atlasPlayerTextures(art: Art): PlayerTextures {
  const stand = {} as Record<Facing, Texture>;
  const walk = {} as Record<Facing, Texture[]>;
  for (const facing of FACINGS) {
    stand[facing] = art.frame(`player/${facing}/stand`);
    walk[facing] = art.animation(`walk/${facing}`);
  }
  return { stand, walk, headHeight: ATLAS_HEAD_HEIGHT };
}

/**
 * Shows one player. The walk animation advances with the distance moved, not with time, so
 * a slow joystick push gives a slow walk. The textures can change at any time (a skin that has
 * just been rendered); the sprite keeps its place, because every frame is anchored at the feet.
 */
export class PlayerView {
  /** The opacity of the copy of the player that shows through trees. */
  static readonly GHOST_ALPHA = 0.3;
  /** The player and its shadow, in the depth-sorted entity layer. */
  readonly root = new Container();
  /**
   * A faint copy of the player for a layer above all props. Over the player itself it changes
   * nothing (the same pixels); over a tree that hides the player, it shows a faint figure.
   */
  readonly ghost: Sprite;
  private readonly body: Sprite;
  private textures: PlayerTextures;
  private travelled = 0;

  constructor(art: Art, textures: PlayerTextures, pending = false) {
    this.textures = textures;
    this.body = new Sprite(textures.stand.down);
    this.ghost = new Sprite(textures.stand.down);
    this.ghost.alpha = PlayerView.GHOST_ALPHA;
    this.root.addChild(new Sprite(art.frame('player/shadow')), this.body);
    this.setPending(pending);
  }

  get headHeight(): number {
    return this.textures.headHeight;
  }

  /** Changes the look. The next update() shows it. */
  setTextures(textures: PlayerTextures): void {
    this.textures = textures;
  }

  /** Shows the player darker while its own skin is on the way. */
  setPending(pending: boolean): void {
    this.body.tint = pending ? PENDING_TINT : 0xffffff;
    this.ghost.tint = this.body.tint;
  }

  /** Places the player at (x, y), the interpolated centre of its feet, and selects the frame. */
  update(x: number, y: number, state: PlayerPose, seconds: number): void {
    // The centre of the feet is also the line that sorts the player against trees and rocks.
    this.root.position.set(x, y);
    this.root.zIndex = y;
    this.ghost.position.set(x, y);

    const speed = Math.hypot(state.vx, state.vy);
    let texture: Texture;
    if (speed < 1) {
      this.travelled = 0;
      texture = this.textures.stand[state.facing];
    } else {
      this.travelled += speed * seconds;
      const frames = this.textures.walk[state.facing];
      texture = frames[Math.floor(this.travelled / STRIDE) % frames.length]!;
    }
    this.body.texture = texture;
    this.ghost.texture = texture;
  }
}
