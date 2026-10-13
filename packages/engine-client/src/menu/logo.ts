/**
 * The logo of the game at the top of the menu (art/menu-logo.ts, made by `npm run art`): "WORLD OF"
 * over a big "KANDRAX" of painted metal. It is the menu's heading: the title is in the heading as
 * text for screen readers, and it shows as text if the picture does not load.
 *
 * The logo is scaled by a whole number of device pixels, so its pixels stay sharp: as big as the
 * screen allows on the main screen and the sign-in (`open`), about half of that over a panel. It
 * fades in once it is loaded; then a shine sweeps over its metal now and then (not with reduced
 * motion).
 */
import { el } from './dom.ts';

const SHEET_URL = Object.values(import.meta.glob('../generated/menu-logo.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>)[0];
const SHEET = Object.values(import.meta.glob('../generated/menu-logo.json', { eager: true, import: 'default' }) as Record<string, LogoSheet>)[0];

export interface LogoSheet {
  /** The size of one frame (pixels of the art). */
  readonly width: number;
  readonly height: number;
  /** The frames, one under the other: the logo at rest, then the shine. */
  readonly frames: number;
  /** The room for the glow on each side of the letters. */
  readonly pad: number;
}

/** The share of the screen's height that the logo may take on the main screen. */
const OPEN_HEIGHT = 0.3;
/** The room on the sides of the letters (CSS pixels, in all): the menu's padding and a gap. The glow may reach into it. */
const SIDE_ROOM = 40;
/** One frame of the shine (ms), the wait before the first one, and the wait between two. */
const SHINE_FRAME_MS = 40;
const SHINE_FIRST_MS = 1600;
const SHINE_EVERY_MS = [7000, 10000] as const;

/**
 * The device pixels for each pixel of the art: a whole number, at least 1. On the main screen
 * (`open`) the letters fill the width of the screen (less `SIDE_ROOM`) and the logo takes at most
 * `OPEN_HEIGHT` of its height; over a panel the logo is about half of that.
 */
export function logoScale(view: { readonly width: number; readonly height: number; readonly ratio: number }, sheet: LogoSheet, open: boolean): number {
  const letters = sheet.width - 2 * sheet.pad;
  const room = Math.min(((view.width - SIDE_ROOM) * view.ratio) / letters, (view.height * OPEN_HEIGHT * view.ratio) / sheet.height);
  const big = Math.max(1, Math.floor(room));
  return open ? big : Math.max(1, Math.round(big / 2));
}

export class MenuLogo {
  /** The heading: the title as text, and the picture. */
  readonly element: HTMLHeadingElement;
  private readonly picture: HTMLElement;
  private open = true;
  /** CSS pixels for each pixel of the art. */
  private scale = 1;
  private frame = 0;
  private timer: number | undefined;
  private stopped = false;
  private readonly resize = () => this.layout();

  constructor(title: string) {
    this.picture = el('span', { class: 'menu-logo', 'aria-hidden': 'true' });
    this.element = el('h1', { class: 'menu-name' }, el('span', { class: 'menu-name-text' }, title), this.picture);
    if (!SHEET_URL || !SHEET) {
      this.fail();
      return;
    }
    this.picture.style.backgroundImage = `url(${SHEET_URL})`;
    this.layout();
    window.addEventListener('resize', this.resize);
    const image = new Image();
    image.src = SHEET_URL;
    image.decode().then(
      () => {
        if (this.stopped) return;
        this.picture.classList.add('shown');
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches) this.timer = window.setTimeout(() => this.shine(), SHINE_FIRST_MS);
      },
      () => this.fail(),
    );
  }

  /** The size for the main screen and the sign-in (`open`: as big as the screen allows), or for a screen with a panel. */
  setOpen(open: boolean): void {
    this.open = open;
    this.layout();
  }

  stop(): void {
    this.stopped = true;
    window.clearTimeout(this.timer);
    window.removeEventListener('resize', this.resize);
  }

  private layout(): void {
    if (!SHEET) return;
    const ratio = window.devicePixelRatio || 1;
    this.scale = logoScale({ width: innerWidth, height: innerHeight, ratio }, SHEET, this.open) / ratio;
    const style = this.picture.style;
    style.width = `${SHEET.width * this.scale}px`;
    style.height = `${SHEET.height * this.scale}px`;
    // The glow round the letters takes no room: it may reach into the sides of the page.
    style.margin = `0 ${-SHEET.pad * this.scale}px`;
    style.backgroundSize = `${SHEET.width * this.scale}px ${SHEET.height * SHEET.frames * this.scale}px`;
    this.show(this.frame);
  }

  private show(frame: number): void {
    if (!SHEET) return;
    this.frame = frame;
    this.picture.style.backgroundPosition = `0 ${-frame * SHEET.height * this.scale}px`;
  }

  /** Plays the shine once, then waits for the next one. */
  private shine(frame = 1): void {
    if (this.stopped || !SHEET) return;
    if (frame >= SHEET.frames) {
      this.show(0);
      const [least, most] = SHINE_EVERY_MS;
      this.timer = window.setTimeout(() => this.shine(), least + Math.random() * (most - least));
      return;
    }
    this.show(frame);
    this.timer = window.setTimeout(() => this.shine(frame + 1), SHINE_FRAME_MS);
  }

  /** Without the picture, the title shows as text. */
  private fail(): void {
    this.element.classList.add('no-logo');
  }
}
