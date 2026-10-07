import type { NetSession } from '../net/session.ts';
import { STRINGS } from './strings.ts';

/**
 * A small label in the top-left corner of a shared world: how many other visitors are here, or
 * why the visitor is alone (no connection, a new version of the game). Screen readers hear the
 * changes. Single-player worlds do not show it.
 */
export class PresenceLabel {
  private readonly element: HTMLElement;
  private readonly session: NetSession;

  constructor(session: NetSession) {
    this.session = session;
    this.element = document.createElement('div');
    this.element.id = 'presence';
    this.element.setAttribute('role', 'status');
    document.body.appendChild(this.element);
    session.onChange(() => this.render());
    this.render();
  }

  private render(): void {
    const { status, refusal } = this.session;
    const text = STRINGS.presence;
    let label: string;
    if (status === 'online') label = this.session.others === 0 ? text.alone : text.others(this.session.others);
    else if (status === 'connecting') label = text.connecting;
    else if (status === 'refused') label = text[refusal ?? 'world'];
    else label = text.offline;
    if (this.element.textContent !== label) this.element.textContent = label;
    this.element.dataset.status = status;
    this.element.dataset.others = String(this.session.others);
  }
}
