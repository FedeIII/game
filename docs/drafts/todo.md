# To do

> **Draft** · Fede's list of things to do later (since 2026-10-13). Fede gives an item at any time,
> between developments: write it here, with where it is in the code; do not fix it at once. Work on an
> item only when Fede asks; then move it to "Done" with the date and the commit.

## Open

- **Wider speech bubbles for long lines** (2026-10-13). The text over the player and the NPCs (the
  speech bubble) wraps at a fixed width, so a long line makes a tall, narrow bubble. Let the bubble grow
  wider when the text is longer than usual. Code: `packages/engine-client/src/render/speech-bubble.ts`
  (`MAX_TEXT_WIDTH` 104 world pixels; `font.wrap()`), which the bubbles of NPC lines, conversations
  and the player share; keep it inside the screen ("Speech bubbles stay inside the screen", CLAUDE.md).
- **Name signs at Whitegrove and Bronzehold** (2026-10-13). A sign with the name of the hamlet right
  outside each one, by the road (Whitegrove: by the south end of its lane, `WHITEGROVE_SOUTH`;
  Bronzehold: `BRONZEHOLD_SOUTH`; `worlds/wilds/src/hamlets.ts`), in the style of the Iron Sovereignty.
  They are small hamlets: no title over the screen (the rule below).
- **Titles and signs for settlements: the rule** (Fede, 2026-10-13). Big or important towns and
  villages (important for the story), and ALL cities, get a title over the screen when the player
  arrives, as the name of a world on arrival (`packages/engine-client/src/render/intro.ts`, `IntroTitle`;
  now only `WorldDefinition.intro`, once per world). Small or unimportant towns and villages
  (Whitegrove, Bronzehold) get no title. Every settlement gets a sign with its name, in the style of
  its dominion (the Sovereignty, the Enclave...). Today: Ironhold and Silverspring have no title on
  arrival and no name sign; the only sign is the signpost by the hut (`fixture/signpost`,
  `packages/engine-client/art/fixtures.ts`, which points west only). To build: a title on entering a
  town (a flag on `Town` or a place list, an area like the sound areas, once per visit), and a name sign
  fixture for each dominion's style (art), with Spanish names.

- **Wet lentils fail the lentils quest** (2026-10-13). If the character steps into the water round a
  lake (the shallows, `Ground.Shallows`, where a character with STR 13 wades) while it carries the sack
  of lentils, the lentils are ruined and the quest fails. The sergeant of Bronzehold then pays only a
  part of the reward, and only to a character with enough Charisma (a gate, `PERSUASION_GATE`).
  Code: the quest `LENTILS`, `LENTILS_TAKE`, `LENTILS_GIVE` and `LENTILS_REWARD` in
  `worlds/wilds/src/quests.ts`; the sergeant (`SERGEANT`, node `lentils`) and the farmer (`FARMER`)
  in `worlds/wilds/src/dialogs.ts`; the item `lentils` in `packages/engine/src/items.ts`; the wade in
  `packages/engine/src/player.ts` (`isWading()`, `inShallows()`). The server must see the wade (the
  Room), so that a page cannot hide it; a new step (for example `ruined`) or an item `wet-lentils`;
  a journal line and Spanish forms.

- **Goblin patrols: any number flees** (2026-10-13). Now a startled group always keeps at least one
  goblin that flees and at least one that fights (a group of 3: 1 or 2 flee). Make it random over all
  the numbers: all flee, 2 flee, 1 flees, or none flees and all fight. Code: `Horde.startle()` in
  `packages/engine/src/mobs.ts` (the line `const fleeing = ...`), and its comment; the tests of the
  patrol in `packages/engine/test/` (they can count on "at least one flees"); `docs/drafts/tutorial.md`
  and `docs/features/game/combat.md` (REQ-CMB-009) say how a patrol chooses.

- **A chalice over the door of a shrine, not the word** (2026-10-13). A shrine shows no "Shrine"
  sign over its door; it shows a chalice symbol there instead. Now the shrine of Whitegrove has
  `sign: 'Shrine'` (`worlds/wilds/src/hamlets.ts`, the plan of the shrine; Spanish "Santuario" in
  `text-es.ts`). A sign is text on a board (`Buildings.sign()` in
  `packages/engine-client/src/render/buildings.ts`, the frame `ui/sign`): a symbol needs a new field
  on `Building` (for example `emblem: 'chalice'`), a frame in the atlas (`art/fixtures.ts` or
  `art/font.ts`, in the style of the game), and the renderer. The map label of the refuge
  (`source.ts`, `landmarks()`, "Shrine") can stay. Ask Fede: does the chapel of Ironhold keep its word
  "Chapel"?

- **An empty box at the top centre of the screen** (2026-10-13, a bug). Sometimes a panel with no text
  stays at the top centre. The cause: the control hint `#hint` (`apps/game/index.html`, a `<div>` with
  no class `gone`; the style `#hint` in `packages/engine-client/src/style.css` gives it a border and a
  background). Before 2026-10-13 the game put the controls in it and hid it after 3 tiles of walk. The
  tips (commit e3a4242) took that text away, but the empty box still shows: under a tip it is hidden,
  and while a panel is open (`body:has(...) #hint`), so it shows "sometimes". The fix: start it with
  the class `gone` in `index.html` (it shows only with `Hud.showHint()`, the new-build line), or hide
  `#hint:empty` in the style. Check a screenshot of the game after it.

- **Buy and sell menus for the shops** (2026-10-13). Now a character buys and sells through the
  answers of a conversation, one item for each answer ("The ale, then.", "Sell a ring."). Give the
  shops a menu of their own: a panel with "Buy" and "Sell", the goods with their prices (after
  Charisma), the pack and the coins, in the GUI style. Today's shops (`worlds/wilds/src/dialogs.ts`,
  each `deal:` of an answer):
  - Marta of the Crooked Lantern: the ale (`ALE`) and the room (`ROOM`, CHA 13);
  - Isolde, the apothecary: the three draughts, and a friend's price behind CHA 13;
  - the smith: the gear (`forge()`, `SMITH_PRICES`), buys it back for half (`smithPays()`, from the
    pack only) and buys mithril;
  - Corwin, the peddler: buys rings, cups, candle stubs, horns, tusks and furs;
  - in Silverspring, Tova of the Silver Trout (`TROUT_ALE`, `TROUT_ROOM`) and Ilsa, the jeweller
    (`MITHRIL`, with the permit).
  The cauldron of the apothecary (`CAULDRON`, recipes) is not a shop. The engine: `Deal`,
  `dealPrice()`, `dealPay()` and `findDealAnswer()` in `packages/engine/src/dialog.ts`; the server
  checks each deal in `Room.deal()` (`packages/engine/src/net/room.ts`: the nearness, the gate, the
  conditions, the coins and the items); the page sends `deal` (`game.ts`) from the conversation
  panel (`packages/engine-client/src/ui/conversation.ts`, which adds the price to the answer). To
  keep: the gates (a friend's price), the conditions (the permit), a robber that traders refuse
  (`Dialog.refuse`), and an answer in the conversation that opens the menu. A new protocol version.

- **The name of another player stays on the screen** (2026-10-13, a bug). After two players meet or
  pass near each other, the name of the other one stays on the screen for good. It must go when they
  have parted far enough, or for long enough. The cause: each snapshot carries every player of the
  world (`Room`, `packages/engine/src/net/room.ts`: `p: others`, all of them, near or far), so the
  page keeps a view for each one (`render/others.ts`, `Others.update()`). The name tag stays inside
  the screen (`NameTag.place()` in `render/name-tag.ts` clamps it to the edges, as a speech bubble),
  so the name of a far player sits at the edge of the screen. The figure is far off the screen, so
  only the name shows. The fix: show a tag only while its player is on the screen or near it (a
  margin of some tiles), and fade it out after that (`place(..., visible)` has a switch for it). Also
  think about sending only the players near each player (as the mobs: "the mobs near this player
  only"); that saves bytes and work on a world with many players.

- **Calmer music for the last card of the prologue** (2026-10-13). The last card of the prologue (Fede
  says "the intro": the card with the hut, the character's name and Thrain's letter) gets calmer music.
  Now the music of that card is the rise of the theme (`KANDRAX_RISE`: the choir and the violins), which
  starts on the card of the gods (`crescendo`). Code: the cards in `worlds/wilds/src/prologue.ts` (the
  last card, `scene: 'hut'`; `PrologueCard.crescendo` in `packages/engine/src/world.ts`); the music in
  `packages/engine-client/src/ui/prologue.ts` (`audio.playMusic(KANDRAX_OPENING, 3)`, `rise()`, which
  changes the music on a beat with `audio.nextMusicBeat()`; `sceneAmbience()`); the theme in
  `packages/engine-client/src/audio/themes/kandrax.ts`. Ask Fede: which music: the opening of the theme
  again (`KANDRAX_OPENING`), a quiet part of the theme, or a new piece?

## Done
