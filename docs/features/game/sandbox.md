# The Sandbox

## Overview

The sandbox (Fede's request, 2026-10-15) is a fight for an admin, to test the mechanics of combat of
the melee draft (`docs/drafts/combat-melee.md`) one by one. Fede asked for it in place of an
evaluation of the draft: "I test them myself". The admin chooses one of its characters; the character
fights three foes in a glade of the world, with ten times its hit points, and the foes have five times
theirs and never flee. When the character falls, the whole sandbox starts again with the same
character. A panel at the bottom left turns each mechanic of the draft on or off, and chooses the foe.
Nothing that happens in the sandbox is saved.

## Terminology

- **An admin**: an account whose email is in the server's `ADMIN_EMAILS` (`/api/me` says `admin`).
- **The sandbox**: the fight of an admin's character that this document describes (`sandbox.ts`).
- **The glade**: the place of the fight (`WorldDefinition.sandbox`): in the Wilds, the tile (11, 134),
  a glade of the forest 25 tiles west of the home, with trees round it.
- **A foe**: a mob of the fight. **A steady foe**: a mob that hunts the players that it sees, and never
  startles, flees, hides or lurks (`SpawnOptions.steady`).
- **A mechanic**: a proposal of the melee draft, built as a switch that is off by default
  (`packages/engine/src/mechanics.ts`). Only the sandbox turns one on.
- **The panel**: the panel of the sandbox, which the button at the bottom left opens
  (`ui/sandbox-panel.ts`).

## Requirements

### REQ-SBX-001: Into the sandbox

**User Story:** As an admin, I want to choose a character for the sandbox from the menu and from the
game, so that I can test a mechanic of combat at any time.

**Acceptance Criteria:**
- **AC-SBX-001.1:** For an admin, the main screen of the menu has "Sandbox" (Spanish "Zona de
  pruebas", id `menu-sandbox`) after "Continue" and "Prologue" (when it shows), before "Settings". It is
  disabled when the account has no character. Another account does not have it.
- **AC-SBX-001.2:** For an admin with a character, the game menu has "Sandbox" after "Load game". It
  reloads the page into the list of characters for the sandbox.
- **AC-SBX-001.3:** The list for the sandbox has the title "Sandbox: choose a character" (Spanish "Zona
  de pruebas: elige un personaje"), the line "The character fights three foes with ten times its hit
  points. Nothing that happens there is saved.", and no "Delete" buttons. A press on a character starts
  it in the sandbox; "Back" or Escape goes to the main screen.
- **AC-SBX-001.4:** The page takes the sandbox only from an admin: the menu gives `sandbox` only with
  `admin`.

---

### REQ-SBX-002: The fight

**User Story:** As an admin, I want a hard fight against three foes that do not run away, so that I can
try a mechanic many times in one fight.

**Acceptance Criteria:**
- **AC-SBX-002.1:** The page runs the world of the sandbox itself, also a shared world: no other player,
  and no server. The character starts at the glade (`?at=` moves it), facing east.
- **AC-SBX-002.2:** The character has ten times its hit points (`SANDBOX_HP`), all of them, and all its
  stamina. Its scores, gear, level and pack are those of the stored character.
- **AC-SBX-002.3:** Three foes (`FOE_COUNT`) of the chosen kind come from 6 tiles east of the
  character, one 2 tiles from the other, and hunt it at once. Each has five times the hit points of its
  stat block (`FOE_HP`: a goblin 35), and a reader of INT 13 sees its health bar against that.
- **AC-SBX-002.4:** A foe never startles, flees, hides or lurks, also a goblin of a patrol or a bandit
  of an ambush.
- **AC-SBX-002.5:** No other mob comes, and the story does not run there: no ambush, confrontation,
  convoy or escort.

---

### REQ-SBX-003: The fight starts again

**User Story:** As an admin, I want the sandbox to start again by itself after each fight, so that I
can test without a trip through the menu.

**Acceptance Criteria:**
- **AC-SBX-003.1:** When the character falls (0 hit points), it lies for the 3 s of a defeat; then the
  whole sandbox starts again with the same character: it stands at the glade with all its hit points
  and stamina and a guard of 2 s, and three new foes come.
- **AC-SBX-003.2:** When the last foe falls, the sandbox starts again in the same way 2.5 s later
  (`RESTART_MS`).
- **AC-SBX-003.3:** "Start again" in the panel starts it again at once. A new choice of foe starts it
  again with the new foes.

---

### REQ-SBX-004: Nothing is saved

**User Story:** As an admin, I want the sandbox to change nothing of my character, so that I can test
with my real characters.

**Acceptance Criteria:**
- **AC-SBX-004.1:** The page does not send the place of the character, and the server keeps the place,
  the hit points, the pack, the gear and the XP that the character had.
- **AC-SBX-004.2:** A kill gives no XP and drops nothing.
- **AC-SBX-004.3:** What the character drinks, drops or takes off in the sandbox goes back as it was at
  the next start of the page.

---

### REQ-SBX-005: The panel

**User Story:** As an admin, I want a panel in the sandbox to choose the foe and the mechanics, so
that I can compare a fight with and without a mechanic.

**Acceptance Criteria:**
- **AC-SBX-005.1:** In the sandbox only, a round button with two crossed swords shows at the bottom
  left (44 x 44 px; id `sandbox-button`, label "Sandbox"). On a touch screen it is above the place of
  the joystick at rest. A press opens or closes the panel (id `sandbox`) above it.
- **AC-SBX-005.2:** The panel has the title "Sandbox", the line "Nothing here is saved.", the fights
  won and lost ("Won 2 · Lost 1"), and a line about the last fight that ended: who won and how long
  it took, the blows of the character that hit of those that reached a foe, and the attacks of the
  foes that hit of those that reached the character, with the hit points that they took ("Won in 41 s ·
  12 of your 19 blows hit · 4 of their 15 attacks hit (38 HP)"). Before the first end: "No fight has
  ended yet."
- **AC-SBX-005.3:** "Foes" gives the kinds: goblins (the default), goblin archers, brutes, bugbears,
  hobgoblins, worgs and bandits (Spanish: goblins, goblins arqueros, brutos, osgos, hobgoblins, huargos,
  bandidos).
- **AC-SBX-005.4:** "Mechanics of the melee draft" has a switch for each mechanic, with its name and
  what it does in one line. A switch takes effect at once, in the fight that goes on.
- **AC-SBX-005.5:** While the panel is open, the fight stands still. Escape or the button closes it,
  and the focus goes back to the game. "Start again" starts the fight again and closes the panel.
- **AC-SBX-005.6:** This browser keeps the foe and the mechanics that are on (localStorage
  `game.sandbox.v1`); the next sandbox starts with them.

---

### REQ-SBX-006: A reload

**User Story:** As an admin in the sandbox, I want a reload for a new build or a new language to bring
me back to the sandbox, so that a test goes on.

**Acceptance Criteria:**
- **AC-SBX-006.1:** A reload for a new build, or for a new language, starts the same character in the
  sandbox again (the note of `menu/resume.ts` keeps `sandbox`).
- **AC-SBX-006.2:** "Main menu" and "Load game" leave the sandbox.

---

### REQ-SBX-007: 1. The grades of a brace

**User Story:** As an admin, I want a brace that gives more for an exact timing, so that I can test if
timing must count more than a safe hold (the draft, proposal 1).

**Acceptance Criteria:**
- **AC-SBX-007.1:** With the switch "1. Grades of the brace", a mob's blow that comes in the first 6
  ticks (0.1 s) of a brace (sharp) rolls with disadvantage against the AC of the brace. A miss is an
  evade, and the word "sharp" (Spanish "precisa") rises over the character in gold, in place of
  "evade". The draft gave a sure evade; the sandbox gives the dice an edge (Fede, 2026-10-15).
- **AC-SBX-007.2:** A blow in ticks 7 to 12 (clean) rolls against the AC of the brace, as without the
  switch.
- **AC-SBX-007.3:** A blow from tick 13 on (late), also in a held brace, rolls against the AC and half of
  what the brace adds, rounded down, at least 1 (a fighter with DEX 14: + 2 in place of + 4). The jump
  from a brace counts its ticks too.

---

### REQ-SBX-008: 2. The riposte

**User Story:** As an admin, I want an evade to open the mob for a counter, so that I can test a brace
that attacks as well as it defends (the draft, proposal 2).

**Acceptance Criteria:**
- **AC-SBX-008.1:** With the switch "2. Riposte", a mob's blow that misses in a brace puts the mob off
  balance for 0.4 s (`RIPOSTE_MS`): it reels in place (no push, no white flash), cannot wind up, and the
  word "open" (Spanish "expuesto") rises over it in gold. With the grades on, a sharp or a clean evade
  does it, and a late one does not (Fede, 2026-10-15).
- **AC-SBX-008.2:** The next blow (or arrow) of a player on that mob in that time rolls with advantage
  and adds the INT opening of the player, as on a mob in its wind-up. The opening is for that one blow.
- **AC-SBX-008.3:** An arrow of a mob that misses a brace gives no riposte.

---

### REQ-SBX-009: 3. The front of a brace

**User Story:** As an admin, I want a brace that guards its front best, so that I can test if the
player must put the foes in front of it (the draft, proposal 3: positioning).

**Acceptance Criteria:**
- **AC-SBX-009.1:** With the switch "3. The front of a brace", the way of the mob from the character,
  against the way that the character struck, gives a quarter of the circle (Fede, 2026-10-15). From the
  front quarter (within 45 degrees of that way) the brace counts in full.
- **AC-SBX-009.2:** From a side quarter (45 to 135 degrees) the brace adds half of its AC, rounded down,
  at least 1 (a brace of + 4: + 2), and the word "side" (Spanish "de lado") rises over the character. With
  the grades on, the half comes after the grade (a late brace of + 4: + 1). Its evade, its grade and its
  riposte stay.
- **AC-SBX-009.3:** From the back quarter (more than 135 degrees) the brace does not count: the AC of
  the brace, its grade and its riposte do not count, the blow rolls against the plain AC, a miss glances
  off ("miss"), and the word "behind" (Spanish "por detrás") rises over the character.
- **AC-SBX-009.4:** Without the switch a brace counts in full against a blow from every side.

---

### REQ-SBX-010: 4. The flank

**User Story:** As an admin, I want a jump to the side of a blow to give me the flank of the mob, so
that I can test the rest of the sidestep (the draft, proposal 4: the jump from a brace is its move).

**Acceptance Criteria:**
- **AC-SBX-010.1:** With the switch "4. The flank", a mob aims its blow when its wind-up starts. When
  the blow does not hit (a miss, or the character out of its reach) and the character is then more than
  40 degrees off that aim, the character is at its flank: the word "flank" (Spanish "flanco") rises over
  the mob in gold.
- **AC-SBX-010.2:** A mob that a character flanks does not wind up again in its blow and for 0.4 s after
  it (`TURN_MS`): it stands, and then faces the character.
- **AC-SBX-010.3:** The next blow of a player on it in that time rolls with advantage and adds the INT
  opening (as the riposte).
- **AC-SBX-010.4:** A character in front of the mob (40 degrees or less off its aim) gives no flank.

---

### REQ-SBX-011: 5. The parry

**User Story:** As an admin, I want an attack at the end of a mob's wind-up to meet its blow, so that I
can test the choice between a blow into the wind-up and a parry (the draft, proposal 5).

**Acceptance Criteria:**
- **AC-SBX-011.1:** With the switch "5. Parry", an attack with a melee weapon that starts in the last 9
  ticks (0.15 s) of the wind-up of a mob that hunts the character, with the mob in the reach and in
  front of the attack, is a parry, not a blow: it touches no mob, and the character stands in the frame
  of a brace for 15 ticks, with no effect of a blow.
- **AC-SBX-011.2:** The blow of that mob rolls against the AC and the proficiency bonus of the character
  (+2; +3 at level 5). In the last 5 ticks of the wind-up (sharp) it also rolls with disadvantage (the
  draft: a sure parry), and a miss gives a riposte when the riposte is on.
- **AC-SBX-011.3:** A miss is a parry: the word "parry" (Spanish "parada") rises over the character in
  gold in place of "miss", with the ring of steel, and the character and the mob step 4 px apart. A hit
  takes its damage and stuns, as before, and ends the parry.
- **AC-SBX-011.4:** An attack earlier in the wind-up is a blow, as before. A bow, an empty hand or a
  cantrip does not parry.

---

### REQ-SBX-012: 6. The guard stance and the shield block

**User Story:** As an admin, I want to hold a guard up, so that I can test a defence that is not tied to
the timing of a blow, and what a shield gives in it (the draft, proposal 6).

**Acceptance Criteria:**
- **AC-SBX-012.1:** With the switch "6. Guard stance and shield block", a press of the dodge input (Shift,
  the right mouse button, the dodge button) held for 0.2 s (`GUARD_HOLD_MS`) raises a guard until the
  release; a shorter press is a tap, and rolls at its release. Without the switch a press rolls at once,
  as before.
- **AC-SBX-012.2:** In the guard the character walks at half speed without a turn, faces the mouse (or
  the way it struck), and does not attack, roll or brace. It shows the frame of a brace, and the frames
  of the sneak walk when it walks.
- **AC-SBX-012.3:** A mob's blow from its front (within 90 degrees) rolls with disadvantage. Without a
  shield the guard costs 12 stamina each second (`GUARD_STAMINA`); with a shield it costs nothing each
  second, and a blow that misses is a block: 15 stamina (`BLOCK_STAMINA`), the word "block" (Spanish
  "bloqueo") in place of "miss", and the ring of steel. Stamina does not fill in a guard; with no stamina
  the guard drops.
- **AC-SBX-012.4:** A bugbear's blow breaks the guard: one d20, the word "broken" (Spanish "rota") in red,
  and the character reels for 30 ticks (it cannot act, it shows as stunned, and no guard follows).

---

### REQ-SBX-013: 7. The shove

**User Story:** As an admin, I want a roll into a mob to shove it, so that I can test a way to make room
in melee without a retreat, and one more use of Strength (the draft, proposal 7).

**Acceptance Criteria:**
- **AC-SBX-013.1:** With the switch "7. Shove", a roll (not the jump from a brace) whose way is within 45
  degrees of the way to a living mob in the reach of the character is a shove, not a roll: it costs the
  stamina of the roll and the wait between dodges, and the character stands 12 ticks in the second frame
  of its attack, facing the mob.
- **AC-SBX-013.2:** The dice: d20 + the STR modifier and the proficiency bonus of the character against
  d20 + the better of the STR and DEX modifiers of the mob (its SRD stat block); a tie goes to the mob.
- **AC-SBX-013.3:** A win knocks the mob down: it reels for 0.8 s (it cannot wind up), 16 px back, the
  word "down" (Spanish "al suelo") rises over it, and blows on it roll with advantage and add the INT
  opening. A loss: "holds" (Spanish "resiste"), and nothing else.
- **AC-SBX-013.4:** A character cannot shove a mob more than one size larger (5e): a halfling or a gnome
  (small) does not move a brute or a worg (large): "too big" (Spanish "muy grande").

---

### REQ-SBX-014: 8. The clash

**User Story:** As an admin, I want two blows that land together to meet, so that I can test a trade of
blows as a contest of dice (the draft, proposal 8).

**Acceptance Criteria:**
- **AC-SBX-014.1:** With the switch "8. Clash", a blow of the character that starts in the last 3 ticks
  (0.05 s) of the wind-up of a mob that hunts it, with the mob in the reach of the blow, meets the mob's
  blow: each side rolls d20 + its attack bonus. Nobody takes damage, and the mob's blow does not land.
- **AC-SBX-014.2:** A higher roll of the character: the mob reels as from a blow ("clash won", Spanish
  "choque ganado"). A lower roll: the character reels for 24 ticks with no guard after it ("clash lost",
  "choque perdido"), and the mob stops for 0.25 s. A tie: both step 4 px back ("clash", "choque"), and the
  mob stops for 0.25 s. Each with the ring of steel.
- **AC-SBX-014.3:** With the parry on, an attack in the last 9 ticks of a wind-up is a parry: no clash.

---

### REQ-SBX-015: 9. The reactions of the classes

**User Story:** As an admin, I want each class to answer a blow in its own way, so that I can test the
reactions of the SRD as class features (the draft, proposal 9).

**Acceptance Criteria:**
- **AC-SBX-015.1:** With the switch "9. Reactions of the classes", the brace of a wizard or a sorcerer is
  the spell Shield: +5 AC (in place of the AC of the brace, no grade) against every blow from every side,
  from the start of the brace to 18 ticks (0.3 s) after its end; the word "shield" (Spanish "escudo")
  rises in blue.
- **AC-SBX-015.2:** An arrow that hits a monk in a brace loses 1d10 + its DEX modifier + its level of
  damage ("deflect", Spanish "desvío"); at 0 or less the monk catches it: no damage and no stun
  ("caught", "atrapada"). A monk's guard stance costs no stamina (Patient Defense).
- **AC-SBX-015.3:** A hit on a rogue in its own attack, out of a brace, takes half of its damage, once in
  30 s ("uncanny dodge", "esquiva asombrosa").
- **AC-SBX-015.4:** A fighter with a shield in a brace protects another player or a companion within 1
  tile (16 px): a blow on that one rolls with disadvantage ("protected", "protección").
- **AC-SBX-015.5:** A barbarian's first attack starts a rage of 60 s ("rage", "furia"), which halves the
  damage of each hit (at least 1); the next rage waits 60 s after its end.
- **AC-SBX-015.6:** The foes of the panel include goblin archers (Spanish "goblins arqueros"), to test the
  arrows.

---

### REQ-SBX-016: 10. The shapes of the blows

**User Story:** As an admin, I want each blow of a mob to have a shape with its own answer, so that I can
test a fight where the right defence depends on the tell (the draft, proposal 10).

**Acceptance Criteria:**
- **AC-SBX-016.1:** With the switch "10. Shapes of the blows", a mob aims its blow when its wind-up
  starts, and a word over it tells the shape: "thrust" (goblin, bandit, hobgoblin; Spanish "estocada"),
  "sweep" (brute, bugbear; "barrido"), "slam" (a brute in one blow of three; "mazazo", in red) or "bite"
  (worg; "mordisco"). The other kinds have no shape: their blows land as before.
- **AC-SBX-016.2:** The blow lands only in its shape, at the end of the wind-up: a thrust within 30
  degrees of its aim and 4 px further than the reach; a sweep within 100 degrees; a bite within 60
  degrees; a slam within 14 px of the place where the character stood when the wind-up began. A
  character out of the shape is not hit (no roll).
- **AC-SBX-016.3:** A slam winds up 1.5 times as long. A brace (and the spell Shield of a brace) and a
  parry do not count against it, and it breaks a guard stance.
- **AC-SBX-016.4:** No new art: the word is the tell, until the mobs get a wind-up for each shape.

---

### REQ-SBX-017: 11. The guards of the mobs

**User Story:** As an admin, I want the mobs to keep a guard too, so that I can test a fight with two
sides, where the player must read the mob (the draft, proposal 11).

**Acceptance Criteria:**
- **AC-SBX-017.1:** With the switch "11. Guards of the mobs", a hobgoblin raises its shield after its blow
  (hit or miss) for 0.5 s ("shield up", Spanish "escudo alzado"): a blow of a player on it then rolls with
  disadvantage.
- **AC-SBX-017.2:** A goblin steps aside after its blow (hit or miss), 16 px across the way to the
  character in 0.25 s, in place of a run away, and then hunts again.
- **AC-SBX-017.3:** A bandit parries the first melee blow of a player after its own blow: +2 on its AC
  against that blow; a miss shows "parried" (Spanish "parado") over it. The draft asked for a new mob, the
  bandit captain; it needs art, so the bandit has its parry in the sandbox.
- **AC-SBX-017.4:** A bugbear whose wind-up ends while its target braces holds the blow up to 0.4 s more,
  and strikes when the brace ends; meanwhile the glint of a wind-up (INT 15) does not show.
- **AC-SBX-017.5:** A brute keeps no guard.

---

### REQ-SBX-018: 12. A price in stamina

**User Story:** As an admin, I want each defence in melee to cost stamina, so that I can test a fight
with a rhythm: in melee while the stamina lasts, then out to breathe (the draft, proposal 12).

**Acceptance Criteria:**
- **AC-SBX-018.1:** With the switch "12. A price in stamina", an evade (a miss in a brace) costs 10
  stamina, and a sharp one (the grades) nothing; a parry costs 10 at its start; a shove costs 20 in place
  of the stamina of the roll. The guard stance and the block keep their own price (REQ-SBX-012).
- **AC-SBX-018.2:** With no stamina, a step back after an attack does not brace (it walks), a brace in
  progress drops, and an attack in the window of a parry is a blow.

---

## Feature Behavior & Rules

- **Files.** `packages/engine-client/src/sandbox.ts` (`SandboxFight`, `sandboxRules()`,
  `sandboxTraits()`, `loadSandbox()`, `saveSandbox()`, `SANDBOX_HP`, `FOE_HP`, `FOE_COUNT`,
  `SANDBOX_FOES`, `RESTART_MS`), `ui/sandbox-panel.ts` (`SandboxPanel`, `fightLine()`), `menu/menu.ts`
  (`MenuChoice.sandbox`, `pickCharacter(sandbox)`), `menu/resume.ts` (`ResumeNote.sandbox`, the screen
  `sandbox`), `ui/game-menu.ts` (the choice `sandbox`), `game.ts` (`inSandbox`, `sandboxFight`,
  `stepTraits()`, `restartSandbox()`).
- **The engine.** `Horde.spawn(kind, x, y, { health, steady })`: a mob with other hit points
  (`Mob.maxHealth`) and a steady mob (its brain's `steady`: `notice()` hunts at once; its behaviour is
  `wander`, so it never lurks). `Horde.provoke(mob, id, at)`: a mob hunts a player now.
  `WorldDefinition.sandbox` (`{ at: [tx, ty] }`) gives the glade.
- **The mechanics.** `packages/engine/src/mechanics.ts`: `MECHANICS`, `Mechanic`, `Mechanics` (a set),
  `NO_MECHANICS`. The player's side reads `StepTraits.mechanics` (`stepPlayer()`); the mobs' side reads
  `Horde.mechanics`. The Room sets neither, so a shared world plays as before, and no message on the
  wire changes. The page sets both in the sandbox only.
- **The words of the mechanics.** `Horde.takeEvents()` gives a `MechanicEvent` (a kind, a mob, a
  player) for what a mechanic did; the page shows its word (`STRINGS.sandbox.words`) over the player or
  the mob, as a number of a fight (`render/mechanic-words.ts`, `MECHANIC_WORDS`).
- **1. The grades.** `PlayerState.braceAge` counts the ticks of a brace (1 in its first tick, and in a
  jump); `braceGrade()`, `SHARP_TICKS` 6, `CLEAN_TICKS` 12, `lateBraceAc()` (`LATE_SHARE` 0.5);
  `Horde.defence()` gives the AC and the edge of the roll (`attackRoll(..., edge)`, `edgeOf()`: two d20,
  the higher or the lower; dice.ts).
- **2. The riposte.** `Mob.exposed` (ms left of an opening: `rollBlow()` rolls with advantage and adds
  `Blow.opening`; `Horde.hit()` takes it away), the brain's `offBalanceMs` (`Horde.stagger()`: the state
  `hurt` with no push), `RIPOSTE_MS` 400. The page draws no flash for a reel with an opening
  (`MobLook.exposed`).
- **3. The front.** `braceSector()` (`FULL_ANGLE` 45 and `SIDE_ANGLE` 135 degrees from
  `PlayerState.aim`), `partBraceAc()` (`SIDE_SHARE` 0.5) in `Horde.defence()`. (`inFront()` and
  `FRONT_ANGLE` 90 degrees stay for the front of a guard stance.)
- **4. The flank.** The brain's `aim` (set when a wind-up starts) and `turnMs`; `atFlank()`
  (`FLANK_ANGLE` 40 degrees), `TURN_MS` 400. The turn and the opening last the blow (`strikeMs`) and
  `TURN_MS`.
- **5. The parry.** `Horde.parry()` (the page calls it before `Horde.strike()`; true: no strike) keeps a
  `Parry` for the player; `Horde.defence()` uses it for the blow of that mob. `PlayerState.parry`
  (ticks; the page draws the frame of a brace), `PARRY_WINDOW_TICKS` 9, `SHARP_PARRY_TICKS` 5,
  `PARRY_TICKS` 15, `PARRY_PUSH` 4. `MECHANIC_WORDS.parry.replaces` keeps the word "miss" away.
- **6. The guard stance.** `MoveInput.guard`, `PlayerState.guarding` and `PlayerState.reel`,
  `guardStep()` and `blockPlayer()` (player.ts), `PlayerTraits.shield`; `GUARD_SPEED` 0.5,
  `GUARD_STAMINA` 12, `BLOCK_STAMINA` 15, `GUARD_BREAK_TICKS` 30; `Horde.breaksGuard()` (a bugbear; the
  slam of the shapes of the blows too). The page: `input/dodge-hold.ts` (`DodgeHold`, `GUARD_HOLD_MS`
  200), `DodgeButton.onRelease()`, `Mouse.onAltRelease()`.
- **7. The shove.** `Horde.shove()` (the page calls it when a roll starts, out of a brace; true: no
  roll), `PlayerState.shove` (ticks), `PlayerTraits.size` (`RACE_SIZE`) and `PlayerTraits.athletics`;
  `MOB_BODY` (size, STR and DEX of each kind), `canShove()`, `SHOVE_ARC` 45 degrees, `SHOVE_TICKS` 12,
  `SHOVE_KNOCK_MS` 800, `SHOVE_PUSH` 16.
- **8. The clash.** `Horde.strike(..., player)` calls `Horde.clash()` for each mob that the blow
  touches; `CLASH_TICKS` 3, `CLASH_REEL_TICKS` 24, `CLASH_PUSH` 4, `CLASH_PAUSE_MS` 250.
- **9. The reactions.** `PlayerState.ward`, `uncanny`, `rage` and `rageRest` (ticks), `PlayerTraits.deflect`
  (DEX modifier + level), `StepTraits.class`; `shieldCaster()`, `SHIELD_AC` 5, `SHIELD_AFTER_TICKS` 18,
  `UNCANNY_TICKS` 1800, `PROTECT_RANGE` 16, `RAGE_TICKS` and `RAGE_REST_TICKS` 3600. The page puts the
  word of a rage itself (a rage starts in `stepPlayer()`).
- **10. The shapes.** The brain's `shape`, `spotX` and `spotY` (set when a wind-up starts); `shapeOf()`,
  `inShape()`, `MOB_SHAPES`, `THRUST_ARC` 30 degrees, `THRUST_REACH` 4, `SWEEP_ARC` 100 degrees,
  `BITE_ARC` 60 degrees, `SLAM_RADIUS` 14, `SLAM_WINDUP` 1.5, `SLAM_SHARE` 1/3.
- **11. The guards of the mobs.** `Mob.guardUp` (ms), `Mob.parryReady`, `Mob.feint` (`MobLook.feint`:
  no glint), the brain's `feintMs` and `nimble`; `rollBlow(..., acBonus)` (`Horde.hit(..., melee)`: an
  arrow is not parried); `SHIELD_UP_MS` 500, `NIMBLE_DISTANCE` 16, `NIMBLE_MS` 250, `BANDIT_PARRY_AC` 2,
  `FEINT_MS` 400.
- **12. A price in stamina.** `EVADE_STAMINA` 10, `PARRY_STAMINA` 10, `SHOVE_STAMINA` 20; `stepPlayer()`
  (`spent`: no brace), `Horde.attack()`, `Horde.parry()`, `Horde.shove()`.
- **The fight log.** `SandboxFight.blows()` counts the blows of the player (`Horde.strike()` and the
  results of its arrows), `attacks()` the attacks of the foes on player 0 (`Horde.step()`), and
  `tick()` ends a fight (a defeat at once; a victory when every foe is `dying` or gone).
- **The debug panel** (`?debug`) has the line `sandbox`: the foe, the mechanics that are on, the fights
  won and lost, and the numbers of the fight that goes on.
- **Tests.** `packages/engine/test/sandbox.test.ts` (steady foes), `packages/engine/test/mechanics.test.ts`
  (each mechanic with and without its switch), `packages/engine/test/dice.test.ts` (advantage), `packages/engine-client/src/sandbox.test.ts`
  (the fight, its start again, the log, the kept choice), `menu/resume.test.ts`, `ui/game-menu.test.ts`.
