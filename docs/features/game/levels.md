# Levels and Experience

## Overview

Since 2026-10-14 (Fede's decisions; the item "Levels" of `docs/drafts/todo.md`) a character starts at
level 1 and rises with its experience (XP), up to level 5, with the numbers of 5e. Kills and quests give
XP; the quests give more than half of it, as of the coins. A kill gives only a tenth of the XP of 5e,
because a kill is much easier in this game than at the table. Mobs and the NPCs that fight have a level
too: the challenge rating of their stat block. It is only for the calculations: no screen shows it.

## Terminology

- **XP**: the experience points of a character. The server keeps them with the character.
- **Level**: 1 to 5, from the XP (the 5e table: level 2 at 300 XP, 3 at 900, 4 at 2700, 5 at 6500).
- **Challenge rating (CR)**: the level of a mob or of an NPC that fights: the CR of its 5e stat block
  (a bandit 1/8, a goblin 1/4, a worg 1/2, a brute 1, the Ash Warden 2). Its 5e XP comes from it.
- **Divisor**: a kill gives the 5e XP of the CR divided by it: 10 for every character; an admin can
  choose another one for the admin's own characters.
- **Hitter**: a character whose blow (or arrow) hit a mob before it died.

## Requirements

### REQ-LVL-001: The levels of a character

**User Story:** As a player, I want my character to grow with what it does, so that it can face harder
fights later.

**Acceptance Criteria:**
- **AC-LVL-001.1:** A character starts at level 1 with 0 XP. Its level comes from its XP with the 5e
  table: level 2 at 300 XP, 3 at 900, 4 at 2700, 5 at 6500. Level 5 is the highest; the XP goes on.
- **AC-LVL-001.2:** A level gives the 5e numbers: hit points (the hit die at its most and the CON
  modifier at level 1, then half the die + 1 and the CON modifier for each level, at least 1 for each),
  the proficiency bonus (+2, +3 at level 5), a rogue's sneak attack (1d6, 2d6 at level 3, 3d6 at level
  5), the cantrips (two dice from level 5: fire bolt 2d10) and a monk's martial arts (1d6 from level 5).
  A fighter with CON 14 has 12 hit points at level 1, 20 at level 2 and 44 at level 5.
- **AC-LVL-001.3:** At a new level the character gets at once the hit points that the level adds, on
  top of those that it has (5e). A defeated character gets them when it wakes (all its hit points).
- **AC-LVL-001.4:** The ability increase of level 4 and the class features (second wind, rage, smite,
  spells, extra attack) do not come yet.

---

### REQ-LVL-002: The XP of a kill

**User Story:** As a player, I want a kill to give a little XP, so that a fight is worth it, but not so
much that killing is the way to grow.

**Acceptance Criteria:**
- **AC-LVL-002.1:** A kill gives the 5e XP of the mob's challenge rating divided by 10, rounded: a bandit
  3, a goblin of the forest 5, an imp 5, a worg 10, a brute 20, a bugbear 20. A mob of CR 0 (a watcher
  of the Seekers) gives nothing.
- **AC-LVL-002.2:** Each character whose blow or arrow hit the mob gets all of that XP; a character that
  only missed, or did not fight, gets none. A mob that a guard or a companion kills gives XP only to the
  characters that hit it before.
- **AC-LVL-002.3:** A mob that goes in ash (the Ash Warden at half of its hit points) is no kill: the
  quest gives the XP of that fight.
- **AC-LVL-002.4:** A guard of a caravan has a CR too (the militia 1/8, the wagon 0). A robber whose blows
  hit a guard that falls gets its XP, as for a mob.

---

### REQ-LVL-003: The XP of a quest

**User Story:** As Fede, I want the quests to give most of the XP, as they give most of the coins, so
that a character grows by the story and not by killing.

**Acceptance Criteria:**
- **AC-LVL-003.1:** An effect of a quest can give XP (`QuestEffect.xp`): the end of a quest, or a big
  step of it (a fight of the story). Only an effect that moves its quest to a new step gives XP, so it
  comes once.
- **AC-LVL-003.2:** The XP of the Wilds: the road to Ironhold 100; the cart 50; the lentils 50 (wet: 40
  with CHA 13, else 25); the Razed Villages 50 for the three homesteads, 100 when the hounds fall at the
  Wren homestead, 75 for the camp of the Seekers, 100 when the Ash Warden goes, 100 at the end of the
  dream; the Hobgoblin Raid 75 for the scouts, 100 for the war band (on the road or in Silverspring), 50
  for Himo home, 50 for the title; the Caravan Ambush 100 when the caravan is saved.
- **AC-LVL-003.3:** In a model of a game of chapter 1, alone, the quests give more than half of the XP,
  and the game ends at level 3 (the chapter is made for level-3 characters). The road and its small
  quests end at level 1; the first steps of the Razed Villages bring level 2.

---

### REQ-LVL-004: The level on the screen

**User Story:** As a player, I want to see my level and how far the next one is, so that I know how my
character grows.

**Acceptance Criteria:**
- **AC-LVL-004.1:** The vitals (top left) show the level ("Lv 2"; Spanish "Nv 2") and, beside it, a thin
  gold bar of the way from the XP of this level to the XP of the next one (full at level 5). A screen
  reader hears "Level 2, 450 of 900 XP".
- **AC-LVL-004.2:** The "You" section of the settings shows "Level 2 · 450 / 900 XP" (Spanish "Nivel 2 ·
  450 / 900 PX").
- **AC-LVL-004.3:** A new level shows a banner, as for a quest ("New level", "Level 2"), with the music
  of the end of a quest; a screen reader hears "New level: level 2."
- **AC-LVL-004.4:** The first XP of a character in a browser brings the tip `xp`, which tells of the
  gold bar (`docs/features/game/tips.md`).
- **AC-LVL-004.5:** No screen shows the level of a mob or of an NPC (Fede's decision).

---

### REQ-LVL-005: The divisor of an admin

**User Story:** As Fede, I want to change the XP of a kill for my own characters, so that I can test
the levels quickly.

**Acceptance Criteria:**
- **AC-LVL-005.1:** The settings of an admin have "Experience": "Kill XP: 5e XP ÷" and a number from 1
  to 100 (10 at first), with the line "For your own characters only; the other players have 10." The
  other players do not see it.
- **AC-LVL-005.2:** A new number goes to the server (`PUT /api/me/xp-divisor`, an admin only, from a page
  of the game), which keeps it with the account and gives it at once to the admin's character in a
  shared world. The section says "Saved", or "Not saved" when the server refuses it.
- **AC-LVL-005.3:** The other players always have 10. An account that is no longer an admin has 10 too.

---

### REQ-LVL-006: The XP on the server

**User Story:** As Fede, I want the server to own the XP, so that a page cannot give itself levels.

**Acceptance Criteria:**
- **AC-LVL-006.1:** In a shared world the server gives the XP (kills, quests), and the level and the
  traits follow there; the page makes the same traits from the XP that the server sends. A client never
  sends its XP or its level.
- **AC-LVL-006.2:** The store keeps the XP of each character, saved together with its quest book and
  pack (a reward and its XP go at once), and at each heartbeat and when the player leaves.
- **AC-LVL-006.3:** In a world that the page runs (`?offline`), the page gives the XP itself, and does
  not save it.
- **AC-LVL-006.4:** The encounters of the story size themselves for the levels of the characters there:
  the 5e "deadly" budget of each level (100, 200, 400, 500, 1100 XP), added for the party.

---

## Feature Behavior & Rules

- **The rules** (`packages/engine/src/experience.ts`): `MAX_LEVEL` 5, `LEVEL_XP`, `levelOf()`,
  `levelProgress()`, `MAX_XP`, `crXp()`, `CHALLENGE_RATINGS`, `KILL_XP_DIVISOR` 10, `MIN_XP_DIVISOR` 1,
  `MAX_XP_DIVISOR` 100, `killXp()`, `checkXp()`, `checkXpDivisor()`. `traits.ts`: `PlayerTraits.level`,
  `proficiencyBonus()`, `levelHp(cls, conMod, level)`, `traitsOf(scores, cls, gear, level)`,
  `sheetTraits(sheet, gear, level)`, `guestTraits(skin, gear, level)`. `gear.ts`: `attackGear(gear, cls,
  level)`, `cantripDice()`, `martialArts()`, `sneakAttack()`.
- **The mobs** (`mobs.ts`): `MobStats.cr` (it took the place of `xp`), `mobXp()`, `Defeat`,
  `Horde.takeDefeats()` (the brain of a mob keeps its `hitters`). `guards.ts`: `GuardDef.cr`,
  `GuardEvent.hitters`. `encounters.ts`: `XP_THRESHOLDS` (by level), `thresholdsOf()`,
  `sizeEncounter(units, levels)`; `AmbushPlayer.level` (`ambushes.ts`, `convoys.ts`).
- **The quests** (`quests.ts`): `QuestEffect.xp`; `checkEffect()` checks it. The Wilds:
  `worlds/wilds/src/quests.ts`.
- **The server**: `Room` (`RoomPlayer.xp`, `xpChanged`, `xpDivisor`; `JoinCharacter.xp`, `xpDivisor`,
  `traitsFor(gear, level)`; `gainXp()`, `awardKill()`, `awardKills()`, `setXpDivisor()`); the welcome and
  the snapshot field `xp` (protocol 41). The store: the column `xp` of `characters` and `xp_divisor` of
  `users` (`setQuests(..., xp)`, `xpDivisor()`, `setXpDivisor()`); `Character.xp`. The accounts:
  `Accounts.xpDivisorOf()`, `onXpDivisor()`, `PUT /api/me/xp-divisor`, `/api/me` gives `xpDivisor` to an
  admin.
- **The page**: `game.ts` (`localXp`, `xpNow()`, `gainXp()`, `levelUp()`, `followGear()` follows the
  level too), `NetSession.xp`, `ui/vitals.ts` (`setLevel()`, `announce()`), `ui/you-section.ts`
  (`setLevel()`), `ui/xp-section.ts`, `STRINGS.vitals.level`, `xp`, `levelUp`, `experience`, `you.level`,
  the tip `xp`; the theme colour `--ui-xp`. The debug panel's line `xp`.
- **Tests**: `packages/engine/test/experience.test.ts`, `packages/engine/test/encounters.test.ts`,
  `worlds/wilds/test/economy.test.ts` (the model of chapter 1), `worlds/wilds/test/story.test.ts` (the
  XP of the road and of the scouts through the Room), `packages/engine-server/test/accounts.test.ts`.
