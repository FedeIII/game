# The Arcane Raiders: the end of chapter 1 and chapter 2 (draft)

> **Draft** · promotes to `docs/features/` (one document for each system) when built ·
> **Status:** planned 2026-10-12; phases 7 to 9 built (2026-10-12: REQ-QST-022 to 024, REQ-CMB-008, protocols 33 and 34)

This draft continues `docs/drafts/story-razed-villages.md` (phases 1 to 6, all built). It plans the
rest of the quest `ashes` (the end of chapter 1) and chapter 2 of the game. The phases keep the
numbers of that draft: they start at 7.

**The Drive is the source of the story, not this file.** Read the documents live before you build a
phase:

- `RPG`, "Gang of Raiders": the Ashen Seekers, Verath Shadowweave, the six phases of "Shadows of the
  Ashen Seekers", "Maintaining Mystery", "Building Tension", "Twists and Complications".
- `Sagas/Dioses Olvidados/1.0 - Saga de los Dioses Olvidados`, section 1.5: quests 1.5.x "Aldea
  salvaje" (attack the origin of the Raiders, in the Northern Wilds, with a rival party) and 1.5.x
  "Asalto" (the band raids bigger and bigger towns for old relics; it ends with a large assault on a
  walled city, and the characters defend it).
- `Sagas/Dioses Olvidados/Capítulos/1.2B - Fábrica Forjacero`: the Wandering Brotherhood (la
  Hermandad Errante) and what Thrain knows of the Arcane Raiders.
- `Kandrax - Dioses` (Tigris, Simtu, the god of matter) and `Kandrax - Mundo` (Grimhollow,
  Hondurria).

## Decisions (Fede, 2026-10-12)

- **The relic of phase 9 is a relic of Tigris**, the goddess of rivers. It lies in an old shrine at
  the pool of the Silvervein. The Hale survivor already says that old Hale's father found his black
  stone "in the old ruins by the river", and the Wandering Brotherhood hunts the Raiders because they
  steal relics of Tigris and Simtu.
- **The dream of Verath is a choice with a cost.** Verath tells a part of the truth (the four gods
  are imposters) and asks for the relic. The character gives it, refuses, or lies. The game keeps the
  choice, and it changes chapter 2.
- **Chapter 2 is in the Wilds, far north.** The village of the Raiders is in the far north of the
  Wilds, past Silverspring. The walled city of the assault is a new fixed city, Hondurria, at the end
  of a new road.
- **Names** (approved): la Hermandad Errante (the Wandering Brotherhood), with Elira Nadira and
  Kaldor Rompehuesos (Kaldor Bonebreaker); Tigris; Hondurria; Grimhollow; los Saqueadores Arcanos
  (the Arcane Raiders) in the texts.

## Names

New names of this draft. The names of Kandrax are approved (see above). The other names are new,
made for the game; Fede can change them.

| Kandrax (es) | Game (en) | Notes |
|---|---|---|
| Tigris | Tigris | the goddess of rivers, an avatar of the god of matter (Kandrax) |
| la Hermandad Errante | the Wandering Brotherhood | the rival party of chapter 2 (Kandrax) |
| Elira Nadira | Elira Nadira | a druid of Simtu and Tigris, the head of the Brotherhood (Kandrax) |
| Kaldor Rompehuesos | Kaldor Bonebreaker | a barbarian of Zid, who follows Elira (Kandrax) |
| Grimhollow | Grimhollow | a settlement that fell to the Raiders (Kandrax) |
| Hondurria | Hondurria | the walled city of the assault (Kandrax) |
| la granja de los Wren | the Wren homestead | new: the fourth homestead, by the pool of the Silvervein |
| Mira Wren | Mira Wren | new: the woman of the Wren homestead |
| la piedra de la ola | the wave stone | new: a carved stone of the shrine; it opens the shrine |
| el santuario de Tigris | the shrine of Tigris | new: the old shrine at the pool of the Silvervein |
| la Lágrima de Tigris | the Tear of Tigris | new: the relic of phase 9 |
| Sela | Sela | new: a Seeker who would not burn a family; the captive of phase 8 |
| sabueso de ceniza | cinder hound | new mob |
| Buscador de Ceniza, adepto de las brasas | Ashen Seeker, cinder adept | new mobs |
| el Celador de Ceniza | the Ash Warden | new: the masked lieutenant of Verath |

**Not approved yet:** "las Tierras Salvajes del Norte" (the Northern Wilds) and "Silverhaven". The
texts say "the far north" until Fede approves them.

## The end of chapter 1: the rest of Q4 `ashes`

The phases 3 to 6 of "Shadows of the Ashen Seekers". Q4 is now at `symbol`: the priest and the
apothecary of Ironhold told what they know of the phoenix.

### Phase 7: the Wren homestead (`ashes.next`, "Race Against Time")

- **The clue.** The priest of Ironhold (at `symbol`) connects the clues: the Seekers search each house
  for old things, and old Hale's black stone came from the old ruins by the river. The Wrens live by
  the pool of the Silvervein, and their children bring carved stones from it. The Wrens are next.
  The step `next` marks the Wren homestead on the map. Intelligence 13 hears more: the stones carry
  the waves of Tigris.
- **The place.** The Wren homestead: a fixed house, whole, with a garden, south-west of the pool of
  the Silvervein. Mira Wren lives there (an NPC for everyone).
- **The race.** When a character at `next` comes within 32 tiles of the house, the Seekers start
  their march from the hills in the east, 40 tiles away, on a burned trail: cinder hounds, and an
  Ashen Seeker who walks behind them (the watcher).
  - Mira gives the wave stone to a character at `next` who warns her (step `stone`). The hounds then
    hunt that character.
  - If the head of the march comes to the house and a character of the party is still at `next`,
    the Seekers take the stone: step `late` for that character, and the march goes. Mira hid in the
    cellar, and she tells it.
  - If the march comes to the house and nobody of the party is at `next` any more, it stays and
    fights.
- **The watcher.** It never fights. It keeps its distance, and it is gone in a puff of ash when a
  character comes within 4 tiles of it or when its hounds fell ("They might glimpse the Ashen Seekers
  from afar but can't engage directly yet"). Its going counts as a fall for the ambush.
- **The end.** All the hounds fell: step `held` (the character keeps the stone). Both `held` and
  `late` point to the tracks: they lead east, into the hills, to the camp of the Seekers.
- **Reward.** `held`: Mira pays a small reward (12 coins and a draught). The cinder hounds drop
  nothing.
- **Built** (2026-10-12). What changed from the plan: the hounds march at 32 px/s (about 23 s from the
  camp end of the trail to the door); alone, a character meets two hounds; Mira takes shelter in her
  house while the race runs, so a character finds her inside.

### Phase 8: the camp of the Seekers and the captive (`ashes.captive`, "Unraveling the Mystery")

- **The place.** The camp of the Seekers: a fixed clearing in the hills east of the Silvervein. Grey
  tents, a phoenix banner, a cold fire, a chest and a post. The Seekers move their camp (the notes:
  "a mobile camp"): this one is half packed.
- **The fight.** For a character at `held` or `late`, Ashen Seekers guard the camp: blades and a
  cinder adept (an ambush in the camp, sized to the party). These are the first Seekers that fight.
  A Seeker that falls crumbles to ash.
- **The captive.** Sela is tied to the post (a variant of the post, as Himo's). She is a Seeker who
  would not burn a family, and the others will judge her. Freed, she talks (step `captive`), with
  gates for more:
  - The Seekers serve a god older than the four gods. The four gods are imposters, they say. Each
    relic that they take or break weakens the four (the notes, "Motivation").
  - Verath Shadowweave leads them. Sela never saw Verath awake, only in dreams.
  - The next target is the shrine of Tigris under the pool of the Silvervein. The wave stone opens
    it.
  - Wisdom 13: she does not know if she is right to talk. Intelligence 13: the Seekers keep a village
    in the far north, where their children grow up (a hook for chapter 2).
  Sela then goes ("I have nowhere to go. North, maybe."). She comes back in chapter 2.
- **The stone.** For a character at `late`, the wave stone is in the chest of the camp (a variant of
  the chest gives it back).
- **A page.** A torn page in the camp (Intelligence gates), from a book of the Seekers: a fragment of
  their prophecy ("fragmentary texts").
- **Built** (2026-10-12). What changed from the plan: the fight starts within 6 tiles of the camp, and
  alone a character meets a blade and an adept; Sela talks at the post (her conversation is on the
  post: the variant of a character at `camp`), and she is gone from it once she is free; the chest
  gives the stone to any character at `camp` or `captive` without one; the margin of the torn page
  names Hondurria (a hook for phase 13).

### Phase 9: the relic of Tigris (`ashes.relic`, "Indirect Confrontation")

- **The place.** The shrine of Tigris at the pool of the Silvervein: old standing stones round the
  pool, and an altar of the old kind at its south edge. The altar has a hollow in the shape of the
  wave stone.
- **The relic.** A character with the wave stone (at `captive`) puts it into the altar: the water of
  the pool draws back, and the Tear of Tigris lies on the altar (an item: a drop of clear crystal in
  silver). The stone stays in the altar.
- **The Seekers.** Then the Seekers come for it: the Ash Warden (the masked lieutenant), blades and
  adepts, sized to the party. The Warden casts, and it fights. At half of its hit points it is gone
  in ash ("This action forces the Ashen Seekers to change tactics"). It drops its orders.
- **The orders.** A letter (an item to read, with gates): the Seekers act in cells; the Shadowweave
  speaks to each cell in dreams; "the bigger towns are next"; "take the Tear back, at any cost". Step
  `relic`.
- **The gift of the Tear.** The wearer of the Tear wades deep water as if it were shallow (the
  Silvervein and the rivers of chapter 2). An item to wear (the neck slot).
- **Built** (2026-10-12). What changed from the plan: the shrine is eight standing stones on the bank
  and an altar on the south bank (no building); the Seekers march for the Tear along the burned trail;
  alone or with one friend, a character meets the Warden alone (its XP fills the budget); the orders are
  an item to read; the Tear needs attunement, as the other amulets.

### Phase 10: the dream (`ashes.dream`, "The Veiled Encounter")

- **When.** A character at `relic` with the Tear sleeps in a bed where it may rest (its home, its room
  at the Crooked Lantern, its bed at the Silver Trout).
- **The dream.** The screen goes dark and ash falls. Verath Shadowweave speaks: a conversation in a
  dream panel, with the portrait of a masked figure. Verath tells a part of the truth: the four gods
  are imposters, they took the place of older gods, and the relics hold the chains. Gates give more:
  Intelligence 13 hears what Verath does not say; Wisdom 13 feels that Verath believes it.
- **The choice** (it ends chapter 1: step `found`, with a flag):
  - **Give** the Tear (flag `gave`): it leaves the pack. Verath keeps the word: the Seekers do not
    hunt the character in chapter 2. The cost: the Tear and its gift, and the Wandering Brotherhood
    distrusts the character.
  - **Refuse** (flag `refused`): Verath says that the Seekers will take it. The cost: the hunters of
    chapter 2 (Seekers that come for the character on the roads of the far north). The Brotherhood
    trusts the character.
  - **Lie**, behind Charisma 13 (flag `lied`): the character promises to bring the Tear north. Verath
    believes it for now: no hunters, and the character keeps the Tear. The cost comes later: at the
    village of the Raiders, Verath knows, and the Warden comes for the character with more Seekers.
- **The end of chapter 1.** The journal closes the Razed Villages. The next morning, a letter from
  Thrain Steelforge waits at the home and at the beds of the refuges: chapter 2 starts.

## Chapter 2: the Arcane Raiders (1.5.x "Aldea salvaje" and "Asalto")

Two quests. Their phases need more decisions from Fede; this part is a plan, not a design.

### Q5 `wild`: the Wild Village (phases 11 and 12)

- **Phase 11, the far north.** A new road north from Silverspring, along the Silvervein to its spring
  and past it, into colder land: snow on the ground, pines, frozen marsh. New beasts. On it,
  **Grimhollow**: a settlement that tried to take the north, and fell to the Raiders. Its burned
  palisade and roofless houses carry the phoenix. There the character meets **the Wandering
  Brotherhood**: Elira Nadira (a druid) and Kaldor Bonebreaker (a barbarian). They hunt the Raiders
  for the relics of Tigris and Simtu.
  - The dream decides how they meet the character: they trust a character who refused or lied (they
    offer to go together: they fight beside it, as guards), and they distrust one who gave the Tear
    (they race it to the village: "collaboration or competition with a rival party").
  - Sela waits at Grimhollow for a character who freed her: she knows the way.
- **Phase 12, the Wild Village.** The origin of the Raiders, hidden further north: a palisade, huts,
  a phoenix totem, and the vault of the stolen relics. The Raiders' families live there ("formed
  from survivors of a hidden community"). The attack is the large fight of the chapter: waves of
  Seekers, and the Ash Warden to the end. The moral choice: Kaldor wants to burn the village, and
  Elira does not; the character decides what happens to its people. The relics of the vault go back
  to the Brotherhood, or to Thrain (the notes: "Thrain Forjacero's Arcane Factory has ulterior
  motives for wanting the relics recovered").

### Q6 `assault`: the Assault on Hondurria (phase 13)

- **The pattern.** The orders of the Warden and the vault of the village show the pattern: the
  Raiders take bigger and bigger towns, each for an old relic. The next is Hondurria.
- **Hondurria.** A walled city at the end of a new road: walls, towers, two gates, a garrison (guards
  that fight), a temple with an old relic, a market. The first fixed city of the game.
- **Ahead of them.** The character gets the relic of the temple out first (an errand with gates in
  the city), and then joins the defence.
- **The assault.** The large fight of the saga plan: waves of Seekers and hired hobgoblins at the
  gates; the garrison on the walls; the Warden or Verath's champion at the end. An event for everyone
  in the city, not for one party: each character near takes part, and each one with the quest gets
  its end.

## Systems to build

- **Mob kinds** (phases 7 to 9): `hound` (the cinder hound: fast, it charges as a worg, a bite that
  burns), `seeker` (a blade: a soldier), `adept` (it keeps away and casts a fire bolt, as a goblin
  shoots), `watcher` (it never fights, and it goes in ash), `warden` (a boss that casts and goes in
  ash at half of its hit points). A mob that goes in ash counts as a fall for an ambush. The art in the
  dark style of the game: ash-grey robes, a mask of bone with a phoenix, embers for eyes.
- **A march that waits** (phase 7): when a band comes to the end of its route and `arrive` applies to
  nobody of its party, the band stays and fights.
- **Variants for an NPC's lines** are not needed: Mira's dialog starts by the step (`Dialog.starts`).
- **An altar** (phase 9): a fixture that takes an item (the wave stone) and gives the relic, with an
  effect (`take` and `give` of a QuestEffect, as the lever of the cart).
- **Wading deep water** (phase 9): an item to wear that lets its wearer wade deep water.
- **The dream** (phase 10): a bed with a variant (`Fixture.variant.content`) that opens a dialog for a
  character at `relic` with the Tear; the page shows the dream panel (dark, ash, the portrait of
  Verath); the server checks the effects of the dream as it checks the effects of a thing.
- Later (chapter 2): the north biome, the second road north, Grimhollow, the Brotherhood as guards
  that follow a character, the village, Hondurria and its walls, an assault event for a city.

## Phases

Each phase is built, tested, documented in `docs/features/` (the REQ/AC format) and deployed before
the next one.

7. The Wren homestead, the cinder hounds and the watcher (Q4 `next`, `stone`, `held`, `late`).
8. The camp of the Seekers, the Seekers that fight, Sela, the page (Q4 `camp`, `captive`).
9. The shrine of Tigris, the Tear, the Ash Warden, the orders (Q4 `relic`).
10. The dream of Verath and the end of chapter 1 (Q4 `found`, with the choice).
11. The far north, Grimhollow and the Wandering Brotherhood (Q5) — after Fede's answers.
12. The Wild Village (Q5).
13. Hondurria and the assault (Q6).

## Open (for Fede, before phase 11)

- The names "the Northern Wilds" (las Tierras Salvajes del Norte) and Silverhaven.
- Does the character ever meet Verath awake in chapter 2, or only in dreams?
- Hondurria: where its road starts (Ironhold, Silverspring or the far north), and how large the city
  is.
- The Brotherhood: Illyndra Umber (a drow wizard) is the third member in Kandrax. Use her too?
