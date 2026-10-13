import { audio } from '../audio/audio.ts';
import { FxPlayer } from '../audio/fx.ts';
import { KANDRAX_OPENING, THEME_FIRST } from '../audio/themes/kandrax.ts';

/** A press within this time (ms) after a pointer press is the same press: it has its click already. */
const SAME_PRESS_MS = 600;

/** Whether a press on `target` presses a control: a button, a link, a chip or a box. */
function pressable(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const button = target.closest('button, a[href]');
  if (button) return !(button instanceof HTMLButtonElement && button.disabled);
  const control = target instanceof HTMLInputElement ? target : target.closest('label')?.control;
  return control instanceof HTMLInputElement && (control.type === 'radio' || control.type === 'checkbox') && !control.disabled;
}

/**
 * The sound of the menu before the game (Fede, 2026-10-13): the opening of the theme of Kandrax (the
 * night and the horn, round and round), which also starts the prologue, so the prologue of a new
 * character goes on with it without a break; a click for each button, link, chip or box that the
 * visitor presses, a tick when the keys move a choice, and a rustle for a new screen. As everywhere,
 * nothing sounds before the first click, touch or key of the page (audio/audio.ts).
 */
export class MenuSounds {
  private readonly fx = new FxPlayer(audio);
  /** When the last pointer press on a control was (performance.now()). */
  private pressedAt = -Infinity;

  /** Loads the first instruments of the music and the effects, and listens to the controls in `root`. */
  constructor(root: HTMLElement) {
    audio.preload(THEME_FIRST);
    this.fx.prepare(['uiClick', 'uiOpen', 'uiSelect']);
    root.addEventListener(
      'pointerdown',
      (event) => {
        if (!pressable(event.target)) return;
        this.pressedAt = performance.now();
        this.fx.play('uiClick', { gain: 0.7 });
      },
      { capture: true, passive: true },
    );
    // A button or a box pressed with a key (Enter, Space) has no pointer press before it. The keys
    // move a chip with a tick (below), not a click.
    root.addEventListener(
      'click',
      (event) => {
        if (event.detail !== 0 || this.samePress() || (event.target instanceof HTMLInputElement && event.target.type === 'radio')) return;
        if (pressable(event.target)) this.fx.play('uiClick', { gain: 0.7 });
      },
      { capture: true },
    );
    root.addEventListener(
      'change',
      (event) => {
        if (event.target instanceof HTMLInputElement && event.target.type === 'radio' && !this.samePress()) this.fx.play('uiSelect', { gain: 0.7 });
      },
      { capture: true },
    );
  }

  private samePress(): boolean {
    return performance.now() - this.pressedAt < SAME_PRESS_MS;
  }

  /** The music of the menu: it fades in (at the first action of the page), and goes on while it plays. */
  music(): void {
    audio.playMusic(KANDRAX_OPENING, 3);
  }

  /** A new screen of the menu (or a step of the builder). */
  screen(): void {
    this.fx.play('uiOpen', { gain: 0.5 });
  }
}
