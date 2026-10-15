# The GUI

This file is part of the documents of the code (see the map in `CLAUDE.md`). Read it before you
change its part of the code, and change it in the same commit as the code.

The GUI is approved in this style; new GUI must match it.

**Two kinds of text, two renderers:**
- **Text in the world** (speech, signs, labels over things) is drawn by the game: the pixel font
  from the atlas, in world pixels, in the text layer (its own CRT settings, above the
  darkness). Use `PixelFont` and frames from the atlas, never HTML. Repeat it in a hidden live
  region (`.sr-only`) for screen readers.
- **The GUI** (panels, buttons, sliders, the hint, the link card) is HTML over the canvas,
  outside `#game`, so a touch on it never moves the player.

For the HTML GUI:
- Colours and fonts come only from the theme variables at the top of `src/style.css`: dark
  translucent panel, thin dried-blood-red border, 2 px corners, parchment text, wine-red accent
  with a soft glow for "active", Georgia serif for words, monospace for numbers.
- Bottom left: the joystick at rest. Bottom right (Fede's layout of 2026-10-13, on every screen):
  in a world with mobs the attack button in the corner, the action button on top of it, and the
  dodge button left of the attack button; in a world without mobs the action button in the corner.
  Bottom centre, above them: the link card (on a screen narrower than 528 px, above the action
  button). Top left: the vitals, and the drink belt in their box. Top right: the worlds button, the journal, map and pack buttons, and the character button. Bottom centre, over
  everything there: the conversation panel; while it is open, the joystick, the action and
  attack buttons and the link card hide (`body.conversing`).
- Every engine text the player reads goes in `src/ui/strings.ts` (English) and `src/ui/strings-es.ts`
  (Spanish: the type `Strings` checks that no key is missing); what things say is content and
  belongs to the world, in English, with a Spanish table (`WorldDefinition.texts.es`; for the
  Wilds `worlds/wilds/src/text-es.ts`: a test fails when a text has no Spanish form). See
  "Language".
- A control gives the focus back after use, or WASD stops working (see `SettingsPanel`).
- A link must be a real `<a>` (the link card): a browser opens a new tab from a key press or a
  click, but not from the start of a touch. So E opens the link, and a tap on the action button
  only points at the card's link (`pulse()`); a tap on the link opens it.

## Language

English and Spanish (Fede's decision, 2026-10-11; `docs/features/game/language.md`). The page
chooses once, when it loads (`src/i18n.ts`, `LANG`): `?lang=en|es` (not kept), the kept choice
(localStorage `game.lang.v1`), the browser's language (Spanish when it starts with `es`). The menu
and the settings of the game menu show "English · Español" (`ui/language-choice.ts`); a choice reloads the
page (the game resumes the same character). `STRINGS` is the table of `LANG`. A world's content is
in English, and `tw()` translates it where it reaches the screen (bubbles, barks, welcome, the
conversation panel, signs, map labels, item lines, the intro, the link card, the title). In Spanish
the names are those of Kandrax (Ironhold: Ferrozar; the Wilds: las Tierras Salvajes; the reeve:
Elama Rothenel, la alguacil), and the D&D terms those of the Spanish 5e books (FUE, DES, CON, INT,
SAB, CAR; CA). **A Spanish line about the player has no word that must agree with its gender.**
New Spanish text must fit the conversation panel and use only letters that the pixel font draws
(tests: `worlds/wilds/test/texts.test.ts`, `apps/game/test/texts.test.ts`). The privacy page has a
Spanish copy at `/privacy/es/`.
