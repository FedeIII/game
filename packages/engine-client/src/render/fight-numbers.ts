import { Container } from 'pixi.js';
import type { PixelFont } from './pixel-text.ts';

/**
 * The colours of the texts of a fight, on a 1-pixel shadow (Fede, 2026-10-15: green for what is good for
 * the player, red for what a mob does against it): a blow of the player, `good` (a critical hit of the
 * player, a good moment of a mechanic), `miss` (a neutral word in grey), `hurt` (a hit on the player, a
 * bad moment), `heal` (hit points back).
 */
export const FIGHT_INK = { blow: 0xe8e0c8, good: 0x7ac060, miss: 0x8a8478, hurt: 0xe04a3a, heal: 0x7ac060 } as const;
const SHADOW = 0x07050a;
/** A number rises this far (world pixels) over its life (ms), and fades in its last part. */
const RISE = 14;
const LIFE_MS = 900;
const FADE_MS = 300;

interface Number_ {
  readonly text: Container;
  readonly width: number;
  readonly at: number;
  /** Where it starts: over a head (world pixels). */
  readonly x: number;
  readonly y: number;
}

/**
 * What the dice of a fight did (docs/drafts/level-3.md), as numbers that rise from a head and fade:
 * the damage of the player's blow over a mob ("7"; a critical hit in green, with no mark), and the damage that the
 * player takes (a miss shows no word: Fede, 2026-10-15); and the words of the mechanics of the sandbox. In the tiny font (Fede,
 * 2026-10-15: every text of a fight is smaller than a name), in the text layer (above the darkness).
 */
export class FightNumbers {
  private readonly font: PixelFont;
  private readonly layer: Container;
  private numbers: Number_[] = [];

  constructor(font: PixelFont, layer: Container) {
    this.font = font;
    this.layer = layer;
  }

  /** Shows `text` in `ink`, rising from (x, y) (world pixels: over a head). */
  show(text: string, ink: number, x: number, y: number, now: number): void {
    const box = new Container();
    const shadow = this.font.layout([text], SHADOW);
    shadow.position.set(1, 1);
    box.addChild(shadow, this.font.layout([text], ink));
    this.layer.addChild(box);
    // Two numbers at one place start apart, so they do not cover each other.
    const near = this.numbers.filter((n) => Math.abs(n.x - x) < 6 && now - n.at < 200).length;
    this.numbers.push({ text: box, width: this.font.measure(text), at: now, x: x + near * 5, y: y - near * 4 });
  }

  /** How many numbers show (the tests and the debug panel). */
  get count(): number {
    return this.numbers.length;
  }

  update(now: number): void {
    const kept: Number_[] = [];
    for (const n of this.numbers) {
      const age = now - n.at;
      if (age >= LIFE_MS) {
        n.text.destroy({ children: true });
        continue;
      }
      kept.push(n);
      n.text.position.set(Math.round(n.x - n.width / 2), Math.round(n.y - (RISE * age) / LIFE_MS));
      n.text.alpha = age > LIFE_MS - FADE_MS ? (LIFE_MS - age) / FADE_MS : 1;
    }
    this.numbers = kept;
  }
}
