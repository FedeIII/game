import { Container } from 'pixi.js';
import { isSneaking, type RemotePlayer } from '@game/engine';
import type { Art } from '../assets.ts';
import { skinName } from '../../art/skins.ts';
import { attackLook, type SkinStore } from '../skins/skin-store.ts';
import type { Rect } from './camera.ts';
import type { LightSource } from './lighting.ts';
import { NameTag } from './name-tag.ts';
import type { PixelFont } from './pixel-text.ts';
import { PlayerView, atlasPlayerTextures, type PlayerTextures } from './player-view.ts';

/** Seconds for another player to fade in when it comes and out when it goes. */
const FADE_SECONDS = 0.4;
/** Other players carry a torch too, a smaller one than the local player's (radius 150), and a smaller one again while they sneak. */
const OTHER_TORCH = { radius: 96, sneaking: 48, colour: 0xff8a3c } as const;

interface OtherView {
  readonly view: PlayerView;
  skin: number;
  /** The name over its head: the one it chose, or else the name of its look. */
  readonly tag: NameTag;
  x: number;
  y: number;
  alpha: number;
  /** False once the player has left: the view fades out, then goes. */
  here: boolean;
  /** Whether it sneaks on purpose: it walks slowly (standing still does not show). */
  sneaking: boolean;
}

/**
 * Shows the other players of a multiplayer world, each in its own skin, in the depth-sorted
 * entity layer like the local player (and its faint copy above the props). Until a skin is
 * rendered, the player shows as a darker wanderer; a new skin replaces the old one when it is
 * ready. Each one has its name over its head (the name of its look if it chose none), in the
 * small font, in the text layer (above the darkness). It also gives their torches.
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

  /** `wading` tells if a point (the feet) is in shallow water: then the figure stands in it. */
  update(players: readonly RemotePlayer[], seconds: number, view: Rect, wading: (x: number, y: number) => boolean = () => false): void {
    const present = new Set<number>();
    for (const player of players) {
      present.add(player.id);
      let other = this.views.get(player.id);
      if (other && other.skin !== player.skin) this.reskin(player.id, other, player.skin);
      if (!other) other = this.add(player);
      other.tag.set(player.name || skinName(player.skin));
      other.here = true;
      other.x = player.x;
      other.y = player.y;
      other.sneaking = isSneaking(player) && Math.hypot(player.vx, player.vy) > 1;
      other.view.update(player.x, player.y, { ...player, wading: wading(player.x, player.y), sneaking: other.sneaking }, seconds);
      other.tag.place(player.x, player.y, other.view.headHeight, view, other.alpha);
    }
    const step = seconds / FADE_SECONDS;
    for (const [id, other] of this.views) {
      if (!present.has(id)) other.here = false;
      other.alpha = Math.max(0, Math.min(1, other.alpha + (other.here ? step : -step)));
      other.view.root.alpha = other.alpha;
      other.view.ghost.alpha = other.alpha * PlayerView.GHOST_ALPHA;
      if (!other.here && other.alpha === 0) this.remove(id, other);
    }
  }

  /** The torches of the other players, and the light of their glowing attacks, in world pixels. */
  lights(): LightSource[] {
    const out: LightSource[] = [];
    for (const [id, other] of this.views) {
      if (other.alpha <= 0) continue;
      out.push({ x: other.x, y: other.y - 14, radius: other.sneaking ? OTHER_TORCH.sneaking : OTHER_TORCH.radius, colour: OTHER_TORCH.colour, flicker: true, seed: id * 13 });
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
    const other: OtherView = { view, skin: -1, tag: new NameTag(this.font, this.textLayer), x: player.x, y: player.y, alpha: 0, here: true, sneaking: false };
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

  private remove(id: number, other: OtherView): void {
    other.view.root.destroy({ children: true });
    other.view.ghost.destroy();
    other.view.overlay.destroy({ children: true });
    other.tag.destroy();
    this.views.delete(id);
  }
}
