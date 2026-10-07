/// <reference lib="webworker" />
import { renderSkinSheet, skinFromSeed } from '../../art/skins.ts';

/**
 * Renders player skins away from the main thread: a skin is 36 SDF-rendered frames, about a
 * quarter of a second on a desktop and more on a phone. Gets { seed }, answers with the sheet's
 * RGBA pixels (transferred, not copied).
 */
export interface SkinRequest {
  readonly seed: number;
}

export interface SkinResult {
  readonly seed: number;
  readonly width: number;
  readonly height: number;
  readonly pixels: ArrayBuffer;
  readonly headHeight: number;
}

const scope = self as unknown as DedicatedWorkerGlobalScope;
scope.onmessage = (event: MessageEvent<SkinRequest>) => {
  const { seed } = event.data;
  const sheet = renderSkinSheet(skinFromSeed(seed));
  const pixels = sheet.image.data.buffer as ArrayBuffer;
  const result: SkinResult = { seed, width: sheet.image.width, height: sheet.image.height, pixels, headHeight: sheet.headHeight };
  scope.postMessage(result, [pixels]);
};
