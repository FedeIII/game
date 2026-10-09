import { SKIN_FRAME, SKIN_PORTRAIT, SKIN_WALK_FRAMES } from '../../art/skins.ts';
import type { SkinStore } from '../skins/skin-store.ts';

/**
 * The part of a frame that the walking preview shows: round the figure and what it carries
 * (SKIN_FRAME is 56 x 56, the feet at 28, 50). The CSS of .portrait-walk sets its size on the
 * screen (4x, or 3x on a narrow screen).
 */
const WALK_CROP = { x: 8, y: 2, width: 40, height: 52 } as const;
/** The rows of a skin sheet in the order that the preview turns: down, right, up, left. */
const TURN = [0, 2, 1, 3] as const;
const WALK_FPS = 8;
/** The preview walks this long in each direction (ms). */
const TURN_MS = 2400;

/**
 * A picture of a skin for the menu, sharp at a whole-number scale. `walk`: round the figure, walking
 * and turning (the character builder); else the figure at rest, facing south (a list). A new look
 * replaces the one before; while the store draws it, the old one stays, faded.
 */
export class SkinPortrait {
  readonly element: HTMLCanvasElement;
  private readonly skins: SkinStore;
  private readonly walk: boolean;
  private seed: number | null = null;
  private sheet: HTMLCanvasElement | null = null;
  private frame = 0;
  private readonly started = performance.now();
  private readyListener: (() => void) | null = null;

  /** `scale`: the size on the screen of a still portrait (a walking one takes it from the CSS). */
  constructor(skins: SkinStore, scale: number, walk: boolean) {
    this.skins = skins;
    this.walk = walk;
    this.element = document.createElement('canvas');
    this.element.className = walk ? 'portrait portrait-walk' : 'portrait';
    const size = walk ? WALK_CROP : SKIN_PORTRAIT;
    this.element.width = size.width;
    this.element.height = size.height;
    if (!walk) {
      this.element.style.width = `${size.width * scale}px`;
      this.element.style.height = `${size.height * scale}px`;
    }
    this.element.setAttribute('aria-hidden', 'true');
    if (walk) this.frame = requestAnimationFrame(this.tick);
  }

  /** Whether the look asked for last is still being drawn. */
  get pending(): boolean {
    return this.seed !== null && this.skins.sheet(this.seed) === null;
  }

  /** Called when the look asked for last is ready. */
  onReady(listener: () => void): void {
    this.readyListener = listener;
  }

  show(seed: number): void {
    if (seed === this.seed) return;
    if (this.seed !== null && this.skins.sheet(this.seed) === null) this.skins.cancel(this.seed);
    this.seed = seed;
    const ready = this.skins.get(
      seed,
      () => {
        if (seed !== this.seed) return;
        this.use(this.skins.sheet(seed));
      },
      true,
    );
    if (ready) this.use(this.skins.sheet(seed));
    else this.element.classList.add('drawing');
  }

  /** Stops the animation (the portrait left the page). */
  stop(): void {
    cancelAnimationFrame(this.frame);
  }

  private use(sheet: HTMLCanvasElement | null): void {
    this.sheet = sheet;
    this.element.classList.remove('drawing');
    this.draw(performance.now());
    this.readyListener?.();
  }

  private readonly tick = (now: number): void => {
    this.draw(now);
    this.frame = requestAnimationFrame(this.tick);
  };

  private draw(now: number): void {
    const context = this.element.getContext('2d')!;
    context.imageSmoothingEnabled = false;
    if (!this.sheet) return;
    context.clearRect(0, 0, this.element.width, this.element.height);
    const { width, height } = SKIN_FRAME;
    if (!this.walk) {
      const { x, y } = SKIN_PORTRAIT;
      context.drawImage(this.sheet, x, y, this.element.width, this.element.height, 0, 0, this.element.width, this.element.height);
      return;
    }
    const t = now - this.started;
    const row = TURN[Math.floor(t / TURN_MS) % TURN.length]!;
    const column = 1 + (Math.floor((t / 1000) * WALK_FPS) % SKIN_WALK_FRAMES);
    const { x, y, width: w, height: h } = WALK_CROP;
    context.drawImage(this.sheet, column * width + x, row * height + y, w, h, 0, 0, w, h);
  }
}
