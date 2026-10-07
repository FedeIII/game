import type { Container } from 'pixi.js';
import type { RemotePlayer } from '@game/engine';
import type { Art } from '../assets.ts';
import type { SkinStore } from '../skins/skin-store.ts';
import type { LightSource } from './lighting.ts';
import { PlayerView, atlasPlayerTextures, type PlayerTextures } from './player-view.ts';

/** Seconds for another player to fade in when it comes and out when it goes. */
const FADE_SECONDS = 0.4;
/** Other players carry a torch too, a smaller one than the local player's (radius 150). */
const OTHER_TORCH = { radius: 96, colour: 0xff8a3c } as const;

interface OtherView {
  readonly view: PlayerView;
  readonly skin: number;
  x: number;
  y: number;
  alpha: number;
  /** False once the player has left: the view fades out, then goes. */
  here: boolean;
}

/**
 * Shows the other players of a multiplayer world, each in its own skin, in the depth-sorted
 * entity layer like the local player (and its faint copy above the props). Until a skin is
 * rendered, the player shows as a darker wanderer. It also gives their torches.
 */
export class OtherPlayers {
  private readonly art: Art;
  private readonly skins: SkinStore;
  private readonly placeholder: PlayerTextures;
  private readonly layer: Container;
  private readonly ghostLayer: Container;
  private readonly views = new Map<number, OtherView>();

  constructor(art: Art, skins: SkinStore, entityLayer: Container, ghostLayer: Container) {
    this.art = art;
    this.skins = skins;
    this.placeholder = atlasPlayerTextures(art);
    this.layer = entityLayer;
    this.ghostLayer = ghostLayer;
  }

  /** The number of other players that are shown. */
  get count(): number {
    let n = 0;
    for (const v of this.views.values()) if (v.here) n++;
    return n;
  }

  update(players: readonly RemotePlayer[], seconds: number): void {
    const present = new Set<number>();
    for (const player of players) {
      present.add(player.id);
      let other = this.views.get(player.id);
      if (other && other.skin !== player.skin) {
        this.remove(player.id, other);
        other = undefined;
      }
      if (!other) other = this.add(player);
      other.here = true;
      other.x = player.x;
      other.y = player.y;
      other.view.update(player.x, player.y, player, seconds);
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

  /** The torches of the other players, in world pixels. */
  lights(): LightSource[] {
    const out: LightSource[] = [];
    for (const [id, other] of this.views) {
      if (other.alpha <= 0) continue;
      out.push({ x: other.x, y: other.y - 14, radius: OTHER_TORCH.radius, colour: OTHER_TORCH.colour, flicker: true, seed: id * 13 });
    }
    return out;
  }

  private add(player: RemotePlayer): OtherView {
    const textures = this.skins.get(player.skin, (ready) => {
      const other = this.views.get(player.id);
      if (other && other.skin === player.skin) {
        other.view.setTextures(ready);
        other.view.setPending(false);
      }
    });
    const view = new PlayerView(this.art, textures ?? this.placeholder, !textures);
    this.layer.addChild(view.root);
    this.ghostLayer.addChild(view.ghost);
    const other: OtherView = { view, skin: player.skin, x: player.x, y: player.y, alpha: 0, here: true };
    this.views.set(player.id, other);
    return other;
  }

  private remove(id: number, other: OtherView): void {
    other.view.root.destroy({ children: true });
    other.view.ghost.destroy();
    this.views.delete(id);
  }
}
