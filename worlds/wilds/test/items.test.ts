import { describe, expect, it } from 'vitest';
import { ITEM_KINDS, type Dialog, type ItemKind } from '@game/engine';
import { wilds } from '../src/index.ts';
import { PEDDLER } from '../src/dialogs.ts';

/** The kinds of item that a dialog takes in its deals. */
function takes(dialog: Dialog): Set<ItemKind> {
  const kinds = new Set<ItemKind>();
  for (const node of Object.values(dialog.nodes)) for (const answer of node.answers) for (const item of answer.deal?.items ?? []) kinds.add(item.kind);
  return kinds;
}

describe('the lines about the items of the Wilds', () => {
  it('has a line for every kind of item', () => {
    for (const kind of ITEM_KINDS) expect(wilds.items?.[kind], kind).toBeTruthy();
  });

  it('says that Corwin buys exactly what the peddler buys', () => {
    const sold = takes(PEDDLER);
    for (const kind of ITEM_KINDS) expect(wilds.items![kind]!.includes('Corwin'), kind).toBe(sold.has(kind));
  });
});
