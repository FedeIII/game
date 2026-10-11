# Companions: NPCs that follow a player (draft)

> **Draft** · promotes to `docs/features/npcs/companions.md` when built · **Status:** Planned
> 2026-10-11

In the first story (`docs/drafts/story-razed-villages.md`), the character frees the scout Himo
in the hobgoblin camp and escorts Himo home to Ironhold. Fede decided (2026-10-11) to build the
system for that: an NPC that follows a player through the world. Later the same system carries
the two soldiers of Ironhold who join the character and then turn on it, and the caravan of the
Mithril Enclave (NPCs with hit points that mobs attack).

## What a companion is

- **A definition** (`CompanionDef`, content of a world or of a quest): an id, a name, a look (an
  NPC look of the atlas), its hit points, and what a defeat does: `gone` (it dies: Himo) or
  `wakes` (it lies 3 s, then gets up with all its hit points).
- **A companion** in a world: a body (a `PlayerState`: the same walk, collision and hits as a
  player), a leader (the player that it follows) and a mode: `follow` or `wait`.

## The rules

- **It follows its leader.** It keeps about one tile from the leader. Farther than that, it walks
  the shortest way of tiles to the leader (four directions, round walls, trees, rocks and water),
  at the walk of a player; more than 4 tiles behind, it walks a fifth faster, so it catches up.
  It finds the way again when the leader goes to another tile, and twice a second.
- **It opens doors** on its way, as an NPC does (not a locked door, not a barred one). It does
  not wade: water is a wall for it.
- **It waits when it cannot follow.** With no way within 24 tiles round it, or with the leader
  more than 20 tiles away, it stops (`wait`). When the leader comes back within reach, it follows
  again. It does not jump to the leader: the player must come back for it.
- **Mobs hunt it** as they hunt a player: they see it, chase it, take turns and hit it. A hit
  stuns it and takes its hit points; it gets a guard after the stun, and its hit points come back
  out of a fight, as a player's with CON 10. It does not fight back (v1). Mobs never come for it
  in a town, as for a player.
- **Mobs do not come because of it.** New mobs come round the players only, and they prowl
  towards the players only: a companion adds no mobs.
- **A defeat:** `gone` takes it out of the world (the quest gets the event); `wakes` lays it down
  for 3 s, then it stands with all its hit points.
- **Its leader leaves** the world: the companion goes too. The quest book (story phase 2) keeps
  the escort, and the next join puts the companion back next to the character.
- **Events** for the quests: `fell` (its hit points came to 0), `gone`, `lost` (it stopped: no
  way), `found` (it follows again).

## In a shared world

- The Room runs the companions, in fixed ticks, before the horde. `Room.addCompanion(def,
  leader)` puts one next to its leader (the quests call it; there is no message for a client).
- Protocol 22: each snapshot carries `cp`, the companions within 30 tiles of the player: `[id,
  look, name, x, y, vx, vy, facing code, hp, most hp, stun, guard, down, leader]`. The page
  draws them 100 ms in the past, as the other players (`Remotes`).
- A page that runs its world runs its own companions.

## On the screen

- The look of an NPC (its frames in the atlas), its name over its head in the small font, the
  red flash of a hit and the stars of a stun, as a player has. While it lies defeated, it shows
  half faded.
- For tests: `?companion=<look>` in a world that the page runs (`?offline`), as `?mob=`: a
  companion of that look starts next to the player and follows it.

## Code

- `packages/engine/src/companions.ts`: `CompanionDef`, `Companion`, `Companions` (`add()`,
  `remove()`, `ofLeader()`, `step()`, `targets()`), the way (`followPath()`), the constants.
- `packages/engine/src/mobs.ts`: `HordePlayer.companion`: such a target brings no new mobs, and no
  mob prowls to it.
- `packages/engine/src/net/room.ts`, `protocol.ts` (`cp`, protocol 22), `remotes.ts`
  (`companionsAt()`).
- `packages/engine-client/src/render/companions.ts` (`CompanionViews`), `game.ts` (the local
  companions and the switch), `net/session.ts`.
- Tests: the follow round a wall, through a door, the wait across water and the follow again,
  the catch-up, the hits of mobs and the two kinds of defeat, the Room (the snapshot, a leader
  that leaves), and no new mobs round a companion.

## Later

- Companions that fight (the soldiers of Q2), and that turn on the character.
- The convoy of Q3: NPCs that walk a road on their own (a leader that is a path, not a player).
- A word with a companion (E): a short conversation ("Wait here", "Follow me").
