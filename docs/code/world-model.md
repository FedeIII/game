# The model of a world

This file is part of the documents of the code (see the map in `CLAUDE.md`). Read it before you
change its part of the code, and change it in the same commit as the code.

## Arrival in a world

`WorldDefinition.intro` (`title`, `speaker`, `welcome`): when a visitor arrives, the world's name
shows in the middle of the screen (`render/intro.ts`: on a dark band between two red lines that
grow from the centre; it fades in 0.65 s while it rises a few pixels, stays 1.45 s, and fades out
0.8 s), in the pixel font at twice the size of world text, in the text layer. In the middle of
the fade-out, the NPC `speaker` starts its welcome (`render/welcome.ts`): one line after the
other, each as long as it takes to read, over its head; the visitor can walk on, and talking to
the NPC ends it. No other NPC speaks during the arrival. Screen readers hear the welcome. The
Wilds have none now (the Town of Azyr has one: its crier explains the town). `?nointro` skips it;
`?introat=<ms>` stops the title at that moment, for a screenshot on a slow machine.

**The arrival in a place** (since 2026-10-13, Fede's rule; `docs/features/game/towns.md`,
REQ-TWN-007): a city, or a big town or a town that is important for the story, shows its name in the
same way when a player comes in (`WorldSource.placeTitles()`, `PlaceTitle`; in the Wilds
`TownPlan.title`: Ironhold and Silverspring). A small place (Whitegrove, Bronzehold) has no title, only
a name sign; every settlement has a name sign in the style of its dominion. `PlaceArrivals`
(`render/place-titles.ts`) shows it once for each visit (a visit ends 12 tiles out of the place), never
for the place where the page starts, and not over the world's title; `.sr-only[data-speech=place]`
repeats it, and `?nointro` turns it off. The debug panel's line `place` gives the visit.

**The crossing into a land** (since 2026-10-13, Fede's request; REQ-TWN-009): the name of a land shows
in the same way when a player crosses into it, at each crossing and in both directions
(`WorldSource.lands()`, `Land`, `landAt()`: rectangles with sides that can be infinite, the first one
wins). The Wilds (`LANDS` in `source.ts`): the Mithril Enclave (Silverspring and `ENCLAVE_REACH` 12
tiles round it), the Iron Sovereignty (from `FOREST_EDGE_Y` south) and the Wildlands (the rest).
`LandCrossings` (`render/place-titles.ts`) shows it 2 tiles into the land (`LAND_DEPTH`), never for the
land where the page starts. Two titles never overlap: one waits for the other (`titlesWaiting` in
`game.ts`). A title too wide for the screen at 2x (on a narrow phone) shows at 1x (`IntroTitle`).

## Fixtures, content and actions

- **Walking NPCs** (`packages/engine/src/npc.ts`, since 2026-10-08): a world gives them with
  `WorldSource.npcs()`: `NpcDef` = id, look, home tile, `area` (the tiles where it may walk;
  open and in one piece), content. `NpcCrowd` walks them: a random tile of the area by the
  shortest path, at `NPC_SPEED` (28 px/s); then a stop of 1.5-6 s, sometimes 6-14 s, now and
  then 15-25 s, looking round. 70% of its walks end inside a building when its area is inside
  and outside. A door tile in the area is a way through: the NPC opens the door, waits 0.45 s,
  walks through, and closes it behind it when the doorway is clear (it tries for 6 s, then
  leaves it open); it never closes a door that it did not open. A player within
  `NPC_HOLD_RADIUS` (22 px) stops the NPC, and it turns to the player, so a dialog is never
  cut; but an NPC never stops in a doorway (it would keep the door from closing), only just
  after it. NPCs do not collide with anyone, but a door does not close on an NPC (`useDoor` takes
  everyone's feet). **Lines** (`NpcDef.barks`): each NPC says one now and then (the first 6-40 s
  after the start, then every 25-70 s), never while a player stands close, never the same line
  twice in a row, and never within 5 s of another NPC's line (one voice at a time). They are
  events: the Room sends them in the next snapshot (`b`), so every visitor gets them at once.
  The client (`render/barks.ts`) shows a line over its NPC only if the NPC is outside or in the
  visitor's own house, and never over a dialog with that NPC; screen readers do not get them.
  **Nobody talks over a talk** (Fede's choice, 2026-10-15): while the visitor talks with someone (a
  conversation, or the pages of a person or of a thing that speaks: `inTalk()` in `game.ts`), no NPC
  line shows, a talk stops the lines on the screen (`BarkBubbles.hushAll()`), and a greeting waits
  until the talk ends; the greetings then come one at a time (`nextGreeting()`). Speech bubbles stay
  inside the screen. In a shared
  world the Room runs the crowd (`Room.tick()`, before each broadcast) and the snapshots carry
  the poses; otherwise the client runs its own crowd. To act on one, findInteraction() takes
  `npcActors()`; the target's fixture is `npcFixture(def)`, the same object while it walks.
  The client draws them with `render/npcs.ts` (frames `npc/<look>/<view>/stand|walk/<i>`).
  **At night** (since 2026-10-13, Fede's choice "Some go home"; `docs/features/npcs/night.md`): an
  NpcDef with `night` (`tile`, and `way`: tiles that it walks only to go home and back) walks home at
  20:00 (`NpcCrowd.night`, which the Room and the page set from the hour: `isDaytime()`), says no
  lines, and comes out at 6:00. In front of a door (a shut house) it goes in: `NpcPose.away` (a sixth
  number `1` in the snapshot's `n`), not drawn (`NpcViews` fades it), not an actor, no greeting. Inside
  an open building it stays, seen and silent. A raid wins over the night. Only the people without a
  post or a role have one: the widow (the chapel), the villager of Whitegrove and the panner of
  Silverspring (their shut houses). A person of a conversation, a scene or a quest step never goes.

- **Companions** (`packages/engine/src/companions.ts`, since 2026-10-11, Fede's decision for the
  escort of Himo; `docs/features/npcs/companions.md`): NPCs that follow a player (`CompanionDef`:
  id, name, NPC look, hit points, an AC (`COMPANION_AC` 12 without one), `fallen` `gone` or
  `wakes`). A companion has a `PlayerState` and
  walks with `stepPlayer()` (no wading) on the shortest way of tiles to its leader
  (`followPath()`, 24 tiles round it), stops within 20 px, catches up (x 1.2) when more than 4
  tiles behind, opens doors on its way, and waits (`lost`) with no way or a leader more than 20
  tiles away, until it can follow again (`found`). Mobs hunt and hit it as a player
  (`HordePlayer.companion`: no new mobs come for it, no mob prowls to it); it does not fight. At 0
  HP: the event `fell`, then `gone` (it dies) or it wakes with all its HP. The Room runs them
  (`Room.addCompanion()`, `takeCompanionEvents()`; they leave with their leader) and sends `cp`
  (protocol 22); `render/companions.ts` draws them (NPC frames, a name, a small lantern). Only a
  quest adds one (the escort of Himo, story phase 4); `?companion=<look>` for tests.
- **Fixture types** (`packages/engine/src/fixtures.ts`, `FIXTURE_TYPES`): a kind, a footprint
  (tiles from the anchor = south-west tile, each with a solid box or none) and a depth line.
  **Structure codes:** each type has a range of codes in the structure layer, one per tile, after
  the range of the type before it. Add a new type at the end of the list; do not change the
  number of tiles of a type. All codes must stay below 256 (a test checks it).
- **A fixture** is a placed instance: kind, anchor tile, optional `look` (NPC costume, or the
  style of a thing: `fixture/<kind>/<look>`), `label` (a name that the page writes on a plate over
  it: a name sign), `content` and `light`. Content (`Interaction`): `pages` (one per press of the action button),
  `speaker` (`'player'`, the default, or `'fixture'` for an NPC: the bubble goes over its head),
  `link` (`url`, `label`, `title`: the link card), and `dialog` (a conversation, for an NPC; it
  takes the place of the pages). Without content, the world's `examine[kind]` line is used; a
  thing with neither is not a target.
- **Conversations** (since 2026-10-10): a `Dialog` (`packages/engine/src/dialog.ts`) is a tree:
  a `name` (over the picture), a `start` node, and `nodes`, each with what the NPC says (`say`)
  and 1 to 4 `answers` (`text`, and `next`: the next node, or none to end; an answer can also open a
  shop, `shop`: see "Shops" in `docs/code/items.md`). `checkDialog()` gives
  its problems (a node that no answer reaches, a node with no way out, a missing node, texts too
  long for the panel); a world tests its dialogs with it. The engine keeps no state of a
  conversation, so the server knows nothing of it. In the client: a press on such an NPC makes it
  say its start line in its bubble; 0.7 s later (or on the next press) the conversation panel
  opens (`ui/conversation.ts`): a close-up of the NPC (14 x 14 pixels of `npc/<look>` from the
  top of its head, at 8x, sharp: `drawCloseup()`), its name, "You: " and the last answer, its
  line, and the numbered answers (an answer that ends it in italics). Each answer makes the NPC
  say the next line in its bubble too; the line stays over its head as long as the panel shows it
  (`SpeechBubble.show(..., stay)`), not only the 2.5 s of a short line. While the panel is open the player stands still and does
  not attack, and the panel takes the keys first (capture phase): W S or the arrows choose, E,
  Enter or Space answer, 1 to 9 answer at once, Esc ends it; a tap or a click answers. It ends
  with an answer that ends it, Esc, the close button, a stun, or an NPC more than 40 px away.
- **Actions:** `findInteraction(world, player, accept)` (shared) finds the nearest target within
  `INTERACT_RANGE` (6 px from the feet hitbox to the target's box; a door uses its whole tile),
  in front of the player first. The client runs it every frame. A press: on a door, `useDoor()`
  (shared; it does not close a door on the player; the door of a building with `locked` stays
  closed, `'locked'`, and the player says the building's line; the label is "Try the door"); on
  a signpost, "Read the sign"; on anything else, the first page, then
  the next page on each press, then "Close"; with a link, the card stays while the player is
  in range, and E opens the link. Walking away closes the dialog and the card.
- **Lights:** a fixture's `light` (`radius` from `LIGHTING.radii`, `colour`, centre in pixels
  from its anchor corner). The player's torch is radius 150. A portal's glow takes the colour of
  its light. `WorldDefinition.darkness` (0..1) scales the night: the wilds are 1.
- **Day and night** (`packages/engine/src/daytime.ts`, since 2026-10-13, Fede's decisions;
  `docs/features/game/day-and-night.md`): a world with `WorldDefinition.day` (`DayCycle`: `length`
  in real ms, `noon` the share of the night's darkness at noon) has a day. The Wilds: 48 minutes,
  noon 0.25 (dim, overcast). The hour comes from the real clock (`hourOf(Date.now(), day)`, UTC), so
  every page shows the same hour with no message from the server; an admin can move it for the whole
  shared world (the admin tools: the shift `hs`, protocol 49; see "Admins" in `docs/code/menu-and-accounts.md`). `skyAt()` gives the `Sky`: the
  darkness (1 at night) and `lights` (1 at night, 0 by day): night from 21 to 5, dawn 5 to 7, day 7
  to 19, dusk 19 to 21 (`DAY_HOURS`). `Lighting.update(..., sky)` scales the darkness by it, and the
  holes and glows of all lights fade out by day. The debug panel's `sky` line gives the hour;
  `?hour=<0-24>` stops it (for the page: the light, the sound, and the mobs and NPCs of a world that the
  page runs).
  **Things that follow the hour** (2026-10-13, Fede's choices; REQ-DAY-004): for them it is day from 6:00
  to 20:00 (`isDaytime(sky)`). The server takes the hour from its clock (`RoomOptions.day` and `clock`;
  `GAME_HOUR` fixes it for a test server, not in production); no message carries it. The Room sets
  `Horde.daytime` and `NpcCrowd.night` at each tick, the page from `skyNow()` in a world that it runs.
  The mobs: an area's mobs by day and at night (see `docs/code/combat.md`: goblins at night and bandits by
  day in the forest). The NPCs: the people without a post go home at night (`NpcDef.night`; see "Walking
  NPCs"). The sound: the ambience by day and at night, a night form of each place's music, and the
  stingers `dawn` and `dusk` (see `audio/`). The lamps and the lit windows: unlit frames by day, the lit
  frame over them with the alpha of `sky.lights` (`render/unlit.ts`); by day a thing can say another line
  (`WorldDefinition.examineByDay`: the lamp).

## Buildings

- **The model** (engine): a rectangle of walls with one door in the south wall (never in a
  corner), or an L or a T (`cut`, `BuildingCut`, since 2026-10-15: `depth` rows from the north edge
  lose `west` and `east` columns; the south part keeps the whole width and the door, the north part
  is a wing; `inBuilding()` says if a tile is part of it, `onWall()` if it is on its walls; use them,
  not `inRect()`, which is the box round it), a floor (`Ground.Floor`, `FloorStone` or `FloorEarth`, under the walls too; the world
  source sets it), fixtures, and optional extras: a `sign` (the name over the door) or an
  `emblem` (a symbol on the board in place of the name, `ui/emblem/<emblem>`: the shrine of
  Whitegrove and the chapel of Ironhold show a chalice, Fede's decision of 2026-10-13), a `style`
  (`{ walls, roof }`, the names of the art sets; default `DEFAULT_STYLE`, stone and slate),
  `windows` (columns of the south wall with a lit window: `Structure.Window`, solid like a wall;
  with `dark`, the windows never light: the page shows them unlit at every hour, without a light)
  and `roofProps` (`{ name, tx }`: a chimney, a flag, a spire on the ridge), and `locked` (a
  building that is shut for good: its door never opens, `World.isDoorLocked()`, and a press on it
  shows that line; NPCs may not have its door in their area), and `barred` (a gate: boards are
  nailed across the door, and only a character whose scores pass the gate forces it: `useDoor()`
  gives `'forced'` or `'barred'`; then it is an ordinary door, `World.doorBar()` is null, and
  `World.forcedDoorList()` has it, until `Spoils` bars it again). The engine does not read the style
  or the roof props. `structureIn()` gives the structure code of each tile;
  `isInside()` says if a tile is in the interior or the doorway.
- **Storeys** (since 2026-10-13, Fede's request for the town hall of Ironhold;
  `docs/features/game/storeys.md`): `Building.storeys` are the storeys above the ground storey
  (`Storey`: its things, windows, walls and floor; walls all round, no door). Stairs join them: the
  fixture `stairs` on a storey and `stairwell` on the same 2 x 2 tiles above; `useStairs()` takes a
  player up or down, to `stairsLanding()`. Each player has `PlayerState.storey`, and it moves and
  acts on the map of its storey, `World.level(storey)` (a `StoreyMap` above the ground): pass that
  map, not the world, to `stepPlayer()`, `findInteraction()`, `dropPoint()` and the like. NPCs
  (`NpcDef.storey`), piles (`Pile.storey`) and scenes (`SceneDef.storey`) have a storey too; a
  companion waits while its leader is up. The server owns the storey (protocol 39), and the store
  keeps it with the place. A storey without stairs to it is only a look (`StoreyPlan` with
  `windows`).
- **Collision:** walls and a closed door are full tiles; fixtures have their boxes; an open
  door is open. The open doors are `World.openDoors`: the first world state that is not in the
  source. The server must own it when multiplayer comes.
- **Drawing:** walls and the door in the entity layer (sort by the tile's middle line);
  fixtures by their depth line; the roof as one container just in front of the south wall
  (zIndex `y1 * 16 + 8.5`): above everything in the building, below what stands south of it.
  The roof sits on the wall tops, 32 px up for each storey: the north eave (`top`), the back slope, the
  `ridge`, the front slope, the `eave`. An L or a T has a roof in two parts (`roofParts()`): the wing,
  which ends in its front slope, and the whole width south of it, with its own ridge. Roof props stand on the ridge line, in the middle of
  their column. Each lit window gives a small warm light (radius 48) on the street in front of
  it (`Buildings.lights()`). By day a window shows unlit: the page draws the lit frame over the
  unlit one, with the alpha of the sky's lights (`render/unlit.ts`; 1 at night, 0 by day, half at
  6:00 and 20:00); a street lamp and the cart's lantern do the same (`render/fixtures.ts`). The sign
  is a board in the text layer, over the door.
  While the player is inside (interior or doorway), the roof and the sign fade out and the front
  wall fades to 35% (or it would hide the two floor rows behind it); the storeys of the front wall
  above the player's storey go. On an upper storey, the building shows from that storey up, its
  floor covers the ground storey, and the things, people and players of the other storeys hide
  (`seenBy()` in `game.ts`).
