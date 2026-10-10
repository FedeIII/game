# Intelligence

## Overview

Intelligence (INT) is the knowledge and the reason of a character. It gives the damage of a
wizard's blow, extra damage on a mob in its wind-up for every class, the reading of a mob (its
health and its wind-up), the old writing on things and the clever answers in conversations, the
detail of the map, and the recipes of the cauldron of Thornwick. It makes the things that a
character finds useful: herbs and trophies become draughts.

## Terminology

- **Lore**: pages on a thing (a book, a board, a map) that only a character with INT 13 reads.
- **Clever answer**: an answer in a conversation behind a gate of INT 13.
- **Opening**: the wind-up of a mob, the moment before its blow. A blow then does more damage.
- **Reading a mob**: a health bar over a mob (INT 13), and a glint on its wind-up (INT 15).
- **Seen chunk**: a part of the land of 32 × 32 tiles that the character has been near; the map
  shows the seen chunks.
- **Brew**: a draught that a character makes at the cauldron from items of its pack.
- **Clue**: the dim display of a thing behind a gate for a character that is 1 or 2 short of it
  ([Ability Scores](ability-scores.md), REQ-AS-007).

## Requirements

### REQ-INT-001: The wizard strikes with Intelligence

**User Story:** As a wizard, I want my blows to take their damage from my Intelligence, so that my
main ability counts in a fight.

**Acceptance Criteria:**
- **AC-INT-001.1:** A wizard's blow does 4 + INT modifier damage: 3 at INT 8, 7 at INT 16 or 17
  ([Ability Scores](ability-scores.md), REQ-AS-002).

---

### REQ-INT-002: A blow on a wind-up does more damage

**User Story:** As a clever fighter, I want to strike a mob while it winds up, so that my timing
gives me more damage.

**Acceptance Criteria:**
- **AC-INT-002.1:** A blow or an arrow on a mob in its wind-up does its damage + the INT modifier,
  for every class.
- **AC-INT-002.2:** The bonus is never less than 0: INT 8 or 9 gives no bonus and takes no damage
  away. INT 12 or 13 gives +1, INT 16 or 17 gives +3.
- **AC-INT-002.3:** The bonus counts only in the wind-up, not in the blow or in other states.
- **AC-INT-002.4:** In a shared world, the page shows a kill at once when the blow with the bonus
  takes the last health of the mob.

---

### REQ-INT-003: Reading a mob

**User Story:** As a clever player, I want to see how hurt a mob is and when it winds up, so that I
can choose my moment.

**Acceptance Criteria:**
- **AC-INT-003.1:** With INT 13 or more, a thin red bar over each living mob shows the share of
  its health that it has left.
- **AC-INT-003.2:** With INT 15 or more, a white glint blinks on a mob while it winds up.
- **AC-INT-003.3:** The bar and the glint are above the darkness. A dying mob has no bar.

---

### REQ-INT-004: Lore on things

**User Story:** As a clever player, I want to read more in books and on boards, so that I learn the
secrets of the world.

**Acceptance Criteria:**
- **AC-INT-004.1:** A thing with lore shows its pages to everyone. With INT 13 or more, the player
  then reads the lore too, one page more for each press.
- **AC-INT-004.2:** With INT 11 or 12, the player reads "[INT 13] There is more here, but I cannot
  make sense of it." instead of the lore.
- **AC-INT-004.3:** With INT 10 or less, the player reads only the pages of the thing.
- **AC-INT-004.4:** In the Wilds, the lore is on the books of the houses (one of five books, from
  the seed and the place of the shelf), the lectern of the chapel, the shelf of the apothecary,
  the ledgers and the map table of the reeve, and the notice board of the square.
- **AC-INT-004.5:** Each piece of lore hints at a rule of the game: the opening of a brute, the
  brews, the chapel that keeps the lost, the boxes in the barred houses, the lamps that keep the
  imps away.

---

### REQ-INT-005: Clever answers in conversations

**User Story:** As a clever player, I want to say things that others cannot, so that the people of
Thornwick tell me more.

**Acceptance Criteria:**
- **AC-INT-005.1:** An answer behind a gate shows its gate before its text, for example "[INT 13]
  The marks in the black: are they the boarded houses?".
- **AC-INT-005.2:** With the score of the gate, the player can give it. With a score 1 or 2 under
  it, the answer is dim and the player cannot give it (a click, a number or E do nothing, and the
  selection goes past it). With a lower score, the answer is not there.
- **AC-INT-005.3:** Aldous, the reeve, has two clever answers (on the map, and on the granary).
  Isolde, the apothecary, has one (a remedy that the player can brew).
- **AC-INT-005.4:** Every node of a conversation keeps an answer without a gate, and a way to end
  the conversation without a gate.

---

### REQ-INT-006: The cauldron of Thornwick

**User Story:** As a clever player, I want to brew draughts from what I find, so that my herbs and
trophies have a use.

**Acceptance Criteria:**
- **AC-INT-006.1:** The cauldron in the shop of the apothecary is a conversation: "The cauldron
  bubbles. Isolde lets you use it, if you bring your own herbs."
- **AC-INT-006.2:** It has three recipes: a healing draught from 2 bundles of herbs (INT 10), an
  antidote from a bundle of herbs and an imp horn (INT 13), and a strong draught from 2 bundles of
  herbs and a brute tusk (INT 15). The gate rule of REQ-INT-005 applies to each one.
- **AC-INT-006.3:** With the items and room in the pack, a brew takes the items and puts the
  draught in the pack: "The brew turns clear. You fill a small bottle and put it in your pack."
- **AC-INT-006.4:** Without the items, or without room for the bottle, nothing changes: "You do not
  have what the brew needs, or your pack has no room for the bottle."
- **AC-INT-006.5:** In a shared world the server makes the brew only for a player within 48 px of
  the cauldron, with the score of the gate, and with the items.
- **AC-INT-006.6:** The player drinks the draughts from the pack panel
  ([Pack and Loot](../items/pack-and-loot.md), REQ-PK-011).

---

### REQ-INT-007: The map

**User Story:** As a player who explores, I want a map of the land that I have seen, so that I can
find my way back.

**Acceptance Criteria:**
- **AC-INT-007.1:** The map button (top right, left of the pack button) and the M key open and
  close the map. Esc closes it. One panel at the top right is open at a time.
- **AC-INT-007.2:** The map shows 256 × 256 tiles round the player, one pixel for each tile, and
  only the seen chunks. The player is a red dot in the middle.
- **AC-INT-007.3:** A chunk is seen when the player is in it or in one of the eight chunks round it.
- **AC-INT-007.4:** Everyone sees the ground (water, sand, grass, trees, rocks) and the home with
  its name.
- **AC-INT-007.5:** With INT 11 or more, the map also shows the houses (their walls and floors) and
  the paths and the road.
- **AC-INT-007.6:** With INT 13 or more, it also shows the names of places (Thornwick, Chapel) and
  the refuges.
- **AC-INT-007.7:** With INT 15 or more, it also shows a red cross on the door of a barred house and
  a gold dot on a locked chest.
- **AC-INT-007.8:** In a shared world the server keeps the seen chunks of each character between
  sessions. In a world that the page runs, the page keeps them until it closes: "Played alone:
  the map is not saved."

---

### REQ-INT-008: What Intelligence shows in the builder

**User Story:** As a player who makes a character, I want to see what Intelligence gives, so that I
can choose my scores.

**Acceptance Criteria:**
- **AC-INT-008.1:** Step 2 of the builder and the "You" section list "A blow on a wind-up" (+N
  damage, or "no bonus"), "Read a mob" ("its health", "its health and its wind-up", or "from INT
  13"), "The map" (the detail for the score) and "Old writing" ("you read it", or "from INT 13").

## Feature Behavior & Rules

- **The opening:** `PlayerTraits.opening` (`max(0, INT modifier)`, `packages/engine/src/traits.ts`),
  `Blow.opening` and `blowDamage()` (`packages/engine/src/mobs.ts`). An arrow keeps the blow of its
  shooter, so the bonus counts for a ranger too.
- **Reading a mob:** `READ_FOE_GATE` (INT 13) and `READ_OPENING_GATE` (INT 15) in
  `packages/engine-client/src/ui/gates.ts`; `MobViews.setReading()` in
  `packages/engine-client/src/render/mobs.ts` (`BAR`, `HEAD`, `GLINT_BLINK_MS`). Only the page
  draws them: the server knows nothing of them.
- **Lore:** `Interaction.lore` (`Lore`: a gate and pages) in `packages/engine/src/fixtures.ts`;
  `contentOf()` in `game.ts` adds the lore pages, or the clue `STRINGS.loreHint`. The Wilds:
  `LORE_GATE` (INT 13) in `worlds/wilds/src/dialogs.ts`, `BOOKS` in `worlds/wilds/src/houses.ts`
  (picked with `hash2()`, so the furniture keeps its places), and the `lore` of the things in
  `worlds/wilds/src/town.ts`.
- **Clever answers:** `DialogAnswer.gate` (`packages/engine/src/dialog.ts`). `checkDialog()` checks
  that a node has an answer without a gate, and that every node can end with answers without a
  gate. `Conversation` (`packages/engine-client/src/ui/conversation.ts`) hides, dims or opens each
  answer with `gateView()`.
- **The cauldron:** `CAULDRON` in `worlds/wilds/src/dialogs.ts`, a conversation of a fixture
  (`Interaction.dialog` with `speaker: 'fixture'`). A brew is a deal that takes items
  (`Deal.items`, `goods` an item kind): `makeDeal()` and `canMakeDeal()` in `dialog.ts`. In a shared
  world the page sends `{ t: 'deal', at: [tx, ty], deal }` and `Room.deal()` checks `DEAL_RANGE`
  (48 px), the gate of the answer (`findDealAnswer()`) and the items.
- **The map:** `MapPanel` (`packages/engine-client/src/ui/map-panel.ts`: `SPAN` 256,
  `CHUNK_BUDGET` 12 new chunks for each redraw, `REDRAW_MS` 400). The page draws each chunk from
  `world.source.chunk()` and keeps the picture. The detail gates are `MAP_HOUSES` (11), `MAP_NAMES`
  (13) and `MAP_SECRETS` (15) in `ui/gates.ts`. The names come from `WorldSource.landmarks()`.
- **Seen chunks:** `seenChunks()` and `MAX_EXPLORED` (16,384) in
  `packages/engine/src/net/room.ts`. The Room notes them at each tick; the welcome carries `ex`
  (all of them) and a snapshot `ex` (the new ones). The store keeps them in the column `explored`
  (migration 7), with the place.
- **Protocol 14:** the messages `deal` (with `npc` or `at`) and `drink`, and `ex`. See
  `docs/multiplayer.md`.
