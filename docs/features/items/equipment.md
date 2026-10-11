# Equipment

## Overview

A character wears items in the twelve slots of D&D 5e: armour, a shield, a weapon, an amulet, two
rings, and more. What it wears gives its Armour Class (AC) and the base of its damage. AC turns a
share of the mob hits into glancing blows, in a fixed order, without dice. Each character starts
with the 5e starting kit of its class, so a fighter starts in chain mail with a longsword and a
shield, and a wizard with an arcane staff. The pack panel shows the worn slots round a picture of
the character, and the player puts items on and takes them off with a press or a drag. Fede's
decisions of 2026-10-11 are in `docs/drafts/equipment.md`.

## Terminology

- **Worn slot**: one of the twelve places of the body where the character wears an item. A slot of
  the pack (Pack and Loot) is a different thing.
- **Gear**: what a character wears: an item, or nothing, in each worn slot.
- **Kit**: the gear that a new character gets from its class (SRD 5.1, the starting equipment).
- **Proficiency**: the armour, the shields and the weapons that a class can use (SRD 5.1).
- **Armour Class (AC)**: a number from the armour, the shield, DEX and the class.
- **Glancing blow**: a mob hit that does nothing, because of the AC of the player.
- **Attunement**: the bond with a magic item that it needs to work (5e). A character can be
  attuned to at most 3 items.
- **Base damage**: the part of the damage of a blow that comes from what is in the main hand. The
  modifier of the attack ability of the class (Ability Scores, REQ-AS-002) comes on top.
- **Cantrip**: the attack spell of a spellcaster (5e: fire bolt, eldritch blast, produce flame).
- **Focus**: a staff that a spellcaster casts its cantrip through.
- **Address**: the number of a place in the inventory: a slot of the pack (0 to 15), or a worn slot
  (32 to 43).

## Requirements

### REQ-EQ-001: Twelve worn slots

**User Story:** As a player of D&D, I want the slots of 5e, so that the gear of my character works
as it does at the table.

**Acceptance Criteria:**
- **AC-EQ-001.1:** A character has twelve worn slots: head, neck, cloak, armour, bracers, gloves,
  belt, feet, left ring, right ring, main hand and off hand.
- **AC-EQ-001.2:** Each worn slot holds one item, or nothing.
- **AC-EQ-001.3:** A worn item uses no slot of the pack.
- **AC-EQ-001.4:** A defeat takes no worn item.

---

### REQ-EQ-002: The items to wear

**User Story:** As a player, I want armour, shields and weapons, so that I can fight better.

**Acceptance Criteria:**
- **AC-EQ-002.1:** There are fourteen new kinds of item, each one item in a slot of the pack:
  leather armour, scale mail, chain mail, splint armour, shield, longsword, shortsword, rapier,
  greataxe, mace, longbow, arcane staff, druid staff and luck amulet.
- **AC-EQ-002.2:** The armour: leather armour is light, AC 11. Scale mail is medium, AC 14, noisy.
  Chain mail is heavy, AC 16, STR 13, noisy. Splint armour is heavy, AC 17, STR 15, noisy. A
  shield adds AC 2.
- **AC-EQ-002.3:** The weapons: longsword d8 (versatile d10), shortsword d6 (light), rapier d8,
  greataxe d12 (heavy, two-handed), mace d6, longbow d8 (two-handed, it shoots arrows). The arcane
  staff and the druid staff are quarterstaffs (d6, versatile d8) and a focus: the arcane staff for a
  sorcerer, a warlock or a wizard, the druid staff for a druid.
- **AC-EQ-002.4:** The luck amulet goes on the neck and needs attunement.
- **AC-EQ-002.5:** The silver ring of the chests goes on a finger. It does nothing.
- **AC-EQ-002.6:** Items go only into the slots that fit them: armour into the armour slot, a ring
  into a ring slot, an amulet into the neck slot, a weapon or a focus into the main hand, a shield
  or a light weapon into the off hand.

---

### REQ-EQ-003: What a class can use

**User Story:** As a player, I want each class to use its own gear, so that the classes stay
different.

**Acceptance Criteria:**
- **AC-EQ-003.1:** The armour and the shields of each class (SRD 5.1): barbarian light and medium,
  shields; bard light; cleric light and medium, shields; druid light and medium, shields; fighter
  all armour, shields; monk none; paladin all armour, shields; ranger light and medium, shields;
  rogue light; sorcerer none; warlock light; wizard none.
- **AC-EQ-003.2:** The weapons of each class (SRD 5.1): barbarian, fighter, paladin and ranger
  simple and martial; cleric and warlock simple; monk simple and the shortsword; bard and rogue
  simple, the longsword, the rapier and the shortsword; druid the mace and the two staffs; sorcerer
  and wizard the two staffs.
- **AC-EQ-003.3:** A character cannot put on an item that its class cannot use. The detail of the
  item says why, for example "A wizard cannot use it.", and its icon shows dim in the panel.
- **AC-EQ-003.4:** Every class can wear a ring and the luck amulet.

---

### REQ-EQ-004: The hands

**User Story:** As a player, I want the hands to work as in 5e, so that a two-handed weapon and a
shield do not go together.

**Acceptance Criteria:**
- **AC-EQ-004.1:** A two-handed weapon in the main hand takes off the item in the off hand: it
  goes into the pack.
- **AC-EQ-004.2:** A shield or a light weapon in the off hand takes off a two-handed weapon from
  the main hand: it goes into the pack.
- **AC-EQ-004.3:** A versatile weapon uses its bigger die when the off hand is empty (a longsword
  d10, a staff d8).
- **AC-EQ-004.4:** What comes off goes into the slot of the pack that the new item came from, else
  into the first free slot. When the pack has no room for it, nothing changes.

---

### REQ-EQ-005: Attunement

**User Story:** As a player, I want a limit on magic items, so that one character cannot wear
every charm.

**Acceptance Criteria:**
- **AC-EQ-005.1:** A character wears at most 3 items that need attunement.
- **AC-EQ-005.2:** A 4th one cannot go on. Its detail says "You are attuned to 3 things already."

---

### REQ-EQ-006: Armour Class

**User Story:** As a player, I want my armour to protect me, so that the gear changes the fights.

**Acceptance Criteria:**
- **AC-EQ-006.1:** Without armour, AC is 10 + the DEX modifier. A barbarian adds the CON modifier.
  A monk without a shield adds the WIS modifier.
- **AC-EQ-006.2:** With light armour, AC is the AC of the armour + the DEX modifier. With medium
  armour, + the DEX modifier, at most +2. With heavy armour, the AC of the armour.
- **AC-EQ-006.3:** A shield adds 2.
- **AC-EQ-006.4:** For example, a fighter in chain mail with a shield has AC 18, and a wizard with
  DEX 14 has AC 12.

---

### REQ-EQ-007: Glancing blows

**User Story:** As a player in armour, I want some hits to do nothing, so that a high AC keeps me
alive, without a roll of a die.

**Acceptance Criteria:**
- **AC-EQ-007.1:** Each point of AC over 10 turns 5% of the mob hits into glancing blows, at most
  95%. AC 10 or less: none.
- **AC-EQ-007.2:** The order is fixed: each hit adds the share to a count, and the hit that brings
  the count to 1 glances off. The count then drops by 1. With AC 15 (25%), the 4th, the 8th and the
  12th hits glance off.
- **AC-EQ-007.3:** A glancing blow takes no hit points, gives no stun and no poison, and gives no
  guard after it.
- **AC-EQ-007.4:** A glancing blow shows a white spark at the chest of the player for 0.3 s, and
  the body is pale for 0.11 s.
- **AC-EQ-007.5:** The mob runs off after a glancing blow, as after a hit.

---

### REQ-EQ-008: Heavy and noisy armour

**User Story:** As a player, I want heavy armour to cost something, so that a light armour is a
real choice.

**Acceptance Criteria:**
- **AC-EQ-008.1:** In chain mail without STR 13, or in splint armour without STR 15, the character
  walks at 3/4 of its speed.
- **AC-EQ-008.2:** In noisy armour (scale mail, chain mail, splint armour), mobs see a character
  that sneaks from 3/4 of their sight, not from 1/2.

---

### REQ-EQ-009: The damage of a blow

**User Story:** As a player, I want a better weapon to hit harder, and each class to stay fair, so
that the gear matters and no class is useless.

**Acceptance Criteria:**
- **AC-EQ-009.1:** The damage of a blow is the base damage + the modifier of the attack ability of
  the class + a magic bonus, at least 1.
- **AC-EQ-009.2:** With a weapon in the main hand, the base damage is half of its die: d4 2, d6 3,
  d8 4, d10 5, d12 6.
- **AC-EQ-009.3:** With an empty main hand, the base damage is 1 (an unarmed strike). A monk uses
  martial arts: 3.
- **AC-EQ-009.4:** A sorcerer, a warlock or a wizard with an empty main hand or an arcane staff
  casts a cantrip: base damage 5. A druid with an empty main hand or a druid staff: 4.
- **AC-EQ-009.5:** The opening of INT (Intelligence, REQ-INT-002) adds to it on a mob in its
  wind-up.

---

### REQ-EQ-010: The speed of the attacks

**User Story:** As a player, I want a light weapon to be quick and a heavy one to be slow, so that
each weapon feels different.

**Acceptance Criteria:**
- **AC-EQ-010.1:** A light weapon in the main hand attacks 2 ticks quicker. A light weapon in the
  off hand attacks 2 ticks quicker too. A monk's martial arts are as quick as a light weapon.
- **AC-EQ-010.2:** A heavy melee weapon (the greataxe) attacks 4 ticks slower. A bow is not slower.
- **AC-EQ-010.3:** The time between two attacks is never shorter than the attack (19 ticks).

---

### REQ-EQ-011: Bows

**User Story:** As a player, I want any class with a bow to shoot, so that the bow is gear and not
only a part of the ranger.

**Acceptance Criteria:**
- **AC-EQ-011.1:** A character with a longbow in its main hand attacks with arrows (Dexterity,
  REQ-DEX-006), with a range of 5 + the DEX modifier tiles.
- **AC-EQ-011.2:** A character without a bow attacks in melee, a ranger too.

---

### REQ-EQ-012: Sneak attack

**User Story:** As a rogue, I want to hit harder from the shadows, so that the rogue plays as in
5e.

**Acceptance Criteria:**
- **AC-EQ-012.1:** A blow of a rogue does 3 more damage on a mob that does not hunt the
  rogue: a mob that wanders, or that hunts another player.
- **AC-EQ-012.2:** The "You" section and the builder show "Sneak attack: +3 on a mob that does not
  hunt you" for a rogue.

---

### REQ-EQ-013: The luck amulet

**User Story:** As a player, I want a lucky charm, so that the story can give me a reward with an
effect.

**Acceptance Criteria:**
- **AC-EQ-013.1:** The luck amulet adds 1 to each score for every gate (Ability Scores,
  REQ-AS-007): a character with INT 12 and the amulet passes a gate of INT 13.
- **AC-EQ-013.2:** It changes no scale: the damage, the hit points and the rest stay the same.
- **AC-EQ-013.3:** Its detail says "Luck: +1 to each score for every test." and "It needs
  attunement: you can be attuned to 3 things."

---

### REQ-EQ-014: The kit of each class

**User Story:** As a new player, I want to start with the gear of my class, so that my fighter
looks and fights like a fighter.

**Acceptance Criteria:**
- **AC-EQ-014.1:** A new character gets the worn part of the SRD 5.1 kit of its class: barbarian a
  greataxe; bard a rapier and leather armour; cleric a mace, a shield and scale mail; druid a druid
  staff, a shield and leather armour; fighter a longsword, a shield and chain mail (with STR under
  13: leather armour and a longbow); monk nothing; paladin a longsword, a shield and chain mail;
  ranger a longbow and leather armour; rogue a shortsword and leather armour; sorcerer nothing;
  warlock leather armour; wizard an arcane staff.
- **AC-EQ-014.2:** The kit puts nothing into the pack.
- **AC-EQ-014.3:** A character from before 2026-10-11 gets the kit of its class when it next loads.
- **AC-EQ-014.4:** A guest wears the kit of the class of its look, with every score 10.

---

### REQ-EQ-015: The worn slots in the pack panel

**User Story:** As a player, I want to see what I wear and change it with a press or a drag, so that
gear is as easy to use as the pack.

**Acceptance Criteria:**
- **AC-EQ-015.1:** The pack panel shows "Worn" over the twelve worn slots, round a picture of the
  character at 3x. Head and neck are on the first row, cloak and armour on the second; then the
  main hand, the bracers, the belt, the gloves and the off hand; then the left ring, the feet and
  the right ring.
- **AC-EQ-015.2:** An empty worn slot shows its short name, dim ("Head", "Ring", "Main", "Off"). Its
  name for a screen reader and its tooltip are "Main hand: nothing". A used one shows the icon of its
  item, and "Main hand: a longsword".
- **AC-EQ-015.3:** Under the worn slots, the panel shows "AC 18 · Damage 7" and "40% of the hits
  glance off" (or "no hit glances off").
- **AC-EQ-015.4:** The detail of an item to wear says what it is: for example "Heavy armour: AC
  16.", "Without STR 13, you walk slower in it.", "Noisy: when you sneak, the mobs see you from
  further away.", "Weapon (d8): 4 damage + your attack ability.", "With both hands (d10): 5.", "It
  needs both hands.", "Light: quicker attacks. It goes in the off hand too.", "Heavy: slower
  attacks.", "It shoots arrows.", "Your focus: you cast your cantrip with it.", "It goes on a
  finger.". A worn item also shows "Worn: main hand.".
- **AC-EQ-015.5:** The detail of an item in the pack that the character can put on has the button
  "Wear": the item goes into its slot (a ring into the free hand, else the left one; a weapon into
  the main hand; a shield into the off hand).
- **AC-EQ-015.6:** The detail of a worn item has the buttons "Take off" (into a stack of its kind,
  else the first free slot of the pack) and "Drop". With a full pack, "Take off" is off, and its
  tooltip says "Your pack has no room for what you take off."
- **AC-EQ-015.7:** A drag of an item from the pack onto a worn slot puts it on. A drag of a worn
  item onto a slot of the pack takes it off. On another item in the pack that fits the worn slot,
  the two change places. A drag between the two ring slots moves the ring.
- **AC-EQ-015.8:** During a drag, only a worn slot that fits the item, for a class that can use
  it, gets the red border.
- **AC-EQ-015.9:** A drag of a worn item onto the world puts it on the ground (Pack and Loot,
  REQ-PK-015).
- **AC-EQ-015.10:** The choice follows the item: after "Wear" the worn slot is chosen, after "Take
  off" the slot of the pack.
- **AC-EQ-015.11:** A defeated character does not change what it wears.

---

### REQ-EQ-016: The server owns the gear in a shared world

**User Story:** As a player in a shared world, I want my gear to stay with my character, so that
it is there in my next session.

**Acceptance Criteria:**
- **AC-EQ-016.1:** In a shared world, the server keeps the gear, checks each change (the slot, the
  class, the hands, the attunement, the room of the pack) and makes the traits from it.
- **AC-EQ-016.2:** The store keeps the gear with the character, and saves it with the pack.
- **AC-EQ-016.3:** The page shows a change at once, and the next snapshot gives the server's word.
- **AC-EQ-016.4:** In a world that the page runs, the page keeps its own gear, from the stored
  character, and does not save it.

---

### REQ-EQ-017: The traits show the gear

**User Story:** As a player, I want to see what my gear gives, so that I can compare.

**Acceptance Criteria:**
- **AC-EQ-017.1:** The list of traits (the builder, with the kit of the class, and the "You"
  section) starts with "Armour Class: 18 (40% of the hits glance off)" and the damage of a blow.
- **AC-EQ-017.2:** It shows "Walk: 25% slower (heavy armour)" in a heavy armour without its STR.
- **AC-EQ-017.3:** It shows how far mobs see a sneaking character with the share of the armour.
- **AC-EQ-017.4:** The traits change at once when the gear changes.

---

## Feature Behavior & Rules

- **The model** (`packages/engine/src/gear.ts`): `GEAR_SLOTS` (the order on the wire), `Gear` (an
  item kind or null for each slot), `EMPTY_GEAR`, `WEARABLES` (`Wearable`: `place`, `armour`
  (`ArmourDef`: `type`, `ac`, `str`, `noisy`), `shield`, `weapon` (`WeaponDef`: `die`, `versatile`,
  `light`, `heavy`, `twoHanded`, `ranged`, `martial`, `focus`), `attune`, `luck`, `bonus`),
  `PROFICIENCY`, `canUse()`, `fitsSlot()`, `MAX_ATTUNED` (3), `kitOf()`, `checkGear()`. This
  module imports only types: `traits.ts` uses it while the engine loads (`GUEST_TRAITS`), so a value
  import would make a loop of modules.
- **What the gear gives** (`gear.ts`): `attackGear()` (`AttackGear`: `base`, `bonus`, `kind`
  (`weapon`, `cantrip`, `martial-arts`, `unarmed`), `quicker`, `ranged`, `twoHands`),
  `armourClass()`, `glanceShare()` (`GLANCE_PER_AC` 0.05, `MAX_GLANCE` 0.95), `gearLuck()`,
  `tooHeavy()` and `HEAVY_SPEED` (0.75), `isNoisy()` and `NOISY_SIGHT` (0.75), `dieBase()`,
  `UNARMED_BASE` (1), `MARTIAL_ARTS_BASE` (3), `CANTRIP_BASE`, `CASTER_FOCUS`, `SNEAK_ATTACK` (3),
  `LIGHT_TICKS` (2), `HEAVY_TICKS` (4).
- **The traits** (`packages/engine/src/traits.ts`): `traitsOf(scores, class, gear)` gives the new
  traits `class`, `luck`, `strike`, `sneak`, `ac`, `glance`, `speed` and `sneakSight`; `damage`,
  `cooldown` and `ranged` come from the gear. `scores` has the luck on each score (for the gates);
  the scales come from the scores without it. `sheetTraits(sheet, gear)`, `sheetKit(sheet)`,
  `guestGear(skin)`, `guestTraits(skin, gear)`. `PLAIN_GEAR` (a rapier: base 4 and no other
  property) keeps the tests of the abilities apart from the gear; `GUEST_TRAITS` uses it.
- **A glancing blow** (`packages/engine/src/player.ts`): `PlayerState.ward` (the count) and
  `PlayerState.glance` (the ticks of the spark, `GLANCE_TICKS` 18). `hitPlayer()` returns false for
  a glancing blow; the `Horde` then gives no inspire. `StepTraits.speed` sets the walk.
- **Sneak attack** (`packages/engine/src/mobs.ts`): `Blow.sneak`, `blowDamage(blow, mob, unaware)`
  and `Horde.hunts()` (the test of `huntersOf()`). The page predicts a kill without the sneak
  attack: it waits for the server's word then.
- **The moves** (`packages/engine/src/inventory.ts`): `wear()` (gives `WearProblem`: `slot`,
  `class`, `attuned`, `full`), `takeOff()`, `moveItem()` (all four kinds of move),
  `wearSlotFor()`, `wearProblem()`, `takeOffSlotFor()`, `dropWorn()`. The addresses are in
  `gear.ts`: `GEAR_BASE` (32), `gearAddress()`, `gearSlotAt()`.
- **In a shared world** (`packages/engine/src/net/room.ts`): `RoomPlayer.gear`, `gearChanged`,
  `traitsFor` (from `JoinCharacter.traitsFor`; a guest's comes from its look), and `dress()`.
  `Room.move()` and `Room.put()` take the addresses of worn slots. Protocol 19
  (`docs/multiplayer.md`): `gr` in the welcome and in a snapshot when the gear changed, the
  addresses in `move` and `put`, and the glance as the last number of `WireSelf`. The page:
  `NetSession.gear`, `setTraits()`, `move()` and `put()` change the gear at once.
- **The store** (`packages/engine-server/src/store.ts`): the column `gear` (JSON: a kind or null for
  each slot; migration of 2026-10-11). Null: the kit of the class (`sheetKit()`). `setGear()`;
  `Accounts.saveGear()`; the server saves it in `savePlace()` with the pack.
- **The page** (`packages/engine-client/src/game.ts`): `gear`, `gearNow()`, `traitsFor()` and
  `followGear()` (each tick and each frame: when the gear changed, new traits for the session, the
  drink belt (`setScores()`), the map (`setInt()`) and the "You" section (`setTraits()`)).
  `dropItems()` and `moveItems()` take addresses. The debug panel (`?debug`) has a line `gear`.
- **The panel** (`packages/engine-client/src/ui/pack-panel.ts`): `PackPanel.show(pack, gear,
  traits)`, `showLook(sheet)`, `wearLines()`. The worn slots are `.gear-slot[data-gear=<slot>]`
  (also `.pack-slot`, with `data-slot` the address), the picture `.gear-portrait`, the numbers
  `.gear-stats`. The styles are in `style.css` (`.gear-slots`: a grid of 5 columns and 4 rows with
  named areas).
- **The spark** (`packages/engine-client/src/render/player-view.ts`): `PlayerPose.glance`, the frame
  `pile/glint` in the overlay, `GLANCE_TINT`, `GLANCE_FLASH_MS`. The other players do not see it.
- **The icons** (`packages/engine-client/art/items.ts`): the models `cuirass()` (with a pattern for
  each armour), `shield()`, `sword()`, `greataxe()`, `mace()`, `longbow()`, `staff()`, `amulet()`,
  and the materials `leather`, `steel`, `iron`, `wood`, `arcane` and `dark`. Each has its `item/`
  and `pile/` frames.
- **Texts** (`packages/engine-client/src/ui/strings.ts`): `STRINGS.items` for the new kinds,
  `STRINGS.gear`, and `ac`, `acValue`, `sneak`, `sneakValue`, `walk` and `walkValue` in
  `STRINGS.traits`. The world's line about each item is in `worlds/wilds/src/index.ts`.
- **Not yet** (`docs/drafts/equipment.md`): the figure in the world still shows the weapon and the
  shield of its look, not of its gear (phase 2). Nobody sells or buys gear yet (phase 3).
