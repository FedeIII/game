# The story of World of Kandrax

This folder tells the story of the game as the game shows it: the world and its places, the people,
the questlines and the prologue. It is the one written truth of the story.

## The rule

**The code must match these documents at all points** (Fede's rule, 2026-10-13).

- When you change a quest, a line of an NPC, a place or the prologue, change the document here in the
  same commit.
- When the code and a document do not agree, fix the code or the document. If the fix needs a
  decision of Fede, write it in a draft in `docs/drafts/` (now `docs/drafts/story-fixes.md`), with what
  the code says, what the other source says, a proposed fix and the question.
- Quests do not show chains (Fede, 2026-10-13; `docs/game-design.md`): an event unlocks a quest, and
  some events happen only after another quest is finished. The journal and the banners never name the
  next quest.

## The documents

| Document | Contents |
|---|---|
| [`world.md`](world.md) | Kandrax as the game tells it, and the places of the Wilds: where they are, what lives there. |
| [`people.md`](people.md) | Every person of the game: English and Spanish name, place, role, and the quests they move. |
| [`questlines.md`](questlines.md) | Each quest: what starts it, what it waits for, its steps, its rewards, what its end unlocks. |
| [`prologue.md`](prologue.md) | The cards of the prologue, and how the player moves through them. |

## The sources, and how they relate

- **Kandrax**, Fede's D&D 5e world, on the Drive (folder `Kandrax D&D`; see `CLAUDE.md`, "Lore").
  The story of the game follows chapter 1.5.1 of the saga, "Pueblos Arrasados". Read the Drive live; do
  not copy it here. These documents give only what the game uses.
- **The plans** in `docs/drafts/`: `story-razed-villages.md` (phases 1 to 6), `story-arcane-raiders.md`
  (phases 7 to 13; chapter 2 is on hold), `tutorial.md` (the road to Ironhold). A plan tells why and
  how a thing was built. Where a plan and this folder do not agree, this folder and the code are the
  truth, and the plan has a note.
- **The features** in `docs/features/`: the requirements (REQ/AC) of each system. A feature document
  tells how a system works; this folder tells what the story does with it.
- **The code**: `worlds/wilds/src/` (`quests.ts`, `dialogs.ts`, `town.ts`, `hamlets.ts`,
  `silverspring.ts`, `ruins.ts`, `wren.ts`, `seekers.ts`, `shrine.ts`, `dream.ts`, `camp.ts`,
  `road.ts`, `river.ts`, `source.ts`, `home.ts`, `prologue.ts`; the Spanish in `text-es.ts`).

## Names

The game is in English, with a Spanish table. The English names translate the Spanish names of
Kandrax; the Spanish texts use the names of Kandrax (Fede, 2026-10-11). Each document gives both.

## Changes

- **2026-10-13** (this folder starts). The hut is south of Ironhold, at the northern edge of the Iron
  Sovereignty. The road from the hut goes north through two hamlets of the Sovereignty, Whitegrove and
  Bronzehold, to the south edge of Ironhold. The first quest is "The Road to Ironhold": the letter of
  Thrain Steelforge starts it, and the arrival in Ironhold ends it. The end of the road lets the reeve
  give "The Razed Villages". The farmer of Whitegrove gives "Lentils for Bronzehold", and lends a lever
  for the broken cart, which stands on the road before Whitegrove. The forest of the road has only
  goblin patrols. The burned homesteads are in the wildlands north of Ironhold. Characters start at
  level 1. The prologue waits for the player at the end of each card, and its music rises with the
  card of the gods and calms with the last card (the hut).
- **2026-10-12**. The prologue (nine cards). Phases 7 to 10 of the Arcane Raiders: the Wren
  homestead, the camp of the Seekers, the shrine of Tigris, the dream of Verath. Chapter 2 is on hold.
- **2026-10-11**. The quests, Ironhold's people, Silverspring, the hobgoblin raid, the caravan, the
  burned homesteads.
