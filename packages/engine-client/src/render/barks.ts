import type { Container } from 'pixi.js';
import type { Art } from '../assets.ts';
import type { Rect } from './camera.ts';
import type { PixelFont } from './pixel-text.ts';
import { SpeechBubble, type Anchor } from './speech-bubble.ts';
import { tw } from '../i18n.ts';

/** A line stays this long, and a little longer for each letter: time to read it. */
const BASE_MS = 3000;
const PER_LETTER_MS = 45;
const LONGEST_MS = 7000;

/** An NPC that can greet the player now (Charisma): close, in the same place, with a greeting that it has not said. */
export interface Greeter {
  readonly index: number;
  readonly id: string;
  /** Whether the player talks to this NPC: it does not greet then. */
  readonly partner: boolean;
}

/**
 * The NPC that greets the player now, of `close`, or null; it goes into `greeted`. The NPC of the
 * conversation never greets: it goes into `greeted` at once. While `quiet` (a talk with someone, or
 * the last greeting still on the screen), nobody greets: the greetings wait, and then come one at a
 * time, so that no bubble covers another (Fede, 2026-10-15).
 */
export function nextGreeting(close: readonly Greeter[], greeted: Set<string>, quiet: boolean): number | null {
  for (const npc of close) if (npc.partner) greeted.add(npc.id);
  if (quiet) return null;
  const npc = close.find((c) => !greeted.has(c.id));
  if (!npc) return null;
  greeted.add(npc.id);
  return npc.index;
}

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
  say(index: number, english: string, anchor: Anchor, now: number): void {
    const line = tw(english);
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

  /** Whether NPC `index` says a line now (or a greeting). */
  showing(index: number): boolean {
    return this.bubbles.get(index)?.showing ?? false;
  }

  /** Stops the lines of all the NPCs at once: the player has started to talk to someone. */
  hushAll(now: number): void {
    for (const bubble of this.bubbles.values()) bubble.hide(now);
  }

  update(now: number, view: Rect): void {
    for (const bubble of this.bubbles.values()) bubble.update(now, view);
  }
}
