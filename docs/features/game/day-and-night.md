# Day and Night

## Overview

The Wilds have a day (2026-10-13, Fede's request: "a cycle of day and night"). Before, the world
was always at night: one fixed darkness, with holes for the lights. Now the darkness falls at dusk
and lifts at dawn. One day and one night last 48 real minutes. The hour is the same for every
player, because each page takes it from the real clock. Noon is dim and overcast, so the dark style
of the art stays. The first version changed only the light (Fede's decisions, 2026-10-13); later the
same day the mobs, the NPCs, the music and the ambience, and the lamps and the windows followed the hour
too (REQ-DAY-004, Fede's choices for the to-do item "Things that follow the hour").

## Terminology

- **Day cycle**: the day of a world: its length in real time, and how dark its noon is. A world
  without a day cycle is always at night.
- **Hour**: the time of day, from 0 (midnight) to 24. A day has 24 hours, whatever its length.
- **Daylight**: how much of the day it is: 0 at night, 1 by day.
- **Darkness of the hour**: the share of the night's darkness at an hour: 1 at night, the share of
  noon by day.
- **Lights**: the torch of each player, the lamps, the lit windows, the candles, the lanterns of the
  companions and the short light of a spell: each one makes a hole in the darkness and a warm glow.

## Requirements

### REQ-DAY-001: The hours of a day

**User Story:** As a player, I want the night to end and to come back, so that the world feels alive
and the time goes on.

**Acceptance Criteria:**
- **AC-DAY-001.1:** One day and one night of the Wilds last 48 real minutes: one hour of the game
  is 2 real minutes.
- **AC-DAY-001.2:** The night is from 21:00 to 5:00 (16 real minutes). The full day is from 7:00
  to 19:00 (24 real minutes).
- **AC-DAY-001.3:** The dawn (5:00 to 7:00) and the dusk (19:00 to 21:00) change the light
  smoothly: from one second to the next, the darkness changes by less than 1% of the night's.
- **AC-DAY-001.4:** A world without a day cycle is always at night, as before.

---

### REQ-DAY-002: The same hour for every player

**User Story:** As a player of the shared world, I want to see the same hour as the players near
me, so that we share the day and the night.

**Acceptance Criteria:**
- **AC-DAY-002.1:** The hour comes from the real clock (milliseconds since 1970, UTC): two pages at
  the same moment show the same hour.
- **AC-DAY-002.2:** The hour does not depend on the server: a restart of the server, a lost
  connection or a world that the page runs alone (`?offline`) does not change it. The one exception is
  an admin who moves the hour (`docs/features/game/admin-tools.md`, REQ-ADM-002): then every page of
  the shared world adds the server's shift to its clock, until the admin gives the real clock back or
  the server restarts.
- **AC-DAY-002.3:** No message of the protocol carries the hour; only the shift of an admin goes on the
  wire (`hs`, protocol 49).

---

### REQ-DAY-003: The light of the hour

**User Story:** As a player, I want the day to be lighter and the night dark, so that I see the
change of the hour.

**Acceptance Criteria:**
- **AC-DAY-003.1:** At night, the darkness is that of the world (for the Wilds, full), as before.
- **AC-DAY-003.2:** By day, the darkness is a quarter of the night's: the world is dim and overcast,
  and its colours stay dark.
- **AC-DAY-003.3:** By day, the lights make no hole in the darkness and no glow. At dawn and at dusk
  they fade with the darkness: at 6:00 and at 20:00 they show at half.
- **AC-DAY-003.4:** The darkness of the hour and the eyes for the night of Wisdom (REQ-WIS-003)
  multiply: a wise character sees a lighter day as a lighter night.
- **AC-DAY-003.5:** What shows above the darkness (text in the world, the eyes of the mobs, the marks
  at the edge of the screen) does not change with the hour.

---

### REQ-DAY-004: Things that follow the hour

**User Story:** As a player, I want the world to live by the hour, so that the day and the night are
different to play and to hear, not only to see (Fede, 2026-10-13).

**Acceptance Criteria:**
- **AC-DAY-004.1:** For the mobs, the NPCs and the sound it is day from 6:00 to 20:00 (the middle of
  the dawn to the middle of the dusk, where the lights show at half: `isDaytime()`), and night from
  20:00 to 6:00. A world without a day cycle is always at night.
- **AC-DAY-004.2:** The server takes the hour from its own clock, with the same rule as the pages; no
  message carries the hour. A test server can fix it (`GAME_HOUR`).
- **AC-DAY-004.3:** The mobs: each area has its mobs by day and at night (`docs/features/game/combat.md`,
  REQ-CMB-010). In the forest of the tutorial the goblin patrols are there at night, and rare bandits
  that ambush by day (REQ-CMB-011); a new character on the road meets one patrol of goblins by day
  (REQ-CMB-012). In the wildlands the imps and the brutes are less frequent by day.
- **AC-DAY-004.4:** The NPCs: at night the people without a post go home and say no lines; they come
  out at dawn (`docs/features/npcs/night.md`).
- **AC-DAY-004.5:** The sound: from 6:00 to 20:00 the places sound by day, and at night each place plays
  a slower, softer form of its music; a stinger marks the dawn and the dusk
  (`docs/features/game/sound.md`, REQ-SND-009).
- **AC-DAY-004.6:** The lamps and the lit windows show unlit by day, lit at night, and at half at 6:00
  and 20:00, as their light. By day a lamp says another line: "A lamp, cold by day. Someone lights it at
  dusk." (`WorldDefinition.examineByDay`).

---

## Feature Behavior & Rules

- **The engine:** `packages/engine/src/daytime.ts`. `DayCycle` (`length` in real milliseconds,
  `noon` the share of the night's darkness at noon); `DAY_HOURS` (`dawn` 5, `day` 7, `dusk` 19,
  `night` 21); `hourOf(clock, cycle)`; `daylight(hour)` (a smoothstep at dawn and at dusk);
  `skyAt(hour, cycle)` gives the `Sky` (`hour`, `darkness`, `lights` = 1 − daylight); `NIGHT_SKY`. The
  engine never reads a clock: the caller gives it, so the server can use the same hour later.
- **The world:** `WorldDefinition.day` (optional). The Wilds (`worlds/wilds/src/index.ts`):
  `{ length: 48 * 60_000, noon: 0.25 }`, with `darkness` 1.
- **The page:** `skyNow()` in `packages/engine-client/src/game.ts` gives the sky of `Date.now()` each
  frame. `Lighting.update(view, lights, time, sky)`
  (`packages/engine-client/src/render/lighting.ts`): the alpha of the darkness is
  `ambientAlpha()` = `meta.lighting.ambientAlpha` (0.8) × `WorldDefinition.darkness` ×
  `PlayerTraits.night` × `sky.darkness`, at most 1; the alpha of each hole and each glow is its
  flicker × `sky.lights`.
- **The hour for the things that follow it:** `isDaytime(sky)` (`lights` ≤ 0.5), `skyAtClock(clock,
  cycle)`, `clockAtHour(hour, cycle)` (a fixed clock). The Room: `RoomOptions.day` and `clock`, `Room.sky`;
  each `tick()` sets `Horde.daytime` and `NpcCrowd.night`. The server (`startServer`) gives `Date.now`, or
  `ServerOptions.hour` (`GAME_HOUR`, refused in production). The page sets the same for a world that it
  runs, from `skyNow()` (so `?hour=` works there).
- **The mobs:** `MobRules.areaAt()` and `MobArea` (`docs/features/game/combat.md`, REQ-CMB-010 to
  REQ-CMB-012); the Wilds: `FOREST_MOBS` (goblins at night, bandits by day), `FIRST_GOBLINS` (one patrol
  by day for a new character), and `WILD_MOBS` (the imps and brutes of the wildlands: fewer by day).
- **The NPCs:** at night (20:00 to 6:00) the people without a post go home (`NpcDef.night`): the widow
  of Ironhold to the chapel, the villager of Whitegrove and the panner of Silverspring into their shut
  houses. They say no lines, and they come out at dawn. See `docs/features/npcs/night.md`.
- **The sound:** the music and the ambience follow the hour (`docs/features/game/sound.md`, REQ-SND-009):
  from 6:00 to 20:00 the places outside sound by day (birds, far voices in a town), and at night each
  place plays a slower, softer form of its music over crickets and owls; the stingers `dawn` and `dusk`
  mark the change.
- **The lamps and the windows:** by day the lamps and the lit windows show unlit: the atlas has an unlit
  frame for each (`wall/<walls>/window/unlit`, `fixture/lamppost/unlit`, `fixture/cart/unlit`,
  `fixture/cart-mended/unlit`), and the page draws the lit frame over it with the alpha of `sky.lights`
  (`render/unlit.ts`, `litAlpha()`). They are lit at night, unlit by day, and at half at 6:00 and 20:00,
  as the light holes are. Fires, forges, candles and braziers stay lit. By day a thing can have another
  line (`WorldDefinition.examineByDay`, in place of `examine`; the page reads it at `isDaytime(skyNow())`):
  the lamp of the Wilds.
- **Tests and switches:** `?hour=<0-24>` stops the hour (`?hour=12` noon, `?hour=0` midnight), for a
  screenshot. The debug panel's `sky` line gives the hour, the darkness and the lights ("12:00,
  darkness 0.25, lights 0.00 (?hour)"). Tests: `packages/engine/test/daytime.test.ts`,
  `worlds/wilds/test/daytime.test.ts`, `packages/engine-client/src/render/lighting.test.ts`,
  `packages/engine/test/ambush.test.ts`, `worlds/wilds/test/night.test.ts`,
  `packages/engine-client/src/render/unlit.test.ts`, and the tests of the director and the game sounds.
