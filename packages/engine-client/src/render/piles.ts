import { Container, Sprite, type Texture } from 'pixi.js';
import type { ItemKind, Pile, Toss } from '@game/engine';
import type { Art } from '../assets.ts';

/** More of a stack shows as more copies of the item: 2 or more two, 5 or more three; each copy this far from the first. */
const HEAP: readonly (readonly [number, number, number])[] = [
  [1, 0, 0],
  [2, -3, -1],
  [5, 3, -2],
];
/** The spark over a pile, in gold; it shows for GLINT_MS once every GLINT_EVERY_MS, at another moment for each pile. */
const GLINT_TINT = 0xf0d890;
const GLINT_EVERY_MS = 2600;
const GLINT_MS = 420;
/** The spark sits this far above the point of the pile (world pixels). */
const GLINT_HEIGHT = 7;
/**
 * The shine of a pile: a copy of its items, added to their light, comes and goes for SHINE_MS once
 * every SHINE_EVERY_MS, at another moment for each pile. At most SHINE_ALPHA: very faint, so that
 * only a player who looks at the pile sees it.
 */
const SHINE_EVERY_MS = 4700;
const SHINE_MS = 1900;
const SHINE_ALPHA = 0.22;
/** A toss starts this high over the feet of the one who drops it: its hands (world pixels). */
const TOSS_LIFT = 12;
/** A toss takes TOSS_MS, and TOSS_MS_PER_PIXEL more for each pixel from where it starts to the pile, at most TOSS_MAX_MS. */
const TOSS_MS = 230;
const TOSS_MS_PER_PIXEL = 4;
const TOSS_MAX_MS = 460;
/** The arc of a toss goes this much over the straight fall, and TOSS_ARC_PER_PIXEL more for each pixel of the way. */
const TOSS_ARC = 4;
const TOSS_ARC_PER_PIXEL = 0.12;
/** After it lands, the item hops once: this high (world pixels), for this long (ms). */
const BOUNCE_HEIGHT = 2;
const BOUNCE_MS = 150;

interface PileView {
  readonly root: Container;
  /** The shine: copies of the items without their shadows, added to the light of the pile. */
  readonly shine: Container;
  readonly glint: Sprite;
  key: string;
}

/** Items in the air, from where they were dropped to their pile. */
interface Flight {
  readonly pile: number;
  readonly fromX: number;
  readonly fromY: number;
  readonly start: number;
  /** The sprites, when the flight knows its pile; null before. */
  item: Sprite | null;
  shadow: Sprite | null;
}

/** How long a toss of `distance` pixels stays in the air (ms). */
function tossMs(distance: number): number {
  return Math.min(TOSS_MAX_MS, TOSS_MS + distance * TOSS_MS_PER_PIXEL);
}

/**
 * The items on the ground (piles.ts): each pile is its item, small (`pile/<kind>`), on the layer
 * between the ground and the depth-sorted things, so everything that stands (a wall, a tree, a
 * player) draws over it. More of a stack shows as two or three copies. A small gold spark over
 * each pile, now and then, shows it in the dark: it is above the darkness, so only for a pile
 * that the player can see (outside, or in the house where the player is). Now and then a pile
 * also shines a little, so faintly that a player sees it only when it looks at the pile.
 *
 * A toss (Piles.takeTosses(), or `ts` in a snapshot) shows the items fly: from the hands of the
 * one who dropped them (or out of a mob that died), on an arc, onto the ground, with one small hop.
 * The item in the air is depth-sorted with everything that stands, and its shadow moves on the
 * ground under it. A new pile shows when its items land.
 */
export class PileViews {
  private readonly frames = new Map<string, Texture>();
  private readonly art: Art;
  private readonly layer: Container;
  private readonly entityLayer: Container;
  private readonly glowLayer: Container;
  private readonly glintFrame: Texture;
  private readonly views = new Map<number, PileView>();
  private flights: Flight[] = [];

  /** `layer`: on the ground; `entityLayer`: depth-sorted, for items in the air; `glowLayer`: above the darkness. */
  constructor(art: Art, layer: Container, entityLayer: Container, glowLayer: Container) {
    this.art = art;
    this.layer = layer;
    this.entityLayer = entityLayer;
    this.glowLayer = glowLayer;
    this.glintFrame = art.frame('pile/glint');
  }

  private frame(name: string): Texture {
    let texture = this.frames.get(name);
    if (!texture) {
      texture = this.art.frame(name);
      this.frames.set(name, texture);
    }
    return texture;
  }

  private sprite(name: string): Sprite {
    const texture = this.frame(name);
    const sprite = new Sprite(texture);
    sprite.anchor.copyFrom(texture.defaultAnchor ?? { x: 0.5, y: 1 });
    return sprite;
  }

  /** Items fell onto piles: they fly there from where they came. Call it before update() in the same frame. */
  toss(tosses: readonly Toss[], now: number): void {
    for (const toss of tosses) {
      this.flights.push({ ...toss, start: now, item: null, shadow: null });
    }
  }

  /** Draws `piles`; `visible(pile)` says whether the player can see a pile (for its spark). */
  update(piles: readonly Pile[], now: number, visible: (pile: Pile) => boolean): void {
    const byId = new Map(piles.map((p) => [p.id, p]));
    const inAir = this.fly(byId, now);
    for (const pile of piles) {
      const view = this.views.get(pile.id) ?? this.add(pile.id);
      // A new pile shows when its items land; a pile that gets more keeps its look until then.
      const held = inAir.has(pile.id);
      view.root.visible = !(held && view.key === '');
      const key = `${pile.kind}:${HEAP.filter(([n]) => pile.count >= n).length}`;
      if (key !== view.key && !held) {
        view.key = key;
        view.root.removeChildren().forEach((child) => child !== view.shine && child.destroy());
        view.shine.removeChildren().forEach((child) => child.destroy());
        // The copies behind first: the first copy is in front.
        for (const [min, dx, dy] of [...HEAP].reverse()) {
          if (pile.count < min) continue;
          const sprite = this.sprite(`pile/${pile.kind}`);
          sprite.position.set(dx, dy);
          view.root.addChild(sprite);
          const shine = this.sprite(`pile/${pile.kind}/bare`);
          shine.position.set(dx, dy);
          shine.blendMode = 'add';
          view.shine.addChild(shine);
        }
        view.root.addChild(view.shine);
      }
      view.root.position.set(pile.x, pile.y);
      // Each pile shines at its own moment, from its id: in and out, softly.
      const shinePhase = (now + pile.id * 1931) % SHINE_EVERY_MS;
      view.shine.alpha = shinePhase < SHINE_MS ? SHINE_ALPHA * Math.sin((shinePhase / SHINE_MS) * Math.PI) ** 2 : 0;
      view.shine.visible = view.shine.alpha > 0.005;
      // Each pile sparks at its own moment, from its id.
      const phase = (now + pile.id * 977) % GLINT_EVERY_MS;
      view.glint.visible = view.root.visible && phase < GLINT_MS && visible(pile);
      if (view.glint.visible) {
        view.glint.alpha = Math.sin((phase / GLINT_MS) * Math.PI);
        view.glint.position.set(pile.x + 2, pile.y - GLINT_HEIGHT);
      }
    }
    for (const [id, view] of this.views) {
      if (byId.has(id)) continue;
      view.root.destroy({ children: true });
      view.glint.destroy();
      this.views.delete(id);
    }
  }

  private add(id: number): PileView {
    const glint = new Sprite(this.glintFrame);
    glint.anchor.set(0.5);
    glint.tint = GLINT_TINT;
    this.glowLayer.addChild(glint);
    const root = new Container();
    const shine = new Container();
    root.addChild(shine);
    this.layer.addChild(root);
    const view = { root, shine, glint, key: '' };
    this.views.set(id, view);
    return view;
  }

  /**
   * Moves the items in the air, and ends the flights that have landed and hopped (or whose pile
   * went). Returns the piles with items in the air.
   */
  private fly(piles: ReadonlyMap<number, Pile>, now: number): Set<number> {
    const flying: Flight[] = [];
    for (const flight of this.flights) {
      const pile = piles.get(flight.pile);
      const distance = pile ? Math.hypot(pile.x - flight.fromX, pile.y - flight.fromY) : 0;
      const airMs = tossMs(distance);
      const t = (now - flight.start) / airMs;
      if (!pile || t >= 1 + BOUNCE_MS / airMs) {
        flight.item?.destroy();
        flight.shadow?.destroy();
        continue;
      }
      flying.push(flight);
      if (!flight.item || !flight.shadow) {
        flight.item = this.sprite(`pile/${pile.kind}/bare`);
        flight.shadow = this.sprite('pile/shadow');
        this.entityLayer.addChild(flight.item);
        this.layer.addChild(flight.shadow);
      }
      // In the air: straight over the ground from where it came to the pile, and up and down on an
      // arc from the hands; after it lands, one small hop.
      const along = Math.min(1, Math.max(0, t));
      const x = flight.fromX + (pile.x - flight.fromX) * along;
      const y = flight.fromY + (pile.y - flight.fromY) * along;
      const arc = TOSS_ARC + distance * TOSS_ARC_PER_PIXEL;
      const height = t < 1 ? TOSS_LIFT * (1 - along) + 4 * arc * along * (1 - along) : BOUNCE_HEIGHT * Math.sin(((t - 1) * airMs * Math.PI) / BOUNCE_MS);
      flight.shadow.position.set(Math.round(x), Math.round(y));
      flight.item.position.set(Math.round(x), Math.round(y - height));
      // In front of what stands at the same depth (the one who drops it: the item leaves its hands).
      flight.item.zIndex = y + 0.5;
    }
    this.flights = flying;
    return new Set(flying.map((f) => f.pile));
  }
}
