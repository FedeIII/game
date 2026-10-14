import { STRINGS } from './strings.ts';

/**
 * The tips of the tutorial (Fede's request, 2026-10-13; docs/features/game/tips.md): a short hint in
 * the GUI, the first time of each thing (the first step, the first thing in reach, the first foe...).
 * Each tip shows once in this browser, one at a time, for a few seconds or until the player does
 * the thing. Never during the prologue, a dream, the game menu or a panel over the screen. The text
 * names the keys on a keyboard and the buttons on a touch screen. "Settings" can turn the tips off,
 * and can show them all again.
 */

/** Every tip, in the order of a new player's first minutes. */
export const TIP_IDS = ['walk', 'act', 'rest', 'journal', 'talk', 'deal', 'map', 'sneak', 'attack', 'dodge', 'brace', 'hit', 'drink', 'pickup', 'defeat', 'xp'] as const;
export type TipId = (typeof TIP_IDS)[number];

/** How long a tip shows (ms) if the player does not do the thing first, and the pause between two tips. */
export const TIP_TIMING = { show: 9000, gap: 900 } as const;

/** Where this browser keeps the tips that it showed, and whether they are on. */
const STORAGE_KEY = 'game.tips.v1';

/** The part of localStorage that the store uses (a test gives its own). */
export interface TipStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function browserStorage(): TipStorage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

/**
 * The tips that this browser showed, and whether the tips are on. Storage can be absent or blocked
 * (private mode): then the tips show once for each page, and the switch lasts until the page closes.
 */
export class TipStore {
  private readonly storage: TipStorage | null;
  private on = true;
  private readonly seen = new Set<TipId>();
  private readonly listeners: (() => void)[] = [];

  constructor(storage: TipStorage | null = browserStorage()) {
    this.storage = storage;
    try {
      const saved = JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null') as { off?: unknown; seen?: unknown } | null;
      if (saved?.off === true) this.on = false;
      if (Array.isArray(saved?.seen)) for (const id of saved.seen) if ((TIP_IDS as readonly unknown[]).includes(id)) this.seen.add(id as TipId);
    } catch {
      // Nothing saved, or something broken: every tip shows.
    }
  }

  get enabled(): boolean {
    return this.on;
  }

  isSeen(id: TipId): boolean {
    return this.seen.has(id);
  }

  markSeen(id: TipId): void {
    if (this.seen.has(id)) return;
    this.seen.add(id);
    this.save();
  }

  setEnabled(on: boolean): void {
    this.on = on;
    this.save();
  }

  /** Every tip shows again (and the tips are on). */
  reset(): void {
    this.seen.clear();
    this.on = true;
    this.save();
  }

  /** Calls `listener` after each change of the switch or a reset. */
  onChange(listener: () => void): void {
    this.listeners.push(listener);
  }

  private save(): void {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify({ ...(this.on ? {} : { off: true }), seen: [...this.seen] }));
    } catch {
      // Storage is blocked: the tips last until the page closes.
    }
    for (const listener of this.listeners) listener();
  }
}

/**
 * The order of the tips: the game asks for a tip when its moment comes (`request`), and says when
 * the player did the thing (`done`). One tip shows at a time; it ends after TIP_TIMING.show, or when
 * it is done. A tip counts as seen when it ends. While `update` gets `paused` (a panel is open, the
 * prologue plays...), the tip waits, and its time stops.
 */
export class TipQueue {
  private readonly store: TipStore;
  private readonly waiting: TipId[] = [];
  private current: TipId | null = null;
  private elapsed = 0;
  private last: number | null = null;
  private nextAt = 0;

  constructor(store: TipStore) {
    this.store = store;
  }

  /** The tip on the screen now (null between tips, and while paused). */
  get showing(): TipId | null {
    return this.current;
  }

  /** Asks for a tip: it waits its turn, unless the tips are off, it was seen, or it waits already. */
  request(id: TipId): void {
    if (!this.store.enabled || this.store.isSeen(id) || this.current === id || this.waiting.includes(id)) return;
    this.waiting.push(id);
  }

  /**
   * The player did the thing of a tip: it counts as seen (a player who presses M before the map's tip
   * never needs that tip), and it ends at once if it shows.
   */
  done(id: TipId, now: number): void {
    this.store.markSeen(id);
    const at = this.waiting.indexOf(id);
    if (at >= 0) this.waiting.splice(at, 1);
    if (this.current === id) this.end(now);
  }

  /** Moves the time on; returns the tip to show now, or null. */
  update(now: number, paused: boolean): TipId | null {
    const dt = this.last === null ? 0 : Math.max(0, now - this.last);
    this.last = now;
    if (!this.store.enabled) {
      this.waiting.length = 0;
      this.current = null;
      return null;
    }
    if (paused) return null;
    if (this.current !== null) {
      this.elapsed += dt;
      if (this.elapsed >= TIP_TIMING.show) this.end(now);
    }
    while (this.current === null && now >= this.nextAt && this.waiting.length > 0) {
      const next = this.waiting.shift()!;
      if (this.store.isSeen(next)) continue;
      this.current = next;
      this.elapsed = 0;
    }
    return this.current;
  }

  private end(now: number): void {
    if (this.current !== null) this.store.markSeen(this.current);
    this.current = null;
    this.nextAt = now + TIP_TIMING.gap;
  }
}

/** The text of a tip: with the keys on a keyboard, or with the buttons on a touch screen. */
export function tipText(id: TipId, touch: boolean): string {
  const tip = STRINGS.tips.list[id];
  return touch ? tip.touch : tip.keys;
}

/** A tip's text in parts: "[E]" is a key, the rest is text. */
export function tipParts(text: string): { readonly key: boolean; readonly text: string }[] {
  const parts: { key: boolean; text: string }[] = [];
  let at = 0;
  for (const match of text.matchAll(/\[([^\]]+)\]/g)) {
    if (match.index > at) parts.push({ key: false, text: text.slice(at, match.index) });
    parts.push({ key: true, text: match[1]! });
    at = match.index + match[0].length;
  }
  if (at < text.length) parts.push({ key: false, text: text.slice(at) });
  return parts;
}

/** A tip's text as nodes: a key as a small plate, the rest as text (the tip on the screen, and the journal). */
export function tipNodes(text: string): (string | HTMLElement)[] {
  return tipParts(text).map((part) => {
    if (!part.key) return part.text;
    const key = document.createElement('kbd');
    key.className = 'tip-key';
    key.textContent = part.text;
    return key;
  });
}

/**
 * The tip on the screen: a small panel at the top in the middle (under the buttons on a narrow
 * screen), with "Tip" and the text. It never takes the focus or a touch. A screen reader hears it.
 */
export class TipView {
  readonly element: HTMLElement;
  private readonly text: HTMLElement;
  private shown: TipId | null = null;
  private touch = false;

  constructor() {
    this.element = document.createElement('div');
    this.element.id = 'tip';
    this.element.className = 'gone';
    this.element.setAttribute('role', 'status');
    this.element.setAttribute('aria-live', 'polite');
    const label = document.createElement('span');
    label.className = 'tip-label';
    label.textContent = STRINGS.tips.label;
    this.text = document.createElement('span');
    this.text.className = 'tip-text';
    this.element.append(label, this.text);
    document.body.append(this.element);
  }

  /** Shows `id` (null: nothing). `touch`: the text for a touch screen. */
  show(id: TipId | null, touch: boolean): void {
    if (id === this.shown && touch === this.touch) return;
    this.shown = id;
    this.touch = touch;
    if (id === null) {
      this.element.classList.add('gone');
      return;
    }
    this.text.replaceChildren(...tipNodes(tipText(id, touch)));
    this.element.classList.remove('gone');
  }
}

/**
 * The controls of the tips for a settings screen: "Show tips" (on or off) and "Show all tips
 * again". `store` is the store of the game when the game shows them, so a change applies at once.
 */
export function tipsControls(store: TipStore = new TipStore()): HTMLElement {
  const T = STRINGS.tips;
  const box = document.createElement('div');
  box.className = 'tips-controls';
  const label = document.createElement('label');
  label.className = 'settings-title tips-switch';
  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.id = 'tips-on';
  toggle.checked = store.enabled;
  label.append(toggle, ` ${T.show}`);
  const again = document.createElement('button');
  again.type = 'button';
  again.className = 'settings-small';
  again.id = 'tips-again';
  again.textContent = T.again;
  const note = document.createElement('span');
  note.className = 'tips-note';
  note.setAttribute('role', 'status');
  toggle.addEventListener('change', () => store.setEnabled(toggle.checked));
  again.addEventListener('click', () => {
    store.reset();
    toggle.checked = true;
    note.textContent = T.againDone;
  });
  box.append(label, again, note);
  return box;
}
