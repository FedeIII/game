import { describe, expect, it } from 'vitest';
import {
  EMPTY_BOOK,
  EMPTY_PACK,
  MAX_FLAGS,
  applyEffect,
  canApply,
  checkConditions,
  checkEffect,
  checkQuestDefs,
  checkQuests,
  checkScenes,
  inScene,
  fromWireBook,
  holds,
  parseClientMessage,
  questChanges,
  toWireBook,
  type Pack,
  type QuestBook,
  type QuestDef,
  type QuestEffect,
  type SceneDef,
} from '../src/index.ts';

const ERRAND: QuestDef = {
  id: 'errand',
  title: 'An Errand',
  steps: [
    { id: 'asked', journal: 'Somebody asked me for a tool.', npc: 'asker' },
    { id: 'got', journal: 'I have the tool.', at: [3, 4] },
    { id: 'done', journal: 'I brought the tool.', end: true },
  ],
};
const START: QuestEffect = { id: 'start', quest: 'errand', to: 'asked' };
const GET: QuestEffect = { id: 'get', quest: 'errand', to: 'got', from: ['asked'], give: { coins: 0, items: [{ kind: 'crowbar', count: 1 }] } };
const BRING: QuestEffect = { id: 'bring', quest: 'errand', to: 'done', from: ['got'], flag: 'brought', take: [{ kind: 'crowbar', count: 1 }], give: { coins: 7, items: [] } };

describe('conditions', () => {
  const book: QuestBook = { errand: { step: 'got', flags: [], n: 1 } };
  const pack: Pack = { coins: 0, items: [{ kind: 'crowbar', count: 1 }] };

  it('hold for a quest at a step, at any step, and for an item in the pack; `not` turns them round', () => {
    expect(holds(undefined, EMPTY_BOOK, EMPTY_PACK)).toBe(true);
    expect(holds({ quest: 'errand', at: ['got'] }, book, pack)).toBe(true);
    expect(holds({ quest: 'errand', at: ['asked', 'done'] }, book, pack)).toBe(false);
    expect(holds({ quest: 'errand' }, book, pack)).toBe(true);
    expect(holds({ quest: 'errand' }, EMPTY_BOOK, pack)).toBe(false);
    expect(holds({ quest: 'errand', not: true }, EMPTY_BOOK, pack)).toBe(true);
    expect(holds({ has: 'crowbar' }, book, pack)).toBe(true);
    expect(holds({ has: 'crowbar', not: true }, book, pack)).toBe(false);
    expect(holds({ has: 'crowbar' }, book, EMPTY_PACK)).toBe(false);
  });

  it('in a list, all must hold', () => {
    expect(holds([{ quest: 'errand', at: ['got'] }, { has: 'crowbar' }], book, pack)).toBe(true);
    expect(holds([{ quest: 'errand', at: ['got'] }, { has: 'crowbar', not: true }], book, pack)).toBe(false);
  });
});

describe('effects', () => {
  it('start a quest only when it did not start, and move it on only from its steps', () => {
    expect(canApply(START, EMPTY_BOOK, EMPTY_PACK)).toBe(true);
    const started = applyEffect(START, EMPTY_BOOK, EMPTY_PACK, 4)!;
    expect(started.book.errand).toEqual({ step: 'asked', flags: [], n: 1 });
    expect(canApply(START, started.book, EMPTY_PACK)).toBe(false);
    expect(applyEffect(START, started.book, EMPTY_PACK, 4)).toBeNull();
    expect(canApply(BRING, started.book, EMPTY_PACK)).toBe(false);
    expect(canApply(GET, EMPTY_BOOK, EMPTY_PACK)).toBe(false);
  });

  it('give items and coins, take items, and set a flag; the order of the changes goes up', () => {
    const asked = applyEffect(START, EMPTY_BOOK, EMPTY_PACK, 4)!;
    const got = applyEffect(GET, asked.book, asked.pack, 4)!;
    expect(got.pack.items).toEqual([{ kind: 'crowbar', count: 1 }]);
    expect(got.taken.items).toEqual([{ kind: 'crowbar', count: 1 }]);
    expect(got.book.errand!.n).toBe(2);
    // Without the item, the effect that takes it does not apply.
    expect(canApply(BRING, got.book, EMPTY_PACK)).toBe(false);
    const done = applyEffect(BRING, got.book, got.pack, 4)!;
    expect(done.book.errand).toEqual({ step: 'done', flags: ['brought'], n: 3 });
    expect(done.pack).toEqual({ coins: 7, items: [] });
    expect(done.taken.coins).toBe(7);
  });

  it('leave out what does not fit in the pack: it falls at the feet', () => {
    const full: Pack = { coins: 0, items: [{ kind: 'herbs', count: 10 }] };
    const asked = applyEffect(START, EMPTY_BOOK, full, 1)!;
    const got = applyEffect(GET, asked.book, full, 1)!;
    expect(got.pack).toEqual(full);
    expect(got.left.items).toEqual([{ kind: 'crowbar', count: 1 }]);
    expect(got.book.errand!.step).toBe('got');
  });

  it('keep a flag once, and at most MAX_FLAGS of them', () => {
    let book: QuestBook = { errand: { step: 'got', flags: [], n: 1 } };
    for (let i = 0; i < MAX_FLAGS + 3; i++) {
      book = applyEffect({ id: 'again', quest: 'errand', to: 'got', from: ['got'], flag: `f${i % (MAX_FLAGS + 2)}` }, book, EMPTY_PACK, 4)!.book;
    }
    expect(book.errand!.flags.length).toBe(MAX_FLAGS);
    expect(new Set(book.errand!.flags).size).toBe(MAX_FLAGS);
  });
});

describe('quest books from outside', () => {
  it('keep good entries and drop the rest', () => {
    expect(checkQuests(null)).toEqual({});
    expect(checkQuests([1, 2])).toEqual({});
    expect(
      checkQuests({
        errand: { step: 'got', flags: ['a', 'BAD FLAG', 3], n: 4 },
        'Bad Id': { step: 'x', flags: [], n: 1 },
        other: { step: 'not a step!', flags: [], n: 1 },
        third: { step: 'one', n: -5 },
      }),
    ).toEqual({ errand: { step: 'got', flags: ['a'], n: 4 }, third: { step: 'one', flags: [], n: 0 } });
  });

  it('go over the wire and come back the same', () => {
    const book: QuestBook = { errand: { step: 'got', flags: ['a'], n: 4 }, other: { step: 'one', flags: [], n: 1 } };
    expect(fromWireBook(JSON.parse(JSON.stringify(toWireBook(book))))).toEqual(book);
  });

  it('come from the page only as the id of an effect with an NPC or a tile', () => {
    expect(parseClientMessage(JSON.stringify({ t: 'quest', npc: 3, effect: 'cart-help' }))).toEqual({ t: 'quest', npc: 3, effect: 'cart-help' });
    expect(parseClientMessage(JSON.stringify({ t: 'quest', at: [4, -2], effect: 'read-letter' }))).toEqual({ t: 'quest', at: [4, -2], effect: 'read-letter' });
    expect(parseClientMessage(JSON.stringify({ t: 'quest', npc: 3, at: [1, 1], effect: 'x' }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ t: 'quest', npc: 3, effect: 'Bad Effect' }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ t: 'quest', npc: 3, effect: 'x', to: 'done' }))).toEqual({ t: 'quest', npc: 3, effect: 'x' });
    expect(parseClientMessage(JSON.stringify({ t: 'quest', scene: 'argument', effect: 'raid-heard' }))).toEqual({ t: 'quest', scene: 'argument', effect: 'raid-heard' });
    expect(parseClientMessage(JSON.stringify({ t: 'quest', scene: 'argument', npc: 1, effect: 'raid-heard' }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ t: 'quest', scene: 'Bad Scene', effect: 'raid-heard' }))).toBeNull();
  });
});

describe('the checks of a world', () => {
  it('find bad quests, effects and conditions', () => {
    expect(checkQuestDefs([ERRAND])).toEqual([]);
    expect(checkQuestDefs([ERRAND, ERRAND])).toContain('two quests have the id "errand"');
    expect(checkQuestDefs([{ ...ERRAND, steps: ERRAND.steps.filter((s) => !s.end) }])).toContain('errand: no step ends it');
    expect(checkQuestDefs([{ ...ERRAND, steps: [...ERRAND.steps, { id: 'long', journal: 'x'.repeat(300) }] }])).toContain('errand.long: the journal line is empty or too long');
    for (const effect of [START, GET, BRING]) expect(checkEffect(effect, [ERRAND])).toEqual([]);
    expect(checkEffect({ ...GET, to: 'nowhere' }, [ERRAND])).toEqual(['get: no step "nowhere" in errand']);
    expect(checkEffect({ ...GET, quest: 'other' }, [ERRAND])).toEqual(['get: no quest "other"']);
    expect(checkConditions([{ quest: 'errand', at: ['got'] }, { has: 'crowbar' }], [ERRAND])).toEqual([]);
    expect(checkConditions({ quest: 'errand', at: ['gone'] }, [ERRAND])).toEqual(['no step "gone" in errand']);
  });

  it('tell what changed between two books, for the banner', () => {
    const asked = applyEffect(START, EMPTY_BOOK, EMPTY_PACK, 4)!.book;
    expect(questChanges(EMPTY_BOOK, asked, [ERRAND])).toEqual([{ quest: ERRAND, kind: 'start' }]);
    const got = applyEffect(GET, asked, EMPTY_PACK, 4)!.book;
    expect(questChanges(asked, got, [ERRAND])).toEqual([{ quest: ERRAND, kind: 'step' }]);
    const done: QuestBook = { errand: { step: 'done', flags: [], n: 3 } };
    expect(questChanges(got, done, [ERRAND])).toEqual([{ quest: ERRAND, kind: 'end' }]);
    expect(questChanges(done, done, [ERRAND])).toEqual([]);
    // A quest that the world does not have says nothing.
    expect(questChanges(EMPTY_BOOK, { other: { step: 'x', flags: [], n: 1 } }, [ERRAND])).toEqual([]);
  });
});

describe('scenes', () => {
  const scene: SceneDef = {
    id: 'talk',
    area: { x0: 2, y0: 3, x1: 5, y1: 6 },
    when: { quest: 'errand', not: true },
    lines: [
      { npc: 'asker', text: 'Hello.' },
      { npc: 'other', text: 'A secret.', gate: { ability: 'wis', min: 13 } },
    ],
    effect: START,
  };

  it('play in their area, or near it with a margin', () => {
    expect(inScene(scene, 2, 3)).toBe(true);
    expect(inScene(scene, 5, 6)).toBe(true);
    expect(inScene(scene, 6, 6)).toBe(false);
    expect(inScene(scene, 7, 8, 2)).toBe(true);
    expect(inScene(scene, 8, 8, 2)).toBe(false);
  });

  it('are good with NPCs that the world has, short lines, and an effect on its quests', () => {
    expect(checkScenes([scene], ['asker', 'other'], [ERRAND])).toEqual([]);
    expect(checkScenes([scene], ['asker'], [ERRAND])).toEqual(['talk: no NPC "other"']);
    expect(checkScenes([scene, scene], ['asker', 'other'], [ERRAND])).toEqual(['two scenes have the id "talk"']);
    expect(checkScenes([{ ...scene, lines: [{ npc: 'asker', text: 'x'.repeat(200) }] }], ['asker'], [ERRAND])[0]).toMatch(/too long/);
    expect(checkScenes([{ ...scene, effect: { ...START, to: 'nowhere' } }], ['asker', 'other'], [ERRAND])).toEqual(['talk: start: no step "nowhere" in errand']);
  });
});
