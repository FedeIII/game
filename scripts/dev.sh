#!/usr/bin/env bash
#
# The local dev environment of the game: the multiplayer server (it restarts when its code
# changes) and the Vite dev server of the page. The page sends /ws to the server through Vite, as
# nginx does in production. The Wilds are shared here (SHARED_WORLDS=wilds), so two browser
# profiles see each other. The game keeps no state on disk, so there is no database to start.
#
#   scripts/dev.sh               server + page, and open a browser
#   scripts/dev.sh --solo        share no world: single-player, as on game.azyr.io now
#   scripts/dev.sh --inspect     the server under the Node inspector (127.0.0.1:9669)
#   scripts/dev.sh --no-server   the page only (run the server yourself)
#   scripts/dev.sh --no-open     do not open a browser
#
# Ports (~/Projects/LOCAL_PORTS.md): 3019 the page, 3020 the server, 9669 the inspector.
# Ctrl-C stops everything. Cursor runs this script from .vscode/tasks.json (the play button).

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

PAGE_PORT=3019
SERVER_PORT=3020
INSPECT_PORT=9669
SHARED=wilds

# Cursor and VS Code put these into the terminal of a task, so that their debugger attaches to
# every Node process below it: Vite too. Then the end of a debug session stops this script. The
# launch configuration "Attach: game server" attaches to the server on purpose (--inspect).
unset NODE_OPTIONS VSCODE_INSPECTOR_OPTIONS

open_browser=1
run_server=1
inspect=0

while [ $# -gt 0 ]; do
	case "$1" in
		--solo) SHARED='' ;;
		--inspect) inspect=1 ;;
		--no-server) run_server=0 ;;
		--no-open) open_browser=0 ;;
		-h | --help)
			# The comment at the top, without the shebang.
			awk 'NR > 2 && /^#/ { sub(/^# ?/, ""); print; next } NR > 2 { exit }' "$0"
			exit 0
			;;
		*)
			echo "dev.sh: unknown option $1 (try --help)" >&2
			exit 2
			;;
	esac
	shift
done

if [ -t 1 ]; then
	BOLD=$'\033[1m' DIM=$'\033[2m' RESET=$'\033[0m' RED=$'\033[31m' GREEN=$'\033[32m' BLUE=$'\033[34m' YELLOW=$'\033[33m'
else
	BOLD='' DIM='' RESET='' RED='' GREEN='' BLUE='' YELLOW=''
fi

note() { printf '%s∙%s %s\n' "$BOLD" "$RESET" "$1"; }
fail() {
	printf '%s✗%s %s\n' "$RED" "$RESET" "$1" >&2
	exit 1
}

# --- Preflight ------------------------------------------------------------------------------------

# The first line, before anything can fail: the tasks in .vscode/tasks.json find the start of a run
# by it (beginsPattern). Without it, a failure shows in the editor only as "errors exist after
# running preLaunchTask".
printf '%sgame dev env%s\n' "$BOLD" "$RESET"

node_major() { node -v 2>/dev/null | sed 's/^v\([0-9]*\).*/\1/'; }

# A terminal of the editor starts with the default Node of nvm, which can be another version. nvm
# reads .nvmrc. nvm does not work with `set -u`.
if [ "$(node_major)" != 24 ] && [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
	set +u
	# shellcheck disable=SC1091
	. "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
	nvm use --silent > /dev/null || fail "nvm has no Node 24 (.nvmrc): run \`nvm install\`"
	set -u
fi
[ "$(node_major)" -ge 24 ] 2> /dev/null || fail "node $(node -v 2> /dev/null || echo 'is missing'): this repo needs Node 24 (.nvmrc)"

[ -d node_modules ] || {
	note "node_modules is missing: npm install"
	npm install --no-audit --no-fund
}

check_port() {
	local pid comm cwd
	# lsof exits 1 when nothing listens: that is the good case.
	pid=$(lsof -nP -iTCP:"$1" -sTCP:LISTEN -t 2> /dev/null | head -1 || true)
	[ -n "$pid" ] || return 0
	# Name the process and its folder: on this machine it is often another project.
	comm=$(ps -p "$pid" -o comm= 2> /dev/null | sed 's|.*/||')
	cwd=$(lsof -a -p "$pid" -d cwd -Fn 2> /dev/null | sed -n 's/^n//p' | head -1)
	fail "port $1 is in use by pid $pid ($comm${cwd:+ in $cwd}): $2"
}

check_port "$PAGE_PORT" "stop it (Vite does not move to another port: the server would refuse that origin)"
[ "$run_server" -eq 0 ] || check_port "$SERVER_PORT" "stop it, or use --no-server"
[ "$inspect" -eq 0 ] || check_port "$INSPECT_PORT" "stop it, or do not use --inspect"

VITE=node_modules/.bin/vite
[ -x "$VITE" ] || fail "$VITE is missing: run \`npm install\`"

# Vite reads the art from src/generated/, as `npm run dev` does.
note "art"
npm run art --silent

# --- Processes ------------------------------------------------------------------------------------

PIDS=""

# Starts a process with a label before each line of its output.
start() {
	local label="$1" colour="$2" tag
	shift 2
	tag=$(printf '%s%6s%s %s│%s ' "$colour" "$label" "$RESET" "$DIM" "$RESET")
	("$@" 2>&1 | awk -v tag="$tag" '{ print tag $0; fflush() }') &
	PIDS="$PIDS $!"
}

# Each pid under one of ours, the deepest first. A parent that stops before its children leaves
# them on their ports. Collect all of them before a signal: after its parent stops, a child
# belongs to init, and pgrep cannot find it.
collect_tree() {
	local child
	for child in $(pgrep -P "$1" 2> /dev/null); do
		collect_tree "$child"
	done
	echo "$1"
}

stopping=0

cleanup() {
	[ "$stopping" -eq 0 ] || return 0
	stopping=1
	# The output can be a closed pipe (`scripts/dev.sh | head`): a write must not stop the cleanup.
	trap '' PIPE
	set +e
	printf '\n'
	note "stop"
	local targets="" pid
	for pid in $PIDS; do
		targets="$targets $(collect_tree "$pid" | tr '\n' ' ')"
	done
	for pid in $targets; do kill -TERM "$pid" 2> /dev/null; done
	sleep 1
	for pid in $targets; do kill -KILL "$pid" 2> /dev/null; done
	local port
	for port in "$PAGE_PORT" "$SERVER_PORT" "$INSPECT_PORT"; do
		if lsof -nP -iTCP:"$port" -sTCP:LISTEN -t > /dev/null 2>&1; then
			printf '%s!%s port %s is still in use\n' "$YELLOW" "$RESET" "$port"
		fi
	done
}

trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM HUP
trap cleanup EXIT

export SHARED_WORLDS="$SHARED"

if [ "$run_server" -eq 1 ]; then
	server_args=(--watch)
	[ "$inspect" -eq 0 ] || server_args+=(--inspect="127.0.0.1:$INSPECT_PORT")
	start server "$BLUE" env PORT="$SERVER_PORT" \
		ORIGINS="http://127.0.0.1:$PAGE_PORT,http://localhost:$PAGE_PORT,http://127.0.0.1:4173,http://localhost:4173" \
		node "${server_args[@]}" apps/game/server/main.ts
fi
# The Vite config sets the port (strictPort) and sends /ws to the server.
start page "$GREEN" "$VITE" apps/game --clearScreen false

# --- Ready ----------------------------------------------------------------------------------------

alive() {
	local pid
	for pid in $PIDS; do
		kill -0 "$pid" 2> /dev/null || return 1
	done
}

for i in $(seq 1 120); do
	alive || fail "a process stopped during the start (see its lines above)"
	if curl -sf "http://127.0.0.1:$PAGE_PORT/" > /dev/null &&
		{ [ "$run_server" -eq 0 ] || curl -sf "http://127.0.0.1:$SERVER_PORT/healthz" > /dev/null; }; then
		break
	fi
	[ "$i" -lt 120 ] || fail "the servers did not answer in 60 s"
	sleep 0.5
done

URL="http://127.0.0.1:$PAGE_PORT/"
note "shared worlds: ${SHARED:-none (single-player)}"
[ "$inspect" -eq 0 ] || note "server inspector: 127.0.0.1:$INSPECT_PORT"
# The last line of the start: the tasks in .vscode/tasks.json wait for it (endsPattern). It must
# not contain the first line ("game dev env").
printf '%s✓ dev env ready:%s %s\n' "$GREEN" "$RESET" "$URL"
[ "$open_browser" -eq 0 ] || open "$URL"

# Stop everything when one process stops. (bash 3.2 on macOS has no `wait -n`.)
while alive; do
	sleep 1
done
fail "a process stopped (see its lines above)"
