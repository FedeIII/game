import { SKIN_PORTRAIT, SKIN_WALK_FRAMES, skinCell, skinKey, type SkinLook } from '../../art/skins.ts';
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
  private look: SkinLook | null = null;
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
    return this.look !== null && this.skins.sheet(this.look) === null;
  }

  /** Called when the look asked for last is ready. */
  onReady(listener: () => void): void {
    this.readyListener = listener;
  }

  /** Shows a look: a seed, and what shows of its gear. */
  show(look: SkinLook): void {
    if (this.look && skinKey(look) === skinKey(this.look)) return;
    if (this.look !== null && this.skins.sheet(this.look) === null) this.skins.cancel(this.look);
    this.look = look;
    const ready = this.skins.get(
      look,
      () => {
        if (look !== this.look) return;
        this.use(this.skins.sheet(look));
      },
      true,
    );
    if (ready) this.use(this.skins.sheet(look));
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
    if (!this.walk) {
      const { x, y } = SKIN_PORTRAIT;
      context.drawImage(this.sheet, x, y, this.element.width, this.element.height, 0, 0, this.element.width, this.element.height);
      return;
    }
    const t = now - this.started;
    const view = TURN[Math.floor(t / TURN_MS) % TURN.length]!;
    const column = 1 + (Math.floor((t / 1000) * WALK_FPS) % SKIN_WALK_FRAMES);
    const { x, y, width: w, height: h } = WALK_CROP;
    const cell = skinCell(column, view);
    context.drawImage(this.sheet, cell.x + x, cell.y + y, w, h, 0, 0, w, h);
  }
}
