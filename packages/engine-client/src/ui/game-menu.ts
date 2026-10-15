import { STRINGS } from './strings.ts';

/**
 * The game menu (Fede, 2026-10-12): Escape opens it over the game when no panel, conversation or
 * dream is open, with its choices: Main menu, Load game, Settings and Prologue (gameMenuChoices; Fede,
 * 2026-10-14), and Sandbox for an admin (sandbox.ts; Fede, 2026-10-15). Escape or a click on the dark round the panel closes it. While it is open the character
 * stands still; a world that the page runs alone also stands still, but a shared world goes on
 * (game.ts). "Main menu" and "Load game" save the place and reload the page into the menu, at the main
 * screen or at the list of characters (menu/resume.ts, markMenuScreen); a visitor without a character
 * has no "Load game". No choice has the focus when the menu opens, so Enter does not leave the game by
 * mistake. "Settings" (since 2026-10-14, Fede: the settings left the top-right panel, which shows the
 * character now) shows the settings screen in the same panel: the sections that the page gives,
 * and "Back" (or Escape) to the choices. On a touch screen a faint button under the character button
 * opens the menu too (showButton). It has sounds (Fede, 2026-10-13): the page plays them for `sound`
 * (game.ts: a rustle, the music steps back while it is open; a click for a key press, a tick when the
 * keys move between the choices).
 */

/** What the choices of the game menu do. A choice without its action is not in the menu. */
export interface GameMenuActions {
  /** "Main menu": the main screen of the menu of the page. */
  readonly mainMenu?: () => void;
  /** "Load game": the list of characters of the menu of the page. A character of an account only. */
  readonly load?: () => void;
  /** "Sandbox": the list of characters for the sandbox of an admin (sandbox.ts). An admin only. */
  readonly sandbox?: () => void;
  /** "Prologue": plays the prologue again, over the game. */
  readonly prologue?: () => void;
}

/** A choice of the game menu. */
export type GameMenuChoice = keyof GameMenuActions | 'settings';

/** The choices that leave the game: the page reloads, so the menu disables its buttons. */
const LEAVES: ReadonlySet<GameMenuChoice> = new Set(['mainMenu', 'load', 'sandbox']);

/**
 * The choices of the menu, in their order (Fede, 2026-10-14): "Main menu", "Load game", "Settings" and
 * "Prologue"; "Sandbox" after "Load game" for an admin. A choice without its action is not there;
 * "Settings" is always there.
 */
export function gameMenuChoices(actions: GameMenuActions): GameMenuChoice[] {
  const order = ['mainMenu', 'load', 'sandbox', 'settings', 'prologue'] as const;
  return order.filter((choice) => choice === 'settings' || actions[choice] !== undefined);
}

/** A section of the settings screen: a heading over its controls. */
export interface SettingsSection {
  readonly heading: string;
  readonly body: HTMLElement;
}

/** What the game menu asks the page to sound: it opens or closes, a key presses a choice, the keys move between the choices. */
export type GameMenuSound = 'open' | 'close' | 'press' | 'move';

/**
 * What a press of Escape does: close the game menu, go back from its settings to its choices, open
 * it, or nothing (another panel takes the key).
 */
export type EscapeAction = 'close' | 'back' | 'open' | 'none';

/** What a press of Escape does, from what is open on the page. */
export function escapeAction(state: {
  readonly menuOpen: boolean;
  readonly settingsOpen: boolean;
  readonly otherOpen: boolean;
  readonly inField: boolean;
}): EscapeAction {
  if (state.menuOpen) return state.settingsOpen ? 'back' : 'close';
  return state.otherOpen || state.inField ? 'none' : 'open';
}

/** Three thin lines: the icon of the button that opens the menu on a touch screen. */
const MENU_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
<path d="M5 7h14M5 12h14M5 17h14"/></svg>`;

/** What can have the focus in the settings screen. */
const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]';

export class GameMenu {
  private readonly root: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  /** The choices (the first screen). */
  private readonly choices: HTMLDivElement;
  /** The settings screen. */
  private readonly settings: HTMLElement;
  private readonly settingsTitle: HTMLElement;
  /** On a touch screen (no Escape key): a faint button under the character button opens the menu (showButton). */
  private readonly button: HTMLButtonElement;
  private readonly buttons: HTMLButtonElement[] = [];
  private readonly settingsButton: HTMLButtonElement;
  /** What had the focus before the menu opened: it gets it back. */
  private before: Element | null = null;
  private readonly sound: (what: GameMenuSound) => void;

  /**
   * `title`: the name of the game, over the choices. `actions`: what the choices do (gameMenuChoices).
   * `sections`: the settings screen. `sound` plays its sounds.
   */
  constructor(title: string, actions: GameMenuActions, sections: readonly SettingsSection[], sound: (what: GameMenuSound) => void = () => {}) {
    const T = STRINGS.gameMenu;
    this.sound = sound;
    this.root = document.createElement('div');
    this.root.id = 'game-menu';
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', T.label);

    this.panel = document.createElement('div');
    this.panel.className = 'menu-panel game-menu-panel';
    // It takes the focus when the menu opens (no choice has it): the keys stay in the menu.
    this.panel.tabIndex = -1;
    this.choices = document.createElement('div');
    this.choices.className = 'game-menu-choices';
    const head = document.createElement('header');
    head.className = 'menu-head';
    const name = document.createElement('h2');
    name.className = 'menu-name';
    name.textContent = title;
    head.append(name);

    const stack = document.createElement('div');
    stack.className = 'menu-actions menu-stack';
    const pressed = (button: HTMLButtonElement, act: () => void) =>
      button.addEventListener('click', (event) => {
        // A press of a key (Enter, Space): a pointer has its click from the page (audio/game-sounds.ts).
        if (event.detail === 0) this.sound('press');
        act();
      });
    const labels: Record<GameMenuChoice, string> = {
      mainMenu: T.mainMenu,
      load: T.load,
      sandbox: T.sandbox,
      settings: T.settings,
      prologue: T.prologue,
    };
    let settingsButton: HTMLButtonElement | null = null;
    for (const choice of gameMenuChoices(actions)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-button';
      b.dataset.choice = choice;
      b.textContent = labels[choice];
      const act =
        choice === 'settings'
          ? () => this.showSettings(true)
          : choice === 'prologue'
            ? () => {
                this.close();
                actions.prologue!();
              }
            : () => {
                // The page reloads into the menu: no second press meanwhile.
                if (LEAVES.has(choice)) for (const other of this.buttons) other.disabled = true;
                actions[choice]!();
              };
      pressed(b, act);
      if (choice === 'settings') settingsButton = b;
      this.buttons.push(b);
      stack.append(b);
    }
    this.settingsButton = settingsButton!;
    this.choices.append(head, stack);

    // The settings screen: a title, the sections, and "Back".
    this.settings = document.createElement('section');
    this.settings.className = 'game-menu-settings';
    this.settings.hidden = true;
    this.settings.setAttribute('aria-label', T.settings);
    this.settingsTitle = document.createElement('h2');
    this.settingsTitle.className = 'menu-title';
    this.settingsTitle.tabIndex = -1;
    this.settingsTitle.textContent = T.settings;
    this.settings.append(this.settingsTitle);
    for (const section of sections) {
      const heading = document.createElement('h3');
      heading.className = 'menu-subtitle';
      heading.textContent = section.heading;
      this.settings.append(heading, section.body);
    }
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'menu-button';
    back.textContent = T.back;
    pressed(back, () => this.showSettings(false));
    const backRow = document.createElement('div');
    backRow.className = 'menu-actions';
    backRow.append(back);
    this.settings.append(backRow);

    this.panel.append(this.choices, this.settings);
    this.root.append(this.panel);

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

  /** Whether the menu shows its settings screen. */
  get settingsShown(): boolean {
    return this.shown && !this.settings.hidden;
  }

  open(): void {
    if (this.shown) return;
    this.before = document.activeElement;
    this.showScreen(false);
    this.root.hidden = false;
    document.body.classList.add('game-menu-open');
    // No choice has the focus: Enter or Space must not leave the game by mistake. An arrow key or
    // Tab goes to the first choice.
    this.panel.focus();
    this.sound('open');
  }

  close(): void {
    if (!this.shown) return;
    this.root.hidden = true;
    document.body.classList.remove('game-menu-open');
    this.sound('close');
    // Give the focus back; else the keys of the game would go to a hidden button.
    if (this.before instanceof HTMLElement && this.before !== document.body) this.before.focus();
    else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    this.before = null;
  }

  /** Shows the settings screen, or the choices again (the focus on "Settings"). */
  showSettings(open: boolean): void {
    this.showScreen(open);
    if (open) this.settingsTitle.focus();
    else this.settingsButton.focus();
  }

  private showScreen(settings: boolean): void {
    this.choices.hidden = settings;
    this.settings.hidden = !settings;
    if (settings) this.panel.scrollTop = 0;
  }

  /**
   * A key while the menu is open. In the choices the arrows and Tab move between them (Tab stays in
   * the menu). In the settings Tab moves between the controls and stays in the menu, and the arrows
   * are for the controls (a slider). Returns whether the menu used the key. Enter and Space press the
   * focused button, as a button does.
   */
  key(event: KeyboardEvent): boolean {
    if (this.settingsShown) {
      if (event.code !== 'Tab') return false;
      return this.cycle([...this.settings.querySelectorAll<HTMLElement>(FOCUSABLE)], event.shiftKey ? -1 : 1, false);
    }
    const step = event.code === 'ArrowDown' || (event.code === 'Tab' && !event.shiftKey) ? 1 : event.code === 'ArrowUp' || (event.code === 'Tab' && event.shiftKey) ? -1 : 0;
    if (step === 0) return false;
    return this.cycle(
      this.buttons.filter((b) => !b.disabled),
      step,
      true,
    );
  }

  /** Moves the focus `step` along `live`, round from the end to the start. */
  private cycle(live: readonly HTMLElement[], step: number, tick: boolean): boolean {
    if (live.length === 0) return true;
    const at = live.indexOf(document.activeElement as HTMLElement);
    const next = at < 0 ? (step > 0 ? 0 : live.length - 1) : (at + step + live.length) % live.length;
    if (tick && live[next] !== document.activeElement) this.sound('move');
    live[next]!.focus();
    return true;
  }
}
