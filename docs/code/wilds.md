# The Wilds

This file is part of the documents of the code (see the map in `CLAUDE.md`). Read it before you
change its part of the code, and change it in the same commit as the code.

- **The Wilds** (`worlds/wilds`): the engine's natural terrain from a seed (`?seed=`), the
  player's home in the middle (`home.ts`), and a house in about a third of the 24 x 24-tile cells
  (`houses.ts`; the cell east of the home always tries). **The home** is the house of the cell
  `HOME_CELL` (1, 5; `houses.ts`), id `home`, in the forest at the northern edge of the Iron
  Sovereignty, south of Ironhold (Fede, 2026-10-12 and 2026-10-13): a timber hut with a thatch roof, 7 x 6 tiles, an earth floor, a lit window
  and a chimney, a bed with a chest, a shelf, a table with a candle and a barrel, each with its
  own line. It stands on the dry place of its cell nearest the middle (the source keeps its ground
  dry in any case). A new character (and a guest) starts in it, on the tile north of the door
  (`WildsSource.spawn()`), facing the door; a character that played before starts where it was
  last. Houses: 7-11 x 6-9 tiles, never on water (deep or shallow). **The variants** (2026-10-15,
  Fede's decisions; `docs/features/game/houses.md`): a look of its land (`LOOKS`: walls, roof and
  floor; the land of the middle of its cell, `LANDS`: in the forest of the Sovereignty timber and
  planks with thatch or shingle, and some stone; in the wildlands old stone and fieldstone (`rubble`);
  in the Mithril Enclave brick and timber with clay roofs), an L or a T now and then (`cutOf()`), one or
  two windows in six houses of ten, a chimney in four of ten, and a kind (`HOUSE_KINDS`, weighted by the
  land: `KINDS`): a cottage (bed with a chest at its foot, bookshelves, a table, barrels), a farmhouse
  (crates of grain), a hunter's lodge (`lodge`: a bear pelt, `rug` with the look `pelt`, crates of
  snares), a hermit's hut (`hermitage`: many books, a lectern with a book of lore) or a store room
  (crates and barrels, a chest, no bed). About one house in five is lit (somebody was there not long
  ago: its windows light at night, the candle on its table burns); the others are `dark` (the table
  has the look `cold`, a cold stub, and its own line), and a barred house is always dark. `furnish()`
  keeps the door column and the row inside the south wall free, and adds a thing only if every thing
  stays reachable from the door. Nothing grows on, round or in front of a house (the cut corners
  too); a mud path leads to the door. A chunk also reads the next cells (a house's ground can reach into
  them). Tests check 150+ houses for a wall ring round the shape, one door, the floor of the look
  and reachable furniture. A cell has no
  house where the house's ground would touch the town, the road or the signpost. About one house
  with a chest in four is barred (STR 10 to 13; never the house east of the home); the chest of a
  house gives a candle stub, a silver ring, a pewter cup or a bundle of herbs, and 1 or 2 coins in
  one of three, and a chest behind a lock or boards more, by the DC of its guard (see "Guarded
  chests" in `docs/code/items.md`; a magic item only at DC 12 and 13; the buried cache one in 6). The
  home's chest is the character's own: no loot. Every lake has a band of shallow water at its
  shore (`Ground.Shallows`, from the elevation: `naturalGround()`), and a small pond is all
  shallow: a character with Strength 12 (`WADE_GATE`) wades through it.
- **Where the hut is** (Fede's decision, 2026-10-12): south of Ironhold, near the northern edge of the
  Iron Sovereignty; Ironhold and Silverspring are in the unclaimed wildlands north of it (not "the
  Wilds", which are far north and far south). **The forest of the tutorial** (`inTutorialForest()`,
  `FOREST_EDGE_Y` -8, the row of Ironhold's north edge: south of it): only goblin patrols live there at
  night, and rare bandits by day (`FOREST_MOBS`, `MobRules.areaAt`, `roam(tx, ty, kind)`; the skirmisher
  and the bandit; one goblin patrol by day for a new character, `FIRST_GOBLINS`), round the hut, the two hamlets and Ironhold; imps and brutes keep the
  wildlands north of Ironhold (Fede, 2026-10-13). Ironhold is the last town of the Sovereignty before the
  wildlands, on the way to Silverspring, the Enclave's last village. Plan: `docs/drafts/tutorial.md`.
- **The road to Ironhold** (`road.ts`, `homeLegs()`; 2026-10-13, after chapter 1.5.1 [A.2]): from below
  the path to the hut's door west and north to **Whitegrove** (Arboleda Blanca), up its lane, on to
  **Bronzehold** (Bronzal), up its lane, and north to the south edge of Ironhold (`TOWN_SOUTH`, below an
  open tile of its south edge; the lane behind the south houses). A road is a chain of legs (`Leg`:
  `from`, `to`, `start`, `end` headings `x` or `y`); `road()` makes a one-leg road. The merchant's
  cart stands beside the first leg (`cartSpot()`: north of a road that runs east and west, or east of
  one that runs north and south). `gateRoad()` keeps the east gate of Ironhold open: from it north to
  the start of the north road. **The hamlets** (`hamlets.ts`, town plans of 19 x 22 tiles, safe as
  towns): Whitegrove (x -20, y 88: the farmer at the market stall, `FARMER`; a villager; the shrine,
  a refuge `whitegrove`; an open farmhouse, two shut houses) and Bronzehold (x -45, y 38, west of the
  lake: the guard post of the Sovereignty with the sergeant, `SERGEANT`; a guard on the lane,
  `BRONZEHOLD_GUARD`; a cold forge; two shut houses). Their NPCs come last in `npcs()` (`HAMLET_NPCS`).
  Each has a name sign in the style of the Iron Sovereignty (`HAMLET_SIGNS`: `namesign`, `look:
  'iron'`, `label` its name) right outside the south end of its lane, one tile west of the road, and
  no title on arrival (a small place; Fede's rule of 2026-10-13).
  `?at=-11,99` starts in Whitegrove, `?at=-36,49` in Bronzehold, `?at=-32,16` at the south edge of
  Ironhold.
- **Ironhold** (`worlds/wilds/src/town.ts`, since 2026-10-10; a new plan on 2026-10-13, Fede's
  request: wooden walls, and closer to Ferrozar in chapter 1.5.1 and its picture on the Drive,
  `docs/features/game/towns.md` REQ-TWN-008): the town nearest the home, a
  fixed plan of 45 x 23 tiles (`TOWN`: x -52 to -8, y -8 to 14, the same for every seed) north of
  the home. `MAP` (one character per tile) and a plan for each building, as the Town of Azyr had.
  A palisade of logs (`P`) goes round it, with two gates: the south gate (`TOWN_SOUTH`, where the
  road from the home comes in) and the east gate (`TOWN_GATE`, which leads to the north road). The
  main street runs from the west palisade to the east gate (cobblestones, lamps). North of it: the
  inn (the Crooked Lantern), a square with the fountain and the notice board and, in its middle, the
  town hall (two storeys: the hall, of stone, with the reeve, and the reeve's archive above it, of
  timber, up the stairs), and the chapel. South of it, back to back with it and facing the lane by
  the south palisade, with alleys between them: the apothecary, a cottage, the smithy, the
  chandler, the granary and a house. The buildings are of wood (timber, planks), but the chapel and
  the hall's storey of stone; the inn, the chandler and the house have two storeys outside. Five
  open; four are shut for good (`locked`: the chandler, the cottage, the granary, the house). Ten
  NPCs (`TOWN_NPCS`): in the buildings the innkeeper and the minstrel, the reeve, the priest, the
  apothecary and the smith (some walk out to their doorstep); in the streets the watchman Brann at
  the south gate (where the road from the hut comes in), the peddler, the widow by the
  fountain and the child in the lane. Each one has three lines that it says by itself, a greeting
  by name (Charisma), and something to say: a conversation for the watchman, the innkeeper, the
  apothecary, the reeve, the peddler and the smith (`dialogs.ts`), three pages for the others. The inn has a
  bed by its east wall for a character with a room (Charisma).
  Ironhold has a title on arrival (`title: true`) and a name sign of the Sovereignty (`TOWN_NAME_SIGN`:
  west of the road from the hut, two rows south of the town, so that its plate does not hang over
  the gate). Nothing stands in the 5 x 3 tiles in front of a door, and no thing of the streets closes
  a way (an alley: `blockers()` in the tests). **The road** (see above): mud, also over water; nothing
  grows on it or close to it. **The signpost** stands outside the hut, two tiles below
  the door on the west side of its path, and points west, where the road leaves: "It reads:
  WHITEGROVE, BRONZEHOLD, IRONHOLD." Tests (`town.test.ts`): the sign and the road for five seeds, the
  hamlets, the walls and doors, the shut doors, every thing and door reachable,
  the NPC areas, the palisade, the town hall and its storeys, and no mob in the town. `?at=-12,3`
  starts at the gate, `?at=-29,2` in front of the town hall. Since 2026-10-11 a
  builder makes the towns (`towns.ts`: `TownPlan`, `Town`); `town.ts` keeps the plan and the old
  names (`TOWN`, `TOWN_BUILDINGS`, `inTown()`...), and `IRONHOLD` is the built town.
- **Silverspring** (`worlds/wilds/src/silverspring.ts`, story phase 4a, 2026-10-11;
  `docs/features/game/towns.md`): the mithril village of the Mithril Enclave, 42 x 24 tiles at the
  end of the north road (the road ends at the gate, `SILVERSPRING_SITE`, west of its main street).
  A spring in a pool at the north end, a stream south to a second pool (water, solid), two bridges of
  planks (`Ground.Floor`). North of the main street: the militia hall (Kasmut Parnika, veteran of the
  Enclave: `KASMUT`), the Silver Trout (Tova: ale; the bed of the refuge `trout`, for the guard of
  Silverspring), the jeweller (Ilsa: mithril at 5 coins with the permit; the smith of Ironhold pays
  10); four shut houses face the lane. Doran of the militia at the gate, a panner by the stream. Its
  NPCs come after the merchant in `npcs()` (wire codes). Mobs keep out of it as out of Ironhold
  (`TOWNS` in `source.ts`), except the war band during the raid. `?at=180,-179` starts in its main
  street. Silverspring has a title on arrival and a name sign of the Mithril Enclave
  (`SILVERSPRING_NAME_SIGN`, `look: 'mithril'`: outside the west end of the main street, north of the
  road). **The camp of the war band** (`camp.ts`, a place of the builder but not a town:
  `PLACES`): off the north road at (91, -146), with a trail; `?at=92,-141` starts next to the post.
- **The burned homesteads** (`worlds/wilds/src/ruins.ts`, story phase 6, 2026-10-11): the Hale, the
  Marrow and the Tanner homestead, fixed, in the wildlands north of Ironhold (Hale north, Marrow north-east, Tanner north-west; 2026-10-13); roofless charred
  houses (`{ walls: 'charred', roof: 'none' }`), each with a phoenix (the fixture `brand`) that moves
  `ashes` on in order; survivors at Hale and Tanner (WIS 11 calms them); then the priest (`PRIEST`)
  or the apothecary tells of the phoenix (`symbol`). `?at=-30,-36` starts at the Hale homestead.
- **The caravan** (story phase 5, 2026-10-11; `docs/features/npcs/guards.md` and REQ-QST-019 to 021):
  **guards** (`packages/engine/src/guards.ts`) are NPCs that fight, with the bodies of players; a
  **convoy** (`convoys.ts`, `WorldSource.convoys()`) walks them on a route and sends the attackers at a
  meeting point (the scouts and the band of the raid if they live, else the clan). The plot (`PLOT`, in
  the Crooked Lantern) starts the quest `caravan`; the driver of the wagon (`WAGON_DRIVER`) talks, and
  a robber is an outlaw (its blows hit the guards; they fight it). A robber is wanted: traders and
  guards refuse it (`Dialog.refuse`) until it pays 60 coins (`QuestEffect.cost`) to the reeve or Kasmut.
  Only the mobs of the story (`Mob.story`) hunt guards (`HordePlayer.quarry`).
- **The Silvervein** (`worlds/wilds/src/river.ts`, 2026-10-12): the river of Silverspring (el río Vena de
  Plata), from a spring 34 tiles north of the town, across the town (its map's channel), to a pool 50
  tiles south. Water, shallows, and a bank with no tree, house or herb.
- **The Arcane Raiders** (story phases 7 to 13, `docs/drafts/story-arcane-raiders.md`, 2026-10-12): the
  end of chapter 1 (the rest of `ashes`) and chapter 2. **Chapter 2 (phases 11 to 13) is on hold: Fede
  said "stop developing here" on 2026-10-12. Build it only when Fede asks.** Phase 7: **the Wren homestead** (`wren.ts`, by
  the pool of the Silvervein; Mira Wren); the priest sends a character at `symbol` there (`next`), and
  the cinder hounds of the Ashen Seekers race it from the east on the burned trail (`SEEKER_TRAIL`; the
  ambush `cinders`). New mob kinds: `hound`, `watcher` (never fights, goes in ash), `seeker`, `adept`
  (fire bolts), `warden` (goes in ash at half health). `?at=182,-101` starts in the yard of the
  homestead. Phase 8: **the camp of the Seekers** (`seekers.ts`) at the east end of the trail; its
  guards fall (`camp`), Sela is tied to the post (her conversation is on the post), and she sends the
  character to the shrine of Tigris (`captive`). `?at=240,-96` starts next to the post. Phase 9: **the
  shrine of Tigris** (`shrine.ts`: standing stones and an altar, loose things on the bank of the pool);
  the wave stone in the altar gives **the Tear of Tigris** (worn: walks in deep water, `PlayerTraits.swim`),
  and the Ash Warden marches for it (`relic`: its orders). `?at=196,-108` starts by the altar. Phase 10:
  **the dream of Verath** (`dream.ts`): at `relic` the beds open a dream (`Interaction.dream`, the veil
  of `ui/dream.ts`); the choice ends chapter 1 at `gave`, `refused` or `lied` (CHA 16). Quest effects
  count what a character wears (`ownedPack()`, `unwearFor()`).
- **The atlas has pages** (2026-10-12): `art/build.ts` packs the frames into pages of at most 2048 x
  2048 (16-bit GPUs: `atlas.png`, `atlas-1.png`, ...; each frame has its `page` in `atlas.json`), and
  `loadArt()` (`src/assets.ts`) loads them all. `ATLAS_PAGE=1024 npm run art` builds small pages, to
  test the loader.
- **Barks** are heard only within 18 tiles (`BARK_HEARING` in `game.ts`): with two towns, the lines of
  a far town would sit on the edge of the screen.
- **The Town of Azyr** is not here any more: it is on the branch `town` (azyr.io; on the VPS,
  `/opt/azyr-town`), frozen. The engine keeps everything that the town uses (multiplayer, walking NPCs,
  lines, the arrival intro, signs, building styles), and a world of the game can use it.
