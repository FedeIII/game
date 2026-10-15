import { Container, Sprite, type Texture } from 'pixi.js';
import type { Art } from '../assets.ts';
import type { LightSource } from './lighting.ts';

/**
 * The sparks of two weapons that meet in a parry (a mechanic of the sandbox: mechanics.ts; Fede,
 * 2026-10-15): a burst of sparks (`fx/spark/<i>`) that flies out and falls, a soft flash (`fx/flash`,
 * added) and a short warm light where the weapons meet. They glow above the darkness (the owner puts the
 * layer above the lights).
 */

/** The burst plays its frames over this long (ms); the flash and its light last FLASH_MS. */
const SPARK_MS = 420;
const FLASH_MS = 180;
/** The warm white of hot steel, for the sparks, the flash and the light. */
const SPARK_TINT = 0xfff0c0;
const FLASH_TINT = 0xfff6e0;
const LIGHT = { radius: 48, colour: 0xffe2a8, seed: 77 } as const;

interface Burst {
  readonly sparks: Sprite;
  readonly flash: Sprite;
  readonly x: number;
  readonly y: number;
  readonly at: number;
}

export class Sparks {
  private readonly layer: Container;
  private readonly frames: readonly Texture[];
  private readonly flashFrame: Texture;
  private readonly bursts: Burst[] = [];

  constructor(art: Art, layer: Container) {
    this.layer = layer;
    this.frames = art.variants('fx/spark');
    this.flashFrame = art.frame('fx/flash');
  }

  /** A burst at (x, y) (world pixels: where the weapons meet), from `now` (ms). */
  burst(x: number, y: number, now: number): void {
    const sparks = new Sprite(this.frames[0]);
    sparks.anchor.set(0.5);
    sparks.tint = SPARK_TINT;
    sparks.position.set(Math.round(x), Math.round(y));
    const flash = new Sprite(this.flashFrame);
    flash.anchor.set(0.5);
    flash.tint = FLASH_TINT;
    flash.blendMode = 'add';
    flash.position.copyFrom(sparks.position);
    this.layer.addChild(flash, sparks);
    this.bursts.push({ sparks, flash, x, y, at: now });
  }

  /** Plays the bursts on; a burst that is over goes. */
  update(now: number): void {
    for (const burst of [...this.bursts]) {
      const t = now - burst.at;
      if (t >= SPARK_MS) {
        burst.sparks.destroy();
        burst.flash.destroy();
        this.bursts.splice(this.bursts.indexOf(burst), 1);
        continue;
      }
      burst.sparks.texture = this.frames[Math.min(this.frames.length - 1, Math.floor((t / SPARK_MS) * this.frames.length))]!;
      burst.flash.visible = t < FLASH_MS;
      burst.flash.alpha = Math.max(0, 1 - t / FLASH_MS);
    }
  }

  /** The light of each flash now: a short warm light where the weapons met. */
  lights(now: number): LightSource[] {
    return this.bursts.filter((b) => now - b.at < FLASH_MS).map((b) => ({ x: b.x, y: b.y, radius: LIGHT.radius, colour: LIGHT.colour, flicker: false, seed: LIGHT.seed }));
  }
}
