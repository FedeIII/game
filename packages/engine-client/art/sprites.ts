/**
 * All the art of the game, as named frames. build.ts packs them into one atlas.
 *
 * Style: dark and desaturated, after Diablo and Castlevania. Characters, trees and rocks are
 * "pre-rendered" from SDF models (sdf.ts) with one fixed light; ground tiles come from tiling
 * noise; small decor is drawn as text grids. When real art comes from Aseprite, it replaces
 * these frames with the same names.
 */
import { Image } from './png.ts';
import { NPC_LOOKS, npcFrames, playerFrames, VIEWS, WALK_FRAMES } from './characters.ts';
import { buildingFrames } from './buildings.ts';
import { decorFrames } from './decor.ts';
import { fixtureFrames } from './fixtures.ts';
import { fontFrames } from './font.ts';
import { fxFrames } from './fx.ts';
import { groundFrames } from './ground.ts';
import { itemFrames } from './items.ts';
import { lightFrames } from './lights.ts';
import { mobFrames } from './mobs.ts';
import { propFrames } from './props.ts';
import { shadowEllipse } from './raster.ts';

export interface Frame {
  readonly name: string;
  readonly image: Image;
  /** The point of the sprite that sits on its position, as a fraction of the size. */
  readonly anchor?: { readonly x: number; readonly y: number };
}

export interface Art {
  readonly frames: Frame[];
  readonly animations: Record<string, string[]>;
  /** The glowing eye pixels of each mob frame: [x, y, x, y, ...] from the frame's top-left corner. */
  readonly mobEyes: Record<string, number[]>;
}

function playerShadow(): Frame {
  const image = new Image(16, 6);
  shadowEllipse(image, 8, 3, 7.5, 3, 0x80);
  return { name: 'player/shadow', image, anchor: { x: 0.5, y: 0.5 } };
}

export function buildArt(): Art {
  const mobs = mobFrames();
  const frames = [
    ...groundFrames(),
    ...decorFrames(),
    ...propFrames(),
    ...playerFrames(),
    ...npcFrames(),
    playerShadow(),
    ...lightFrames(),
    ...fontFrames(),
    ...buildingFrames(),
    ...fixtureFrames(),
    ...mobs.frames,
    ...fxFrames(),
    ...itemFrames(),
  ];
  const walk = (prefix: string): string[] => Array.from({ length: WALK_FRAMES }, (_, i) => `${prefix}/walk/${i}`);
  // Animations: `walk/<view>` for the player, `npcwalk/<look>/<view>` for each NPC look.
  const animations: Record<string, string[]> = Object.fromEntries(VIEWS.map((view) => [`walk/${view.name}`, walk(`player/${view.name}`)]));
  for (const look of Object.keys(NPC_LOOKS)) {
    for (const view of VIEWS) animations[`npcwalk/${look}/${view.name}`] = walk(`npc/${look}/${view.name}`);
  }
  return { frames, animations, mobEyes: mobs.eyes };
}
