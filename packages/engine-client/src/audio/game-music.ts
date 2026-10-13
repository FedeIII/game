/**
 * The tracks of the game's moods (audio/director.ts), and how the music changes from one to the other:
 * a fight cuts in at once (its first bar has a cymbal and the drums), the rest crossfades. The
 * instruments of a sudden mood (tension, a fight, the stingers) load when the game starts and stay;
 * the others load when their place is near. At night a place plays the night form of its piece
 * (themes/night.ts); when the hour changes, the two forms crossfade slowly.
 */
import { DAY_HOURS } from '@game/engine';
import { audio } from './audio.ts';
import { PLACE_MOODS, isPlaceMood, type Mood, type PlaceMood } from './director.ts';
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
import { NIGHT_FORMS, nightComposer } from './themes/night.ts';
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

/** The night form of a place's track (NIGHT_FORMS): `<mood>-night`, without the instruments that rest at night. */
function nightTrack(mood: PlaceMood): MusicTrack {
  const day = MOOD_TRACKS[mood];
  const form = NIGHT_FORMS[mood];
  const keep = (list: readonly string[]) => list.filter((inst) => !(form.drop ?? []).includes(inst));
  return scoreTrack(`${mood}-night`, keep(day.instruments), nightComposer(form.compose ?? day.compose!, form), { first: keep(day.first ?? day.instruments), level: (day.level ?? 1) * (form.level ?? 1) });
}

/** The night forms of the places' tracks. */
export const NIGHT_TRACKS: Readonly<Record<PlaceMood, MusicTrack>> = Object.fromEntries(PLACE_MOODS.map((mood) => [mood, nightTrack(mood)])) as Record<PlaceMood, MusicTrack>;

/** The track of a mood at an hour: a place's night form at night; the other moods do not change. */
export function trackOf(mood: Exclude<Mood, 'silent'>, night: boolean): MusicTrack {
  return night && isPlaceMood(mood) ? NIGHT_TRACKS[mood] : MOOD_TRACKS[mood];
}

/** How long the day form and the night form of a place's music crossfade when the hour changes (s). */
export const HOUR_FADE = 10;

/**
 * When the night ends and when it comes (hours): in the middle of the dawn and of the dusk, where the
 * engine's isDaytime changes (6:00 and 20:00).
 */
export const DAWN_HOUR = (DAY_HOURS.dawn + DAY_HOURS.day) / 2;
export const DUSK_HOUR = (DAY_HOURS.dusk + DAY_HOURS.night) / 2;
/** The stinger of the hour loads this long before its moment, and stays loaded this long after it (hours of the game). */
const HOUR_BEFORE = 0.75;
const HOUR_AFTER = 0.25;

/** The stinger of the hour that is near at this hour ('dawn' or 'dusk': from HOUR_BEFORE before its moment to HOUR_AFTER after it), or null. */
export function stingerNear(hour: number): 'dawn' | 'dusk' | null {
  const near = (at: number) => {
    // The hours from now to the moment, from -12 to 12.
    const d = ((((at - hour) % 24) + 36) % 24) - 12;
    return d >= -HOUR_AFTER && d <= HOUR_BEFORE;
  };
  return near(DAWN_HOUR) ? 'dawn' : near(DUSK_HOUR) ? 'dusk' : null;
}

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

/** The music of a game: it follows the director's mood and the hour, and plays its stingers. */
export class GameMusic {
  private mood: Mood | null = null;
  /** The track asked for (its id: a place's day or night form), or null. */
  private track: string | null = null;

  /**
   * Loads what the game needs first: the music of where it starts (the first instruments of the day
   * form, which has those of the night form too), then the sudden moods.
   */
  start(place: Mood): void {
    const track = place === 'silent' ? null : MOOD_TRACKS[place];
    if (track) audio.preload(track.first ?? track.instruments);
    audio.bank.pin(PINNED_INSTRUMENTS);
    // After the first music: the fight's first instruments, then all the pinned ones.
    void audio.bank.load(track?.first ?? []).then(() => audio.bank.load(COMBAT_FIRST).then(() => audio.bank.load(PINNED_INSTRUMENTS)));
  }

  /**
   * Plays the mood at its hour (when it changed) and the stinger. A change of the hour alone (the same
   * place, day to night or back) crossfades over HOUR_FADE.
   */
  apply(mood: Mood, stinger: StingerId | null, night: boolean): void {
    const track = mood === 'silent' ? null : trackOf(mood, night);
    if (mood !== this.mood || (track?.id ?? null) !== this.track) {
      const hourOnly = mood === this.mood;
      this.mood = mood;
      this.track = track?.id ?? null;
      // A fight may end in a defeat.
      if (mood === 'combat' || mood === 'battle') audio.preload(STINGERS.defeat.instruments);
      if (!track) audio.stopMusic(MOOD_FADE.silent);
      else audio.playMusic(track, hourOnly ? HOUR_FADE : MOOD_FADE[mood]);
    }
    if (stinger) audio.playStinger(STINGERS[stinger]);
  }

  /** Lets the next `apply` start the music again (after the prologue, which had its own). */
  reset(): void {
    this.mood = null;
    this.track = null;
  }

  /** Preloads the music of a place that the player comes near (at its hour), and the discovery if the place is new. */
  near(place: Mood, unseen: boolean, night: boolean): void {
    if (place === 'silent') return;
    const track = trackOf(place, night);
    audio.preload(track.first ?? track.instruments);
    if (unseen) audio.preload(STINGERS.discover.instruments);
  }

  /** The stinger of the hour that is loaded and held now, and how to let it go. */
  private held: { readonly id: 'dawn' | 'dusk'; readonly release: () => void } | null = null;

  /** The hour (0 to 24): shortly before the night ends or comes, the stinger of that moment loads, and stays until just after it. */
  hour(hour: number): void {
    const near = stingerNear(hour);
    if (near === (this.held?.id ?? null)) return;
    this.held?.release();
    this.held = null;
    if (!near) return;
    audio.preload(STINGERS[near].instruments);
    this.held = { id: near, release: audio.hold(STINGERS[near].instruments) };
  }

  /** A conversation opens: a quest may start, move or end in it. */
  conversation(): void {
    audio.preload(QUEST_INSTRUMENTS);
  }
}
