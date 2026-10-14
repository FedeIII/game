# Combat (5e)

## Overview

Since 2026-10-11 (Fede's decision; plan: `docs/drafts/level-3.md`) the game uses the basic 5e
numbers. A character starts at level 1 since 2026-10-13 (Fede's decision; from 2026-10-11 to
2026-10-12 it was level 3), and rises to level 5 with its XP since 2026-10-14 (`docs/features/game/levels.md`),
the mobs have the hit points, the Armour Class, the attack bonus and the damage of
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

### REQ-CMB-001: A character of level 1

**User Story:** As Fede, I want a new character to be a level-1 character of 5e, so that it starts
at the beginning and grows later (it levels up: `docs/features/game/levels.md`, REQ-LVL-001, where the
numbers of the levels 2 to 5 are).

**Acceptance Criteria:**
- **AC-CMB-001.1:** The hit points of a character are those of level 1: the hit die of its class at
  its most and the CON modifier (at least 1). A fighter (d10) with CON 10 has 10; with CON 14, 12; a
  wizard (d6) with CON 10, 6. On 2026-10-13 every stored character got all its hit points on this
  scale.
- **AC-CMB-001.2:** The attack bonus of a character is +2 and the modifier of its attack ability,
  and a magic bonus. A fighter with STR 16 has +5.
- **AC-CMB-001.3:** The damage of a blow is the die of the weapon (the bigger die of a versatile
  weapon with an empty off hand), plus the modifier and the magic bonus: a longsword with a shield
  and STR 16 is 1d8+3. A cantrip at level 1: fire bolt and eldritch blast 1d10, produce flame 1d8. A
  monk's martial arts: 1d4 + DEX. An unarmed strike: 1 and the modifier of the attack ability.
- **AC-CMB-001.4:** A rogue's sneak attack adds 1d6 (level 1) on a mob that does not hunt the rogue.
- **AC-CMB-001.5:** The builder, the character panel and the pack panel show the AC, the attack bonus
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
- **AC-CMB-002.4:** The Hobgoblin Devastator, the leader of the war band, has 45 hit points, AC 13,
  +3, and its staff hits for 1d6+1 (the HP and the AC of Volo's Guide; its XP for the encounters is
  200, about CR 1, because it has no spells but its rite).

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
- **AC-CMB-006.3:** The hit points show as a red bar with the numbers ("7 / 11").

---

### REQ-CMB-007: The rite of the Devastator

**User Story:** As a player who fights the war band, I want to see the Devastator's spell and to be
able to break it, so that the fight has a target.

**Acceptance Criteria:**
- **AC-CMB-007.1:** When the Devastator hunts and a hobgoblin or a bugbear whose weapon does not burn
  stands within 8 tiles of it, it stands still and casts its rite for 6 s.
- **AC-CMB-007.2:** The page shows a circle of 8 tiles round it, which lights up round as the rite
  goes on, and three runes on the circle.
- **AC-CMB-007.3:** Each blow that hits the Devastator in its rite takes its damage and breaks one
  rune (a dark rune); a miss breaks nothing. When the third rune breaks, the rite fails and the
  Devastator reels.
- **AC-CMB-007.4:** When the rite ends with a rune left, the weapons of the hobgoblins and the bugbears
  in the circle burn for 30 s: +1 to hit and 1d4 more damage (5e: Elemental Weapon). Embers rise from
  them.
- **AC-CMB-007.5:** The Devastator begins another rite 15 s after the last one, failed or not.

---

### REQ-CMB-008: The Ashen Seekers

**User Story:** As a player who hunts the Ashen Seekers, I want their servants and their fighters to
feel different from the hobgoblins, so that the new enemy is a mystery and a threat.

**Acceptance Criteria:**
- **AC-CMB-008.1:** The cinder hound (a wolf of the SRD: 13 hit points, AC 13, a bite +4, 2d4+2, 50 XP)
  charges straight, as a worg does. Embers glow in its back.
- **AC-CMB-008.2:** The watcher (a Seeker in a mask of bone) never hunts and never strikes. It goes in
  ash when a character comes within 4 tiles of it, when a blow or an arrow reaches it, or when the
  fighters of its ambush fell. It drops nothing, and it does not count for the size of an encounter
  (0 XP). On a march, it stands 10 tiles before the end of the route.
- **AC-CMB-008.3:** The blade (22 hit points, AC 13, +4, 1d6+2, 100 XP) fights as a soldier. The cinder
  adept (13 hit points, AC 12, 100 XP) keeps away and casts a fire bolt (+4, 1d10) as a goblin shoots;
  its bolts glow orange above the darkness.
- **AC-CMB-008.4:** The Ash Warden (60 hit points, AC 15, +5, 1d8+3, 450 XP) casts the rite of the
  Devastator for its blades. A blow that takes it to half of its hit points or under makes it go in
  ash: it is gone, and nobody killed it.
- **AC-CMB-008.5:** A mob that goes in ash does not fall: the page shows the figure where it stands,
  thinning into rising ash.

---

### REQ-CMB-009: The goblins of the forest

**User Story:** As a new player on the road to Ironhold, I want goblins that I can surprise, chase and
beat, so that I learn to fight without fear (the tutorial, `docs/drafts/tutorial.md`; Fede,
2026-10-13).

**Acceptance Criteria:**
- **AC-CMB-009.1:** The skirmisher is the goblin of the SRD with a scimitar: 7 hit points, AC 15, +4,
  1d6+2, 50 XP. It fights in melee only, with a slow, clear wind-up in which it stands (0.7 s), and
  after a hit it slips away for a moment (Nimble Escape). The art: a goblin with a scimitar and a small
  round shield.
- **AC-CMB-009.2:** Skirmishers patrol in groups of 2 or 3: the group walks a loop round the place where
  it came, the members a step apart.
- **AC-CMB-009.3:** When one of them sees a character, the group (the members within 8 tiles) stops
  short and looks at the character for 0.6 s, with a "!" over each head (the pixel font, gold, above the
  darkness) and a yelp.
- **AC-CMB-009.4:** Then some flee and the others fight. The dice of the horde choose how many flee,
  from none (all fight) to all, each number with the same chance (a group of 3: none, 1, 2 or 3, one
  chance in four each), and which ones. A goblin alone flees or fights with one chance in two (Fede,
  2026-10-13).
- **AC-CMB-009.5:** A goblin flees at 64 px/s, slower than a character (80 px/s). A character that
  runs after it catches it: within its reach and 8 pixels, or cornered (stuck), it turns and fights. A
  blow that hits it makes it fight too.
- **AC-CMB-009.6:** A goblin that gets away (out of sight for 1.5 s, or 230 pixels from the
  character) hides where it is for 10 s, and then walks back to its loop. A patrol far from every
  character (36 tiles) goes away.
- **AC-CMB-009.7:** A world chooses where the goblins live and that no other mob lives there:
  `MobRules.areaAt()` gives the mobs round a character on a tile, by day and at night (in place of
  `population`; REQ-CMB-010), and `MobRules.roam()` knows the kind of the mob. A short population of
  skirmishers comes as one group. In the Wilds the goblins live in the forest at night only.
- **AC-CMB-009.8:** `?mob=skirmisher,skirmisher,skirmisher` puts one group of three, 8 tiles east of
  the character, on its loop (a world that the page runs).

---

### REQ-CMB-010: The mobs of an area by day and at night

**User Story:** As a player, I want other foes by day than at night, so that the hour changes the
danger of a place (Fede, 2026-10-13: "Every area should have mobs defined for day and for night. With
frequency and encoded behavior.").

**Acceptance Criteria:**
- **AC-CMB-010.1:** A world gives the mobs of each area by day and at night (`MobArea`: `day` and
  `night`, two lists of `MobSpawn`). An area can have other mobs by day and at night, the same mobs with
  another number or behaviour, or the same lists.
- **AC-CMB-010.2:** A spawn gives a kind, how many live round each character (`count`), how they behave
  (`behaviour`: `wander` alone, `patrol` a group on a loop, `ambush` a group that hides; default: the
  kind's), the size of a group (`group`; default: the kind's), and a frequency (`every`: a rare spawn
  comes about once in that time round a character, each wait from half of it to one and a half times
  it; without it, a mob comes as soon as the area wants one).
- **AC-CMB-010.3:** It is day from 6:00 to 20:00 (the middle of the dawn to the middle of the dusk:
  `isDaytime()`). The server takes the hour from its clock, as the pages do; a world without a day is
  always at night.
- **AC-CMB-010.4:** A mob that the area brought and does not want at this hour (a goblin by day, a
  bandit at night) goes away when no character is within 17 tiles of it: nobody sees it go. A mob that
  hunts finishes its hunt first. The mobs of the story never go.
- **AC-CMB-010.5:** The Wilds: in the forest of the tutorial, the goblin patrols at night as before
  (3 round a character, groups of 2 or 3), and by day the bandits (REQ-CMB-011: 3 round a character,
  groups of 1 to 3, a group about every 8 minutes). In the wildlands, 4 imps and 2 brutes at night;
  by day they are less frequent (Fede, 2026-10-13): 2 imps and 1 brute, an imp about every minute and a
  brute about every two minutes.

---

### REQ-CMB-011: The bandits of the forest

**User Story:** As a player on the road to Ironhold by day, I want a rare ambush of robbers, so that the
day has its own danger (Fede, 2026-10-13: "Very rare, they appear as a pack of 1 to 3 of them (same
level than goblins) that try to ambush the player.").

**Acceptance Criteria:**
- **AC-CMB-011.1:** The bandit is the bandit of the SRD with a scimitar: 11 hit points, AC 12, +3,
  1d6+1, 25 XP; a wind-up of 0.6 s in which it stands. A kill gives 1 or 2 coins in one kill of three.
  The art: a man in a hood of dark leather, a scarf of rust red over the face, a jerkin, a short cape
  and a scimitar; it also crouches and creeps.
- **AC-CMB-011.2:** A group of bandits comes 11 to 15 tiles ahead of a character (the way it walks, or
  faces), never within 8 tiles of a character, and hides (the state `lurk`).
- **AC-CMB-011.3:** A bandit that lurks creeps after the nearest character within 24 tiles, crouched,
  at 44 px/s (slower than a walk), to where the character will be in 1.5 s, each one in its place in
  the group. It does not stalk a character in a town, in a building, upstairs or defeated.
- **AC-CMB-011.4:** Within 5 tiles of the character it holds still and waits. It springs at the
  character within 40 pixels (2.5 tiles), or after 2.5 s of a hold; the whole group springs with it, and
  each one shouts. A blow or an arrow that reaches a lurker springs its group too, and the blow takes it
  unaware (a rogue's sneak attack).
- **AC-CMB-011.5:** A page shows a bandit that lurks only within the seek of its character (Wisdom:
  3 + 2 x the modifier tiles, as a hidden thing), faint and crouched; elsewhere it is not drawn, the
  attack button does not aim at it, and the sense (the red chevrons) does not mark it. When it springs,
  it comes into view in 0.18 s.
- **AC-CMB-011.6:** After a hunt that it gives up, a bandit rests 3 s and then hides again.
- **AC-CMB-011.7:** `?mob=bandit,bandit,bandit` puts one group of three that lurks 3 tiles east of the
  character (a world that the page runs).

---

### REQ-CMB-012: The first goblins of a new character

**User Story:** As a new player on the road to Ironhold by day, I want to meet the goblins once, so that
the tutorial has its first fight at any hour (Fede, 2026-10-13: "force a single confrontation with
goblins for new players if they are there during the day").

**Acceptance Criteria:**
- **AC-CMB-012.1:** A character on the road (the quest `road` at `go`) without the flag `goblins` of the
  road, that is outside in the forest of the tutorial by day for 6 s, gets one patrol of goblins (2 or 3)
  17 to 21 tiles ahead of it (the way it walks, or faces), out of its view. Not in a town or a hamlet,
  in a building, upstairs, or while defeated.
- **AC-CMB-012.2:** When a goblin hunts the character (it startles at it, chases it), the road gets the
  flag `goblins`, and no other patrol comes for it. A meeting with goblins at night sets the flag too.
- **AC-CMB-012.3:** A patrol that is gone (the character went on, far from it) comes again ahead of the
  character; one that did not meet the character in 90 s goes when the character is out of its view,
  and comes again ahead of it.
- **AC-CMB-012.4:** The server owns it (the Room brings the patrol and sets the flag; the store saves
  the book); a page that runs its world does the same.

---

### REQ-CMB-013: The brace

**User Story:** As a player in melee, I want to stay in front of a foe after my blow and still be safer
from its answer, so that a fight is not only a kite (Fede's idea, 2026-10-14: "the same as kiting, but
without losing the melee situation"). The next steps are in `docs/drafts/combat-melee.md`.

**Acceptance Criteria:**
- **AC-CMB-013.1:** A step back in the first 0.15 s after a melee attack (`BRACE_WINDOW_TICKS` 9) starts
  a brace: a move of 120 degrees or more from the way of the attack (`BRACE_BACK`). A step back that
  was held through the attack counts at its end. A step to the side, or a step back later, is a walk.
- **AC-CMB-013.2:** In a brace the character stands where it is, faces the way it struck, and shows the
  brace pose: the knees bent, the weapon up in front. While the player holds the step back, the brace
  goes on. When the player lets it go, the brace ends at once if 0.3 s (`BRACE_TICKS` 18) passed since
  its start; else it goes on until then (Fede, 2026-10-14). After it, the character walks again. A held
  move that turns to the side counts as a release.
- **AC-CMB-013.3:** A brace gives no sure evade (Fede, 2026-10-14). A mob's blow (or a mob's arrow, or a
  guard's swing on a robber) that reaches a character in its brace rolls as usual, against the AC + 2 +
  the DEX modifier, at least AC + 1 (`PlayerTraits.braceAc`; [Dexterity](../abilities/dexterity.md),
  REQ-DEX-008). A hit is a hit: damage, a stun, and the brace ends.
- **AC-CMB-013.3a:** A miss in a brace does not end it: the character sways out of the blow where it
  stands (an evade: `EVADE_TICKS` 15, 0.25 s, three frames of a sway out of the blow and back), and the
  word "evade" rises over it ("esquiva" in Spanish), with a swish, in place of the spark and "miss". The
  evade is only a look: a mob can hit the character in it, the character can attack or roll in it, and
  it ends with the brace. The mob goes on as after a miss: to the end of the line, not away.
- **AC-CMB-013.4:** A roll or the next attack breaks a brace. A brace does not start in water, and not
  after an arrow (a bow: `PlayerTraits.brace` is false). Guards and companions never brace.
- **AC-CMB-013.5:** A brace and an evade cost nothing. A blow that comes during the attack itself, or
  after the brace, rolls against the plain AC.
- **AC-CMB-013.6:** The server owns it. The page predicts the brace from its inputs, also while the step
  back is held; the evade comes from the server (the mob's miss). The other players see both (protocol
  42; a held brace stays at its last tick, protocol 43).
- **AC-CMB-013.7:** A tip (`brace`) tells it the first time that a melee blow ends next to a foe.

---

## Feature Behavior & Rules

- **Dice** (`packages/engine/src/dice.ts`): `Dice`, `dice()`, `plusDice()`, `formatDice()`,
  `averageDice()`, `rollDice()`, `attackRoll()`, `DiceSource` (`rollingDice()`, or `AVERAGE_DICE`:
  the average of the dice and every attack hits, for tests).
- **Characters** (`packages/engine/src/traits.ts`): `proficiencyBonus(level)`, `HIT_DIE`,
  `levelHp(cls, conMod, level)`; `PlayerTraits.level`, `damage` (dice), `toHit`, `sneak` (dice),
  `recover` 0. `gear.ts`: `dieBase()`, `CANTRIP_BASE`, `cantripDice()`, `martialArts()`, `UNARMED_BASE`,
  `sneakAttack()`. The levels: `docs/features/game/levels.md`.
- **Mobs** (`packages/engine/src/mobs.ts`): `MobStats.health`, `ac`, `toHit`, `damage`, `allyDice`,
  `cr` (the challenge rating: `mobXp()` gives its 5e XP, for the encounters of the story and the XP of a
  kill); `Blow` (`toHit`, `damage`, `sneak`, `opening`, `push`,
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
- **Encounters** (`packages/engine/src/encounters.ts`): the ambush of the scouts and the war band are
  sized to the characters there with the 5e budget of their levels (the deadly budget: 100 XP for a
  level-1 character, 200 for level 2, 400 for 3, 500 for 4, 1100 for 5; `docs/features/game/quests.md`,
  REQ-QST-012 and REQ-QST-013). The band of the chapter is for about thirteen level-1 characters, or six
  of level 3; one level-1 character gets its first unit.
- **The Devastator** (`packages/engine/src/mobs.ts`): the kind `devastator` (code 6), `MobStats.rite`
  (`Rite`: `ms` 6000, `radius` 128, `runes` 3, `allies`, `burnMs` 30000, `cooldownMs` 15000), the state
  `rite` (code 9), `Mob.runes`, `Mob.burning`, `BURN_TO_HIT`, `BURN_DICE`; the wire carries the runes
  and the burning (`WireMob`, protocol 29). The page: `render/mobs.ts` (`placeRing()`, `RING_DOTS`,
  `RUNE`, `BURN_EMBERS`); the art: `art/mobs.ts` (`DEVASTATOR`: a robe and a hood, a staff with an
  ember).
- **Not yet**: class features of levels 1 to 3 (second wind, rage, smite, spells).
- **The Ashen Seekers** (`packages/engine/src/mobs.ts`, story phases 7 to 9): the kinds `hound` (code
  7), `watcher` (8), `seeker` (9), `adept` (10), `warden` (11); `MobStats.watch` (4 tiles),
  `WATCH_BACK` (40 points of a route), `MobStats.vanishAt` (0.5), `Horde.vanish()`; `adjustedXp()`
  counts only the mobs with XP (`encounters.ts`); `MOB_LOOT` (blades and adepts: coins and a draught or
  an antidote now and then). The art: `art/mobs.ts` (`worg(pose, embers)`, the face `mask`, the weapon
  `none`, the builds `SEEKER`, `WATCHER`, `ADEPT`, `WARDEN`); the page: `VANISH` in `render/mobs.ts`, the
  fire bolts in `render/arrows.ts` (`ArrowLook.fire`, `FIRE_SHOOTERS` in `game.ts`). Protocol 33.
- **The goblins of the forest** (`packages/engine/src/mobs.ts`, the tutorial): the kind `skirmisher`
  (code 12), `MobStats.patrol` (`group` [2, 3], `fleeSpeed` 64), the states `startled` (code 10) and
  `flee` (code 11), `STARTLE_MS` 600, `HIDE_MS` 10000, `Horde.spawnPatrol(kind, x, y, size)` (a loop of 6
  open points 3 to 6 tiles round the place; without room, they wander), `MobRules.populationAt?(tx,
  ty)`, `MobRules.roam(tx, ty, kind?)`; `MOB_LOOT` (1 coin in one kill of four). The art: `art/mobs.ts` (the build
  `SKIRMISHER`, the weapon `scimitar`, `Build.shieldSize`); the page: the "!" in `render/mobs.ts`
  (`placeAlert()`, `ALERT`; `MobViews` takes the font and the text layer), the yelp
  (`voiceOfChange()`, `VOICE_OF`). Tests: `packages/engine/test/patrols.test.ts`. Protocol 36.
- **The mobs of an area by hour** (`packages/engine/src/mobs.ts`): `MobArea`, `MobSpawn`,
  `MobBehaviour`, `MobRules.areaAt?(tx, ty)` (it took the place of `populationAt`), `populationArea()`
  (a population as the same lists by day and at night), `kindBehaviour()`, `spawnBehaviour()`,
  `Horde.daytime` (the Room sets it in `tick()` from `RoomOptions.day` and `clock`; the page from
  `skyNow()`), the rare waits of each character (`rareReady()`), `LEAVE_DISTANCE` 17. The Wilds:
  `FOREST_MOBS` and `WILD_MOBS` in `worlds/wilds/src/source.ts`.
- **The bandits** (`packages/engine/src/mobs.ts`): the kind `bandit` (code 13), `MobStats.ambush`
  (`group` [1, 3], `creepSpeed` 44, `hold` 80, `spring` 40, `holdMs` 2500), the state `lurk` (code 12),
  `Horde.spawnAmbush(kind, x, y, size)`, `AMBUSH_DISTANCE` [11, 15], `AMBUSH_NEAREST` 8, `LURK_RANGE`
  24 tiles, `AMBUSH_LEAD` 1500, `lurk()` and `spring()`; `MOB_LOOT.bandit`. The art: `art/mobs.ts`
  (the build `BANDIT`, the face `hood`, `Build.clothed`, `MobPose.crouch`, the frames `crouch` and
  `creep/<i>` of the kinds of `CROUCHING`). The page: `render/mobs.ts` (`seesMob()`,
  `MobViews.setSeeker()`, `LURK_ALPHA`, `SPRING_FADE_MS`), the shout (`voiceOfChange()`: `lurk` to
  `chase`; `VOICE_OF.bandit`). Tests: `packages/engine/test/ambush.test.ts`,
  `packages/engine-client/src/render/mobs.test.ts`. Protocol 40.
- **The brace** (`packages/engine/src/player.ts`, REQ-CMB-013): `BRACE_WINDOW_TICKS`, `BRACE_TICKS`,
  `EVADE_TICKS`, `BRACE_BACK`, `PlayerState.braceWindow`, `brace` (it stays at 1 while the step back is
  held) and `evade` (a look: it ends with the brace), `armourNow()` (the AC of the roll: + `braceAc` in a
  brace) and `missPlayer()` (a miss: an evade in a brace, else a glance), both used by `Horde.attack()`
  (blows and arrows) and by a guard's swing; `PlayerTraits.brace` (`!strike.ranged`) and `braceAc`
  (`BRACE_AC` 2 + DEX, at least 1; `traits.ts`). The wire: `WireSelf` (the brace window, the brace, the
  evade) and `WirePlayer` (the brace and the evade), protocol 42; protocol 43 for the held brace
  (`Remotes.at()` shows the brace of the last snapshot, not counted down). The art: `braceParts()`,
  `evadeParts()`, `GUARDS` (`art/attacks.ts`), `sway()` (`art/figure.ts`), the sheet columns
  `SKIN_COLUMNS.brace` and `evade` (`SKIN_VERSION` 10), the wanderer's `player/<view>/brace` and
  `player/<view>/evade/<i>`. The page: `PlayerView` (the frames, and a sway of 2 px back,
  `EVADE_BACK`), `STRINGS.fight.evade`, the sound `evade` (`audio/fx.ts`), the tip `brace`, and `brace
  W/B, evade E` in the debug line `dex`. Tests: `packages/engine/test/brace.test.ts`.
- **Sure confrontations** (`packages/engine/src/confrontations.ts`): `ConfrontationDef` (`kind`,
  `group`, `when`, `area`, `hours`, `met`), `Confrontations.step()` (the Room after the ambushes; the
  page in a world that it runs), `SETTLE_MS` 6000, `WAIT_MS` 90000, `WorldSource.confrontations()`,
  `Horde.spawnAhead()` (`AHEAD_DISTANCE` [17, 21]); a quest condition with a flag (`When.flag`). The
  Wilds: `FIRST_GOBLINS` (`source.ts`), `GOBLINS_MET` (`quests.ts`). Tests:
  `packages/engine/test/confrontations.test.ts`, `worlds/wilds/test/first-goblins.test.ts`.
