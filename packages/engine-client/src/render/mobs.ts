import { Container, Sprite, Texture } from 'pixi.js';
import { MOB_STATS, type Facing, type MobKind, type MobState } from '@game/engine';
import atlasData from '../generated/atlas.json';
import type { Art } from '../assets.ts';

/** What the view needs of a mob: a Mob of a local horde, or one from the server. */
export interface MobLook {
  readonly id: number;
  readonly kind: MobKind;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly facing: Facing;
  readonly state: MobState;
  readonly stateMs: number;
  /** The blows that it can still take (for the debug panel). */
  readonly health?: number;
}

/** World pixels of travel for each walk frame. */
const STRIDE: Readonly<Record<MobKind, number>> = { imp: 3, brute: 5 };
/** The glow of the eyes, above the darkness. */
const EYE_GLOW: Readonly<Record<MobKind, number>> = { imp: 0xffa040, brute: 0xff4a2a };
/** The death: the frames play over this share of the death; the body fades out over the end. */
const DIE_FRAMES_SHARE = 0.6;
const FADE_FROM = 0.55;
/** The white flash of a blow, at the start of a death or a reel (ms). */
const FLASH_MS = 110;
/** Ash and embers that rise from a dead mob. */
const ASH = { count: 14, ms: 1100 } as const;

const eyesOf = (atlasData.meta as unknown as { mobEyes: Record<string, number[]> }).mobEyes;

interface Mote {
  readonly sprite: Sprite;
  x: number;
  y: number;
  readonly vx: number;
  readonly vy: number;
  readonly born: number;
  readonly life: number;
}

interface MobView {
  readonly root: Container;
  readonly body: Sprite;
  /** The body again, white and added: the flash of the blow. */
  readonly flash: Sprite;
  readonly shadow: Sprite;
  /** The eye pixels, above the darkness. */
  readonly eyes: Container;
  kind: MobKind;
  travelled: number;
  /** When it died (local ms), for the ash; null while it lives. */
  diedAt: number | null;
  seen: boolean;
}

/**
 * Draws the mobs: a frame for the state (stand, walk, wind-up, blow, death), its shadow, the
 * glow of its eyes above the darkness, and the ash of a death. A mob that is gone from the list
 * goes at once; a dying one plays its death and fades.
 */
export class MobViews {
  private readonly art: Art;
  private readonly layer: Container;
  private readonly glowLayer: Container;
  private readonly views = new Map<number, MobView>();
  private readonly motes: Mote[] = [];
  private readonly frames = new Map<string, Texture[]>();
  /** The atlas name of each frame texture: the eye pixels are listed by it. */
  private readonly names = new Map<Texture, string>();

  constructor(art: Art, entityLayer: Container, glowLayer: Container) {
    this.art = art;
    this.layer = entityLayer;
    this.glowLayer = glowLayer;
  }

  /** The number of mobs that are drawn. */
  get count(): number {
    return this.views.size;
  }

  /** Shows the mobs of this frame (their ids keep their views). */
  update(mobs: readonly MobLook[], now: number, seconds: number): void {
    for (const view of this.views.values()) view.seen = false;
    for (const mob of mobs) {
      let view = this.views.get(mob.id);
      if (!view) view = this.add(mob);
      view.seen = true;
      this.place(view, mob, now, seconds);
    }
    for (const [id, view] of this.views) {
      if (view.seen) continue;
      view.root.destroy({ children: true });
      view.eyes.destroy({ children: true });
      this.views.delete(id);
    }
    this.updateMotes(now, seconds);
  }

  private add(mob: MobLook): MobView {
    const root = new Container();
    const shadow = new Sprite(this.art.frame(`mob/${mob.kind}/shadow`));
    const body = new Sprite(this.frame(mob.kind, mob.facing, 'stand', 0));
    const flash = new Sprite(body.texture);
    flash.tint = 0xffffff;
    flash.blendMode = 'add';
    flash.visible = false;
    root.addChild(shadow, body, flash);
    this.layer.addChild(root);
    const eyes = new Container();
    eyes.blendMode = 'add';
    this.glowLayer.addChild(eyes);
    const view: MobView = { root, body, flash, shadow, eyes, kind: mob.kind, travelled: 0, diedAt: null, seen: true };
    this.views.set(mob.id, view);
    return view;
  }

  /** The textures of `mob/<kind>/<facing>/<name>/<i>` (or the single frames `.../stand` and `.../hurt`). */
  private frame(kind: MobKind, facing: Facing, name: string, index: number): Texture {
    const key = `${kind}/${facing}/${name}`;
    let list = this.frames.get(key);
    if (!list) {
      const single = name === 'stand' || name === 'hurt';
      list = single ? [this.art.frame(`mob/${key}`)] : this.art.variants(`mob/${key}`);
      this.frames.set(key, list);
      list.forEach((texture, i) => this.names.set(texture, single ? `mob/${key}` : `mob/${key}/${i}`));
    }
    return list[Math.max(0, Math.min(list.length - 1, index))]!;
  }

  private place(view: MobView, mob: MobLook, now: number, seconds: number): void {
    const stats = MOB_STATS[mob.kind];
    let name = 'stand';
    let index = 0;
    let alpha = 1;
    switch (mob.state) {
      case 'windup':
        name = 'windup';
        index = mob.stateMs < stats.windupMs * 0.45 ? 0 : 1;
        break;
      case 'strike':
        name = mob.stateMs < stats.strikeMs * 0.7 ? 'strike' : 'windup';
        index = mob.stateMs < stats.strikeMs * 0.3 ? 0 : 1;
        if (name === 'windup') index = 0;
        break;
      case 'hurt':
        // It reels back from the blow, then stands for a moment before it comes on again.
        name = mob.stateMs < stats.hurtMs * 0.75 ? 'hurt' : 'stand';
        break;
      case 'dying': {
        const t = mob.stateMs / stats.deathMs;
        name = 'die';
        index = Math.floor((t / DIE_FRAMES_SHARE) * 6);
        alpha = t < FADE_FROM ? 1 : Math.max(0, 1 - (t - FADE_FROM) / (1 - FADE_FROM));
        if (view.diedAt === null) {
          view.diedAt = now - mob.stateMs;
          this.ash(mob);
        }
        break;
      }
      default: {
        const speed = Math.hypot(mob.vx, mob.vy);
        if (speed > 1) {
          view.travelled += speed * seconds;
          name = 'walk';
          index = Math.floor(view.travelled / STRIDE[mob.kind]) % 6;
        } else {
          view.travelled = 0;
        }
      }
    }
    const texture = this.frame(mob.kind, mob.facing, name, index);
    const x = Math.round(mob.x);
    const y = Math.round(mob.y);
    view.root.position.set(x, y);
    view.root.zIndex = mob.y;
    view.body.texture = texture;
    view.body.alpha = alpha;
    view.shadow.alpha = alpha;
    const flashing = (mob.state === 'dying' || mob.state === 'hurt') && mob.stateMs < FLASH_MS;
    view.flash.visible = flashing;
    if (flashing) {
      view.flash.texture = texture;
      view.flash.alpha = 0.85 * (1 - mob.stateMs / FLASH_MS);
    }
    this.placeEyes(view, mob, texture, x, y, name === 'die' && index > 0 ? 0 : alpha);
  }

  /** Puts a glowing pixel (and a dim halo) on each eye pixel of the frame. */
  private placeEyes(view: MobView, mob: MobLook, texture: Texture, x: number, y: number, alpha: number): void {
    const pixels = alpha > 0 ? (eyesOf[this.names.get(texture) ?? ''] ?? []) : [];
    const count = pixels.length / 2;
    const sprites = view.eyes.children as Sprite[];
    while (sprites.length < count * 2) {
      const sprite = new Sprite(Texture.WHITE);
      sprite.tint = EYE_GLOW[mob.kind];
      view.eyes.addChild(sprite);
    }
    const left = x - Math.round(texture.defaultAnchor!.x * texture.width);
    const top = y - Math.round(texture.defaultAnchor!.y * texture.height);
    sprites.forEach((sprite, i) => {
      const k = i >> 1;
      sprite.visible = k < count;
      if (!sprite.visible) return;
      const px = left + pixels[k * 2]!;
      const py = top + pixels[k * 2 + 1]!;
      if (i % 2 === 0) {
        // The eye itself: one pixel.
        sprite.width = 1;
        sprite.height = 1;
        sprite.position.set(px, py);
        sprite.alpha = alpha;
      } else {
        // A faint halo round it.
        sprite.width = 3;
        sprite.height = 3;
        sprite.position.set(px - 1, py - 1);
        sprite.alpha = 0.22 * alpha;
      }
    });
  }

  /** Ash and a few embers rise from the body. */
  private ash(mob: MobLook): void {
    const height = mob.kind === 'imp' ? 14 : 30;
    const width = mob.kind === 'imp' ? 8 : 16;
    let seed = (mob.id * 2654435761) >>> 0;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const count = mob.kind === 'imp' ? ASH.count : ASH.count * 2;
    for (let i = 0; i < count; i++) {
      const ember = rand() < 0.3;
      const sprite = new Sprite(Texture.WHITE);
      sprite.width = 1;
      sprite.height = 1;
      sprite.tint = ember ? (rand() < 0.5 ? 0xff7a2a : 0xffb050) : rand() < 0.5 ? 0x3a3532 : 0x5a524c;
      if (ember) sprite.blendMode = 'add';
      (ember ? this.glowLayer : this.layer).addChild(sprite);
      if (!ember) sprite.zIndex = mob.y + 1;
      this.motes.push({
        sprite,
        x: mob.x + (rand() - 0.5) * width,
        y: mob.y - rand() * height,
        vx: (rand() - 0.5) * 10,
        vy: -6 - rand() * 14,
        born: performance.now() + rand() * 300,
        life: ASH.ms * (0.5 + rand() * 0.5),
      });
    }
  }

  private updateMotes(now: number, seconds: number): void {
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const mote = this.motes[i]!;
      const age = now - mote.born;
      if (age > mote.life) {
        mote.sprite.destroy();
        this.motes.splice(i, 1);
        continue;
      }
      if (age < 0) {
        mote.sprite.visible = false;
        continue;
      }
      mote.sprite.visible = true;
      mote.x += mote.vx * seconds;
      mote.y += mote.vy * seconds;
      mote.sprite.position.set(Math.round(mote.x), Math.round(mote.y));
      mote.sprite.alpha = 1 - age / mote.life;
    }
  }
}
