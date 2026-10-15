# The layout of the code

This file is part of the documents of the code (see the map in `CLAUDE.md`). Read it before you
change its part of the code, and change it in the same commit as the code.

| Package | Name | What | May import |
|---|---|---|---|
| `packages/engine` | `@game/engine` | The simulation, pure TypeScript: world model, tiles, collision, movement, buildings, fixtures, interactions, doors, NPCs and their conversations (`dialog.ts`), mobs and fights, the natural-terrain toolkit, the character rules (`character.ts`), what the scores and the gear give (`traits.ts`), levels and XP (`experience.ts`), items and the pack (`items.ts`), what a character wears (`gear.ts`), the load of a character (`load.ts`) and the moves between the pack and the worn slots (`inventory.ts`), the loot of chests and the barred doors over time (`loot.ts`), items on the ground (`piles.ts`), NPCs that follow a player (`companions.ts`), the time of day (`daytime.ts`), the mechanics of the melee draft that only the sandbox turns on (`mechanics.ts`), the tools of an admin (`admin.ts`), and the multiplayer core (`net/`: protocol, `Room`, `Prediction`, `Remotes`). **No DOM, no PixiJS, no network**: the server imports it as it is. | nothing |
| `packages/engine-server` | `@game/engine-server` | The game server: `startServer()` (Node, `ws`): accounts with Google sign-in, sessions and characters in SQLite (`accounts.ts`, `google.ts`, `store.ts`; `/api/`, `/auth/`), a Room per shared world at `/ws`, limits, heartbeat, `/healthz`. | `@game/engine` |
| `packages/engine-client` | `@game/engine-client` | The browser runtime as a library: `startGame()`, renderers, input, GUI, and the art pipeline (`art/`). | `@game/engine` |
| `worlds/wilds` | `@game/world-wilds` | The Wilds: a `WorldSource` (generated), the towns (the builder `towns.ts`; Ironhold `town.ts`, Silverspring `silverspring.ts`), the roads and the signpost (`road.ts`), and its texts. | `@game/engine` |
| `apps/game` | `@game/app` | game.azyr.io: `index.html`, `src/worlds.ts` (the worlds, for the page and the server; `shareWorlds()`, the dev switch), `src/main.ts` (calls `startGame`), `server/main.ts` (calls `startServer`), Vite config. | all |

Worlds are pure data and functions (no DOM), so a server can run them too.

**To add a world:** a new package under `worlds/` that exports a `WorldDefinition` (`id`, `name`,
`createSource(seed)`, `examine` lines, `darkness`, `day` for a day cycle, and `multiplayer: true` to share it), and add
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
