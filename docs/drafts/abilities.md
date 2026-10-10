# Abilities in the game (draft)

> **Draft** · promotes to `docs/features/abilities/` when built · **Status:** Approved (STR, DEX,
> CON, INT and WIS built: see `docs/features/abilities/`; CHA not yet)

This draft gives the applications of the six ability scores in the game. Each application has
an ID. Fede picks the applications; then we make their mechanics and apply the scores to them,
one ability after the other (STR first). The scores come from the character builder
(`packages/engine/src/character.ts`); before this work, they do nothing in the game.

Status: Strength is done (2026-10-10, protocol 11), Dexterity (protocol 12), Constitution
(protocol 13), Intelligence (protocol 14), Wisdom (protocol 15). Next: Charisma. Decided: Option B (below).

## How the numbers work

A score goes from 8 to 17 (15 from the point buy, +2 from the race). Thus the modifier (mod,
`abilityModifier()`: (score - 10) / 2, rounded down) is -1, 0, +1, +2 or +3. There are two kinds
of effect:

- **Scale:** a number changes with the mod. For fights.
- **Gate:** a score of 13 or more opens something. For words and the world. A gate is a fixed
  limit, not a d20 roll: the player can see why, and a conversation cannot be opened again for a
  new roll. (Open: gates or d20 rolls.)

In the tables, **Exists** means that the engine has the mechanic and only a number changes;
**New** means that the mechanic must be made. ★ marks the first recommendation.

## The attack ability: Option B (decided, 2026-10-10)

Each class attacks with its main ability, not with STR for all:

- STR: barbarian, fighter, paladin.
- DEX: bard, monk, ranger, rogue.
- WIS: cleric, druid.
- INT: wizard.
- CHA: sorcerer, warlock.

The ability comes from the class, not from the attack style: a wizard with a plain staff bashes,
and a cleric hits with a mace, but they attack with INT and WIS. Thus each class fights well
with the ability that the builder marks for it. Option A (STR gives the damage of every class)
was refused: a wizard with STR 8 would hit weakly, and INT would do nothing in a fight.

## STR (Strength)

| ID | Application | Mechanic | Sketch |
|---|---|---|---|
| S1 ★ | Damage of the attack ability (S1 for STR, I1, W3, Ch2 and the DEX classes the same) | New: mob health in points | Imp 3 points, brute 12. A blow does 4 + mod: a brute takes 4 blows at -1, 3 at 0 and +1, 2 at +2 and +3. One blow always kills an imp. |
| S2 ★ | Stronger knockback, for all classes | Exists (`knockback`) | Push x (1 + 0.15 x mod): a brute goes 15 px at -1, 26 px at +3. More room in a pack. |
| S3 | A longer stagger | Exists (`hurtMs`) | A mob reels for `hurtMs` x (1 + 0.2 x mod). |
| S4 | Wade through water | New: water by ability | With STR 13+, the player walks in shallow water at half speed. Lakes become shortcuts. Mobs never step into water, so the water becomes a safe place: it needs a rule (for example, no attack in water). |
| S5 | Force a barred door, move a heavy thing | New: conditions on content | A barred door in a Wilds house, a fallen tree on a path: STR 13+ opens it. |
| S6 | Carry more | New: inventory | 6 + 2 x mod slots. |

## DEX (Dexterity)

| ID | Application | Mechanic | Sketch |
|---|---|---|---|
| D1 ★ | Quicker attacks | Exists (`ATTACK_COOLDOWN_TICKS`) | 27 - 2 x mod ticks: one attack every 0.48 s at -1, every 0.35 s at +3. |
| D2 ★ | Dodge roll | New: dodge | A dash of 2 tiles in 0.25 s, in which no mob can hit. Cooldown 1.6 s - 0.2 s x mod. A button and a key (Shift). |
| D3 ★ | Stealth | Exists (mob `sight`) | Sight x (1 - 0.08 x mod): an imp sees you from 121 px at -1, from 85 px at +3. A slow walk (half input) halves it again. |
| D4 | A longer guard after a hit | Exists (`GUARD_TICKS`) | 1 s + 0.15 s x mod. Easier to get out of a pack. |
| D5 | Ranged attacks | New: projectiles | The bow and thrown daggers shoot; DEX gives the range. Now the ranger's bow is only a look. |
| D6 | Pick locks | New: locks and loot | Locked chests in the Wilds houses: DEX 13+ opens them. |
| D7 | A faster walk | Exists (`PLAYER_SPEED`) | Not recommended: "an imp is faster than you" is a design rule now. |

## CON (Constitution)

| ID | Application | Mechanic | Sketch |
|---|---|---|---|
| C1 ★ | Hit points (HP) | New: HP and defeat | Now a hit only stuns, so a fight has no risk. HP = 4 + mod (3 to 7); an imp's hit costs 1, a brute's 2. At 0 the character falls and wakes at home (or at Thornwick's chapel). HP comes back out of a fight. (Open: where a defeated character wakes, and if it loses something.) |
| C2 ★ | A shorter stun | Exists (`stunTicks`) | Stun x (1 - 0.1 x mod): at +3 an imp's 1 s becomes 0.7 s, a brute's 2 s becomes 1.4 s. |
| C3 | Faster recovery | New, with C1 | 1 HP back every 8 s - 1 s x mod, out of a fight. |
| C4 | Stamina | New: stamina | A bar for the dodge (D2) and a sprint; CON gives its size and how fast it fills. |
| C5 | Resist poison and drink | New: effects | A poison from a new mob, or ale at the Crooked Lantern: CON gives how long the effect stays. |

## INT (Intelligence)

| ID | Application | Mechanic | Sketch |
|---|---|---|---|
| I1 ★ | Spell power of the wizard | Option B | As S1, with INT. |
| I2 ★ | Lore | New: conditions on content | INT 13+ gives extra pages on things (the runes on a stone, an old book on a shelf, the notice board) and extra answers in conversations ("[Int] The reeve's numbers do not add up."). Hints to secrets. |
| I3 ★ | Read the foe | New: mob information | With INT 13+, a small bar shows the health that a mob has left; with 15+, it shows its open moment (the end of its strike). |
| I4 | Use an opening | Exists (mob states) | A blow on a mob in its wind-up does + mod damage. A reward for timing. |
| I5 | Map | New: map | A map of the land that the character saw; INT gives its detail (houses, the road, the town). |
| I6 | Craft | New: inventory and crafting | Herbs and the apothecary: INT gives the recipes that you know. |

## WIS (Wisdom)

| ID | Application | Mechanic | Sketch |
|---|---|---|---|
| W1 ★ | Sense danger | New: danger mark | A mob that hunts you out of sight shows a small mark at the edge of the screen. Range 8 + 2 x mod tiles. |
| W2 ★ | Insight in conversations | New: conditions on content | WIS 13+ gives extra answers: you see that an NPC hides something ("[Insight] You do not tell me all of it."). |
| W3 ★ | Spell power of the cleric and the druid | Option B | As S1, with WIS. |
| W4 | Eyes for the night | Exists (`darkness`, client only) | Darkness x (1 - 0.08 x mod). Only the picture; no server work. In D&D this is a race trait (darkvision: dwarf, elf, gnome, half-elf, half-orc), so it can be a race trait instead. |
| W5 | Find hidden things | New: hidden fixtures | Herbs, tracks and caches show only within 2 + mod tiles. |
| W6 | The way home | New: compass | With WIS 13+, a small arrow points to the home in the dark forest. |
| W7 | Medicine | New, with C1 | A rest at home, or a herb, gives back more HP. |

## CHA (Charisma)

| ID | Application | Mechanic | Sketch |
|---|---|---|---|
| Ch1 ★ | Persuasion, deception, intimidation in conversations | New: conditions on content | Extra answers behind a gate, each with its label ("[Persuasion]"): the watchman tells you of a danger, the innkeeper gives you a room. |
| Ch2 ★ | Spell power of the sorcerer and the warlock | Option B | As S1, with CHA. |
| Ch3 ★ | Presence over mobs | Exists (`overlap()`, retreat) | The overlap share of a pack - 0.05 x mod; the retreat after a hit 10% x mod longer. Packs press you less. |
| Ch4 | Inspire other players | Exists (multiplayer) | Other players within 3 tiles get + 0.1 s x mod of guard after a hit. CHA becomes the ability of the group in the shared Wilds. |
| Ch5 | Reputation | New: NPC memory | With CHA 13+, NPCs say your name in their lines, and some open a shut door for you. |
| Ch6 | Prices | New: coins and shops | The smith and the apothecary sell for 10% less per mod. |
| Ch7 | Companions | New: followers | Hire a sellsword at the inn; CHA gives how many. A big job. |

## The new mechanics behind them

From the most value per work:

1. **Conditions on content**: a gate (ability, minimum score) on a dialog answer, a page or a
   door. One small mechanic for five abilities: S5, D6, I2, W2, Ch1. The server knows nothing of
   conversations, so the work is in the engine data and the client.
2. **Mob health in points**: S1, I3, I4. Small.
3. **HP and defeat**: C1, C3, W7. Medium; it needs a decision (what happens at 0).
4. **Dodge roll**: D2, C4. Medium: input, an animation, a rule in `stepPlayer()`.
5. **Big jobs**: inventory, crafting, shops, map, projectiles, companions.

**For the engine:** the scores go into the player state, so `stepPlayer()` gives the same
result in the prediction and on the server. The server takes the scores from the stored
character, as it takes the look and the name (a protocol change). A guest (`?nomenu`) gets 10 in
every score (mod 0).

## Plan

Fede's decision (2026-10-10): implement all the applications of each ability with their new
mechanics, one ability at a time. For each: propose the exact changes, settle the open
questions with Fede, implement, commit and deploy; then the next ability. Order: STR, then the
others.

## STR: the agreed plan (2026-10-10)

Decisions (Fede, 2026-10-10):

1. The damage of a blow uses the attack ability of the class (Option B) for all 12 classes, in
   this step: thus I1, W3, Ch2 and the damage of the DEX classes come with S1.
2. Brute health 12, imp health 3.
3. Push and reel (S2, S3) use STR for every class: the force of the body.
4. Gates are fixed limits (13+), not d20 rolls.
5. S4: only a band of shallow water at the shore (a new ground, `Shallows`), not all water.
6. S4: water stays solid for all mobs (imps too).
7. S5: a forced door gets its boards again after 30 minutes with no player within 30 tiles; the
   chest of that house fills again at the same time.
8. S5: no fallen tree (dropped).
9. S6 items: coins; an imp horn (1 kill in 3); a brute tusk (1 kill in 2) with 2 to 6 coins;
   chest loot: coins and one of candle stub, silver ring, pewter cup, bundle of herbs. No item has
   a use yet (CHA prices, CON potions, WIS herbs give them uses later).
10. S6: one loot per chest for the whole shared world; a chest fills again 30 minutes after it
    was emptied (the chest of a barred house: when its boards come back).
11. S6: with a full pack, a drop is lost and loot stays in the chest; the player says "My pack is
    full."
12. The builder (step 2) and the "You" section show what each score gives, in words and numbers.

The changes:

- **The base, for all abilities.** `ATTACK_ABILITY` in `character.ts`. `traits.ts`:
  `PlayerTraits` (what the scores give in the game), `traitsOf(scores, class)`, `GUEST_TRAITS`
  (every score 10), and `Gate` (`{ ability, min }`) with `meetsGate()`. The server makes the
  traits from the stored character (`Room.join()`); the page makes the same ones, so the
  prediction stays equal. Protocol 11.
- **S1.** Mob health in points (imp 3, brute 12). `Horde.strike()` takes a `Blow` (`damage`,
  `push`, `stagger`); `damage = 4 + mod` of the attack ability. The page predicts a kill when
  `health <= damage`.
- **S2, S3.** Each blow keeps its push and its reel time in the mob's brain: push =
  `knockback` x (1 + 0.15 x STR mod), reel = `hurtMs` x (1 + 0.2 x STR mod).
- **S4.** `Ground.Shallows`: a band of water at the shore, solid like water for everyone except a
  player with STR 13+. In it the player walks at half speed and does not attack. The page hides
  the lower part of the figure under the water line and shows a ripple (`fx/ripple/<i>`).
- **S5.** `Building.barred` (a gate). `useDoor()` gives `'forced'` (the boards break; then it is
  an ordinary door) or `'barred'`. The server checks the gate with the stored traits; the
  welcome and the snapshots carry the forced doors. One Wilds house with a chest in four is barred
  (never the home or the house east of it); art `wall/<walls>/door/boarded`.
- **S6.** `items.ts`: the item kinds, a pack of slots (6 + 2 x STR mod: 4 to 12), and
  `addToPack()`. The coins go in a purse, not in a slot (decided in the implementation: a weak
  character would lose a quarter of its slots to them). A kill can drop an item into the killer's pack; a chest in a Wilds house gives
  loot (more in a barred house). In a shared world the server owns the pack: the store keeps it
  (column `pack`), the snapshots carry it, and an input batch can open a chest (`u`). With
  `?offline` the pack stays in the page. A pack button (top right) opens a panel with the slots.
  Item icons `item/<kind>` (16 x 16).

## DEX: the agreed plan (2026-10-10)

Decisions (Fede, 2026-10-10):

1. D1 quicker attacks: the cooldown is 27 - 2 x mod ticks (0.48 s at -1, 0.35 s at +3).
   D4 a longer guard: 60 + 9 x mod ticks (0.85 s to 1.45 s).
2. D2 dodge: 2 tiles in 0.25 s, and no mob can hit during all of it; the cooldown is
   96 - 12 x mod ticks (1.8 s to 1.0 s). Shift on a keyboard, a right click with a mouse, and a
   third round button on a touch screen.
3. D2: a real roll, with frames of its own in every skin sheet (SKIN_VERSION goes up).
4. D3 stealth: the sight of mobs x (1 - 0.08 x mod); half of that while the player sneaks. A slow
   walk (half speed or less) and standing still are sneaking; `C` toggles the sneak walk on a
   keyboard; a small push of the joystick is a slow walk.
5. D3: while the player sneaks, its torch is smaller (radius 96, not 150) and the figure a
   little darker. When stamina exists (C4), sneaking uses stamina too.
6. D5 ranged attacks: only the ranger shoots (the bow), with unlimited arrows. The range is
   5 + 1 x mod tiles, at 240 px/s; an arrow takes the damage of a blow.
7. D5: every attack of a ranger is an arrow (no melee for the ranger).
8. D6 pick locks: one chest in three of the houses that are not barred is locked (a gate:
   DEX 13) and gives better loot. The pick is instant ("The lock clicks open."); each opening needs
   DEX 13, so a lock keeps no state. Without it: "It is locked. I cannot pick it."
9. D7 a faster walk: dropped. "An imp is faster than you" stays a rule.

Notes from the implementation (2026-10-10):

- Standing still hides a player from mobs as a slow walk does, but its torch stays full: the
  torch shrinks only while the player sneaks on purpose (a slow walk, or the sneak walk of C).
  A torch that shrank at every stop would blink all the time.
- An arrow takes the damage and the force of the ranger's blow, so a ranger with DEX 14 or more
  (a damage of 6 or 7) kills a brute in two arrows.

## CON: the agreed plan (2026-10-10)

Decisions (Fede, 2026-10-10):

1. C1 hit points: HP = 4 + mod (3 to 7); an imp's hit costs 1, a brute's 2; a hit still stuns.
2. A defeated character wakes at home, unless it has entered the chapel of Thornwick: then it
   wakes at the nearer of the two. The store keeps which refuges a character has entered.
3. A defeat costs half of the coins; the items stay.
4. C3 recovery: after 8 s with no hit, 1 HP every 8 - mod s (5 to 9 s); "Rest" at the bed of the
   home gives full HP.
5. HP is saved with the character between sessions.
6. C4 stamina: only the roll and the sneak walk use it; no sprint. Max 100 + 10 x mod; a roll
   costs 35, the sneak walk 8 per s; it fills at 20 + 4 x mod per s, 1 s after the last use.
   Without stamina: no roll, and no stealth bonus from the sneak walk.
7. C2 a shorter stun: stun x (1 - 0.1 x mod).
8. C5 effects, now: an imp's claws poison (1 HP every 3 s for 6 s x (1 - 0.15 x mod)); ale from
   the innkeeper for 2 coins (the walk sways for 60 s x (1 - 0.15 x mod)).
9. Two fall frames ("falls", "lies") in every skin sheet; red HP pips at the top left, a thin
   stamina bar under them, a red flash at the screen edges on a hit, a fade to black at a defeat.
10. A fix to DEX in this step: a walk in shallow water does not count as sneaking.

Fede's rule (2026-10-10): document every feature in `docs/features/` in the REQ/AC format of
`platform-docs` (streaming-platform).

Notes from the implementation of CON (2026-10-10):

- A poison never takes the last hit point: an imp's claws cannot defeat a character by
  themselves.
- A rest also ends a poison and a drink.
- Found while testing (older than the abilities: it is the same at the commit before STR): a pack
  of four mobs hits a player who stands still only a few times in the first 10 s, and then it
  stays in "chase" without new attacks. A player who moves keeps the pack in the fight. To look
  at with Fede.

## INT: the agreed plan (2026-10-10)

Decisions (Fede, 2026-10-10):

1. **The display of a gate, for every ability** (Fede's rule): with the score of the gate or more,
   the thing is open (an answer to choose, a page to read, a door to force). With a score 1 or 2
   under the gate, the player sees a dim clue with the gate ("[INT 13]"), and it cannot use it.
   With a lower score, the player sees nothing of it. This applies to every gate in the world:
   answers, pages, barred doors, locked chests, recipes. (The traits list of the builder and of
   the "You" section is the rule book: it names every gate.)
2. I3 read the foe: INT 13+ shows a thin bar of the health of each mob; INT 15+ shows a white
   glint on a mob in its wind-up.
3. I4 use an opening: a blow (or an arrow) on a mob in its wind-up does + max(0, INT mod) damage,
   for every class.
4. I5 map: a map panel (M and a button) of the land that the character has seen; the server
   keeps the seen chunks. Everyone: the ground and the home; INT 11+: the houses and the road;
   INT 13+: names and refuges; INT 15+: barred houses and locked chests.
5. I6 craft at the apothecary's cauldron: INT 10+ a healing draught (2 bundles of herbs: +2 HP);
   INT 13+ an antidote (a bundle of herbs and an imp horn: ends a poison); INT 15+ a strong
   draught (2 bundles of herbs and a brute tusk: all HP). The player drinks them from the pack
   panel (a click, or a number key).
6. Fix in this step: a pack of mobs stops its attacks on a player who stands still.
7. I2 lore: gated pages on things and gated answers in conversations (INT 13); at most one gated
   answer in a node.

Built (2026-10-10, protocol 14): see `docs/features/abilities/intelligence.md`. Notes:

- The fix of 6: a mob that was next in the line but stuck out of its reach kept the turn for ever,
  so no other mob of the pack attacked. Now it goes to the end of the line (`Horde.chase()`).
- The rule of 7 changed a little in the build: a node can have more than one gated answer, but
  never only gated answers, and every node can end the conversation without a gate
  (`checkDialog()`). The cauldron is such a node: three recipes behind gates, and "Leave it.".
- The rule of 1 applies to barred doors and locked chests too: with a score 1 or 2 under the gate
  the player says the full line and the tag ("It is locked. I cannot pick it. [DEX 13]"); with a
  lower score only "It is locked.".

## WIS: the agreed plan (2026-10-10)

Decisions (Fede, 2026-10-10: "all recommendations are ok"):

1. W1 sense danger, a scale for every character: a red mark at the screen edge for each mob that
   hunts the player out of view, within 8 + 2 x mod tiles; only the player's own hunters.
2. W2 insight (WIS 13, the gate rule): one answer for each of Brann, Marta, Isolde and Aldous;
   Aldous tells of a buried cache (a hidden box with loot).
3. W3 the damage of the cleric and the druid: already built with Option B.
4. W5 hidden herbs: a patch in about each cell, seen within 3 + 2 x mod tiles; one bundle; it grows
   again after 20 minutes.
5. W7 Medicine (WIS 13): chew a bundle of herbs for 1 HP.
6. W6 the way home (WIS 13): an arrow at the screen edge to the home.
7. W4 eyes for the night: the darkness x (1 - 0.08 x mod), only in the page.

Built (2026-10-10, protocol 15): see `docs/features/abilities/wisdom.md`. Notes:

- On a wide screen the view is often wider than the sense, so the danger marks show mostly above
  and below the player; on a phone (a narrow view) they show at the sides too.
- The reeve's line places the cache "across the lane from their door, a few steps to the west",
  not "by the tree": in about one seed in nine the tree of the plan does not grow there.
- A patch and the cache stay as they are when they are empty: the page does not know the state of
  the loot in a shared world. A press says that somebody picked or dug it.
