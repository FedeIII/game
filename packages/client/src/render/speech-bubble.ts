import { Container, NineSliceSprite, Sprite } from 'pixi.js';
import type { Art } from '../assets.ts';
import type { PixelFont } from './pixel-text.ts';

/** How long a line stays, and how long it takes to appear and to fade, in milliseconds. */
const DURATION = 2500;
const FADE_IN = 120;
const FADE_OUT = 300;

/** The longest line before the text wraps, in world pixels. */
const MAX_TEXT_WIDTH = 96;

// The frame, in world pixels: a 1-pixel border, then padding round the text.
const BORDER = 1;
const PAD_X = 3;
const PAD_TOP = 2;
const PAD_BOTTOM = 1;
const TAIL_WIDTH = 5;
const TAIL_HEIGHT = 3;

/** The colour of the text: the parchment of the GUI theme (--ui-ink in style.css). */
const INK = 0xd8ccb0;

/**
 * A speech bubble over the player's head, drawn by the game in pixel art: the pixel font in a
 * 9-slice frame with a tail. It lives in the world (one letter pixel is one game pixel) and
 * goes through the CRT filter. It sits above the darkness, so a line is readable at night.
 * A hidden HTML live region repeats the line for screen readers.
 */
export class SpeechBubble {
  readonly root = new Container();
  private readonly font: PixelFont;
  private readonly frame: NineSliceSprite;
  private readonly tail: Sprite;
  private readonly live: HTMLElement;
  private text: Container | null = null;
  private width = 0;
  private height = 0;
  private shownAt = -Infinity;
  private hideAt = -Infinity;

  constructor(art: Art, font: PixelFont) {
    this.font = font;
    this.frame = new NineSliceSprite({ texture: art.frame('ui/bubble'), leftWidth: 2, topHeight: 2, rightWidth: 2, bottomHeight: 2 });
    this.tail = new Sprite(art.frame('ui/bubble-tail'));
    this.tail.anchor.set(0, 0);
    this.root.addChild(this.frame, this.tail);
    this.root.visible = false;

    this.live = document.createElement('div');
    this.live.className = 'sr-only';
    this.live.setAttribute('role', 'status');
    this.live.setAttribute('aria-live', 'polite');
    document.body.append(this.live);
  }

  /** Shows a line from `now` (performance.now()) for DURATION. A new line replaces the old one. */
  say(line: string, now: number): void {
    const lines = this.font.wrap(line, MAX_TEXT_WIDTH);
    const textWidth = Math.max(...lines.map((l) => this.font.measure(l)));
    const textHeight = (lines.length - 1) * this.font.lineHeight + this.font.height;
    this.width = textWidth + 2 * (BORDER + PAD_X);
    this.height = textHeight + 2 * BORDER + PAD_TOP + PAD_BOTTOM;

    this.text?.destroy({ children: true });
    this.text = this.font.layout(lines, INK);
    this.text.position.set(BORDER + PAD_X, BORDER + PAD_TOP);
    this.root.addChild(this.text);
    this.frame.width = this.width;
    this.frame.height = this.height;
    // The tail's top row covers the bottom border, which opens the frame there.
    this.tail.position.set(Math.floor((this.width - TAIL_WIDTH) / 2), this.height - 1);

    // Do not fade in again when a line replaces a line that is still on screen.
    if (now >= this.hideAt) this.shownAt = now;
    this.hideAt = now + DURATION;
    this.live.textContent = line;
  }

  /**
   * Puts the tip of the tail at the world point (x, y) and fades the bubble in and out. The
   * frame goes on whole world pixels, so the letters stay on the pixel grid.
   */
  update(now: number, x: number, y: number): void {
    const alpha = Math.min(1, (now - this.shownAt) / FADE_IN, (this.hideAt + FADE_OUT - now) / FADE_OUT);
    this.root.visible = alpha > 0;
    if (!this.root.visible) {
      if (this.live.textContent) this.live.textContent = '';
      return;
    }
    this.root.alpha = alpha;
    this.root.position.set(Math.round(x - this.width / 2), Math.round(y - this.height - TAIL_HEIGHT + 1));
  }
}
