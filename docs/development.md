# Development

How to work on this repository: the local server and the page, the editor, and the deploy.
`CLAUDE.md` has the places where Claude Code runs, the commands and the rules. To check a change in
a browser, see `docs/browser-checks.md`.

## Local multiplayer

`scripts/dev.sh` starts the game server (`node --watch`: it restarts
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

## Cursor (or VS Code)

the play button (F5) starts "Dev: play" (`.vscode/launch.json`): the
task `dev` (`scripts/dev.sh --no-open --inspect`, `.vscode/tasks.json`), the debugger on the
server, and Chrome on the page. "Dev: two players" adds a second Chrome with its own profile
(another account in the dev sign-in). Breakpoints work in the page and in the server. The
database is SQLite inside the server process, so there is no database to launch. After a change
to `scripts/dev.sh`, stop the `dev` task and start it again: `node --watch` restarts the server
with new code, but not with new settings.

## Deploy

A deploy changes the game's two addresses only (world.kandrax.app and its mirror game.azyr.io,
one build and one server). azyr.io serves the town from its own checkout, server and
folder (see "What this is" in `CLAUDE.md`), so nothing here needs to keep azyr.io working.

A deploy runs only on the VPS. See `deploy/README.md`; the accounts need a one-time setup there
first (the Google OAuth client, `/etc/game/secret.env`, the nginx routes `/api/` and `/auth/`,
the backup timer), and `scripts/deploy.sh` checks it before it changes anything. Short form:
`cd /opt/game && git pull && scripts/deploy.sh` (it builds `apps/game`, restarts the PM2
process `game-server` first, then publishes the client). No nginx reload is necessary. The open
pages reload themselves when the new client is published (see "A new build reloads the page" in `docs/code/menu-and-accounts.md`).

The script deploys the working tree of `/opt/game`. Thus a commit from the laptop goes live only
after a push to GitHub and a pull on the VPS.

The rule (commit, push and deploy after each development, without approval) is in "Deploy" in
`CLAUDE.md`. From the laptop, deploy over SSH (the host alias `azyr`, through Tailscale):
`ssh azyr 'cd /opt/game && git pull --ff-only && scripts/deploy.sh'`. Then verify (below).

On the VPS: Cloudflare Authenticated Origin Pulls is on, so a local `curl -k https://localhost/`
gets 400; that is correct. The server's health: `curl -s http://127.0.0.1:3008/healthz`.
**Never run `pm2 update` or `pm2 flush` on the VPS** (see `/root/CLAUDE.md` there).

From anywhere: `curl -sI https://world.kandrax.app/` (and `https://game.azyr.io/`) gives 200 and
`cache-control: no-store`, and F3
in the game (or `/?debug`) shows the commit of the live build.
