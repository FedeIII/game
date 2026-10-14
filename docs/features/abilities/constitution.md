# Constitution

## Overview

Constitution (CON) is the health of the body. With the hit die of the class, it gives the hit
points of a character (5e, at its level: [Levels](../game/levels.md)). It also gives how long a mob's hit stuns it, its stamina (for a roll, an attack and the sneak walk), and
how long a poison or a drink lasts. No hit points come back by themselves: a rest in a bed, a
draught or a defeat heals. At 0 hit points a character is defeated: it falls, and it wakes at home or in a
refuge that it found, with half of its coins gone. A rest in the bed of the home, and an ale at
the inn of Ironhold, are the first things that act on these vitals.

## Terminology

- **Hit points (HP)**: the health of a character. A mob's hit takes some; at 0 the character is
  defeated.
- **Defeat**: the 3 s after the last hit point goes. The character lies still, and nothing can
  hit it.
- **Waking**: the end of a defeat: the character stands up at home or in a refuge.
- **Refuge**: a building where a defeated character can wake, after it has entered it once. In
  the Wilds: the chapel of Ironhold. The home is always a place to wake.
- **Hit die**: the die of the hit points of a class (5e): d6 to d12.
- **Recovery**: hit points that come back by themselves, out of a fight. A character has none;
  only a companion has it ([Companions](../npcs/companions.md)).
- **Rest**: an action on the bed of the home: all hit points and stamina come back.
- **Stamina**: the energy for a roll and for the sneak walk ([Dexterity](dexterity.md)).
- **Poison**: an effect of an imp's claws: the character loses 2 hit points every 3 s for a time.
- **Drink**: the effect of an ale: for a time the walk of the character sways.
- **Deal**: an answer in a conversation that buys goods for coins.
- **Vitals**: the display of the hit points, the stamina and the effects at the top left of the
  screen.

## Requirements

### REQ-CON-001: Constitution gives the hit points

**User Story:** As a tough character, I want more hit points, so that I can take more hits before
I fall.

**Acceptance Criteria:**
- **AC-CON-001.1:** A character has the hit points of its level and class (5e,
  [Combat](../game/combat.md), REQ-CMB-001, and [Levels](../game/levels.md), REQ-LVL-001): at level 1
  the hit die at its most and the CON modifier (at least 1); each level after adds half the die + 1
  and the CON modifier. Each level gives at least 1 hit point. (Until 2026-10-12 every character was
  level 3.)
- **AC-CON-001.2:** A guest has the hit points of the class of its look with CON 10, for example
  22 for a fighter.
- **AC-CON-001.3:** The vitals show the hit points as a red bar, and the numbers on it, for example
  "7 / 11". The length of the red part is the share of the hit points that the character has.
- **AC-CON-001.4:** A screen reader reads the hit points as "N of M hit points".
- **AC-CON-001.5:** The hit die is d12 for a barbarian; d10 for a fighter, a paladin and a ranger;
  d8 for a bard, a cleric, a druid, a monk, a rogue and a warlock; d6 for a sorcerer and a wizard.
  A fighter has 19 hit points at CON 8, 22 at CON 10 and 31 at CON 17. A wizard has 14 at CON 10.

---

### REQ-CON-002: A hit takes hit points and stuns less with Constitution

**User Story:** As a tough character, I want a hit to stun me for less time, so that I can act
again sooner.

**Acceptance Criteria:**
- **AC-CON-002.1:** A mob's attack that reaches the character rolls d20 + the attack bonus of the
  mob against the AC of the character ([Combat](../game/combat.md), REQ-CMB-004). A hit
  takes the damage dice of the mob: 1d4+3 for an imp, 2d8+3 for a brute (every mob: REQ-CMB-002).
  A miss glances off: it takes no hit points and does not stun
  ([Equipment](../items/equipment.md), REQ-EQ-007).
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
- **AC-CON-003.2:** While the poison lasts, it takes 2 hit points every 3 s: 4 hit points at CON
  10, 2 at CON 17.
- **AC-CON-003.3:** A poison never takes the last hit point: a bite leaves at least 1, so a poison
  alone never defeats a character.
- **AC-CON-003.4:** While the character is poisoned, its figure shows a sick green now and then,
  and the vitals show "Poisoned".
- **AC-CON-003.5:** A brute's hit does not poison.

---

### REQ-CON-004: No hit points come back by themselves

**User Story:** As Fede, I want hit points to come back only as at the table, so that a fight
costs something.

**Acceptance Criteria:**
- **AC-CON-004.1:** No hit point of a character comes back by itself, in a fight or out of it, at
  any CON (Fede's decision, 2026-10-11).
- **AC-CON-004.2:** Hit points come back only with a rest in a bed (REQ-CON-005), a draught
  ([Pack and Loot](../items/pack-and-loot.md), REQ-PK-011), herbs with Medicine
  ([Wisdom](wisdom.md), REQ-WIS-006), or the end of a defeat (REQ-CON-007).
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
- **AC-CON-008.1:** In the Wilds, the chapel of Ironhold is a refuge. The point to wake there is
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

**User Story:** As a player, I want my energy to limit my rolls, my attacks and my sneak walk, so
that I use them with care.

**Acceptance Criteria:**
- **AC-CON-009.1:** A character has 100 + 10 × CON modifier stamina, at least 10: 90 at CON 8, 100
  at CON 10, 130 at CON 17.
- **AC-CON-009.2:** A roll costs the stamina of its kind, by the load of the character
  ([Load](../items/load.md), REQ-LD-003): light 30, medium 40, heavy 50, a step aside 50. With less,
  there is no roll, and the roll button is dim.
- **AC-CON-009.3:** The sneak walk (a walk at half speed or slower) uses 8 stamina each second. A
  slow walk in shallow water uses none.
- **AC-CON-009.4:** Without stamina the sneak walk does not hide the character from mobs. Standing
  still hides it with no stamina.
- **AC-CON-009.5:** Stamina comes back 1 s after its last use, at 20 + 4 × CON modifier each
  second (16 at CON 8, 32 at CON 17), up to the most. In a brace it does not fill: it fills again 1 s
  after the brace ends ([Combat](../game/combat.md), REQ-CMB-013).
- **AC-CON-009.5a:** An attack costs stamina by the weight of what the character attacks with (Fede,
  2026-10-14; `ATTACK_STAMINA`): a light weapon (the shortsword) or martial arts 4; another weapon, a
  cantrip or an unarmed strike 6; a heavy weapon (the greataxe, the glaive) 10. An arrow of a longbow
  (a heavy weapon) costs 10 too. An attack is a use: the refill waits 1 s after it.
- **AC-CON-009.5b:** With less stamina than its attack costs, the attack still comes, and the stamina
  goes to 0, but the next attack waits twice as long (`TIRED_COOLDOWN`). The attack button does not
  go dim.
- **AC-CON-009.5c:** Guards and companions pay no stamina for their attacks.
- **AC-CON-009.5d:** The character panel and the builder show the cost under Constitution: "Each
  attack: 6 stamina" ("Cada ataque: 6 de aguante").
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
- **AC-CON-012.1:** Step 2 of the builder and the character panel show "Hit points" (for the class,
  the scores and the level) in the key numbers at the top, and the card "Constitution" lists "Stun
  from a hit", "Stamina" and "Poison and drink" with their values for the scores (for CON 12:
  "−10%", "110 (+24 each second)" and "−15%").
- **AC-CON-012.2:** The values change at once when a score changes in the builder.

## Feature Behavior & Rules

- The traits: `maxHp`, `stun`, `recover`, `maxStamina`, `staminaRefill`, `attackStamina` and
  `resist` of `PlayerTraits` (`packages/engine/src/traits.ts`, `STUN_PER_MOD`, `STAMINA_PER_MOD`,
  `REFILL_PER_MOD`, `RESIST_PER_MOD`). `maxHp` is `levelHp(class, CON modifier, level)`, with
  `HIT_DIE`; the level comes from the XP (`experience.ts`). `recover` is 0 for every character. The plain values are in
  `packages/engine/src/player.ts`: `PLAIN_HP` (18: a d8 class with CON 10, for a player without
  traits and the test companion), `PLAIN_STAMINA`, `STAMINA_REFILL`. `attackStamina` is
  `ATTACK_STAMINA[strike.weight]` (`player.ts`; `AttackGear.weight` in `gear.ts`: `light`, `plain`
  or `heavy`); a guard or a companion steps without it (no cost). With too little, `stepPlayer()`
  multiplies the cooldown of the attack by `TIRED_COOLDOWN` (2).
- The state is in `PlayerState`: `hp`, `recover`, `stamina`, `rest`, `down`, `poison`,
  `poisonClock`, `drunk`, `wading`. `stepPlayer()` runs the stamina, the poison and the drink each
  tick (`body()`), on the page and on the server alike. `body()` gives hit points back only with a
  `recover` above 0: a companion (`COMPANION_RECOVER` in `companions.ts`), or a state stepped
  without traits (`RECOVER_TICKS`).
- A hit is `hitPlayer()`: the Horde (`Horde.attack()`) calls it when the attack roll of the mob
  hits (`attackRoll()` in `dice.ts`, `MobStats.toHit` against `HordePlayer.traits.ac`), with the
  rolled `MobStats.damage`, `stunTicks` and `poisonTicks` (imp 360, the other mobs 0), and with
  the traits in `HordePlayer.traits`. A miss calls `glancePlayer()`. The Horde also uses the guard
  of each player (DEX) to time the next blow.
- A bite of a poison takes `POISON_DAMAGE` (2) every `POISON_EVERY` (180) ticks, and never the
  last hit point. A hit and a bite set `PlayerState.recover` to `RECOVER_DELAY_TICKS` (480); only
  a companion uses it.
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
  server saves it. Null `hp` means all the hit points. Migration 10 (2026-10-11, the 5e scale) set
  `hp` to null for every character, so each one got all its hit points on the new scale.
- The vitals are `packages/engine-client/src/ui/vitals.ts` (`#vitals`, `#hurt`, `#down-veil`).
  The hit points are `.vitals-hp`, with `.vitals-hp-fill` (the red part) and `.vitals-hp-numbers`
  (`style.css`). The fall frames are `fallParts()` (`packages/engine-client/art/attacks.ts`), two frames in each
  skin sheet (`SKIN_FALL_FRAMES`).
- The protocol (13): `WireSelf` carries the vitals, `WirePlayer` the defeat, the welcome `hp` and
  `rf`, the snapshot `rf` and `wk`. See `docs/multiplayer.md`.
