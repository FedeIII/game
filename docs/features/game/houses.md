# The Houses of the Wilds

## Overview

The lonely houses of the Wilds have variants (2026-10-15, Fede's request and decisions). Before, every
random house had the same look: stone walls, a slate roof, a wood floor, no window and no chimney,
and the same mix of furniture. Now each house has the look of its land, a shape (a rectangle, an L
or a T), windows and a chimney now and then, and a kind with its own things. Most houses are dark:
nobody lives in them. In about one in five, somebody was there not long ago: its windows light at
night and the candle on its table burns. The home (`home.ts`) does not change. Everything comes from
the seed, so every visitor and the server see the same houses.

## Terminology

- **Look**: the walls, the roof and the floor of a house, as sets of the art (`wall/<walls>`,
  `roof/<roof>`) and a ground of the floor.
- **Land**: one of the lands of the Wilds (`LANDS` in `source.ts`): the Iron Sovereignty (the forest of
  the tutorial), the wildlands, or the Mithril Enclave. The land of a house is the land of the middle
  of its cell.
- **Cut**: the corners cut from the north of the rectangle of a building (`Building.cut`). One cut
  makes an **L**, two cuts make a **T**. The **wing** is the north part that stays; the **south
  part** keeps the whole width and the door.
- **Kind**: what a house was used for: a cottage, a farmhouse, a hunter's lodge, a hermit's hut or a
  store room. It chooses the furniture.
- **Dark house**: a house whose windows never light (`Building.dark`). **Lit house**: a house that is
  not dark.

## Requirements

### REQ-HSE-001: Buildings with corners cut from the north

**User Story:** As a world builder, I want a building that is not only a rectangle, so that houses
can be an L or a T.

**Acceptance Criteria:**
- **AC-HSE-001.1:** In the `depth` rows from the north edge of the rectangle of a building with a cut,
  the `west` columns from the west edge and the `east` columns from the east edge are not part of the
  building: there is no wall, no floor and no building there, and a player walks across them.
- **AC-HSE-001.2:** The walls go round the shape: a tile of the building next to a tile that is not
  part of it, across a side or a corner, is a wall. The inner corners are walls too.
- **AC-HSE-001.3:** The south part keeps the whole width of the rectangle and the door. The wing is
  inside, with the south part: a player inside the wing is inside the building.
- **AC-HSE-001.4:** The roof has two parts: the wing over the north part, which ends in its front
  slope, and the whole width over the south part. A chimney stands on the ridge of the south part.
  While the player is inside, both parts fade.

---

### REQ-HSE-002: The look of a house follows its land

**User Story:** As a player, I want the lonely houses to look like the houses of the land round
them, so that the forest of the Sovereignty and the wildlands feel like different places.

**Acceptance Criteria:**
- **AC-HSE-002.1:** A house in the Iron Sovereignty has one of these looks: timber walls and a thatch
  roof on an earth floor, planks and shingle on wood, timber and shingle on wood, planks and thatch on
  earth, or stone and slate on stone.
- **AC-HSE-002.2:** A house in the wildlands has one of these looks: stone and slate on wood (the old
  look of the houses), fieldstone (rubble) and thatch on earth, fieldstone and slate on stone, or
  planks and thatch on earth.
- **AC-HSE-002.3:** A house in the Mithril Enclave has one of these looks: brick and a clay roof on
  wood, timber and clay on wood, or stone and slate on stone.
- **AC-HSE-002.4:** The ground under a house, its walls too, is the floor of its look.

---

### REQ-HSE-003: Shapes, windows and chimneys

**User Story:** As a player, I want the houses to differ in shape and in detail, so that each one is
a place of its own.

**Acceptance Criteria:**
- **AC-HSE-003.1:** Of the houses 7 tiles tall or more, about 3 in 10 are an L (cut from the west or
  from the east) and about 1 in 7 is a T (only a house 8 tiles wide or more). The south part keeps at
  least 5 rows (the walls, the corridor and two rows more), the wing at least 4 columns, and a cut is
  2 rows deep or more and 2 columns wide or more.
- **AC-HSE-003.2:** About 6 houses in 10 have one or two windows in the south wall: never at a corner,
  at the door or next to it, and never side by side.
- **AC-HSE-003.3:** About 4 houses in 10 have a chimney on the roof, never over a corner.
- **AC-HSE-003.4:** The ground round a house and in its cut corners is dry, and nothing grows there.

---

### REQ-HSE-004: Dark houses and lit houses

**User Story:** As a player, I want most lonely houses to be dark and a few to show a light, so that
a lit window tells me that somebody was there not long ago.

**Acceptance Criteria:**
- **AC-HSE-004.1:** About 1 house in 5 is lit. A barred house is always dark.
- **AC-HSE-004.2:** At night the windows of a lit house glow and light the ground in front of them. The
  windows of a dark house show as by day at every hour, and give no light.
- **AC-HSE-004.3:** In a lit house, the candle on the table burns and gives a little light, and the
  table says "A candle still burns. Someone was here." ("Una vela aún arde. Alguien ha estado aquí.").
- **AC-HSE-004.4:** In a dark house, the candle on the table is a cold stub without light, and the
  table says "The candle burned down long ago. Nobody lives here now." ("La vela se consumió hace
  mucho. Aquí ya no vive nadie.").

---

### REQ-HSE-005: Kinds of house

**User Story:** As a player, I want each house to have the things of what it was, so that I can
read the life of its people in it.

**Acceptance Criteria:**
- **AC-HSE-005.1:** A **cottage** has a bed with a chest at its foot, 1 to 3 bookshelves, a table and
  barrels. In a small house, a thing that does not fit stays out (REQ-HSE-006).
- **AC-HSE-005.2:** A **farmhouse** has a bed with a chest, a table, 2 to 4 crates (at least 1 in a
  small house) that say "Sacks of
  grain. The grain is mouldy." ("Sacos de grano. El grano está enmohecido.") and barrels.
- **AC-HSE-005.3:** A **hunter's lodge** has a bed with a chest, a bear pelt on the floor, a table and
  1 or 2 crates that say "Snares, a coil of rope and a rusty skinning knife." ("Lazos, un rollo de
  cuerda y un cuchillo de desollar oxidado.").
- **AC-HSE-005.4:** A **hermit's hut** has a bed with a chest, 2 to 4 bookshelves, a lectern with a
  book and a table. The book says "A book of prayers, open at the last page. Small, tight writing
  fills the margins." or "A hermit's day book. Roots, rain, and the names of birds.", and to a
  character with INT 10 its lore, with the tag "[INT 10]".
- **AC-HSE-005.5:** A **store room** has a chest in a corner, 3 to 6 crates and barrels, and no bed
  and no table.
- **AC-HSE-005.6:** The kinds follow the land: farmhouses come most in the Iron Sovereignty, hunter's
  lodges and hermit's huts most in the wildlands.
- **AC-HSE-005.7:** The chest of every kind gives the loot of the houses as before. The bars on the
  door (STR) and the lock of the chest (DEX) have a DC from 10 to 13, by what the chest holds
  (`CHEST_GRADES` in `worlds/wilds/src/chests.ts`; [Checks and DCs](../abilities/checks.md)).

---

### REQ-HSE-006: Every thing can be reached

**User Story:** As a player, I want to reach every thing in a house, so that no chest or book is
closed off.

**Acceptance Criteria:**
- **AC-HSE-006.1:** The column of the door and the row inside the south wall stay free (barrels may
  stand in the corners of that row).
- **AC-HSE-006.2:** From the tile inside the door, a walk over the floor (and over a pelt) reaches a
  tile next to every thing of the house.

---

## Feature Behavior & Rules

### The shape (engine)

- `Building.cut` (`BuildingCut`: `depth`, `west`, `east`) in `packages/engine/src/buildings.ts`.
  `inBuilding()` says if a tile is part of a building (its rectangle without the cut corners);
  `onWall()` says if it is on its walls (next to a tile that is not part of it, across a side or a
  corner). `structureIn()`, `structureOnStorey()` and `isInside()` use them; `structureIn()` gives
  `Structure.None` outside the building. `inRect()` is the box round the building.
- `World.buildingAt()` and the sources of the Wilds use `inBuilding()`.
- The client draws the walls on every tile of `onWall()` (`render/buildings.ts`), and the roof in its
  parts (`roofParts()`, `roofRow()`): the wing ends in `front` rows, the south part in its `eave`.
- `Building.dark`: the client shows each window with its unlit frame only
  (`wall/<walls>/window/unlit`), and `Buildings.lights()` gives no light for it. The engine does not
  read it.

### The houses (the Wilds)

- `generateHouse(seed, cellX, cellY, isWater, land)` in `worlds/wilds/src/houses.ts` gives a `House`
  (a `Building` with its `floor` and its `kind`). The rectangle and the door come from the same stream
  as before, so a house keeps its place and its door. The look, the cut, the windows, the chimney, the
  light and the kind come from a stream of their own (`SEED_OFFSET + 5`).
- `WildsSource.house()` gives the land of the middle of the cell (`landAt(LANDS, ...)`), and
  `chunk()` puts `house.floor` under the house. The home is a `House` too (an earth floor, a cottage).
- `LOOKS` (the looks of each land, with weights), `KINDS` (the weights of the kinds in each land),
  `L_CHANCE` 0.3, `T_CHANCE` 0.15, `WINDOW_CHANCE` 0.6, `CHIMNEY_CHANCE` 0.4, `LIT_CHANCE` 0.2,
  `cutOf()`, `windowsOf()`.
- `furnish(rand, shape, kind, lit)`: a bed in a corner by a north wall (a chest alone in a store room),
  bookshelves against the north walls, the pelt (`rug`, look `pelt`), the lectern and the table on a
  spot with a free tile all round it, crates and barrels against the side walls, barrels in the south
  corners. `add()` keeps a thing only if every thing stays reachable from the door.
- The texts: `SAY` (`grain`, `snares`, `cold`) and `LECTERN_BOOKS` in `houses.ts`; their Spanish forms
  in `worlds/wilds/src/text-es.ts`.
- The art: `fixture/table/cold` (`coldTable()`) and `fixture/rug/pelt` (`pelt()`, the material
  `M.fur`) in `packages/engine-client/art/fixtures.ts`.

### Tests

- `packages/engine/test/buildings.test.ts`: a T, its walls, its inside, and a walk across a cut corner.
- `worlds/wilds/test/houses.test.ts`: the wall ring round each shape and the floor of its look; the
  looks of each land; the shapes; the windows, the dark and the lit houses and their tables; the
  chimneys; the things of each kind and the kinds of each land; every thing reachable from the door.
