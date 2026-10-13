# Companions

## Overview

A companion is an NPC that follows one player through the world. It walks behind its leader on
the shortest way of tiles, opens doors, waits when it cannot follow, and comes on again when the
leader comes back. Mobs hunt it and hit it as they hit a player; it does not fight back. A quest
adds a companion (the first one: the scout Himo, whom the character escorts home, in
`docs/drafts/story-razed-villages.md`). Fede's decision of 2026-10-11; the plan is in
`docs/drafts/companions.md`.

## Terminology

- **Companion**: an NPC that follows a player.
- **Leader**: the player that a companion follows.
- **Way**: the tiles from the companion to its leader, in four directions, round what blocks.
- **Wait**: the mode of a companion that cannot follow (no way, or its leader is too far).
- **Defeat**: the hit points of a companion come to 0.
- **A world that the page runs**: a world without the multiplayer server (`?offline`).

## Requirements

### REQ-CMP-001: A companion follows its leader

**User Story:** As a player who escorts someone, I want that person to walk with me, so that I can
take them through the woods.

**Acceptance Criteria:**
- **AC-CMP-001.1:** A companion stands still within 20 px of its leader, and looks at it.
- **AC-CMP-001.2:** Farther away, it walks to its leader at the walk of a player (80 px/s). More
  than 4 tiles behind, it walks 1.2 times as fast, so it catches up.
- **AC-CMP-001.3:** It walks the shortest way of tiles: round walls, trees, rocks, deep and shallow
  water, and things. It finds the way again when its leader goes to another tile, and twice a
  second.
- **AC-CMP-001.4:** A companion that does not move for half a second while it walks (on a corner)
  finds its way again from the middle of its tile.
- **AC-CMP-001.5:** It does not collide with players or NPCs.

---

### REQ-CMP-002: Doors

**User Story:** As a player, I want my companion to follow me into a house, so that a door does not
leave it behind.

**Acceptance Criteria:**
- **AC-CMP-002.1:** A closed door on its way opens. A locked door, and a barred door that nobody
  forced, are walls for it.
- **AC-CMP-002.2:** It does not close the doors that it opens.
- **AC-CMP-002.3:** In a shared world, every player sees the door open.

---

### REQ-CMP-003: A companion waits when it cannot follow

**User Story:** As a player, I want a companion that cannot follow me to wait where it is, so that I
can come back for it.

**Acceptance Criteria:**
- **AC-CMP-003.1:** With no way to its leader within 24 tiles round it (for example, a lake
  between them), the companion stops and waits.
- **AC-CMP-003.2:** With its leader more than 20 tiles away, it waits too.
- **AC-CMP-003.3:** It follows again when a way opens, or when its leader comes within 20 px of
  it. It never jumps to its leader.
- **AC-CMP-003.4:** The engine gives an event when it stops (`lost`) and when it follows again
  (`found`), for the quests.

---

### REQ-CMP-004: Mobs hunt companions

**User Story:** As a player who escorts someone, I want the mobs to attack them too, so that an
escort is a real task.

**Acceptance Criteria:**
- **AC-CMP-004.1:** Mobs see, chase and hit a companion as they do a player, and they take turns on
  it as on a player.
- **AC-CMP-004.2:** A mob's attack rolls against its Armour Class (its own, or 12): a hit stuns it
  and takes its rolled damage; then it has a guard. A miss glances off. Unlike a character's, its
  hit points come back out of a fight: one every 8 s.
- **AC-CMP-004.3:** A companion does not fight back.
- **AC-CMP-004.4:** New mobs come round the players only, and mobs prowl towards the players only:
  a companion brings no mob.
- **AC-CMP-004.5:** Mobs do not come for a companion in a town, as for a player.

---

### REQ-CMP-005: The defeat of a companion

**User Story:** As a quest, I want to know when a companion falls, so that the story can go on
without it.

**Acceptance Criteria:**
- **AC-CMP-005.1:** At 0 hit points a companion lies for 3 s, and the engine gives the event
  `fell`.
- **AC-CMP-005.2:** A companion of the kind `gone` then leaves the world, with the event `gone` (a
  scout who dies). A companion of the kind `wakes` stands up with all its hit points.

---

### REQ-CMP-006: Companions in a shared world

**User Story:** As a player in a shared world, I want to see the companions of every player, so
that the world is the same for all.

**Acceptance Criteria:**
- **AC-CMP-006.1:** The server runs the companions, in ticks of 1/60 s, before the mobs.
- **AC-CMP-006.2:** Every player within 30 tiles of a companion sees it, 100 ms in the past, as the
  other players.
- **AC-CMP-006.3:** When its leader leaves the world, the companion goes too. An escort of a quest
  (Himo) puts it back next to the character when it joins again (`docs/features/game/quests.md`,
  REQ-QST-014).
- **AC-CMP-006.4:** Only the server adds a companion; no message of a page adds one.
- **AC-CMP-006.5:** A page that runs its world runs its own companions, with the same rules.

---

### REQ-CMP-007: A companion on the screen

**User Story:** As a player, I want to see my companion in the dark, so that I do not lose it.

**Acceptance Criteria:**
- **AC-CMP-007.1:** A companion shows in the frames of its NPC look, with its name over its head
  in the small font while it is on the screen or within 2 tiles of it (`TAG_MARGIN`).
- **AC-CMP-007.2:** It carries a small lantern: a light of radius 48 round it.
- **AC-CMP-007.3:** A hit flashes it red, a stun shows stars over its head, and the guard after a
  stun makes it blink, as for a player.
- **AC-CMP-007.4:** While it lies defeated, it shows half faded.
- **AC-CMP-007.5:** For tests, `?companion=<look>` in a world that the page runs puts a companion of
  that NPC look next to the player, named "Companion", and it follows the player.

---

## Feature Behavior & Rules

- **The engine** (`packages/engine/src/companions.ts`): `CompanionDef` (`id`, `name`, `look`,
  `hp`, `ac` (else `COMPANION_AC`, 12), `fallen`: `gone` or `wakes`), `Companion` (`id`, `def`, `leader`, `state`: a
  `PlayerState`, `mode`), `CompanionEvent` (`fell`, `gone`, `lost`, `found`), and `Companions`
  (`add()`, `remove()`, `list`, `ofLeader()`, `targets()`, `step()`, `takeDoors()`). The way:
  `followPath()` (a search in four directions, `FOLLOW_SEARCH` 24 tiles). The constants:
  `COMPANION_IDS` (1,000,000: never the id of a player), `FOLLOW_NEAR` (20 px), `CATCH_UP_TILES`
  (4) and `CATCH_UP` (1.2), `FOLLOW_LEASH` (20 tiles), `REPATH_MS` (500), `STUCK_TICKS` (30). A
  companion moves with `stepPlayer()`: the same collision as a player, no wading.
- **The mobs** (`packages/engine/src/mobs.ts`): `HordePlayer.companion`. `Horde.step()` uses all
  the targets to notice, chase and hit, and only the players (`people`) to populate and prowl.
- **The Room** (`packages/engine/src/net/room.ts`): `Room.companions`, `addCompanion(def,
  leader)`, `takeCompanionEvents()`. `tick()` steps them before the horde (a door that they open
  sends the doors again); `leave()` removes the companions of the player.
- **The wire** (protocol 22, `docs/multiplayer.md`): `cp` in a snapshot, a `WireCompanion` for each
  companion within `MOB_SEND_RADIUS`: `[id, look, name, x, y, vx, vy, facing code, hp, most hp,
  stun, guard, down, leader]`; nothing when the room has no companion. `Remotes.companionsAt()`
  (`RemoteCompanion`), `NetSession.companionsAt()`.
- **The page** (`packages/engine-client/src/game.ts`): `localCompanions` (a world that the page
  runs), the switch `?companion=<look>` (`STRINGS.companion`), `companionsNow()`, and
  `CompanionViews` (`packages/engine-client/src/render/companions.ts`: a `PlayerView` with
  `npcTextures()` of `render/npcs.ts`, a `NameTag`, `COMPANION_LIGHT`, `DOWN_ALPHA`). The debug
  panel (`?debug`) has a line `cmp`: each companion, its tile, a stun or a defeat; in a world that
  the page runs also its mode and its hit points.
- **Escorts** (`packages/engine/src/escorts.ts`, story phase 4b): a step of a quest gives a
  companion (`EscortDef`, `Escorts`, `WorldSource.escorts()`); it ends at the companion's home or
  with its fall. The Room runs them after the companions; the page in a world that it runs.
- **Tests:** `packages/engine/test/companions.test.ts`, `packages/engine/test/escorts.test.ts`.
- **Not yet:** companions that fight; NPCs that walk a road on their own (the caravan); a word with a
  companion.
