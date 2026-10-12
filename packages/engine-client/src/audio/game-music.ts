/**
 * The tracks of the game's moods (audio/director.ts), and how the music changes from one to the other:
 * a fight cuts in at once (its first bar has a cymbal and the drums), the rest crossfades. The
 * instruments of a sudden mood (tension, a fight, the stingers) load when the game starts and stay;
 * the others load when their place is near.
 */
import { audio } from './audio.ts';
import type { Mood } from './director.ts';
import { scoreTrack, type MusicTrack } from './music.ts';
import { BATTLE_INSTRUMENTS, COMBAT_FIRST, COMBAT_INSTRUMENTS, TENSION_INSTRUMENTS, combatComposer, tensionComposer } from './themes/fight.ts';
import {
  CAMP_INSTRUMENTS,
  CHAPEL_INSTRUMENTS,
  DREAM_INSTRUMENTS,
  HAVEN_INSTRUMENTS,
  HOME_INSTRUMENTS,
  RUINS_INSTRUMENTS,
  SHRINE_INSTRUMENTS,
  TOWN_INSTRUMENTS,
  campComposer,
  chapelComposer,
  dreamComposer,
  havenComposer,
  homeComposer,
  ruinsComposer,
  shrineComposer,
  townComposer,
} from './themes/places.ts';
import { STINGERS, type StingerId } from './themes/stingers.ts';
import { WILDS_FIRST, WILDS_INSTRUMENTS, wildsComposer } from './themes/wilds.ts';

export const MOOD_TRACKS: Readonly<Record<Exclude<Mood, 'silent'>, MusicTrack>> = {
  // The levels: the calm pieces about 5 dB under a fight (measured in renders of 30 s).
  wilds: scoreTrack('wilds', WILDS_INSTRUMENTS, wildsComposer, { first: WILDS_FIRST, level: 1.8 }),
  town: scoreTrack('town', TOWN_INSTRUMENTS, townComposer, { first: ['celliPizz', 'harp', 'frameDrum', 'violin'], level: 1.15 }),
  haven: scoreTrack('haven', HAVEN_INSTRUMENTS, havenComposer, { first: ['harp', 'celli', 'flute'], level: 1.2 }),
  home: scoreTrack('home', HOME_INSTRUMENTS, homeComposer, { first: ['harp', 'celli', 'clarinet'], level: 1.8 }),
  chapel: scoreTrack('chapel', CHAPEL_INSTRUMENTS, chapelComposer, { level: 1.4 }),
  ruins: scoreTrack('ruins', RUINS_INSTRUMENTS, ruinsComposer, { first: ['basses', 'oohs', 'violas'], level: 1.8 }),
  camp: scoreTrack('camp', CAMP_INSTRUMENTS, campComposer, { first: ['taiko', 'logDrum', 'celliTrem', 'basses'], level: 1.7 }),
  shrine: scoreTrack('shrine', SHRINE_INSTRUMENTS, shrineComposer, { first: ['organ', 'oohs'], level: 1.6 }),
  dream: scoreTrack('dream', DREAM_INSTRUMENTS, dreamComposer, { first: ['oohs', 'harp'], level: 1.7 }),
  tension: scoreTrack('tension', TENSION_INSTRUMENTS, tensionComposer, { first: ['violinsTrem', 'celliTrem', 'timpaniSoft'], level: 1.6 }),
  combat: scoreTrack('combat', COMBAT_INSTRUMENTS, combatComposer(false), { first: COMBAT_FIRST }),
  battle: scoreTrack('battle', BATTLE_INSTRUMENTS, combatComposer(true), { first: COMBAT_FIRST }),
};

/** How long the music takes to change into a mood (s). */
export const MOOD_FADE: Readonly<Record<Mood, number>> = {
  combat: 0.3,
  battle: 0.3,
  tension: 2,
  dream: 2.5,
  silent: 2.5,
  wilds: 3.5,
  town: 3,
  haven: 3,
  home: 3,
  chapel: 3,
  ruins: 3.5,
  camp: 3,
  shrine: 3.5,
};

/**
 * The instruments that stay loaded: those of the moods that come suddenly (a hunt, a fight). The
 * stingers load just before their moment can come: the discovery near a new place, the quests with a
 * conversation, the defeat with a fight (the victory plays on the fight's own instruments).
 */
export const PINNED_INSTRUMENTS: readonly string[] = [...new Set([...TENSION_INSTRUMENTS, ...COMBAT_INSTRUMENTS])];
/** The instruments of the stingers of the quests. */
const QUEST_INSTRUMENTS: readonly string[] = [...new Set([...STINGERS.questStart.instruments, ...STINGERS.questStep.instruments, ...STINGERS.questEnd.instruments])];

/** The music of a game: it follows the director's mood and plays its stingers. */
export class GameMusic {
  private mood: Mood | null = null;

  /** Loads what the game needs first: the music of where it starts, then the sudden moods. */
  start(place: Mood): void {
    const track = place === 'silent' ? null : MOOD_TRACKS[place];
    if (track) audio.preload(track.first ?? track.instruments);
    audio.bank.pin(PINNED_INSTRUMENTS);
    // After the first music: the fight's first instruments, then all the pinned ones.
    void audio.bank.load(track?.first ?? []).then(() => audio.bank.load(COMBAT_FIRST).then(() => audio.bank.load(PINNED_INSTRUMENTS)));
  }

  /** Plays the mood (when it changed) and the stinger. */
  apply(mood: Mood, stinger: StingerId | null): void {
    if (mood !== this.mood) {
      this.mood = mood;
      // A fight may end in a defeat.
      if (mood === 'combat' || mood === 'battle') audio.preload(STINGERS.defeat.instruments);
      if (mood === 'silent') audio.stopMusic(MOOD_FADE.silent);
      else audio.playMusic(MOOD_TRACKS[mood], MOOD_FADE[mood]);
    }
    if (stinger) audio.playStinger(STINGERS[stinger]);
  }

  /** Lets the next `apply` start the music again (after the prologue, which had its own). */
  reset(): void {
    this.mood = null;
  }

  /** Preloads the music of a place that the player comes near, and the discovery if the place is new. */
  near(place: Mood, unseen: boolean): void {
    if (place === 'silent') return;
    const track = MOOD_TRACKS[place];
    audio.preload(track.first ?? track.instruments);
    if (unseen) audio.preload(STINGERS.discover.instruments);
  }

  /** A conversation opens: a quest may start, move or end in it. */
  conversation(): void {
    audio.preload(QUEST_INSTRUMENTS);
  }
}
