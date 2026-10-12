# The Towns of the Wilds

## Overview

The Wilds have two fixed towns: Ironhold, north of the home, and Silverspring, the mithril village of
the Mithril Enclave at the end of the north road (story phase 4a, 2026-10-11; plan:
`docs/drafts/story-razed-villages.md`). Since 2026-10-13 two hamlets of the Iron Sovereignty stand on
the road from the home to Ironhold: Whitegrove and Bronzehold (the tutorial: `docs/drafts/tutorial.md`). Each town is a fixed plan of characters, one for each tile,
the same for every seed. One builder makes both: the buildings with their things and people, the
streets with their lamps and props, and the people who walk the streets. No mob lives near a town
or steps into it.

## Terminology

- **Town plan**: the map of a town (one character for each tile) and a plan for each building.
- **Gate**: the tile just outside a town where its road ends.
- **Doorstep**: the 5 x 3 tiles in front of the door of a building. Nothing stands there.
- **Resident**: an NPC who lives in a building of a town. **Walker**: an NPC who walks the streets.

## Requirements

### REQ-TWN-001: A town from its plan

**User Story:** As a world builder, I want to draw a town as a map of characters, so that a new town
is a plan and not new code.

**Acceptance Criteria:**
- **AC-TWN-001.1:** Each building has a ring of walls, one door in its south wall (not at a corner),
  and lit windows only in its south wall.
- **AC-TWN-001.2:** Nothing solid stands on the doorstep of a building.
- **AC-TWN-001.3:** A shut building (`locked`) never opens; its door says its line. Nobody lives in a
  shut building.
- **AC-TWN-001.4:** From the door of an open building, a player reaches every thing in it.
- **AC-TWN-001.5:** From the gate, a player reaches every thing of the streets and the door of every
  building.
- **AC-TWN-001.6:** Each NPC of a town has a conversation or at least two pages, at least two lines
  that it says by itself, and an area of open tiles in one piece, which it never leaves.
- **AC-TWN-001.7:** The NPC ids are unique in the world, and so are the building ids.

---

### REQ-TWN-002: A safe town

**User Story:** As a player, I want the towns to be safe, so that I can talk and trade in peace.

**Acceptance Criteria:**
- **AC-TWN-002.1:** No mob lives within 2 tiles of a town.
- **AC-TWN-002.2:** No mob steps into a town, also during a chase. A player just inside the gate
  takes no hit from a mob outside it.
- **AC-TWN-002.3:** No house of the Wilds and no patch of herbs stands within 2 tiles of a town (4
  tiles for the herbs).

---

### REQ-TWN-003: Silverspring

**User Story:** As a player who goes to warn Silverspring, I want a town at the end of the north
road, so that the road leads somewhere.

**Acceptance Criteria:**
- **AC-TWN-003.1:** Silverspring is a plan of 42 x 24 tiles. The north road ends at its gate, the
  tile west of its main street, more than 200 tiles north-east of Ironhold.
- **AC-TWN-003.2:** It has seven buildings: the militia hall ("Militia"), the inn ("The Silver
  Trout") and the jeweller ("Jeweller") face the main street from the north, and four shut houses
  face the lane in the south.
- **AC-TWN-003.3:** The Silvervein (el río Vena de Plata) crosses the town from its north edge to its
  south edge, two tiles wide. The water is solid. Two bridges of planks (12 tiles) cross it, where the
  main street and the lane cross the river. Outside the town it goes on: north to its spring in the
  hills, and south to a pool; deep in the middle, shallows at its banks (STR 13 wades them), and a bank
  where no tree, rock, house or herb stands. No mob lives in it.
- **AC-TWN-003.4:** The map shows Silverspring as a town.
- **AC-TWN-003.5:** The inn has a bed for a guest of the town (the refuge `trout`): it rests only a
  character with that refuge.

---

### REQ-TWN-004: The people of Silverspring

**User Story:** As a player, I want the people of Silverspring to tell me about their town, so that
it feels like the mithril village of the Enclave.

**Acceptance Criteria:**
- **AC-TWN-004.1:** Five NPCs: Kasmut Parnika in the militia hall, Tova in the inn, the jeweller in
  her shop; Doran of the militia at the west end of the main street, and a panner by the stream.
- **AC-TWN-004.2:** Kasmut Parnika ("Kasmut Parnika, of the Enclave") is the veteran of the Mithril
  Enclave who trains the militia. She talks of the town, the mithril, the militia and the Enclave, and
  she is openly cynical of Simtu ("Simtu watches the river, and I watch the hills."). With WIS 13, a
  character sees that she does not like the rich, and that she hides why she left Great Bwini.
- **AC-TWN-004.3:** Tova ("Tova, of the Silver Trout") sells an ale for 2 coins. Her rooms are for
  the guard of the town and its friends.
- **AC-TWN-004.4:** Doran ("Doran, of the militia") tells what the town is and who is in charge.
- **AC-TWN-004.5:** The panner has three pages. Ilsa the jeweller has a conversation: she sells
  mithril to a character with the permit of Silverspring (REQ-QST-016).
- **AC-TWN-004.6:** A bark (a line that an NPC says by itself) shows only for an NPC within 18 tiles of
  the player.

---

### REQ-TWN-005: The warning

**User Story:** As a player who comes to warn Silverspring, I want to tell Kasmut of the
hobgoblins, so that my errand has its end.

**Acceptance Criteria:**
- **AC-TWN-005.1:** For a character at the step `asked` or `scouts` of the quest `raid`, Kasmut starts
  with "You came up the north road? Few do now. What is it?", and the answer "Hobgoblins come through
  the hills to Silverspring." is there.
- **AC-TWN-005.2:** She doubts Ironhold first. The answer "Ironhold has no soldiers. The soldiers are
  of the Sovereignty." calms her, and she readies the militia.
- **AC-TWN-005.3:** A character at `scouts` can also tell her that it killed the scouts in the
  grove. Then she says that the war band is close behind.
- **AC-TWN-005.4:** The warning does not move the quest. The war band, the raid on the town and the end
  of the quest are in `docs/features/game/quests.md` (REQ-QST-013 to REQ-QST-016).

---

### REQ-TWN-006: The road to Ironhold and its hamlets

**User Story:** As a new player, I want the road from my hut to Ironhold to pass through living
villages, so that the first journey of the game teaches me the world and its people (Fede,
2026-10-13; chapter 1.5.1 of Kandrax, [A.2]: the broken cart, Arboleda Blanca and Bronzal).

**Acceptance Criteria:**
- **AC-TWN-006.1:** The hut is south of Ironhold, near the northern edge of the Iron Sovereignty. The
  road leaves the path of its door to the west, where the signpost points ("WHITEGROVE, BRONZEHOLD,
  IRONHOLD"), turns north, passes the merchant's broken cart, goes up the lane of Whitegrove, then up
  the lane of Bronzehold, and comes to the south edge of Ironhold, below the lane behind its south
  houses. A player walks it from the door of the hut into Ironhold.
- **AC-TWN-006.2:** Whitegrove (Arboleda Blanca): a market with the farmer at his stall (a
  conversation: he waits for the merchant), a villager on the lane, a shrine that is a refuge (a
  character that entered it wakes there after a defeat, if it is the nearest), an open farmhouse and
  two shut houses.
- **AC-TWN-006.3:** Bronzehold (Bronzal): the guard post of the Sovereignty with its sergeant (a
  conversation; with insight, WIS 13, he tells where the Sovereignty pushes: towards Silverspring), a
  guard on the lane (how the goblins of the woods fight), the standard of the Sovereignty, a cold
  forge and two shut houses.
- **AC-TWN-006.4:** Both hamlets are safe as towns (no mob lives near them or steps into them), are
  on the map with their names (Spanish: Arboleda Blanca, Bronzal), and follow AC-TWN-001.1 to 001.7.
- **AC-TWN-006.5:** The east gate of Ironhold stays open: a short road joins it to the north road.

---

## Feature Behavior & Rules

- **The builder** (`worlds/wilds/src/towns.ts`): `TownPlan` (name, north-west tile, map, building
  plans, things of the streets), `Town` (`has()`, `floor()`, `plotAt()`, `at()`, `streetArea()`,
  `buildings`, `residents`, `streetFixtures`), `Plan`, `Thing`, `Person`, `Plot` (`Garden`, `Tree`,
  `Street`, `Lane`, `Water`, `Bridge`), `LAMP`. Map characters: `.` garden, `T` tree, `=`
  cobblestones, `:` lane, `~` water, `h` bridge, `1`-`9` buildings; every other character must be a
  thing of the streets, or the build throws.
- **Ironhold** (`worlds/wilds/src/town.ts`): `IRONHOLD`, and the names that it had before the
  builder (`TOWN`, `TOWN_GATE`, `TOWN_BUILDINGS`, `TOWN_STREET_FIXTURES`, `TOWN_NPCS`, `inTown()`,
  `townFloor()`). Its plan did not change.
- **Silverspring** (`worlds/wilds/src/silverspring.ts`): `SILVERSPRING`, `SILVERSPRING_NAME`,
  `SILVERSPRING_NPCS`. Its north-west tile is one tile east of `SILVERSPRING_SITE` (`road.ts`) and 10
  rows north of it. Buildings: `militia-hall` (stone, battlement roof, the silver flag of the
  Enclave), `trout` (timber, clay), `jeweller` (brick, indigo), and the shut `panner-house`,
  `miner-house`, `assay-house`, `stream-house`. Dialogs (`dialogs.ts`): `KASMUT`, `HOST`, `MILITIA`,
  `JEWELLER`.
- **The source** (`worlds/wilds/src/source.ts`): `TOWNS`, `townAt()`, `nearPlace()`. A water tile is
  `Ground.Water`; a bridge is `Ground.Floor`. **The Silvervein** (`worlds/wilds/src/river.ts`): `River`
  (`band()`: `deep`, `shallow` or `bank`; `wet()`, `has()`, `spring`, `pool`), `SILVERVEIN`. `npcs()`: the people of Ironhold, the merchant, then
  the people of Silverspring (the order is the code of an NPC on the wire). `landmarks()` adds
  Silverspring.
- **The art**: the NPC looks `veteran`, `militia`, `jeweller`, `prospector` and `host`
  (`packages/engine-client/art/characters.ts`), and the roof prop `flag-silver`
  (`art/buildings.ts`).
- **The texts in Spanish** (`worlds/wilds/src/text-es.ts`): the Militia is "Milicia", the Silver Trout
  "La Trucha de Plata", the Jeweller "Joyería". Silverspring keeps its name.
- **Tests**: `worlds/wilds/test/town.test.ts` (both towns: the walls, the doors, the reach, the
  people, the safety; Silverspring: the gate, the buildings, the stream, Kasmut, the map).
- **The camp of the war band** (`camp.ts`) is a place of the builder too, but not a town: mobs go
  there (`PLACES` and `TOWNS` in `source.ts`).
- **During the raid** (REQ-QST-015) its mobs may go into Silverspring, and its people take shelter
  (`NpcDef.shelter`: the panner at the crates by the inn; the others at their homes).
- **Barks**: `BARK_HEARING` (18 tiles) in `packages/engine-client/src/game.ts`.
