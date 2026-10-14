# Ability Scores

## Overview

The six ability scores of a character change what the character can do in the game. The engine
turns the final scores into a set of traits (`PlayerTraits`), and the rules of the game read the
traits, not the scores. Strength (STR) and Dexterity (DEX) have their effects now
([Strength](strength.md), [Dexterity](dexterity.md)). Intelligence (INT), Wisdom (WIS) and
Charisma (CHA) give only the damage of the classes that attack with them. Constitution (CON) and
the other effects of INT, WIS and CHA come later (`docs/drafts/abilities.md`).

## Terminology

- **Ability score**: one of the six numbers of a character: STR, DEX, CON, INT, WIS and CHA.
- **Final score**: the score that the point buy gives, plus the increases of the race (and the
  two +1 choices of a half-elf). It is from 8 to 17.
- **Modifier (mod)**: the effect of a score: (score − 10) / 2, rounded down. A final score gives a
  modifier from −1 to +3.
- **Trait**: one thing that the scores give in the game, for example the damage of a blow or the
  slots of the pack.
- **Scale**: an effect in which a number changes with a modifier.
- **Gate**: a fixed limit on one score. A character with that score or more can do a thing. The
  usual gate is 13.
- **Attack ability**: the ability that a class attacks with. It gives the attack bonus and the
  damage of a blow.
- **Attack bonus**: what a character adds to the d20 of its attack roll: +2 (the proficiency bonus
  of levels 1 to 4; +3 at level 5), the modifier of its attack ability and a magic bonus.
- **Attack roll**: d20 + the attack bonus against the Armour Class (AC) of a mob
  ([Combat](../game/combat.md)).
- **Hit points of a mob**: the health of a mob, in points, from its 5e stat block. A blow that hits
  takes some; at 0 the mob dies.
- **Guest**: a visitor without a character (the URL switch `?nomenu`).
- **Tick**: one step of the simulation: 1/60 s.

## Requirements

### REQ-AS-001: The scores give traits

**User Story:** As a player, I want the scores that I chose in the builder to change the game, so
that my choices have a result.

**Acceptance Criteria:**
- **AC-AS-001.1:** The traits come from the final scores: the base scores, the increases of the
  race, and the two +1 choices of a half-elf.
- **AC-AS-001.2:** The modifier is −1 for a score of 8 or 9, 0 for 10 or 11, and +1 for 12 or 13.
  It is +2 for 14 or 15, and +3 for 16 or 17.
- **AC-AS-001.3:** Each effect is a scale or a gate. No trait uses a die roll: the same scores and
  the same gear always give the same traits. The dice roll only in a fight, and for the hit points
  that a draught or herbs give back ([Combat](../game/combat.md)).
- **AC-AS-001.4:** A gate of 13 opens for a final score of 13 or more. It stays shut for a score
  of 12 or less.
- **AC-AS-001.5:** The traits of a character do not change during play.

---

### REQ-AS-002: Each class attacks with its own ability

**User Story:** As a player, I want my class to fight with the ability that the builder marks for
it, so that a wizard with a high INT hits as hard as a fighter with a high STR.

**Acceptance Criteria:**
- **AC-AS-002.1:** The attack ability of each class is:
  - STR: barbarian, fighter, paladin.
  - DEX: bard, monk, ranger, rogue.
  - WIS: cleric, druid.
  - INT: wizard.
  - CHA: sorcerer, warlock.
- **AC-AS-002.2:** The class decides the attack ability, not the item in the hand. A wizard with a
  plain staff strikes with INT, and a cleric with a mace strikes with WIS.
- **AC-AS-002.3:** A blow that touches a mob makes an attack roll: d20 + the attack bonus against
  the AC of the mob ([Combat](../game/combat.md), REQ-CMB-003). The attack bonus is
  +2 + the modifier of the attack ability + a magic bonus: +1 to +5 for the final scores 8 to 17.
- **AC-AS-002.4:** A hit rolls its damage: the dice of what is in the main hand
  ([Equipment](../items/equipment.md), REQ-EQ-009) + the modifier of the attack ability + a magic
  bonus, at least 1. With a weapon of a d8, that is 1d8-1 to 1d8+3. The hit takes that damage from
  the hit points of the mob. An imp has 7 hit points and AC 13; a brute has 30 hit points and AC 12
  (every mob: REQ-CMB-002).
- **AC-AS-002.5:** An arrow makes the same attack roll and takes the same damage as a blow of that
  character.

---

### REQ-AS-003: The server decides the traits

**User Story:** As a player in a shared world, I want the server to know the traits of every
character, so that no visitor can give itself better traits.

**Acceptance Criteria:**
- **AC-AS-003.1:** When a player joins a shared world, the server makes its traits from the
  character in the store.
- **AC-AS-003.2:** No message from a client carries traits or scores. A changed page cannot change
  its traits on the server.
- **AC-AS-003.3:** The page makes the same traits from the same character. Its prediction of a
  move, a dodge roll, the start of an attack or a door gives the same result as the server. The
  page does not predict what a blow does: the server rolls its dice.
- **AC-AS-003.4:** The server applies the traits to every rule that reads them: movement, attacks,
  arrows, doors, chests, the pack and the sight of mobs.

---

### REQ-AS-004: A guest has plain traits

**User Story:** As a guest, I want to play with plain traits, so that the game works without a
character.

**Acceptance Criteria:**
- **AC-AS-004.1:** A guest has 10 in every score, so every modifier is 0.
- **AC-AS-004.2:** The class of the guest's look gives its attack ability, and the kit that it
  wears ([Equipment](../items/equipment.md), REQ-EQ-014). A guest with the look of a ranger shoots
  arrows.
- **AC-AS-004.3:** A guest has these traits:
  - the attack bonus +2, the damage dice and the Armour Class of its kit, and the normal
    knockback and stagger;
  - 6 slots;
  - one attack every 0.45 s (2 ticks quicker with a light weapon, 4 slower with a heavy one), a
    guard of 1.00 s, and a roll every 1.60 s;
  - mobs see it from 100% of their sight (50% while it sneaks, 75% in noisy armour);
  - with a bow in its kit, arrows that fly 5 tiles.
- **AC-AS-004.4:** A guest does not pass a gate of 13. It cannot wade, force a barred door, or
  pick a lock.
- **AC-AS-004.5:** A guest plays only on a page of the developer's machine (`localhost`, with
  `?nomenu`), for tests. On game.azyr.io every visitor signs in and plays a stored character
  (Fede's decision, 2026-10-11).

---

### REQ-AS-005: The builder shows what the scores give

**User Story:** As a player who makes a character, I want to see what each score gives in the
game, so that I can choose my scores with knowledge.

**Acceptance Criteria:**
- **AC-AS-005.1:** Step 2 of the builder ("Abilities") shows the list "What your scores give"
  under the table of scores.
- **AC-AS-005.2:** The list changes at once when the player raises or lowers a score, or changes
  the choices of a half-elf. The key numbers use the class that the player chose in step 1, and
  its kit. The card of the ability that the player changed glows for a moment.
- **AC-AS-005.3:** The list starts with four key numbers, each in a tile: "Armour Class", "Hit
  points", "Attack bonus" (with the attack ability under it: "with DEX") and "Damage" (for a rogue,
  the sneak attack under it: "+1d6 sneak attack").
- **AC-AS-005.4:** Then the list has a card for each ability, in the order STR, DEX, CON, INT,
  WIS, CHA (Fede's choice, 2026-10-14: groups by ability). The heading of a card gives the name of
  the ability, its score and its modifier, for example "Strength 13 (+1)". The rows of STR and
  DEX, in this order (in brackets, the value for a fighter with every score 10 and no gear):
  - Strength: "Walk" ("25% slower (armour)", only in a heavy armour without its STR),
    "Knockback" ("normal", or for example "+15%" and "−15%"), "Stagger" ("normal", "+20%"),
    "Pack" ("6 slots"), "Shallow water" ("you wade through it", or "from STR 13") and "Barred
    doors" ("you break them", or "from STR 13").
  - Dexterity: "Attacks" ("one every 0.45 s"), "Guard after a hit" ("1.00 s"), "Roll" ("every
    1.60 s"), "Mobs see you from" ("100% (sneaking 50%)"), "Arrows fly" ("5 tiles", only with a
    bow) and "Locked chests" ("you pick them", or "from DEX 13").
  The rows of CON, INT, WIS and CHA are in the documents of those abilities.
- **AC-AS-005.5:** A gate row shows its "yes" text when the score passes the gate. Else it shows
  the gate, for example "from STR 13", and the whole row is dim.
- **AC-AS-005.6:** A value shows how it compares with a score of 10: brighter when the modifier
  of its ability is above 0 (or its gate is open), dim when it is 0 ("normal"), and in a pale red
  when it is under 0 (and the slow walk of a heavy armour). A bonus that a low score does not take away ("A blow on a wind-up",
  "Others hit near you") is dim, not red, under 0.
- **AC-AS-005.7:** On a wide screen the cards go in two columns, where two fit. In one column, the
  values of all the cards start at the same place.

---

### REQ-AS-006: The character panel shows the traits

**User Story:** As a player in the game, I want to see what my scores give, so that I know what my
character can do.

**Acceptance Criteria:**
- **AC-AS-006.1:** The character panel (the "Character" button at the top right) shows the same
  list as the builder, for the character in play: its level and the gear that it wears. On a wide
  screen the character is at the left, and the list at the right.
- **AC-AS-006.2:** For a character, the section also shows its six final scores.
- **AC-AS-006.3:** For a guest, the section shows no scores, but it shows the list of the guest's
  traits.

---

### REQ-AS-007: How a thing behind a gate shows

**User Story:** As a player, I want to see a clue of a thing that I almost can use, so that I know
which score to raise, without a list of everything that I cannot do.

**Acceptance Criteria:**
- **AC-AS-007.1:** A character with the score of a gate or more uses the thing behind it: an
  answer, a page, a door, a chest, a recipe.
- **AC-AS-007.2:** A character with a score 1 or 2 under the gate sees a dim clue with the gate,
  for example "[INT 13]" or "[STR 13]", and cannot use the thing.
- **AC-AS-007.3:** A character with a score 3 or more under the gate sees nothing of it.
- **AC-AS-007.4:** The rule is the same for every ability and every gate in the world: dialog
  answers (lore, insight, persuasion), lore pages, barred doors, locked chests, the recipes of the
  cauldron and the herbs to chew in the pack.
- **AC-AS-007.5:** The traits list of the builder and of the character panel is the rule book: it
  names every gate, for every score.

---

### REQ-AS-008: The tag of a gate before a line of a gate

**User Story:** As a player, I want to see which score lets me do a thing when I do it, so that I
know what my character is good at.

**Acceptance Criteria:**
- **AC-AS-008.1:** A line that a gate lets the player say or hear starts with the tag of the gate,
  for example "[STR 13] The boards break." (Fede's request, 2026-10-14).
- **AC-AS-008.2:** In a speech bubble, the tag is in the small font (capitals of 5 px, on the line
  of the capitals of the text) and in old gold (#c9a64a, the gold of the XP bar); the rest of the
  line is in the font and the parchment of a bubble. The tag is the first word of the first line.
- **AC-AS-008.3:** The lines with a tag: the forced door (STR), the first wade into shallow water
  (STR), the picked lock (DEX), each lore page (INT), the herbs that the player chews (WIS), the
  lines of a scene that only a character with the gate hears (WIS), and the greeting of an NPC by
  name (CHA).
- **AC-AS-008.4:** A clue (a score 1 or 2 under the gate, REQ-AS-007) has the tag at the start too,
  in the same look: "[STR 13] Boards are nailed across it. ...", "[WIS 13] ..." for a murmur.
- **AC-AS-008.5:** In the conversation panel, the tag before an answer behind a gate, and before
  that answer in the line "You: ..." after it, is in old gold and a little smaller, in the
  monospace font of the GUI.
- **AC-AS-008.6:** A screen reader hears the tag as text, before the line.
- **AC-AS-008.7:** Without a tag: the things that are not lines (the map, the reading of a mob, the
  arrow home) and the scales without a gate (the seek of a patch of herbs or of a cache).

## Feature Behavior & Rules

- **The display of a gate** is `gateView(scores, gate)` (`traits.ts`): `'open'`, `'hint'` (1 or
  `GATE_HINT` (2) under it) or `'hidden'` (Fede's rule, 2026-10-10). The page writes the clue
  with `gateTag()` (`packages/engine-client/src/ui/conversation.ts`).
- **The tag of a gate** (REQ-AS-008): `gated(gate, line)` (`ui/conversation.ts`) puts the tag
  before a line. `SpeechBubble` (`render/speech-bubble.ts`) finds it again with `splitTag()`
  (`render/text-layout.ts`: a tag is `[`, capitals, digits and spaces, `]`, at the start of a line),
  translates only the rest of the line (`tw()`), and wraps the tag as one word (`TAG_MARK`,
  `taggedMeasure()`). It draws the tag with the small font (`PixelFont(art, 'small')`; the glyphs
  `[` and `]` of `SMALL_GLYPHS` in `art/font.ts`) in `TAG_INK`, `TAG_TOP` (2 px) lower than the text.
  The HTML GUI uses `gateTagElement()` (`.gate-tag` in `style.css`, colour `--ui-gate-tag`).
- **The code.** `packages/engine/src/traits.ts`: `PlayerTraits`, `traitsOf(scores, class, gear, level)`,
  `sheetTraits(sheet, gear)` (a stored character), `guestTraits(skin, gear)` (a guest; its gear
  is `guestGear(skin)`), `GUEST_TRAITS` (every score 10, a fighter and `PLAIN_GEAR`, a rapier: for
  tests and for a player without a look), `PLAIN_SCORES`, `Gate`, `meetsGate()` and `GATE_SCORE`
  (13). The attack bonus is `PlayerTraits.toHit`: `proficiencyBonus(level)` (2; 3 at level 5) + the
  modifier of the attack ability + the magic bonus of the weapon. The damage is
  `PlayerTraits.damage`, a `Dice` (`packages/engine/src/dice.ts`): the dice of the gear
  (`packages/engine/src/gear.ts`, [Equipment](../items/equipment.md)) + the same modifier and
  bonus. The other scales have their constants in the document of each ability.
- **The rules of a character** are in `packages/engine/src/character.ts`: `ATTACK_ABILITY`,
  `abilityModifier()`, `finalScores()`. `CLASS_PRIMARY` (the abilities that the builder marks) is
  another list: a sorcerer has CHA and CON as its main abilities, and it attacks with CHA.
- **The attack ability is Option B** (Fede's decision, 2026-10-10). Fede refused Option A (STR
  gives the damage of every class). With Option A, a wizard with STR 8 hits weakly, and INT does
  nothing in a fight.
- **Push and stagger use STR for every class**, also for a class that attacks with another
  ability. A wizard with INT 16 and STR 8 does much damage, but pushes little.
- **Limits:** a blow that hits does at least 1 damage (`rollBlow()` in `mobs.ts`). In
  `traitsOf()` the slots are at least 1, the attack cooldown at least `ATTACK_TICKS` + 1, the guard
  at least 0, and the dodge cooldown at least 1 tick. The share of the sight is at least 0.1. The
  scores from 8 to 17 never reach the limits of `traitsOf()`.
- **The server** (`packages/engine-server/src/index.ts`) passes `{ traits: sheetTraits(character),
  pack: character.pack }` to `Room.join()`. A server without accounts (no `GAME_DB`) gives each
  player `guestTraits()` of its skin seed and an empty pack. The `hello` message has no field for
  traits.
- **The page** (`packages/engine-client/src/game.ts`) makes `sheetTraits(character)`, or
  `guestTraits(skin)` for a guest, and gives the same traits to `NetSession` and `Prediction`.
  `?skin=<n>` shows another look for a character, but its traits stay the traits of the character.
- **No predicted kill:** in a shared world the server rolls each blow (`Horde.strike()`, with the
  dice of the horde, `Horde.dice`). The page flashes a mob that a blow touches at once (`MobViews.touch()`),
  and it shows the result when the snapshot brings it (`bl`). The health in `WireMob` is the hit
  points that the mob has left (in points since protocol 11).
- **The protocol versions:** 11 brought the traits and STR, 12 brought DEX, and 26 the results of
  the dice of a fight (`docs/multiplayer.md`).
- **The list of traits** is `traitsList()` in `packages/engine-client/src/ui/traits-list.ts`, with
  its texts in `STRINGS.traits` (`ui/strings.ts`, `ui/strings-es.ts`) and its styles `.traits-*`
  (`style.css`; the theme variables `--ui-card` and `--ui-worse`). `traitSheet()` gives the key
  numbers and the groups with the tone of each row (`better`, `plain`, `worse`, `closed`), without
  the DOM, for the tests. The score of a group is the score without the luck of the worn items (the
  scales use it), and the gates use the score with the luck. The builder (`menu/builder.ts`) puts
  the list in a region with `aria-live="polite"`, so a screen reader hears a change, and gives
  `traitsList()` the ability that the player changed (`lit`). The character panel is
  `ui/character-panel.ts`, with its content in `ui/you-section.ts`.
- **Debug:** `?debug` shows the line `traits` (STR: damage, push, stagger, slots, wade) and the line
  `dex` (cooldown, guard, dodge, sight, range, the state of the roll and of sneaking).
- **The plan and Fede's decisions** are in `docs/drafts/abilities.md`.
