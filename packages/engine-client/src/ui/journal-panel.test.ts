import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE, landAt, type Land, type NamedPlace, type QuestDef } from '@game/engine';
import { chunkLands, journalEntries, journalTips, questMarks, regionEntries } from './journal-panel.ts';
import { STRINGS } from './strings.ts';

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

  it('shows the tips that the player has seen, in the order of the tutorial, for a keyboard or a touch screen', () => {
    const seen = new Set(['map', 'walk']);
    expect(journalTips((id) => seen.has(id), false)).toEqual([STRINGS.tips.list.walk.keys, STRINGS.tips.list.map.keys]);
    expect(journalTips((id) => seen.has(id), true)).toEqual([STRINGS.tips.list.walk.touch, STRINGS.tips.list.map.touch]);
    expect(journalTips(() => false, false)).toEqual([]);
  });
});

describe('the regions of the journal', () => {
  // A small land, a land from row 0 south, and the land of the rest (the first one that holds a tile wins).
  const LANDS: readonly Land[] = [
    { id: 'enclave', title: 'Enclave', line: 'The small land.', x0: 100, y0: -140, x1: 139, y1: -101 },
    { id: 'south', title: 'South', line: 'The south.', x0: -Infinity, y0: 0, x1: Infinity, y1: Infinity },
    { id: 'wild', title: 'Wild', line: 'The rest.', x0: -Infinity, y0: -Infinity, x1: Infinity, y1: Infinity },
  ];
  const PLACES: readonly NamedPlace[] = [
    { id: 'home', name: 'Home', line: 'My hut.', x0: 10, y0: 10, x1: 16, y1: 15 },
    { id: 'ruin', name: 'Ruin', line: 'Burned.', x0: 5, y0: -50, x1: 15, y1: -40 },
    { id: 'village', name: 'Village', line: 'Mithril.', x0: 110, y0: -130, x1: 130, y1: -110 },
  ];
  const chunk = (tx: number, ty: number) => `${Math.floor(tx / CHUNK_SIZE)},${Math.floor(ty / CHUNK_SIZE)}`;

  it('finds the lands of a chunk as landAt() finds them for each tile', () => {
    for (const [cx, cy] of [
      [0, 0],
      [0, -1],
      [3, -4],
      [4, -4],
      [3, -5],
      [-7, 9],
    ] as const) {
      const ids = new Set<string>();
      for (let ty = cy * CHUNK_SIZE; ty < (cy + 1) * CHUNK_SIZE; ty++) {
        for (let tx = cx * CHUNK_SIZE; tx < (cx + 1) * CHUNK_SIZE; tx++) ids.add(landAt(LANDS, tx, ty)!.id);
      }
      expect(new Set(chunkLands(LANDS, cx, cy)), `${cx},${cy}`).toEqual(ids);
    }
  });

  it('shows each land that a seen chunk holds, with the places that a seen chunk touches, in the order of the places', () => {
    expect(regionEntries(new Set(), LANDS, PLACES)).toEqual([]);
    // The chunk of the home only: the south and the home.
    expect(regionEntries(new Set([chunk(12, 12)]), LANDS, PLACES)).toEqual([{ name: 'South', line: 'The south.', places: [{ name: 'Home', line: 'My hut.' }] }]);
    // The chunk north of it: the wild land too, without its ruin (two chunks further north).
    const north = new Set([chunk(12, 12), chunk(12, -12)]);
    expect(regionEntries(north, LANDS, PLACES).map((r) => [r.name, r.places.length])).toEqual([
      ['South', 1],
      ['Wild', 0],
    ]);
    // A corner of the village: the village, under the land of its middle (the enclave), after the wild land of the ruin.
    const all = new Set([...north, chunk(15, -45), chunk(110, -110)]);
    expect(regionEntries(all, LANDS, PLACES)).toEqual([
      { name: 'South', line: 'The south.', places: [{ name: 'Home', line: 'My hut.' }] },
      { name: 'Wild', line: 'The rest.', places: [{ name: 'Ruin', line: 'Burned.' }] },
      { name: 'Enclave', line: 'The small land.', places: [{ name: 'Village', line: 'Mithril.' }] },
    ]);
  });

  it('puts the places of a world without lands in one group without a name', () => {
    expect(regionEntries(new Set([chunk(12, 12)]), [], PLACES)).toEqual([{ name: '', line: '', places: [{ name: 'Home', line: 'My hut.' }] }]);
  });
});
