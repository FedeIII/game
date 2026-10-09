#!/usr/bin/env bash
# Builds the client, restarts the game server, and publishes the client to the nginx web root.
# Run it on the VPS. It deploys the working tree as it is, so check out the commit you want first.
set -euo pipefail
cd "$(dirname "$0")/.."

WEB_ROOT="${WEB_ROOT:-/var/www/game.azyr.io}"
DIST=apps/game/dist

# The local dev switch (scripts/dev.sh) must not reach production: the build reads it, and
# `pm2 startOrReload --update-env` gives the shell's environment to game-server.
unset SHARED_WORLDS

# Accounts (since 2026-10-09): the server does not start without its Google client, and the page
# cannot sign in without the nginx routes. Check them before anything changes (deploy/README.md,
# "Accounts").
SECRETS="${SECRETS:-/etc/game/secret.env}"
SITE="${SITE:-/etc/nginx/sites-available/game.azyr.io}"
echo "==> Preflight"
for key in GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET; do
	if ! grep -q "^$key=." "$SECRETS" 2> /dev/null; then
		echo "    ERROR: $SECRETS has no $key (see deploy/README.md, \"Accounts\")"
		exit 1
	fi
done
if ! grep -q '(api|auth)' "$SITE" 2> /dev/null; then
	echo "    ERROR: the nginx site $SITE does not send /api/ and /auth/ to the server (see deploy/README.md)"
	exit 1
fi

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
echo "==> Game server (PM2: game-server)"
if pm2 describe game-server > /dev/null 2>&1; then
	pm2 startOrReload deploy/pm2.config.cjs --update-env
else
	pm2 start deploy/pm2.config.cjs
fi
for i in $(seq 1 20); do
	if curl -sf http://127.0.0.1:3008/healthz > /dev/null; then break; fi
	if [ "$i" = 20 ]; then echo "    ERROR: the game server does not answer on :3008"; exit 1; fi
	sleep 0.5
done
echo "    $(curl -s http://127.0.0.1:3008/healthz)"

# After a reboot, PM2 starts its apps from the saved process list (the dump). A reload with a new
# environment does not change the dump: without a save, game-server comes back without ENV_FILE
# and does not start. Save only when every app is online, so that the dump never keeps an app
# that is stopped for a moment.
if pm2 jlist 2> /dev/null | node -e 'let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => process.exit(JSON.parse(s).every((p) => p.pm2_env.status === "online") ? 0 : 1))'; then
	pm2 save
else
	echo "    WARNING: a PM2 app is not online, so the process list was not saved."
	echo "    Run \`pm2 save\` when all the apps are online, or game-server can fail after a reboot."
fi

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
