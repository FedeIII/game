# Equipment (draft)

> **Draft** · promotes to `docs/features/items/equipment.md` when built · **Status:** Phase 1
> built 2026-10-11 (protocol 19; `docs/features/items/equipment.md`); phases 2 to 4 planned

A character wears items in the slots of D&D 5e: armour, a shield, a weapon, an amulet, rings. The
story needs it: the first adventure gives a splint armour and a hobgoblin's luck amulet
(`docs/drafts/story-razed-villages.md`). Fede asked for the equipment before the story
(2026-10-11).

## Fede's decisions (2026-10-11)

1. **The slots of D&D 5e.**
2. **Armour Class (AC) gives glancing blows** (below). No dice.
3. **Weapons: a mix of the class damage and the 5e dice**, with a balance of the classes that
   makes sense (below).
4. **Each character starts with the 5e kit of its class** (SRD 5.1, the worn part). Characters
   that exist get it too.

## The slots

The DMG ("Wearing and Wielding Items") gives one suit of armour, one headwear, one cloak, one pair
of bracers, one pair of gloves and one pair of footwear. A weapon and a shield are in the hands.
The amulet, the belt and the rings follow the usual use (5e gives no number for rings; two, as in
Baldur's Gate 3). Twelve slots:

| Slot | Holds |
|---|---|
| Head | a helmet, a hat, a circlet |
| Neck | an amulet |
| Cloak | a cloak |
| Armour | a suit of armour |
| Bracers | bracers |
| Gloves | gloves or gauntlets |
| Belt | a belt |
| Feet | boots |
| Ring (left), Ring (right) | a ring |
| Main hand | a weapon, or a spellcasting focus |
| Off hand | a shield, or a light weapon |

- A two-handed weapon holds both hands: the off hand stays empty.
- **Attunement** (5e): at most 3 worn items that need attunement.
- **Proficiency** (5e, SRD): a class uses only the armour, the shield and the weapons of its
  proficiencies. The pack panel says why it cannot use an item.
- A worn item uses no slot of the pack. A defeat does not take it.

## Armour Class and glancing blows

AC as in 5e:

- No armour: 10 + DEX mod. A barbarian: 10 + DEX + CON. A monk without a shield: 10 + DEX + WIS.
- Light armour: its AC + DEX mod. Medium: its AC + DEX mod, at most +2. Heavy: its AC.
- A shield: +2. A magic item: its bonus.

**Glancing blows:** each AC point over 10 turns 5% of the mob hits into glancing blows: no
damage, no stun, no poison. The order is fixed, not random: each hit adds the share to a count,
and the hit that brings the count to 1 glances (the count then drops by 1). AC 15 makes every 4th
hit glance, AC 18 2 hits in 5. A glance shows a white spark on the player.

Heavy armour needs Strength (chain mail STR 13, splint and plate STR 15): below it, the character
walks at 3/4 of its speed (5e: 10 ft less). Noisy armour (5e: disadvantage on Stealth: scale
mail, chain mail, splint, plate): while the character sneaks, mobs see it from 3/4 of their sight,
not from 1/2.

## Damage and the weapons

**Damage = base + the mod of the attack ability (Option B: the class decides) + a magic bonus,**
at least 1. Today every class has the base 4. The base now comes from what is in the main hand:

- **A weapon:** the 5e die gives the base: d4 2, d6 3, d8 4, d10 5, d12 6, 2d6 6. A versatile
  weapon with an empty off hand uses its two-handed die (a longsword d10: 5).
- **A light weapon** (dagger, shortsword) attacks 2 ticks quicker; **a heavy melee weapon**
  (greataxe) 4 ticks slower. The shortest time between attacks stays as it is.
- **A bow:** the attacks are arrows (today only the ranger's), range 5 + DEX mod tiles, for any
  class that holds one.
- **No weapon:** an unarmed strike, base 1. **A monk**: martial arts, base 3, quick as a light
  weapon.
- **A spellcaster** (druid, sorcerer, warlock, wizard) with an empty main hand or its focus
  attacks with its cantrip: fire bolt or eldritch blast (d10) base 5; a druid's produce flame (d8)
  base 4. The focus adds its magic bonus.
- **A rogue: sneak attack**, +3 (1d6) on a mob that does not hunt the rogue (it hunts another
  player, or it did not see the rogue).
- The opening of INT stays as it is.

The balance of the kits (the main score 17, mod +3; DEX 14 where it is not the main score, and
CON or WIS 14 for the defence of the barbarian and the monk; the tests check this table):

| Class | Kit (worn) | AC | Damage | Speed of attacks |
|---|---|---|---|---|
| Barbarian | greataxe | 10 + DEX + CON: 14 | 9 | 4 ticks slower |
| Bard | rapier, leather armour | 11 + DEX: 13 | 6 (DEX 14) | as now |
| Cleric | mace, shield, scale mail | 14 + DEX (≤ 2) + 2: 18 | 6 | as now |
| Druid | druid staff, shield, leather armour | 11 + DEX + 2: 15 | 7 (produce flame) | as now |
| Fighter | longsword, shield, chain mail | 18 | 7 | as now |
| Monk | nothing (martial arts) | 10 + DEX + WIS: 15 | 6 | 2 ticks quicker |
| Paladin | longsword, shield, chain mail | 18 | 7 | as now |
| Ranger | longbow, leather armour | 11 + DEX: 14 | 7 (arrows) | as now |
| Rogue | shortsword, leather armour | 11 + DEX: 14 | 6, 9 with sneak attack | 2 ticks quicker |
| Sorcerer | nothing (spells from the hands) | 10 + DEX: 12 | 8 (fire bolt) | as now |
| Warlock | leather armour | 11 + DEX: 13 | 8 (eldritch blast) | as now |
| Wizard | arcane staff | 10 + DEX: 12 | 8 (fire bolt) | as now |

A fighter with STR under 13 gets the other 5e kit: leather armour and a longbow. The kits put
nothing into the pack (the daggers, packs and tools of 5e stay out: the pack is small).

## The items

New kinds (stack 1), each with an icon and a line of the world:

- Armour: leather armour (light, AC 11), scale mail (medium, AC 14, noisy), chain mail (heavy,
  AC 16, STR 13, noisy), splint armour (heavy, AC 17, STR 15, noisy). A shield (+2).
- Weapons: longsword (d8, versatile d10), shortsword (d6, light), rapier (d8), greataxe (d12,
  heavy, two-handed), mace (d6), longbow (d8, two-handed, arrows). An arcane staff (the focus of a
  sorcerer, a warlock or a wizard) and a druid staff (the focus of a druid); for other classes
  they are quarterstaffs (d6, versatile d8).
- The luck amulet (neck, needs attunement): +1 to each score for every gate (5e: a stone of good
  luck, +1 to ability checks).
- The silver ring of the chests goes on a finger. It does nothing.

## Phases

1. **The gear** (one deploy; built 2026-10-11): the slots and the rules (`packages/engine/src/gear.ts`), the kits,
   AC and the glancing blows, the damage and the speed of attacks, the store (column `gear`),
   protocol 19 (the gear in the welcome and the snapshot; `move` and `put` take a worn slot too;
   the glance in `WireSelf`), the worn slots in the pack panel round a picture of the character,
   the icons, AC in the "You" section.
2. **The look follows the hands**: the weapon and the shield on the figure come from the gear, for
   the player and for the others, and in the menu.
3. **The smith of Thornwick** sells armour, shields and weapons, and buys them back. Plate and
   studded leather come then.
4. Later: the look of the armour and the helmet, magic items (+1 weapons, a cloak of protection),
   reach weapons, ammunition.
