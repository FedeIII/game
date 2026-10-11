# Quests and the Journal

## Overview

A quest is a thing that a world asks of a character, in steps. Each character has a quest book: the
step that it is at in each quest that it started. Answers in conversations and things that a
character reads move the quests on, and they can take items and give a reward. The server keeps
the book with the character and checks every change. The journal shows the quests, a banner shows
each change, and the map marks where to go. A character can also overhear a scene: NPCs who talk
among themselves. The first story of the Wilds starts with a letter from Thrain Steelforge on the
table of the home; its first errand is a merchant's broken cart on the road to Ironhold, and in the
reeve's house the character overhears that hobgoblins go to Silverspring (chapter 1.5.1 of Kandrax;
plan: `docs/drafts/story-razed-villages.md`, phases 2 and 3).

## Terminology

- **Quest book**: the quests that a character started, each with its step, its flags and the order
  of the changes.
- **Step**: a stage of a quest, with a line for the journal. A step can end the quest.
- **Effect**: what an answer or a thing does to a quest: it starts it or moves it to a step, and it
  can set a flag, take items and give coins and items.
- **Condition**: a quest at some steps (or started at all), or an item in the pack; or the opposite
  of one.
- **Open quest**: a quest at a step that does not end it. **Done quest**: one at a step that ends it.
- **Scene**: a talk that a character overhears, in an area, at a step; its NPCs say its lines.

## Requirements

### REQ-QST-001: A quest book for each character

**User Story:** As a player, I want my character to remember what it does for the people of the
world, so that the story goes on where I left it.

**Acceptance Criteria:**
- **AC-QST-001.1:** A new character has an empty book. The book of a stored character comes back
  when it plays again, in a shared world.
- **AC-QST-001.2:** Only the server changes the book of a character in a shared world. It sends the
  book to the player of that character, and to no other player.
- **AC-QST-001.3:** After each change, the server saves the book and the pack together, at once.
- **AC-QST-001.4:** In a world that the page runs, the page keeps a book for the visit, and does not
  save it. The journal says: "Played alone: the journal is not saved."

---

### REQ-QST-002: Effects

**User Story:** As a world, I want answers and things to move my quests on, so that the story
follows what the player does.

**Acceptance Criteria:**
- **AC-QST-002.1:** An effect without steps to come from starts a quest that the character did not
  start; an effect with steps to come from moves a quest that is at one of them. Otherwise it does
  nothing.
- **AC-QST-002.2:** An effect that takes items needs them in the pack. Its coins and items go into
  the pack, and the player sees them rise over its head, as loot. What does not fit falls at its
  feet.
- **AC-QST-002.3:** In a shared world, the server applies an effect only for a player within 48 px
  of the NPC or the thing, that passes the gate of the answer, and for whom the conditions of the
  answer hold.
- **AC-QST-002.4:** An effect applies once: after it, the quest is at another step, and the same
  effect cannot apply again unless it comes from that step too.

---

### REQ-QST-003: Conversations with quests

**User Story:** As a player, I want the people of the world to talk about what I do for them, so
that a conversation follows the story.

**Acceptance Criteria:**
- **AC-QST-003.1:** An NPC can start a conversation with another line for a character at a step:
  the first start whose conditions hold, else the usual one.
- **AC-QST-003.2:** An answer with conditions shows only when they hold. An answer with an effect
  shows only when the effect can apply.
- **AC-QST-003.3:** When the player gives an answer with an effect, the effect applies (in a shared
  world, the server applies it), and the NPC says the next line. The answers after it already
  follow the new step.

---

### REQ-QST-004: The journal

**User Story:** As a player, I want to read what my character must do, so that I know where to go.

**Acceptance Criteria:**
- **AC-QST-004.1:** A button at the top right, left of the map, and the key L open the journal
  ("Diario" in Spanish). Esc closes it.
- **AC-QST-004.2:** The journal shows the open quests under "Quests" and the done quests under
  "Done", the last changed first: the title of each quest, and the line of its step. Without
  quests: "Nothing to do yet. Read what lies about, and talk to people."
- **AC-QST-004.3:** When a quest starts, moves on or ends, the journal's button shines until the
  journal opens.
- **AC-QST-004.4:** The journal button shows only in a world with quests.

---

### REQ-QST-005: The banner

**User Story:** As a player, I want to see at once when a quest changes, so that I do not miss it.

**Acceptance Criteria:**
- **AC-QST-005.1:** When a quest starts, a band shows "New quest" over the title of the quest, in
  the pixel font, on a dark band between two red lines. When it moves on: "Quest updated"; when it
  ends: "Quest done".
- **AC-QST-005.2:** The band fades in for 0.4 s, stays 2.4 s and fades out for 0.7 s, a sixth of the
  way down the screen. Two changes show one after the other.

---

### REQ-QST-006: The map marks

**User Story:** As a player, I want the map to show where my quests lead, so that I find the way.

**Acceptance Criteria:**
- **AC-QST-006.1:** For each open quest whose step has a place (a tile, or the home of an NPC), the
  map shows a gold diamond there, also where the character has not been.
- **AC-QST-006.2:** A place outside the map shows on the edge of the map, in its direction.

---

### REQ-QST-007: The letter (the Razed Villages)

**User Story:** As a new character, I want a reason to leave the home, so that the story starts.

**Acceptance Criteria:**
- **AC-QST-007.1:** The table of the home has a letter: "Your table. A letter lies by the candle,
  sealed with a hammer and an anvil.", then the letter of Thrain Steelforge in two pages: the
  homesteads of the Wilds burn, find out who; begin in Ironhold with the reeve, Elama Rothenel.
- **AC-QST-007.2:** To read it starts "The Razed Villages" at the step `letter`, and the map marks the
  reeve.
- **AC-QST-007.3:** At that step, the reeve starts with another line, and the answer "Thrain
  Steelforge sent me. Who burns the homesteads?" moves the quest to `reeve`. She tells that three
  homesteads burned since the spring, that nobody saw who burned them, and (on a question) that each
  house was searched before the fire. With WIS 13, the player sees that she fears more than bandits.

---

### REQ-QST-008: The broken cart

**User Story:** As a new player, I want a small errand on the way to the town, so that I learn
conversations, gates, errands and rewards.

**Acceptance Criteria:**
- **AC-QST-008.1:** Beside the road from the home to Ironhold, a few tiles before the town, a cart
  stands with its wheel in the mud. The merchant walks on the road in front of it.
- **AC-QST-008.2:** "Can I help?" starts "The Broken Cart" at `met`. The merchant needs somebody to
  lift the cart, or a lever from the smith of Ironhold. The map marks the merchant.
- **AC-QST-008.3:** A character with STR 13 can answer "Stand back. I will lift it." (a dim clue
  with STR 11 or 12): the quest ends, and the merchant pays 10 coins.
- **AC-QST-008.4:** Any character can ask the smith: at `met` or `lever`, without a lever in the pack,
  the smith starts with another line, and "A merchant on the road needs a lever for a broken cart."
  gives a lever (the step `lever`). A character that lost it can ask again.
- **AC-QST-008.5:** "Here: a lever from the smith." gives the lever to the merchant: the quest ends,
  and the merchant pays 10 coins.
- **AC-QST-008.6:** After the help, the merchant tells the news of the trade: Silverspring digs
  mithril and needs tools; Ironhold has a forge and wants the mithril. With INT 13 or CHA 13, the
  player hears that the Iron Sovereignty and the Mithril Enclave both want the Wilds and do not
  play fair.
- **AC-QST-008.7:** A character who helped sees the cart mended, with its wheel on. Others see it
  broken.
- **AC-QST-008.8:** The cart has a lantern: no mob comes within 4 tiles of the middle of the cart,
  so a character can talk to the merchant in peace.

---

### REQ-QST-009: Scenes

**User Story:** As a player, I want to overhear the people of the world, so that I learn the story as
it happens round me.

**Acceptance Criteria:**
- **AC-QST-009.1:** When a character for whom the conditions of a scene hold comes into its area,
  the NPCs of the scene say its lines one after the other, each over its own head, as long as it
  takes to read the line. The NPC that speaks stops its own lines.
- **AC-QST-009.2:** Only the page of that character shows the scene. The other players see the NPCs
  as before.
- **AC-QST-009.3:** A character who goes more than 2 tiles out of the area stops the scene; it plays
  again from the start the next time.
- **AC-QST-009.4:** At the end of the scene, its effect applies (in a shared world, the server checks
  that the character is in the area, with 2 tiles round it). Then the scene does not play again.
- **AC-QST-009.5:** A line said low has a gate: a character that passes it reads the line; others
  read "..." (with the gate, "... [WIS 13]", when they are 1 or 2 short).

---

### REQ-QST-010: The Hobgoblin Raid (the start)

**User Story:** As a player, I want the story to take me from Ironhold into the hills, so that the
letter leads to an adventure.

**Acceptance Criteria:**
- **AC-QST-010.1:** In the house of the reeve of Ironhold stand the reeve, a villager and a soldier of
  the Sovereignty (iron grey, not the red of the town).
- **AC-QST-010.2:** A character who started "The Razed Villages", and not "The Hobgoblin Raid",
  overhears the argument when it comes into the house or within 2 rows of its south wall: the
  hobgoblins go straight for Silverspring, two squads of them; they took Himo, and Brys thinks that
  he is still alive; the villager wants to warn Silverspring, and the soldier refuses to leave
  Ironhold with no defence. With WIS 13 the character also hears the soldier say low: "Let the
  hobgoblins have Silverspring. It saves the Sovereignty the work." The reeve then calls the
  character.
- **AC-QST-010.3:** The end of the argument starts "The Hobgoblin Raid" at `heard`, and the map marks
  the reeve.
- **AC-QST-010.4:** At `heard`, the reeve asks the character to warn Silverspring; "I will warn
  Silverspring." moves the quest to `asked`. She cannot pay, and she says not to fight the
  hobgoblins. At `asked`, she starts with "Silverspring is north-east of here, over the hills. Go,
  and be careful."
- **AC-QST-010.5:** At `heard` or `asked`, the soldier tells the character to stay out of it. With
  WIS 13, the character can say that the soldier wants the hobgoblins to reach Silverspring, and the
  soldier threatens it.

---

## Feature Behavior & Rules

- **The engine** (`packages/engine/src/quests.ts`): `QuestDef` (`id`, `title`, `steps`),
  `QuestStep` (`id`, `journal`, `at`, `npc`, `end`), `QuestEntry` (`step`, `flags`, `n`),
  `QuestBook`, `EMPTY_BOOK`, `When` and `Conditions`, `holds()`, `QuestEffect` (`id`, `quest`, `to`,
  `from`, `flag`, `take`, `give`), `canApply()`, `applyEffect()`, `firstThatHolds()`,
  `checkQuests()` (a book from outside: `QUEST_ID` ids, `MAX_QUESTS` 64, `MAX_FLAGS` 8),
  `checkQuestDefs()` (`QUEST_LIMITS`: title 40, journal 240 characters), `checkEffect()`,
  `checkConditions()`, `questChanges()` (for the banner).
- **Dialogs** (`packages/engine/src/dialog.ts`): `DialogAnswer.when` and `DialogAnswer.effect`,
  `Dialog.starts`, `startNode()`, `answerHolds()`, `findEffectAnswer()`. `checkDialog()`: the start
  nodes exist and count as starts; each node has an answer without a gate, a condition or an
  effect; such answers do not count as a way out; two effects with one id must be the same; an
  answer has a deal or an effect, not both.
- **Things** (`packages/engine/src/fixtures.ts`): `Interaction.effect` (applied when the character
  reads the first page), `Fixture.variant` (`when`, `frame`: the page draws the frame when the
  conditions hold; `render/fixtures.ts`, `Fixtures.setHolds()`). The fixture type `cart` (two
  tiles, code 29). The item `crowbar` (the lever; "Palanca" in Spanish).
- **The server**: `RoomPlayer.quests` and `questsChanged`, `JoinCharacter.quests`, `Room.quest()`
  (it returns whether the book changed); the message `quest` and the field `qs` (protocol 23,
  `docs/multiplayer.md`; `toWireBook()`, `fromWireBook()`); `Character.quests`; the store's column
  `quests` (migration of 2026-10-11) and `AccountStore.setQuests()` (the book and the pack in one
  statement); `Accounts.saveQuests()`; `packages/engine-server/src/index.ts` saves after each
  effect, and with the place.
- **The page** (`packages/engine-client/src`): `game.ts` (`questsNow()`, `holdsNow()`, `applyQuest()`;
  `PENDING_QUEST_MS` 3000: the book as it will be after an effect that went to the server),
  `net/session.ts` (`quests`, `onQuests()`, `quest()`), `ui/conversation.ts` (`ConversationFacts`,
  `Conversation.give()`, `ConversationPanel.refresh()`), `ui/journal-panel.ts` (`JournalPanel`,
  `journalEntries()`, `questMarks()`), `render/quest-banner.ts` (`QuestBanner`, `BANNER_TIMING`),
  `ui/map-panel.ts` (`setMarks()`), `STRINGS.journal`. The debug panel (`?debug`) has a line
  `quests`.
- **The Wilds** (`worlds/wilds/src/quests.ts`): `ASHES` (steps `letter`, `reeve`, `found`; `found`
  ends it and comes with the later phases of the story), `CART` (`met`, `lever`, `done`),
  `QUESTS`, the effects `READ_LETTER`, `TELL_REEVE`, `CART_HELP`, `CART_LEVER`, `CART_LIFT` (flag
  `lifted`), `CART_MEND` (flag `lever`), `CART_REWARD` (10). The letter: `home.ts`. The dialogs:
  `REEVE` (start `letter`), `SMITH` (start `cart`), `MERCHANT` (`dialogs.ts`); `ATHLETICS_GATE` (STR
  13). The cart: `cartSpot()` (`road.ts`: north of the road, from three fifths of the way to the
  town), `WildsSource.cart` (with `CART_LANTERN`, and the variant `fixture/cart-mended`), the
  merchant (the last NPC of `WildsSource.npcs()`, look `merchant`), `CART_SAFE` (4 tiles: `roam` and
  `hunt` of `WildsSource.mobs()`).
- **Scenes** (`packages/engine/src/scenes.ts`): `SceneDef` (`id`, `area`, `when`, `lines`, `effect`),
  `SceneLine` (`npc`, `text`, `gate`), `inScene()`, `SCENE_MARGIN` (2), `SCENE_LINE_MAX` (160),
  `checkScenes()`; `WorldSource.scenes()`. The message `quest` carries `scene` (protocol 24), and
  `Room.quest()` checks the area. The page: `render/scene.ts` (`ScenePlayer`: the time of a line as
  the welcome's), `game.ts` (`sceneLines()`: a murmur, `STRINGS.murmur`, for a line behind a gate).
  The debug line `quests` shows the scene that plays ("scene argument 3/9").
- **The raid** (`worlds/wilds/src`): `RAID` (`heard`, `asked`; the steps `scouts` and `title` come
  with the road, the grove and Silverspring), `RAID_HEARD` (the effect of the scene), `RAID_ASKED`;
  `ARGUMENT` and `TOWN_SCENES` (`town.ts`: the area is the reeve's house and two rows south of it);
  the people `farmer` (pages) and `soldier` (`SOLDIER`) in the reeve's house; `REEVE` starts at
  `warn` (`heard`) and `go` (`asked`).
- **The art**: `fixture/cart`, `fixture/cart-mended` (`art/fixtures.ts`), `item/crowbar`
  (`art/items.ts`), the NPC looks `merchant`, `farmer` and `soldier` (`art/characters.ts`).
- **Tests**: `packages/engine/test/quests.test.ts`, `packages/engine/test/dialog.test.ts`,
  `packages/engine-client/src/ui/conversation.test.ts`, `packages/engine-client/src/ui/journal-panel.test.ts`,
  `packages/engine-server/test/accounts.test.ts`, `worlds/wilds/test/story.test.ts` (every effect and
  condition of the content, the cart, the letter, both ways to fix the cart, the book on the wire).
