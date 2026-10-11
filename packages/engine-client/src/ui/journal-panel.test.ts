import { describe, expect, it } from 'vitest';
import type { QuestDef } from '@game/engine';
import { journalEntries, questMarks } from './journal-panel.ts';

const QUESTS: readonly QuestDef[] = [
  {
    id: 'ashes',
    title: 'The Razed Villages',
    steps: [
      { id: 'letter', journal: 'Go to the reeve.', npc: 'reeve' },
      { id: 'found', journal: 'Found.', end: true },
    ],
  },
  {
    id: 'cart',
    title: 'The Broken Cart',
    steps: [
      { id: 'met', journal: 'Lift the cart.', at: [5, 6] },
      { id: 'done', journal: 'The cart is mended.', end: true },
    ],
  },
];

describe('the journal', () => {
  it('shows the open quests and the done quests, the last changed first; unknown quests and steps are left out', () => {
    expect(journalEntries({}, QUESTS)).toEqual({ open: [], done: [] });
    const book = {
      ashes: { step: 'letter', flags: [], n: 1 },
      cart: { step: 'met', flags: [], n: 2 },
      gone: { step: 'x', flags: [], n: 3 },
    };
    expect(journalEntries(book, QUESTS).open).toEqual([
      { title: 'The Broken Cart', line: 'Lift the cart.' },
      { title: 'The Razed Villages', line: 'Go to the reeve.' },
    ]);
    const later = { ...book, cart: { step: 'done', flags: [], n: 4 }, ashes: { step: 'lost', flags: [], n: 1 } };
    expect(journalEntries(later, QUESTS)).toEqual({ open: [], done: [{ title: 'The Broken Cart', line: 'The cart is mended.' }] });
  });

  it('marks on the map the place of the step of each open quest: a tile, or the home of an NPC', () => {
    const home = (id: string) => (id === 'reeve' ? ([1, 2] as const) : null);
    expect(questMarks({ ashes: { step: 'letter', flags: [], n: 1 }, cart: { step: 'met', flags: [], n: 2 } }, QUESTS, home)).toEqual([
      [1, 2],
      [5, 6],
    ]);
    expect(questMarks({ cart: { step: 'done', flags: [], n: 2 } }, QUESTS, home)).toEqual([]);
  });
});
