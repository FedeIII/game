# Quests

This file is part of the documents of the code (see the map in `CLAUDE.md`). Read it before you
change its part of the code, and change it in the same commit as the code.

Since 2026-10-11 (story phase 2; `docs/features/game/quests.md`). `packages/engine/src/quests.ts`:
a world gives its quests (`WorldDefinition.quests`: `QuestDef`, steps with a journal line, an
optional place to mark, `at` a tile or `npc` an NPC id, and `end`). Each character has a
`QuestBook` (`{ [quest]: { step, flags, n } }`). **Effects** (`QuestEffect`: `quest`, `to`, `from`
(none: it starts the quest), `flag`, `take`, `give`) move a quest; they sit on a dialog answer
(`DialogAnswer.effect`) or on a thing that a character reads (`Interaction.effect`: the letter).
**Conditions** (`When`: a quest at steps, or an item in the pack; `not`) show answers
(`DialogAnswer.when`), choose the first node of a dialog (`Dialog.starts`), and the frame of a
thing (`Fixture.variant`: the mended cart). An answer with an effect shows only when the effect
can apply. **The server owns the book**: `Room.quest()` checks the nearness, the gate, the
conditions and the effect, then changes the book and the pack; the store saves both at once
(`setQuests()`, column `quests`). The book goes to its own player only (`qs`, protocol 23). In a
world that the page runs, the page keeps its own book (not saved). The page: the journal
(`ui/journal-panel.ts`, a button left of the map and the key L; three tabs since 2026-10-14, Fede's
request: "Quests", "Tips" (the tips that this browser showed, `TipStore`) and "Regions" (the lands and
places that the character has seen, from its seen chunks: `Land.line` and `WorldSource.places()`, a
`NamedPlace` with a line; `docs/features/game/quests.md`, REQ-QST-004)), a banner when a quest starts,
moves on or ends (`render/quest-banner.ts`), and gold marks on the map. **When you add a quest:**
its effects and conditions must name its steps (`worlds/wilds/test/story.test.ts` checks every
effect and condition of the content), its texts need Spanish forms (title and journal lines too),
and a test through the Room should play it. The Wilds (`worlds/wilds/src/quests.ts`): `road` (the
first quest, 2026-10-13: the letter of Thrain Steelforge on the home's table sends the character to
Ironhold; the scene `ARRIVAL` ends it when it comes into the town), `ashes` (Elama Rothenel starts it
once the road is done, `ROAD_DONE`; a character from before has it from the letter, at `letter`),
`cart` (the merchant by a broken cart on the road before Whitegrove: lift it with STR 15, or bring a
lever: the farmer of Whitegrove lends his, `lent`, or the smith's; 10 coins), `lentils` (the farmer of
Whitegrove sends a sack to the sergeant of Bronzehold: 5 coins; a wade or a swim with it makes it a
sack of wet lentils, `wet`, and the sergeant then pays 2 coins to CHA 14 or nothing), and `raid`
(the scene `ARGUMENT` in the town hall, then the reeve asks the character to warn Silverspring).
The merchant's cart has a lantern: mobs never come within 4 tiles of it (`CART_SAFE`), as for the
town. **Scenes** (`packages/engine/src/scenes.ts`, `WorldSource.scenes()`): talks that a character
overhears in an area at a step; its NPCs say the lines, a line behind a gate is a murmur, and the
end applies an effect (the message `quest` with `scene`, protocol 24). Only that character's page
plays it. **Wades** (`WorldSource.wadeEffects()`, protocol 37): effects that water applies; after each
step of a player that wades or swims (`PlayerState.wading`), the Room applies each one that can apply
(the page in its own world), so a page cannot hide a wade. **Ambushes** (`packages/engine/src/ambushes.ts`, `WorldSource.ambushes()`, since story
phase 3c): mobs of the story that wait for a character at a step in an area (the scouts of the
hobgoblins in the grove on the north road to Silverspring); their number follows the characters
within 12 tiles (`encounters.ts`, the 5e budget), riders sit on worgs (`Horde.spawnRider()`, state
`ride`, protocol 27), and when they all fall the quest moves on (the Room saves those books at once:
`takeQuestSaves()`). Since story phase 4 (2026-10-11, protocol 29; `docs/features/game/quests.md`
REQ-QST-013 to 016): an ambush can **march** (`AmbushDef.march`: the war band walks the north road,
`Horde.march()`; its mobs never despawn; at the end of the route `arrive` applies) or **raid**
(`AmbushDef.raid`: its mobs may go into a town, `Horde.unleash()`/`MobRules.raid`, and the NPCs of
`shelter` go to `NpcDef.shelter` or home, `NpcCrowd.setAlarm()`). **Escorts**
(`packages/engine/src/escorts.ts`, `WorldSource.escorts()`): a step gives a companion (Himo), back
at each join; home or a fall ends it. The `raid` quest: `scouts` -> the band falls on the road
(`band`: Himo on the post of the camp, `camp.ts`, a variant with content, `fixtureContent()`) ->
`escort` -> `home` (20 coins) or `lost`; or the band reaches Silverspring (`raid`) -> `defended`;
then Kasmut gives `title` (and the permit of the mithril for the early ending). The Hobgoblin
Devastator (`devastator`) casts a rite (`Rite`, state `rite`): three runes that hits break; at its
end the weapons of its allies burn (+1, 1d4). `Room.deal()` checks `DialogAnswer.when`.
