# The Main Menu

## Overview

The main menu is the menu of the page before the game (`runMenu()`, `packages/engine-client/src/menu/`):
the sign-in, the main screen ("New game", "Continue"), the list of characters and the character builder.
This document gives what Fede asked for on 2026-10-12: a pixel-art picture behind the menu, "Prologue"
on the main screen once the browser saw the prologue, and a settings screen. The sign-in, the
characters and the accounts are in `CLAUDE.md` ("Menu, characters and accounts").

## Terminology

- **The main screen**: the screen of the menu after the sign-in, with "New game" and "Continue".
- **The backdrop**: the picture behind the menu.
- **An admin**: an account whose email is in the server's `ADMIN_EMAILS` (`/api/me` says `admin`).

## Requirements

### REQ-MNU-001: The picture behind the menu

**User Story:** As a visitor, I want the menu to show a place of Kandrax, so that the game has its mood
from the first screen.

**Acceptance Criteria:**
- **AC-MNU-001.1:** Behind the menu is Nivalia at sunset, a village of the Iron Sovereignty, after Fede's
  picture on the Drive (`Images/regions/central_dominions/nivalia.png`), painted in the pixel art of the
  game (384 x 216 pixels).
- **AC-MNU-001.2:** The picture covers the page at a whole scale, so its pixels stay sharp. A narrow
  screen (a phone held upright) shows its middle: the village and the path.
- **AC-MNU-001.3:** The picture is darker at its edges and a little darker overall, so that the panel
  of the menu reads well over it. It fades in when it is loaded; until then, the menu has its dark
  background.

---

### REQ-MNU-002: The prologue from the main screen

**User Story:** As a player who saw the prologue, I want to see it again from the menu, so that I can
read the story again before I play.

**Acceptance Criteria:**
- **AC-MNU-002.1:** The main screen has "Prologue" (Spanish: "Prólogo") under "Continue" only when this
  browser played the prologue once, to its end or until "Skip" (localStorage `game.prologue.v1`). The
  first prologue plays after "Create" in the character builder, as before.
- **AC-MNU-002.2:** "Prologue" plays the prologue over the menu. Its last card names the character
  played last (the first of the list), or a random name when the account has no character. When the
  prologue ends, the main screen shows again, with the focus on "Prologue".
- **AC-MNU-002.3:** The game menu (Escape in the game) keeps its "Prologue", for every player.

---

### REQ-MNU-003: The settings screen

**User Story:** As a player, I want to read the controls and to choose the language before I play, so
that I know how to play from the first step.

**Acceptance Criteria:**
- **AC-MNU-003.1:** The main screen has "Settings" (Spanish: "Ajustes") as its last button. It opens a
  settings screen; "Back" or Escape goes back to the main screen.
- **AC-MNU-003.2:** "Controls" lists what each control does, its keys (as small plates; the choices
  joined by "or") and what a touch screen has instead: walk, the sneak walk, the action (talk, open,
  read, pick up), attack (a click attacks towards the pointer), dodge, the drinks 1 to 4, the pack, the
  map, the journal, the answers of a conversation and its end, and the game menu. They are to read
  only: no key changes.
- **AC-MNU-003.3:** "Language" gives "English · Español" (`ui/language-choice.ts`); a choice reloads the
  page in that language.
- **AC-MNU-003.4:** Only for an admin, "Display" gives the CRT settings of the game's settings panel
  (`CrtControls`: the on/off switch, the sliders, the `?crt=` link, "Copy link", "Reset"). They are
  saved in this browser (`game.crt.v2`), and the game takes them when it starts.
- **AC-MNU-003.5:** "Tips" (between "Language" and "Display") gives "Show tips" and "Show all tips
  again" (`tipsControls()`; see [`tips.md`](tips.md), REQ-TIP-003).

---

## Feature Behavior & Rules

- **The picture**: `art/menu-art.ts` (`menuBackground()`, painted by code; the picture's pixels are not
  copied); `art/build.ts` writes `src/generated/menu.png`; `backdrop()` in `menu/menu.ts` loads it and
  sets its whole scale; `.menu-backdrop` in `style.css`.
- **The prologue**: `MenuOptions.prologue` (`game.ts` gives it when the world has a prologue);
  `prologueSeen()` in `ui/prologue.ts`, which marks it when a prologue ends.
- **The settings**: `settingsScreen` and `controlList()` in `menu/menu.ts`; the texts in
  `STRINGS.menu` (`settings`, `controls`, `touch`, `or`, `display`, `controlList`); `CrtControls` in
  `ui/settings-panel.ts`, which the game's settings panel uses too.
