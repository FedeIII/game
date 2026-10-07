#!/usr/bin/env bash
# Builds the client and publishes it to the nginx web root. Run it on the box.
# It deploys the working tree as it is, so check out the commit you want first.
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
