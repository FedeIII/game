# Combat at Level 3

## Overview

The adventures of Kandrax are made for a party of level-3 characters. Since 2026-10-11 (Fede's
decision; plan: `docs/drafts/level-3.md`) the game uses the basic 5e numbers: a new character is a
level-3 character, the mobs have the hit points, the Armour Class, the attack bonus and the damage of
their SRD stat blocks, and the dice roll. A blow and a mob's hit roll d20 against the Armour Class;
a hit rolls its damage dice. No hit points come back by themselves: a bed, a draught or a defeat
heals. The real-time rules stay: a blow must touch the mob, the dodge, the guard after a stun, the
turns of a pack, the wind-ups.

## Terminology

- **Attack roll**: d20 + an attack bonus against an Armour Class (AC). A natural 20 always hits, as a
  critical hit; a natural 1 always misses.
- **Critical hit**: a hit of a natural 20; it rolls all the damage dice twice.
- **Miss**: an attack roll under the AC. A miss glances off: no damage, no reel, no stun.
- **Dice**: as 5e writes them: 1d8+3 is one eight-sided die plus 3.

## Requirements

### REQ-CMB-001: A character of level 3

**User Story:** As Fede, I want a new character to be a level-3 character of 5e, so that the
adventures of Kandrax fit it.

**Acceptance Criteria:**
- **AC-CMB-001.1:** The hit points of a character are those of level 3: the hit die of its class at
  its most, its average (half + 1) twice, and 3 times the CON modifier (at least 1 for each level).
  A fighter (d10) with CON 10 has 22; with CON 14, 28; a wizard (d6) with CON 10, 14.
- **AC-CMB-001.2:** The attack bonus of a character is +2 and the modifier of its attack ability,
  and a magic bonus. A fighter with STR 16 has +5.
- **AC-CMB-001.3:** The damage of a blow is the die of the weapon (the bigger die of a versatile
  weapon with an empty off hand), plus the modifier and the magic bonus: a longsword with a shield
  and STR 16 is 1d8+3. A cantrip at level 3: fire bolt and eldritch blast 1d10, produce flame 1d8. A
  monk's martial arts: 1d4 + DEX. An unarmed strike: 1 and the modifier of the attack ability.
- **AC-CMB-001.4:** A rogue's sneak attack adds 2d6 on a mob that does not hunt the rogue.
- **AC-CMB-001.5:** The builder, the "You" section and the pack panel show the AC, the attack bonus
  ("+5 to hit") and the dice of a blow ("1d8+3").

---

### REQ-CMB-002: The mobs of the SRD

**User Story:** As a player, I want the mobs to be as strong as in the books, so that a fight feels
as at the table.

**Acceptance Criteria:**
- **AC-CMB-002.1:** The mobs have these numbers (hit points, AC, attack bonus, damage): the imp 7,
  13, +4, 1d4+3 and its poison; the brute 30, 12, +5, 2d8+3; the goblin 7, 15, +4, 1d6+2; the worg 26,
  13, +5, 2d6+3; the hobgoblin 11, 18, +3, 1d8+1; the bugbear 27, 16, +4, 2d8+2.
- **AC-CMB-002.2:** A hobgoblin adds 2d6 to its hit when another mob stands within 1.5 tiles of its
  target (its martial advantage).
- **AC-CMB-002.3:** A poison bites 2 hit points every 3 s while it lasts, never the last one.

---

### REQ-CMB-003: A character's blow

**User Story:** As a player, I want my blows to roll as at the table, so that armour matters.

**Acceptance Criteria:**
- **AC-CMB-003.1:** A blow (or an arrow) that touches a mob rolls d20 + the attack bonus against the
  mob's AC. A hit takes its rolled damage from the mob's hit points, pushes it back and makes it reel;
  the hit that takes its last hit point kills it.
- **AC-CMB-003.2:** A miss takes nothing and does not make the mob reel, but the mob turns on the
  attacker.
- **AC-CMB-003.3:** A natural 20 is a critical hit: the damage dice (and the sneak attack's) roll
  twice. A natural 1 misses.
- **AC-CMB-003.4:** In a shared world the server rolls. The page flashes the mob that a blow touches
  at once, and it shows the result when the server's word comes.

---

### REQ-CMB-004: A mob's hit

**User Story:** As a player in heavy armour, I want the mobs to miss me more often, so that my
armour protects me.

**Acceptance Criteria:**
- **AC-CMB-004.1:** A mob's attack that reaches the player (in reach, and not in a stun, a guard or a
  dodge) rolls d20 + the mob's attack bonus against the player's AC.
- **AC-CMB-004.2:** A hit takes its rolled damage, stuns, and poisons (an imp). A miss glances off: a
  spark, no damage, no stun.
- **AC-CMB-004.3:** A goblin's arrow rolls the same way when it reaches the player.
- **AC-CMB-004.4:** A companion has an AC too (12 without its own).

---

### REQ-CMB-005: Healing, as at the table

**User Story:** As Fede, I want hit points to come back slowly, so that a fight costs something.

**Acceptance Criteria:**
- **AC-CMB-005.1:** No hit point comes back by itself.
- **AC-CMB-005.2:** A bed of the character (the home, a refuge) gives back all the hit points.
- **AC-CMB-005.3:** A healing draught gives back 2d4+2 hit points; a strong draught 4d4+4; herbs
  (with Medicine, WIS 13) 1d4.
- **AC-CMB-005.4:** A defeated character wakes at home or at its nearest refuge with all its hit
  points (and half of its coins go).
- **AC-CMB-005.5:** After the change to the new scale, every stored character has all its hit points.

---

### REQ-CMB-006: The numbers of a fight

**User Story:** As a player, I want to see what the dice did, so that I understand the fight.

**Acceptance Criteria:**
- **AC-CMB-006.1:** Over a mob that the player's blow touched, a number rises and fades in 0.9 s: the
  damage ("7"), a critical hit in orange ("14!"), or "miss" in grey ("fallo" in Spanish).
- **AC-CMB-006.2:** Over the player: the damage that it takes in red, the hit points that come back in
  green ("+7"), and "miss" when a mob's attack glances off.
- **AC-CMB-006.3:** The hit points show as a red bar with the numbers ("17 / 28").

---

## Feature Behavior & Rules

- **Dice** (`packages/engine/src/dice.ts`): `Dice`, `dice()`, `plusDice()`, `formatDice()`,
  `averageDice()`, `rollDice()`, `attackRoll()`, `DiceSource` (`rollingDice()`, or `AVERAGE_DICE`:
  the average of the dice and every attack hits, for tests).
- **Characters** (`packages/engine/src/traits.ts`): `LEVEL` 3, `PROFICIENCY_BONUS` 2, `HIT_DIE`,
  `levelHp()`; `PlayerTraits.damage` (dice), `toHit`, `sneak` (dice), `recover` 0. `gear.ts`:
  `dieBase()`, `CANTRIP_BASE`, `MARTIAL_ARTS_BASE`, `UNARMED_BASE`, `SNEAK_ATTACK`.
- **Mobs** (`packages/engine/src/mobs.ts`): `MobStats.health`, `ac`, `toHit`, `damage`, `allyDice`,
  `xp` (for the encounters of the story); `Blow` (`toHit`, `damage`, `sneak`, `opening`, `push`,
  `stagger`, `reach`), `PLAIN_BLOW`, `rollBlow()`, `BlowResult`, `MobHit`, `ShotResult`,
  `Horde.dice`, `Horde.strike()` (results), `Horde.takeShotResults()`, `ALLY_RANGE`.
- **The player** (`packages/engine/src/player.ts`): `hitPlayer()` (a hit that its roll landed),
  `glancePlayer()` (a miss), `PLAIN_HP` 18, `POISON_DAMAGE` 2. Drinks: `DRINKS` (dice), `drinkFrom()`
  with a dice source (`items.ts`).
- **The server**: `RoomOptions.dice`, `Room.dice` (the draughts), `RoomPlayer.blows`; the snapshot
  field `bl` (protocol 26: `WireBlow`, `toWireBlow()`). The store's migration of 2026-10-11 sets every
  `hp` to NULL.
- **The page**: `render/fight-numbers.ts` (`FightNumbers`, `FIGHT_INK`), `MobViews.touch()` and
  `mobHead()` (`render/mobs.ts`), `NetSession.onBlows()`, `ui/vitals.ts` (the bar), `STRINGS.fight`.
  The debug panel shows "ac 18, weapon +5 1d8+3" and "fight blows N".
- **Tests**: `packages/engine/test/dice.test.ts`; the tests of the mobs, the gear and the abilities use
  `AVERAGE_DICE` where they count blows or hits.
- **Encounters** (`packages/engine/src/encounters.ts`): the ambush of the scouts is sized to the
  characters there with the 5e budget (`docs/features/game/quests.md`, REQ-QST-012).
- **Not yet**: class features of levels 1 to 3 (second wind, rage, smite, spells).
