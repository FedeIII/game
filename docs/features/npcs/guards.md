# Guards: NPCs That Fight

## Overview

A guard is an NPC that fights (story phase 5, 2026-10-11: the caravan of Silverspring, Fede's
decision that a robbery means a fight with its militia). A guard has the body of a player: the same
walk, collision, hits and defeat. It belongs to a group (its caravan) and walks a route. A guard with
a blow fights the attackers of its group and a character who robs it; a guard without a blow (the
wagon) never fights. A convoy walks a group of guards on a route and sends the attackers of the story
at them (`docs/features/game/quests.md`, REQ-QST-020).

## Terminology

- **Guard**: an NPC with the body of a player, a group and a route.
- **Group**: the guards of one convoy. Its **lead** is its first guard (the wagon).
- **Outlaw**: a character for whom the conditions of a convoy hold (it robs the convoy).
- **Mob of the story**: a mob of an ambush or of the attackers of a convoy.
- **Quarry**: a target that only the mobs of the story look for (a guard).

## Requirements

### REQ-GRD-001: A guard walks its route

**User Story:** As a player who meets a caravan, I want its wagon and its militia to travel the road
together, so that it looks like a caravan.

**Acceptance Criteria:**
- **AC-GRD-001.1:** A guard walks its route at the pace of a player (80 px/s), times its own share (the
  wagon: 0.55). At the end of its route, it stands.
- **AC-GRD-001.2:** A guard never walks more than a tile ahead of the lead of its group; behind it, it
  catches up.
- **AC-GRD-001.3:** The guards behind the lead walk 12 px to its sides, one on each side.
- **AC-GRD-001.4:** A guard of a group that stands (its convoy is attacked) does not walk.
- **AC-GRD-001.5:** A guard that talks (the wagon) stops while a character stands within 24 px of it,
  and faces it.

---

### REQ-GRD-002: A guard fights

**User Story:** As a player who defends a caravan, I want its militia to fight beside me, so that the
caravan is not a burden only.

**Acceptance Criteria:**
- **AC-GRD-002.1:** A guard with a blow goes for the nearest foe that it sees within 10 tiles: a mob of
  the story, or a mob that hunts a guard of its group, within 12 tiles of the lead; or an outlaw of its
  group. It does not go for the other beasts of the woods.
- **AC-GRD-002.2:** In reach, it swings as a player does (the page shows the swing); on a mob, the blow rolls as a player's blow
  (its attack bonus against the mob's AC); on an outlaw, d20 + its bonus against the outlaw's AC, and a
  hit stuns and hurts.
- **AC-GRD-002.3:** A militia of the caravan has 11 hit points, AC 16, and a spear: +3, 1d6+1 (5e: a
  guard). The wagon has 30 hit points and AC 11.
- **AC-GRD-002.4:** The mobs of the story hunt guards as they hunt players; another mob fights a guard
  only when the guard strikes it.

---

### REQ-GRD-003: A robber's blows

**User Story:** As a player who robs a caravan, I want my blows to hit its guards, and only then, so
that I never hurt them by accident.

**Acceptance Criteria:**
- **AC-GRD-003.1:** The blow of an outlaw of a group hits the guards of that group in its reach: d20 +
  the attack bonus against the guard's AC; a hit takes its damage. Its arrows hit them too.
- **AC-GRD-003.2:** The blow of any other character never touches a guard.
- **AC-GRD-003.3:** A guard whose hit points come to 0 falls, lies for 3 s, and then it is gone (dead).
  The world knows who brought it down.

---

## Feature Behavior & Rules

- **Guards** (`packages/engine/src/guards.ts`): `GuardDef` (`id`, `name`, `look`, `hp`, `ac`, `blow`,
  `speed`, `content`, `size`), `Guard` (`group`, `route`, `routeIndex`, `offset`, `halted`, `target`),
  `Guards` (`add()`, `remove()`, `ofGroup()`, `targets()`, `step()`, `strike()`, `arrived()`),
  `GuardEvent` (`fell`, `gone`, `by`), `GUARD_IDS` (2,000,000), `GUARD_SIGHT` (10 tiles), `GUARD_LEASH`
  (12 tiles), `GUARD_HOLD` (24 px), `KEEP_WITH_LEAD`.
- **The horde** (`packages/engine/src/mobs.ts`): `HordePlayer.quarry`, `Mob.story` (set by
  `spawnMembers()` of `ambushes.ts`).
- **Convoys** (`packages/engine/src/convoys.ts`): `ConvoyDef`, `ConvoyWave`, `Convoys` (`step()`,
  `anchors()`, `outlawOf()`), `CONVOY_AMBUSH_AHEAD`, `CONVOY_ROB_RADIUS`, `CONVOY_SIDE`;
  `WorldSource.convoys()`.
- **The Room**: `Room.guards`, `Room.convoys`; the guards step before the horde; an outlaw's blow goes to
  `Guards.strike()`; the snapshots carry the guards with the companions (`cp`, leader 0); the message
  `quest` with `guard` (protocol 31) for a guard that talks.
- **The page**: `localGuards`, `localConvoys` (a world that the page runs); `guardActors()`: a guard
  that talks is a target of the action button (`GuardDef.size`); the companion views draw the guards
  (`render/companions.ts`, with the name in Spanish: `tw()`).
- **The art**: the NPC look `wagon` (`packages/engine-client/art/wagon.ts`: a covered cart and two
  horses, `OTHER_LOOKS`); the militia use the NPC look `militia`.
- **Tests**: `packages/engine/test/guards.test.ts`, `packages/engine/test/convoys.test.ts`,
  `worlds/wilds/test/story.test.ts` (the caravan).
- **The swing**: a look that fights has attack frames (`FIGHTING_LOOKS` in `art/characters.ts`: the
  militia thrusts its glaive); the wire carries the attack ticks of companions and guards (protocol
  32), and `npcTextures()` uses the frames when the look has them.
- **Arrows**: a robber's arrows hit the guards that it robs (`Horde.arrowBodies`, `Horde.onArrowBody`,
  `Guards.bodies()`, `Guards.shot()`).
