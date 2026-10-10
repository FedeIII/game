# Multiplayer

Since 2026-10-07 the engine has multiplayer. A world with `multiplayer: true` in its
`WorldDefinition` is shared: every visitor of that world sees the others. The Town of Azyr was
the shared world of game.azyr.io until 2026-10-09; it is now on azyr.io, from the branch `town`
(its own server, `town-server`). Since 2026-10-10 the Wilds are shared (`multiplayer: true` in
their definition): every visitor of game.azyr.io is in the same Wilds, and a new character
starts in the home, the house of the cell (0, 0) (`Room.join` puts a player without a place on
the world's spawn, indoors too).

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
| client to server | `hello` | protocol version, world id, the visitor's skin seed, optional start tile `at` (used if it is within 64 tiles of the character's stored place, or else of the spawn), optional `name`, optional `character` (the id of the account's character; protocol 7) |
| client to server | `skin` | a new skin seed for the player (a server with accounts ignores it) |
| client to server | `name` | a new name for the player (`''` for none; a server with accounts ignores it) |
| client to server | `in` | a batch of inputs (one per tick: each axis an integer from -100 to 100, and for an attack a third number, 1 + the code of its direction: 0 to 255, in steps of 1.4 degrees clockwise from east; protocol 8), the sequence number of the first, door wishes `[seq, tx, ty, open]`, attacks `k: [seq, view time]`, chests that the player opens `u: [seq, tx, ty]` (protocol 11) |
| client to server | `ping` | the client's clock, for the round trip |
| client to server | `deal` | a purchase from an NPC (`npc`: its index; protocol 13) or a brew at a fixture (`at`: its tile; protocol 14), and the id of the deal in its dialog |
| client to server | `drink` | the code of a drink in the pack (protocol 14) |
| server to client | `welcome` | player id, start position, open doors, forced doors (`fd`), the player's pack (`pk`: coins and `[item code, count]`; protocol 11), its hit points (`hp`) and the refuges of its character (`rf`; protocol 13), and the chunks that its character has seen (`ex`: `[cx, cy]`; protocol 14) |
| server to client | `snap` | 20 per second: server clock, the last applied input, the player's own exact state (with its attack, cooldown, stun and guard ticks and the direction of its attack), the others (positions to 0.1 px, their skin seeds, their attack, stun and guard ticks, and the direction of their attack), the mobs within 30 tiles (`m`: id, kind, position, velocity, facing, state, ms in the state, health left), the doors when they changed (with the forced doors, `fd`), the player's pack when it changed (`pk`), the loot that it got (`l`: `[source, coins, stacks, full]`, source 0 a chest, 1 a drop, 2 a lock that it could not pick), the arrows near it (`ar`: id, shooter, x, y, aim code), the refuges of its character when they changed (`rf`), the chunks that it saw for the first time (`ex`), the coins that a defeat took (`wk`), the world's walking NPCs (`n`: their poses, in the order of `WorldSource.npcs()`), the lines that NPCs say (`b`), and the names (`names`: `[id, name]` for every player with a name, only when one changed) |
| server to client | `refused` | `version`, `world`, `full`, `busy`, `account` (a server with accounts: no session, no character, or not the visitor's own), or `elsewhere` (protocol 9: the account signed in on another device; it can come at any time, and the server closes the connection) |
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

**Protocol 10 (2026-10-10)** changes no message: the Wilds got the town of Thornwick, with its
buildings, its NPCs (the snapshots carry their poses) and doors that never open. A page of
protocol 9 has another world, so the server refuses it, and the visitor reloads the page.

## Intelligence: brews, drinks and the map (protocol 14, 2026-10-10)

- `deal` has `npc` (the index of an NPC) or `at` (the tile of a fixture with a dialog: the
  cauldron), never both. The Room checks the nearness (`DEAL_RANGE`, 48 px), the gate of the
  answer with that deal (`findDealAnswer()`, the player's scores), the coins and the items
  (`Deal.items`), and puts the goods in the pack. The pack goes in the next snapshot (`pk`).
- A new client message, `drink` (`kind`: an item code): the Room makes the drink do its work
  (`drinkFrom()`: hit points back, or the end of a poison) and takes it from the pack.
- The Room notes the chunks that each player sees (`seenChunks()`: the 3 x 3 chunks round it, at
  each tick). The welcome has all of them (`ex`), a snapshot the new ones. The server saves them
  with the place (the column `explored`; at most `MAX_EXPLORED`).
- The opening of a wind-up (`Blow.opening`, from the player's INT) adds damage in the Room; the
  page uses the same `blowDamage()` to show a kill at once.

## Constitution: hit points, stamina, defeats, refuges and deals (protocol 13, 2026-10-10)

- `WireSelf` carries the player's hit points, recovery, stamina (exact), rest, defeat, poison,
  poison clock, drink and wading, so the prediction replays all of them. `WirePlayer` carries
  the defeat ticks (the others see the fall).
- A mob's hit takes hit points in the Room (`hitPlayer()`, with the player's `stun` and
  `resist`). The Room wakes a defeated player on its last tick of `down` (`Room.wake`): at home
  or at the nearest refuge of its character, with half of its coins; the snapshot has `wk` (the
  coins that it lost). A player who leaves while it lies defeated wakes first (`Room.settle`), so
  the server saves the place and the coins after the defeat.
- The welcome has `hp` and `rf` (the refuges of the character); a snapshot has `rf` when a new
  refuge is entered (the Room checks `refugeAt()` at each tick).
- A rest goes as `u` on the tile of the bed; the Room rests the player if it is in reach.
- A new client message, `deal` (`npc`: the index of the NPC, `deal`: the id of the deal in its
  dialog): the Room checks the nearness (`DEAL_RANGE`) and the coins, takes them, and gives the
  goods (an ale: `drunk`).
- The server saves the HP and the refuges of each character with its place.

## Dexterity: the dodge, arrows, sneaking and locks (protocol 12, 2026-10-10)

- The input has a dodge: `[x, y, attack, 1]` (attack 0: none). `stepPlayer(..., traits)` rolls,
  on the page and in the Room, with the Dexterity of the stored character (its cooldowns and
  guard too). `WireSelf` carries the dodge ticks, the dodge cooldown and the exact direction of
  the dodge, so the prediction replays a roll exactly; `WirePlayer` carries the dodge ticks.
- A ranger's attack is an arrow: the Room flies it in its Horde (`Horde.shoot()`, `flyArrow()`),
  and its kill drops into the shooter's pack. The snapshots carry the arrows near the player
  (`ar`: id, shooter, x, y, aim code); a page draws the others' arrows from them, and flies its
  own copy at once (it skips its own in `ar`).
- Mobs see a player within their sight times `sightOf(traits, state)`: its Dexterity, and half
  while it sneaks (the Room reads it from the true state).
- A locked chest that the player cannot pick: the server answers `l` with source 2.

## Strength: traits, barred doors, chests and the pack (protocol 11, 2026-10-10)

The ability scores do things in the game (see `docs/drafts/abilities.md` and CLAUDE.md, "Ability
scores in the game"). The server makes each player's traits (`sheetTraits()`) from its stored
character, as it takes the look and the name: a client never sends them. The page makes the same
traits from the same character, so its prediction stays exact:

- `stepPlayer(..., traits)`: a player with Strength 13 walks in shallow water, at half speed, and
  does not attack there. The prediction and the Room run the same rule.
- A blow (`Horde.strike(..., blow)`) takes `traits.damage` health points (the attack ability of
  the class) and pushes and staggers by Strength. Mob health is in points now (imp 3, brute 12):
  the client predicts a kill when the health is not more than its damage. That changed the meaning
  of the health in `WireMob`, so the version went up.
- A barred door (`Building.barred`): a door wish on it forces it if the player's scores pass its
  gate (`useDoor(..., traits)`), on the client (prediction) and in the Room. The welcome and the
  snapshots with the doors carry the forced doors (`fd`). The Room's `Spoils` bars a forced door
  again after 30 minutes with nobody within 30 tiles.
- A chest (`u` in an input batch, just before the input `seq`, as a door wish): the Room checks
  the reach (`reachableFixture()`), takes the loot of the chest (`Spoils.open()`: one loot per
  chest for everybody, which fills again 30 minutes after it was emptied) into the player's pack,
  and sends `l` (source 0) and the pack (`pk`) in the next snapshot. The client does not predict
  it: the player says what it found when the snapshot comes.
- A kill drops loot into the killer's pack (`Horde.drop()`, `MOB_LOOT`): `l` with source 1.
- The pack belongs to the character: the store keeps it (the column `pack`), and the server saves
  it with the place (when the player leaves, and at each heartbeat). A page never writes it.

## Characters and accounts (protocol 7, 2026-10-09)

On a server with accounts (`startServer({ accounts })`, game.azyr.io), a player is one of the
characters of a signed-in account. The session cookie comes with the WebSocket upgrade (the page
and `/ws` have one origin), and `hello` names the character (`character`). The server loads it
from its database, checks that it belongs to the session's account, and takes the skin seed
(`characterSkin()`: race, class, gender and variant) and the name from it: what `hello` says
about them does not count, and `skin` and `name` messages are ignored. A visitor without a
session or a character of its own gets `refused` `account`.

The place of the character (2026-10-10, no change of the protocol): the player starts where the
character was last in this world (`Room.join(..., place)`), at any distance from the spawn. When
`at` is another tile within 64 tiles of the place (a client that walked on while it was cut off),
the player starts at `at`. The server notes the place when the player leaves and at each
heartbeat (25 s). See CLAUDE.md, "Menu, characters
and accounts".

## Looks and names (protocol 4, 2026-10-08)

The look and the name of a player come from its character (above). The protocol keeps the
`skin` and `name` messages for a server without accounts (none now; the engine keeps them):

- **Skin**: the server applies a new skin at most once every `SKIN_CHANGE_GAP_MS` (2 s) for each
  player; a skin that comes sooner waits, and the last one asked for wins. The others keep the
  old look until the new one is rendered on their side.
- **Name**: it also goes in `hello`, so it comes back after a reconnection or a reload.
  `cleanName()` (`net/protocol.ts`) runs on both sides: Latin letters, digits, space and
  `' . _ -` only, spaces joined, at most `NAME_MAX` (16) characters. The server cleans every name
  again; it never trusts the client. A character's name is cleaned in the same way when it is
  made (`checkSheet()`).
- The others see the name over the player's head, in the small pixel font (capitals only, 5 px
  high), in the text layer (above the darkness), inside the screen. The local player sees its
  own name too (`render/name-tag.ts`); it hides while a speech bubble is over the player.
- A player without a name (a guest, `?nomenu`) is called by its look: `skinName(seed)`
  (`art/skins.ts`) gives a first name and a title for the class ("Sister Petra", "Sir Galen").
  Every client makes the same name from the skin seed, so it is not on the wire.
- The snapshot carries the whole list of names, but only when a name appears, changes or goes
  (the room's names version). A new player gets the list in its first snapshot. A client that
  is skipped (a full send buffer) gets the list with its next snapshot.
- There is no moderation of names. The character set and the length are the only limits.

## Mobs (protocol 5, 2026-10-08; health and the `hurt` state: protocol 6)

The server runs the mobs of a shared world (`Room.horde`, a `Horde`, see CLAUDE.md "Mobs and
fights"): `Room.tick()` steps them with every player's true state, and a mob's hit stuns that
state at once. The client takes the stun from the next snapshot (`you`), and its prediction
replays the unconfirmed inputs with it, so the player stands still at once and a correction
is small. The client draws the mobs 100 ms in the past, like the players (`Remotes.mobsAt()`); a
counter (a state's ms, an attack's ticks) runs on from the last sample.

An attack is an input (`stepPlayer` starts it), so the client predicts it exactly. A blow on the
screen hits the mobs as the client shows them, 100 ms and a half round trip in the past. So the
client sends the server time of what it shows (`Remotes.viewTime()`) with the attack (`k`), and
the room checks the hit against the mobs now **and** where they were at that time (`Room` keeps
700 ms of their positions). It never goes back more than 500 ms; without a time, 150 ms. The
client shows the blow at once when the hit is clear (3 px inside the reach; `game.ts`): a mob
with more health left than the blow's damage reels (`reeling`; the server's push follows), and a mob on its
last health dies (`predicted`): it dies on the screen; when the
server's snapshot says that it dies too, the death goes on with the local timing; if the server
has not said so after 0.7 s, the mob shows alive again.

**Attack directions (protocol 8, 2026-10-10).** An attack goes in any direction, not only to one
of the four sides: the mouse aims it. `MoveInput.attack` is an angle in radians, and on the wire
it is a code from 0 to 255 (`aimCode()`, `aimFromCode()`). The client applies the code that it
sends, so the server repeats the same step. `PlayerState.aim` keeps the direction; the facing
(the four views of the body) is the side nearest to it (`facingOfAngle()`). The snapshots carry
the aim code of every player (the last field of `WirePlayer` and of `you`), so the others see the
effect of the blow in its direction.

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
- Skins (protocol 2, 2026-10-07; from the character since protocol 7): a skin is a 32-bit seed.
  A character's seed encodes its race, class, gender and variant (`appearanceSeed()`); a guest
  (`?nomenu`) has a random seed that the browser keeps (`game.skin.v1`); `?skin=<n>` shows
  another one without saving it. The seed goes in `hello`, and the server sends each player's
  seed to the others. Every client makes the same skin from a seed
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
scripts/dev.sh                       # local: the server and the page, the Wilds shared (see CLAUDE.md)
npm run server                       # local, port 3020, allows the Vite origins
curl -s http://127.0.0.1:3020/healthz   # {"ok":true,"protocol":14,"players":{"wilds":0},"accounts":true} (one count per shared world)
pm2 logs game-server                  # on the VPS: one line per arrival and departure; no addresses
```

`npm run dev` and `npm run preview` send `/ws` to `GAME_SERVER` (default `ws://127.0.0.1:3020`).
The development ports are 3019 (Vite) and 3020 (server); production is on 3008.
`SHARED_WORLDS` (comma-separated world ids) makes worlds shared in the page and in the server
(`shareWorlds()` in `apps/game/src/worlds.ts`): `scripts/dev.sh` sets `wilds`, production sets
nothing. Set it for both or for neither: a page that shares a world needs a server that does.

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
  mobs (a kill that every client sees, the rewind of a blow and its limit, a stun that the
  prediction keeps, only the mobs near a player),
  skins (and a change of skin, with its gap), names (cleaned, sent only when they change),
  a full room, and doors (shared, out of reach, never onto a player).
- `packages/engine-server/test/server.test.ts`: the real server on a free port, with `ws`
  clients: two visitors, refusals, a bad message, another origin, the per-address limit,
  ping and health.
- In a browser: two Playwright contexts in a shared world (see CLAUDE.md, "Verify a change in a
  browser"): each sees the other (`#presence`, and the `others` line of `?debug`), and a door
  that one opens is open for the other.
