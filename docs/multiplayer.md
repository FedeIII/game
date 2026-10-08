# Multiplayer

Since 2026-10-07 the engine has multiplayer. A world with `multiplayer: true` in its
`WorldDefinition` is shared: every visitor of that world sees the others. On game.azyr.io the
Town of Azyr is shared, and the Wilds stay single-player.

## The model

- **The server is the truth.** It runs every player with the same `stepPlayer()` as the client,
  in a `Room` (`packages/engine/src/net/room.ts`), and it owns the doors.
- **The client predicts.** It moves the local player at once with each input and keeps the
  inputs that the server has not confirmed (`Prediction`, `net/prediction.ts`). When a
  snapshot comes, it takes the true state and applies the unconfirmed inputs again
  (reconciliation). The two sides run the same code on the same world, so in the normal case
  the result is identical and nothing visible happens. A tested property: on a clean network
  with walls and 0 to 150 ms of latency, no correction is larger than 1e-9 px.
- **The others are interpolated.** The client draws the other players 100 ms in the past,
  between two snapshots that have both arrived (`Remotes`, `net/remotes.ts`). It estimates the
  server's clock from the least delayed snapshot of the last 2 seconds.
- **Players do not collide with each other.** So no one can block a door or a street, and each
  player's movement depends only on the world and the doors.
- **Doors carry a wish, not a toggle.** A door action is "open" or "closed" for one door, just
  before one input. If two players want the same thing, nothing breaks. The server applies it
  only if the player can reach the door (`canReachDoor`), and a door never closes on anyone
  (`useDoor(..., others)`).

## The protocol (`net/protocol.ts`)

JSON over one WebSocket, `wss://<host>/ws`. Change `PROTOCOL_VERSION` when a message changes:
a client of another version is refused, and its label tells the visitor to reload the page.

| Direction | Message | Content |
|---|---|---|
| client to server | `hello` | protocol version, world id, the visitor's skin seed, optional start tile `at` (used if it is within 64 tiles of the spawn) |
| client to server | `in` | a batch of inputs (one per tick, each axis an integer from -100 to 100), the sequence number of the first, door wishes `[seq, tx, ty, open]` |
| client to server | `ping` | the client's clock, for the round trip |
| server to client | `welcome` | player id, start position, open doors |
| server to client | `snap` | 20 per second: server clock, the last applied input, the player's own exact state, the others (positions to 0.1 px, and their skin seeds), the doors when they changed, and the world's walking NPCs (`n`: their poses, in the order of `WorldSource.npcs()`) |
| server to client | `refused` | `version`, `world`, `full` or `busy` |
| server to client | `pong` | the client's clock, back |

The client sends a batch every 3 ticks (20 messages a second). It applies the input as it
goes on the wire (quantized), so the server can repeat the step exactly.

## NPCs (protocol 3, 2026-10-08)

The server runs the walking NPCs of a shared world (`npc.ts`, `NpcCrowd`): `Room.tick()` moves
them before each broadcast, with the time since the last tick (at most 250 ms; an empty room
stands still), and with every player's feet, because a player close to an NPC stops it. Each
snapshot carries all of them; the client draws them 100 ms in the past, as it draws the other
players (`Remotes.npcsAt()`). Until the first snapshot, or with no server, the client runs its
own crowd. NPCs do not collide with players, so the prediction of the local player never
depends on them. NPCs open and close doors (the Room's door version goes up, so the doors go to
everyone), and a door does not close on an NPC. The lines that NPCs say are events in the next
snapshot (`b`: [npc index, line index]); a client that misses a snapshot (a full send buffer)
misses the line, which is harmless.

## Limits on the server

- Inputs: a token bucket per player, 1.1 x `TICK_RATE` per second with a burst of 1.5 s. An input
  over the limit is skipped, so a client with a fast clock is not faster; it is corrected.
- Messages: at most 60 a second per connection, 2 KB each; a message that is not exactly valid
  (`parseClientMessage`) closes the connection.
- Connections: at most 8 per address (`busy`), 50 players per world (`full`). The address comes
  from `X-Forwarded-For`, which nginx sets (not appends) to the visitor's address.
- Origin: only the pages in `ORIGINS` may connect (another site gets 403).
- A client that sends no hello in 10 s, or misses a pong (pings every 25 s), is dropped.
- A page that is hidden for 60 s leaves the world, and comes back when it is shown again.
- A client whose send buffer is full gets no snapshots until it empties (the doors come with
  the next one).
- Every 10 s each room forgets the chunks far from all players.

## The client (`packages/engine-client/src`)

- `net/session.ts` (`NetSession`): the connection. Online, the player moves by prediction;
  connecting, offline or refused, the player moves alone, as in a single-player world, so the
  game never stops for the network. It reconnects with a backoff (1 s to 30 s; at once after
  code 1012, a server restart) and starts again on the player's current tile. `?offline` plays
  a shared world alone.
- `render/others.ts` (`OtherPlayers`): the other players in their skins, with a fade in and out
  and a smaller torch each.
- `ui/presence.ts`: the label in the top-left corner ("2 other visitors here", or why the
  visitor is alone).
- Skins (protocol 2, 2026-10-07): each browser makes a random 32-bit skin seed once and keeps it
  in localStorage (`game.skin.v1`), so a visitor has the same skin on every visit; `?skin=<n>`
  shows another one without saving it. The seed goes in `hello`, and the server sends each
  player's seed to the others. Every client makes the same skin from a seed
  (`art/skins.ts`), renders it in a Web Worker (`src/skins/skin-worker.ts`) and keeps the last
  24 sheets in localStorage (`game.skins.v<SKIN_VERSION>.*`). Until a skin is ready, its player
  shows as a darker wanderer from the atlas. The server never reads a seed; it only checks
  that it is a whole number from 0 to 2^32 - 1. The Wilds use the visitor's skin too.
- A correction from the server moves the interpolation with it; a correction of up to 2 tiles
  is shown gradually (it decays in about 0.1 s), a larger one is a jump.

## The server (`packages/engine-server`, `apps/game/server/main.ts`)

`startServer({ worlds, port, host, origins })` hosts a Room for each world with
`multiplayer: true`, at `/ws`, and answers `GET /healthz` with the player counts. Node 24 runs
it from the TypeScript sources (type stripping); there is no build step.

```bash
npm run server                       # local, port 3008, allows the Vite origins
curl -s http://127.0.0.1:3008/healthz   # {"ok":true,"protocol":1,"players":{"town":2}}
pm2 logs game-server                  # one line per arrival and departure; no addresses
```

`npm run dev` and `npm run preview` send `/ws` to `GAME_SERVER` (default `ws://127.0.0.1:3008`).

## Production

- PM2 process `game-server` (`deploy/pm2.config.cjs`): `/usr/bin/node apps/game/server/main.ts`
  in `/opt/game`, `PORT=3008`, `HOST=127.0.0.1`, `ORIGINS=https://game.azyr.io`.
- nginx: `location = /ws` in the game.azyr.io site (`deploy/nginx/game.azyr.io`), modelled on
  hidden-agenda.azyr.io: Upgrade headers, `proxy_read_timeout 3600s`, X-Forwarded-For **set** to
  `$remote_addr`.
- `scripts/deploy.sh` restarts the server **before** it publishes the client: a page with the
  new client must never meet the old server. Each deploy drops every connection for about a
  second; the clients come back on their own.
- To make another world shared: set `multiplayer: true` in its definition. The server and the
  client do the rest. Its source must be deterministic (it already must be).

## Tests

- `packages/engine/test/net.test.ts`: a simulated network (latency in simulated milliseconds)
  with a Room and clients: exact prediction, interpolation, the input rate limit, repeats,
  skins, a full room, and doors (shared, out of reach, never onto a player).
- `packages/engine-server/test/server.test.ts`: the real server on a free port, with `ws`
  clients: two visitors, refusals, a bad message, another origin, the per-address limit,
  ping and health.
- In a browser: two Playwright contexts in the town (see CLAUDE.md, "Verify a change in a
  browser"): each sees the other (`#presence`, and the `others` line of `?debug`), and a door
  that one opens is open for the other.
