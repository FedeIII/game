import type { Container } from 'pixi.js';
import type { Art } from '../assets.ts';
import type { Rect } from './camera.ts';
import type { PixelFont } from './pixel-text.ts';
import { SpeechBubble, type Anchor } from './speech-bubble.ts';

/** Time to read a line: a base and a little more for each letter. */
const BASE_MS = 2600;
const PER_LETTER_MS = 50;
const LONGEST_MS = 7500;
/** Between two lines. */
const GAP_MS = 250;

const readingTime = (line: string) => Math.min(LONGEST_MS, BASE_MS + line.length * PER_LETTER_MS);

/**
 * A welcome for a new visitor: an NPC says a few lines, one after the other, each as long as it
 * takes to read it. The visitor does not have to press anything and can walk on. Screen readers
 * hear each line.
 */
export class WelcomeSpeech {
  private readonly bubble: SpeechBubble;
  private lines: readonly string[] = [];
  private index = -1;
  private nextAt = Infinity;
  private anchor: Anchor = () => ({ x: 0, y: 0 });

  constructor(art: Art, font: PixelFont, textLayer: Container) {
    this.bubble = new SpeechBubble(art, font, { live: true, duration: readingTime, name: 'welcome' });
    textLayer.addChild(this.bubble.root);
  }

  /** Whether the welcome is under way. */
  get active(): boolean {
    return this.lines.length > 0;
  }

  /** "2/5" while it runs; for the debug panel and the tests. */
  get progress(): string {
    return this.active ? `${this.index + 1}/${this.lines.length}` : '-';
  }

  start(lines: readonly string[], anchor: Anchor, now: number): void {
    this.lines = lines;
    this.index = -1;
    this.nextAt = now;
    this.anchor = anchor;
  }

  /** Ends the welcome at once: the visitor has started to talk to the NPC. */
  stop(now: number): void {
    this.lines = [];
    this.nextAt = Infinity;
    this.bubble.hide(now);
  }

  update(now: number, view: Rect): void {
    if (this.active && now >= this.nextAt) {
      this.index++;
      const line = this.lines[this.index];
      if (line === undefined) {
        this.lines = [];
        this.nextAt = Infinity;
      } else {
        this.bubble.show([line], this.anchor, now);
        this.nextAt = now + readingTime(line) + GAP_MS;
      }
    }
    this.bubble.update(now, view);
  }
}
