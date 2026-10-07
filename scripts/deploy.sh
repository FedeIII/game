#!/usr/bin/env bash
# Builds the client, restarts the multiplayer server, and publishes the client to the nginx web
# root. Run it on the box. It deploys the working tree as it is, so check out the commit you
# want first.
set -euo pipefail
cd "$(dirname "$0")/.."

WEB_ROOT="${WEB_ROOT:-/var/www/game.azyr.io}"
DIST=apps/game/dist

echo "==> Commit $(git describe --always --dirty)"
if [ -n "$(git status --porcelain)" ]; then
	echo "    WARNING: the working tree has uncommitted changes, and they go live."
fi

echo "==> Install"
npm ci --no-audit --no-fund

echo "==> Type check and tests"
npm run check

echo "==> Build"
npm run build

# The server goes first: a page with the new client must never meet the old server. (An old
# page that meets the new server with another protocol version is told to reload.)
echo "==> Multiplayer server (PM2: game-server)"
if pm2 describe game-server > /dev/null 2>&1; then
	pm2 startOrReload deploy/pm2.config.cjs --update-env
else
	pm2 start deploy/pm2.config.cjs
	# A new app: save the process list, so that it comes back after a reboot.
	pm2 save
fi
for i in $(seq 1 20); do
	if curl -sf http://127.0.0.1:3008/healthz > /dev/null; then break; fi
	if [ "$i" = 20 ]; then echo "    ERROR: the game server does not answer on :3008"; exit 1; fi
	sleep 0.5
done
echo "    $(curl -s http://127.0.0.1:3008/healthz)"

echo "==> Publish to $WEB_ROOT"
mkdir -p "$WEB_ROOT/assets"
# The hashed assets go first and are not deleted now. A tab that still has the previous
# index.html can then still load the files that it names.
rsync -a "$DIST/assets/" "$WEB_ROOT/assets/"
# The entry page goes last, so it never names a file that is not there yet.
rsync -a --exclude assets "$DIST/" "$WEB_ROOT/"
# Remove old hashed assets that the current build does not use.
find "$WEB_ROOT/assets" -type f -mtime +30 -printf '%f\n' | while read -r name; do
	[ -e "$DIST/assets/$name" ] || rm -f "$WEB_ROOT/assets/$name"
done

echo "==> Deployed $(git describe --always --dirty). Press F3 in the game to see the build."
