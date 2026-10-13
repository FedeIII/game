# The Towns of the Wilds

## Overview

The Wilds have two fixed towns: Ironhold, north of the home, and Silverspring, the mithril village of
the Mithril Enclave at the end of the north road (story phase 4a, 2026-10-11; plan:
`docs/drafts/story-razed-villages.md`). Since 2026-10-13 two hamlets of the Iron Sovereignty stand on
the road from the home to Ironhold: Whitegrove and Bronzehold (the tutorial: `docs/drafts/tutorial.md`). Since
2026-10-13 Ironhold is a planned town of wood behind a palisade, with its town hall in the middle of a
square (REQ-TWN-008). Each town is a fixed plan of characters, one for each tile,
the same for every seed. One builder makes both: the buildings with their things and people, the
streets with their lamps and props, and the people who walk the streets. No mob lives near a town
or steps into it.

## Terminology

- **Town plan**: the map of a town (one character for each tile) and a plan for each building.
- **Gate**: the tile just outside a town where its road ends.
- **Doorstep**: the 5 x 3 tiles in front of the door of a building. Nothing stands there.
- **Resident**: an NPC who lives in a building of a town. **Walker**: an NPC who walks the streets.
- **Palisade**: a wall of sharpened logs round a town, one tile thick, with openings for its gates.

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
- **AC-TWN-001.8:** A shrine or a chapel shows a chalice over its door, painted in pale gold on a
  wooden sign board, and no word (Fede's decision, 2026-10-13): the shrine of Whitegrove and the
  chapel of Ironhold. The other signs over doors show the name of the building.

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
  guard on the lane (how the goblins of the woods fight), the standard of the Sovereignty (an anvil of
  pale iron on wine red, as on the shield of its name sign; not the phoenix of the Ashen Seekers), a
  cold forge and two shut houses.
- **AC-TWN-006.4:** Both hamlets are safe as towns (no mob lives near them or steps into them), are
  on the map with their names (Spanish: Arboleda Blanca, Bronzal), and follow AC-TWN-001.1 to 001.7.
- **AC-TWN-006.5:** The east gate of Ironhold stays open: a short road joins it to the north road.
- **AC-TWN-006.6:** Each hamlet has a name sign right outside the south end of its lane, one tile west
  of the road: two posts, and between them a plate of iron in a wine-red frame with the name of the
  hamlet (WHITEGROVE, BRONZEHOLD; in Spanish ARBOLEDA BLANCA, BRONZAL) under the anvil of the Iron
  Sovereignty on a wine-red shield. The plate shows above the darkness, as the signs over doors.
  "Read the sign" says "It reads: WHITEGROVE. Over the name, the anvil of the Iron Sovereignty."
  (Bronzehold: "BRONZEHOLD"). No tree or rock grows next to a sign.
- **AC-TWN-006.7:** A hamlet is small: no title shows over the screen when a player arrives there
  (Fede's rule, 2026-10-13: every settlement has a name sign in the style of its dominion; only the
  cities and the big or important towns get a title).

---

### REQ-TWN-007: The name of each settlement

**User Story:** As a player, I want to know where I am when I come to a settlement, so that the
places that matter stand out and every place has its name (Fede's rule, 2026-10-13).

**Acceptance Criteria:**
- **AC-TWN-007.1:** When a player comes into a city, or a big town or a town that is important for the
  story, its name shows over the screen, as the name of a world on arrival: on a dark band between two
  red lines, in the pixel font at twice its size, a third of the way down the screen. It fades in,
  stays and fades out (2.9 s). Screen readers hear the name. Now Ironhold (in Spanish FERROZAR) and
  Silverspring have a title; Whitegrove and Bronzehold do not (AC-TWN-006.7).
- **AC-TWN-007.2:** The title shows once for each visit. A visit ends when the player is more than 12
  tiles out of the town; a walk to the edge of the town and back shows no title again.
- **AC-TWN-007.3:** The page shows no title for the town where it starts (a character that was there
  last, or a reload for a new build): the player did not arrive. A wake at a refuge in the town after a
  defeat is an arrival. The title does not show while the name of the world shows. `?nointro` turns the
  titles off.
- **AC-TWN-007.4:** Ironhold has a name sign in the style of the Iron Sovereignty (as AC-TWN-006.6)
  west of the road from the hut, two rows south of the town, so that its plate does not hang over the
  lane where Brann walks. "Read the sign" says "It reads: IRONHOLD. Over the name, the anvil of the Iron
  Sovereignty."
- **AC-TWN-007.5:** Silverspring has a name sign in the style of the Mithril Enclave (Fede's choice,
  2026-10-13): two pillars of pale stone with small gold domes, a plate of dark blue in a silver frame,
  and over it a blue shield with the silver peaks of the Silver Columns. It stands outside the west end
  of the main street, north of the road that comes in there. "Read the sign" says "It reads:
  SILVERSPRING. Over the name, the silver peaks of the Mithril Enclave."
- **AC-TWN-007.6:** No sign stands on a road, and no plate hangs over a road or over the walk of a
  person of the town. No tree, rock or house stands next to a sign.

---

### REQ-TWN-008: Ironhold, a planned town of wood

**User Story:** As a player who knows Kandrax, I want Ironhold to look as Ferrozar does in chapter 1.5.1
and in its picture (solid buildings with wooden finishes, cobbled streets planned as in a city, the
town hall in the middle of a small square), so that the game matches the world.

**Acceptance Criteria:**
- **AC-TWN-008.1:** A palisade of logs stands on every tile of the edge of the town (45 x 23 tiles),
  but for two gates: the south gate, three tiles over the road from the hut, and the east gate, three
  tiles over the main street. Each tile of the palisade is solid, and it joins the tiles of palisade
  next to it.
- **AC-TWN-008.2:** The main street runs from the west palisade to the east gate, three tiles wide. North
  of it is a square of cobblestones (21 x 9 tiles) with the fountain, the notice board and four lamps;
  the town hall stands in its middle, with cobblestones on each of its four sides.
- **AC-TWN-008.3:** The town hall (sign "Town Hall"; "Ayuntamiento") has two storeys
  (`docs/features/game/storeys.md`): the hall on the ground storey, of stone, with the reeve, the
  villager and the soldier of the Sovereignty (the scene of the argument), the map table, the desk and
  the stairs; and the archive above it, of timber, with four bookshelves of ledgers, the strongbox and a
  candelabra. From the door, a player reaches the stairs, goes up, and reaches every thing of the
  archive.
- **AC-TWN-008.4:** The other buildings are of wood (timber frames or planks), but the chapel, which is
  of stone. The inn, the chandler and the house have two storeys outside (look-only storeys).
- **AC-TWN-008.5:** West of the square stands the inn; east of it, the chapel. South of the main street,
  back to back with it, stand the apothecary, the cottage, the smithy, the chandler, the granary and the
  house, with alleys between them; they face the lane by the south palisade.
- **AC-TWN-008.6:** The child in the lane says "Are you here for the reeve? She is in the town hall, on
  the square." when a character on the first quest comes in.

---

## Feature Behavior & Rules

- **The builder** (`worlds/wilds/src/towns.ts`): `TownPlan` (name, north-west tile, map, building
  plans, things of the streets), `Town` (`has()`, `floor()`, `plotAt()`, `at()`, `streetArea()`,
  `buildings`, `residents`, `streetFixtures`), `Plan`, `Thing`, `Person`, `Plot` (`Garden`, `Tree`,
  `Street`, `Lane`, `Water`, `Bridge`), `LAMP`. Map characters: `.` garden, `T` tree, `=`
  cobblestones, `:` lane, `~` water, `h` bridge, `1`-`9` buildings; every other character must be a
  thing of the streets, or the build throws. A thing of kind `palisade` stands on grass (`Plot.Garden`),
  and its look joins the tiles of the same character next to it (`palisadeLook()`, `PALISADE_SIDES` in
  `packages/engine/src/fixtures.ts`; the art `fixture/palisade/<0-15>` in `art/fixtures.ts`). A plan
  can have storeys (`Plan.storeys`, `StoreyPlan`: `docs/features/game/storeys.md`).
- **Ironhold** (`worlds/wilds/src/town.ts`): `IRONHOLD`, and the names that it had before the
  builder (`TOWN`, `TOWN_GATE`, `TOWN_BUILDINGS`, `TOWN_STREET_FIXTURES`, `TOWN_NPCS`, `inTown()`,
  `townFloor()`). Its plan of 2026-10-13 (REQ-TWN-008): the map character `P` is the palisade; the
  buildings in the order of their digits are `inn` (timber, two storeys), `town-hall` (stone and
  timber, clay roof, the wine-red flag; the stairs `s` and the stairwell `w`), `chapel` (gothic),
  `apothecary`, `cottage` and `granary` (planks), `smithy` (timber), `chandler` and `house` (timber, two
  storeys). The rectangle (x -52 to -8, y -8 to 14), `TOWN_GATE` and `TOWN_SOUTH` did not move.
  `TOWN_CACHE` is in the garden by the south palisade (`TOWN.x0 + 9`, `TOWN.y0 + 21`). The scene
  `ARGUMENT` takes the rectangle of the town hall and the two rows south of it.
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
  people, the safety, the title and the name sign; Silverspring: the gate, the buildings, the stream,
  Kasmut, the map; the hamlets: the same, their name signs, and no title);
  `packages/engine-client/src/render/place-titles.test.ts` (when a title shows).
- **The camp of the war band** (`camp.ts`) is a place of the builder too, but not a town: mobs go
  there (`PLACES` and `TOWNS` in `source.ts`).
- **During the raid** (REQ-QST-015) its mobs may go into Silverspring, and its people take shelter
  (`NpcDef.shelter`: the panner at the crates by the inn; the others at their homes).
- **Signs over doors**: `Plan.sign` (a name, translated by `tw()`) or `Plan.emblem` (a symbol, not
  both; `Building.emblem`). The page draws either on the board `ui/sign` (`Buildings.sign()` in
  `render/buildings.ts`); an emblem is the frame `ui/emblem/<emblem>` (`art/font.ts`: `chalice`).
  `apps/game/test/art.test.ts` checks that each emblem of the towns has its frame.
- **Barks**: `BARK_HEARING` (18 tiles) in `packages/engine-client/src/game.ts`.
- **Name signs** (2026-10-13): the fixture `namesign` (`packages/engine/src/fixtures.ts`: three tiles,
  a post in the west tile and in the east tile, nothing solid in the middle one), with `Fixture.look`
  (the style of the dominion: `iron`, the Iron Sovereignty) and `Fixture.label` (the name, in English;
  the page translates it with `tw()`). `HAMLET_SIGNS` in `worlds/wilds/src/hamlets.ts` (`nameSign()`:
  the anchor 5 columns west of the middle of the lane, one row south of the hamlet); in `source.ts` they
  are loose things of the woods (`LOOSE_FIXTURE_LIST`: dry ground under them; `nearNameSign()`: no tree
  or rock next to them). The art: `fixture/namesign/iron` (`art/fixtures.ts`), and the plate
  `ui/namesign/iron` and the shield `ui/crest/iron` (`art/font.ts`). The page draws the plate in the
  layer of the signs over doors (`Fixtures.plate()` in `render/fixtures.ts`: the small font with a
  shadow, the bottom 20 pixels over the south edge of the sign, the shield 4 pixels down over its
  top). The action is "Read the sign" (`STRINGS.readSign`).
- **The signs of the towns** (REQ-TWN-007): `nameSign(town, look, tx, ty, pages)` in `towns.ts` makes
  each one; `TOWN_NAME_SIGN` (`town.ts`: the anchor 5 columns west of `TOWN_SOUTH` and one row south of
  it) and `SILVERSPRING_NAME_SIGN` (`silverspring.ts`: 6 columns west of the town, 2 rows north of the
  row where the road comes in). `NAME_SIGNS` in `source.ts` lists all four: loose things of the woods,
  and `inTheWay()` keeps the houses off them. The art of the Enclave: `fixture/namesign/mithril`
  (`art/fixtures.ts`, the material `M.paleStone`), the plate `ui/namesign/mithril` and the shield
  `ui/crest/mithril` (`art/font.ts`).
- **The titles** (REQ-TWN-007): `TownPlan.title` (Ironhold and Silverspring); the source gives the towns
  with a title in `placeTitles()` (`WorldSource.placeTitles`, `PlaceTitle` in
  `packages/engine/src/world.ts`). The page: `PlaceArrivals` (`render/place-titles.ts`, `TITLE_AWAY` 12
  tiles) chooses the moment, and `IntroTitle` (`render/intro.ts`) draws it, in the text layer; the live
  region `.sr-only[data-speech=place]` repeats it. The debug panel's line `place` gives the visit and the
  phase of the title.
