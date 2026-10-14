import { announceOpenPanel, onOtherPanelOpen } from './panels.ts';
import { STRINGS } from './strings.ts';

/** A head and shoulders: the icon of the character button. */
const ICON = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.5c0-4.1 3.4-6.8 7.5-6.8s7.5 2.7 7.5 6.8"/></svg>`;

/**
 * The character (Fede, 2026-10-14): a button in the top-right corner opens a panel with the
 * character that the visitor plays (ui/you-section.ts). It took the place of the settings panel; the
 * settings are in the game menu now (ui/game-menu.ts). The panel is outside the game surface, so a
 * touch on it never moves the player.
 */
export class CharacterPanel {
  private readonly panel: HTMLElement;
  private readonly button: HTMLButtonElement;

  constructor(content: HTMLElement) {
    const T = STRINGS.you;
    this.button = document.createElement('button');
    this.button.id = 'character-button';
    this.button.type = 'button';
    this.button.setAttribute('aria-label', T.heading);
    this.button.setAttribute('aria-expanded', 'false');
    this.button.setAttribute('aria-controls', 'character');
    this.button.innerHTML = ICON;

    this.panel = document.createElement('section');
    this.panel.id = 'character';
    this.panel.hidden = true;
    this.panel.setAttribute('aria-label', T.heading);
    this.panel.append(content);

    this.button.addEventListener('click', () => this.show(this.panel.hidden !== false));
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Escape') this.show(false);
    });
    onOtherPanelOpen('character', () => this.show(false));
    document.body.append(this.button, this.panel);
  }

  private show(open: boolean): void {
    this.panel.hidden = !open;
    this.button.setAttribute('aria-expanded', String(open));
    if (open) announceOpenPanel('character');
  }
}
