# Deployment of game.azyr.io

The game is static files for now: nginx serves the Vite build from `/var/www/game.azyr.io`.
There is no process to run.

## Normal deploy

On the box:

```bash
cd /opt/game
git pull            # or check out the commit you want
scripts/deploy.sh
```

The script runs the type check and the tests, builds, and copies the result into the web root.
Hashed files go first and the entry page goes last, so a visitor never gets a page that names
a missing file. Press F3 in the game (or open `/?debug`) to see the deployed commit.

No nginx reload is necessary for a deploy.

## One-time setup (2026-10-07)

Steps 2 and 3 are done on the box. Step 1 needs the Cloudflare dashboard: the token on the
box (`/root/.cf-token`) has access to the `vest101.com` zone only.

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

## Checks

```bash
# Through Cloudflare (the only way in when mTLS is on):
curl -sI https://game.azyr.io/ | grep -iE '^HTTP|cache-control'      # 200, no-store
# A local curl gets 400 "No required SSL certificate was sent". That is correct.
curl -sk --resolve game.azyr.io:443:127.0.0.1 https://game.azyr.io/ -o /dev/null -w '%{http_code}\n'
```

## Caching

- `/assets/*` has `max-age=31536000, immutable`. That is safe only because Vite puts a
  content hash in every file name. Do not put a file with a fixed name under `/assets/`.
- Everything else, `index.html` included, has `no-store`.
- Files in `packages/client/public/` (none yet) keep their names. If you add one, do not put
  it under `/assets/`, and expect the browser to revalidate it.
