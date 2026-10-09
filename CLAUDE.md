# CLAUDE.md

This file gives guidance to Claude Code when it works in this repository.

## What this is

The **Town of Azyr**, the landing page of https://azyr.io: one house for each project of the
azyr.io list of projects, with keepers, exhibits and portals that link to the projects. It runs
on a pixel-art game **engine** for the browser, with multiplayer: an authoritative Node server,
client-side prediction and interpolation (`docs/multiplayer.md`). The town is shared, so every
visitor sees the others. Read `docs/stack.md` before you change the stack.

**This is the branch `town`, a frozen copy of the game.** On 2026-10-09 Fede split the town
from the game at commit `57060cc`: the game (branch `main`, `/opt/game`, https://game.azyr.io)
goes on with the Wilds only, and the town stays as it was. The town has its own checkout
(`/opt/azyr-town`), its own PM2 process (`town-server`, port 3009) and its own web root
(`/var/www/azyr.io/town`). Rules:

- Change the town only on request, and only here: new houses for new projects, new lines, a
  fix. A change to the game does not come here.
- **Do not merge `main` into `town`.** If the town needs one engine fix from the game,
  cherry-pick that commit and test the town with it.
- The engine and the art here are the town's own copy: change them here when the town needs it,
  and do not expect the change in the game.

Keep the line between engine and content clean: the engine never knows a world's content, and
a world never reaches into the renderer.

## Commands

Node 24 (`.nvmrc`). npm workspaces: `packages/*`, `worlds/*`, `apps/*`.
Without `?world=`, the page starts in the town (it is the only world).

```bash
npm install
npm run dev          # the app's Vite dev server, http://127.0.0.1:5173 (makes the art first)
npm run check        # type check of every package + Vitest
npm test             # Vitest only
npm run art          # make packages/engine-client/src/generated/ again (atlas + icon)
npm run build        # production build of the app in apps/game/dist
npm run server       # the multiplayer server, port 3009 (dev and preview send /ws to it)
scripts/deploy.sh    # on the box: check, build, restart town-server (PM2), publish the client to azyr.io
```

Art preview at 4x: `cd packages/engine-client && node art/build.ts --preview /tmp/atlas.png`.

## Layout and layers

| Package | Name | What | May import |
|---|---|---|---|
| `packages/engine` | `@game/engine` | The simulation, pure TypeScript: world model, tiles, collision, movement, buildings, fixtures, interactions, doors, NPCs, mobs and fights, the natural-terrain toolkit, and the multiplayer core (`net/`: protocol, `Room`, `Prediction`, `Remotes`). **No DOM, no PixiJS, no network**: the server imports it as it is. | nothing |
| `packages/engine-server` | `@game/engine-server` | The multiplayer server: `startServer()` (Node, `ws`): a Room per shared world at `/ws`, limits, heartbeat, `/healthz`. | `@game/engine` |
| `packages/engine-client` | `@game/engine-client` | The browser runtime as a library: `startGame()`, renderers, input, GUI, and the art pipeline (`art/`). | `@game/engine` |
| `worlds/town` | `@game/world-town` | The Town of Azyr: a `WorldSource` (hand-made plan) and the project content. | `@game/engine` |
| `apps/game` | `@game/app` | The town on azyr.io (the folder kept its name from the game): `index.html`, `src/worlds.ts` (the worlds, for the page and the server), `src/main.ts` (calls `startGame`), `server/main.ts` (calls `startServer`), Vite config. | all |

Worlds are pure data and functions (no DOM), so a server can run them too.

**To add a world:** a new package under `worlds/` that exports a `WorldDefinition` (`id`, `name`,
`createSource(seed)`, `examine` lines, `darkness`, and `multiplayer: true` to share it), and add
it to the `worlds` list of an app.
A world's source implements `WorldSource` (`packages/engine/src/world.ts`): `chunk()`,
`buildingAt()`, `buildingsIn()`, `fixtureAt()`, `fixturesIn()`, `spawn()`; every method must give
the same answer every time (client and server must see the same world). Reuse the engine's
`naturalGround` / `naturalDecor` for natural terrain. Test it with the engine's rules (see the
town tests: wall ring, reachable fixtures, glyphs for every character).

**To add an application:** a new package under `apps/` like `apps/game` (an `index.html` with
the engine's elements, a `main.ts` that calls `startGame({ worlds, title })`, a Vite config that
defines `__COMMIT__`), its own nginx site and deploy. All apps share the engine's atlas for now;
when an app needs art of its own, give the atlas builder a list of extra frames per app.

### Engine client (`packages/engine-client/src`)

- `game.ts`: `startGame()`: picks the world (`?world=`), makes the layers, renderers and GUI,
  runs the fixed-step loop, and the action flow (doors, pages, links). In a shared world it
  makes a `NetSession` and the tick goes through it.
- `skins/`: the visitor's skin seed and name (`seed.ts`, localStorage `game.skin.v1` and
  `game.name.v1`, `?skin=`; `newSkinSeed()` for "New look"), the Web
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
  their torches and their names), `name-tag.ts` (a name over a head, in the small font: the
  other players' and the visitor's own; without a chosen name, `skinName()` of the look), `lighting.ts` (the light map: darkness with a hole for each light),
  `crt.ts` (the CRT shader), `pixel-text.ts` / `text-layout.ts` (the pixel fonts: `new
  PixelFont(art)` or `new PixelFont(art, 'small')`),
  `speech-bubble.ts` (pages of text over a head, above the darkness).
- `input/`: `keyboard.ts` (KeyboardEvent.code, so WASD works on any layout; keys typed into a
  form field are ignored) and `joystick.ts` (floating touch stick).
- `ui/`: the GUI, all HTML over the canvas: `strings.ts` (every engine text the player reads),
  `hud.ts` (hint, debug panel, fatal error), `action-button.ts` (bottom right; E on a
  keyboard), `link-card.ts` (a real link for a fixture with one), `world-menu.ts` (top right,
  map icon; only in an app with more than one world, so not on azyr.io), `settings-panel.ts` (top right: CRT on/off and sliders, saved in localStorage
  `game.crt.v1`; `?crt=` / `?nocrt` win over it; `addSection()` puts a section on top),
  `you-section.ts` (the "You" section of the settings: the player's look, "New look", the name), `panels.ts` (one top-right panel at a time),
  `presence.ts` (shared worlds only: how many other visitors are here; top centre on a wide
  screen, top left on a phone).
- `art/`: the art and the atlas packer (`build.ts`). Output goes to `src/generated/` (in
  `.gitignore`; made by `dev`, `build` and `typecheck`). See "Art".

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
  headwear, hair, beard, cloak cut, body, pauldrons, scarf, pouch, tabard, horns, circlet, item)
  and colours (`Palette`). Each part has a bounding sphere, so the figure renders fast.
- `characters.ts`: the default player (the hooded wanderer, about 28 px tall, 8-frame walk, four
  real views: frames `player/<view>/...`) and the NPC looks (`NPC_LOOKS`: cloak colours, hood up
  or down, hair; frames `npc/<look>`), all from `figure.ts`.
- `skins.ts`: random player skins. A 32-bit seed picks a vibe (wanderer, knight, monk, witch,
  ranger, plague doctor, noble, gravedigger) and, inside it, proportions, garments, an item and
  muted colours. `renderSkinSheet()` gives 4 views x (stand + 8 walk + 4 attack) frames of 56 x 56
  (pivot 28, 50: room for a staff over the head or a rapier at full reach; `SKIN_PORTRAIT` is the
  32 x 48 round the figure at rest, for the settings preview). The browser runs it at run time, so `skins.ts`, `figure.ts`, `sdf.ts`,
  `raster.ts` and `image.ts` must not import Node modules (`png.ts` does; that is why `Image`
  is in `image.ts`). `skinName(seed)` names a skin for its vibe (its own random stream, so the
  look of a seed never changes with the names). **Bump `SKIN_VERSION` when a seed would give
  another picture or the sheet changes**: browsers
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
- `mobs.ts`: the mobs, SDF models in poses: the imp (small, horns, bat wings, claws, tail) and the
  brute (big grey ghoul with tusks and a spiked club). Frames `mob/<kind>/<view>/stand`,
  `.../walk/<0-5>`, `.../windup/<0-1>`, `.../strike/<0-1>`, `.../die/<0-5>`, and
  `mob/<kind>/shadow`. The eyes are a material of their own: the build lists the eye pixels of
  each frame in `meta.mobEyes`, and the game draws them glowing above the darkness. In a death
  the eyes go dark. Preview the frames when you change a model: poses that look right in one
  view can hide the head in another.
- `attacks.ts`: how each skin attacks. `attackStyle(vibe, spec)`: a sword slashes (a noble's
  rapier thrusts), a staff bashes with both hands, an orb staff casts a spell, a lantern throws
  flame; without an item a witch casts from her hands, a monk strikes with the palm, a plague
  doctor throws a poison cloud (miasma), a ranger or a noble thrusts a dagger, a knight slashes,
  the others punch. Each style has four poses (`attackAction`: arm directions, a lean, the weapon
  in the hand, as a `FigureAction` for `figure()`), rendered as the attack frames of a skin sheet
  and as `player/<view>/attack/<i>` (a punch) for the atlas wanderer. All attacks reach as far:
  only the look differs.
- `fx.ts`: the effects of a fight, white and grey, tinted by the game: the effect of each attack
  style (`fx/<style>/<0-3>`, facing right; the game turns it) and the star of a stun (`fx/star`).
- `ground.ts`: ground tiles from tiling noise (grass, moss, mud, gravel, water, cobblestones)
  and the ragged edge pieces. `decor.ts`: small decor as text grids.
- `lights.ts`: light holes at the radii of `LIGHTING.radii` (48, 96, 150) and the glow. The
  settings go into the atlas JSON (`meta.lighting`).
- `font.ts`: the pixel font (capitals 7 px, descenders 2 px, white glyphs that the client
  tints; frames `font/<char code>`; metrics in `meta.font`), with Spanish lowercase accents,
  ñ, ¿, ¡, ·, dashes. Accented capitals and curly quotes draw as plain ones. The small font
  (`SMALL_GLYPHS`: capitals 5 px, digits, space and `' - . _`; frames `smallfont/<char code>`;
  metrics in `meta.smallFont`) draws lowercase as capitals and an accented letter as the plain
  one; it is for the names over other players. Also the bubble
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

## Arrival in a world

`WorldDefinition.intro` (`title`, `speaker`, `welcome`): when a visitor arrives, the world's name
shows in the middle of the screen (`render/intro.ts`: on a dark band between two red lines that
grow from the centre; it fades in 0.65 s while it rises a few pixels, stays 1.45 s, and fades out
0.8 s), in the pixel font at twice the size of world text, in the text layer. In the middle of
the fade-out, the NPC `speaker` starts its welcome (`render/welcome.ts`): one line after the
other, each as long as it takes to read, over its head; the visitor can walk on, and talking to
the NPC ends it. No other NPC speaks during the arrival. Screen readers hear the welcome. The
town has one (the crier explains the town). `?nointro` skips it;
`?introat=<ms>` stops the title at that moment, for a screenshot on a slow machine.

## Mobs and fights

`packages/engine/src/mobs.ts` (`Horde`): hostile mobs of two kinds (`MOB_STATS`): the **imp**,
small and quick (runs at 96 px/s, faster than a player, and keeps running during its short
wind-up, so running away does not save you), and the **brute**, big and slow (42 px/s, a long
wind-up in which it stands, a 2 s stun: you can walk away from it). A mob wanders round its
home, and now and then it moves its home 3 tiles towards the nearest player (a prowl: along
the shortest way through open ground where it may roam, so round a town or a lake; never closer
than 6 tiles), so mobs find players who stand still (in the town, in about 20 to 90 s at the
edge). A mob that stays within 8 px of one point for 1.5 s while it wants to move is stuck (back
and forth between trees): a walk ends, a chase bends the other way and gives up after 4 s. When it sees a player (close, out in
the open, no building between), it runs at the player on a curve (an angle off the straight line
that shrinks as it comes near); close enough, it winds up and strikes. A hit stuns
the player (`stunPlayer`: no move, no attack), and after it the player has a guard of 1 s in which
no mob can hit it again; the mob runs away for 1 to 2 s and then comes back. While the player is
stunned or guarded, mobs circle round it. A mob never enters a building, gives up the chase when
it loses the player for 1.5 s or is 18 tiles from home, and walks home. New mobs come one at a
time, 17 to 25 tiles from every player (out of sight), up to the world's population round each
player; a wandering mob 36 tiles from every player goes away.

The player's attack is part of the input (`MoveInput.attack`: the side to strike), so
`stepPlayer` stays the one rule for prediction: an attack lasts `ATTACK_TICKS` (the player stands
still), and the next can start `ATTACK_COOLDOWN_TICKS` after it. `stepPlayer` returns true when
an attack starts; the caller asks the horde what it hits (`Horde.strike`: in reach, in front;
`attackHits`). A blow takes one of the mob's `health` (imp 1, brute 3) and pushes it away from
the attacker (`knockback`: imp 10 px, brute 18 px, over 0.2 s). The last blow kills it: it
flashes white, falls, fades, and ash rises. Another blow makes it reel (state `hurt`: a flash and
a recoil frame, `hurtMs`): its wind-up or its blow breaks off, and then it goes for the attacker.

A world opts in with `WorldSource.mobs()` (`MobRules`: `roam` where mobs live and wander, `hunt`
where they may step while they chase, `population` per player). The town: they live in the forest round
it and may come `MOB_EDGE` (3) tiles into the town while they chase; the plaza, the lane and
every door are out of their reach (a test checks it); 3 imps and 2 brutes. The client of a
single-player world runs its own `Horde`; in a shared world the server runs it (protocol 5, see
`docs/multiplayer.md`): the client sends its attacks with the time of the mobs that it showed,
and it shows a kill at once (the server confirms it, or after 0.7 s the mob lives on). In the client: `render/mobs.ts` (frames, eyes, ash), `PlayerView` (the arc, a
lunge, the attack frames of the skin and the effect of its style, in the colour of the style (a
spell in the colour of the skin's orb; spells, flames and palms glow and give a short light),
the red flash of a hit, stars over the head while stunned, a blink while guarded) and
`ui/attack-button.ts` (left of the action button; Space or J on a keyboard). A press is kept for
150 ms, and the attack turns to the nearest mob in reach. `?mob=imp,brute` puts mobs next to the
player at the start (single-player worlds); `?nomobs` turns them off.

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
  its light. `WorldDefinition.darkness` (0..1) scales the night: the town is 0.6.

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
  (2) the 5 x 3 tiles in front of each door stay clear: no lamp, prop, tree or wall. The keeper
  of each house is a walking NPC: its area is the open floor of the house, the door, and the
  first 5 x 2 of those clear tiles (`DOORSTEP`); the crier walks the plaza south of the fountain
  (`CRIER_AREA`). Each keeper has `barks`: short lines from its project's azyr.io page (Spanish
  for Kandrax Rol); the crier has town lines. Tests check the
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
a game server; on the box use another port than production's 3009 (and the game's 3008), for
example `PORT=3019 ORIGINS=http://127.0.0.1:4174 node apps/game/server/main.ts`, and start the
preview with `GAME_SERVER=ws://127.0.0.1:3019` on port 4174. Use one browser **context** per visitor. URL switches:
`?debug` (read `#debug` for the world, tile, target, building, and `net` and
`others` in a shared world; `walkers`, `doors`, `lines` and `intro` in the town; `mobs` and
`fight` in a world with mobs), `?offline` (a
shared world played alone), `?skin=<n>` (another skin, not saved), `?nointro`, `?introat=<ms>`,
`?mob=imp,brute` (mobs next to the player), `?nomobs` (no mobs: use it in tests that walk about),
`?attackpose=<tick>,<facing>` (the player frozen at that tick of an attack: a screenshot of it),
`?at=tx,ty`
(start on that tile, or the nearest open one), `?nocrt` (much faster under
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

See `deploy/README.md`. Short form: `scripts/deploy.sh` in `/opt/azyr-town` (it refuses every
branch except `town`; it builds `apps/game`, restarts the PM2 process `town-server` first, then
publishes the client to `/var/www/azyr.io/town`). No nginx reload is necessary. The server's
health: `curl -s http://127.0.0.1:3009/healthz`. Deploy the town only for a town change that
Fede asked for; a change to the game never needs a town deploy.
**Never run `pm2 update` or `pm2 flush` on this box** (see /root/CLAUDE.md).
