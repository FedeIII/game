import { addToPack, hasItems, removeFromPack, type ItemKind, type ItemStack, type Loot, type Pack } from './items.ts';

/**
 * Quests: what a world asks of a character, in steps. A world gives its quests in its definition
 * (WorldDefinition.quests); each character has a quest book, the step that it is at in each quest
 * that it started. Effects move a quest on (an answer in a conversation, a thing that a character
 * reads), and conditions show or hide what depends on a step. Pure data, so a world can check its
 * quests in a test. In a shared world the server keeps the book with the character, and it checks
 * each effect again before it applies it (Room.quest).
 */

/** The ids of quests, steps, flags and effects: short, lowercase. */
export const QUEST_ID = /^[a-z0-9-]{1,32}$/;
/** The most quests in a book, and the most flags of a quest. */
export const MAX_QUESTS = 64;
export const MAX_FLAGS = 8;
/** The longest text of a quest (characters): its title, and a step's line in the journal. */
export const QUEST_LIMITS = { title: 40, journal: 240 } as const;

export interface QuestStep {
  /** Unique in its quest. */
  readonly id: string;
  /** What the journal says at this step. */
  readonly journal: string;
  /** A tile that the map marks while the quest is at this step (where to go). */
  readonly at?: readonly [number, number];
  /** Or an NPC of the world (NpcDef.id): the map marks its home tile. */
  readonly npc?: string;
  /** The quest is done at this step: the journal shows it with the done quests. */
  readonly end?: boolean;
}

export interface QuestDef {
  readonly id: string;
  /** Its name in the journal. */
  readonly title: string;
  readonly steps: readonly QuestStep[];
}

/** Where a character is in a quest. */
export interface QuestEntry {
  /** The step that it is at. */
  readonly step: string;
  /** What it did on the way (an effect sets a flag). */
  readonly flags: readonly string[];
  /** The order in which the entries changed: the last change has the highest number. */
  readonly n: number;
}

/** The quests that a character started: the entry of each one, by the id of the quest. */
export type QuestBook = Readonly<Record<string, QuestEntry>>;

export const EMPTY_BOOK: QuestBook = {};

/**
 * A condition: a quest at a step (`at`: one of these steps; without it, at any step: the quest
 * started), and with a flag (`flag`: QuestEffect.flag), or an item in the pack (`has`). `not` turns it
 * round: a quest that is not at those steps or without the flag (or that did not start), an item that
 * is not in the pack.
 */
export type When =
  | { readonly quest: string; readonly at?: readonly string[]; readonly flag?: string; readonly not?: boolean }
  | { readonly has: ItemKind; readonly not?: boolean };

/** One condition or a list of them: all must hold. */
export type Conditions = When | readonly When[];

/** Whether the conditions hold for a character with `book` and `pack` (none: they hold). */
export function holds(when: Conditions | undefined, book: QuestBook, pack: Pack): boolean {
  if (!when) return true;
  const list: readonly When[] = Array.isArray(when) ? when : [when as When];
  return list.every((w) => {
    const entry = 'has' in w ? undefined : book[w.quest];
    const yes =
      'has' in w
        ? hasItems(pack, [{ kind: w.has, count: 1 }])
        : entry !== undefined && (!w.at || w.at.includes(entry.step)) && (!w.flag || entry.flags.includes(w.flag));
    return w.not ? !yes : yes;
  });
}

/**
 * What an answer or a thing does to a quest. It moves quest `quest` to step `to`: from one of the
 * steps `from`, or, without `from`, when the quest did not start (it starts it). It can also set a
 * flag of the quest, take items from the pack and give coins and items (a reward). In a shared
 * world the server finds the effect by its id (in the dialog of the NPC, or on the thing) and
 * checks it again.
 */
export interface QuestEffect {
  /** The server finds the effect by it: two effects with the same id must be the same. */
  readonly id: string;
  readonly quest: string;
  /** The step that it moves the quest to. Without it, the quest stays at its step (a thing given back); then it needs `from`. */
  readonly to?: string;
  readonly from?: readonly string[];
  readonly flag?: string;
  /** Items that the character gives (the lever that it brings). It must have them. */
  readonly take?: readonly ItemStack[];
  /** Coins that the character pays (a fine). It must have them. */
  readonly cost?: number;
  /** Coins and items that the character gets. What does not fit in the pack falls at its feet. */
  readonly give?: Loot;
}

/** Whether the effect can apply to a character with `book` and `pack`: the quest is at a step that it comes from, and the pack has what it takes. */
export function canApply(effect: QuestEffect, book: QuestBook, pack: Pack): boolean {
  const entry = book[effect.quest];
  const fromOk = effect.from ? entry !== undefined && effect.from.includes(entry.step) : entry === undefined;
  return fromOk && hasItems(pack, effect.take ?? []) && pack.coins >= (effect.cost ?? 0);
}

/**
 * Applies an effect to a character with `book` and `pack` (a pack of `slots` slots). Returns the new
 * book and pack, what the pack took of the reward, and what did not fit (it falls at the
 * character's feet); null when the effect cannot apply (canApply), and then nothing changes.
 */
export function applyEffect(effect: QuestEffect, book: QuestBook, pack: Pack, slots: number): { book: QuestBook; pack: Pack; taken: Loot; left: Loot } | null {
  if (!canApply(effect, book, pack)) return null;
  const entry = book[effect.quest];
  const flags = entry?.flags ?? [];
  const n = Math.max(0, ...Object.values(book).map((e) => e.n)) + 1;
  const next: QuestBook = {
    ...book,
    [effect.quest]: { step: effect.to ?? entry!.step, flags: effect.flag && !flags.includes(effect.flag) ? [...flags, effect.flag].slice(-MAX_FLAGS) : flags, n },
  };
  const taken = removeFromPack(pack, effect.take ?? []);
  const paid = effect.cost ? { ...taken, coins: taken.coins - effect.cost } : taken;
  const added = addToPack(paid, effect.give ?? { coins: 0, items: [] }, slots);
  return { book: next, pack: added.pack, taken: added.taken, left: added.left };
}

/** The first condition list whose conditions hold, by its index; -1 for none. */
export function firstThatHolds(list: readonly { readonly when: Conditions }[], book: QuestBook, pack: Pack): number {
  return list.findIndex((item) => holds(item.when, book, pack));
}

/** Checks a quest book from outside (a stored row, the wire): good ids, known shape. Drops what is not good. */
export function checkQuests(raw: unknown): QuestBook {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return EMPTY_BOOK;
  const out: Record<string, QuestEntry> = {};
  for (const [quest, value] of Object.entries(raw as Record<string, unknown>).slice(0, MAX_QUESTS)) {
    if (!QUEST_ID.test(quest) || !value || typeof value !== 'object') continue;
    const v = value as Record<string, unknown>;
    if (typeof v.step !== 'string' || !QUEST_ID.test(v.step)) continue;
    const flags = Array.isArray(v.flags) ? v.flags.filter((f): f is string => typeof f === 'string' && QUEST_ID.test(f)).slice(0, MAX_FLAGS) : [];
    const n = Number.isInteger(v.n) && (v.n as number) >= 0 && (v.n as number) < 1_000_000_000 ? (v.n as number) : 0;
    out[quest] = { step: v.step, flags, n };
  }
  return out;
}

/** The step of a quest with this id, or null. */
export function questStep(quest: QuestDef, step: string): QuestStep | null {
  return quest.steps.find((s) => s.id === step) ?? null;
}

/**
 * The problems of a world's quests, as sentences; none for good ones: good ids, unique quests and
 * steps, a title and a journal line for each step within QUEST_LIMITS, and at least one step that
 * ends the quest.
 */
export function checkQuestDefs(quests: readonly QuestDef[]): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const quest of quests) {
    if (!QUEST_ID.test(quest.id)) problems.push(`the quest id "${quest.id}" is not good`);
    if (ids.has(quest.id)) problems.push(`two quests have the id "${quest.id}"`);
    ids.add(quest.id);
    if (!quest.title || quest.title.length > QUEST_LIMITS.title) problems.push(`${quest.id}: the title is empty or too long`);
    const steps = new Set<string>();
    for (const step of quest.steps) {
      if (!QUEST_ID.test(step.id)) problems.push(`${quest.id}: the step id "${step.id}" is not good`);
      if (steps.has(step.id)) problems.push(`${quest.id}: two steps have the id "${step.id}"`);
      steps.add(step.id);
      if (!step.journal || step.journal.length > QUEST_LIMITS.journal) problems.push(`${quest.id}.${step.id}: the journal line is empty or too long`);
    }
    if (!quest.steps.some((s) => s.end)) problems.push(`${quest.id}: no step ends it`);
  }
  return problems;
}

/** The problems of an effect against the world's quests: its quest and its steps must exist. */
export function checkEffect(effect: QuestEffect, quests: readonly QuestDef[]): string[] {
  const quest = quests.find((q) => q.id === effect.quest);
  if (!QUEST_ID.test(effect.id)) return [`the effect id "${effect.id}" is not good`];
  if (!quest) return [`${effect.id}: no quest "${effect.quest}"`];
  const problems: string[] = [];
  if (effect.to === undefined && !effect.from) problems.push(`${effect.id}: an effect without a step to go to must have steps to come from`);
  for (const step of [...(effect.to === undefined ? [] : [effect.to]), ...(effect.from ?? [])]) if (!questStep(quest, step)) problems.push(`${effect.id}: no step "${step}" in ${quest.id}`);
  if (effect.flag !== undefined && !QUEST_ID.test(effect.flag)) problems.push(`${effect.id}: the flag "${effect.flag}" is not good`);
  if (effect.cost !== undefined && (!Number.isInteger(effect.cost) || effect.cost < 0)) problems.push(`${effect.id}: the cost is not a whole number of coins`);
  return problems;
}

/** The problems of conditions against the world's quests: each quest and step must exist. */
export function checkConditions(when: Conditions | undefined, quests: readonly QuestDef[]): string[] {
  if (!when) return [];
  const list: readonly When[] = Array.isArray(when) ? when : [when as When];
  const problems: string[] = [];
  for (const w of list) {
    if ('has' in w) continue;
    const quest = quests.find((q) => q.id === w.quest);
    if (!quest) problems.push(`no quest "${w.quest}"`);
    else for (const step of w.at ?? []) if (!questStep(quest, step)) problems.push(`no step "${step}" in ${quest.id}`);
    if (w.flag !== undefined && !QUEST_ID.test(w.flag)) problems.push(`the flag "${w.flag}" is not a short lowercase id`);
  }
  return problems;
}

/** What changed between two books, for the journal's banner: a quest that started, moved on, or ended. */
export interface QuestChange {
  readonly quest: QuestDef;
  readonly kind: 'start' | 'step' | 'end';
}

/** The changes from `before` to `after`, for the quests that the world has (the newest last). */
export function questChanges(before: QuestBook, after: QuestBook, quests: readonly QuestDef[]): QuestChange[] {
  const out: (QuestChange & { n: number })[] = [];
  for (const quest of quests) {
    const now = after[quest.id];
    const then = before[quest.id];
    if (!now || (then && then.step === now.step)) continue;
    const step = questStep(quest, now.step);
    if (!step) continue;
    out.push({ quest, kind: step.end ? 'end' : then ? 'step' : 'start', n: now.n });
  }
  return out.sort((a, b) => a.n - b.n).map(({ quest, kind }) => ({ quest, kind }));
}
