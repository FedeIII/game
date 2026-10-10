import { Container, NineSliceSprite, Sprite } from 'pixi.js';
import type { Art } from '../assets.ts';
import type { Rect } from './camera.ts';
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

export interface SpeechOptions {
  /**
   * Repeat each page in a hidden live region for screen readers. Default true. Off for lines
   * that NPCs say by themselves: a screen reader would read every line of every NPC.
   */
  readonly live?: boolean;
  /** How long a one-page dialog stays, in milliseconds, for a line. Default DURATION. */
  readonly duration?: (line: string) => number;
  /** A name for the live region (data-speech), so tests and tools can tell the regions apart. */
  readonly name?: string;
}

/** Where the tip of the tail goes, in world pixels: over the head of whoever speaks. */
export type Anchor = () => { x: number; y: number };

/**
 * A speech bubble, drawn by the game in pixel art: the pixel font in a 9-slice frame with a
 * tail. It shows pages one at a time over a moving anchor (the player's head, an NPC's head); a
 * small triangle blinks while more pages follow. A dialog of one page fades by itself after
 * DURATION, unless the game asks it to stay (the line of a conversation); a longer one stays
 * until `next()` closes it or the game calls `hide()`. It lives in
 * the world (one letter pixel is one game pixel), above the darkness. A hidden HTML live region
 * repeats each page for screen readers.
 */
export class SpeechBubble {
  readonly root = new Container();
  private readonly font: PixelFont;
  private readonly frame: NineSliceSprite;
  private readonly tail: Sprite;
  private readonly more: Sprite;
  private readonly live: HTMLElement | null;
  private readonly duration: (line: string) => number;
  private text: Container | null = null;
  private pages: readonly string[] = [];
  private page = 0;
  private anchor: Anchor = () => ({ x: 0, y: 0 });
  private width = 0;
  private height = 0;
  private shownAt = -Infinity;
  private hideAt = -Infinity;
  /** Whether a dialog of one page stays until the game closes it. */
  private stay = false;

  constructor(art: Art, font: PixelFont, options: SpeechOptions = {}) {
    this.font = font;
    this.duration = options.duration ?? (() => DURATION);
    this.frame = new NineSliceSprite({ texture: art.frame('ui/bubble'), leftWidth: 2, topHeight: 2, rightWidth: 2, bottomHeight: 2 });
    this.tail = new Sprite(art.frame('ui/bubble-tail'));
    this.tail.anchor.set(0, 0);
    this.more = new Sprite(art.frame('ui/more'));
    this.root.addChild(this.frame, this.tail, this.more);
    this.root.visible = false;

    this.live = null;
    if (options.live ?? true) {
      this.live = document.createElement('div');
      this.live.className = 'sr-only';
      this.live.setAttribute('role', 'status');
      this.live.setAttribute('aria-live', 'polite');
      if (options.name) this.live.dataset.speech = options.name;
      document.body.append(this.live);
    }
  }

  /** Whether a dialog is on screen (or fading out). */
  get showing(): boolean {
    return this.pages.length > 0;
  }

  /** Whether more pages follow the one on screen. */
  get hasMore(): boolean {
    return this.page < this.pages.length - 1;
  }

  /**
   * Shows the first page of a dialog over `anchor`, from `now` (performance.now()). With `stay`,
   * a dialog of one page does not fade by itself: it stays until the game closes it (the line of
   * a conversation stays while the conversation panel shows it).
   */
  show(pages: readonly string[], anchor: Anchor, now: number, stay = false): void {
    if (pages.length === 0) return;
    // Do not fade in again when a dialog replaces one that is still on screen.
    if (!this.root.visible) this.shownAt = now;
    this.stay = stay;
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

    // One short page goes away by itself; a dialog (or a page that must stay) stays until it is closed.
    this.hideAt = this.pages.length === 1 && !this.stay ? now + this.duration(line) : Infinity;
    if (this.live) this.live.textContent = line;
  }

  /**
   * Follows the anchor, fades the bubble in and out, and blinks the "more" triangle. With `view`
   * (the part of the world on the screen), the bubble stays inside it, 2 pixels from the edges:
   * an NPC at the top of the screen still shows its whole line.
   */
  update(now: number, view?: Rect): void {
    if (this.showing && now >= this.hideAt) this.pages = [];
    const alpha = Math.min(1, (now - this.shownAt) / FADE_IN, (this.hideAt + FADE_OUT - now) / FADE_OUT);
    this.root.visible = alpha > 0;
    if (!this.root.visible) {
      // Clear the live region when the dialog has closed, not in the first moment of a fade-in
      // (alpha 0 too): else a screen reader never hears a line that starts this frame.
      if (!this.showing && this.live?.textContent) this.live.textContent = '';
      return;
    }
    this.root.alpha = alpha;
    this.more.alpha = Math.floor(now / 400) % 2 === 0 ? 1 : 0.35;
    // The frame goes on whole world pixels, so the letters stay on the pixel grid.
    const { x, y } = this.anchor();
    let left = x - this.width / 2;
    let top = y - this.height - TAIL_HEIGHT + 1;
    if (view) {
      left = Math.max(view.x + 2, Math.min(view.x + view.width - this.width - 2, left));
      top = Math.max(view.y + 2, Math.min(view.y + view.height - this.height - 2, top));
    }
    this.root.position.set(Math.round(left), Math.round(top));
  }
}
