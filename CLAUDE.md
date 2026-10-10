# CLAUDE.md

This file gives guidance to Claude Code when it works in this repository.

## What this is

A pixel-art game **engine** for the browser, and the applications on it. It runs at
https://game.azyr.io, which has one world: **the Wilds** (an endless dark forest with lonely
stone houses, mobs, and the town of Thornwick west of the home). A visitor signs in with Google, makes a character (D&D 5e races,
classes, abilities) or continues with one, and starts in the character's home, a hut in the
middle of the Wilds (see "Menu, characters and accounts"). The goal is an online, multiplayer sandbox. The engine has
multiplayer: an authoritative Node server, client-side prediction and interpolation
(`docs/multiplayer.md`); the Wilds are shared since 2026-10-10 (Fede's decision): every visitor
is in the same Wilds, and every new character starts in the home, the house of the cell (0, 0).
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
| `packages/engine` | `@game/engine` | The simulation, pure TypeScript: world model, tiles, collision, movement, buildings, fixtures, interactions, doors, NPCs and their conversations (`dialog.ts`), mobs and fights, the natural-terrain toolkit, the character rules (`character.ts`), what the scores give (`traits.ts`), items and the pack (`items.ts`), the loot of chests and the barred doors over time (`loot.ts`), and the multiplayer core (`net/`: protocol, `Room`, `Prediction`, `Remotes`). **No DOM, no PixiJS, no network**: the server imports it as it is. | nothing |
| `packages/engine-server` | `@game/engine-server` | The game server: `startServer()` (Node, `ws`): accounts with Google sign-in, sessions and characters in SQLite (`accounts.ts`, `google.ts`, `store.ts`; `/api/`, `/auth/`), a Room per shared world at `/ws`, limits, heartbeat, `/healthz`. | `@game/engine` |
| `packages/engine-client` | `@game/engine-client` | The browser runtime as a library: `startGame()`, renderers, input, GUI, and the art pipeline (`art/`). | `@game/engine` |
| `worlds/wilds` | `@game/world-wilds` | The Wilds: a `WorldSource` (generated), the town of Thornwick (`town.ts`), the road to it and the signpost (`road.ts`), and its texts. | `@game/engine` |
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
  (`runMenu()`: sign-in, main screen, continue), `builder.ts` (the character builder),
  `portrait.ts` (a skin in the menu, walking or still), `names.ts` (random names per race),
  `api.ts` (the accounts API), `dom.ts`.
- `skins/`: the skin seed of a guest (`seed.ts`, localStorage `game.skin.v1`, `?skin=`), the Web
  Worker that renders skins (`skin-worker.ts`) and `SkinStore` (textures, render queue,
  localStorage cache of rendered sheets; `cancel()` drops a look that the builder no longer
  shows).
- `net/session.ts`: the connection to the multiplayer server (prediction while online, alone
  while not, reconnection). See `docs/multiplayer.md`.
- `render/`: `camera.ts` (pixel-perfect zoom), `terrain.ts` (ground chunks drawn into render
  textures; trees and rocks as depth-sorted sprites), `buildings.ts` (walls, doors, roofs,
  signs; fades the roof, the sign and the front wall while the player is inside),
  `fixtures.ts` (furniture, props, NPCs, portal glows; gives the lights of fixtures),
  `player-view.ts` (8-frame walk in a set of player textures, a skin or the atlas wanderer, and a faint copy above the props
  that shows the player through trees), `others.ts` (the other players of a shared world, with
  their torches and their names), `name-tag.ts` (a name over a head, in the small font: the
  other players' and the visitor's own; without a chosen name, `skinName()` of the look), `lighting.ts` (the light map: darkness with a hole for each light),
  `crt.ts` (the CRT shader), `pixel-text.ts` / `text-layout.ts` (the pixel fonts: `new
  PixelFont(art)` or `new PixelFont(art, 'small')`),
  `speech-bubble.ts` (pages of text over a head, above the darkness), `loot-text.ts` (what a kill
  drops, "+3 COINS", rising over the player's head in the small font), `cursor.ts` (the mouse
  cursor `ui/cursor` at the size of a world pixel, in its own layer above the text, without a
  filter).
- `input/`: `keyboard.ts` (KeyboardEvent.code, so WASD works on any layout; keys typed into a
  form field are ignored), `joystick.ts` (floating touch stick) and `mouse.ts` (the mouse over
  `#game`: where it points, a left click on the world, which attacks towards it, and a right
  click, a dodge; over the world the system cursor hides (class `own-cursor`) and
  `render/cursor.ts` draws the game's).
- `ui/`: the GUI, all HTML over the canvas: `strings.ts` (every engine text the player reads),
  `hud.ts` (hint, debug panel, fatal error), `action-button.ts` (bottom right; E on a
  keyboard), `link-card.ts` (a real link for a fixture with one), `world-menu.ts` (top right,
  map icon; only in an app with more than one world, so not now), `settings-panel.ts` (top right: CRT on/off and sliders, for an admin only, saved in localStorage
  `game.crt.v1`; `?crt=` / `?nocrt` win over it; `addSection()` puts a section on top),
  `conversation.ts` (the conversation panel: `Conversation`, the state, and `ConversationPanel`; see "Fixtures, content and actions"),
  `you-section.ts` (the "You" section of the settings: the character's picture, name, race and class, scores, what they give (`traits-list.ts`, also in the builder), "Main menu" and "Sign out"),
  `pack-panel.ts` (top right, left of the settings, a bag icon, or I on a keyboard: the coins and the slots of the pack, with the item icons), `panels.ts` (one top-right panel at a time),
  `presence.ts` (shared worlds only: how many other visitors are here; top centre on a wide
  screen, top left on a phone).
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
  people of Thornwick `watchman`, `innkeeper`, `priest`, `child`; frames `npc/<look>`), all from
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
  gender has 2^23 looks. `Skin` is `{ seed, appearance, spec, palette }`.
  `renderSkinSheet()` gives 4 views x (stand + 8 walk + 4 attack + 4 roll) frames of 56 x 56
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
  `figure.ts`), in every skin sheet and as `player/<view>/roll/<i>` for the wanderer.
- `fx.ts`: the effects of a fight, white and grey, tinted by the game: the effect of each attack
  style (`fx/<style>/<turn>/<0-3>`: drawn facing right and turned by 0, 22.5, 45 and 67.5
  degrees, each frame cropped to its pixels with its own anchor) and the star of a stun
  (`fx/star`), and the arrow in flight (`fx/arrow/<turn>`, tinted `ARROW_TINT`). `fxPlacement()` (`attacks.ts`) gives the 16 directions: a drawn turn, then a
  mirror and quarter turns, which keep the pixel grid. Do not rotate an effect by another angle.
  Also the ripple round a player in shallow water (`fx/ripple/<0-3>`, in its own colours).
- `ground.ts`: ground tiles from tiling noise (grass, moss, mud, gravel, water, shallow water,
  cobblestones) and the ragged edge pieces. `decor.ts`: small decor as text grids.
- `items.ts`: the item icons, SDF models of 16 x 16 (`item/<kind>` for each `ITEM_KINDS`, and
  `item/coin`), with materials of their own, a little lighter than the world's: the pack panel
  shows them at 2x on a dark slot.
- `lights.ts`: light holes at the radii of `LIGHTING.radii` (48, 96, 150) and the glow. The
  settings go into the atlas JSON (`meta.lighting`).
- `font.ts`: the pixel font (capitals 7 px, descenders 2 px, white glyphs that the client
  tints; frames `font/<char code>`; metrics in `meta.font`), with Spanish lowercase accents,
  ñ, ¿, ¡, ·, dashes. Accented capitals and curly quotes draw as plain ones. The small font
  (`SMALL_GLYPHS`: capitals 5 px, digits, space and `' - . _ +`; frames `smallfont/<char code>`;
  metrics in `meta.smallFont`) draws lowercase as capitals and an accented letter as the plain
  one; it is for the names over other players. Also the bubble
  (`ui/bubble`, `ui/bubble-tail`), the "more pages" triangle (`ui/more`), the sign board
  (`ui/sign`) and the mouse cursor (`ui/cursor`: a short sword, 10 x 10, its tip on the hot spot
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
- Bottom left: the joystick at rest. Bottom right: the action button, left of it the attack
  button, left of that the dodge button (a world with mobs). Bottom centre, above
  them: the link card. Top right: the worlds button, the pack button and the settings button. Bottom centre, over
  everything there: the conversation panel; while it is open, the joystick, the action and
  attack buttons and the link card hide (`body.conversing`).
- Every engine text the player reads goes in `src/ui/strings.ts`; what things say is content and
  belongs to the world.
- A control gives the focus back after use, or WASD stops working (see `SettingsPanel`).
- A link must be a real `<a>` (the link card): a browser opens a new tab from a key press or a
  click, but not from the start of a touch. So E opens the link, and a tap on the action button
  only points at the card's link (`pulse()`); a tap on the link opens it.

## Menu, characters and accounts

Since 2026-10-09 the game starts on a menu (`startGame({ accounts: true })`, `menu/`), HTML in the
GUI style, over the whole page (it scrolls on a phone):

- **Sign-in**: "Sign in with Google" (Google's dark button, with the "G"), or in development a
  dev sign-in with a name only (or an email: see "Admins"). After Google, the page shows
  `?login=failed` or `cancelled` once.
- **Main screen**: "New game", "Continue" (off without characters), and "Signed in with Google
  · Sign out · Delete account · Privacy". "Delete account" asks first, then deletes the account,
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

## Ability scores in the game

The plan and Fede's decisions are in `docs/drafts/abilities.md`: an application of each score,
one ability at a time (Strength and Dexterity are done; Constitution, Intelligence, Wisdom and
Charisma come next). `packages/engine/src/traits.ts` gives `PlayerTraits`, what the scores of a
character give: `traitsOf(scores, class)`, `sheetTraits(sheet)`, `GUEST_TRAITS` (every score 10:
a guest). The server makes the traits from the stored character (`Room.join(..., { traits,
pack })`); the page makes the same from the same character, so the prediction stays exact. A
client never sends its traits. Two kinds of effect: a scale (a number changes with the modifier,
-1 to +3) and a gate (`Gate`: a fixed limit on a score, 13 by default; `meetsGate()`), never a
roll of a die.

- **The attack ability (Option B, Fede's decision, 2026-10-10)**: each class strikes with its own
  ability (`ATTACK_ABILITY` in `character.ts`): STR barbarian, fighter, paladin; DEX bard, monk,
  ranger, rogue; WIS cleric, druid; INT wizard; CHA sorcerer, warlock. The class decides, not the
  item in the hand. A blow takes `damage` = 4 + that modifier from a mob's health.
- **Strength**, for every class: the push of a blow (`push`: `knockback` x (1 + 0.15 x mod)), how
  long a mob reels (`stagger`: `hurtMs` x (1 + 0.2 x mod)), the slots of the pack (6 + 2 x mod: 4
  to 12), and two gates of 13: wading through shallow water (`WADE_GATE`; `stepPlayer(...,
  traits)`: half speed, no attack there) and forcing a barred door (`FORCE_GATE`,
  `Building.barred`).
- **The pack** (`items.ts`): coins in a purse and items in slots, each slot one kind up to its
  stack (`ITEM_STACK`). Items: imp horn, brute tusk, candle stub, silver ring, pewter cup, bundle
  of herbs; none has a use yet. A kill drops loot into the killer's pack (`MOB_LOOT`,
  `Horde.drop()`: an imp a horn in one kill of three; a brute 2 to 6 coins, and a tusk in one of
  two); what does not fit is lost, and the player says "My pack is full." In a shared world the
  server owns the pack, and the store keeps it (`Character.pack`, the column `pack`, saved with
  the place); in a world that the page runs, the page has its own, which it does not save.
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
  within their sight times `HordePlayer.sight`. On purpose (a slow walk, not standing still) the
  torch is smaller (96, others' 48) and the figure a little darker. When stamina exists (CON),
  sneaking uses it too (Fede's note, 2026-10-10).
- **Arrows** (`arrows.ts`): a ranger's every attack is an arrow (`Horde.shoot()`), 240 px/s, that
  hits the first living mob on its way (the damage and force of the ranger's blow) or stops at a
  thing (`World.shotBox()`: what is solid, except water) or at the end of its range; a kill is in
  `Horde.takeShotKills()`, and the drop goes to the shooter. The page of the shooter flies its own
  copy at once (`flyArrow()`) and shows the hit; the others draw the server's (`ar` in the
  snapshot, `render/arrows.ts`).
- **Locked chests**: one chest in three of the Wilds houses that are not barred has a lock (DEX
  13). It opens each time for a character with the gate ("Pick the lock", "The lock clicks
  open."), never for one without ("It is locked. I cannot pick it."); it gives more (3 to 10
  coins, a second thing in about one of three).

In the client: the builder (step 2) and the "You" section show the traits in words and numbers
(`ui/traits-list.ts`); the pack panel shows the pack; a chest says "Open the chest", and the
player says what it found; a barred door says "Force the door" (strong enough) or "Try the
door". A guest's traits: every score 10, and the class of its look (`guestTraits()`). The
protocol: `docs/multiplayer.md`, protocol 12.

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

## Mobs and fights

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
that shrinks as it comes near); close enough, it winds up and strikes. A hit stuns
the player (`stunPlayer`: no move, no attack), and after it the player has a guard of 1 s in which
no mob can hit it again; the mob runs away for 1 to 2 s and then comes back. **Mobs that hunt one
player take turns** (`Horde.waitFor()`, `nextUp()`): their attacks start one after the other. The
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
`attackHits`). A blow (`Blow`, from the player's traits) takes `damage` health points from the
mob (imp 3, brute 12; a blow does 3 to 7) and pushes it away from the attacker (`knockback`: imp
10 px, brute 18 px, over 0.2 s, times the Strength of the attacker). The blow that takes the last
of it kills it, and drops loot into the killer's pack (see "Ability scores in the game"): it
flashes white, falls, fades, and ash rises. Another blow makes it reel (state `hurt`: a flash and
a recoil frame, `hurtMs` times the Strength of the attacker): its wind-up or its blow breaks off,
and then it goes for the attacker.

A world opts in with `WorldSource.mobs()` (`MobRules`: `roam` where mobs live and wander, `hunt`
where they may step while they chase, `population` per player). The Wilds: everywhere except
water, the ground round a house and Thornwick (they do not live within 2 tiles of the town, and
they never step into it, so the town is safe); 4 imps and 2 brutes. The client of a
single-player world runs its own `Horde`; in a shared world the server runs it (protocol 5, see
`docs/multiplayer.md`): the client sends its attacks with the time of the mobs that it showed,
and it shows a kill at once (the server confirms it, or after 0.7 s the mob lives on). In the client: `render/mobs.ts` (frames, eyes, ash), `PlayerView` (the arc, a
lunge, the attack frames of the skin and the effect of its style, in the colour of the style (a
spell in the colour of the skin's orb; spells, flames and palms glow and give a short light),
the red flash of a hit, stars over the head while stunned, a blink while guarded, the roll of a
dodge) and `ui/attack-button.ts` (left of the action button; Space or J on a keyboard). A left click on the
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

- **Fixture types** (`packages/engine/src/fixtures.ts`, `FIXTURE_TYPES`): a kind, a footprint
  (tiles from the anchor = south-west tile, each with a solid box or none) and a depth line.
  **Structure codes:** each type has a range of codes in the structure layer, one per tile, after
  the range of the type before it. Add a new type at the end of the list; do not change the
  number of tiles of a type. All codes must stay below 256 (a test checks it).
- **A fixture** is a placed instance: kind, anchor tile, optional `look` (NPC costume),
  `content` and `light`. Content (`Interaction`): `pages` (one per press of the action button),
  `speaker` (`'player'`, the default, or `'fixture'` for an NPC: the bubble goes over its head),
  `link` (`url`, `label`, `title`: the link card), and `dialog` (a conversation, for an NPC; it
  takes the place of the pages). Without content, the world's `examine[kind]` line is used; a
  thing with neither is not a target.
- **Conversations** (since 2026-10-10): a `Dialog` (`packages/engine/src/dialog.ts`) is a tree:
  a `name` (over the picture), a `start` node, and `nodes`, each with what the NPC says (`say`)
  and 1 to 4 `answers` (`text`, and `next`: the next node, or none to end). `checkDialog()` gives
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
  source sets it), fixtures, and optional extras: a `sign` (the name over the door), a `style`
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
- **Collision:** walls and a closed door are full tiles; fixtures have their boxes; an open
  door is open. The open doors are `World.openDoors`: the first world state that is not in the
  source. The server must own it when multiplayer comes.
- **Drawing:** walls and the door in the entity layer (sort by the tile's middle line);
  fixtures by their depth line; the roof as one container just in front of the south wall
  (zIndex `y1 * 16 + 8.5`): above everything in the building, below what stands south of it.
  The roof sits on the wall tops, 32 px up: the north eave (`top`), the back slope, the
  `ridge`, the front slope, the `eave`. Roof props stand on the ridge line, in the middle of
  their column. Each lit window gives a small warm light (radius 48) on the street in front of
  it (`Buildings.lights()`). The sign is a board in the text layer, over the door.
  While the player is inside (interior or doorway), the roof and the sign fade out and the front
  wall fades to 35% (or it would hide the two floor rows behind it).

## The worlds

- **The Wilds** (`worlds/wilds`): the engine's natural terrain from a seed (`?seed=`), the
  player's home in the middle (`home.ts`), and a house in about a third of the 24 x 24-tile cells
  (`houses.ts`; the cell east of the home always tries). **The home** is the house of the cell
  (0, 0), id `home`: a timber hut with a thatch roof, 7 x 6 tiles, an earth floor, a lit window
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
  house gives 1 to 6 coins and a candle stub, a silver ring, a pewter cup or a bundle of herbs,
  and the chest of a barred house more (5 to 15 coins, and a second thing in one of two). The
  home's chest is the character's own: no loot. Every lake has a band of shallow water at its
  shore (`Ground.Shallows`, from the elevation: `naturalGround()`), and a small pond is all
  shallow: a character with Strength 13 wades through it.
- **Thornwick** (`worlds/wilds/src/town.ts`, since 2026-10-10): the town nearest the home, a
  fixed plan of 45 x 23 tiles (`TOWN`: x -52 to -8, y -8 to 14, the same for every seed) west of
  the home. `MAP` (one character per tile) and a plan for each building, as the Town of Azyr had.
  The main street runs east to west (cobblestones, lamps); the road from the home comes in at its
  east end (`TOWN_GATE`). North of the street: the inn (the Crooked Lantern), the smithy, a square
  with the fountain and the notice board, the chapel, and the chandler. South of it, back to back
  with it and facing a lane by the lake, with alleys between them: the apothecary, a cottage, the
  reeve's house, the granary and a house. Five open; four are shut for good (`locked`: the
  chandler, the cottage, the granary, the house). Ten NPCs (`TOWN_NPCS`): in the buildings the
  innkeeper and the minstrel, the smith, the priest, the apothecary and the reeve (some walk out
  to their doorstep); in the streets the watchman at the gate, the peddler, the widow by the
  fountain and the child in the lane. Each one has three lines that it says by itself, and
  something to say: a conversation for the watchman, the innkeeper, the apothecary and the reeve
  (`dialogs.ts`), three pages for the others.
  Nothing stands in the 5 x 3 tiles in front of a door. **The road** (`road.ts`): a smooth curve
  of mud from below the path to the home's door to the gate, also over water; nothing grows on it
  or close to it. **The signpost** stands outside the hut, two tiles below the door on the west
  side of its path, and points west: "It reads: THORNWICK." Tests (`town.test.ts`): the sign and
  the road for five seeds, the walls and doors, the shut doors, every thing and door reachable,
  the NPC areas, and no mob in the town. `?at=-12,3` starts at the gate.
- **The Town of Azyr** is not here any more: it is on the branch `town` (azyr.io; on the VPS,
  `/opt/azyr-town`), frozen. The engine keeps everything that the town uses (multiplayer, walking NPCs,
  lines, the arrival intro, signs, building styles), and a world of the game can use it.

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
- **The CRT defaults are Fede's choice** (`0.6,1,1,0`; text `CRT_TEXT` = `0.3,0.5,0.5,0.3`, set
  2026-10-07): do not change them without a request. The stage has two layers, `worldLayer`
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
`?nomenu` (no menu: a guest with a random look; nothing is saved, and a shared world refuses it),
`?world=<id>` (when an app has more than one world), `?debug` (read `#debug` for the world, the skin (race, class, gender), `char` (the character id, or guest), tile, target, building, and `net` and
`others` in a shared world; `walkers`, `doors`, `lines`, `talk` (the conversation: the dialog's
name, the node and the selected answer) and `intro` in a world with NPCs; `mobs` and
`fight` in a world with mobs; `traits` (what the scores give, and `(wading)`), `dex` (the
Dexterity traits, the dodge ticks, sneaking, the arrows in flight) and `pack`; `doors`
lists the forced doors too), `#pack-button` and `#pack` (the pack panel), `?offline` (a
shared world played alone), `?skin=<n>` (another skin, not saved), `?nointro`, `?introat=<ms>`,
`?mob=imp,brute` (mobs next to the player), `?nomobs` (no mobs: use it in tests that walk about),
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

A deploy changes game.azyr.io only. azyr.io serves the town from its own checkout, server and
folder (see "What this is"), so nothing here needs to keep azyr.io working.

A deploy runs only on the VPS. See `deploy/README.md`; the accounts need a one-time setup there
first (the Google OAuth client, `/etc/game/secret.env`, the nginx routes `/api/` and `/auth/`,
the backup timer), and `scripts/deploy.sh` checks it before it changes anything. Short form:
`cd /opt/game && git pull && scripts/deploy.sh` (it builds `apps/game`, restarts the PM2
process `game-server` first, then publishes the client). No nginx reload is necessary.

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

From anywhere: `curl -sI https://game.azyr.io/` gives 200 and `cache-control: no-store`, and F3
in the game (or `/?debug`) shows the commit of the live build.
