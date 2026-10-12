import { questStep, type QuestBook, type QuestDef } from '@game/engine';
import { isFormField } from '../input/keyboard.ts';
import { announceOpenPanel, onOtherPanelOpen } from './panels.ts';
import { STRINGS } from './strings.ts';
import { tw } from '../i18n.ts';

const ICON = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10"/><path d="M9 8h5M9 11h3"/></svg>`;

/** One quest as the journal shows it: its title, and the line of the step that it is at. */
export interface JournalEntry {
  readonly title: string;
  readonly line: string;
}

/** The quests of a book in the journal: the open ones and the done ones, the last changed first. Quests and steps that the world does not have are left out. */
export function journalEntries(book: QuestBook, quests: readonly QuestDef[]): { open: JournalEntry[]; done: JournalEntry[] } {
  const open: (JournalEntry & { n: number })[] = [];
  const done: (JournalEntry & { n: number })[] = [];
  for (const quest of quests) {
    const entry = book[quest.id];
    const step = entry ? questStep(quest, entry.step) : null;
    if (!entry || !step) continue;
    (step.end ? done : open).push({ title: quest.title, line: step.journal, n: entry.n });
  }
  const order = (list: (JournalEntry & { n: number })[]) => list.sort((a, b) => b.n - a.n).map(({ title, line }) => ({ title, line }));
  return { open: order(open), done: order(done) };
}

/**
 * The tiles that the map marks for a book: the place of the step of each open quest (QuestStep.at,
 * or the home tile of its NPC, from `npcHome`).
 */
export function questMarks(book: QuestBook, quests: readonly QuestDef[], npcHome: (id: string) => readonly [number, number] | null): (readonly [number, number])[] {
  const out: (readonly [number, number])[] = [];
  for (const quest of quests) {
    const entry = book[quest.id];
    const step = entry ? questStep(quest, entry.step) : null;
    if (!step || step.end) continue;
    const at = step.at ?? (step.npc ? npcHome(step.npc) : null);
    if (at) out.push(at);
  }
  return out;
}

/**
 * The journal: a button in the top-right corner (left of the map) and L open a panel with the
 * quests of the character (quests.ts): the open ones, each with the line of its step, and the done
 * ones. The button shines when a quest changes, until the panel opens.
 */
export class JournalPanel {
  private readonly quests: readonly QuestDef[];
  private readonly button: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly list: HTMLElement;
  private shown = '';

  /** `quests`: the world's quests; `note`: a line under the journal (a journal that is not saved), or null. */
  constructor(quests: readonly QuestDef[], note: string | null) {
    const text = STRINGS.journal;
    this.quests = quests;
    this.button = document.createElement('button');
    this.button.id = 'journal-button';
    this.button.type = 'button';
    this.button.setAttribute('aria-label', text.button);
    this.button.setAttribute('aria-expanded', 'false');
    this.button.setAttribute('aria-controls', 'journal');
    this.button.innerHTML = ICON;

    this.panel = document.createElement('section');
    this.panel.id = 'journal';
    this.panel.hidden = true;
    this.panel.setAttribute('aria-label', text.heading);
    const title = document.createElement('p');
    title.className = 'menu-title';
    title.textContent = text.heading;
    this.list = document.createElement('div');
    this.list.className = 'journal-list';
    this.panel.append(title, this.list);
    if (note) {
      const hint = document.createElement('p');
      hint.className = 'menu-hint';
      hint.textContent = note;
      this.panel.append(hint);
    }

    this.button.addEventListener('click', () => this.open(this.panel.hidden !== false));
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Escape') this.open(false);
      if (event.code !== 'KeyL' || event.repeat || event.ctrlKey || event.metaKey || event.altKey || isFormField(event.target)) return;
      event.preventDefault();
      this.open(this.panel.hidden !== false);
    });
    onOtherPanelOpen('journal', () => this.open(false));
    document.body.append(this.button, this.panel);
    this.update({});
  }

  get isOpen(): boolean {
    return !this.panel.hidden;
  }

  /** Shows the quests of `book` (only when they changed). */
  update(book: QuestBook): void {
    const { open, done } = journalEntries(book, this.quests);
    const key = JSON.stringify([open, done]);
    if (key === this.shown) return;
    this.shown = key;
    const text = STRINGS.journal;
    // Each part in a box of its own: on a wide screen the parts stand side by side.
    const section = (heading: string, entries: readonly JournalEntry[], className: string): HTMLElement[] => {
      if (entries.length === 0) return [];
      const part = document.createElement('div');
      part.className = 'journal-section';
      const head = document.createElement('p');
      head.className = 'journal-heading';
      head.textContent = heading;
      const items = entries.map((entry) => {
        const item = document.createElement('div');
        item.className = `journal-entry ${className}`;
        const name = document.createElement('p');
        name.className = 'journal-title';
        name.textContent = tw(entry.title);
        const line = document.createElement('p');
        line.className = 'journal-line';
        line.textContent = tw(entry.line);
        item.append(name, line);
        return item;
      });
      part.append(head, ...items);
      return [part];
    };
    const empty = document.createElement('p');
    empty.className = 'journal-empty';
    empty.textContent = text.empty;
    const parts = [...section(text.open, open, 'open'), ...section(text.done, done, 'done')];
    this.list.replaceChildren(...(parts.length > 0 ? parts : [empty]));
  }

  /** A quest changed: the button shines until the panel opens. */
  notice(): void {
    if (this.panel.hidden) this.button.classList.add('gain');
  }

  private open(open: boolean): void {
    this.panel.hidden = !open;
    this.button.setAttribute('aria-expanded', String(open));
    if (open) {
      this.button.classList.remove('gain');
      announceOpenPanel('journal');
    }
  }
}
