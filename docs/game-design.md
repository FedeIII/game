# Game design notes

Fede's rules for the design of World of Kandrax. They hold for every feature: read them before you
design a quest, an encounter, a mob or an ability. The decisions of one feature stay in its draft
(`docs/drafts/`) or its document (`docs/features/`).

## Quests

- **No chains of quests, at least in what the player sees** (Fede, 2026-10-13). Each quest stands
  alone in the journal: no "part 2 of 3", no "next quest" in the journal or the banner.
- **Events unlock quests.** A conversation, a thing that the character reads, a place that it
  reaches or a fight can start a quest.
- **Some events happen only after another quest is finished.** The content gates them (a `When` on
  the end step of that quest, `packages/engine/src/quests.ts`), not the UI.
- **The first quest of the game is to reach Ironhold** (Fede, 2026-10-13): the tutorial, from the
  hut to the town (`docs/drafts/tutorial.md`).

## Combat

- **Few enemies, very strategic fights** (Fede, 2026-10-13). Movements are slow but must be well
  timed; the player must choose the right ability; positioning matters (and mechanics of that kind).
  Not hordes, and not button mashing.
- Thus prefer fewer, more dangerous and more readable enemies: a clear wind-up, an opening to
  punish, a position to take or to deny. Tune encounters by their tactics, not by their numbers.
- The tutorial is the exception in difficulty only: its goblins are an easy match, so that a new
  player learns the controls without fear (`docs/drafts/tutorial.md`).

## Checks

- **A DC is the score that a check needs** (Fede, 2026-10-15): "A DC of X in this game means that the
  player needs a score in that ability of X or more." There is no die (Fede's rule, 2026-10-10).
- **Each check has its own DC, from its context.** The 5e table of DCs is the guide (easy 10, medium 15,
  hard 20), and the reward moves it: the world guards a valuable thing better. At the start of the game
  a chest goes from DC 10 (a few coins) to DC 13 (the most coins of the start and two things); a chest
  with an important item in the house of an NPC would be DC 16, and a chest of a bank with a magic item
  DC 20.
- Choose the DC of a new check with the rubric of `docs/features/abilities/checks.md`, and read the
  register first (`npm run checks`), so that the check fits the others. Ask Fede when the rubric does
  not give a clear answer.

## Experience

- **Kills and quests give XP; the quests give more than half of it** (Fede, 2026-10-14), as for the
  coins. A kill gives a tenth of the 5e XP of the mob: a kill is much easier here than at the table.
- A character rises to level 5 with the 5e table. Chapter 1 is made for level-3 characters: a game of
  chapter 1 ends at about level 3 (`worlds/wilds/test/economy.test.ts`, `docs/features/game/levels.md`).
- The level of a mob or of an NPC is the challenge rating of its 5e stat block. It is only for the
  calculations: no screen shows it (Fede, 2026-10-14).

## Coins

- **Coins are scarce** (Fede, 2026-10-13). A reward of 5 coins is a good one: 2 coins of the 5 for
  the lentils must be a big save. A healing draught costs 6.
- **Quests give more than half of a character's coins.** Kills and chests give little: most kills
  give no coins, a kill that gives some gives a coin or two, and a chest gives no coins at times
  (`MOB_LOOT` in `packages/engine/src/items.ts`, `LootTable.coinChance`; the chests in
  `worlds/wilds/src/source.ts`). What the mobs of a quest's fights drop counts with the quests.
- A test keeps the rule with a model of a game of chapter 1 (`worlds/wilds/test/economy.test.ts`;
  `docs/features/items/pack-and-loot.md`, REQ-PK-016). When you add a reward, a loot table, a mob or
  a price, keep it green.
