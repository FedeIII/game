# The road to Ironhold: the tutorial (draft)

> **Draft** · promotes to `docs/features/` when built · **Status:** Fede answered on 2026-10-13
> (below). Built: level 1 (`docs/features/game/combat.md`), the tips (`docs/features/game/tips.md`),
> the goblins (REQ-CMB-009), the geography and the hamlets (`docs/features/game/towns.md`,
> REQ-TWN-006), and the quests (`docs/features/game/quests.md`, REQ-QST-026 and 027).

The first quest of the game takes a new character from its hut to Ironhold. On that road the game
teaches its basics: the controls, combat, conversations, quests, and the hut as the place where the
character rests and wakes. The road follows the journey of chapter 1.5.1 of the saga.

## Fede's decisions

- **The first quest is to reach Ironhold** (2026-10-13). It is the tutorial: from the hut to the town.
- **No chains of quests in what the player sees** (2026-10-13; `docs/game-design.md`): events unlock
  quests, and some events happen only after another quest is finished.
- **The hut is south of Ironhold, near the northern edge of the Iron Sovereignty** (2026-10-12). Built
  (phase 1); the story as built is in `docs/story/`.
- **The only enemies of the tutorial are goblins in the forest** (2026-10-13): no imps, no brutes.
  The goblins patrol, and the player startles them: some flee, some attack. The player can follow a
  goblin that flees, and runs faster than it. They are weak: an easy match.
- **Combat: few enemies, very strategic fights** (2026-10-13; `docs/game-design.md`).

## The source: chapter 1.5.1, [A.2] "Picos de Poniente ⇒ Ferrozar"

Read it live on the Drive (`Sagas/Dioses Olvidados/Capítulos/1.5.1 - Pueblos Arrasados`). No other
document of the Drive names Arboleda Blanca or Bronzal (searched 2026-10-13: `RPG`, the summaries and
the script of the parties, `1.0`, `Lugares/`, `Personajes/`). In short:

- **The land.** After the canyon of the Western Peaks, long hills that go down little by little. The
  Argén winds east through meadows, from a far forest. The road leaves the river and goes north-east
  among the hills.
- **The broken cart, before Arboleda Blanca.** A merchant tries to mend his cart by himself. He goes
  to Ferrozar to judge a trade between Ferrozar and Silverspring. Reward: 20 gp. He knows (DC 14; 10
  if the party helped him): the Sovereignty and the Enclave compete for the wildlands between them,
  with tactics of doubtful morals; Silverspring needs the weapons and tools of Ferrozar, and Ferrozar
  wants the mithril of Silverspring.
- **Arboleda Blanca.** A farmer at a market stall waits impatiently for that merchant. He asks the
  party to take 30 kg of lentils to the next village, Bronzal (buy at 1 gp 2 sp, sell at 1 gp 5 sp).
- **Bronzal.** Its guards know (DC 14; 10 with the lentils): the Sovereignty brings reinforcements
  and settlers from the central cities to claim new land towards the wildlands; lately it expands
  hard towards the Enclave, towards Silverspring.
- Then [A.3] "Ferrozar ⇒ Silverspring": the game has it (the hobgoblin raid, the caravan).

The game has the merchant and his cart already (the quest `cart`).

## The route, and what each stop teaches

English names from the table of `docs/drafts/story-razed-villages.md`: Arboleda Blanca is Whitegrove,
Bronzal is Bronzehold.

| Stop | What happens | What it teaches |
|---|---|---|
| **The hut** (the start) | The letter on the table starts the quest "The road to Ironhold". The bed: "Here I rest. If I fall, I wake here." | Walk; the action (E, the action button); read; the quest banner and the journal (L); rest; the hut as the save point |
| **The forest north of the hut** | Goblin patrols (below). | Sneak (C); attack; dodge a wind-up; a miss (AC); drink (a healing draught in the starting pack); loot and a pile to pick up; the map (M) |
| **The broken cart** (before Whitegrove) | The merchant (the quest `cart`, a quest of its own). | A conversation (choose, answer, end); an ability gate (STR 13 lifts the cart); an optional quest |
| **Whitegrove** (Arboleda Blanca) | A hamlet: a few houses, the farmer's market stall, a shrine. The farmer offers the lentils for Bronzehold (a quest of its own). | A deal (buy, sell); a heavy item (the sack of lentils takes several slots of the pack: Strength); a refuge (the shrine: wake here after a defeat once it is entered) |
| **Bronzehold** (Bronzal) | A hamlet with a post of the guards of the Sovereignty. | Lore behind a gate (insight or persuasion, or easier with the lentils); the delivery pays |
| **Ironhold** (a new south gate) | The quest ends (its banner). Its end unlocks Elama Rothenel's quest (`ashes`): she gives it in a conversation. | A quest that ends; an event that waits for a finished quest |

## The goblins of the tutorial

- **Patrols.** Groups of 2 or 3 walk a loop of waypoints through the forest, not a random wander.
- **Startled.** When one sees the player, the group stops, and a "!" shows over their heads for about
  0.6 s. Then each decides: about half flee, the others attack.
- **Flee.** A goblin that flees runs away from the player at about 0.8 of the player's speed, so the
  player catches it. Caught (the player in reach), it turns and fights. Not caught, it hides and goes
  back to its patrol after about 10 s.
- **Attack.** In melee only (no arrows in the tutorial), one at a time (the turns of `Horde`), with a
  slow and clear wind-up, so that a new player sees it and dodges.
- **Weak** (a proposal, for the level question below): 5 HP, AC 12, +3 to hit, 1d4+1 damage, wind-up
  0.7 s. Loot: a coin or two, now and then a crude dagger.
- **Where.** The forest between the hut and Ironhold, at the edge of the Sovereignty, has only goblin
  patrols, and so has the land round Ironhold (`FOREST_EDGE_Y` is the north edge of Ironhold, Fede,
  2026-10-13); imps and brutes keep the wildlands north of Ironhold. The world is shared, so the area
  decides, not the quest of each player.

## Tips (a new system)

A small hint in the GUI style, the first time of each thing: the first step, the first thing in
reach, the first goblin, the first wind-up, the first hit taken, low health, the first conversation,
the first quest, the first pile, the first deal, the first defeat. The text names the keys on a
keyboard and the buttons on a touch screen. Each tip shows once; "Settings" in the menu has a switch
to show the tips again.

## Phases (each one ships by itself)

1. **The geography.** The hut moves south of Ironhold (`HOME_CELL`); Ironhold gets a south gate; the
   road goes from the hut by Whitegrove and Bronzehold to the gate; the signpost moves; the burned
   homesteads move into the wildlands. Tests: the road, the gates, the places reachable.
2. **The hamlets.** Whitegrove and Bronzehold with the town builder (`towns.ts`): small plans, the
   farmer, the guards, their texts in English and Spanish.
3. **The goblins.** Patrols, the startle, flee or fight, the goblin-only forest. Tests through the
   `Horde`.
4. **The quests.** "The road to Ironhold" (from the letter to the south gate), Elama's quest that
   waits for it, the lentils, the cart before Whitegrove.
5. **The tips**, and their switch in the settings.

## Fede's answers (2026-10-13)

1. **Level 1.** Characters start at level 1; a system to level up comes later, not now. What was for
   level 3 is for level 1 (hit points, sneak attack, the encounter budget). The goblins are about as
   the SRD (AC 15, 7 HP, +4, 1d6+2).
2. **Through both hamlets.**
3. **The burned homesteads move into the wildlands north of Ironhold.**
4. **The farmer of Whitegrove lends a lever** for the cart; the smith's lever stays as another way.

## Questions for Fede (answered above)

1. **The level.** Fede said "weak for level 1", and the game is at level 3 since 2026-10-11
   (`docs/drafts/level-3.md`). Do characters keep level 3 (then the tutorial goblins are weaker than
   the goblins of the SRD), or do they start at level 1 and level up (a new system: experience, hit
   points and features by level)?
2. **The length.** Does the road go through Whitegrove and Bronzehold (the hut south of Whitegrove: a
   longer tutorial with deals, a delivery and a refuge), or is the hut between Bronzehold and Ironhold
   (a short tutorial; the hamlets later)?
3. **The burned homesteads** (Hale, Marrow, Tanner) are round the hut now. Do they move into the
   wildlands north of Ironhold?
4. **The cart.** Without Strength 13, the merchant needs the lever of the smith of Ironhold. With the
   cart before Ironhold, does the character come back with the lever later, or does the farmer of
   Whitegrove lend one?
