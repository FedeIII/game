import { NAME_MAX } from '@game/engine';
import { SKIN_FRAME } from '../../art/skins.ts';
import { STRINGS } from './strings.ts';

export interface YouCallbacks {
  /** The visitor asks for a new random look. */
  onNewLook(): void;
  /** The visitor wrote a name (not cleaned yet). */
  onName(name: string): void;
}

/**
 * The "You" section of the settings panel: a picture of the visitor's look (the skin, standing,
 * facing south), the kind of figure it is, a button for a new random look, and the name that
 * the other visitors see over the visitor's head.
 */
export class YouSection {
  readonly element: HTMLElement;
  private readonly preview: HTMLCanvasElement;
  private readonly kind: HTMLElement;
  private readonly button: HTMLButtonElement;
  private readonly input: HTMLInputElement;

  constructor(name: string, callbacks: YouCallbacks) {
    const text = STRINGS.you;
    this.element = document.createElement('div');
    this.element.className = 'settings-you';

    const heading = document.createElement('p');
    heading.className = 'settings-heading';
    heading.textContent = text.heading;

    const row = document.createElement('div');
    row.className = 'you-row';
    this.preview = document.createElement('canvas');
    this.preview.className = 'you-preview';
    this.preview.width = SKIN_FRAME.width;
    this.preview.height = SKIN_FRAME.height;
    this.preview.setAttribute('aria-hidden', 'true');
    const info = document.createElement('div');
    info.className = 'you-info';
    this.kind = document.createElement('span');
    this.kind.className = 'you-kind';
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = 'settings-small';
    this.button.textContent = text.newLook;
    this.button.addEventListener('click', () => callbacks.onNewLook());
    info.append(this.kind, this.button);
    row.append(this.preview, info);

    const label = document.createElement('label');
    label.className = 'you-name';
    const caption = document.createElement('span');
    caption.textContent = text.name;
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.maxLength = NAME_MAX;
    this.input.placeholder = text.noName;
    this.input.autocomplete = 'off';
    this.input.spellcheck = false;
    this.input.value = name;
    this.input.setAttribute('aria-describedby', 'you-name-hint');
    // A name applies when the visitor leaves the field or presses Enter.
    this.input.addEventListener('change', () => callbacks.onName(this.input.value));
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') this.input.blur();
    });
    label.append(caption, this.input);
    const hint = document.createElement('p');
    hint.id = 'you-name-hint';
    hint.className = 'you-hint';
    hint.textContent = text.nameHint;

    this.element.append(heading, row, label, hint);
  }

  /** Shows a look: the standing frame of its sheet, and what kind of figure it is. */
  showLook(sheet: HTMLCanvasElement | null, kind: string): void {
    const context = this.preview.getContext('2d')!;
    context.clearRect(0, 0, this.preview.width, this.preview.height);
    if (sheet) context.drawImage(sheet, 0, 0, SKIN_FRAME.width, SKIN_FRAME.height, 0, 0, SKIN_FRAME.width, SKIN_FRAME.height);
    this.kind.textContent = kind.charAt(0).toUpperCase() + kind.slice(1);
  }

  /** While a new look is drawn, the button waits. */
  setBusy(busy: boolean): void {
    this.button.disabled = busy;
    this.button.textContent = busy ? STRINGS.you.drawing : STRINGS.you.newLook;
  }

  /** Shows the name as it was saved (cleaned). */
  setName(name: string): void {
    this.input.value = name;
  }
}
