# Quests and the Journal

## Overview

A quest is a thing that a world asks of a character, in steps. Each character has a quest book: the
step that it is at in each quest that it started. Answers in conversations and things that a
character reads move the quests on, and they can take items and give a reward. The server keeps
the book with the character and checks every change. The journal shows the quests, a banner shows
each change, and the map marks where to go. A character can also overhear a scene: NPCs who talk
among themselves. The first story of the Wilds starts with a letter from Thrain Steelforge on the
table of the home; its first errand is a merchant's broken cart on the road to Ironhold, and in the
reeve's house the character overhears that hobgoblins go to Silverspring (chapter 1.5.1 of Kandrax;
plan: `docs/drafts/story-razed-villages.md`, phases 2 to 4). On the road to Silverspring, the scouts of
the hobgoblins wait in a grove; their number follows the characters there (`docs/features/game/combat.md`).
Then their war band marches on Silverspring. If the character stops it on the road, it frees the
scout Himo in the band's camp and takes him home; if the band comes to the town first, it raids the
town. Either way Silverspring gives the character a title in its guard. In the Crooked Lantern, a
character can also overhear a plot against a caravan of Silverspring: it defends the caravan, or it
robs it and is wanted until it pays a fine.

## Terminology

- **Quest book**: the quests that a character started, each with its step, its flags and the order
  of the changes.
- **Step**: a stage of a quest, with a line for the journal. A step can end the quest.
- **Effect**: what an answer or a thing does to a quest: it starts it or moves it to a step, and it
  can set a flag, take items and give coins and items.
- **Condition**: a quest at some steps (or started at all), or an item in the pack; or the opposite
  of one.
- **Open quest**: a quest at a step that does not end it. **Done quest**: one at a step that ends it.
- **Scene**: a talk that a character overhears, in an area, at a step; its NPCs say its lines.

## Requirements

### REQ-QST-001: A quest book for each character

**User Story:** As a player, I want my character to remember what it does for the people of the
world, so that the story goes on where I left it.

**Acceptance Criteria:**
- **AC-QST-001.1:** A new character has an empty book. The book of a stored character comes back
  when it plays again, in a shared world.
- **AC-QST-001.2:** Only the server changes the book of a character in a shared world. It sends the
  book to the player of that character, and to no other player.
- **AC-QST-001.3:** After each change, the server saves the book and the pack together, at once.
- **AC-QST-001.4:** In a world that the page runs, the page keeps a book for the visit, and does not
  save it. The journal says: "Played alone: the journal is not saved."

---

### REQ-QST-002: Effects

**User Story:** As a world, I want answers and things to move my quests on, so that the story
follows what the player does.

**Acceptance Criteria:**
- **AC-QST-002.1:** An effect without steps to come from starts a quest that the character did not
  start; an effect with steps to come from moves a quest that is at one of them. Otherwise it does
  nothing.
- **AC-QST-002.2:** An effect that takes items needs them in the pack. Its coins and items go into
  the pack, and the player sees them rise over its head, as loot. What does not fit falls at its
  feet.
- **AC-QST-002.3:** In a shared world, the server applies an effect only for a player within 48 px
  of the NPC or the thing, that passes the gate of the answer, and for whom the conditions of the
  answer hold.
- **AC-QST-002.4:** An effect applies once: after it, the quest is at another step, and the same
  effect cannot apply again unless it comes from that step too.

---

### REQ-QST-003: Conversations with quests

**User Story:** As a player, I want the people of the world to talk about what I do for them, so
that a conversation follows the story.

**Acceptance Criteria:**
- **AC-QST-003.1:** An NPC can start a conversation with another line for a character at a step:
  the first start whose conditions hold, else the usual one.
- **AC-QST-003.2:** An answer with conditions shows only when they hold. An answer with an effect
  shows only when the effect can apply.
- **AC-QST-003.3:** When the player gives an answer with an effect, the effect applies (in a shared
  world, the server applies it), and the NPC says the next line. The answers after it already
  follow the new step.

---

### REQ-QST-004: The journal

**User Story:** As a player, I want to read what my character must do, so that I know where to go.

**Acceptance Criteria:**
- **AC-QST-004.1:** A button at the top right, left of the map, and the key L open the journal
  ("Diario" in Spanish). Esc closes it.
- **AC-QST-004.2:** The journal shows the open quests under "Quests" and the done quests under
  "Done", the last changed first: the title of each quest, and the line of its step. Without
  quests: "Nothing to do yet. Read what lies about, and talk to people."
- **AC-QST-004.3:** When a quest starts, moves on or ends, the journal's button shines until the
  journal opens.
- **AC-QST-004.4:** The journal button shows only in a world with quests.

---

### REQ-QST-005: The banner

**User Story:** As a player, I want to see at once when a quest changes, so that I do not miss it.

**Acceptance Criteria:**
- **AC-QST-005.1:** When a quest starts, a band shows "New quest" over the title of the quest, in
  the pixel font, on a dark band between two red lines. When it moves on: "Quest updated"; when it
  ends: "Quest done".
- **AC-QST-005.2:** The band fades in for 0.4 s, stays 2.4 s and fades out for 0.7 s, a sixth of the
  way down the screen. Two changes show one after the other.

---

### REQ-QST-006: The map marks

**User Story:** As a player, I want the map to show where my quests lead, so that I find the way.

**Acceptance Criteria:**
- **AC-QST-006.1:** For each open quest whose step has a place (a tile, or the home of an NPC), the
  map shows a gold diamond there, also where the character has not been.
- **AC-QST-006.2:** A place outside the map shows on the edge of the map, in its direction.

---

### REQ-QST-007: The letter (the Razed Villages)

**User Story:** As a new character, I want a reason to leave the home, so that the story starts.

**Acceptance Criteria:**
- **AC-QST-007.1:** The table of the home has a letter: "Your table. A letter lies by the candle,
  sealed with a hammer and an anvil.", then the letter of Thrain Steelforge in two pages: the
  homesteads of the Wilds burn, find out who; begin in Ironhold with the reeve, Elama Rothenel.
- **AC-QST-007.2:** To read it starts "The Razed Villages" at the step `letter`, and the map marks the
  reeve.
- **AC-QST-007.3:** At that step, the reeve starts with another line, and the answer "Thrain
  Steelforge sent me. Who burns the homesteads?" moves the quest to `reeve`. She tells that three
  homesteads burned since the spring, that nobody saw who burned them, and (on a question) that each
  house was searched before the fire. With WIS 13, the player sees that she fears more than bandits.

---

### REQ-QST-008: The broken cart

**User Story:** As a new player, I want a small errand on the way to the town, so that I learn
conversations, gates, errands and rewards.

**Acceptance Criteria:**
- **AC-QST-008.1:** Beside the road from the home to Ironhold, a few tiles before the town, a cart
  stands with its wheel in the mud. The merchant walks on the road in front of it.
- **AC-QST-008.2:** "Can I help?" starts "The Broken Cart" at `met`. The merchant needs somebody to
  lift the cart, or a lever from the smith of Ironhold. The map marks the merchant.
- **AC-QST-008.3:** A character with STR 13 can answer "Stand back. I will lift it." (a dim clue
  with STR 11 or 12): the quest ends, and the merchant pays 10 coins.
- **AC-QST-008.4:** Any character can ask the smith: at `met` or `lever`, without a lever in the pack,
  the smith starts with another line, and "A merchant on the road needs a lever for a broken cart."
  gives a lever (the step `lever`). A character that lost it can ask again.
- **AC-QST-008.5:** "Here: a lever from the smith." gives the lever to the merchant: the quest ends,
  and the merchant pays 10 coins.
- **AC-QST-008.6:** After the help, the merchant tells the news of the trade: Silverspring digs
  mithril and needs tools; Ironhold has a forge and wants the mithril. With INT 13 or CHA 13, the
  player hears that the Iron Sovereignty and the Mithril Enclave both want the Wilds and do not
  play fair.
- **AC-QST-008.7:** A character who helped sees the cart mended, with its wheel on. Others see it
  broken.
- **AC-QST-008.8:** The cart has a lantern: no mob comes within 4 tiles of the middle of the cart,
  so a character can talk to the merchant in peace.

---

### REQ-QST-009: Scenes

**User Story:** As a player, I want to overhear the people of the world, so that I learn the story as
it happens round me.

**Acceptance Criteria:**
- **AC-QST-009.1:** When a character for whom the conditions of a scene hold comes into its area,
  the NPCs of the scene say its lines one after the other, each over its own head, as long as it
  takes to read the line. The NPC that speaks stops its own lines.
- **AC-QST-009.2:** Only the page of that character shows the scene. The other players see the NPCs
  as before.
- **AC-QST-009.3:** A character who goes more than 2 tiles out of the area stops the scene; it plays
  again from the start the next time.
- **AC-QST-009.4:** At the end of the scene, its effect applies (in a shared world, the server checks
  that the character is in the area, with 2 tiles round it). Then the scene does not play again.
- **AC-QST-009.5:** A line said low has a gate: a character that passes it reads the line; others
  read "..." (with the gate, "... [WIS 13]", when they are 1 or 2 short).

---

### REQ-QST-010: The Hobgoblin Raid (the start)

**User Story:** As a player, I want the story to take me from Ironhold into the hills, so that the
letter leads to an adventure.

**Acceptance Criteria:**
- **AC-QST-010.1:** In the house of the reeve of Ironhold stand the reeve, a villager and a soldier of
  the Sovereignty (iron grey, not the red of the town).
- **AC-QST-010.2:** A character who started "The Razed Villages", and not "The Hobgoblin Raid",
  overhears the argument when it comes into the house or within 2 rows of its south wall: the
  hobgoblins go straight for Silverspring, two squads of them; they took Himo, and Brys thinks that
  he is still alive; the villager wants to warn Silverspring, and the soldier refuses to leave
  Ironhold with no defence. With WIS 13 the character also hears the soldier say low: "Let the
  hobgoblins have Silverspring. It saves the Sovereignty the work." The reeve then calls the
  character.
- **AC-QST-010.3:** The end of the argument starts "The Hobgoblin Raid" at `heard`, and the map marks
  the reeve.
- **AC-QST-010.4:** At `heard`, the reeve asks the character to warn Silverspring; "I will warn
  Silverspring." moves the quest to `asked`. She cannot pay, and she says not to fight the
  hobgoblins. At `asked`, she starts with "Silverspring is north-east of here, over the hills. Go,
  and be careful."
- **AC-QST-010.5:** At `heard` or `asked`, the soldier tells the character to stay out of it. With
  WIS 13, the character can say that the soldier wants the hobgoblins to reach Silverspring, and the
  soldier threatens it.
- **AC-QST-010.6:** At `asked`, the map marks the site of Silverspring, at the end of the north road.

---

### REQ-QST-011: The north road and the grove

**User Story:** As a player who goes to warn Silverspring, I want a road through the hills, so that I
find the way.

**Acceptance Criteria:**
- **AC-QST-011.1:** A road leaves the north-east corner of Ironhold and goes about 250 tiles to the
  north-east, to the site of Silverspring. Its tiles are mud (a causeway over water); nothing grows on
  it or within 2 tiles of it, and no house of the Wilds stands on it.
- **AC-QST-011.2:** From about a third of the way, for about a tenth of the road, the road goes through
  the grove: the forest of the Wilds without its clearings, right to the edge of the road. No house
  stands in the grove. The road itself stays open.

---

### REQ-QST-012: The ambush of the scouts

**User Story:** As a player who goes to warn Silverspring, I want the scouts of the hobgoblins to
ambush me in the grove, as in the chapter, so that the road is dangerous.

**Acceptance Criteria:**
- **AC-QST-012.1:** When a character at `asked` comes into the grove, the scouts come from the end
  of the grove that is furthest from it: a worg with a goblin on its back.
- **AC-QST-012.2:** More characters within 12 tiles bring more of the band, in this order: the
  hobgoblin in front of that goblin, the second worg with its goblin, the bugbear in front of it. Four
  or more characters meet the whole band of the chapter (the 5e budget: the units come while the
  band stays under the "deadly" budget of the characters there, at least the first unit).
- **AC-QST-012.3:** A rider sits on its worg and goes with it. When the worg hunts, reels or dies, or
  a blow reaches the rider, the riders jump off and go for the worg's target.
- **AC-QST-012.4:** When all the scouts have fallen, the raid moves to `scouts` for each character at
  `asked` that was there or is near the grove, and each one gets two badger furs.
- **AC-QST-012.5:** If the scouts go away (nobody near them), the ambush waits again for the next
  character at `asked` in the grove.
- **AC-QST-012.6:** Corwin, the peddler of Ironhold, buys a badger fur for 4 coins (with the price of
  Charisma).

---

### REQ-QST-013: The war band on the north road

**User Story:** As a player who killed the scouts, I want their war band to march on Silverspring,
so that I must choose: chase it now, or let it reach the town.

**Acceptance Criteria:**
- **AC-QST-013.1:** When a character at `scouts` is on the north road from the grove to Silverspring
  (within 10 tiles of it, not in the town), the war band starts a little beyond the grove: the
  Hobgoblin Devastator at the head, in a column. Alone, a character meets the Devastator and one
  hobgoblin; more characters meet more of it (the 5e budget): two hobgoblins more, a bugbear, and two
  hobgoblins more. Six characters meet the whole band.
- **AC-QST-013.2:** The band walks the road to the gate of Silverspring at 36 px/s (a character walks
  at 80). It hunts a character that it sees; after the hunt, it goes back to the road and on. It never
  goes away, also with nobody near.
- **AC-QST-013.3:** When all of the band has fallen on the road, the raid moves to `band` for each
  character at `scouts` that was there when it started or is near.
- **AC-QST-013.4:** When one of the band comes to the gate of Silverspring, the band leaves the road
  (it goes from the world), and the raid moves to `raid` for each character of its party.
- **AC-QST-013.5:** The Devastator drops a splint armour and the hobgoblin luck amulet, and 5 to 12
  coins.

---

### REQ-QST-014: The camp and Himo

**User Story:** As a player who stopped the war band on the road, I want to find its prisoner, so
that the scout of Ironhold can live.

**Acceptance Criteria:**
- **AC-QST-014.1:** The camp of the war band stands in a clearing in the hills, off the north road
  between the grove and Silverspring, with a trail of mud from the road: two shut tents, a fire with
  its light, a crate, a barrel, and a post. No tree or rock grows within 2 tiles of it. Mobs come here as in the
  woods.
- **AC-QST-014.2:** At `band`, the map marks the post. A character at `band` sees Himo tied to the
  post; others see a post with cut ropes.
- **AC-QST-014.3:** A character at `band` who acts on the post reads "Himo, the scout of Ironhold, is
  tied to the post. Bruised, and alive.", and the raid moves to `escort`.
- **AC-QST-014.4:** At `escort`, Himo (16 hit points, AC 13) follows the character as a companion. He
  comes back next to the character when it joins the world again.
- **AC-QST-014.5:** When Himo comes into Ironhold, he is home: the raid moves to `home`, and his family
  pays 20 coins. When he falls, he dies: the raid moves to `lost`.
- **AC-QST-014.6:** At `home`, the reeve says that Himo is home; at `lost`, she says that she will tell
  his mother herself.

---

### REQ-QST-015: The raid on Silverspring

**User Story:** As a player whose war band reached Silverspring first, I want to defend the town, so
that the story goes on to its other end.

**Acceptance Criteria:**
- **AC-QST-015.1:** When a character at `raid` comes within 6 tiles of Silverspring, the war band
  comes in at the gate and marches up the main street. Its mobs may go into the town; every other mob
  still keeps out of it.
- **AC-QST-015.2:** While the raid runs, the five people of Silverspring take shelter and say nothing:
  Kasmut, Tova and the jeweller go into their buildings, Doran holds the gate, and the panner hides
  behind the crates by the inn.
- **AC-QST-015.3:** When all of the band has fallen, the raid moves to `defended` for the characters at
  `raid` there.

---

### REQ-QST-016: The end of the raid

**User Story:** As a player who saved Silverspring, I want the town to thank me as in the chapter, so
that my deed has a reward.

**Acceptance Criteria:**
- **AC-QST-016.1:** At `home` or `lost`, Kasmut asks if the war band died on the road. "Dead, all of it.
  Its camp is empty." moves the raid to `title` with the flag `permit`, and gives the permit of
  Silverspring.
- **AC-QST-016.2:** At `defended`, "It was our fight." moves the raid to `title`, without the permit.
- **AC-QST-016.3:** At `band` or `escort`, Kasmut sends the character to find Himo first.
- **AC-QST-016.4:** At `title`, Tova gives the bed under the blue quilt: the Silver Trout is the
  character's refuge (it wakes there after a defeat, if it is the nearest).
- **AC-QST-016.5:** With the permit, Ilsa the jeweller sells a nugget of mithril for 5 coins (with the
  price of Charisma). Without it, she sells nothing; the server checks it.
- **AC-QST-016.6:** The smith of Ironhold buys a nugget of mithril for 10 coins (with the price of
  Charisma). He asks for it first, when the character carries one.

---

### REQ-QST-017: The burned homesteads

**User Story:** As a player sent by Thrain Steelforge, I want to find the burned homesteads and the
sign that their burners left, so that I can follow the trail of who burns them.

**Acceptance Criteria:**
- **AC-QST-017.1:** Three burned homesteads stand in clearings of the Wilds, the same for every
  seed: the Hale homestead north of the home, the Marrow homestead east of it, the Tanner homestead
  south-west of it. Each is a house of charred planks with no roof and an open door.
- **AC-QST-017.2:** In each one, a charred plank shows a burned phoenix: "A plank, charred black.
  Burned into it, deeper than the rest: a phoenix that rises from ashes." With INT 13, the character
  also reads that magic made the mark.
- **AC-QST-017.3:** At `reeve`, the reeve names the Hale homestead, and the map marks its phoenix.
  Reading it moves the quest `ashes` to `ruin1`, and the map marks the phoenix of the Marrow
  homestead; reading that one moves it to `ruin2` (the Tanner homestead), and that one to `ruins`.
  A phoenix out of order does nothing.
- **AC-QST-017.4:** A survivor lives in the ashes of the Hale and of the Tanner homestead. Each one saw
  only shadows; with WIS 13, the character calms it, and it tells more (what the burners took or looked
  for).

---

### REQ-QST-018: The sign of the phoenix

**User Story:** As a player who found the three phoenixes, I want the people of Ironhold to tell me
what they know of the sign, so that the mystery deepens.

**Acceptance Criteria:**
- **AC-QST-018.1:** At `ruins`, the map marks the priest of Ironhold. The priest and the apothecary
  each start with the burned homesteads.
- **AC-QST-018.2:** The priest calls the phoenix the sign of a god before the gods; with INT 13, the
  character learns of "those who seek in the ashes". The apothecary says that raiders from the south
  call themselves the Ashen Seekers. The stories do not agree.
- **AC-QST-018.3:** Either of them moves the quest to `symbol`. The later steps of the story come with
  its later phases.

---

### REQ-QST-019: The plot in the Crooked Lantern

**User Story:** As a player who knows of the hobgoblins, I want to overhear the plot against the
caravan of Silverspring, so that I learn where it will be attacked.

**Acceptance Criteria:**
- **AC-QST-019.1:** A character at `asked` of the raid or later, without the quest `caravan`, who comes
  into the Crooked Lantern (or two rows south of it) overhears a soldier of the Sovereignty and a
  villager.
- **AC-QST-019.2:** With WIS 15 it hears the first two lines; with WIS 13 the next two; every character
  hears the last three: the Sovereignty wants the caravan gone, and the hobgoblins wait for it half a
  day down the north road from Silverspring.
- **AC-QST-019.3:** At the end, the quest `caravan` starts at `heard`, and the map marks the meeting
  point, at four fifths of the north road (from Ironhold).

---

### REQ-QST-020: The caravan on the north road

**User Story:** As a player who heard the plot, I want to meet the caravan and its attackers on the
road, so that I can defend it.

**Acceptance Criteria:**
- **AC-QST-020.1:** When a character at `heard` comes within 12 tiles of the north road between 0.7 and
  0.97 of its length (not in Silverspring), the caravan leaves the gate of Silverspring for Ironhold: a
  wagon and two militia of the Enclave.
- **AC-QST-020.2:** At the meeting point, the caravan stops, and the attackers come from ahead, one wave
  after the other, sized to the characters there. If the scouts of the raid still live for the
  character (`asked`), they come first, and their fall moves the raid to `scouts` with two badger furs;
  then the war band, and its fall moves the raid to `band`. If the character killed both, other
  hobgoblins of the clan come instead (a hobgoblin and a goblin archer, then more).
- **AC-QST-020.3:** While a character at `heard` waits for the caravan, the scouts do not wait in the
  grove and the war band does not march for it: they wait at the caravan.
- **AC-QST-020.4:** When the last wave falls and the wagon lives, the caravan is saved: the quest moves
  to `saved` (it ends), with 15 coins and a healing draught, and the caravan walks on to Ironhold.
- **AC-QST-020.5:** If the attackers break the wagon, the cargo is lost: the quest moves to `lost` (it
  ends).

---

### REQ-QST-021: The robbery, the wanted and the fine

**User Story:** As a player who wants the cargo, I want to rob the caravan and pay for it later, so
that my choice has a price.

**Acceptance Criteria:**
- **AC-QST-021.1:** The driver of the wagon talks (the wagon stops for a character next to it). "Hand
  over the cargo." moves the quest to `robbing`: the militia fight the character, and its blows hit them.
- **AC-QST-021.2:** When both militia fall (or the robber breaks the wagon) with the robber within 12
  tiles, the quest moves to `robbed`, with 20 coins, 3 badger furs and 5 nuggets of mithril, and the
  caravan goes.
- **AC-QST-021.3:** At `robbing` or `robbed` the character is wanted: Brann, Marta, Isolde, the smith,
  Corwin, the soldier and the merchant of Ironhold, and Tova, Ilsa and Doran of Silverspring refuse
  it ("I will go."), and the server refuses their deals. Nobody attacks it.
- **AC-QST-021.4:** The reeve of Ironhold and Kasmut take the fine: 60 coins. "I will pay the fine."
  moves the quest to `pardoned` (it ends), and the others deal with the character again.

---

### REQ-QST-022: The race to the Wren homestead

**User Story:** As a player who knows the sign of the phoenix, I want to find where the Seekers strike
next and to get there first, so that I can stop one fire.

**Acceptance Criteria:**
- **AC-QST-022.1:** At `symbol`, the map marks the priest of Ironhold, and he starts at `pattern`. "The
  Seekers take old things from each house before they burn it." moves the quest to `next`: the Wrens,
  by the pool of the Silvervein, keep carved stones. With INT 13, the character learns that the
  carvings are the waves of Tigris.
- **AC-QST-022.2:** At `next` or `stone`, a character within 32 tiles of the middle of the Wren
  homestead starts the race: cinder hounds and a watcher of the Seekers march from the east end of the
  burned trail (about 47 tiles from the door) at 32 px/s, along the trail and the yard path to the door.
  Alone, a character meets two hounds; two characters meet six (encounters.ts; the watcher does not
  count). While the race runs, Mira Wren takes shelter in her house.
- **AC-QST-022.3:** Mira gives the wave stone to a character at `next` who warns her (`stone`).
- **AC-QST-022.4:** When a hound comes to the door and a character of the party is still at `next`, the
  Seekers take the stone: that character goes to `late`, and the hounds and the watcher go. If nobody of
  the party is at `next`, the hounds stay and fight.
- **AC-QST-022.5:** When the hounds fall, the watcher goes in ash, and the characters of the party at
  `next` or `stone` go to `held` (12 coins and a draught). Mira gives the stone to a character at
  `held` who has none.
- **AC-QST-022.6:** At `held` and `late`, the map marks the camp of the Seekers at the east end of the
  trail (236, -100).

---

## Feature Behavior & Rules

- **The engine** (`packages/engine/src/quests.ts`): `QuestDef` (`id`, `title`, `steps`),
  `QuestStep` (`id`, `journal`, `at`, `npc`, `end`), `QuestEntry` (`step`, `flags`, `n`),
  `QuestBook`, `EMPTY_BOOK`, `When` and `Conditions`, `holds()`, `QuestEffect` (`id`, `quest`, `to`,
  `from`, `flag`, `take`, `give`), `canApply()`, `applyEffect()`, `firstThatHolds()`,
  `checkQuests()` (a book from outside: `QUEST_ID` ids, `MAX_QUESTS` 64, `MAX_FLAGS` 8),
  `checkQuestDefs()` (`QUEST_LIMITS`: title 40, journal 240 characters), `checkEffect()`,
  `checkConditions()`, `questChanges()` (for the banner).
- **Dialogs** (`packages/engine/src/dialog.ts`): `DialogAnswer.when` and `DialogAnswer.effect`,
  `Dialog.starts`, `startNode()`, `answerHolds()`, `findEffectAnswer()`. `checkDialog()`: the start
  nodes exist and count as starts; each node has an answer without a gate, a condition or an
  effect; such answers do not count as a way out; two effects with one id must be the same; an
  answer has a deal or an effect, not both.
- **Things** (`packages/engine/src/fixtures.ts`): `Interaction.effect` (applied when the character
  reads the first page), `Fixture.variant` (`when`, `frame`: the page draws the frame when the
  conditions hold; `render/fixtures.ts`, `Fixtures.setHolds()`). The fixture type `cart` (two
  tiles, code 29). The item `crowbar` (the lever; "Palanca" in Spanish).
- **The server**: `RoomPlayer.quests` and `questsChanged`, `JoinCharacter.quests`, `Room.quest()`
  (it returns whether the book changed); the message `quest` and the field `qs` (protocol 23,
  `docs/multiplayer.md`; `toWireBook()`, `fromWireBook()`); `Character.quests`; the store's column
  `quests` (migration of 2026-10-11) and `AccountStore.setQuests()` (the book and the pack in one
  statement); `Accounts.saveQuests()`; `packages/engine-server/src/index.ts` saves after each
  effect, and with the place.
- **The page** (`packages/engine-client/src`): `game.ts` (`questsNow()`, `holdsNow()`, `applyQuest()`;
  `PENDING_QUEST_MS` 3000: the book as it will be after an effect that went to the server),
  `net/session.ts` (`quests`, `onQuests()`, `quest()`), `ui/conversation.ts` (`ConversationFacts`,
  `Conversation.give()`, `ConversationPanel.refresh()`), `ui/journal-panel.ts` (`JournalPanel`,
  `journalEntries()`, `questMarks()`), `render/quest-banner.ts` (`QuestBanner`, `BANNER_TIMING`),
  `ui/map-panel.ts` (`setMarks()`), `STRINGS.journal`. The debug panel (`?debug`) has a line
  `quests`.
- **The Wilds** (`worlds/wilds/src/quests.ts`): `ASHES` (steps `letter`, `reeve`, `ruin1`, `ruin2`,
  `ruins`, `symbol`, `found`; `found` ends it and comes with the later phases of the story), `CART` (`met`, `lever`, `done`),
  `QUESTS`, the effects `READ_LETTER`, `TELL_REEVE`, `CART_HELP`, `CART_LEVER`, `CART_LIFT` (flag
  `lifted`), `CART_MEND` (flag `lever`), `CART_REWARD` (10). The letter: `home.ts`. The dialogs:
  `REEVE` (start `letter`), `SMITH` (start `cart`), `MERCHANT` (`dialogs.ts`); `ATHLETICS_GATE` (STR
  13). The cart: `cartSpot()` (`road.ts`: north of the road, from three fifths of the way to the
  town), `WildsSource.cart` (with `CART_LANTERN`, and the variant `fixture/cart-mended`), the
  merchant (the last NPC of `WildsSource.npcs()`, look `merchant`), `CART_SAFE` (4 tiles: `roam` and
  `hunt` of `WildsSource.mobs()`).
- **Scenes** (`packages/engine/src/scenes.ts`): `SceneDef` (`id`, `area`, `when`, `lines`, `effect`),
  `SceneLine` (`npc`, `text`, `gate`), `inScene()`, `SCENE_MARGIN` (2), `SCENE_LINE_MAX` (160),
  `checkScenes()`; `WorldSource.scenes()`. The message `quest` carries `scene` (protocol 24), and
  `Room.quest()` checks the area. The page: `render/scene.ts` (`ScenePlayer`: the time of a line as
  the welcome's), `game.ts` (`sceneLines()`: a murmur, `STRINGS.murmur`, for a line behind a gate).
  The debug line `quests` shows the scene that plays ("scene argument 3/9").
- **The raid** (`worlds/wilds/src`): `RAID` (`heard`, `asked`, `scouts`, `band`, `escort`, `home`,
  `lost`, `raid`, `defended`, `title`), `RAID_HEARD` (the effect of the scene), `RAID_ASKED`, `RAID_SCOUTS`;
  `ARGUMENT` and `TOWN_SCENES` (`town.ts`: the area is the reeve's house and two rows south of it);
  the people `farmer` (pages) and `soldier` (`SOLDIER`) in the reeve's house; `REEVE` starts at
  `warn` (`heard`) and `go` (`asked`).
- **The north road and the grove** (`worlds/wilds/src/road.ts`): `Road` (any two ends, level at both),
  `homeRoad()`, `northRoad()`, `NORTH_ROAD_START`, `SILVERSPRING_SITE` (171, -179; the step `asked`
  marks it, and a test checks the numbers), `Grove` (`GROVE_SPAN` 0.36 to 0.46 of the road,
  `GROVE_RADIUS` 7); `WildsSource.north`, `.grove` (`GROVE_THRESHOLD`: the trees of the grove).
- **Ambushes** (`packages/engine/src/ambushes.ts`): `AmbushDef` (`id`, `inArea`, `when`, `from`,
  `units` of `AmbushMember` (`kind`, `rides`, `seat`), `effect`), `Ambushes` (`step()`: it ends a
  run whose mobs all fell, and gives the effects; it starts one for a character at the step in the
  area; an ambush that ends does not start again in the same step), `AMBUSH_RADIUS` 12;
  `WorldSource.ambushes()`; the Wilds: `SCOUT_UNITS` (`source.ts`). The Room runs them after the
  horde, applies the effects and lists the books to save (`Room.takeQuestSaves()`; the server saves
  them at once); the page runs its own in a world that it runs. Encounter budget:
  `packages/engine/src/encounters.ts` (`XP_THRESHOLDS`, `xpMultiplier()`, `adjustedXp()`,
  `sizeEncounter()`).
- **Riders** (`packages/engine/src/mobs.ts`): `Horde.spawnRider()`, the state `ride` (protocol 27),
  `Mob.mount`, `Mob.seat`, `SEAT_GAP`. The page draws a rider 9 px up, over its mount, without its
  shadow (`render/mobs.ts`, `RIDE_LIFT`).
- **The badger fur**: the item `badger-fur` (stacks of 5), `sell-fur` in `PEDDLER`.
- **The art**: `fixture/cart`, `fixture/cart-mended` (`art/fixtures.ts`), `item/crowbar`, `item/badger-fur`
  (`art/items.ts`), the NPC looks `merchant`, `farmer` and `soldier` (`art/characters.ts`).
- **The war band** (`worlds/wilds/src/source.ts`): `BAND_UNITS`, `BAND_SPEED` (36), the ambush `band`
  (`AmbushDef.march`: the route is the north road from `BAND_SPAN` (`road.ts`), `arrive` is
  `RAID_ARRIVED`; its area is `RoadStretch` with `BAND_AREA`), and `raid` (`AmbushDef.raid`: its mobs
  are let into the town, `Horde.unleash()`, `MobRules.raid`; its people shelter; the band marches
  `RAID_STREET` (20) tiles up the main street). The engine: `Horde.march()`, `Horde.arrived()`,
  `Horde.dismiss()`, `MARCH_GAP` (`ambushes.ts`), `Ambushes.sheltered`, `NpcDef.shelter`,
  `NpcCrowd.setAlarm()`.
- **The camp** (`worlds/wilds/src/camp.ts`): `CAMP` (a `Town` of `towns.ts`, not a town: it is in
  `PLACES`, not in `TOWNS`, of `source.ts`), `CAMP_GATE`, `CAMP_STAKE`; `campSite()`, `campTrail()`,
  `CAMP_SHARE` (0.66), `CAMP_OFFSET` (`road.ts`); `WildsSource.trail`; `CAMP_CLEARING` (2). The post:
  the fixture `stake` (code 30) with `Fixture.variant.content` (`fixtureContent()`: the server checks
  the variant's effect too); the fire: `campfire` (code 31).
- **Himo** (`packages/engine/src/escorts.ts`): `EscortDef` (`companion`, `when`, `home`, `arrive`,
  `fall`), `Escorts.step()`, `WorldSource.escorts()`; the Room runs them after the companions, the page
  in a world that it runs. The Wilds: `HIMO` (look `scout`), `HIMO_FREE`, `HIMO_HOME`
  (`HIMO_REWARD` 20), `HIMO_LOST`.
- **The end** (`worlds/wilds/src`): `RAID_DEFENDED`, `RAID_TITLE_PERMIT`, `RAID_TITLE`; `KASMUT`
  starts `guard`, `early`, `held`, `himo`, `road`; `HOST` (`TROUT_ROOM`, the refuge `trout`);
  `JEWELLER` (`MITHRIL_COST` 5); `SMITH` (start `mithril`, `MITHRIL_PRICE` 10); `REEVE` (starts `himo`,
  `himo-lost`). The items `mithril` (stacks of 10) and `mithril-permit`. The server checks the
  condition (`when`) of an answer with a deal (`Room.deal()`).
- **The burned homesteads** (`worlds/wilds/src/ruins.ts`, story phase 6): `HALE` (9, -35), `MARROW`
  (51, -5), `TANNER` (-21, 25) (each a `Town` of 11 x 11 tiles; `RUINS`, `brandTile()`), the style
  `{ walls: 'charred', roof: 'none' }` (the page draws no roof: `ROOFLESS` in `render/buildings.ts`;
  the art: `charred` in `art/buildings.ts`), the fixture `brand` (code 32), `RUIN_NPCS`
  (`hale-survivor`, `tanner-survivor`, look `survivor`; protocol 30). The steps `reeve` (at the
  phoenix of the Hale homestead), `ruin1`, `ruin2`, `ruins`, `symbol`; the effects `RUIN_HALE`,
  `RUIN_MARROW`, `RUIN_TANNER` (`Thing.effect` of `towns.ts`), `ASHES_SYMBOL`. The dialogs `PRIEST`,
  `SURVIVOR_HALE`, `SURVIVOR_TANNER`, the start `phoenix` of `APOTHECARY`, and the node `where` of
  `REEVE`. They stand in `CLEARINGS` of `source.ts` (no tree or rock within 2 tiles; mobs as in the
  woods).
- **The caravan** (`worlds/wilds/src`): `CARAVAN` (steps `heard`, `saved`, `lost`, `robbing`, `robbed`,
  `pardoned`), `CARAVAN_HEARD` (the end of the scene `PLOT` in `town.ts`; the people `inn-soldier` and
  `drinker` at the tables of the inn; `KEEN_GATE`, WIS 15), `CARAVAN_SAVED` (`CARAVAN_REWARD` 15 and a
  draught), `CARAVAN_LOST`, `CARAVAN_ROB`, `CARAVAN_ROBBED`, `CARAVAN_FINE` (`QuestEffect.cost`,
  `CARAVAN_FINE_COINS` 60); `WildsSource.convoys()` (`CARAVAN_MEET` 0.8, `CARAVAN_MILITIA`,
  `CARAVAN_WAGON`, `CLAN_UNITS`, `NOT_AT_THE_CARAVAN`); `WAGON_DRIVER`; the refusals (`Dialog.refuse`,
  `REFUSE`, `wanted()` in `dialogs.ts`) and the starts `fine` of `REEVE` and `KASMUT`. The guards:
  `docs/features/npcs/guards.md`.
- **The Wren homestead** (`worlds/wilds/src/wren.ts`, story phase 7): `WREN` (13 x 11 tiles at (176,
  -108), in `CLEARINGS`), the house `wren-house` (planks and thatch), Mira Wren (`WREN_NPCS`, look
  `survivor`, the dialog `MIRA`; the last NPC of the list), `WREN_GATE`, `SEEKER_TRAIL` (a `Road` to
  `SEEKER_CAMP_SITE`, one of the roads of `WildsSource`), the steps `next`, `stone`, `held`, `late`, the
  effects `ASHES_NEXT` (the node `pattern` of `PRIEST`), `MIRA_STONE`, `ASHES_HELD` (`WREN_REWARD` 12),
  `ASHES_LATE`, `MIRA_STONE_AFTER`; the item `wave-stone`; the ambush `cinders` of
  `WildsSource.ambushes()` (`HOUND_UNITS`, `RACE_RADIUS` 32, `RACE_SPEED` 32). The engine:
  `AmbushDef.shelter` (NPCs that take shelter, with no raid), a march whose `arrive` applies to nobody
  stays, and the watchers of an ambush go in ash when its fighters fell (`Horde.vanish()`); the mobs:
  `docs/features/game/combat.md`, REQ-CMB-008.
- **Tests**: `packages/engine/test/quests.test.ts`, `packages/engine/test/dialog.test.ts`,
  `packages/engine-client/src/ui/conversation.test.ts`, `packages/engine-client/src/ui/journal-panel.test.ts`,
  `packages/engine-server/test/accounts.test.ts`, `worlds/wilds/test/story.test.ts` (every effect and
  condition of the content, the cart, the letter, both ways to fix the cart, the book on the wire).
