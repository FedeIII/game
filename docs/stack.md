# Stack decision

Date: 2026-10-07. Status: accepted for the POC.

The goal is an online, multiplayer, sandbox pixel-art game that runs in the browser, on
desktop and on phones. This file records the stack and the reasons for it.

## Summary

| Layer | Choice |
|---|---|
| Language | TypeScript everywhere: client, shared simulation, server |
| Renderer | PixiJS v8 (WebGL 2; WebGPU is available as an option) |
| Engine | Our own thin layer on PixiJS: fixed-step loop, camera, chunks, input |
| Shared simulation | `packages/shared`: pure TypeScript, no DOM, no renderer |
| Network (next step) | Authoritative Node.js server, WebSocket (`ws`), our own protocol |
| Sprites | One atlas: PNG plus JSON in the PixiJS/TexturePacker format |
| Art tool | Aseprite (it exports that format); text grids for placeholder art |
| Build | Vite; Vitest for tests |
| Mobile | Floating virtual joystick (pointer events), pixel-perfect zoom |

## Engine and applications

The repository is an engine and the applications on it (decided 2026-10-07):
`packages/engine` (the simulation, no browser), `packages/engine-client` (the browser runtime
and the art pipeline), `worlds/*` (content: a `WorldSource` and its texts, no browser) and
`apps/*` (a site that registers worlds and calls `startGame()`). game.azyr.io is the first app,
with two worlds. A world is pure data and functions, so a future server can run every world
with the same engine code.

## Why TypeScript everywhere

The most important decision for a multiplayer game is that the client and the server run
the **same** movement and world code. The server decides the truth. The client runs the same
code at once with the local input (client-side prediction), and corrects itself when the
server answers (reconciliation). That is only easy when the two sides share one language and
one module. `stepPlayer()` in `packages/shared` is already that function.

Strict types also catch API mistakes at build time, before they reach a player. That matters
more as the code grows.

## Why PixiJS, and not the alternatives

PixiJS is a fast 2D WebGL renderer with a scene graph, a sprite batcher, sprite sheets, render
textures and a ticker. It does one job well. The game logic stays outside it, in
`packages/shared`, so the server can run that logic without a renderer.

- **Three.js**: a 3D engine. For 2D pixel art it adds a perspective camera, lighting and a
  scene model that a 2D game does not use. Its 2D sprite batching is weaker than that of PixiJS.
- **Raw WebGL or WebGPU**: we would write the sprite batcher, the texture management and the
  context-loss handling ourselves. That is weeks of work with no gameplay value.
- **WASM engines (Bevy, Godot web export, Unity WebGL)**: WASM is a compile target, not an
  engine. These builds are large (10 to 40 MB), they start slowly on phones, and Godot 4
  threaded builds need cross-origin isolation headers. The server would use a different
  language unless all of it is Rust. Godot and Unity are also editor-driven, and their scene
  files are hard to change and review as text. WASM stays an option for one hot path later
  (for example lighting or path finding): a Rust module can plug into this design.
- **Phaser 4**: the strongest alternative. It is a complete engine with scenes, physics,
  tilemaps, a loader and audio. But in an authoritative multiplayer game, physics and game
  rules must run on the server, without a renderer. We would keep them out of Phaser, so
  most of the engine would stay unused. PixiJS is the smaller dependency for the part that
  we use.

## Why WebSocket and our own protocol (next step)

- **WebSocket** goes through the Cloudflare proxy with no special configuration, and
  hidden-agenda.azyr.io already does this on this box. TCP head-of-line blocking is
  acceptable for a sandbox game; it is a problem for a fast shooter, which this is not.
- **WebRTC data channels** (geckos.io and similar) give UDP-like delivery, but they need
  STUN/TURN and open UDP ports. Cloudflare does not proxy them, so they would expose the
  origin IP address.
- **WebTransport** is in all main browsers since Safari 26.4 (March 2026), but the
  implementations still differ, and we did not confirm that the Cloudflare proxy carries it
  to an origin. Keep the protocol independent of the transport, so WebTransport can come
  later as a second transport.
- **Colyseus** is good for room-based matches. A sandbox world needs chunk streaming and a
  per-player area of interest, which do not fit its "synchronize the room state" model well.
  Our own small protocol with message types in `packages/shared` fits better.

Planned network model: server tick at `TICK_RATE`; the client sends `MoveInput` with a
sequence number; client-side prediction and reconciliation for the local player;
interpolation for the other players; chunks sent by area of interest; tile edits as small
deltas.

## Sprites and art

- Tiles are 16 x 16 pixels (`TILE_SIZE`). Chunks are 32 x 32 tiles (`CHUNK_SIZE`).
- All frames are in one atlas (`atlas.png` plus `atlas.json`). The JSON is the
  TexturePacker "hash" format that PixiJS reads and that Aseprite exports.
- For the POC, `packages/client/art/` makes the art by code. Characters, trees and rocks are
  "pre-rendered" from simple 3D models (signed distance functions) with one fixed light, as
  Diablo made its sprites from 3D models. Proportions, colours and poses are parameters, so
  the style is easy to change, and an 8-frame walk costs nothing extra. Ground tiles come from
  tiling noise; small decor is text grids. Real art from Aseprite can replace any frame with
  the same name.
- The look is dark and realistic in proportion (Diablo, Castlevania), with a light radius
  round the player. The light settings live in the art and travel in the atlas JSON.
- The world is procedural from a seed (`packages/shared/src/world.ts`), so the client and the
  server make identical terrain. Hand-made areas can come later from LDtk or Tiled.

## Pixel-perfect rules

- Every texture uses `nearest` scaling; `roundPixels` is on.
- The camera zoom is a whole number of **device** pixels for each world pixel, and the world
  moves in whole device pixels. Phones (short side under 500 CSS pixels) zoom in more.
- Each chunk is drawn once into a render texture at resolution 1, then shown as one sprite.

## Open decisions for later

- ECS (for example bitECS or miniplex) when entity counts grow. The POC does not need it.
- Persistence of the world (PostgreSQL or SQLite, chunk deltas against the seed).
- Binary encoding of messages, when bandwidth matters.
