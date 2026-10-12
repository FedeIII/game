# Story fixes: where the code and the story do not agree (draft)

> **Draft** · open questions for Fede · started 2026-10-13, when `docs/story/` was written from the code.
> The clear mismatches were fixed in the code at once (below, "Fixed"). Each item under "Open" needs a
> decision of Fede. When Fede decides, fix the code and `docs/story/`, and delete the item here.

## Open

### 1. Where do the Ashen Seekers come from?

- **The code:** Isolde, the apothecary of Ironhold: "Travellers say that raiders from the south leave
  it: cutthroats who call themselves the Ashen Seekers." (`dialogs.ts`, `APOTHECARY`, node `raiders`).
- **The other sources:** Sela: "From a village in the far north, past the spring of the Silvervein."
  Verath: "I will bring it to you, in the north." The Wren homestead and the camp of the Seekers are
  north-east of Ironhold. The journal at `symbol` says "The stories do not agree", so a wrong rumour may
  be on purpose. But since 2026-10-13, "the south" of Ironhold is the Sovereignty, the hut and the
  hamlets of the road.
- **Proposed fix:** keep a rumour, but not one that points at the Sovereignty: "raiders from the hills"
  (Spanish: "saqueadores de las colinas").
- **Question:** Is "from the south" a rumour on purpose, and must it stay?

### 2. Brann, the watchman, stands at the east gate

- **The code:** Brann (`watchman`, home `-10, 3`) stands at the east gate. His first lines are for a
  traveller from the hut: "Halt! Who walks the road at night?", "A traveller, from the hut in the
  woods.", "The hut by the old signpost? Then you walked the road alone."
- **The other sources:** since 2026-10-13 the road from the hut comes in at the south edge of Ironhold
  (`TOWN_SOUTH`), where the child sees the character first (the scene "the arrival"). A new character
  meets Brann only if it walks to the east gate.
- **Proposed fix:** move Brann and his area to the south edge, where the road comes in. The east gate
  then has nobody, or a soldier of the Sovereignty.
- **Question:** Does Brann move to the south edge, or stay at the east gate (the way to the north road)?

### 3. The land round Ironhold: goblins, or imps and brutes?

- **Fixed (2026-10-13):** the forest of the tutorial reached only row 24, so the last 9 rows of the road
  (15 to 23) had imps and brutes, against Fede's rule (the only enemies on the way to Ironhold are
  goblins). Now `FOREST_EDGE_Y` is row 15, the south entry of Ironhold: the whole road has goblins only.
- **Still open:** the land round Ironhold (its east gate, the start of the north road, its west side)
  has imps and brutes. The sergeant of Bronzehold says "Past Ironhold the wildlands start", and
  `docs/drafts/tutorial.md` said "imps and brutes keep the wildlands north of Ironhold".
- **Proposed fix:** put the edge at the north edge of Ironhold (row -8), so that the land round the town
  has goblins only too, and the wildlands start past it.
- **Question:** Do imps and brutes live round Ironhold (now), or only north of it?

### 4. Level 1 and the fights of the wildlands and the story

- **The code:** characters are level 1 since 2026-10-13 (a fighter has about 10 hit points). Round a
  character in the wildlands are about 4 imps and 2 brutes (`MOB_POPULATION`); a brute hits for 2d8+3.
  The story's ambushes are sized by the 5e budget, but the first unit of each always comes: a worg with a
  goblin rider (the scouts), the Hobgoblin Devastator with a hobgoblin (the war band).
- **The other sources:** Fede, 2026-10-13: "Combat: few enemies, very strategic fights"; the level-up
  system comes later.
- **Proposed fix:** until the level-up system exists, fewer wild mobs round a character (2 imps and 1
  brute), and the first unit of an ambush only when the budget pays for it.
- **Question:** Do the wildlands and the raid stay as hard as they are now for a level-1 character?

### 5. Is Ironhold a town of the Sovereignty?

- **The code** agrees with itself: Ironhold is not of the Sovereignty, but soldiers of the Sovereignty
  stay in it. The farmer of Whitegrove: "Bronzehold is the last village of the Sovereignty. Past it,
  only Ironhold and the wildlands." The reeve: "They are soldiers of the Sovereignty, not of Ironhold."
  To Kasmut: "Ironhold has no soldiers. The soldiers are of the Sovereignty." A soldier: "Ironhold is
  ours to guard." The sergeant: "Past Ironhold the wildlands start, and nobody rules them."
- **The other sources:** `docs/drafts/story-razed-villages.md`, the frame: "Ironhold is the frontier
  village of the Sovereignty", and "the watchman at the gate is a soldier of the Sovereignty" (Brann
  says that he is of the town watch). Chapter 1.5.1 on the Drive (read it live) has Ferrozar.
- **Proposed fix:** none in the code; `docs/story/world.md` gives the code's version.
- **Question:** Is that right: a free town at the edge of the Sovereignty, with its soldiers in it?

### 6. Characters from before 2026-10-13

- **The code:** a character starts where it was last (`Character.place`). The hut moved from the cell
  (0, 0) to the cell (1, 5) on 2026-10-13, and no migration moved the saved places. A character that
  was at or near its old hut starts there: now in the wildlands, far from its hut, and maybe next to
  another house. Its book can also have `ashes` at `letter` (a step that only those books have): the
  reeve still takes it on (`TELL_REEVE`). It has no "The Road to Ironhold" until it reads the letter in
  its new hut.
- **Proposed fix:** a migration that clears the place of every character whose place is within 30
  tiles of the old hut (it then starts in its new hut). Keep the step `letter` for the old books.
- **Question:** Do the old characters move to the new hut, or start where they were?

## Fixed (2026-10-13)

- **The merchant** said that the Sovereignty and the Enclave claim "these woods". His cart stands in
  the Sovereignty now, so he says "the wildlands" (`dialogs.ts`, `MERCHANT`; Spanish in `text-es.ts`).
- **The journal of the lentils** said that the sergeant told where the Sovereignty pushes. He tells it
  only if the character asks; the journal now says only that he paid.
- **The villager of Whitegrove** said "Sleep there once" of the shrine. The shrine has no bed: a
  character that steps inside makes it its refuge. Now: "Step inside once".
- **Comments** in `quests.ts`, `dialogs.ts`, `town.ts`, `source.ts`, `index.ts` and `home.ts` that put
  Ironhold west of the home, made the letter start `ashes`, or the smith the only lever.
- **Documents**: `docs/features/game/quests.md` (the overview, AC-QST-008, AC-QST-017.1, the
  implementation), `docs/multiplayer.md` and `docs/features/abilities/strength.md` (the cell of the
  home), and notes in `story-razed-villages.md`, `story-arcane-raiders.md` and `tutorial.md`.
