# The Game Menu

## Overview

The game menu (Fede's request, 2026-10-12) opens over the game when the player presses Escape: it
gives three choices, "Resume", "Load game" and "New game". "Load game" and "New game" go back to the
menu of the page (the menu before the game), at the list of characters or at the character builder.

## Terminology

- **The game menu**: the panel over the game that Escape opens.
- **The menu of the page**: the menu before the game (`runMenu()`): sign-in, main screen, the list of
  characters ("Continue") and the character builder ("New game").
- **A world that the page runs**: a world without a server (`?offline`). A **shared world**: a world
  that the server runs (the Wilds on game.azyr.io).

## Requirements

### REQ-GMN-001: Escape opens and closes the game menu

**User Story:** As a player, I want Escape to open a menu over the game, so that I can stop for a
moment or change my game.

**Acceptance Criteria:**
- **AC-GMN-001.1:** Escape opens the game menu when no other panel is open (the journal, the map, the
  pack, the settings, the worlds), no conversation and no dream is open, no stack of the pack is
  dragged, and the focus is not in a text field. Else Escape does what it did before (it closes that
  panel or conversation), and the game menu stays shut.
- **AC-GMN-001.2:** The game menu shows the name of the world over three buttons: "Resume", "Load game"
  and "New game" (Spanish: "Reanudar", "Cargar partida", "Partida nueva"). "Resume" has the focus.
- **AC-GMN-001.3:** Escape, "Resume", or a click on the dark round the panel closes it; the focus goes
  back to where it was.
- **AC-GMN-001.4:** The arrow keys and Tab move between the buttons (Tab stays in the menu); Enter and
  Space press the button with the focus. No other key reaches the game while the menu is open.

---

### REQ-GMN-002: The game while the menu is open

**User Story:** As a player who opens the menu, I want my character to stand still, so that the game
does not move under the menu.

**Acceptance Criteria:**
- **AC-GMN-002.1:** While the game menu is open, the character stands still and does not attack or
  roll; the buttons and the stick of the touch controls hide.
- **AC-GMN-002.2:** A world that the page runs stands still (no tick runs). A shared world goes on: the
  server does not stop for one player, and the mobs near the character can still attack it.

---

### REQ-GMN-003: Load game and New game

**User Story:** As a player, I want to load another character or make a new one from the game, so that
I do not have to go through the main screen.

**Acceptance Criteria:**
- **AC-GMN-003.1:** "Load game" saves the place of the character and reloads the page; the menu of the
  page then shows the list of characters ("Choose a character") at once. With no character, it shows
  the main screen.
- **AC-GMN-003.2:** "New game" saves the place and reloads the page; the menu of the page then shows
  the character builder at once (or the list with the note of the limit, when the account has the
  most characters).
- **AC-GMN-003.3:** After either choice the buttons of the game menu are disabled until the page
  reloads.
- **AC-GMN-003.4:** A visitor without a character (a guest on a page of the developer's machine) has
  only "Resume".

---

## Feature Behavior & Rules

- **The panel** (`packages/engine-client/src/ui/game-menu.ts`): `GameMenu` (`open()`, `close()`,
  `shown`, `key()`), `GameMenuActions` (`load`, `create`), `escapeAction()` (`'open'`, `'close'` or
  `'none'`, from what is open). The texts: `STRINGS.gameMenu` (`label`, `resume`, `load`, `newGame`).
  The look: `#game-menu` and `.game-menu-panel` in `style.css` (the classes of the menu of the page:
  `.menu-panel`, `.menu-name`, `.menu-stack`, `.menu-button`); `body.game-menu-open` hides the touch
  controls.
- **The page** (`game.ts`): a `keydown` listener in the capture phase of `window` decides what Escape
  does before the panels hear it (`otherUiOpen()`: `#journal`, `#worlds`, `#map`, `#pack`, `#settings`,
  the conversation, the dream, a drag of the pack); while the menu is open it stops every key from
  going on. The tick of the loop gives `NO_INPUT` while the menu is open, and `sim.advance(0)` in a
  world that the page runs.
- **Back to the menu** (`menu/resume.ts`): `markMenuScreen('load' | 'new')` notes the screen in
  sessionStorage (`game.menu-screen.v1`), good for one start within 5 minutes; `takeMenuScreen()` in
  `runMenu()` (`menu/menu.ts`) shows that screen after the sign-in check. The place is saved with
  `savePlace(true)` (`keepalive`) before the reload, as for "Main menu" in the "You" section.
- **Tests**: `packages/engine-client/src/ui/game-menu.test.ts` (`escapeAction()`),
  `packages/engine-client/src/menu/resume.test.ts` (the screen note).
