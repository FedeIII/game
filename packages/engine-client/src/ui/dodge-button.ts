import { isFormField } from '../input/keyboard.ts';
import { STRINGS } from './strings.ts';

const ROLL_ICON = `<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
<path d="M17.5 8.5a6.5 6.5 0 1 0 1 6"/><path d="M19.5 5v4h-4"/><path d="M3 20h6"/></svg>`;

/**
 * The dodge button, left of the attack button, for a world with mobs: a roll the way the player
 * walks (or faces); in a brace, a short jump. Shift does the same on a keyboard, and the right mouse
 * button on the world (input/mouse.ts). A press asks for a dodge; the game starts it at the next tick
 * in which the player can dodge. Its name is "Roll", and "Dodge" in a brace (setBraced).
 */
export class DodgeButton {
  private readonly button: HTMLButtonElement;
  private readonly listeners: ((source: string) => void)[] = [];
  private readonly releaseListeners: ((source: string) => void)[] = [];
  private braced = false;

  constructor() {
    this.button = document.createElement('button');
    this.button.id = 'dodge';
    this.button.type = 'button';
    this.button.setAttribute('aria-label', STRINGS.dodge);
    this.button.innerHTML = `${ROLL_ICON}<span class="action-key" aria-hidden="true">Shift</span>`;
    // pointerdown, not click: a dodge must answer at once. preventDefault keeps the focus on the game.
    this.button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      // The release comes to the button even when the finger slides off it (the hold of the guard stance).
      this.button.setPointerCapture(event.pointerId);
      this.fire('button');
    });
    const up = () => this.let('button');
    this.button.addEventListener('pointerup', up);
    this.button.addEventListener('pointercancel', up);
    window.addEventListener('keydown', (event) => {
      if ((event.code !== 'ShiftLeft' && event.code !== 'ShiftRight') || event.repeat || event.ctrlKey || event.metaKey || event.altKey || isFormField(event.target)) return;
      this.fire('shift');
    });
    window.addEventListener('keyup', (event) => {
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') this.let('shift');
    });
    document.body.append(this.button);
  }

  /** Calls `listener` at each press, with its source ('button' or 'shift'). */
  onPress(listener: (source: string) => void): void {
    this.listeners.push(listener);
  }

  /** Calls `listener` at each release, with its source (the hold of the guard stance: input/dodge-hold.ts). */
  onRelease(listener: (source: string) => void): void {
    this.releaseListeners.push(listener);
  }

  /** Names the button for a brace ("Dodge": a dodge there is a jump) or out of one ("Roll"). */
  setBraced(braced: boolean): void {
    if (braced === this.braced) return;
    this.braced = braced;
    this.button.setAttribute('aria-label', braced ? STRINGS.dodgeInBrace : STRINGS.dodge);
  }

  /** Dims the button while the player cannot dodge (a stun, an attack, the time after a dodge, shallow water). */
  setReady(ready: boolean): void {
    this.button.classList.toggle('ready', ready);
  }

  private fire(source: string): void {
    for (const listener of this.listeners) listener(source);
  }

  private let(source: string): void {
    for (const listener of this.releaseListeners) listener(source);
  }
}
