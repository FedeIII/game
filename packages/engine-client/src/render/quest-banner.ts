import { Container, Sprite, Texture } from 'pixi.js';
import type { Rect } from './camera.ts';
import type { PixelFont } from './pixel-text.ts';

/** The ink of the title, of the line over it, and of the shadow: those of the arrival title (intro.ts). */
const INK = 0xd8ccb0;
const KICKER = 0xc9a64a;
const SHADOW = 0x07050a;
const LINE = 0x9a3a36;
/** World pixels for each font pixel of the title (the line over it has 1). */
const SCALE = 2;
const LINE_OVERHANG = 28;

/** The times of a banner, in milliseconds: it fades in, stays, and fades out. */
export const BANNER_TIMING = { fadeIn: 400, hold: 2400, fadeOut: 700 } as const;
const LENGTH = BANNER_TIMING.fadeIn + BANNER_TIMING.hold + BANNER_TIMING.fadeOut;
/** At most this many banners wait; older ones go. */
const MAX_WAITING = 4;

const easeOut = (t: number) => 1 - (1 - t) ** 3;

interface Shown {
  readonly root: Container;
  readonly text: Container;
  readonly band: Sprite;
  readonly lineTop: Sprite;
  readonly lineBottom: Sprite;
  readonly width: number;
  readonly height: number;
  readonly at: number;
}

/**
 * A short band in the middle of the screen when a quest starts, moves on or ends (the journal,
 * ui/journal-panel.ts): a small line ("New quest") over the title of the quest, in the style of the
 * arrival title (intro.ts). Banners come one after the other. It is drawn in pixel art in the text
 * layer, on whole world pixels.
 */
export class QuestBanner {
  readonly root = new Container();
  private readonly font: PixelFont;
  private readonly waiting: { kicker: string; title: string }[] = [];
  private shown: Shown | null = null;

  constructor(font: PixelFont) {
    this.font = font;
  }

  /** Whether a banner shows or waits (for the debug panel and the tests). */
  get busy(): boolean {
    return this.shown !== null || this.waiting.length > 0;
  }

  /** Shows `kicker` over `title` (both in the language of the page) after the banners before it. */
  show(kicker: string, title: string): void {
    this.waiting.push({ kicker, title });
    if (this.waiting.length > MAX_WAITING) this.waiting.shift();
  }

  /** Animates the banner over `view` (the part of the world on the screen). */
  update(now: number, view: Rect): void {
    if (this.shown && now - this.shown.at >= LENGTH) {
      this.shown.root.destroy({ children: true });
      this.shown = null;
    }
    if (!this.shown) {
      const next = this.waiting.shift();
      if (!next) return;
      this.shown = this.make(next.kicker, next.title, now);
    }
    const s = this.shown;
    const t = now - s.at;
    const { fadeIn, hold, fadeOut } = BANNER_TIMING;
    const appear = easeOut(Math.min(1, t / fadeIn));
    const alpha = t < fadeIn + hold ? appear : 1 - (t - fadeIn - hold) / fadeOut;
    // A sixth of the way down the screen: above the bubbles over the player, and above the arrival title.
    const cx = Math.round(view.x + view.width / 2);
    const cy = Math.round(view.y + view.height * 0.17);
    const rise = Math.round((1 - appear) * 4);
    s.text.position.set(Math.round(cx - s.width / 2), Math.round(cy - s.height / 2) + rise);
    const lineWidth = 2 * Math.round(((s.width + LINE_OVERHANG) / 2) * easeOut(Math.min(1, t / (fadeIn * 1.4))));
    for (const [line, y] of [
      [s.lineTop, cy - s.height / 2 - 6],
      [s.lineBottom, cy + s.height / 2 + 5],
    ] as const) {
      line.width = lineWidth;
      line.height = 1;
      line.position.set(cx - lineWidth / 2, Math.round(y));
    }
    const bandHeight = s.height + 22;
    s.band.width = Math.ceil(view.width) + 2;
    s.band.height = bandHeight;
    s.band.position.set(Math.floor(view.x) - 1, Math.round(cy - bandHeight / 2));
    s.band.alpha = 0.55;
    s.root.alpha = Math.max(0, alpha);
  }

  private make(kicker: string, title: string, now: number): Shown {
    const font = this.font;
    const kickerWidth = font.measure(kicker);
    const titleWidth = font.measure(title) * SCALE;
    const width = Math.max(kickerWidth, titleWidth);
    const gap = 3;
    const height = font.height + gap + font.height * SCALE;
    const text = new Container();
    const small = new Container();
    const kickerShadow = font.layout([kicker], SHADOW);
    kickerShadow.position.set(1, 1);
    small.addChild(kickerShadow, font.layout([kicker], KICKER));
    small.position.set(Math.round((width - kickerWidth) / 2), 0);
    const big = new Container();
    const titleShadow = font.layout([title], SHADOW);
    titleShadow.position.set(1, 1);
    big.addChild(titleShadow, font.layout([title], INK));
    big.scale.set(SCALE);
    big.position.set(Math.round((width - titleWidth) / 2), font.height + gap);
    text.addChild(small, big);
    const band = new Sprite(Texture.WHITE);
    band.tint = SHADOW;
    const lineTop = new Sprite(Texture.WHITE);
    const lineBottom = new Sprite(Texture.WHITE);
    for (const line of [lineTop, lineBottom]) line.tint = LINE;
    const root = new Container();
    root.addChild(band, lineTop, lineBottom, text);
    this.root.addChild(root);
    return { root, text, band, lineTop, lineBottom, width, height, at: now };
  }
}
