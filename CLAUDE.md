# CLAUDE.md

This file gives guidance to Claude Code when it works in this repository.

## What this is

A POC for an online, multiplayer, sandbox pixel-art game in the browser, at
https://game.azyr.io. Now: one player walks in an endless procedural world, with a keyboard or
a touch joystick. Next: an authoritative multiplayer server. Read `docs/stack.md` before you
change the stack; it records why each part was selected.

## Commands

Node 24 (`.nvmrc`). npm workspaces.

```bash
npm install
npm run dev          # Vite dev server, http://127.0.0.1:5173 (makes the art first)
npm run check        # type check of all packages + Vitest
npm test             # Vitest only
npm run art          # make src/generated/ again (atlas + icon)
npm run build        # production build in packages/client/dist
scripts/deploy.sh    # on the box: check, build, publish to /var/www/game.azyr.io
```

Art preview at 4x: `cd packages/client && node art/build.ts --preview /tmp/atlas.png`.

## Layout

- `packages/shared`: the simulation. World generation (`world.ts`), buildings
  (`buildings.ts`), movement and collision (`player.ts`), interactions (`interact.ts`: what the
  player can act on, and doors), noise, constants. **No DOM and no PixiJS here**: the server will import this
  package as it is.
- `packages/client`: the browser client on PixiJS v8.
  - `src/main.ts`: start-up, layers, fixed-step loop, glue.
  - `src/render/`: `camera.ts` (pixel-perfect zoom), `terrain.ts` (chunks drawn into render
    textures; trees and rocks as depth-sorted sprites), `buildings.ts` (walls, doors, furniture
    and roofs; fades the roof and the front wall while the player is inside),
    `player-view.ts` (8-frame walk, and a
    faint copy above the props that shows the player through trees), `lighting.ts` (the
    Diablo-style light radius and the warm, flickering glow), `crt.ts` (a full-screen shader
    for a CRT look: diffused pixels, a halo round bright points, optional scanlines).
  - `src/input/`: `keyboard.ts` (KeyboardEvent.code, so WASD works on any layout; keys typed
    into a form field are ignored) and `joystick.ts` (floating touch stick).
  - `src/render/pixel-text.ts` (`PixelFont`: lays out the atlas font in world pixels; the pure
    measure and wrap logic is in `text-layout.ts`) and `speech-bubble.ts` (a line over the
    player's head, drawn by the game, above the darkness).
  - `src/ui/`: the GUI, all HTML over the canvas. `strings.ts` (every text the player reads),
    `hud.ts` (hint, debug panel, fatal error), `action-button.ts` (bottom right; E on a
    keyboard), `settings-panel.ts` (button
    in the top-right corner: CRT on/off, a slider for each CRT setting, Copy link, Reset;
    saved in localStorage `game.crt.v1`; a `?crt=` or `?nocrt` URL wins over it).
  - `art/`: the art and the atlas packer (`build.ts`). Output goes to `src/generated/`, which
    is in `.gitignore` and is made by `dev`, `build` and `typecheck`. See "Art" below.
- `deploy/`: nginx site and mTLS snippet. `scripts/deploy.sh`: the deploy.

## Art

Style: dark, desaturated and realistic in proportion, after Diablo and Castlevania. The art is
made by code, in `packages/client/art/`:

- `sdf.ts`: a small offline renderer for "pre-rendered" sprites. A model is a list of SDF
  parts (sphere, ellipsoid, round cone, capped cone, with noise displacement) with materials.
  It casts one ray for each pixel through a camera that looks down at `CAMERA_PITCH`, lights
  the hit with one fixed light from the top left, puts the result into the shades of the
  material (`ramp`), and adds an outline and contact lines.
- `characters.ts`: the player, a hooded figure about 28 pixels (6.5 heads) tall, on a
  skeleton with an 8-frame walk cycle. Proportions are constants at the top of the file.
- `props.ts`: spruces, a dead tree and a rock, from the same renderer.
- `buildings.ts`: stone walls (`wall/<mask>/<variant>`, mask bit 1 = wall to the north, 2 =
  east, 4 = west), the door (`wall/door/open|closed`), wooden floor (`ground/floor/N`), slate
  roof pieces (`roof/<row>/<column>/<variant>`, `roof/shadow`) and furniture
  (`furniture/<kind>`). Walls, the door and furniture use the **oblique** projection of
  `sdf.ts`: depth is not foreshortened, so a model fills whole tiles of the ground grid. Keep
  the default 'pitch' projection for round, small things (the player, trees, rocks). A wall
  is a 16x48 frame: the top face (16 px) over the front face (32 px), standing on its tile.
- `ground.ts`: ground tiles from tiling noise, and the ragged edge pieces. `decor.ts`: small
  decor as text grids. `lights.ts`: the light textures and the `LIGHTING` settings, which
  `build.ts` also writes into the atlas JSON (`meta.lighting`) for the client.
- `font.ts`: the pixel font (text grids; capitals 7 px, descenders 2 px, white glyphs that the
  client tints; frames `font/<char code>`, metrics in `meta.font`) and the speech bubble frame
  (`ui/bubble`, a 9-slice, and `ui/bubble-tail`). A missing character draws `font/fallback`:
  add a glyph to `GLYPHS` before you show text that needs it (accents, for example).

Look at art before you commit it: `node art/build.ts --preview /tmp/atlas.png`, or a
screenshot of the game with `?nolight`. Read the PNG with the Read tool.

## GUI

The GUI is approved in this style; new GUI must match it.

**Two kinds of text, two renderers:**
- **Text in the world** (speech, names, labels over things) is drawn by the game: the pixel font
  from the atlas, in world pixels, through the CRT filter. Use `PixelFont` and a frame from the
  atlas (`ui/bubble`), never HTML. If it must be readable at night, put it above the darkness
  (the last layer of the scene). Repeat it in a hidden live region (`.sr-only`) for screen
  readers.
- **The GUI** (panels, buttons, sliders, the hint) is HTML over the canvas, outside `#game` so a
  touch on it never moves the player.

For the HTML GUI:

- Colours and fonts come only from the theme variables at the top of `src/style.css`: dark
  translucent panel (`--ui-panel`), thin dried-blood-red border (`--ui-border`), 2 px corners,
  parchment text (`--ui-ink`), wine-red accent with a soft glow for "active" (`--ui-accent`,
  `--ui-accent-glow`), Georgia serif (often italic) for words, monospace for numbers.
- Controls at the bottom sit `--ui-margin` from the edges plus the safe-area insets: the
  joystick rests bottom left, the action button bottom right. The settings button is top right.
- Every text the player reads goes in `src/ui/strings.ts`.
- A control gives the focus back after use, or WASD stops working (see `SettingsPanel`).

## Actions

`findInteraction(world, player)` in `packages/shared/src/interact.ts` decides what the player
can act on: the nearest examinable thing (trees, rocks) within `INTERACT_RANGE` (6 px between
the feet hitbox and the thing's solid box), and a thing in front of the player first. It is
shared code so the server can check an action later. The client runs it every frame: the action
button lights up when there is a target, and the action button or E shows the line from
`STRINGS.examine` in the speech bubble; on a door it opens or closes it. A new examinable thing
needs an entry in `BY_DECOR` or `BY_STRUCTURE` (interact.ts) and a line in `STRINGS.examine`.
The range is measured to the thing's solid box (to the whole tile for a door, which has no box
while it is open).

## Buildings

- **Where:** the world is cut into cells of `BUILDING_CELL` (24) tiles; a cell has a building
  with a chance of 35%, well inside it (cell (0, 0), next to the spawn, always tries). So the
  building of a tile is always the building of that tile's cell: `world.building(cellX,
  cellY)`, `world.buildingAt(tx, ty)`, `world.insideOf(tx, ty)`. A chunk also reads the
  cells next to it, because the ring round a building and the path to its door can reach a few
  tiles into the next cell.
- **What:** 7-11 x 6-9 tiles; an outer ring of walls; one door in the south wall, never in a
  corner; a wooden floor (`Ground.Floor`, under the walls too); furniture (`furnish()`): a bed
  in a corner by the north wall with a chest at its foot, bookshelves against the north wall,
  a table with a free tile all round it, barrels in the south corners. The door column and the
  row just inside the south wall stay free. A test walks the floor from the door and checks
  that every piece can be reached, for 150+ buildings.
- **Round it:** nothing grows on a building, one tile round it, or on the 3 x 3 approach to
  its door; a short mud path leads to the door.
- **Structure layer:** each chunk has `structure` (a `Structure` value per tile) next to ground
  and decor. `solidBox()` reads it: walls and a closed door are full tiles, furniture has boxes
  that match its art (`STRUCTURE_BOX`), an open door is open.
- **Doors** start closed. `useDoor(world, player, tx, ty)` (shared) opens or closes one, and
  refuses to close it on the player ('blocked'). The open doors are `World.openDoors`: the first
  world state that is not in the seed. The server must own it when multiplayer comes.
- **Drawing:** `render/buildings.ts` puts walls, the door and furniture in the entity layer
  (walls sort by their tile's middle line, furniture by `FURNITURE_DEPTH`), and the roof as one
  container just in front of the south wall (zIndex `y1 * 16 + 8.5`): above everything in the
  building, below what stands south of it. The roof sits on the wall tops, 32 px up: rows of
  slate from the north eave (`top`), the back slope, the `ridge`, the front slope, to the
  `eave`. While the player is inside (interior or doorway), the roof fades out and the front
  wall fades to 35%, or the front wall would hide the two floor rows behind it.

## Rules

- **Shared code uses only erasable TypeScript** (`erasableSyntaxOnly`): no `enum`, no
  `namespace`, no constructor parameter properties. Use `as const` objects. Relative imports
  have the `.ts` extension. Node 24 can then run the files directly, with no build step.
- **The simulation is deterministic.** World generation uses only `hash2`/`fbm` from
  `noise.ts`. Do not use `Math.random()` in `packages/shared`. Random choices that are only
  visual (tile variants, flips) belong in the client, with `LOOK_SEED`.
- **Movement goes through `stepPlayer()` at the fixed `TICK_RATE`.** Do not move the player
  in the render loop. The render loop only interpolates between the last two steps.
- **Pixel-perfect**: whole-number zoom in device pixels, `nearest` scaling, `roundPixels`.
  New art must use the 16-pixel grid. Do not scale a sprite by a fraction.
- **Frame names are the contract between art and code**: `ground/grass/3`, `edge/dirt/nw`,
  `prop/tree/2`, `player/left/stand`, `player/left/walk/5`, ... `Art.frame()` throws on an
  unknown name. Numbered variants are found with `Art.variants(prefix)`, so the art can add a
  variant with no code change. Real art from Aseprite must use the same names, in the "hash"
  JSON format.
- **Do not mirror lit sprites.** The light in all art comes from the top left; a mirrored
  sprite has its light on the wrong side. That is why the player has a real `left` view.
- **Ground textures must not show the tile grid.** No noise layer as large as the tile, and
  enough variants. Check a wide patch of tiles, not one tile.
- **Ground edges**: a tile draws the edges of each neighbour with a higher `BLEND_ORDER`
  (`render/terrain.ts`). A new ground type needs a blend order, variants and edge pieces.
- Depth: trees, rocks and players are in `entityLayer` with `zIndex` = the y of the point where
  they stand: the centre of the feet for a player, the centre of the solid box for a prop
  (`PROP_FOOT` in `render/terrain.ts`).
- **The CRT defaults are Fede's choice** (`0.6,1,1,0`, set 2026-10-07): do not change them
  without a request. **Text in the world has its own CRT filter** with fixed settings, also
  Fede's choice: `CRT_TEXT` (`0.3,0.5,0.5,0.3`) in `render/crt.ts`. So the stage has two
  layers, `worldLayer` (full-screen filter) and `textLayer` (filter on the text's bounds plus
  8 px of padding, cheap), and the camera moves `scene` and `textScene` together. The panel's
  sliders change the world filter only; its switch turns both on and off. **The scanlines must stay on the game-pixel grid.** They use
  the zoom and the world origin from `CrtFilter.setGrid()`, every frame; without that they
  would crawl over the world when the camera moves. A filter that does not cover the whole
  screen starts lower down: the shader adds `uOutputFrame.y` (CSS px) times `uResolution`. The filter has a WebGL program only, so the
  renderer is pinned to WebGL. Try settings in the display settings panel or in the URL:
  `?crt=spread,mix,glow,scanline` (for example `?crt=,,,0.5` exaggerates the scanlines to
  check the alignment); `?nocrt` turns it off. New defaults go into `CRT_DEFAULTS` in
  `render/crt.ts`; slider ranges into `SLIDERS` in `settings-panel.ts`.
- **Overlay UI goes outside `#game`.** The joystick listens for touches on `#game`, so a control
  in another element never moves the player. After a click on a control, give the focus back
  (see `SettingsPanel`), or WASD stops: keyboard.ts ignores keys typed into form fields.
- Comments and documentation use Simplified Technical English (the rule for this box).

## Verify a change in a browser

There is no GPU on the box, but headless Chromium renders WebGL with SwiftShader (slowly: 1 to
6 FPS is normal there). With the CRT filter at a phone resolution (390x844 at DPR 3) one
screenshot takes about a minute: give `page.screenshot` a `timeout` of 180000. That is
SwiftShader, not a measure of the cost on a real GPU. Playwright is not a dependency of this repo; the hidden-agenda
checkout has it:

```js
const { chromium } = require('/opt/hidden-agenda/node_modules/playwright');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
```

Serve the build with `npx vite preview --port 4173` in `packages/client`. Open `/?debug` and
read `#debug` to get the tile position and the action target. `?at=tx,ty` starts the player on
that tile (or the nearest open one), for example next to a tree; `?nocrt` makes SwiftShader
much faster. For touch, use a context with `hasTouch: true` and
send `Input.dispatchTouchEvent` through a CDP session. Careful with two fingers: a `touchEnd`
releases the points that it lists, so list only the finger that lifts.

## Deploy

See `deploy/README.md`. Short form: `scripts/deploy.sh` on the box. No nginx reload is
necessary. Cloudflare Authenticated Origin Pulls is on, so a local
`curl -k https://localhost/` gets 400; that is correct.
