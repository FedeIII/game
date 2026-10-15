# NPCs at Night

## Overview

The walking NPCs of a world with a day (`docs/features/game/day-and-night.md`) follow the hour. At
night the people without a post go home: they walk to their house, they say no lines, and they come
out again at dawn. The guards, the traders, the reeve and every NPC with a role in the story (a
conversation, a scene, a step of a quest) stay out as by day, so every quest and every shop works at
any hour. Fede's choice of 2026-10-13 ("Some go home"), the second part of the to-do item "Things that
follow the hour".

## Terminology

- **Day** and **night**: for the NPCs, it is day from 6:00 to 20:00, where the lights of the world
  show at half (`isDaytime()`), and night from 20:00 to 6:00. A world without a day cycle is always
  at night, and its NPCs have no home for the night.
- **Tile of the night**: where an NPC goes at night: a tile just south of the door of its house, or
  a tile inside an open building.
- **Way home**: tiles out of the NPC's area that it walks only to go home and to come back.
- **Away**: an NPC that went into a shut house for the night. Nobody sees it, and nobody talks to it.
- **Raid**: an event of the story in which the NPCs of a town take shelter (`NpcCrowd.setAlarm`).

## Requirements

### REQ-NGT-001: The people without a post go home at night

**User Story:** As a player, I want the streets to empty at night, so that the towns feel alive and
the hour means something.

**Acceptance Criteria:**
- **AC-NGT-001.1:** In the Wilds three NPCs go home at night: the widow of Ironhold, the villager of
  Whitegrove and the panner of Silverspring. No other NPC goes.
- **AC-NGT-001.2:** At the start of the night, each one walks from where it is to its tile of the
  night, at its walk of every day (28 px/s), on its way home. A player close by stops it on its way,
  as by day.
- **AC-NGT-001.3:** At the door of a shut house, it goes in: it fades out in half a second, and it is
  away until dawn. The door of the shut house stays shut.
- **AC-NGT-001.4:** The widow has no house (the four shut houses of Ironhold are of families that
  went south): at night she keeps a vigil in the chapel, on the rug before the lectern. She opens
  the door of the chapel, goes in, closes the door behind her, and stays there, seen.
- **AC-NGT-001.5:** At night an NPC that goes home says no lines: not on its way, not at home, not
  in its house. Its greeting by name (Charisma 12) does not come while it is away.
- **AC-NGT-001.6:** At dawn an NPC that is away comes out of its door (it fades in, facing south),
  waits 1 to 5 seconds, and walks back to its area. An NPC inside a building walks out. Then it walks
  and speaks as by day.
- **AC-NGT-001.7:** By day an NPC never walks its way home: its walks stay in its area.
- **AC-NGT-001.8:** A world that starts at night (a server that starts, a page that runs its world)
  has these NPCs at home at once.

---

### REQ-NGT-002: Every quest and shop works at any hour

**User Story:** As a player, I want to find the people of the story at every hour, so that the night
never blocks a quest or a trade.

**Acceptance Criteria:**
- **AC-NGT-002.1:** An NPC with a conversation, a line in a scene or a step of a quest never goes
  home at night. The child of Ironhold has no post, but it sees a character arrive (the scene of the
  arrival), so it stays out.
- **AC-NGT-002.2:** The guards (the watchman of Ironhold, the guard of Bronzehold, Doran of the
  militia), the traders and the people in their buildings stay as by day.

---

### REQ-NGT-003: Nobody talks to an NPC that is away

**User Story:** As a player, I want an NPC in its house to be gone from the street, so that the
night is the same for every player.

**Acceptance Criteria:**
- **AC-NGT-003.1:** An NPC that is away is not a target of the action button, and the page does not
  draw it.
- **AC-NGT-003.2:** A conversation with an NPC that goes away ends.
- **AC-NGT-003.3:** In the shared world the server walks the NPCs home by the real hour, and every
  page shows the same NPCs away.

---

### REQ-NGT-004: A raid wins over the night

**User Story:** As a player who defends a town at night, I want its people to take shelter, so that
the raid looks the same at every hour.

**Acceptance Criteria:**
- **AC-NGT-004.1:** When a raid starts at night, an NPC that is away comes out and goes to its
  shelter, as by day.
- **AC-NGT-004.2:** When the raid ends at night, it goes home again.

---

## Feature Behavior & Rules

- **The engine** (`packages/engine/src/npc.ts`): `NpcDef.night` (`tile`, `way`). `NpcCrowd.night` (the
  Room sets it from its clock at each tick, the page from `skyNow()`: `isDaytime()` in
  `packages/engine/src/daytime.ts`). `NpcCrowd.homeward()` starts the walk home (on the area and the
  way: `route(..., true)`), sets `NpcPose.away` at a tile of the night that is outside a building, and
  ends it at dawn (a wait of 1 to 5 s). By day `route()` uses the area only; from a tile of the way it
  uses the area and the way. `atHome()` puts the NPCs at home in the first step of a crowd that starts
  at night. A raid (`setAlarm`) takes the NPC out of its night. The crowd checks each `night` when it
  starts: the tile is in the area or the way, it is inside a building or just south of a door, a way
  leads to it from the NPC's home, and the way has no locked door.
- **The Wilds:** the widow (`worlds/wilds/src/town.ts`: the chapel, on the rug before the lectern;
  her way along row 9 of the square and the main street to the door of the chapel), the villager of
  Whitegrove (`worlds/wilds/src/hamlets.ts`: the shut cottage, `whitegrove-cottage`; four tiles of
  garden from the lane), the panner of Silverspring (`worlds/wilds/src/silverspring.ts`: the shut
  `panner-house`; down the alley by the river and west on the lane).
- **The wire:** a snapshot's `n` has `[x, y, vx, vy, facing code]` for each NPC, and a sixth number
  `1` while it is away (`WireNpc`). `Remotes.npcsAt()` gives `away: true` from the last sample at or
  before the time shown.
- **The page** (`packages/engine-client/src/render/npcs.ts`, `NpcViews`): an NPC that goes away fades
  out in 0.5 s, and in again at dawn. `npcActors()` skips an NPC that is away; `game.ts` shows no line
  and no greeting of it, and ends a conversation with it.
- **Tests:** `packages/engine/test/npc.test.ts` ("NPCs at night"), `worlds/wilds/test/night.test.ts`.
  `?hour=23` (with `?offline`) shows the night in a world that the page runs; `GAME_HOUR=23` gives a
  test server a fixed hour.
