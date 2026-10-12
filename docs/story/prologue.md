# The prologue

The prologue tells a new player the world of Kandrax, and then who the character is and what its
mission is. Its texts are in `worlds/wilds/src/prologue.ts` (Spanish: `text-es.ts`), from Fede's
documents on the Drive (`Kandrax AI Context`, `Kandrax - Mundo`, `Kandrax - Dioses`, `0.0 - Guía del
aventurero novato`, `Los Investigadores de Forjacero`, `Lugares/Dominios Centrales`). It tells only
what a person of Kandrax knows. How it plays (the page, the art, the sound) is in
`docs/features/game/prologue.md`.

## The cards

| # | Scene | Title or banner | What the lines tell |
|---|---|---|---|
| 1 | `kandrax` | Title: "World of Kandrax" (the same in Spanish) | Civilization is young in Kandrax: small governments, no big empires. |
| 2 | `ruins` | | Great civilizations were before; cataclysms put them out; their remains are still found. |
| 3 | `map` | | The Dominions: Human (north), Dwarven (mountains of the east), Elven (south), Central (between). |
| 4 | `wild` | | Lands that nobody rules, between and inside the Dominions; beyond them the wild lands of the north and the south, a desert in the east, the Great Sea Ápeiron in the west. Many regions are uncharted; news is slow. |
| 5 | `gods` | | People worship many gods, great and small; the gods show themselves in mysterious ways. **The music rises here** (below). |
| 6 | `iron` | Banner: "Iron Sovereignty" (Soberanía del Hierro), with the second line | The Central Dominions are the youngest. The Iron Sovereignty: south-west, on the Great Sea; capital Iron Bay, a port and a republic of guilds; mining, metalwork, engineering. Its neighbour to the north is the Mithril Enclave. |
| 7 | `mithril` | Banner: "Mithril Enclave" (Enclave del Mithril) | The northernmost Central Dominion, under the mountains; capital Great Bwini, ruled from a great temple; arcane and divine magic. Between the two dominions lie lands that no dominion claims: lawless and dangerous. |
| 8 | `factory` | | In the Iron Sovereignty, next to Iron Bay: Thalesferro, and the factory of Thrain Steelforge, a dwarf engineer. His company makes all kinds of equipment, and he looks into strange arcane events. |
| 9 | `hut` | Title: the character's name; subtitle: its race and class | You are a consultant for Thrain. Homesteads burn in the wildlands north of the Iron Sovereignty. His letter waits on the table of your hut, at the northern edge of the Sovereignty, south of Ironhold. |

The last card leads into the game: the letter on the table starts "The Road to Ironhold"
(`questlines.md`), and the hut is where `world.md` puts it.

## How the player moves through it (Fede, 2026-10-13)

- **The player ends each card.** A card does not go on to the next by itself: when its lines are all
  shown, it stops (the scene stops moving) and waits for the player to finish reading. A press (a key,
  a click, a tap) goes to the next card.
- **The lines of one card** follow one another by their timers, as before: the player does not press
  between the paragraphs of a card.
- **The music** (the theme of Kandrax) has a crescendo with the choir and the violins. It comes with the
  card of the gods (card 5, `crescendo: true`), however long the player took to reach it. If the player
  stays long on an earlier card, the music before the crescendo repeats, with smooth joins. If the
  player goes on quickly, the crescendo fades in at once with that card.
- "Skip" ends the prologue at any time.

## When it plays

After "Create" in the character builder; from "Prologue" in the main menu (once the browser has seen it)
and in the game menu; and with `?prologue` (tests).
