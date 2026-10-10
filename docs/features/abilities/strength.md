# Strength

## Overview

Strength (STR) is the force of the body. For every class it gives the push and the stagger of a
blow and the slots of the pack. Its gate of 13 lets a character wade through shallow water and
force a barred door. For the barbarian, the fighter and the paladin, STR also gives the damage of
a blow ([Ability Scores](ability-scores.md), REQ-AS-002).

## Terminology

- **Knockback (push)**: how far a blow pushes a mob away from the attacker.
- **Stagger**: how long a mob reels after a blow that does not kill it (the mob state `hurt`).
- **Shallow water**: a ground (`Ground.Shallows`): a band of water at the shore of each lake,
  between the deep water and the sand. A small pond is all shallow water.
- **Wading**: a walk in shallow water.
- **Wader**: a character with STR 13 or more in shallow water.
- **Barred door**: the door of a house with boards nailed across it (`Building.barred`).
- **Forced door**: a barred door whose boards a strong character broke. It is an ordinary door
  until the boards come back.
- **Slot**: a place in the pack for one kind of item ([Pack and Loot](../items/pack-and-loot.md)).

## Requirements

### REQ-STR-001: A strong blow pushes a mob further

**User Story:** As a strong character, I want my blows to push mobs further, so that I have more
room in a fight.

**Acceptance Criteria:**
- **AC-STR-001.1:** The push of a blow is the knockback of the mob × (1 + 0.15 × STR modifier),
  for every class.
- **AC-STR-001.2:** A blow pushes an imp (knockback 10 px) 8.5 px at −1, 10 px at 0 and 14.5 px
  at +3. It pushes a brute (knockback 18 px) 15.3 px at −1, 18 px at 0 and 26.1 px at +3.
- **AC-STR-001.3:** The push takes 0.2 s. The blow that kills a mob pushes it too.
- **AC-STR-001.4:** An arrow pushes the mob in the direction of its flight, with the STR of the
  ranger who shot it.

---

### REQ-STR-002: A strong blow makes a mob reel longer

**User Story:** As a strong character, I want a mob to reel longer after my blow, so that I can
strike again or walk away before it attacks.

**Acceptance Criteria:**
- **AC-STR-002.1:** The reel time is the reel time of the mob × (1 + 0.2 × STR modifier), for
  every class.
- **AC-STR-002.2:** An imp (250 ms) reels 200 ms at −1 and 400 ms at +3. A brute (320 ms) reels
  256 ms at −1 and 512 ms at +3.
- **AC-STR-002.3:** A blow that does not kill a mob stops its wind-up or its strike. Then the mob
  goes for the attacker.

---

### REQ-STR-003: A strong character carries more

**User Story:** As a strong character, I want more slots in my pack, so that I can carry more
things.

**Acceptance Criteria:**
- **AC-STR-003.1:** The pack has 6 + 2 × STR modifier slots. That is 4 slots for STR 8 or 9, 6 for
  10 or 11, and 8 for 12 or 13. It is 10 for 14 or 15, and 12 for 16 or 17.
- **AC-STR-003.2:** Coins go into a purse and use no slot.
- **AC-STR-003.3:** The pack panel shows the slots that are in use and all the slots, for example
  "2 of 8 slots".

---

### REQ-STR-004: A strong character wades through shallow water

**User Story:** As a strong character, I want to walk through the shallow water at the shore, so
that a lake becomes a shortcut and a refuge from mobs.

**Acceptance Criteria:**
- **AC-STR-004.1:** A character with STR 13 or more can walk into shallow water. For a character
  with STR 12 or less, shallow water is solid, as deep water is.
- **AC-STR-004.2:** In shallow water a wader walks at half speed: 40 px/s, not 80 px/s.
- **AC-STR-004.3:** Deep water is solid for every character.
- **AC-STR-004.4:** Shallow water is solid for every mob, so no mob follows a wader into the
  water.
- **AC-STR-004.5:** In shallow water a wader cannot attack: no blow and no arrow. The attack button
  dims there.
- **AC-STR-004.6:** In shallow water a wader cannot start a roll, and a roll that comes into
  shallow water ends there. The dodge button dims there.
- **AC-STR-004.7:** A player in shallow water never sneaks, and a slow walk there uses no stamina
  ([Dexterity](dexterity.md), REQ-DEX-004).
- **AC-STR-004.8:** In shallow water the figure stands 5 px lower, and the water line cuts it 5 px
  above the feet. A ripple moves round its legs, and it has no shadow. The ripple moves faster
  while the wader walks. Other players see the same look on a wader.
- **AC-STR-004.9:** Every lake of the Wilds has a band of shallow water at its shore, and a small
  pond is all shallow water. No house stands on shallow water.

---

### REQ-STR-005: A strong character forces a barred door

**User Story:** As a strong character, I want to break the boards on a barred door, so that I can
go into the house and take what is in its chest.

**Acceptance Criteria:**
- **AC-STR-005.1:** A barred door shows boards nailed across it.
- **AC-STR-005.2:** At a barred door, the action label is "Force the door" for a character with
  STR 13 or more. For a character with less, it is "Try the door".
- **AC-STR-005.3:** With STR 12 or less, a press leaves the door closed. With STR 11 or 12 the
  player says "Boards are nailed across it. I am not strong enough to break them. [STR 13]" (a clue
  of the gate, [Ability Scores](ability-scores.md), REQ-AS-007). With STR 10 or less it says only
  "Boards are nailed across it."
- **AC-STR-005.4:** With STR 13 or more, a press breaks the boards and opens the door at once. The
  player says "The boards break.", and the view shakes for 0.22 s.
- **AC-STR-005.5:** After that, the door is an ordinary door for every player. A character with
  STR 12 or less can open it, close it and go in.
- **AC-STR-005.6:** In a shared world, every player sees the boards break and the door open.
- **AC-STR-005.7:** In a shared world, the server checks the gate with the scores of the stored
  character. A page cannot force a door for a character with STR 12 or less.

---

### REQ-STR-006: The boards come back

**User Story:** As a player in a shared world, I want a forced house to close again after a long
time, so that its chest has loot for the next strong character.

**Acceptance Criteria:**
- **AC-STR-006.1:** A forced door gets its boards again after 30 minutes in which no player was
  within 30 tiles of it. The door is then closed and barred.
- **AC-STR-006.2:** A player within 30 tiles of the door starts the 30 minutes again.
- **AC-STR-006.3:** When the boards come back, the chest of the house fills again. The chest of a
  barred house fills only then, not 30 minutes after a player emptied it.

---

### REQ-STR-007: Barred houses in the Wilds

**User Story:** As a strong character, I want some houses of the Wilds to be barred, so that my
STR opens places that weaker characters cannot open.

**Acceptance Criteria:**
- **AC-STR-007.1:** About one house with a chest in four is barred. A house without a chest is
  never barred.
- **AC-STR-007.2:** The home and the house east of the home are never barred.
- **AC-STR-007.3:** The chest of a barred house gives 5 to 15 coins and one thing, and a second
  thing in one of two.
- **AC-STR-007.4:** The chest of a barred house has no lock.
- **AC-STR-007.5:** The barred houses come from the seed of the world, so every visitor of a world
  sees the same houses barred.

## Feature Behavior & Rules

- **Constants** (`packages/engine/src/traits.ts`): `PUSH_PER_MOD` (0.15), `STAGGER_PER_MOD` (0.2),
  `PACK_SLOTS` (6), `SLOTS_PER_MOD` (2), and the gates `WADE_GATE` and `FORCE_GATE` (STR 13, from
  `GATE_SCORE`). The traits are `PlayerTraits.push`, `stagger`, `slots` and `wade`.
- **Push and reel** (`packages/engine/src/mobs.ts`): a `Blow` is `{ damage, push, stagger }`, and
  `PlayerTraits` passes as one. `Horde.hit()` keeps `MobStats.knockback × blow.push` and
  `MobStats.hurtMs × blow.stagger` in the brain of the mob. `KNOCKBACK_MS` (200) is the time of the
  push. A solid thing (a wall, a tree trunk, water) stops the push.
- **Push and stagger use STR for every class** (Fede's decision, 2026-10-10), not the attack
  ability of the class.
- **Wading** (`packages/engine/src/player.ts`): `stepPlayer(player, input, world, traits)` gives a
  wader a solid map in which `Ground.Shallows` is open (`wadeMap()`). `WADE_SPEED` (0.5).
  `inShallows()` reads the tile under the centre of the feet. In `solidBox()` (`world.ts`),
  `isWet()` makes deep and shallow water solid.
- **The band of shallow water** comes from `naturalGround()` (`packages/engine/src/terrain.ts`):
  an elevation below 0.31 is deep water, below 0.34 shallow water, and below 0.37 sand. Thus every
  world that uses the natural-terrain toolkit has the band. The Wilds put no water on the ground of
  a house, of the home or of the road (the road is mud also over water).
- **Mobs and water:** a mob moves on the solid map of the world, so shallow water stops it (Fede's
  decision: water stays solid for all mobs). A mob at the shore can still strike a wader close to
  the shore, within its hit range (imp 21 px, brute 28 px). A wader further out is out of reach.
- **No attack and no roll in water:** `stepPlayer()` does not start an attack or a roll while the
  wader is in shallow water. `roll()` ends a roll in shallow water. For a character that cannot
  wade, the shore is solid, so its roll stops there.
- **Sneaking in water:** the wade speed is the same as `SNEAK_SPEED` (half speed). Without the rule
  of AC-STR-004.7, every walk in shallow water hides the player from mobs.
- **The look of a wader** (`packages/engine-client/src/render/player-view.ts`): `WADE_DEPTH` (5),
  the frames `fx/ripple/<i>`, `RIPPLE_MS` (220) while the wader stands and `RIPPLE_WALK_MS` (120)
  while it walks. `render/others.ts` asks `inShallows()` for each other player.
- **Barred doors:** `Building.barred` is a `Gate` (`packages/engine/src/buildings.ts`), so a world
  can give another gate. `World.doorBar()` gives the gate, or null for a forced door.
  `World.setDoorForced()` and `World.forcedDoorList()` keep the forced doors. `useDoor(..., traits)`
  (`interact.ts`) gives `'barred'` or `'forced'`; `'forced'` also opens the door. No NPC of the
  Wilds walks near a barred door: the NPCs live in Thornwick, which has no barred door.
- **The look of a barred door** is the art `wall/<walls>/door/boarded`, the same as the door of a
  building that is shut for good (`Building.locked`). The texts are `STRINGS.forceDoor`,
  `tryDoor`, `barred` and `forced`. The shake is `SHAKE` in `game.ts` (220 ms, 2 px).
- **In a shared world** the page predicts the door with its own traits (`Prediction.door()`). The
  Room applies the door wish with the stored traits (`Room.door()`). The welcome and the snapshots
  with the doors carry the forced doors (`fd`; protocol 11).
- **The boards come back** in `Spoils.tick()` (`packages/engine/src/loot.ts`), with `REBAR_MS` (30
  minutes) and `REBAR_RADIUS` (30 tiles). The distance is from the centre of the door tile to the
  feet of each player, and `tick()` checks it once a second. The time counts on the clock of the
  server, so the time in which nobody is in the world counts too.
- **The state of the forced doors is in memory.** The Room of a shared world keeps it, and a page
  keeps its own for a world that it runs. A restart of the game server bars every forced door
  again. A reload of the page does the same for a world that the page runs.
- **The Wilds** (`worlds/wilds/src/houses.ts`): `BARRED_CHANCE` (0.25), only for a house with a
  chest, never for the cell (1, 0) east of the home. The home has its own plan (`home.ts`) without
  boards. The loot is `BARRED_CHEST_LOOT` (`worlds/wilds/src/source.ts`).
- **The plan:** S1 to S6 in `docs/drafts/abilities.md`. S5 has no fallen tree (dropped).
