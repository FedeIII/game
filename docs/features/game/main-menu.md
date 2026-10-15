# The Main Menu

## Overview

The main menu is the menu of the page before the game (`runMenu()`, `packages/engine-client/src/menu/`):
the sign-in, the main screen ("New game", "Continue"), the list of characters and the character builder.
This document gives what Fede asked for on 2026-10-12: a pixel-art picture behind the menu, "Prologue"
on the main screen once the browser saw the prologue, and a settings screen; and on 2026-10-13: music
and sounds in the menu, and the logo of the game at the top of the menu, with the buttons of the main
screen at the bottom. The sign-in, the characters and the accounts are in `CLAUDE.md` ("Menu,
characters and accounts").

## Terminology

- **The main screen**: the screen of the menu after the sign-in, with "New game" and "Continue".
- **The backdrop**: the picture behind the menu.
- **The logo**: the title of the game, World of Kandrax, as a picture in pixel art.
- **An open screen**: a screen of the menu without a panel: the logo at the top, the screen at the
  bottom over the picture.
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
- **AC-MNU-001.3:** The picture is darker at its edges, a little darker overall, and darker at the
  bottom, so that the panel and the buttons of the menu read well over it. It fades in when it is
  loaded; until then, the menu has its dark background.

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
- **AC-MNU-003.4:** Only for an admin, "Display" gives the CRT settings, as the settings of the game
  menu (`CrtControls`: the on/off switch, the sliders, the `?crt=` link, "Copy link", "Reset"). They are
  saved in this browser (`game.crt.v2`), and the game takes them when it starts.
- **AC-MNU-003.5:** "Tips" (between "Sound" and "Display") gives "Show tips" and "Show all tips
  again" (`tipsControls()`; see [`tips.md`](tips.md), REQ-TIP-003).
- **AC-MNU-003.6:** "Sound" (between "Language" and "Tips"; Spanish: "Sonido") gives the controls of
  the "Sound" section of the settings of the game menu: "Music", "Effects", "Mute all" and the credits of
  the recordings (`soundSection()`; see [`sound.md`](sound.md), REQ-SND-002).

---

### REQ-MNU-004: Music and sounds in the menu

**User Story:** As a visitor, I want music and sounds in the menu, so that the world of Kandrax starts
before I play.

**Acceptance Criteria:**
- **AC-MNU-004.1:** On every screen of the menu (the sign-in, the main screen, the builder, the list of
  characters, the settings), the opening of the theme of Kandrax plays (the music that starts the
  prologue: the night and the horn, round and round; Fede's choice, 2026-10-13). It fades in over 3 s
  at the first click, touch or key of the page (see [`sound.md`](sound.md), REQ-SND-008).
- **AC-MNU-004.2:** A press on a button, a link, a chip or a box clicks; a choice that the arrow keys
  move ticks; a new screen of the menu (and the other step of the builder) comes with a rustle.
- **AC-MNU-004.3:** A speaker at the top right of the menu turns all the sound of the game on and off,
  as the speaker of the prologue. It scrolls with the menu.
- **AC-MNU-004.4:** After "Create", the prologue goes on with the same music, without a break. After
  "Continue", the music of the game takes its place with a crossfade. After the prologue from the main
  screen, the music of the menu comes back.

---

### REQ-MNU-005: The logo and the open screens

**User Story:** As a visitor, I want an impressive title of the game over the picture, and the buttons
out of the way at the bottom, so that the first screen looks like the title screen of a game.

**Acceptance Criteria:**
- **AC-MNU-005.1:** The top of the menu has the logo (Fede's choice, 2026-10-13: a painted logo, not
  text): "WORLD OF" small, in the pixel font of the game, between two rules with diamonds, over a big
  "KANDRAX". The letters of KANDRAX have wedge serifs; the K and the X are taller than the others; each
  A has a ruby in its bar. Their metal is pale gold above a dark horizon line and the fire of the sunset
  below it, with a bevel lit from the top left, a near-black outline, a dark red rim, a dark halo and a
  red glow round them, and glints on the K, the first A and the X. The name is the same in Spanish.
- **AC-MNU-005.2:** The logo has sharp pixels: a whole number of device pixels for each pixel of its
  art. On an open screen its letters are as wide as the screen allows (less 40 CSS pixels), and it
  takes at most 30 % of the height of the screen. Over a panel it is about half that size. Its glow
  may reach into the sides of the screen; the page never scrolls sideways.
- **AC-MNU-005.3:** The logo fades in when it is loaded. Then a shine crosses its metal from left to
  right (14 frames of 40 ms), 1.6 s after it shows and then every 7 to 10 s. With reduced motion, it
  does not fade and it does not shine.
- **AC-MNU-005.4:** The sign-in and the main screen are open screens (Fede's choice, 2026-10-13): the
  logo at the top, and at the bottom of the page, with no box round them, the buttons (or the sign-in),
  the account line, the language and the site. Their words have a dark shadow, so that they read over
  the picture. The short screens (loading, a failure) are open too.
- **AC-MNU-005.5:** The character builder, the list of characters and the settings keep their panel
  in the middle of the page, under the smaller logo, with the site under the panel.
- **AC-MNU-005.6:** The logo is the heading of the menu: the heading has the name as text for screen
  readers. If the picture of the logo does not load, the name shows as text (italic Georgia, as
  before).

---

### REQ-MNU-006: Sign out on the main screen

**User Story:** As a player, I want to sign out from the main screen, so that I find it with the other
choices (Fede, 2026-10-14: the game menu has no "Sign out" now).

**Acceptance Criteria:**
- **AC-MNU-006.1:** The last button of the main screen is "Sign out" (Spanish "Cerrar sesión", id
  `menu-sign-out`): after "New game", "Continue", "Prologue" (when it shows), "Sandbox" (an admin only:
  `sandbox.md`, REQ-SBX-001) and "Settings".
- **AC-MNU-006.2:** A press signs out (the button is disabled meanwhile), and the menu shows the
  sign-in screen.
- **AC-MNU-006.3:** The account line under the buttons has no "Sign out" now: "Signed in with Google ·
  Delete account · Privacy".

---

## Feature Behavior & Rules

- **The picture**: `art/menu-art.ts` (`menuBackground()`, painted by code; the picture's pixels are not
  copied); `art/build.ts` writes `src/generated/menu.png`; `backdrop()` in `menu/menu.ts` loads it and
  sets its whole scale; `.menu-backdrop` in `style.css`.
- **The logo**: `art/menu-logo.ts` (`menuLogo()`: the letters as vector shapes, painted by code;
  `MENU_LOGO_FRAMES` frames, one under the other: the logo at rest, then the shine); `art/build.ts`
  writes `src/generated/menu-logo.png` and `menu-logo.json` (the size of a frame, the number of frames,
  and `pad`, the room for the glow). `MenuLogo` in `menu/logo.ts` makes the heading, sets the scale
  (`logoScale()`), and plays the shine; `.menu-logo` and `.menu-name-text` in `style.css`. Tests:
  `art/menu-logo.test.ts`, `menu/logo.test.ts`.
- **The layout**: `runMenu()` gives each screen its layout (`Layout`: `open` or `panel`; `place()`
  and `show()`); `#menu.menu-open` in `style.css` (`.menu-frame` fills the page, `.menu-panel` loses
  its box and goes to the bottom). The game menu (Escape in the game) keeps its panel and its text
  title.
- **The prologue**: `MenuOptions.prologue` (`game.ts` gives it when the world has a prologue);
  `prologueSeen()` in `ui/prologue.ts`, which marks it when a prologue ends.
- **The settings**: `settingsScreen` in `menu/menu.ts` and `controlList()` in `ui/control-list.ts`;
  the texts in `STRINGS.menu` (`settings`, `controls`, `touch`, `or`, `display`, `controlList`);
  `CrtControls` in `ui/crt-settings.ts` and `soundSection(false)` in `ui/sound-section.ts` (without
  its own heading). The settings of the game menu use all of them too
  ([`game-menu.md`](game-menu.md), REQ-GMN-005).
- **The sound**: `MenuSounds` in `menu/sounds.ts` (`music()`: `KANDRAX_OPENING`; `screen()`: the rustle;
  the listeners of the clicks, the ticks and the keys on the menu's root); `runMenu()` calls `music()`
  after the sign-in check (not after a reload for a new build, which starts the game at once), and
  `show()` (not `place()`, the screens that wait) rustles; `BuilderCallbacks.turn` for the steps. The
  speaker: `soundToggle('menu-sound')` (`ui/sound-section.ts`), `.menu-sound` in `style.css`.
