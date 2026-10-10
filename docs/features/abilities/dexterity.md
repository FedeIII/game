# Dexterity

## Overview

Dexterity (DEX) is the speed and the skill of the hands and the feet. For every class it gives the
time between attacks and the guard after a hit. It also gives the time between dodge rolls, and
how far mobs see the character. For a ranger it gives the range of its arrows. Its gate of 13
picks the locks of chests, for every class. For the bard, the monk, the ranger and the rogue, DEX
also gives the damage of a blow ([Ability Scores](ability-scores.md), REQ-AS-002).

## Terminology

- **Cooldown**: the time from the start of an attack to the start of the next attack.
- **Guard**: the time after a stun in which no mob can hit the player.
- **Dodge (roll)**: a fast roll of 2 tiles in which no mob can hit the player.
- **Sight**: the distance at which a mob notices a player. It is 112 px for an imp and 100 px for
  a brute, times the share of the player.
- **Sneaking**: the player stands still or walks at half speed or slower. Mobs see a player that
  sneaks from half the distance.
- **Sneak walk**: a walk at half speed that the C key turns on and off.
- **Sneaking on purpose**: a slow walk, or the sneak walk while it is on. Only this changes the
  look of the player.
- **Arrow**: the attack of a ranger: a shot that flies straight until it hits a mob or a thing.
- **Lock**: a gate on a chest (`Fixture.lock`). DEX 13 picks it.
- **Tick**: one step of the simulation: 1/60 s.

## Requirements

### REQ-DEX-001: Quicker attacks

**User Story:** As a nimble character, I want to attack more often, so that I kill mobs faster.

**Acceptance Criteria:**
- **AC-DEX-001.1:** The cooldown is 27 − 2 × DEX modifier ticks, for every class. That is 0.48 s
  at −1, 0.45 s at 0, 0.42 s at +1, 0.38 s at +2 and 0.35 s at +3.
- **AC-DEX-001.2:** An attack lasts 0.3 s (18 ticks) for every character. DEX does not change it.
- **AC-DEX-001.3:** The cooldown is the same for a blow and for an arrow.

---

### REQ-DEX-002: A longer guard after a hit

**User Story:** As a nimble character, I want more time after a hit in which no mob can hit me, so
that I can get out of a pack.

**Acceptance Criteria:**
- **AC-DEX-002.1:** After a stun, the guard lasts 60 + 9 × DEX modifier ticks: 0.85 s at −1,
  1.00 s at 0 and 1.45 s at +3.
- **AC-DEX-002.2:** During the guard no mob can hit the player, and the figure blinks.

---

### REQ-DEX-003: The dodge roll

**User Story:** As a player in a fight, I want to roll out of the way, so that I can escape the
blow of a mob with skill.

**Acceptance Criteria:**
- **AC-DEX-003.1:** Shift (left or right), the right mouse button on the world, or the dodge button
  asks for a roll. These controls are only in a world with mobs.
- **AC-DEX-003.2:** The dodge button is round, left of the attack button, with the name "Roll" and
  the key "Shift" on it. The keyboard hint says "Shift to roll".
- **AC-DEX-003.3:** A roll moves the player 32 px (2 tiles) in 0.25 s (15 ticks): faster than an
  imp runs.
- **AC-DEX-003.4:** The roll goes the way that the input moves. Without input, it goes the way the
  player faces. The player then faces the way of the roll.
- **AC-DEX-003.5:** During the roll no mob can hit the player.
- **AC-DEX-003.6:** The player cannot attack during a roll. A roll does not start during a stun or
  an attack.
- **AC-DEX-003.7:** The next roll can start 96 − 12 × DEX modifier ticks after the start of the
  last roll. That is 1.80 s at −1, 1.60 s at 0 and 1.00 s at +3.
- **AC-DEX-003.8:** Walls and other solid things stop the roll. A roll does not start in shallow
  water, and it ends when it comes into shallow water.
- **AC-DEX-003.9:** The game keeps a press for 150 ms. The roll starts at the first tick in that
  time in which the player can roll. A roll goes before an attack that the player asks for at the
  same moment.
- **AC-DEX-003.10:** The figure shows the roll frames of its skin: 4 frames for each view. The
  other players of a shared world see the roll too.
- **AC-DEX-003.11:** The dodge button dims while the player cannot roll.
- **AC-DEX-003.12:** A roll costs 35 stamina. With less than 35 stamina, no roll starts
  ([Constitution](constitution.md), REQ-CON-009). A defeated player cannot roll.

---

### REQ-DEX-004: Stealth

**User Story:** As a nimble character, I want mobs to notice me from less far, so that I can go
round them.

**Acceptance Criteria:**
- **AC-DEX-004.1:** A mob notices a player only within its sight × the share of the player. The
  share is 1 − 0.08 × DEX modifier: 1.08 at −1, 1.00 at 0 and 0.76 at +3.
- **AC-DEX-004.2:** While the player sneaks, the share is half of that.
- **AC-DEX-004.3:** An imp notices a player from 121 px at −1 and from 85 px at +3. While the
  player sneaks, these distances are 60 px and 43 px. For a brute they are 108 px and 76 px, and
  54 px and 38 px while the player sneaks.
- **AC-DEX-004.4:** The player sneaks when it stands still or walks at 40 px/s or slower, and does
  not attack, roll or lie defeated. 40 px/s is half of the full speed (80 px/s). A slow walk
  hides the player only while it has stamina; standing still hides it with no stamina
  ([Constitution](constitution.md), REQ-CON-009).
- **AC-DEX-004.5:** A player in shallow water never sneaks: neither a slow walk nor standing still
  there hides it.
- **AC-DEX-004.6:** The C key turns the sneak walk on and off. While it is on, the keys and the
  joystick walk at half speed. A push of the joystick to half or less is a slow walk too. The
  keyboard hint says "C to sneak".
- **AC-DEX-004.7:** The share applies when a mob looks for a player to hunt. A mob that hunts the
  player already keeps it in view up to its forget distance, also while the player sneaks. The
  forget distance is 200 px for an imp and 180 px for a brute.
- **AC-DEX-004.8:** In a shared world the server finds the share from the true state of the
  player.

---

### REQ-DEX-005: The look of sneaking

**User Story:** As a player who sneaks, I want to see that I sneak, so that I know when mobs see me
less.

**Acceptance Criteria:**
- **AC-DEX-005.1:** While the player sneaks on purpose, its torch has a radius of 96, not 150, and
  its figure is a little darker.
- **AC-DEX-005.2:** On purpose means a slow walk, or the sneak walk while it is on (also while the
  player stands). A player who stands still with the sneak walk off hides from mobs, but its torch
  stays full.
- **AC-DEX-005.3:** Another player who walks slowly shows a torch with a radius of 48, not 96, and
  a darker figure. Another player who stands still shows the full torch, also with its sneak walk
  on.
- **AC-DEX-005.4:** The torch and the figure change only the picture. Mobs see the player by the
  rules of REQ-DEX-004.

---

### REQ-DEX-006: The arrows of a ranger

**User Story:** As a ranger, I want to shoot arrows, so that I can hit mobs before they come near.

**Acceptance Criteria:**
- **AC-DEX-006.1:** Every attack of a ranger is an arrow, so a ranger has no blow at close range.
  The other classes never shoot.
- **AC-DEX-006.2:** An arrow flies straight at 240 px/s. It starts 6 px in front of the feet of the
  ranger.
- **AC-DEX-006.3:** An arrow flies (5 + DEX modifier) tiles from the ranger: 4 tiles at −1, 5 at 0
  and 8 at +3.
- **AC-DEX-006.4:** An arrow hits the first mob on its way that is alive. It takes the damage of the
  ranger's blow (4 + DEX modifier) and pushes and staggers with the ranger's STR. The mob then
  goes for the ranger.
- **AC-DEX-006.5:** A wall, a closed door, a window, a fixture with a solid box, a tree trunk or a
  rock stops an arrow. An arrow flies over deep and shallow water, and through an open door.
- **AC-DEX-006.6:** The attack button and Space aim at the nearest mob that is alive, within the
  range of the arrows. A click aims at the mouse pointer.
- **AC-DEX-006.7:** A ranger cannot shoot in shallow water.
- **AC-DEX-006.8:** A kill with an arrow drops its loot into the pack of the ranger who shot it.
- **AC-DEX-006.9:** In a shared world, the page of the ranger shows its own arrow at once, and the
  hit when the arrow reaches the mob. The other players see the arrows of the server within 30
  tiles of them.
- **AC-DEX-006.10:** The builder and the "You" section show "Arrows fly" with the range in tiles
  for a ranger.

---

### REQ-DEX-007: Locked chests

**User Story:** As a nimble character, I want to pick the locks of chests, so that I get the better
loot in them.

**Acceptance Criteria:**
- **AC-DEX-007.1:** In the Wilds, about one chest in three of the houses that are not barred has a
  lock.
- **AC-DEX-007.2:** At a locked chest, the action label is "Pick the lock" for a character with DEX
  13 or more. For a character with less, it is "Open the chest".
- **AC-DEX-007.3:** With DEX 13 or more, a press opens the chest at once. The line starts with "The
  lock clicks open." and then says what the player found, for example "The lock clicks open. I
  find 4 coins and a pewter cup."
- **AC-DEX-007.4:** With DEX 12 or less, a press does not open the chest. The player says "It is
  locked. I cannot pick it."
- **AC-DEX-007.5:** Each time that a character opens the chest, it needs DEX 13. The lock keeps no
  state: after one character picks it, the chest stays locked for a character with less DEX.
- **AC-DEX-007.6:** A locked chest gives 3 to 10 coins and one thing, and a second thing in about
  one of three (35%).
- **AC-DEX-007.7:** In a shared world the server checks the gate again with the scores of the
  stored character.

## Feature Behavior & Rules

- **Constants** (`packages/engine/src/traits.ts`): `COOLDOWN_PER_MOD` (2), `GUARD_PER_MOD` (9),
  `DODGE_PER_MOD` (12), `SIGHT_PER_MOD` (0.08), `RANGE_TILES` (5), `SNEAK_SIGHT` (0.5) and
  `PICK_GATE` (DEX 13). The traits are `PlayerTraits.cooldown`, `guard`, `dodgeCooldown` (ticks),
  `sight` (a share), `ranged` (a ranger only) and `range` (world pixels).
- **Constants** (`packages/engine/src/player.ts`): `ATTACK_TICKS` (18), `ATTACK_COOLDOWN_TICKS`
  (27), `GUARD_TICKS` (60), `DODGE_TICKS` (15), `DODGE_DISTANCE` (32), `DODGE_COOLDOWN_TICKS` (96),
  `SNEAK_SPEED` (0.5) and `PLAYER_SPEED` (80). The functions are `canAttack()`, `canDodge()`,
  `canBeHit()` and `isSneaking()`.
- **Both cooldowns count from the start** of the attack or the roll, not from its end.
- **The roll in `stepPlayer()`:** the input `MoveInput.dodge` starts it, before an attack in the
  same tick. `roll()` moves at 128 px/s (`DODGE_DISTANCE` / 0.25 s). `PlayerState.dodge`,
  `dodgeCooldown` and `dodgeAim` keep the roll.
- **The mobs and the guard:** `Horde.waitFor()` times the next attack of a mob. While the player is
  stunned, it counts with the guard of that player (`HordePlayer.traits.guard`; `GUARD_TICKS`
  without traits). After the stun, it counts with the true guard ticks of the player.
- **The controls of the roll:** `ui/dodge-button.ts` (`DodgeButton`, on `pointerdown`),
  `input/mouse.ts` (`onAltPress()`, the mouse button 2) and `ATTACK_BUFFER_MS` (150) in
  `game.ts`. The hint is `STRINGS.hintKeyboardFight`. While a conversation is open, the dodge
  button hides (`body.conversing`) and the game drops a request for a roll.
- **The roll frames:** `ROLL_FRAMES` (4) in `art/attacks.ts`. They are in every skin sheet
  (`SKIN_VERSION` 5) and in the atlas wanderer (`player/<view>/roll/<i>`).
- **Protocol 12:** the input of a roll is `[x, y, attack, 1]`. `WireSelf` carries the dodge ticks,
  the dodge cooldown and the exact direction of the roll, so the prediction repeats a roll
  exactly. `WirePlayer` carries the dodge ticks.
- **Stealth:** `sightOf(traits, state)` (`traits.ts`) gives `HordePlayer.sight`. `Horde.notice()`
  multiplies `MobStats.sight` by it; `Horde.chase()` keeps a target within `MobStats.forget`. A mob
  also needs a clear line to the player, with no building between. The Room calls `sightOf()` in
  each tick, with the true state.
- **Sneaking in shallow water:** the wade speed (`WADE_SPEED`, 0.5) is the same as
  `SNEAK_SPEED`. Without the rule of AC-DEX-004.5, every walk in shallow water hides the player.
  `stepPlayer()` sets `PlayerState.wading`, and `isSneaking()` is false while it is true.
- **Stamina:** `canDodge()` needs `DODGE_STAMINA` (35). `isSneaking()` counts a sneak walk
  (`isSneakWalk()`) only while `PlayerState.stamina` is above 0; the sneak walk uses
  `SNEAK_STAMINA` (8) each second (see the Constitution document).
- **The look of sneaking:** `SNEAK_TORCH` (96) and `sneakingShown()` in `game.ts`, `OTHER_TORCH`
  (`radius` 96, `sneaking` 48) in `render/others.ts`, and `SNEAK_TINT` in
  `render/player-view.ts`. The page does not know the sneak walk of another player, so it shows
  only a slow walk.
- **The C key** is `KeyC` (`KeyboardEvent.code`). The page ignores it in a form field and with
  Ctrl, Meta or Alt. Nothing in the GUI shows that the sneak walk is on; `?debug` shows "(walk)".
- **Arrows** (`packages/engine/src/arrows.ts`): `ARROW_SPEED` (240), `ARROW_START` (6),
  `ARROW_RADIUS` (1.5: an arrow hits a mob whose centre is this close, plus the radius of the mob),
  steps of 4 px. `newArrow()` and `flyArrow()`. `World.shotBox()` is the solid part of a tile
  without water. An arrow flies through a mob that dies (the death animation).
- **Arrows in the horde:** `Horde.shoot()`, `Horde.arrows` and `Horde.takeShotKills()`
  (`ShotKill`: the mob and its shooter). The Room gives the drop to the shooter; a shooter who left
  the room gets nothing.
- **Arrows on the wire:** `ar` in the snapshot (`[id, shooter, x, y, aim code]`), only within
  `MOB_SEND_RADIUS` (30 tiles). The page flies its own copies (`ownArrows`, with negative ids) and
  `NetSession.arrowsAt()` drops the server's copies of its own arrows.
- **The look of an arrow** (`render/arrows.ts`): the frames `fx/arrow/<turn>` in 16 directions
  (`fxPlacement()`), 12 px above the point that the engine flies, tinted `ARROW_TINT`.
- **Locks:** `Fixture.lock` (`packages/engine/src/fixtures.ts`). `Spoils.open()` gives `'locked'`
  for a character without the gate. The page checks `meetsGate()` first, and says the line without
  a message to the server. The Room answers a request without the gate with `l` source 2.
- **Locks in the Wilds** (`worlds/wilds/src/houses.ts`): `LOCKED_CHANCE` (1/3), from the seed, so
  every visitor finds the same chests locked. The house east of the home can have a lock. The loot
  is `LOCKED_CHEST_LOOT` (`worlds/wilds/src/source.ts`).
- **Dropped:** D7, a faster walk (`docs/drafts/abilities.md`). DEX does not change the speed of the
  walk: "an imp is faster than you" stays a rule.
