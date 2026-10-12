/**
 * The music of the game: tracks that the audio engine (audio/audio.ts) plays, a little ahead of the
 * clock. A track is a pattern of instruments (audio/synth.ts) that never ends: it schedules its notes
 * as the time comes.
 *
 * The theme of Kandrax (the prologue, 2026-10-12): dark and slow, as the music of Fede's tables (the
 * `RPG - Music` notes on the Drive: "Lost City" for the intro). D minor, 64 beats a minute, four
 * chords of eight beats (Dm, Bb, Gm, A: 30 seconds), again and again, and each time round a voice more:
 * a drone, pads and a harp; then a flute and bells; then a choir and a second melody; then the melody
 * an octave higher.
 */
import { frequencyOf, hz, midi } from './notes.ts';
import { bell, boom, choir, flute, pad, pluck } from './synth.ts';

/** Something that plays over time: it schedules what starts before `until` (seconds of the context). */
export interface Pattern {
  schedule(ctx: BaseAudioContext, out: AudioNode, until: number): void;
}

/** A piece of music: from a start time, a pattern that goes on until the engine stops it. */
export interface MusicTrack {
  readonly id: string;
  start(t0: number): Pattern;
}

const BPM = 64;
const BEAT = 60 / BPM;
/** A chord lasts eight beats. */
export const CHORD_BEATS = 8;

interface Chord {
  readonly pad: readonly string[];
  /** The harp: eight notes, played twice over the chord. */
  readonly arp: readonly string[];
  readonly bass: string;
  readonly choir: readonly string[];
  readonly bell: string;
}

export const THEME_CHORDS: readonly Chord[] = [
  { pad: ['D3', 'F3', 'A3'], arp: ['D3', 'A3', 'D4', 'F4', 'A4', 'F4', 'D4', 'A3'], bass: 'D2', choir: ['D4', 'F4', 'A4'], bell: 'D6' },
  { pad: ['Bb2', 'D3', 'F3'], arp: ['Bb2', 'F3', 'Bb3', 'D4', 'F4', 'D4', 'Bb3', 'F3'], bass: 'Bb1', choir: ['D4', 'F4', 'Bb4'], bell: 'F6' },
  { pad: ['G2', 'Bb2', 'D3'], arp: ['G2', 'D3', 'G3', 'Bb3', 'D4', 'Bb3', 'G3', 'D3'], bass: 'G1', choir: ['D4', 'G4', 'Bb4'], bell: 'D6' },
  { pad: ['A2', 'C#3', 'E3'], arp: ['A2', 'E3', 'A3', 'C#4', 'E4', 'C#4', 'A3', 'E3'], bass: 'A1', choir: ['C#4', 'E4', 'A4'], bell: 'E6' },
];

/** The two melodies: for each chord, notes and their beats (null: a rest), eight beats in all. */
export const THEME_MELODIES: readonly (readonly (readonly [string | null, number])[])[][] = [
  [
    [
      ['A4', 2],
      ['F4', 1],
      ['G4', 1],
      ['A4', 3],
      [null, 1],
    ],
    [
      ['Bb4', 2],
      ['A4', 1],
      ['G4', 1],
      ['F4', 3],
      [null, 1],
    ],
    [
      ['G4', 2],
      ['F4', 1],
      ['E4', 1],
      ['D4', 3],
      [null, 1],
    ],
    [
      ['E4', 2],
      ['C#5', 2],
      ['A4', 4],
    ],
  ],
  [
    [
      ['D5', 3],
      ['E5', 1],
      ['F5', 2],
      ['E5', 1],
      ['D5', 1],
    ],
    [
      ['D5', 2],
      ['C5', 1],
      ['Bb4', 1],
      ['A4', 4],
    ],
    [
      ['Bb4', 2],
      ['A4', 1],
      ['G4', 1],
      ['F4', 2],
      ['E4', 2],
    ],
    [
      ['C#5', 2],
      ['E5', 2],
      ['A4', 4],
    ],
  ],
];

/** What plays in a round of the four chords: the first round is quiet, the next ones add voices, and then they go round. */
export function themeRound(round: number): { melody: number | null; octave: number; bells: boolean; choir: boolean } {
  const r = round === 0 ? 0 : 1 + ((round - 1) % 3);
  if (r === 0) return { melody: null, octave: 0, bells: false, choir: false };
  if (r === 1) return { melody: 0, octave: 0, bells: true, choir: false };
  if (r === 2) return { melody: 1, octave: 0, bells: true, choir: true };
  return { melody: 0, octave: 12, bells: true, choir: true };
}

/** One chord of the theme, from time `t`. */
function themeChord(ctx: BaseAudioContext, out: AudioNode, t: number, index: number): void {
  const chord = THEME_CHORDS[index % THEME_CHORDS.length]!;
  const position = index % THEME_CHORDS.length;
  const round = themeRound(Math.floor(index / THEME_CHORDS.length));
  const length = CHORD_BEATS * BEAT;
  // A drone of D and A under the whole round, and a deep drum at its start.
  if (position === 0) {
    pad(ctx, out, t, length * THEME_CHORDS.length, [hz('D2'), hz('A2')], 0.032, 420, 4, 4);
    boom(ctx, out, t, 0.28, 52, 3);
  }
  if (position === 3) boom(ctx, out, t, 0.14, 55, 2.2);
  pad(ctx, out, t, length - 0.5, chord.pad.map(hz), 0.034, 950);
  // The harp: the chord up and down, twice, in eighths; the first of each four a little stronger.
  const harp = position === 0 && round.octave === 12 ? [...chord.arp].reverse() : chord.arp;
  for (let i = 0; i < CHORD_BEATS * 2; i++) {
    const note = harp[i % harp.length]!;
    pluck(ctx, out, t + i * BEAT * 0.5, hz(note), i % 4 === 0 ? 0.2 : 0.13, i % 2 === 0 ? -0.3 : 0.3, 0.5);
  }
  pluck(ctx, out, t, hz(chord.bass), 0.32, 0, 0.3);
  pluck(ctx, out, t + 4 * BEAT, hz(chord.bass), 0.2, 0, 0.3);
  if (round.choir) choir(ctx, out, t, length - 0.6, chord.choir.map(hz), 0.02);
  if (round.bells) {
    bell(ctx, out, t + 0.02, hz(chord.bell), 0.03, 5, -0.4);
    bell(ctx, out, t + 4 * BEAT, frequencyOf(midi(chord.bell) - 5), 0.02, 4, 0.4);
  }
  if (round.melody !== null) {
    let at = t;
    for (const [note, beats] of THEME_MELODIES[round.melody]![position]!) {
      if (note) flute(ctx, out, at, beats * BEAT * 0.94, frequencyOf(midi(note) + round.octave), round.octave ? 0.06 : 0.075, 0.1);
      at += beats * BEAT;
    }
  }
}

/** The theme of Kandrax (the prologue). */
export const KANDRAX_THEME: MusicTrack = {
  id: 'kandrax',
  start(t0: number): Pattern {
    let index = 0;
    let next = t0;
    return {
      schedule(ctx, out, until) {
        while (next < until) {
          themeChord(ctx, out, next, index);
          index++;
          next += CHORD_BEATS * BEAT;
        }
      },
    };
  },
};

/** The length of a round of the theme (seconds): four chords. */
export const THEME_ROUND_SECONDS = THEME_CHORDS.length * CHORD_BEATS * BEAT;
