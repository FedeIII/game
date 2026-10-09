# Deployment of game.azyr.io

Two parts: nginx serves the Vite build of `apps/game` from `/var/www/game.azyr.io`, and the
multiplayer server runs under PM2 as `game-server` on 127.0.0.1:3008 (`deploy/pm2.config.cjs`).
nginx sends `wss://game.azyr.io/ws` to it. See `docs/multiplayer.md`.

## Normal deploy

On the box:

```bash
cd /opt/game
git pull            # or check out the commit you want
scripts/deploy.sh
```

The script runs the type check and the tests, builds, restarts the multiplayer server
(`pm2 startOrReload deploy/pm2.config.cjs`; the first time, `pm2 start` and `pm2 save`), waits
for its `/healthz`, and then copies the client into the web root. The server goes first, so a
page with the new client never meets the old server. Each deploy drops the connections for
about a second; the clients reconnect on their own. Hashed files go first and the entry page
goes last, so a visitor never gets a page that names a missing file. Press F3 in the game (or
open `/?debug`) to see the deployed commit.

Do not run `pm2 update` or `pm2 flush` on this box (see /root/CLAUDE.md).

No nginx reload is necessary for a deploy.

## One-time setup (2026-10-07)

All four steps are done. Step 1 was done in the Cloudflare dashboard, because the token on
the box (`/root/.cf-token`) has access to the `vest101.com` zone only.

1. DNS (Cloudflare, zone azyr.io): record `game`, type A, `46.224.16.48`, **Proxied**.
2. nginx site, no `.conf` extension (the convention on this box):

   ```bash
   cp deploy/nginx/game.azyr.io /etc/nginx/sites-available/game.azyr.io
   ln -s /etc/nginx/sites-available/game.azyr.io /etc/nginx/sites-enabled/game.azyr.io
   nginx -t && systemctl reload nginx
   ```

3. Authenticated Origin Pulls (mTLS), after the site works:

   ```bash
   cp deploy/nginx/game-mtls.conf /etc/nginx/snippets/game-mtls.conf
   nginx -t && systemctl reload nginx
   ```

   Rollback: move the snippet out of `/etc/nginx/snippets/` and reload.

4. The multiplayer server (2026-10-07): the `location = /ws` block is in
   `deploy/nginx/game.azyr.io`. To change the live site: back it up, copy it, test, reload:

   ```bash
   cp /etc/nginx/sites-available/game.azyr.io /etc/nginx/sites-available/game.azyr.io.backup.$(date +%Y%m%d_%H%M%S)
   cp deploy/nginx/game.azyr.io /etc/nginx/sites-available/game.azyr.io
   nginx -t && systemctl reload nginx
   ```

   The first `scripts/deploy.sh` after that adds the PM2 process and saves the PM2 list.

## Checks

```bash
# Through Cloudflare (the only way in when mTLS is on):
curl -sI https://game.azyr.io/ | grep -iE '^HTTP|cache-control'      # 200, no-store
# A local curl gets 400 "No required SSL certificate was sent". That is correct.
# The multiplayer server, locally:
curl -s http://127.0.0.1:3008/healthz      # {"ok":true,"protocol":6,"players":{}}: no shared world now
pm2 logs game-server --lines 20 --nostream
curl -sk --resolve game.azyr.io:443:127.0.0.1 https://game.azyr.io/ -o /dev/null -w '%{http_code}\n'
```

## azyr.io is not deployed from here (since 2026-10-09)

From 2026-10-08 to 2026-10-09, azyr.io served this page from `/var/www/game.azyr.io`, so a
game deploy changed azyr.io too. Now the Town of Azyr on azyr.io has its own checkout
(`/opt/azyr-town`, branch `town`), PM2 process (`town-server`, port 3009) and web root
(`/var/www/azyr.io/town`); see `deploy/README.md` on that branch. The azyr.io nginx site reads
nothing from this repository's folders, and `game-server` accepts the origin
`https://game.azyr.io` only.

## Caching

- `/assets/*` has `max-age=31536000, immutable`. That is safe only because Vite puts a
  content hash in every file name. Do not put a file with a fixed name under `/assets/`.
- Everything else, `index.html` included, has `no-store`.
- Files in `apps/game/public/` (none yet) keep their names. If you add one, do not put
  it under `/assets/`, and expect the browser to revalidate it.
