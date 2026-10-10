import { describe, expect, it } from 'vitest';
import { PLAIN_SCORES, type Dialog } from '@game/engine';
import { Conversation } from './conversation.ts';

const dialog: Dialog = {
  name: 'The watchman',
  start: 'halt',
  nodes: {
    halt: { say: 'Halt!', answers: [{ text: 'Who are you?', next: 'who' }, { text: 'What is this place?', next: 'place' }, { text: 'Goodbye.' }] },
    who: { say: 'The watch.', answers: [{ text: 'And this place?', next: 'place' }, { text: 'Goodbye.' }] },
    place: { say: 'Thornwick.', answers: [{ text: 'Thank you.' }] },
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
    expect(talk.choose(0)?.say).toBe('Thornwick.');
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
