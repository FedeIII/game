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
  /** The health points that it has left (the debug panel; the health bar of INT 13). */
  readonly health?: number;
  /** In a rite (state 'rite'): the runes that it has left. */
  readonly runes?: number;
  /** While its weapon burns (a Devastator's rite). */
  readonly burning?: number;
}

/** The health bar of a mob (read the foe, INT 13): this wide, this far over its head (world pixels), in these colours. */
const BAR = { width: 12, gap: 3, back: 0x2a0c0c, fill: 0xc0302a } as const;
/** The glint of a wind-up (INT 15): it blinks at this rate (ms). */
const GLINT_BLINK_MS = 90;
/** From the feet to the top of the head of each kind (world pixels): the bar and the glint go there. */
const HEAD: Readonly<Record<MobKind, number>> = { imp: 17, brute: 33, goblin: 22, worg: 20, hobgoblin: 27, bugbear: 36, devastator: 29 };

/** From the feet to the top of the head of a mob of this kind (world pixels): numbers and bars go over it. */
export function mobHead(kind: MobKind): number {
  return HEAD[kind];
}

/** World pixels of travel for each walk frame. */
const STRIDE: Readonly<Record<MobKind, number>> = { imp: 3, brute: 5, goblin: 3, worg: 6, hobgoblin: 4, bugbear: 5, devastator: 4 };
/** The glow of the eyes, above the darkness. */
const EYE_GLOW: Readonly<Record<MobKind, number>> = { imp: 0xffa040, brute: 0xff4a2a, goblin: 0xffd040, worg: 0xffe27a, hobgoblin: 0xff6a20, bugbear: 0xff8a30, devastator: 0xff7a2a };
/** The ash of a death: how tall and wide the body is (world pixels), and how many motes rise from it. */
const ASH_SIZE: Readonly<Record<MobKind, { readonly height: number; readonly width: number; readonly count: number }>> = {
  imp: { height: 14, width: 8, count: 14 },
  brute: { height: 30, width: 16, count: 28 },
  goblin: { height: 16, width: 8, count: 14 },
  worg: { height: 14, width: 22, count: 22 },
  hobgoblin: { height: 24, width: 12, count: 20 },
  bugbear: { height: 32, width: 16, count: 28 },
  devastator: { height: 26, width: 12, count: 24 },
};
/**
 * The circle of a rite on the ground (Rite): RING_DOTS points that light up round it as the rite
 * goes on, and its runes, lit while they are whole and dark when a blow broke them.
 */
const RING_DOTS = 120;
const RING = { lit: 0xff7a2a, dim: 0x8a3414, rune: 0xffc070, broken: 0x4a1a0c } as const;
/** A rune: a diamond of 5 x 5 pixels round a bright middle (offsets from its centre). */
const RUNE: readonly (readonly [number, number])[] = [
  [0, -2],
  [1, -1],
  [2, 0],
  [1, 1],
  [0, 2],
  [-1, 1],
  [-2, 0],
  [-1, -1],
  [0, 0],
];
/** The embers of a burning weapon: about this many each second, from the upper body. */
const BURN_EMBERS = 14;
/** A rider (state 'ride') sits this far up, on the back of its worg (world pixels). */
const RIDE_LIFT = 9;
/** The death: the frames play over this share of the death; the body fades out over the end. */
const DIE_FRAMES_SHARE = 0.6;
const FADE_FROM = 0.55;
/** The white flash of a blow, at the start of a death or a reel (ms). */
const FLASH_MS = 110;
/** Ash and embers that rise from a dead mob: for this long (ms). */
const ASH = { ms: 1100 } as const;

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
  /** The health bar and the glint of a wind-up, above the darkness (Intelligence). */
  readonly bar: Container;
  readonly barFill: Sprite;
  readonly glint: Sprite;
  /** The circle of a rite (a caster only), above the darkness. */
  ring: Container | null;
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
  /** When a blow of this page touched a mob (performance.now): it flashes at once, before the server's word (its dice). */
  private readonly touches = new Map<number, number>();
  private readonly motes: Mote[] = [];
  private readonly frames = new Map<string, Texture[]>();
  /** The atlas name of each frame texture: the eye pixels are listed by it. */
  private readonly names = new Map<Texture, string>();
  /** What the player reads of a mob (Intelligence): its health (INT 13), and its wind-up (INT 15). */
  private readHealth = false;
  private readOpening = false;

  /** Sets what the player reads of the mobs: a health bar over each one, and a glint on a wind-up. */
  setReading(health: boolean, opening: boolean): void {
    this.readHealth = health;
    this.readOpening = opening;
  }

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
      view.bar.destroy({ children: true });
      view.glint.destroy();
      view.ring?.destroy({ children: true });
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
    const bar = new Container();
    const back = new Sprite(Texture.WHITE);
    back.tint = BAR.back;
    back.width = BAR.width + 2;
    back.height = 3;
    const barFill = new Sprite(Texture.WHITE);
    barFill.tint = BAR.fill;
    barFill.position.set(1, 1);
    barFill.height = 1;
    bar.addChild(back, barFill);
    bar.visible = false;
    const glint = new Sprite(this.art.frame('fx/star'));
    glint.visible = false;
    this.glowLayer.addChild(bar, glint);
    const view: MobView = { root, body, flash, shadow, eyes, kind: mob.kind, travelled: 0, diedAt: null, seen: true, bar, barFill, glint, ring: null };
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
      case 'ride':
        // On the back of its worg: it stands there, raised (below).
        name = 'stand';
        break;
      case 'rite':
        // The staff high over its head; it sways as it chants.
        name = 'windup';
        index = Math.floor(mob.stateMs / 420) % 2 === 0 ? 1 : 0;
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
    const riding = mob.state === 'ride';
    const y = Math.round(mob.y) - (riding ? RIDE_LIFT : 0);
    view.root.position.set(x, y);
    // A rider is drawn over its mount, and its shadow is the mount's.
    view.root.zIndex = mob.y + (riding ? 1 : 0);
    view.shadow.visible = !riding;
    view.body.texture = texture;
    view.body.alpha = alpha;
    view.shadow.alpha = alpha;
    const touched = this.touches.get(mob.id);
    const flashing = ((mob.state === 'dying' || mob.state === 'hurt') && mob.stateMs < FLASH_MS) || (touched !== undefined && performance.now() - touched < FLASH_MS);
    view.flash.visible = flashing;
    if (flashing) {
      view.flash.texture = texture;
      view.flash.alpha = 0.85 * (1 - mob.stateMs / FLASH_MS);
    }
    this.placeEyes(view, mob, texture, x, y, name === 'die' && index > 0 ? 0 : alpha);
    // What the player reads of it (Intelligence): its health over its head, and a glint in its wind-up.
    const top = y - HEAD[mob.kind];
    const living = mob.state !== 'dying' && mob.health !== undefined;
    view.bar.visible = this.readHealth && living;
    if (view.bar.visible) {
      view.bar.position.set(x - Math.floor(BAR.width / 2) - 1, top - BAR.gap - 3);
      view.barFill.width = Math.max(0, Math.round((BAR.width * mob.health!) / stats.health));
    }
    view.glint.visible = this.readOpening && mob.state === 'windup' && Math.floor(now / GLINT_BLINK_MS) % 2 === 0;
    if (view.glint.visible) view.glint.position.set(x + 6, top + 3);
    this.placeRing(view, mob, x, Math.round(mob.y), now);
    // A burning weapon throws embers up from the upper body.
    if (mob.burning && mob.state !== 'dying' && Math.random() < BURN_EMBERS * seconds) this.ember(mob.x + (Math.random() - 0.5) * 10, mob.y - HEAD[mob.kind] * (0.35 + Math.random() * 0.4));
  }

  /** The circle of a rite round a caster: its dots light up as the rite goes on; its runes go dark when blows break them. */
  private placeRing(view: MobView, mob: MobLook, x: number, y: number, now: number): void {
    const rite = MOB_STATS[mob.kind].rite;
    const show = rite !== undefined && mob.state === 'rite';
    if (!show) {
      if (view.ring) view.ring.visible = false;
      return;
    }
    if (!view.ring) {
      view.ring = new Container();
      view.ring.blendMode = 'add';
      for (let i = 0; i < RING_DOTS + rite.runes * RUNE.length; i++) {
        const dot = new Sprite(Texture.WHITE);
        dot.width = 1;
        dot.height = 1;
        view.ring.addChild(dot);
      }
      this.glowLayer.addChild(view.ring);
    }
    view.ring.visible = true;
    view.ring.position.set(x, y);
    const dots = view.ring.children as Sprite[];
    const progress = Math.min(1, mob.stateMs / rite.ms);
    const pulse = 0.6 + 0.4 * Math.sin(now / 140);
    for (let i = 0; i < RING_DOTS; i++) {
      const a = (i / RING_DOTS) * 2 * Math.PI - Math.PI / 2;
      const dot = dots[i]!;
      dot.position.set(Math.round(Math.cos(a) * rite.radius), Math.round(Math.sin(a) * rite.radius));
      const lit = i / RING_DOTS < progress;
      dot.tint = lit ? RING.lit : RING.dim;
      dot.alpha = lit ? pulse : 0.55;
      // A lit dot is 2 x 2 pixels: the part of the rite that is done.
      dot.width = lit ? 2 : 1;
      dot.height = lit ? 2 : 1;
    }
    // The runes: small crosses, evenly round the circle.
    const runes = mob.runes ?? 0;
    for (let r = 0; r < rite.runes; r++) {
      const a = (r / rite.runes) * 2 * Math.PI - Math.PI / 2;
      const cx = Math.round(Math.cos(a) * rite.radius);
      const cy = Math.round(Math.sin(a) * rite.radius);
      const whole = r < runes;
      RUNE.forEach(([dx, dy], k) => {
        const dot = dots[RING_DOTS + r * RUNE.length + k]!;
        dot.position.set(cx + dx, cy + dy);
        dot.tint = whole ? RING.rune : RING.broken;
        dot.alpha = whole ? (k === RUNE.length - 1 ? 1 : pulse) : 0.7;
      });
    }
  }

  /** One ember that rises and fades (a burning weapon). */
  private ember(x: number, y: number): void {
    const sprite = new Sprite(Texture.WHITE);
    sprite.width = 1;
    sprite.height = 1;
    sprite.tint = Math.random() < 0.5 ? 0xff7a2a : 0xffb050;
    sprite.blendMode = 'add';
    this.glowLayer.addChild(sprite);
    this.motes.push({ sprite, x, y, vx: (Math.random() - 0.5) * 8, vy: -10 - Math.random() * 12, born: performance.now(), life: 500 + Math.random() * 400 });
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

  /** A blow of this page touched the mob: it flashes now. The server's dice decide what the blow did. */
  touch(id: number, now: number): void {
    this.touches.set(id, now);
    if (this.touches.size > 64) for (const [key, at] of this.touches) if (now - at > 1000) this.touches.delete(key);
  }

  /** Ash and a few embers rise from the body. */
  private ash(mob: MobLook): void {
    const { height, width, count } = ASH_SIZE[mob.kind];
    let seed = (mob.id * 2654435761) >>> 0;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
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
