import { CHUNK_SIZE, landAt, questStep, type Land, type NamedPlace, type QuestBook, type QuestDef } from '@game/engine';
import { isFormField } from '../input/keyboard.ts';
import { announceOpenPanel, onOtherPanelOpen } from './panels.ts';
import { STRINGS } from './strings.ts';
import { TIP_IDS, tipNodes, tipText, type TipId } from './tips.ts';
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

/** The tabs of the journal (Fede's request, 2026-10-14), in their order. */
export const JOURNAL_TABS = ['quests', 'tips', 'regions'] as const;
export type JournalTab = (typeof JOURNAL_TABS)[number];

/** The tips of the journal: the tips that the player has seen (TipStore), in the order of TIP_IDS, with the keys or with the buttons of a touch screen. */
export function journalTips(seen: (id: TipId) => boolean, touch: boolean): string[] {
  return TIP_IDS.filter(seen).map((id) => tipText(id, touch));
}

/** A rectangle of tiles, inclusive. */
interface TileRect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

const holds = (r: TileRect, tx: number, ty: number): boolean => tx >= r.x0 && tx <= r.x1 && ty >= r.y0 && ty <= r.y1;
const overlaps = (a: TileRect, b: TileRect): boolean => a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0;

/**
 * The ids of the lands that hold a tile of the chunk (cx, cy): for each tile, the land of landAt().
 * It looks at each tile only where a land before it in the list covers a part of the chunk.
 */
export function chunkLands(lands: readonly Land[], cx: number, cy: number): string[] {
  const chunk = { x0: cx * CHUNK_SIZE, y0: cy * CHUNK_SIZE, x1: cx * CHUNK_SIZE + CHUNK_SIZE - 1, y1: cy * CHUNK_SIZE + CHUNK_SIZE - 1 };
  const out: string[] = [];
  lands.forEach((land, i) => {
    const part = { x0: Math.max(chunk.x0, land.x0), y0: Math.max(chunk.y0, land.y0), x1: Math.min(chunk.x1, land.x1), y1: Math.min(chunk.y1, land.y1) };
    if (part.x0 > part.x1 || part.y0 > part.y1) return;
    const before = lands.slice(0, i).filter((other) => overlaps(other, part));
    let found = before.length === 0;
    for (let ty = part.y0; ty <= part.y1 && !found; ty++) {
      for (let tx = part.x0; tx <= part.x1 && !found; tx++) found = !before.some((other) => holds(other, tx, ty));
    }
    if (found) out.push(land.id);
  });
  return out;
}

/** A land of the journal's regions, with the places in it that the character found. */
export interface RegionEntry {
  readonly name: string;
  /** The land's line, or '' (Land.line). */
  readonly line: string;
  readonly places: readonly { readonly name: string; readonly line: string }[];
}

/**
 * The regions that a character found, from its seen chunks (`explored`: "cx,cy", as for the map). A
 * land is found when a seen chunk holds a tile of it (landAt()), and a place when a seen chunk holds a
 * tile of its rectangle; a place goes under the land of its middle tile. The lands come in the order of
 * their first place in `places` (the world gives them from the south to the north), a land without
 * places last. `landsOf` gives the lands of a chunk (chunkLands(); the panel keeps them).
 */
export function regionEntries(
  explored: ReadonlySet<string>,
  lands: readonly Land[],
  places: readonly NamedPlace[],
  landsOf: (cx: number, cy: number) => readonly string[] = (cx, cy) => chunkLands(lands, cx, cy),
): RegionEntry[] {
  const seenLands = new Set<string>();
  for (const key of explored) {
    const [cx, cy] = key.split(',').map(Number);
    for (const id of landsOf(cx!, cy!)) seenLands.add(id);
  }
  const seen = (r: TileRect): boolean => {
    for (let cy = Math.floor(r.y0 / CHUNK_SIZE); cy <= Math.floor(r.y1 / CHUNK_SIZE); cy++) {
      for (let cx = Math.floor(r.x0 / CHUNK_SIZE); cx <= Math.floor(r.x1 / CHUNK_SIZE); cx++) if (explored.has(`${cx},${cy}`)) return true;
    }
    return false;
  };
  const landOf = (place: NamedPlace): Land | null => landAt(lands, Math.floor((place.x0 + place.x1) / 2), Math.floor((place.y0 + place.y1) / 2));
  const found = places.filter(seen);
  const rank = (land: Land): number => {
    const first = places.findIndex((place) => landOf(place) === land);
    return first >= 0 ? first : places.length + lands.indexOf(land);
  };
  const entries: RegionEntry[] = [...lands]
    .sort((a, b) => rank(a) - rank(b))
    .map((land) => ({ land, mine: found.filter((place) => landOf(place) === land) }))
    .filter(({ land, mine }) => seenLands.has(land.id) || mine.length > 0)
    .map(({ land, mine }) => ({ name: land.title, line: land.line ?? '', places: mine.map(({ name, line }) => ({ name, line })) }));
  // Places outside every land (a world without lands): a group without a name, at the end.
  const loose = found.filter((place) => landOf(place) === null);
  if (loose.length > 0) entries.push({ name: '', line: '', places: loose.map(({ name, line }) => ({ name, line })) });
  return entries;
}

/** What the journal shows besides the quests: the tips that the player saw, and the lands and places of the world. */
export interface JournalSources {
  /** Whether the player has seen a tip (TipStore.isSeen), and a way to hear of a change (TipStore.onChange). */
  readonly tips: { isSeen(id: TipId): boolean; onChange(listener: () => void): void };
  readonly lands: readonly Land[];
  readonly places: readonly NamedPlace[];
}

/**
 * The journal: a button in the top-right corner (left of the map) and L open a panel with three tabs
 * (Fede's request, 2026-10-14). "Quests": the quests of the character (quests.ts), the open ones, each
 * with the line of its step, and the done ones. "Tips": the tips of the tutorial that the player has
 * seen (tips.ts; this browser keeps them). "Regions": the lands and the places that the character has
 * seen (its seen chunks, as on the map), each with a line. The button shines when a quest changes,
 * until the panel opens; then the panel shows the quests.
 */
export class JournalPanel {
  private readonly quests: readonly QuestDef[];
  private readonly sources: JournalSources;
  private readonly button: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly tabBar: HTMLElement;
  private readonly list: HTMLElement;
  private tab: JournalTab = 'quests';
  private book: QuestBook = {};
  private explored: ReadonlySet<string> = new Set();
  private exploredSize = -1;
  private regions: RegionEntry[] = [];
  /** The lands of each chunk that the regions counted ("cx,cy"). */
  private readonly chunkLandCache = new Map<string, readonly string[]>();
  private touch = false;
  private shown = '';

  /** `quests`: the world's quests; `note`: a line under the journal (a journal that is not saved), or null. */
  constructor(quests: readonly QuestDef[], note: string | null, sources: JournalSources) {
    const text = STRINGS.journal;
    this.quests = quests;
    this.sources = sources;
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
    this.tabBar = document.createElement('div');
    this.tabBar.className = 'journal-tabs';
    this.tabBar.setAttribute('role', 'tablist');
    this.tabBar.setAttribute('aria-label', text.tabsLabel);
    for (const tab of JOURNAL_TABS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'journal-tab';
      button.id = `journal-tab-${tab}`;
      button.dataset.tab = tab;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', 'journal-list');
      button.textContent = text.tabs[tab];
      // The focus goes back to the page, or WASD and Space would stay on the button.
      button.addEventListener('click', () => {
        this.show(tab);
        button.blur();
      });
      this.tabBar.append(button);
    }
    this.list = document.createElement('div');
    this.list.id = 'journal-list';
    this.list.className = 'journal-list';
    this.list.setAttribute('role', 'tabpanel');
    this.panel.append(title, this.tabBar, this.list);
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
    sources.tips.onChange(() => this.render());
    document.body.append(this.button, this.panel);
    this.render();
  }

  get isOpen(): boolean {
    return !this.panel.hidden;
  }

  /** The tab on show. */
  get shownTab(): JournalTab {
    return this.tab;
  }

  /** Shows the quests of `book` (only when they changed). */
  update(book: QuestBook): void {
    this.book = book;
    this.render();
  }

  /**
   * The seen chunks of the character ("cx,cy", as for the map) and whether the player uses a touch
   * screen (the text of the tips). Cheap when nothing changed: the game calls it each frame.
   */
  follow(explored: ReadonlySet<string>, touch: boolean): void {
    if (explored === this.explored && explored.size === this.exploredSize && touch === this.touch) return;
    if (explored !== this.explored || explored.size !== this.exploredSize) {
      this.explored = explored;
      this.exploredSize = explored.size;
      const { lands, places } = this.sources;
      this.regions = regionEntries(explored, lands, places, (cx, cy) => {
        const key = `${cx},${cy}`;
        let ids = this.chunkLandCache.get(key);
        if (!ids) {
          ids = chunkLands(lands, cx, cy);
          this.chunkLandCache.set(key, ids);
        }
        return ids;
      });
    }
    this.touch = touch;
    this.render();
  }

  /** A quest changed: the button shines until the panel opens. */
  notice(): void {
    if (this.panel.hidden) this.button.classList.add('gain');
  }

  /** Shows a tab. */
  show(tab: JournalTab): void {
    this.tab = tab;
    this.render();
  }

  /** Draws the tabs and the content of the chosen tab, only when they changed. */
  private render(): void {
    const text = STRINGS.journal;
    const content =
      this.tab === 'quests'
        ? journalEntries(this.book, this.quests)
        : this.tab === 'tips'
          ? journalTips((id) => this.sources.tips.isSeen(id), this.touch)
          : this.regions;
    const key = JSON.stringify([this.tab, content]);
    if (key === this.shown) return;
    this.shown = key;
    for (const button of this.tabBar.querySelectorAll<HTMLButtonElement>('.journal-tab')) button.setAttribute('aria-selected', String(button.dataset.tab === this.tab));
    this.list.setAttribute('aria-labelledby', `journal-tab-${this.tab}`);
    this.list.dataset.tab = this.tab;
    const empty = (line: string): HTMLElement => {
      const p = document.createElement('p');
      p.className = 'journal-empty';
      p.textContent = line;
      return p;
    };
    const entry = (name: string, line: string | (string | HTMLElement)[], className: string): HTMLElement => {
      const item = document.createElement('div');
      item.className = `journal-entry ${className}`.trim();
      if (name) {
        const title = document.createElement('p');
        title.className = 'journal-title';
        title.textContent = name;
        item.append(title);
      }
      const words = document.createElement('p');
      words.className = 'journal-line';
      if (typeof line === 'string') words.textContent = line;
      else words.append(...line);
      item.append(words);
      return item;
    };
    // Each part in a box of its own: on a wide screen the parts stand side by side.
    const part = (heading: string, about: string, items: readonly HTMLElement[]): HTMLElement => {
      const box = document.createElement('div');
      box.className = 'journal-section';
      if (heading) {
        const head = document.createElement('p');
        head.className = 'journal-heading';
        head.textContent = heading;
        box.append(head);
      }
      if (about) {
        const line = document.createElement('p');
        line.className = 'journal-about';
        line.textContent = about;
        box.append(line);
      }
      box.append(...items);
      return box;
    };
    if (this.tab === 'quests') {
      const { open, done } = journalEntries(this.book, this.quests);
      const parts = [
        ...(open.length > 0 ? [part(text.open, '', open.map((q) => entry(tw(q.title), tw(q.line), 'open')))] : []),
        ...(done.length > 0 ? [part(text.done, '', done.map((q) => entry(tw(q.title), tw(q.line), 'done')))] : []),
      ];
      this.list.replaceChildren(...(parts.length > 0 ? parts : [empty(text.empty)]));
    } else if (this.tab === 'tips') {
      const tips = journalTips((id) => this.sources.tips.isSeen(id), this.touch);
      this.list.replaceChildren(tips.length > 0 ? part('', '', tips.map((tip) => entry('', tipNodes(tip), 'tip'))) : empty(text.noTips));
    } else {
      const parts = this.regions.map((land) => part(tw(land.name), tw(land.line), land.places.map((place) => entry(tw(place.name), tw(place.line), 'place'))));
      this.list.replaceChildren(...(parts.length > 0 ? parts : [empty(text.noRegions)]));
    }
  }

  private open(open: boolean): void {
    this.panel.hidden = !open;
    this.button.setAttribute('aria-expanded', String(open));
    if (open) {
      // A quest changed since the journal was open: show the quests.
      if (this.button.classList.contains('gain')) this.show('quests');
      this.button.classList.remove('gain');
      announceOpenPanel('journal');
    }
  }
}
