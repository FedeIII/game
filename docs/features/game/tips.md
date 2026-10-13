# The Tips

## Overview

The tips (Fede's request, 2026-10-13; phase 5 of `docs/drafts/tutorial.md`) teach a new player the
basics of the game while it plays: the controls, combat, conversations, quests, and the hut as the
place where the character rests and wakes. A tip is a short hint at the top of the screen, the first
time of each thing. Each tip shows once in a browser; the settings turn them off, or show them all
again.

## Terminology

- **A tip**: one hint, for one thing (`TipId`): its text for a keyboard and its text for a touch screen.
- **Seen**: a tip that showed to its end, or whose thing the player did. A seen tip never shows again
  in that browser.
- **Paused**: a moment with no tip: the prologue, a dream, the game menu, a panel over the screen (the
  journal, the map, the pack, the settings, the worlds, a shop), or the notice of a new build.

## Requirements

### REQ-TIP-001: A tip for the first time of each thing

**User Story:** As a new player, I want a short hint when I first meet a thing, so that I learn the
game without a manual.

**Acceptance Criteria:**
- **AC-TIP-001.1:** The game asks for these tips at these moments:

  | Tip | When it comes | When it is done |
  |---|---|---|
  | `walk` | the start in the world | 3 tiles walked |
  | `act` | the first thing in reach | an action |
  | `rest` | a bed of the character in reach | a rest |
  | `journal` | the first quest that starts | the journal opens |
  | `talk` | the first conversation | the conversation ends |
  | `deal` | an answer with a price, or one that opens a shop | (its time) |
  | `map` | 120 tiles walked | the map opens |
  | `sneak` | a mob within 10 tiles that does not hunt the player | the player sneaks on purpose |
  | `attack` | the first mob that hunts the player | an attack |
  | `dodge` | the wind-up of a mob that hunts the player | a dodge |
  | `hit` | the first hit taken | (its time) |
  | `drink` | 40% of the health or less, with a healing draught in the pack | (its time) |
  | `pickup` | a pile on the ground within 5 tiles | a pick-up |
  | `defeat` | the character wakes after a fall | (its time) |
  | `xp` | the first XP of the character (a kill, a quest; `docs/features/game/levels.md`): the gold bar of the level | (its time) |

- **AC-TIP-001.2:** One tip shows at a time, for 9 s, or until its thing is done. The next one comes
  0.9 s later. A tip whose thing the player did before its moment never shows.
- **AC-TIP-001.3:** While the game is paused, no tip shows; a tip that shows waits, and its time stops.
- **AC-TIP-001.4:** A tip shows once in a browser (localStorage `game.tips.v1`). Without storage (a
  private window), the tips show once for each page.

---

### REQ-TIP-002: The text and the look

**User Story:** As a player, I want a tip to name what I press, on my keyboard or on my touch screen,
so that I can do it at once.

**Acceptance Criteria:**
- **AC-TIP-002.1:** On a keyboard, the text names the keys, as small plates ("[E] acts on what is in
  front of you…"). On a touch screen (from the first touch, or at once on a device with a coarse
  pointer), it names the buttons ("The action button, bottom right, acts…"). The texts are in English
  and in Spanish.
- **AC-TIP-002.2:** The tip is a small panel in the GUI style at the top in the middle ("Tip", then the
  text); on a narrow screen it is under the buttons of the top-right corner. It fades in and out. It
  never takes a touch or the focus, so the keys keep moving the player. A screen reader hears it.
- **AC-TIP-002.3:** The start hint of before ("WASD or arrow keys to move · E to act") is the tip
  `walk` now: it shows in a browser until the player walked once.

---

### REQ-TIP-003: The switch

**User Story:** As a player, I want to turn the tips off, or to see them all again, so that they help
me only when I want them.

**Acceptance Criteria:**
- **AC-TIP-003.1:** "Settings" in the main menu, and the settings panel of the game under "Language",
  have "Tips": "Show tips" (on or off) and "Show all tips again" (Spanish: "Consejos", "Mostrar
  consejos", "Mostrar otra vez todos los consejos").
- **AC-TIP-003.2:** Off: no tip shows, and the waiting tips go. "Show all tips again": every tip counts
  as not seen, the tips are on, and a line says so. In the game, both apply at once.

---

## Feature Behavior & Rules

- **The code**: `packages/engine-client/src/ui/tips.ts`: `TIP_IDS`, `TIP_TIMING`, `TipStore` (the
  browser's store), `TipQueue` (one at a time, `request`, `done`, `update`), `tipText()`,
  `tipParts()`, `TipView` (`#tip`), `tipsControls()` (the switch). The texts: `STRINGS.tips`.
- **The hooks** (`game.ts`): `updateTips()` in the frame loop (after the target), the start of a quest
  (`questsChanged`), and the actions (`act`, `pickup`, `rest`).
- **The look**: `#tip`, `.tip-label`, `.tip-key`, `.tips-controls` in `style.css`.
- **Tests**: `packages/engine-client/src/ui/tips.test.ts`.
