import { ABILITIES, type Scores } from '@game/engine';
import { SKIN_PORTRAIT } from '../../art/skins.ts';
import { STRINGS } from './strings.ts';

export interface YouInfo {
  /** The name over the player's head. */
  readonly name: string;
  /** What the character is: "Dwarf fighter". */
  readonly kind: string;
  /** The final ability scores, for a character of an account. */
  readonly scores?: Scores;
  /** Whether the character belongs to an account (else it is a guest: nothing is saved). */
  readonly account: boolean;
}

export interface YouCallbacks {
  /** Back to the menu: another character, or a new game. */
  mainMenu(): void;
  signOut(): void;
}

/**
 * The "You" section of the settings panel: a picture of the character (standing, facing south),
 * its name, race and class, its ability scores, and the way back to the menu.
 */
export class YouSection {
  readonly element: HTMLElement;
  private readonly preview: HTMLCanvasElement;

  constructor(info: YouInfo, callbacks: YouCallbacks) {
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
    this.preview.width = SKIN_PORTRAIT.width;
    this.preview.height = SKIN_PORTRAIT.height;
    this.preview.setAttribute('aria-hidden', 'true');
    const about = document.createElement('div');
    about.className = 'you-info';
    const name = document.createElement('span');
    name.className = 'you-name';
    name.textContent = info.name;
    const kind = document.createElement('span');
    kind.className = 'you-kind';
    kind.textContent = info.account ? info.kind : `${info.kind} · ${text.guest}`;
    about.append(name, kind);
    if (info.scores) {
      const scores = document.createElement('dl');
      scores.className = 'you-scores';
      for (const ability of ABILITIES) {
        const term = document.createElement('dt');
        const abbr = document.createElement('abbr');
        abbr.title = STRINGS.abilities[ability].name;
        abbr.textContent = STRINGS.abilities[ability].short;
        term.append(abbr);
        const value = document.createElement('dd');
        value.textContent = String(info.scores[ability]);
        scores.append(term, value);
      }
      about.append(scores);
    }
    row.append(this.preview, about);

    const actions = document.createElement('div');
    actions.className = 'you-actions';
    const menu = document.createElement('button');
    menu.type = 'button';
    menu.className = 'settings-small';
    menu.textContent = text.mainMenu;
    menu.addEventListener('click', () => callbacks.mainMenu());
    actions.append(menu);
    if (info.account) {
      const out = document.createElement('button');
      out.type = 'button';
      out.className = 'settings-small';
      out.textContent = text.signOut;
      out.addEventListener('click', () => {
        out.disabled = true;
        callbacks.signOut();
      });
      actions.append(out);
    }

    this.element.append(heading, row, actions);
  }

  /** Shows the look: the standing frame of its sheet. */
  showLook(sheet: HTMLCanvasElement | null): void {
    const context = this.preview.getContext('2d')!;
    context.clearRect(0, 0, this.preview.width, this.preview.height);
    const { x, y, width, height } = SKIN_PORTRAIT;
    if (sheet) context.drawImage(sheet, x, y, width, height, 0, 0, width, height);
  }
}
