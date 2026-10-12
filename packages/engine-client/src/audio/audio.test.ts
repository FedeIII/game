import { describe, expect, it } from 'vitest';
import { THEME_CHORDS, THEME_MELODIES, CHORD_BEATS, themeRound } from './music.ts';
import { frequencyOf, hz, midi } from './notes.ts';
import { DEFAULT_SOUND, parseSound } from './settings.ts';
import { AMBIENCES, EFFECTS } from './sounds.ts';
import { pluckSamples } from './synth.ts';

describe('notes', () => {
  it('name the notes of equal temperament, with A4 at 440 Hz', () => {
    expect(midi('A4')).toBe(69);
    expect(midi('C4')).toBe(60);
    expect(midi('Bb1')).toBe(34);
    expect(midi('C#5')).toBe(73);
    expect(hz('A4')).toBe(440);
    expect(hz('A5')).toBeCloseTo(880, 6);
    expect(frequencyOf(midi('D3'))).toBeCloseTo(146.83, 2);
    expect(() => midi('H2')).toThrow();
  });
});

describe('the sound settings', () => {
  it('keep good values, and use the defaults for missing or bad ones', () => {
    expect(parseSound(null)).toEqual(DEFAULT_SOUND);
    expect(parseSound('not json')).toEqual(DEFAULT_SOUND);
    expect(parseSound(JSON.stringify({ music: 0.3, effects: 2, muted: true }))).toEqual({ music: 0.3, effects: 1, muted: true });
    expect(parseSound(JSON.stringify({ music: 'loud' }))).toEqual(DEFAULT_SOUND);
  });
});

describe('a plucked string', () => {
  it('rings at its pitch and dies away', () => {
    const rate = 44100;
    const { samples, frequency } = pluckSamples(220, rate, 2);
    expect(Math.abs(frequency - 220)).toBeLessThan(2);
    const rms = (from: number, to: number) => Math.sqrt(samples.slice(from, to).reduce((s, v) => s + v * v, 0) / (to - from));
    expect(rms(0, rate * 0.2)).toBeGreaterThan(rms(rate * 1.5, rate * 2) * 3);
    // Its pitch: the lag where the signal is most like itself is one period (rate / 220).
    let best = 0;
    let bestLag = 0;
    for (let lag = 60; lag < 400; lag++) {
      let sum = 0;
      for (let i = 4000; i < 8000; i++) sum += samples[i]! * samples[i + lag]!;
      if (sum > best) {
        best = sum;
        bestLag = lag;
      }
    }
    expect(Math.abs(bestLag - rate / 220)).toBeLessThan(1.5);
  });
});

describe('the theme of Kandrax', () => {
  it('has eight beats in each bar of each melody, and only good notes', () => {
    for (const melody of THEME_MELODIES) {
      expect(melody).toHaveLength(THEME_CHORDS.length);
      for (const bar of melody) {
        expect(bar.reduce((sum, [, beats]) => sum + beats, 0)).toBe(CHORD_BEATS);
        for (const [note] of bar) if (note) expect(() => midi(note)).not.toThrow();
      }
    }
    for (const chord of THEME_CHORDS) for (const note of [...chord.pad, ...chord.arp, chord.bass, ...chord.choir, chord.bell]) expect(() => midi(note)).not.toThrow();
  });

  it('starts quiet, adds a voice each round, and then goes round', () => {
    expect(themeRound(0)).toEqual({ melody: null, octave: 0, bells: false, choir: false });
    expect(themeRound(1).melody).toBe(0);
    expect(themeRound(2)).toMatchObject({ melody: 1, choir: true });
    expect(themeRound(3).octave).toBe(12);
    expect(themeRound(4)).toEqual(themeRound(1));
  });
});

describe('the sounds', () => {
  it('list their effects and ambiences', () => {
    expect(EFFECTS).toEqual(['whoosh', 'title', 'tick', 'click', 'end']);
    expect(AMBIENCES).toContain('forge');
  });
});
