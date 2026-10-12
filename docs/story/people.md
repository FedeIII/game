# The people

Every person of the game, as the code has them: the NPCs (`WildsSource.npcs()`, with their ids), the
people of the quests that are not NPCs, and the people whom the texts only name. "Gates" are the
answers behind a score (`docs/features/abilities/`). Each NPC with a gate of Charisma greets a character
by its name (`NpcDef.greeting`).

## On the road: the northern edge of the Sovereignty

| Person (Spanish) | Id, place | Role in the story |
|---|---|---|
| **The merchant** (el comerciante) | `merchant`, by the broken cart (`-3, 123`) | Goes to Ironhold to see if the road can carry a trade with Silverspring. Gives "The Broken Cart". After the help: the news of the trade; INT 13 or CHA 13 hear that the Sovereignty and the Enclave both want the wildlands and play dirty. Refuses a wanted character. |
| **The farmer of Whitegrove** (el granjero de Arboleda Blanca) | `whitegrove-farmer`, at his stall | Waits for the merchant, who should buy his lentils. Gives "Lentils for Bronzehold". Lends his lever for the cart. |
| A villager of Whitegrove | `whitegrove-villager`, Whitegrove | Pages: the shrine is open to all, and the road remembers who steps inside; the goblins run, mostly. |
| **The sergeant of Bronzehold** (el sargento de Bronzal) | `bronzehold-sergeant`, the guard post | A post of the Iron Sovereignty. Takes the lentils and pays. The news of the road: the Sovereignty sends soldiers and settlers to claim the wildlands, towards Silverspring (after the lentils, or WIS 13). |
| A guard of Bronzehold (un guardia de Bronzal) | `bronzehold-guard`, the lane | How the goblins of the woods fight: some run, some fight, and the ones that run are slow. |

## Ironhold

| Person (Spanish) | Id, place | Role in the story |
|---|---|---|
| **Elama Rothenel, the reeve** (la alguacil) | `reeve`, her house on the lane | Runs what is left of the town. Wrote to Thrain first. Gives "The Razed Villages" after the road; asks the character to warn Silverspring ("The Hobgoblin Raid"); takes the fine of a robber of the caravan. Gates: INT 13 (her ledgers, her map), WIS 13 (her fear, the buried savings), CHA 13 (the granary). |
| **Brann, the watchman** (el guardia) | `watchman`, the east gate | "The whole watch, these days." Tells of the imps and the brutes, and of the lamps that keep them out. WIS 13: something else than the candles keeps them out. CHA 13: walk away from the brutes. |
| **Marta, the innkeeper** (la posadera) | `innkeeper`, the Crooked Lantern | Sells ale (2 coins). CHA 13: a room, and her inn becomes a refuge. |
| A minstrel | `minstrel`, the inn | Pages: sad songs. |
| A soldier at the inn | `inn-soldier`, the inn | Plots against the caravan of Silverspring with a villager (the scene "the plot"). |
| A drinker | `drinker`, the inn | The villager of the plot. |
| **The smith** (el herrero) | `smith`, the smithy | Sells armour, a shield and weapons, buys them back for half. Gives a lever for the cart. Buys mithril (10 coins). |
| **The priest** (el sacerdote) | `priest`, the chapel | Keeps the candles of the chapel. Reads the sign of the phoenix: "a god before the gods" (INT 13: "those who seek in the ashes"). Sends the character to the Wrens. |
| **Isolde, the apothecary** (la boticaria) | `apothecary`, the apothecary | Sells the three draughts (CHA 13: a friend's price). The rumour of the phoenix: raiders "from the south" who call themselves the Ashen Seekers. Gates: INT 13 (to brew), WIS 13 (her ashroot). The cauldron in her shop brews draughts (INT 10, 13, 15). |
| A villager | `farmer`, the reeve's house | Argues for a warning to Silverspring (the scene "the argument"). His brother farms by the hills. |
| **A soldier of the Sovereignty** (un soldado de la Soberanía) | `soldier`, the reeve's house | "Ironhold is ours to guard. Ironhold, and nothing else." Will not send soldiers to Silverspring. WIS 13: the Sovereignty wants the hobgoblins to reach Silverspring. |
| **Corwin, the peddler** (el buhonero) | `peddler`, the street | Buys rings (5), cups (3), candle stubs (1), imp horns (2), brute tusks (4), badger furs (4). |
| A widow | `widow`, by the fountain | Pages: the fountain was dry for three summers. |
| A child | `child`, the lane | Sees the character first when it arrives up the south road (the scene "the arrival"), and sends it to the reeve. |

## Silverspring

| Person (Spanish) | Id, place | Role in the story |
|---|---|---|
| **Kasmut Parnika, of the Enclave** (del Enclave) | `kasmut`, the militia hall | A veteran of the Mithril Enclave who trains the militia. Hears the warning of the raid, gives the title in the guard of Silverspring (and the mithril permit when the band fell on the road). Takes the fine of a robber of the caravan. Cynical of Simtu. |
| **Tova, of the Silver Trout** (de la Trucha de Plata) | `host`, the inn | Sells ale. Gives the bed of the guard (a refuge) to a character with the title. |
| **Ilsa, the jeweller** (la joyera) | `jeweller`, the jeweller | Sells mithril at cost (5 coins) to a holder of the permit. |
| **Doran, of the militia** (de la milicia) | `militia`, the west end of the main street | Watches the end of the north road. |
| A panner | `prospector`, by the stream | Pages: mithril dust in the water of the Silvervein. |
| **The driver of the caravan** | the wagon of the convoy (`WAGON_DRIVER`) | Drives the caravan of Silverspring on the north road. Thanks a defender in the name of the Enclave; a robber tells it to hand over the cargo. |

## The wildlands

| Person (Spanish) | Id, place | Role in the story |
|---|---|---|
| **Old Hale** (el viejo Hale) | `hale-survivor`, the Hale homestead | Would not leave the ashes. Shadows came in the night. WIS 13 calms him: one shadow sang like a priest, and they took the box from under the hearth, with his father's black stone from the ruins by the river. |
| **The Tanner girl** (la niña de los Tanner) | `tanner-survivor`, the Tanner homestead | Waits for her mother, who went to Ironhold for help. People in long cloaks with a bird of fire burned the house. WIS 13 calms her: they asked for "the old book". |
| **Mira Wren** | `mira`, the Wren homestead | Lives by the pool of the Silvervein with her two children. Gives the wave stone of her family; pays when the cinder hounds fall (12 coins and a draught). |
| **Sela** | the post of the camp of the Seekers (her conversation is on the post) | A Seeker for six years, tied up because she would not burn a family. Freed, she tells what the Seekers want and sends the character to the shrine of Tigris. INT 13: the Seekers come from a village in the far north, past the spring of the Silvervein. |
| **Himo** | a companion (`HIMO`, look `scout`) | A scout of Ironhold, taken by the hobgoblins. Tied to the post of the war camp; follows the character home to Ironhold. He dies if he falls. |
| **Verath Shadowweave** | the dream of Verath (`VERATH`) | The leader of the Ashen Seekers, who speaks in dreams. Asks the character for the Tear of Tigris. |

## People whom the texts name

- **Thrain Steelforge** (Thrain Forjacero): a dwarf engineer of Thalesferro, and the character's
  employer. The character is his consultant. His letter starts the game (`questlines.md`).
- **Brys**: the other scout of Ironhold, who came back alone.
- **The Ash Warden** (el Celador de Ceniza): a masked Seeker who leads the attack on the shrine and goes
  in ash at half health. Its orders name Verath and "the towns of the plain".
- **The masked woman**: the watcher who looks on at the Wren homestead and goes in a puff of ash.
