import { describe, expect, it } from 'vitest';
import { escapeAction, gameMenuChoices } from './game-menu.ts';

describe('the Escape key', () => {
  const state = { menuOpen: false, settingsOpen: false, otherOpen: false, inField: false };

  it('opens the game menu when nothing else is open, and closes it when it is open', () => {
    expect(escapeAction(state)).toBe('open');
    expect(escapeAction({ ...state, menuOpen: true })).toBe('close');
    expect(escapeAction({ ...state, menuOpen: true, otherOpen: true, inField: true })).toBe('close');
  });

  it('goes back from the settings screen to the choices', () => {
    expect(escapeAction({ ...state, menuOpen: true, settingsOpen: true })).toBe('back');
    // Also from a field of the settings (the XP divisor of an admin).
    expect(escapeAction({ ...state, menuOpen: true, settingsOpen: true, inField: true })).toBe('back');
  });

  it('is left to an open panel, a conversation or a text field', () => {
    expect(escapeAction({ ...state, otherOpen: true })).toBe('none');
    expect(escapeAction({ ...state, inField: true })).toBe('none');
  });
});

describe('the choices of the game menu', () => {
  const act = () => {};

  it('has every choice for a character of an account, with Settings last', () => {
    expect(gameMenuChoices({ load: act, create: act, prologue: act, mainMenu: act, signOut: act })).toEqual([
      'resume',
      'load',
      'create',
      'prologue',
      'mainMenu',
      'signOut',
      'settings',
    ]);
  });

  it('leaves out a choice without its action (a guest: no character, no account)', () => {
    expect(gameMenuChoices({ mainMenu: act })).toEqual(['resume', 'mainMenu', 'settings']);
    expect(gameMenuChoices({})).toEqual(['resume', 'settings']);
  });
});
