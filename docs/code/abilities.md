# Ability scores in the game

This file is part of the documents of the code (see the map in `CLAUDE.md`). Read it before you
change its part of the code, and change it in the same commit as the code.

The plan and Fede's decisions are in `docs/drafts/abilities.md`: an application of each score,
one ability at a time (all six are done: Strength, Dexterity, Constitution, Intelligence, Wisdom
and Charisma). Each built feature has its REQ/AC document in `docs/features/` (Fede's rule,
2026-10-10: the format of `platform-docs` in streaming-platform; index `docs/features/README.md`). `packages/engine/src/traits.ts` gives `PlayerTraits`, what the scores of a
character give: `traitsOf(scores, class)`, `sheetTraits(sheet)`, `GUEST_TRAITS` (every score 10:
a guest). The server makes the traits from the stored character (`Room.join(..., { traits,
pack })`); the page makes the same from the same character, so the prediction stays exact. A
client never sends its traits. Two kinds of effect: a scale (a number changes with the modifier,
-1 to +3) and a gate (`Gate`: a check, `{ ability, dc }`; `meetsGate()`), never a roll of a die
(the dice roll only in a fight and in a draught: see `docs/code/combat.md`). **Each check has its own
DC, and a DC is the score that it needs** (Fede, 2026-10-15; `docs/features/abilities/checks.md`):
choose the DC of a new check with the rubric there (the 5e table `DC` as a guide, the reward, the
same fact with the same DC, 10 to 17 in chapter 1), and read the register first: `npm run checks`
(`worlds/wilds/src/checks.ts`, `scripts/checks.ts`) prints every check with its DC and its context;
`worlds/wilds/test/checks.test.ts` keeps the limits. The content writes each gate inline (no shared
gate constants in the Wilds). **Load the skill `dc` (`.claude/skills/dc/`) before you add a check or
change a DC**: it brings the rubric and the register into the context. A hook does the same after the
fact: when an edit writes `dc: <number>` into a `.ts` file that is not a test, it tells Claude to load
the skill (`.claude/settings.json`, `.claude/hooks/dc-reminder.py`). **How a
gate shows (Fede's rule, 2026-10-10, for every ability)**: `gateView()`
gives `open` (the score is enough), `hint` (1 or 2 under it, `GATE_HINT`: the thing shows dim
with its tag, `gateTag()`, for example "[INT 13]") or `hidden` (lower: it is not there). The
builder and the character panel still name every gate. **A line of a gate starts with its tag**
(Fede's request, 2026-10-14; `docs/features/abilities/ability-scores.md`, REQ-AS-008): `gated(gate,
line)` in `ui/conversation.ts`, "[STR 13] The boards break.": the forced door, the first wade (at most
every 2 minutes, `WADE_LINE_MS`), the picked lock, each lore page, the chewed herbs, a line of a scene
behind a gate, the greeting by name, and a clue; a bubble draws the tag in the small font and in old
gold, and the conversation panel in old gold (`gateTagElement()`, `.gate-tag`). A new line of a gate
gets its tag with `gated()`.

- **The attack ability (Option B, Fede's decision, 2026-10-10)**: each class strikes with its own
  ability (`ATTACK_ABILITY` in `character.ts`): STR barbarian, fighter, paladin; DEX bard, monk,
  ranger, rogue; WIS cleric, druid; INT wizard; CHA sorcerer, warlock. The class decides the
  ability, not the item in the hand. A blow rolls d20 + `toHit` (`proficiencyBonus(level)`: +2, +3 at
  level 5; + that modifier + a magic bonus) against the mob's AC; a hit takes `damage` (`Dice`: the die of the gear,
  see "Equipment" in `docs/code/items.md`, + that modifier + a magic bonus) from its hit points. See `docs/code/combat.md`.
- **Strength**, for every class: the push of a blow (`push`: `knockback` x (1 + 0.15 x mod)), how
  long a mob reels (`stagger`: `hurtMs` x (1 + 0.2 x mod)), the slots of the pack (6 + 2 x mod: 4
  to 12), and two gates: wading through shallow water (`WADE_GATE`, STR 12; `stepPlayer(...,
  traits)`: half speed, no attack there) and forcing a barred door (`Building.barred`: STR 10 to 13
  by what the chest of the house holds, see "Guarded chests" in `docs/code/items.md`).

- **Dexterity**: the time between attacks (`cooldown`: 27 - 2 x mod ticks), the guard after a hit
  (`guard`: 60 + 9 x mod), the time between dodges (`dodgeCooldown`: 96 - 12 x mod), the distance and
  the safe ticks of a roll (`rollReach`: 2 px x mod, `rollSafe`: 1 tick x mod), how far mobs
  see the player (`sight`: 1 - 0.08 x mod, half of that while it sneaks: `sightOf()`), the range of
  a ranger's arrows (`range`: 5 + mod tiles; `ranged` for a ranger only), and the gate of a locked
  chest (`Fixture.lock`: DEX 10 to 13 by what the chest holds, see "Guarded chests" in `docs/code/items.md`).
- **The dodge** (`player.ts`): `MoveInput.dodge` starts a roll the way the input moves (or towards
  the mouse, or the way the player faces), of the kind of the load (`ROLLS`, `rollOf()`; see "The
  load" in `docs/code/items.md`): a light roll 36 px in 15 ticks (0.25 s), safe in its first 12 (`inSafeRoll()`: no mob can
  hit then, `canBeHit`), for 30 stamina; walls stop it, a hit after the safe ticks ends it, and it does
  not start in shallow water (it ends there). Shift, the right mouse button or the dodge button
  (`ui/dodge-button.ts`; its name is "Roll", and "Dodge" in a brace: `setBraced()`). In a brace a dodge
  is a jump (see "The brace").

- **The brace** (`player.ts`; 2026-10-14, Fede's idea: stay in melee as safe as a kite;
  `docs/features/game/combat.md`, REQ-CMB-013; the next ideas: `docs/drafts/combat-melee.md`): a step
  back (120 degrees or more from the attack, `BRACE_BACK`) in the first 9 ticks after a melee attack
  (`BRACE_WINDOW_TICKS`; `PlayerTraits.brace`: not with a bow) braces for 18 ticks (`BRACE_TICKS`), and
  longer while the step back is held (`PlayerState.brace` stays at 1): the player stands, faces the way
  it struck. No sure evade (Fede, 2026-10-14): a mob's blow or arrow then rolls against the AC + 2 + the
  DEX modifier, at least + 1 (`PlayerTraits.braceAc`, `BRACE_AC`, `armourNow()`). A hit stuns and ends
  the brace; a miss keeps it, and the player sways out of the blow (`missPlayer()`: an evade of
  `EVADE_TICKS` 15, a look only, "evade" over it, in place of the spark of a glance). An attack breaks a
  brace. **A dodge in a brace is a jump** (2026-10-15, Fede's decisions; REQ-CMB-015): a short hop the
  way of the input (with no input, back from the way it struck), `PlayerState.jump`, `JUMPS` by the
  load (light 16 px in 9 ticks, medium 14 in 9, heavy 12 in 11, overloaded 8 in 8; DEX adds 1 px for
  each point of its modifier, `JUMP_REACH_SHARE`; `jumpOf()`), for the stamina of the roll of the load
  and with the wait between dodges. The brace goes on: it does not count down in the jump, the player
  faces the way it struck, a blow rolls against the AC of the brace (no safe tick), a hit ends both, and
  water ends both. Its own frames (`jumpParts()`) and sound (`jump`). Each brace needs a new step back (Fede, 2026-10-14): a step back held into the attack
  does not brace (`PlayerState.heldBack`), until a release (any move that is not back) in the attack or
  in the window, and a new press. A brace costs no stamina, and stamina fills in it as in a walk (Fede, 2026-10-15). Guards and
  companions never brace.
- **Sneaking** (`isSneaking()`): standing, or a walk at half speed or slower (`SNEAK_SPEED`; C
  turns the sneak walk on and off, and an attack turns it off: `SneakWalk` in `input/sneak-walk.ts`,
  Fede's decision of 2026-10-14; a small push of the joystick). Mobs notice the player only
  within their sight times `HordePlayer.sight`. On purpose (the sneak walk of C, or a slow walk; not
  just standing still) the figure crouches (the crouch and the sneak walk frames), the torch is
  smaller (96, others' 48) and the figure a little darker. A player that stops after a sneak walk
  stays in the crouch (Fede's decision, 2026-10-13) until it walks without a sneak, strikes, rolls,
  falls, takes a hit or wades (`PlayerView.crouched`; the page sees it for the other players too,
  from their speed). A player in shallow water never sneaks. When stamina exists (CON),
  sneaking uses it too (Fede's note, 2026-10-10).
- **Arrows** (`arrows.ts`): every attack with a bow in the hands (the ranger's kit) is an arrow (`Horde.shoot()`), 240 px/s, that
  reaches the first living mob on its way (the attack roll, the damage and the force of the
  shooter's blow) or stops at a thing (`World.shotBox()`: what is solid, except water) or at the end
  of its range; a kill is in `Horde.takeShotKills()`, and the drop goes to the shooter; what each
  arrow did is in `Horde.takeShotResults()` (`bl`). The page of the shooter flies its own copy at
  once (`flyArrow()`) and flashes the mob that it reaches; the others draw the server's (`ar` in the
  snapshot, `render/arrows.ts`).

- **Constitution**: hit points (`maxHp` = `levelHp(class, mod, level)`: 5e, the hit die `HIT_DIE` at
  its most and the mod at level 1, then half the die + 1 and the mod for each level; a fighter with CON
  10 has 10 at level 1, a wizard 6; `PlayerState.hp`), a shorter stun (`stun`: x (1 - 0.1 x mod)), no recovery
  (`recover` 0: no HP comes back by itself; only the HP of a companion do, `COMPANION_RECOVER`),
  stamina (`maxStamina` 100 + 10 x mod, `staminaRefill` 20 + 4 x mod per second, 1 s after the last use, a quarter of it in a walk and in a brace (`WALK_REFILL_SHARE`, `staminaRefillNow()`; Fede, 2026-10-15); a roll costs 30 to 50 by the load, the sneak walk 8 per second; no stamina: no
  roll, and the sneak walk does not hide; an attack costs `attackStamina`, `ATTACK_STAMINA` by
  `AttackGear.weight`: light 4, plain 6, heavy 10, an arrow of the longbow too; with too little, the
  attack comes, and the next one waits twice as long, `TIRED_COOLDOWN`; guards and companions do not
  pay; Fede, 2026-10-14), and the length of a poison or a drink (`resist`:
  x (1 - 0.15 x mod)).
- **A hit** (`hitPlayer()`, when the mob's attack roll hits): the rolled `MobStats.damage` and a
  stun; an imp's claws also poison (`poisonTicks` 360: `POISON_DAMAGE` 2 HP every 3 s, never the
  last one). At 0 HP the player is **defeated** (`down`, 3 s: it falls back and lies, mobs leave it, the screen goes dark); then
  it wakes (`wakePlayer()`) at home, or at the nearest refuge that its character has entered
  (`wakePoint()`, `WorldSource.refuges()`: the chapel of Ironhold; `Character.refuges`), with all
  its HP and a guard of 2 s, and a defeat takes half of its coins. The Room wakes it in a shared
  world (`Room.wake`, `settle()` before a save), the page in its own world.
- **Rest**: a fixture with `Interaction.rest` (the bed of the home) gives all HP and stamina
  back and ends a poison or a drink (`rest()`; the server does it through `u`).
- **Deals** (`dialog.ts`, `DialogAnswer.deal`): an answer can buy goods for coins (the ale of the
  Crooked Lantern, 2 coins: `drunk` for 60 s x `resist`, the walk sways); with too few coins the
  conversation goes to `deal.poor`. In a shared world the page sends `deal` and the server
  checks the NPC's nearness (`DEAL_RANGE`) and the coins. The traders have shops (see "Shops" in `docs/code/items.md`).
- **Intelligence**: the wizard's attack bonus and damage, and for every class the opening
  (`opening`: + max(0, mod) damage on a mob in its wind-up, after the dice, `rollBlow()`; arrows
  too). Gates in the page (`ui/gates.ts`): read a mob (INT 13 a health bar over it, INT 15 a glint on its wind-up;
  `MobViews.setReading()`), the map (INT 11 houses and paths, 13 names and refuges, 15 barred
  houses and locked chests), and the lore of the content (each page and answer with its own DC, INT 10
  to 16).
- **Lore** (`Interaction.lore`: a gate and pages): after its own pages, a thing shows its lore
  to a character with the gate, the clue `STRINGS.loreHint` to one 1 or 2 under it (`contentOf()`
  in `game.ts`). The Wilds: the books of the houses (`BOOKS`, `houses.ts`), and in Ironhold the
  lectern, the apothecary's shelf, the reeve's ledgers and map table, the notice board.
- **Gated answers** (`DialogAnswer.gate`): the conversation panel hides, dims (`.dim`, not
  selectable) or opens each one with `gateView()`. `checkDialog()` wants an answer without a gate
  in each node, and a way to end without gates. The reeve has two (INT 12 and 13), the apothecary one.
- **The cauldron** of the apothecary (`CAULDRON`, a conversation of a fixture: `Interaction.dialog`
  with `speaker: 'fixture'`): three recipes (draught INT 10, antidote 13, strong draught 15), each
  a deal that takes items (`Deal.items`, `goods` an item kind). The page sends `deal` with `at`
  (a fixture's tile) or `npc`; `Room.deal()` checks nearness (48 px), the answer's gate
  (`findDeal()`) and the items.
- **The map** (`ui/map-panel.ts`, M or the map button): it fills its panel, 256 tiles on its short
  side and more on its long side (the canvas takes the shape of its frame), round the player, only
  the seen chunks (the 3 x 3 chunks round the player, `seenChunks()`), drawn from the world's own
  generator; names from `WorldSource.landmarks()`. The Room keeps the seen chunks of each
  character (`ex` in the welcome and the snapshot; at most `MAX_EXPLORED`), and the store keeps
  them (column `explored`).
- **Wisdom**: the damage of the cleric and the druid, and for every class the sense (`sense`: 8 +
  2 x mod tiles: a red chevron at the screen edge for each mob that hunts the player out of view,
  `Horde.huntersOf()`, `h` in the snapshot, `render/marks.ts`), the seek (`seek`: 3 + 2 x mod
  tiles, at least 1: how far it sees a hidden thing, `Fixture.hidden`, `Fixtures.update(...,
  seeker)`), and the night (`night`: the darkness x (1 - 0.08 x mod), only in the page). Gates:
  insight (answers in `worlds/wilds/src/dialogs.ts`, WIS 11 to 15: one or more for the watchman,
  the innkeeper, the apothecary and the reeve), Medicine (`MEDICINE_GATE`, WIS 10, in `items.ts`:
  `DRINKS.herbs`, chew a bundle for 1d4 HP; the pack shows the dim tag `.pack-gate` 1 or 2 under it)
  and the way home (`HOMEWARD_GATE`, WIS 12, in `ui/gates.ts`: a pale arrow at the screen edge to the
  home).
- **Hidden things** of the Wilds: a patch of herbs (`herbpatch`, `herbs.ts`, `WildsSource.herbs()`:
  in about four cells in five, on open grass away from houses, the road and the town; one bundle,
  it grows again after 20 minutes, `LootTable.refillMs`) and the buried cache of Ironhold
  (`cache`, `TOWN_CACHE`: across the lane from the cottage; the reeve tells of it with insight).
  Neither collides (`FixtureTile.reach`: a target without a solid box).
- **Charisma**: the damage of the sorcerer and the warlock, and for every class prices
  (`buyShare` 1 - 0.1 x mod, `sellShare` 1 + 0.1 x mod: `dealPrice()`, `dealPay()`; the panel adds
  the price to the answer, "(2 coins)", so the answer texts have none), presence (`presence`: the
  overlap of a pack - 0.05 x mod, `Horde.overlap()`), daunt (`daunt`: a mob runs off x (1 + 0.1 x
  mod) after its hit) and inspire (`inspire`: max(0, mod) x 6 ticks of guard for the other players
  within 3 tiles of a hit; `PlayerState.inspired`, in `WireSelf`). Gates: persuasion (answers in
  `worlds/wilds/src/dialogs.ts`, CHA 10 to 16: Marta gives a room, CHA 13, `ROOM`, the refuge `inn`
  with `Refuge.given` and its bed with `Interaction.restFor`; Isolde a friend's price, CHA 14; Brann
  and Elama words) and reputation (`REPUTATION_GATE`, CHA 12, in `ui/gates.ts`: each NPC says its
  `NpcDef.greeting` once, with the character's name, within 2 tiles; not over a talk, and one
  greeting at a time: `nextGreeting()` in `render/barks.ts`).

- The store keeps the HP, the refuges and the seen chunks of each character (columns `hp`,
  `refuges`, `explored`; saved with the place; on 2026-10-11 a migration gave every character all
  its HP on the new scale). The vitals (`ui/vitals.ts`): a red bar for HP with the numbers ("17 /
  28"), a stamina bar, and the level ("Lv 2") with a thin gold bar of the way to the next level at
  the top left, the effects in words, a red flash at the screen edges on a hit, a dark veil on a
  defeat.

In the client: the builder (step 2) and the character panel show the traits in words and numbers
(`ui/traits-list.ts`: the key numbers AC, HP, attack and damage in tiles, then a card for each
ability with its score and its rows, Fede's choice of 2026-10-14; a value is bright, dim or pale red
as it compares with a score of 10; `traitSheet()` gives it without the DOM); the pack panel shows the pack; a chest says "Open the chest", and the
player says what it found; a barred door says "Force the door" (strong enough) or "Try the
door". A guest's traits: every score 10, and the class of its look (`guestTraits()`). The
protocol: `docs/multiplayer.md`, protocol 49.

## Levels and experience

Since 2026-10-14 (Fede's decisions; `docs/features/game/levels.md`; protocol 41).
`packages/engine/src/experience.ts`: a character rises from level 1 to `MAX_LEVEL` (5) with the XP of
the 5e table (`LEVEL_XP`: 300, 900, 2700, 6500; `levelOf()`, `levelProgress()`). A level gives the 5e
numbers only: hit points (`levelHp`), the proficiency bonus (+3 at 5), the sneak attack, the cantrip
dice and the martial arts die (see "Equipment" in `docs/code/items.md`); the ability increase of level 4 and the class features come
later. Kills and quests give XP:

- **A kill** gives the XP of the mob's challenge rating divided by `KILL_XP_DIVISOR` (10: a kill is much
  easier here than at the table; `killXp()`) to each character whose blow hit it (`Horde.takeDefeats()`:
  the mob and its `hitters`; arrows too). The level of a mob is its 5e CR (`MobStats.cr`; `mobXp()`
  gives its 5e XP for the encounters), and of a guard `GuardDef.cr` (a fallen guard: `GuardEvent.hitters`,
  the XP for a robber). No screen shows the level of a mob or an NPC (Fede's decision). A mob that goes
  in ash (the Ash Warden) is no kill.
- **A quest** gives the XP of its effects (`QuestEffect.xp`; `checkEffect()` wants it only on an effect
  that moves the quest on, so it comes once). **The quests give more than half of the XP**, as of the
  coins (`docs/game-design.md`); `worlds/wilds/test/economy.test.ts` keeps it with the model of chapter 1,
  which ends at level 3. When you add XP to a quest, keep it green.

The server owns the XP (`RoomPlayer.xp`, `Room.gainXp()`): at a new level the traits follow at once and
the HP that the level adds come on top (5e). The store keeps it (column `xp`, saved with the quest book:
`setQuests()`); the welcome and a snapshot carry it (`xp`) to its own player only. In a world that the
page runs, the page has its own (not saved). The page: "Lv 2" and the gold bar in the vitals, "Level 2 ·
450 / 900 XP" in the character panel, a banner and the stinger `questEnd` at a new level, and the tip `xp`
at the first XP. The encounters of the story size themselves for the levels there
(`sizeEncounter(units, levels)`: the 5e deadly budget of each level, `XP_THRESHOLDS`).
