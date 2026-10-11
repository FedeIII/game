import { describe, expect, it } from 'vitest';
import { DIALOG_LIMITS, EMPTY_BOOK, EMPTY_PACK, checkDialog, findEffectAnswer, startNode, type Dialog, type QuestEffect } from '../src/index.ts';

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

describe('a dialog with quests', () => {
  const help: QuestEffect = { id: 'help', quest: 'cart', to: 'met' };
  const cart: Dialog = {
    name: 'The merchant',
    start: 'hello',
    starts: [
      { when: { quest: 'cart', at: ['met'] }, node: 'again' },
      { when: { has: 'crowbar' }, node: 'lever' },
    ],
    nodes: {
      hello: { say: 'The wheel came off.', answers: [{ text: 'Can I help?', next: 'thanks', effect: help }, { text: 'Goodbye.' }] },
      thanks: { say: 'Thank you.', answers: [{ text: 'Goodbye.' }] },
      again: { say: 'Back again?', answers: [{ text: 'Yes.' }] },
      lever: { say: 'A lever!', answers: [{ text: 'Yes.' }] },
    },
  };

  it('starts at the first node of `starts` whose conditions hold, else at its start', () => {
    expect(checkDialog(cart)).toEqual([]);
    expect(startNode(cart, EMPTY_BOOK, EMPTY_PACK)).toBe('hello');
    expect(startNode(cart, { cart: { step: 'met', flags: [], n: 1 } }, { coins: 0, items: [{ kind: 'crowbar', count: 1 }] })).toBe('again');
    expect(startNode(cart, { cart: { step: 'done', flags: [], n: 2 } }, { coins: 0, items: [{ kind: 'crowbar', count: 1 }] })).toBe('lever');
    expect(findEffectAnswer(cart, 'help')?.text).toBe('Can I help?');
    expect(findEffectAnswer(cart, 'nothing')).toBeNull();
  });

  it('counts the nodes of `starts` as reached, and needs them to exist', () => {
    const { again: _, ...rest } = cart.nodes;
    expect(checkDialog({ ...cart, nodes: rest })).toContain('no start node "again"');
  });

  it('needs an answer for every character in each node, and a way out that is not behind a condition or an effect', () => {
    const shut: Dialog = { ...cart, nodes: { ...cart.nodes, again: { say: 'Back?', answers: [{ text: 'Here.', effect: help }, { text: 'Bye.', when: { has: 'crowbar' } }] } } };
    expect(checkDialog(shut)).toContain('again: every answer is behind a gate, a condition or an effect');
    const stuck: Dialog = { ...cart, nodes: { ...cart.nodes, thanks: { say: 'Thank you.', answers: [{ text: 'More.', next: 'thanks' }, { text: 'Bye.', when: { has: 'crowbar' } }] } } };
    expect(checkDialog(stuck)).toContain('thanks: the conversation cannot end from it');
  });

  it('finds two different effects with one id, and an answer with a deal and an effect', () => {
    const twice: Dialog = { ...cart, nodes: { ...cart.nodes, thanks: { say: 'Thank you.', answers: [{ text: 'Again?', next: 'hello', effect: { ...help, to: 'done' } }, { text: 'Goodbye.' }] } } };
    expect(checkDialog(twice)).toContain('two effects have the id "help"');
    const both: Dialog = {
      ...cart,
      nodes: { ...cart.nodes, thanks: { say: 'Thank you.', answers: [{ text: 'Buy.', next: 'hello', effect: help, deal: { id: 'ale', goods: 'ale', price: 1, poor: 'hello' } }, { text: 'Goodbye.' }] } },
    };
    expect(checkDialog(both)).toContain('thanks: the answer "Buy." has a deal and an effect');
  });
});
