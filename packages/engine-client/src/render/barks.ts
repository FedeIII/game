import type { Container } from 'pixi.js';
import type { Art } from '../assets.ts';
import type { Rect } from './camera.ts';
import type { PixelFont } from './pixel-text.ts';
import { SpeechBubble, type Anchor } from './speech-bubble.ts';

/** A line stays this long, and a little longer for each letter: time to read it. */
const BASE_MS = 3000;
const PER_LETTER_MS = 45;
const LONGEST_MS = 7000;

/**
 * The lines that NPCs say by themselves: one bubble for each NPC that speaks, over its head,
 * in the text layer. Screen readers do not hear them (the dialogs they hear are the ones that
 * the player opens).
 */
export class BarkBubbles {
  private readonly art: Art;
  private readonly font: PixelFont;
  private readonly layer: Container;
  private readonly bubbles = new Map<number, SpeechBubble>();

  constructor(art: Art, font: PixelFont, textLayer: Container) {
    this.art = art;
    this.font = font;
    this.layer = textLayer;
  }

  /** Shows `line` over NPC `index`, which `anchor` follows. */
  say(index: number, line: string, anchor: Anchor, now: number): void {
    let bubble = this.bubbles.get(index);
    if (!bubble) {
      bubble = new SpeechBubble(this.art, this.font, {
        live: false,
        duration: (text) => Math.min(LONGEST_MS, BASE_MS + text.length * PER_LETTER_MS),
      });
      this.layer.addChild(bubble.root);
      this.bubbles.set(index, bubble);
    }
    bubble.show([line], anchor, now);
  }

  /** Stops the line of NPC `index` at once: the player has started to talk to it. */
  hush(index: number, now: number): void {
    this.bubbles.get(index)?.hide(now);
  }

  update(now: number, view: Rect): void {
    for (const bubble of this.bubbles.values()) bubble.update(now, view);
  }
}
