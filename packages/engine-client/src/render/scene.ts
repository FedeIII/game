import type { Container } from 'pixi.js';
import type { SceneDef } from '@game/engine';
import type { Art } from '../assets.ts';
import type { Rect } from './camera.ts';
import type { PixelFont } from './pixel-text.ts';
import { SpeechBubble, type Anchor } from './speech-bubble.ts';

/** Time to read a line: a base and a little more for each letter (as the welcome). */
const BASE_MS = 2400;
const PER_LETTER_MS = 50;
const LONGEST_MS = 7500;
/** Between two lines. */
const GAP_MS = 300;

const readingTime = (line: string) => Math.min(LONGEST_MS, BASE_MS + line.length * PER_LETTER_MS);

/** A line of a scene as the page says it: its text (in the language of the page, or a murmur), over whose head, and what to do when it starts. */
export interface SceneSay {
  readonly text: string;
  readonly anchor: Anchor;
  /** Called when the line starts (the NPC stops its own line). */
  readonly started?: (now: number) => void;
}

/**
 * A scene that the character overhears (the engine's scenes.ts): its NPCs say its lines one after
 * the other, each over its own head, as long as it takes to read it. The character can walk; the
 * game stops the scene when it leaves the area. Screen readers hear each line.
 */
export class ScenePlayer {
  private readonly bubble: SpeechBubble;
  private scene: SceneDef | null = null;
  private lines: readonly SceneSay[] = [];
  private index = -1;
  private nextAt = Infinity;

  constructor(art: Art, font: PixelFont, textLayer: Container) {
    this.bubble = new SpeechBubble(art, font, { live: true, duration: readingTime, name: 'scene' });
    textLayer.addChild(this.bubble.root);
  }

  /** The scene that plays, or null. */
  get playing(): SceneDef | null {
    return this.scene;
  }

  /** "2/5" while a scene plays; for the debug panel and the tests. */
  get progress(): string {
    return this.scene ? `${this.scene.id} ${this.index + 1}/${this.lines.length}` : '-';
  }

  start(scene: SceneDef, lines: readonly SceneSay[], now: number): void {
    this.scene = scene;
    this.lines = lines;
    this.index = -1;
    this.nextAt = now;
  }

  /** Stops the scene at once (the character left its area). */
  stop(now: number): void {
    this.scene = null;
    this.lines = [];
    this.nextAt = Infinity;
    this.bubble.hide(now);
  }

  /** Says the next line when it is time. Returns the scene that ended now (all its lines said), else null. */
  update(now: number, view: Rect): SceneDef | null {
    let ended: SceneDef | null = null;
    if (this.scene && now >= this.nextAt) {
      this.index++;
      const line = this.lines[this.index];
      if (line === undefined) {
        ended = this.scene;
        this.scene = null;
        this.lines = [];
        this.nextAt = Infinity;
      } else {
        line.started?.(now);
        this.bubble.show([line.text], line.anchor, now);
        this.nextAt = now + readingTime(line.text) + GAP_MS;
      }
    }
    this.bubble.update(now, view);
    return ended;
  }
}
