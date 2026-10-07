/**
 * All the art of the game, as named frames. build.ts packs them into one atlas.
 *
 * Style: dark and desaturated, after Diablo and Castlevania. Characters, trees and rocks are
 * "pre-rendered" from SDF models (sdf.ts) with one fixed light; ground tiles come from tiling
 * noise; small decor is drawn as text grids. When real art comes from Aseprite, it replaces
 * these frames with the same names.
 */
import { Image } from './png.ts';
import { playerFrames, VIEWS, WALK_FRAMES } from './characters.ts';
import { decorFrames } from './decor.ts';
import { fontFrames } from './font.ts';
import { groundFrames } from './ground.ts';
import { lightFrames } from './lights.ts';
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
}

function playerShadow(): Frame {
  const image = new Image(16, 6);
  shadowEllipse(image, 8, 3, 7.5, 3, 0x80);
  return { name: 'player/shadow', image, anchor: { x: 0.5, y: 0.5 } };
}

export function buildArt(): Art {
  const frames = [
    ...groundFrames(),
    ...decorFrames(),
    ...propFrames(),
    ...playerFrames(),
    playerShadow(),
    ...lightFrames(),
    ...fontFrames(),
  ];
  const walk = (view: string): string[] => Array.from({ length: WALK_FRAMES }, (_, i) => `player/${view}/walk/${i}`);
  return { frames, animations: Object.fromEntries(VIEWS.map((view) => [`walk/${view.name}`, walk(view.name)])) };
}
