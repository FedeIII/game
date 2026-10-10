# Wisdom

## Overview

Wisdom (WIS) is the perception and the insight of a character. It gives the damage of the blow of
a cleric and a druid, a sense of the mobs that hunt the character out of its view, an eye for
hidden things (herbs in the woods, a buried cache), eyes for the night, answers in conversations
that see what people hide, Medicine (herbs for a hit point) and an arrow that points the way home.

## Terminology

- **Hunter**: a mob that hunts the player: it chases it, winds up or strikes at it, runs off to
  come back, or reels from its blow.
- **Sense**: how far the character senses a hunter that it cannot see on the screen.
- **Danger mark**: a red chevron at the edge of the screen that points to a hunter out of view.
- **Hidden thing**: a thing that shows only close by: a patch of herbs, the buried cache.
- **Seek**: how far the character sees a hidden thing.
- **Insight**: an answer in a conversation behind a gate of WIS 13.
- **Medicine**: the skill to chew herbs for a hit point (WIS 13).
- **The way home**: a pale arrow at the edge of the screen that points to the home (WIS 13).
- **Clue**: the dim display of a thing behind a gate for a character that is 1 or 2 short of it
  ([Ability Scores](ability-scores.md), REQ-AS-007).

## Requirements

### REQ-WIS-001: The cleric and the druid strike with Wisdom

**User Story:** As a cleric or a druid, I want my blows to take their damage from my Wisdom, so
that my main ability counts in a fight.

**Acceptance Criteria:**
- **AC-WIS-001.1:** A blow of a cleric or a druid does 4 + WIS modifier damage: 3 at WIS 8, 7 at
  WIS 16 or 17 ([Ability Scores](ability-scores.md), REQ-AS-002).

---

### REQ-WIS-002: Sense the mobs that hunt you

**User Story:** As a player in the dark woods, I want to know where a mob that hunts me is, so that
it does not take me by surprise.

**Acceptance Criteria:**
- **AC-WIS-002.1:** For each hunter out of the screen and within the sense of the character, a red
  chevron at the edge of the screen points to it. It sits where the line from the middle of the
  screen to the mob leaves the screen.
- **AC-WIS-002.2:** The sense is 8 + 2 × WIS modifier tiles: 6 at WIS 8 or 9, 8 at 10 or 11, 10 at
  12 or 13, 12 at 14 or 15, 14 at 16 or 17. Every character has it.
- **AC-WIS-002.3:** A mob that hunts another player gets no mark. A mob that wanders or walks home,
  or a dying mob, gets no mark.
- **AC-WIS-002.4:** A mark goes when its mob comes onto the screen, leaves the sense, or stops the
  hunt. The danger marks pulse, and they are above the darkness.
- **AC-WIS-002.5:** The marks point in 16 directions.

---

### REQ-WIS-003: Eyes for the night

**User Story:** As a wise player, I want to see better in the dark, so that the night is less
blind for me.

**Acceptance Criteria:**
- **AC-WIS-003.1:** The darkness outside the lights is × (1 − 0.08 × WIS modifier): 8% darker at
  WIS 8 or 9, as it is at 10 or 11, 8% lighter at 12 or 13, 16% at 14 or 15, 24% at 16 or 17.
- **AC-WIS-003.2:** The lights (the torch, lamps, windows) do not change.

---

### REQ-WIS-004: See hidden things

**User Story:** As a player with a good eye, I want to find things that others walk over, so that
the woods give me more.

**Acceptance Criteria:**
- **AC-WIS-004.1:** A hidden thing shows only within the seek of the character: 3 + 2 × WIS
  modifier tiles, at least 1 tile (1 at WIS 8 or 9, 3 at 10 or 11, 5 at 12 or 13, 7 at 14 or 15,
  9 at 16 or 17). It fades in over the last tile.
- **AC-WIS-004.2:** A character always sees a hidden thing when it stands next to it, so the action
  button can always act on it.
- **AC-WIS-004.3:** The hidden things of the Wilds are the patches of herbs and the buried cache of
  Thornwick ([Pack and Loot](../items/pack-and-loot.md), REQ-PK-012). They do not collide.
- **AC-WIS-004.4:** A patch of herbs grows in about four cells in five, on open grass with a way out
  between the trees. It never grows within 4 tiles of the town, on or near the road, within 2
  tiles of the signpost, or within 2 tiles of the ground of a house.

---

### REQ-WIS-005: Insight in conversations

**User Story:** As a wise player, I want to see what people do not say, so that the people of
Thornwick tell me more.

**Acceptance Criteria:**
- **AC-WIS-005.1:** Each of the four people of Thornwick with a conversation has one answer behind
  WIS 13, with the gate rule ([Intelligence](intelligence.md), REQ-INT-005): open with WIS 13, dim
  with WIS 11 or 12, not there with less.
- **AC-WIS-005.2:** Brann, the watchman: "[WIS 13] You do not believe the priest." He tells that
  the imps stayed away in a winter without candles.
- **AC-WIS-005.3:** Marta, the innkeeper: "[WIS 13] You know what is in it." She tells what is in
  the green drink.
- **AC-WIS-005.4:** Isolde, the apothecary: "[WIS 13] You do not grow your ashroot here. Where do
  you find it?" She tells that it grows wild between the trees (the patches of herbs).
- **AC-WIS-005.5:** Aldous, the reeve: "[WIS 13] You miss the old couple." He tells that they
  buried their savings across the lane from their door, a few steps to the west (the buried
  cache).

---

### REQ-WIS-006: Medicine

**User Story:** As a wise player, I want to use herbs in the woods, so that I can heal without the
cauldron.

**Acceptance Criteria:**
- **AC-WIS-006.1:** With WIS 13 or more, the player chews a bundle of herbs from the pack panel for
  1 hit point ([Pack and Loot](../items/pack-and-loot.md), REQ-PK-011).
- **AC-WIS-006.2:** With WIS 11 or 12, the slot of the herbs shows "WIS 13" dim, and nothing can be
  chewed. With less, the slot is plain.
- **AC-WIS-006.3:** In a shared world the server checks the gate.

---

### REQ-WIS-007: The way home

**User Story:** As a wise player, I want to know where my home is, so that I find my way back in
the dark forest.

**Acceptance Criteria:**
- **AC-WIS-007.1:** With WIS 13 or more, a pale arrow at the edge of the screen points to the home
  while the home is out of the screen.
- **AC-WIS-007.2:** The arrow is above the darkness, and it points in 16 directions.

---

### REQ-WIS-008: What Wisdom shows in the builder

**User Story:** As a player who makes a character, I want to see what Wisdom gives, so that I can
choose my scores.

**Acceptance Criteria:**
- **AC-WIS-008.1:** Step 2 of the builder and the "You" section list "Sense a mob that hunts you"
  (N tiles), "See hidden things" (N tiles), "The night" ("8% lighter", "normal", "8% darker"),
  "Insight" ("you see what people hide", or "from WIS 13"), "Medicine" ("chew herbs for a hit
  point", or "from WIS 13") and "The way home" ("an arrow points to it", or "from WIS 13").

## Feature Behavior & Rules

- **The traits:** `PlayerTraits.sense`, `seek` and `night` (`packages/engine/src/traits.ts`:
  `SENSE_TILES`, `SENSE_PER_MOD`, `SEEK_TILES`, `SEEK_PER_MOD`, `NIGHT_PER_MOD`).
- **Hunters:** `Horde.huntersOf(playerId)` (`packages/engine/src/mobs.ts`). In a shared world the
  snapshot of each player carries `h`, the ids of its hunters (protocol 15; `NetSession.hunters`);
  in a world that the page runs, the page asks its own horde.
- **The marks:** `EdgeMarks` (`packages/engine-client/src/render/marks.ts`: `edgePoint()`,
  `directionIndex()`, `INSET` 10 world pixels, `PULSE_MS` 700) in the text layer, under the speech.
  The frames `ui/danger/<0-15>` and `ui/homeward/<0-15>` (`packages/engine-client/art/marks.ts`)
  are drawn at each angle, white with a dark outline, and tinted by the client. The home is the
  landmark of kind `home` (`WorldSource.landmarks()`); its gate is `HOMEWARD_GATE` in
  `packages/engine-client/src/ui/gates.ts`.
- **The night:** `Lighting` takes `WorldDefinition.darkness × PlayerTraits.night` (at most full
  darkness). Only the page changes; the server knows nothing of it.
- **Hidden things:** `Fixture.hidden` (`packages/engine/src/fixtures.ts`). `Fixtures.update(view,
  seconds, seeker)` (`packages/engine-client/src/render/fixtures.ts`, `SEEK_FADE` 8 px) gives a
  hidden fixture an alpha from the distance to the player. The types `herbpatch` and `cache` have
  a tile without a solid box but with a `reach` (`FixtureTile.reach`): `findInteraction()` acts on
  it. Art: `fixture/herbpatch` and `fixture/cache` (`packages/engine-client/art/fixtures.ts`).
- **The patches of the Wilds:** `herbPatch()` in `worlds/wilds/src/herbs.ts` (`TRIES` 4, `EDGE` 3,
  `OPEN_RADIUS` 6), and `WildsSource.herbs(cellX, cellY)` (cached), with `HERB_MARGIN` 2 in
  `worlds/wilds/src/source.ts`. The cache: `TOWN_CACHE` in `worlds/wilds/src/town.ts`.
- **Insight:** `INSIGHT_GATE` (WIS 13) in `worlds/wilds/src/dialogs.ts`, on one answer of
  `WATCHMAN`, `INNKEEPER`, `APOTHECARY` and `REEVE`.
- **Medicine:** `MEDICINE_GATE` and `DRINKS.herbs` (`packages/engine/src/items.ts`); `drinkFrom()`
  checks the gate, so `Room.drink()` does too.
- **The debug panel** (`?debug`): the line `wis` gives the sense, the seek, the night, the arrow,
  the hunters and the marks that show.
