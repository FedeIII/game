# Sound

## Overview

The game has music and sound effects (Fede's request, 2026-10-12: "add support for music and sound
effects. Test it in the intro"). The same day Fede asked for a richer sound with identifiable
instruments, for sound in the whole game, and for music that follows the events: "hasty on
confrontations, dangerous on tense situations, awe-provoking on new areas or revelations". The music
now plays on recordings of a real orchestra and choir (small MP3 samples, one
for every few notes of each instrument), which the page loads when a piece needs them. Some effects
and the ambiences are made in the page (Web Audio synthesis). In the prologue, the theme of Kandrax
plays from its first scene to its end, each scene has its own ambience, and the texts and the cards
have small effects. In the game, a director chooses the music from what happens: the place, a hunt,
a fight, a dream, a defeat, a discovery, a quest.

## Terminology

- **The context**: the one `AudioContext` of the page. All sound goes through it.
- **A track**: music that goes on until the engine stops it (`MusicTrack`): a score of sections.
- **An instrument**: a set of recorded samples of one instrument or section (the celli, a horn, the
  choir, a timpani). A note plays the sample nearest to it, tuned to it.
- **A sustained instrument**: strings, winds, brass, the choir, the organ. Each of its samples has a
  steady stretch (its loop) that holds a note as long as the music wants.
- **An effect**: a sound that plays once (`EffectId`).
- **An ambience**: a sound that loops under a place or a scene: wind, a fire, a forge (`AmbienceId`).
- **A mood**: what the music of the game expresses now: a place's (wilds, town, haven, home, chapel,
  ruins, camp, shrine), or tension, combat, battle, dream, silent. Each mood has a track.
- **A stinger**: a short piece for a moment (a discovery, a quest, a victory, a defeat, the dawn, the
  dusk), over the music.
- **A night form**: the music of a place at night: the same piece, slower, softer and on fewer
  instruments (2026-10-13).
- **A sound area**: a part of the world with a mood of its own (`SoundArea`).
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
  ("Silenciar todo"). The settings of the menu before the game have the same section (2026-10-13).
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
- **AC-SND-003.6:** The prologue plays the theme in two parts (Fede, 2026-10-13). After "Create", the
  opening is already playing (the music of the menu, REQ-SND-008): the prologue goes on with it. The opening (rounds 0
  and 1) goes round while the player reads, as long as it takes: round 1 with the horn, round 1 with the
  oboe, round 0, and again (each round ends on A, which leads back to D). When the card of the gods
  starts, the rise (round 2: the choir and the violins; then round 3 and the rounds after it) comes in:
  on the next chord of the opening if it is within 2.5 s, else on its next beat, with a crossfade of
  2 s; at once if no music plays yet. A player who goes fast hears the rise at that card all the same.
  Its first instruments load with the prologue, and the instruments of the rise and of the coda stay
  loaded until the prologue ends, however long the player reads.
- **AC-SND-003.7:** The last card (the hut) has calmer music (Fede, 2026-10-13): the coda of the theme
  (`KANDRAX_CODA`), at the same tempo and on the same chords. A clarinet sings melody A as written, over
  soft contrabasses, celli and violas, and a harp with one note on each beat (half the motion of the
  theme); the next round has no clarinet (a breath); and again, as long as the player reads. It comes in
  as the rise does (on the next chord within 2.5 s, else on the next beat), with a crossfade of 3 s, and
  a change that still waits for its beat (the rise of a player who goes fast) gives way to it. Its level
  is about 3 dB under the first round of the opening and 8 dB under the full orchestra. Its instruments
  load with the prologue.
- **AC-SND-003.2:** Each scene has an ambience, and the ambience crossfades (1.6 s) when the scene
  changes: the world at night: crickets and a soft wind; the ruins, the gods, the Central Dominions:
  wind; the wild lands: a strong wind; the map: a candle; the factory: a forge with anvils; the hut: a
  hearth and crickets.
- **AC-SND-003.3:** A card after the first one starts with a rush of air. A card with a title has a soft
  gong, a timpani and two glockenspiel notes (D and A) when the title shows. While a line types, a quill scratches (at most once for
  every three characters and every 55 ms, never on a space).
- **AC-SND-003.4:** A button with a speaker, at the top right next to "Skip", mutes and unmutes all the
  sound of the game (the same setting as "Mute all"). The menu before the game has the same button. Its name for a screen reader is "Sound"
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

### REQ-SND-005: The music follows the game

**User Story:** As a player, I want the music to tell me what happens: calm or sad in the places,
tense when I am hunted, fast in a fight, full of awe in a new place, so that the world reacts to me.

**Acceptance Criteria:**
- **AC-SND-005.1:** The music has a mood, the first of these that holds: a dream; the player down
  (no music, after the stinger of the defeat); a battle (a fight with the Shrine Warden or the Hobgoblin
  Devastator: it holds until the fight is over); a fight; a hunt; else the mood of the place.
- **AC-SND-005.2:** A fight begins at once (the music cuts to it in 0.3 s, on a cymbal and the drums) when
  a mob within 8 tiles winds up, strikes or reels, a mob chases the player within 3 tiles, or the player
  strikes, is hit or kills; it holds 6 s after the last of these.
- **AC-SND-005.3:** A hunt: mobs hunt the player (those that it senses, or sees on the screen) for 1.2 s;
  the tension holds 6 s after the last hunter. It fades in over 2 s.
- **AC-SND-005.4:** The places of the Wilds: the home (inside it) and the Wren homestead: a lullaby;
  the chapel (inside it): an organ and voices; Ironhold: a folk dance; Silverspring: a bright tune in D
  major; the burned homesteads: a lament; the camps of the war band and of the Seekers: low drums and
  trembling strings; the shrine of Tigris: an organ, voices, bells and a gong; the rest of the Wilds:
  slow pieces with a soloist, and silences of 30 to 70 s between them. The area of a town, a camp or the
  shrine reaches a few tiles past it. The music changes when the player has been in a new place for
  1.5 s, over about 3 s.
- **AC-SND-005.5:** Stingers, over the music (which steps back to 30 % under them): the first visit of a
  character to a place (all the places but the home): awe; a quest that starts, moves on or ends; a
  fight won (with kills, and no hunter left); a defeat; a refuge found; a rest in a bed. At most one in
  3.5 s, unless the new one matters more (defeat, quest end, discovery, quest start, quest step,
  victory, refuge, rest).
- **AC-SND-005.6:** The place where the game starts is not a discovery. The browser keeps the places
  that each character has seen.
- **AC-SND-005.7:** While the prologue plays from the game menu, it has the music; after it, the game's
  music comes back.

---

### REQ-SND-006: The sounds of the game

**User Story:** As a player, I want to hear what I do and what I meet, so that the world feels real and
a fight tells me what happens in it.

**Acceptance Criteria:**
- **AC-SND-006.1:** The player's attack sounds as its weapon: a swing (a heavier one with a weapon in
  both hands, a light one with the fists), a bow, or a cantrip. A blow that lands sounds on flesh, or on
  armour (a hobgoblin, the Shrine Warden, the Hobgoblin Devastator); a critical hit is louder, with a
  crack; a miss makes no sound of a hit.
- **AC-SND-006.2:** A hit on the player sounds as a dull blow, with a ringing in the ears; a blow that
  glances off its armour rings on metal; a dodge is a rush of air and a landing; a defeat is a fall.
- **AC-SND-006.3:** The mobs have voices: imps and goblins chitter, brutes, hobgoblins and bugbears
  growl, worgs and hounds bark and snarl, watchers whisper, the Seekers shout, the Warden and the
  Devastator roar. A mob calls when it spots the player (at most once in 8 s), gathers itself before a
  blow, cries when it is hurt, and when it dies (and its body falls). It is heard up to 16 tiles away,
  from its side, softer when it is further; at most once in 0.9 s, and at most three voices at once.
  A mob's swing sounds too; its arrows twang and land; a cinder adept's fire bolt crackles.
- **AC-SND-006.4:** The player's steps sound on the ground under it: grass, earth, sand, stone, wood,
  a floor of packed earth, shallow water. A step every 20 pixels walked; softer when it sneaks.
- **AC-SND-006.5:** Doors open with a creak, close with a thud, rattle when they are locked, hold or break
  when they are barred. A chest opens with a creak (a lock is picked first, when it has one); a locked
  one rattles a chain; herbs rustle; a buried cache is dug up. Coins clink; an item is picked up or
  dropped; gear is put on with a clink of metal; a stack moves in the pack with a rustle. A draught is
  drunk (bubbles, two gulps), herbs are chewed, and healing has a soft chime. A deal pays in coins.
- **AC-SND-006.6:** The GUI: a panel opens with a rustle (the journal and the map with a page); a button
  clicks; a conversation opens with a rustle, an answer clicks, and a selection moved with the keys ticks.
- **AC-SND-006.7:** The effects follow the "Effects" slider and the mute.

---

### REQ-SND-007: The sound of the places

**User Story:** As a player, I want each place to sound like itself, so that I know where I am with my
eyes closed.

**Acceptance Criteria:**
- **AC-SND-007.1:** Each mood of a place has an ambience: the Wilds a forest (a soft wind and leaves in
  the gusts); a town a light wind; Silverspring a river and chimes in the wind; the home a hearth; the
  chapel a candle; the ruins a strong wind and embers; the camps their fires; the shrine a low hum and a
  far bell. The hour adds to it (REQ-SND-009). Inside any other building, the hum of a room and a
  creaking board, at any hour. It changes over 2.5 s.
- **AC-SND-007.2:** Near the player, these sound from their side and louder as it comes near: water (a
  lake, a river) within 9 tiles; a fire (a campfire, a brand, a cauldron) within 9 tiles; a fountain
  within 11; a forge or an anvil within 13. Through a wall, at a third.
- **AC-SND-007.3:** While the prologue plays from the game menu, the game's ambience and its nearby
  sounds are silent; after it, they come back.

---

### REQ-SND-008: The sound of the menus

**User Story:** As a visitor, I want music in the menu before the game and sounds in the menus, so that
the game sounds the same from its first screen.

**Acceptance Criteria (Fede, 2026-10-13):**
- **AC-SND-008.1:** The menu before the game plays the opening of the theme of Kandrax (AC-SND-003.6),
  with a fade in of 3 s, from the first click, touch or key of the page. It loads only the 10
  instruments of the opening (about 1.6 MB), not the whole orchestra.
- **AC-SND-008.2:** The menu before the game clicks for a button, a link, a chip or a box that the visitor
  presses (with a pointer or a key), ticks when the arrow keys move a choice, and rustles for a new screen.
- **AC-SND-008.3:** The game menu (Escape) rustles when it opens and closes, and the music steps back to
  40 % while it is open (see [`game-menu.md`](game-menu.md), REQ-GMN-004).

---

### REQ-SND-009: The sound of the hour

**User Story:** As a player, I want to hear the day and the night, so that the hour of the world is
not only a light.

**Acceptance Criteria (Fede's choice, 2026-10-13: "all three"):**
- **AC-SND-009.1:** The day and the night are those of the mobs and the NPCs: day from 6:00 to 20:00,
  where the lights of the world show at half (`isDaytime()`, see [`day-and-night.md`](day-and-night.md)).
  A world without a day is always at night.
- **AC-SND-009.2:** The places outside have an ambience by day and one at night:
  - the Wilds: by day birds (a warble, a call of two falling notes, a trill), a woodpecker far off and
    a crow now and then; at night crickets, owls and a far howl. No crickets or owls by day, and no
    birds at night;
  - a town: by day a far forge, far voices of people (a phrase of a few syllables now and then, a laugh
    seldom), a dog and birds now and then; at night soft crickets, an owl and a dog now and then, and
    no forge or voices;
  - Silverspring: by day birds; at night fewer chimes, crickets and an owl now and then;
  - the home: by day the hearth and a bird outside now and then; at night the hearth and crickets;
  - the ruins: by day crows; the camps: at night crickets; the shrine: at night soft crickets.
  The chapel and the other rooms sound the same at any hour.
- **AC-SND-009.3:** The far sounds of the day (voices, a dog, crows) are soft and muffled. The day
  ambience of the Wilds is within 1 dB of the night's; a town by day is about 3 dB busier than at night.
- **AC-SND-009.4:** At night the music of each place plays its night form: the same piece, slower
  (84 % to 90 % of its tempo), softer (80 % to 92 % of the loudness of each note), and on fewer
  instruments: the Wilds without the high violins, the timpani, the flute and the oboe, with the darker
  soloists (the clarinet, the solo violin, the celli) and two or three sections of silence after a
  piece; Ironhold without the tambourine and the flute, a softer drum, and a silence after every two
  sections; Silverspring without the oboe and the glockenspiel; the home without the solo violin; the
  chapel with softer voices; the ruins without the solo violin; the camps without the trombone and the
  cymbal, with softer drums; the shrine without the glockenspiel, with softer bells and gong. The night
  forms are 3 to 5 dB under the day forms. The music of a hunt, a fight, a dream and a defeat does not
  change.
- **AC-SND-009.5:** When the night ends or comes, the two forms of the music crossfade over 10 s, and the
  two ambiences over 12 s (a change of place: 2.5 s and the fade of its mood).
- **AC-SND-009.6:** When the night ends (6:00), the dawn plays: a horn calls over soft strings in D
  major, the violins rise, a harp runs up and a glockenspiel catches the first light (about 7 s). When the
  night comes (20:00), the dusk plays: the celli and the basses sink from D minor to B flat under the
  violas and soft voices, and a low harp note (8 s). They play over the music of a place only (not in a
  hunt, a fight, a dream or a defeat), never when the page starts, and they are softer than a quest's
  stinger (about the level of the refuge and the rest). A stinger of the game that matters more wins over
  them. Their instruments load 0.75 hour of the game (90 s) before their moment.
- **AC-SND-009.7:** The debug panel's line `music` says "by day" or "by night", the track (a night form
  is `<place>-night`) and the ambience.

---

## Feature Behavior & Rules

- **The engine** (`packages/engine-client/src/audio/audio.ts`): `audio` (one `AudioEngine` for the
  page): `listen()` (the first action, and the page's visibility; `game.ts` calls it at the start),
  `resume()`, `playMusic(track, fade)`, `stopMusic(fade)`, `setAmbience(id | null, fade)`,
  `play(effect, delay)`, `settings`, `setSettings()`, `onSettings()`, `running`, `hold(ids)` (instruments
  that stay loaded until the returned function is called; `kept`: what the sweep keeps),
  `hushMusic(on)` (the music bus at `HUSHED`, 0.4, under a menu). A clock (every 100 ms)
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
  `themeNotes(round)`, `themeRound()`, `THEME_FIRST`; for the prologue and the menu `KANDRAX_OPENING`
  (`openingRound()`, `OPENING_INSTRUMENTS`: only what it plays), and for the prologue `KANDRAX_RISE` and
  `RISE_FIRST`. `AudioEngine.nextMusicBeat(bpm, beats, within)`
  gives the next chord or beat of the music that plays; `playMusic(track, fade, at)` starts a track there. The horn was recorded up to C4 and from D5: its
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
  `parseSound()` (each value checked). The section: `ui/sound-section.ts` (`soundSection()`,
  `.settings-sound`; `soundToggle()`, the speaker of the prologue and of the menu); the texts:
  `STRINGS.sound` (`on` and `off`: the tooltip of the speaker).
- **The areas** (`packages/engine/src/world.ts`): `SoundArea` (`id`, `music`, a rectangle of tiles,
  `building`, `discover`), `WorldSource.soundAreas()`, `soundAreaAt()`. The Wilds: `soundAreas()` in
  `worlds/wilds/src/source.ts` (home, chapel, ironhold, silverspring, ruin-1 to ruin-3, wren, war-camp,
  seeker-camp, shrine).
- **The director** (`audio/director.ts`): `MusicDirector` (`update(input, now)` gives the mood and a
  stinger; `moment(id)`), `FIGHT_HOLD_MS`, `TENSION_AFTER_MS`, `TENSION_HOLD_MS`, `PLACE_AFTER_MS`;
  `Discoveries` (localStorage `game.discovered.v1:<character id>`, or `guest`). `game.ts` gives it the
  place, the hunters, the signs of a fight (`FIGHT_RANGE`, `FIGHT_STATES`, `CLOSE_CHASE`,
  `FIGHT_SIGN_MS`, `BOSS_KINDS`), the kills, the dream, the defeat and the hour (`night`: not
  `isDaytime(skyNow())`), in each frame (`directMusic`). `PlaceMood`, `PLACE_MOODS`, `isPlaceMood()`.
  When `night` changes over a place's mood, it queues `dawn` or `dusk` (the lowest rank of the stingers).
- **The pieces** (`audio/themes/`): `wilds.ts` (`wildsComposer({ soloists, rests })`: progressions,
  soloists, the theme's melody now and then, silences), `places.ts` (town, haven, home, chapel, ruins,
  camp, shrine, dream), `fight.ts` (tension, combat, battle), `stingers.ts` (`STINGERS`), `night.ts`
  (`NightForm`, `NIGHT_FORMS`, `nightComposer()`: the night form of each place's piece, `NIGHT_SOLOISTS`),
  `common.ts` (the voicings `CHORDS`, the phrases `CELLS`). `audio/game-music.ts`: `MOOD_TRACKS` (each
  with a `level`: the calm pieces are about 5 dB under a fight), `NIGHT_TRACKS` (`<place>-night`),
  `trackOf(mood, night)`, `MOOD_FADE`, `HOUR_FADE`, `DAWN_HOUR`, `DUSK_HOUR`, `stingerNear()`,
  `GameMusic` (`start`, `apply(mood, stinger, night)`, `near(place, unseen, night)`, `hour(hour)`: it
  loads and holds the instruments of the dawn or the dusk near its moment, `conversation`). Their cost,
  measured as for the theme: 9 % (the Wilds) to 15 % (a battle) of one core of this server.
- **Loading**: the music of the starting place first, then the fight's first instruments, then the
  instruments of the hunt and of the fights, which stay (`PINNED_INSTRUMENTS`). The music of a place
  loads when the player is within 14 tiles of it, with the stinger of discovery if the place is new; the
  stingers of the quests when a conversation opens; the defeat's when a fight starts. A stinger whose
  instruments come more than 1.5 s late does not play. Every 30 s, the instruments that are not pinned,
  not in the track that plays and not used for 3 minutes go (`SampleBank.sweep`, `IDLE_MS`). The Wilds,
  the hunt and the fights together take about 49 MB of memory decoded; all the instruments, 77 MB.
- **The effects** (`audio/fx.ts`): `FX` (each a recipe: `seconds`, `variants`, the recorded `samples`
  it plays, `render`), `FxPlayer` (`play(id, { gain, pan, delay })`, `voice()`, `prepare()`): the
  first play of an effect is its recipe, live; then 2 to 5 variants are rendered once (mono, 32 kHz,
  an `OfflineAudioContext`) and each play is one of them at random, ±4 % in pitch. `spatial(dx, dy,
  range)`: the gain and the pan of a sound at a point. The recorded sounds of the effects
  (`FX_INSTRUMENTS`: metalHit, zap, bubbles, scrape, chain, slap, woodClick, shaker, guiro, from VSCO 2
  CE) load when the game starts. The synthesized parts: `synth.ts` (`thud`, `voice`, `creak`, `splash`,
  `clink`, `rustle`, `crunch`, `ring`, `gulp`, and the older `whoosh`, `noiseHit`, `boom`, `bell`).
- **The voices** (`audio/creatures.ts`): `VOICE_OF` (the voice and the size of each kind of mob),
  `syllables()`, `mobVoice()`.
- **The game** (`audio/game-sounds.ts`): `GameSounds` (`swing`, `blow`, `hurt`, `glance`, `dodge`,
  `down`, `mobsNow`, `arrowsNow`, `steps`, `place`, `silence`, `resume`; `fx` for the things),
  `stepOf()`, `ambienceOf()`, `voiceOfChange()`, `STRIDE`. `game.ts` calls it from its handlers (the
  attack, the blows, the doors, the sources of loot, the piles, the pack, the drinks, the deals, the
  conversation) and in each frame (`directMusic`). The GUI: the event `game:panel-open`, and a press on
  any button but `#attack`, `#dodge`, `#action` and the answers of a conversation (the panel's `sound`).
- **The places** (`sounds.ts`): the ambiences of the places by day and at night (`forest` and
  `forestDay`, `townDay` and `townNight`, `haven` and `havenNight`, `hearth` and `hearthDay`, `ruins` and
  `ruinsDay`, `camp` and `campNight`, `shrine` and `shrineNight`), `indoor`, and those of the prologue
  (`town` is the prologue's); the sounds of the day: `birds`, `woodpecker`, `crows`, `dog`, `voices`
  (formant voices, `synth.ts` `voice()`, through a low-pass: far); `crickets`, `owls` and `chimes` take a
  level or a gap. `PLACE_AMBIENCES` and `ambienceOf(mood, indoors, night)` in `game-sounds.ts`;
  `GameSounds.place(world, mood, indoors, night, ...)` crossfades over `HOUR_AMBIENCE_FADE` (12 s) when
  only the hour changed. The layers `LAYERS` (`water`, `fire`, `fountain`, `forge`),
  `startLayer()`; `audio.setLayer(id, level, pan)`, scheduled by the engine's clock. `GameSounds.place()`
  scans the ground (water) and `world.fixturesIn()` (fires, fountains, forges) every 300 ms.
- **The debug panel** (F3): the line `music`: the mood, "by day" or "by night", the track, the
  ambience (`audio.ambienceId`), the area, and how many instruments are loaded. `?hour=<0-24>` fixes the
  hour of the sound too.
- **The prologue**: each scene names its ambience (`AMBIENCE_OF` in `art/prologue.ts`, carried in
  `prologue.json`); `ui/prologue.ts` loads the first instruments with its art (and holds those of the
  rise and the coda until its end: `audio.hold()`), and plays the theme, the ambiences and the effects
  (`.prologue-sound`).
- **The menus**: `menu/sounds.ts` (`MenuSounds`: the music and the effects of the menu before the game);
  the game menu's `sound` (`ui/game-menu.ts`, `game.ts`).
- **iPhone and iPad**: Web Audio follows the silent switch of the device. With the switch on, the game
  is silent. This is on purpose.
- **Tests**: `audio/audio.test.ts` (notes, the notation, the choice of a sample, the copies of a loop,
  the decoder's delay, the manifest, the bars of the theme, every note near a recorded note, the rounds,
  the instruments of the opening, the settings, the held instruments, the music under a menu); `audio/director.test.ts` (the moods and their timing, the stingers, the dawn and the
  dusk, every note of 40 sections of each piece, of each night form and of each stinger near a recorded
  note of an instrument of its list, the night forms slower and softer on fewer instruments, the window of
  the stingers of the hour); `audio/game-sounds.test.ts` (the steps of each ground, the ambience of each
  mood by day and at night, the voices of the changes of a mob, the place of a sound, the voice of every
  kind of mob for every moment, the effects). `renderOffline()` renders a track and an ambience in an
  `OfflineAudioContext`, to measure the levels in a browser (it leaves out the track's `level`: add it).
  The levels of 2026-10-13 (dBFS of the loud second windows): the ambiences -37 to -49 (the forest -42.6
  at night, -42.4 by day; a town -45.8 at night, -43.2 by day); the places' music -23 to -27 by day,
  -27 to -30 at night; the dawn -28, the dusk -30, the refuge -27, the rest -28, a quest's start -24.
