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
- **AC-SBX-005.3:** "Foes" gives the kinds: goblins (the default), brutes, bugbears, hobgoblins, worgs
  and bandits (Spanish: goblins, brutos, osgos, hobgoblins, huargos, bandidos).
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
  word "open" (Spanish "expuesto") rises over it in gold. With the grades on, only a sharp evade does it.
- **AC-SBX-008.2:** The next blow (or arrow) of a player on that mob in that time rolls with advantage
  and adds the INT opening of the player, as on a mob in its wind-up. The opening is for that one blow.
- **AC-SBX-008.3:** An arrow of a mob that misses a brace gives no riposte.

---

### REQ-SBX-009: 3. The front of a brace

**User Story:** As an admin, I want a brace that guards only its front, so that I can test if the
player must put the foes in front of it (the draft, proposal 3: positioning).

**Acceptance Criteria:**
- **AC-SBX-009.1:** With the switch "3. The front of a brace", a brace counts only against a blow from a
  mob within 90 degrees of the way that the character struck. Against a blow from the side or the back,
  the AC of the brace, its grade and its riposte do not count: the blow rolls against the plain AC, a
  miss glances off ("miss"), and the word "behind" (Spanish "por detrás") rises over the character.
- **AC-SBX-009.2:** Without the switch a brace counts against a blow from every side.

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
- **3. The front.** `inFront()` (`FRONT_ANGLE` 90 degrees from `PlayerState.aim`) in `Horde.defence()`.
- **The fight log.** `SandboxFight.blows()` counts the blows of the player (`Horde.strike()` and the
  results of its arrows), `attacks()` the attacks of the foes on player 0 (`Horde.step()`), and
  `tick()` ends a fight (a defeat at once; a victory when every foe is `dying` or gone).
- **The debug panel** (`?debug`) has the line `sandbox`: the foe, the mechanics that are on, the fights
  won and lost, and the numbers of the fight that goes on.
- **Tests.** `packages/engine/test/sandbox.test.ts` (steady foes), `packages/engine/test/mechanics.test.ts`
  (each mechanic with and without its switch), `packages/engine/test/dice.test.ts` (advantage), `packages/engine-client/src/sandbox.test.ts`
  (the fight, its start again, the log, the kept choice), `menu/resume.test.ts`, `ui/game-menu.test.ts`.
