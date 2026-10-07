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

- `packages/shared`: the simulation. World generation (`world.ts`), movement and collision
  (`player.ts`), noise, constants. **No DOM and no PixiJS here**: the server will import this
  package as it is.
- `packages/client`: the browser client on PixiJS v8.
  - `src/main.ts`: start-up, layers, fixed-step loop, glue.
  - `src/render/`: `camera.ts` (pixel-perfect zoom), `terrain.ts` (chunks drawn into render
    textures; trees and rocks as depth-sorted sprites), `player-view.ts`.
  - `src/input/`: `keyboard.ts` (KeyboardEvent.code, so WASD works on any layout) and
    `joystick.ts` (floating touch stick).
  - `art/`: the placeholder art and the atlas packer. Output goes to `src/generated/`, which is
    in `.gitignore` and is made by `dev`, `build` and `typecheck`.
- `deploy/`: nginx site and mTLS snippet. `scripts/deploy.sh`: the deploy.

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
- **Frame names are the contract between art and code** (`ground/grass/0`, `prop/tree`,
  `player/down/1`, ...). `Art.frame()` throws on an unknown name. When real art from
  Aseprite arrives, export it with the same names in the "hash" JSON format.
- **Ground edges**: a tile draws the edges of each neighbour with a higher `BLEND_ORDER`
  (`render/terrain.ts`). A new ground type needs a blend order, variants and edge pieces.
- Depth: trees, rocks and players are in `entityLayer` with `zIndex` = the y of the line where
  they touch the ground.
- Comments and documentation use Simplified Technical English (the rule for this box).

## Verify a change in a browser

There is no GPU on the box, but headless Chromium renders WebGL with SwiftShader (slowly: 1 to
6 FPS is normal there). Playwright is not a dependency of this repo; the hidden-agenda
checkout has it:

```js
const { chromium } = require('/opt/hidden-agenda/node_modules/playwright');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
```

Serve the build with `npx vite preview --port 4173` in `packages/client`. Open `/?debug` and
read `#debug` to get the tile position. For touch, use a context with `hasTouch: true` and
send `Input.dispatchTouchEvent` through a CDP session.

## Deploy

See `deploy/README.md`. Short form: `scripts/deploy.sh` on the box. No nginx reload is
necessary. Cloudflare Authenticated Origin Pulls is on, so a local
`curl -k https://localhost/` gets 400; that is correct.
