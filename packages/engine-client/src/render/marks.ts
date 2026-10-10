import { Container, Sprite, type Texture } from 'pixi.js';
import type { Art } from '../assets.ts';
import type { Rect } from './camera.ts';

/** The marks keep this far (world pixels) inside the edge of the view, clear of the edge and of the scanlines. */
const INSET = 10;
/** A target this far (world pixels) inside the view, or more, is on the screen: no mark. */
const ON_SCREEN = 4;
const DIRECTIONS = 16;
const DANGER_TINT = 0xd0302a;
const HOMEWARD_TINT = 0xc9b88a;
/** The danger marks pulse this often (ms). */
const PULSE_MS = 700;

/** A point in the world to mark. */
export interface MarkTarget {
  readonly x: number;
  readonly y: number;
}

/**
 * Marks at the edge of the screen (Wisdom), in the text layer, above the darkness: a red chevron
 * for each mob that hunts the player out of its view (`ui/danger/<i>`), and a pale arrow to the
 * home while it is out of view (`ui/homeward/<i>`). Each mark sits where the line from the middle
 * of the view to its target leaves the view, and points along that line, in 16 directions (the
 * art is drawn at each angle: no turn at run time).
 */
export class EdgeMarks {
  readonly root = new Container();
  private readonly danger: Texture[];
  private readonly homeward: Texture[];
  private readonly sprites: Sprite[] = [];

  constructor(art: Art) {
    this.danger = Array.from({ length: DIRECTIONS }, (_, i) => art.frame(`ui/danger/${i}`));
    this.homeward = Array.from({ length: DIRECTIONS }, (_, i) => art.frame(`ui/homeward/${i}`));
  }

  /** Shows the marks for this view: `hunters` (danger) and `home` (or null). */
  update(view: Rect, hunters: readonly MarkTarget[], home: MarkTarget | null, now: number): void {
    let used = 0;
    const pulse = 0.65 + 0.35 * Math.cos((2 * Math.PI * (now % PULSE_MS)) / PULSE_MS);
    const place = (target: MarkTarget, textures: Texture[], tint: number, alpha: number) => {
      const at = edgePoint(view, target);
      if (!at) return;
      let sprite = this.sprites[used];
      if (!sprite) {
        sprite = new Sprite();
        sprite.anchor.set(0.5);
        this.sprites.push(sprite);
        this.root.addChild(sprite);
      }
      used++;
      sprite.texture = textures[directionIndex(at.angle)]!;
      sprite.tint = tint;
      sprite.alpha = alpha;
      sprite.position.set(Math.round(at.x), Math.round(at.y));
      sprite.visible = true;
    };
    if (home) place(home, this.homeward, HOMEWARD_TINT, 0.85);
    for (const hunter of hunters) place(hunter, this.danger, DANGER_TINT, pulse);
    for (let i = used; i < this.sprites.length; i++) this.sprites[i]!.visible = false;
  }

  /** How many marks show now (the debug panel). */
  get count(): number {
    return this.sprites.filter((s) => s.visible).length;
  }
}

/** The index of the frame that points along `angle` (radians, clockwise from east on the screen). */
export function directionIndex(angle: number): number {
  const step = (2 * Math.PI) / DIRECTIONS;
  return (((Math.round(angle / step) % DIRECTIONS) + DIRECTIONS) % DIRECTIONS) as number;
}

/**
 * Where the line from the middle of `view` to `target` leaves the view, INSET inside it, and the
 * angle of that line; null if the target is on the screen.
 */
export function edgePoint(view: Rect, target: MarkTarget): { x: number; y: number; angle: number } | null {
  const inside =
    target.x >= view.x + ON_SCREEN && target.x <= view.x + view.width - ON_SCREEN && target.y >= view.y + ON_SCREEN && target.y <= view.y + view.height - ON_SCREEN;
  if (inside) return null;
  const cx = view.x + view.width / 2;
  const cy = view.y + view.height / 2;
  const dx = target.x - cx;
  const dy = target.y - cy;
  const halfW = Math.max(1, view.width / 2 - INSET);
  const halfH = Math.max(1, view.height / 2 - INSET);
  // The share of the line that reaches the inset edge first.
  const t = Math.min(dx !== 0 ? halfW / Math.abs(dx) : Infinity, dy !== 0 ? halfH / Math.abs(dy) : Infinity);
  return { x: cx + dx * t, y: cy + dy * t, angle: Math.atan2(dy, dx) };
}
