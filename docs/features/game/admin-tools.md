# The Admin Tools

## Overview

The admin tools (Fede's request, 2026-10-15) are debug controls for an admin, in a section of the
settings of the game menu. With them an admin tests the game without a long walk or a long fight:
it moves the hour of the world, goes to a place or a tile, gets coins and items, sets its level or
gets XP, puts mobs next to its character, and sets a quest at a step. Fede's decisions of 2026-10-15:
a change of the hour is for every player of the shared world, the tools work on the live site too,
and the first version has the hour, items, a teleport, XP and level, mobs and quest steps. The game has
no date, only an hour, so a tool for the date is not there.

## Terminology

- **An admin**: an account whose email is in the server's `ADMIN_EMAILS` (`/api/me` says `admin`).
- **A tool**: one control of the section, and the command that it sends (`AdminCommand`,
  `packages/engine/src/admin.ts`).
- **The shift of the hour**: the milliseconds that the server and every page add to the real clock to
  get the hour of the world (`Room.hourShift`). 0 is the real clock.
- **A teleport**: the character goes at once to the open tile nearest to a tile, on the ground storey.

## Requirements

### REQ-ADM-001: The section

**User Story:** As an admin, I want the debug controls in the settings of the game menu, so that I can
test a part of the game at once.

**Acceptance Criteria:**
- **AC-ADM-001.1:** For an admin, the settings of the game menu have the section "Admin tools" (Spanish
  "Herramientas de admin") after "Experience" (`ui/admin-section.ts`). Another account does not have it.
- **AC-ADM-001.2:** A line at the top shows the hour now (with "(moved)" when an admin moved it), the
  tile of the character, its level and its XP: "20:40 · tile 36, 133 · level 1, 0 XP". It follows the
  game while the settings show.
- **AC-ADM-001.3:** Each tool is a row: its name, then its controls (a number, a list, a button). After a
  press, the line at the bottom says "Done", or "Not connected" when the page of a shared world has no
  connection.
- **AC-ADM-001.4:** When the settings show, the hour, the level and the step of the chosen quest show
  the values of now.
- **AC-ADM-001.5:** Each text has a Spanish form. The section fits a phone screen (412 px wide).

---

### REQ-ADM-002: The hour

**User Story:** As an admin, I want to set the hour of the world, so that I can test the night and the
day (the mobs, the NPCs, the light and the music) without a wait.

**Acceptance Criteria:**
- **AC-ADM-002.1:** "Hour" takes an hour from 0 to 24 (steps of a quarter), and "Set" moves the hour of
  the world there; the day goes on from there at its usual speed.
- **AC-ADM-002.2:** In a shared world the hour moves for every player there: the server shifts its clock
  for the mobs and the NPCs, and every page adds the same shift to its clock (the light, the lamps, the
  music and the ambience). A player who comes in later gets the shift too.
- **AC-ADM-002.3:** "Real clock" takes the shift away: the hour of the real clock comes back for
  everybody.
- **AC-ADM-002.4:** A restart of the server (a deploy) takes the shift away.
- **AC-ADM-002.5:** In a world that the page runs (`?offline`, the sandbox), the hour moves for the page
  only. `?hour=` wins over the shift.
- **AC-ADM-002.6:** A world without a day has no row "Hour".
- **AC-ADM-002.7:** The debug panel's `sky` line says that an admin moved the hour, and by how many hours.

---

### REQ-ADM-003: A teleport

**User Story:** As an admin, I want to go to a place or a tile at once, so that I can test a place
without the walk.

**Acceptance Criteria:**
- **AC-ADM-003.1:** "Go to" lists the places of the world (`WorldSource.places()`: the home, the hamlets,
  Ironhold, the homesteads, the camps, the shrine, Silverspring), and "Go" takes the character to the
  middle of the chosen place.
- **AC-ADM-003.2:** "Tile" takes two whole numbers (x, y) and "Go" takes the character there.
- **AC-ADM-003.3:** The character lands on the open tile nearest to the tile, on the ground storey, and
  stops; its hit points, stamina, pack and the rest stay. Its companions come with it.
- **AC-ADM-003.4:** The map notes the land round the new place as seen.

---

### REQ-ADM-004: Coins and items

**User Story:** As an admin, I want coins and items in my pack, so that I can test a deal, a quest or a
piece of gear.

**Acceptance Criteria:**
- **AC-ADM-004.1:** "Items" lists "Coins" and every kind of item (`ITEM_KINDS`, by its name), with "How
  many" (1 to 99 items, or 1 to a full purse of coins), and "Give".
- **AC-ADM-004.2:** The coins and the items go into the pack. What does not fit falls at the
  character's feet, and the character says "My pack is full."
- **AC-ADM-004.3:** The page shows what came over the character's head, as for a drop ("+120 COINS").

---

### REQ-ADM-005: The level and XP

**User Story:** As an admin, I want to set the level of my character or give it XP, so that I can test
the numbers of a level.

**Acceptance Criteria:**
- **AC-ADM-005.1:** "Level" lists 1 to 5, and "Set" gives the character the XP at the start of that level
  (`LEVEL_XP`).
- **AC-ADM-005.2:** "XP" takes a whole number, and "Give" adds it to the XP of the character.
- **AC-ADM-005.3:** The traits follow the new level at once, up or down. Up, the character gets the hit
  points that the levels add, with a banner of the new level; down, its hit points and stamina stay
  within the new most.
- **AC-ADM-005.4:** The XP divisor of the kills (REQ-LVL, "Experience") does not change.

---

### REQ-ADM-006: Mobs

**User Story:** As an admin, I want mobs of a kind next to my character, so that I can test a fight.

**Acceptance Criteria:**
- **AC-ADM-006.1:** "Mobs" lists every kind of mob (`MOB_KINDS`), with "How many" (1 to 8) and "Spawn".
  A world without mobs has no row "Mobs".
- **AC-ADM-006.2:** The mobs come as `?mob=` puts them: a kind that patrols as one group on its loop 8
  tiles east, a kind that ambushes as one group that lurks 3 tiles east, and the others 5 tiles east,
  one 2 tiles from the other (`spawnBeside()`).
- **AC-ADM-006.3:** In a shared world the server puts them, so the other players near the character see
  them and can fight them. They go away as other wandering mobs do (36 tiles from every player).

---

### REQ-ADM-007: Quest steps

**User Story:** As an admin, I want to set a quest of my character at a step, so that I can test a part
of the story without the steps before it.

**Acceptance Criteria:**
- **AC-ADM-007.1:** "Quest" lists the quests of the world by their titles, and "Step" lists "Not
  started" and the steps of the chosen quest (an end step with a "✓"). "Set" puts the quest at that
  step.
- **AC-ADM-007.2:** The quest keeps its flags. "Not started" takes the quest out of the book.
- **AC-ADM-007.3:** A step gives no reward and no XP, and takes no item. The banner and the journal show
  the change as for any change of a quest.
- **AC-ADM-007.4:** What the story starts at a step (an ambush, an escort, a confrontation, a scene)
  starts from the new step, as for a step that the character reached by itself.

---

### REQ-ADM-008: Only for an admin, and saved

**User Story:** As Fede, I want only an admin to use the tools, on the live site too, so that no other
player can change the game.

**Acceptance Criteria:**
- **AC-ADM-008.1:** In a shared world the page sends each tool to the server (the message `admin`,
  protocol 49). The server applies it only when the email of the account of the connection is in
  `ADMIN_EMAILS`; it ignores it from any other account, and on a server without accounts.
- **AC-ADM-008.2:** The server saves what a tool changed in the character at once (place, pack, gear, XP,
  quests), and writes a line in its log ("wilds: an admin used the tool "give"").
- **AC-ADM-008.3:** The server checks each command (`checkAdminCommand()`): a kind of item or mob that
  does not exist, a count out of its limits, a tile more than 100,000 tiles from the middle, or a quest or
  step that the world does not have changes nothing.
- **AC-ADM-008.4:** In a world that the page runs, the page applies the tools to its own state, which it
  does not save (as for that world).

## Feature Behavior & Rules

- **Files.** `packages/engine/src/admin.ts` (`AdminCommand`, `ADMIN_LIMITS`, `checkAdminCommand()`,
  `teleport()`, `adminLoot()`, `setQuestStep()`, `spawnBeside()`), `daytime.ts` (`shiftToHour()`),
  `net/room.ts` (`Room.admin()`, `Room.hourShift`, `RoomOptions.quests`), `net/protocol.ts`
  (`AdminMessage`, `hs` in the welcome and the snapshot), `packages/engine-server/src/index.ts` (the
  check of the admin), `packages/engine-client/src/ui/admin-section.ts` (`adminSection()`), `net/session.ts`
  (`NetSession.admin()`, `NetSession.hourShift`) and `game.ts` (`runAdmin()`, `hourShift()`).
- **The hour on a page.** `skyNow()` takes the hour of `Date.now() + hourShift()`: the server's shift in
  a shared world, the page's own in a world that it runs.
- **Tests.** `packages/engine/test/admin.test.ts` (the commands, the shift of the hour, the steps, the
  teleport, the mobs, and each tool through a Room), `packages/engine-server/test/accounts.test.ts` (a
  tool of an admin goes and is saved; the same tool of another account does nothing).
