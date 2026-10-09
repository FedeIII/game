import { Container } from 'pixi.js';
import type { Rect } from './camera.ts';
import type { PixelFont } from './pixel-text.ts';

/** The name tag: the parchment ink on a 1-pixel shadow, this far above the head. */
const NAME_INK = 0xd8ccb0;
const NAME_SHADOW = 0x07050a;
const NAME_GAP = 3;

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
 * It stays inside the screen, like a speech bubble, on whole world pixels.
 */
export class NameTag {
  private readonly font: PixelFont;
  private readonly layer: Container;
  private tag: Container | null = null;
  private width = 0;
  private text = '';

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
    if (!name) return;
    const tag = shadowedText(this.font, [name]);
    this.layer.addChild(tag);
    this.tag = tag;
    this.width = this.font.measure(name);
  }

  /** Puts the tag over a head: the feet at (x, y), the head `headHeight` above them. */
  place(x: number, y: number, headHeight: number, view: Rect, alpha = 1, visible = true): void {
    if (!this.tag) return;
    this.tag.visible = visible;
    this.tag.alpha = alpha;
    const top = Math.round(y - headHeight - NAME_GAP - this.font.height);
    const left = Math.round(Math.max(view.x + 1, Math.min(view.x + view.width - this.width - 1, x - this.width / 2)));
    this.tag.position.set(left, Math.max(Math.round(view.y + 1), top));
  }

  destroy(): void {
    this.tag?.destroy({ children: true });
    this.tag = null;
    this.text = '';
  }
}
