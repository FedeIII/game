import { isFormField } from '../input/keyboard.ts';
import { STRINGS } from './strings.ts';

const EYE_ICON = `<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
<path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>`;

/**
 * The action button, in the bottom-right corner (the joystick rests in the bottom-left one).
 * It is dim when there is nothing to act on and lights up when there is. The E key does the
 * same on a keyboard. It is outside the game surface, so a tap on it never moves the player,
 * and the other thumb can hold the joystick at the same time.
 */
export class ActionButton {
  private readonly button: HTMLButtonElement;
  private readonly listeners: (() => void)[] = [];
  private label = '';

  constructor() {
    this.button = document.createElement('button');
    this.button.id = 'action';
    this.button.type = 'button';
    this.button.innerHTML = `${EYE_ICON}<span class="action-key" aria-hidden="true">E</span>`;
    this.setTarget(null);
    // pointerdown, not click: an action must answer at once. preventDefault keeps the focus
    // (and so the keyboard) on the game.
    this.button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.fire();
    });
    window.addEventListener('keydown', (event) => {
      if (event.code !== 'KeyE' || event.repeat || event.ctrlKey || event.metaKey || event.altKey || isFormField(event.target)) return;
      event.preventDefault();
      this.fire();
    });
    document.body.append(this.button);
  }

  onPress(listener: () => void): void {
    this.listeners.push(listener);
  }

  /** Lights the button up with a label for the target, or dims it when `label` is null. */
  setTarget(label: string | null): void {
    const text = label ?? STRINGS.actionLabel;
    if (text === this.label) return;
    this.label = text;
    this.button.classList.toggle('ready', label !== null);
    this.button.setAttribute('aria-label', text);
    this.button.setAttribute('aria-disabled', String(label === null));
  }

  private fire(): void {
    for (const listener of this.listeners) listener();
  }
}
