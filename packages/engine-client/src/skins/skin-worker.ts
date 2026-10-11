/// <reference lib="webworker" />
import { renderSkinSheet, skinKey, skinOfLook, type SkinLook } from '../../art/skins.ts';

/**
 * Renders player skins away from the main thread: a skin is 52 SDF-rendered frames, about a
 * third of a second on a desktop and more on a phone. Gets { look } (a seed, and what shows of
 * the gear), answers with the key of the look and the sheet's RGBA pixels (transferred, not copied).
 */
export interface SkinRequest {
  readonly look: SkinLook;
}

export interface SkinResult {
  readonly key: string;
  readonly width: number;
  readonly height: number;
  readonly pixels: ArrayBuffer;
  readonly headHeight: number;
}

const scope = self as unknown as DedicatedWorkerGlobalScope;
scope.onmessage = (event: MessageEvent<SkinRequest>) => {
  const { look } = event.data;
  const sheet = renderSkinSheet(skinOfLook(look));
  const pixels = sheet.image.data.buffer as ArrayBuffer;
  const result: SkinResult = { key: skinKey(look), width: sheet.image.width, height: sheet.image.height, pixels, headHeight: sheet.headHeight };
  scope.postMessage(result, [pixels]);
};
