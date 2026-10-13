# Buildings with Storeys

## Overview

A building can have storeys above its ground storey (2026-10-13, Fede's request for the town hall of
Ironhold: "let's use this case to develop that feature generically, so any building can have multiple
stories"). Outside, its walls are one storey high for each storey, and the roof sits on the top one.
Inside, stairs join the storeys: the action button takes the character up or down, and the view shows
that storey in the place of the building. Each storey has its own things and people. The server owns
the storey of each player. The first building with two storeys that a character can walk is the town
hall of Ironhold (`docs/features/game/towns.md`, REQ-TWN-008).

## Terminology

- **Storey**: a level of a building. The ground storey is 0; the storey above it is 1, and so on.
- **Upper storey**: a storey above the ground storey. It has the rectangle of its building, walls all
  round and no door.
- **Stairs**: the flight of steps on a storey, two tiles wide and two tiles long, that goes up to the
  storey above. **Stairwell**: the opening with a railing on the storey above, on the same four tiles.
- **Landing**: where a player arrives from the stairs or the stairwell: south of the middle of them.
- **Look-only storey**: an upper storey without stairs to it: its walls and windows show outside, and
  nobody goes up.

## Requirements

### REQ-STY-001: A building with storeys

**User Story:** As a world builder, I want to give any building more than one storey, so that a town
can have tall buildings with rooms upstairs.

**Acceptance Criteria:**
- **AC-STY-001.1:** A building has its ground storey and 0 or more upper storeys, from the bottom up.
- **AC-STY-001.2:** An upper storey has walls on every tile of the rim of the building, and lit windows
  only in its south wall (not at a corner). It has no door.
- **AC-STY-001.3:** Each upper storey has its own things, its own windows, its own wall style and its
  own floor (wood when it does not say).
- **AC-STY-001.4:** The stairwell of a storey stands on the tiles of the stairs of the storey under it.
  Stairs never go up to a storey that a character cannot walk.
- **AC-STY-001.5:** Outside the building there is no upper storey: it is solid there.

---

### REQ-STY-002: Stairs

**User Story:** As a player, I want to go up and down the stairs of a building, so that I can see
its upper rooms.

**Acceptance Criteria:**
- **AC-STY-002.1:** In front of the stairs, the action button says "Go up the stairs" ("Subir la
  escalera"); in front of the stairwell, "Go down the stairs" ("Bajar la escalera").
- **AC-STY-002.2:** A press takes the player to the storey above (the stairs) or below (the stairwell),
  on the landing, facing south. It plays the sound of steps on wood.
- **AC-STY-002.3:** Nothing happens while the player strikes, rolls, is stunned or lies defeated, or
  when it is not within the reach of every action (6 pixels).
- **AC-STY-002.4:** The stairs and the stairwell are solid: a player walks round them.

---

### REQ-STY-003: A player on a storey

**User Story:** As a player, I want each storey to be a place of its own, so that what is upstairs is
not in the way downstairs.

**Acceptance Criteria:**
- **AC-STY-003.1:** A player on a storey walks only on the open floor of that storey: its walls and its
  things stop it. The door of the building is a wall on an upper storey.
- **AC-STY-003.2:** The action button finds only the things, the people and the items on the ground of
  the player's storey. A door opens and closes only from the ground storey.
- **AC-STY-003.3:** Items that a player drops on a storey lie on that storey; only a player on it picks
  them up.
- **AC-STY-003.4:** An NPC can live on a storey: only the players on that storey see it, stop it and
  talk to it. An NPC does not use stairs.
- **AC-STY-003.5:** A scene plays only for a character on the storey of its area (the ground when it
  does not say).
- **AC-STY-003.6:** A companion stays on the ground storey. While its leader is on another storey, it
  waits where it is.
- **AC-STY-003.7:** A defeated player wakes on the ground storey.

---

### REQ-STY-004: The view of a building with storeys

**User Story:** As a player, I want to see the storeys of a building from outside, and the storey where
I am from inside, so that the building looks tall and its rooms are clear.

**Acceptance Criteria:**
- **AC-STY-004.1:** Outside, each storey of the walls is 32 pixels high, in the wall style of that
  storey and with its windows; the roof sits on the top storey. A lit window of an upper storey lights
  its wall.
- **AC-STY-004.2:** While the player is inside, the roof and the sign go, the storey of the front wall
  where the player is fades to 35%, and the storeys of the front wall above it go.
- **AC-STY-004.3:** While the player is on an upper storey, the building shows from that storey up: its
  walls stand on the ground, and the floor of that storey covers the inside of the building.
- **AC-STY-004.4:** While the player is on a storey of a building, the things, the people, the other
  players and the items on the ground of the other storeys of that building do not show. Outside the
  building, the players, the people and the items on the ground still show.
- **AC-STY-004.5:** A player on an upper storey of a building does not show to a player outside or on
  another storey.

---

### REQ-STY-005: Storeys in a shared world

**User Story:** As a player in a shared world, I want the server to know my storey, so that the others
see me where I am, and I start again there.

**Acceptance Criteria:**
- **AC-STY-005.1:** The server applies the stairs that a page used, with the input that carries them,
  and the page shows the move at once. The page and the server agree on the storey after each snapshot.
- **AC-STY-005.2:** The server sends the storey of each player and of each item on the ground.
- **AC-STY-005.3:** The server refuses a deal, an answer or an action on a thing of another storey, and
  a door from an upper storey.
- **AC-STY-005.4:** The place of a character keeps its storey. The character starts again on that
  storey; if the building does not have the storey any more, on the ground storey.

---

## Feature Behavior & Rules

- **The model** (`packages/engine/src/buildings.ts`): `Storey` (`fixtures`, `windows`, `walls`,
  `floor`), `Building.storeys` (from the bottom up: `storeys[0]` is storey 1), `storeyCount()`,
  `upperStorey()`, `storeyFixtures()`, `storeyWindows()`, `structureOnStorey()`.
- **The map of a storey** (`packages/engine/src/world.ts`): `World.level(storey)` gives the world itself
  for 0, and a `StoreyMap` (a `TileMap` and a `SpawnFinder`) for an upper storey: its walls and windows,
  the codes of its things, its floor, and a wall everywhere else. Everything that moves or acts on a
  storey goes through it: `stepPlayer()`, `findInteraction()`, `reachableFixture()`, `dropPoint()`,
  `tossPoint()`, `Piles.put()`.
- **The stairs** (`packages/engine/src/fixtures.ts`): the fixture types `stairs` and `stairwell`
  (`TWO_BY_TWO`: four tiles, solid but for a pixel at the west and the east edge; depth 14).
  `interact.ts`: `stairsLanding()` (the centre of the row south of them, between the two columns),
  `useStairs(world, player, tx, ty)` (`'up'`, `'down'` or null).
- **The player** (`packages/engine/src/player.ts`): `PlayerState.storey`; `wakePlayer()` sets it to 0;
  `resumePlace(world, x, y, storey)` (the point on its storey, else the nearest open tile of the storey
  within 32 tiles, else the ground). `packages/engine/src/character.ts`: `CharacterPlace.storey` (only
  above the ground), `MAX_STOREY` (15), `checkPlace()`.
- **NPCs, piles, scenes**: `NpcDef.storey` and `npcStorey()`, `npcActors(defs, poses, storey)`, and
  `NpcCrowd.step()` takes the storey of each player (`npc.ts`); `Pile.storey` and `pileStorey()`
  (`piles.ts`); `SceneDef.storey` (`scenes.ts`).
- **Companions** (`companions.ts`): a companion follows its leader only while the leader is on the
  ground storey.
- **The protocol** (39): `docs/multiplayer.md`, "Storeys". `WireStairs`, `InputMessage.c`,
  `MAX_STAIRS_PER_MESSAGE`, `WelcomeMessage.st`, the storey at the end of `WirePlayer`, `WireSelf` and
  `WirePile`; `Prediction.stairs()`; `Room.input()`; `Remotes` (`RemotePlayer.storey`).
- **The page** (`packages/engine-client/src`): `game.ts` (`seenBy()`: someone on the player's storey, or
  on the ground outside the player's building; the press on stairs; the labels `STRINGS.goUp` and
  `STRINGS.goDown`; the debug line `tile` adds "(storey N)"); `net/session.ts` (`stairs()`);
  `render/buildings.ts` (a stack of wall sprites on each wall tile, one for each storey, from
  `wallTexture(building, tx, ty, storey)`; the floor of an upper storey in the floor layer of the scene,
  `floorLayer`, from the frames `ground/<floor>/<n>`); `render/fixtures.ts` (`Viewer`: the things of the
  viewer's storey); `render/npcs.ts` (an NPC that the player does not see hides); `audio/fx.ts` (the
  effect `stairs`).
- **The art** (`packages/engine-client/art/fixtures.ts`): `fixture/stairs` (eight steps that rise one
  storey, 32 pixels, over two tiles, between stringers and handrails) and `fixture/stairwell` (the
  opening with its steps and a railing on the west, the east and the north).
- **The town builder** (`worlds/wilds/src/towns.ts`): `Plan.storeys`, `StoreyPlan` (a plan of the
  storey with its things, or only `walls` and `windows` for a look-only storey); the build checks the
  plan and the stairwell over the stairs.
- **Tests**: `packages/engine/test/storeys.test.ts` (the map of a storey, the stairs, the walls, the
  things, a place, piles, NPCs, the Room and the prediction); `worlds/wilds/test/town.test.ts` (the town
  hall of Ironhold: up the stairs, every thing of the archive in reach, and down again).
