# Day and Night

## Overview

The Wilds have a day (2026-10-13, Fede's request: "a cycle of day and night"). Before, the world
was always at night: one fixed darkness, with holes for the lights. Now the darkness falls at dusk
and lifts at dawn. One day and one night last 48 real minutes. The hour is the same for every
player, because each page takes it from the real clock. Noon is dim and overcast, so the dark style
of the art stays. In this first version only the light changes (Fede's decisions, 2026-10-13).

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
  connection or a world that the page runs alone (`?offline`) does not change it.
- **AC-DAY-002.3:** No message of the protocol carries the hour.

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
- **Not now:** the mobs, the NPCs, the music and the ambience do not follow the hour. The art of a
  lit window and of a lamp does not change by day; only their light goes.
- **Tests and switches:** `?hour=<0-24>` stops the hour (`?hour=12` noon, `?hour=0` midnight), for a
  screenshot. The debug panel's `sky` line gives the hour, the darkness and the lights ("12:00,
  darkness 0.25, lights 0.00 (?hour)"). Tests: `packages/engine/test/daytime.test.ts`,
  `worlds/wilds/test/daytime.test.ts`, `packages/engine-client/src/render/lighting.test.ts`.
