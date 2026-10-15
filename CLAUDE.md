# CLAUDE.md

This file gives guidance to Claude Code when it works in this repository. It has only the rules
that every session needs, and a map of the documents. The details are in `docs/`.

## Keep this file short (Fede's rule, 2026-10-15)

- Write in this file only a rule that every session needs, or a pointer to a document.
- Write the details of a part of the code, a feature or a procedure in its document in `docs/`
  (see "Where to find what"). Do not add them to this file.
- Read the document of a part of the code before you change that part.
- When a change makes a document wrong, change the document in the same commit.
- If no document fits a new subject, make a new document in the right folder, and add it to the
  map below.

## What this is

A pixel-art game **engine** for the browser, and the applications on it. The game, **World of
Kandrax**, runs at https://world.kandrax.app (the main address, since 2026-10-13) and at its mirror
https://game.azyr.io (the same files and the same server; see `deploy/README.md`, "Two addresses").
It has one world: **the Wilds** (an endless dark forest with lonely houses, mobs, two hamlets and
the town of Ironhold north of the home). A visitor signs in with Google, makes a character (D&D 5e
races, classes, abilities) or continues with one, and starts in the character's home, a hut south
of Ironhold. The goal is an online, multiplayer sandbox. The engine has multiplayer: an
authoritative Node server, client-side prediction and interpolation (`docs/multiplayer.md`). The
Wilds are shared since 2026-10-10 (Fede's decision): every visitor is in the same Wilds. An account
is signed in on one device at a time. Read `docs/stack.md` before you change the stack.

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
use the paths, ports and processes in the documents: the working directory `/opt/game` is the VPS,
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
npm run checks       # the register of the checks: every gate of the content and of the page, with its ability, DC and context
scripts/deploy.sh    # on the VPS only: check, build, restart game-server (PM2), publish the client
```

The development ports are 3019 (Vite) and 3020 (the server). They are not production's 3008, and
on the laptop `~/Projects/LOCAL_PORTS.md` gives them to this game. Do not use 3008 or 3009 for a
test: on the VPS they are production's `game-server` and `town-server`. Vite does not move to
another port, because the server refuses an origin that is not in its list.

## Where to find what

| Subject | Document |
|---|---|
| The packages and their layers; how to add a world or an app | `docs/code/layout.md` |
| The browser runtime (`packages/engine-client/src`): render, input, GUI, audio, the CRT | `docs/code/client.md` |
| The art made by code: the atlas, the figure, skins, frame names | `docs/code/art.md` |
| The HTML GUI, and the two languages | `docs/code/gui.md` |
| The menu, the builder, the prologue, the game menu, characters, accounts, admins | `docs/code/menu-and-accounts.md` |
| What the ability scores do: gates and DCs, the dodge, the brace, HP, levels and XP | `docs/code/abilities.md` |
| The pack, equipment, the load, items on the ground, loot, guarded chests, shops | `docs/code/items.md` |
| Mobs and fights, the 5e scale, the sandbox of an admin | `docs/code/combat.md` |
| Quests, scenes, wades, ambushes, escorts | `docs/code/quests.md` |
| Arrival titles, NPCs, companions, fixtures, conversations, actions, lights, day and night, buildings, storeys | `docs/code/world-model.md` |
| The Wilds: the home, the houses, the roads, the hamlets, Ironhold, Silverspring, the places of the story | `docs/code/wilds.md` |
| The multiplayer model and the protocol, with each version | `docs/multiplayer.md` |
| The stack, and the reasons for it | `docs/stack.md` |
| The local server, the editor, the deploy | `docs/development.md`, `deploy/README.md` |
| A check in a browser: Playwright, the URL switches, the elements that a test uses | `docs/browser-checks.md` |
| Fede's rules for the design of the game | `docs/game-design.md` |
| The written story: the world, the places, the people, the questlines, the prologue | `docs/story/` |
| The lore of Kandrax on Google Drive, and how to read it | `docs/lore.md` |
| Each built feature as requirements (REQ/AC) | `docs/features/` (index: `docs/features/README.md`) |
| Plans of features that are not built, and Fede's to-do list | `docs/drafts/` (`docs/drafts/todo.md`) |

## Rules of the code

- **Engine code uses only erasable TypeScript** (`erasableSyntaxOnly`): no `enum`, no
  `namespace`, no constructor parameter properties. Use `as const` objects. Relative imports
  have the `.ts` extension. Node 24 can then run the files directly, with no build step.
- **The simulation is deterministic.** Generation uses only `hash2` / `fbm` / `random(seed)` from
  `noise.ts`. Do not use `Math.random()` in the engine or in a world. Random choices that are
  only visual (tile variants) belong in the client, with a `LOOK_SEED`.
- **Movement goes through `stepPlayer()` at the fixed `TICK_RATE`.** The render loop only
  interpolates between the last two steps.
- **The server owns the state of a shared world.** A page never sends what it must not change (its
  traits, its pack, its quest book). A change to a message increases `PROTOCOL_VERSION`
  (`packages/engine/src/net/protocol.ts`) and gets a section in `docs/multiplayer.md`.
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
- **The art and the GUI are approved**: new art and new GUI must match their style
  (`docs/code/art.md`, `docs/code/gui.md`). Look at new art before you commit it: a preview PNG or
  a screenshot, read with the Read tool.
- **The CRT defaults are Fede's choice** (`0.25,1,1,0.1`; text `CRT_TEXT` = `0.3,0.5,0.5,0.3`): do
  not change them without a request (`docs/code/client.md`, "The CRT").
- **Overlay UI goes outside `#game`.** Text in the world (speech, signs, labels) is drawn by the
  game with `PixelFont`, never as HTML; the GUI is HTML, with the colours and fonts of the theme
  variables of `src/style.css` only.
- **Every text that the player reads has an English and a Spanish form.** Engine texts go in
  `src/ui/strings.ts` and `src/ui/strings-es.ts`; what things say is content of the world, in
  English, with a Spanish table (the Wilds: `worlds/wilds/src/text-es.ts`). A Spanish line about
  the player has no word that must agree with its gender. See "Language" in `docs/code/gui.md`.
- **The repository is public.** Never put a secret, the list of admins or personal data in git.
  Keep personal data to a minimum (Fede's decision, 2026-10-10), and change the privacy page
  (`apps/game/privacy/`) with the data (`docs/code/menu-and-accounts.md`).
- Comments and documentation use Simplified Technical English (Fede's rule, on the VPS and on
  the laptop).

## Rules of the game and the story

- Read `docs/game-design.md` before you design a quest, an encounter, a mob or an ability. In
  short: **no chains of quests in what the player sees** (events unlock quests; some events wait
  until another quest is finished), the first quest is to reach Ironhold (the tutorial), and
  **combat has few enemies but very strategic fights**.
- **Coins are scarce, and the quests give more than half of the coins and of the XP** (Fede,
  2026-10-13). `worlds/wilds/test/economy.test.ts` keeps the rule with a model of chapter 1: when
  you add a reward, loot or XP, keep it green.
- **The story is written in `docs/story/`** (Fede's rule, 2026-10-13). The code matches those
  documents at all points: a change of the story updates them in the same commit, and a mismatch
  gets a fix, or at least a plan in `docs/drafts/`.
- **Each built feature has its REQ/AC document in `docs/features/`** (Fede's rule, 2026-10-10;
  the format is in `docs/features/README.md`).
- **Fede's to-do list** is `docs/drafts/todo.md`: when Fede gives an item between developments,
  write it there (what, the date, where it is in the code); do not fix it at once.
- **Load the skill `dc` (`.claude/skills/dc/`) before you add a check or change a DC.** A DC is the
  score that the check needs (`docs/features/abilities/checks.md`; `npm run checks` gives the
  register). A new line of a gate gets its tag with `gated()` (`docs/code/abilities.md`).
- **Chapter 2 of the Arcane Raiders (story phases 11 to 13) is on hold**: Fede said "stop
  developing here" on 2026-10-12. Build it only when Fede asks.
- **The lore is on Google Drive** (the folder `Kandrax D&D`, the rclone remote `gdrive:`). Read the
  documents live each time; do not copy them into the repository; the access is read-only. See
  `docs/lore.md`. Ask Fede before you use a name that is not in the table of
  `docs/drafts/story-razed-villages.md`.

## Deploy

- **After each development, commit, push and deploy at once, without approval** (Fede's decision,
  2026-10-10). Pull before the push (`git pull --rebase`: the other place commits too).
- From the laptop, deploy over SSH: `ssh azyr 'cd /opt/game && git pull --ff-only && scripts/deploy.sh'`.
  Do not brief the VPS Claude for a deploy.
- Then verify the deploy (`docs/development.md`, "Deploy"), and tell Fede the result.
- This is for `main` only: the branch `town` changes only when Fede asks.
- **Never run `pm2 update` or `pm2 flush` on the VPS** (see `/root/CLAUDE.md` there).
