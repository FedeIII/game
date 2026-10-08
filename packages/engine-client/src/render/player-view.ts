import { Container, Sprite, type Texture } from 'pixi.js';
import { ATTACK_TICKS, type Facing } from '@game/engine';
import type { Art } from '../assets.ts';

/** World pixels of travel for each walk frame: 8 frames make one 32-pixel cycle of two steps. */
const STRIDE = 4;

/** The wanderer of the atlas: from the centre of the feet to just above the hood, in world pixels. */
const ATLAS_HEAD_HEIGHT = 30;

/** A tint for a player whose skin is not ready yet: a darker wanderer, for a moment. */
const PENDING_TINT = 0x6a6a6a;

/** The arc of an attack shows for this many ticks of the attack, in SLASH_FRAMES frames. */
const SLASH_TICKS = 13;
const SLASH_FRAMES = 4;
/** The colour of the arc: pale steel. */
const SLASH_TINT = 0xd8e0ea;
/** A hit: the body flashes red for this long (ms); then it is a little grey while stunned. */
const HIT_FLASH_MS = 160;
const HIT_TINT = 0xff7060;
const DAZED_TINT = 0xb4aaa6;
/** The stars of a stun circle this high over the head, this wide. */
const STAR_COUNT = 3;
const STAR_TINT = 0xffe7a0;

const FACINGS: readonly Facing[] = ['down', 'up', 'left', 'right'];

/** What the view needs of a player: the local PlayerState, or another player from Remotes. */
export interface PlayerPose {
  readonly vx: number;
  readonly vy: number;
  readonly facing: Facing;
  /** Ticks left of an attack, of a stun, and of the guard after a stun (as in PlayerState; 0 or none: not now). */
  readonly attack?: number;
  readonly stun?: number;
  readonly guard?: number;
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
  /** What shows above the darkness: the stars of a stun. The owner puts it in a layer above the lights. */
  readonly overlay = new Container();
  private readonly body: Sprite;
  /** The arc of an attack: behind the body when the player faces up, in front of it otherwise. */
  private readonly slash: Sprite;
  private readonly slashFrames: Texture[];
  private readonly stars: Sprite[] = [];
  private textures: PlayerTextures;
  private travelled = 0;
  private pending = false;
  private wasStunned = false;
  private hitAt = -Infinity;

  constructor(art: Art, textures: PlayerTextures, pending = false) {
    this.textures = textures;
    this.body = new Sprite(textures.stand.down);
    this.ghost = new Sprite(textures.stand.down);
    this.ghost.alpha = PlayerView.GHOST_ALPHA;
    this.slashFrames = art.variants('fx/slash');
    this.slash = new Sprite(this.slashFrames[0]);
    this.slash.tint = SLASH_TINT;
    this.slash.visible = false;
    this.root.addChild(new Sprite(art.frame('player/shadow')), this.body, this.slash);
    for (let i = 0; i < STAR_COUNT; i++) {
      const star = new Sprite(art.frame('fx/star'));
      star.tint = STAR_TINT;
      this.stars.push(star);
      this.overlay.addChild(star);
    }
    this.overlay.visible = false;
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
    this.pending = pending;
    this.body.tint = pending ? PENDING_TINT : 0xffffff;
    this.ghost.tint = this.body.tint;
  }

  /** Places the player at (x, y), the interpolated centre of its feet, and selects the frame. */
  update(x: number, y: number, state: PlayerPose, seconds: number): void {
    // The centre of the feet is also the line that sorts the player against trees and rocks.
    this.root.position.set(x, y);
    this.root.zIndex = y;
    this.ghost.position.set(x, y);
    const now = performance.now();
    this.fight(state, now);

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

  /** The attack (an arc and a small lunge), a hit (a red flash), a stun (stars) and the guard after it (a blink). */
  private fight(state: PlayerPose, now: number): void {
    const attack = state.attack ?? 0;
    const stun = state.stun ?? 0;
    const elapsed = attack > 0 ? ATTACK_TICKS - attack : Infinity;
    // The arc: from the chest, towards the side of the attack.
    this.slash.visible = elapsed < SLASH_TICKS;
    let lunge = 0;
    if (this.slash.visible) {
      this.slash.texture = this.slashFrames[Math.min(SLASH_FRAMES - 1, Math.floor((elapsed / SLASH_TICKS) * SLASH_FRAMES))]!;
      const chest = -Math.round(this.textures.headHeight * 0.45);
      const turn = { right: 0, down: Math.PI / 2, left: 0, up: -Math.PI / 2 }[state.facing];
      this.slash.rotation = turn;
      this.slash.scale.x = state.facing === 'left' ? -1 : 1;
      this.slash.position.set(state.facing === 'left' ? -3 : state.facing === 'right' ? 3 : 0, chest + (state.facing === 'down' ? 4 : state.facing === 'up' ? -2 : 0));
      // Behind the body when the player faces away from the viewer.
      this.root.setChildIndex(this.slash, state.facing === 'up' ? 1 : 2);
      lunge = elapsed >= 1 && elapsed <= 8 ? 2 : 0;
    }
    const [fx, fy] = state.facing === 'left' ? [-1, 0] : state.facing === 'right' ? [1, 0] : state.facing === 'up' ? [0, -1] : [0, 1];
    // A hit: when a stun starts.
    if (stun > 0 && !this.wasStunned) this.hitAt = now;
    this.wasStunned = stun > 0;
    const sinceHit = now - this.hitAt;
    const sway = stun > 0 && sinceHit < 400 ? Math.round(Math.sin(sinceHit / 45)) : 0;
    this.body.position.set(fx * lunge + sway, fy * lunge);
    if (!this.pending) {
      this.body.tint = sinceHit < HIT_FLASH_MS ? HIT_TINT : stun > 0 ? DAZED_TINT : 0xffffff;
      this.ghost.tint = this.body.tint;
    }
    // The guard after a stun: the player blinks, so everyone sees that mobs cannot hit it now.
    this.body.alpha = (state.guard ?? 0) > 0 && Math.floor(now / 90) % 2 === 0 ? 0.45 : 1;
    // The stars of a stun, circling over the head.
    this.overlay.visible = stun > 0;
    if (stun > 0) {
      const top = this.textures.headHeight + 2;
      this.stars.forEach((star, i) => {
        const angle = now / 160 + (i * 2 * Math.PI) / STAR_COUNT;
        star.position.set(this.root.x + Math.round(Math.cos(angle) * 6), this.root.y - top + Math.round(Math.sin(angle) * 2));
        star.alpha = 0.65 + 0.35 * Math.sin(now / 70 + i);
      });
    }
  }
}
