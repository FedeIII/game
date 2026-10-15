# Mobs and fights

This file is part of the documents of the code (see the map in `CLAUDE.md`). Read it before you
change its part of the code, and change it in the same commit as the code.

**The hobgoblin band** (since 2026-10-11, story phase 3; protocol 25): four more kinds, which do not
roam the Wilds (the population has none of them; the story brings them): the **goblin** (an archer:
`MobStats.arrowRange`; from 104 px it aims for 0.75 s and looses an arrow that flies 150 px and
reaches the first player on its way that can be hit (then the goblin's attack roll against its AC),
then it runs off; its arrows have the negative id of the goblin as their owner and `Arrow.from`, and
never hit mobs), the **worg** (a wolf: 112 px/s, straight at the player, `MobStats.straight`), the
**hobgoblin** (a soldier: a quick wind-up, and 2d6 more when another mob stands within 1.5 tiles
of its target, `allyDice`) and the **bugbear** (a heavy blow). Art: `art/mobs.ts` (`humanoid()`
with a `Build` for the goblin, the hobgoblin and the bugbear; `worg()`). `?mob=goblin,worg` shows
them in a world that the page runs. The atlas is 2048 px wide since then.

**The goblins of the forest** (since 2026-10-13, the tutorial: `docs/drafts/tutorial.md`; protocol 36;
`docs/features/game/combat.md`, REQ-CMB-009): the **skirmisher**, the SRD goblin with a scimitar and a
small shield (7 HP, AC 15, +4, 1d6+2), in melee only, with a slow wind-up in which it stands. It
**patrols** (`MobStats.patrol`, `Horde.spawnPatrol()`): a group of 2 or 3 walks a loop round the place
where it came. The first one that sees a player **startles** the group (state `startled`,
`STARTLE_MS` 0.6 s, a red "!" over each head in the text layer, a yelp); then a random number of them,
from none to all (each number with the same chance), **flees** (state `flee`, 64 px/s: slower than a
player, so a player catches it; caught, cornered or hit, it turns and fights; away, it hides for
`HIDE_MS` 10 s and goes back to its loop), and the others fight. A
world chooses where they live: `MobRules.areaAt(tx, ty)` (below; a short population of patrols comes as
one group) and `MobRules.roam(tx, ty, kind)`. `?mob=skirmisher,skirmisher,skirmisher` puts one group 8
tiles east.

**The mobs of an area by day and at night** (since 2026-10-13, Fede's decision; protocol 40;
`docs/features/game/combat.md`, REQ-CMB-010 and REQ-CMB-011): `MobRules.areaAt(tx, ty)` gives the
`MobArea` round a player on that tile: a list of `MobSpawn` by `day` and one at `night` (a kind, `count`
round each player, `behaviour` `wander`, `patrol` or `ambush`, `group`, and `every`: a rare spawn comes
about once in that time round a player). Without it, `population` is the same by day and at night
(`populationArea()`). `Horde.daytime` is the hour (`isDaytime()`: 6:00 to 20:00); the Room sets it from
`RoomOptions.day` and `clock` (the server: `Date.now`, or `GAME_HOUR` for a test), the page from
`skyNow()`. A mob that the area brought and does not want at this hour goes away when no player is within
17 tiles. The Wilds (`FOREST_MOBS` in `source.ts`): in the forest of the tutorial the goblin patrols at
night, and by day the **bandits** (the SRD bandit: 11 HP, AC 12, +3, 1d6+1), rare (a group about every 8
minutes round a player), in a group of 1 to 3 that **ambushes** (`MobStats.ambush`,
`Horde.spawnAmbush()`): it comes 11 to 15 tiles ahead of the player and hides (state `lurk`), creeps after
the player crouched (44 px/s), holds still within 5 tiles, and springs within 2.5 tiles, after a hold of
2.5 s, or at a blow (which takes it unaware). A page shows a lurker only within the seek of its player
(WIS; `seesMob()` in `render/mobs.ts`); it shouts when it springs. In the wildlands (`WILD_MOBS`), 4 imps
and 2 brutes at night, and by day fewer that come seldom (2 imps, about one each minute; 1 brute, about
every two). `?mob=bandit,bandit,bandit` puts one lurking group 3 tiles east.
**Sure confrontations** (`packages/engine/src/confrontations.ts`, `WorldSource.confrontations()`;
REQ-CMB-012): a group that a character meets once. A character for whom `when` holds, outside in `area`
at `hours` for `SETTLE_MS` (6 s), gets a group of the kind ahead of it out of view (`Horde.spawnAhead()`);
when a mob of the kind hunts it, `met` applies (a quest flag; `When.flag` is a condition on it). The Room
runs them after the ambushes, the page in a world that it runs. The Wilds: `FIRST_GOBLINS` (Fede,
2026-10-13): a new character on the road (`road` at `go`, without the flag `goblins`) meets one goblin
patrol in the forest by day; a goblin fight at night sets the flag too (`GOBLINS_MET`).

**The 5e scale** (since 2026-10-11, Fede's decision: `docs/drafts/level-3.md`,
`docs/features/game/combat.md`; protocol 26): a character starts at **level 1** (Fede's decision,
2026-10-13; level 3 before) and rises with its XP (see "Levels and experience" in `docs/code/abilities.md`), the mobs have the
numbers of their SRD stat blocks, and both sides roll to hit against the AC. `MOB_STATS` has
`health`, `ac`, `toHit`, `damage` (dice) and `cr` (the challenge rating: the level of the mob): the imp (a quasit) 7 HP, AC 13, +4, 1d4+3; the
brute (a half-ogre) 30, 12, +5, 2d8+3; the goblin 7, 15; the worg 26, 13; the hobgoblin 11, 18;
the bugbear 27, 16. The dice are in `dice.ts` (`Dice`, `rollDice()`, `attackRoll()`,
`formatDice()`). The rolls come from `Horde.dice` (seeded: the server's in a shared world, the
page's in its own world). A test that counts blows or hits gives `AVERAGE_DICE` (the average of
the dice, and every attack hits): `new Room(world, { dice: AVERAGE_DICE })`, or the 4th argument of
`new Horde()`. `encounters.ts` (`sizeEncounter()`: the 5e XP budget of the levels there) sizes the
encounters of the story to the characters there.

`packages/engine/src/mobs.ts` (`Horde`): hostile mobs of two kinds (`MOB_STATS`): the **imp**,
small and quick (runs at 96 px/s, faster than a player, and keeps running during its short
wind-up, so running away does not save you), and the **brute**, big and slow (42 px/s, a long
wind-up in which it stands, a 2 s stun: you can walk away from it). A mob wanders round its
home, and now and then it moves its home 3 tiles towards the nearest player (a prowl: along
the shortest way through open ground where it may roam, so round a town or a lake; never closer
than 6 tiles), so mobs find players who stand still (in the Town of Azyr, in about 20 to 90 s at its
edge). A mob that stays within 8 px of one point for 1.5 s while it wants to move is stuck (back
and forth between trees): a walk ends, a chase bends the other way and gives up after 4 s. When it sees a player (close, out in
the open, no building between), it runs at the player on a curve (an angle off the straight line
that shrinks as it comes near); close enough, it winds up and strikes. Its attack rolls d20 +
`MobStats.toHit` against the player's AC: a hit stuns the player and takes the rolled
`MobStats.damage` (`hitPlayer`: no move, no attack; see `docs/code/abilities.md`,
Constitution), and after it the player has a guard of 1 s in which no mob can hit it again; the
mob runs away for 1 to 2 s and then comes back. A miss glances off (a spark, no word): no stun, and
the mob chases on. **Mobs that hunt one player take turns** (`Horde.waitFor()`, `nextUp()`): their attacks start one after the other. The
others hound the player: they keep `MobStats.harass` from it (imp 36 to 50 px, brute 42 to 56 px:
out of their reach and out of the player's), move round it, keep apart, and look at it. The line
goes in the order in which the mobs joined it; a miss or the end of a retreat puts a mob at the
end. The next in the line times its approach: it comes into reach when its turn comes, and winds
up at once. **In a pack the attacks overlap** (`overlap()`, since 2026-10-10): the next one may
start when the attack before it has a share of its length left: 0 for one mob, 0.2 for two, 0.4
for three, 0.6 for four, at most 0.75 (the pack: the mobs that hunt the player within 8 tiles of
it). After a stun its wind-up may start that share of a wind-up before the guard ends, so its blow
still comes after the guard. A mob in the pack round its player (close to it) takes its home with
it, and a moment stuck does not end its hunt, so a pack follows a player who moves (before, slow
brutes reached their leash, gave up and saw the player again, over and over). A mob that gives
up does not look for players for 3 s. Each player has a line of its own. Hounding is part of the
state `chase`, so the protocol does not change. A mob never enters a building, gives up the chase when
it loses the player for 1.5 s or is 18 tiles from home, and walks home. New mobs come one at a
time, 17 to 25 tiles from every player (out of sight), up to the world's population round each
player; a wandering mob 36 tiles from every player goes away.

The player's attack is part of the input (`MoveInput.attack`: the direction to strike, an angle
in radians; `PlayerState.aim` keeps it, and the body faces the nearest side), so
`stepPlayer` stays the one rule for prediction: an attack lasts `ATTACK_TICKS` (the player stands
still), and the next can start `ATTACK_COOLDOWN_TICKS` after it. `stepPlayer` returns true when
an attack starts; the caller asks the horde what it hits (`Horde.strike`: in reach, in front;
`attackHits`). A blow (`Blow`, from the player's traits) rolls (`rollBlow()`: d20 + `toHit`
against `MobStats.ac`; a natural 20 rolls the dice twice, a natural 1 misses). A hit takes its
rolled `damage` from the mob's hit points (`MobStats.health`) and pushes it away from the attacker
(`knockback`: imp 10 px, brute 18 px, over 0.2 s, times the Strength of the attacker); a miss does
nothing, but the mob turns on the attacker. The blow that takes the last of them kills it, and
drops loot into the killer's pack (see `docs/code/abilities.md`): it flashes white, falls,
fades, and ash rises. Another hit makes it reel (state `hurt`: a flash and a recoil frame, `hurtMs`
times the Strength of the attacker): its wind-up or its blow breaks off, and then it goes for the
attacker.

A world opts in with `WorldSource.mobs()` (`MobRules`: `roam` where mobs live and wander, `hunt`
where they may step while they chase, `population` per player). The Wilds: everywhere except
water, the ground round a house and the towns (they do not live within 2 tiles of a town, and
they never step into one, so the towns are safe); 4 imps and 2 brutes. The client of a
single-player world runs its own `Horde`; in a shared world the server runs it (protocol 5, see
`docs/multiplayer.md`): the client sends its attacks with the time of the mobs that it showed,
and flashes a mob that a blow touches at once (`MobViews.touch()`); the server rolls, and the
results come in `bl` (protocol 26). In the client: `render/mobs.ts` (frames, eyes, ash), `PlayerView` (the arc, a
lunge, the attack frames of the skin and the effect of its style, in the colour of the style (a
spell in the colour of the skin's orb; spells, flames and palms glow and give a short light),
the red flash of a hit, stars over the head while stunned, a blink while guarded, the roll of a
dodge) and `ui/attack-button.ts` (in the bottom-right corner, under the action button; Space or J on a keyboard). A left click on the
world attacks towards the mouse pointer, from the player's chest (`input/mouse.ts`). A press is
kept for 150 ms. The button and Space aim at the nearest mob in reach (for a ranger, in the range of its arrows), else the way the player
walks, else towards the mouse, else the way it faces. **The facing** (Fede, 2026-10-14;
`docs/features/game/combat.md`, REQ-CMB-014): a player that walks faces its walk (`facingFor()`); one
that stands faces the mouse over the world (`MoveInput.face`, the way from its chest to the pointer:
`facingToward()`, which keeps the facing up to `FACE_SLACK` past a diagonal); without a mouse over the
world (a touch screen) it keeps its facing. An attack and a brace face the way of the attack, a roll
the way of the roll. The server owns the facing (protocol 45), so the others see it. The effect of the attack shows in 16 directions (`fxPlacement()`). `?mob=imp,brute` puts mobs next to the
player at the start (single-player worlds, so the Wilds with `?offline`); `?nomobs` turns them off.

**The sandbox of an admin** (since 2026-10-15, Fede's request in place of an evaluation of the melee draft:
"I test them myself"; `docs/features/game/sandbox.md`, REQ-SBX): "Sandbox" in the main menu or the game
menu, then a character. The page runs the world alone (no server, nothing saved, no XP, no loot); the
character fights three steady foes (`Horde.spawn(..., { health, steady })`: they never startle, flee or
lurk; `Horde.provoke()`) in the glade of `WorldDefinition.sandbox` (the Wilds: (11, 134)), with ten times
its hit points (`SANDBOX_HP`) against five times theirs (`FOE_HP`). A defeat starts the whole sandbox
again with the same character; a victory 2.5 s later. A panel at the bottom left (crossed swords) chooses
the foes and turns each mechanic of `docs/drafts/combat-melee.md` on or off: `packages/engine/src/mechanics.ts`
(`MECHANICS`: grades, riposte, front, flank, parry, guard, shove, clash, reactions, shapes, mobGuards,
stamina), read by `stepPlayer()` (`StepTraits.mechanics`) and by the horde (`Horde.mechanics`). The Room
never turns one on, so a shared world and the wire do not change. What a mechanic did comes as a
`MechanicEvent` (`Horde.takeEvents()`), a word over the player or the mob. A sure effect of the draft
became an edge of the dice (advantage and disadvantage: `attackRoll(..., edge)`, `edgeOf()`), Fede's
choice. A mechanic that Fede keeps becomes a rule of the game, without its switch (and then the Room
and the protocol need it).
