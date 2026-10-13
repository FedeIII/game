import { Container } from 'pixi.js';
import { TILE_SIZE } from '@game/engine';
import type { Rect } from './camera.ts';
import type { PixelFont } from './pixel-text.ts';

/** The name tag: the parchment ink on a 1-pixel shadow, this far above the head. */
const NAME_INK = 0xd8ccb0;
const NAME_SHADOW = 0x07050a;
const NAME_GAP = 3;
/**
 * A tag shows while the feet of its player are on the screen or this close to it (world pixels).
 * A tag stays inside the screen, so a name at the edge then says that its player is just there.
 * Without this limit, the name of a far player stays at the edge of the screen for good.
 */
export const TAG_MARGIN = 2 * TILE_SIZE;
/** Seconds for a tag to fade out when its player goes away from the screen, and to fade in when it comes back. */
const TAG_FADE_SECONDS = 0.4;

/** Whether a point (the feet of a player) is on the screen `view`, or within `margin` world pixels of it. */
export function nearView(x: number, y: number, view: Rect, margin = TAG_MARGIN): boolean {
  return x >= view.x - margin && x <= view.x + view.width + margin && y >= view.y - margin && y <= view.y + view.height + margin;
}

/**
 * Lines of text as a name tag shows them: the parchment ink on a shadow 1 pixel down and to the
 * right. The signs of the buildings use it too, in the same small font.
 */
export function shadowedText(font: PixelFont, lines: readonly string[]): Container {
  const text = new Container();
  const shadow = font.layout(lines, NAME_SHADOW);
  shadow.position.set(1, 1);
  text.addChild(shadow, font.layout(lines, NAME_INK));
  return text;
}

/**
 * A name over a player's head, in the small pixel font, in the text layer (above the darkness).
 * It stays inside the screen, like a speech bubble, on whole world pixels. It shows only while
 * its player is on the screen or near it (`TAG_MARGIN`): it fades out when the player goes
 * farther, and fades in when the player comes back.
 */
export class NameTag {
  private readonly font: PixelFont;
  private readonly layer: Container;
  private tag: Container | null = null;
  private width = 0;
  private text = '';
  /** How much the tag shows for the distance of its player from the screen: 0 to 1, or -1 before the first place(). */
  private near = -1;

  constructor(font: PixelFont, layer: Container) {
    this.font = font;
    this.layer = layer;
  }

  get name(): string {
    return this.text;
  }

  /** Shows `name` ('' for none). */
  set(name: string): void {
    if (name === this.text) return;
    this.text = name;
    this.tag?.destroy({ children: true });
    this.tag = null;
    this.near = -1;
    if (!name) return;
    const tag = shadowedText(this.font, [name]);
    this.layer.addChild(tag);
    this.tag = tag;
    this.width = this.font.measure(name);
  }

  /**
   * Puts the tag over a head: the feet at (x, y), the head `headHeight` above them. `seconds` is
   * the time since the last place(), for the fade (none without it). The first place() after
   * set() does not fade.
   */
  place(x: number, y: number, headHeight: number, view: Rect, alpha = 1, visible = true, seconds = Infinity): void {
    if (!this.tag) return;
    const target = nearView(x, y, view) ? 1 : 0;
    const step = seconds / TAG_FADE_SECONDS;
    if (this.near < 0) this.near = target;
    else if (this.near < target) this.near = Math.min(target, this.near + step);
    else if (this.near > target) this.near = Math.max(target, this.near - step);
    this.tag.visible = visible && this.near > 0;
    this.tag.alpha = alpha * this.near;
    const top = Math.round(y - headHeight - NAME_GAP - this.font.height);
    const left = Math.round(Math.max(view.x + 1, Math.min(view.x + view.width - this.width - 1, x - this.width / 2)));
    this.tag.position.set(left, Math.max(Math.round(view.y + 1), top));
  }

  /** Whether the tag shows now (for tests and the debug panel). */
  get showing(): boolean {
    return this.tag?.visible === true && this.tag.alpha > 0;
  }

  destroy(): void {
    this.tag?.destroy({ children: true });
    this.tag = null;
    this.text = '';
    this.near = -1;
  }
}
