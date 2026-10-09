# Deployment of game.azyr.io

Two parts: nginx serves the Vite build of `apps/game` from `/var/www/game.azyr.io`, and the
game server runs under PM2 as `game-server` on 127.0.0.1:3008 (`deploy/pm2.config.cjs`). nginx
sends `/api/` and `/auth/` (accounts and characters) and `wss://game.azyr.io/ws` (multiplayer) to
it. See `docs/multiplayer.md`. The server keeps the accounts in a SQLite file,
`/var/lib/game/game.db`, and reads the Google OAuth client from `/etc/game/secret.env`: see
"Accounts" below. Do these one-time steps before the first deploy with accounts.

## Normal deploy

On the box:

```bash
cd /opt/game
git pull            # or check out the commit you want
scripts/deploy.sh
```

The script first checks the accounts setup (the secrets file and the nginx routes; it stops
before it changes anything if one is missing). Then it runs the type check and the tests, builds, restarts the game server
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

## Accounts (one-time setup, since 2026-10-09)

The game has accounts: a visitor signs in with Google, and the server keeps the visitor's
characters. Do these steps once, in this order. `scripts/deploy.sh` refuses to deploy until steps
2 and 4 are done, and the server refuses to start without step 2 (NODE_ENV=production).

1. **The Google OAuth client** (Google Cloud Console, by Fede; any project, for example a new
   "game-azyr-io"):
   - "Google Auth Platform" (or "APIs & Services", "OAuth consent screen"): user type
     **External**, app name `game.azyr.io`, a support email, the authorized domain `azyr.io`,
     and the scopes `openid`, `email` and `profile` (no sensitive scopes, so Google does not
     need to verify the app). **Publish the app** ("In production"): in "Testing", only the test
     users can sign in.
   - "Clients" (or "Credentials"), "Create client", type **Web application**. Authorized
     redirect URIs:
     - `https://game.azyr.io/auth/google/callback`
     - `http://localhost:3019/auth/google/callback` (development on the laptop; optional)

     No JavaScript origins are necessary. Keep the client ID and the client secret.
2. **The secrets file** on the VPS (root only; never in git):

   ```bash
   install -d -m 700 /etc/game
   install -m 600 /dev/null /etc/game/secret.env
   nano /etc/game/secret.env
   #   GOOGLE_CLIENT_ID=<the client ID>.apps.googleusercontent.com
   #   GOOGLE_CLIENT_SECRET=<the client secret>
   ```

3. **The data folder** (the server makes it too, but give it these permissions):
   `install -d -m 700 /var/lib/game`. The database file is `/var/lib/game/game.db` (and its
   `-wal` and `-shm` files while the server runs).
4. **nginx**: the site now sends `/api/` and `/auth/` to the server. Back it up, copy it, test,
   reload:

   ```bash
   cp /etc/nginx/sites-available/game.azyr.io /etc/nginx/sites-available/game.azyr.io.backup.$(date +%Y%m%d_%H%M%S)
   cp /opt/game/deploy/nginx/game.azyr.io /etc/nginx/sites-available/game.azyr.io
   nginx -t && systemctl reload nginx
   ```

5. **Deploy** as usual (`scripts/deploy.sh`). PM2 gets the new environment from
   `deploy/pm2.config.cjs` (`ENV_FILE`, `GAME_DB`, `PUBLIC_ORIGIN`).
6. **The nightly backup** of the database (`scripts/backup-db.ts`: `VACUUM INTO` a dated copy
   in `/var/backups/game`, the newest 14 kept):

   ```bash
   cp /opt/game/deploy/game-backup.service /opt/game/deploy/game-backup.timer /etc/systemd/system/
   systemctl daemon-reload && systemctl enable --now game-backup.timer
   systemctl start game-backup.service && ls -l /var/backups/game
   ```

7. **Check** (see "Checks"): `/healthz` says `"accounts":true`, and
   `https://game.azyr.io/api/me` gives `{"user":null,"login":{"google":true,"dev":false}}`.
   Then sign in on the page with a Google account.

The dev sign-in (a name only, `AUTH_DEV_LOGIN=1`) is for the laptop. The server refuses to start
with it when NODE_ENV is production, and refuses it on an https origin.

**Rollback** of the accounts: deploy the commit before them, and put the backup of the nginx
site back (`nginx -t && systemctl reload nginx`). The database and the secrets can stay.

## Checks

```bash
# Through Cloudflare (the only way in when mTLS is on):
curl -sI https://game.azyr.io/ | grep -iE '^HTTP|cache-control'      # 200, no-store
# A local curl gets 400 "No required SSL certificate was sent". That is correct.
# The multiplayer server, locally:
curl -s http://127.0.0.1:3008/healthz      # {"ok":true,"protocol":7,"players":{},"accounts":true}: no shared world now
curl -s https://game.azyr.io/api/me        # {"user":null,"login":{"google":true,"dev":false}}
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
