# To do

> **Draft** · Fede's list of things to do later (since 2026-10-13). Fede gives an item at any time,
> between developments: write it here, with where it is in the code; do not fix it at once. Work on an
> item only when Fede asks; then move it to "Done" with the date and the commit.

## Open

- **Calmer music for the last card of the prologue** (2026-10-13). The last card of the prologue (Fede
  says "the intro": the card with the hut, the character's name and Thrain's letter) gets calmer music.
  Now the music of that card is the rise of the theme (`KANDRAX_RISE`: the choir and the violins), which
  starts on the card of the gods (`crescendo`). Code: the cards in `worlds/wilds/src/prologue.ts` (the
  last card, `scene: 'hut'`; `PrologueCard.crescendo` in `packages/engine/src/world.ts`); the music in
  `packages/engine-client/src/ui/prologue.ts` (`audio.playMusic(KANDRAX_OPENING, 3)`, `rise()`, which
  changes the music on a beat with `audio.nextMusicBeat()`; `sceneAmbience()`); the theme in
  `packages/engine-client/src/audio/themes/kandrax.ts`. Ask Fede: which music: the opening of the theme
  again (`KANDRAX_OPENING`), a quiet part of the theme, or a new piece?

- **The tail of a bubble at the edge of the screen** (2026-10-13, a bug). A speech bubble stays inside
  the screen: near an edge it moves to the side, but its tail stays in the middle of its bottom, so the
  tail does not point at the head of the speaker. A wide bubble (the line of a long text) moves more,
  so this shows more often. The fix: put the tail under the anchor, within the bubble's bottom edge.
  Code: `SpeechBubble.update()` (where it keeps the bubble inside `view`) and `draw()` (the tail's
  position) in `packages/engine-client/src/render/speech-bubble.ts`.

- **Music and sound effects in the main menu** (2026-10-13). The main menu (the menu before the game)
  gets music and sound effects. Now it has none: the menu code does not use `audio`; only the sound
  context starts there, on the first click, touch or key (`audio.listen()` in `run()`, `game.ts`).
  Code: the menu in `packages/engine-client/src/menu/menu.ts` (`runMenu()`, its screens and buttons)
  and `menu/builder.ts`; the music with `audio.playMusic(track, fade)` (`audio/audio.ts`; the prologue
  does it in `ui/prologue.ts`), the themes in `audio/themes/` (`kandrax.ts`); the GUI effects in `FX`
  (`audio/fx.ts`: `uiOpen`, `page`, `uiClick`, `uiSelect`). The menu's "Settings" has no "Sound"
  section (`ui/sound-section.ts`, now only in the game's settings panel). Ask Fede: which music (the
  theme of Kandrax or a new piece)? Does the game menu of Escape (`ui/game-menu.ts`) get them too?

- **The standard of Bronzehold shows the phoenix of the Seekers** (2026-10-13, a bug). The standard in
  the street of Bronzehold (the thing `S`, `BRONZEHOLD_THINGS` in `worlds/wilds/src/hamlets.ts`) says
  "The standard of the Iron Sovereignty: an anvil on wine red.", but it uses the one frame of the kind
  `standard` (`standard()` in `packages/engine-client/art/fixtures.ts`): the grey cloth with the red
  phoenix of the Ashen Seekers (their camp, story phase 8). The fix: a look for the Sovereignty, now that
  `Fixture.look` gives the style of a thing (`fixture/standard/iron`: an anvil on wine red), and
  `look: 'iron'` on the standard of Bronzehold.
- **The signpost in the story documents** (2026-10-13). `docs/story/world.md` (the table of the
  northern edge of the Sovereignty) says that the signpost by the hut reads "IRONHOLD". The code
  (`signpost()` in `worlds/wilds/src/road.ts`) says "It reads: WHITEGROVE, BRONZEHOLD, IRONHOLD. The arrow
  points west, along the road." Correct the story document.

- **New places for the action buttons on a phone** (2026-10-13). Fede wants the attack button at the
  bottom right, the action button (interact) on top of it, and the dodge button (roll) to its left.
  Now the action button is at the bottom right, the attack button left of it and the dodge button left
  of that, all three in one row.
  Code: the positions in `packages/engine-client/src/style.css` (`#action`, `#attack`, `#dodge`:
  `right` and `bottom` from `--ui-margin`); the buttons in `ui/action-button.ts`, `ui/attack-button.ts`,
  `ui/dodge-button.ts`. The link card (bottom centre, above the buttons) can need a new place. Update
  the GUI section of `CLAUDE.md` ("Bottom right: the action button, left of it the attack button...").
  Ask Fede: is the new layout for touch screens only (`@media (pointer: coarse)`), or for every screen?

- **Remake the main menu** (2026-10-13). An impressive title of the game, World of Kandrax, at the top
  of the screen, and the buttons of the menu at the bottom, with no box round them. Now the menu is
  one panel in the middle of the screen (`main.menu-panel`: a border and a dark background) over the
  picture of Nivalia; the panel has the title (`h1.menu-name`, italic Georgia 34 px) and the site, and
  under them the screen (on the main screen the buttons in `div.menu-actions.menu-stack`, the account
  line and the language).
  Code: `runMenu()` (the panel and its header) and `main()` (the main screen) in
  `packages/engine-client/src/menu/menu.ts`; `backdrop()` there and `art/menu-art.ts` (the picture);
  the styles `.menu-panel`, `.menu-head`, `.menu-name`, `.menu-actions` in
  `packages/engine-client/src/style.css`; `docs/features/game/main-menu.md`.
  Ask Fede: is the title text (the pixel font, or a serif) or a painted logo in the art? Do the other
  screens of the menu (sign-in, builder, continue, settings) keep their panel?

- **Sneak sprites and animations for players** (2026-10-13). A player that sneaks gets sprites and
  animations of its own. Now a sneaking player uses the normal stand and walk frames, only a little
  darker (`SNEAK_TINT`), with a smaller torch.
  Code: the skin sheet in `packages/engine-client/art/skins.ts` (`renderSkinSheet()`: the columns of
  stand, walk, attack, roll and fall; bump `SKIN_VERSION`); the poses in `art/figure.ts` (`figure()`,
  `FigureAction`) and `art/attacks.ts` (as `rollParts()`, `fallParts()`); the atlas wanderer in
  `art/characters.ts` (`player/<view>/roll/<i>`, `.../fall/<i>`); the choice of frame and `SNEAK_TINT`
  in `packages/engine-client/src/render/player-view.ts` (`PlayerState.sneaking`); the other players in
  `render/others.ts` (`isSneakWalk()`); the rule in `isSneaking()` (`packages/engine`).
  Ask Fede: does a player that stands still and sneaks get a crouch too, or only the sneak walk?

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
