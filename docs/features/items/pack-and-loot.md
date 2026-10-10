# Pack and Loot

## Overview

A character carries what it finds in a pack: coins in a purse, and items in slots. A kill drops
loot into the pack of the killer. The chests of the houses of the Wilds, the hidden patches of
herbs in the woods and the buried cache of Thornwick also give loot. Each source holds one loot
for every player of a world, and it fills again after a time. Herbs and trophies go into brews,
the brews are drinks, and a character with Medicine chews herbs.

## Terminology

- **Pack**: what a character carries: a purse and slots.
- **Purse**: the coins of a character. It uses no slot.
- **Slot**: one place in the pack. It holds one kind of item, up to the stack of that kind. The
  number of slots comes from Strength (STR).
- **Stack**: the most items of one kind in one slot.
- **Loot**: coins and items that go into a pack: the contents of a chest, or the drop of a kill.
- **Loot table**: the rule that gives loot: a range of coins, and rolls that each give one item
  with a chance.
- **Drop**: the loot of a kill.
- **Source of loot**: a chest, a patch of herbs or a buried cache.
- **Refill**: a source fills again with new loot.
- **A world that the page runs**: a world without the multiplayer server: a world that is not
  shared, or a shared world with `?offline`.

## Requirements

### REQ-PK-001: The pack holds coins and items

**User Story:** As a player, I want to keep the things that I find, so that my fights and my
searches give me something.

**Acceptance Criteria:**
- **AC-PK-001.1:** Coins go into the purse, up to 99,999 coins. Coins never use a slot.
- **AC-PK-001.2:** The pack has 4 to 12 slots, from STR ([Strength](../abilities/strength.md),
  REQ-STR-003).
- **AC-PK-001.3:** There are nine kinds of item. Their stacks are: imp horn 10, brute tusk 10,
  candle stub 5, silver ring 5, pewter cup 5, bundle of herbs 10, healing draught 5, antidote 5,
  strong draught 5.
- **AC-PK-001.4:** A new item goes onto a stack of its kind that has room, else into a free slot.
  One kind can fill more than one slot when its stacks are full.
- **AC-PK-001.5:** The draughts are drinks (REQ-PK-011). Herbs, imp horns and brute tusks go into
  the brews of the cauldron ([Intelligence](../abilities/intelligence.md), REQ-INT-006). A
  character with Medicine chews herbs ([Wisdom](../abilities/wisdom.md), REQ-WIS-006). The
  other items have no use yet. The player cannot drop or sell an item.

---

### REQ-PK-002: A kill drops loot

**User Story:** As a player who fights, I want a kill to give me something, so that a fight has a
reward.

**Acceptance Criteria:**
- **AC-PK-002.1:** An imp drops an imp horn in one kill of three, and no coins.
- **AC-PK-002.2:** A brute drops 2 to 6 coins, and a brute tusk in one kill of two.
- **AC-PK-002.3:** The drop goes into the pack of the player who killed the mob, with a blow or with
  an arrow.
- **AC-PK-002.4:** Each part of the drop rises over the head of the player as a short gold line in
  the small font. Examples are "+3 COINS" and "+1 IMP HORN".
- **AC-PK-002.5:** A line rises for 1.6 s and fades in its last 0.5 s. The lines of one drop start
  0.18 s apart.
- **AC-PK-002.6:** What does not fit is lost, and the player says "My pack is full."

---

### REQ-PK-003: The chests of the Wilds give loot

**User Story:** As a player who explores, I want the chests in the houses to hold things, so that a
visit to a house has a reward.

**Acceptance Criteria:**
- **AC-PK-003.1:** Every chest in a house of the Wilds gives loot. The chest of the home gives no
  loot: a press on it shows "Your chest. Nothing in it yet."
- **AC-PK-003.2:** No chest in Thornwick gives loot.
- **AC-PK-003.3:** At a chest with loot, the action label is "Open the chest". At a locked chest,
  it is "Pick the lock" for a character with DEX 13 or more ([Dexterity](../abilities/dexterity.md),
  REQ-DEX-007).
- **AC-PK-003.4:** An ordinary chest gives 1 to 6 coins and one thing: a candle stub, a silver
  ring, a pewter cup or a bundle of herbs.
- **AC-PK-003.5:** A locked chest gives 3 to 10 coins and one thing, and a second thing in about
  one of three. The chest of a barred house gives 5 to 15 coins and one thing, and a second thing
  in one of two.
- **AC-PK-003.6:** Of the four things, a candle stub and a bundle of herbs come most often (3 in 9
  each). A pewter cup comes 2 in 9, and a silver ring 1 in 9.
- **AC-PK-003.7:** The player says what it found in one line, for example "I find 4 coins and a
  silver ring." Two things of one kind show as a number: "I find 7 coins and 2 candle stubs."
- **AC-PK-003.8:** At an empty chest, the player says "It is empty."

---

### REQ-PK-004: One loot per chest for every player

**User Story:** As a player in a shared world, I want each chest to hold one loot for the whole
world, so that the first player who finds a chest gets its contents.

**Acceptance Criteria:**
- **AC-PK-004.1:** The first player who opens a chest takes its loot. After that, the chest is
  empty for every player of the world.
- **AC-PK-004.2:** A chest fills again 30 minutes after a player emptied it (a patch of herbs: 20
  minutes, REQ-PK-012). Its new loot comes from its loot table again, so it can differ from the
  loot before.
- **AC-PK-004.3:** The chest of a barred house fills again only when the boards of its door come
  back ([Strength](../abilities/strength.md), REQ-STR-006).
- **AC-PK-004.4:** A chest that still holds something does not fill again. The next player who
  opens it takes what is left.

---

### REQ-PK-005: A full pack

**User Story:** As a player with a full pack, I want to know that something did not fit, so that I
can come back for it.

**Acceptance Criteria:**
- **AC-PK-005.1:** At a chest, what fits goes into the pack, and the rest stays in the chest. The
  line ends with "My pack is full.", for example "I find 5 coins. My pack is full."
- **AC-PK-005.2:** When nothing goes into the pack, the player says only "My pack is full."
- **AC-PK-005.3:** With a drop, what does not fit is lost, and the player says "My pack is full."
- **AC-PK-005.4:** Coins always fit, up to 99,999 in the purse.

---

### REQ-PK-006: The server owns the pack in a shared world

**User Story:** As a player in a shared world, I want my pack to stay with my character, so that
what I find is there in my next session.

**Acceptance Criteria:**
- **AC-PK-006.1:** In a shared world, the server puts the loot into the pack and keeps the pack.
  The page shows what the server sends.
- **AC-PK-006.2:** The store keeps the pack with the character. The server saves it when the
  player leaves, and every 25 s while the player plays.
- **AC-PK-006.3:** The next session of the character starts with the pack from the store.
- **AC-PK-006.4:** A page never writes the pack: no route and no message lets a page change it.
- **AC-PK-006.5:** The server opens a chest only for a player within reach of it (the same range
  as every action).
- **AC-PK-006.6:** The page does not guess what is in a chest. The player says what it found when
  the answer of the server comes.
- **AC-PK-006.7:** While the connection is down, a press on a chest makes the player say "I cannot
  open it now. No connection."

---

### REQ-PK-007: A world that the page runs has its own pack

**User Story:** As a player who plays alone, I want to find and carry things too, so that the game
is the same without the server.

**Acceptance Criteria:**
- **AC-PK-007.1:** In a world that the page runs, the page keeps the pack and the chests.
- **AC-PK-007.2:** The pack of a character starts with the pack from the store. The pack of a
  guest starts empty.
- **AC-PK-007.3:** The page does not save the pack. A reload loses what the player found there.
- **AC-PK-007.4:** The rules of the loot, the refill, the full pack and the lines are the same as
  in a shared world.

---

### REQ-PK-008: The pack panel

**User Story:** As a player, I want to see what I carry, so that I know my coins and my free slots.

**Acceptance Criteria:**
- **AC-PK-008.1:** The pack button is at the top right, left of the settings button. A press on
  it, or the I key, opens and closes the panel. Esc closes it.
- **AC-PK-008.2:** Only one panel at the top right is open at a time. The pack panel closes when
  another one opens.
- **AC-PK-008.3:** The panel shows the title "Pack", and the slots that are in use and all the
  slots ("2 of 8 slots"). It also shows the coins with a coin icon.
- **AC-PK-008.4:** The panel shows one cell for each slot. A used cell shows the icon of its item at
  2x, and the number when the stack has more than one item. A free cell is empty.
- **AC-PK-008.5:** A used cell names its stack for a screen reader and as a tooltip, for example
  "an imp horn" or "3 imp horns".
- **AC-PK-008.6:** With no coins and no items, the panel says "Your pack is empty."
- **AC-PK-008.7:** For a guest, the panel says "A guest: what you find is not saved." For a
  character in a world that the page runs, it says "Played alone: what you find here is not
  saved."
- **AC-PK-008.8:** The only action in the panel is a drink: a press on the slot of a drink, or its
  number (1 to 9) while the panel is open, drinks one (REQ-PK-011). The tooltip says "Drink a
  healing draught (1)", or for herbs with Medicine "Chew a bundle of herbs (1)".
- **AC-PK-008.9:** A use behind a gate follows the gate rule ([Ability Scores](../abilities/ability-scores.md),
  REQ-AS-007). With a score 1 or 2 under the gate, the slot shows the gate dim in its corner ("WIS
  13"), and its tooltip says "[WIS 13] You could chew a bundle of herbs, if you knew more of
  herbs." A press and the number do nothing. With a lower score, the slot is a plain slot.

---

### REQ-PK-009: A defeat takes half of the coins

**User Story:** As a player, I want a defeat to cost me something, so that I take care in a fight.

**Acceptance Criteria:**
- **AC-PK-009.1:** When a defeated character wakes, half of its coins go, rounded down: 9 coins
  become 5, 1 coin stays 1.
- **AC-PK-009.2:** The items stay in the pack.
- **AC-PK-009.3:** In a shared world the server takes the coins and saves the pack after the
  defeat ([Constitution](../abilities/constitution.md), REQ-CON-007).

---

### REQ-PK-010: Coins buy an ale

**User Story:** As a player with coins, I want to spend them, so that the coins that I find have
a use.

**Acceptance Criteria:**
- **AC-PK-010.1:** An ale at the Crooked Lantern costs 2 coins ([Constitution](../abilities/constitution.md),
  REQ-CON-010).
- **AC-PK-010.2:** A player with fewer coins than the price buys nothing, and keeps its coins.
- **AC-PK-010.3:** In a shared world the server takes the coins, and the pack in the next snapshot
  shows it.

---

### REQ-PK-011: Drinks

**User Story:** As a player, I want to drink the draughts that I brew, so that I can heal in the
woods.

**Acceptance Criteria:**
- **AC-PK-011.1:** A healing draught gives back 2 hit points, at most the most of the character.
  The player says "The draught is bitter. The wound closes a little."
- **AC-PK-011.2:** An antidote ends a poison. The player says "The antidote burns. The poison is
  gone."
- **AC-PK-011.3:** A strong draught gives back all the hit points. The player says "The strong
  draught burns all the way down. I feel whole."
- **AC-PK-011.4:** A drink goes from the pack (one of the stack). A defeated character cannot
  drink.
- **AC-PK-011.5:** In a shared world the page sends the drink to the server, which checks the pack
  and gives the effect.
- **AC-PK-011.6:** A character with WIS 13 or more chews a bundle of herbs for 1 hit point. The
  player says "I chew the bitter leaves. I feel a little better." The server checks the gate too:
  without WIS 13, nothing changes.

---

### REQ-PK-012: Herbs in the woods and a buried cache

**User Story:** As a player who explores, I want to find things outside the houses, so that the
woods and the town have more to give.

**Acceptance Criteria:**
- **AC-PK-012.1:** About four cells of the Wilds in five have a patch of herbs. A press on it
  ("Gather the herbs") gives one bundle of herbs: "I find a bundle of herbs."
- **AC-PK-012.2:** A patch gives one bundle for every player of the world. After that, a press says
  "Somebody picked them. They will grow again." The patch grows again 20 minutes after it was
  picked.
- **AC-PK-012.3:** The buried cache of Thornwick ("Dig here") gives 8 to 20 coins, a silver ring,
  and a second thing (a candle stub, a silver ring, a pewter cup or a bundle of herbs) in one of
  two: "I dig up a small box. I find 19 coins and a silver ring." After that it says "Somebody
  dug it up before me.", until it fills again 30 minutes later.
- **AC-PK-012.4:** Patches and the cache are hidden: a character sees them only close by
  ([Wisdom](../abilities/wisdom.md), REQ-WIS-004). They do not collide.

## Feature Behavior & Rules

- **Drinks:** `DRINKS` (`Drink`: `hp`, `full`, `cure`, and `gate` for herbs: `MEDICINE_GATE`),
  `drinkFrom()`, `hasItems()` and `removeFromPack()` in `packages/engine/src/items.ts`; the message
  `{ t: 'drink', kind }` and `Room.drink()` (protocol 14); the slot buttons and the dim gate tag
  (`.pack-gate`) in `packages/engine-client/src/ui/pack-panel.ts`.

- **The pack** (`packages/engine/src/items.ts`): `ITEM_KINDS` (the order is the code on the wire:
  add a new kind at the end), `ITEM_STACK`, `MAX_COINS` (99,999), `MAX_SLOTS` (16: the most slots
  that a stored pack can have), `Pack`, `EMPTY_PACK`, `Loot` and `NO_LOOT`. `addToPack(pack, loot,
  slots)` gives the new pack, what went in (`taken`) and what did not fit (`left`). `checkPack()`
  checks a stored pack.
- **Loot tables** (`items.ts`): `LootTable`, `LootRoll`, `rollLoot()` and `MOB_LOOT`. Two rolls
  of one kind in one loot make a stack of 2. `Horde.drop(mob)` rolls `MOB_LOOT` with the random
  source of the horde.
- **Who gets a drop:** in the Room, `give()` puts the drop of a blow into the pack of the attacker
  (`Room.input()`). It puts the drop of an arrow into the pack of the shooter (`takeShotKills()` in
  `Room.tick()`). In a world that the page runs, `takeDrop()` in `game.ts` does the same.
- **The chests over time** (`packages/engine/src/loot.ts`): `Spoils` (`isSource()`, `open()`,
  `tick()`), `REFILL_MS` (30 minutes), or `LootTable.refillMs` for a source that fills sooner.
  `Spoils` knows a chest by its anchor tile. The first
  `open()` of a chest rolls its loot (a random roll, not from the seed). `tick()` checks the
  refills once a second.
- **The state of the chests is in memory.** The Room of a shared world has one `Spoils`, and a page
  has its own for a world that it runs (with `Math.random`). A restart of the game server fills
  every chest again. In a shared world, the page's own `Spoils` only finds the chests with loot,
  for the action label.
- **Loot of a world:** `WorldSource.loot(fixture)` (`packages/engine/src/world.ts`) gives a loot
  table for a fixture, or null. A fixture with a table is a target of the action button, also
  without content or an examine line.
- **The Wilds** (`worlds/wilds/src/source.ts`): `TRINKETS` (candle stub 3, silver ring 1, pewter
  cup 2, bundle of herbs 3), `CHEST_LOOT`, `LOCKED_CHEST_LOOT` and `BARRED_CHEST_LOOT`. No chest
  loot for the home (`HOME_ID`) or in the town (`inTown()`). `HERB_LOOT` (one bundle, 20 minutes)
  for a `herbpatch` (`worlds/wilds/src/herbs.ts`), and `CACHE_LOOT` for `TOWN_CACHE`
  (`worlds/wilds/src/town.ts`).
- **The store** (`packages/engine-server/src/store.ts`): `Character.pack` (`character.ts`), the
  column `pack` of the table `characters` (a migration added it; a row without a pack gives
  `EMPTY_PACK`), `AccountStore.setPack()`, and `Accounts.savePack()` (`accounts.ts`), which checks
  the pack with `checkPack()` first. The server saves the pack together with the place
  (`savePlace()` in `packages/engine-server/src/index.ts`): when the player leaves, and at each
  heartbeat (`PING_INTERVAL_MS`, 25 s). A server without accounts gives an empty pack and does not
  save it.
- **Protocol 11** (`docs/multiplayer.md`): the welcome carries `pk` (the coins, and `[item code,
  count]` for each slot). A snapshot carries `pk` when the pack changed, and `l` for each loot:
  `[source, coins, stacks, full]`. The source is 0 for a chest, 1 for a drop, and 2 for a lock
  that the player cannot pick (protocol 12). An input batch carries the chests that the player
  opens: `u: [seq, tx, ty]`, just before the input `seq`, as a door wish. `reachableFixture()`
  (`interact.ts`) checks the reach.
- **The lines** (`packages/engine-client/src/game.ts`): `chestLine()` for a chest and
  `dropLines()` for a drop. The texts are in `STRINGS` (`ui/strings.ts`): `found`, `coins`,
  `items`, `packFull`, `chestEmpty`, `chestOffline` and `pack`.
- **The text that rises** (`render/loot-text.ts`, `LootText`): gold `0xe0c070` on a 1-pixel shadow,
  `RISE` (12 px), `LIFE_MS` (1600), `FADE_MS` (500), in the small font, above the darkness. The
  code writes "+3 coins"; the small font draws lowercase letters as capitals. Only a drop rises: the
  player says the contents of a chest in its speech bubble.
- **The pack panel** (`packages/engine-client/src/ui/pack-panel.ts`, `PackPanel`): the icons are
  the frames `item/<kind>` and `item/coin` (16 x 16, `packages/engine-client/art/items.ts`). The
  panel takes `KeyI` (`KeyboardEvent.code`), but not in a form field or with Ctrl, Meta or Alt.
  After a click on the panel, the focus goes back to the game, so WASD moves the player again.
