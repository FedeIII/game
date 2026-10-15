# Items: the pack, the gear, the load, loot and shops

This file is part of the documents of the code (see the map in `CLAUDE.md`). Read it before you
change its part of the code, and change it in the same commit as the code.

- **The pack** (`items.ts`): coins in a purse and items in slots, each slot one kind up to its
  stack (`ITEM_STACK`), and each kind with a weight in pounds (`ITEM_WEIGHT`, 5e; see "The load"). `Pack.items` is the slots in order, null for a free slot (never at the
  end): a stack keeps its slot until it goes, a new one takes the first free slot (`addToPack`),
  and the player moves stacks (`moveInPack`: onto a free slot, a swap, or onto a stack of its kind,
  which it fills; the message `move`). Items: imp horn, brute tusk, candle stub, silver ring, pewter cup, bundle
  of herbs, and three drinks (healing draught, antidote, strong draught: `DRINKS`, `drinkFrom()`;
  the drink belt, its keys 1 to 4, or "Drink" in the pack panel; the server through `drink`). A kill drops loot into the killer's pack (`MOB_LOOT`,
  `Horde.drop()`: an imp a horn in one kill of three; a brute 1 or 2 coins in one kill of three, and a
  tusk in one of two; **coins are scarce**, see "Coins" in `docs/game-design.md`); what does not fit falls on the ground at the mob, and the player says "My pack is full." In a shared world the
  server owns the pack, and the store keeps it (`Character.pack`, the column `pack`, saved with
  the place); in a world that the page runs, the page has its own, which it does not save.
- **Equipment** (`gear.ts`, `inventory.ts`; since 2026-10-11, Fede's decisions in
  `docs/drafts/equipment.md`; `docs/features/items/equipment.md`): twelve worn slots of D&D 5e
  (`GEAR_SLOTS`: head, neck, cloak, armour, bracers, gloves, belt, feet, two rings, main hand, off
  hand; `Gear`, `Character.gear`, the column `gear`). The items (`WEARABLES`, stack 1): leather
  armour, studded leather, scale mail, chain mail, splint armour, plate armour, a shield, longsword, shortsword, rapier, greataxe,
  mace, longbow, an arcane staff and a druid staff (a focus), the luck amulet (+1 to each score for
  every gate: `PlayerTraits.luck`, on `traits.scores`; attunement), and the silver ring on a finger.
  Nine magic items of the SRD (phase 4b; rare loot: `MAGIC_ITEMS` in `source.ts`): a longsword +1,
  a cloak and a ring of protection (AC +1), bracers of defence (AC +2 without armour or shield),
  gauntlets of ogre power, a headband of intellect and an amulet of health (STR, INT, CON 19:
  `wornScores()`), a belt of dwarvenkind (CON +2), boots of elvenkind (quiet steps). A reach
  weapon, the glaive (phase 4c: d10, heavy, two-handed), hits `REACH_BONUS` (8 px) further
  (`traits.reach`, `Blow.reach`, `attackHits(..., reach)`).
  The 5e rules: proficiency by class (`PROFICIENCY`, `canUse()`), the hands (a two-handed weapon
  takes the off hand off), at most 3 attuned items. **AC** (`armourClass()`: 10 + DEX, the armour,
  a shield +2, a barbarian + CON, a monk + WIS) is what a mob's attack roll must reach; a miss
  glances off (`glancePlayer()`: no damage, no stun; `PlayerState.glance` is the spark). Heavy
  armour without its STR: 3/4 of the walk (`traits.speed`); noisy armour: mobs see a sneaking character from 3/4 (`traits.sneakSight`).
  **Damage** (`attackGear()`, dice): one die of the weapon (`dieBase()`: 1d6, 1d8, 1d12; a
  versatile weapon with an empty off hand its bigger die), an unarmed strike 1, a monk's martial
  arts 1d4 (`martialArts(level)`: 1d6 from level 5), the cantrip of a sorcerer, a warlock or a wizard
  1d10 and of a druid 1d8 (an empty hand or its focus; `cantripDice()`: two dice from level 5); a light
  weapon attacks 2 ticks quicker, a heavy melee one 4 slower; a bow makes the attacks arrows for any
  class (`traits.ranged`); a rogue's sneak attack (`sneakAttack(level)`: 1d6, 2d6 at level 3, 3d6 at
  5) on a mob that does not hunt it (`Blow.sneak`). **Kits** (`kitOf()`, `sheetKit()`): a new character, and one from before,
  gets the worn part of the SRD kit of its class; a guest the kit of its look (`guestGear()`). The
  traits follow the gear and the level: `traitsOf(scores, class, gear, level)`; the Room's
  `traitsFor(gear, level)`, the page's `followGear()`. Moves: `moveItem()` and the addresses (`GEAR_BASE` 32 + the index of the worn
  slot) in `move` and `put`, protocol 19. The figure holds and wears what the character
  wears (protocols 20 and 21: `lk`, `RemotePlayer.look`, `dressSkin()` in the art). The smith of
  Ironhold sells and buys gear (see "Shops").
- **Items on the ground** (`piles.ts`, `Piles`; since 2026-10-10, Fede's request): "Drop one" or
  "Drop all" in the pack panel puts items 10 px in front of the player (`dropPoint()`; at its feet
  when a wall, a door, a tree, a thing or water is there) as a pile: one kind, up to its stack. A
  stack that the player drags out of the panel onto the world lands towards that point, at most 3
  tiles away (`tossPoint()`, `TOSS_REACH`: short of a wall, a door, a tree or a thing, across water
  but never on it). Each drop is a toss (`Toss`, `Piles.takeTosses()`; `ts` in a snapshot): every
  page near it shows the items fall. Anybody picks a pile up with the action button ("Pick up 4
  imp horns"; a pile under the feet comes first). A pile goes after 10 minutes (`PILE_MS`); a world
  has at most 400. In a shared world the Room keeps them in memory (a restart of the server clears
  them): `put` (a slot, its kind, a count, and `at` for a toss) and the `g` of an input batch,
  protocol 18. A page that runs its world keeps its own.
- **Loot over time** (`loot.ts`, `Spoils`; a Room has one, a page that runs its world has its
  own): `WorldSource.loot(fixture)` gives a loot table for a chest. One loot per chest for
  everybody: the first one takes it (what does not fit stays in the chest), and the chest fills
  again 30 minutes after it was emptied. A forced door gets its boards again after 30 minutes with
  nobody within 30 tiles, and the chest of its house fills again then (only then).

- **The load** (`load.ts`; 2026-10-15, Fede's decisions; `docs/features/items/load.md`): what the worn
  items, the pack and the coins weigh (`loadOf()`), against `PlayerTraits.carry` (15 x STR lb, 5e).
  Four tiers (`loadTier()`): light up to 5 x STR, medium up to 10 x STR, heavy up to 15 x STR,
  overloaded above. The tier chooses the roll (`ROLLS`: distance, ticks, safe ticks, stamina): light
  36 px, 15 ticks, 12 safe, 30; medium 30, 15, 9, 40; heavy 24, 18, 6, 50 (its own frames); overloaded
  a step aside of 12 px, 10 ticks, no safe tick, 50 (the evade frames). DEX adds 2 px and a safe tick
  for each point of its modifier. The load changes nothing else (the walk, the slots). The server owns
  it: `PlayerState.load` (the Room's `weigh()` before each step; the page in its own world), and a roll
  keeps `dodgeKind` and `dodgeSafe` (protocol 46).

- **Guarded chests** (`worlds/wilds/src/chests.ts`; Fede, 2026-10-15): one chest in three of the
  Wilds houses that are not barred has a lock (DEX), and a barred house has boards (STR). The DC of
  the guard follows what the chest holds (`CHEST_GRADES`): DC 10 a coin in two chests of three and
  one small thing; 11 up to 2 coins and a second thing in one of three; 12 up to 3 coins, a second
  thing in one of two and a magic item in one of 8; 13 (the most of the start) 2 to 4 coins, two
  things and a magic item in one of 4. A lock is more often on a poor chest (weights 3, 3, 2, 1), the
  boards more often keep a rich one (1, 2, 3, 3); `chestGrade()`, `guardGate()`, `guardedLoot()`. A
  lock opens each time for a character with the gate ("Pick the lock", "The lock clicks open."),
  never for one without ("It is locked. I cannot pick it.").

- **Shops** (since 2026-10-13, Fede's request; `docs/features/items/pack-and-loot.md`, REQ-PK-017): a
  trader's answer opens its shop (`DialogAnswer.shop`, a `Shop` with `buy` and `sell` wares, `tab` the
  side to open; `dialog.ts`), and the page shows the shop panel (`ui/shop-panel.ts`) over the
  conversation, which waits (`ConversationPanel.suspend()`/`resume()`) and goes on at the answer's
  `next` node. One item for each trade: each is a deal (`wareDeal()`; a sale `goods: 'coins'`,
  `pay`), with the same message `deal` and the id of the ware; `Room.deal()` finds it with
  `findDeal()` and checks the gates and the conditions of the answer and of the ware. A deal of an
  answer can still give a refuge (`goods: 'refuge'`) or an ale: the inns keep them in the
  conversation (Fede's decision, 2026-10-13). The shops of the Wilds (`worlds/wilds/src/dialogs.ts`):
  Corwin buys rings 5, cups 3, candles 1, imp horns 2, brute tusks 4, badger furs 4 (`PEDDLER_SHOP`);
  Isolde sells the three draughts (6, 8, 15 coins, `REMEDIES`; her friend's price 4, 6, 11,
  `FRIEND_REMEDIES`, behind the CHA 14 answer that opens it); the smith (`SMITH_SHOP`, `SMITH_PRICES`,
  `FORGED`, since 2026-10-11) sells the armour, the shield and the weapons (leather 5 to plate 150, a
  mace 3 to a longbow 12, a glaive 8; not the staffs) and buys all of them back for half
  (`smithPays()`), from the pack only: a worn piece must come off first; Ilsa sells mithril
  (`MITHRIL_SHOP`, with the permit).
