# CLAUDE.md

This file gives guidance to Claude Code when it works in this repository.

## What this is

A pixel-art game **engine** for the browser, and the applications on it. The game, **World of
Kandrax**, runs at https://world.kandrax.app (the main address, since 2026-10-13) and at its mirror
https://game.azyr.io (the same files and the same server; see `deploy/README.md`, "Two addresses").
It has one world: **the Wilds** (an endless dark forest with lonely
stone houses, mobs, two hamlets and the town of Ironhold north of the home). A visitor signs in with Google, makes a character (D&D 5e races,
classes, abilities) or continues with one, and starts in the character's home, a hut in the
middle of the Wilds (see "Menu, characters and accounts"). The goal is an online, multiplayer sandbox. The engine has
multiplayer: an authoritative Node server, client-side prediction and interpolation
(`docs/multiplayer.md`); the Wilds are shared since 2026-10-10 (Fede's decision): every visitor
is in the same Wilds, and every new character starts in the home, the house of the cell `HOME_CELL`
(1, 5), south of Ironhold.
An account is signed in on one device at a time. Read `docs/stack.md` before you
change the stack.

**The game and the Town of Azyr are separate (Fede's decision, 2026-10-09).** The town is the
landing page of https://azyr.io. It left this branch at commit `57060cc` and lives on as a
frozen copy of the engine: the branch `town` of this repository. On the VPS, the town has its own
checkout (`/opt/azyr-town`), its own PM2 process (`town-server`, port 3009) and its own web root
(`/var/www/azyr.io/town`). Thus:

- New work on the game goes here (`main`), into the Wilds on game.azyr.io. It never reaches
  azyr.io, and it must not: do not touch the branch `town`, `/opt/azyr-town` or `town-server`
  for the game.
- The town changes only when Fede asks for a town change, and only on the branch `town`. Do not
  merge `main` into `town`. See the town's `CLAUDE.md` (`git show origin/town:CLAUDE.md`; on
  the VPS, `/opt/azyr-town/CLAUDE.md`).

The engine is meant to carry more applications on the VPS (games, demos). Keep the line
between engine and content clean: the engine never knows a world's content, and a world never
reaches into the renderer.

## Where you run

Claude Code works on this repository in two places. Find out which one you are in before you
use the paths, ports and processes in this file: the working directory `/opt/game` is the VPS,
and `uname` gives `Darwin` on the laptop.

- **The VPS** (host `azyrio`, Ubuntu, checkout `/opt/game`): production. The live site, nginx,
  PM2 and the deploy are there. `/root/CLAUDE.md` on the VPS describes the box.
- **A laptop** (Fede's MacBook, macOS, clone `~/Projects/game`): development. It has no nginx,
  PM2, `/opt` or `/var/www`; it deploys over SSH (see "Deploy"). The `vps` MCP server gives the
  documents of the VPS (`list_vps_context`, `read_vps_context`). `brief_vps_claude` sends a
  question to the Claude Code on the VPS: it investigates read-only and then waits for Fede.

Both places can commit to `main`, and GitHub (`FedeIII/game`) is the shared copy. Before you
start work, run `git fetch` and compare with `origin/main`: the other place can have new commits.

## Commands

Node 24 (`.nvmrc`). The VPS has a system Node 24 (`/usr/bin/node`; PM2 uses that path). On the
laptop, use nvm: `nvm use` (`nvm install` the first time). npm workspaces: `packages/*`,
`worlds/*`, `apps/*`.

```bash
npm install
scripts/dev.sh       # the local dev environment: the server (Wilds shared) + the page on 3019; --help
npm run dev          # the app's Vite dev server, http://localhost:3019 (makes the art first; the menu needs npm run server)
npm run check        # type check of every package + Vitest
npm test             # Vitest only
npm run art          # make packages/engine-client/src/generated/ again (atlas + icon)
npm run build        # production build of the app in apps/game/dist
npm run server       # the game server, port 3020: accounts (.dev-data/game.db, dev sign-in), /ws (dev and preview send /api/, /auth/, /ws to it)
scripts/deploy.sh    # on the VPS only: check, build, restart game-server (PM2), publish the client
```

The development ports are 3019 (Vite) and 3020 (the server). They are not production's 3008, and
on the laptop `~/Projects/LOCAL_PORTS.md` gives them to this game. Do not use 3008 or 3009 for a
test: on the VPS they are production's `game-server` and `town-server`. Vite does not move to
another port, because the server refuses an origin that is not in its list.

**Local multiplayer.** `scripts/dev.sh` starts the game server (`node --watch`: it restarts
when its code changes) and Vite, and it opens the page at **http://localhost:3019** (not
127.0.0.1: the session cookie and the Google redirect belong to that name). The server gets the
development settings of the accounts: the database `.dev-data/game.db`, the dev sign-in (a name
only), and `.env.local` (git ignores it) for `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` if
you want the real Google sign-in on the laptop. The Wilds are shared by their definition
(`multiplayer: true`), so two browser profiles see each other; `?offline` plays them alone.
`--inspect` puts the server under the Node inspector on 127.0.0.1:9669. To share a new world in
development before production, set `SHARED_WORLDS=<ids>` (comma-separated): `shareWorlds()` in
`apps/game/src/worlds.ts` gives those worlds `multiplayer: true`, for the page and the server.
`scripts/deploy.sh` clears it; to share a world in production, give its definition
`multiplayer: true`.

**Cursor (or VS Code)**: the play button (F5) starts "Dev: play" (`.vscode/launch.json`): the
task `dev` (`scripts/dev.sh --no-open --inspect`, `.vscode/tasks.json`), the debugger on the
server, and Chrome on the page. "Dev: two players" adds a second Chrome with its own profile
(another account in the dev sign-in). Breakpoints work in the page and in the server. The
database is SQLite inside the server process, so there is no database to launch. After a change
to `scripts/dev.sh`, stop the `dev` task and start it again: `node --watch` restarts the server
with new code, but not with new settings.

Art preview at 4x: `cd packages/engine-client && node art/build.ts --preview /tmp/atlas.png`.

## Layout and layers

| Package | Name | What | May import |
|---|---|---|---|
| `packages/engine` | `@game/engine` | The simulation, pure TypeScript: world model, tiles, collision, movement, buildings, fixtures, interactions, doors, NPCs and their conversations (`dialog.ts`), mobs and fights, the natural-terrain toolkit, the character rules (`character.ts`), what the scores and the gear give (`traits.ts`), items and the pack (`items.ts`), what a character wears (`gear.ts`) and the moves between the pack and the worn slots (`inventory.ts`), the loot of chests and the barred doors over time (`loot.ts`), items on the ground (`piles.ts`), NPCs that follow a player (`companions.ts`), and the multiplayer core (`net/`: protocol, `Room`, `Prediction`, `Remotes`). **No DOM, no PixiJS, no network**: the server imports it as it is. | nothing |
| `packages/engine-server` | `@game/engine-server` | The game server: `startServer()` (Node, `ws`): accounts with Google sign-in, sessions and characters in SQLite (`accounts.ts`, `google.ts`, `store.ts`; `/api/`, `/auth/`), a Room per shared world at `/ws`, limits, heartbeat, `/healthz`. | `@game/engine` |
| `packages/engine-client` | `@game/engine-client` | The browser runtime as a library: `startGame()`, renderers, input, GUI, and the art pipeline (`art/`). | `@game/engine` |
| `worlds/wilds` | `@game/world-wilds` | The Wilds: a `WorldSource` (generated), the towns (the builder `towns.ts`; Ironhold `town.ts`, Silverspring `silverspring.ts`), the roads and the signpost (`road.ts`), and its texts. | `@game/engine` |
| `apps/game` | `@game/app` | game.azyr.io: `index.html`, `src/worlds.ts` (the worlds, for the page and the server; `shareWorlds()`, the dev switch), `src/main.ts` (calls `startGame`), `server/main.ts` (calls `startServer`), Vite config. | all |

Worlds are pure data and functions (no DOM), so a server can run them too.

**To add a world:** a new package under `worlds/` that exports a `WorldDefinition` (`id`, `name`,
`createSource(seed)`, `examine` lines, `darkness`, and `multiplayer: true` to share it), and add
it to the `worlds` list of an app.
A world's source implements `WorldSource` (`packages/engine/src/world.ts`): `chunk()`,
`buildingAt()`, `buildingsIn()`, `fixtureAt()`, `fixturesIn()`, `spawn()`; every method must give
the same answer every time (client and server must see the same world). Reuse the engine's
`naturalGround` / `naturalDecor` for natural terrain. Test it with the engine's rules (see the
wilds tests: wall ring, reachable fixtures).

**To add an application:** a new package under `apps/` like `apps/game` (an `index.html` with
the engine's elements, a `main.ts` that calls `startGame({ worlds, title })`, a Vite config that
defines `__COMMIT__`), its own nginx site and deploy. All apps share the engine's atlas for now;
when an app needs art of its own, give the atlas builder a list of extra frames per app.

### Engine client (`packages/engine-client/src`)

- `game.ts`: `startGame()`: in an app with accounts, first the menu (`menu/`); then it picks the
  world (`?world=`), makes the layers, renderers and GUI, runs the fixed-step loop, and the
  action flow (doors, pages, links). The atlas loads while the menu shows. In a shared world it
  makes a `NetSession` and the tick goes through it.
- `menu/`: the menu before the game (see "Menu, characters and accounts"): `menu.ts`
  (`runMenu()`: sign-in, main screen, continue), `logo.ts` (`MenuLogo`: the logo of the game at the
  top, its scale in whole device pixels and its shine), `builder.ts` (the character builder),
  `portrait.ts` (a skin in the menu, walking or still), `names.ts` (random names per race),
  `api.ts` (the accounts API), `dom.ts`, `resume.ts` (after a reload for a new build, the menu
  starts the same character at once: a note in sessionStorage `game.resume.v1`, good for one start
  within 5 minutes; the game menu notes a screen in the same way: `game.menu-screen.v1`).
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
  `player-view.ts` (8-frame walk in a set of player textures, a skin or the atlas wanderer, the crouch and
  the sneak walk of a player that sneaks (`PlayerView.crouched`), and a faint copy above the props
  that shows the player through trees), `others.ts` (the other players of a shared world, with
  their torches and their names; the server sends only those within 30 tiles, `PLAYER_SEND_RADIUS`),
  `name-tag.ts` (a name over a head, in the small font: the other players', the companions' and the
  visitor's own; without a chosen name, `skinName()` of the look; it shows only while its player is on
  the screen or within 2 tiles of it, `TAG_MARGIN`, and fades out farther away), `lighting.ts` (the light map: darkness with a hole for each light),
  `crt.ts` (the CRT shader), `pixel-text.ts` / `text-layout.ts` (the pixel fonts: `new
  PixelFont(art)` or `new PixelFont(art, 'small')`),
  `place-titles.ts` (`PlaceArrivals`: when the name of a place shows over the screen; see "Arrival in
  a world"),
  `speech-bubble.ts` (pages of text over a head, above the darkness; a short text wraps at 104 world
  pixels, and a long one makes a wider bubble, at most 208 pixels or the width of the screen:
  `wrapBubble()` in `text-layout.ts`; a bubble stays inside the screen, and its tail then moves along
  its bottom edge to stay over the speaker: `placeBubble()`), `marks.ts` (the marks at the
  edge of the screen: the mobs that hunt the player out of view, the way home), `loot-text.ts` (what a kill
  drops or a pick-up gives, "+3 COINS", rising over the player's head in the small font), `fight-numbers.ts` (what the dice
  of a fight did, as numbers that rise over a mob or the player: the damage, "14!" for a critical hit, "miss", "+7" for hit points back), `piles.ts` (the items on the
  ground: `pile/<kind>` on `pileLayer`, between the ground and the depth-sorted things, a gold spark now and then
  above the darkness, and a very faint shine now and then; a toss shows the items fly from the hands, or out of a
  mob, on an arc to their pile, with one small hop: `pile/<kind>/bare` depth-sorted in `entityLayer`, `pile/shadow`
  under it), `cursor.ts` (the mouse
  cursor `ui/cursor` at the size of a world pixel, in its own layer above the text, without a
  filter).
- `input/`: `keyboard.ts` (KeyboardEvent.code, so WASD works on any layout; keys typed into a
  form field are ignored), `joystick.ts` (floating touch stick) and `mouse.ts` (the mouse over
  `#game`: where it points, a left click on the world, which attacks towards it, and a right
  click, a dodge; over the world the system cursor hides (class `own-cursor`) and
  `render/cursor.ts` draws the game's).
- `ui/`: the GUI, all HTML over the canvas: `strings.ts` (every engine text the player reads),
  `hud.ts` (hint, debug panel, fatal error), `tips.ts` (the tips of the tutorial, the first time
  of each thing, once in a browser, localStorage `game.tips.v1`: `TipStore`, `TipQueue`, `TipView`
  `#tip`, `tipsControls()`; the hooks are `updateTips()` in `game.ts`;
  `docs/features/game/tips.md`), `action-button.ts` (bottom right; E on a
  keyboard), `link-card.ts` (a real link for a fixture with one), `world-menu.ts` (top right,
  map icon; only in an app with more than one world, so not now), `settings-panel.ts` (top right: CRT on/off and sliders, for an admin only, saved in localStorage
  `game.crt.v2`; `?crt=` / `?nocrt` win over it; `addSection()` puts a section on top),
  `conversation.ts` (the conversation panel: `Conversation`, the state, and `ConversationPanel`; see "Fixtures, content and actions"),
  `you-section.ts` (the "You" section of the settings: the character's picture, name, race and class, scores, what they give (`traits-list.ts`, also in the builder), "Main menu" and "Sign out"),
  `pack-panel.ts` (top right, left of the settings, a bag icon, or I on a keyboard: the twelve worn slots round a picture of the character at 3x (4x on a big screen) with its AC, attack bonus and damage dice under them ("Wear", "Take off", a drag on or off a worn slot; see "Equipment"), the coins and the slots of the pack, each stack in the slot where the player put it; a drag (mouse or finger) moves a stack onto another slot, or tosses it out onto the world; a press on a slot chooses it, and the detail under the slots says what it is, what it does and the world's line about it (`WorldDefinition.items`), with "Drink" or "Chew", "Drop one" and "Drop all"; the button has a red mark when the pack is full), `shop-panel.ts` (`ShopPanel`, `#shop`: the shop of a
  trader, in the place of the top-right panels, opened by an answer of a conversation: the trader's
  close-up and line, "Buy" and "Sell", the coins, the wares with the prices for the character, the
  detail of the chosen ware with its trade, one item at a time, and the pack; `wareRows()`), `belt.ts` (the drink belt under the vitals: a button for each drink that the character can use; keys 1 healing draught, 2 strong draught, 3 antidote, 4 herbs, at any time), `icons.ts` (`drawIcon()`: an item icon into a canvas), `map-panel.ts` (left of the pack, or M: the map of the seen land), `gates.ts` (the gates that only the page uses: reading a mob, the map), `panels.ts` (one top-right panel at a time; each panel covers most of the screen, from under the buttons to a margin where the game shows (`--panel-margin-x`, `--panel-margin-y`), and the controls at the bottom and the drink belt hide meanwhile; from 720 px wide the settings and the pack have two columns; the pack's slots grow on a big screen: `--pack-slot`, `--pack-icon`, `--pack-portrait`),
  `new-build.ts` (`BuildWatch`: the page compares its main script, `/assets/main-<hash>.js`, with
  the one that the published page names: every 60 s while it is visible, when it shows again, and
  every 3 s for 2 minutes after a lost connection; nothing in development),
  `presence.ts` (shared worlds only, and for an admin only (Fede's decision, 2026-10-10): how many
  other visitors are here, or why the visitor is alone; a line under the heading of the "You"
  section, `#presence`; the others see no presence at all).
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
  (localStorage `game.audio.v1`). The "Sound" section of the settings and the speaker that mutes all:
  `ui/sound-section.ts` (`soundSection()`, `soundToggle()`). **The menus** (2026-10-13): the menu before
  the game plays the opening of the theme (`KANDRAX_OPENING`; after "Create" the prologue goes on with
  it) and clicks, ticks and rustles (`menu/sounds.ts`); the game menu rustles, and the music steps back
  under it (`audio.hushMusic()`). This box cannot listen:
  check a change with `renderOffline()` in a headless page (levels, a spectrogram), and keep every score
  note within 3 semitones of a recorded note (the test checks it). The horn has no samples between C4 and
  D5. A Vite page in a long `page.evaluate` may reload itself: run it again.
  **The music follows the game** (`audio/director.ts`, `audio/game-music.ts`, `audio/themes/`): a mood
  from the place (`WorldSource.soundAreas()`), a hunt, a fight, a dream or a defeat, and stingers for a
  discovery, a quest, a victory, a refuge, a rest. A new world area: add it to `soundAreas()` with one of
  the moods of `PLACE_MOODS`. A new piece: a composer in `audio/themes/`, a track in `MOOD_TRACKS`.
  The debug panel's `music` line shows the mood. A headless test of a fight: `?offline&mob=imp,brute`
  (in development the Wilds is a shared world, and `?mob` works only alone).
  **The sounds of the game** (`audio/game-sounds.ts`, `audio/fx.ts`, `audio/creatures.ts`): effects for
  the fights, the steps, the things and the GUI, the mobs' voices, the ambience of each place and the
  sounds near the player (water, fires, fountains, forges). A new effect: a recipe in `FX`, and a call
  from `game.ts`; a new mob kind needs a voice in `VOICE_OF` (the test checks it). Check the levels of a
  change with an offline render in a headless page.
- `art/`: the art and the atlas packer (`build.ts`). Output goes to `src/generated/` (in git;
  made again by `dev`, `build` and `typecheck`). See "Art".

## Art

Style: dark, desaturated and realistic in proportion, after Diablo and Castlevania. It is
approved: new art must match it. The art is made by code, in `packages/engine-client/art/`.

**The atlas and Android GPUs.** `build.ts` packs one atlas, 1024 px wide; the build fails if it
grows past 2048 px on a side (make it wider then). Each frame repeats its edge pixels 1 px into
the gap round it. And `game.ts` makes every fragment shader ask for `highp`. All three are for
phones: many Android GPUs run `mediump` with 16-bit floats, and on the old 512 x 2995 atlas a
texture coordinate near the bottom was off by 0.7 texel: black lines across the ground tiles,
broken letters (2026-10-08). See "Verify a change in a browser" to emulate such a GPU.


- `sdf.ts`: a small offline renderer for "pre-rendered" sprites. A model is a list of SDF parts
  (sphere, ellipsoid, box, cylinder, round cone, capped cone, with noise displacement) with
  materials. One ray per pixel, one fixed light from the top left, the result put into the
  shades of the material (`ramp`), then an outline and contact lines. Two projections:
  `'pitch'` (default; depth foreshortened: round, small things such as the player, trees,
  rocks) and `'oblique'` (depth not foreshortened, so a model fills whole tiles of the ground
  grid: walls, doors, fixtures).
- `figure.ts`: **the** human figure, as parameters (`FigureSpec`: height, build, head;
  headwear, hair, beard and `beardLength`, cloak cut, body, pauldrons, scarf, pouch, tabard,
  horns, circlet, item; for races and classes `ears`, `tusks`, `nose`, `shield`, `quiver`,
  `antlers`, `feather`, all off by default) and colours (`Palette`). Items: staff, orb staff,
  sword, lantern, axe, mace, dagger, bow. Each part has a bounding sphere, so the figure renders
  fast. A new field must default to off: the atlas (the wanderer, the NPCs) must not change.
- `characters.ts`: the default player (the hooded wanderer, about 28 px tall, 8-frame walk, four
  real views: frames `player/<view>/...`) and the NPC looks (`NPC_LOOKS`: cloak colours, hood up
  or down, hair, and optional `spec` and `palette` that change parts of the wanderer: the
  people of Ironhold `watchman`, `innkeeper`, `priest`, `child`; frames `npc/<look>`), all from
  `figure.ts`.
- `skins.ts`: player skins. A skin is a 32-bit seed that holds the look of a character:
  `appearanceOf(seed)` (`@game/engine`, `character.ts`) gives its race, class and gender (the
  low 9 bits) and a variant (the other 23 bits). The race gives the silhouette (a dwarf short and
  very broad, a gnome or a halfling small, a gnome's head big, an elf tall and slender, a half-orc
  big with grey-green skin and tusks), the skin tones, the hair, beards and pointed ears (elf
  long, half-elf short; they show only with a bare head or a hat). The class gives the garments,
  the headwear, the item and the colour families (a barbarian's fur and axe, a cleric's mace and
  shield, a druid's antlers, a ranger's bow and quiver, a wizard's pointed hat). The gender gives
  the shoulders, beards and the hair; the variant picks the rest. Thus every race, class and
  gender has 2^23 looks. `Skin` is `{ seed, appearance, spec, palette, style? }`. A look
  (`SkinLook`) is a seed and what shows of the gear (`ShownGear`: the main hand, the off hand and
  the armour): `dressSkin()` gives the figure the weapon and the shield that the character wears,
  its armour (medium and heavy armour: a body of metal; splint and plate: pauldrons; no armour: a
  jerkin instead of metal), and the attack style of the weapon (`HELD`; a focus of the class casts, another staff bashes, an empty
  hand casts, strikes with the palm or punches); `skinOfLook()`; `skinKey()` names a look for the
  skin store and its cache (`SkinStore.get(look)`).
  `renderSkinSheet()` gives 4 views x (stand + 8 walk + 4 attack + 4 roll + 2 fall + crouch + 8 sneak
  walk; the first column of each: `SKIN_COLUMNS`) frames of 56 x 56
  (pivot 28, 50: room for a staff over the head or a rapier at full reach; `SKIN_PORTRAIT` is the
  32 x 48 round the figure at rest, for the settings preview). The browser runs it at run time, so `skins.ts`, `figure.ts`, `sdf.ts`,
  `raster.ts` and `image.ts` must not import Node modules (`png.ts` does; that is why `Image`
  is in `image.ts`). `skinName(seed)` names a look without a chosen name (a guest) for its class
  and gender (its own random stream, so the look of a seed never changes with the names). **Bump
  `SKIN_VERSION` when a seed would give another picture or the sheet changes**: browsers cache
  rendered skins under it. Preview many skins before you change them:
  `node art/skins-preview.ts <folder>` (in `packages/engine-client`) writes contact sheets (each
  race by gender and class, variants, views, attacks).
- `props.ts`: spruces, a dead tree and a rock. `materials.ts`: the materials that buildings and
  fixtures share (`M.<name>`).
- `buildings.ts`: building styles. Each wall style of `WALL_STYLES` (stone, timber, planks,
  brick, rubble, gothic, canvas, painted) has walls (`wall/<walls>/<mask>/<variant>`, mask bit
  1 = wall to the north, 2 = east, 4 = west), a door (`wall/<walls>/door/open|closed`, and
  `boarded`: closed, with two planks nailed across it, for a building that is shut) and a lit
  window (`wall/<walls>/window`). Each roof style of `ROOF_STYLES` (slate, shingle, thatch,
  canvas, indigo, battlement, clay, copper) has roof pieces (`roof/<roof>/<row>/<column>/<variant>`);
  all share `roof/shadow`. Roof props (`ROOF_PROPS`: `roof/chimney`, `roof/vane`, `roof/spire`,
  `roof/moon`, `roof/flag-wine`, `roof/flag-green`) have their pivot at their foot. Floors:
  `ground/floor/N` (wood), `ground/floorstone/N`, `ground/floorearth/N`. A wall is a 16x48
  frame: top face (16 px) over front face (32 px). Keep wall tops dark: the torch lights them
  from close by, and a pale top glares.
- `fixtures.ts`: every fixture type, `fixture/<kind>` (and `fixture/portal-glow`, white, which the
  client tints). Footprints must match the boxes in `packages/engine/src/fixtures.ts`. The
  `signpost` points west only (do not mirror it); its post is on the east side of its tile.
  `herbpatch` and `cache` lie low on the ground (hidden things of Wisdom). A thing with a `look`
  has the frame `fixture/<kind>/<look>`: the name sign of a settlement, `fixture/namesign/iron` (the
  Iron Sovereignty: two posts of dark oak with iron caps) and `fixture/namesign/mithril` (the Mithril
  Enclave: two pillars of pale stone, `M.paleStone`, with small gold domes); the page hangs the plate
  with the name between them, see `font.ts`. A new dominion's style is a new look, with its plate and
  its shield. The standard (`fixture/standard`: the grey cloth with the red phoenix of the Ashen
  Seekers) has the look `iron` too (`fixture/standard/iron`: the anvil of pale iron of the shield of
  the Sovereignty on wine red, with a swallowtail; the standard of Bronzehold). The stairs between two storeys (`fixture/stairs`: eight steps over 2 x 2 tiles that rise
  one storey) and the stairwell above them (`fixture/stairwell`: the opening with a railing). The
  palisade of a town (`fixture/palisade/<0-15>`: two rows of sharpened logs; the look is the sides that
  join a neighbour, `PALISADE_SIDES` in the engine: 1 north, 2 east, 4 south, 8 west; a run north to
  south has three columns of logs, so that its tips make one strip).
- `mobs.ts`: the mobs, SDF models in poses: the imp (small, horns, bat wings, claws, tail) and the
  brute (big grey ghoul with tusks and a spiked club). Frames `mob/<kind>/<view>/stand`,
  `.../walk/<0-5>`, `.../windup/<0-1>`, `.../strike/<0-1>`, `.../die/<0-5>`, and
  `mob/<kind>/shadow`. The eyes are a material of their own: the build lists the eye pixels of
  each frame in `meta.mobEyes`, and the game draws them glowing above the darkness. In a death
  the eyes go dark. Preview the frames when you change a model: poses that look right in one
  view can hide the head in another.
- `attacks.ts`: how each skin attacks. `attackStyle(class, spec)`: a sword, an axe or a mace
  slashes (a bard's rapier thrusts), a dagger thrusts (a rogue), a bow shoots (a ranger: the bow
  held out, the string drawn to the chin, the release; the engine flies the arrow), a staff bashes with
  both hands, an orb staff casts a spell, a lantern throws flame; without an item a sorcerer or a
  warlock casts from the hands and a monk strikes with the palm. A caster's spell takes the
  colour of its `palette.glass` (sorcerer fire, warlock green or violet, wizard blue, druid
  green). Each style has four poses (`attackAction`: arm directions, a lean, the weapon
  in the hand, as a `FigureAction` for `figure()`), rendered as the attack frames of a skin sheet
  and as `player/<view>/attack/<i>` (a punch) for the atlas wanderer. All melee attacks reach as
  far: only the look differs. The roll of a dodge: `rollPose()` and `rollParts()` (four frames: the
  figure tucked, `FigureAction.tuck`, and turned forward round its middle by `tumble()` in
  `figure.ts`), in every skin sheet and as `player/<view>/roll/<i>` for the wanderer. The fall of
  a defeat: `fallParts()` (two frames: the figure turns back round its hips, then lies on its
  back), as `player/<view>/fall/<i>` for the wanderer. The sneak: `sneakParts()` (the crouch at
  rest, and eight frames of the sneak walk with short strides: `FigureAction.crouch` bends the
  knees, spreads them a little and brings the arms forward; the lean bends the body forward), in
  every skin sheet and as `player/<view>/crouch` and `player/<view>/sneak/<i>` for the wanderer.
- `fx.ts`: the effects of a fight, white and grey, tinted by the game: the effect of each attack
  style (`fx/<style>/<turn>/<0-3>`: drawn facing right and turned by 0, 22.5, 45 and 67.5
  degrees, each frame cropped to its pixels with its own anchor) and the star of a stun
  (`fx/star`), and the arrow in flight (`fx/arrow/<turn>`, tinted `ARROW_TINT`). `fxPlacement()` (`attacks.ts`) gives the 16 directions: a drawn turn, then a
  mirror and quarter turns, which keep the pixel grid. Do not rotate an effect by another angle.
  Also the ripple round a player in shallow water (`fx/ripple/<0-3>`, in its own colours).
- `ground.ts`: ground tiles from tiling noise (grass, moss, mud, gravel, water, shallow water,
  cobblestones) and the ragged edge pieces. `decor.ts`: small decor as text grids.
- `marks.ts`: the marks at the edge of the screen, white with a dark outline, tinted by the client:
  `ui/danger/<0-15>` (a chevron) and `ui/homeward/<0-15>` (an arrow), drawn at each of the 16
  angles (not turned at run time).
- `items.ts`: the item icons, SDF models of 16 x 16 (`item/<kind>` for each `ITEM_KINDS`, and
  `item/coin`), with materials of their own, a little lighter than the world's: the pack panel
  shows them at 2x on a dark slot. The same models at 0.7 of the size, with a shadow, are the
  items on the ground (`pile/<kind>`, anchor on the point where the item lies); `pile/<kind>/bare`
  is the same without the shadow and `pile/shadow` the shadow alone (an item in the air, the
  shine), and `pile/glint` is the spark over a pile (white, tinted gold; white, it is also the
  spark of a glancing blow on the player). The equipment has models of its own: `cuirass()` (a
  pattern for each armour), `shield()`, `sword()`, `greataxe()`, `mace()`, `longbow()`, `staff()`,
  `amulet()`. Preview new icons on a dark slot before you commit them.
- `menu-logo.ts`: the logo of the menu (`menuLogo()`): "WORLD OF" in the pixel font over "KANDRAX",
  letters cut as vector shapes and painted as metal (bevel, outline, glow, rubies, glints), and the
  frames of a shine under the logo at rest. `build.ts` writes `src/generated/menu-logo.png` and
  `menu-logo.json`.
- `lights.ts`: light holes at the radii of `LIGHTING.radii` (48, 96, 150) and the glow. The
  settings go into the atlas JSON (`meta.lighting`).
- `font.ts`: the pixel font (capitals 7 px, descenders 2 px, white glyphs that the client
  tints; frames `font/<char code>`; metrics in `meta.font`), with Spanish lowercase accents,
  ñ, ¿, ¡, ·, dashes. Accented capitals and curly quotes draw as plain ones. The small font
  (`SMALL_GLYPHS`: capitals 5 px, digits, space and `' - . _ +`; frames `smallfont/<char code>`;
  metrics in `meta.smallFont`) draws lowercase as capitals and an accented letter as the plain
  one; it is for the names over other players. Also the bubble
  (`ui/bubble`, `ui/bubble-tail`), the "more pages" triangle (`ui/more`), the sign board
  (`ui/sign`), the emblems on a sign board in place of a name (`ui/emblem/<name>`: `chalice`, over
  a shrine or a chapel; each with its shadow), the plate of a name sign and the shield over it (`ui/namesign/<look>`,
  `ui/crest/<look>`: `iron`, the iron plate in a wine-red frame and the anvil of the Sovereignty;
  `mithril`, a dark blue plate in a silver frame and the silver peaks of the Silver Columns on blue,
  Fede's choice of 2026-10-13) and
  the mouse cursor (`ui/cursor`: a short sword, 10 x 10, its tip on the hot spot
  at the top-left pixel).

Look at art before you commit it: a preview PNG, or a screenshot of the game with `?nolight`.
Read the PNG with the Read tool. Check a wide patch of ground tiles, not one tile.

## GUI

The GUI is approved in this style; new GUI must match it.

**Two kinds of text, two renderers:**
- **Text in the world** (speech, signs, labels over things) is drawn by the game: the pixel font
  from the atlas, in world pixels, in the text layer (its own CRT settings, above the
  darkness). Use `PixelFont` and frames from the atlas, never HTML. Repeat it in a hidden live
  region (`.sr-only`) for screen readers.
- **The GUI** (panels, buttons, sliders, the hint, the link card) is HTML over the canvas,
  outside `#game`, so a touch on it never moves the player.

For the HTML GUI:
- Colours and fonts come only from the theme variables at the top of `src/style.css`: dark
  translucent panel, thin dried-blood-red border, 2 px corners, parchment text, wine-red accent
  with a soft glow for "active", Georgia serif for words, monospace for numbers.
- Bottom left: the joystick at rest. Bottom right (Fede's layout of 2026-10-13, on every screen):
  in a world with mobs the attack button in the corner, the action button on top of it, and the
  dodge button left of the attack button; in a world without mobs the action button in the corner.
  Bottom centre, above them: the link card (on a screen narrower than 528 px, above the action
  button). Top left: the vitals, and the drink belt in their box. Top right: the worlds button, the pack button and the settings button. Bottom centre, over
  everything there: the conversation panel; while it is open, the joystick, the action and
  attack buttons and the link card hide (`body.conversing`).
- Every engine text the player reads goes in `src/ui/strings.ts` (English) and `src/ui/strings-es.ts`
  (Spanish: the type `Strings` checks that no key is missing); what things say is content and
  belongs to the world, in English, with a Spanish table (`WorldDefinition.texts.es`; for the
  Wilds `worlds/wilds/src/text-es.ts`: a test fails when a text has no Spanish form). See
  "Language".
- A control gives the focus back after use, or WASD stops working (see `SettingsPanel`).
- A link must be a real `<a>` (the link card): a browser opens a new tab from a key press or a
  click, but not from the start of a touch. So E opens the link, and a tap on the action button
  only points at the card's link (`pulse()`); a tap on the link opens it.

## Menu, characters and accounts

Since 2026-10-09 the game starts on a menu (`startGame({ accounts: true })`, `menu/`), HTML in the
GUI style, over the whole page (it scrolls on a phone). **Every visitor signs in to play (Fede's
decision, 2026-10-11)**: there are no guests on game.azyr.io (`?nomenu` works only on a local page,
`GUEST_HOSTS` in `game.ts`), so every player has a stored character (and later a quest book).

- **Sign-in**: "Sign in with Google" (Google's dark button, with the "G"), or in development a
  dev sign-in with a name only (or an email: see "Admins"). After Google, the page shows
  `?login=failed` or `cancelled` once.
- **Main screen**: "New game", "Continue" (off without characters), "Prologue" (only once this
  browser saw it), "Settings" (the controls to read, the language, the sound (`soundSection()`), the
  switch of the tips (`ui/tips.ts`: "Show tips", "Show all tips again"; the game's settings panel has it
  too), and for an admin the CRT settings),
  and "Signed in with Google · Sign out · Delete account · Privacy". Behind the menu: Nivalia at
  sunset in pixel art (`art/menu-art.ts`, `src/generated/menu.png`). **The logo and the layout**
  (Fede, 2026-10-13): the logo of the game, painted in pixel art (`art/menu-logo.ts`,
  `src/generated/menu-logo.png`; `menu/logo.ts`), is at the top; on the sign-in and the main screen
  the buttons are at the bottom of the page, with no box round them (`Layout` `open`); the builder,
  the list and the settings keep their panel under a smaller logo (`panel`). Music and sounds (2026-10-13,
  `menu/sounds.ts`): the opening of the theme of Kandrax, and a speaker at the top right. See
  `docs/features/game/main-menu.md`. "Delete account" asks first, then deletes the account,
  its sessions and all its characters. "Privacy" opens `/privacy/` (`apps/game/privacy/
  index.html`, a second Vite page; its text must say what the server keeps, so change it with
  the data). The sign-in screen links it too. An account keeps at most `MAX_CHARACTERS` (12).
- **New game**, the character builder (`menu/builder.ts`), two steps. 1, Appearance: race
  (human, dwarf, elf, gnome, half-elf, halfling, half-orc), class (barbarian, bard, cleric,
  druid, fighter, monk, paladin, ranger, rogue, sorcerer, warlock, wizard), gender (male, female,
  undetermined), name (2 to 16 characters after `cleanName()`; "Random name" gives an SRD name
  of the race), "Another look" (a new random variant), and a preview that walks and turns.
  2, Abilities: point buy of D&D 5e (SRD 5.1): each score starts at 8, 27 points, at most 15;
  the race's increases (with the SRD subrace: hill dwarf, high elf, rock gnome, lightfoot
  halfling); a half-elf chooses two abilities other than Charisma for +1; the class's main
  abilities are marked. "Create" stores the character and the game starts.
- **Continue**: the account's characters (the last played first), each with its picture; one
  plays it, "Delete" asks first. A character starts where it was last (below, "The place of a
  character").
- In the game, the settings panel's "You" section shows the character, "Main menu" (a reload:
  the menu comes again) and "Sign out".
- **The game is called World of Kandrax** (Fede, 2026-10-12): `GameOptions.name` (`apps/game/src/main.ts`)
  is the page title and the title of the menu and of the game menu; "The Wilds" stays the name of the
  world (the map). The name is the same in Spanish.
- **The prologue** (2026-10-12, `ui/prologue.ts`, `docs/features/game/prologue.md`): nine painted
  scenes of Kandrax (`art/prologue.ts`, `art/prologue-map.ts`, `art/prologue-dominions.ts`,
  `art/prologue-kit.ts`, `art/paint.ts`; their own atlas, `src/generated/prologue.png`, loaded only when
  it plays) with Fede's texts (`worlds/wilds/src/prologue.ts`). The map is Fede's map of Thrain on the
  Drive (`Images/maps/mapa_thrain.png`): a tall layer that rises (`PrologueLayer.rise`), its names in
  one layer for each language (`lang`). A card can have a banner (`PrologueCard.banner`: the two
  dominions), drawn with the pixel font as the name of a world on arrival; `bannerLine` makes it wait
  for the line that names the place (the Iron Sovereignty: its second line). The lines type from left to
  right, one under the other, under the scene or beside it (`prologueLayout()`). It plays once after
  "Create" in the builder, and from "Prologue" in the game menu; `?prologue` plays it for any start.
  It has the theme of Kandrax, an ambience for each scene and small effects, and a speaker button that
  mutes all sound (`audio/`, `docs/features/game/sound.md`). **Only the player leaves a card** (Fede,
  2026-10-13): the lines of a card come by themselves, then the card waits. **The music** is the opening
  of the theme (`KANDRAX_OPENING`, round and round) until the card with `crescendo` (the gods), where the
  rise (`KANDRAX_RISE`: the choir and the violins) comes in on a chord or a beat
  (`AudioEngine.nextMusicBeat()`), however long the player took. The card with `calm` (the hut, the last
  one) brings the coda in the same way (`KANDRAX_CODA`: a clarinet over a harp and soft low strings;
  Fede, 2026-10-13).
- **The game menu** (2026-10-12, `ui/game-menu.ts`, `docs/features/game/game-menu.md`): Escape opens it
  over the game when no other panel, conversation or dream is open (on a touch screen, a faint icon
  under the settings button opens it): "Resume", "Load game" (a reload
  into the list of characters) and "New game" (a reload into the builder). The character stands
  still meanwhile; a world that the page runs stands still too, a shared world goes on. It rustles when
  it opens and closes, and the music steps back to 40 % under it (Fede, 2026-10-13).
- **A new build reloads the page (Fede's decision, 2026-10-10).** After a deploy, an open page
  finds the new build (`ui/new-build.ts`) and reloads itself at a calm moment: no conversation, no
  defeat, no mob that hunts the player. It says "A new version of the game is out. Loading it…"
  first, and the menu then starts the same character again (`menu/resume.ts`).

**The rules** are in `packages/engine/src/character.ts`, for the page and the server alike:
`RACES`, `CLASSES`, `GENDERS`, `ABILITIES`, `POINT_BUY`, `RACE_BONUS`, `CLASS_PRIMARY`,
`checkSheet()` (the server checks every sheet with it) and the look in one number
(`appearanceSeed()` / `appearanceOf()`, see `skins.ts` under "Art"). A character is a
`CharacterSheet` (name, race, class, gender, variant, base scores, bonus choices) with an id and
its times. Its skin seed is `characterSkin(sheet)`. Its texts (names of races, classes and
abilities, one line about each) are in `ui/strings.ts`. What the scores do in the game: "Ability
scores in the game", below.

**The place of a character** (since 2026-10-10): the store keeps where each character was last
(`Character.place`: world, and the centre of its feet in world pixels; `checkPlace()`; the column
`place`). The game starts it there (`resumePoint()`: the exact point if its feet fit, else the
nearest open tile, for example when a door that was open is closed now); `?at=` wins over it.
Who keeps it:
- In a world that the page runs (none now; `?offline`), the page sends it with `PUT
  /api/characters/<id>/place`: every 10 s if the player moved, when the page hides or closes
  (`keepalive`), and before "Main menu" and "Sign out". A guest has no place.
- In a world that the server shares, the server keeps it: when the player leaves, and at each
  heartbeat (25 s). The route refuses such a world (409), so a page cannot move a character there.

**The accounts** are in the game server (`packages/engine-server/src`): `google.ts` (OpenID
Connect with the scope `openid email`, the code flow with PKCE and a state bound to the browser by
a cookie; the ID token comes straight from Google, and the server checks its issuer, audience and
expiry), `store.ts` (SQLite by `node:sqlite`: users, sessions (only a hash of each token),
sign-in states, characters as JSON; a schema version and migrations), `accounts.ts` (the routes;
see its comment). **Keep personal data to a minimum (Fede's decision, 2026-10-10):** an account
is the provider's id (Google's `sub`), its email and its times; the server never asks for or
keeps a name or a picture, so the privacy page stays short. The email is the column `email` (since
2026-10-10, Fede's decision: the server knows the admins by it): each sign-in sets it, and only an
email that Google verified, in lowercase; else ''. Change the privacy page with the data.
`DELETE /api/me` deletes an account with everything in it. **One device at a time (Fede's rule, 2026-10-10):** a sign-in ends the
account's other sessions (`AccountStore.createSession`); the server closes their connections
(`refused` `elsewhere`, protocol 9), and saves the character's place first. A page whose session
ended (any 401, `/api/me` every 10 s, or that refusal) goes to the sign-in screen with
`?login=elsewhere`, which says why. Two tabs of one browser share one session. The session is
the cookie `game_session` (HttpOnly, SameSite=Lax, Secure on https, 30 days, renewed in use).
A request that changes something must have the Origin of one of the game's pages (`ORIGINS`).
In a shared world the server takes the look, the name and the place from the stored character
(`docs/multiplayer.md`, protocol 7). `apps/game/server/main.ts` reads the settings from the
environment (its comment lists them): `GAME_DB` turns the accounts on; in production it refuses
to start without the Google client or with `AUTH_DEV_LOGIN`. Production keeps the secrets in
`/etc/game/secret.env` and the database in `/var/lib/game/game.db`, with a nightly copy that
gpg encrypts (`scripts/backup-db.ts`, passphrase in `/etc/game/backup.passphrase`). See
`deploy/README.md`, "Accounts".

**Admins** (since 2026-10-10): the accounts whose email is in `ADMIN_EMAILS` (comma-separated;
`Accounts.isAdmin()`). Now Fede is the only admin (Fede's decision). The list is in
`/etc/game/secret.env` in production and in `.env.local` on the laptop, never in git: the
repository is public. `/api/me` says `admin`, and the menu gives it to the game. Only an admin sees
the display settings (the CRT switch and sliders); the others get `CRT_DEFAULTS`, and the game
ignores what their browser saved (`?crt=` and `?nocrt` work for everyone). The dev sign-in takes
an email as the name: it then signs in with that email, as Google would, so an admin email there
is an admin.

## Game design

**The story is written in `docs/story/`** (Fede's rule, 2026-10-13): the world and the places as the game
shows them, the people, the questlines (how each quest starts, its steps, what it unlocks or waits for)
and the prologue. The code matches those documents at all points: a change of the story updates them in
the same commit, and a mismatch gets a fix, or at least a plan in `docs/drafts/`.

**Fede's to-do list** is `docs/drafts/todo.md`: when Fede gives an item between developments, write it
there (what, the date, where it is in the code); do not fix it at once.

Fede's rules for the design of the game are in `docs/game-design.md`: read them before you design a
quest, an encounter, a mob or an ability. In short: **no chains of quests in what the player sees**
(events unlock quests; some events wait until another quest is finished), the first quest is to
reach Ironhold (the tutorial), and **combat has few enemies but very strategic fights** (slow,
well-timed moves, the right ability, positioning). **Coins are scarce** (Fede, 2026-10-13): the quests
give more than half of a character's coins, most kills give none, and a chest gives none at times
(`LootTable.coinChance`); `worlds/wilds/test/economy.test.ts` keeps the rule with a model of chapter 1.

## Ability scores in the game

The plan and Fede's decisions are in `docs/drafts/abilities.md`: an application of each score,
one ability at a time (all six are done: Strength, Dexterity, Constitution, Intelligence, Wisdom
and Charisma). Each built feature has its REQ/AC document in `docs/features/` (Fede's rule,
2026-10-10: the format of `platform-docs` in streaming-platform; index `docs/features/README.md`). `packages/engine/src/traits.ts` gives `PlayerTraits`, what the scores of a
character give: `traitsOf(scores, class)`, `sheetTraits(sheet)`, `GUEST_TRAITS` (every score 10:
a guest). The server makes the traits from the stored character (`Room.join(..., { traits,
pack })`); the page makes the same from the same character, so the prediction stays exact. A
client never sends its traits. Two kinds of effect: a scale (a number changes with the modifier,
-1 to +3) and a gate (`Gate`: a fixed limit on a score, 13 by default; `meetsGate()`), never a
roll of a die (the dice roll only in a fight and in a draught: see "Mobs and fights"). **How a
gate shows (Fede's rule, 2026-10-10, for every ability)**: `gateView()`
gives `open` (the score is enough), `hint` (1 or 2 under it, `GATE_HINT`: the thing shows dim
with its tag, `gateTag()`, for example "[INT 13]") or `hidden` (lower: it is not there). The
builder and the "You" section still name every gate.

- **The attack ability (Option B, Fede's decision, 2026-10-10)**: each class strikes with its own
  ability (`ATTACK_ABILITY` in `character.ts`): STR barbarian, fighter, paladin; DEX bard, monk,
  ranger, rogue; WIS cleric, druid; INT wizard; CHA sorcerer, warlock. The class decides the
  ability, not the item in the hand. A blow rolls d20 + `toHit` (`PROFICIENCY_BONUS` 2 + that
  modifier + a magic bonus) against the mob's AC; a hit takes `damage` (`Dice`: the die of the gear,
  see "Equipment", + that modifier + a magic bonus) from its hit points. See "Mobs and fights".
- **Strength**, for every class: the push of a blow (`push`: `knockback` x (1 + 0.15 x mod)), how
  long a mob reels (`stagger`: `hurtMs` x (1 + 0.2 x mod)), the slots of the pack (6 + 2 x mod: 4
  to 12), and two gates of 13: wading through shallow water (`WADE_GATE`; `stepPlayer(...,
  traits)`: half speed, no attack there) and forcing a barred door (`FORCE_GATE`,
  `Building.barred`).
- **The pack** (`items.ts`): coins in a purse and items in slots, each slot one kind up to its
  stack (`ITEM_STACK`). `Pack.items` is the slots in order, null for a free slot (never at the
  end): a stack keeps its slot until it goes, a new one takes the first free slot (`addToPack`),
  and the player moves stacks (`moveInPack`: onto a free slot, a swap, or onto a stack of its kind,
  which it fills; the message `move`). Items: imp horn, brute tusk, candle stub, silver ring, pewter cup, bundle
  of herbs, and three drinks (healing draught, antidote, strong draught: `DRINKS`, `drinkFrom()`;
  the drink belt, its keys 1 to 4, or "Drink" in the pack panel; the server through `drink`). A kill drops loot into the killer's pack (`MOB_LOOT`,
  `Horde.drop()`: an imp a horn in one kill of three; a brute 1 or 2 coins in one kill of three, and a
  tusk in one of two; **coins are scarce**, see "Game design"); what does not fit falls on the ground at the mob, and the player says "My pack is full." In a shared world the
  server owns the pack, and the store keeps it (`Character.pack`, the column `pack`, saved with
  the place); in a world that the page runs, the page has its own, which it does not save.
- **Equipment** (`gear.ts`, `inventory.ts`; since 2026-10-11, Fede's decisions in
  `docs/drafts/equipment.md`; `docs/features/items/equipment.md`): twelve worn slots of D&D 5e
  (`GEAR_SLOTS`: head, neck, cloak, armour, bracers, gloves, belt, feet, two rings, main hand, off
  hand; `Gear`, `Character.gear`, the column `gear`). The items (`WEARABLES`, stack 1): leather
  armour, studded leather, scale mail, chain mail, splint armour, plate armour, a shield, longsword, shortsword, rapier, greataxe,
  mace, longbow, an arcane staff and a druid staff (a focus), the luck amulet (+1 to each score for
  every gate: `PlayerTraits.luck`, on `traits.scores`; attunement), and the silver ring on a finger.
  Nine magic items of the SRD (phase 4b; rare loot: `MAGIC_ITEMS` in `source.ts`): a longsword +1,
  a cloak and a ring of protection (AC +1), bracers of defence (AC +2 without armour or shield),
  gauntlets of ogre power, a headband of intellect and an amulet of health (STR, INT, CON 19:
  `wornScores()`), a belt of dwarvenkind (CON +2), boots of elvenkind (quiet steps). A reach
  weapon, the glaive (phase 4c: d10, heavy, two-handed), hits `REACH_BONUS` (8 px) further
  (`traits.reach`, `Blow.reach`, `attackHits(..., reach)`).
  The 5e rules: proficiency by class (`PROFICIENCY`, `canUse()`), the hands (a two-handed weapon
  takes the off hand off), at most 3 attuned items. **AC** (`armourClass()`: 10 + DEX, the armour,
  a shield +2, a barbarian + CON, a monk + WIS) is what a mob's attack roll must reach; a miss
  glances off (`glancePlayer()`: no damage, no stun; `PlayerState.glance` is the spark). Heavy
  armour without its STR: 3/4 of the walk (`traits.speed`); noisy armour: mobs see a sneaking character from 3/4 (`traits.sneakSight`).
  **Damage** (`attackGear()`, dice): one die of the weapon (`dieBase()`: 1d6, 1d8, 1d12; a
  versatile weapon with an empty off hand its bigger die), an unarmed strike 1, a monk's martial
  arts 1d4, the cantrip of a sorcerer, a warlock or a wizard 1d10 and of a druid 1d8 (an empty hand
  or its focus); a light weapon attacks 2 ticks quicker, a heavy melee one 4 slower; a bow makes the
  attacks arrows for any class (`traits.ranged`); a rogue's sneak attack +1d6 (level 1) on a mob that does not
  hunt it (`Blow.sneak`). **Kits** (`kitOf()`, `sheetKit()`): a new character, and one from before,
  gets the worn part of the SRD kit of its class; a guest the kit of its look (`guestGear()`). The
  traits follow the gear: `traitsOf(scores, class, gear)`; the Room's `traitsFor`, the page's
  `followGear()`. Moves: `moveItem()` and the addresses (`GEAR_BASE` 32 + the index of the worn
  slot) in `move` and `put`, protocol 19. The figure holds and wears what the character
  wears (protocols 20 and 21: `lk`, `RemotePlayer.look`, `dressSkin()` in the art). The smith of
  Ironhold sells and buys gear (see "Shops").
- **Items on the ground** (`piles.ts`, `Piles`; since 2026-10-10, Fede's request): "Drop one" or
  "Drop all" in the pack panel puts items 10 px in front of the player (`dropPoint()`; at its feet
  when a wall, a door, a tree, a thing or water is there) as a pile: one kind, up to its stack. A
  stack that the player drags out of the panel onto the world lands towards that point, at most 3
  tiles away (`tossPoint()`, `TOSS_REACH`: short of a wall, a door, a tree or a thing, across water
  but never on it). Each drop is a toss (`Toss`, `Piles.takeTosses()`; `ts` in a snapshot): every
  page near it shows the items fall. Anybody picks a pile up with the action button ("Pick up 4
  imp horns"; a pile under the feet comes first). A pile goes after 10 minutes (`PILE_MS`); a world
  has at most 400. In a shared world the Room keeps them in memory (a restart of the server clears
  them): `put` (a slot, its kind, a count, and `at` for a toss) and the `g` of an input batch,
  protocol 18. A page that runs its world keeps its own.
- **Loot over time** (`loot.ts`, `Spoils`; a Room has one, a page that runs its world has its
  own): `WorldSource.loot(fixture)` gives a loot table for a chest. One loot per chest for
  everybody: the first one takes it (what does not fit stays in the chest), and the chest fills
  again 30 minutes after it was emptied. A forced door gets its boards again after 30 minutes with
  nobody within 30 tiles, and the chest of its house fills again then (only then).

- **Dexterity**: the time between attacks (`cooldown`: 27 - 2 x mod ticks), the guard after a hit
  (`guard`: 60 + 9 x mod), the time between dodges (`dodgeCooldown`: 96 - 12 x mod), how far mobs
  see the player (`sight`: 1 - 0.08 x mod, half of that while it sneaks: `sightOf()`), the range of
  a ranger's arrows (`range`: 5 + mod tiles; `ranged` for a ranger only), and a gate of 13 for
  locked chests (`PICK_GATE`, `Fixture.lock`).
- **The dodge** (`player.ts`): `MoveInput.dodge` starts a roll of 32 px in 15 ticks (0.25 s) the
  way the input moves (or the way the player faces), in which no mob can hit (`canBeHit`); walls
  stop it, and it does not start in shallow water (it ends there). Shift, the right mouse button
  or the dodge button (`ui/dodge-button.ts`).
- **Sneaking** (`isSneaking()`): standing, or a walk at half speed or slower (`SNEAK_SPEED`; C
  turns the sneak walk on and off; a small push of the joystick). Mobs notice the player only
  within their sight times `HordePlayer.sight`. On purpose (the sneak walk of C, or a slow walk; not
  just standing still) the figure crouches (the crouch and the sneak walk frames), the torch is
  smaller (96, others' 48) and the figure a little darker. A player that stops after a sneak walk
  stays in the crouch (Fede's decision, 2026-10-13) until it walks without a sneak, strikes, rolls,
  falls, takes a hit or wades (`PlayerView.crouched`; the page sees it for the other players too,
  from their speed). A player in shallow water never sneaks. When stamina exists (CON),
  sneaking uses it too (Fede's note, 2026-10-10).
- **Arrows** (`arrows.ts`): every attack with a bow in the hands (the ranger's kit) is an arrow (`Horde.shoot()`), 240 px/s, that
  reaches the first living mob on its way (the attack roll, the damage and the force of the
  shooter's blow) or stops at a thing (`World.shotBox()`: what is solid, except water) or at the end
  of its range; a kill is in `Horde.takeShotKills()`, and the drop goes to the shooter; what each
  arrow did is in `Horde.takeShotResults()` (`bl`). The page of the shooter flies its own copy at
  once (`flyArrow()`) and flashes the mob that it reaches; the others draw the server's (`ar` in the
  snapshot, `render/arrows.ts`).
- **Locked chests**: one chest in three of the Wilds houses that are not barred has a lock (DEX
  13). It opens each time for a character with the gate ("Pick the lock", "The lock clicks
  open."), never for one without ("It is locked. I cannot pick it."); it gives more (1 to 3
  coins in one of two, a second thing in about one of three).
- **Constitution**: hit points (`maxHp` = `levelHp(class, mod)`: level 1 of 5e (`LEVEL`), the hit die
  `HIT_DIE` at its most and the mod; a fighter with CON 10 has 10, a wizard 6; `PlayerState.hp`), a shorter stun (`stun`: x (1 - 0.1 x mod)), no recovery
  (`recover` 0: no HP comes back by itself; only the HP of a companion do, `COMPANION_RECOVER`),
  stamina (`maxStamina` 100 + 10 x mod, `staminaRefill` 20 + 4 x mod per second, 1 s after the last use; a roll costs 35, the sneak walk 8 per second; no stamina: no
  roll, and the sneak walk does not hide), and the length of a poison or a drink (`resist`:
  x (1 - 0.15 x mod)).
- **A hit** (`hitPlayer()`, when the mob's attack roll hits): the rolled `MobStats.damage` and a
  stun; an imp's claws also poison (`poisonTicks` 360: `POISON_DAMAGE` 2 HP every 3 s, never the
  last one). At 0 HP the player is **defeated** (`down`, 3 s: it falls back and lies, mobs leave it, the screen goes dark); then
  it wakes (`wakePlayer()`) at home, or at the nearest refuge that its character has entered
  (`wakePoint()`, `WorldSource.refuges()`: the chapel of Ironhold; `Character.refuges`), with all
  its HP and a guard of 2 s, and a defeat takes half of its coins. The Room wakes it in a shared
  world (`Room.wake`, `settle()` before a save), the page in its own world.
- **Rest**: a fixture with `Interaction.rest` (the bed of the home) gives all HP and stamina
  back and ends a poison or a drink (`rest()`; the server does it through `u`).
- **Deals** (`dialog.ts`, `DialogAnswer.deal`): an answer can buy goods for coins (the ale of the
  Crooked Lantern, 2 coins: `drunk` for 60 s x `resist`, the walk sways); with too few coins the
  conversation goes to `deal.poor`. In a shared world the page sends `deal` and the server
  checks the NPC's nearness (`DEAL_RANGE`) and the coins. The traders have shops (below).
- **Intelligence**: the wizard's attack bonus and damage, and for every class the opening
  (`opening`: + max(0, mod) damage on a mob in its wind-up, after the dice, `rollBlow()`; arrows
  too). Gates in the page (`ui/gates.ts`): read a mob (INT 13 a health bar over it, INT 15 a glint on its wind-up;
  `MobViews.setReading()`), the map (INT 11 houses and paths, 13 names and refuges, 15 barred
  houses and locked chests), lore (`LORE_GATE`, INT 13 in `worlds/wilds/src/dialogs.ts`).
- **Lore** (`Interaction.lore`: a gate and pages): after its own pages, a thing shows its lore
  to a character with the gate, the clue `STRINGS.loreHint` to one 1 or 2 under it (`contentOf()`
  in `game.ts`). The Wilds: the books of the houses (`BOOKS`, `houses.ts`), and in Ironhold the
  lectern, the apothecary's shelf, the reeve's ledgers and map table, the notice board.
- **Gated answers** (`DialogAnswer.gate`): the conversation panel hides, dims (`.dim`, not
  selectable) or opens each one with `gateView()`. `checkDialog()` wants an answer without a gate
  in each node, and a way to end without gates. The reeve has two (INT 13), the apothecary one.
- **The cauldron** of the apothecary (`CAULDRON`, a conversation of a fixture: `Interaction.dialog`
  with `speaker: 'fixture'`): three recipes (draught INT 10, antidote 13, strong draught 15), each
  a deal that takes items (`Deal.items`, `goods` an item kind). The page sends `deal` with `at`
  (a fixture's tile) or `npc`; `Room.deal()` checks nearness (48 px), the answer's gate
  (`findDeal()`) and the items.
- **The map** (`ui/map-panel.ts`, M or the map button): it fills its panel, 256 tiles on its short
  side and more on its long side (the canvas takes the shape of its frame), round the player, only
  the seen chunks (the 3 x 3 chunks round the player, `seenChunks()`), drawn from the world's own
  generator; names from `WorldSource.landmarks()`. The Room keeps the seen chunks of each
  character (`ex` in the welcome and the snapshot; at most `MAX_EXPLORED`), and the store keeps
  them (column `explored`).
- **Wisdom**: the damage of the cleric and the druid, and for every class the sense (`sense`: 8 +
  2 x mod tiles: a red chevron at the screen edge for each mob that hunts the player out of view,
  `Horde.huntersOf()`, `h` in the snapshot, `render/marks.ts`), the seek (`seek`: 3 + 2 x mod
  tiles, at least 1: how far it sees a hidden thing, `Fixture.hidden`, `Fixtures.update(...,
  seeker)`), and the night (`night`: the darkness x (1 - 0.08 x mod), only in the page). Gates of
  13: insight (`INSIGHT_GATE` in `worlds/wilds/src/dialogs.ts`: one answer each for the watchman,
  the innkeeper, the apothecary and the reeve), Medicine (`MEDICINE_GATE` in `items.ts`:
  `DRINKS.herbs`, chew a bundle for 1d4 HP; the pack shows the dim tag `.pack-gate` 1 or 2 under it)
  and the way home (`HOMEWARD_GATE` in `ui/gates.ts`: a pale arrow at the screen edge to the home).
- **Hidden things** of the Wilds: a patch of herbs (`herbpatch`, `herbs.ts`, `WildsSource.herbs()`:
  in about four cells in five, on open grass away from houses, the road and the town; one bundle,
  it grows again after 20 minutes, `LootTable.refillMs`) and the buried cache of Ironhold
  (`cache`, `TOWN_CACHE`: across the lane from the cottage; the reeve tells of it with insight).
  Neither collides (`FixtureTile.reach`: a target without a solid box).
- **Charisma**: the damage of the sorcerer and the warlock, and for every class prices
  (`buyShare` 1 - 0.1 x mod, `sellShare` 1 + 0.1 x mod: `dealPrice()`, `dealPay()`; the panel adds
  the price to the answer, "(2 coins)", so the answer texts have none), presence (`presence`: the
  overlap of a pack - 0.05 x mod, `Horde.overlap()`), daunt (`daunt`: a mob runs off x (1 + 0.1 x
  mod) after its hit) and inspire (`inspire`: max(0, mod) x 6 ticks of guard for the other players
  within 3 tiles of a hit; `PlayerState.inspired`, in `WireSelf`). Gates of 13: persuasion
  (`PERSUASION_GATE` in `worlds/wilds/src/dialogs.ts`: Marta gives a room, `ROOM`, the refuge `inn`
  with `Refuge.given` and its bed with `Interaction.restFor`; Isolde a friend's price; Brann and
  Elama words) and reputation (`REPUTATION_GATE` in `ui/gates.ts`: each NPC says its
  `NpcDef.greeting` once, with the character's name, within 2 tiles).
- **Shops** (since 2026-10-13, Fede's request; `docs/features/items/pack-and-loot.md`, REQ-PK-017): a
  trader's answer opens its shop (`DialogAnswer.shop`, a `Shop` with `buy` and `sell` wares, `tab` the
  side to open; `dialog.ts`), and the page shows the shop panel (`ui/shop-panel.ts`) over the
  conversation, which waits (`ConversationPanel.suspend()`/`resume()`) and goes on at the answer's
  `next` node. One item for each trade: each is a deal (`wareDeal()`; a sale `goods: 'coins'`,
  `pay`), with the same message `deal` and the id of the ware; `Room.deal()` finds it with
  `findDeal()` and checks the gates and the conditions of the answer and of the ware. A deal of an
  answer can still give a refuge (`goods: 'refuge'`) or an ale: the inns keep them in the
  conversation (Fede's decision, 2026-10-13). The shops of the Wilds (`worlds/wilds/src/dialogs.ts`):
  Corwin buys rings 5, cups 3, candles 1, imp horns 2, brute tusks 4, badger furs 4 (`PEDDLER_SHOP`);
  Isolde sells the three draughts (6, 8, 15 coins, `REMEDIES`; her friend's price 4, 6, 11,
  `FRIEND_REMEDIES`, behind the CHA 13 answer that opens it); the smith (`SMITH_SHOP`, `SMITH_PRICES`,
  `FORGED`, since 2026-10-11) sells the armour, the shield and the weapons (leather 5 to plate 150, a
  mace 3 to a longbow 12, a glaive 8; not the staffs) and buys all of them back for half
  (`smithPays()`), from the pack only: a worn piece must come off first; Ilsa sells mithril
  (`MITHRIL_SHOP`, with the permit).
- The store keeps the HP, the refuges and the seen chunks of each character (columns `hp`,
  `refuges`, `explored`; saved with the place; on 2026-10-11 a migration gave every character all
  its HP on the new scale). The vitals (`ui/vitals.ts`): a red bar for HP with the numbers ("17 /
  28") and a stamina bar at the top left, the effects in words, a red flash at the screen edges on
  a hit, a dark veil on a defeat.

In the client: the builder (step 2) and the "You" section show the traits in words and numbers
(`ui/traits-list.ts`); the pack panel shows the pack; a chest says "Open the chest", and the
player says what it found; a barred door says "Force the door" (strong enough) or "Try the
door". A guest's traits: every score 10, and the class of its look (`guestTraits()`). The
protocol: `docs/multiplayer.md`, protocol 39.

## Language

English and Spanish (Fede's decision, 2026-10-11; `docs/features/game/language.md`). The page
chooses once, when it loads (`src/i18n.ts`, `LANG`): `?lang=en|es` (not kept), the kept choice
(localStorage `game.lang.v1`), the browser's language (Spanish when it starts with `es`). The menu
and the settings panel show "English · Español" (`ui/language-choice.ts`); a choice reloads the
page (the game resumes the same character). `STRINGS` is the table of `LANG`. A world's content is
in English, and `tw()` translates it where it reaches the screen (bubbles, barks, welcome, the
conversation panel, signs, map labels, item lines, the intro, the link card, the title). In Spanish
the names are those of Kandrax (Ironhold: Ferrozar; the Wilds: las Tierras Salvajes; the reeve:
Elama Rothenel, la alguacil), and the D&D terms those of the Spanish 5e books (FUE, DES, CON, INT,
SAB, CAR; CA). **A Spanish line about the player has no word that must agree with its gender.**
New Spanish text must fit the conversation panel and use only letters that the pixel font draws
(tests: `worlds/wilds/test/texts.test.ts`, `apps/game/test/texts.test.ts`). The privacy page has a
Spanish copy at `/privacy/es/`.

## Quests

Since 2026-10-11 (story phase 2; `docs/features/game/quests.md`). `packages/engine/src/quests.ts`:
a world gives its quests (`WorldDefinition.quests`: `QuestDef`, steps with a journal line, an
optional place to mark, `at` a tile or `npc` an NPC id, and `end`). Each character has a
`QuestBook` (`{ [quest]: { step, flags, n } }`). **Effects** (`QuestEffect`: `quest`, `to`, `from`
(none: it starts the quest), `flag`, `take`, `give`) move a quest; they sit on a dialog answer
(`DialogAnswer.effect`) or on a thing that a character reads (`Interaction.effect`: the letter).
**Conditions** (`When`: a quest at steps, or an item in the pack; `not`) show answers
(`DialogAnswer.when`), choose the first node of a dialog (`Dialog.starts`), and the frame of a
thing (`Fixture.variant`: the mended cart). An answer with an effect shows only when the effect
can apply. **The server owns the book**: `Room.quest()` checks the nearness, the gate, the
conditions and the effect, then changes the book and the pack; the store saves both at once
(`setQuests()`, column `quests`). The book goes to its own player only (`qs`, protocol 23). In a
world that the page runs, the page keeps its own book (not saved). The page: the journal
(`ui/journal-panel.ts`, a button left of the map and the key L), a banner when a quest starts,
moves on or ends (`render/quest-banner.ts`), and gold marks on the map. **When you add a quest:**
its effects and conditions must name its steps (`worlds/wilds/test/story.test.ts` checks every
effect and condition of the content), its texts need Spanish forms (title and journal lines too),
and a test through the Room should play it. The Wilds (`worlds/wilds/src/quests.ts`): `road` (the
first quest, 2026-10-13: the letter of Thrain Steelforge on the home's table sends the character to
Ironhold; the scene `ARRIVAL` ends it when it comes into the town), `ashes` (Elama Rothenel starts it
once the road is done, `ROAD_DONE`; a character from before has it from the letter, at `letter`),
`cart` (the merchant by a broken cart on the road before Whitegrove: lift it with STR 13, or bring a
lever: the farmer of Whitegrove lends his, `lent`, or the smith's; 10 coins), `lentils` (the farmer of
Whitegrove sends a sack to the sergeant of Bronzehold: 5 coins; a wade or a swim with it makes it a
sack of wet lentils, `wet`, and the sergeant then pays 2 coins to CHA 13 or nothing), and `raid`
(the scene `ARGUMENT` in the town hall, then the reeve asks the character to warn Silverspring).
The merchant's cart has a lantern: mobs never come within 4 tiles of it (`CART_SAFE`), as for the
town. **Scenes** (`packages/engine/src/scenes.ts`, `WorldSource.scenes()`): talks that a character
overhears in an area at a step; its NPCs say the lines, a line behind a gate is a murmur, and the
end applies an effect (the message `quest` with `scene`, protocol 24). Only that character's page
plays it. **Wades** (`WorldSource.wadeEffects()`, protocol 37): effects that water applies; after each
step of a player that wades or swims (`PlayerState.wading`), the Room applies each one that can apply
(the page in its own world), so a page cannot hide a wade. **Ambushes** (`packages/engine/src/ambushes.ts`, `WorldSource.ambushes()`, since story
phase 3c): mobs of the story that wait for a character at a step in an area (the scouts of the
hobgoblins in the grove on the north road to Silverspring); their number follows the characters
within 12 tiles (`encounters.ts`, the 5e budget), riders sit on worgs (`Horde.spawnRider()`, state
`ride`, protocol 27), and when they all fall the quest moves on (the Room saves those books at once:
`takeQuestSaves()`). Since story phase 4 (2026-10-11, protocol 29; `docs/features/game/quests.md`
REQ-QST-013 to 016): an ambush can **march** (`AmbushDef.march`: the war band walks the north road,
`Horde.march()`; its mobs never despawn; at the end of the route `arrive` applies) or **raid**
(`AmbushDef.raid`: its mobs may go into a town, `Horde.unleash()`/`MobRules.raid`, and the NPCs of
`shelter` go to `NpcDef.shelter` or home, `NpcCrowd.setAlarm()`). **Escorts**
(`packages/engine/src/escorts.ts`, `WorldSource.escorts()`): a step gives a companion (Himo), back
at each join; home or a fall ends it. The `raid` quest: `scouts` -> the band falls on the road
(`band`: Himo on the post of the camp, `camp.ts`, a variant with content, `fixtureContent()`) ->
`escort` -> `home` (20 coins) or `lost`; or the band reaches Silverspring (`raid`) -> `defended`;
then Kasmut gives `title` (and the permit of the mithril for the early ending). The Hobgoblin
Devastator (`devastator`) casts a rite (`Rite`, state `rite`): three runes that hits break; at its
end the weapons of its allies burn (+1, 1d4). `Room.deal()` checks `DialogAnswer.when`.

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

## Mobs and fights

**The hobgoblin band** (since 2026-10-11, story phase 3; protocol 25): four more kinds, which do not
roam the Wilds (the population has none of them; the story brings them): the **goblin** (an archer:
`MobStats.arrowRange`; from 104 px it aims for 0.75 s and looses an arrow that flies 150 px and
reaches the first player on its way that can be hit (then the goblin's attack roll against its AC),
then it runs off; its arrows have the negative id of the goblin as their owner and `Arrow.from`, and
never hit mobs), the **worg** (a wolf: 112 px/s, straight at the player, `MobStats.straight`), the
**hobgoblin** (a soldier: a quick wind-up, and 2d6 more when another mob stands within 1.5 tiles
of its target, `allyDice`) and the **bugbear** (a heavy blow). Art: `art/mobs.ts` (`humanoid()`
with a `Build` for the goblin, the hobgoblin and the bugbear; `worg()`). `?mob=goblin,worg` shows
them in a world that the page runs. The atlas is 2048 px wide since then.

**The goblins of the forest** (since 2026-10-13, the tutorial: `docs/drafts/tutorial.md`; protocol 36;
`docs/features/game/combat.md`, REQ-CMB-009): the **skirmisher**, the SRD goblin with a scimitar and a
small shield (7 HP, AC 15, +4, 1d6+2), in melee only, with a slow wind-up in which it stands. It
**patrols** (`MobStats.patrol`, `Horde.spawnPatrol()`): a group of 2 or 3 walks a loop round the place
where it came. The first one that sees a player **startles** the group (state `startled`,
`STARTLE_MS` 0.6 s, a gold "!" over each head in the text layer, a yelp); then a random number of them,
from none to all (each number with the same chance), **flees** (state `flee`, 64 px/s: slower than a
player, so a player catches it; caught, cornered or hit, it turns and fights; away, it hides for
`HIDE_MS` 10 s and goes back to its loop), and the others fight. A
world chooses where they live: `MobRules.populationAt(tx, ty)` (the population round a player on that
tile, in place of `population`; a short population of patrols comes as one group) and
`MobRules.roam(tx, ty, kind)`. `?mob=skirmisher,skirmisher,skirmisher` puts one group 8 tiles east.

**The 5e scale** (since 2026-10-11, Fede's decision: `docs/drafts/level-3.md`,
`docs/features/game/combat.md`; protocol 26): a character is a **level-1** character (Fede's decision,
2026-10-13; level 3 before; a system to level up comes later), the mobs have the
numbers of their SRD stat blocks, and both sides roll to hit against the AC. `MOB_STATS` has
`health`, `ac`, `toHit`, `damage` (dice) and `xp`: the imp (a quasit) 7 HP, AC 13, +4, 1d4+3; the
brute (a half-ogre) 30, 12, +5, 2d8+3; the goblin 7, 15; the worg 26, 13; the hobgoblin 11, 18;
the bugbear 27, 16. The dice are in `dice.ts` (`Dice`, `rollDice()`, `attackRoll()`,
`formatDice()`). The rolls come from `Horde.dice` (seeded: the server's in a shared world, the
page's in its own world). A test that counts blows or hits gives `AVERAGE_DICE` (the average of
the dice, and every attack hits): `new Room(world, { dice: AVERAGE_DICE })`, or the 4th argument of
`new Horde()`. `encounters.ts` (`sizeEncounter()`: the 5e XP budget of level 1) sizes the encounters
of the story to the characters there.

`packages/engine/src/mobs.ts` (`Horde`): hostile mobs of two kinds (`MOB_STATS`): the **imp**,
small and quick (runs at 96 px/s, faster than a player, and keeps running during its short
wind-up, so running away does not save you), and the **brute**, big and slow (42 px/s, a long
wind-up in which it stands, a 2 s stun: you can walk away from it). A mob wanders round its
home, and now and then it moves its home 3 tiles towards the nearest player (a prowl: along
the shortest way through open ground where it may roam, so round a town or a lake; never closer
than 6 tiles), so mobs find players who stand still (in the Town of Azyr, in about 20 to 90 s at its
edge). A mob that stays within 8 px of one point for 1.5 s while it wants to move is stuck (back
and forth between trees): a walk ends, a chase bends the other way and gives up after 4 s. When it sees a player (close, out in
the open, no building between), it runs at the player on a curve (an angle off the straight line
that shrinks as it comes near); close enough, it winds up and strikes. Its attack rolls d20 +
`MobStats.toHit` against the player's AC: a hit stuns the player and takes the rolled
`MobStats.damage` (`hitPlayer`: no move, no attack; see "Ability scores in the game",
Constitution), and after it the player has a guard of 1 s in which no mob can hit it again; the
mob runs away for 1 to 2 s and then comes back. A miss glances off (a spark, "miss"): no stun, and
the mob chases on. **Mobs that hunt one player take turns** (`Horde.waitFor()`, `nextUp()`): their attacks start one after the other. The
others hound the player: they keep `MobStats.harass` from it (imp 36 to 50 px, brute 42 to 56 px:
out of their reach and out of the player's), move round it, keep apart, and look at it. The line
goes in the order in which the mobs joined it; a miss or the end of a retreat puts a mob at the
end. The next in the line times its approach: it comes into reach when its turn comes, and winds
up at once. **In a pack the attacks overlap** (`overlap()`, since 2026-10-10): the next one may
start when the attack before it has a share of its length left: 0 for one mob, 0.2 for two, 0.4
for three, 0.6 for four, at most 0.75 (the pack: the mobs that hunt the player within 8 tiles of
it). After a stun its wind-up may start that share of a wind-up before the guard ends, so its blow
still comes after the guard. A mob in the pack round its player (close to it) takes its home with
it, and a moment stuck does not end its hunt, so a pack follows a player who moves (before, slow
brutes reached their leash, gave up and saw the player again, over and over). A mob that gives
up does not look for players for 3 s. Each player has a line of its own. Hounding is part of the
state `chase`, so the protocol does not change. A mob never enters a building, gives up the chase when
it loses the player for 1.5 s or is 18 tiles from home, and walks home. New mobs come one at a
time, 17 to 25 tiles from every player (out of sight), up to the world's population round each
player; a wandering mob 36 tiles from every player goes away.

The player's attack is part of the input (`MoveInput.attack`: the direction to strike, an angle
in radians; `PlayerState.aim` keeps it, and the body faces the nearest side), so
`stepPlayer` stays the one rule for prediction: an attack lasts `ATTACK_TICKS` (the player stands
still), and the next can start `ATTACK_COOLDOWN_TICKS` after it. `stepPlayer` returns true when
an attack starts; the caller asks the horde what it hits (`Horde.strike`: in reach, in front;
`attackHits`). A blow (`Blow`, from the player's traits) rolls (`rollBlow()`: d20 + `toHit`
against `MobStats.ac`; a natural 20 rolls the dice twice, a natural 1 misses). A hit takes its
rolled `damage` from the mob's hit points (`MobStats.health`) and pushes it away from the attacker
(`knockback`: imp 10 px, brute 18 px, over 0.2 s, times the Strength of the attacker); a miss does
nothing, but the mob turns on the attacker. The blow that takes the last of them kills it, and
drops loot into the killer's pack (see "Ability scores in the game"): it flashes white, falls,
fades, and ash rises. Another hit makes it reel (state `hurt`: a flash and a recoil frame, `hurtMs`
times the Strength of the attacker): its wind-up or its blow breaks off, and then it goes for the
attacker.

A world opts in with `WorldSource.mobs()` (`MobRules`: `roam` where mobs live and wander, `hunt`
where they may step while they chase, `population` per player). The Wilds: everywhere except
water, the ground round a house and the towns (they do not live within 2 tiles of a town, and
they never step into one, so the towns are safe); 4 imps and 2 brutes. The client of a
single-player world runs its own `Horde`; in a shared world the server runs it (protocol 5, see
`docs/multiplayer.md`): the client sends its attacks with the time of the mobs that it showed,
and flashes a mob that a blow touches at once (`MobViews.touch()`); the server rolls, and the
results come in `bl` (protocol 26). In the client: `render/mobs.ts` (frames, eyes, ash), `PlayerView` (the arc, a
lunge, the attack frames of the skin and the effect of its style, in the colour of the style (a
spell in the colour of the skin's orb; spells, flames and palms glow and give a short light),
the red flash of a hit, stars over the head while stunned, a blink while guarded, the roll of a
dodge) and `ui/attack-button.ts` (in the bottom-right corner, under the action button; Space or J on a keyboard). A left click on the
world attacks towards the mouse pointer, from the player's chest (`input/mouse.ts`). A press is
kept for 150 ms. The button and Space aim at the nearest mob in reach (for a ranger, in the range of its arrows), else the way the player
walks or faces. The effect of the attack shows in 16 directions (`fxPlacement()`). `?mob=imp,brute` puts mobs next to the
player at the start (single-player worlds, so the Wilds with `?offline`); `?nomobs` turns them off.

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
  Speech bubbles stay inside the screen. In a shared
  world the Room runs the crowd (`Room.tick()`, before each broadcast) and the snapshots carry
  the poses; otherwise the client runs its own crowd. To act on one, findInteraction() takes
  `npcActors()`; the target's fixture is `npcFixture(def)`, the same object while it walks.
  The client draws them with `render/npcs.ts` (frames `npc/<look>/<view>/stand|walk/<i>`).

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
  shop, `shop`: see "Shops"). `checkDialog()` gives
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

## Buildings

- **The model** (engine): a rectangle of walls with one door in the south wall (never in a
  corner), a floor (`Ground.Floor`, `FloorStone` or `FloorEarth`, under the walls too; the world
  source sets it), fixtures, and optional extras: a `sign` (the name over the door) or an
  `emblem` (a symbol on the board in place of the name, `ui/emblem/<emblem>`: the shrine of
  Whitegrove and the chapel of Ironhold show a chalice, Fede's decision of 2026-10-13), a `style`
  (`{ walls, roof }`, the names of the art sets; default `DEFAULT_STYLE`, stone and slate),
  `windows` (columns of the south wall with a lit window: `Structure.Window`, solid like a wall)
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
  `ridge`, the front slope, the `eave`. Roof props stand on the ridge line, in the middle of
  their column. Each lit window gives a small warm light (radius 48) on the street in front of
  it (`Buildings.lights()`). The sign is a board in the text layer, over the door.
  While the player is inside (interior or doorway), the roof and the sign fade out and the front
  wall fades to 35% (or it would hide the two floor rows behind it); the storeys of the front wall
  above the player's storey go. On an upper storey, the building shows from that storey up, its
  floor covers the ground storey, and the things, people and players of the other storeys hide
  (`seenBy()` in `game.ts`).

## The worlds

- **The Wilds** (`worlds/wilds`): the engine's natural terrain from a seed (`?seed=`), the
  player's home in the middle (`home.ts`), and a house in about a third of the 24 x 24-tile cells
  (`houses.ts`; the cell east of the home always tries). **The home** is the house of the cell
  `HOME_CELL` (1, 5; `houses.ts`), id `home`, in the forest at the northern edge of the Iron
  Sovereignty, south of Ironhold (Fede, 2026-10-12 and 2026-10-13): a timber hut with a thatch roof, 7 x 6 tiles, an earth floor, a lit window
  and a chimney, a bed with a chest, a shelf, a table with a candle and a barrel, each with its
  own line. It stands on the dry place of its cell nearest the middle (the source keeps its ground
  dry in any case). A new character (and a guest) starts in it, on the tile north of the door
  (`WildsSource.spawn()`), facing the door; a character that played before starts where it was
  last. Houses: 7-11 x 6-9 tiles, never on water (deep or shallow); furniture by `furnish()` (bed with a
  chest at its foot, bookshelves, a table with a candle, barrels) with the door column and the
  row inside the south wall kept free; nothing grows on, round or in front of a house; a mud
  path leads to the door. A chunk also reads the next cells (a house's ground can reach into
  them). Tests check 150+ houses for a wall ring, one door and reachable furniture. A cell has no
  house where the house's ground would touch the town, the road or the signpost. About one house
  with a chest in four is barred (Strength 13; never the house east of the home); the chest of a
  house gives a candle stub, a silver ring, a pewter cup or a bundle of herbs, and 1 or 2 coins in
  one of three, and the chest of a barred house more (1 to 4 coins in two of three, and a second
  thing in one of two; a magic
  item in one of 8, a locked chest one in 16, the buried cache one in 6). The
  home's chest is the character's own: no loot. Every lake has a band of shallow water at its
  shore (`Ground.Shallows`, from the elevation: `naturalGround()`), and a small pond is all
  shallow: a character with Strength 13 wades through it.
- **Where the hut is** (Fede's decision, 2026-10-12): south of Ironhold, near the northern edge of the
  Iron Sovereignty; Ironhold and Silverspring are in the unclaimed wildlands north of it (not "the
  Wilds", which are far north and far south). **The forest of the tutorial** (`inTutorialForest()`,
  `FOREST_EDGE_Y` -8, the row of Ironhold's north edge: south of it): only goblin patrols live there (`MobRules.populationAt`,
  `roam(tx, ty, kind)`; the skirmisher), round the hut, the two hamlets and Ironhold; imps and brutes keep the
  wildlands north of Ironhold (Fede, 2026-10-13). Ironhold is the last town of the Sovereignty before the
  wildlands, on the way to Silverspring, the Enclave's last village. Plan: `docs/drafts/tutorial.md`.
- **The road to Ironhold** (`road.ts`, `homeLegs()`; 2026-10-13, after chapter 1.5.1 [A.2]): from below
  the path to the hut's door west and north to **Whitegrove** (Arboleda Blanca), up its lane, on to
  **Bronzehold** (Bronzal), up its lane, and north to the south edge of Ironhold (`TOWN_SOUTH`, below an
  open tile of its south edge; the lane behind the south houses). A road is a chain of legs (`Leg`:
  `from`, `to`, `start`, `end` headings `x` or `y`); `road()` makes a one-leg road. The merchant's
  cart stands beside the first leg (`cartSpot()`: north of a road that runs east and west, or east of
  one that runs north and south). `gateRoad()` keeps the east gate of Ironhold open: from it north to
  the start of the north road. **The hamlets** (`hamlets.ts`, town plans of 19 x 22 tiles, safe as
  towns): Whitegrove (x -20, y 88: the farmer at the market stall, `FARMER`; a villager; the shrine,
  a refuge `whitegrove`; an open farmhouse, two shut houses) and Bronzehold (x -45, y 38, west of the
  lake: the guard post of the Sovereignty with the sergeant, `SERGEANT`; a guard on the lane,
  `BRONZEHOLD_GUARD`; a cold forge; two shut houses). Their NPCs come last in `npcs()` (`HAMLET_NPCS`).
  Each has a name sign in the style of the Iron Sovereignty (`HAMLET_SIGNS`: `namesign`, `look:
  'iron'`, `label` its name) right outside the south end of its lane, one tile west of the road, and
  no title on arrival (a small place; Fede's rule of 2026-10-13).
  `?at=-11,99` starts in Whitegrove, `?at=-36,49` in Bronzehold, `?at=-32,16` at the south edge of
  Ironhold.
- **Ironhold** (`worlds/wilds/src/town.ts`, since 2026-10-10; a new plan on 2026-10-13, Fede's
  request: wooden walls, and closer to Ferrozar in chapter 1.5.1 and its picture on the Drive,
  `docs/features/game/towns.md` REQ-TWN-008): the town nearest the home, a
  fixed plan of 45 x 23 tiles (`TOWN`: x -52 to -8, y -8 to 14, the same for every seed) north of
  the home. `MAP` (one character per tile) and a plan for each building, as the Town of Azyr had.
  A palisade of logs (`P`) goes round it, with two gates: the south gate (`TOWN_SOUTH`, where the
  road from the home comes in) and the east gate (`TOWN_GATE`, which leads to the north road). The
  main street runs from the west palisade to the east gate (cobblestones, lamps). North of it: the
  inn (the Crooked Lantern), a square with the fountain and the notice board and, in its middle, the
  town hall (two storeys: the hall, of stone, with the reeve, and the reeve's archive above it, of
  timber, up the stairs), and the chapel. South of it, back to back with it and facing the lane by
  the south palisade, with alleys between them: the apothecary, a cottage, the smithy, the
  chandler, the granary and a house. The buildings are of wood (timber, planks), but the chapel and
  the hall's storey of stone; the inn, the chandler and the house have two storeys outside. Five
  open; four are shut for good (`locked`: the chandler, the cottage, the granary, the house). Ten
  NPCs (`TOWN_NPCS`): in the buildings the innkeeper and the minstrel, the reeve, the priest, the
  apothecary and the smith (some walk out to their doorstep); in the streets the watchman Brann at
  the south gate (where the road from the hut comes in), the peddler, the widow by the
  fountain and the child in the lane. Each one has three lines that it says by itself, a greeting
  by name (Charisma), and something to say: a conversation for the watchman, the innkeeper, the
  apothecary, the reeve, the peddler and the smith (`dialogs.ts`), three pages for the others. The inn has a
  bed by its east wall for a character with a room (Charisma).
  Ironhold has a title on arrival (`title: true`) and a name sign of the Sovereignty (`TOWN_NAME_SIGN`:
  west of the road from the hut, two rows south of the town, so that its plate does not hang over
  the gate). Nothing stands in the 5 x 3 tiles in front of a door. **The road** (see above): mud, also over
  water; nothing grows on it or close to it. **The signpost** stands outside the hut, two tiles below
  the door on the west side of its path, and points west, where the road leaves: "It reads:
  WHITEGROVE, BRONZEHOLD, IRONHOLD." Tests (`town.test.ts`): the sign and the road for five seeds, the
  hamlets, the walls and doors, the shut doors, every thing and door reachable,
  the NPC areas, the palisade, the town hall and its storeys, and no mob in the town. `?at=-12,3`
  starts at the gate, `?at=-29,2` in front of the town hall. Since 2026-10-11 a
  builder makes the towns (`towns.ts`: `TownPlan`, `Town`); `town.ts` keeps the plan and the old
  names (`TOWN`, `TOWN_BUILDINGS`, `inTown()`...), and `IRONHOLD` is the built town.
- **Silverspring** (`worlds/wilds/src/silverspring.ts`, story phase 4a, 2026-10-11;
  `docs/features/game/towns.md`): the mithril village of the Mithril Enclave, 42 x 24 tiles at the
  end of the north road (the road ends at the gate, `SILVERSPRING_SITE`, west of its main street).
  A spring in a pool at the north end, a stream south to a second pool (water, solid), two bridges of
  planks (`Ground.Floor`). North of the main street: the militia hall (Kasmut Parnika, veteran of the
  Enclave: `KASMUT`), the Silver Trout (Tova: ale; the bed of the refuge `trout`, for the guard of
  Silverspring), the jeweller (Ilsa: mithril at 5 coins with the permit; the smith of Ironhold pays
  10); four shut houses face the lane. Doran of the militia at the gate, a panner by the stream. Its
  NPCs come after the merchant in `npcs()` (wire codes). Mobs keep out of it as out of Ironhold
  (`TOWNS` in `source.ts`), except the war band during the raid. `?at=180,-179` starts in its main
  street. Silverspring has a title on arrival and a name sign of the Mithril Enclave
  (`SILVERSPRING_NAME_SIGN`, `look: 'mithril'`: outside the west end of the main street, north of the
  road). **The camp of the war band** (`camp.ts`, a place of the builder but not a town:
  `PLACES`): off the north road at (91, -146), with a trail; `?at=92,-141` starts next to the post.
- **The burned homesteads** (`worlds/wilds/src/ruins.ts`, story phase 6, 2026-10-11): the Hale, the
  Marrow and the Tanner homestead, fixed, in the wildlands north of Ironhold (Hale north, Marrow north-east, Tanner north-west; 2026-10-13); roofless charred
  houses (`{ walls: 'charred', roof: 'none' }`), each with a phoenix (the fixture `brand`) that moves
  `ashes` on in order; survivors at Hale and Tanner (WIS 13 calms them); then the priest (`PRIEST`)
  or the apothecary tells of the phoenix (`symbol`). `?at=-30,-36` starts at the Hale homestead.
- **The caravan** (story phase 5, 2026-10-11; `docs/features/npcs/guards.md` and REQ-QST-019 to 021):
  **guards** (`packages/engine/src/guards.ts`) are NPCs that fight, with the bodies of players; a
  **convoy** (`convoys.ts`, `WorldSource.convoys()`) walks them on a route and sends the attackers at a
  meeting point (the scouts and the band of the raid if they live, else the clan). The plot (`PLOT`, in
  the Crooked Lantern) starts the quest `caravan`; the driver of the wagon (`WAGON_DRIVER`) talks, and
  a robber is an outlaw (its blows hit the guards; they fight it). A robber is wanted: traders and
  guards refuse it (`Dialog.refuse`) until it pays 60 coins (`QuestEffect.cost`) to the reeve or Kasmut.
  Only the mobs of the story (`Mob.story`) hunt guards (`HordePlayer.quarry`).
- **The Silvervein** (`worlds/wilds/src/river.ts`, 2026-10-12): the river of Silverspring (el río Vena de
  Plata), from a spring 34 tiles north of the town, across the town (its map's channel), to a pool 50
  tiles south. Water, shallows, and a bank with no tree, house or herb.
- **The Arcane Raiders** (story phases 7 to 13, `docs/drafts/story-arcane-raiders.md`, 2026-10-12): the
  end of chapter 1 (the rest of `ashes`) and chapter 2. **Chapter 2 (phases 11 to 13) is on hold: Fede
  said "stop developing here" on 2026-10-12. Build it only when Fede asks.** Phase 7: **the Wren homestead** (`wren.ts`, by
  the pool of the Silvervein; Mira Wren); the priest sends a character at `symbol` there (`next`), and
  the cinder hounds of the Ashen Seekers race it from the east on the burned trail (`SEEKER_TRAIL`; the
  ambush `cinders`). New mob kinds: `hound`, `watcher` (never fights, goes in ash), `seeker`, `adept`
  (fire bolts), `warden` (goes in ash at half health). `?at=182,-101` starts in the yard of the
  homestead. Phase 8: **the camp of the Seekers** (`seekers.ts`) at the east end of the trail; its
  guards fall (`camp`), Sela is tied to the post (her conversation is on the post), and she sends the
  character to the shrine of Tigris (`captive`). `?at=240,-96` starts next to the post. Phase 9: **the
  shrine of Tigris** (`shrine.ts`: standing stones and an altar, loose things on the bank of the pool);
  the wave stone in the altar gives **the Tear of Tigris** (worn: walks in deep water, `PlayerTraits.swim`),
  and the Ash Warden marches for it (`relic`: its orders). `?at=196,-108` starts by the altar. Phase 10:
  **the dream of Verath** (`dream.ts`): at `relic` the beds open a dream (`Interaction.dream`, the veil
  of `ui/dream.ts`); the choice ends chapter 1 at `gave`, `refused` or `lied` (CHA 13). Quest effects
  count what a character wears (`ownedPack()`, `unwearFor()`).
- **The atlas has pages** (2026-10-12): `art/build.ts` packs the frames into pages of at most 2048 x
  2048 (16-bit GPUs: `atlas.png`, `atlas-1.png`, ...; each frame has its `page` in `atlas.json`), and
  `loadArt()` (`src/assets.ts`) loads them all. `ATLAS_PAGE=1024 npm run art` builds small pages, to
  test the loader.
- **Barks** are heard only within 18 tiles (`BARK_HEARING` in `game.ts`): with two towns, the lines of
  a far town would sit on the edge of the screen.
- **The Town of Azyr** is not here any more: it is on the branch `town` (azyr.io; on the VPS,
  `/opt/azyr-town`), frozen. The engine keeps everything that the town uses (multiplayer, walking NPCs,
  lines, the arrival intro, signs, building styles), and a world of the game can use it.

## Lore: Kandrax, on Google Drive

The lore and the story of the game follow **Kandrax**, the D&D 5e world of Fede. Its documents
are in the folder `Kandrax D&D` of a Google Drive (account fedelll@gmail.com). Fede changes them
all the time (Fede's decision, 2026-10-11), thus:

- Read the documents live from the Drive each time that you need them. Do not trust what an
  earlier session read.
- Do not copy the documents, or long parts of them, into this repository: a copy goes out of
  date. Put into the code only what the game uses (a name, a line, a place), as for any other
  content.
- The access is read-only (scope `drive.readonly`). If a document must change, tell Fede.

**Access: the rclone remote `gdrive:`**, with the same name on the VPS and on the laptop. On the
VPS it is in `/root/.config/rclone/rclone.conf` (since 2026-10-11). Check it with
`rclone lsd "gdrive:Kandrax D&D"`. If `rclone listremotes` has no `gdrive:`, ask Fede to run
these commands (a browser opens; select fedelll@gmail.com):

```bash
brew install rclone                                       # on the laptop
rclone config create gdrive drive scope=drive.readonly
```

Google Drive for desktop does not help: it shows a Google Doc as a `.gdoc` link without the text.

**Read a document.** Nearly all of them are Google Docs. They have no size, and rclone shows them
as `.docx` files. Add `--drive-export-formats md` to each command: rclone then shows them as
`.md` files and exports Markdown with the headings.

```bash
K="gdrive:Kandrax D&D"; X="--drive-export-formats md"
rclone lsf -R $X "$K"                          # the live list of files
rclone cat $X "$K/Kandrax AI Context.md"       # one document
D=$(mktemp -d); rclone copy $X --include "*.md" "$K/Personajes" "$D"; grep -ril "forjacero" "$D"; rm -rf "$D"
```

- Use the exact names from `rclone lsf`. Some names have a space before the extension
  (`1.4.3 - Linderis .md`) or two dots (`0.0 - Guía del aventurero novato..md`), and many names
  have accents.
- A search (the last line above) copies to a temporary directory outside the repository. Delete
  it after the search.

**Where to look.** The folder has about 575,000 words: do not read all of it. The documents are
in Spanish, except `Kandrax AI Context`. The game is in English, and its names translate the
Spanish names of Kandrax; a language setting is to give Spanish with the names of Kandrax (Fede's
decisions, 2026-10-11; not built yet). The names and the plan of the first story are in
`docs/drafts/story-razed-villages.md`. Ask Fede before you use a name that is not in its table.

| Document | Contents |
|---|---|
| `Kandrax AI Context` | **Start here.** A short summary in English: the regions, the four true gods and their avatars, Thrain Forjacero. |
| `Kandrax - Mundo` | The world: the Human, Central, Elven and Dwarven Dominions, the Wildlands of the north and of the south, the wars. |
| `Kandrax - Dioses` | The gods: the cycle of ascensions, ancient history, the mortal origins of the gods, the four gods and their avatars, stories. |
| `Kandrax - Obras Famosas` | Famous books of the world (religion, engineering, history, maps, politics). |
| `0.0 - Guía del aventurero novato.` | The guide for new players: the world, civilization, gods, races, classes, the start of the adventure. `despedida pdf` has nearly the same text. |
| `RPG` | The working notes of Fede as game master: next sessions, TODO, AI context, parties, prompts, cycles, gods. It changes most often. |
| `Lugares/` | Places: the Central Dominions (Enclave del Mithril; Soberanía del Hierro, with Bahía del Hierro and Thalesferro) and the Valle del Vintral. |
| `Personajes/` | Characters: `0.1 - Personajes`, `0.2 - Personajes No Jugadores`, the two parties (Compañía Arcana, Compañía del Perfil Bajo), `NPCs/`, `Crónicas/`. |
| `Sagas/` | The campaigns. `Dioses Olvidados/` is the first saga: `1.0 - Saga de los Dioses Olvidados`, its chapters in `Capítulos/` (1.1 to 1.9), `Documentos in-game/` and `Spinoffs/`. Then `2.0 - Saga del Ascenso Divino` and `3.0 - Saga del Caos`. |
| `Kandrax - Resumen - Compañía …`, `Kandrax - Guión - Compañía Arcana` | What happened in the sessions of each party, and a script. |
| `Images/`, `tokens/` | Art for reference: characters, maps, regions, sessions; tokens of characters and monsters. |

- `Sagas/Dioses Olvidados/Los Dioses Olvidados - Parte I - A4`, `- A5` and `- B5` are one book
  in three page formats (A4 and A5 are the same; B5 is nearly the same). It tells the first saga
  as a story, in about 99,000 words. Read one of them, and only the part that you need.
- Not lore: `RPG - Music` (music for the sessions), `1.1 - Plantilla de capítulo` (a template for
  chapters), `Music/`, `db_backups/` and `Excalidraw/` (battle maps of 1 to 38 MB each).

## Rules

- **Engine code uses only erasable TypeScript** (`erasableSyntaxOnly`): no `enum`, no
  `namespace`, no constructor parameter properties. Use `as const` objects. Relative imports
  have the `.ts` extension. Node 24 can then run the files directly, with no build step.
- **The simulation is deterministic.** Generation uses only `hash2` / `fbm` / `random(seed)` from
  `noise.ts`. Do not use `Math.random()` in the engine or in a world. Random choices that are
  only visual (tile variants) belong in the client, with a `LOOK_SEED`.
- **Movement goes through `stepPlayer()` at the fixed `TICK_RATE`.** The render loop only
  interpolates between the last two steps.
- **Pixel-perfect**: whole-number zoom in device pixels, `nearest` scaling, `roundPixels`. New
  art must use the 16-pixel grid. Do not scale a sprite by a fraction (the light textures come in
  fixed radii for that reason).
- **Frame names are the contract between art and code** (`ground/grass/3`, `wall/stone/5/1`,
  `fixture/desk`, `npc/healer`, `player/left/walk/5`, ...). `Art.frame()` throws on an unknown
  name; `Art.variants(prefix)` finds numbered variants. Real art from Aseprite must use the same
  names, in the "hash" JSON format.
- **Do not mirror lit sprites.** The light in all art comes from the top left.
- **Ground edges**: a tile draws the edges of each neighbour with a higher `BLEND_ORDER`
  (`render/terrain.ts`). A new ground type needs a blend order, variants and edge pieces.
- **The CRT defaults are Fede's choice** (`0.25,1,1,0.1`, set 2026-10-12; before, `0.6,1,1,0`;
  text `CRT_TEXT` = `0.3,0.5,0.5,0.3`, set 2026-10-07): do not change them without a request. The stage has two layers, `worldLayer`
  (full-screen filter) and `textLayer` (filter on the text's bounds plus 8 px of padding), and
  the camera moves `scene` and `textScene` together. The scanlines stay on the game-pixel grid:
  `CrtFilter.setGrid()` every frame; a filter that does not cover the whole screen starts lower
  down (the shader adds `uOutputFrame.y` times `uResolution`). The filter has a WebGL program
  only, so the renderer is pinned to WebGL.
- **Overlay UI goes outside `#game`.**
- Comments and documentation use Simplified Technical English (Fede's rule, on the VPS and on
  the laptop).

## Verify a change in a browser

Playwright is not a dependency of this repo; the hidden-agenda checkout has it, in both places.

- **On the VPS** there is no GPU, but headless Chromium renders WebGL with SwiftShader (slowly:
  1 to 6 FPS is normal there; with the CRT at a phone resolution a screenshot takes about a
  minute: give `page.screenshot` a `timeout` of 180000).

  ```js
  const { chromium } = require('/opt/hidden-agenda/node_modules/playwright');
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  ```

- **On the laptop** the default headless Chromium also uses SwiftShader, but at about 30 FPS,
  and a screenshot takes less than a second. `channel: 'chromium'` uses the real GPU (Apple M1,
  Metal) instead.

  ```js
  const { chromium } = require(process.env.HOME + '/Projects/hidden-agenda/node_modules/playwright');
  const browser = await chromium.launch({ channel: 'chromium' });   // or no options: SwiftShader
  ```

Serve the build with `npx vite preview --port 4173` in `apps/game`. For a shared world, build with
`SHARED_WORLDS=wilds npm run build`, and run the game server with `SHARED_WORLDS=wilds npm run
server` (port 3020; the preview sends `/ws` to it). Or use `scripts/dev.sh --no-open`: the Wilds
shared, the page on 3019. A second test server needs a free port: `PORT=<port>
ORIGINS=http://127.0.0.1:4173 node apps/game/server/main.ts`, and the preview then needs
`GAME_SERVER=ws://127.0.0.1:<port>`. Use one browser **context** per visitor. The page starts on
the menu: sign in with the dev sign-in (fill `#dev-name`, click `.dev-sign-in button`; fill an
email of `ADMIN_EMAILS` to see the display settings: the server needs the list), "New
game", the builder (`label[for=builder-race-<race>]`, `...-class-<class>`, `...-gender-<g>`,
`#builder-name`, `#builder-next`, `#builder-<ability>-up`, `#builder-<ability>-bonus`,
`#builder-create`), and wait for `#menu` to go. A conversation: `#conversation` (hidden when
closed), `.conversation-text`, `.conversation-said`, `.conversation-answer` (`.selected`). `?nomenu` skips it: a guest. URL switches:
`?nomenu` (no menu: a guest with a random look; nothing is saved, and a shared world refuses it;
only on `localhost` or `127.0.0.1`: every visitor of game.azyr.io signs in, Fede's decision of
2026-10-11),
`?world=<id>` (when an app has more than one world), `?debug` (read `#debug` for the world, the skin (race, class, gender), `char` (the character id, or guest), tile, target, building, and `net` (the others in the world, the near ones and the names
that show) and `others` in a shared world; `walkers`, `doors`, `lines`, `talk` (the conversation: the dialog's
name, the node and the selected answer) and `intro` in a world with NPCs; `place` (the visit of a place
with a title, and the phase of its title); `mobs` and
`fight` in a world with mobs; `traits` (what the scores give, and `(wading)`), `dex` (the
Dexterity traits, the dodge ticks, sneaking, the arrows in flight), `con` (HP, recovery,
stamina, a defeat, poison, drink, refuges), `int` (the opening, the reading of a mob, the map
detail, the seen chunks), `wis` (the sense, the seek, the night, the arrow, the hunters and the
marks), `cha` (the shares of prices, the presence, the daunt, the inspire and the greetings) and
`cmp` (each companion, its tile, a stun or a defeat; and its mode and HP in a world that the page
runs), `pack`, `gear` (the worn items, AC, the attack with its bonus and its dice, the walk) and
`piles`; `doors`
lists the forced doors too), `#pack-button` and `#pack` (the pack panel: `.pack-slot[data-slot=<i>]`
for each slot, `.gear-slot[data-gear=<slot>]` for each worn slot (also a `.pack-slot`, with
`data-slot` 32 to 43), `.gear-stats`, `.pack-pick` in each used one (drag it with the mouse, or with touch events: a
`.pack-ghost` follows the pointer), `.pack-detail`, `.pack-action`), `#shop` (a shop:
`.shop-tab[data-side=buy|sell]`, `.shop-ware[data-ware=<id>]`, `.shop-trade`, `.shop-say`; in a shared
world the server takes the place of a character from the store, so `?at=` works only within 64 tiles
of it), `#belt` and `.belt-drink` (the drink belt), `#map-button` and
`#map` (the map panel), `?offline` (a
shared world played alone), `?skin=<n>` (another skin, not saved), `?nointro`, `?introat=<ms>`,
`?lang=en|es` (the language, not kept), `?mob=imp,brute` (mobs next to the player), `?companion=<look>` (a companion of that NPC look
next to the player, which follows it; a world that the page runs), `?nomobs` (no mobs: use it in tests that walk about),
`?attackpose=<tick>,<facing or degrees>` (the player frozen at that tick of an attack in that
direction, degrees clockwise from east: a screenshot of it),
`?at=tx,ty`
(start on that tile, or the nearest open one), `?seed=`, `?nocrt` (much faster under
SwiftShader), `?nolight`. Read a dialog from the live region `.sr-only[data-speech=dialog]` (the
welcome has `[data-speech=welcome]`), and the link from `#link-card a`. For touch, use a context
with `hasTouch: true` and send
`Input.dispatchTouchEvent` through a CDP session; a `touchEnd` releases the points that it
lists, so list only the finger that lifts.

To see what a phone GPU with 16-bit floats shows (SwiftShader computes in 32 bits), round the
texture coordinates in the page's shaders before they compile: `page.addInitScript` that wraps
`WebGL2RenderingContext.prototype.shaderSource`, adds
`vec2 fp16q(vec2 v){ vec2 e = exp2(floor(log2(max(abs(v), vec2(1e-20)))) - 10.0); return floor(v / e + 0.5) * e; }`
before `void main`, and replaces `texture(t, vUV)` by `texture(t, fp16q(vUV))` (only in shaders
with `precision mediump float`, as a real GPU; or in all of them, as a GPU without highp). Use an
Android viewport (412 x 915, `deviceScaleFactor: 2.625`).

## Deploy

A deploy changes the game's two addresses only (world.kandrax.app and its mirror game.azyr.io,
one build and one server). azyr.io serves the town from its own checkout, server and
folder (see "What this is"), so nothing here needs to keep azyr.io working.

A deploy runs only on the VPS. See `deploy/README.md`; the accounts need a one-time setup there
first (the Google OAuth client, `/etc/game/secret.env`, the nginx routes `/api/` and `/auth/`,
the backup timer), and `scripts/deploy.sh` checks it before it changes anything. Short form:
`cd /opt/game && git pull && scripts/deploy.sh` (it builds `apps/game`, restarts the PM2
process `game-server` first, then publishes the client). No nginx reload is necessary. The open
pages reload themselves when the new client is published (see "Menu, characters and accounts").

The script deploys the working tree of `/opt/game`. Thus a commit from the laptop goes live only
after a push to GitHub and a pull on the VPS.

**After each development, commit, push and deploy at once, without approval (Fede's decision,
2026-10-10).** Pull before the push (`git pull --rebase`: the other place commits too). From the
laptop, deploy over SSH (the host alias `azyr`, through Tailscale):
`ssh azyr 'cd /opt/game && git pull --ff-only && scripts/deploy.sh'`. Do not brief the VPS
Claude for a deploy. Then verify (below) and tell Fede the result. This is for `main` only: the
branch `town` changes only when Fede asks.

On the VPS: Cloudflare Authenticated Origin Pulls is on, so a local `curl -k https://localhost/`
gets 400; that is correct. The server's health: `curl -s http://127.0.0.1:3008/healthz`.
**Never run `pm2 update` or `pm2 flush` on the VPS** (see `/root/CLAUDE.md` there).

From anywhere: `curl -sI https://world.kandrax.app/` (and `https://game.azyr.io/`) gives 200 and
`cache-control: no-store`, and F3
in the game (or `/?debug`) shows the commit of the live build.
