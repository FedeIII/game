# Story fixes: where the code and the story do not agree (draft)

> **Draft** · started 2026-10-13, when `docs/story/` was written from the code.
> The clear mismatches were fixed in the code at once (below, "Fixed"). Each open question needs a
> decision of Fede. When Fede decides, fix the code and `docs/story/`, and move the item to "Decided".

## Open

None now.

## Decided (Fede, 2026-10-13)

1. **Where the Ashen Seekers come from:** nobody knows. Isolde says: "Travellers say that raiders leave
   it: cutthroats who call themselves the Ashen Seekers. Nobody knows where they come from."
   (`dialogs.ts`, `APOTHECARY`, node `raiders`). Sela, a Seeker, still says that they come from "a
   village in the far north ... It is on no map": what a captive says, not a known fact.
2. **Brann moves to the south entry** of Ironhold (`town.ts`: home and area on the lane above
   `TOWN_SOUTH`), where the road from the hut comes in. His lines fit: the goblins of the road behind
   the character, the imps and the brutes north of the town; "Ironhold is open to anyone who is not a
   goblin." The east gate has nobody.
3. **Imps and brutes live only north of Ironhold, for now.** `FOREST_EDGE_Y` is the north edge of
   Ironhold (row -8): the land round the town has goblin patrols only.
4. **No rebalance for level 1, for now.** The wildlands (4 imps and 2 brutes round a character) and
   the ambushes of the story stay as they are. Look at it again with the level-up system.
5. **Ironhold is a town of the Sovereignty**: the last one before the wildlands, on the way to
   Silverspring, which is its counterpart, the last village of the Mithril Enclave. The farmer of
   Whitegrove now says: "Up the road: Bronzehold, then Ironhold, the last town of the Sovereignty. Past
   it, the wildlands." The soldiers of the Sovereignty stay in it; the town has no soldiers of its own.
6. **Characters from before the new hut start in it.** A migration of the store
   (`packages/engine-server/src/store.ts`, `NEW_HUT_AT`) clears the place of every character made
   before the new hut went live (2026-10-12, 22:52 UTC; 2026-10-13 00:52 in Madrid). Such a character
   starts in its new hut. In production on 2026-10-13 there were two characters, both made after the
   move, so the migration changed none there; it moves the older characters of a development database.

## Fixed (2026-10-13)

- **The merchant** said that the Sovereignty and the Enclave claim "these woods". His cart stands in
  the Sovereignty now, so he says "the wildlands" (`dialogs.ts`, `MERCHANT`; Spanish in `text-es.ts`).
- **The journal of the lentils** said that the sergeant told where the Sovereignty pushes. He tells it
  only if the character asks; the journal now says only that he paid.
- **The villager of Whitegrove** said "Sleep there once" of the shrine. The shrine has no bed: a
  character that steps inside makes it its refuge. Now: "Step inside once".
- **The road of the tutorial** reached only row 24 of the forest, so the last rows of the road had imps
  and brutes. Then the edge was row 15 (the south entry of Ironhold); since Fede's answer 3 it is row -8.
- **Comments** in `quests.ts`, `dialogs.ts`, `town.ts`, `source.ts`, `index.ts` and `home.ts` that put
  Ironhold west of the home, made the letter start `ashes`, or the smith the only lever.
- **Documents**: `docs/features/game/quests.md` (the overview, AC-QST-008, AC-QST-017.1, the
  implementation), `docs/multiplayer.md` and `docs/features/abilities/strength.md` (the cell of the
  home), and notes in `story-razed-villages.md`, `story-arcane-raiders.md` and `tutorial.md`.
