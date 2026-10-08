# CLAUDE.md

This file gives guidance to Claude Code when it works in this repository.

## What this is

A pixel-art game **engine** for the browser, and the applications on it. It runs at
https://game.azyr.io, which has two worlds: **the Wilds** (an endless dark forest with lonely
stone houses) and the **Town of Azyr** (one house for each project of the azyr.io landing page,
with keepers, exhibits and portals that link to the projects). The goal is an online,
multiplayer sandbox. The engine has multiplayer: an authoritative Node server, client-side
prediction and interpolation (`docs/multiplayer.md`). The town is shared, so every visitor sees
the others; the Wilds stay single-player. Read `docs/stack.md` before you change the stack.

The engine is meant to carry more applications on this box (games, demos). Keep the line
between engine and content clean: the engine never knows a world's content, and a world never
reaches into the renderer.

## Commands

Node 24 (`.nvmrc`). npm workspaces: `packages/*`, `worlds/*`, `apps/*`.

```bash
npm install
npm run dev          # the app's Vite dev server, http://127.0.0.1:5173 (makes the art first)
npm run check        # type check of every package + Vitest
npm test             # Vitest only
npm run art          # make packages/engine-client/src/generated/ again (atlas + icon)
npm run build        # production build of the app in apps/game/dist
npm run server       # the multiplayer server, port 3008 (dev and preview send /ws to it)
scripts/deploy.sh    # on the box: check, build, restart game-server (PM2), publish the client
```

Art preview at 4x: `cd packages/engine-client && node art/build.ts --preview /tmp/atlas.png`.

## Layout and layers

| Package | Name | What | May import |
|---|---|---|---|
| `packages/engine` | `@game/engine` | The simulation, pure TypeScript: world model, tiles, collision, movement, buildings, fixtures, interactions, doors, the natural-terrain toolkit, and the multiplayer core (`net/`: protocol, `Room`, `Prediction`, `Remotes`). **No DOM, no PixiJS, no network**: the server imports it as it is. | nothing |
| `packages/engine-server` | `@game/engine-server` | The multiplayer server: `startServer()` (Node, `ws`): a Room per shared world at `/ws`, limits, heartbeat, `/healthz`. | `@game/engine` |
| `packages/engine-client` | `@game/engine-client` | The browser runtime as a library: `startGame()`, renderers, input, GUI, and the art pipeline (`art/`). | `@game/engine` |
| `worlds/wilds` | `@game/world-wilds` | The Wilds: a `WorldSource` (generated) and its texts. | `@game/engine` |
| `worlds/town` | `@game/world-town` | The Town of Azyr: a `WorldSource` (hand-made plan) and the project content. | `@game/engine` |
| `apps/game` | `@game/app` | game.azyr.io: `index.html`, `src/worlds.ts` (the worlds, for the page and the server), `src/main.ts` (calls `startGame`), `server/main.ts` (calls `startServer`), Vite config. | all |

Worlds are pure data and functions (no DOM), so a server can run them too.

**To add a world:** a new package under `worlds/` that exports a `WorldDefinition` (`id`, `name`,
`createSource(seed)`, `examine` lines, `darkness`, and `multiplayer: true` to share it), and add
it to the `worlds` list of an app.
A world's source implements `WorldSource` (`packages/engine/src/world.ts`): `chunk()`,
`buildingAt()`, `buildingsIn()`, `fixtureAt()`, `fixturesIn()`, `spawn()`; every method must give
the same answer every time (client and server must see the same world). Reuse the engine's
`naturalGround` / `naturalDecor` for natural terrain. Test it with the engine's rules (see the
town and wilds tests: wall ring, reachable fixtures, glyphs for every character).

**To add an application:** a new package under `apps/` like `apps/game` (an `index.html` with
the engine's elements, a `main.ts` that calls `startGame({ worlds, title })`, a Vite config that
defines `__COMMIT__`), its own nginx site and deploy. All apps share the engine's atlas for now;
when an app needs art of its own, give the atlas builder a list of extra frames per app.

### Engine client (`packages/engine-client/src`)

- `game.ts`: `startGame()`: picks the world (`?world=`), makes the layers, renderers and GUI,
  runs the fixed-step loop, and the action flow (doors, pages, links). In a shared world it
  makes a `NetSession` and the tick goes through it.
- `skins/`: the visitor's skin seed (`seed.ts`, localStorage `game.skin.v1`, `?skin=`), the Web
  Worker that renders skins (`skin-worker.ts`) and `SkinStore` (textures, render queue,
  localStorage cache of rendered sheets).
- `net/session.ts`: the connection to the multiplayer server (prediction while online, alone
  while not, reconnection). See `docs/multiplayer.md`.
- `render/`: `camera.ts` (pixel-perfect zoom), `terrain.ts` (ground chunks drawn into render
  textures; trees and rocks as depth-sorted sprites), `buildings.ts` (walls, doors, roofs,
  signs; fades the roof, the sign and the front wall while the player is inside),
  `fixtures.ts` (furniture, props, NPCs, portal glows; gives the lights of fixtures),
  `player-view.ts` (8-frame walk in a set of player textures, a skin or the atlas wanderer, and a faint copy above the props
  that shows the player through trees), `others.ts` (the other players of a shared world, with
  their torches), `lighting.ts` (the light map: darkness with a hole for each light),
  `crt.ts` (the CRT shader), `pixel-text.ts` / `text-layout.ts` (the pixel font),
  `speech-bubble.ts` (pages of text over a head, above the darkness).
- `input/`: `keyboard.ts` (KeyboardEvent.code, so WASD works on any layout; keys typed into a
  form field are ignored) and `joystick.ts` (floating touch stick).
- `ui/`: the GUI, all HTML over the canvas: `strings.ts` (every engine text the player reads),
  `hud.ts` (hint, debug panel, fatal error), `action-button.ts` (bottom right; E on a
  keyboard), `link-card.ts` (a real link for a fixture with one), `world-menu.ts` (top right,
  map icon), `settings-panel.ts` (top right: CRT on/off and sliders, saved in localStorage
  `game.crt.v1`; `?crt=` / `?nocrt` win over it), `panels.ts` (one top-right panel at a time),
  `presence.ts` (shared worlds only: how many other visitors are here; top centre on a wide
  screen, top left on a phone).
- `art/`: the art and the atlas packer (`build.ts`). Output goes to `src/generated/` (in
  `.gitignore`; made by `dev`, `build` and `typecheck`). See "Art".

## Art

Style: dark, desaturated and realistic in proportion, after Diablo and Castlevania. It is
approved: new art must match it. The art is made by code, in `packages/engine-client/art/`:

- `sdf.ts`: a small offline renderer for "pre-rendered" sprites. A model is a list of SDF parts
  (sphere, ellipsoid, box, cylinder, round cone, capped cone, with noise displacement) with
  materials. One ray per pixel, one fixed light from the top left, the result put into the
  shades of the material (`ramp`), then an outline and contact lines. Two projections:
  `'pitch'` (default; depth foreshortened: round, small things such as the player, trees,
  rocks) and `'oblique'` (depth not foreshortened, so a model fills whole tiles of the ground
  grid: walls, doors, fixtures).
- `figure.ts`: **the** human figure, as parameters (`FigureSpec`: height, build, head;
  headwear, hair, beard, cloak cut, body, pauldrons, scarf, pouch, tabard, horns, circlet, item)
  and colours (`Palette`). Each part has a bounding sphere, so the figure renders fast.
- `characters.ts`: the default player (the hooded wanderer, about 28 px tall, 8-frame walk, four
  real views: frames `player/<view>/...`) and the NPC looks (`NPC_LOOKS`: cloak colours, hood up
  or down, hair; frames `npc/<look>`), all from `figure.ts`.
- `skins.ts`: random player skins. A 32-bit seed picks a vibe (wanderer, knight, monk, witch,
  ranger, plague doctor, noble, gravedigger) and, inside it, proportions, garments, an item and
  muted colours. `renderSkinSheet()` gives 4 views x (stand + 8 walk) frames of 32 x 48
  (pivot 16, 42). The browser runs it at run time, so `skins.ts`, `figure.ts`, `sdf.ts`,
  `raster.ts` and `image.ts` must not import Node modules (`png.ts` does; that is why `Image`
  is in `image.ts`). **Bump `SKIN_VERSION` when a seed would give another picture**: browsers
  cache rendered skins under it. Preview many skins before you change the vibes.
- `props.ts`: spruces, a dead tree and a rock. `materials.ts`: the materials that buildings and
  fixtures share (`M.<name>`).
- `buildings.ts`: building styles. Each wall style of `WALL_STYLES` (stone, timber, planks,
  brick, rubble, gothic, canvas, painted) has walls (`wall/<walls>/<mask>/<variant>`, mask bit
  1 = wall to the north, 2 = east, 4 = west), a door (`wall/<walls>/door/open|closed`) and a lit
  window (`wall/<walls>/window`). Each roof style of `ROOF_STYLES` (slate, shingle, thatch,
  canvas, indigo, battlement, clay, copper) has roof pieces (`roof/<roof>/<row>/<column>/<variant>`);
  all share `roof/shadow`. Roof props (`ROOF_PROPS`: `roof/chimney`, `roof/vane`, `roof/spire`,
  `roof/moon`, `roof/flag-wine`, `roof/flag-green`) have their pivot at their foot. Floors:
  `ground/floor/N` (wood), `ground/floorstone/N`, `ground/floorearth/N`. A wall is a 16x48
  frame: top face (16 px) over front face (32 px). Keep wall tops dark: the torch lights them
  from close by, and a pale top glares.
- `fixtures.ts`: every fixture type, `fixture/<kind>` (and `fixture/portal-glow`, white, which the
  client tints). Footprints must match the boxes in `packages/engine/src/fixtures.ts`.
- `ground.ts`: ground tiles from tiling noise (grass, moss, mud, gravel, water, cobblestones)
  and the ragged edge pieces. `decor.ts`: small decor as text grids.
- `lights.ts`: light holes at the radii of `LIGHTING.radii` (48, 96, 150) and the glow. The
  settings go into the atlas JSON (`meta.lighting`).
- `font.ts`: the pixel font (capitals 7 px, descenders 2 px, white glyphs that the client
  tints; frames `font/<char code>`; metrics in `meta.font`), with Spanish lowercase accents,
  ñ, ¿, ¡, ·, dashes. Accented capitals and curly quotes draw as plain ones. Also the bubble
  (`ui/bubble`, `ui/bubble-tail`), the "more pages" triangle (`ui/more`) and the sign board
  (`ui/sign`).

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
- Bottom left: the joystick at rest. Bottom right: the action button. Bottom centre, above
  them: the link card. Top right: the worlds button and the settings button.
- Every engine text the player reads goes in `src/ui/strings.ts`; what things say is content and
  belongs to the world.
- A control gives the focus back after use, or WASD stops working (see `SettingsPanel`).
- A link must be a real `<a>` (the link card): a browser opens a new tab from a key press or a
  click, but not from the start of a touch. So E opens the link, and a tap on the action button
  only points at the card's link (`pulse()`); a tap on the link opens it.

## Fixtures, content and actions

- **Walking NPCs** (`packages/engine/src/npc.ts`, since 2026-10-08): a world gives them with
  `WorldSource.npcs()`: `NpcDef` = id, look, home tile, `area` (the tiles where it may walk;
  open and in one piece), content. `NpcCrowd` walks them: a random tile of the area by the
  shortest path, at `NPC_SPEED` (28 px/s); then a stop of 1.5-6 s, sometimes 6-14 s, now and
  then 15-25 s, looking round. A player within `NPC_HOLD_RADIUS` (22 px) stops the NPC, and it
  turns to the player, so a dialog is never cut. NPCs do not collide with anyone. In a shared
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
  and `link` (`url`, `label`, `title`: the link card). Without content, the world's
  `examine[kind]` line is used; a thing with neither is not a target.
- **Actions:** `findInteraction(world, player, accept)` (shared) finds the nearest target within
  `INTERACT_RANGE` (6 px from the feet hitbox to the target's box; a door uses its whole tile),
  in front of the player first. The client runs it every frame. A press: on a door, `useDoor()`
  (shared; it does not close a door on the player); on anything else, the first page, then
  the next page on each press, then "Close"; with a link, the card stays while the player is
  in range, and E opens the link. Walking away closes the dialog and the card.
- **Lights:** a fixture's `light` (`radius` from `LIGHTING.radii`, `colour`, centre in pixels
  from its anchor corner). The player's torch is radius 150. A portal's glow takes the colour of
  its light. `WorldDefinition.darkness` (0..1) scales the night: the town is 0.6, the wilds 1.

## Buildings

- **The model** (engine): a rectangle of walls with one door in the south wall (never in a
  corner), a floor (`Ground.Floor`, `FloorStone` or `FloorEarth`, under the walls too; the world
  source sets it), fixtures, and optional extras: a `sign` (the name over the door), a `style`
  (`{ walls, roof }`, the names of the art sets; default `DEFAULT_STYLE`, stone and slate),
  `windows` (columns of the south wall with a lit window: `Structure.Window`, solid like a wall)
  and `roofProps` (`{ name, tx }`: a chimney, a flag, a spire on the ridge). The engine does not
  read the style or the roof props. `structureIn()` gives the structure code of each tile;
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

- **The Wilds** (`worlds/wilds`): the engine's natural terrain from a seed (`?seed=`), and a
  house in about a third of the 24 x 24-tile cells (`houses.ts`; the cell next to the spawn
  always tries). Houses: 7-11 x 6-9 tiles, never on water; furniture by `furnish()` (bed with a
  chest at its foot, bookshelves, a table with a candle, barrels) with the door column and the
  row inside the south wall kept free; nothing grows on, round or in front of a house; a mud
  path leads to the door. A chunk also reads the next cells (a house's ground can reach into
  them). Tests check 150+ houses for a wall ring, one door and reachable furniture.
- **The Town of Azyr** (`worlds/town`): `projects.ts` has the content of each project of the
  azyr.io landing page (`/var/www/azyr.io/public/index.html` and the detail pages), in the
  landing page's order; **when those pages change, change this file.** Kandrax Rol speaks
  Spanish, as its page does. Each project also has its **house**: a style, a floor, roof props
  and a **plan** in ASCII, walls included (`#` wall, `D` door, `+` lit window, `.` floor, `P`
  the portal, `K` the keeper, any other letter a thing of `exhibits`; a thing of more tiles has
  its letter on each tile). Every house has its own walls and roof, and things that match them
  (the smithy has a forge and an anvil, the healer's hut a cauldron). `layout.ts` has the **town
  map** in ASCII: digits `1`-`8` are the rectangles of the houses (the plan must have the same
  size), `=` cobblestones, `.` gardens, `T` trees, and the things of the plaza and the lane
  (`F` fountain, `N` notice board with a link to azyr.io, `C` the crier, `L` lamps, `b` barrels,
  `x` crates). Four small houses (6-8 x 5-7 tiles) face the plaza from the north; four more stand
  with their backs to it and face the lane in the south; alleys of 1-3 tiles join the two.
  Outside the map the forest begins. The parser checks the plans (walls, one door, one portal,
  one keeper, footprints, a free tile inside the door) and throws on a mistake.
  **Two rules for the map (2026-10-08, Fede's request):** (1) from the spawn, the default view
  of a 1280 x 720 desktop (26.7 x 15 tiles) shows all eight doors at once, and a phone the four
  in the middle: so the town is only 13 rows from the north fronts (row 8) to the south fronts
  (row 20), the outer doors are near the inner ends of their houses, and the corner houses have
  short names (their signs must fit on the screen and stay clear of the GUI in the corners);
  (2) the 5 x 3 tiles in front of each door stay clear: no lamp, prop, tree or wall. Tests check the
  signs, one portal with an https link per house (and the exact URLs), a different style for
  every house, that the player can walk to every thing in every house and act on it (and to
  every door and outdoor thing from the plaza), the two map rules (with the real `Camera`), and a
  glyph for every character of every text.

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
- Comments and documentation use Simplified Technical English (the rule for this box).

## Verify a change in a browser

There is no GPU on the box, but headless Chromium renders WebGL with SwiftShader (slowly: 1 to
6 FPS is normal there; with the CRT at a phone resolution a screenshot takes about a minute:
give `page.screenshot` a `timeout` of 180000). Playwright is not a dependency of this repo; the
hidden-agenda checkout has it:

```js
const { chromium } = require('/opt/hidden-agenda/node_modules/playwright');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
```

Serve the build with `npx vite preview --port 4173` in `apps/game`. For a shared world, also run
a game server; on the box use another port than production's 3008, for example
`PORT=3018 ORIGINS=http://127.0.0.1:4173 node apps/game/server/main.ts`, and start the preview
with `GAME_SERVER=ws://127.0.0.1:3018`. Use one browser **context** per visitor. URL switches:
`?world=town`, `?debug` (read `#debug` for the world, tile, target, building, and `net` and
`others` in a shared world), `?offline` (a shared world played alone), `?skin=<n>` (another
skin, not saved), `?at=tx,ty`
(start on that tile, or the nearest open one), `?seed=`, `?nocrt` (much faster under
SwiftShader), `?nolight`. Read a dialog from the live region `.sr-only[role=status]`, and the
link from `#link-card a`. For touch, use a context with `hasTouch: true` and send
`Input.dispatchTouchEvent` through a CDP session; a `touchEnd` releases the points that it
lists, so list only the finger that lifts.

## Deploy

See `deploy/README.md`. Short form: `scripts/deploy.sh` on the box (it builds `apps/game`,
restarts the PM2 process `game-server` first, then publishes the client). No nginx reload is
necessary. Cloudflare Authenticated Origin Pulls is on, so a local `curl -k https://localhost/`
gets 400; that is correct. The server's health: `curl -s http://127.0.0.1:3008/healthz`.
**Never run `pm2 update` or `pm2 flush` on this box** (see /root/CLAUDE.md).
