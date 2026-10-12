# Sound

## Overview

The game has music and sound effects (Fede's request, 2026-10-12: "add support for music and sound
effects. Test it in the intro"). The page makes all of its sound itself, with the Web Audio API: there
are no sound files to download. The first use is the prologue: the theme of Kandrax plays from its
first scene to its end, each scene has its own ambience, and the texts and the cards have small
effects. The world of the game has no sound yet.

## Terminology

- **The context**: the one `AudioContext` of the page. All sound goes through it.
- **A track**: music that goes on until the engine stops it (`MusicTrack`).
- **An effect**: a sound that plays once (`EffectId`).
- **An ambience**: a sound that loops under a place or a scene: wind, a fire, a forge (`AmbienceId`).
- **To sleep**: the context is suspended. Nothing sounds and the device does no audio work. When it
  wakes, the music goes on where it stopped.

## Requirements

### REQ-SND-001: When the sound starts and stops

**User Story:** As a player, I want the sound to start only after I act, and to stop when I leave the
page, so that the game never surprises me with noise.

**Acceptance Criteria:**
- **AC-SND-001.1:** No sound plays before the first click, touch or key on the page. Music or an
  ambience that the game asks for before then starts at that first action. An effect asked for before
  then does not play.
- **AC-SND-001.2:** When the page is hidden (another tab, another app), the context sleeps. When the
  page shows again, the sound goes on where it was.
- **AC-SND-001.3:** When the sound is muted, the context sleeps 0.25 s after the mute (the sound fades
  out first). When it is not muted again, the sound goes on.

---

### REQ-SND-002: The settings

**User Story:** As a player, I want to set the music and the effects apart, or to mute all, so that the
game sounds as I like.

**Acceptance Criteria:**
- **AC-SND-002.1:** The settings panel has a section "Sound" (Spanish: "Sonido") with a slider "Music"
  ("Música") and a slider "Effects" ("Efectos"), from 0 to 100 % in steps of 5, and a box "Mute all"
  ("Silenciar todo").
- **AC-SND-002.2:** The defaults are music 60 %, effects 80 %, not muted. The effects slider also sets
  the ambiences (at 90 % of its value).
- **AC-SND-002.3:** A change applies at once. The browser keeps the settings for the next visit.
- **AC-SND-002.4:** When the sound is muted, the two sliders are disabled. A control that shows the
  settings (the box, the sliders, the button of the prologue) follows a change made with another one.

---

### REQ-SND-003: The sound of the prologue

**User Story:** As a new player, I want music and sounds under the scenes of the prologue, so that the
world of Kandrax feels alive.

**Acceptance Criteria:**
- **AC-SND-003.1:** The theme of Kandrax starts when the art of the prologue is loaded and fades in over
  3 s. It is in D minor, at 64 beats a minute: four chords of eight beats (Dm, Bb, Gm, A: 30 s a round).
  The first round has a drone, pads, a harp and a bass. The next rounds add a flute melody and bells,
  then a choir and a second melody, then the first melody an octave higher, and then they go round.
- **AC-SND-003.2:** Each scene has an ambience, and the ambience crossfades (1.6 s) when the scene
  changes: the world at night: crickets and a soft wind; the ruins, the gods, the Central Dominions:
  wind; the wild lands: a strong wind; the map: a candle; the factory: a forge with anvils; the hut: a
  hearth and crickets.
- **AC-SND-003.3:** A card after the first one starts with a rush of air. A card with a title has a deep
  drum and two bells when the title shows. While a line types, a quill scratches (at most once for
  every three characters and every 55 ms, never on a space).
- **AC-SND-003.4:** A button with a speaker, at the top right next to "Skip", mutes and unmutes all the
  sound of the game (the same setting as "Mute all"). Its name for a screen reader is "Sound"
  ("Sonido"), and it is pressed when the sound is on. Its tooltip says "Sound on" or "Sound off".
- **AC-SND-003.5:** When the prologue ends by itself, three bells play, the music fades out over 4 s and
  the ambience over 3 s. When the player skips it, a click plays, the music fades out over 1.4 s and the
  ambience over 1 s.

---

## Feature Behavior & Rules

- **The engine** (`packages/engine-client/src/audio/audio.ts`): `audio` (one `AudioEngine` for the
  page): `listen()` (the first action, and the page's visibility; `game.ts` calls it at the start),
  `resume()`, `playMusic(track, fade)`, `stopMusic(fade)`, `setAmbience(id | null, fade)`,
  `play(effect, delay)`, `settings`, `setSettings()`, `onSettings()`, `running`. A clock (every 100 ms)
  schedules the notes of the music and the events of the ambience 0.8 s ahead of the context's time.
- **The buses** (`makeBuses()`): music, with a hall reverb (3.2 s); effects, with a room reverb (1.7 s);
  ambience, dry. All go to a master gain (0 when muted) and a compressor (threshold -14 dB). The hall
  is not longer because each second of reverb costs a phone more work.
- **The instruments** (`synth.ts`): `pluck` (a Karplus-Strong string, made once for each pitch),
  `pad`, `flute`, `choir`, `bell` (FM), `boom`, `anvil`, `noiseHit`, `whoosh`; `reverbBuffer()`,
  `noiseBuffer()`, `brownBuffer()`. `notes.ts`: `hz('D4')`.
- **The music** (`music.ts`): `KANDRAX_THEME`, `THEME_CHORDS`, `THEME_MELODIES`, `themeRound()`. The
  sounds (`sounds.ts`): `EFFECTS` (`whoosh`, `title`, `tick`, `click`, `end`), `AMBIENCES` (`night`,
  `wind`, `gale`, `candle`, `forge`, `hearth`), `playEffect()`, `startAmbience()`.
- **The settings** (`settings.ts`): `SoundSettings`, `DEFAULT_SOUND`, localStorage `game.audio.v1`,
  `parseSound()` (each value checked). The section: `ui/sound-section.ts` (`.settings-sound`); the texts:
  `STRINGS.sound`, and `STRINGS.prologue.soundOn` and `soundOff`.
- **The prologue**: each scene names its ambience (`AMBIENCE_OF` in `art/prologue.ts`, carried in
  `prologue.json`); `ui/prologue.ts` plays the theme, the ambiences and the effects (`.prologue-sound`).
- **iPhone and iPad**: Web Audio follows the silent switch of the device. With the switch on, the game
  is silent. This is on purpose.
- **Tests**: `audio/audio.test.ts` (notes, settings, the pitch of a pluck, the bars of the theme, the
  rounds). `renderOffline()` renders a track and an ambience in an `OfflineAudioContext`, to measure
  the levels in a browser.
