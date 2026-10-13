import { describe, expect, it } from 'vitest';
import manifest from '../generated/sounds.json';
import { FIGHT_HOLD_MS, MusicDirector, PLACE_AFTER_MS, PLACE_MOODS, TENSION_AFTER_MS, TENSION_HOLD_MS, type MoodInput } from './director.ts';
import { DAWN_HOUR, DUSK_HOUR, MOOD_TRACKS, NIGHT_TRACKS, PINNED_INSTRUMENTS, stingerNear, trackOf } from './game-music.ts';
import type { ScoreNote } from './music.ts';
import { NIGHT_FORMS } from './themes/night.ts';
import { STINGERS } from './themes/stingers.ts';

const INSTRUMENTS = (manifest as unknown as { instruments: Record<string, { kind: string; samples: { root: number | null }[] }> }).instruments;

const CALM: MoodInput = { place: 'wilds', hunters: 0, fighting: false, boss: false, kills: 0, dream: false, down: false, night: false };

/** A seeded random, so a composer gives the same sections in a test. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The semitones from a note to the nearest recorded note of its instrument (0 for a drum). */
function distance(note: ScoreNote): number {
  const roots = INSTRUMENTS[note.inst]!.samples.map((s) => s.root);
  if (note.midi === null || roots[0] === null) return 0;
  return Math.min(...roots.map((r) => Math.abs(r! - note.midi!)));
}

function checkNotes(where: string, notes: readonly ScoreNote[], instruments: readonly string[], beats: number): void {
  for (const note of notes) {
    expect(INSTRUMENTS[note.inst], `${where}: ${note.inst}`).toBeDefined();
    expect(instruments, `${where}: ${note.inst} is not in the list of the piece`).toContain(note.inst);
    expect(note.beat, where).toBeGreaterThanOrEqual(0);
    expect(note.beat, where).toBeLessThan(beats);
    expect(note.beats, where).toBeGreaterThan(0);
    expect(distance(note), `${where}: ${note.inst} ${note.midi}`).toBeLessThanOrEqual(INSTRUMENTS[note.inst]!.kind === 'once' ? 3.5 : 3);
  }
}

describe('the music director', () => {
  it('plays the place, and changes it only when the player has stayed in the new one', () => {
    const d = new MusicDirector();
    expect(d.update(CALM, 0).mood).toBe('wilds');
    expect(d.update({ ...CALM, place: 'town' }, 100).mood).toBe('wilds');
    expect(d.update({ ...CALM, place: 'wilds' }, 600).mood).toBe('wilds');
    expect(d.update({ ...CALM, place: 'town' }, 700).mood).toBe('wilds');
    expect(d.update({ ...CALM, place: 'town' }, 700 + PLACE_AFTER_MS).mood).toBe('town');
  });

  it('turns tense after a moment of hunt, and stays tense a while after it', () => {
    const d = new MusicDirector();
    d.update(CALM, 0);
    expect(d.update({ ...CALM, hunters: 2 }, 1000).mood).toBe('wilds');
    expect(d.update({ ...CALM, hunters: 2 }, 1000 + TENSION_AFTER_MS).mood).toBe('tension');
    const lost = 1000 + TENSION_AFTER_MS + 100;
    expect(d.update(CALM, lost).mood).toBe('tension');
    expect(d.update(CALM, lost + TENSION_HOLD_MS).mood).toBe('wilds');
  });

  it('cuts to a fight at once, holds it, and plays the victory when the kills end it', () => {
    const d = new MusicDirector();
    d.update(CALM, 0);
    expect(d.update({ ...CALM, fighting: true, hunters: 1 }, 500).mood).toBe('combat');
    expect(d.update({ ...CALM, hunters: 1, kills: 1 }, 2000).mood).toBe('combat');
    const end = d.update({ ...CALM, kills: 1 }, 500 + FIGHT_HOLD_MS);
    expect(end.mood).not.toBe('combat');
    expect(end.stinger).toBe('victory');
  });

  it('plays a battle for a great foe until the fight is over', () => {
    const d = new MusicDirector();
    d.update(CALM, 0);
    expect(d.update({ ...CALM, fighting: true, boss: true }, 100).mood).toBe('battle');
    expect(d.update({ ...CALM, fighting: true }, 3000).mood).toBe('battle');
    expect(d.update(CALM, 3000 + FIGHT_HOLD_MS).mood).not.toBe('battle');
    expect(d.update({ ...CALM, fighting: true }, 20000).mood).toBe('combat');
  });

  it('is silent while the player is down, after the stinger of the defeat; a dream wins over all', () => {
    const d = new MusicDirector();
    d.update(CALM, 0);
    const down = d.update({ ...CALM, fighting: true, down: true }, 100);
    expect(down).toEqual({ mood: 'silent', stinger: 'defeat' });
    expect(d.update({ ...CALM, down: true }, 200).stinger).toBeNull();
    expect(d.update({ ...CALM, dream: true, fighting: true }, 300).mood).toBe('dream');
  });

  it('plays the moments, one at a time: a greater one cuts in, a lesser one close after is left out', () => {
    const d = new MusicDirector();
    d.update(CALM, 0);
    d.moment('questStep');
    d.moment('questEnd');
    expect(d.update(CALM, 100).stinger).toBe('questEnd');
    d.moment('discover');
    expect(d.update(CALM, 1000).stinger).toBeNull();
    d.moment('discover');
    expect(d.update(CALM, 5000).stinger).toBe('discover');
    d.moment('defeat');
    expect(d.update(CALM, 5100).stinger).toBe('defeat');
  });

  it('plays the dawn and the dusk when the hour changes over the music of a place, never at the start', () => {
    const d = new MusicDirector();
    expect(d.update({ ...CALM, night: true }, 0).stinger).toBeNull();
    expect(d.update({ ...CALM, night: true }, 100).stinger).toBeNull();
    expect(d.update(CALM, 200)).toEqual({ mood: 'wilds', stinger: 'dawn' });
    expect(d.update(CALM, 300).stinger).toBeNull();
    expect(d.update({ ...CALM, night: true }, 10_000)).toEqual({ mood: 'wilds', stinger: 'dusk' });
    // A start of the page by day: nothing.
    expect(new MusicDirector().update(CALM, 0).stinger).toBeNull();
  });

  it('plays no dawn or dusk over a fight, and a greater moment wins over it', () => {
    const d = new MusicDirector();
    d.update({ ...CALM, night: true }, 0);
    expect(d.update({ ...CALM, fighting: true }, 100)).toEqual({ mood: 'combat', stinger: null });
    const e = new MusicDirector();
    e.update({ ...CALM, night: true }, 0);
    e.moment('questStart');
    expect(e.update(CALM, 100).stinger).toBe('questStart');
  });
});

describe('the music of the hour', () => {
  it('has a night form for each place, slower and softer, on fewer instruments of the day form', () => {
    for (const mood of PLACE_MOODS) {
      const day = MOOD_TRACKS[mood];
      const night = NIGHT_TRACKS[mood];
      expect(night.id).toBe(`${mood}-night`);
      expect(trackOf(mood, true)).toBe(night);
      expect(trackOf(mood, false)).toBe(day);
      for (const inst of night.instruments) expect(day.instruments, `${mood}: ${inst}`).toContain(inst);
      for (const inst of NIGHT_FORMS[mood].drop ?? []) expect(night.instruments, `${mood}: ${inst} rests at night`).not.toContain(inst);
      expect(night.first?.length, mood).toBeGreaterThan(0);
      expect(night.level ?? 1, mood).toBeLessThanOrEqual(day.level ?? 1);
      // Over forty sections: slower, softer, and no dropped instrument.
      const stats = (track: typeof day) => {
        const next = track.compose!();
        const random = seeded(11);
        let bpm = 0;
        let played = 0;
        let vel = 0;
        let notes = 0;
        for (let i = 0; i < 40; i++) {
          const section = next(i, random);
          if (section.notes.length === 0) continue;
          bpm += section.bpm;
          played++;
          for (const note of section.notes) {
            vel += note.vel;
            notes++;
          }
        }
        return { bpm: bpm / played, vel: vel / notes };
      };
      const a = stats(day);
      const b = stats(night);
      expect(b.bpm, mood).toBeLessThan(a.bpm);
      expect(b.vel, mood).toBeLessThan(a.vel);
    }
  });

  it('keeps the other moods the same by night', () => {
    for (const mood of ['tension', 'combat', 'battle', 'dream'] as const) expect(trackOf(mood, true)).toBe(MOOD_TRACKS[mood]);
  });

  it('loads the stinger of the dawn and of the dusk shortly before its moment, and keeps it a little after', () => {
    expect(DAWN_HOUR).toBe(6);
    expect(DUSK_HOUR).toBe(20);
    expect(stingerNear(5)).toBeNull();
    expect(stingerNear(5.5)).toBe('dawn');
    expect(stingerNear(6.1)).toBe('dawn');
    expect(stingerNear(6.5)).toBeNull();
    expect(stingerNear(12)).toBeNull();
    expect(stingerNear(19.5)).toBe('dusk');
    expect(stingerNear(20.2)).toBe('dusk');
    expect(stingerNear(21)).toBeNull();
    expect(stingerNear(0)).toBeNull();
  });
});

describe('the pieces of the game', () => {
  it('play every note on an instrument of their list, near a recorded note, inside its section', () => {
    for (const [mood, track] of [...Object.entries(MOOD_TRACKS), ...Object.entries(NIGHT_TRACKS).map(([m, t]) => [`${m} at night`, t] as const)]) {
      const random = seeded(7);
      // Each piece's composer, as the track makes it: forty sections in a row.
      expect(track.compose, mood).toBeDefined();
      const next = track.compose!();
      for (let i = 0; i < 40; i++) {
        const section = next(i, random);
        checkNotes(`${mood} section ${i}`, section.notes, track.instruments, section.beats);
      }
      for (const inst of track.first ?? []) expect(track.instruments, `${mood}: first ${inst}`).toContain(inst);
    }
  });

  it('have stingers on recorded instruments, near recorded notes', () => {
    for (const [id, stinger] of Object.entries(STINGERS)) checkNotes(id, stinger.notes, stinger.instruments, stinger.beats);
  });

  it('keep the instruments of tension and of fights loaded, and the victory needs no other', () => {
    for (const inst of [...MOOD_TRACKS.tension.instruments, ...MOOD_TRACKS.combat.instruments, ...STINGERS.victory.instruments]) expect(PINNED_INSTRUMENTS).toContain(inst);
  });
});
