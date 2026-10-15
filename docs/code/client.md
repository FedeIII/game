# The engine client (`packages/engine-client/src`)

This file is part of the documents of the code (see the map in `CLAUDE.md`). Read it before you
change its part of the code, and change it in the same commit as the code.

- `game.ts`: `startGame()`: in an app with accounts, first the menu (`menu/`); then it picks the
  world (`?world=`), makes the layers, renderers and GUI, runs the fixed-step loop, and the
  action flow (doors, pages, links). The atlas loads while the menu shows. In a shared world it
  makes a `NetSession` and the tick goes through it.
- `menu/`: the menu before the game (see `docs/code/menu-and-accounts.md`): `menu.ts`
  (`runMenu()`: sign-in, main screen, continue), `logo.ts` (`MenuLogo`: the logo of the game at the
  top, its scale in whole device pixels and its shine), `builder.ts` (the character builder),
  `portrait.ts` (a skin in the menu, walking or still), `names.ts` (random names per race),
  `api.ts` (the accounts API), `dom.ts`, `resume.ts` (after a reload for a new build, the menu
  starts the same character at once: a note in sessionStorage `game.resume.v1`, good for one start
  within 5 minutes; the game menu notes a screen in the same way: `game.menu-screen.v1`).
- `sandbox.ts`: the sandbox of an admin (see "The sandbox of an admin" in `docs/code/combat.md`):
  `SandboxFight` (the foes, the start again, the log of a fight), `sandboxRules()`, `sandboxTraits()`,
  the kept choice (`loadSandbox()`, localStorage `game.sandbox.v1`); its panel is `ui/sandbox-panel.ts`,
  its words `render/mechanic-words.ts`, and the hold of the dodge input for its guard stance
  `input/dodge-hold.ts`.
- `skins/`: the skin seed of a guest (`seed.ts`, localStorage `game.skin.v1`, `?skin=`), the Web
  Worker that renders skins (`skin-worker.ts`) and `SkinStore` (textures, render queue,
  localStorage cache of rendered sheets, which drops the sheets of an older `SKIN_VERSION`;
  `cancel()` drops a look that the builder no longer shows).
- `net/session.ts`: the connection to the multiplayer server (prediction while online, alone
  while not, reconnection). See `docs/multiplayer.md`.
- `render/`: `camera.ts` (pixel-perfect zoom), `terrain.ts` (ground chunks drawn into render
  textures; trees and rocks as depth-sorted sprites), `buildings.ts` (walls, doors, roofs,
  signs; fades the roof, the sign and the front wall while the player is inside; a building with
  storeys shows from the player's storey up, with the floor of that storey in `floorLayer`),
  `fixtures.ts` (furniture, props, NPCs, portal glows; gives the lights of fixtures; the plate with
  the name of a name sign, in the sign layer: `Fixtures.plate()`),
  `unlit.ts` (the lamps and the lit windows by day: the unlit frame `<frame>/unlit` under the lit one,
  which shows with the alpha `litAlpha()` of the sky's lights; `dayFrames()`),
  `player-view.ts` (8-frame walk in a set of player textures, a skin or the atlas wanderer, the crouch and
  the sneak walk of a player that sneaks (`PlayerView.crouched`), the brace and the evade (the frames,
  and a sway of 2 px back from the way of the attack), the jump from a brace (its frames, lifted over
  the shadow on an arc of at most 5 px, `JUMP_LIFT`), and a faint copy above the props
  that shows the player through trees), `others.ts` (the other players of a shared world, with
  their torches and their names; the server sends only those within 30 tiles, `PLAYER_SEND_RADIUS`),
  `name-tag.ts` (a name over a head, in the small font: the other players', the companions' and the
  visitor's own; without a chosen name, `skinName()` of the look; it shows only while its player is on
  the screen or within 2 tiles of it, `TAG_MARGIN`, and fades out farther away; the visitor's own name
  also hides in a fight and while it moves, and comes back after 2.5 s calm and still: `NameCalm`), `lighting.ts` (the light map: darkness with a hole for each light; the sky of the hour scales it each frame),
  `crt.ts` (the CRT shader), `pixel-text.ts` / `text-layout.ts` (the pixel fonts: `new
  PixelFont(art)` or `new PixelFont(art, 'small')`),
  `place-titles.ts` (`PlaceArrivals` and `LandCrossings`: when the name of a place or a land shows over
  the screen; see "Arrival in a world" in `docs/code/world-model.md`),
  `speech-bubble.ts` (pages of text over a head, above the darkness; a short text wraps at 104 world
  pixels, and a long one makes a wider bubble, at most 208 pixels or the width of the screen:
  `wrapBubble()` in `text-layout.ts`; a bubble stays inside the screen, and its tail then moves along
  its bottom edge to stay over the speaker: `placeBubble()`; a line that starts with the tag of a gate,
  "[STR 13] The boards break.", shows the tag in the small font and in old gold: `splitTag()`), `marks.ts` (the marks at the
  edge of the screen: the mobs that hunt the player out of view, the way home), `loot-text.ts` (what a kill
  drops or a pick-up gives, "+3 COINS", rising over the player's head in the small font), `fight-numbers.ts` (what the dice
  of a fight did, as numbers that rise over a mob or the player: the damage, a critical hit in green with no mark, "+7" for hit points back, no word for a miss; in the tiny font, as every text of a fight; green for a good moment of the player, red for what goes against it: `FIGHT_INK`), `piles.ts` (the items on the
  ground: `pile/<kind>` on `pileLayer`, between the ground and the depth-sorted things, a gold spark now and then
  above the darkness, and a very faint shine now and then; a toss shows the items fly from the hands, or out of a
  mob, on an arc to their pile, with one small hop: `pile/<kind>/bare` depth-sorted in `entityLayer`, `pile/shadow`
  under it), `cursor.ts` (the mouse
  cursor `ui/cursor` at the size of a world pixel, in its own layer above the text, without a
  filter).
- `input/`: `keyboard.ts` (KeyboardEvent.code, so WASD works on any layout; keys typed into a
  form field are ignored), `joystick.ts` (floating touch stick), `sneak-walk.ts` (`SneakWalk`: the
  sneak walk of C, which an attack ends) and `mouse.ts` (the mouse over
  `#game`: where it points, which a player that stands faces (`MoveInput.face`), a left click on
  the world, which attacks towards it, and a right click, a dodge; over the world the system cursor
  hides (class `own-cursor`) and `render/cursor.ts` draws the game's).
- `ui/`: the GUI, all HTML over the canvas: `strings.ts` (every engine text the player reads),
  `hud.ts` (hint, debug panel, fatal error), `tips.ts` (the tips of the tutorial, the first time
  of each thing, once in a browser, localStorage `game.tips.v1`: `TipStore`, `TipQueue`, `TipView`
  `#tip`, `tipsControls()`; the hooks are `updateTips()` in `game.ts`;
  `docs/features/game/tips.md`), `action-button.ts` (bottom right; E on a
  keyboard), `link-card.ts` (a real link for a fixture with one), `world-menu.ts` (top right,
  map icon; only in an app with more than one world, so not now), `crt-settings.ts` (the CRT on/off and sliders, `CrtControls`, for an admin only, in the
  settings of the game menu and of the menu, saved in localStorage `game.crt.v2`; `?crt=` / `?nocrt` win over it; `applyCrt()`),
  `character-panel.ts` (top right, the "Character" button, a head and shoulders: `#character`, the character panel, with the content of `you-section.ts`;
  since 2026-10-14, Fede's request: it took the place of the settings panel, and the settings went into the game menu),
  `conversation.ts` (the conversation panel: `Conversation`, the state, and `ConversationPanel`; see "Conversations" in `docs/code/world-model.md`),
  `you-section.ts` (the content of the character panel: the character's picture, name, race and class, level and XP, scores, what they give (`traits-list.ts`, also in the builder: a card for each ability)),
  `xp-section.ts` (the "Experience" section of the settings of the game menu, for an admin only: the divisor of the XP of the kills of its own characters),
  `admin-section.ts` (the "Admin tools" section of the settings of the game menu, for an admin only: see "Admins" in `docs/code/menu-and-accounts.md`),
  `control-list.ts` (`controlList()`: the controls to read, in the settings of the menu and of the game menu),
  `pack-panel.ts` (top right, left of the character button, a bag icon, or I on a keyboard: the twelve worn slots round a picture of the character at 3x (4x on a big screen) with its AC, attack bonus and damage dice under them, and its load and the kind of roll that it gives (`loadLine()`; see "The load" in `docs/code/items.md`) ("Wear", "Take off", a drag on or off a worn slot; see "Equipment" in `docs/code/items.md`), the coins and the slots of the pack, each stack in the slot where the player put it; a drag (mouse or finger) moves a stack onto another slot, or tosses it out onto the world; a press on a slot chooses it, and the detail under the slots says what it is, what it does, the world's line about it (`WorldDefinition.items`) and its weight, with "Drink" or "Chew", "Drop one" and "Drop all"; the button has a red mark when the pack is full), `shop-panel.ts` (`ShopPanel`, `#shop`: the shop of a
  trader, in the place of the top-right panels, opened by an answer of a conversation: the trader's
  close-up and line, "Buy" and "Sell", the coins, the wares with the prices for the character, the
  detail of the chosen ware with its trade, one item at a time, and the pack; `wareRows()`), `belt.ts` (the drink belt under the vitals: a button for each drink that the character can use; keys 1 healing draught, 2 strong draught, 3 antidote, 4 herbs, at any time), `icons.ts` (`drawIcon()`: an item icon into a canvas), `map-panel.ts` (left of the pack, or M: the map of the seen land), `gates.ts` (the gates that only the page uses: reading a mob, the map), `panels.ts` (one top-right panel at a time; each panel covers most of the screen, from under the buttons to a margin where the game shows (`--panel-margin-x`, `--panel-margin-y`), and the controls at the bottom and the drink belt hide meanwhile; from 720 px wide the character and the pack have two columns; the pack's slots grow on a big screen: `--pack-slot`, `--pack-icon`, `--pack-portrait`),
  `new-build.ts` (`BuildWatch`: the page compares its main script, `/assets/main-<hash>.js`, with
  the one that the published page names: every 60 s while it is visible, when it shows again, and
  every 3 s for 2 minutes after a lost connection; nothing in development),
  `presence.ts` (shared worlds only, and for an admin only (Fede's decision, 2026-10-10): how many
  other visitors are here, or why the visitor is alone; a line under the heading of the
  character panel, `#presence`; the others see no presence at all).
- `audio/` (2026-10-12, `docs/features/game/sound.md`): music and sound effects. The music plays on
  **recorded instruments**: samples of the VSCO 2 CE orchestra (CC0) and the FluidR3 choir (CC BY 3.0,
  credited in the Sound settings), built by hand with `npm run sounds` (`sounds/catalog.ts` chooses the
  recordings; `sounds/build.ts` downloads, cuts, measures the pitch and encodes them into
  `src/generated/sounds/*.mp3` and `sounds.json`, both in git; it needs the network the first time).
  `audio.ts` (`audio`, one `AudioEngine`: the context starts on the first click, touch or key; it sleeps
  while the page is hidden or muted; buses for music, effects and ambience; a clock schedules 0.8 s
  ahead), `samples.ts` (`SampleBank`: loads an instrument when a track needs it), `sampler.ts`
  (`playNote()`; long notes by crossfaded copies of a loop), `music.ts` (`scoreTrack()`, the notation
  `line()`/`chord()`/`hits()`, `SEATING`, `LEVELS`), `themes/kandrax.ts` (the theme of the prologue and
  of the menu), `sounds.ts` (`EFFECTS`, `AMBIENCES`), `synth.ts` (synthesized effects), `settings.ts`
  (localStorage `game.audio.v1`). The "Sound" section of the settings (in the game menu and the menu) and the speaker that mutes all:
  `ui/sound-section.ts` (`soundSection()`, `soundToggle()`). **The menus** (2026-10-13): the menu before
  the game plays the opening of the theme (`KANDRAX_OPENING`; after "Create" the prologue goes on with
  it) and clicks, ticks and rustles (`menu/sounds.ts`); the game menu rustles, and the music steps back
  under it (`audio.hushMusic()`). This box cannot listen:
  check a change with `renderOffline()` in a headless page (levels, a spectrogram), and keep every score
  note within 3 semitones of a recorded note (the test checks it). The horn has no samples between C4 and
  D5. A Vite page in a long `page.evaluate` may reload itself: run it again.
  **The music follows the game** (`audio/director.ts`, `audio/game-music.ts`, `audio/themes/`): a mood
  from the place (`WorldSource.soundAreas()`), a hunt, a fight, a dream or a defeat, and stingers for a
  discovery, a quest, a victory, a refuge, a rest, the dawn and the dusk. A new world area: add it to
  `soundAreas()` with one of the moods of `PLACE_MOODS`. A new piece: a composer in `audio/themes/`, a
  track in `MOOD_TRACKS`. **The music follows the hour** (2026-10-13, Fede's choice;
  `docs/features/game/sound.md`, REQ-SND-009): day from 6:00 to 20:00 (`isDaytime()`, as the mobs and the
  NPCs); at night each place plays the night form of its piece (`audio/themes/night.ts`: slower, softer,
  fewer instruments; `NIGHT_TRACKS`, `<place>-night`), the forms crossfade over 10 s, and the stingers
  `dawn` and `dusk` play when the night ends or comes over the music of a place. A new place mood needs a
  `NIGHT_FORMS` entry and a `PLACE_AMBIENCES` entry. The debug panel's `music` line shows the mood, "by
  day" or "by night", the track and the ambience; `?hour=` fixes the hour of the sound too. A headless
  test of a fight: `?offline&mob=imp,brute` (in development the Wilds is a shared world, and `?mob` works
  only alone).
  **The sounds of the game** (`audio/game-sounds.ts`, `audio/fx.ts`, `audio/creatures.ts`): effects for
  the fights, the steps, the things and the GUI, the mobs' voices, the ambience of each place by day and
  at night (`PLACE_AMBIENCES`, `ambienceOf(mood, indoors, night)`: birds, a woodpecker, crows by day in
  the woods; far voices and a forge in a town by day; crickets and owls at night; a room is the same at
  any hour; the hour crossfades them over 12 s) and the sounds near the player (water, fires, fountains,
  forges). The ambience `town` is the prologue's (its scene of the Iron Sovereignty); the game's town has
  `townDay` and `townNight`. A new effect: a recipe in `FX`, and a call from `game.ts`; a new mob kind
  needs a voice in `VOICE_OF` (the test checks it). Check the levels of a change with an offline render
  in a headless page (`renderOffline()`: it leaves out the track's `level`).
- `art/`: the art and the atlas packer (`build.ts`). Output goes to `src/generated/` (in git;
  made again by `dev`, `build` and `typecheck`). See `docs/code/art.md`.

## The CRT

- **The CRT defaults are Fede's choice** (`0.25,1,1,0.1`, set 2026-10-12; before, `0.6,1,1,0`;
  text `CRT_TEXT` = `0.3,0.5,0.5,0.3`, set 2026-10-07): do not change them without a request. The stage has two layers, `worldLayer`
  (full-screen filter) and `textLayer` (filter on the text's bounds plus 8 px of padding), and
  the camera moves `scene` and `textScene` together. The scanlines stay on the game-pixel grid:
  `CrtFilter.setGrid()` every frame; a filter that does not cover the whole screen starts lower
  down (the shader adds `uOutputFrame.y` times `uResolution`). The filter has a WebGL program
  only, so the renderer is pinned to WebGL.
