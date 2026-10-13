import type { Texture } from 'pixi.js';
import type { Art } from '../assets.ts';

/**
 * The lamps and the lit windows by day (docs/features/game/day-and-night.md). A lit thing that goes
 * out by day has an unlit frame in the atlas, `<frame>/unlit` (`fixture/lamppost/unlit`,
 * `wall/stone/window/unlit`): the same frame with dark glass. The page shows the unlit frame, and the
 * lit frame over it with the alpha of `litAlpha()`, so the two cross-fade with the hour.
 */

/** The name of the unlit frame of a lit frame. */
export function unlitFrame(frame: string): string {
  return `${frame}/unlit`;
}

/** How much of the lit frame shows over the unlit one: the lights of the sky (Sky.lights), 1 at night and 0 by day. */
export function litAlpha(lights: number): number {
  return Math.max(0, Math.min(1, lights));
}

/**
 * The frames of a thing that can be lit: `base`, the frame under (the unlit one, if the atlas has it,
 * else the frame itself), and `lit`, the lit frame over it (null: nothing over it, the thing does not
 * change with the hour).
 */
export function dayFrames(art: Art, frame: string): { readonly base: Texture; readonly lit: Texture | null } {
  const unlit = art.tryFrame(unlitFrame(frame));
  return unlit ? { base: unlit, lit: art.frame(frame) } : { base: art.frame(frame), lit: null };
}
