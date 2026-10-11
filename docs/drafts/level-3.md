# Level 3: the 5e scale for hit points, to-hit and damage (draft)

> **Draft** · promotes to `docs/features/` (the ability and equipment documents, and
> `docs/features/game/combat.md`) when built · **Status:** B1 built 2026-10-11 (protocol 26); B2
> (the encounters) comes with the ambush of story phase 3c

The adventures of Kandrax (the chapters on the Drive) are made for a party of level-3 characters,
about six of them. The game used small numbers of its own: a character had about 4 hit points, a
mob did 1 or 2 damage, and a blow always landed. Fede decided (2026-10-11) that the game uses the
basic 5e numbers, and that a new character is the equivalent of a level-3 character:

- **Hit points** of characters and mobs as in 5e (level 3 for characters, the SRD for mobs).
- **Roll the dice**: each blow and each hit rolls its dice (the server rolls in a shared world).
- **To-hit both ways**: a mob rolls its attack bonus against the character's AC; a character rolls
  its attack bonus against the mob's AC. A miss glances off.
- **Encounters for the players there**: a chapter's encounter is for about six level-3
  characters; the game sizes it with the 5e encounter budget for the characters that are there.
- **Slow healing, as at the table**: no hit points come back by themselves; a bed (the home, a
  refuge), a draught or a defeat heals.

The real-time rules stay: a blow must touch the mob (its reach), the dodge, the guard after a stun,
the turns of a pack, the wind-ups. The dice decide what a touch does.

## Characters (level 3)

- **Proficiency bonus:** +2.
- **Hit points:** the hit die of the class at its most, plus twice its average (half the die + 1),
  plus 3 times the CON modifier (at least 1 for each level). Hit dice: barbarian d12; fighter,
  paladin, ranger d10; bard, cleric, druid, monk, rogue, warlock d8; sorcerer, wizard d6.
  A fighter with CON 14: 10 + 6 + 6 + 3 x 2 = 28. A wizard with CON 12: 6 + 4 + 4 + 3 = 17.
- **Attack bonus:** +2, the modifier of the attack ability (as now: STR, DEX for finesse and ranged
  weapons, the casting ability for a cantrip) and a magic bonus.
- **Damage:** the weapon's die (the versatile die with both hands), plus the modifier and the
  magic bonus. Cantrips at level 3: fire bolt and eldritch blast d10, produce flame d8. A monk's
  martial arts: d4 + DEX. An unarmed strike: 1 and the modifier of the attack ability. A natural 20
  doubles the dice; a natural 1
  misses.
- **Sneak attack** (rogue, level 3): +2d6 on a mob that does not hunt the rogue (the rule of now).
- **Opening** (INT, the game's own): + the INT modifier on a mob in its wind-up (as now).
- **AC:** as now (`armourClass()`, 5e).
- Class features of levels 1 to 3 (second wind, rage, smite, spells) come later, one by one.

## Mobs (SRD stat blocks)

| Mob | AC | HP | Attack | Damage | 5e model | XP |
|---|---|---|---|---|---|---|
| imp | 13 | 7 | +4 | 1d4+3, and a poison | quasit (without its magic: as CR 1/4) | 50 |
| brute | 12 | 30 | +5 | 2d8+3 | half-ogre | 200 |
| goblin | 15 | 7 | +4 (shortbow) | 1d6+2 | goblin | 50 |
| worg | 13 | 26 | +5 | 2d6+3 | worg | 100 |
| hobgoblin | 18 | 11 | +3 | 1d8+1, +2d6 with an ally next to the target | hobgoblin | 100 |
| bugbear | 16 | 27 | +4 | 2d8+2 | bugbear | 200 |

- The imp and the brute are the game's own; they take the blocks of the quasit and the half-ogre.
- The poison of an imp bites 2 hit points every 3 s while it lasts (about the 2d4 of the quasit),
  never the last one.
- The hobgoblin's martial advantage: +2d6 when another mob stands within 1.5 tiles of its target.

## The rolls

- **A character's blow** that touches a mob: d20 + its attack bonus against the mob's AC. A hit
  rolls the damage and makes the mob reel; a miss glances off (a spark, "miss"), and the mob does
  not reel. A natural 20 is a critical hit: the dice twice.
- **A mob's hit** that reaches the character (as now: in reach, not stunned, guarded or in a
  dodge): d20 + the mob's bonus against the character's AC. A hit rolls the damage, stuns and
  poisons as now; a miss glances off (the spark of now) and does not stun.
- The dice come from the random numbers of the horde: the server's in a shared world, the page's in
  a world that it runs. Tests can ask for the average of the dice instead of a roll.
- The glancing blows of the equipment (5% for each point of AC over 10, `glanceShare()`) go: the
  roll against the AC takes their place.

## Healing

- No hit points come back by themselves (the `recover` of CON goes).
- A bed of the character (the home, a refuge): all its hit points, as a long rest.
- A healing draught (a potion of healing): 2d4 + 2. A strong draught (a potion of greater healing):
  4d4 + 4. Herbs, with Medicine (WIS 13): 1d4. An antidote ends a poison.
- A defeat: the character wakes at home or at its nearest refuge with all its hit points, and half
  of its coins are lost (as now).
- On the deploy, every stored character gets all its hit points (the old numbers mean nothing on
  the new scale).

## On the screen

- The hit points: a bar with the numbers ("17 / 28"), not a pip for each point.
- Numbers rise over a mob that a blow of the player touches: the damage ("7"), "miss", or a
  critical hit in another colour. Over the player: the damage that it takes, or "miss" for a hit
  that glances off.
- The health bar of a mob (INT 13) shows its share of health, as now.
- In a shared world the page shows the result when the server's word comes: it can no longer know a
  kill before the roll. The server sends the results of the player's own blows (protocol 26).

## Encounters (with the ambush, story phase 3c)

- The 5e budget for one level-3 character: easy 75 XP, medium 150, hard 225, deadly 400. The
  monsters of an encounter count with the 5e multiplier (1 monster x1, 2 x1.5, 3 to 6 x2, 7 to 10
  x2.5).
- A chapter's encounter is a list of units in order (for the scouts: a worg with its goblin; then
  the hobgoblin; then the second worg with its goblin; then the bugbear). The game takes the units in
  order while the adjusted XP stays within the "hard" budget of the characters there (at least the
  first unit). With six characters, the scouts are the whole band, as in the chapter.
- "The characters there": the players within 12 tiles of the place when the encounter starts.

## Phases

1. **B1, the scale:** the dice, the rolls both ways, the hit points of the classes, the mob blocks,
   the healing, the numbers on the screen, protocol 26, the stored hit points reset; tests and the
   documents (abilities, equipment, multiplayer, CLAUDE.md).
2. **B2, the encounters:** the budget, with the ambush of the scouts (story phase 3c, with the
   riders, the road to Silverspring and the grove).
