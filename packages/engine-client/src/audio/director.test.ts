import { describe, expect, it } from 'vitest';
import manifest from '../generated/sounds.json';
import { FIGHT_HOLD_MS, MusicDirector, PLACE_AFTER_MS, TENSION_AFTER_MS, TENSION_HOLD_MS, type MoodInput } from './director.ts';
import { MOOD_TRACKS, PINNED_INSTRUMENTS } from './game-music.ts';
import type { ScoreNote } from './music.ts';
import { STINGERS } from './themes/stingers.ts';

const INSTRUMENTS = (manifest as unknown as { instruments: Record<string, { kind: string; samples: { root: number | null }[] }> }).instruments;

const CALM: MoodInput = { place: 'wilds', hunters: 0, fighting: false, boss: false, kills: 0, dream: false, down: false };

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
});

describe('the pieces of the game', () => {
  it('play every note on an instrument of their list, near a recorded note, inside its section', () => {
    for (const [mood, track] of Object.entries(MOOD_TRACKS)) {
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
