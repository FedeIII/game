# Deployment of World of Kandrax (world.kandrax.app and game.azyr.io)

The game has two addresses (since 2026-10-13): **https://world.kandrax.app**, the main address,
and **https://game.azyr.io**, its mirror. Both serve the same files and the same server; see
"Two addresses" below.

Two parts: nginx serves the Vite build of `apps/game` from `/var/www/game.azyr.io` (the name of the
folder is older than the main address; both sites read it), and the game server runs under PM2 as
`game-server` on 127.0.0.1:3008 (`deploy/pm2.config.cjs`). nginx sends `/api/` and `/auth/`
(accounts and characters) and `/ws` (multiplayer) to it. See `docs/multiplayer.md`. The server keeps the accounts in a SQLite file,
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
about a second; the clients reconnect on their own. When the new client is published, each open
page sees the new build (its main script has another name) and reloads itself at a calm moment;
the menu then starts the same character again. Hashed files go first and the entry page
goes last, so a visitor never gets a page that names a missing file. Press F3 in the game (or
open `/?debug`) to see the deployed commit.

Do not run `pm2 update` or `pm2 flush` on this box (see /root/CLAUDE.md).

No nginx reload is necessary for a deploy.

## Two addresses: world.kandrax.app and game.azyr.io (since 2026-10-13)

Fede's decision (2026-10-13): world.kandrax.app is the main address, and game.azyr.io stays as a
mirror. Thus:

- **nginx.** The routes (headers, web root, `/ws`, `/api/`, `/auth/`, `/assets/`, `/`) are in one
  snippet, `deploy/nginx/game-site.conf`, installed as `/etc/nginx/snippets/game-site.conf`. Each
  site (`deploy/nginx/world.kandrax.app`, `deploy/nginx/game.azyr.io`) has only its name, its
  certificate, its mTLS snippet and its logs, and includes the routes. Change a route once, in the
  snippet. `scripts/deploy.sh` checks that the snippet has the `/api/` route and that each enabled
  site includes it.
- **Certificates.** game.azyr.io uses the origin certificate of the azyr.io zone
  (`/etc/nginx/ssl/azyr.io.pem`). world.kandrax.app uses its own, of the kandrax.app zone:
  `/etc/nginx/ssl/kandrax.app.pem` (SANs `*.kandrax.app`, `kandrax.app`, 15 years). Its key,
  `/etc/nginx/ssl/kandrax.app.key`, was made on this box; Cloudflare signed the CSR
  `/etc/nginx/ssl/kandrax.app.csr`. To renew, send the same CSR again.
- **mTLS.** Authenticated Origin Pulls is a setting of each Cloudflare zone, so each site has its
  own snippet: `game-mtls*.conf` (azyr.io zone) and `kandrax-mtls*.conf` (kandrax.app zone).
- **The server.** `ORIGINS` has both addresses (main first) and `PUBLIC_ORIGIN` is the main one
  (`deploy/pm2.config.cjs`). The other origins are mirrors: a sign-in with Google that starts on a
  mirror comes back to it (the server reads the `Host` header that nginx sends). The cookies of a
  host stay on that host, so a visitor signs in on each address separately. One account is signed
  in on one device at a time, and that rule counts the two addresses as two devices.
- **The Google client** has one redirect URI for each address (see "Accounts", step 1).
- **The page** shows the main address in the menu, and has a canonical link to it.
- **kandrax.app** is a separate Cloudflare zone. Its apex and `www` are another app (Kandrax App,
  on Vercel). Only the record `world` comes to this box.

### Setup of world.kandrax.app

1. Cloudflare, zone kandrax.app: SSL/TLS mode **Full (strict)**. (With "Flexible", Cloudflare
   connects on port 80, nginx sends it to https, and the browser gets a redirect loop.)
2. Cloudflare, zone kandrax.app: an Origin CA certificate for `*.kandrax.app` and `kandrax.app`,
   15 years, from the CSR on the box. Install it, then the site:

   ```bash
   install -m 644 <the certificate> /etc/nginx/ssl/kandrax.app.pem
   openssl x509 -in /etc/nginx/ssl/kandrax.app.pem -noout -pubkey | sha256sum   # these two
   openssl pkey -in /etc/nginx/ssl/kandrax.app.key -pubout | sha256sum          # must agree
   install -m 644 deploy/nginx/game-site.conf /etc/nginx/snippets/game-site.conf
   install -m 644 deploy/nginx/world.kandrax.app /etc/nginx/sites-available/world.kandrax.app
   ln -s /etc/nginx/sites-available/world.kandrax.app /etc/nginx/sites-enabled/world.kandrax.app
   nginx -t && systemctl reload nginx
   ```

3. Cloudflare, zone kandrax.app: DNS record `world`, type A, `46.224.16.48`, **Proxied**.
4. Google: the redirect URI `https://world.kandrax.app/auth/google/callback` (see "Accounts").
5. Authenticated Origin Pulls: turn it on for the kandrax.app zone (SSL/TLS, Origin Server).
   **Before** you install the snippet, make sure that Cloudflare sends its certificate (see the
   memory note in /root about the two AOP APIs: the API can say "on" while nothing is sent).
   Put a probe in the snippet first, then the real one:

   ```bash
   printf 'ssl_client_certificate /etc/nginx/ssl/cloudflare-origin-pull-ca.pem;\nssl_verify_client optional;\nadd_header X-Origin-Client-Verify $ssl_client_verify always;\n' > /etc/nginx/snippets/kandrax-mtls.conf
   nginx -t && systemctl reload nginx
   curl -s -D - -o /dev/null https://world.kandrax.app/api/me | grep -i x-origin-client-verify   # SUCCESS
   install -m 644 deploy/nginx/kandrax-mtls.conf /etc/nginx/snippets/kandrax-mtls.conf
   nginx -t && systemctl reload nginx
   ```

   Rollback: move the snippet out of `/etc/nginx/snippets/` and reload.
6. The VPS monitor: add world.kandrax.app to `PUBLIC_ENDPOINTS` in
   `/opt/activity-api/lib/vpsStats.js`. The certificate shows up there by itself (it reads every
   `.pem` in `/etc/nginx/ssl`).

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
   `deploy/nginx/game-site.conf` (since 2026-10-13; it was in the site file before). To change the
   live routes: back up, copy, test, reload. One reload changes both addresses:

   ```bash
   cp -p /etc/nginx/snippets/game-site.conf /root/game-site.conf.backup.$(date +%Y%m%d_%H%M%S)
   install -m 644 deploy/nginx/game-site.conf /etc/nginx/snippets/game-site.conf
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
     the privacy page `https://game.azyr.io/privacy/`, and the scope `openid` only (the game asks
     for nothing else, since 2026-10-10; no sensitive scopes, so Google does not
     need to verify the app). **Publish the app** ("In production"): in "Testing", only the test
     users can sign in.
   - "Clients" (or "Credentials"), "Create client", type **Web application**. Authorized
     redirect URIs (one for each address of the game; since 2026-10-13 the authorized domains
     of the consent screen are `azyr.io` and `kandrax.app`):
     - `https://world.kandrax.app/auth/google/callback`
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
   #   ADMIN_EMAILS=<the emails of the admins, comma-separated>   (optional)
   ```

   An admin sees the display settings in the game. The emails stay here, out of git: the
   repository is public. A change takes effect at the next restart of game-server.

3. **The data folder** (the server makes it too, but give it these permissions):
   `install -d -m 700 /var/lib/game`. The database file is `/var/lib/game/game.db` (and its
   `-wal` and `-shm` files while the server runs).
4. **nginx**: the site now sends `/api/` and `/auth/` to the server. Do this **before** the pull:
   game-server runs the TypeScript of `/opt/game` with no build step, so after a pull a restart
   would run the new code with the old environment. Take the file from `origin/main`. Back up,
   copy, test, reload:

   ```bash
   git -C /opt/game fetch origin
   git -C /opt/game diff HEAD origin/main -- deploy/nginx/   # only the new location block
   cp -p /etc/nginx/sites-available/game.azyr.io /etc/nginx/sites-available/game.azyr.io.backup.$(date +%Y%m%d_%H%M%S)
   git -C /opt/game show origin/main:deploy/nginx/game.azyr.io > /etc/nginx/sites-available/game.azyr.io
   nginx -t && systemctl reload nginx
   # If nginx -t fails: copy the backup back, run nginx -t again, and do not reload.
   ```

5. **Deploy**, the pull and the script in one command:
   `cd /opt/game && git pull --ff-only && scripts/deploy.sh`. PM2 gets the new environment from
   `deploy/pm2.config.cjs` (`ENV_FILE`, `GAME_DB`, `PUBLIC_ORIGIN`), and the script saves the
   PM2 process list (`pm2 save`) when every app is online; otherwise it says so, and you run
   `pm2 save` yourself. Without the save, game-server starts without its environment after a
   reboot, and fails.
6. **The nightly encrypted backup** of the database (`scripts/backup-db.ts`: `VACUUM INTO` a
   dated copy, gpg AES256 with a passphrase file, a test decryption, then the plain copy is
   deleted; `/var/backups/game/game-<UTC stamp>.db.gpg`, the newest 14 kept; 03:41 to 03:46,
   after the house-md backup and before the wallet backup). The copies hold the Google account
   ids and the emails of the players (no names). This is the method of the house-md and wallet backups on the VPS. The script
   refuses to run without the passphrase file, or if the file is not mode 600:

   ```bash
   (umask 077; openssl rand -hex 32 > /etc/game/backup.passphrase)
   cp /opt/game/deploy/game-backup.service /opt/game/deploy/game-backup.timer /etc/systemd/system/
   systemctl daemon-reload
   systemctl start game-backup.service && ls -l /var/backups/game
   systemctl enable --now game-backup.timer
   ```

   **Keep a copy of `/etc/game/backup.passphrase` somewhere that is not this VPS.** Without it,
   the backups cannot be opened. Restore a copy:

   ```bash
   gpg --batch --decrypt --passphrase-file /etc/game/backup.passphrase \
     /var/backups/game/game-<stamp>.db.gpg > /root/game-restore.db
   pm2 stop game-server
   mkdir -m 700 /var/lib/game/before-restore && mv /var/lib/game/game.db* /var/lib/game/before-restore/
   install -m 600 /root/game-restore.db /var/lib/game/game.db && rm /root/game-restore.db
   pm2 start game-server && curl -s http://127.0.0.1:3008/healthz
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
# Through Cloudflare (the only way in when mTLS is on), for each address:
curl -sI https://world.kandrax.app/ | grep -iE '^HTTP|cache-control' # 200, no-store
curl -sI https://game.azyr.io/ | grep -iE '^HTTP|cache-control'      # 200, no-store
# The sign-in comes back to the address where it started:
curl -s -o /dev/null -w '%{redirect_url}\n' https://world.kandrax.app/auth/google | grep -o 'redirect_uri=[^&]*'
curl -s -o /dev/null -w '%{redirect_url}\n' https://game.azyr.io/auth/google | grep -o 'redirect_uri=[^&]*'
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
nothing from this repository's folders, and `game-server` accepts the origins
`https://world.kandrax.app` and `https://game.azyr.io` only.

## Caching

- `/assets/*` has `max-age=31536000, immutable`. That is safe only because Vite puts a
  content hash in every file name. Do not put a file with a fixed name under `/assets/`.
- Everything else, `index.html` included, has `no-store`.
- The privacy page, `/privacy/` (`apps/game/privacy/index.html`, a second Vite page), has
  `no-store` like the game's page. nginx serves `privacy/index.html` for it (`try_files $uri/`).
- Files in `apps/game/public/` (none now) keep their names. If you add one, do not put it under
  `/assets/`, and expect the browser to revalidate it.
