# To do

> **Draft** · Fede's list of things to do later (since 2026-10-13). Fede gives an item at any time,
> between developments: write it here, with where it is in the code; do not fix it at once. Work on an
> item only when Fede asks; then move it to "Done" with the date and the commit.

## Open

- **Levels: players level up; mobs and NPCs have levels** (2026-10-13). A character can rise in
  level (now every character is level 1, Fede's decision of 2026-10-13), and the mobs and the NPCs
  have levels too. Code: `LEVEL`, `PROFICIENCY_BONUS` and `levelHp()` in
  `packages/engine/src/traits.ts` (fixed constants now); `MobStats.xp` in
  `packages/engine/src/mobs.ts` (every mob kind has the XP of its SRD stat block, but nobody gets it);
  `sizeEncounter()` and the XP thresholds of level 1 in `packages/engine/src/encounters.ts`; the hit
  points and AC of NPCs that fight in `packages/engine/src/guards.ts` (`hp`, `ac`) and
  `packages/engine/src/companions.ts` (`hp`, `COMPANION_AC`); the sneak attack dice in `traits.ts`;
  the store keeps no level or XP (`packages/engine-server/src/store.ts`); `docs/drafts/level-3.md`.
  Ask Fede: how does a character get XP (kills, quests, both)? How does a level of a mob or an NPC
  show and what does it change (the 5e challenge rating, or a level that scales its numbers)?

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

- **A title when the player changes dominion** (2026-10-13). The name of a land shows over the screen at
  each crossing, in both directions: the Iron Sovereignty (from the north edge of Ironhold south), the
  Mithril Enclave (round Silverspring only, Fede's choice) and the Wildlands (`WorldSource.lands()`,
  `LandCrossings`). Done 2026-10-13, commit `de5509f`.

- **A lamp in Ironhold blocks an alley** (2026-10-13, a bug). The lamp at the north end of the alley
  between the smithy and the chandler moved one tile west, and two more things that closed ground in
  Ironhold moved too; new tests walk each alley and check that no thing of a town closes a way.
  Done 2026-10-13, commit `180013e`.

- **A cycle of day and night** (2026-10-13). One day and one night of the Wilds last 48 real minutes,
  at the same hour for every player (from the real clock); the darkness falls at dusk and lifts at
  dawn, noon is dim and overcast, and the lights fade out by day (`daytime.ts`, `Lighting`). Done
  2026-10-13, commit `d3c07ff`.

- **Things that follow the hour** (2026-10-13). By day (6:00 to 20:00) the forest of the tutorial has
  rare bandits that ambush in groups of 1 to 3 in place of the goblin patrols, and each area gives its
  mobs by day and at night (`MobArea`); at night the people without a post go home; the music has night
  forms, the ambience a day and a night, with stingers at dawn and dusk; the lamps and the lit windows
  are unlit by day. Done 2026-10-13, commits `b5cdd0a` to `17c2775`.
