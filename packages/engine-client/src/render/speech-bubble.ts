import { Container, NineSliceSprite, Sprite } from 'pixi.js';
import type { Art } from '../assets.ts';
import type { PixelFont } from './pixel-text.ts';

/** How long a single short line stays, and how long it takes to appear and to fade, in milliseconds. */
const DURATION = 2500;
const FADE_IN = 120;
const FADE_OUT = 300;

/** The longest line before the text wraps, in world pixels. */
const MAX_TEXT_WIDTH = 104;

// The frame, in world pixels: a 1-pixel border, then padding round the text.
const BORDER = 1;
const PAD_X = 3;
const PAD_TOP = 2;
const PAD_BOTTOM = 1;
const TAIL_WIDTH = 5;
const TAIL_HEIGHT = 3;

/** The colour of the text: the parchment of the GUI theme (--ui-ink in style.css). */
const INK = 0xd8ccb0;

/** Where the tip of the tail goes, in world pixels: over the head of whoever speaks. */
export type Anchor = () => { x: number; y: number };

/**
 * A speech bubble, drawn by the game in pixel art: the pixel font in a 9-slice frame with a
 * tail. It shows pages one at a time over a moving anchor (the player's head, an NPC's head); a
 * small triangle blinks while more pages follow. A dialog of one page fades by itself after
 * DURATION; a longer one stays until `next()` closes it or the game calls `hide()`. It lives in
 * the world (one letter pixel is one game pixel), above the darkness. A hidden HTML live region
 * repeats each page for screen readers.
 */
export class SpeechBubble {
  readonly root = new Container();
  private readonly font: PixelFont;
  private readonly frame: NineSliceSprite;
  private readonly tail: Sprite;
  private readonly more: Sprite;
  private readonly live: HTMLElement;
  private text: Container | null = null;
  private pages: readonly string[] = [];
  private page = 0;
  private anchor: Anchor = () => ({ x: 0, y: 0 });
  private width = 0;
  private height = 0;
  private shownAt = -Infinity;
  private hideAt = -Infinity;

  constructor(art: Art, font: PixelFont) {
    this.font = font;
    this.frame = new NineSliceSprite({ texture: art.frame('ui/bubble'), leftWidth: 2, topHeight: 2, rightWidth: 2, bottomHeight: 2 });
    this.tail = new Sprite(art.frame('ui/bubble-tail'));
    this.tail.anchor.set(0, 0);
    this.more = new Sprite(art.frame('ui/more'));
    this.root.addChild(this.frame, this.tail, this.more);
    this.root.visible = false;

    this.live = document.createElement('div');
    this.live.className = 'sr-only';
    this.live.setAttribute('role', 'status');
    this.live.setAttribute('aria-live', 'polite');
    document.body.append(this.live);
  }

  /** Whether a dialog is on screen (or fading out). */
  get showing(): boolean {
    return this.pages.length > 0;
  }

  /** Whether more pages follow the one on screen. */
  get hasMore(): boolean {
    return this.page < this.pages.length - 1;
  }

  /** Shows the first page of a dialog over `anchor`, from `now` (performance.now()). */
  show(pages: readonly string[], anchor: Anchor, now: number): void {
    if (pages.length === 0) return;
    // Do not fade in again when a dialog replaces one that is still on screen.
    if (!this.root.visible) this.shownAt = now;
    this.pages = pages;
    this.page = 0;
    this.anchor = anchor;
    this.layout(now);
  }

  /** Shows the next page. Returns false when there was no next page: then the dialog closes. */
  next(now: number): boolean {
    if (!this.hasMore) {
      this.hide(now);
      return false;
    }
    this.page++;
    this.layout(now);
    return true;
  }

  /** Closes the dialog, with a short fade. */
  hide(now: number): void {
    if (!this.showing) return;
    this.pages = [];
    this.hideAt = Math.min(this.hideAt, now);
  }

  private layout(now: number): void {
    const line = this.pages[this.page]!;
    const lines = this.font.wrap(line, MAX_TEXT_WIDTH);
    const textWidth = Math.max(...lines.map((l) => this.font.measure(l)));
    const textHeight = (lines.length - 1) * this.font.lineHeight + this.font.height;
    const more = this.hasMore;
    this.width = textWidth + 2 * (BORDER + PAD_X) + (more ? 6 : 0);
    this.height = textHeight + 2 * BORDER + PAD_TOP + PAD_BOTTOM;

    this.text?.destroy({ children: true });
    this.text = this.font.layout(lines, INK);
    this.text.position.set(BORDER + PAD_X, BORDER + PAD_TOP);
    this.root.addChild(this.text);
    this.frame.width = this.width;
    this.frame.height = this.height;
    // The tail's top row covers the bottom border, which opens the frame there.
    this.tail.position.set(Math.floor((this.width - TAIL_WIDTH) / 2), this.height - 1);
    this.more.position.set(this.width - BORDER - 6, this.height - BORDER - 4);
    this.more.visible = more;

    // One short page goes away by itself; a dialog stays until it is closed.
    this.hideAt = this.pages.length === 1 ? now + DURATION : Infinity;
    this.live.textContent = line;
  }

  /** Follows the anchor, fades the bubble in and out, and blinks the "more" triangle. */
  update(now: number): void {
    if (this.showing && now >= this.hideAt) this.pages = [];
    const alpha = Math.min(1, (now - this.shownAt) / FADE_IN, (this.hideAt + FADE_OUT - now) / FADE_OUT);
    this.root.visible = alpha > 0;
    if (!this.root.visible) {
      if (this.live.textContent) this.live.textContent = '';
      return;
    }
    this.root.alpha = alpha;
    this.more.alpha = Math.floor(now / 400) % 2 === 0 ? 1 : 0.35;
    // The frame goes on whole world pixels, so the letters stay on the pixel grid.
    const { x, y } = this.anchor();
    this.root.position.set(Math.round(x - this.width / 2), Math.round(y - this.height - TAIL_HEIGHT + 1));
  }
}
