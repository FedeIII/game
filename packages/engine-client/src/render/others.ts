import { Container } from 'pixi.js';
import type { RemotePlayer } from '@game/engine';
import type { Art } from '../assets.ts';
import { attackLook, type SkinStore } from '../skins/skin-store.ts';
import type { Rect } from './camera.ts';
import type { LightSource } from './lighting.ts';
import type { PixelFont } from './pixel-text.ts';
import { PlayerView, atlasPlayerTextures, type PlayerTextures } from './player-view.ts';

/** Seconds for another player to fade in when it comes and out when it goes. */
const FADE_SECONDS = 0.4;
/** The name tag: the parchment ink on a 1-pixel shadow, this far above the head. */
const NAME_INK = 0xd8ccb0;
const NAME_SHADOW = 0x07050a;
const NAME_GAP = 3;
/** Other players carry a torch too, a smaller one than the local player's (radius 150). */
const OTHER_TORCH = { radius: 96, colour: 0xff8a3c } as const;

interface OtherView {
  readonly view: PlayerView;
  skin: number;
  /** The name over its head, and its tag in the text layer (null for no name). */
  name: string;
  tag: Container | null;
  tagWidth: number;
  x: number;
  y: number;
  alpha: number;
  /** False once the player has left: the view fades out, then goes. */
  here: boolean;
}

/**
 * Shows the other players of a multiplayer world, each in its own skin, in the depth-sorted
 * entity layer like the local player (and its faint copy above the props). Until a skin is
 * rendered, the player shows as a darker wanderer; a new skin replaces the old one when it is
 * ready. A player with a name has a tag over its head, in the small font, in the text layer
 * (above the darkness). It also gives their torches.
 */
export class OtherPlayers {
  private readonly art: Art;
  private readonly skins: SkinStore;
  private readonly placeholder: PlayerTextures;
  private readonly layer: Container;
  private readonly ghostLayer: Container;
  private readonly textLayer: Container;
  private readonly glowLayer: Container;
  private readonly font: PixelFont;
  private readonly views = new Map<number, OtherView>();

  constructor(art: Art, skins: SkinStore, entityLayer: Container, ghostLayer: Container, textLayer: Container, glowLayer: Container, smallFont: PixelFont) {
    this.art = art;
    this.skins = skins;
    this.placeholder = atlasPlayerTextures(art);
    this.layer = entityLayer;
    this.ghostLayer = ghostLayer;
    this.textLayer = textLayer;
    this.glowLayer = glowLayer;
    this.font = smallFont;
  }

  /** The skins that the other players wear now: the skin store keeps them. */
  get skinsWorn(): number[] {
    return [...this.views.values()].map((v) => v.skin);
  }

  /** The number of other players that are shown. */
  get count(): number {
    let n = 0;
    for (const v of this.views.values()) if (v.here) n++;
    return n;
  }

  update(players: readonly RemotePlayer[], seconds: number, view: Rect): void {
    const present = new Set<number>();
    for (const player of players) {
      present.add(player.id);
      let other = this.views.get(player.id);
      if (other && other.skin !== player.skin) this.reskin(player.id, other, player.skin);
      if (!other) other = this.add(player);
      if (other.name !== player.name) this.rename(other, player.name);
      other.here = true;
      other.x = player.x;
      other.y = player.y;
      other.view.update(player.x, player.y, player, seconds);
      if (other.tag) {
        // Over the head, on whole world pixels; inside the screen, like a speech bubble.
        const top = Math.round(player.y - other.view.headHeight - NAME_GAP - this.font.height);
        const left = Math.round(Math.max(view.x + 1, Math.min(view.x + view.width - other.tagWidth - 1, player.x - other.tagWidth / 2)));
        other.tag.position.set(left, Math.max(Math.round(view.y + 1), top));
      }
    }
    const step = seconds / FADE_SECONDS;
    for (const [id, other] of this.views) {
      if (!present.has(id)) other.here = false;
      other.alpha = Math.max(0, Math.min(1, other.alpha + (other.here ? step : -step)));
      other.view.root.alpha = other.alpha;
      other.view.ghost.alpha = other.alpha * PlayerView.GHOST_ALPHA;
      if (other.tag) other.tag.alpha = other.alpha;
      if (!other.here && other.alpha === 0) this.remove(id, other);
    }
  }

  /** The torches of the other players, and the light of their glowing attacks, in world pixels. */
  lights(): LightSource[] {
    const out: LightSource[] = [];
    for (const [id, other] of this.views) {
      if (other.alpha <= 0) continue;
      out.push({ x: other.x, y: other.y - 14, radius: OTHER_TORCH.radius, colour: OTHER_TORCH.colour, flicker: true, seed: id * 13 });
      const fx = other.view.fxLight;
      if (fx) out.push(fx);
    }
    return out;
  }

  private add(player: RemotePlayer): OtherView {
    const view = new PlayerView(this.art, this.placeholder, true);
    this.layer.addChild(view.root);
    this.ghostLayer.addChild(view.ghost);
    this.glowLayer.addChild(view.overlay);
    const other: OtherView = { view, skin: -1, name: '', tag: null, tagWidth: 0, x: player.x, y: player.y, alpha: 0, here: true };
    this.views.set(player.id, other);
    this.reskin(player.id, other, player.skin);
    return other;
  }

  /** Wears skin `skin`: at once if it is ready, else when it is (the old look stays until then). */
  private reskin(id: number, other: OtherView, skin: number): void {
    other.skin = skin;
    const look = attackLook(skin);
    other.view.setAttackStyle(look.style, look.tint);
    const ready = this.skins.get(skin, (textures) => {
      if (this.views.get(id) === other && other.skin === skin) {
        other.view.setTextures(textures);
        other.view.setPending(false);
      }
    });
    if (ready) {
      other.view.setTextures(ready);
      other.view.setPending(false);
    }
  }

  private rename(other: OtherView, name: string): void {
    other.tag?.destroy({ children: true });
    other.name = name;
    other.tag = null;
    if (!name) return;
    const tag = new Container();
    const shadow = this.font.layout([name], NAME_SHADOW);
    shadow.position.set(1, 1);
    tag.addChild(shadow, this.font.layout([name], NAME_INK));
    tag.alpha = other.alpha;
    this.textLayer.addChild(tag);
    other.tag = tag;
    other.tagWidth = this.font.measure(name);
  }

  private remove(id: number, other: OtherView): void {
    other.view.root.destroy({ children: true });
    other.view.ghost.destroy();
    other.view.overlay.destroy({ children: true });
    other.tag?.destroy({ children: true });
    this.views.delete(id);
  }
}
