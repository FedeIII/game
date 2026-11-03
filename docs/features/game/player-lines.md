# The Lines of the Player

## Overview

After some actions, the player says a short line in a speech bubble over its head: what it found in
a chest, a lock that it picks or cannot pick, boards that break or hold, a rest, a full pack. A line
stays much longer than the line of an NPC (Fede's request, 2026-11-03), so that there is time to
read it. The action button closes it before its time.

## Terminology

- **A line of the player**: a line that the player says after an action or an event (`say()` in
  `packages/engine-client/src/game.ts`), in the dialog bubble over its head.
- **A page alone**: a dialog of one page in the same bubble: a thing that the player examines, a
  sign of one page, or the line of a thing that speaks.
- **The action button**: the button at the bottom right, and the E key.
- **The source of a line**: the target in front of the player when it said the line (the chest,
  the door), or nothing.

## Requirements

### REQ-LN-001: A line stays long

**User Story:** As a player, I want the line of my character to stay on the screen for a long time,
so that I can read what I found or what a check did.

**Acceptance Criteria:**
- **AC-LN-001.1:** A line of the player and a page alone stay 8 s, and 0.1 s more for each sign of
  the line (letters, spaces and marks), at most 20 s. "I find a bundle of herbs." (25 signs) stays
  10.5 s.
- **AC-LN-001.2:** Then the line fades out in 0.3 s.
- **AC-LN-001.3:** A new line or a new dialog takes the place of the line on the screen at once.
- **AC-LN-001.4:** The lines that NPCs say by themselves (their barks, the welcome, a scene) keep
  their own, shorter times.

---

### REQ-LN-002: The action button closes the line

**User Story:** As a player, I want to close the line with the action button, so that it does not
stay over my character when I have read it.

**Acceptance Criteria:**
- **AC-LN-002.1:** While a line of the player shows, and its source is in front of the player, or
  nothing is, the label of the action button is "Close" ("Cerrar" in Spanish), and the button is lit.
- **AC-LN-002.2:** A press then closes the line (with the fade-out of 0.3 s), and does nothing more.
  The next press acts on the thing again: at a chest that the player emptied, it says "It is empty."
- **AC-LN-002.3:** With another thing in front of the player, the button acts on that thing, as with
  no line.
- **AC-LN-002.4:** A page alone closes with the action button, as every dialog: the label is "Close".
- **AC-LN-002.5:** When the player walks away from a chest or a bed of a line, the line closes at
  once. A line at a door stays while the player walks.

---

## Feature Behavior & Rules

- `say()` shows the line in the dialog bubble (`SpeechBubble`, `name: 'dialog'`) and keeps `said`:
  the number of that dialog (`SpeechBubble.dialog`, a new number for each `show()`) and the source
  (`targetKey()`, or null).
- `closesLine()` is true while that dialog is on the screen and the target is its source, or there
  is no target. The press handler of the action button and the label of each frame use it. A press
  that closes the line also clears `dialogKey` when it is the source.
- `lineTime()`: `LINE_BASE_MS` 8000, `LINE_PER_LETTER_MS` 100, `LINE_LONGEST_MS` 20000. The dialog
  bubble takes it as its `duration`. A dialog of more pages, or one that must stay (`stay`: the line
  of a conversation), has no time: it stays until it closes.
- A browser check reads the line from `.sr-only[data-speech=dialog]`, and the label from the
  `aria-label` of `#action` (`docs/browser-checks.md`).
