import { describe, expect, it } from 'vitest';
import { escapeAction } from './game-menu.ts';

describe('the Escape key', () => {
  it('opens the game menu when nothing else is open, and closes it when it is open', () => {
    expect(escapeAction({ menuOpen: false, otherOpen: false, inField: false })).toBe('open');
    expect(escapeAction({ menuOpen: true, otherOpen: false, inField: false })).toBe('close');
    expect(escapeAction({ menuOpen: true, otherOpen: true, inField: true })).toBe('close');
  });

  it('is left to an open panel, a conversation or a text field', () => {
    expect(escapeAction({ menuOpen: false, otherOpen: true, inField: false })).toBe('none');
    expect(escapeAction({ menuOpen: false, otherOpen: false, inField: true })).toBe('none');
  });
});
