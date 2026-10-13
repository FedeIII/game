import type { Container, Texture } from 'pixi.js';
import type { Facing, NpcDef, NpcPose } from '@game/engine';
import type { Art } from '../assets.ts';
import { PlayerView, type PlayerTextures } from './player-view.ts';

const FACINGS: readonly Facing[] = ['down', 'up', 'left', 'right'];
/** From the feet to just above the head of an NPC, in world pixels: speech goes there. */
const NPC_HEAD_HEIGHT = 30;
/** An NPC that goes into its house for the night fades out in this long (s), and fades in at dawn. */
const FADE_SECONDS = 0.5;

/** The frames of an NPC look from the atlas: npc/<look>/<view>/stand and the npcwalk animations. */
export function npcTextures(art: Art, look: string): PlayerTextures {
  const stand = {} as Record<Facing, Texture>;
  const walk = {} as Record<Facing, Texture[]>;
  for (const facing of FACINGS) {
    stand[facing] = art.frame(`npc/${look}/${facing}/stand`);
    walk[facing] = art.animation(`npcwalk/${look}/${facing}`);
  }
  // A look that fights (a militia of a caravan: art/characters.ts, FIGHTING_LOOKS) has the frames of
  // a swing; for the others the attack is the stand. No NPC rolls or falls: those are the stand too.
  // No NPC sneaks: its crouch is the stand, and its sneak walk the walk. No NPC braces or evades.
  const still = Object.fromEntries(FACINGS.map((facing) => [facing, [stand[facing]]])) as Record<Facing, Texture[]>;
  const fights = art.tryFrame(`npc/${look}/down/attack/0`) !== null;
  const attack = fights ? (Object.fromEntries(FACINGS.map((facing) => [facing, art.variants(`npc/${look}/${facing}/attack`)])) as Record<Facing, Texture[]>) : still;
  return { stand, walk, attack, roll: still, fall: still, crouch: stand, sneak: walk, brace: stand, evade: still, headHeight: NPC_HEAD_HEIGHT };
}

/**
 * Shows the walking NPCs of a world, in the depth-sorted entity layer like the players (and a
 * faint copy above the props). The poses come from the server's snapshots in a shared world,
 * or from the client's own NpcCrowd.
 */
export class NpcViews {
  private readonly views: PlayerView[];
  private readonly shown: { x: number; y: number }[];
  /** How much each NPC shows (0 to 1): an NPC that goes into its house for the night fades out, and in at dawn. Null before its first pose. */
  private readonly alphas: (number | null)[];

  constructor(art: Art, defs: readonly NpcDef[], entityLayer: Container, ghostLayer: Container) {
    this.views = defs.map((def) => {
      const view = new PlayerView(art, npcTextures(art, def.look));
      entityLayer.addChild(view.root);
      ghostLayer.addChild(view.ghost);
      return view;
    });
    this.shown = defs.map((def) => ({ x: def.home[0] * 16 + 8, y: def.home[1] * 16 + 12 }));
    this.alphas = defs.map(() => null);
  }

  /**
   * Moves the NPCs to their poses; `seen(i)` says whether the player can see NPC `i` (its storey:
   * Building.storeys). An NPC that is away (NpcPose.away: in its house for the night) fades out.
   */
  update(poses: readonly NpcPose[], seconds: number, seen: (index: number) => boolean = () => true): void {
    poses.forEach((pose, i) => {
      const view = this.views[i];
      if (!view) return;
      const target = pose.away ? 0 : 1;
      const was = this.alphas[i] ?? target;
      const alpha = was < target ? Math.min(target, was + seconds / FADE_SECONDS) : Math.max(target, was - seconds / FADE_SECONDS);
      this.alphas[i] = alpha;
      const visible = seen(i) && alpha > 0;
      view.root.visible = visible;
      view.ghost.visible = visible;
      view.root.alpha = alpha;
      view.ghost.alpha = alpha * PlayerView.GHOST_ALPHA;
      view.update(pose.x, pose.y, pose, seconds);
      this.shown[i] = { x: pose.x, y: pose.y };
    });
  }

  /** Where the head of NPC `index` is now, in world pixels: its lines go over it. */
  headOf(index: number): { x: number; y: number } {
    const at = this.shown[index] ?? { x: 0, y: 0 };
    return { x: at.x, y: at.y - (this.views[index]?.headHeight ?? NPC_HEAD_HEIGHT) };
  }
}
