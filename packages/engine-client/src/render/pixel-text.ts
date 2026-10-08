import { Container, Sprite, type Texture } from 'pixi.js';
import atlasData from '../generated/atlas.json';
import type { Art } from '../assets.ts';
import { measureLine, wrapText } from './text-layout.ts';

/** Typographic characters that the font draws as plain ones. */
const PLAIN: Record<string, string> = { '‘': "'", '’': "'", '“': '"', '”': '"', '…': '.', '«': '"', '»': '"' };

/**
 * The code of a plain character for one the font lacks: a curly quote as a straight one, an
 * accented capital (no room above it in the font) as the capital without its accent.
 */
function plainCode(code: number): number {
  const ch = String.fromCodePoint(code);
  return (PLAIN[ch] ?? ch.normalize('NFD')[0] ?? ch).codePointAt(0)!;
}

/**
 * A pixel font from the atlas (art/font.ts). Text is laid out in world pixels, so one pixel of
 * a letter is one game pixel: it scales with the zoom and goes through the CRT filter like the
 * rest of the world. Glyphs are white; a tint gives them their colour.
 *
 * 'normal' is the font of speech and signs; 'small' is the font of name tags: small capitals,
 * so it shows a lowercase letter as its capital.
 */
export class PixelFont {
  readonly height: number;
  readonly lineHeight: number;
  readonly spacing: number;
  private readonly art: Art;
  private readonly prefix: string;
  private readonly capitals: boolean;
  private readonly fallback: Texture;
  private readonly glyphs = new Map<number, Texture>();

  constructor(art: Art, size: 'normal' | 'small' = 'normal') {
    const metrics = size === 'small' ? atlasData.meta.smallFont : atlasData.meta.font;
    this.art = art;
    this.height = metrics.height;
    this.lineHeight = metrics.lineHeight;
    this.spacing = metrics.spacing;
    this.prefix = size === 'small' ? 'smallfont' : 'font';
    this.capitals = size === 'small';
    this.fallback = art.frame(metrics.fallback);
  }

  glyph(code: number): Texture {
    let texture = this.glyphs.get(code);
    if (!texture) {
      const wanted = this.capitals ? String.fromCodePoint(code).toUpperCase().codePointAt(0)! : code;
      texture =
        this.art.tryFrame(`${this.prefix}/${wanted}`) ??
        this.art.tryFrame(`${this.prefix}/${plainCode(wanted)}`) ??
        this.art.tryFrame(`${this.prefix}/${String.fromCodePoint(plainCode(code)).toUpperCase().codePointAt(0)!}`) ??
        this.fallback;
      this.glyphs.set(code, texture);
    }
    return texture;
  }

  /** The width of one line, in pixels. */
  measure(line: string): number {
    return measureLine(line, (code) => this.glyph(code).width, this.spacing);
  }

  /** Splits text into lines no wider than `maxWidth`, at spaces. A longer word gets its own line. */
  wrap(text: string, maxWidth: number): string[] {
    return wrapText(text, maxWidth, (line) => this.measure(line));
  }

  /** Makes one sprite for each glyph, with the first line's top-left corner at (0, 0). */
  layout(lines: readonly string[], tint: number): Container {
    const container = new Container();
    lines.forEach((line, row) => {
      let x = 0;
      for (const ch of line) {
        const texture = this.glyph(ch.codePointAt(0)!);
        const sprite = new Sprite(texture);
        sprite.position.set(x, row * this.lineHeight);
        sprite.tint = tint;
        container.addChild(sprite);
        x += texture.width + this.spacing;
      }
    });
    return container;
  }
}
