# To do

> **Draft** · Fede's list of things to do later (since 2026-10-13). Fede gives an item at any time,
> between developments: write it here, with where it is in the code; do not fix it at once. Work on an
> item only when Fede asks; then move it to "Done" with the date and the commit.

## Open

- **A title when the player changes dominion** (2026-10-13). When a player goes from one dominion into
  another, the name of the new land shows over the screen. For example, a player that goes north out
  of Ironhold (Ferrozar) enters the wildlands (las tierras salvajes). Now only a town with a title
  shows a name (Ironhold, Silverspring), and nothing marks the border of a dominion.
  Code: the titles of places, `WorldSource.placeTitles()` and `PlaceTitle` (rectangles of tiles) in
  `packages/engine/src/world.ts`; `PlaceArrivals` in `packages/engine-client/src/render/place-titles.ts`
  (once for each visit, never over another title), called from `game.ts`; the Wilds' `placeTitles()`
  in `worlds/wilds/src/source.ts`. The border of the Sovereignty: `FOREST_EDGE_Y` and
  `inTutorialForest()` in `source.ts` (the row of the north edge of Ironhold). The dominions and the
  wildlands: `docs/story/world.md`; the rule of titles: `docs/features/game/towns.md`, REQ-TWN-007.
  Ask Fede: where does the Mithril Enclave start on the north road (round Silverspring only, or a
  line)? Does the title show at each crossing, in both directions (back south: "The Iron
  Sovereignty")?

- **A lamp in Ironhold blocks an alley** (2026-10-13, a bug). A lamp post stands between two buildings
  of Ironhold (Ferrozar), so the player cannot go through there to the centre of the town. Probable
  cause: the lamp `L` at column 23 of row 12 of `MAP` (tile -29, 4), on the south side of the main
  street, stands at the north end of the alley between the smithy (`6`) and the chandler (`7`). The
  alley is one tile wide, so the post closes it.
  Code: `MAP` and `STREET_THINGS` (`L`: `lamppost`, `LAMP`) in `worlds/wilds/src/town.ts`; the box of
  the lamp post (`lamppost`, `[6, 10, 10, 14]`) in `packages/engine/src/fixtures.ts`; the tests of the
  town in `worlds/wilds/test/town.test.ts` (they check things and doors, not the alleys).

- **A cycle of day and night** (2026-10-13). Fede wants a cycle of day and night. Now the Wilds are
  always at night: the world has one fixed darkness (`darkness` 1), and only lights make holes in it.
  Code: `WorldDefinition.darkness` in `packages/engine/src/world.ts`; `Lighting` in
  `packages/engine-client/src/render/lighting.ts` (`ambient.alpha` = `ambientAlpha` x darkness, set
  once in the constructor); `new Lighting(...)` in `packages/engine-client/src/game.ts` (the darkness
  x `traits.night`, the Wisdom trait in `packages/engine/src/traits.ts`); the settings of the light
  in `packages/engine-client/art/lights.ts` (`LIGHTING`, `meta.lighting`).
  Ask Fede: how long is one day in real minutes? Is the time of day the same for every player of the
  shared world? Do other things change with it (mobs, NPCs, the music, the lamps)?

## Done

- **Wider speech bubbles for long lines** (2026-10-13). A short text still wraps at 104 world pixels;
  a long one makes a wider bubble (its width grows with the square root of its length, at most 208
  pixels or the width of the screen), with lines of about the same length (`wrapBubble()` in
  `text-layout.ts`). Done 2026-10-13, commit `f0fcb77`.

- **Name signs at Whitegrove and Bronzehold** (2026-10-13). Each hamlet has a name sign right outside
  the south end of its lane, one tile west of the road, in the style of the Iron Sovereignty (two oak
  posts, an iron plate with the name under the anvil shield; the new fixture `namesign` with `look` and
  `label`, `HAMLET_SIGNS`). Done 2026-10-13, commit `f440fe2`.

- **Titles and signs for settlements: the rule** (2026-10-13). Ironhold and Silverspring show their
  name over the screen when a player comes in, once for each visit (`TownPlan.title`,
  `WorldSource.placeTitles()`, `render/place-titles.ts`); the hamlets do not. Ironhold has a name sign
  of the Sovereignty, and Silverspring one of the Mithril Enclave (silver peaks on blue, Fede's choice).
  Done 2026-10-13, commit `fae19ca`.

- **Wet lentils fail the lentils quest** (2026-10-13). A wade or a swim with the sack makes it a sack
  of wet lentils (`WorldSource.wadeEffects()`: the server sees the wade) and moves the quest to `wet`;
  the sergeant then pays 2 coins to a character with CHA 13, or nothing. Done 2026-10-13, commit
  `4e6cf98`.

- **Goblin patrols: any number flees** (2026-10-13). A startled patrol chooses at random how many of
  its goblins flee, from none (all fight) to all, each number with the same chance (`Horde.startle()`).
  Done 2026-10-13, commit `91f18c7`.

- **A chalice over the door of a shrine, not the word** (2026-10-13). The shrine of Whitegrove and the
  chapel of Ironhold show a chalice in pale gold on the wooden sign board over the door, and no word
  (`Building.emblem`, the frame `ui/emblem/chalice`). Done 2026-10-13, commit `08dca1f`.

- **An empty box at the top centre of the screen** (2026-10-13, a bug). The control hint `#hint` now
  starts with the class `gone` in `apps/game/index.html`, so its empty box does not show; only
  `Hud.showHint()` shows it (the new-build line). Done 2026-10-13, commit `945453c`.

- **Buy and sell menus for the shops** (2026-10-13). An answer of a conversation opens the shop of a
  trader (`DialogAnswer.shop`, `ui/shop-panel.ts`): "Buy" and "Sell", the prices after Charisma, the
  coins and the pack, one item for each trade, for Isolde, Corwin, the smith and Ilsa; the inns keep the
  ale and the room in the conversation, and the protocol did not change. Done 2026-10-13, commit
  `408a22c`.

- **The name of another player stays on the screen** (2026-10-13, a bug). A name tag now shows only
  while its player is on the screen or within 2 tiles of it, and fades out farther away; protocol 38
  sends only the other players within 30 tiles, and counts all of them in `o`. Done 2026-10-13, commit
  `6a4f05e`.

- **Redesign Ironhold: wooden walls, and closer to the Drive** (2026-10-13). Ironhold has a palisade of
  logs with a south gate and an east gate (Fede: both kinds of wooden walls), buildings of timber and
  planks, and a square with the town hall in its middle, after Ferrozar in chapter 1.5.1 and its
  picture; the town hall has two storeys (the hall and the reeve's archive), with a new engine feature
  for buildings with any number of storeys (`docs/features/game/storeys.md`, protocol 39). Done
  2026-10-13, commit `130b4a1`.

- **Calmer music for the last card of the prologue** (2026-10-13). The card of the hut now brings a
  quiet coda of the theme of Kandrax (`KANDRAX_CODA`, `PrologueCard.calm`): a clarinet sings melody A over
  a harp and soft low strings, then a round without it, in place of the rise. Done 2026-10-13, commit
  `be7f5a8`.

- **The tail of a bubble at the edge of the screen** (2026-10-13, a bug). When a speech bubble moves to
  the side to stay inside the screen, its tail moves back by as much along the bottom edge, so it points
  at the speaker (`placeBubble()` in `speech-bubble.ts`). Done 2026-10-13, commit `d2fb9b0`.

- **Music and sound effects in the main menu** (2026-10-13). The menu before the game plays the opening
  of the theme of Kandrax (the prologue goes on with it after "Create"), clicks, ticks and rustles, and
  has a speaker and the "Sound" settings; the game menu rustles, and the music steps back under it
  (`menu/sounds.ts`). Done 2026-10-13, commit `45cad0a`.
- **The standard of Bronzehold shows the phoenix of the Seekers** (2026-10-13, a bug). The standard
  has a look `iron` now (`fixture/standard/iron`: the anvil of pale iron on wine red, with a
  swallowtail), and the standard of Bronzehold uses it. Done 2026-10-13, commit `f1eb82d`.
- **The signpost in the story documents** (2026-10-13). `docs/story/world.md` and AC-LANG-005.1 now
  give the text of the signpost as the code gives it: "WHITEGROVE, BRONZEHOLD, IRONHOLD", and the line
  under it. Done 2026-10-13, commit `97cb9b9`.
- **New places for the action buttons on a phone** (2026-10-13). On every screen (Fede's choice), the
  attack button is in the bottom-right corner, the action button on top of it and the dodge button left
  of it; on a screen narrower than 528 px the link card goes above them. Done 2026-10-13, commit
  `d0b85aa`.

- **Remake the main menu** (2026-10-13). The menu has a painted pixel-art logo of World of Kandrax at the
  top (`art/menu-logo.ts`, `menu/logo.ts`), with a shine now and then; the sign-in and the main screen have
  their buttons at the bottom with no box, and the other screens keep their panel under a smaller logo.
  Done 2026-10-13, commit `ec1be5a`.

- **Sneak sprites and animations for players** (2026-10-13). A player that sneaks on purpose now
  crouches, with eight frames of a sneak walk in every skin and in the wanderer; it stays in the crouch
  when it stops after a sneak walk (Fede's choice), until a walk, an attack, a roll, a hit or water.
  Done 2026-10-13, commit `eeee5fe`.
