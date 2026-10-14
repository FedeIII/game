# Staying in melee (draft)

Status: a draft of 2026-10-14. Fede's request: a combat system of our own, where the player and the
mobs can stay in melee and still be safe from a blow, without the roll or the kite that take them
out of it. Step 1, **the brace**, is built (`docs/features/game/combat.md`, REQ-CMB-013). Everything
after step 1 is a proposal for Fede to choose from. Nothing after step 1 is built.

## What stays

- **The rolls.** A blow and a mob's hit roll d20 against the Armour Class, as now. A defence below
  changes who rolls, or the odds (the advantage and the disadvantage of 5e: two d20, the higher or the
  lower). It never takes the dice out of the fight.
- **The wind-up.** A mob tells its blow with its wind-up. Every defence below reads it.
- **The roll and the kite.** They stay. They take the player out of melee; the new moves keep it in.
- **Fede's rules** (`docs/game-design.md`): few enemies, slow moves that must be well timed, the right
  ability, and positioning.

## The problem

Today a player is safe from a blow in four ways: out of reach (the kite, the roll), in a dodge, in the
guard after a stun, or by a miss of the mob's roll. The first two take it out of melee, the third
comes only after a hit, and the last is luck. So a fight is a cycle: in, one blow, out, and in again.

## Step 1: the brace (built)

A step back in the first 0.15 s after a melee attack does not walk away. The player stays where it
is, faces the way it struck, and braces for 0.3 s (the knees bent, the weapon up), and longer while it
holds the step back. A mob's blow that comes in the brace rolls against the AC + 2 + the DEX modifier
(at least + 1). A miss keeps the brace, and the player sways out of the blow ("evade"); a hit stuns it
and ends the brace. Then the player walks again. A roll or the next attack breaks a brace. It costs
nothing.

**The change of 2026-10-14** (Fede's decisions): at first, a blow in the brace got no roll at all (a sure
evade, and no mob could hit the player for 0.25 s), and the brace always ended after 0.3 s. Fede asked
for no sure effect and a held brace. The brace now changes the odds only (the first question below).

| What | Ticks | Seconds |
|---|---|---|
| An attack (the player stands) | 18 | 0.3 |
| The window for the step back, after the attack | 9 | 0.15 |
| The brace (at least; longer while the step back is held) | 18 | 0.3 |
| The evade (a look of a miss in the brace) | 15 | 0.25 |
| From an attack to the next one (DEX 10) | 27 | 0.45 |

The odds, for a brute (+5) against AC 16 (chain mail): out of a brace it hits on 11 or more (50%). In a
brace with DEX 10 (+2) it hits on 13 (40%), with DEX 14 (+4) on 15 (30%), with DEX 16 (+5) on 16
(25%).

The wind-ups of the mobs: imp 280 ms (it runs during it), worg 380, hobgoblin 460, bugbear 600, bandit
600, brute 650, skirmisher 700.

How it plays:

- The attack and the brace cover 0.6 s from the start of the attack, and the next attack can start in
  the brace (at 0.45 s). A player that strikes, braces and strikes again has the AC of the brace in
  all of that time except its own attacks.
- Against a brute (650 ms), strike 0.2 to 0.35 s into its wind-up, then step back. A blow that hits
  makes the brute reel (no blow comes); a blow that misses leaves its blow to the brace.
- Against an imp (280 ms), the blow comes in the brace only when the imp starts its wind-up during the
  attack of the player. Against an imp, the brace is a hard timing.
- The glint of INT 15 on a wind-up (reading a mob) helps to time it.

A test in the browser with the first, sure evade (a fighter of level 1 with 10 hit points, against a
brute): nine blows killed the brute, and the fighter took no hit. Fede then took the sure evade away.

### What to watch in a game

1. **Is it too strong, or too weak?** A held brace gives its AC for as long as the player holds it, but
   the player does not attack meanwhile. The AC can grow or shrink (`BRACE_AC`), or apply only from the
   front (proposal 3).
2. **Does it take the kite away?** Next to a mob, a step back right after a blow now braces. A kite
   must wait 0.15 s, or roll. If that feels slow, a brace can start only after an attack that touched
   a mob. The page and the Room know the touch; `stepPlayer()` does not, so the caller must tell it.
3. **The lengths.** The window and the brace can grow with DEX, as the cooldown does (1 tick for each
   point of the modifier).

## Proposals

Each proposal gives what it is, its input, its timing, its dice, who has it, its price, how a foe
answers it, and the work.

### 1. Grades of the brace

- The time from the start of the brace to the blow gives a grade:
  - **Sharp** (the blow comes in the first 6 ticks, 0.1 s): an evade, and a riposte (proposal 2). The
    word is "evade!".
  - **Clean** (ticks 7 to 12): an evade, as now.
  - **Late** (ticks 13 to 18): the tension goes. No evade, but the mob rolls with disadvantage.
- Why: the exact timing gets more than the safe timing, and the dice stay in play at the edge.
- Work: small, the engine only. `missPlayer()` and `armourNow()` read the ticks of the brace;
  `attackRoll()` gets a second d20 for the disadvantage.

### 2. The riposte

- A sharp evade puts the mob off balance for 0.4 s: it cannot wind up, and the next blow of the player
  in that time rolls with advantage, with its INT opening.
- 5e: the Riposte of the Battle Master, and advantage.
- Why: the brace becomes a way to attack, not only to defend: strike, brace, evade, riposte.
- Work: medium. A flag or a state of the mob (the recoil frame of `hurt` can show it), the advantage of
  a blow in `rollBlow()`, and a state code on the wire.

### 3. The front of a brace

- A brace evades only a blow from the front: from a mob within 90 degrees of the way of the attack. A
  blow from the side or from the back rolls, as now.
- With one mob nothing changes. With two or three, the player must put them in front of it: a step to
  the side, a wall or a tree at its back, a doorway. That is positioning (Fede's rule).
- Work: small, the engine only: `armourNow(player, ac, braceAc, from)` gets the place of the mob.
- **Recommended for the next game test**, with proposal 1.

### 4. The sidestep

- A step to the side (60 to 120 degrees from the attack) in the same window: a quick step of 10 px to
  that side, then a brace there.
- An evaded blow then leaves the player at the flank of the mob. The mob must turn first (a short
  pause before its next wind-up), and the next blow of the player rolls with advantage (the optional
  rule of 5e for flanking).
- The three ways after a blow: back is the brace where the player stands, the side is the sidestep to
  the flank, and forward is a walk.
- Work: medium. A short move in the engine (as a slow roll), a turn time for the mobs, and a step frame
  (the brace frame can serve).

### 5. The parry

- An attack while a mob's blow comes (in the last 0.15 s of its wind-up) is a parry, not a blow: the
  weapon meets the mob's weapon.
- The dice: the SRD knight and the SRD bandit captain have the reaction Parry: the proficiency bonus
  goes on the AC against that blow (+2; +3 at level 5). The mob then rolls. A miss is a parry: steel
  rings, sparks, and both go back 4 px. A hit takes its damage, as now.
- Grades: in the last 5 ticks of the wind-up, a sure parry (no roll) and a riposte (proposal 2).
  Earlier in the window, the AC bonus. Earlier still, it is an attack into the wind-up, as now (the INT
  opening).
- Who: a melee weapon in the hand. Not a bow, and not an empty hand (a monk deflects: proposal 9).
- The choice: strike into the wind-up (damage and the opening), or wait and parry (safety).
- Work: medium. The server has both times (the input and the wind-up of the mob). A parry pose (the
  guard of the brace, `GUARDS`, can serve), and a clash sound.

### 6. The guard stance, and the shield block

- A hold of the dodge button (a tap stays the roll) raises a guard. The player walks at half speed,
  faces its aim, and does not attack. A blow from the front rolls with disadvantage (5e: the Dodge
  action, here only from the front). The guard costs stamina each second (12).
- With a shield it is a block: the guard costs stamina only for each blow that it takes (15), not each
  second. So a shield gives more than its +2 AC.
- Who: everyone; the block for a shield (the kits of the cleric, the fighter and the paladin).
- The answer of a foe: a heavy blow (the bugbear, the brute's slam: proposal 10) breaks a guard. Then
  no disadvantage, and a short stun.
- Work: medium. A hold state in the engine and a bit in the input; a guard pose and a block pose; a
  hold on the dodge button of a touch screen.

### 7. The shove

- A roll forward into a mob in reach is a shove. Today such a roll goes into the mob, which is of no
  use, so the input is free.
- The dice (5e Shove): d20 + STR + proficiency against d20 + the STR or the DEX of the mob. A win
  pushes the mob back 1 tile, or knocks it down for 0.8 s (no wind-up, and blows on it roll with
  advantage). A loss: nothing, and the stamina of the roll is spent.
- 5e: a character cannot shove a creature more than one size larger. A halfling cannot shove a brute.
- Why: it makes room in melee without a retreat, and it gives STR one more use for every class.
- Work: medium. A contest with the horde's dice, a size and the STR of each mob in `MOB_STATS`, a shove
  pose (the palm frame can serve), a fall frame for each mob.

### 8. The clash

- When the blow of the player and a mob's blow land within 3 ticks of each other, face to face, the
  weapons meet: each side rolls its attack, and the higher wins. The loser reels; nobody takes damage.
  A tie: both go back.
- Why: a trade of blows becomes a contest, and it keeps the dice.
- Work: medium. The server has both times; a clash effect and a sound.

### 9. Reactions of the classes

The SRD gives some classes a reaction for the same moment. Here each one is a class feature of
levels 1 to 5 (the class features come later: `docs/features/game/levels.md`). "Once per rest" of 5e
becomes a cooldown of about 30 s, or once in a fight.

| Class | 5e feature (level) | In the game |
|---|---|---|
| Wizard, sorcerer | The spell Shield (1) | Their brace is a Shield: no sure evade, but +5 AC against every blow from the start of the brace to 0.3 s after it. It covers two mobs of a pack. A blue pane flashes. |
| Monk | Deflect Missiles (3); Patient Defense (2) | A brace against an arrow catches it; later, with ki, the monk throws it back (1d10 + DEX). The guard stance (proposal 6) costs it no stamina. |
| Rogue | Uncanny Dodge (5) | Once in 30 s, a hit in its own attack (out of a brace) takes half damage: one mistake is forgiven. |
| Fighter | The fighting style Protection (1) | With a shield, its brace also covers another player within 1 tile: blows on that player roll with disadvantage. |
| Barbarian | Rage (1) | No brace is necessary: a rage halves the damage for 1 minute. The barbarian trades blows on purpose. |
| Ranger | — | The kite stays its art: arrows never brace. |

### 10. The shapes of a mob's blow

- Each kind of mob gets one or two kinds of blow, each with its own wind-up pose and its own answer:

  | Shape | Mobs | Answers that work | Answers that fail |
  |---|---|---|---|
  | Sweep: wide | brute, bugbear | brace, block | sidestep (the sweep follows) |
  | Thrust: straight | hobgoblin, bandit, skirmisher | sidestep, brace, parry | — |
  | Slam: overhead, a long wind-up | brute (now and then), Devastator | roll, sidestep | brace, block, parry (it breaks them) |
  | Bite: quick | worg, hound | brace, parry, block | — |

- Why: the right defence depends on the tell, and reading a mob (INT) helps (Fede's rule: the right
  ability). The player must look at the mob, not only at the clock.
- Work: the most of all. A wind-up for each shape and each mob (art), a kind of blow in the engine,
  and its code on the wire. Begin with the mobs of the story: the hobgoblins, the bugbear, the
  Devastator.

### 11. Mobs that keep their guard too

The same moves for the mobs, so that a fight has two sides and the player must read them:

- **The hobgoblin** (SRD: a shield, AC 18) raises its shield after its blow, for 0.5 s: a blow of the
  player then rolls with disadvantage. The answers: wait out the guard, strike from the flank
  (proposal 4), or shove it (proposal 7).
- **The skirmisher** (the SRD goblin: Nimble Escape) steps aside after its blow (a short roll of 1
  tile) instead of a run away. It stays in melee, but out of the reach of a riposte.
- **The bandit captain** (SRD: Parry, +2 AC against one melee attack): a new mob for the bandits of the
  forest. It parries the first blow after its own.
- **The bugbear** waits out a brace: when its target braces, it holds its wind-up up to 0.4 s more (a
  feint), and strikes when the brace ends. The answers: strike into the held wind-up (the INT opening),
  or roll. With INT 15 the glint does not come on a feint, so the reader knows.
- **The brute** keeps no guard: the plain foe, to learn on.
- Work: medium for each mob. A guard state after the blow (an AC bonus or a disadvantage), the feint
  (the horde reads `PlayerState.brace` of the target), a guard pose for each kind, and state codes.

### 12. A price in stamina, for all of the above

- A defence in melee costs stamina (CON): an evade 10, a parry 10, a blocked blow 15, the guard stance
  12 each second, a shove 20. A sharp grade costs nothing.
- At 0 stamina there is no brace, no parry and no block: the player must leave melee (a walk; the roll
  needs 35).
- Why: a fight gets a rhythm (in melee while the stamina lasts, then out to breathe), and CON matters
  more for a fighter at the front.
- Work: small, the engine only (the costs are in `player.ts`, as `DODGE_STAMINA`).

## All the proposals

| # | Name | Input | Timing | Dice | Who | Price | Work |
|---|---|---|---|---|---|---|---|
| 1 | Grades of the brace | step back | the blow in the brace | disadvantage when late | melee | — | small |
| 2 | Riposte | the next blow | after a sharp evade | advantage | melee | — | medium |
| 3 | The front of a brace | — | — | — | melee | — | small |
| 4 | Sidestep | step to the side | as the brace | advantage from the flank | melee | — | medium |
| 5 | Parry | attack | the end of the wind-up | + proficiency to AC | a melee weapon | stamina? | medium |
| 6 | Guard stance, block | hold dodge | a hold | disadvantage | all; block: shield | stamina | medium |
| 7 | Shove | roll into a mob | any | STR contest | all (size) | stamina | medium |
| 8 | Clash | — | blows within 3 ticks | opposed rolls | all | — | medium |
| 9 | Class reactions | as the brace | as the brace | Shield +5 AC, half damage | each class | cooldown | medium each |
| 10 | Shapes of blows | — | the tell | — | mobs | — | large |
| 11 | Mob guards | — | after the mob's blow | disadvantage, Parry | mobs | — | medium each |
| 12 | Stamina | — | — | — | all | stamina | small |

## Recommended order

1. Play the brace as it is, against each mob, and answer the three questions of step 1.
2. The grades (1), the riposte (2) and the front of a brace (3): mostly engine, and they give the
   timing more depth and bring positioning.
3. The guards of the mobs (11): the hobgoblin's shield and the bugbear's feint, before the fights of
   chapter 1 with the war band.
4. The parry (5), the guard stance and the block (6), and the price in stamina (12).
5. The reactions of the classes (9), with the class features of levels 1 to 5.
6. The shapes of the blows (10) and the clash (8) last: they need the most art.

## Questions for Fede

1. Does the brace need a price: stamina, or the front only? (Fede, 2026-10-14: no sure evade; the
   brace gives AC + 2 + DEX instead.)
2. Next to no mob, must a step back right after a blow still kite (a brace only after a blow that
   touched a mob)?
3. The parry: the attack input at the end of a wind-up (proposal 5), or a key of its own?
4. The guard stance: a hold of the dodge button, also on a touch screen?
