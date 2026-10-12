import { STRINGS } from './strings.ts';

/**
 * The game menu (Fede, 2026-10-12): Escape opens it over the game when no panel, conversation or
 * dream is open, with three choices: Resume, Load game and New game. Escape, Resume or a click on
 * the dark round the panel closes it. While it is open the character stands still; a world that the
 * page runs alone also stands still, but a shared world goes on (game.ts). "Load game" and "New
 * game" save the place and reload the page into the menu, at the list of characters or at the
 * builder (menu/resume.ts, markMenuScreen); a visitor without a character has only Resume. On a
 * touch screen a faint button under the settings button opens it too (showButton).
 */

/** What "Load game" and "New game" do. */
export interface GameMenuActions {
  readonly load: () => void;
  readonly create: () => void;
}

/** What a press of Escape does: close the game menu, open it, or nothing (another panel takes the key). */
export type EscapeAction = 'close' | 'open' | 'none';

/** What a press of Escape does, from what is open on the page. */
export function escapeAction(state: { readonly menuOpen: boolean; readonly otherOpen: boolean; readonly inField: boolean }): EscapeAction {
  if (state.menuOpen) return 'close';
  return state.otherOpen || state.inField ? 'none' : 'open';
}

/** Three thin lines: the icon of the button that opens the menu on a touch screen. */
const MENU_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
<path d="M5 7h14M5 12h14M5 17h14"/></svg>`;

export class GameMenu {
  private readonly root: HTMLDivElement;
  /** On a touch screen (no Escape key): a faint button under the settings button opens the menu (showButton). */
  private readonly button: HTMLButtonElement;
  private readonly buttons: HTMLButtonElement[] = [];
  /** What had the focus before the menu opened: it gets it back. */
  private before: Element | null = null;

  /**
   * `title`: the name of the world, over the choices. Without `actions`, no "Load game" and "New game".
   * With `prologue`, a last choice plays the prologue again (ui/prologue.ts).
   */
  constructor(title: string, actions: GameMenuActions | null, prologue: (() => void) | null = null) {
    const T = STRINGS.gameMenu;
    this.root = document.createElement('div');
    this.root.id = 'game-menu';
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', T.label);

    const panel = document.createElement('div');
    panel.className = 'menu-panel game-menu-panel';
    const head = document.createElement('header');
    head.className = 'menu-head';
    const name = document.createElement('h2');
    name.className = 'menu-name';
    name.textContent = title;
    head.append(name);

    const stack = document.createElement('div');
    stack.className = 'menu-actions menu-stack';
    const button = (text: string, primary: boolean, act: () => void) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = primary ? 'menu-button menu-primary' : 'menu-button';
      b.textContent = text;
      b.addEventListener('click', act);
      this.buttons.push(b);
      stack.append(b);
    };
    button(T.resume, true, () => this.close());
    if (actions) {
      // Each choice disables the menu: the page reloads into the menu.
      const leave = (go: () => void) => () => {
        for (const b of this.buttons) b.disabled = true;
        go();
      };
      button(T.load, false, leave(actions.load));
      button(T.newGame, false, leave(actions.create));
    }
    if (prologue) {
      button(T.prologue, false, () => {
        this.close();
        prologue();
      });
    }
    panel.append(head, stack);
    this.root.append(panel);

    // A click on the dark round the panel resumes the game.
    this.root.addEventListener('click', (event) => {
      if (event.target === this.root) this.close();
    });
    document.body.append(this.root);

    this.button = document.createElement('button');
    this.button.id = 'game-menu-button';
    this.button.type = 'button';
    this.button.hidden = true;
    this.button.setAttribute('aria-label', T.label);
    this.button.setAttribute('aria-haspopup', 'dialog');
    this.button.innerHTML = MENU_ICON;
    this.button.addEventListener('click', () => this.open());
    // Under every panel of the page: right after the game's view (an open panel covers it).
    const game = document.getElementById('game');
    if (game) game.after(this.button);
    else document.body.append(this.button);
  }

  /** Shows the faint button that opens the menu: on a touch screen, which has no Escape key. */
  showButton(): void {
    this.button.hidden = false;
  }

  get shown(): boolean {
    return !this.root.hidden;
  }

  open(): void {
    if (this.shown) return;
    this.before = document.activeElement;
    this.root.hidden = false;
    document.body.classList.add('game-menu-open');
    this.buttons[0]?.focus();
  }

  close(): void {
    if (!this.shown) return;
    this.root.hidden = true;
    document.body.classList.remove('game-menu-open');
    // Give the focus back; else the keys of the game would go to a hidden button.
    if (this.before instanceof HTMLElement && this.before !== document.body) this.before.focus();
    else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    this.before = null;
  }

  /**
   * A key while the menu is open: the arrows and Tab move between the choices (Tab stays in the
   * menu). Returns whether the menu used the key. Enter and Space press the focused choice, as a
   * button does.
   */
  key(event: KeyboardEvent): boolean {
    const step = event.code === 'ArrowDown' || (event.code === 'Tab' && !event.shiftKey) ? 1 : event.code === 'ArrowUp' || (event.code === 'Tab' && event.shiftKey) ? -1 : 0;
    if (step === 0) return false;
    const live = this.buttons.filter((b) => !b.disabled);
    if (live.length === 0) return true;
    const at = live.indexOf(document.activeElement as HTMLButtonElement);
    const next = at < 0 ? (step > 0 ? 0 : live.length - 1) : (at + step + live.length) % live.length;
    live[next]!.focus();
    return true;
  }
}
