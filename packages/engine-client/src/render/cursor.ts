import { Sprite } from 'pixi.js';
import type { Art } from '../assets.ts';

/**
 * The mouse cursor over the world (frame `ui/cursor`), drawn by the game at the size of a world
 * pixel, above everything and without the CRT filter, like the GUI. The page hides the system
 * cursor while this one shows (see Mouse).
 */
export class CursorView {
  readonly root: Sprite;

  constructor(art: Art) {
    this.root = new Sprite(art.frame('ui/cursor'));
    this.root.visible = false;
  }

  /**
   * Puts the hot spot at `at` (CSS pixels, on a whole device pixel), or hides the cursor (null).
   * `zoom` is the camera's device pixels for each world pixel.
   */
  update(at: { readonly x: number; readonly y: number } | null, zoom: number, dpr: number): void {
    this.root.visible = at !== null;
    if (!at) return;
    this.root.scale.set(zoom / dpr);
    this.root.position.set(Math.round(at.x * dpr) / dpr, Math.round(at.y * dpr) / dpr);
  }
}
