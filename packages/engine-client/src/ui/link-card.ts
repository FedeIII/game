import type { Link } from '@game/engine';
import { STRINGS } from './strings.ts';

/**
 * A card with a real link, for a fixture whose content has one (a portal to a project). A game
 * canvas cannot hold a link, so this is HTML: a tap or a click on it follows the link in a new
 * tab, a screen reader reads it, and on a keyboard the game opens it on the next E (a key press
 * may open a tab; the start of a touch may not). It closes when the player walks away.
 */
export class LinkCard {
  private readonly card: HTMLElement;
  private readonly title: HTMLElement;
  private readonly host: HTMLElement;
  private readonly go: HTMLAnchorElement;
  private link: Link | null = null;

  constructor() {
    this.card = document.createElement('aside');
    this.card.id = 'link-card';
    this.card.hidden = true;
    this.card.setAttribute('aria-live', 'polite');

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'link-card-close';
    close.setAttribute('aria-label', STRINGS.linkClose);
    close.textContent = '×';
    close.addEventListener('click', () => this.hide());

    this.title = document.createElement('p');
    this.title.className = 'link-card-title';
    this.host = document.createElement('p');
    this.host.className = 'link-card-host';
    this.go = document.createElement('a');
    this.go.className = 'link-card-go';
    this.go.target = '_blank';
    this.go.rel = 'noopener';
    const key = document.createElement('p');
    key.className = 'link-card-key';
    key.textContent = STRINGS.linkKeyHint;
    this.card.append(close, this.title, this.host, this.go, key);
    document.body.append(this.card);
  }

  get visible(): boolean {
    return this.link !== null;
  }

  show(link: Link): void {
    this.link = link;
    this.title.textContent = link.title;
    this.host.textContent = new URL(link.url).host + new URL(link.url).pathname.replace(/\/$/, '');
    this.go.href = link.url;
    this.go.textContent = `${link.label} ↗`;
    this.card.hidden = false;
  }

  hide(): void {
    this.link = null;
    this.card.hidden = true;
  }

  /** Follows the link in a new tab (from a key press: browsers allow that). */
  open(): void {
    if (this.link) window.open(this.link.url, '_blank', 'noopener');
  }

  /** Draws the eye to the link, for a touch on the action button (which may not open a tab). */
  pulse(): void {
    this.go.classList.remove('pulse');
    void this.go.offsetWidth;
    this.go.classList.add('pulse');
  }
}
