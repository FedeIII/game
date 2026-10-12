# Sound

## Overview

The game has music and sound effects (Fede's request, 2026-10-12: "add support for music and sound
effects. Test it in the intro"). The same day Fede asked for a richer sound with identifiable
instruments: the music now plays on recordings of a real orchestra and choir (small MP3 samples, one
for every few notes of each instrument), which the page loads when a piece needs them. Some effects
and the ambiences are made in the page (Web Audio synthesis). The first use is the prologue: the
theme of Kandrax plays from its first scene to its end, each scene has its own ambience, and the
texts and the cards have small effects.

## Terminology

- **The context**: the one `AudioContext` of the page. All sound goes through it.
- **A track**: music that goes on until the engine stops it (`MusicTrack`): a score of sections.
- **An instrument**: a set of recorded samples of one instrument or section (the celli, a horn, the
  choir, a timpani). A note plays the sample nearest to it, tuned to it.
- **A sustained instrument**: strings, winds, brass, the choir, the organ. Each of its samples has a
  steady stretch (its loop) that holds a note as long as the music wants.
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
- **AC-SND-002.5:** Under the controls, a line credits the recordings: "Recordings: VS Chamber
  Orchestra 2 Community Edition (Versilian Studios, CC0); FluidR3 GM by Frank Wen (CC BY 3.0)."
  (Spanish: "Grabaciones: ...").

---

### REQ-SND-003: The sound of the prologue

**User Story:** As a new player, I want music and sounds under the scenes of the prologue, so that the
world of Kandrax feels alive.

**Acceptance Criteria:**
- **AC-SND-003.1:** The theme of Kandrax starts when the art of the prologue and the first instruments
  of the theme are loaded, and it fades in over 3 s. It is in D minor, at 66 beats a minute: four chords
  of eight beats (Dm, Bb, Gm, A: about 29 s a round). Its rounds: (0) contrabasses, celli, violas, a harp in eighths, and the timpani;
  (1) melody A on a French horn, an octave down (on an oboe in the next cycle), the violins on a high
  note, and a flute that answers the last bar; (2) melody B on the violins, a choir ("ah"; "oh" in the
  next cycle), a horn in the middle, the celli against the melody, a glockenspiel on each chord, and a
  timpani roll and a cymbal that swell into the next round; (3) the full orchestra: melody A an octave up
  on the violins and the flute, the horns a third under it, trombones, the choir, trumpets on the last
  chord, a cymbal, a bass drum and the timpani. Then rounds 1 to 3 go round.
- **AC-SND-003.2:** Each scene has an ambience, and the ambience crossfades (1.6 s) when the scene
  changes: the world at night: crickets and a soft wind; the ruins, the gods, the Central Dominions:
  wind; the wild lands: a strong wind; the map: a candle; the factory: a forge with anvils; the hut: a
  hearth and crickets.
- **AC-SND-003.3:** A card after the first one starts with a rush of air. A card with a title has a soft
  gong, a timpani and two glockenspiel notes (D and A) when the title shows. While a line types, a quill scratches (at most once for
  every three characters and every 55 ms, never on a space).
- **AC-SND-003.4:** A button with a speaker, at the top right next to "Skip", mutes and unmutes all the
  sound of the game (the same setting as "Mute all"). Its name for a screen reader is "Sound"
  ("Sonido"), and it is pressed when the sound is on. Its tooltip says "Sound on" or "Sound off".
- **AC-SND-003.5:** When the prologue ends by itself, the chord of D minor plays on the glockenspiel over
  a harp, the music fades out over 4 s and
  the ambience over 3 s. When the player skips it, a click plays, the music fades out over 1.4 s and the
  ambience over 1 s.

---

### REQ-SND-004: The recorded instruments

**User Story:** As a player on a phone, I want the music to sound like a real orchestra without a long
download or a slow game, so that it adds to the game and costs it little.

**Acceptance Criteria:**
- **AC-SND-004.1:** The page loads an instrument only when a track or an effect needs it, once. A track
  starts when its first instruments are ready; the others join it when they are ready.
- **AC-SND-004.2:** Every sample is a mono MP3 of 2.4 to 7 s (40 to 80 kbit/s). All the instruments
  together are less than 5 MB; the theme of Kandrax loads about 2.5 MB.
- **AC-SND-004.3:** Every note of a score is within 3 semitones of a recorded note of its instrument
  (3.5 for a plucked or struck instrument), so that no note sounds stretched.
- **AC-SND-004.4:** A held note longer than its sample sounds without a break or a click.

---

## Feature Behavior & Rules

- **The engine** (`packages/engine-client/src/audio/audio.ts`): `audio` (one `AudioEngine` for the
  page): `listen()` (the first action, and the page's visibility; `game.ts` calls it at the start),
  `resume()`, `playMusic(track, fade)`, `stopMusic(fade)`, `setAmbience(id | null, fade)`,
  `play(effect, delay)`, `settings`, `setSettings()`, `onSettings()`, `running`. A clock (every 100 ms)
  schedules the notes of the music and the events of the ambience 0.8 s ahead of the context's time.
- **The buses** (`makeBuses()`): music, with a hall reverb (3.2 s, 38 % wet: the recordings have a room
  of their own); effects, with a room reverb (1.7 s); ambience, dry. All go to a master gain (0 when
  muted) and a compressor (threshold -14 dB).
- **The samples** (`packages/engine-client/sounds/`, run by hand: `npm run sounds`, or `npm run sounds
  -- harp celli` for some instruments): `catalog.ts` names the recordings of each instrument (`INSTRUMENTS`:
  the folder of VSCO 2 CE or the FluidR3 instrument, the dynamic, the range, every how many semitones,
  the length, the loop, the MP3 rate) and the `CREDITS`; `build.ts` downloads them (cached in
  `SOUNDS_CACHE`, default `~/.cache/game-sounds`), mixes each one to mono, cuts it 12 ms before its onset
  (the first sample at 5 % of its peak), measures its pitch (`pitch.ts`, YIN: the file names of a library
  do not all use the same octaves; a glockenspiel goes by its name, the timpani have no note), evens out
  the level of a sustain's loop, and encodes it (`wasm-media-encoders`, LAME). It writes
  `src/generated/sounds/<instrument>-<n>.mp3` and `src/generated/sounds.json` (the root, the onset, the
  loop and the length of each sample). Both are in git.
- **The bank** (`samples.ts`): `SampleBank` (`load()`, `get()`, `ready()`); `audio.bank`;
  `audio.preload(ids)`. It decodes an instrument in an `OfflineAudioContext` at the rate of its files
  (22.05, 32 or 44.1 kHz: less memory than the device's rate). An MP3 decoder leaves the encoder's delay
  (1105 samples) before the sound, or not: `decoderDelay()` finds it from the onsets. `pickSample()`: the
  nearest root, a round robin at random.
- **The sampler** (`sampler.ts`): `playNote()` (velocity, attack, release, cut, pan, detune). A held
  note longer than its sample is held by copies of its loop: each copy starts a crossfade (at most 0.5 s,
  equal power) before the last one ends (`holdSegments()`).
- **The scores** (`music.ts`): `scoreTrack(id, instruments, next, first)`: sections (`bpm`, `beats`,
  `notes`), humanized (up to 12 ms early or late, 3 ms for drums; ±4 % velocity). The notation: `line()`
  ("A4:2 F4 G4:1 r:1", "D3+F3:8", ">" for an accent), `chord()`, `hits()`. Each instrument has a level
  (`LEVELS`) and a seat (`SEATING`: violins to the left, celli and basses to the right, the harp far
  left).
- **The theme** (`themes/kandrax.ts`): `KANDRAX_THEME`, `THEME_CHORDS`, `MELODY_A`, `MELODY_B`,
  `themeNotes(round)`, `themeRound()`, `THEME_FIRST`. The horn was recorded up to C4 and from D5: its
  melodies are an octave down.
- **The synthesized sounds** (`synth.ts`): `pluck`, `bell` (FM), `boom`, `anvil`, `noiseHit`, `whoosh`;
  `reverbBuffer()`, `noiseBuffer()`, `brownBuffer()`. `notes.ts`: `midi('D4')`, `hz('D4')`. The sounds
  (`sounds.ts`): `EFFECTS` (`whoosh`, `title`, `tick`, `click`, `end`; `title` and `end` play on the
  recorded instruments of `EFFECT_INSTRUMENTS` when they are loaded, else synthesized), `AMBIENCES`
  (`night`, `wind`, `gale`, `candle`, `forge`, `hearth`), `playEffect()`, `startAmbience()`.
- **The cost**, measured on this server in headless Chrome (an offline render that schedules as the page
  does): the fullest round of the theme takes about 20 % of one core, the reverb 9 % of it. The theme's
  20 instruments take about 48 MB of memory decoded.
- **The settings** (`settings.ts`): `SoundSettings`, `DEFAULT_SOUND`, localStorage `game.audio.v1`,
  `parseSound()` (each value checked). The section: `ui/sound-section.ts` (`.settings-sound`); the texts:
  `STRINGS.sound`, and `STRINGS.prologue.soundOn` and `soundOff`.
- **The prologue**: each scene names its ambience (`AMBIENCE_OF` in `art/prologue.ts`, carried in
  `prologue.json`); `ui/prologue.ts` loads the first instruments with its art, and plays the theme, the
  ambiences and the effects (`.prologue-sound`).
- **iPhone and iPad**: Web Audio follows the silent switch of the device. With the switch on, the game
  is silent. This is on purpose.
- **Tests**: `audio/audio.test.ts` (notes, the notation, the choice of a sample, the copies of a loop,
  the decoder's delay, the manifest, the bars of the theme, every note near a recorded note, the rounds,
  the settings). `renderOffline()` renders a track and an ambience in an `OfflineAudioContext`, to
  measure the levels in a browser.
