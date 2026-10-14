# To do

> **Draft** · Fede's list of things to do later (since 2026-10-13). Fede gives an item at any time,
> between developments: write it here, with where it is in the code; do not fix it at once. Work on an
> item only when Fede asks; then move it to "Done" with the date and the commit.

## Open

- **The ability tag before the line of a gated action** (2026-10-14). When an action uses an ability
  (for example the player forces a barred door, or picks the lock of a chest), the line that the
  player says starts with the tag of the gate: "[STR 13]", "[DEX 13]" or the equivalent. The tag has
  a slightly smaller font and a slightly different colour. Now the line has no tag: "The boards
  break.", "The lock clicks open. I find ...". A tag shows now only in a line of a clue, for a
  character 1 or 2 under the gate (`shortOf()`, `gateView()` 'hint').
  Code: `say()` (`speech.show([line], playerHead, now)`), the door (`result === 'forced'`,
  `STRINGS.forced`) and `chestLine()` (`fixture?.lock`, `STRINGS.picked`) in
  `packages/engine-client/src/game.ts`; `STRINGS.forced`, `picked` in `ui/strings.ts` and
  `ui/strings-es.ts`; `gateTag()` in `ui/conversation.ts`; `FORCE_GATE`, `PICK_GATE` in the engine;
  `SpeechBubble` and `wrapBubble()` in `render/speech-bubble.ts` and `render/text-layout.ts` (one font
  and one colour in a bubble now); `PixelFont` (`'small'`) in `render/pixel-text.ts`; the small font
  `SMALL_GLYPHS` in `packages/engine-client/art/font.ts` (it has no "[" and "]" now).
  Ask Fede: which other actions get a tag (for example the wade through shallow water (STR 13),
  "Dig here" at the cache and "Gather the herbs" (seek, WIS), the herbs of Medicine (WIS 13), the
  lift of the cart (STR 13), a lore page (INT 13))? Which colour for the tag?

- **Rolls by encumbrance and Dexterity** (2026-10-14). The roll of a dodge must be different with the
  encumbrance and the Dexterity of the character: the ticks in which no mob can hit it, the stamina
  that it costs, how often it can roll, and other parameters. First make a list of all the parameters
  that can change (a brainstorm), and show it to Fede before the build. Now every roll goes 32 px
  in 15 ticks (`DODGE_DISTANCE`, `DODGE_TICKS`), no mob can hit it in all of those ticks, and it
  costs 35 stamina (`DODGE_STAMINA`); only the time between rolls changes with DEX
  (`dodgeCooldown`: `DODGE_COOLDOWN_TICKS` 96 - `DODGE_PER_MOD` 12 x mod). The game has no
  encumbrance now: the items have no weight, and the pack has slots only. The armour has a weight
  class (light, medium, heavy): heavy armour without its STR walks at 3/4 (`tooHeavy()`,
  `HEAVY_SPEED`), and noisy armour lets mobs see a sneaking character from farther (`isNoisy()`).
  Code: `stepPlayer()` (the dodge: `move.dodge`), `roll()`, `canBeHit()`, `canDodge()`, the constants
  `DODGE_TICKS`, `DODGE_DISTANCE`, `DODGE_COOLDOWN_TICKS`,
  `DODGE_STAMINA`, `STAMINA_REFILL`, `STAMINA_REST_TICKS` in `packages/engine/src/player.ts`;
  `StepTraits`, `traitsOf()`, `dodgeCooldown`, `DODGE_PER_MOD` in `packages/engine/src/traits.ts`;
  `tooHeavy()`, `isNoisy()`, `HEAVY_SPEED`, `NOISY_SIGHT`, the armours in
  `packages/engine/src/gear.ts`; the roll frames (`rollPose()`, `rollParts()`) in
  `packages/engine-client/art/attacks.ts`; the roll in `render/player-view.ts`; REQ-CMB of the dodge
  in `docs/features/game/combat.md`; the traits list (`ui/traits-list.ts`).
  Ask Fede: what is the encumbrance: the weight class of the armour, the items in the pack, a new
  weight for each item, or a mix? Does a heavy roll also look different (new frames)?

- **Variants for the random huts of the Wilds** (2026-10-14). The random houses of the Wilds must
  have variants. Now every random house has the same look: no `style` (so `DEFAULT_STYLE`, stone
  walls and a slate roof), a wood floor (`Ground.Floor`), no windows and no roof props. Only the size
  (7-11 x 6-9 tiles), the door column and the furniture change.
  Code: `generateHouse()` and `furnish()` in `worlds/wilds/src/houses.ts`; the floor of a house in
  `worlds/wilds/src/source.ts` (`house.id === HOME_ID ? Ground.FloorEarth : Ground.Floor`); the home
  as an example of a style (`style: { walls: 'timber', roof: 'thatch' }`, a window, a chimney) in
  `worlds/wilds/src/home.ts`; `Building.style`, `windows`, `roofProps` and `DEFAULT_STYLE` in
  `packages/engine/src/buildings.ts`; `WALL_STYLES`, `ROOF_STYLES`, `ROOF_PROPS` in
  `packages/engine-client/art/buildings.ts`; the tests of the houses in `worlds/wilds/test/`.
  Ask Fede: which variants: the wall and roof styles, the floors, windows and chimneys, other shapes
  (not only a rectangle), the furniture? Do the variants follow the land (the forest of the
  Sovereignty, the wildlands)?

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

- **Separate the settings and the character in the game** (2026-10-14). The settings button at the top
  right is now a "Character" button (a head and shoulders) that opens the character panel; the settings
  are a second screen of the game menu ("Settings", its last choice, with the admin's display and
  experience), and "Main menu" and "Sign out" are choices of the game menu. Done 2026-10-14, commit
  `21a0e43`.

- **The traits list is hard to read** (2026-10-14). The list now starts with the key numbers in tiles
  (AC, HP, attack, damage), then a card for each ability with its score and its rows (Fede's choice:
  by ability); a value is bright, dim or pale red as it compares with a score of 10, and the cards go
  in two columns where they fit. Done 2026-10-14, commit `9663416`.

- **Sections in the journal: quests, hints, regions** (2026-10-14). The journal has three tabs:
  "Quests", "Tips" (the tips that the player has seen; Fede chose "Tips" in place of "Hints") and
  "Regions" (the lands and places that the character has seen, each with a line of lore). Done
  2026-10-14, commit `32ec9e3`.

- **Two changes to the brace** (2026-10-14). A brace now goes on while the player holds the step back
  (at least 0.3 s), and it gives no sure evade: a mob's attack in it rolls against AC + 2 + the DEX
  modifier, at least + 1 (Fede's choice); a miss keeps the brace and shows the evade as a look only.
  Done 2026-10-14, commit `ee9e054`.

- **An attack ends the sneak** (2026-10-14). An attack now turns the sneak walk of C off, and the
  player stands up after it; a small push of the joystick still sneaks (Fede's choices). Done
  2026-10-14, commit `20a3f97`.

- **A new step back for each brace** (2026-10-14). A step back held into a melee attack no longer
  braces: the player lets it go (any move that is not back) and presses it again, in the attack or in
  the 0.15 s after it. An attack costs stamina by its weapon (light 4, plain 6, heavy 10, the longbow
  too; with too little, the next attack waits twice as long), stamina does not fill in a brace, and
  guards and companions do not pay (Fede's choices). Done 2026-10-14, commit `6a652fe`.

- **The player always faces the mouse** (2026-10-14). A player that stands faces the mouse pointer
  (`MoveInput.face`, `facingToward()`; protocol 45, so the others see it); a player that walks faces its
  walk, and a roll in place goes towards the pointer (Fede's answers; REQ-CMB-014). Done 2026-10-14,
  commit `ac780a1`.
