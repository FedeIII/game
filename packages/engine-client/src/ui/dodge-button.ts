import { isFormField } from '../input/keyboard.ts';
import { STRINGS } from './strings.ts';

const ROLL_ICON = `<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
<path d="M17.5 8.5a6.5 6.5 0 1 0 1 6"/><path d="M19.5 5v4h-4"/><path d="M3 20h6"/></svg>`;

/**
 * The dodge button, left of the attack button, for a world with mobs: a roll the way the player
 * walks (or faces). Shift does the same on a keyboard, and the right mouse button on the world
 * (input/mouse.ts). A press asks for a dodge; the game starts it at the next tick in which the
 * player can dodge.
 */
export class DodgeButton {
  private readonly button: HTMLButtonElement;
  private readonly listeners: (() => void)[] = [];

  constructor() {
    this.button = document.createElement('button');
    this.button.id = 'dodge';
    this.button.type = 'button';
    this.button.setAttribute('aria-label', STRINGS.dodge);
    this.button.innerHTML = `${ROLL_ICON}<span class="action-key" aria-hidden="true">Shift</span>`;
    // pointerdown, not click: a dodge must answer at once. preventDefault keeps the focus on the game.
    this.button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.fire();
    });
    window.addEventListener('keydown', (event) => {
      if ((event.code !== 'ShiftLeft' && event.code !== 'ShiftRight') || event.repeat || event.ctrlKey || event.metaKey || event.altKey || isFormField(event.target)) return;
      this.fire();
    });
    document.body.append(this.button);
  }

  onPress(listener: () => void): void {
    this.listeners.push(listener);
  }

  /** Dims the button while the player cannot dodge (a stun, an attack, the time after a dodge, shallow water). */
  setReady(ready: boolean): void {
    this.button.classList.toggle('ready', ready);
  }

  private fire(): void {
    for (const listener of this.listeners) listener();
  }
}
