import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { ATTACK_TICKS, DOWN_TICKS, EVADE_TICKS, JUMPS, ROLLS, facingAngle, type Facing, type LoadTier } from '@game/engine';
import { FX_TURNS, fxPlacement, type AttackStyle } from '../../art/attacks.ts';
import type { Art } from '../assets.ts';
import type { LightSource } from './lighting.ts';

/** World pixels of travel for each walk frame: 8 frames make one 32-pixel cycle of two steps. */
const STRIDE = 4;
/** The same for the sneak walk: shorter strides. */
const SNEAK_STRIDE = 3;

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
  shoot: 0xe8e0d0,
};
/** The colour of an arrow in flight (render/arrows.ts). */
export const ARROW_TINT = 0xc8b48c;
/** A player that crouches (it sneaks) is a little darker (and its torch smaller: game.ts, others.ts). */
const SNEAK_TINT = 0x9a948e;
/** A poisoned player shows this green now and then. */
const POISON_TINT = 0x9cc48a;
/** A defeat shows the falling frame for this many ticks, then the lying one. */
const FALL_SWITCH = 10;
/** In an evade the figure also sways back from the way it struck, by at most this (world pixels). */
const EVADE_BACK = 2;
/** In a struggle (a shove of the sandbox) the figure changes its push this often (ms): a push, and a harder one. */
const STRUGGLE_BEAT_MS = 110;
/** In a jump from a brace the figure rises over its shadow on an arc, at most this high (world pixels). */
const JUMP_LIFT = 5;
/** Effects that glow (added to what is under them), and give a little light. */
const GLOWING: ReadonlySet<AttackStyle> = new Set(['spell', 'flame', 'palm']);
/** A hit: the body flashes red for this long (ms); then it is a little grey while stunned. */
const HIT_FLASH_MS = 160;
const HIT_TINT = 0xff7060;
const DAZED_TINT = 0xb4aaa6;
/** The stars of a stun circle this high over the head, this wide. */
const STAR_COUNT = 3;
const STAR_TINT = 0xffe7a0;
/** A glancing blow (Armour Class): a white spark at the chest, and the body pale as steel for a moment (ms). */
const GLANCE_TINT = 0xd8e2f0;
const GLANCE_FLASH_MS = 110;
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
  /** Ticks left of a dodge (a roll), and the kind of the roll or the jump (the tier of the load), as in PlayerState. */
  readonly dodge?: number;
  readonly dodgeKind?: LoadTier;
  /** Ticks left of a brace, of an evade and of a jump from a brace, as in PlayerState. */
  readonly brace?: number;
  /** Ticks left of a parry (a mechanic of the sandbox), as in PlayerState: it stands in its guard, the frame of a brace. */
  readonly parry?: number;
  /** Whether it holds its guard up (the guard stance of the sandbox): the frame of a brace, or the sneak walk when it walks. */
  readonly guarding?: boolean;
  /** Ticks left of a shove (the shove of the sandbox), as in PlayerState: it struggles with the mob. */
  readonly shove?: number;
  readonly evade?: number;
  readonly jump?: number;
  /** Whether it sneaks on purpose (a slow walk, or the sneak walk of C): it crouches (PlayerView.crouched). */
  readonly sneaking?: boolean;
  /** Ticks left of a defeat, as in PlayerState: it falls and lies. */
  readonly down?: number;
  /** Whether a poison is in it: it shows a sick green now and then. */
  readonly poisoned?: boolean;
  /** Ticks left of the spark of a glancing blow, as in PlayerState. */
  readonly glance?: number;
}

/**
 * The frames of one look of the player for each facing: a stand, a walk, an attack, a roll, a heavy
 * roll, a fall, a crouch, a sneak walk, a brace, an evade and a jump.
 */
export interface PlayerTextures {
  readonly stand: Readonly<Record<Facing, Texture>>;
  readonly walk: Readonly<Record<Facing, readonly Texture[]>>;
  readonly attack: Readonly<Record<Facing, readonly Texture[]>>;
  /** The frames of a roll (a dodge), and of a heavy roll (a low roll over one shoulder that ends on one knee). */
  readonly roll: Readonly<Record<Facing, readonly Texture[]>>;
  readonly heavyRoll: Readonly<Record<Facing, readonly Texture[]>>;
  /** The frames of a defeat: it falls, and it lies. */
  readonly fall: Readonly<Record<Facing, readonly Texture[]>>;
  /** A player that sneaks: the crouch at rest, and the frames of the sneak walk. */
  readonly crouch: Readonly<Record<Facing, Texture>>;
  readonly sneak: Readonly<Record<Facing, readonly Texture[]>>;
  /** A player that braces after its blow, and the frames of an evade (player.ts, BRACE_TICKS). */
  readonly brace: Readonly<Record<Facing, Texture>>;
  readonly evade: Readonly<Record<Facing, readonly Texture[]>>;
  /** The frames of a jump from a brace (player.ts, JUMPS): the spring, the hop, the reach for the ground. */
  readonly jump: Readonly<Record<Facing, readonly Texture[]>>;
  /** The frames of a struggle (a shove of the sandbox): a push, and a harder one. */
  readonly struggle: Readonly<Record<Facing, readonly Texture[]>>;
  /** From the centre of the feet to just above the head or hat, in world pixels: speech goes there. */
  readonly headHeight: number;
}

/** The hooded wanderer of the atlas: the look of a player whose own skin is not ready. */
export function atlasPlayerTextures(art: Art): PlayerTextures {
  const stand = {} as Record<Facing, Texture>;
  const walk = {} as Record<Facing, Texture[]>;
  const attack = {} as Record<Facing, Texture[]>;
  const roll = {} as Record<Facing, Texture[]>;
  const heavyRoll = {} as Record<Facing, Texture[]>;
  const fall = {} as Record<Facing, Texture[]>;
  const crouch = {} as Record<Facing, Texture>;
  const sneak = {} as Record<Facing, Texture[]>;
  const brace = {} as Record<Facing, Texture>;
  const evade = {} as Record<Facing, Texture[]>;
  const jump = {} as Record<Facing, Texture[]>;
  const struggle = {} as Record<Facing, Texture[]>;
  for (const facing of FACINGS) {
    stand[facing] = art.frame(`player/${facing}/stand`);
    walk[facing] = art.animation(`walk/${facing}`);
    attack[facing] = art.variants(`player/${facing}/attack`);
    roll[facing] = art.variants(`player/${facing}/roll`);
    heavyRoll[facing] = art.variants(`player/${facing}/heavyroll`);
    fall[facing] = art.variants(`player/${facing}/fall`);
    crouch[facing] = art.frame(`player/${facing}/crouch`);
    sneak[facing] = art.variants(`player/${facing}/sneak`);
    brace[facing] = art.frame(`player/${facing}/brace`);
    evade[facing] = art.variants(`player/${facing}/evade`);
    jump[facing] = art.variants(`player/${facing}/jump`);
    struggle[facing] = art.variants(`player/${facing}/struggle`);
  }
  return { stand, walk, attack, roll, heavyRoll, fall, crouch, sneak, brace, evade, jump, struggle, headHeight: ATLAS_HEAD_HEIGHT };
}

/**
 * Shows one player. The walk animation advances with the distance moved, not with time, so
 * a slow joystick push gives a slow walk. The textures can change at any time (a skin that has
 * just been rendered); the sprite keeps its place, because every frame is anchored at the feet.
 * A player that sneaks on purpose crouches: the sneak walk, and the crouch when it stops (see
 * `crouched`).
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
  /** What shows above the darkness: the stars of a stun, the spark of a glancing blow. The owner puts it in a layer above the lights. */
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
  private readonly spark: Sprite;
  private wasGlanced = false;
  private glanceAt = -Infinity;
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
  private crouch = false;
  /** How high a jump lifts the figure now (world pixels). */
  private lift = 0;

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
    this.spark = new Sprite(art.frame('pile/glint'));
    this.spark.anchor.set(0.5);
    this.overlay.addChild(this.spark);
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

  /**
   * Whether it crouches: from the start of a sneak walk (PlayerPose.sneaking) until it walks on
   * without a sneak, strikes, rolls, falls, takes a hit or wades. So a player that stops after a
   * sneak walk stays in the crouch. The page shows a crouch as sneaking on purpose: a smaller torch.
   */
  get crouched(): boolean {
    return this.crouch;
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
    const jump = state.jump ?? 0;
    const jumpTicks = JUMPS[state.dodgeKind ?? 'light'].ticks;
    // A jump rises over the shadow on an arc, and lands.
    this.lift = jump > 0 ? Math.round(JUMP_LIFT * Math.sin((Math.PI * (jumpTicks - jump)) / jumpTicks)) : 0;
    this.ghost.position.set(x, y + (this.wading ? WADE_DEPTH : 0) - this.lift);
    const now = performance.now();
    const speed = Math.hypot(state.vx, state.vy);
    const attack = state.attack ?? 0;
    const dodge = state.dodge ?? 0;
    const down = state.down ?? 0;
    const brace = state.brace ?? 0;
    const evade = state.evade ?? 0;
    if (attack > 0 || dodge > 0 || down > 0 || brace > 0 || evade > 0 || jump > 0 || (state.stun ?? 0) > 0 || this.wading || state.guarding || (state.shove ?? 0) > 0) this.crouch = false;
    else if (state.sneaking) this.crouch = true;
    else if (speed >= 1) this.crouch = false;
    this.fight(state, now);

    let texture: Texture;
    if (down > 0) {
      // A defeat: it falls back, then lies.
      const frames = this.textures.fall[state.facing];
      texture = frames[DOWN_TICKS - down < FALL_SWITCH ? 0 : frames.length - 1]!;
      this.travelled = 0;
    } else if (dodge > 0) {
      // The roll of its load, by the ticks since the dodge started: a roll, a heavy roll, or a step
      // aside (an overloaded character: the frames of an evade).
      const kind = state.dodgeKind ?? 'light';
      const frames = (kind === 'heavy' ? this.textures.heavyRoll : kind === 'over' ? this.textures.evade : this.textures.roll)[state.facing];
      const ticks = ROLLS[kind].ticks;
      texture = frames[Math.min(frames.length - 1, Math.floor(((ticks - 1 - dodge) * frames.length) / (ticks - 1)))]!;
      this.travelled = 0;
    } else if (jump > 0) {
      // A jump from a brace, by the ticks since it started: the spring, the hop, the reach for the ground.
      const frames = this.textures.jump[state.facing];
      texture = frames[Math.min(frames.length - 1, Math.floor(((jumpTicks - 1 - jump) * frames.length) / (jumpTicks - 1)))]!;
      this.travelled = 0;
    } else if (evade > 0) {
      // The evade, by the ticks since it started: out of the blow, and back.
      const frames = this.textures.evade[state.facing];
      texture = frames[Math.min(frames.length - 1, Math.floor(((EVADE_TICKS - evade) * frames.length) / EVADE_TICKS))]!;
      this.travelled = 0;
    } else if (brace > 0 || (state.parry ?? 0) > 0 || (state.guarding && speed < 1)) {
      texture = this.textures.brace[state.facing];
      this.travelled = 0;
    } else if ((state.shove ?? 0) > 0) {
      // A struggle: a push and a harder one, by turns.
      const frames = this.textures.struggle[state.facing];
      texture = frames[Math.floor(now / STRUGGLE_BEAT_MS) % frames.length]!;
      this.travelled = 0;
    } else if (state.guarding) {
      // A guard that walks: the frames of the sneak walk (the knees bent, the arms forward).
      this.travelled += speed * seconds;
      const frames = this.textures.sneak[state.facing];
      texture = frames[Math.floor(this.travelled / SNEAK_STRIDE) % frames.length]!;
    } else if (attack > 0) {
      // The attack frames, by the ticks since the attack started.
      const elapsed = ATTACK_TICKS - attack;
      const frame = BODY_FRAME_ENDS.findIndex((end) => elapsed < end);
      const frames = this.textures.attack[state.facing];
      texture = frames[Math.min(frames.length - 1, frame < 0 ? BODY_FRAME_ENDS.length : frame)]!;
      this.travelled = 0;
    } else if (speed < 1) {
      this.travelled = 0;
      texture = (this.crouch ? this.textures.crouch : this.textures.stand)[state.facing];
    } else {
      this.travelled += speed * seconds;
      const frames = (this.crouch ? this.textures.sneak : this.textures.walk)[state.facing];
      texture = frames[Math.floor(this.travelled / (this.crouch ? SNEAK_STRIDE : STRIDE)) % frames.length]!;
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

  /**
   * The attack (an arc and a small lunge), a hit (a red flash), a stun (stars) and the guard after
   * it (a blink), and a glancing blow (a spark, and a pale flash).
   */
  private fight(state: PlayerPose, now: number): void {
    // A parry is no blow: no effect, no lunge.
    const attack = (state.parry ?? 0) > 0 ? 0 : (state.attack ?? 0);
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
    const glance = state.glance ?? 0;
    if (glance > 0 && !this.wasGlanced) this.glanceAt = now;
    this.wasGlanced = glance > 0;
    const sinceGlance = now - this.glanceAt;
    const sway = stun > 0 && sinceHit < 400 ? Math.round(Math.sin(sinceHit / 45)) : 0;
    // An evade: the body goes back from the way it struck and comes again, where it stands.
    const evade = state.evade ?? 0;
    const back = evade > 0 ? -EVADE_BACK * Math.sin((Math.PI * (EVADE_TICKS - evade + 1)) / (EVADE_TICKS + 1)) : 0;
    const aim = state.aim ?? facingAngle(state.facing);
    this.body.position.set(Math.round(fx * lunge + Math.cos(aim) * back) + sway, Math.round(fy * lunge + Math.sin(aim) * back) + (this.wading ? WADE_DEPTH : 0) - this.lift);
    if (!this.pending) {
      const sick = state.poisoned && Math.floor(now / 400) % 3 === 0;
      this.body.tint =
        sinceHit < HIT_FLASH_MS ? HIT_TINT : stun > 0 ? DAZED_TINT : sinceGlance < GLANCE_FLASH_MS ? GLANCE_TINT : sick ? POISON_TINT : this.crouch ? SNEAK_TINT : 0xffffff;
      this.ghost.tint = this.body.tint;
    }
    // The guard after a stun: the player blinks, so everyone sees that mobs cannot hit it now.
    this.body.alpha = (state.guard ?? 0) > 0 && Math.floor(now / 90) % 2 === 0 ? 0.45 : 1;
    // The stars of a stun, circling round the top of the head (under the name).
    this.overlay.visible = stun > 0 || glance > 0;
    for (const star of this.stars) star.visible = stun > 0;
    // The spark of a glancing blow, at the chest on the side that the player faces; it fades.
    this.spark.visible = glance > 0;
    if (glance > 0) {
      const side = state.facing === 'left' ? -1 : state.facing === 'right' ? 1 : 0;
      this.spark.position.set(this.root.x + side * 4, this.root.y - this.chestHeight + (state.facing === 'up' ? -2 : 1));
      this.spark.alpha = Math.min(1, glance / 8);
    }
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
