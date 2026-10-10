import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { ATTACK_TICKS, facingAngle, type Facing } from '@game/engine';
import { FX_TURNS, fxPlacement, type AttackStyle } from '../../art/attacks.ts';
import type { Art } from '../assets.ts';
import type { LightSource } from './lighting.ts';

/** World pixels of travel for each walk frame: 8 frames make one 32-pixel cycle of two steps. */
const STRIDE = 4;

/** The wanderer of the atlas: from the centre of the feet to just above the hood, in world pixels. */
const ATLAS_HEAD_HEIGHT = 30;

/** A tint for a player whose skin is not ready yet: a darker wanderer, for a moment. */
const PENDING_TINT = 0x6a6a6a;

/** The effect of an attack shows from tick FX_FROM of the attack, for FX_TICKS ticks, in FX_FRAMES frames. */
const FX_FROM = 1;
const FX_TICKS = 12;
const FX_FRAMES = 4;
/** The body's attack frame for each tick of the attack: a short wind-up, the blow, the follow-through, the return. */
const BODY_FRAME_ENDS = [2, 7, 13];
/** The colour of each effect (a spell takes the colour of the skin's orb when it has one). */
export const ATTACK_TINT: Readonly<Record<AttackStyle, number>> = {
  slash: 0xd8e0ea,
  thrust: 0xe0e8f0,
  bash: 0xd2c2a8,
  spell: 0xb57cff,
  flame: 0xffa040,
  miasma: 0x8fcf6a,
  palm: 0xffd890,
  punch: 0xeadfcf,
};
/** Effects that glow (added to what is under them), and give a little light. */
const GLOWING: ReadonlySet<AttackStyle> = new Set(['spell', 'flame', 'palm']);
/** A hit: the body flashes red for this long (ms); then it is a little grey while stunned. */
const HIT_FLASH_MS = 160;
const HIT_TINT = 0xff7060;
const DAZED_TINT = 0xb4aaa6;
/** The stars of a stun circle this high over the head, this wide. */
const STAR_COUNT = 3;
const STAR_TINT = 0xffe7a0;
/** In shallow water the figure sinks this far (world pixels), and its frame ends at the water line. */
const WADE_DEPTH = 5;
/** The ripple round a wader: one frame for this long (ms), faster while it walks. */
const RIPPLE_MS = 220;
const RIPPLE_WALK_MS = 120;

const FACINGS: readonly Facing[] = ['down', 'up', 'left', 'right'];

/** What the view needs of a player: the local PlayerState, or another player from Remotes. */
export interface PlayerPose {
  readonly vx: number;
  readonly vy: number;
  readonly facing: Facing;
  /** The direction of the attack (radians, as PlayerState.aim). None: the way it faces. */
  readonly aim?: number;
  /** Ticks left of an attack, of a stun, and of the guard after a stun (as in PlayerState; 0 or none: not now). */
  readonly attack?: number;
  readonly stun?: number;
  readonly guard?: number;
  /** Whether it stands in shallow water (inShallows). */
  readonly wading?: boolean;
}

/** The frames of one look of the player: a stand, a walk and an attack for each facing. */
export interface PlayerTextures {
  readonly stand: Readonly<Record<Facing, Texture>>;
  readonly walk: Readonly<Record<Facing, readonly Texture[]>>;
  readonly attack: Readonly<Record<Facing, readonly Texture[]>>;
  /** From the centre of the feet to just above the head or hat, in world pixels: speech goes there. */
  readonly headHeight: number;
}

/** The hooded wanderer of the atlas: the look of a player whose own skin is not ready. */
export function atlasPlayerTextures(art: Art): PlayerTextures {
  const stand = {} as Record<Facing, Texture>;
  const walk = {} as Record<Facing, Texture[]>;
  const attack = {} as Record<Facing, Texture[]>;
  for (const facing of FACINGS) {
    stand[facing] = art.frame(`player/${facing}/stand`);
    walk[facing] = art.animation(`walk/${facing}`);
    attack[facing] = art.variants(`player/${facing}/attack`);
  }
  return { stand, walk, attack, headHeight: ATLAS_HEAD_HEIGHT };
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
  /** The effect of an attack: behind the body when the player faces up, in front of it otherwise. */
  private readonly slash: Sprite;
  private readonly art: Art;
  /** The frames of the effect, for each drawn turn (fx/<style>/<turn>). */
  private slashFrames: Texture[][];
  private style: AttackStyle = 'punch';
  private tint = ATTACK_TINT.punch;
  private light: LightSource | null = null;
  private readonly stars: Sprite[] = [];
  private textures: PlayerTextures;
  private travelled = 0;
  private pending = false;
  private wasStunned = false;
  private hitAt = -Infinity;
  private readonly shadow: Sprite;
  /** The ripple round the legs of a wader, in front of the body. */
  private readonly ripple: Sprite;
  private readonly rippleFrames: Texture[];
  /** The anchor of every frame (the feet), and the frames cut at the water line, made once each. */
  private readonly anchor: { readonly x: number; readonly y: number };
  private readonly wadeFrames = new Map<Texture, Texture>();
  private wading = false;

  constructor(art: Art, textures: PlayerTextures, pending = false) {
    this.textures = textures;
    this.body = new Sprite(textures.stand.down);
    this.ghost = new Sprite(textures.stand.down);
    this.anchor = { x: this.body.anchor.x, y: this.body.anchor.y };
    this.ghost.alpha = PlayerView.GHOST_ALPHA;
    this.art = art;
    this.slashFrames = PlayerView.effectFrames(art, 'punch');
    this.slash = new Sprite(this.slashFrames[0]![0]);
    this.slash.visible = false;
    this.setAttackStyle('punch');
    this.shadow = new Sprite(art.frame('player/shadow'));
    this.rippleFrames = art.variants('fx/ripple');
    this.ripple = new Sprite(this.rippleFrames[0]);
    this.ripple.visible = false;
    this.root.addChild(this.shadow, this.body, this.slash, this.ripple);
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

  /** From the centre of the feet up to the chest, in world pixels: an attack starts there. */
  get chestHeight(): number {
    return Math.round(this.textures.headHeight * 0.45);
  }

  private static effectFrames(art: Art, style: AttackStyle): Texture[][] {
    return Array.from({ length: FX_TURNS }, (_, turn) => art.variants(`fx/${style}/${turn}`));
  }

  /** How this player attacks (its skin decides), and the colour of the effect. */
  setAttackStyle(style: AttackStyle, tint: number = ATTACK_TINT[style]): void {
    this.style = style;
    this.tint = tint;
    this.slashFrames = PlayerView.effectFrames(this.art, style);
    this.slash.tint = tint;
    this.slash.blendMode = GLOWING.has(style) ? 'add' : 'normal';
  }

  /** The light of a glowing effect (a spell, a flame, a palm) while it shows, or null. */
  get fxLight(): LightSource | null {
    return this.light;
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
    this.wading = state.wading === true;
    this.ghost.position.set(x, y + (this.wading ? WADE_DEPTH : 0));
    const now = performance.now();
    this.fight(state, now);

    const speed = Math.hypot(state.vx, state.vy);
    let texture: Texture;
    const attack = state.attack ?? 0;
    if (attack > 0) {
      // The attack frames, by the ticks since the attack started.
      const elapsed = ATTACK_TICKS - attack;
      const frame = BODY_FRAME_ENDS.findIndex((end) => elapsed < end);
      const frames = this.textures.attack[state.facing];
      texture = frames[Math.min(frames.length - 1, frame < 0 ? BODY_FRAME_ENDS.length : frame)]!;
      this.travelled = 0;
    } else if (speed < 1) {
      this.travelled = 0;
      texture = this.textures.stand[state.facing];
    } else {
      this.travelled += speed * seconds;
      const frames = this.textures.walk[state.facing];
      texture = frames[Math.floor(this.travelled / STRIDE) % frames.length]!;
    }
    // In shallow water: the figure lower, its frame cut at the water line, a ripple round it.
    const shown = this.wading ? this.wadeFrame(texture) : texture;
    const anchorY = this.wading ? (this.anchor.y * texture.height) / shown.height : this.anchor.y;
    for (const sprite of [this.body, this.ghost]) {
      sprite.texture = shown;
      sprite.anchor.set(this.anchor.x, anchorY);
    }
    this.shadow.visible = !this.wading;
    this.ripple.visible = this.wading;
    if (this.wading) this.ripple.texture = this.rippleFrames[Math.floor(now / (speed < 1 ? RIPPLE_MS : RIPPLE_WALK_MS)) % this.rippleFrames.length]!;
  }

  /** A frame without its rows below the water line: WADE_DEPTH above the feet. */
  private wadeFrame(texture: Texture): Texture {
    let cut = this.wadeFrames.get(texture);
    if (!cut) {
      const { x, y, width } = texture.frame;
      const height = Math.max(1, Math.round(this.anchor.y * texture.height) - WADE_DEPTH);
      cut = new Texture({ source: texture.source, frame: new Rectangle(x, y, width, height) });
      this.wadeFrames.set(texture, cut);
    }
    return cut;
  }

  /** The attack (an arc and a small lunge), a hit (a red flash), a stun (stars) and the guard after it (a blink). */
  private fight(state: PlayerPose, now: number): void {
    const attack = state.attack ?? 0;
    const stun = state.stun ?? 0;
    const elapsed = attack > 0 ? ATTACK_TICKS - attack : Infinity;
    // The effect: from the chest, in the direction of the attack (in 16 steps).
    this.slash.visible = elapsed >= FX_FROM && elapsed < FX_FROM + FX_TICKS;
    this.light = null;
    let lunge = 0;
    const place = fxPlacement(state.aim ?? facingAngle(state.facing));
    const fx = Math.cos(place.angle);
    const fy = Math.sin(place.angle);
    if (this.slash.visible) {
      const texture = this.slashFrames[place.turn]![Math.min(FX_FRAMES - 1, Math.floor(((elapsed - FX_FROM) / FX_TICKS) * FX_FRAMES))]!;
      this.slash.texture = texture;
      // Each frame is cropped to its pixels, so each has its own anchor.
      this.slash.anchor.copyFrom(texture.defaultAnchor ?? { x: 0, y: 0 });
      this.slash.rotation = place.rotation;
      this.slash.scale.x = place.mirror ? -1 : 1;
      this.slash.position.set(Math.round(fx * 3), -this.chestHeight + Math.round(fy > 0 ? fy * 4 : fy * 2));
      // Behind the body when the player faces away from the viewer.
      this.root.setChildIndex(this.slash, state.facing === 'up' ? 1 : 2);
      lunge = elapsed >= 2 && elapsed <= 8 ? 1 : 0;
    }
    if (this.slash.visible && GLOWING.has(this.style)) {
      this.light = { x: this.root.x + fx * 16, y: this.root.y - this.chestHeight + fy * 12, radius: 48, colour: this.tint, flicker: this.style === 'flame', seed: 31 };
    }
    // A hit: when a stun starts.
    if (stun > 0 && !this.wasStunned) this.hitAt = now;
    this.wasStunned = stun > 0;
    const sinceHit = now - this.hitAt;
    const sway = stun > 0 && sinceHit < 400 ? Math.round(Math.sin(sinceHit / 45)) : 0;
    this.body.position.set(Math.round(fx * lunge) + sway, Math.round(fy * lunge) + (this.wading ? WADE_DEPTH : 0));
    if (!this.pending) {
      this.body.tint = sinceHit < HIT_FLASH_MS ? HIT_TINT : stun > 0 ? DAZED_TINT : 0xffffff;
      this.ghost.tint = this.body.tint;
    }
    // The guard after a stun: the player blinks, so everyone sees that mobs cannot hit it now.
    this.body.alpha = (state.guard ?? 0) > 0 && Math.floor(now / 90) % 2 === 0 ? 0.45 : 1;
    // The stars of a stun, circling round the top of the head (under the name).
    this.overlay.visible = stun > 0;
    if (stun > 0) {
      const top = this.textures.headHeight - 2;
      this.stars.forEach((star, i) => {
        const angle = now / 160 + (i * 2 * Math.PI) / STAR_COUNT;
        star.position.set(this.root.x + Math.round(Math.cos(angle) * 6), this.root.y - top + Math.round(Math.sin(angle) * 2));
        star.alpha = 0.65 + 0.35 * Math.sin(now / 70 + i);
      });
    }
  }
}
