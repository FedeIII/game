# The Razed Villages: the first story of the game (draft)

> **Draft** · promotes to `docs/features/` (one document for each system) when built ·
> **Status:** Phases 1 to 3 built (2026-10-11: `docs/features/game/language.md`,
> `docs/features/game/quests.md`, `docs/features/game/combat.md`); phase 4 built
> (`docs/features/game/towns.md`, REQ-QST-013 to 016, REQ-CMB-007); phase 6 built (REQ-QST-017 and
> 018); phase 5 built (REQ-QST-019 to 021, `docs/features/npcs/guards.md`)

This draft plans the first story of the game and the systems that it needs. The story comes
from **Kandrax**, the D&D world of Fede: chapter 1.5.1, "Pueblos Arrasados", route [A]. It also
uses the Arcane Raiders of the saga plan and the Ashen Seekers of the `RPG` notes. The systems
are quest state, conversations with conditions, overheard scenes, world events, new mobs, new
places and a second language.

**The Drive is the source of the story, not this file.** Read the documents live (`CLAUDE.md`,
"Lore: Kandrax, on Google Drive") before you build a quest. This draft keeps only the design and
the names:

- `Sagas/Dioses Olvidados/Capítulos/1.5.1 - Pueblos Arrasados`: route [A] "Interior" (A.1 the
  canyon of the Picos de Poniente, A.2 the road to Ferrozar, A.3 Ferrozar to Silverspring, with the
  quests "Incursión Hobgoblin" and "Asalto a la Caravana").
- `Sagas/Dioses Olvidados/1.0 - Saga de los Dioses Olvidados`: section 1.5, "Los Saqueadores
  Arcanos" (quests 1.5.1, 1.5.x "Aldea salvaje", 1.5.x "Asalto").
- `RPG`, section "CONTEXTO IA", "Gang of Raiders": the Ashen Seekers, Verath Shadowweave, and the
  six phases of "Shadows of the Ashen Seekers".

The plan in `1.0` gives other places for 1.5.1 (Grimhollow, Saxum, Hondurria), and the text of
1.5.1 does not show the raiders. This draft uses the places of route [A] and the Ashen Seekers as
the thread that connects the quests.

## Decisions

- **Quest state for each character** (Fede, 2026-10-11). The server keeps it with the character.
  Quest mobs come for the player at that step; other players see them and can help.
- **English names that translate the Spanish names of Kandrax** (Fede, 2026-10-11). Thornwick
  takes the English name of Ferrozar. A language setting gives Spanish, with the Spanish names of
  Kandrax.
- **Mobs enter a town only during an event** (Fede, 2026-10-11). The rule "a mob never steps into
  a town" stays for every other mob.
- **The start of the game follows route [A]** (proposed 2026-10-11). Routes [B] (by sea) and [C]
  (along the coast) need ships, large cities, escorts and politics between towns. They stay for
  later chapters.

## The frame

- **The Wilds** are the wild frontier between the **Iron Sovereignty** and the **Mithril
  Enclave**. Both powers compete for this land, and neither one plays fair.
- **Ironhold** (Thornwick until 2026-10-11; Ferrozar in Kandrax) is the frontier village of the Sovereignty,
  west of the home. Its plan, its buildings and its ten NPCs stay. The reeve (alguacil) is the
  head of the village; the watchman at the gate is a soldier of the Sovereignty.
- **Silverspring** is the mithril village of the Enclave, a new fixed town north-east of
  Ironhold, at the end of a new road.
- **The razed villages:** the Ashen Seekers burn homesteads of the Wilds. They look for relics of
  the old civilizations. Some houses of the Wilds are ruins with their mark, a phoenix.
- **The hook:** a letter from Thrain Steelforge (Forjacero) on the table of the home. Thrain asks
  the character to find out who burns the homesteads. In the saga plan, Thrain is the NPC of
  1.5.1.

## Names

Each name has an English form and a Spanish form. The Spanish forms are the names of Kandrax.
The English forms translate them. **Fede confirmed the English names below (2026-10-11).**

| Kandrax (es) | Game (en) | Notes |
|---|---|---|
| Kandrax | Kandrax | |
| las Tierras Salvajes | the Wilds | the name of the world stays |
| las Tierras Salvajes del Norte | the Northern Wilds | the prologue (Fede, 2026-10-12): the Wilds are north of the Human Dominions and south of the Elven Dominions; the land between the Sovereignty and the Enclave is unclaimed, lawless land, not the Wilds |
| las tierras salvajes (a common noun) | the wildlands | the unclaimed, lawless lands between the Sovereignty and the Enclave, where the hut, Ironhold and Silverspring are: Thrain's letter says "the wildlands north of the Iron Sovereignty" (Fede, 2026-10-12) |
| las Columnas de Plata | the Silver Pillars | a mountain range; the map of the prologue (Fede, 2026-10-12) |
| el Bosque Céfiro | the Zephyr Wood | a forest; the map of the prologue (Fede, 2026-10-12) |
| Puerto Eluviano | Port Eluvian | a port; the map of the prologue (Fede, 2026-10-12) |
| la Soberanía del Hierro | the Iron Sovereignty | |
| el Enclave del Mithril | the Mithril Enclave | |
| los Dominios Centrales | the Central Dominions | |
| Ferrozar | Ironhold | the town of the game (Thornwick until 2026-10-11) |
| Silverspring | Silverspring | English in Kandrax too |
| Bronzal | Bronzehold | a later place |
| Arboleda Blanca | Whitegrove | a later place |
| los Picos de Poniente | the Western Peaks | a later place |
| el Argén | the Argen | a river |
| Bahía del Hierro | Iron Bay | |
| Thrain Forjacero, la Fábrica Forjacero | Thrain Steelforge, the Steelforge Factory | `forja` + `acero`: forge, steel |
| Elama Rothenel, la alguacil | Elama Rothenel, the reeve | takes the place of "Aldous, the reeve" (Fede, 2026-10-11) |
| Kasmut Parnika | Kasmut Parnika | the veteran of the Enclave in Silverspring |
| el río Vena de Plata | the Silvervein | the river of Silverspring (Fede, 2026-10-12: use the names) |
| Gran Bwini | Great Bwini | the capital of the Mithril Enclave |
| Simtu | Simtu | the god of nature, water and the woods (an avatar of the god of matter) |
| Himo, Brys | Himo, Brys | the scouts of Ironhold |
| los Saqueadores Arcanos | the Arcane Raiders | |
| los Buscadores de Ceniza | the Ashen Seekers | English in the `RPG` notes; Spanish form proposed |
| Verath Shadowweave | Verath Shadowweave | the same in both |
| hobgoblin, osgo, huargo, goblin | hobgoblin, bugbear, worg, goblin | |
| Hobgoblin Devastador | Hobgoblin Devastator | |
| Pueblos Arrasados | The Razed Villages | the story |
| Incursión Hobgoblin | The Hobgoblin Raid | quest |
| Asalto a la Caravana | The Caravan Ambush | quest |

Every other name of the game also gets a Spanish form, in the same tables as the texts (for
example the Crooked Lantern: el Farol Torcido).

## The quests

A quest has an id and steps. A step has an id, a text for the journal, and what moves it on.
The rewards follow the economy of the game (a chest gives 1 to 15 coins), not the gold pieces of
the chapter: Fede tunes them.

### Q0 `letter`: the letter (the hook)

- The letter is on the table of the home. To read it starts the quest `ashes` (Q4), step
  `ashes.letter`.
- The letter points to the reeve of Ironhold. Thus the first trip of every character goes to the
  town.

### Q1 `cart`: the broken cart (the tutorial)

- A merchant stands by a broken cart on the road from the home to Ironhold. The merchant goes to
  Ironhold to trade between Ironhold and Silverspring.
- Two ways to help: lift the cart (gate Strength 13), or bring a tool from the smith of Ironhold
  (any character). Thus a weak character also has a way.
- Reward: coins. With the cart fixed, the merchant tells more (Intelligence 13 or Charisma 13
  give more lines): the Sovereignty and the Enclave fight for the Wilds; Silverspring needs the
  tools of Ironhold; Ironhold wants the mithril of Silverspring.
- It teaches a conversation, a gate, an errand and a reward.

### Q2 `raid`: the Hobgoblin Raid (the main quest)

1. `raid.heard`: the first time that the character comes near the house of the reeve (after
   `ashes.letter`), the scene "the argument" plays: the reeve, a villager and a guard argue.
   Hobgoblins go through the hills to Silverspring. They took the scout Himo; the scout Brys
   escaped. The villagers want to warn Silverspring; the soldiers refuse. A higher Wisdom hears
   more of it (gates, see "Scenes").
2. `raid.asked`: the reeve asks the character to warn Silverspring. Ironhold cannot pay. The
   watchman tells the character to stay out of it (the soldiers want Silverspring to fall).
3. `raid.scouts`: on the road to Silverspring, in **the grove**, the scouts ambush the character:
   a hobgoblin and a bugbear on worgs, each with a goblin behind it. The goblins get off and
   shoot; the worgs charge. Loot: coins and badger furs.
4. `raid.band`: the war band, with the **Hobgoblin Devastator**. The character can catch it in
   the grove, or follow its tracks.
   - If the band dies before it comes to Silverspring, Himo is free in its camp. The character
     escorts Himo home to Ironhold (a companion: `docs/drafts/companions.md`; Fede, 2026-10-11).
     The family of Himo pays a reward in Ironhold. If the mobs on the way defeat Himo, Himo is
     dead, as in the other ending.
   - If the band comes to Silverspring first, the event "the raid on Silverspring" starts (see
     "World events"): the hobgoblins attack the town. Himo is dead.
5. The end: Silverspring gives the character a title in its guard (`raid.title`) and lodging (a
   refuge: a bed in the town). If Himo lives, Silverspring also gives a permit to buy mithril at
   cost (`raid.permit`), which a character can sell at a higher price in Ironhold.
- Later (needs companions): two soldiers of Ironhold offer to come. They warn the scouts, and in
  the fight they turn on the character.

### Q3 `caravan`: the Caravan Ambush (the hidden quest)

1. `caravan.heard`: in Ironhold (in the inn, after `raid.asked`), the scene "the plot": a guard
   and a villager plan to send the hobgoblins against a caravan of Silverspring. The plan comes
   from the Sovereignty, and the cargo is the pay of the men who do it. The chapter has three
   lines at three difficulties; in the game, a higher Wisdom hears more of them (Wisdom 15: all
   three; 13: two; less: the last one only).
2. `caravan.road`: a character who heard where the attack will be can go there. The caravan (a
   wagon, two horses, two militia of the Enclave) walks the road from Silverspring. The scouts
   and then the raiders attack it.
3. The choice:
   - `caravan.saved`: defend it. The Enclave thanks the character (coins, a healing draught).
   - `caravan.robbed`: take its cargo (furs, spices, a small chest of mithril nuggets). The
     character becomes **wanted** by the Sovereignty and the Enclave: their guards and traders
     refuse to deal with it, and they do not attack it (Fede, 2026-10-11).

### Q4 `ashes`: the Razed Villages (the thread)

The six phases of "Shadows of the Ashen Seekers" in the `RPG` notes, in the Wilds:

1. `ashes.ruins`: find three ruins. Each has the phoenix mark, ash and burned furniture. Some have
   a survivor who saw only shadows. Intelligence 13 reads more in the mark (old magic, a power
   older than the gods); Wisdom 13 calms a survivor.
2. `ashes.symbol`: the priest of the chapel of Ironhold and the apothecary know old stories of the
   symbol (Intelligence gates). Rumours of the Ashen Seekers start, and they contradict each
   other.
3. `ashes.next`: the clues point to the next homestead. The character must come first (a small
   event at a named homestead).
4. `ashes.captive`: a captive of the Seekers in a hobgoblin camp of the hills (it can be the camp
   of Q2) tells what the Seekers want.
5. `ashes.relic`: take a relic before the Seekers do.
6. `ashes.dream`: when the character sleeps (the bed of the home or of the inn), Verath
   Shadowweave speaks to it in a dream. The end of chapter 1; the next chapter starts from it.

Phases 3 to 6 are a later stage; their details come from the Drive when we build them.

### Later chapters

- **A.1, the Western Peaks:** the sabre-tooth that an ogre's javelin kills in mid-air; the wild
  horses, the stampede (a Dexterity gate decides the damage) and the griffons, with a nest to
  climb (Strength and Dexterity gates; a griffon egg, a heavy item). They need a mountain and
  canyon terrain.
- **A.2, the road:** the lentils for Bronzehold (a delivery: the weight uses the slots of the
  pack, from Strength), Whitegrove.
- **Route [C]:** the Lost Temple (three clues, the Great Oak, the standing stones) is a good
  exploration quest for a procedural world.

## Systems to build

### S1 Quest state (engine and server)

- `packages/engine/src/quests.ts`: `QuestDef` (id, steps, the first step), `QuestStep` (id,
  journal text key, what it gives), and `QuestBook`, the state of one character:
  `{ [quest]: { step, flags, at } }`. `checkQuests()` checks a book, as `checkPack()` checks a
  pack. Pure data, so a world tests its quests.
- The store: a new step at the end of `MIGRATIONS` in `packages/engine-server/src/store.ts`,
  `ALTER TABLE characters ADD COLUMN quests TEXT;` (JSON). `setQuests()`; `checkQuests()` on the
  way in and on the way out, as for the pack.
- The Room: `Room.join(..., { traits, pack, quests })`. The server owns the book. It sends the
  book of each player to that player only (a new message, protocol 19), and it saves the book
  after each change. It never sends the book of a player to another player.
- An effect (start a quest, move it to a step, give a reward) goes through the server, as a deal
  does (`Room.deal`): the client asks, the server checks the step, the gates and the nearness of
  the NPC or the place, and then it changes the book and the pack.
- A world that the page runs (`?offline`, for tests) keeps its book in the page, with the same
  rules. There are no guests: every visitor signs in and plays a stored character (Fede,
  2026-10-11; `?nomenu` gives a guest only on a page of the developer's machine, for tests).

### S2 Conversations with conditions and effects

- `DialogAnswer.when` (a condition: a quest at a step, a flag, or no quest) and
  `DialogAnswer.effect` (an effect id of S1). `Dialog.starts`: the first node for each
  condition, so an NPC greets a character by its step.
- The conversation stays without state in the engine. The server checks each effect again
  (as for deals).
- `checkDialog()` also checks the conditions, the effects and the length of the texts in each
  language.

### S3 Scenes (overheard talks)

- `SceneDef`: an id, an area of tiles, the step that starts it, and the lines in order (an NPC
  and a line key, with an optional gate). The NPCs of the scene stand still and say the lines
  one after the other, in their bubbles.
- A scene is personal: the server sends it to the player at that step only. Other visitors see
  only the normal lines of those NPCs.
- A line behind a gate shows as a murmur ("…") under the gate, and with its gate tag when the
  score is 1 or 2 under it (`gateView()`, as for all gates).

### S4 World events (mobs in a town only during an event)

- `EventDef`: an id, a target (a town and the area round it), the waves of mobs (kinds and
  counts), where they come from, a time limit, and the results (all mobs dead: the defence wins;
  the time limit: the town loses).
- The Room runs the events. A quest effect starts one (for example `raid.band` at Silverspring).
  If another player reaches the same step while the event runs, that player joins it. One event
  for each town at a time.
- The mobs of an event carry its id. They can step into the target town (`MobRules.hunt` of the
  event). All other mobs keep the town rule, and a test checks it.
- During an event, the NPCs of the town go into their buildings, and a banner shows the event to
  the players near it (protocol). The quest result goes to the players with that quest step;
  everyone gets the loot of the mobs that they kill.

### S5 New mobs

- The **goblin**: small, shoots arrows from a distance and keeps away (the arrows of the ranger
  are in `render/arrows.ts`).
- The **worg**: fast, charges in a straight line. A goblin can ride one: the pair is two mobs;
  the goblin gets off when the pair sees the player.
- The **hobgoblin**: a soldier, stronger than a brute, in a group.
- The **bugbear**: a brute of the hobgoblin band.
- The **Hobgoblin Devastator** (boss): its spell of 4 turns becomes a long wind-up (about 6 s)
  with a circle on the ground. Each blow breaks a part of it, as a blow breaks the wind-up of a
  brute now. If it ends, the hobgoblins in the circle hit harder for a time.
- `MOB_STATS`, loot (badger furs, a splint armour, the hobgoblin luck amulet), art in the dark
  style of the game, a new protocol version.
- Later: the sabre-tooth, the ogre, the griffon, the wild horses (A.1).

### S6 New places

- **Silverspring:** a fixed town plan, as Ironhold has (`TOWN` and `MAP` in `town.ts`), north-east
  of Ironhold. Kasmut Parnika and other NPCs. A refuge (a bed) for the title of Q2.
- **The road to Silverspring:** as `road.ts`, from Ironhold.
- **The grove:** a fixed wooded part of that road, for the ambushes of Q2 and Q3.
- **The hobgoblin camp:** a fixed place in the hills; Himo is in it.
- **The ruins:** a share of the houses of the Wilds are burned (from the seed, and more of them
  far from the home): burned walls, no roof, ash, the phoenix mark. The world is shared, so the
  ruins are the same for every player; the step of each character decides what its clues and
  survivors say.
- **The convoy (Q3):** an NPC group that walks a road from one end to the other. Mobs must be able
  to attack NPCs, and NPCs need hit points: new in the engine.

### S7 Language: English and Spanish

- `Lang = 'en' | 'es'`. A "Language" choice in the settings panel, kept in localStorage
  (`game.lang.v1`); `?lang=es` for tests. Without a choice, the game uses the language of the
  browser: Spanish when `navigator.language` starts with `es`, else English (Fede, 2026-10-11).
- Engine texts: `STRINGS` in `packages/engine-client/src/ui/strings.ts` becomes one table for each
  language, with the same keys. A type and a test make sure that no key is missing.
- World texts: every text of a world (names, `examine`, item names, signs, lines, dialogs, the
  intro, place names, quest texts) goes into a text table of the world, for example
  `worlds/wilds/src/text/en.ts` and `es.ts`; the content refers to keys. A test checks that both
  tables have the same keys.
- The server sends ids, not texts (the lines already go as two numbers: `b` in the snapshot).
  Quests, scenes and events do the same.
- The character builder and the menu: the names of races, classes and abilities in Spanish (the
  Spanish names of D&D 5e).
- The font: the pixel font has á é í ó ú ü ñ ¿ ¡. A capital loses its accent (`plainCode()` in
  `render/pixel-text.ts`), and name tags use capitals only. A Spanish text is about a quarter
  longer: the conversation panel and the bubbles need a check in Spanish.
- The rename: Thornwick becomes Ironhold (Ferrozar in Spanish) in `TOWN_NAME`
  (`worlds/wilds/src/town.ts`), the signpost, the dialogs, the tests and the documents (about 20
  files).
- Code, comments and documents stay in English (Simplified Technical English).

### S8 The journal

- A "Journal" panel of its own, with a button at the top right as the map has (Fede, 2026-10-11):
  the open quests with the text of their step, and the done
  quests.
- A short banner when a quest starts, moves on or ends (as the band of the arrival intro).
- The map panel (`ui/map-panel.ts`) marks the place of the current step.

## Phases

Each phase is built, tested, documented in `docs/features/` (the REQ/AC format) and deployed
before the next one.

1. **Language and names** (S7; built 2026-10-11). First, so that every later text is in both
   languages from the start, and the rename does not touch new code. The world's content stays in
   English, and a table gives the Spanish (`WorldDefinition.texts.es`, `tw()`): the content needs no
   keys.
2. **Quests and conversations** (S1, S2, S8), with Q0 (the letter) and Q1 (the broken cart). The
   small quests test the whole chain: a step, a gate, an effect on the server, a reward, the
   journal. Built 2026-10-11 (protocol 23). What changed from the plan: the book goes in the
   snapshot (`qs`), not in a message of its own; Q4 has a step `reeve` after `letter` (the reeve
   tells of the three burned homesteads); the merchant has no name (the chapter gives none); the
   reward is 10 coins (the chapter: 20 gold); the cart has a lantern, and no mob comes within 4
   tiles of it, so a character can talk to the merchant in peace.
3. **The hobgoblins** (S3, S5 without the Devastator, the road and the grove of S6), with Q2 up to
   `raid.scouts`. Built in three parts: 3a, the scenes (S3), the argument and the reeve's request
   (`raid.heard`, `raid.asked`; built 2026-10-11, protocol 24); 3b, the new mobs (built
   2026-10-11, protocol 25: the goblin shoots arrows that hit players, the worg charges straight;
   none of the band roams the woods); 3c (built 2026-10-11, protocol 27): the north road to
   Silverspring (about 250 tiles, Fede's choice), the grove, the riders (Fede's choice: build
   them), and the ambush of the scouts sized to the characters there (docs/drafts/level-3.md: Fede's
   level-3 decisions came first). In 3a, the guard of the scene is a soldier
   of the Sovereignty in the reeve's house, not Brann (Brann says that he is the whole town watch),
   and a villager stands with them; neither has a name. The soldier, not Brann, tells the character
   to stay out of it.
4. **Silverspring and the raid** (S4, the Devastator, Silverspring and the camp of S6), with the end
   of Q2. In four parts. 4a (built 2026-10-11): Silverspring, a fixed town at the end of the north
   road, made with the builder of Ironhold (`towns.ts`); Kasmut Parnika and four other people; a
   character at `raid.asked` or `raid.scouts` warns her (no step yet). The Drive tells little of the
   town (`Kandrax - Mundo`, 2.2.1.5: a village that pans mithril in the river that crosses it,
   defended by a militia of volunteers that a veteran of the Enclave advises), so the game gives it a
   river. Since 2026-10-12 (Fede: "use them all") the river is the Silvervein (el río Vena de Plata),
   and it crosses the town from a spring in the hills to a pool in the south (`river.ts`); Kasmut is
   openly cynical of Simtu, and she left Great Bwini (Gran Bwini). 4b to 4d (built 2026-10-11, protocol 29): the war band marches on the north
   road for each party at `raid.scouts` (Fede's choice: "Band walks the road"); the Hobgoblin
   Devastator's spell of 4 turns is a rite of 6 s with three runes that blows break, and it makes the
   weapons of the hobgoblins burn (Elemental Weapon). The band falls on the road: Himo is tied to a
   post in its camp (Fede's choice: off the north road, between the grove and Silverspring), and he
   follows the character home to Ironhold (his family pays 20 coins; if he falls, he dies). The band
   reaches the gate first: it raids Silverspring (its mobs go into the town, the people take shelter;
   no event banner for the players near, only the quest banner of the party). Kasmut gives the title
   in the guard of Silverspring and Tova a bed at the Silver Trout (a refuge); for the early ending
   also the permit of Silverspring: the jeweller sells mithril at cost (5 coins), and the smith of
   Ironhold buys it (10). What changed from the plan: the permit goes with the early ending (the
   chapter), not with Himo's life; the war band is the Devastator with five hobgoblins and a bugbear
   (the chapter does not count it), sized to the characters there; a band that loses its party marches
   on, and a band that comes to the gate goes from the world and comes back as the raid when a
   character at `raid` comes near the town. Two soldiers who turn on the character (needs companions
   that fight) stay for later.
5. **The caravan** (the convoy of S6), with Q3. Fede's decisions (2026-10-11):
   - **Attackers:** if the character has not killed them yet, the scouts and the war band of Q2 attack
     the caravan (the chapter); if it has, other hobgoblins of the clan attack it. The story and the
     rewards follow each case (the scouts and the band that fall at the caravan move Q2 on too).
   - **The caravan walks the road** from Silverspring: a wagon and two militia of the Enclave with hit
     points. The mobs attack them; if all of them fall, the cargo is lost.
   - **Robbery:** the character must fight the two militia too, so NPCs that fight are new in the
     engine (militia that fight the hobgoblins, and a character who attacks them).
   - **Wanted:** a robber is wanted (guards and traders of both towns refuse to deal, and do not
     attack it) until it pays a fine to the reeve of Ironhold or to Kasmut.
   Built 2026-10-11 (protocol 31). The militia and the wagon are guards: NPCs with the bodies of players
   that walk a route and fight. The caravan meets its attackers at four fifths of the north road; the
   driver of the wagon talks, and "Hand over the cargo." makes the character an outlaw. The fine is 60
   coins; the reward of a saved caravan 15 coins and a draught; the cargo 20 coins, 3 badger furs and 5
   nuggets of mithril (Fede tunes them). Only the mobs of the story hunt the guards: the beasts of the
   woods do not decide the story.
6. **The ruins** (the ruins of S6), with Q4 up to `ashes.symbol`. Built 2026-10-11 (protocol 30).
   What changed from the plan: three fixed burned homesteads (the reeve's "three homesteads"), not a
   share of the houses of the seed, so that the map can mark each one: the reeve names the first, and
   the tracks at each one lead to the next (Hale, Marrow, Tanner). A survivor lives at two of them (an
   NPC, so the steps of other characters do not change it). The houses of the seed stay as they are;
   more ruins can come later.

Later: the rest of Q4, A.1 with a mountain terrain, and the next chapters.

## Open

Decided on 2026-10-11: the names of the table, Elama Rothenel as the reeve, and the language of
the browser as the default.

Decided on 2026-10-11 too:

- **Wanted:** the guards and the traders of both towns refuse to deal with a wanted character, but
  they do not attack it.
- **Reward items:** an equipment system with the slots of 5e (`docs/drafts/equipment.md`, built).
  The splint armour and the luck amulet are items to wear; the story only has to give them.
- **No guests:** every visitor signs in to play. Thus every player has a quest book.
- **Himo:** the character escorts Himo home. The companion system (NPCs that follow a player) is
  planned in `docs/drafts/companions.md`, and it comes before the story.
- **The journal:** a panel of its own, with a button at the top right.

Nothing is open now. (Phase 5's questions were answered on 2026-10-11: see the phase.)
