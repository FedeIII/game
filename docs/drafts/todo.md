# To do

> **Draft** · Fede's list of things to do later (since 2026-10-13). Fede gives an item at any time,
> between developments: write it here, with where it is in the code; do not fix it at once. Work on an
> item only when Fede asks; then move it to "Done" with the date and the commit.

## Open

- **The traits list is hard to read** (2026-10-14). The list of what the scores and the gear of a
  character give in each area of the game is difficult to understand: it is too long, and its layout
  does not help. It shows in the "You" section of the settings (the player profile) and in step 2 of
  the character builder. Now it is one flat list of about 38 terms and values, with no groups by
  ability or by area of the game.
  Code: `traitsList()` in `packages/engine-client/src/ui/traits-list.ts`; the texts in
  `STRINGS.traits` (`ui/strings.ts`, `ui/strings-es.ts`); the styles `.traits` in
  `packages/engine-client/src/style.css`; used in `ui/you-section.ts` and `menu/builder.ts`
  (`.builder-traits`).

- **Sections in the journal: quests, hints, regions** (2026-10-14). The journal must have three
  sections: the quests, the hints and the regions. Now it shows only the quests, in two parts: the open
  quests and the finished quests.
  Code: `JournalPanel` and `journalEntries()` in `packages/engine-client/src/ui/journal-panel.ts`; the
  texts in `STRINGS.journal` (`ui/strings.ts`, `ui/strings-es.ts`); the styles `.journal-*` in
  `packages/engine-client/src/style.css`. Possible sources: for the hints, the tips of the tutorial
  (`ui/tips.ts`, `TipStore`) and the lore (`Interaction.lore`); for the regions, the lands
  (`WorldSource.lands()`, `LandCrossings` in `render/place-titles.ts`), the places with a title
  (`WorldSource.placeTitles()`) and the landmarks (`WorldSource.landmarks()`).
  Ask Fede: what goes into "hints" (the tips already seen, clues from NPCs and books, or other)? What
  goes into "regions" (the lands and places that the character found, with a line about each)? Does the
  server keep them, as it keeps the quest book?

- **Two changes to the brace** (2026-10-14). Two items of Fede for the brace:
  1. A held step back keeps the brace. While the player holds the step back (the "back" button) in a
     brace, the player stays in the brace stance. When the player releases it, the brace ends if more
     than the normal brace time (`BRACE_TICKS`, 0.3 s) passed since the brace started; else the brace
     goes on until that time passed since its start. Now a brace always lasts `BRACE_TICKS`, and a step
     back that is still held after it is a walk (AC-CMB-013.2).
  2. No sure evade in a brace. The brace must not evade a blow by itself (or give any other sure
     effect). In its place, a brace makes a miss of the mob more probable, in proportion to the DEX of
     the player. Now a blow or an arrow that reaches a braced player gets no attack roll: the player
     evades it where it stands (`evadeBlow()`, `EVADE_TICKS`), and no mob can hit it in the evade.
  Code: `stepPlayer()` in `packages/engine/src/player.ts` (the brace after `movesBack(move,
  player.aim)`; `BRACE_TICKS`, `BRACE_BACK`, `PlayerState.brace` and `evade`, `evadeBlow()`,
  `canBeHit()`); the calls of `evadeBlow()` before the attack roll in `Horde.attack()`
  (`packages/engine/src/mobs.ts`) and in the swing of a guard (`packages/engine/src/guards.ts`);
  `attackRoll()` in `packages/engine/src/dice.ts`; the AC in `armourClass()` (`gear.ts`); the tests in
  `packages/engine/test/brace.test.ts`; REQ-CMB-013 in `docs/features/game/combat.md`;
  `docs/drafts/combat-melee.md`.
  Ask Fede: how much more does a mob miss: for example the DEX modifier added to the AC in a brace, or
  another scale? Does a blow that reaches the brace (a hit or a miss) end it? Do the evade pose, the
  word "evade" and its sound go, or do they show on a miss in a brace?

- **An attack ends the sneak** (2026-10-14). When a player attacks from the sneak stance, the player
  must leave the sneak. Now the crouch stops only for the attack: the sneak walk of C (`sneakWalk`)
  stays on, so after the attack the player crouches and walks at the sneak speed again.
  Code: `sneakWalk`, the C key, `readInput()` and `sneakingShown()` in
  `packages/engine-client/src/game.ts`; `PlayerView.crouched` and the crouch in `update()` in
  `packages/engine-client/src/render/player-view.ts`; `isSneaking()` in `packages/engine/src/player.ts`
  (a player that stands still also sneaks for the mobs); `others.ts` (the crouch of the other players).
  Ask Fede: does the slow walk (a small push of the joystick) also leave the sneak after an attack, or
  only the sneak walk of C? Does the player stand up from the crouch after the attack?

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
  are unlit by day. Fede's answers after it: the wildlands have fewer imps and brutes by day, a new
  character on the road meets one goblin patrol by day (`FIRST_GOBLINS`), and a lamp says another line
  by day. Done 2026-10-13, commits `b5cdd0a` to `17c2775`, and `0c6d498`.

- **Levels: players level up; mobs and NPCs have levels** (2026-10-13). A character rises from level 1
  to 5 with the XP of 5e, from kills (a tenth of the 5e XP of the mob's challenge rating, for each
  character that hit it) and quests (more than half of the XP); the level of a mob or a guard is its CR,
  only for the calculations; the vitals show the level and a gold bar, and an admin can change the
  divisor for its own characters (`docs/features/game/levels.md`). Done 2026-10-14, commit `8a8f177`.
