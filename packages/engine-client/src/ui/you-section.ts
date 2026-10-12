import { ABILITIES, type PlayerTraits, type Scores } from '@game/engine';
import { SKIN_PORTRAIT } from '../../art/skins.ts';
import { STRINGS } from './strings.ts';
import { traitsList } from './traits-list.ts';

export interface YouInfo {
  /** The name over the player's head. */
  readonly name: string;
  /** What the character is: "Dwarf fighter". */
  readonly kind: string;
  /** The final ability scores, for a character of an account. */
  readonly scores?: Scores;
  /** What the scores give in the game. */
  readonly traits: PlayerTraits;
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
 * its name, race and class, its ability scores, what they give in the game, and the way back to
 * the menu.
 */
export class YouSection {
  readonly element: HTMLElement;
  private readonly preview: HTMLCanvasElement;
  private readonly traits: HTMLElement;
  private readonly traitsHeading: HTMLElement;

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
    this.traits = document.createElement('div');
    this.traits.className = 'you-traits';
    this.traitsHeading = document.createElement('p');
    this.traitsHeading.className = 'settings-heading';
    this.traitsHeading.textContent = STRINGS.traits.heading;
    this.traits.append(this.traitsHeading, traitsList(info.traits));

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

    this.element.append(heading, row, this.traits, actions);
  }

  /** Shows new traits (the gear changed). */
  setTraits(traits: PlayerTraits): void {
    this.traits.replaceChildren(this.traitsHeading, traitsList(traits));
  }

  /** Puts a line under the heading of the section (the presence of other visitors, for an admin). */
  addLine(line: HTMLElement): void {
    this.element.querySelector('.settings-heading')!.after(line);
  }

  /** Shows the look: the standing frame of its sheet. */
  showLook(sheet: HTMLCanvasElement | null): void {
    const context = this.preview.getContext('2d')!;
    context.clearRect(0, 0, this.preview.width, this.preview.height);
    const { x, y, width, height } = SKIN_PORTRAIT;
    if (sheet) context.drawImage(sheet, x, y, width, height, 0, 0, width, height);
  }
}
