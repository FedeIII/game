# The questlines

The quests of the Wilds (`worlds/wilds/src/quests.ts`), in the order of the journal: "The Road to
Ironhold", "The Razed Villages", "The Broken Cart", "Lentils for Bronzehold", "The Hobgoblin Raid",
"The Caravan Ambush". The system: `docs/features/game/quests.md`.

## What starts each quest

No quest names the next one (Fede, 2026-10-13). An event starts a quest: a thing that the character
reads, an answer, or a scene that it overhears. Some events wait for another quest.

| Quest (Spanish) | Id | The event that starts it | What it waits for |
|---|---|---|---|
| The Road to Ironhold (El camino a Ferrozar) | `road` | The letter on the table of the hut (`READ_LETTER`). | Nothing: the first quest of every character. |
| The Broken Cart (El carro roto) | `cart` | "Can I help?" to the merchant by the cart (`CART_HELP`). | Nothing. |
| Lentils for Bronzehold (Lentejas para Bronzal) | `lentils` | "I will take it." to the farmer of Whitegrove (`LENTILS_TAKE`). | Nothing. |
| The Razed Villages (Pueblos Arrasados) | `ashes` | "Thrain Steelforge sent me. Who burns the homesteads?" to the reeve (`START_ASHES`). | The end of the road (`ROAD_DONE`). |
| The Hobgoblin Raid (Incursión Hobgoblin) | `raid` | The scene "the argument" in the town hall (`ARGUMENT`, `RAID_HEARD`). | "The Razed Villages" started (any step). |
| The Caravan Ambush (Asalto a la Caravana) | `caravan` | The scene "the plot" in the Crooked Lantern (`PLOT`, `CARAVAN_HEARD`). | "The Hobgoblin Raid" at `asked` or later. |

```
letter ─▶ road ──(arrived)──▶ the reeve can give ashes ──(started)──▶ the argument: raid ──(asked)──▶ the plot: caravan
merchant ─▶ cart          farmer ─▶ lentils          (both: any time, on the road)
```

## The Road to Ironhold (`road`)

The tutorial (Fede, 2026-10-13; `docs/drafts/tutorial.md`). The letter of Thrain Steelforge sends the
character from its hut north up the road, through Whitegrove and Bronzehold, to Ironhold. On the road
the game teaches its basics with tips (`docs/features/game/tips.md`); the only enemies are goblin
patrols.

| Step | The journal says | The map marks | What moves the quest there |
|---|---|---|---|
| `go` | The letter sends me to Ironhold, through Whitegrove and Bronzehold; the reeve wrote to Thrain first. | the south edge of Ironhold (`-32, 15`) | To read the letter (`READ_LETTER`). |
| `arrived` (end) | I came to Ironhold. | | The scene "the arrival": the character comes into Ironhold, and the child calls out and sends it to the town hall, on the square (`ARRIVAL`, `ROAD_ARRIVED`). |

## The Broken Cart (`cart`)

Chapter 1.5.1: the merchant on the road before Arboleda Blanca. A quest of its own, on the first leg of
the road.

| Step | The journal says | The map marks | What moves the quest there |
|---|---|---|---|
| `met` | The cart broke down; lift it, or bring a lever: the farmer of Whitegrove has one. | the merchant | "Can I help?" (`CART_HELP`). |
| `lever` | The smith of Ironhold gave me a lever. | the merchant | The smith: "A merchant on the road needs a lever for a broken cart." (`CART_LEVER`; without a lever in the pack). |
| `lent` | The farmer of Whitegrove lent me a lever. | the merchant | The farmer: "The merchant needs a lever for his cart." (`FARMER_LEVER`; without a lever in the pack). |
| `done` (end) | I helped the merchant; he paid me and goes on to Ironhold. | | "Stand back. I will lift it." (STR 13, `CART_LIFT`), or "Here is a lever." (`CART_MEND`: the merchant keeps the lever). |

Reward: 10 coins. A character that helped sees the cart mended. Then the merchant tells the news of the
trade (INT 13 or CHA 13: the Sovereignty and the Enclave both want the wildlands).

## Lentils for Bronzehold (`lentils`)

Chapter 1.5.1: the farmer of Arboleda Blanca sends lentils to Bronzal. A quest of its own.

| Step | The journal says | The map marks | What moves the quest there |
|---|---|---|---|
| `carry` | The farmer gave me a sack of lentils for the sergeant of Bronzehold. | the sergeant | "I will take it." (`LENTILS_TAKE`: a sack of lentils into the pack). |
| `done` (end) | I brought the lentils to Bronzehold, and the sergeant paid me. | | "I bring lentils from Whitegrove." (`LENTILS_GIVE`: takes the sack). |
| `wet` | I waded through water with the sack, and the lentils got wet. They are ruined. | the sergeant | A wade or a swim with the sack (`LENTILS_SOAK`: the sack becomes a sack of wet lentils). The server sees it. |
| `part` (end) | The lentils were wet, but I talked the sergeant into paying a part of the price. | | CHA 13: "A day in the sun, and most of them will keep." (`LENTILS_PLEAD`: takes the wet sack, 2 coins). |
| `spoiled` (end) | I gave the wet lentils to the sergeant. He paid nothing for them. | | "Then take them for nothing." (`LENTILS_SPOILED`: takes the wet sack). |

The farmer says to keep the sack dry. Reward: 5 coins, and the news of the road without the gate of WIS
13 (the answer "What news?"). Wet lentils: 2 coins and the news with CHA 13, else nothing.

## The Razed Villages (`ashes`)

Chapter 1.5.1 and the Arcane Raiders (phases 6 to 10). Who burns the homesteads of the wildlands?
Chapter 1 of the game ends with it.

| Step | The journal says (short) | The map marks | What moves the quest there |
|---|---|---|---|
| `letter` | (Only for characters from before 2026-10-13, whose letter started this quest.) Begin with the reeve. | the reeve | The letter, before 2026-10-13. |
| `reeve` | Three homesteads burned; each was searched first. The Hale homestead is nearest. | the phoenix of the Hale homestead (`-29, -42`) | The reeve (`START_ASHES` after the road; `TELL_REEVE` from `letter`). |
| `ruin1` | A phoenix in the Hale homestead; tracks lead east. | the phoenix of the Marrow homestead (`8, -47`) | To read the phoenix of the Hale homestead (`RUIN_HALE`). |
| `ruin2` | The same phoenix at Marrow; tracks go south-west. | the phoenix of the Tanner homestead (`-60, -27`) | The phoenix of the Marrow homestead (`RUIN_MARROW`). |
| `ruins` | Three phoenixes. The priest or the apothecary may know the sign. | the priest | The phoenix of the Tanner homestead (`RUIN_TANNER`). |
| `symbol` | The priest: a god older than the gods. The apothecary: raiders called the Ashen Seekers. | the priest | The priest or Isolde (`ASHES_SYMBOL`). |
| `next` | The Seekers take old things; the Wrens by the pool keep carved stones. Reach them first. | the Wren homestead (`182, -103`) | The priest: "The Seekers take old things from each house before they burn it." (`ASHES_NEXT`). |
| `stone` | Mira gave me the carved stone. Something comes from the east. | the Wren homestead | Mira (`MIRA_STONE`: the wave stone). |
| `held` | The cinder hounds fell. A masked figure watched. A burned trail leads east. | the camp of the Seekers (`236, -100`) | The ambush "cinders" falls (`ASHES_HELD`: 12 coins and a draught). |
| `late` | The Seekers came first and took the stone. A burned trail leads east. | the camp of the Seekers | The hounds reach the homestead first (`ASHES_LATE`). |
| `camp` | The guards of the camp fell. A woman is tied to a post. | the post (`240, -98`) | The ambush "camp-guard" falls (`CAMP_TAKEN`). |
| `captive` | Sela: the Seekers want the shrine of Tigris; the wave stone opens it. | the altar (`195, -110`) | "I will cut the ropes." (`SELA_FREE`). |
| `shrine` | The altar opened; the Tear of Tigris is mine. The Seekers come. | the altar | The wave stone into the altar (`TEAR_TAKEN`: the stone for the Tear). |
| `relic` | The Ash Warden went in ash. I keep the Tear and its orders. I need sleep. | | The ambush "shrine" falls (`ASHES_RELIC`: the Warden's orders). |
| `gave` (end) | In a dream of ash, I gave Verath the Tear. | | The dream: "Take it." (`DREAM_GIVE`). |
| `refused` (end) | I refused. The Seekers will come for it. | | "No. It stays with me." (`DREAM_REFUSE`). |
| `lied` (end) | I promised to bring it north, and lied. | | "I will bring it to you, in the north." (CHA 13, `DREAM_LIE`). |

- **The ambushes.** "cinders": the cinder hounds and a watcher march from the east on the burned trail,
  for a character at `next` or `stone` within 32 tiles of the Wren homestead; Mira and her children
  hide. "camp-guard": blades and adepts, for a character at `held` or `late` within 6 tiles of the camp.
  "shrine": the Ash Warden (and blades and adepts for bigger parties), for a character with the Tear
  within 16 tiles of the altar.
- **The wave stone again.** Mira gives it after the fight to a character without it
  (`MIRA_STONE_AFTER`); the chest of the camp gives it back at `camp` or `captive` (`STONE_BACK`).
- **The dream.** At `relic`, a bed where the character sleeps (its hut, its room at the Crooked Lantern,
  the bed at the Silver Trout) opens the dream of Verath in place of a rest (`dream.ts`).
- **Chapter 2** (phases 11 to 13 of `docs/drafts/story-arcane-raiders.md`) is on hold (Fede,
  2026-10-12). Nothing in the game follows the three ends yet.

## The Hobgoblin Raid (`raid`)

Chapter 1.5.1, "Incursión Hobgoblin".

| Step | The journal says (short) | The map marks | What moves the quest there |
|---|---|---|---|
| `heard` | Hobgoblins go to Silverspring; they took Himo. The reeve wants a word. | the reeve | The scene "the argument" (`RAID_HEARD`); WIS 13 hears the soldier's low line. |
| `asked` | Warn Silverspring, north-east of Ironhold. Ironhold cannot pay; the soldiers want me out of it. | Silverspring (`171, -179`) | "I will warn Silverspring." (`RAID_ASKED`). |
| `scouts` | The scouts in the grove fell; the war band marches on Silverspring. | Silverspring | The ambush "scouts" in the grove falls (`RAID_SCOUTS`: 2 badger furs). |
| `band` | The band fell on the road; Himo may be in its camp. | the post of the war camp (`92, -143`) | The ambush "band" falls on the north road (`RAID_BAND`). |
| `escort` | Himo is free; take him home to Ironhold. | the east gate of Ironhold (`-7, 3`) | To press the action at the post: "You cut the ropes." (`HIMO_FREE`). Himo follows. |
| `home` | Himo is home; his family paid. Silverspring must hear it. | Kasmut | Himo reaches Ironhold (`HIMO_HOME`: 20 coins). |
| `lost` | Himo fell on the way. Silverspring must hear of the band. | Kasmut | Himo falls (`HIMO_LOST`). |
| `raid` | The war band came to Silverspring first. | the main street of Silverspring (`192, -179`) | The band reaches the gate of Silverspring (`RAID_ARRIVED`). |
| `defended` | The band fell in the streets. Himo died in the camp. | Kasmut | The ambush "raid" falls in the town (`RAID_DEFENDED`). |
| `title` (end) | Silverspring gave me a title in its guard, and a bed. | | Kasmut: from `home` or `lost` with the mithril permit (`RAID_TITLE_PERMIT`), from `defended` without it (`RAID_TITLE`). |

- With the title, Tova gives the bed of the guard at the Silver Trout (a refuge). With the permit, Ilsa
  sells mithril at cost.
- During the raid, the people of Silverspring shelter in their houses, and the band may go into the
  town.

## The Caravan Ambush (`caravan`)

Chapter 1.5.1, "Asalto a la Caravana". Soldiers of the Sovereignty send hobgoblins against a caravan of
Silverspring.

| Step | The journal says (short) | The map marks | What moves the quest there |
|---|---|---|---|
| `heard` | I overheard a plot against a caravan of Silverspring, half a day down the north road. | the meeting point (`127, -161`) | The scene "the plot" (`CARAVAN_HEARD`): WIS 15 hears every line, WIS 13 two more. |
| `saved` (end) | I saved the caravan. | | Every attacker falls, and the wagon lives (`CARAVAN_SAVED`: 15 coins and a draught). |
| `lost` (end) | The hobgoblins broke the wagon. | | The wagon falls (`CARAVAN_LOST`). |
| `robbing` | I attack the caravan; Ironhold and Silverspring want me for it. | | "Hand over the cargo." to the driver (`CARAVAN_ROB`; from `heard` or `saved`). |
| `robbed` | I took the cargo; I am wanted until I pay a fine. | | The militia fall (`CARAVAN_ROBBED`: 20 coins, 3 badger furs, 5 mithril). |
| `pardoned` (end) | I paid the fine. | | "I will pay the fine." to the reeve or Kasmut (`CARAVAN_FINE`: 60 coins). |

- **The attackers** at the meeting point: the scouts of the raid if the character is at `asked` (they
  move the raid to `scouts`), the war band if it is at `asked` or `scouts` (they move it to `band`), else
  other hobgoblins of the clan. While the caravan is at `heard`, the scouts and the band do not wait in
  the grove or on the road.
- **Wanted.** At `robbing` or `robbed`, the traders and the guards refuse the character (Brann, Marta,
  Isolde, the smith, Corwin, the merchant, the soldier, Tova, Doran, Ilsa); the reeve and Kasmut take
  the fine.

## Rewards

| Quest | Reward |
|---|---|
| The Broken Cart | 10 coins |
| Lentils for Bronzehold | 5 coins (wet lentils: 2 coins with CHA 13, else nothing) |
| The Razed Villages | 12 coins and a draught (Mira); the Tear of Tigris (unless given to Verath); the Warden's orders |
| The Hobgoblin Raid | 2 badger furs (the scouts); 20 coins (Himo home); a title, a bed at the Silver Trout, and the mithril permit (the band stopped on the road) |
| The Caravan Ambush | 15 coins and a draught (saved); 20 coins, 3 badger furs and 5 mithril (robbed; then a fine of 60) |
