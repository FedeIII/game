# Constitution

## Overview

Constitution (CON) is the health of the body. It gives the hit points of a character, how long a
mob's hit stuns it, how fast its hit points come back, its stamina, and how long a poison or a
drink lasts. At 0 hit points a character is defeated: it falls, and it wakes at home or in a
refuge that it found, with half of its coins gone. A rest in the bed of the home, and an ale at
the inn of Thornwick, are the first things that act on these vitals.

## Terminology

- **Hit points (HP)**: the health of a character. A mob's hit takes some; at 0 the character is
  defeated.
- **Defeat**: the 3 s after the last hit point goes. The character lies still, and nothing can
  hit it.
- **Waking**: the end of a defeat: the character stands up at home or in a refuge.
- **Refuge**: a building where a defeated character can wake, after it has entered it once. In
  the Wilds: the chapel of Thornwick. The home is always a place to wake.
- **Recovery**: hit points that come back by themselves, out of a fight.
- **Rest**: an action on the bed of the home: all hit points and stamina come back.
- **Stamina**: the energy for a roll and for the sneak walk ([Dexterity](dexterity.md)).
- **Poison**: an effect of an imp's claws: the character loses a hit point every 3 s for a time.
- **Drink**: the effect of an ale: for a time the walk of the character sways.
- **Deal**: an answer in a conversation that buys goods for coins.
- **Vitals**: the display of the hit points, the stamina and the effects at the top left of the
  screen.

## Requirements

### REQ-CON-001: Constitution gives the hit points

**User Story:** As a tough character, I want more hit points, so that I can take more hits before
I fall.

**Acceptance Criteria:**
- **AC-CON-001.1:** A character has 4 + CON modifier hit points, at least 1: 3 at CON 8, 4 at
  CON 10, 5 at CON 12, 6 at CON 14, 7 at CON 16 and 17.
- **AC-CON-001.2:** A guest has 4 hit points (every score 10).
- **AC-CON-001.3:** The vitals show one red pip for each hit point that the character has, and
  one dark pip for each hit point that it lost.
- **AC-CON-001.4:** A screen reader reads the hit points as "N of M hit points".

---

### REQ-CON-002: A hit takes hit points and stuns less with Constitution

**User Story:** As a tough character, I want a hit to stun me for less time, so that I can act
again sooner.

**Acceptance Criteria:**
- **AC-CON-002.1:** The hit of an imp takes 1 hit point; the hit of a brute takes 2.
- **AC-CON-002.2:** A hit stuns for the stun of the mob × (1 − 0.1 × CON modifier), at least 0.1
  of it: an imp's 1 s is 1.1 s at CON 8 and 0.7 s at CON 17; a brute's 2 s is 2.2 s and 1.4 s.
- **AC-CON-002.3:** When a hit point goes, the edges of the screen flash red for 0.45 s.
- **AC-CON-002.4:** A hit can come only when the character is not defeated, not stunned, not in
  its guard after a stun and not in a roll.

---

### REQ-CON-003: An imp's claws poison

**User Story:** As a player, I want the claws of an imp to poison me, so that an imp is a danger
also after its hit.

**Acceptance Criteria:**
- **AC-CON-003.1:** A hit of an imp poisons the character for 6 s × (1 − 0.15 × CON modifier),
  at least 0.1 of it: 6.9 s at CON 8, 6 s at CON 10 and 3.3 s at CON 17. A new poison does not
  make a longer poison shorter.
- **AC-CON-003.2:** While the poison lasts, it takes 1 hit point every 3 s: 2 hit points at CON
  10, 1 at CON 17.
- **AC-CON-003.3:** A poison never takes the last hit point: a poison alone never defeats a
  character.
- **AC-CON-003.4:** While the character is poisoned, its figure shows a sick green now and then,
  and the vitals show "Poisoned".
- **AC-CON-003.5:** A brute's hit does not poison.

---

### REQ-CON-004: Hit points come back out of a fight

**User Story:** As a player, I want my hit points to come back when I am out of danger, so that I
can go on after a fight.

**Acceptance Criteria:**
- **AC-CON-004.1:** The first hit point comes back 8 s after the last hit (or the last bite of a
  poison).
- **AC-CON-004.2:** After the first, one hit point comes back every (8 − CON modifier) s, at least
  1 s: every 9 s at CON 8, every 8 s at CON 10, every 5 s at CON 17.
- **AC-CON-004.3:** A new hit starts the 8 s again.
- **AC-CON-004.4:** The hit points never go above the most of the character.

---

### REQ-CON-005: A rest in the bed of the home

**User Story:** As a player, I want to rest in my bed, so that I can be at full health at once.

**Acceptance Criteria:**
- **AC-CON-005.1:** Near the bed of the home, the action button says "Rest".
- **AC-CON-005.2:** A rest gives back all the hit points and all the stamina, and ends a poison
  and a drink.
- **AC-CON-005.3:** After a rest the player says "I rest a while. I feel well again."
- **AC-CON-005.4:** In a shared world the server makes the rest, if the player is in reach of the
  bed.

---

### REQ-CON-006: A defeat at 0 hit points

**User Story:** As a player, I want a clear defeat when my hit points go, so that a fight has a
real risk.

**Acceptance Criteria:**
- **AC-CON-006.1:** When the last hit point goes, the character is defeated for 3 s.
- **AC-CON-006.2:** During a defeat the figure falls back and lies on the ground, and the other
  players see the fall.
- **AC-CON-006.3:** During a defeat the character does not move, attack or roll, and no mob can hit
  it. The mobs do not see it, so they give up the hunt.
- **AC-CON-006.4:** During a defeat the screen fades to black (in 1.2 s, to 92%).
- **AC-CON-006.5:** A defeat ends a stun, a roll, a poison and an open conversation.

---

### REQ-CON-007: Waking after a defeat

**User Story:** As a defeated player, I want to wake at a safe place, so that I can go on, with a
cost for the defeat.

**Acceptance Criteria:**
- **AC-CON-007.1:** After the 3 s of a defeat, the character wakes at home, on the tile north of
  the door of the hut.
- **AC-CON-007.2:** When the character has entered a refuge, it wakes at the nearest of the home
  and its refuges, from the place of its defeat.
- **AC-CON-007.3:** It wakes with all its hit points and all its stamina, with no poison and no
  drink, and with a guard of 2 s in which no mob can hit it.
- **AC-CON-007.4:** A defeat takes half of the coins, rounded down (9 coins become 5). The items
  stay in the pack.
- **AC-CON-007.5:** After it wakes, the player says "I wake up, sore and alive. 4 coins are gone."
  ("A coin is gone." for one coin), or "I wake up, sore and alive." when it lost no coins.
- **AC-CON-007.6:** In a shared world the server wakes the player, moves it, and takes the coins.

---

### REQ-CON-008: Refuges

**User Story:** As a player who explores, I want to find safe places, so that a defeat far from
home does not send me all the way back.

**Acceptance Criteria:**
- **AC-CON-008.1:** In the Wilds, the chapel of Thornwick is a refuge. The point to wake there is
  the tile north of the chapel door.
- **AC-CON-008.2:** When a character comes into the chapel for the first time, the player says
  "This place feels safe. If I fall, I can wake here."
- **AC-CON-008.3:** The store keeps the refuges of each character between sessions. A new
  character has none.
- **AC-CON-008.4:** The Crooked Lantern is a refuge only for a character to whom Marta gave a room
  ([Charisma](charisma.md), REQ-CHA-002). To come into the inn is not enough. The point to wake
  there is the tile west of the bed by the east wall.

---

### REQ-CON-009: Stamina

**User Story:** As a player, I want my energy to limit my rolls and my sneak walk, so that I use
them with care.

**Acceptance Criteria:**
- **AC-CON-009.1:** A character has 100 + 10 × CON modifier stamina, at least 10: 90 at CON 8, 100
  at CON 10, 130 at CON 17.
- **AC-CON-009.2:** A roll costs 35 stamina. With less than 35, there is no roll, and the roll
  button is dim.
- **AC-CON-009.3:** The sneak walk (a walk at half speed or slower) uses 8 stamina each second. A
  slow walk in shallow water uses none.
- **AC-CON-009.4:** Without stamina the sneak walk does not hide the character from mobs. Standing
  still hides it with no stamina.
- **AC-CON-009.5:** Stamina comes back 1 s after its last use, at 20 + 4 × CON modifier each
  second (16 at CON 8, 32 at CON 17), up to the most.
- **AC-CON-009.6:** The vitals show the stamina as a thin bar under the hit points.
- **AC-CON-009.7:** There is no sprint: no stamina makes a character faster than its walk.

---

### REQ-CON-010: An ale at the Crooked Lantern

**User Story:** As a player with coins, I want to buy an ale at the inn, so that my coins have a
use.

**Acceptance Criteria:**
- **AC-CON-010.1:** In the conversation with Marta, the innkeeper, the answer "The ale, then. (2
  coins)" buys an ale for 2 coins. Charisma changes the price ([Charisma](charisma.md),
  REQ-CHA-003): "(1 coin)" at CHA 16 or 17.
- **AC-CON-010.2:** With the coins, the coins go, and Marta says "Here. Do not tell me what you
  think of it. Everybody tells me."
- **AC-CON-010.3:** With fewer coins, nothing is bought, and Marta says "An ale costs coin. Come
  back when the woods have paid you."
- **AC-CON-010.4:** An ale lasts 60 s × (1 − 0.15 × CON modifier), at least 0.1 of it: 69 s at
  CON 8, 60 s at CON 10, 33 s at CON 17.
- **AC-CON-010.5:** While the drink lasts, the walk sways: its direction turns to and fro, by up
  to 0.45 rad. The vitals show "Drunk".
- **AC-CON-010.6:** In a shared world the server sells the ale only to a player within 48 px of
  the innkeeper who has the coins.

---

### REQ-CON-011: Hit points between sessions

**User Story:** As a player, I want my character to come back with the hit points that it had, so
that leaving the game does not heal it.

**Acceptance Criteria:**
- **AC-CON-011.1:** The server keeps the hit points of each character with its place: when the
  player leaves, and every 25 s.
- **AC-CON-011.2:** A character comes back with the hit points that it had, at most its most. A
  new character starts with all of them.
- **AC-CON-011.3:** A player who leaves while it is defeated wakes first. The server keeps the
  place where it woke, its full hit points and its coins after the defeat.
- **AC-CON-011.4:** Stamina, a poison and a drink do not stay between sessions: a character comes
  back with all its stamina, and with no poison and no drink.

---

### REQ-CON-012: What Constitution shows in the builder

**User Story:** As a player who makes a character, I want to see what Constitution gives, so that
I can choose my scores.

**Acceptance Criteria:**
- **AC-CON-012.1:** Step 2 of the builder and the "You" section list "Hit points", "Stun from a
  hit", "A hit point back", "Stamina" and "Poison and drink" with their values for the scores.
- **AC-CON-012.2:** The values change at once when a score changes in the builder.

## Feature Behavior & Rules

- The traits: `maxHp`, `stun`, `recover`, `maxStamina`, `staminaRefill` and `resist` of
  `PlayerTraits` (`packages/engine/src/traits.ts`, `HP_PER_MOD`, `STUN_PER_MOD`,
  `RECOVER_PER_MOD`, `STAMINA_PER_MOD`, `REFILL_PER_MOD`, `RESIST_PER_MOD`). The plain values
  (CON 10) are in `packages/engine/src/player.ts`: `PLAIN_HP`, `PLAIN_STAMINA`,
  `STAMINA_REFILL`, `RECOVER_TICKS`.
- The state is in `PlayerState`: `hp`, `recover`, `stamina`, `rest`, `down`, `poison`,
  `poisonClock`, `drunk`, `wading`. `stepPlayer()` runs the recovery, the stamina, the poison
  and the drink each tick (`body()`), on the page and on the server alike.
- A hit is `hitPlayer()`: the Horde calls it with `MobStats.hitDamage`, `stunTicks` and
  `poisonTicks` (imp 360, brute 0), and with the traits in `HordePlayer.traits`. The Horde also
  uses the guard of each player (DEX) to time the next blow.
- The recovery starts again after a hit and after each bite of a poison
  (`RECOVER_DELAY_TICKS`, 480 ticks).
- A defeat is `down` (`DOWN_TICKS`, 180 ticks). `stepPlayer()` only counts it down; the caller
  wakes the player on its last tick: `Room.wake()` on the server, `wakeHere()` in `game.ts` in a
  world that the page runs (or while the page has no connection). `wakePlayer()` gives the guard
  `WAKE_GUARD_TICKS` (120). The Horde does not see a player in a defeat (`sees()`), and
  `canBeHit()` is false.
- The place to wake is `wakePoint()` (`packages/engine/src/world.ts`): the world's spawn, or the
  nearest refuge in `Character.refuges`. A world gives its refuges with `WorldSource.refuges()`
  (the Wilds: `REFUGES` in `worlds/wilds/src/source.ts`). The Room adds a refuge when
  `refugeAt()` finds the player inside its building, at each tick.
- The rest is `Interaction.rest` on the bed of the home (`worlds/wilds/src/home.ts`) and `rest()`
  in `packages/engine/src/net/room.ts`. In a shared world it goes to the server as `u` on the
  tile of the bed.
- A deal is `DialogAnswer.deal` (`packages/engine/src/dialog.ts`: `id`, `goods`, `price`,
  `poor`). `checkDialog()` checks that the node `poor` exists and that two deals with one id are
  the same deal. The page decides the branch from its coins; in a shared world it sends
  `{ t: 'deal', npc, deal }`, and `Room.deal()` checks `DEAL_RANGE` (48 px) and the coins again.
  The ale is `ALE` in `worlds/wilds/src/dialogs.ts`; its length is `ALE_TICKS` (3600) ×
  `resist`, its sway `DRUNK_SWAY`.
- The store keeps `hp` and `refuges` (columns of `characters`, migration 6 in
  `packages/engine-server/src/store.ts`) with the place and the pack (`savePlace()` in
  `packages/engine-server/src/index.ts`). `Room.settle()` wakes a defeated player before the
  server saves it.
- The vitals are `packages/engine-client/src/ui/vitals.ts` (`#vitals`, `#hurt`, `#down-veil`).
  The fall frames are `fallParts()` (`packages/engine-client/art/attacks.ts`), two frames in each
  skin sheet (`SKIN_FALL_FRAMES`).
- The protocol (13): `WireSelf` carries the vitals, `WirePlayer` the defeat, the welcome `hp` and
  `rf`, the snapshot `rf` and `wk`. See `docs/multiplayer.md`.
