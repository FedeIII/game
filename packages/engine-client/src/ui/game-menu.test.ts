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

  it('has Main menu, Load game, Settings and Prologue, in that order (Fede, 2026-10-14)', () => {
    expect(gameMenuChoices({ mainMenu: act, load: act, prologue: act })).toEqual(['mainMenu', 'load', 'settings', 'prologue']);
  });

  it('leaves out a choice without its action (a guest: no character)', () => {
    expect(gameMenuChoices({ mainMenu: act, prologue: act })).toEqual(['mainMenu', 'settings', 'prologue']);
    expect(gameMenuChoices({})).toEqual(['settings']);
  });
});
