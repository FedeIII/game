import { describe, expect, it } from 'vitest';
import { DIALOG_LIMITS, checkDialog, type Dialog } from '../src/index.ts';

const good: Dialog = {
  name: 'The watchman',
  start: 'hello',
  nodes: {
    hello: { say: 'Halt!', answers: [{ text: 'Who are you?', next: 'who' }, { text: 'Goodbye.' }] },
    who: { say: 'The watch.', answers: [{ text: 'Back.', next: 'hello' }, { text: 'And?', next: 'more' }] },
    more: { say: 'That is all.', answers: [{ text: 'Goodbye.' }] },
  },
};

describe('a dialog', () => {
  it('is good when every answer leads somewhere, every node is reached, and each one can end', () => {
    expect(checkDialog(good)).toEqual([]);
  });

  it('must start at a node that it has, and lead only to nodes that it has', () => {
    expect(checkDialog({ ...good, start: 'nope' }).join(' ')).toContain('no start node');
    const broken = { ...good, nodes: { ...good.nodes, more: { say: 'Hm.', answers: [{ text: 'Where?', next: 'nowhere' }, { text: 'Bye.' }] } } };
    expect(checkDialog(broken).join(' ')).toContain('leads to no node "nowhere"');
  });

  it('must reach every node from the start', () => {
    const lonely = { ...good, nodes: { ...good.nodes, lonely: { say: 'Nobody asks me.', answers: [{ text: 'Bye.' }] } } };
    expect(checkDialog(lonely)).toEqual(['lonely: no answer leads to it']);
  });

  it('must let the player end the conversation from every node', () => {
    const loop: Dialog = {
      name: 'A bore',
      start: 'a',
      nodes: { a: { say: 'Listen.', answers: [{ text: 'Go on.', next: 'b' }] }, b: { say: 'And then...', answers: [{ text: 'Go on.', next: 'a' }] } },
    };
    expect(checkDialog(loop)).toEqual(['a: the conversation cannot end from it', 'b: the conversation cannot end from it']);
  });

  it('keeps its answers and texts short enough for the panel', () => {
    const many = Array.from({ length: DIALOG_LIMITS.answers + 1 }, (_, i) => ({ text: `Answer ${i}` }));
    expect(checkDialog({ ...good, nodes: { ...good.nodes, more: { say: 'Pick.', answers: many } } })).toEqual([`more: ${many.length} answers`]);
    expect(checkDialog({ ...good, nodes: { ...good.nodes, more: { say: 'x'.repeat(DIALOG_LIMITS.say + 1), answers: [{ text: 'Bye.' }] } } })).toEqual(['more: the line is empty or too long']);
  });
});
