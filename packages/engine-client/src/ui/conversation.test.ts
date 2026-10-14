import { describe, expect, it } from 'vitest';
import { EMPTY_PACK, PLAIN_SCORES, applyEffect, type Dialog, type Pack, type QuestBook, type QuestEffect } from '@game/engine';
import { splitTag } from '../render/text-layout.ts';
import { Conversation, gated } from './conversation.ts';

const dialog: Dialog = {
  name: 'The watchman',
  start: 'halt',
  nodes: {
    halt: { say: 'Halt!', answers: [{ text: 'Who are you?', next: 'who' }, { text: 'What is this place?', next: 'place' }, { text: 'Goodbye.' }] },
    who: { say: 'The watch.', answers: [{ text: 'And this place?', next: 'place' }, { text: 'Goodbye.' }] },
    place: { say: 'Ironhold.', answers: [{ text: 'Thank you.' }] },
  },
};

describe('a conversation', () => {
  it('starts at the start node, with the first answer selected and nothing answered yet', () => {
    const talk = new Conversation(dialog);
    expect([talk.id, talk.node.say, talk.selected, talk.answered]).toEqual(['halt', 'Halt!', 0, null]);
    expect(talk.answers.map((a) => a.text)).toEqual(['Who are you?', 'What is this place?', 'Goodbye.']);
  });

  it('moves the selection round the answers', () => {
    const talk = new Conversation(dialog);
    talk.move(-1);
    expect(talk.selected).toBe(2);
    talk.move(1);
    talk.move(1);
    expect(talk.selected).toBe(1);
  });

  it('goes to the node of an answer, keeps what the player said, and selects the first answer again', () => {
    const talk = new Conversation(dialog);
    talk.move(1);
    expect(talk.choose(0)?.say).toBe('The watch.');
    expect([talk.id, talk.answered, talk.selected]).toEqual(['who', 'Who are you?', 0]);
    expect(talk.choose(0)?.say).toBe('Ironhold.');
    expect(talk.answered).toBe('And this place?');
  });

  it('ends with an answer without a next node, and ignores an answer that is not there', () => {
    const talk = new Conversation(dialog);
    expect(talk.ends(2)).toBe(true);
    expect(talk.ends(0)).toBe(false);
    expect(talk.choose(7)).toBeNull();
    expect(talk.id).toBe('halt');
    expect(talk.choose(2)).toBeNull();
    expect(talk.answered).toBe('Goodbye.');
  });

  it('keeps the gate of the answer that the player gave, for its tag', () => {
    const strong = { ...PLAIN_SCORES, str: 14 };
    const cart: Dialog = {
      name: 'The merchant',
      start: 'stuck',
      nodes: {
        stuck: { say: 'The wheel is stuck.', answers: [{ text: 'I lift it.', next: 'up', gate: { ability: 'str', min: 13 } }, { text: 'Goodbye.' }] },
        up: { say: 'Thank you!', answers: [{ text: 'Goodbye.' }] },
      },
    };
    const talk = new Conversation(cart, strong);
    expect(talk.answeredGate).toBeNull();
    talk.choose(0);
    expect([talk.answered, talk.answeredGate]).toEqual(['I lift it.', { ability: 'str', min: 13 }]);
    talk.choose(0);
    expect(talk.answeredGate).toBeNull();
  });
});

describe('a line of a gate', () => {
  it('starts with the tag of the gate, which a speech bubble finds again', () => {
    const line = gated({ ability: 'dex', min: 13 }, 'The lock clicks open.');
    expect(line).toBe('[DEX 13] The lock clicks open.');
    expect(splitTag(line)).toEqual({ tag: '[DEX 13]', text: 'The lock clicks open.' });
  });
});

describe('an answer behind a gate', () => {
  const gated: Dialog = {
    name: 'The reeve',
    start: 'a',
    nodes: {
      a: { say: 'Yes?', answers: [{ text: 'The ledgers lie.', next: 'b', gate: { ability: 'int', min: 13 } }, { text: 'Goodbye.' }] },
      b: { say: 'So you read them.', answers: [{ text: 'Goodbye.' }] },
    },
  };
  const talk = (int: number) => new Conversation(gated, { ...PLAIN_SCORES, int });

  it('is open with the score of the gate, a dim clue 1 or 2 under it, and not there lower', () => {
    expect(talk(13).answers).toHaveLength(2);
    expect(talk(13).dim(0)).toBe(false);
    expect(talk(12).dim(0)).toBe(true);
    expect(talk(11).dim(0)).toBe(true);
    expect(talk(10).answers.map((a) => a.text)).toEqual(['Goodbye.']);
  });

  it('cannot be given as a clue, and the selection goes past it', () => {
    const t = talk(12);
    expect(t.selected).toBe(1);
    expect(t.choose(0)).toBeNull();
    expect(t.id).toBe('a');
    t.move(1);
    expect(t.selected).toBe(1);
    expect(talk(13).choose(0)?.say).toBe('So you read them.');
  });
});

describe('a conversation with quests', () => {
  const help: QuestEffect = { id: 'help', quest: 'cart', to: 'met' };
  const lift: QuestEffect = { id: 'lift', quest: 'cart', to: 'done', from: ['met'] };
  const merchant: Dialog = {
    name: 'The merchant',
    start: 'cart',
    starts: [{ when: { quest: 'cart', at: ['done'] }, node: 'thanks' }],
    nodes: {
      cart: { say: 'The wheel came off.', answers: [{ text: 'Can I help?', next: 'help', effect: help }, { text: 'Goodbye.' }] },
      help: { say: 'Lift it.', answers: [{ text: 'I lift it.', next: 'thanks', effect: lift }, { text: 'A lever?', when: { has: 'crowbar' } }, { text: 'Not now.' }] },
      thanks: { say: 'Thank you!', answers: [{ text: 'Goodbye.' }] },
    },
  };
  /** A book and a pack that change, as the page's do. */
  const facts = (book: QuestBook = {}, pack: Pack = EMPTY_PACK) => {
    const state = { book, pack };
    return { state, facts: { book: () => state.book, pack: () => state.pack } };
  };

  it('starts at the node for the step of the character', () => {
    expect(new Conversation(merchant, PLAIN_SCORES, facts().facts).id).toBe('cart');
    expect(new Conversation(merchant, PLAIN_SCORES, facts({ cart: { step: 'done', flags: [], n: 1 } }).facts).id).toBe('thanks');
  });

  it('shows an answer with an effect only when it can apply, and one with conditions only when they hold', () => {
    const { state, facts: live } = facts();
    const talk = new Conversation(merchant, PLAIN_SCORES, live);
    expect(talk.answers.map((a) => a.text)).toEqual(['Can I help?', 'Goodbye.']);
    state.book = { cart: { step: 'met', flags: [], n: 1 } };
    expect(talk.answers.map((a) => a.text)).toEqual(['Goodbye.']);
    state.book = {};
    // The answer is taken before its effect changes the book: then the conversation goes on.
    const answer = talk.answers[0]!;
    state.book = applyEffect(answer.effect!, state.book, state.pack, 4)!.book;
    expect(talk.give(answer)?.say).toBe('Lift it.');
    expect(talk.answers.map((a) => a.text)).toEqual(['I lift it.', 'Not now.']);
    state.pack = { coins: 0, items: [{ kind: 'crowbar', count: 1 }] };
    expect(talk.answers.map((a) => a.text)).toEqual(['I lift it.', 'A lever?', 'Not now.']);
  });
});
