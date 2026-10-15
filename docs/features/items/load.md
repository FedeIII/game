# Load

## Overview

Each item has a weight in pounds (lb), from the SRD 5.1 where it gives one. The load of a character is
what its worn items, the items of its pack and its coins weigh. Strength gives how much it can carry
(15 × STR lb, the carrying capacity of 5e). The load against that capacity gives one of four tiers,
after the variant encumbrance of 5e: light, medium, heavy and overloaded. The tier chooses the kind of
the dodge roll: a heavier load rolls shorter and slower, is safe for fewer ticks, and costs more
stamina; an overloaded character only steps aside. Dexterity makes each roll go further and stay safe
longer ([Dexterity](../abilities/dexterity.md), REQ-DEX-003). The load changes nothing else: the walk
and the slots of the pack stay as they are. Fede's decisions, 2026-10-15.

## Terminology

- **Weight**: what one item weighs, in pounds (`ITEM_WEIGHT`).
- **Load**: what a character carries: its worn items, the items of its pack, and its coins (50 coins
  weigh 1 lb, in whole pounds).
- **Carrying capacity (carry)**: the most that a character can carry with a roll: 15 × STR lb.
- **Tier**: light (up to a third of the capacity: 5 × STR lb), medium (up to two thirds: 10 × STR),
  heavy (up to all of it) or overloaded (more).
- **Roll**: the dodge ([Dexterity](../abilities/dexterity.md), REQ-DEX-003). **Kind of roll**: the
  tier of the load at the start of the roll.
- **Safe ticks**: the first ticks of a roll, in which no mob can hit the character.
- **Step aside**: the roll of an overloaded character: short, with no safe tick.

## Requirements

### REQ-LD-001: Each item has a weight

**User Story:** As a player, I want to know what my things weigh, so that I can choose what to carry.

**Acceptance Criteria:**
- **AC-LD-001.1:** Each kind of item has a weight, a multiple of 0.5 lb: the armour as in 5e (leather
  10, studded leather 13, scale mail 45, chain mail 55, splint 60, plate 65), a shield 6, the weapons
  as in 5e (a longsword 3, a greataxe 7, a glaive 6, a staff 4), a draught 0.5, a crowbar 5, a sack of
  lentils 10 (12 when it is wet). A ring, an amulet, a candle and a paper weigh nothing.
- **AC-LD-001.2:** The detail of the chosen item in the pack panel gives its weight: "Weight: 55 lb.",
  and for a stack "Weight: 0.5 lb each, 2 lb in all."; "It weighs nothing." for a weight of 0
  ("Peso: …", "No pesa nada." in Spanish).

---

### REQ-LD-002: The load and its tier

**User Story:** As a strong character, I want to carry more before my roll gets worse, so that
Strength matters for a fighter in armour.

**Acceptance Criteria:**
- **AC-LD-002.1:** The load is the weight of the worn items, of the items of the pack, and of the
  coins (50 coins: 1 lb, in whole pounds).
- **AC-LD-002.2:** A character can carry 15 × STR lb, with the STR that its worn items give (the
  gauntlets of ogre power: 19 × 15 = 285 lb). The luck of an amulet does not count.
- **AC-LD-002.3:** The tier is light up to 5 × STR lb, medium up to 10 × STR, heavy up to 15 × STR,
  and overloaded above it. A fighter in its kit (chain mail, a shield, a longsword: 64 lb) is light
  with STR 13 or more, and medium with less.
- **AC-LD-002.4:** The pack panel shows the load under the Armour Class: "Load 64 / 195 lb · light
  roll" ("Carga 64 / 195 lb · voltereta ligera" in Spanish); a heavy load and an overload in a pale
  rust: "overloaded: no roll".
- **AC-LD-002.5:** In a shared world the server makes the load from the pack and the gear that it
  keeps. A page that runs its world makes it from its own pack.

---

### REQ-LD-003: The load chooses the roll

**User Story:** As a player in heavy armour, I want my roll to be slow and short, so that light armour
and Dexterity have a value in a fight.

**Acceptance Criteria:**
- **AC-LD-003.1:** The kinds of roll (at DEX 10):

  | Tier | Distance | Time | Safe ticks | Stamina |
  |---|---|---|---|---|
  | Light | 36 px (2.25 tiles) | 15 ticks (0.25 s) | 12 | 30 |
  | Medium | 30 px | 15 ticks | 9 | 40 |
  | Heavy | 24 px | 18 ticks (0.3 s) | 6 | 50 |
  | Overloaded (a step aside) | 12 px | 10 ticks | 0 | 50 |

- **AC-LD-003.2:** Each point of the DEX modifier adds 2 px to the distance and one safe tick, up to
  all the ticks of the roll. A step aside never has a safe tick.
- **AC-LD-003.3:** A mob can hit the character after the safe ticks of its roll; the hit ends the
  roll.
- **AC-LD-003.4:** The kind of a roll is the tier of the load at its start; it does not change during
  the roll.
- **AC-LD-003.5:** A heavy roll has frames of its own: a low roll over the right shoulder that ends on
  one knee (Fede's choice, 2026-10-15). A step aside shows the frames of an evade. A light and a
  medium roll show the roll of before. The other players see the kind of roll.
- **AC-LD-003.6:** The wait between two rolls does not change with the load: 96 − 12 × DEX modifier
  ticks.
- **AC-LD-003.7:** In a brace, a dodge is a short jump ([Combat](../game/combat.md), REQ-CMB-015). The
  load changes it a little, as it changes the roll, and it costs the stamina of the roll of the load:

  | Tier | Distance | Time | Stamina |
  |---|---|---|---|
  | Light | 16 px (1 tile) | 9 ticks (0.15 s) | 30 |
  | Medium | 14 px | 9 ticks | 40 |
  | Heavy | 12 px | 11 ticks | 50 |
  | Overloaded | 8 px | 8 ticks | 50 |

  Each point of the DEX modifier adds 1 px to the distance. A jump has no safe tick: in it, a mob's
  attack rolls against the AC of the brace.

## Feature Behavior & Rules

- **The weights** (`packages/engine/src/items.ts`): `ITEM_WEIGHT` (a weight for each `ItemKind`, the
  type checks it), `COINS_PER_POUND` (50) and `packWeight()`. A new kind of item needs a weight.
- **The load** (`packages/engine/src/load.ts`): `LOAD_TIERS`, `LoadTier`, `gearWeight()`, `loadOf()`,
  `loadTier(load, carry)` (thirds of the capacity), and `loadCode()` / `loadFromCode()` for the wire.
  `CARRY_PER_STR` (15) and `PlayerTraits.carry` are in `traits.ts` (from the worn scores, without the
  luck); `traits.ts` does not import `load.ts`, because `items.ts` imports `traits.ts`.
- **The roll** (`packages/engine/src/player.ts`): `ROLLS` (`RollDef`: `distance`, `ticks`, `safe`,
  `stamina`), `rollOf(load, traits)` (with `PlayerTraits.rollReach` and `rollSafe`: DEX,
  `ROLL_REACH_PER_MOD` 2 and `ROLL_SAFE_PER_MOD` 1), `inSafeRoll()`. `PlayerState.load` is the tier
  of the load now: its owner sets it before each step (the Room: `weigh()`, also before each snapshot;
  the page in a world that it runs: `game.ts`). A roll keeps its kind in `PlayerState.dodgeKind` and
  its safe ticks in `dodgeSafe`. `canDodge()` needs the stamina of the roll of the load; `canBeHit()`
  is false only in the safe ticks; `stunPlayer()` ends a roll.
- **Protocol 46** (`docs/multiplayer.md`): `WireSelf` carries the load, the kind of the roll and its
  safe ticks; `WirePlayer` carries the kind of the roll (`RemotePlayer.dodgeKind`).
- **The frames** (`packages/engine-client/art/attacks.ts`): `HEAVY_ROLL_FRAMES` (4) and
  `heavyRollParts()`: the figure drops low, turns over its right shoulder (`tumble()` and `sway()`
  round a point 8 px up), and ends on one knee (`FigureAction.kneel` in `art/figure.ts`: the right leg
  forward with its shin upright, the left knee on the ground). The columns `SKIN_COLUMNS.heavyRoll` of
  a skin sheet (`SKIN_VERSION` 11; the sheet is 2016 px wide, under the limit of 2048) and the atlas
  frames `player/<view>/heavyroll/<i>` of the wanderer. `PlayerView` (`render/player-view.ts`) picks
  the frames by `dodgeKind`, over the ticks of its kind.
- **The GUI**: `loadLine()` and `weightLine()` in `ui/pack-panel.ts` (the line `.gear-load`, with the
  class of its tier; `style.css`), the rows "Carry" (STR) and "Light roll" (DEX) of the traits list
  (`ui/traits-list.ts`), the texts in `ui/strings.ts` and `ui/strings-es.ts`. The debug panel: the
  line `dex` gives the kind and the safe ticks of the roll and the load; the line `pack` the load in
  pounds.
- **Tests**: `packages/engine/test/load.test.ts` (the weights, the tiers, the roll of a load through
  the Room and the prediction), `packages/engine/test/dexterity.test.ts` (each kind of roll, the safe
  ticks, DEX), `ui/pack-panel.test.ts` and `ui/traits-list.test.ts`.
