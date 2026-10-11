# Pack and Loot

## Overview

A character carries what it finds in a pack: coins in a purse, and items in slots. A kill drops
loot into the pack of the killer. The chests of the houses of the Wilds, the hidden patches of
herbs in the woods and the buried cache of Ironhold also give loot. Each source holds one loot
for every player of a world, and it fills again after a time. Herbs and trophies go into brews,
the brews are drinks, and a character with Medicine chews herbs. The pack panel shows what each
thing is and what it is for, and the player puts each stack in the slot that it wants with a drag.
A player drinks from a belt under its hit points, and it can put items on the ground (also with a
drag out of the panel), where any player can pick them up again. What does not fit in the pack
after a kill falls on the ground. The items fall to the ground on the screen, and an item on the
ground shines a little now and then.

## Terminology

- **Pack**: what a character carries: a purse and slots.
- **Purse**: the coins of a character. It uses no slot.
- **Slot**: one place in the pack. It holds one kind of item, up to the stack of that kind. The
  number of slots comes from Strength (STR). A **free slot** holds nothing.
- **Stack**: the most items of one kind in one slot.
- **Loot**: coins and items that go into a pack: the contents of a chest, or the drop of a kill.
- **Loot table**: the rule that gives loot: a range of coins, and rolls that each give one item
  with a chance.
- **Drop**: the loot of a kill. The buttons "Drop one" and "Drop all" of the pack panel are a
  different thing: they put items on the ground (a pile).
- **Pile**: items of one kind that lie on the ground at one point. Any player can pick it up.
- **Drag**: the player presses a used slot (with the mouse or a finger) and moves the pointer
  before it lets go.
- **Toss**: items go from the hands of a player (or out of a mob that died) onto a pile. A toss
  towards a point: the player drags a stack out of the pack panel onto the world.
- **Drink belt**: the row of drink buttons under the hit points.
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
- **AC-PK-001.3:** There are nine kinds of item to carry. Their stacks are: imp horn 10, brute tusk
  10, candle stub 5, silver ring 5, pewter cup 5, bundle of herbs 10, healing draught 5, antidote 5,
  strong draught 5. The sixteen kinds of item to wear stack one in a slot
  ([Equipment](equipment.md), REQ-EQ-002).
- **AC-PK-001.4:** A new item goes onto a stack of its kind that has room, else into the first free
  slot. One kind can fill more than one slot when its stacks are full.
- **AC-PK-001.6:** A stack stays in its slot until it goes. When a stack goes (a drink, a deal, a
  drop), its slot becomes free, and the other stacks stay where they are.
- **AC-PK-001.5:** The draughts are drinks (REQ-PK-011). Herbs, imp horns and brute tusks go into
  the brews of the cauldron ([Intelligence](../abilities/intelligence.md), REQ-INT-006). A
  character with Medicine chews herbs ([Wisdom](../abilities/wisdom.md), REQ-WIS-006). The
  peddler buys rings, cups, candle stubs, imp horns and brute tusks (REQ-PK-010). The player can
  put items on the ground (REQ-PK-013).

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
- **AC-PK-002.6:** What does not fit falls on the ground at the mob as a pile (REQ-PK-013), and the
  player says "My pack is full."

---

### REQ-PK-003: The chests of the Wilds give loot

**User Story:** As a player who explores, I want the chests in the houses to hold things, so that a
visit to a house has a reward.

**Acceptance Criteria:**
- **AC-PK-003.1:** Every chest in a house of the Wilds gives loot. The chest of the home gives no
  loot: a press on it shows "Your chest. Nothing in it yet."
- **AC-PK-003.2:** No chest in Ironhold gives loot.
- **AC-PK-003.3:** At a chest with loot, the action label is "Open the chest". At a locked chest,
  it is "Pick the lock" for a character with DEX 13 or more ([Dexterity](../abilities/dexterity.md),
  REQ-DEX-007).
- **AC-PK-003.4:** An ordinary chest gives 1 to 6 coins and one thing: a candle stub, a silver
  ring, a pewter cup or a bundle of herbs.
- **AC-PK-003.5:** A locked chest gives 3 to 10 coins and one thing, and a second thing in about
  one of three. The chest of a barred house gives 5 to 15 coins and one thing, and a second thing
  in one of two. A locked chest also gives a magic item in one of 16, the chest of a barred house
  in one of 8 ([Equipment](equipment.md), REQ-EQ-020).
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
- **AC-PK-005.3:** With a drop, what does not fit falls on the ground at the mob (REQ-PK-013), and
  the player says "My pack is full."
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
- **AC-PK-006.4:** A page never writes the pack. It only asks the server for a deal, a drink, a
  drop or a pick-up, and the server checks each one.
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

**User Story:** As a player, I want to see what I carry and what each thing is for, so that I can
choose what to keep, what to use and what to drop.

**Acceptance Criteria:**
- **AC-PK-008.1:** The pack button is at the top right, left of the settings button. A press on
  it, or the I key, opens and closes the panel. Esc closes it.
- **AC-PK-008.2:** Only one panel at the top right is open at a time. The pack panel closes when
  another one opens.
- **AC-PK-008.3:** The panel shows the title "Pack", and the slots that are in use and all the
  slots ("2 of 8 slots"). It also shows the coins with a coin icon.
- **AC-PK-008.4:** The panel shows one cell for each slot. A used cell shows the icon of its item at
  2x, and the number when the stack has more than one item. A free cell is empty.
- **AC-PK-008.5:** Each cell shows the slot of the same place in the pack: a stack stays in its cell
  until the player moves it (REQ-PK-015) or it goes (AC-PK-001.6).
- **AC-PK-008.6:** A used cell names its stack for a screen reader and as a tooltip, for example
  "an imp horn" or "3 imp horns".
- **AC-PK-008.7:** With no coins and no items, the panel says "Your pack is empty."
- **AC-PK-008.8:** For a guest, the panel says "A guest: what you find is not saved." For a
  character in a world that the page runs, it says "Played alone: what you find here is not
  saved."
- **AC-PK-008.9:** A press on a used cell chooses it, and the cell gets a red border. Under the
  cells, the detail shows the icon at 3x, the name and the count ("Healing draught × 3"), what a
  drink does, the line of the world about the item, and the stack ("Up to 5 in a slot."). Before a
  choice, the detail says "Choose a thing to see what it does. Drag it to another slot, or out
  onto the ground."
- **AC-PK-008.10:** What a drink does: "Drink it: 2d4+2 hit points back." (a healing draught),
  "Drink it: 4d4+4 hit points back." (a strong draught), "Drink it: a poison ends.", and for herbs
  with WIS 13 "Chew it: 1d4 hit points back."
- **AC-PK-008.11:** The detail of a drink that the character can use has the button "Drink" (for
  herbs "Chew"), with the key of the drink on the belt (REQ-PK-014). A press drinks one
  (REQ-PK-011).
- **AC-PK-008.12:** The detail has the button "Drop all" ("Drop" for one item), and "Drop one" for a
  stack of more than one item (REQ-PK-013). They take the items from the chosen slot.
- **AC-PK-008.13:** A use behind a gate follows the gate rule ([Ability Scores](../abilities/ability-scores.md),
  REQ-AS-007). With a score 1 or 2 under the gate, the cell shows the gate dim in its corner ("WIS
  13"). The detail then says "[WIS 13] You could chew a bundle of herbs, if you knew more of
  herbs.", and it has no "Chew". With a lower score, the item has no use in the panel.
- **AC-PK-008.14:** The choice stays on its stack when the pack changes. When the stack goes,
  nothing is chosen.
- **AC-PK-008.15:** When every slot is in use, the pack button shows a small red mark, and its
  name for a screen reader is "Pack, full". When something comes into the pack, the button shines
  for 0.7 s.

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

### REQ-PK-010: Coins buy and items sell

**User Story:** As a player with coins and trinkets, I want to buy and to sell, so that the things
that I find have a use.

**Acceptance Criteria:**
- **AC-PK-010.1:** An ale at the Crooked Lantern costs 2 coins ([Constitution](../abilities/constitution.md),
  REQ-CON-010).
- **AC-PK-010.2:** Isolde, the apothecary, sells a healing draught for 6 coins, an antidote for 8
  and a strong draught for 15 ([Charisma](../abilities/charisma.md), REQ-CHA-004).
- **AC-PK-010.3:** Corwin, the peddler, buys a silver ring for 5 coins, a pewter cup for 3, a
  candle stub for 1, an imp horn for 2 and a brute tusk for 4 (REQ-CHA-005). The smith sells
  armour, a shield and weapons, and buys them back for half ([Equipment](equipment.md),
  REQ-EQ-019).
- **AC-PK-010.4:** Charisma changes every price and every sale (REQ-CHA-003). The conversation
  panel shows the price for the player after the answer: "(2 coins)", "(+7 coins)".
- **AC-PK-010.5:** A player with fewer coins than the price, without the item to sell, or without
  room for what it buys, makes no deal and keeps what it has.
- **AC-PK-010.6:** In a shared world the server makes the deal, and the pack in the next snapshot
  shows it.

---

### REQ-PK-011: Drinks

**User Story:** As a player, I want to drink the draughts that I brew, so that I can heal in the
woods.

**Acceptance Criteria:**
- **AC-PK-011.1:** A healing draught gives back 2d4+2 hit points (5e: a potion of healing), at most
  the most of the character. The player says "The draught is bitter. The wound closes a little."
- **AC-PK-011.2:** An antidote ends a poison. The player says "The antidote burns. The poison is
  gone."
- **AC-PK-011.3:** A strong draught gives back 4d4+4 hit points (5e: a potion of greater healing),
  at most the most of the character. The player says "The strong draught burns all the way down. I
  feel whole."
- **AC-PK-011.4:** A drink goes from the pack (one of the stack). A defeated character cannot
  drink.
- **AC-PK-011.7:** The player drinks from the drink belt (REQ-PK-014), with the key of the drink,
  or with "Drink" in the detail of the pack panel (REQ-PK-008).
- **AC-PK-011.5:** In a shared world the page sends the drink to the server, which checks the pack,
  rolls the dice and gives the effect. The hit points that come back rise over the player in
  green, for example "+7".
- **AC-PK-011.6:** A character with WIS 13 or more chews a bundle of herbs for 1d4 hit points. The
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
- **AC-PK-012.3:** The buried cache of Ironhold ("Dig here") gives 8 to 20 coins, a silver ring,
  and a second thing (a candle stub, a silver ring, a pewter cup or a bundle of herbs) in one of
  two: "I dig up a small box. I find 19 coins and a silver ring." After that it says "Somebody
  dug it up before me.", until it fills again 30 minutes later. In one of six it also gives a
  magic item ([Equipment](equipment.md), REQ-EQ-020).
- **AC-PK-012.4:** Patches and the cache are hidden: a character sees them only close by
  ([Wisdom](../abilities/wisdom.md), REQ-WIS-004). They do not collide.

---

### REQ-PK-013: Items on the ground

**User Story:** As a player with a full pack, I want to put things on the ground and take them
again later, so that I can make room without losing what I found.

**Acceptance Criteria:**
- **AC-PK-013.1:** "Drop one" and "Drop all" put items from the pack on the ground as a pile, 10 px
  in front of the player, the way that it faces. When that point is not open ground (a wall, a
  door, a tree, a rock, a thing, water), or something stands between, the pile lies at the feet of
  the player.
- **AC-PK-013.2:** A pile shows its item on the ground, small. A pile of 2 or more shows two
  copies, and a pile of 5 or more three. A small gold spark shows over each pile for 0.4 s in each
  2.6 s, above the darkness, when the player can see the pile (outside, or in the same building).
- **AC-PK-013.11:** Each pile also shines a little: once in each 4.7 s, its items get lighter and
  dark again over 1.9 s, at most 22% lighter. Each pile shines at its own moment. The shine is so
  faint that a player sees it only when it looks at the pile.
- **AC-PK-013.12:** Items that fall onto a pile fly there on the screen: from the hands of the player
  who dropped them (12 px over its feet), or out of the mob that died, on an arc that goes a little
  up first, down to the pile, with one hop of 2 px when they land. The flight takes 0.23 s, and
  4 ms more for each pixel of the way, at most 0.46 s. The item in the air is in front of what
  stands behind its point on the ground, and its shadow moves on the ground under it.
- **AC-PK-013.13:** A new pile shows when its items land. A pile that gets more items keeps its
  look until they land.
- **AC-PK-013.14:** Every player near a pile sees the items fall, also the items that another player
  drops. A page that was hidden does not show old falls.
- **AC-PK-013.3:** A pile holds one kind of item, up to the stack of that kind. Items that fall
  within 8 px of a pile of their kind go onto it while it has room. A new pile lies on open ground,
  at least 8 px from the other piles, within 16 px of the point where it fell, and with no wall,
  door, tree or thing between. When no such place is free, it lies on the point.
- **AC-PK-013.4:** Near a pile, the action button is ready, and its name is "Pick up 4 imp horns".
  A press, or E, puts the pile into the pack, and what goes in rises over the head of the player
  ("+4 IMP HORNS"). What does not fit stays on the ground, and the player says "My pack is full."
- **AC-PK-013.5:** A pile in range of the action button is a target, as a chest is. A pile under
  the feet of the player comes before a thing in front of it.
- **AC-PK-013.6:** Any player can pick up any pile. In a shared world, every player near a pile
  sees it.
- **AC-PK-013.7:** A pile goes 10 minutes after it came, or after items last went onto it. A world
  has at most 400 piles: when another one comes, the oldest one goes.
- **AC-PK-013.8:** In a shared world the server keeps the piles, in memory: a restart of the server
  (a deploy) clears them. The server drops only what the pack holds, and it gives a pile only to a
  player within the range of every action. A defeated player cannot drop or pick up.
- **AC-PK-013.9:** While the connection of a shared world is down, the piles do not show, and a drop
  makes the player say "I cannot drop it now. No connection."
- **AC-PK-013.10:** In a world that the page runs, the page keeps its own piles, with the same
  rules. A reload clears them.

---

### REQ-PK-014: The drink belt

**User Story:** As a player in a fight, I want to drink with one press, so that I can heal before
the next blow.

**Acceptance Criteria:**
- **AC-PK-014.1:** Under the hit points (top left), the belt shows one button for each drink that
  the character carries and can use: the healing draught, the strong draught, the antidote, and
  the bundle of herbs with WIS 13 (Medicine). Each button shows the icon at 2x and the count of
  that kind in all the slots.
- **AC-PK-014.2:** Each drink has a fixed key: 1 the healing draught, 2 the strong draught, 3 the
  antidote, 4 the herbs. The button shows its key. A touch screen shows no keys.
- **AC-PK-014.3:** A press on a button, or its key, drinks one (REQ-PK-011). The key works also when
  the pack panel is closed. While the conversation panel is open, the digits choose answers and do
  not drink.
- **AC-PK-014.4:** The tooltip and the name for a screen reader give the drink, its key and the
  count, for example "Drink a healing draught (1), 3 healing draughts".
- **AC-PK-014.5:** Without a drink to use, the belt does not show.

---

### REQ-PK-015: Moving and dropping stacks with a drag

**User Story:** As a player, I want to put my things where I want them in the pack, and to throw a
thing out of the pack with one move, so that the pack is in my order and I can make room fast.

**Acceptance Criteria:**
- **AC-PK-015.1:** A press on a used cell that moves 6 px or more is a drag, with the mouse (its main
  button) or a finger. A press that does not move is a click: it chooses the cell (AC-PK-008.9).
- **AC-PK-015.2:** During a drag, the icon of the stack (with its count) follows the pointer, its cell
  goes dim, and a cell under the pointer gets a red border. Over the world, only the icon follows
  the pointer, and the game's cursor does not show.
- **AC-PK-015.3:** A drag that ends on a free cell moves the stack into that slot.
- **AC-PK-015.4:** A drag that ends on a stack of another kind makes the two stacks change places.
- **AC-PK-015.5:** A drag that ends on a stack of the same kind fills that stack up to its size; what
  does not fit stays in the first cell. When that stack is full already, the two change places.
- **AC-PK-015.6:** A drag that ends on the world (not on the GUI) puts all of the stack on the
  ground: towards that point, at most 3 tiles (48 px) from the feet of the player. When a wall, a
  door, a tree, a rock or a thing stands between, the pile lands on the last open ground before it.
  A toss goes across water, but it does not land on it. The pile then follows AC-PK-013.3, and the
  items fall as AC-PK-013.12 says.
- **AC-PK-015.7:** A drag that ends on another part of the panel or the GUI, Esc, or a cancelled
  touch does nothing.
- **AC-PK-015.8:** The choice follows the stack that moved: a chosen stack that moves is still chosen
  in its new cell.
- **AC-PK-015.9:** In a shared world, the server moves the stack and keeps the order with the pack
  (the store keeps it). The panel shows a move or a drop at once; the next snapshot gives the
  server's pack, also when the server did nothing.
- **AC-PK-015.10:** A drag works also while the pack changes (a pick-up, a drink): the cells stay as
  they are until the drag ends. A drop takes all the items that the slot holds then, and nothing
  happens when the slot does not hold that kind any more.

## Feature Behavior & Rules

- **Drinks:** `DRINKS` (`Drink`: `hp` (a `Dice`: `draught` 2d4+2, `strong-draught` 4d4+4, `herbs`
  1d4), `full` (no drink uses it now), `cure`, and `gate` for herbs: `MEDICINE_GATE`),
  `drinkFrom(pack, kind, state, traits, source)` (`source`: a `DiceSource`, `dice.ts`), `hasItems()`
  and `removeFromPack()` in `packages/engine/src/items.ts`; the message `{ t: 'drink', kind }` and
  `Room.drink()` (protocol 14), which rolls with `Room.dice`; `drinkKind()` in
  `packages/engine-client/src/game.ts`, which the belt and the panel call. In a world that the page
  runs, the page rolls with `LOCAL_DICE` (`Math.random`). The panel writes the dice with
  `formatDice()` (`STRINGS.pack.hp`).
- **The drink belt** (`packages/engine-client/src/ui/belt.ts`, `DrinkBelt`): `BELT` (the drinks in
  the order of their keys), `beltKey()`, `drinkView()` (the gate rule for a drink), `drinkTitle()`
  and `countOf()`. It is in the vitals box (`Vitals.element`, `#belt`, `.belt-drink`). It takes
  `Digit1` to `Digit4` and `Numpad1` to `Numpad4`, but not in a form field, with Ctrl, Meta or Alt,
  or as a key repeat. The conversation panel takes the digits first (capture phase).

- **Deals** (`packages/engine/src/dialog.ts`): `Deal` (`goods`: `ale`, an item kind, `coins` for
  a sale, `refuge`; `price`, `items`, `pay`, `refuge`), `dealPrice()` and `dealPay()` (Charisma:
  `PlayerTraits.buyShare` and `sellShare`), `makeDeal()` and `canMakeDeal()`; `Room.deal()` makes
  them in a shared world. The Wilds: `ALE`, `ROOM`, `remedy()` and `sell()` in
  `worlds/wilds/src/dialogs.ts`.

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
  `Room.tick()`). What does not fit goes on the ground at the mob (`Piles.put()`). In a world that
  the page runs, `takeDrop()` in `game.ts` does the same.
- **Slots** (`packages/engine/src/items.ts`): `Pack.items` is the slots in order, `PackSlot` a stack
  or null (a free slot; never at the end of the list). `stacksOf()`, `usedSlots()`,
  `removeFromSlot()` (a drop), `moveInPack()` (a move: onto a free slot, a swap, or onto a stack of
  its kind), `removeFromPack()` (leaves free slots), `addToPack()` (the first free slot), and
  `checkPack()` (null for a free slot).
- **Piles** (`packages/engine/src/piles.ts`): `Pile` (id, a point in whole pixels, kind, count),
  `Piles` (`put()`, `take()`, `tick()`, `near()`, `get()`, `takeTosses()`, `version`), `PILE_MS`
  (10 minutes), `MAX_PILES` (400), `PILE_HALF_WIDTH` and `PILE_HALF_HEIGHT` (the box for the
  reach), `dropPoint()` (10 px ahead, when `clearLine()` finds no wall, door, tree or thing; water
  does not stop a pile), `tossPoint()` and `TOSS_REACH` (48 px). `Piles.put(..., from)` notes a
  `Toss` for each pile that it changed. `canReachPile()` and the argument `piles` of `findInteraction()` are in
  `interact.ts`: the target kind is `'pile'`, with `InteractionTarget.pile`.
- **Piles in a shared world:** `Room.piles`; `Room.put()` (the message `put`: `slot`, `kind`,
  `count`, and `at` for a toss) and `Room.move()` (the message `move`); `pick()` (the input batch
  `g: [seq, pile id]`, as the `u` of a chest, so the server checks the reach where the player was).
  The piles within `PILE_SEND_RADIUS` (30 tiles) go in the welcome (`pl`), and in a snapshot when
  their ids or counts change (`RoomPlayer.pileKey`). The tosses onto them go in the next snapshot
  (`ts: [pile id, x, y]`). A pick-up is loot with source 3. The page: `NetSession.put()`, `move()`
  (both change the page's pack at once), `pick()`, `pilesNow()` and `takeTosses()` (not older than
  1 s); in a world that it runs, `localPiles`, `dropItems()` and `moveItems()` in `game.ts`.
  Protocol 18 (`docs/multiplayer.md`).
- **Piles on the screen** (`packages/engine-client/src/render/piles.ts`, `PileViews`): the frames
  `pile/<kind>` (the item models at `PILE_SCALE` 0.7, with a shadow), `pile/<kind>/bare` (without
  it), `pile/shadow` and `pile/glint` (`packages/engine-client/art/items.ts`), on `pileLayer`
  between the ground and the depth-sorted things; the spark on `glowLayer`. The shine
  (`SHINE_EVERY_MS`, `SHINE_MS`, `SHINE_ALPHA`) is a copy of the bare items, added to their light.
  `PileViews.toss()` takes the tosses; an item in the air is a `pile/<kind>/bare` in `entityLayer`
  (its `zIndex` is its point on the ground), over a `pile/shadow` on `pileLayer` (`TOSS_LIFT`,
  `TOSS_MS`, `TOSS_MS_PER_PIXEL`, `TOSS_MAX_MS`, `TOSS_ARC`, `TOSS_ARC_PER_PIXEL`, `BOUNCE_HEIGHT`,
  `BOUNCE_MS`).
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
  `dropLines()` for a drop and a pick-up. The texts are in `STRINGS` (`ui/strings.ts`): `found`,
  `coins`, `items`, `packFull`, `chestEmpty`, `chestOffline`, `pickUp`, `pileOffline`,
  `dropOffline` and `pack`.
- **The text that rises** (`render/loot-text.ts`, `LootText`): gold `0xe0c070` on a 1-pixel shadow,
  `RISE` (12 px), `LIFE_MS` (1600), `FADE_MS` (500), in the small font, above the darkness. The
  code writes "+3 coins"; the small font draws lowercase letters as capitals. Only a drop and a
  pick-up rise: the player says the contents of a chest in its speech bubble.
- **The pack panel** (`packages/engine-client/src/ui/pack-panel.ts`, `PackPanel`, `PackActions`:
  `drink`, `drop` and `move`): the icons are the frames `item/<kind>` and `item/coin` (16 x 16,
  `packages/engine-client/art/items.ts`; `drawIcon()` in `ui/icons.ts`). The panel takes `KeyI`
  (`KeyboardEvent.code`), but not in a form field or with Ctrl, Meta or Alt. After a click on the
  panel, the focus goes back to the game, so WASD moves the player again. The cells are
  `.pack-slot` (`.chosen`) with a `.pack-pick` button, the detail `.pack-detail`, its buttons
  `.pack-action` (`.main` for the drink), the dim gate tag `.pack-gate`; the pack button gets
  `.full` and `.gain`. Each cell has `data-slot`. A drag uses pointer events on `window`
  (`DRAG_START`, 6 px): `.pack-ghost` (`.to-ground` over the world) follows the pointer, the cell
  gets `.dragging`, the cell under the pointer `.drop-target`, and the body `.pack-dragging`;
  `document.elementFromPoint()` finds a cell or `#game`. `.pack-pick` has `touch-action: none`.
  `PackPanel.dragging` hides the game's cursor.
- **The line of the world about each item:** `WorldDefinition.items` (`packages/engine/src/world.ts`);
  the Wilds' lines are in `worlds/wilds/src/index.ts`. A test keeps "Corwin" in the lines of
  exactly the items that the peddler buys (`worlds/wilds/test/items.test.ts`).
