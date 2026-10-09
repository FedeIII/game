# CLAUDE.md

This file gives guidance to Claude Code when it works in this repository.

## What this is

A pixel-art game **engine** for the browser, and the applications on it. It runs at
https://game.azyr.io, which has one world: **the Wilds** (an endless dark forest with lonely
stone houses, and mobs). The goal is an online, multiplayer sandbox. The engine has
multiplayer: an authoritative Node server, client-side prediction and interpolation
(`docs/multiplayer.md`); the Wilds are single-player for now. Read `docs/stack.md` before you
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
- **A laptop** (Fede's MacBook, macOS, clone `~/Projects/game`): development only. It has no
  nginx, PM2, `/opt` or `/var/www`, and it does not deploy. The `vps` MCP server gives the
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
npm run dev          # the app's Vite dev server, http://127.0.0.1:3019 (makes the art first)
npm run check        # type check of every package + Vitest
npm test             # Vitest only
npm run art          # make packages/engine-client/src/generated/ again (atlas + icon)
npm run build        # production build of the app in apps/game/dist
npm run server       # the multiplayer server, port 3020 (dev and preview send /ws to it)
scripts/deploy.sh    # on the VPS only: check, build, restart game-server (PM2), publish the client
```

The development ports are 3019 (Vite) and 3020 (the server). They are not production's 3008, and
on the laptop `~/Projects/LOCAL_PORTS.md` gives them to this game. Do not use 3008 or 3009 for a
test: on the VPS they are production's `game-server` and `town-server`. Vite does not move to
another port, because the server refuses an origin that is not in its list.

Art preview at 4x: `cd packages/engine-client && node art/build.ts --preview /tmp/atlas.png`.

## Layout and layers

| Package | Name | What | May import |
|---|---|---|---|
| `packages/engine` | `@game/engine` | The simulation, pure TypeScript: world model, tiles, collision, movement, buildings, fixtures, interactions, doors, NPCs, mobs and fights, the natural-terrain toolkit, and the multiplayer core (`net/`: protocol, `Room`, `Prediction`, `Remotes`). **No DOM, no PixiJS, no network**: the server imports it as it is. | nothing |
| `packages/engine-server` | `@game/engine-server` | The multiplayer server: `startServer()` (Node, `ws`): a Room per shared world at `/ws`, limits, heartbeat, `/healthz`. | `@game/engine` |
| `packages/engine-client` | `@game/engine-client` | The browser runtime as a library: `startGame()`, renderers, input, GUI, and the art pipeline (`art/`). | `@game/engine` |
| `worlds/wilds` | `@game/world-wilds` | The Wilds: a `WorldSource` (generated) and its texts. | `@game/engine` |
| `apps/game` | `@game/app` | game.azyr.io: `index.html`, `src/worlds.ts` (the worlds, for the page and the server), `src/main.ts` (calls `startGame`), `server/main.ts` (calls `startServer`), Vite config. | all |

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
  map icon; only in an app with more than one world, so not now), `settings-panel.ts` (top right: CRT on/off and sliders, saved in localStorage
  `game.crt.v1`; `?crt=` / `?nocrt` win over it; `addSection()` puts a section on top),
  `you-section.ts` (the "You" section of the settings: the player's look, "New look", the name), `panels.ts` (one top-right panel at a time),
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
where they may step while they chase, `population` per player). The Wilds: everywhere except
water and the ground round a house; 4 imps and 2 brutes. The client of a
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
  its light. `WorldDefinition.darkness` (0..1) scales the night: the wilds are 1.

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

Serve the build with `npx vite preview --port 4173` in `apps/game`. For a shared world, also run
the game server with `npm run server` (port 3020; the preview sends `/ws` to it). A second test
server needs a free port: `PORT=<port> ORIGINS=http://127.0.0.1:4173 node apps/game/server/main.ts`,
and the preview then needs `GAME_SERVER=ws://127.0.0.1:<port>`. Use one browser **context** per
visitor. URL switches:
`?world=<id>` (when an app has more than one world), `?debug` (read `#debug` for the world, tile, target, building, and `net` and
`others` in a shared world; `walkers`, `doors`, `lines` and `intro` in a world with NPCs; `mobs` and
`fight` in a world with mobs), `?offline` (a
shared world played alone), `?skin=<n>` (another skin, not saved), `?nointro`, `?introat=<ms>`,
`?mob=imp,brute` (mobs next to the player), `?nomobs` (no mobs: use it in tests that walk about),
`?attackpose=<tick>,<facing>` (the player frozen at that tick of an attack: a screenshot of it),
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

A deploy runs only on the VPS. See `deploy/README.md`. Short form:
`cd /opt/game && git pull && scripts/deploy.sh` (it builds `apps/game`, restarts the PM2
process `game-server` first, then publishes the client). No nginx reload is necessary.

The script deploys the working tree of `/opt/game`. Thus a commit from the laptop goes live only
after a push to GitHub and a pull on the VPS. Do not deploy from the laptop (for example over
SSH) unless Fede asks. Push when Fede asks, and then ask Fede to deploy, or give the task to the
Claude Code on the VPS with `brief_vps_claude`.

On the VPS: Cloudflare Authenticated Origin Pulls is on, so a local `curl -k https://localhost/`
gets 400; that is correct. The server's health: `curl -s http://127.0.0.1:3008/healthz`.
**Never run `pm2 update` or `pm2 flush` on the VPS** (see `/root/CLAUDE.md` there).

From anywhere: `curl -sI https://game.azyr.io/` gives 200 and `cache-control: no-store`, and F3
in the game (or `/?debug`) shows the commit of the live build.
