import { describe, expect, it } from 'vitest';
import manifest from '../generated/sounds.json';
import { chord, hits, line, LEVELS, SEATING } from './music.ts';
import { frequencyOf, hz, midi } from './notes.ts';
import { crossfadeOf, holdSegments, velocityGain } from './sampler.ts';
import { decoderDelay, INSTRUMENT_IDS, pickSample, type Instrument, type Sample } from './samples.ts';
import { DEFAULT_SOUND, parseSound } from './settings.ts';
import { AMBIENCES, EFFECTS, EFFECT_INSTRUMENTS } from './sounds.ts';
import { pluckSamples } from './synth.ts';
import { CHORD_BEATS, KANDRAX_BPM, KANDRAX_OPENING, KANDRAX_RISE, KANDRAX_THEME, MELODY_A, MELODY_B, RISE_FIRST, ROUND_BEATS, THEME_CHORDS, THEME_FIRST, themeNotes, themeRound } from './themes/kandrax.ts';

const INSTRUMENTS = (manifest as unknown as { instruments: Record<string, { kind: string; rate: number; samples: { file: string; root: number | null; loop?: number[]; seconds: number }[] }> }).instruments;

/** The semitones from a note to the nearest recorded note of an instrument (0 for a drum). */
function distance(inst: string, note: number | null): number {
  const roots = INSTRUMENTS[inst]!.samples.map((s) => s.root);
  if (note === null || roots[0] === null) return 0;
  return Math.min(...roots.map((r) => Math.abs(r! - note)));
}

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

describe('the notation of the scores', () => {
  it('reads notes with their beats, rests, chords and accents', () => {
    const notes = line('flute', 'A4:2 F4 >G4:1 r:1 D4+F4:3', 4, { vel: 0.5 });
    expect(notes.map((n) => [n.midi, n.beat, n.beats])).toEqual([
      [69, 4, 2],
      [65, 6, 2],
      [67, 8, 1],
      [62, 10, 3],
      [65, 10, 3],
    ]);
    expect(notes[2]!.vel).toBeCloseTo(0.65);
    expect(chord('violas', 'F3 A3', 8, 8).map((n) => [n.midi, n.beat, n.beats])).toEqual([
      [53, 8, 8],
      [57, 8, 8],
    ]);
    expect(line('violins', 'A4:2', 0, { shift: 12, hold: 1.5 })[0]).toMatchObject({ midi: 81, beats: 3 });
    expect(hits('timpani', [0, 4], 0.8).map((n) => [n.midi, n.beat])).toEqual([
      [null, 0],
      [null, 4],
    ]);
    expect(() => line('flute', 'A4:0')).toThrow();
  });
});

describe('the sampler', () => {
  const sample = (root: number | null): Sample => ({ buffer: null as unknown as AudioBuffer, root, start: 0, loop: [1, 2.9], length: 2.9 });
  const instrument: Instrument = { id: 'test', kind: 'sustain', samples: [sample(48), sample(51), sample(54)] };

  it('picks the nearest recorded note and tunes it', () => {
    const picked = pickSample(instrument, 50)!;
    expect(picked.sample.root).toBe(51);
    expect(picked.rate).toBeCloseTo(2 ** (-1 / 12), 6);
    expect(pickSample(instrument, 40)!.sample.root).toBe(48);
    expect(pickSample({ id: 'drum', kind: 'once', samples: [sample(null)] }, null)!.rate).toBe(1);
    expect(pickSample({ id: 'none', kind: 'once', samples: [] }, 60)).toBeNull();
  });

  it('holds a long note with copies of the loop that overlap by the crossfade', () => {
    const loop = [1, 2.9] as const;
    const fade = crossfadeOf(loop);
    expect(holdSegments(loop, 2.5)).toEqual([{ at: 0, from: 0 }]);
    const segments = holdSegments(loop, 10);
    expect(segments[1]).toEqual({ at: 2.9 - fade, from: 1 });
    // Each copy starts `fade` before the last one ends, and the last one lasts past the note.
    for (let i = 2; i < segments.length; i++) expect(segments[i]!.at - segments[i - 1]!.at).toBeCloseTo(2.9 - 1 - fade, 9);
    const last = segments[segments.length - 1]!;
    expect(last.at + (2.9 - 1)).toBeGreaterThan(10);
  });

  it('finds the delay of the decoder: LAME\'s, none, or the measure', () => {
    expect(decoderDelay([0.051, 0.049, 0.06], 22050)).toBeCloseTo(1105 / 22050, 9);
    expect(decoderDelay([0.002, -0.001, 0.004], 32000)).toBe(0);
    expect(decoderDelay([0.2, 0.21, 0.19], 32000)).toBeCloseTo(0.2, 9);
  });

  it('makes soft notes much softer', () => {
    expect(velocityGain(1)).toBe(1);
    expect(velocityGain(0.5)).toBeLessThan(0.4);
    expect(velocityGain(-1)).toBe(0);
  });
});

describe('the recorded instruments', () => {
  it('have their files, roots in order, and a loop in each sustained note', () => {
    expect(INSTRUMENT_IDS.length).toBeGreaterThan(30);
    for (const [id, inst] of Object.entries(INSTRUMENTS)) {
      expect(inst.samples.length, id).toBeGreaterThan(0);
      for (const s of inst.samples) {
        expect(s.file.startsWith(`${id}-`)).toBe(true);
        if (inst.kind === 'sustain') {
          expect(s.loop, s.file).toBeDefined();
          expect(s.loop![1] - s.loop![0], s.file).toBeGreaterThan(0.8);
        }
      }
      // In order of their notes (the round robins of a note may differ by a few cents).
      const roots = inst.samples.map((s) => s.root).filter((r) => r !== null).map((r) => Math.round(r!));
      expect([...roots].sort((a, b) => a - b), id).toEqual(roots);
    }
  });

  it('each has a level and a seat in the orchestra when it plays in the music', () => {
    for (const inst of KANDRAX_THEME.instruments) {
      expect(INSTRUMENTS[inst], inst).toBeDefined();
      expect(LEVELS[inst] ?? SEATING[inst] ?? 0.7, inst).toBeGreaterThan(-2);
    }
  });
});

describe('the theme of Kandrax', () => {
  it('has eight beats in each bar of each melody', () => {
    for (const melody of [MELODY_A, MELODY_B]) {
      expect(melody).toHaveLength(THEME_CHORDS.length);
      for (const [i, bar] of melody.entries()) {
        const notes = line('violins', bar);
        const last = notes[notes.length - 1]!;
        // The bar's beats: the last note's end, and a rest after it if the bar has one.
        const rest = /r:(\d+)$/.exec(bar);
        expect(last.beat + last.beats + (rest ? Number(rest[1]) : 0), `bar ${i}`).toBe(CHORD_BEATS);
      }
    }
  });

  it('plays every note within its instrument and near a recorded note', () => {
    for (let round = 0; round < 7; round++) {
      for (const note of themeNotes(round)) {
        expect(KANDRAX_THEME.instruments, note.inst).toContain(note.inst);
        expect(note.beat).toBeGreaterThanOrEqual(0);
        expect(note.beat).toBeLessThan(ROUND_BEATS);
        // A plucked or struck note may be tuned a little further than a held one (its sample is short).
        expect(distance(note.inst, note.midi), `${note.inst} ${note.midi} in round ${round}`).toBeLessThanOrEqual(INSTRUMENTS[note.inst]!.kind === 'once' ? 3.5 : 3);
      }
    }
  });

  it('starts with the low strings and the harp, then adds voices, and goes round', () => {
    const instruments = (round: number) => new Set(themeNotes(round).map((n) => n.inst));
    expect([...instruments(0)].every((i) => (THEME_FIRST as readonly string[]).includes(i))).toBe(true);
    expect(instruments(1).has('horn')).toBe(true);
    expect(instruments(4).has('oboe')).toBe(true);
    expect(instruments(2).has('choir')).toBe(true);
    expect(instruments(3).has('trumpetStac')).toBe(true);
    expect(themeRound(4)).toBe(1);
    expect(themeRound(6)).toBe(3);
  });

  it('plays in the prologue as an opening that goes round without the choir, and a rise that starts with it', () => {
    const sections = (track: typeof KANDRAX_OPENING, n: number) => {
      const next = track.compose();
      return Array.from({ length: n }, (_, i) => next(i, Math.random));
    };
    const insts = (notes: readonly { inst: string }[]) => new Set(notes.map((n) => n.inst));
    const opening = sections(KANDRAX_OPENING, 8);
    for (const section of opening) {
      expect([section.bpm, section.beats]).toEqual([KANDRAX_BPM, ROUND_BEATS]);
      // The choir and the violins' melody wait for the rise (Fede, 2026-10-13).
      expect(insts(section.notes).has('choir')).toBe(false);
      expect(insts(section.notes).has('trumpetStac')).toBe(false);
    }
    // The night, the horn, the oboe, the night again, the horn...
    expect([...insts(opening[0]!.notes)].every((i) => (THEME_FIRST as readonly string[]).includes(i))).toBe(true);
    expect(insts(opening[1]!.notes).has('horn')).toBe(true);
    expect(insts(opening[2]!.notes).has('oboe')).toBe(true);
    expect([...insts(opening[3]!.notes)].every((i) => (THEME_FIRST as readonly string[]).includes(i))).toBe(true);
    expect(insts(opening[4]!.notes).has('horn')).toBe(true);
    const rise = sections(KANDRAX_RISE, 3);
    expect(insts(rise[0]!.notes).has('choir')).toBe(true);
    expect(insts(rise[0]!.notes).has('violins')).toBe(true);
    // Its first instruments load early: the rise starts at once.
    for (const inst of insts(rise[0]!.notes)) expect(RISE_FIRST as readonly string[], inst).toContain(inst);
    expect(insts(rise[1]!.notes).has('trumpetStac')).toBe(true);
  });
});

describe('the sounds', () => {
  it('list their effects and ambiences, and the instruments of the effects are recorded', () => {
    expect(EFFECTS).toEqual(['whoosh', 'title', 'tick', 'click', 'end']);
    expect(AMBIENCES).toContain('forge');
    for (const inst of EFFECT_INSTRUMENTS) expect(INSTRUMENTS[inst], inst).toBeDefined();
  });

  it('a plucked string (synthesized) rings at its pitch and dies away', () => {
    const rate = 44100;
    const { samples, frequency } = pluckSamples(220, rate, 2);
    expect(Math.abs(frequency - 220)).toBeLessThan(2);
    const rms = (from: number, to: number) => Math.sqrt(samples.slice(from, to).reduce((s, v) => s + v * v, 0) / (to - from));
    expect(rms(0, rate * 0.2)).toBeGreaterThan(rms(rate * 1.5, rate * 2) * 3);
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
