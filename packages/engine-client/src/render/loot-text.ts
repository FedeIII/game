import { Container } from 'pixi.js';
import type { PixelFont } from './pixel-text.ts';

/** Gold for what the player gets, on a 1-pixel shadow. */
const INK = 0xe0c070;
const SHADOW = 0x07050a;
/** A line rises this far (world pixels) over its life (ms), and fades in its last part. */
const RISE = 12;
const LIFE_MS = 1600;
const FADE_MS = 500;
/** A new line starts this far below the one before it while that one is still low. */
const GAP = 7;

interface Line {
  readonly text: Container;
  readonly width: number;
  readonly at: number;
}

/**
 * What a kill drops into the player's pack, as short lines that rise over its head and fade
 * ("+3 COINS", "+1 IMP HORN"), in the small font, in the text layer (above the darkness).
 */
export class LootText {
  private readonly font: PixelFont;
  private readonly layer: Container;
  private lines: Line[] = [];

  constructor(font: PixelFont, layer: Container) {
    this.font = font;
    this.layer = layer;
  }

  /** Shows these lines, one after the other. */
  add(lines: readonly string[], now: number): void {
    lines.forEach((line, i) => {
      const text = new Container();
      const shadow = this.font.layout([line], SHADOW);
      shadow.position.set(1, 1);
      text.addChild(shadow, this.font.layout([line], INK));
      this.layer.addChild(text);
      // The lines of one drop start a moment apart, so they do not cover each other.
      this.lines.push({ text, width: this.font.measure(line), at: now + i * 180 });
    });
  }

  /** Places the lines over a head: the feet at (x, y), the head `headHeight` above them. */
  update(now: number, x: number, y: number, headHeight: number): void {
    const kept: Line[] = [];
    let lowest = Infinity;
    for (const line of [...this.lines].reverse()) {
      const age = now - line.at;
      if (age >= LIFE_MS) {
        line.text.destroy({ children: true });
        continue;
      }
      kept.unshift(line);
      line.text.visible = age >= 0;
      if (age < 0) continue;
      let top = y - headHeight - 14 - (RISE * age) / LIFE_MS;
      // Never over the line after it (which started later, so it is lower).
      if (top > lowest - GAP) top = lowest - GAP;
      lowest = top;
      line.text.position.set(Math.round(x - line.width / 2), Math.round(top));
      line.text.alpha = age > LIFE_MS - FADE_MS ? (LIFE_MS - age) / FADE_MS : 1;
    }
    this.lines = kept;
  }
}
