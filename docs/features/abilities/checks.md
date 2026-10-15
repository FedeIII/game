# Checks and DCs

## Overview

A check opens a thing for a character with enough of one ability score. Each check has its own
difficulty class (DC), and the DC is the score that the check needs: there is no die (Fede,
2026-10-15). The content chooses the DC of each check from its context: what the action is, what it
gives, and where it is in the game. The difficulty classes of 5e are the guide. This document gives
the rules to choose a DC (the rubric), the DCs of the guarded chests, and the register, which lists
every check of the game with its DC.

## Terminology

- **Check (gate)**: one ability and one DC (`Gate`). A thing behind a check opens for a character
  with a score of the DC or more in that ability. The code calls a check a gate.
- **DC (difficulty class)**: the score that a check needs. "A DC of X in this game means that the
  player needs a score in that ability of X or more" (Fede, 2026-10-15).
- **Anchor**: the DC that the 5e table gives to an action: easy 10, medium 15, hard 20.
- **Reward**: what a check gives: coins, a thing, a lasting help, a piece of the story, a line of
  colour.
- **Guarded chest**: a chest behind a lock (DEX) or behind a barred door (STR).
- **Grade**: what a guarded chest holds, and the DC of its guard.
- **Register**: the list of every check of the game, with its DC and its context.

## Requirements

### REQ-CHK-001: Each check has its own DC

**User Story:** As a player, I want an easy thing to need a lower score than a hard thing, so that
the checks of the world make sense.

**Acceptance Criteria:**
- **AC-CHK-001.1:** A character passes a check with a score of its DC or more in its ability. The luck
  of a worn item adds to the score for every check.
- **AC-CHK-001.2:** A character with a score 1 or 2 under the DC sees a dim clue with the tag of the
  check, for example "[DEX 12]". A character with a score 3 or more under the DC sees nothing of it
  ([Ability Scores](ability-scores.md), REQ-AS-007).
- **AC-CHK-001.3:** The tag of a check shows the ability and the DC of that check, for example
  "[INT 14]" before a page of old magic and "[INT 10]" before a note in a book.
- **AC-CHK-001.4:** Every check of the Wilds has a DC from 10 to 17. Not all the checks of an ability
  have the same DC.

---

### REQ-CHK-002: The DC of a guarded chest follows what it holds

**User Story:** As a player, I want a better lock to keep a richer chest, so that a high score
gives a better reward.

**Acceptance Criteria:**
- **AC-CHK-002.1:** In a house of the wilds, the lock of a chest (DEX) and the boards across the door
  of a barred house (STR) have a DC of 10, 11, 12 or 13.
- **AC-CHK-002.2:** A chest behind a guard of DC 10 holds a coin in two chests of three, and one small
  thing.
- **AC-CHK-002.3:** DC 11: 1 or 2 coins in one chest of two, one small thing, and a second one in one
  chest of three.
- **AC-CHK-002.4:** DC 12: 1 to 3 coins in one chest of two, one small thing, a second one in one chest
  of two, and a magic item in one chest of eight.
- **AC-CHK-002.5:** DC 13: 2 to 4 coins in two chests of three, two small things, and a magic item in
  one chest of four.
- **AC-CHK-002.6:** A lock is more often on a poor chest: DC 10, 11, 12 and 13 in the proportion
  3 : 3 : 2 : 1. Boards more often keep a rich chest: 1 : 2 : 3 : 3.
- **AC-CHK-002.7:** A chest without a guard holds 1 or 2 coins in one chest of three, and one small
  thing. A guarded chest of DC 10 holds more coins than that, on average.

---

### REQ-CHK-003: The rule book gives the highest DC that a character passes

**User Story:** As a player, I want to see how hard a lock, a door or a conversation can be for my
character, so that I know what my scores open.

**Acceptance Criteria:**
- **AC-CHK-003.1:** The traits list of the builder and of the character panel shows "up to" and the
  score (with the luck) for the checks that the content gives, each with its own DC:
  "Barred doors" (STR), "Locked chests" (DEX), "Old writing" (INT), "Insight" (WIS) and
  "Persuasion" (CHA). For example, "up to STR 14"; in Spanish, "hasta FUE 14".
- **AC-CHK-003.2:** These rows are bright for a modifier above 0, dim for 0 and pale red under 0.
- **AC-CHK-003.3:** A check with one DC for the whole game keeps its row as before: its "yes" text,
  or "from" and its DC, dim ("from WIS 12"). These are "Shallow water" (STR 12), "Medicine" (WIS 10),
  "The way home" (WIS 12), "Reputation" (CHA 12) and "Read a mob" (INT 13 and 15).

---

### REQ-CHK-004: The register lists every check

**User Story:** As a designer of the game, I want to see every check with its DC, so that a new
check fits the others.

**Acceptance Criteria:**
- **AC-CHK-004.1:** `npm run checks` prints a Markdown table with a row for each check: the ability,
  the DC, the kind, where it is, and what is behind it. The rows go by ability (STR, DEX, CON, INT,
  WIS, CHA) and then by DC.
- **AC-CHK-004.2:** The table has every check of the Wilds: the answers of the conversations (and of
  the things, such as the cauldron), the wares of a shop, the lore of the things (on every storey),
  the lines of the scenes, the locks and the barred doors (one row for each grade), the herbs, and
  the wade.
- **AC-CHK-004.3:** The table has the checks of the page too: reading a mob, the map, the way home and
  the greeting by name.

## Feature Behavior & Rules

### How to choose a DC (the rubric)

Use these steps for a new check, or when you change the DC of a check. Decide by the rubric; ask Fede
when the rubric does not give a clear answer, or when the check is in the story.

1. **The action.** Ask how hard the action is for an ordinary person in the world, and take the
   anchor of the 5e table (Fede's reference, 2026-10-15):

   | DC | Difficulty | Typical use |
   |---|---|---|
   | 5 | Very easy | Almost anyone succeeds: give no check |
   | 10 | Easy | Routine for a trained character |
   | 15 | Medium | Needs focus or competence; the default meaningful check |
   | 20 | Hard | Skilled characters can still fail |
   | 25 | Very hard | Needs exceptional skill, luck, or help |
   | 30 | Nearly impossible | A legendary feat; use it seldom |

2. **The reward.** The world guards a valuable thing better, so a bigger reward gives a higher DC.
   Fede's scale (2026-10-15):

   | What the check gives | DC |
   |---|---|
   | A few coins, a common thing, a line of colour | 10 |
   | The most loot of the start: the top coins of a table, and two things | 13 |
   | An important item (in the house of an NPC, for example) | 16 |
   | A magic item (in a bank, for example) | 20 |

   A lasting help (a refuge, a lower price, a help in every fight, a way round every lake, a short
   way through a quest) adds 2 or 3 to the anchor of its action. A small reward never raises an easy
   action.

3. **The same fact, the same DC.** When two checks open the same knowledge, give them the same DC:
   the reeve's ledgers (the page and the answer: INT 13), the marks on her map (INT 12), the carvings
   of Tigris (the stones and the priest's answer: INT 14).

4. **The stage of the game.** Chapter 1 is for levels 1 to 3. Its checks go from 10 to 17: 17 is the
   highest score at level 1 (15 from the point buy, and 2 from the race). A DC from 18 is for a reward
   that the design keeps for later: a magic item (19 with gauntlets of ogre power, a headband of
   intellect or an amulet of health) or a later level.

5. **The class.** A check that is the trade of a class (the lock of a rogue, the insight of a cleric,
   the lie of a bard) can be higher: the characters of that class have the score.

6. **Never block.** A check is never the only way through the story. Every node of a conversation
   has an answer without a check (`checkDialog()`), and a quest has another way (a lever for the
   cart, which the farmer lends).

7. **The clue.** A DC also chooses who sees the clue: the characters 1 or 2 under it. A DC of 10 shows
   its clue to scores of 8 and 9.

8. **Say why.** When the reason for a DC is not clear from its context, write it in a comment next to
   the DC.

### Who passes a DC at level 1

The point buy gives, for example, 15, 14, 13, 12, 10 and 8, and the race adds 1 or 2 to some of them.

| DC | Who passes it |
|---|---|
| 10 | 4 or 5 of the 6 scores of a usual character |
| 12, 13 | about 3 of the 6: an ability that the character raised a little |
| 14, 15 | 1 or 2: the main abilities of the class |
| 16 | the main ability with an increase of the race |
| 17 | the main ability at its most (15 + 2) |
| 18, 19 | a magic item that sets a score to 19, or a later level |
| 20 and more | not in chapter 1 |

### The DCs of the Wilds, as examples

The register (`npm run checks`) has all of them. These show the scale:

| DC | Examples |
|---|---|
| 10 | the notes in the books of the houses, the notices, a drink for Brann (CHA), the herbs (Medicine), the poorest guarded chest |
| 11 | plain feelings (Brann, Marta, Kasmut), calm a survivor, the pins on a map |
| 12 | the wade, the way home, a greeting by name, the herbal, the marks on the reeve's map |
| 13 | a room at the inn, the reeve's fear and the old couple's cache, the reeve's ledgers, the health bar of a mob, the richest guarded chest |
| 14 | a friend's price, pay for the wet lentils, old magic (the brand, the crystal ball), the carvings of Tigris, a hidden threat |
| 15 | lift the merchant's cart, the first lines of the plot at the inn (a keen ear), the glint of a wind-up, see that Verath believes |
| 16 | what Verath leaves out, a lie to Verath (the hardest checks of chapter 1) |

### The code

- **The check** is `Gate` (`packages/engine/src/traits.ts`): `{ ability, dc }`. `meetsGate()` and
  `gateView()` read it, with `GATE_HINT` (2). `DC` is the 5e table (`veryEasy` 5 to
  `nearlyImpossible` 30), as a guide.
- **The checks with one DC for the whole game**: `WADE_GATE` (STR 12, `traits.ts`), `MEDICINE_GATE`
  (WIS 10, `items.ts`), and in the page `READ_FOE_GATE` (INT 13), `READ_OPENING_GATE` (INT 15),
  `MAP_HOUSES`, `MAP_NAMES`, `MAP_SECRETS` (11, 13, 15), `HOMEWARD_GATE` (WIS 12) and
  `REPUTATION_GATE` (CHA 12) (`packages/engine-client/src/ui/gates.ts`).
- **The checks of the content** are inline, each with its own DC: `DialogAnswer.gate`, `Ware.gate`,
  `Lore.gate`, `SceneLine.gate`, `Fixture.lock` and `Building.barred`. The Wilds have no
  shared gate constants.
- **The guarded chests** (`worlds/wilds/src/chests.ts`): `CHEST_GRADES` (the DC, the loot, and the
  weights `lock` and `boards`), `chestGrade()` (a grade from a number of the seed), `guardGate()` (the
  check of a lock or of boards for a grade) and `guardedLoot()` (the loot of a DC). `generateHouse()`
  (`houses.ts`) chooses the grade from the seed (`SEED_OFFSET + 6`), and `WildsSource.loot()` gives
  the loot of the DC of the guard. `CHEST_LOOT`, `TRINKETS`, `MAGIC_ITEMS` and `MAGIC_CHANCE` (only the
  cache now) are in `chests.ts` too.
- **The rule book** (`packages/engine-client/src/ui/traits-list.ts`): `checks()` makes the rows "up
  to", with `STRINGS.traits.upTo` (`ui/strings.ts`, `ui/strings-es.ts`).
- **The register**: `checksOf(source)` and `checksTable()` (`worlds/wilds/src/checks.ts`) walk the
  people, the places (and the storeys of their buildings), the houses round the home, the scenes, the
  drinks and the wade. `scripts/checks.ts` adds the checks of the page and prints the table
  (`npm run checks`).
- **For Claude**: the skill `dc` (`.claude/skills/dc/SKILL.md`) loads the rubric of this document and
  the register into the context, with the steps to add a check. Load it before you add a check or
  change a DC. A hook (`.claude/settings.json`, `.claude/hooks/dc-reminder.py`) tells Claude to load it
  when an edit writes `dc: <number>` into a `.ts` file that is not a test.
- **Tests**: `worlds/wilds/test/checks.test.ts` (the register has every kind of check and every
  answer of the people; every DC of the Wilds is from 10 to 17; each ability has 3 DCs or more),
  `worlds/wilds/test/houses.test.ts` (the grades: a higher DC holds more; the locks and the boards
  have every grade) and `worlds/wilds/test/economy.test.ts` (the guarded chests count by the weights of
  their grades).
- **No protocol change**: the checks are not on the wire. The page and the server make the same world,
  with the same DCs, from the same code.
