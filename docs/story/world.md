# The world

The game has one world, **the Wilds** (Spanish: las Tierras Salvajes), at https://game.azyr.io. It is a
part of **Kandrax**, Fede's D&D 5e world. This document gives Kandrax as the game tells it, and the
places of the Wilds as the code puts them.

Tiles: x grows to the east, y grows to the south. A rectangle is `x0..x1, y0..y1`, inclusive.

## Kandrax, as the game tells it

The prologue (`prologue.md`) and the lines of the people tell this. A character of Kandrax knows only
this much: the secret of the gods stays a secret.

- Civilization is young in Kandrax. Great civilizations were before, and cataclysms put them out. Their
  ruins and relics remain.
- **The Dominions** are the civilized lands: the Human Dominions in the north, the Dwarven Dominions in
  the mountains of the east, the Elven Dominions in the south, and the **Central Dominions** (los
  Dominios Centrales) between them. Lands that nobody rules lie between the Dominions and inside them.
  Beyond them: wild lands to the north and to the south (las Tierras Salvajes), a desert to the east,
  and the Great Sea Ápeiron (el Gran Mar Ápeiron) to the west.
- **The Iron Sovereignty** (la Soberanía del Hierro): a Central Dominion in the south-west, on the
  shore of the Great Sea. Its capital is Iron Bay (Bahía del Hierro), a port and a republic of guilds.
  It knows mining, metalwork and engineering. Thalesferro is next to Iron Bay: there stands the factory
  of **Thrain Steelforge** (Thrain Forjacero), a dwarf engineer.
- **The Mithril Enclave** (el Enclave del Mithril): the northernmost Central Dominion, under the
  mountains, north of the Sovereignty. Its capital, Great Bwini (Gran Bwini), is ruled from a great
  temple. It knows arcane and divine magic.
- **The wildlands** (las tierras salvajes): the lands between the two dominions that no dominion
  claims. Nobody rules there. Both dominions want them, and neither plays fair (the merchant, the
  sergeant of Bronzehold, Kasmut Parnika).
- **The gods.** People worship many gods. The lines of the game name Tigris, the goddess of the rivers
  (the shrine under the pool of the Silvervein), and Simtu, a god of nature and water (the priests of
  Silverspring say that Simtu watches over the Silvervein). The Ashen Seekers follow a god "before the
  gods" with the sign of a phoenix, and say that the four gods are thieves on stolen thrones.

## The places of the Wilds

The Wilds are an endless forest from a seed, with lakes and lonely houses. The places of the story
are fixed: the same for every seed. From the south to the north:

### The northern edge of the Iron Sovereignty: the forest of the road

| Place | Where | What |
|---|---|---|
| **The hut** (the home; el hogar) | the cell `HOME_CELL` (1, 5): `33..39, 129..134` | The character's own hut: a bed (rest, and the wake point after a defeat), a chest (no loot), the table with the letter of Thrain. Every new character starts here. The house of the next cell to the east is never barred. |
| The signpost | `34, 136`, below the hut, west of its path | "It reads: IRONHOLD." It points west, where the road leaves. |
| **The road to Ironhold** | `road.ts`, `homeLegs()` | From the hut west, then north through Whitegrove and Bronzehold, to the south edge of Ironhold (`TOWN_SOUTH`, `-32, 15`). |
| The broken cart | `-3, 123`, on the first leg | The merchant's cart, with a lantern: no mob comes within 4 tiles. |
| **Whitegrove** (Arboleda Blanca) | `-20..-2, 88..109` | A hamlet of the Sovereignty: the farmer's house and stall, the **shrine** (a refuge), two shut houses. |
| **Bronzehold** (Bronzal) | `-45..-27, 38..59` | A village of the Sovereignty: the guard post, a forge, two shut houses. |
| The name signs of the hamlets | `-16..-14, 110` and `-41..-39, 60`: right outside the south end of each lane, west of the road | Two posts and an iron plate with the name (WHITEGROVE, BRONZEHOLD) under the anvil of the Iron Sovereignty. A hamlet has no title on arrival. |

**The forest of the tutorial** is every tile from row `FOREST_EDGE_Y` (-8, the north edge of
Ironhold) south: the whole road from the hut, and the land round Ironhold (Fede, 2026-10-13). A
character there has goblin patrols round it (the skirmisher: 2 or 3 in a group, about 3 round each
character), and goblins live only from row -6 south. No imp and no brute lives there; they live from
row -11 north, in the wildlands.

### Ironhold

**Ironhold** (Ferrozar): `-52..-8, -8..14`, north of Bronzehold, at the end of the road from the hut.
As chapter 1.5.1 of Kandrax tells it (since 2026-10-13): buildings more solid than a village of its
size has, with wooden finishes (timber frames and planks), and cobbled streets planned as in a city. A
palisade of logs goes round the town, with two gates. The main street runs from the west palisade to
the east gate. North of it is a small square with the fountain and the notice board, and in its middle
the **town hall** (el ayuntamiento), where the reeve is: two storeys, the hall below (stone) and the
reeve's archive above it (timber), up the stairs. West of the square stands the inn (the Crooked
Lantern; el Farol Torcido), east of it the chapel (stone; a refuge). South of the main street, the
apothecary, the smithy, and four houses that are shut for good (a cottage, the chandler, the granary, a
house) face the lane by the south palisade. The road from the hut comes in at the south gate
(`TOWN_SOUTH`), where the watchman Brann stands on the lane. From the east gate (`TOWN_GATE`, `-7, 3`) a
road goes north along the palisade to the north road.
Its name sign (`-37..-35, 16`) stands west of the road from the hut, two rows south of the town: two
posts and an iron plate with the name (IRONHOLD; FERROZAR) under the anvil of the Iron Sovereignty. It is
the big town of the tutorial: its name shows over the screen when a character comes in (a title, once
for each visit).

What the people say of Ironhold:

- It is a town of the Sovereignty: the last one before the wildlands, on the way to Silverspring, the
  last village of the Mithril Enclave (Fede, 2026-10-13). "Up the road: Bronzehold, then Ironhold, the
  last town of the Sovereignty. Past it, the wildlands" (the farmer of Whitegrove).
- It has no soldiers of its own, only Brann of the town watch. Soldiers of the Sovereignty stay in it:
  "Ironhold is ours to guard" (a soldier). They "are soldiers of the Sovereignty, not of Ironhold"
  (the reeve): they guard what the Sovereignty wants, not the town. "Ironhold has no soldiers. The
  soldiers are of the Sovereignty" (to Kasmut).
- "Past Ironhold the wildlands start, and nobody rules them" (the sergeant of Bronzehold).
- The town shrinks: the woods came closer, the roads went bad, and the families went south.

Mobs never come into the town. Round it are only the goblin patrols of the forest; the wildlands start
at its north edge.

### The wildlands, north of Ironhold

North of the forest (row -9 and north), a character has about 4 imps and 2 brutes round it, and they
live only from row -11 north (two rows of margin from the forest). Lonely houses stand in about a third of the 24 x 24-tile cells:
a quarter of the houses with a chest are barred (STR 13), a third of the other chests are locked
(DEX 13).

| Place | Where | What |
|---|---|---|
| **The Hale homestead** (la granja de los Hale) | `-35..-25, -45..-35`, north of Ironhold | Burned, with the phoenix. Old Hale stays in the ashes. |
| **The Marrow homestead** (la granja de los Marrow) | `2..12, -50..-40`, east of the Hale homestead | Burned, with the phoenix. Nobody stays. |
| **The Tanner homestead** (la granja de los Tanner) | `-66..-56, -30..-20`, north-west of Ironhold | Burned, with the phoenix. The Tanner girl waits for her mother. |
| **The north road** | from the north-east of Ironhold (`-7, -7`) to Silverspring (`171, -179`) | About 250 tiles, north-east. |
| **The grove** | on the north road, about `63, -57` to `77, -82` | A wood of close trees: the scouts of the hobgoblins wait there. |
| **The camp of the war band** | `83..98, -152..-141`, off the north road, with a trail | The camp of the hobgoblins. Himo is tied to its post (`92, -143`). |
| The meeting point of the caravan | on the north road, at four fifths of it (`127, -161`) | Half a day from Silverspring. |

### Silverspring and the Silvervein

| Place | Where | What |
|---|---|---|
| **Silverspring** | `172..213, -189..-166`, at the end of the north road | The mithril village of the Mithril Enclave: the counterpart of Ironhold, the last village of the Enclave before the wildlands. The militia hall (Kasmut Parnika), the Silver Trout (la Trucha de Plata; a refuge for the guard of the town), the jeweller, four shut houses. The road comes in at the west end of the main street. Mobs keep out, except the war band in the raid. Its name shows over the screen when a character comes in (a title). |
| The name sign of Silverspring | `166..168, -181`, outside the west end of the main street, north of the road | Two pillars of pale stone with gold domes, a blue plate in a silver frame with the name (SILVERSPRING), and the silver peaks of the Mithril Enclave on a blue shield. |
| **The Silvervein** (el río Vena de Plata) | from its spring (`205, -223`), through Silverspring, to a pool (`196, -115`) | The river of Silverspring. It brings mithril dust down from the hills. |
| **The Wren homestead** (la granja de los Wren) | `176..188, -108..-98`, by the pool | A whole house. Mira Wren lives there with her two children. |
| **The burned trail** | from the Wren homestead east into the hills | The trail of the Ashen Seekers. |
| **The camp of the Seekers** | `228..243, -106..-95`, at the east end of the trail | The camp of the Ashen Seekers. Sela is tied to its post (`240, -98`). |
| **The shrine of Tigris** | `189..202, -119..-110`, at the pool | Standing stones and an altar (`195, -110`). The wave stone opens the altar. |

### Refuges

A character that falls (0 HP) wakes at its home, or at the nearest refuge that it has entered:

- the chapel of Ironhold;
- the shrine of Whitegrove;
- a bed at the Crooked Lantern, when Marta gives a room (CHA 13);
- a bed at the Silver Trout, for the guard of Silverspring (the title of the raid).

## The mobs of the story

| Mob | Where |
|---|---|
| Goblin patrols (the skirmisher) | the forest of the road and the land round Ironhold only |
| Imps and brutes | the wildlands, north of Ironhold |
| The hobgoblin scouts: worgs with goblin riders, a hobgoblin, a bugbear | the grove (the raid), the caravan |
| The war band: the Hobgoblin Devastator, hobgoblins, a bugbear | the north road, the raid on Silverspring, the caravan |
| The cinder hounds (los sabuesos de ceniza) and a watcher | the burned trail, the Wren homestead |
| Seeker blades and cinder adepts (los Buscadores de Ceniza) | the camp of the Seekers, the shrine |
| The Ash Warden (el Celador de Ceniza) | the shrine of Tigris |

Only the mobs of the story hunt guards and companions on purpose, and only a quest step brings them.
Their number follows the characters near them (the 5e budget, `encounters.ts`).
