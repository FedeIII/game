# Language

## Overview

The game speaks English and Spanish (Fede's decision, 2026-10-11). A visitor whose browser is in
Spanish gets Spanish; anybody can change the language in the settings of the menu or of the game menu. In Spanish
the names are the names of Kandrax, Fede's D&D world: the town is Ferrozar (Ironhold in English),
the world is las Tierras Salvajes, the reeve is Elama Rothenel, la alguacil. The terms of D&D are
the terms of the Spanish books of 5e (Fuerza, FUE; Clase de Armadura, CA; Pícaro).

## Terminology

- **Language of the page**: the language of every text that the page shows, chosen when the page
  loads.
- **Engine texts**: the texts of the engine (menu, panels, the lines of the player): one table for
  each language.
- **World texts**: what the content of a world says (pages, dialogs, lines, signs, names). The
  content is in English; the world gives a table of translations.

## Requirements

### REQ-LANG-001: The language of the page

**User Story:** As a Spanish player, I want the game in Spanish, so that I read it in my own
language.

**Acceptance Criteria:**
- **AC-LANG-001.1:** The page chooses its language when it loads: `?lang=en` or `?lang=es` first
  (not kept), then the choice that the browser keeps, then the language of the browser (Spanish
  when it starts with `es`), else English.
- **AC-LANG-001.2:** The page sets `<html lang>` to the language, and the title of the page has
  the name of the world in it ("Las Tierras Salvajes · game.azyr.io").

---

### REQ-LANG-002: The choice of the language

**User Story:** As a player, I want to choose the language, so that I can play in the one that I
like.

**Acceptance Criteria:**
- **AC-LANG-002.1:** The sign-in screen and the main screen of the menu show "English · Español"
  under the other lines. The language of the page is in bold; the other one is a link.
- **AC-LANG-002.2:** The settings of the game menu (Escape, "Settings") have a section "Language"
  ("Idioma") with the same choice, for every visitor.
- **AC-LANG-002.3:** A choice is kept in the browser, and the page loads again in that language.
  In the game, the same character starts again at once, where it was.

---

### REQ-LANG-003: The engine in Spanish

**User Story:** As a Spanish player, I want every button, panel and line in Spanish, so that
nothing is half in English.

**Acceptance Criteria:**
- **AC-LANG-003.1:** Every text of the engine has a Spanish form: the hints, the action labels, the
  lines of the player, the pack and the worn slots, the traits, the conversation panel, the menu
  and the builder, the settings, the vitals, the map, the errors.
- **AC-LANG-003.2:** The races, classes, genders and abilities have the names of the Spanish books
  of 5e: Humano, Enano, Elfo, Gnomo, Semielfo, Mediano, Semiorco; Bárbaro, Bardo, Clérigo, Druida,
  Guerrero, Monje, Paladín, Explorador, Pícaro, Hechicero, Brujo, Mago; Fuerza (FUE), Destreza
  (DES), Constitución (CON), Inteligencia (INT), Sabiduría (SAB), Carisma (CAR). The tags of the
  gates use the Spanish short names ("[SAB 13]").
- **AC-LANG-003.3:** A line about the player has no word that must agree with its gender ("Me
  despierto con dolor, pero con vida."): a character can be a man, a woman or neither.
- **AC-LANG-003.4:** The dates of the menu are in the language of the page ("Jugado ayer").

---

### REQ-LANG-004: The world in Spanish

**User Story:** As a Spanish player, I want the people and the things of the world to speak
Spanish, with the names of Kandrax, so that the game is the world of Fede.

**Acceptance Criteria:**
- **AC-LANG-004.1:** In Spanish, every text of the Wilds is in Spanish: the examine lines, the lines
  about items, the pages and the lore of the things, the books, the signs, the lines, greetings and
  conversations of the people, the names on the map, the name of the world.
- **AC-LANG-004.2:** The names: Ironhold is Ferrozar; the Wilds are las Tierras Salvajes; the
  Crooked Lantern is el Farol Torcido; the reeve is Elama Rothenel, la alguacil; the watchman,
  the innkeeper, the apothecary, the peddler and the smith are el guardia, la posadera, la
  boticaria, el buhonero and el herrero. The personal names (Brann, Marta, Isolde, Corwin) stay.
- **AC-LANG-004.3:** A greeting keeps the name of the character ("¡{name}! ¡Mi mejor cliente!").
- **AC-LANG-004.4:** The Spanish conversations fit the panel: a line has at most 200 characters, an
  answer at most 70, a name at most 32.
- **AC-LANG-004.5:** The pixel font draws every letter of the Spanish texts: á é í ó ú ü ñ ¿ ¡. A
  capital loses its accent (the sign "Velería" shows VELERIA); « » show as straight quotes.
- **AC-LANG-004.6:** A text of the world without a translation shows in English.

---

### REQ-LANG-005: The English names

**User Story:** As Fede, I want the English names to translate the Spanish names of Kandrax, so
that both languages tell of the same world.

**Acceptance Criteria:**
- **AC-LANG-005.1:** The town of the Wilds is Ironhold (Thornwick until 2026-10-11): its sign on
  the signpost ("It reads: WHITEGROVE, BRONZEHOLD, IRONHOLD."), the map, and every line that names it.
- **AC-LANG-005.2:** The reeve is Elama Rothenel, the reeve (Aldous until 2026-10-11).

---

### REQ-LANG-006: The privacy page in Spanish

**User Story:** As a Spanish player, I want to read what the game keeps in Spanish, so that I
understand it.

**Acceptance Criteria:**
- **AC-LANG-006.1:** `/privacy/es/` has the privacy notice in Spanish, and each page links the
  other ("En español", "In English").
- **AC-LANG-006.2:** The link "Privacidad" of the menu opens the Spanish page in Spanish.

---

## Feature Behavior & Rules

- **The choice** (`packages/engine-client/src/i18n.ts`): `LANGS`, `Lang`, `LANG_NAMES`, `pickLang()`
  and `LANG` (chosen when the module loads; it reads `location`, `localStorage` and `navigator`
  through a typed view, so tests in Node get English), `saveLang()` (localStorage `game.lang.v1`).
  `ui/language-choice.ts`: `languageChoice()` (`.lang-choice`, `.lang-current`,
  `.lang-choice-other[data-lang]`); the menu reloads, the game marks the character to resume
  (`menu/resume.ts`), saves the place, and reloads.
- **Engine texts** (`packages/engine-client/src/ui/strings.ts`): the English table `EN`, the type
  `Strings`, `STRINGS_EN` (tests), and `STRINGS`: the table of `LANG`. The Spanish table is
  `ui/strings-es.ts` (`ES: Strings`: the type checks that no key is missing). A thing of `names` in
  Spanish has its article, because `examine` adds none. New keys: `and`, `fatal`, `settings`.
- **World texts:** `WorldDefinition.texts` (engine `world.ts`): for each language, a table from the
  English text to its translation. `setWorldTexts()` and `tw()` (`i18n.ts`): `game.ts` sets the
  table of `LANG`, and `tw()` translates where world texts reach the screen: `SpeechBubble.show()`,
  `Welcome.start()`, `BarkBubbles.say()` (and the greeting template, before the name goes in), the
  conversation panel (name, line, answers, "You:"), the intro title, the signs of buildings, the
  labels of the map, the line of an item in the pack panel, the link card, the title of the page
  and of the menu.
- **The Wilds** (`worlds/wilds/src/text-es.ts`, `TEXTS_ES`; `wilds.texts.es`): 332 texts.
  `worlds/wilds/test/world-texts.ts` (`worldTexts()`) gathers every text of the content through the
  source; `worlds/wilds/test/texts.test.ts` checks that each one has a Spanish form and that no
  Spanish entry is left over, the `{name}` marks, the limits of the conversation panel, and the
  names. `apps/game/test/texts.test.ts` checks that the pixel font draws every letter of the
  Spanish texts (the world's, and the lines of the player).
- **When you add or change a text of a world**, add its Spanish form to the world's table: the
  test fails without it. When you add a key to `STRINGS`, add it to `ES`: the type check fails
  without it.
- **The privacy page:** `apps/game/privacy/index.html` and `apps/game/privacy/es/index.html`
  (`privacyEs` in `apps/game/vite.config.ts`).
