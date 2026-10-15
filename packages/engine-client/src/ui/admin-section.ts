import {
  ADMIN_LIMITS,
  ITEM_KINDS,
  LEVEL_XP,
  MAX_COINS,
  MAX_LEVEL,
  MAX_XP,
  levelOf,
  type AdminCommand,
  type ItemKind,
  type MobKind,
  type NamedPlace,
  type QuestBook,
  type QuestDef,
} from '@game/engine';
import { tw } from '../i18n.ts';
import { STRINGS } from './strings.ts';

/** What the section shows of the game now. */
export interface AdminNow {
  /** The hour of the world's day (0 to 24), or null in a world without a day. */
  readonly hour: number | null;
  /** Whether an admin moved the hour (a shift of its clock). */
  readonly moved: boolean;
  /** The tile of the character. */
  readonly tile: readonly [number, number];
  readonly xp: number;
  readonly book: QuestBook;
}

/** What the section of the admin tools needs from the page. */
export interface AdminToolsOptions {
  /** The places of the world (WorldSource.places): a teleport goes to the middle of one. */
  readonly places: readonly NamedPlace[];
  /** The kinds of mobs that the admin can put beside its character: none in a world without mobs. */
  readonly mobs: readonly MobKind[];
  /** The world's quests (WorldDefinition.quests). */
  readonly quests: readonly QuestDef[];
  /** What the section shows now. */
  readonly now: () => AdminNow;
  /** Applies a command (admin.ts): the server in a shared world, the page in its own world. False: it did not go (no connection). */
  readonly run: (command: AdminCommand) => boolean;
}

/** An hour as a clock: "14:05". */
export function clockOf(hour: number): string {
  const minutes = Math.floor(hour * 60) % (24 * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** The tile in the middle of a place. */
export function placeTile(place: NamedPlace): [number, number] {
  return [Math.floor((place.x0 + place.x1) / 2), Math.floor((place.y0 + place.y1) / 2)];
}

/**
 * The section "Admin tools" of the settings of the game menu, for an admin only (Fede's request,
 * 2026-10-15; docs/features/game/admin-tools.md): the hour of the world, a teleport to a place or a
 * tile, coins and items, the level and XP, mobs beside the character, and a quest at a step. Each tool
 * sends a command (admin.ts) through `run`; a line at the top shows the hour, the tile and the XP now,
 * and a line at the bottom what happened to the last command. The game menu gives the section its
 * heading (STRINGS.admin.heading).
 */
export function adminSection(options: AdminToolsOptions): HTMLElement {
  const T = STRINGS.admin;
  const section = document.createElement('div');
  section.className = 'admin-tools';
  const note = document.createElement('p');
  note.className = 'settings-note';
  note.textContent = T.note;
  const nowLine = document.createElement('p');
  nowLine.className = 'admin-now';
  nowLine.id = 'admin-now';
  const status = document.createElement('output');
  status.className = 'admin-status';
  status.id = 'admin-status';
  section.append(note, nowLine);

  /** Applies a command and says whether it went. The focus leaves the control: WASD walks again after the menu. */
  const run = (command: AdminCommand, control: HTMLElement): void => {
    control.blur();
    status.value = options.run(command) ? T.done : T.offline;
    // The game changes in the next frames (in a shared world, with the server's next word).
    window.setTimeout(refresh, 300);
  };

  /** A row of a tool: its name, then its controls. */
  const row = (name: string, ...controls: HTMLElement[]): HTMLElement => {
    const line = document.createElement('div');
    line.className = 'admin-row';
    const label = document.createElement('span');
    label.className = 'admin-label';
    label.textContent = name;
    const box = document.createElement('div');
    box.className = 'admin-controls';
    box.append(...controls);
    line.append(label, box);
    section.append(line);
    return line;
  };
  const button = (id: string, text: string, act: (b: HTMLButtonElement) => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'menu-small';
    b.id = id;
    b.textContent = text;
    b.addEventListener('click', () => act(b));
    return b;
  };
  const number = (id: string, label: string, min: number, max: number, step: number, value: string): HTMLInputElement => {
    const input = document.createElement('input');
    input.type = 'number';
    input.id = id;
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = value;
    input.setAttribute('aria-label', label);
    return input;
  };
  const select = (id: string, label: string, choices: readonly (readonly [string, string])[]): HTMLSelectElement => {
    const box = document.createElement('select');
    box.id = id;
    box.setAttribute('aria-label', label);
    for (const [value, text] of choices) box.add(new Option(text, value));
    return box;
  };
  /** A whole number of an input within [min, max], or null. */
  const whole = (input: HTMLInputElement, min: number, max: number): number | null => {
    const n = Number(input.value);
    return input.value.trim() !== '' && Number.isInteger(n) && n >= min && n <= max ? n : null;
  };

  // The hour of the world: for every player of a shared world.
  const now = options.now();
  let hourBox: HTMLInputElement | null = null;
  if (now.hour !== null) {
    const hour = number('admin-hour', T.hour, 0, 24, 0.25, String(Math.floor(now.hour)));
    hourBox = hour;
    row(
      T.hour,
      hour,
      button('admin-hour-set', T.set, (b) => {
        const h = Number(hour.value);
        if (hour.value.trim() !== '' && Number.isFinite(h) && h >= 0 && h <= 24) run({ do: 'hour', hour: h }, b);
      }),
      button('admin-hour-real', T.realClock, (b) => run({ do: 'hour', hour: null }, b)),
    );
  }

  // A teleport: to a place of the world, or to a tile.
  if (options.places.length > 0) {
    const place = select(
      'admin-place',
      T.place,
      options.places.map((p) => [p.id, tw(p.name)]),
    );
    row(
      T.place,
      place,
      button('admin-place-go', T.go, (b) => {
        const target = options.places.find((p) => p.id === place.value);
        if (target) run({ do: 'go', at: placeTile(target) }, b);
      }),
    );
  }
  const tx = number('admin-tx', 'x', -ADMIN_LIMITS.tile, ADMIN_LIMITS.tile, 1, '');
  const ty = number('admin-ty', 'y', -ADMIN_LIMITS.tile, ADMIN_LIMITS.tile, 1, '');
  tx.placeholder = 'x';
  ty.placeholder = 'y';
  row(
    T.tile,
    tx,
    ty,
    button('admin-tile-go', T.go, (b) => {
      const x = whole(tx, -ADMIN_LIMITS.tile, ADMIN_LIMITS.tile);
      const y = whole(ty, -ADMIN_LIMITS.tile, ADMIN_LIMITS.tile);
      if (x !== null && y !== null) run({ do: 'go', at: [x, y] }, b);
    }),
  );

  // Coins and items into the pack.
  const item = select('admin-item', T.items, [['coins', T.coins], ...ITEM_KINDS.map((k): [string, string] => [k, STRINGS.items[k].name])]);
  const count = number('admin-count', T.count, 1, MAX_COINS, 1, '1');
  row(
    T.items,
    item,
    count,
    button('admin-give', T.give, (b) => {
      const kind = item.value === 'coins' ? 'coins' : ITEM_KINDS.find((k): k is ItemKind => k === item.value);
      const n = whole(count, 1, kind === 'coins' ? MAX_COINS : ADMIN_LIMITS.items);
      if (kind && n !== null) run({ do: 'give', kind, count: n }, b);
    }),
  );

  // The level (the XP at its start), and XP on top of what the character has.
  const level = select(
    'admin-level',
    T.level,
    Array.from({ length: MAX_LEVEL }, (_, i): [string, string] => [String(i + 1), String(i + 1)]),
  );
  row(
    T.level,
    level,
    button('admin-level-set', T.set, (b) => run({ do: 'xp', xp: LEVEL_XP[Number(level.value) - 1] ?? 0 }, b)),
  );
  const xp = number('admin-xp', T.xp, 1, MAX_XP, 1, '100');
  row(
    T.xp,
    xp,
    button('admin-xp-give', T.give, (b) => {
      const n = whole(xp, 1, MAX_XP);
      if (n !== null) run({ do: 'xp', xp: Math.min(MAX_XP, options.now().xp + n) }, b);
    }),
  );

  // Mobs beside the character.
  if (options.mobs.length > 0) {
    const mob = select(
      'admin-mob',
      T.mobs,
      options.mobs.map((k) => [k, k]),
    );
    const mobs = number('admin-mob-count', T.count, 1, ADMIN_LIMITS.mobs, 1, '1');
    row(
      T.mobs,
      mob,
      mobs,
      button('admin-mob-spawn', T.spawn, (b) => {
        const kind = options.mobs.find((k) => k === mob.value);
        const n = whole(mobs, 1, ADMIN_LIMITS.mobs);
        if (kind && n !== null) run({ do: 'mob', kind, count: n }, b);
      }),
    );
  }

  // A quest at a step (or not started).
  let questStep: HTMLSelectElement | null = null;
  let questBox: HTMLSelectElement | null = null;
  if (options.quests.length > 0) {
    const quest = select(
      'admin-quest',
      T.quest,
      options.quests.map((q) => [q.id, tw(q.title)]),
    );
    const step = select('admin-step', T.step, []);
    questBox = quest;
    questStep = step;
    quest.addEventListener('change', () => fillSteps());
    row(T.quest, quest);
    row(
      T.step,
      step,
      button('admin-quest-set', T.set, (b) => run({ do: 'quest', quest: quest.value, step: step.value === '' ? null : step.value }, b)),
    );
  }
  /** The steps of the chosen quest, with the step of the character chosen. */
  const fillSteps = (): void => {
    if (!questBox || !questStep) return;
    const def = options.quests.find((q) => q.id === questBox!.value);
    questStep.replaceChildren(new Option(T.notStarted, ''), ...(def?.steps ?? []).map((s) => new Option(s.end ? `${s.id} ✓` : s.id, s.id)));
    questStep.value = options.now().book[questBox.value]?.step ?? '';
  };
  fillSteps();
  section.append(status);

  /** The line of what is now: the hour, the tile, the level and XP. */
  const refresh = (): void => {
    const n = options.now();
    nowLine.textContent = T.now(n.hour === null ? null : clockOf(n.hour), n.moved, n.tile[0], n.tile[1], levelOf(n.xp), n.xp);
  };
  refresh();
  // While the settings show, the line follows the game (a shared world goes on behind the menu); when
  // they show again, the hour, the level and the step of the chosen quest are those of now (the story
  // moves a quest too).
  const showNow = (): void => {
    const n = options.now();
    if (hourBox && n.hour !== null) hourBox.value = String(Math.floor(n.hour));
    level.value = String(levelOf(n.xp));
    fillSteps();
  };
  let shown = false;
  window.setInterval(() => {
    const visible = section.getClientRects().length > 0;
    if (visible && !shown) showNow();
    shown = visible;
    if (visible) refresh();
  }, 250);
  return section;
}
