import { describe, expect, it } from 'vitest';
import { nextGreeting, type Greeter } from './barks.ts';

const child: Greeter = { index: 3, id: 'child', partner: false };
const smith: Greeter = { index: 5, id: 'smith', partner: false };
const brann: Greeter = { index: 7, id: 'watchman', partner: true };

describe('the greetings of the NPCs', () => {
  it('give the first NPC close by, once', () => {
    const greeted = new Set<string>();
    expect(nextGreeting([child], greeted, false)).toBe(3);
    expect(greeted.has('child')).toBe(true);
    expect(nextGreeting([], greeted, false)).toBeNull();
  });

  it('come one at a time', () => {
    const greeted = new Set<string>();
    expect(nextGreeting([child, smith], greeted, false)).toBe(3);
    expect(greeted.has('smith')).toBe(false);
    // The greeting of the child is on the screen: the smith waits.
    expect(nextGreeting([smith], greeted, true)).toBeNull();
    expect(nextGreeting([smith], greeted, false)).toBe(5);
  });

  it('wait while the player talks with someone, and come after the talk', () => {
    const greeted = new Set<string>();
    expect(nextGreeting([brann, child], greeted, true)).toBeNull();
    expect(greeted.has('child')).toBe(false);
    expect(nextGreeting([child], greeted, false)).toBe(3);
  });

  it('never come from the NPC of the conversation', () => {
    const greeted = new Set<string>();
    expect(nextGreeting([brann], greeted, true)).toBeNull();
    expect(greeted.has('watchman')).toBe(true);
    expect(nextGreeting([brann], new Set<string>(), false)).toBeNull();
  });
});
