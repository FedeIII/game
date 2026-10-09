# Deployment of the Town of Azyr (azyr.io)

The town is the landing page of https://azyr.io. It is a **frozen copy** of the game engine:
the branch `town` of `git@github.com:FedeIII/game.git`, checked out in `/opt/azyr-town`. It
split from the game on 2026-10-09, at commit `57060cc`. The game (branch `main`, `/opt/game`,
https://game.azyr.io) goes on without the town, and its deploys never touch azyr.io.

Two parts:

- nginx (the azyr.io site) serves the Vite build of `apps/game` from `/var/www/azyr.io/town`.
- The multiplayer server runs under PM2 as `town-server` on 127.0.0.1:3009
  (`deploy/pm2.config.cjs`). nginx sends `wss://azyr.io/ws` to it. See `docs/multiplayer.md`.

## Normal deploy

On the box:

```bash
cd /opt/azyr-town
git pull            # branch town
scripts/deploy.sh
```

The script refuses every branch except `town`. Then it runs the type check and the tests,
builds, restarts the multiplayer server (`pm2 startOrReload deploy/pm2.config.cjs`; the first
time, `pm2 start` and `pm2 save`), waits for its `/healthz`, and copies the client into the web
root. The server goes first, so a page with the new client never meets the old server. Each
deploy drops the connections for about a second; the clients reconnect on their own. Hashed
files go first and the entry page goes last, so a visitor never gets a page that names a
missing file. Open `https://azyr.io/?debug` (or press F3) to see the deployed commit.

Do not merge `main` into `town`: that brings the game's changes to azyr.io. If the town needs
one fix from the engine of the game, cherry-pick that commit and test the town.

Do not run `pm2 update` or `pm2 flush` on this box (see /root/CLAUDE.md).

No nginx reload is necessary for a deploy.

## nginx: the azyr.io site

The site's nginx file is `/etc/nginx/sites-available/azyr.io` (not in this repo; backups next
to it). Three locations serve the town; every other path stays the site's:

- `location = /`: `/var/www/azyr.io/town/index.html`, `no-store`.
- `location ^~ /assets/`: the town's files, cached for a year. `^~`, so that the site's regex
  for images and scripts does not take them. The site has no `/assets/` of its own.
- `location = /ws`: `proxy_pass http://127.0.0.1:3009`, with `X-Forwarded-For` **set** to
  `$remote_addr` (not appended): the server limits connections per address with it. The server
  accepts the origins `https://azyr.io` and `https://www.azyr.io` (`ORIGINS` in
  `pm2.config.cjs`).

The list of projects (the landing page before the town) is at `/projects` (the site's
`index.html`); `/projects/` and `/index.html` redirect there. `/private/` did not move.
azyr.io has no Authenticated Origin Pulls, so a local curl works.

## Checks

```bash
curl -s http://127.0.0.1:3009/healthz      # {"ok":true,"protocol":6,"players":{"town":N}}
pm2 logs town-server --lines 20 --nostream
curl -sk -H 'Host: azyr.io' https://localhost/ | grep -o '<title>[^<]*</title>'   # azyr.io (the page sets the title)
curl -sk -o /dev/null -w '%{http_code}\n' -H 'Host: azyr.io' https://localhost/projects   # 200
```

## Caching

- `/assets/*` has `max-age=31536000, immutable`. That is safe only because Vite puts a
  content hash in every file name. Do not put a file with a fixed name under `/assets/`.
- The entry page has `no-store`.
