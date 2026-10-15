# The Game Menu

## Overview

The game menu (Fede's request, 2026-10-12) opens over the game when the player presses Escape, or
taps a faint icon on a touch screen: it gives the choices "Main menu", "Load game", "Settings" and
"Prologue" (Fede, 2026-10-14; before, also "Resume", "New game" and "Sign out"). "Main menu" and "Load
game" go back to the menu of the page (the menu before the game), at the main screen or at the list
of characters. "Settings" (since 2026-10-14, Fede's request) shows the settings of the game in
the same panel: until then they were in a panel at the top right, which now shows the character (the
"Character" button).

## Terminology

- **The game menu**: the panel over the game that Escape opens.
- **The menu of the page**: the menu before the game (`runMenu()`): sign-in, main screen, the list of
  characters ("Continue") and the character builder ("New game").
- **The settings screen**: the second screen of the game menu, which "Settings" shows.
- **The character panel**: the panel of the "Character" button at the top right (`ui/character-panel.ts`):
  the character, its level, its scores and what they give.
- **A world that the page runs**: a world without a server (`?offline`). A **shared world**: a world
  that the server runs (the Wilds on game.azyr.io).

## Requirements

### REQ-GMN-001: Escape opens and closes the game menu

**User Story:** As a player, I want Escape to open a menu over the game, so that I can stop for a
moment or change my game.

**Acceptance Criteria:**
- **AC-GMN-001.1:** Escape opens the game menu when no other panel is open (the journal, the map, the
  pack, the character, the worlds), no conversation and no dream is open, no stack of the pack is
  dragged, and the focus is not in a text field. Else Escape does what it did before (it closes that
  panel or conversation), and the game menu stays shut.
- **AC-GMN-001.2:** The game menu shows the name of the game ("World of Kandrax") over its buttons, in
  this order (Fede, 2026-10-14): "Main menu", "Load game", "Settings" and "Prologue" (Spanish: "Menú
  principal", "Cargar partida", "Ajustes", "Prólogo"; the prologue: `docs/features/game/prologue.md`).
  For an admin, "Sandbox" (Spanish "Zona de pruebas") comes after "Load game" (`sandbox.md`, REQ-SBX-001).
  When it opens, no button has the focus (the panel has it), so Enter or Space does not leave the game
  by mistake; an arrow key or Tab goes to the first button.
- **AC-GMN-001.3:** Escape or a click on the dark round the panel closes it; the focus goes
  back to where it was. On the settings screen, Escape goes back to the choices (REQ-GMN-005).
- **AC-GMN-001.4:** The arrow keys and Tab move between the buttons (Tab stays in the menu); Enter and
  Space press the button with the focus. No other key reaches the game while the menu is open.
- **AC-GMN-001.5:** On a touch screen (from the first touch, or at once on a device whose pointer is
  coarse, as the touch stick), a faint icon of three lines, with no frame, shows under the character
  button (32 x 32 px, 40% opacity). A tap on it opens the game menu. It hides while a panel, a
  conversation, a dream or the game menu is open.

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

### REQ-GMN-004: The sounds of the game menu

**User Story:** As a player, I want the game menu to sound as the rest of the GUI, and the music to
step back under it, so that I know that the game waits.

**Acceptance Criteria (Fede, 2026-10-13):**
- **AC-GMN-004.1:** The game menu opens and closes with a rustle.
- **AC-GMN-004.2:** While it is open, the music of the game (and a stinger) steps back to 40 % (about
  8 dB under it); when it closes, the music comes back. The effects and the ambience do not change.
- **AC-GMN-004.3:** A press of a button clicks: with a pointer (as every button of the GUI), or with
  Enter or Space. The arrow keys and Tab tick when they move to another button.

---

### REQ-GMN-003: Main menu and Load game

**User Story:** As a player, I want to go back to the main screen or load another character from the
game, so that I can change my game.

**Acceptance Criteria:**
- **AC-GMN-003.1:** "Load game" saves the place of the character and reloads the page; the menu of the
  page then shows the list of characters ("Choose a character") at once. With no character, it shows
  the main screen.
- **AC-GMN-003.2:** "Main menu" (since 2026-10-14; before, in the panel of the settings) saves the
  place and reloads the page; the menu of the page then shows its main screen. "Sign out" is there
  (`main-menu.md`, REQ-MNU-006).
- **AC-GMN-003.3:** After either choice the buttons of the game menu are disabled until the page
  reloads.
- **AC-GMN-003.4:** A visitor without a character (a guest on a page of the developer's machine) has
  no "Load game": only "Main menu", "Settings" and "Prologue".

---

### REQ-GMN-005: The settings in the game menu

**User Story:** As a player, I want the settings in the game menu and my character under its own
button, so that each one is easy to find (Fede, 2026-10-14).

**Acceptance Criteria:**
- **AC-GMN-005.1:** "Settings" shows the settings screen in the panel of the game menu, in the place of
  the choices: the title "Settings", then "Controls" (to read), "Language", "Sound", "Tips", and for an
  admin "Display" (the CRT settings), "Experience" (the divisor of the XP of a kill; only with a
  character) and "Admin tools" (the debug controls: `admin-tools.md`, REQ-ADM), as the settings of the
  menu of the page (`main-menu.md`, REQ-MNU-003), and "Back".
- **AC-GMN-005.2:** "Back" or Escape shows the choices again, with the focus on "Settings". The next
  time the game menu opens, it shows the choices.
- **AC-GMN-005.3:** The title of the settings screen has the focus when it opens. Tab moves between
  the controls and stays in the game menu; the arrow keys go to the control with the focus (a slider);
  no key reaches the game. The panel scrolls when the screen is taller than the window.
- **AC-GMN-005.4:** A change applies as before: the sound and the display at once, the tips at once, a
  new language reloads the page (the same character starts again), a new divisor goes to the server.
- **AC-GMN-005.5:** The button at the top right that opened the settings is now the "Character" button
  (Spanish "Personaje"), with an icon of a head and shoulders. It opens the character panel: the
  heading "Character", the presence of other visitors (an admin only), the picture, the name, race and
  class, the level and the XP, the scores and what they give. The pack, the journal and the map keep
  their buttons.

---

## Feature Behavior & Rules

- **The panel** (`packages/engine-client/src/ui/game-menu.ts`): `GameMenu` (`open()`, `close()`,
  `shown`, `settingsShown`, `showSettings()`, `key()`, `showButton()`: the icon `#game-menu-button`,
  which `game.ts` shows with `TouchJoystick.onTouchMode()`; it goes into the page right after `#game`,
  under every panel), `GameMenuActions` (`mainMenu`, `load`, `prologue`: a choice without its action
  is not there), `gameMenuChoices()` (the choices in their order),
  `SettingsSection` (a heading and its controls), `escapeAction()` (`'open'`, `'close'`, `'back'` or
  `'none'`, from what is open). The choices are `button[data-choice=<choice>]` in
  `.game-menu-choices`; the settings screen is `.game-menu-settings`. The texts: `STRINGS.gameMenu`
  (`label`, `mainMenu`, `load`, `settings`, `prologue`, `back`).
- **The settings screen**: `game.ts` gives the sections: `controlList()` (`ui/control-list.ts`, also
  in the menu of the page), `languageChoice()`, `soundSection(false)`, `tipsControls(tipStore)`, for an
  admin `CrtControls` (`ui/crt-settings.ts`; `applyCrt()` sets the filters at the start and on each
  change) and `xpSection()`. The headings are `.menu-subtitle`, as in the menu of the page.
- **The character panel** (`ui/character-panel.ts`): `CharacterPanel` (`#character-button`,
  `#character`; one of the top-right panels, `ui/panels.ts`), with the content of `YouSection`
  (`ui/you-section.ts`, `.you-section`). The texts: `STRINGS.you` (`heading`: "Character").
  The look: `#game-menu` and `.game-menu-panel` in `style.css` (the classes of the menu of the page:
  `.menu-panel`, `.menu-name`, `.menu-stack`, `.menu-button`); `body.game-menu-open` hides the touch
  controls.
- **The page** (`game.ts`): a `keydown` listener in the capture phase of `window` decides what Escape
  does before the panels hear it (`otherUiOpen()`: `#journal`, `#worlds`, `#map`, `#pack`, `#character`,
  the conversation, the dream, a drag of the pack); while the menu is open it stops every key from
  going on. The tick of the loop gives `NO_INPUT` while the menu is open, and `sim.advance(0)` in a
  world that the page runs.
- **Back to the menu** (`menu/resume.ts`): `markMenuScreen('load' | 'new')` notes the screen in
  sessionStorage (`game.menu-screen.v1`), good for one start within 5 minutes; `takeMenuScreen()` in
  `runMenu()` (`menu/menu.ts`) shows that screen after the sign-in check. The place is saved with
  `savePlace(true)` (`keepalive`) before the reload, as for "Main menu".
- **The sounds**: `GameMenu` asks the page for them (`GameMenuSound`: `open`, `close`, `press` for a key
  press, `move`); `game.ts` plays `uiOpen`, `uiClick` and `uiSelect` and calls `audio.hushMusic()`
  (`HUSHED` in `audio/audio.ts`).
- **Tests**: `packages/engine-client/src/ui/game-menu.test.ts` (`escapeAction()`, `gameMenuChoices()`),
  `packages/engine-client/src/menu/resume.test.ts` (the screen note),
  `packages/engine-client/src/audio/audio.test.ts` (the music steps back).
