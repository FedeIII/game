# The Prologue

## Overview

The prologue (Fede's request, 2026-10-12) tells a new player the world of Kandrax, as Fede's
worldbuilding tells it, over painted pixel-art scenes of the world. At its end it tells the
character who it is (a consultant for Thrain Steelforge) and gives it its mission (the letter on the
table of its hut). It plays once for a new character, before it enters the world; the game menu plays
it again. The player can skip it.

## Terminology

- **A card**: one scene of the prologue with its texts: an optional title and subtitle, an optional
  banner, and lines that show one after the other (`PrologueCard`).
- **A banner**: a name over the scene in the game's pixel font, on a dark band between two red lines, as
  the name of a world on arrival (`render/intro.ts`).
- **A scene**: a painting of Kandrax, made at build time in layers (`art/prologue.ts`).
- **An emitter**: a place on a layer where something moves (stars, smoke, embers, fireflies...).

## Requirements

### REQ-PRO-001: When the prologue plays

**User Story:** As a new player, I want to learn the world and my place in it before I play, so that
the first steps of the game make sense.

**Acceptance Criteria:**
- **AC-PRO-001.1:** When a character is made in the builder ("Create"), the prologue plays before the
  character enters the world. It does not play when a character of the list starts ("Continue", "Load
  game"), nor after a reload for a new build.
- **AC-PRO-001.2:** The game menu has "Prologue" as its last choice: it closes the menu and plays the
  prologue over the game. Meanwhile the character stands still; a world that the page runs stands still
  too, and a shared world goes on.
- **AC-PRO-001.3:** `?prologue` in the address plays it at the start for any visitor (tests).
- **AC-PRO-001.4:** If its art does not load, there is no prologue, and the game starts.

---

### REQ-PRO-002: What the prologue shows

**User Story:** As a player, I want beautiful scenes of Kandrax with the words of its worldbuilding, so
that the world feels real.

**Acceptance Criteria:**
- **AC-PRO-002.1:** Nine cards, in order: the world at night (title "World of Kandrax"); the ruins of
  the old civilizations; the map of the Dominions; the wild lands and the uncharted regions; the gods;
  the Iron Sovereignty; the Mithril Enclave; the factory of Thrain Steelforge in Thalesferro; the
  character's hut.
- **AC-PRO-002.2:** The last card has the character's name as its title and its race and class as its
  subtitle ("Human ranger"). Its lines: the character is a consultant for Thrain Steelforge; homesteads
  burn in the wildlands north of the Iron Sovereignty and Thrain has a mission for it; his letter waits
  on the table of its hut, at the northern edge of the Sovereignty, south of Ironhold (Fede,
  2026-10-12).
- **AC-PRO-002.3:** The texts tell only what a character of Kandrax knows (the secret of the gods is
  not told). They are in English and in Spanish (Fede's own Spanish); the title "World of Kandrax" is
  the same in both.
- **AC-PRO-002.4:** Each scene is a pixel-art painting of 320 x 180 pixels, scaled to fit the screen
  (whole steps when it is 2x or more), with no smoothing. Over a card, the scene pans slowly: the
  nearest layer 64 pixels, the far ones less, the sky not at all. Stars twinkle, smoke rises from
  chimneys, embers from the factory, fireflies glow in the woods, motes float in the light, birds
  cross the sky, mist drifts, and a candle burns on the map.
- **AC-PRO-002.5:** The Iron Sovereignty and the Mithril Enclave have a card each (Fede, 2026-10-12), each
  with its banner ("Iron Sovereignty", "Mithril Enclave"; Spanish "Soberanía del Hierro", "Enclave del
  Mithril"). The texts say that each one is one of the Central Dominions, a little of each (the
  Sovereignty: the south-west, on the Great Sea Ápeiron, its capital Iron Bay, a port and a republic of
  guilds, mining, metalwork and engineering; the Enclave: the north, under the mountains, its capital
  Great Bwini, ruled from a great temple, arcane and divine magic), and that the two are neighbours.
  Between them lie lands that no dominion claims: nobody rules there, and they are dangerous and
  lawless. They are not the Wilds (Fede, 2026-10-12): the Wilds (las Tierras Salvajes) are north of the
  Human Dominions and south of the Elven Dominions.
- **AC-PRO-002.6:** The factory card starts in the dominion of the Iron Sovereignty, next to Iron Bay, so
  that the player knows where Thalesferro is.
- **AC-PRO-002.7:** The map is Fede's map of the Central Dominions on the Drive (`Images/maps/
  mapa_thrain.png`) in the pixel art of the game: a parchment on a table, by a candle, with its coast,
  rivers, mountains, forests, towns and names, dotted roads between the towns, a ship drawn in ink and a
  compass rose. It is taller than the view: over its card the view goes from its north to its south. Its
  names are in the page's language.
- **AC-PRO-002.8:** A banner fades in (0.65 s, rising a few pixels), stays 1.45 s, and fades out (0.8 s).
  It comes with the line that names the place: the banner of the Iron Sovereignty with the second line
  (Fede, 2026-10-12: the scene shows first, with the line about the Central Dominions), the banner of
  the Mithril Enclave as its scene fades in, before its first line. A screen reader hears it.

---

### REQ-PRO-003: The pace, and how to skip

**User Story:** As a player, I want to read at my own pace or to skip the prologue, so that it never
holds me back.

**Acceptance Criteria:**
- **AC-PRO-003.1:** Each card fades in and out (0.7 s). A title, or a banner before the first line,
  shows for 2.6 s. Each line types itself (45 characters a second), left-aligned, from left to right,
  and stays 1.6 s and 34 ms more for each of its characters; then the next line comes by itself, under
  it. The lines of a card stay until the card ends (the earlier ones a little dimmer).
- **AC-PRO-003.2:** A click or a tap on the prologue, Space, Enter or the right arrow finishes a line
  that types, or brings the next line now. A small arrow at the end of a line shows when it is whole.
- **AC-PRO-003.7:** Only the player leaves a card (Fede, 2026-10-13): after the last line of a card is
  read, the scene stops its pan and the card waits, with the arrow, for as long as the player reads; a
  press then fades it out to the next card (after the last card, the prologue ends). The lines inside a
  card still come by themselves.
- **AC-PRO-003.3:** "Skip" (Spanish: "Saltar") at the top right, or Escape, ends the prologue at once.
- **AC-PRO-003.4:** While it plays, no key reaches the game. A screen reader hears each title and line.
- **AC-PRO-003.5:** The prologue has music, an ambience for each scene and small effects, and a button
  that mutes them (see [`sound.md`](sound.md), REQ-SND-003). The music rises (its choir and violins)
  with the card of the gods, however long the player took to reach it (AC-SND-003.6).
- **AC-PRO-003.6:** All the texts can be seen on a desktop, on a phone held upright and on a phone on
  its side. The text goes under the scene, or beside it on a wide and short screen, whichever gives the
  larger scene with the longest card in view. The box of the text has the size of the longest card
  from the start, and a word never moves while it types. Only when nothing fits (a very small screen)
  does the box scroll, with the line that types in view.

---

## Feature Behavior & Rules

- **The cards** (`packages/engine/src/world.ts`): `WorldDefinition.prologue`, `PrologueCard` (`scene`,
  `title`, `subtitle`, `banner`, `bannerLine` (the line with which the banner shows; 0 or none: before
  the first line), `crescendo` (the music rises with this card: the gods), `lines`; `{name}` and
  `{kind}` in the texts). The Wilds: `PROLOGUE`
  (`worlds/wilds/src/prologue.ts`; sources: `Kandrax AI Context`, `Kandrax - Mundo`, `Kandrax - Dioses`,
  `0.0 - Guía del aventurero novato`, `Los Investigadores de Forjacero`, `Lugares/Dominios Centrales`);
  the Spanish in `text-es.ts`.
- **The art** (`packages/engine-client/art/`): `paint.ts` (`Canvas`: dithered gradients, glows,
  shapes, ridges, pines; value noise), `prologue-kit.ts` (`PROLOGUE_VIEW` 320 x 180, `PrologueScene`,
  `PrologueLayer` with its `depth`, its `rise` (how far a tall layer rises over the card) and its `lang`
  (a layer of labels for one language), `PrologueEmitter`, and the shared pieces: stars, moon,
  mountains, clouds), `prologue.ts` (`prologueScenes()` and most scenes), `prologue-map.ts` (the map),
  `prologue-dominions.ts` (the Iron Sovereignty and the Mithril Enclave). `art/build.ts` packs the
  layers into `src/generated/prologue.png` (one page, 2048 wide) and `prologue.json` (the place, depth,
  rise and language of each layer, and the emitters), and the glyphs of the pixel font (`font`: the
  banners); the game's atlas does not carry them.
- **The look of the Central Dominions and of the factory** (Fede, 2026-10-12). The age is medieval.
  The Iron Sovereignty is European: a castle, a church with a spire, houses of stone and timber with
  steep roofs, cogs in the bay. The Mithril Enclave is of the Arabic middle ages, with a magical tone:
  white stone and cedar, onion domes, minarets, horseshoe arches, blue arcane light. There are no
  towers of a modern city. Only the factory of Thrain has a pinch of steampunk (its stacks, pipes and
  cog). The factory follows Fede's pictures on the Drive (`Images/regions/central_dominions/
  fabrica_forjacero`): towers of brick and copper plates with steep roofs, round towers with a gallery
  and a cone, stacks with iron rings, a long hall with dormers, bridges on arches, a yard of cobbles.
- **The look of the hut** (Fede, 2026-10-12: realistic, not naive): a log hut in a three-quarter view,
  with a thick thatch with moss, a fieldstone chimney, a lit window with shutters, a door ajar with a
  lantern, a woodpile, a fence and the signpost, in a clearing of a spruce forest under a full moon.
- **The player** (`packages/engine-client/src/ui/prologue.ts`): `playPrologue()` (a promise),
  `prologuePlaying()`, `PROLOGUE_TIMING`, `PROLOGUE_BANNER`, `lineMs()`, `cardMs()`, `cardTexts()`,
  `layerOffset()`, `layerShows()`, `prologueLayout()` (under or beside the scene; a hidden box measures
  the cards at each width); the emitters run in a 2D canvas at 320 x 180 (`Emitter`). The banner draws
  in the same canvas, at twice the size of the font. The look: `#prologue` and `.prologue-*` in
  `style.css` (the part of a line still to type is `.prologue-rest`, hidden in its place). The texts:
  `STRINGS.prologue` (`label`, `skip`, `soundOn`, `soundOff`). The ambience of each scene: `AMBIENCE_OF`
  in `art/prologue.ts`, carried in `prologue.json`.
- **The start** (`game.ts`): `MenuChoice.fresh` (`menu/menu.ts`: true after "Create"); the game awaits
  the prologue before it makes its world; the game menu's third argument plays it again
  (`GameMenu`, `STRINGS.gameMenu.prologue`); the tick gives `NO_INPUT` while it plays.
- **Tests**: `packages/engine-client/src/ui/prologue.test.ts` (timing, texts, banner, rise, labels,
  layout), `apps/game/src/worlds.test.ts`
  (each card names a painted scene), `worlds/wilds/test/texts.test.ts` (the Spanish).
