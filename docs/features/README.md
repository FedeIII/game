# Game Features

The feature documents of the game engine and of its world, the Wilds (https://game.azyr.io). Each
document describes one feature that is built: what it is, its terms, its requirements with their
acceptance criteria, and the rules of its behavior, with pointers to the code. A plan for a
feature that is not built is a draft in [`../drafts/`](../drafts/); when the feature is built, it
gets a document here. The story itself (the places, the people, the questlines, the prologue) is in
[`../story/`](../story/), and the code must match it.

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
| Abilities: Wisdom | `WIS` | [`abilities/wisdom.md`](abilities/wisdom.md) |
| Abilities: Charisma | `CHA` | [`abilities/charisma.md`](abilities/charisma.md) |
| Items: Pack and Loot | `PK` | [`items/pack-and-loot.md`](items/pack-and-loot.md) |
| Items: Equipment | `EQ` | [`items/equipment.md`](items/equipment.md) |
| NPCs: Companions | `CMP` | [`npcs/companions.md`](npcs/companions.md) |
| NPCs: Guards (NPCs that fight) | `GRD` | [`npcs/guards.md`](npcs/guards.md) |
| Game: Language | `LANG` | [`game/language.md`](game/language.md) |
| Game: Quests and the Journal | `QST` | [`game/quests.md`](game/quests.md) |
| Game: Combat (5e, Level 1) | `CMB` | [`game/combat.md`](game/combat.md) |
| Game: The Game Menu | `GMN` | [`game/game-menu.md`](game/game-menu.md) |
| Game: The Prologue | `PRO` | [`game/prologue.md`](game/prologue.md) |
| Game: Sound | `SND` | [`game/sound.md`](game/sound.md) |
| Game: The Game Menu | `GMN` | [`game/game-menu.md`](game/game-menu.md) |
| Game: The Main Menu | `MNU` | [`game/main-menu.md`](game/main-menu.md) |
| Game: The Prologue | `PRO` | [`game/prologue.md`](game/prologue.md) |
| Game: The Tips | `TIP` | [`game/tips.md`](game/tips.md) |
| Game: The Towns of the Wilds | `TWN` | [`game/towns.md`](game/towns.md) |

To add a document, give it a new prefix, and add it to this table and to the table of its domain.

---

## Abilities

| Document | Feature |
|---|---|
| [Ability Scores](abilities/ability-scores.md) | What the six scores give: the traits, scales and gates (a gate is never a die roll), how a thing behind a gate shows (open, a dim clue 1 or 2 under it, else nothing), the attack ability of each class (Option B), the attack bonus and the dice of a blow (level 3: +2 + mod, the die of the gear + mod), the traits from the stored character on the server, the plain traits of a guest, and the list of traits in the builder and in the "You" section |
| [Strength](abilities/strength.md) | The push and the stagger of a blow, the slots of the pack, wading through shallow water (half speed, no attack, the band at each shore, the look of a wader), and barred doors (force them with STR 13, the boards come back after 30 minutes, one Wilds house with a chest in four) |
| [Dexterity](abilities/dexterity.md) | Quicker attacks, a longer guard, the dodge roll (Shift, the right mouse button, the touch button), stealth and sneaking (the sneak walk on C, the smaller torch), the arrows of a bow (range 5 + mod tiles), and locked chests (pick them with DEX 13) |
| [Constitution](abilities/constitution.md) | Hit points of level 1 (the hit die of the class at its most + mod), a shorter stun, the poison of an imp (2 a bite), no recovery by itself, a rest in the bed of the home, a defeat at 0 HP and waking at home or in a refuge (the chapel) with half the coins, stamina for the roll and the sneak walk, an ale at the inn for 2 coins, and the HP between sessions |
| [Intelligence](abilities/intelligence.md) | The wizard's damage, more damage on a wind-up, reading a mob (a health bar at INT 13, a glint at 15), lore on things and clever answers (INT 13, with the gate rule), the cauldron of Ironhold (three brews at INT 10, 13 and 15), and the map of the seen land (more detail with INT) |
| [Wisdom](abilities/wisdom.md) | The damage of the cleric and the druid, red marks at the screen edge for the mobs that hunt you out of view (6 to 14 tiles), hidden herbs and the buried cache that show only close by (1 to 9 tiles), a lighter night, insight answers in four conversations (WIS 13), Medicine (chew herbs for 1d4 hit points, WIS 13), and an arrow that points home (WIS 13) |
| [Charisma](abilities/charisma.md) | The damage of the sorcerer and the warlock, better prices and sales (±10% per modifier), persuasion answers (CHA 13: a room at the inn that is a refuge with a bed, Isolde's friend's price), Isolde's shop and the peddler who buys, a pack that presses less and mobs that run off longer, more guard for the players near you, and a greeting by name (CHA 13) |

## Items

| Document | Feature |
|---|---|
| [Pack and Loot](items/pack-and-loot.md) | The pack (a purse and slots, the stacks of the items), the drops of kills, the chests of the Wilds (ordinary, locked, barred), one loot per chest for every player and the refill after 30 minutes, a full pack, the pack in the store of the server, the pack panel (each stack in its own slot, a detail of each item with its uses, drink and drop; a drag moves a stack to another slot or tosses it onto the world), the coins that a defeat takes, buying and selling, drinks and herbs to chew, the patches of herbs and the buried cache, scarce coins (the quests give most of them), items on the ground (drop them, pick them up, the overflow of a kill; 10 minutes; they fall on the screen and shine faintly), and the drink belt (keys 1 to 4) |
| [Equipment](items/equipment.md) | The twelve worn slots of D&D 5e, the armour, shields, weapons and the luck amulet, what each class can use, the hands (two-handed weapons and shields), attunement (3), Armour Class against the attack rolls of the mobs (a miss glances off), heavy and noisy armour, the damage dice of the weapon (cantrips of level 3, martial arts, an unarmed strike), light and heavy weapons, bows for any class, a rogue's sneak attack, the 5e kit of each class, the worn slots round the picture in the pack panel (wear, take off, drag), the gear in the store of the server, the weapon and the shield on the figure for every player, the smith of Ironhold, who sells gear and buys it back for half, nine magic items of the SRD as rare loot, and a reach weapon (the glaive) |

## NPCs

| Document | Feature |
|---|---|
| [Companions](npcs/companions.md) | NPCs that follow a player: the shortest way of tiles round what blocks, doors that they open, the catch-up, the wait when there is no way and the follow again, mobs that hunt them (and bring no new mobs), the two kinds of defeat (gone or wakes), the events for the quests, the companions of every player in a shared world (protocol 22), their look, name and lantern on the screen, and the test switch `?companion=<look>` |

## Game

| Document | Feature |
|---|---|
| [Language](game/language.md) | English and Spanish: the language of the page (`?lang=`, the kept choice, the browser), the choice in the menu and the settings, the engine's texts in both languages with the names of the Spanish books of 5e, the world's texts in Spanish with the names of Kandrax (Ferrozar, las Tierras Salvajes, la alguacil), lines without gender for the player, the limits and the letters of the pixel font, the English names (Ironhold, Elama Rothenel), and the privacy page in Spanish |
| [Quests and the Journal](game/quests.md) | The quest book of each character (kept by the server), effects and conditions in conversations and on things, the journal, the banner, the map marks, the letter of Thrain Steelforge, the first quest (the road to Ironhold), the lentils for Bronzehold, and the merchant's broken cart |
| [Combat (5e, Level 1)](game/combat.md) | The 5e numbers of a level-1 character and of the SRD mobs, attack rolls both ways against the Armour Class, rolled damage, critical hits, healing as at the table, and the numbers of a fight on the screen |
| [The Game Menu](game/game-menu.md) | Escape (or a faint icon on a touch screen) opens a menu over the game: "Resume", "Load game", "New game" and "Prologue" |
| [The Main Menu](game/main-menu.md) | The menu before the game: Nivalia in pixel art behind it, "Prologue" once the browser saw it, and "Settings" with the controls to read, the language, the tips and (for an admin) the CRT settings |
| [The Tips](game/tips.md) | Short hints of the tutorial at the top of the screen, the first time of each thing (walk, act, rest, the journal, a conversation, a deal, the map, sneak, attack, dodge, a hit, a drink, a pile, a defeat): once in a browser, one at a time, keys on a keyboard and buttons on a touch screen, and their switch in the settings |
| [The Prologue](game/prologue.md) | Nine painted scenes of Kandrax with Fede's texts, for each new character and from the game menu: the world, the Dominions, the gods, Thrain's factory, and the character's identity and mission; its pace and how to skip it |
| [Sound](game/sound.md) | Music on a recorded orchestra and choir (VSCO 2 CE, FluidR3), loaded when needed: the theme of Kandrax in the prologue, and in the game a music that follows the places, a hunt, a fight, a battle, a dream, a defeat, with stingers for discoveries and quests; the sounds of fights, steps, mobs' voices, doors, chests, coins, drinks and the GUI; an ambience for each place and the sounds of water, fires, fountains and forges near the player; when the sound starts and sleeps, and the "Sound" settings |
