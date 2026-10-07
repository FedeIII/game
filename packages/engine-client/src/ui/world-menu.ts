import type { WorldDefinition } from '@game/engine';
import { announceOpenPanel, onOtherPanelOpen } from './panels.ts';
import { STRINGS } from './strings.ts';

const MAP_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">
<path d="M3 6.5l5.5-2.5 7 2.5 5.5-2.5v13.5l-5.5 2.5-7-2.5-5.5 2.5z"/><path d="M8.5 4v13.5M15.5 6.5V20"/></svg>`;

/**
 * The worlds menu: a button in the top-right corner (left of the display settings) opens a list
 * of the worlds of the application. Each entry is a real link (?world=<id>), so a world has its
 * own address; the current world is marked.
 */
export class WorldMenu {
  private readonly button: HTMLButtonElement;
  private readonly panel: HTMLElement;

  constructor(worlds: readonly WorldDefinition[], current: WorldDefinition) {
    this.button = document.createElement('button');
    this.button.id = 'worlds-button';
    this.button.type = 'button';
    this.button.setAttribute('aria-label', STRINGS.worlds);
    this.button.setAttribute('aria-expanded', 'false');
    this.button.setAttribute('aria-controls', 'worlds');
    this.button.innerHTML = MAP_ICON;

    this.panel = document.createElement('nav');
    this.panel.id = 'worlds';
    this.panel.hidden = true;
    this.panel.setAttribute('aria-label', STRINGS.worlds);
    const title = document.createElement('p');
    title.className = 'menu-title';
    title.textContent = STRINGS.worlds;
    const list = document.createElement('ul');
    const keep = new URLSearchParams(location.search);
    for (const world of worlds) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      const params = new URLSearchParams();
      params.set('world', world.id);
      // Keep the developer switches; drop the ones that belong to one world (seed, start tile).
      for (const flag of ['debug', 'nocrt', 'nolight']) if (keep.has(flag)) params.set(flag, '');
      link.href = `?${params.toString().replace(/=(&|$)/g, '$1')}`;
      link.textContent = world.name;
      if (world === current) {
        link.setAttribute('aria-current', 'page');
        const here = document.createElement('span');
        here.className = 'menu-note';
        here.textContent = STRINGS.worldsCurrent;
        link.append(' ', here);
      }
      item.append(link);
      list.append(item);
    }
    this.panel.append(title, list);

    this.button.addEventListener('click', () => this.show(this.panel.hidden !== false));
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Escape') this.show(false);
    });
    onOtherPanelOpen('worlds', () => this.show(false));
    document.body.append(this.button, this.panel);
  }

  private show(open: boolean): void {
    this.panel.hidden = !open;
    this.button.setAttribute('aria-expanded', String(open));
    if (open) announceOpenPanel('worlds');
  }
}
