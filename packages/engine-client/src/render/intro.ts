import { Container, Sprite, Texture } from 'pixi.js';
import type { Rect } from './camera.ts';
import type { PixelFont } from './pixel-text.ts';

/** The ink of the title (the parchment of the GUI) and of its shadow. */
const INK = 0xd8ccb0;
const SHADOW = 0x07050a;
const LINE = 0x9a3a36;
/** World pixels for each font pixel: the title is twice the size of the text in the world. */
const SCALE = 2;
/** The ornamental lines are this much longer than the title, in world pixels. */
const LINE_OVERHANG = 28;

/** The times of the title, in milliseconds: it fades in, stays, and fades out. */
export const INTRO_TIMING = { fadeIn: 650, hold: 1450, fadeOut: 800 } as const;
export const INTRO_LENGTH = INTRO_TIMING.fadeIn + INTRO_TIMING.hold + INTRO_TIMING.fadeOut;

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * The name of a world in the middle of the screen when a visitor arrives, as in an old action
 * game: on a dark band, between two thin lines that grow from the centre, it fades in while it
 * rises a few pixels, stays a moment, and fades out. It is drawn in pixel art with the game's
 * font, in the text layer (above the darkness, with the text CRT), on whole world pixels.
 */
export class IntroTitle {
  readonly root = new Container();
  private readonly band: Sprite;
  private readonly text: Container;
  private readonly lineTop: Sprite;
  private readonly lineBottom: Sprite;
  private readonly textWidth: number;
  private readonly textHeight: number;
  private startAt: number | null = null;
  private finished = false;

  constructor(font: PixelFont, title: string) {
    this.textWidth = font.measure(title) * SCALE;
    this.textHeight = font.height * SCALE;
    this.band = new Sprite(Texture.WHITE);
    this.band.tint = SHADOW;
    const shadow = font.layout([title], SHADOW);
    shadow.position.set(1, 1);
    const ink = font.layout([title], INK);
    this.text = new Container();
    this.text.addChild(shadow, ink);
    this.text.scale.set(SCALE);
    this.lineTop = new Sprite(Texture.WHITE);
    this.lineBottom = new Sprite(Texture.WHITE);
    for (const line of [this.lineTop, this.lineBottom]) line.tint = LINE;
    this.root.addChild(this.band, this.lineTop, this.lineBottom, this.text);
    this.root.visible = false;
  }

  /** 'waiting', 'in', 'hold', 'out' or 'done': for the debug panel and the tests. */
  phase(now: number): string {
    if (this.finished) return 'done';
    if (this.startAt === null) return 'waiting';
    const t = now - this.startAt;
    return t < INTRO_TIMING.fadeIn ? 'in' : t < INTRO_TIMING.fadeIn + INTRO_TIMING.hold ? 'hold' : 'out';
  }

  start(now: number): void {
    this.startAt = now;
    this.root.visible = true;
  }

  /** Animates the title over `view` (the part of the world on the screen). */
  update(now: number, view: Rect): void {
    if (this.startAt === null || this.finished) return;
    const t = now - this.startAt;
    if (t >= INTRO_LENGTH) {
      this.finished = true;
      this.root.visible = false;
      return;
    }
    const { fadeIn, hold, fadeOut } = INTRO_TIMING;
    const appear = easeOut(Math.min(1, t / fadeIn));
    const alpha = t < fadeIn + hold ? appear : 1 - (t - fadeIn - hold) / fadeOut;
    // A third of the way down the screen: over the player, who stands in the middle.
    const cx = Math.round(view.x + view.width / 2);
    const cy = Math.round(view.y + view.height * 0.32);
    const rise = Math.round((1 - appear) * 6);
    this.text.position.set(Math.round(cx - this.textWidth / 2), Math.round(cy - this.textHeight / 2) + rise);
    // The lines grow from the centre, a little behind the text.
    const lineWidth = 2 * Math.round(((this.textWidth + LINE_OVERHANG) / 2) * easeOut(Math.min(1, t / (fadeIn * 1.4))));
    for (const [line, y] of [
      [this.lineTop, cy - this.textHeight / 2 - 6],
      [this.lineBottom, cy + this.textHeight / 2 + 5],
    ] as const) {
      line.width = lineWidth;
      line.height = 1;
      line.position.set(cx - lineWidth / 2, Math.round(y));
    }
    const bandHeight = this.textHeight + 22;
    this.band.width = Math.ceil(view.width) + 2;
    this.band.height = bandHeight;
    this.band.position.set(Math.floor(view.x) - 1, Math.round(cy - bandHeight / 2));
    this.band.alpha = 0.55;
    this.root.alpha = Math.max(0, alpha);
  }
}
