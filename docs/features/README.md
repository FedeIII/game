# Game Features

The feature documents of the game engine and of its world, the Wilds (https://game.azyr.io). Each
document describes one feature that is built: what it is, its terms, its requirements with their
acceptance criteria, and the rules of its behavior, with pointers to the code. A plan for a
feature that is not built is a draft in [`../drafts/`](../drafts/); when the feature is built, it
gets a document here.

### The format

Every document has this structure (the format of `platform-docs/AUTHORING.md` in the
streaming-platform project):

```markdown
# {Feature Name}

## Overview
## Terminology
## Requirements

### REQ-{PREFIX}-{NNN}: {Title}

**User Story:** As a [persona], I want [goal], so that [reason].

**Acceptance Criteria:**
- **AC-{PREFIX}-{NNN}.{N}:** [criterion]

---

## Feature Behavior & Rules
```

- The requirements of a file have the numbers 001, 002 and on. The criteria of a requirement have
  the numbers 1, 2 and on (AC-STR-004.2). A line `---` separates two requirements.
- Each criterion is a thing that a test can check: numbers, the texts that the player reads, what
  the server does. Files, constants and protocol fields go in "Feature Behavior & Rules".
- Before you write or change a document, find every number, name, path and text in the code. Do
  not write about a thing that the code does not have.
- When the code changes, change the requirement in its place; do not add a second one. When a
  behavior goes away, delete its requirement, and keep the numbers of the others.
- Write in Simplified Technical English, as all the documents of this repository.

### The prefixes

| Domain | Prefix | File |
|---|---|---|
| Abilities: Ability Scores | `AS` | [`abilities/ability-scores.md`](abilities/ability-scores.md) |
| Abilities: Strength | `STR` | [`abilities/strength.md`](abilities/strength.md) |
| Abilities: Dexterity | `DEX` | [`abilities/dexterity.md`](abilities/dexterity.md) |
| Abilities: Constitution | `CON` | [`abilities/constitution.md`](abilities/constitution.md) |
| Abilities: Intelligence | `INT` | [`abilities/intelligence.md`](abilities/intelligence.md) |
| Items: Pack and Loot | `PK` | [`items/pack-and-loot.md`](items/pack-and-loot.md) |

To add a document, give it a new prefix, and add it to this table and to the table of its domain.

---

## Abilities

| Document | Feature |
|---|---|
| [Ability Scores](abilities/ability-scores.md) | What the six scores give: the traits, scales and gates (never a die roll), how a thing behind a gate shows (open, a dim clue 1 or 2 under it, else nothing), the attack ability of each class (Option B), the damage of a blow (4 + mod), the traits from the stored character on the server, the plain traits of a guest, and the list of traits in the builder and in the "You" section |
| [Strength](abilities/strength.md) | The push and the stagger of a blow, the slots of the pack, wading through shallow water (half speed, no attack, the band at each shore, the look of a wader), and barred doors (force them with STR 13, the boards come back after 30 minutes, one Wilds house with a chest in four) |
| [Dexterity](abilities/dexterity.md) | Quicker attacks, a longer guard, the dodge roll (Shift, the right mouse button, the touch button), stealth and sneaking (the sneak walk on C, the smaller torch), the arrows of a ranger (range 5 + mod tiles), and locked chests (pick them with DEX 13) |
| [Constitution](abilities/constitution.md) | Hit points (4 + mod), a shorter stun, the poison of an imp, recovery out of a fight, a rest in the bed of the home, a defeat at 0 HP and waking at home or in a refuge (the chapel) with half the coins, stamina for the roll and the sneak walk, an ale at the inn for 2 coins, and the HP between sessions |
| [Intelligence](abilities/intelligence.md) | The wizard's damage, more damage on a wind-up, reading a mob (a health bar at INT 13, a glint at 15), lore on things and clever answers (INT 13, with the gate rule), the cauldron of Thornwick (three brews at INT 10, 13 and 15), and the map of the seen land (more detail with INT) |

## Items

| Document | Feature |
|---|---|
| [Pack and Loot](items/pack-and-loot.md) | The pack (a purse and slots, the stacks of the nine items), the drops of kills, the chests of the Wilds (ordinary, locked, barred), one loot per chest for every player and the refill after 30 minutes, a full pack, the pack in the store of the server, the pack panel, the coins that a defeat takes, coins for an ale, and drinks |
