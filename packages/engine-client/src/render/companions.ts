import type { Container } from 'pixi.js';
import type { RemoteCompanion } from '@game/engine';
import type { Art } from '../assets.ts';
import type { Rect } from './camera.ts';
import type { LightSource } from './lighting.ts';
import { NameTag } from './name-tag.ts';
import { tw } from '../i18n.ts';
import { npcTextures } from './npcs.ts';
import type { PixelFont } from './pixel-text.ts';
import { PlayerView } from './player-view.ts';

/** What the view needs of a companion: a RemoteCompanion of the server, or one that the page runs. */
export type CompanionPose = Pick<RemoteCompanion, 'id' | 'look' | 'name' | 'x' | 'y' | 'vx' | 'vy' | 'facing' | 'stun' | 'guard' | 'down' | 'attack'>;

/** A companion carries a small lantern: the player sees it in the dark. */
const COMPANION_LIGHT = { radius: 48, colour: 0xffb060 } as const;
/** A companion that lies defeated shows this faded. */
const DOWN_ALPHA = 0.5;

interface CompanionView {
  readonly view: PlayerView;
  readonly look: string;
  readonly tag: NameTag;
  x: number;
  y: number;
}

/**
 * Shows the companions (companions.ts), the NPCs that follow players: each one in the frames of
 * its NPC look, with its name over its head, the red flash of a hit, the stars of a stun and the
 * blink of the guard (PlayerView), half faded while it lies defeated, and a small lantern.
 */
export class CompanionViews {
  private readonly art: Art;
  private readonly entityLayer: Container;
  private readonly ghostLayer: Container;
  private readonly textLayer: Container;
  private readonly glowLayer: Container;
  private readonly font: PixelFont;
  private readonly views = new Map<number, CompanionView>();

  constructor(art: Art, entityLayer: Container, ghostLayer: Container, textLayer: Container, glowLayer: Container, smallFont: PixelFont) {
    this.art = art;
    this.entityLayer = entityLayer;
    this.ghostLayer = ghostLayer;
    this.textLayer = textLayer;
    this.glowLayer = glowLayer;
    this.font = smallFont;
  }

  get count(): number {
    return this.views.size;
  }

  update(companions: readonly CompanionPose[], seconds: number, view: Rect): void {
    const present = new Set<number>();
    for (const companion of companions) {
      present.add(companion.id);
      let shown = this.views.get(companion.id);
      if (shown && shown.look !== companion.look) {
        this.remove(companion.id, shown);
        shown = undefined;
      }
      shown ??= this.add(companion);
      shown.tag.set(tw(companion.name));
      shown.x = companion.x;
      shown.y = companion.y;
      shown.view.update(companion.x, companion.y, companion, seconds);
      shown.view.root.alpha = companion.down > 0 ? DOWN_ALPHA : 1;
      shown.tag.place(companion.x, companion.y, shown.view.headHeight, view);
    }
    for (const [id, shown] of this.views) if (!present.has(id)) this.remove(id, shown);
  }

  /** The small lanterns of the companions, in world pixels. */
  lights(): LightSource[] {
    return [...this.views].map(([id, c]) => ({ x: c.x, y: c.y - 14, radius: COMPANION_LIGHT.radius, colour: COMPANION_LIGHT.colour, flicker: true, seed: id * 7 }));
  }

  private add(companion: CompanionPose): CompanionView {
    const view = new PlayerView(this.art, npcTextures(this.art, companion.look));
    this.entityLayer.addChild(view.root);
    this.ghostLayer.addChild(view.ghost);
    this.glowLayer.addChild(view.overlay);
    const shown: CompanionView = { view, look: companion.look, tag: new NameTag(this.font, this.textLayer), x: companion.x, y: companion.y };
    this.views.set(companion.id, shown);
    return shown;
  }

  private remove(id: number, shown: CompanionView): void {
    shown.view.root.destroy({ children: true });
    shown.view.ghost.destroy();
    shown.view.overlay.destroy({ children: true });
    shown.tag.destroy();
    this.views.delete(id);
  }
}
