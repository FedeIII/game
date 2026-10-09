import { describe, expect, it } from 'vitest';
import type { Dialog } from '@game/engine';
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
