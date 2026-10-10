# Charisma

## Overview

Charisma (CHA) is the force of personality of a character. It gives the damage of the blow of a
sorcerer and a warlock, better prices, answers in conversations that win people over (a room at
the inn, a friend's price), a presence that makes a pack of mobs press the character less, a guard
that it gives to the other players near it, and a good name: the people of Thornwick greet it.

## Terminology

- **Persuasion**: an answer in a conversation behind a gate of CHA 13.
- **Price**: the coins that a player pays for a deal. **Sale**: the coins that a player gets for an
  item.
- **Presence**: how much less the attacks of a pack overlap on the character.
- **Daunt**: how much longer a mob runs off after it hits the character.
- **Inspire**: the extra guard that the character gives to the other players near it when a mob
  hits them.
- **Reputation**: the people of Thornwick greet the character by its name (CHA 13).
- **Clue**: the dim display of a thing behind a gate for a character that is 1 or 2 short of it
  ([Ability Scores](ability-scores.md), REQ-AS-007).

## Requirements

### REQ-CHA-001: The sorcerer and the warlock strike with Charisma

**User Story:** As a sorcerer or a warlock, I want my blows to take their damage from my Charisma,
so that my main ability counts in a fight.

**Acceptance Criteria:**
- **AC-CHA-001.1:** A blow of a sorcerer or a warlock does 4 + CHA modifier damage: 3 at CHA 8, 7
  at CHA 16 or 17 ([Ability Scores](ability-scores.md), REQ-AS-002).

---

### REQ-CHA-002: Persuasion in conversations

**User Story:** As a charming player, I want to win people over, so that they give me more than
words.

**Acceptance Criteria:**
- **AC-CHA-002.1:** Brann, Marta, Isolde and Aldous each have one answer behind CHA 13, with the
  gate rule: open with CHA 13, dim with CHA 11 or 12, not there with less.
- **AC-CHA-002.2:** Marta, the innkeeper: "[CHA 13] Surely there is a corner for a friendly face?"
  gives the character a room. The Crooked Lantern becomes its refuge: it wakes there after a
  defeat if the inn is nearer than the home ([Constitution](constitution.md), REQ-CON-008).
- **AC-CHA-002.3:** With the room, the bed by the east wall of the inn rests the character ("Rest":
  all hit points and stamina back). Without it, the bed says "A narrow bed by the east wall. It is
  not mine."
- **AC-CHA-002.4:** Isolde, the apothecary: "[CHA 13] Then I need a friend who knows the labels. A
  friend's price, perhaps?" opens her friend's price (REQ-CHA-004).
- **AC-CHA-002.5:** Brann, the watchman: "[CHA 13] You look like a man who needs a drink. The next
  one is on me." He tells that the brutes are slow. Aldous, the reeve: "[CHA 13] You can tell me. I
  keep secrets." He tells of the last reeve and the granary.
- **AC-CHA-002.6:** In a shared world the server gives the room only to a character with CHA 13,
  within 48 px of Marta.

---

### REQ-CHA-003: Prices

**User Story:** As a charming player, I want to pay less and get more, so that my coins go
further.

**Acceptance Criteria:**
- **AC-CHA-003.1:** A player pays the price × (1 − 0.1 × CHA modifier), rounded, at least 1 coin:
  110% at CHA 8 or 9, 100% at 10 or 11, 70% at 16 or 17.
- **AC-CHA-003.2:** A player gets for a sale the price × (1 + 0.1 × CHA modifier), rounded, at
  least 1 coin: 90% at CHA 8 or 9, 130% at 16 or 17.
- **AC-CHA-003.3:** The conversation panel shows the price for the player after the answer: "The
  ale, then. (2 coins)", "A silver ring. (+7 coins)".
- **AC-CHA-003.4:** In a shared world the server takes and gives the coins with the same rule.

---

### REQ-CHA-004: Isolde sells remedies

**User Story:** As a player with coins, I want to buy draughts, so that I can heal without the
cauldron.

**Acceptance Criteria:**
- **AC-CHA-004.1:** "Do you sell remedies?" leads to Isolde's shop: a healing draught for 6 coins,
  an antidote for 8, a strong draught for 15, before Charisma.
- **AC-CHA-004.2:** Her friend's price (REQ-CHA-002) is 4, 6 and 11 coins, before Charisma. Each of
  those answers is behind CHA 13 too.
- **AC-CHA-004.3:** With the coins and room in the pack, the draught goes into the pack: "Drink it
  before you need it, not after." Else: "Coin first, and room in your pack for the bottle."

---

### REQ-CHA-005: The peddler buys

**User Story:** As a player with trinkets and trophies, I want to sell them, so that they become
coins.

**Acceptance Criteria:**
- **AC-CHA-005.1:** Corwin, the peddler of the main street, has a conversation. He buys a silver
  ring for 5 coins, a pewter cup for 3, a candle stub for 1, an imp horn for 2 and a brute tusk
  for 4, before Charisma.
- **AC-CHA-005.2:** A sale takes one item from the pack: "A fair price. Fairer than most. What
  else?" Without the item: "You do not have one. I do not buy promises."

---

### REQ-CHA-006: Presence over mobs

**User Story:** As a commanding player, I want packs to press me less, so that I can hold my
ground.

**Acceptance Criteria:**
- **AC-CHA-006.1:** When two or more mobs hunt the character, their attacks overlap 0.05 × CHA
  modifier less (a share of an attack), never below 0: 0.15 less at CHA 16 or 17, 0.05 more at CHA
  8 or 9. Without Charisma the overlap is 0.2 for two mobs, 0.4 for three, 0.6 for four, at most
  0.75.
- **AC-CHA-006.2:** After a mob hits the character, it runs off × (1 + 0.1 × CHA modifier) as long:
  30% longer at CHA 16 or 17, 10% shorter at CHA 8 or 9.

---

### REQ-CHA-007: Inspire the others

**User Story:** As a charming player in the shared Wilds, I want to help the players near me, so
that we fight better together.

**Acceptance Criteria:**
- **AC-CHA-007.1:** When a mob hits a player, the guard after its stun is longer by the best
  inspire of the other players within 3 tiles of it: 0.1 s × CHA modifier (6 ticks), only for a
  modifier above 0. The bonuses do not add up.
- **AC-CHA-007.2:** A player does not inspire itself. A defeated player inspires nobody.

---

### REQ-CHA-008: Reputation

**User Story:** As a charming player, I want the people to know me, so that the town feels like
mine.

**Acceptance Criteria:**
- **AC-CHA-008.1:** With CHA 13 or more, each person of Thornwick greets the character once, by its
  name, when it comes within 2 tiles in the same place (both outside, or in the same building):
  for example "Evening, Lulu. Keep to the lamps." over Brann.
- **AC-CHA-008.2:** A guest (no name) gets no greeting. Nobody greets during the arrival or in a
  conversation with the person.

---

### REQ-CHA-009: What Charisma shows in the builder

**User Story:** As a player who makes a character, I want to see what Charisma gives, so that I
can choose my scores.

**Acceptance Criteria:**
- **AC-CHA-009.1:** Step 2 of the builder and the "You" section list "Prices" ("you pay 90%, you
  get 110%"), "A pack round you" ("its attacks overlap 5% less", or "normal"), "A mob after its
  hit" ("runs off 10% longer"), "Others near you" ("+0.1 s of guard after a hit", or "nothing"),
  "Persuasion" ("you win people over", or "from CHA 13") and "Reputation" ("people greet you by
  name", or "from CHA 13").

## Feature Behavior & Rules

- **The traits:** `PlayerTraits.buyShare`, `sellShare`, `presence`, `daunt` and `inspire`
  (`packages/engine/src/traits.ts`: `PRICE_PER_MOD`, `PRESENCE_PER_MOD`, `DAUNT_PER_MOD`,
  `INSPIRE_PER_MOD`, `INSPIRE_RANGE`).
- **Prices:** `dealPrice()` and `dealPay()` in `packages/engine/src/dialog.ts`; a sale is a deal
  with `goods: 'coins'` and `pay`, a room a deal with `goods: 'refuge'` and `refuge`. The page shows
  the price with `ConversationPanel.start(..., priceOf)` (`packages/engine-client/src/ui/conversation.ts`;
  `STRINGS.conversation.price` and `pay`); the answer texts of a world have no price in them.
- **The room:** `ROOM` in `worlds/wilds/src/dialogs.ts`; the refuge `inn` (`Refuge.given`: only a
  deal gives it, `refugeAt()` skips it) in `worlds/wilds/src/source.ts`; the bed `B` of the inn
  (`Interaction.restFor: 'inn'`) in `worlds/wilds/src/town.ts`. `Room.deal()` adds the refuge, and
  `Room.use()` rests only with it.
- **Presence and daunt:** `Horde.overlap()` and the retreat in `Horde.blow()`
  (`packages/engine/src/mobs.ts`), from `HordePlayer.traits`.
- **Inspire:** `inspireFor()` in `packages/engine/src/mobs.ts` sets `PlayerState.inspired` at a
  hit; `stepPlayer()` adds it to the guard when the stun ends. `inspired` is in `WireSelf`
  (protocol 16), so the prediction replays it.
- **Reputation:** `NpcDef.greeting` (`{name}` for the character's name), `greet()` in
  `packages/engine-client/src/game.ts` (`GREET_RANGE` 2 tiles, `REPUTATION_GATE` in
  `ui/gates.ts`), shown with the bubbles of NPC lines (`render/barks.ts`).
- **Persuasion:** `PERSUASION_GATE` (CHA 13) in `worlds/wilds/src/dialogs.ts`.
- **The debug panel** (`?debug`): the line `cha` gives the shares, the presence, the daunt, the
  inspire (and the `inspired` ticks now), and how many people greeted the player.
