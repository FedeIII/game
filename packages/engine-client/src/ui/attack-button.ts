import { isFormField } from '../input/keyboard.ts';
import { STRINGS } from './strings.ts';

const SWORD_ICON = `<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
<path d="M19.5 3.5h-3.2L7.6 12.2l4.2 4.2 8.7-8.7z"/><path d="M5.2 13.4l5.4 5.4M7.4 17.6l-3 3M3.6 19.8l.6.6"/></svg>`;

/**
 * The attack button, next to the action button in the bottom-right corner, for a world with
 * mobs. Space (or J) does the same on a keyboard. A press asks for an attack; the game starts it
 * at the next tick in which the player can attack.
 */
export class AttackButton {
  private readonly button: HTMLButtonElement;
  private readonly listeners: (() => void)[] = [];

  constructor() {
    this.button = document.createElement('button');
    this.button.id = 'attack';
    this.button.type = 'button';
    this.button.setAttribute('aria-label', STRINGS.attack);
    this.button.innerHTML = `${SWORD_ICON}<span class="action-key" aria-hidden="true">Space</span>`;
    // pointerdown, not click: an attack must answer at once. preventDefault keeps the focus
    // (and so the keyboard) on the game.
    this.button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.fire();
    });
    window.addEventListener('keydown', (event) => {
      if ((event.code !== 'Space' && event.code !== 'KeyJ') || event.repeat || event.ctrlKey || event.metaKey || event.altKey || isFormField(event.target)) return;
      // Space must not scroll the page or press a focused button.
      event.preventDefault();
      this.fire();
    });
    document.body.append(this.button);
  }

  onPress(listener: () => void): void {
    this.listeners.push(listener);
  }

  /** Dims the button while the player cannot attack (a stun). */
  setReady(ready: boolean): void {
    this.button.classList.toggle('ready', ready);
  }

  private fire(): void {
    for (const listener of this.listeners) listener();
  }
}
