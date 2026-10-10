import type { Container, Texture } from 'pixi.js';
import type { Facing, NpcDef, NpcPose } from '@game/engine';
import type { Art } from '../assets.ts';
import { PlayerView, type PlayerTextures } from './player-view.ts';

const FACINGS: readonly Facing[] = ['down', 'up', 'left', 'right'];
/** From the feet to just above the head of an NPC, in world pixels: speech goes there. */
const NPC_HEAD_HEIGHT = 30;

/** The frames of an NPC look from the atlas: npc/<look>/<view>/stand and the npcwalk animations. */
function npcTextures(art: Art, look: string): PlayerTextures {
  const stand = {} as Record<Facing, Texture>;
  const walk = {} as Record<Facing, Texture[]>;
  for (const facing of FACINGS) {
    stand[facing] = art.frame(`npc/${look}/${facing}/stand`);
    walk[facing] = art.animation(`npcwalk/${look}/${facing}`);
  }
  // NPCs never attack or roll: their attack and their roll are the stand.
  const attack = Object.fromEntries(FACINGS.map((facing) => [facing, [stand[facing]]])) as Record<Facing, Texture[]>;
  return { stand, walk, attack, roll: attack, fall: attack, headHeight: NPC_HEAD_HEIGHT };
}

/**
 * Shows the walking NPCs of a world, in the depth-sorted entity layer like the players (and a
 * faint copy above the props). The poses come from the server's snapshots in a shared world,
 * or from the client's own NpcCrowd.
 */
export class NpcViews {
  private readonly views: PlayerView[];
  private readonly shown: { x: number; y: number }[];

  constructor(art: Art, defs: readonly NpcDef[], entityLayer: Container, ghostLayer: Container) {
    this.views = defs.map((def) => {
      const view = new PlayerView(art, npcTextures(art, def.look));
      entityLayer.addChild(view.root);
      ghostLayer.addChild(view.ghost);
      return view;
    });
    this.shown = defs.map((def) => ({ x: def.home[0] * 16 + 8, y: def.home[1] * 16 + 12 }));
  }

  update(poses: readonly NpcPose[], seconds: number): void {
    poses.forEach((pose, i) => {
      const view = this.views[i];
      if (!view) return;
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
