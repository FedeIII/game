/**
 * The director of the game's music (Fede's request, 2026-10-12: "hasty on confrontations, dangerous
 * on tense situations, awe-provoking on new areas or revelations"): from what happens to the player
 * in each frame, the mood that the music must have, and the moments that get a stinger.
 *
 * The moods, the first that holds wins:
 *   dream     in a dream
 *   silent    the player is down (after the stinger of the defeat)
 *   battle    a fight with a great foe; it holds until the fight is over
 *   combat    a fight: at once; it holds FIGHT_HOLD_MS after the last sign of a fight
 *   tension   mobs hunt the player (for TENSION_AFTER_MS); it holds TENSION_HOLD_MS after
 *   <place>   the mood of the place (WorldSource.soundAreas), when the player has been in it for
 *             PLACE_AFTER_MS: wilds, town, haven, home, chapel, ruins, camp, shrine
 * A fight that ends with kills and no hunter left plays "victory". The engine's moments (a new place,
 * a quest, a refuge, a rest) come through `moment()`. The hour (2026-10-13): the music of a place has a
 * night form (audio/game-music.ts), and when the night ends or comes while the music is the place's,
 * "dawn" or "dusk" plays. Pure: the tests drive it with a clock.
 */
import type { StingerId } from './themes/stingers.ts';

/** The moods of the places (WorldSource.soundAreas): each has a day form and a night form. */
export type PlaceMood = 'wilds' | 'town' | 'haven' | 'home' | 'chapel' | 'ruins' | 'camp' | 'shrine';
export type Mood = PlaceMood | 'dream' | 'tension' | 'combat' | 'battle' | 'silent';

export const PLACE_MOODS: readonly PlaceMood[] = ['wilds', 'town', 'haven', 'home', 'chapel', 'ruins', 'camp', 'shrine'];

/** Whether a mood is a place's (its music follows the hour). */
export function isPlaceMood(mood: Mood): mood is PlaceMood {
  return (PLACE_MOODS as readonly Mood[]).includes(mood);
}

/** A fight holds the music this long after its last sign (ms). */
export const FIGHT_HOLD_MS = 6000;
/** Mobs must hunt the player this long before the music turns tense (ms): a glimpse is not a hunt. */
export const TENSION_AFTER_MS = 1200;
/** The tension holds this long after the last hunter (ms). */
export const TENSION_HOLD_MS = 6000;
/** A new place changes the music when the player has been in it this long (ms): no flicker at its edge. */
export const PLACE_AFTER_MS = 1500;
/** Two stingers at most this close (ms): the second waits for nothing, it is left out (unless it matters more). */
const STINGER_GAP_MS = 3500;

/** The stingers by how much they matter: one may cut in on a lesser one. */
const STINGER_RANK: Readonly<Record<StingerId, number>> = { defeat: 8, questEnd: 7, discover: 6, questStart: 5, questStep: 4, victory: 3, refuge: 2, rest: 1, dawn: 0, dusk: 0 };

export interface MoodInput {
  /** The mood of the place where the player is. */
  readonly place: Mood;
  /** How many mobs hunt the player now. */
  readonly hunters: number;
  /** A sign of a fight in this frame: a mob close by winds up, strikes or reels; the player struck or was struck. */
  readonly fighting: boolean;
  /** A great foe takes part in the fight. */
  readonly boss: boolean;
  /** How many mobs the player has killed so far (a counter). */
  readonly kills: number;
  readonly dream: boolean;
  readonly down: boolean;
  /** Whether it is night (isDaytime in the engine: from 20:00 to 6:00; a world without a day, always). */
  readonly night: boolean;
}

export interface Direction {
  readonly mood: Mood;
  /** A stinger to play now, if any. */
  readonly stinger: StingerId | null;
}

export class MusicDirector {
  private moodNow: Mood | null = null;
  private fightUntil = -Infinity;
  private battle = false;
  private huntedSince: number | null = null;
  private tenseUntil = -Infinity;
  private place: Mood | null = null;
  private candidate: { mood: Mood; since: number } | null = null;
  private killsAtFight = 0;
  private wasDown = false;
  private lastStinger: { id: StingerId; at: number } | null = null;
  private queued: StingerId | null = null;
  /** The hour of the last update: night or day (null before the first). */
  private night: boolean | null = null;

  get mood(): Mood | null {
    return this.moodNow;
  }

  /** A moment of the game that has a stinger (a quest, a new place, a refuge, a rest). */
  moment(id: StingerId): void {
    if (this.queued === null || STINGER_RANK[id] > STINGER_RANK[this.queued]) this.queued = id;
  }

  update(input: MoodInput, now: number): Direction {
    let stinger: StingerId | null = null;
    // The place, once the player has stayed in it a moment (the first place at once).
    if (this.place === null) this.place = input.place;
    else if (input.place !== this.place) {
      if (!this.candidate || this.candidate.mood !== input.place) this.candidate = { mood: input.place, since: now };
      else if (now - this.candidate.since >= PLACE_AFTER_MS) {
        this.place = input.place;
        this.candidate = null;
      }
    } else this.candidate = null;

    // A fight: at once, and it holds.
    if (input.fighting) {
      if (now >= this.fightUntil) this.killsAtFight = input.kills;
      this.fightUntil = now + FIGHT_HOLD_MS;
      if (input.boss) this.battle = true;
    }
    const fighting = now < this.fightUntil;
    if (!fighting && this.battle) this.battle = false;
    // A hunt: after a moment, and it holds.
    if (input.hunters > 0) {
      this.huntedSince ??= now;
      if (now - this.huntedSince >= TENSION_AFTER_MS) this.tenseUntil = now + TENSION_HOLD_MS;
    } else this.huntedSince = null;

    let mood: Mood;
    if (input.dream) mood = 'dream';
    else if (input.down) mood = 'silent';
    else if (fighting) mood = this.battle ? 'battle' : 'combat';
    else if (now < this.tenseUntil) mood = 'tension';
    else mood = this.place;

    // The moments of the fight and of the defeat.
    if (input.down && !this.wasDown) this.moment('defeat');
    this.wasDown = input.down;
    const wasFight = this.moodNow === 'combat' || this.moodNow === 'battle';
    if (wasFight && mood !== 'combat' && mood !== 'battle' && !input.down && input.kills > this.killsAtFight && input.hunters === 0) this.moment('victory');
    // The night ends or comes: a stinger over the music of a place (not over a hunt, a fight, a dream or a defeat).
    if (this.night !== null && input.night !== this.night && isPlaceMood(mood)) this.moment(input.night ? 'dusk' : 'dawn');
    this.night = input.night;

    if (this.queued) {
      const last = this.lastStinger;
      if (!last || now - last.at >= STINGER_GAP_MS || STINGER_RANK[this.queued] > STINGER_RANK[last.id]) {
        stinger = this.queued;
        this.lastStinger = { id: stinger, at: now };
      }
      this.queued = null;
    }
    this.moodNow = mood;
    return { mood, stinger };
  }
}

/** The places that a character has seen (their sound areas), kept in this browser for each character. */
export class Discoveries {
  private readonly key: string;
  private readonly seen: Set<string>;

  constructor(character: string) {
    this.key = `game.discovered.v1:${character}`;
    let list: string[] = [];
    try {
      const raw = localStorage.getItem(this.key);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) list = parsed.filter((x): x is string => typeof x === 'string');
    } catch {
      // No storage: every place is new until the page closes.
    }
    this.seen = new Set(list);
  }

  /** Whether a place has been seen. */
  has(id: string): boolean {
    return this.seen.has(id);
  }

  /** Marks a place as seen; returns whether it was new. */
  see(id: string): boolean {
    if (this.seen.has(id)) return false;
    this.seen.add(id);
    try {
      localStorage.setItem(this.key, JSON.stringify([...this.seen]));
    } catch {
      // No storage: it lasts as long as the page.
    }
    return true;
  }
}
