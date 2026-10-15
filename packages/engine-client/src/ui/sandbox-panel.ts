import { MECHANICS, type Mechanic } from '@game/engine';
import { SANDBOX_FOES, type FightLog, type SandboxFoe, type SandboxSettings } from '../sandbox.ts';
import { STRINGS } from './strings.ts';

/**
 * The panel of the sandbox of an admin (sandbox.ts; Fede, 2026-10-15): a button at the bottom left
 * opens it. It chooses the foes, turns each mechanic of the melee draft on or off (mechanics.ts), and
 * starts the fight again; it shows the fights won and lost, and what happened in the last one. While
 * it is open, the fight stands still (game.ts). Escape or the button closes it.
 */

/** Two crossed swords: the icon of the button. */
const SWORDS_ICON = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
<path d="M4 4l10 10M4 4h3.5M4 4v3.5M12.5 15.5l3-3M14 17l3 3M17 14l3 3"/><path d="M20 4L10 14M20 4h-3.5M20 4v3.5M11.5 15.5l-3-3M10 17l-3 3M7 14l-3 3"/></svg>`;

/** What the controls of the panel do. */
export interface SandboxPanelActions {
  /** The kind of the next foes (the fight starts again with them). */
  readonly foe: (kind: SandboxFoe) => void;
  /** A mechanic goes on or off (at once). */
  readonly mechanic: (id: Mechanic, on: boolean) => void;
  /** The fight starts again. */
  readonly restart: () => void;
}

/** "41 s", "1 min 5 s". */
function duration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return seconds < 60 ? STRINGS.sandbox.seconds(seconds) : STRINGS.sandbox.minutes(Math.floor(seconds / 60), seconds % 60);
}

/** The line about a fight that ended: who won, how long it took, the blows, the attacks. */
export function fightLine(log: FightLog): string {
  const T = STRINGS.sandbox;
  return `${log.won ? T.won(duration(log.ms)) : T.lost(duration(log.ms))} · ${T.blows(log.hits, log.blows)} · ${T.attacks(log.struck, log.attacks, log.damage)}`;
}

export class SandboxPanel {
  private readonly root: HTMLElement;
  private readonly button: HTMLButtonElement;
  private readonly record: HTMLElement;
  private readonly lastFight: HTMLElement;
  private readonly actions: SandboxPanelActions;

  constructor(settings: SandboxSettings, actions: SandboxPanelActions) {
    const T = STRINGS.sandbox;
    this.actions = actions;
    this.button = document.createElement('button');
    this.button.id = 'sandbox-button';
    this.button.type = 'button';
    this.button.setAttribute('aria-label', T.title);
    this.button.setAttribute('aria-controls', 'sandbox');
    this.button.setAttribute('aria-expanded', 'false');
    this.button.innerHTML = SWORDS_ICON;
    // pointerdown keeps the focus on the game; a click (or a key) toggles the panel.
    this.button.addEventListener('pointerdown', (event) => event.preventDefault());
    this.button.addEventListener('click', () => this.toggle());

    this.root = document.createElement('section');
    this.root.id = 'sandbox';
    this.root.hidden = true;
    this.root.setAttribute('aria-label', T.title);
    const title = document.createElement('p');
    title.className = 'menu-title';
    title.textContent = T.title;

    // The foes: a choice of kind; a new choice starts the fight again.
    const foes = document.createElement('fieldset');
    foes.className = 'sandbox-foes';
    const foesLegend = document.createElement('legend');
    foesLegend.textContent = T.foes;
    foes.append(foesLegend);
    for (const kind of SANDBOX_FOES) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'sandbox-foe';
      input.value = kind;
      input.checked = kind === settings.foe;
      input.addEventListener('change', () => {
        if (input.checked) actions.foe(kind);
      });
      label.append(input, ` ${T.foe[kind]}`);
      foes.append(label);
    }

    // The mechanics: a switch for each one, with what it does.
    const mechanics = document.createElement('fieldset');
    mechanics.className = 'sandbox-mechanics';
    const mechanicsLegend = document.createElement('legend');
    mechanicsLegend.textContent = T.mechanicsTitle;
    mechanics.append(mechanicsLegend);
    for (const id of MECHANICS) {
      const label = document.createElement('label');
      label.className = 'sandbox-mechanic';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.dataset.mechanic = id;
      input.checked = settings.mechanics.includes(id);
      input.addEventListener('change', () => actions.mechanic(id, input.checked));
      const text = document.createElement('span');
      const name = document.createElement('strong');
      name.textContent = T.mechanics[id].name;
      const line = document.createElement('span');
      line.className = 'sandbox-line';
      line.textContent = T.mechanics[id].line;
      text.append(name, line);
      label.append(input, text);
      mechanics.append(label);
    }

    const restart = document.createElement('button');
    restart.type = 'button';
    restart.className = 'menu-button sandbox-restart';
    restart.textContent = T.restart;
    restart.addEventListener('click', () => {
      actions.restart();
      this.close();
    });
    this.record = document.createElement('p');
    this.record.className = 'sandbox-record';
    this.lastFight = document.createElement('p');
    this.lastFight.className = 'sandbox-last';
    const note = document.createElement('p');
    note.className = 'sandbox-line';
    note.textContent = T.note;
    this.root.append(title, note, this.record, this.lastFight, foes, mechanics, restart);

    // Escape closes it (before the game menu hears the key: the capture phase).
    window.addEventListener(
      'keydown',
      (event) => {
        if (event.code !== 'Escape' || this.root.hidden) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        this.close();
      },
      { capture: true },
    );
    document.body.append(this.button, this.root);
    this.setRecord(0, 0, null);
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  open(): void {
    this.root.hidden = false;
    this.button.setAttribute('aria-expanded', 'true');
    this.root.querySelector<HTMLElement>('input:checked, input')?.focus();
  }

  close(): void {
    if (this.root.hidden) return;
    this.root.hidden = true;
    this.button.setAttribute('aria-expanded', 'false');
    // Give the focus back to the game: else WASD would go to a hidden control.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  /** The fights won and lost, and the last one that ended. */
  setRecord(wins: number, losses: number, last: FightLog | null): void {
    const T = STRINGS.sandbox;
    this.record.textContent = T.record(wins, losses);
    this.lastFight.textContent = last ? fightLine(last) : T.noFight;
  }
}
