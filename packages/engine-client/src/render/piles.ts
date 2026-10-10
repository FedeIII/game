import { Container, Sprite, type Texture } from 'pixi.js';
import type { ItemKind, Pile } from '@game/engine';
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

interface PileView {
  readonly root: Container;
  readonly glint: Sprite;
  key: string;
}

/**
 * The items on the ground (piles.ts): each pile is its item, small (`pile/<kind>`), on the layer
 * between the ground and the depth-sorted things, so everything that stands (a wall, a tree, a
 * player) draws over it. More of a stack shows as two or three copies. A small gold spark over
 * each pile, now and then, shows it in the dark: it is above the darkness, so only for a pile
 * that the player can see (outside, or in the house where the player is).
 */
export class PileViews {
  private readonly frames = new Map<ItemKind, Texture>();
  private readonly art: Art;
  private readonly layer: Container;
  private readonly glowLayer: Container;
  private readonly glintFrame: Texture;
  private readonly views = new Map<number, PileView>();

  constructor(art: Art, layer: Container, glowLayer: Container) {
    this.art = art;
    this.layer = layer;
    this.glowLayer = glowLayer;
    this.glintFrame = art.frame('pile/glint');
  }

  private frame(kind: ItemKind): Texture {
    let texture = this.frames.get(kind);
    if (!texture) {
      texture = this.art.frame(`pile/${kind}`);
      this.frames.set(kind, texture);
    }
    return texture;
  }

  /** Draws `piles`; `visible(pile)` says whether the player can see a pile (for its spark). */
  update(piles: readonly Pile[], now: number, visible: (pile: Pile) => boolean): void {
    const here = new Set<number>();
    for (const pile of piles) {
      here.add(pile.id);
      let view = this.views.get(pile.id);
      if (!view) {
        const glint = new Sprite(this.glintFrame);
        glint.anchor.set(0.5);
        glint.tint = GLINT_TINT;
        this.glowLayer.addChild(glint);
        view = { root: new Container(), glint, key: '' };
        this.layer.addChild(view.root);
        this.views.set(pile.id, view);
      }
      const key = `${pile.kind}:${HEAP.filter(([n]) => pile.count >= n).length}`;
      if (key !== view.key) {
        view.key = key;
        view.root.removeChildren().forEach((child) => child.destroy());
        const texture = this.frame(pile.kind);
        // The copies behind first: the first copy is in front.
        for (const [min, dx, dy] of [...HEAP].reverse()) {
          if (pile.count < min) continue;
          const sprite = new Sprite(texture);
          sprite.anchor.copyFrom(texture.defaultAnchor ?? { x: 0.5, y: 1 });
          sprite.position.set(dx, dy);
          view.root.addChild(sprite);
        }
      }
      view.root.position.set(pile.x, pile.y);
      // Each pile sparks at its own moment, from its id.
      const phase = (now + pile.id * 977) % GLINT_EVERY_MS;
      view.glint.visible = phase < GLINT_MS && visible(pile);
      if (view.glint.visible) {
        view.glint.alpha = Math.sin((phase / GLINT_MS) * Math.PI);
        view.glint.position.set(pile.x + 2, pile.y - GLINT_HEIGHT);
      }
    }
    for (const [id, view] of this.views) {
      if (here.has(id)) continue;
      view.root.destroy({ children: true });
      view.glint.destroy();
      this.views.delete(id);
    }
  }
}
