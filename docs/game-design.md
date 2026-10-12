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
