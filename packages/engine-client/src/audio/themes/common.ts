/**
 * What the pieces of the game share (audio/themes/*.ts): the chords of D minor and its neighbours,
 * voiced for the sections of the orchestra, and short phrases that fit each chord, for a soloist to
 * put together in a new order each time.
 */
import type { ScoreNote, Section } from '../music.ts';
import { midi } from '../notes.ts';

/** A chord, voiced for the orchestra: the basses' root, the celli an octave up, two notes for the violas, a top note, and a harp's arpeggio. */
export interface Voicing {
  readonly bass: string;
  readonly cello: string;
  readonly pad: readonly [string, string];
  readonly top: string;
  /** Four notes up from the root, for the harp. */
  readonly arp: readonly [string, string, string, string];
  /** The notes of the chord for a choir. */
  readonly choir: string;
}

export const CHORDS: Readonly<Record<string, Voicing>> = {
  Dm: { bass: 'D2', cello: 'D3', pad: ['F3', 'A3'], top: 'D4', arp: ['D3', 'A3', 'D4', 'F4'], choir: 'D4 F4 A4' },
  D: { bass: 'D2', cello: 'D3', pad: ['F#3', 'A3'], top: 'D4', arp: ['D3', 'A3', 'D4', 'F#4'], choir: 'D4 F#4 A4' },
  Bb: { bass: 'Bb1', cello: 'Bb2', pad: ['F3', 'Bb3'], top: 'D4', arp: ['Bb2', 'F3', 'Bb3', 'D4'], choir: 'D4 F4 Bb4' },
  Gm: { bass: 'G1', cello: 'G2', pad: ['G3', 'Bb3'], top: 'D4', arp: ['G2', 'D3', 'G3', 'Bb3'], choir: 'D4 G4 Bb4' },
  G: { bass: 'G1', cello: 'G2', pad: ['G3', 'B3'], top: 'D4', arp: ['G2', 'D3', 'G3', 'B3'], choir: 'D4 G4 B4' },
  A: { bass: 'A1', cello: 'A2', pad: ['E3', 'A3'], top: 'C#4', arp: ['A2', 'E3', 'A3', 'C#4'], choir: 'C#4 E4 A4' },
  Am: { bass: 'A1', cello: 'A2', pad: ['E3', 'A3'], top: 'C4', arp: ['A2', 'E3', 'A3', 'C4'], choir: 'C4 E4 A4' },
  C: { bass: 'C2', cello: 'C3', pad: ['E3', 'G3'], top: 'C4', arp: ['C3', 'G3', 'C4', 'E4'], choir: 'C4 E4 G4' },
  F: { bass: 'F1', cello: 'F2', pad: ['F3', 'A3'], top: 'C4', arp: ['F2', 'C3', 'F3', 'A3'], choir: 'C4 F4 A4' },
  Eb: { bass: 'Eb2', cello: 'Eb3', pad: ['G3', 'Bb3'], top: 'Eb4', arp: ['Eb3', 'Bb3', 'Eb4', 'G4'], choir: 'Eb4 G4 Bb4' },
  Cm: { bass: 'C2', cello: 'C3', pad: ['Eb3', 'G3'], top: 'C4', arp: ['C3', 'G3', 'C4', 'Eb4'], choir: 'C4 Eb4 G4' },
  Bm: { bass: 'B1', cello: 'B2', pad: ['F#3', 'B3'], top: 'D4', arp: ['B2', 'F#3', 'B3', 'D4'], choir: 'D4 F#4 B4' },
  'F#m': { bass: 'F#1', cello: 'F#2', pad: ['F#3', 'A3'], top: 'C#4', arp: ['F#2', 'C#3', 'F#3', 'A3'], choir: 'C#4 F#4 A4' },
};

/**
 * Phrases of eight beats that fit a chord, around the fourth and fifth octaves (a soloist moves them
 * to its own register). A dark modal D minor: the notes of the chord, and steps between them.
 */
export const CELLS: Readonly<Record<string, readonly string[]>> = {
  Dm: ['A4:3 G4:1 F4:2 E4:2', 'D5:4 C5:2 A4:2', 'F4:2 G4:2 A4:4', 'A4:2 D5:2 C5:1 Bb4:1 A4:2', 'D4:2 F4:2 E4:1 D4:1 A4:2', 'F5:3 E5:1 D5:4'],
  Bb: ['Bb4:3 A4:1 F4:4', 'D5:4 C5:2 Bb4:2', 'F4:2 G4:2 Bb4:4', 'D4:2 F4:2 Bb4:3 A4:1'],
  Gm: ['G4:3 F4:1 D4:4', 'Bb4:2 A4:2 G4:4', 'D5:4 Bb4:4', 'G4:2 Bb4:2 D5:2 C5:1 Bb4:1'],
  A: ['E4:2 C#5:2 A4:4', 'A4:4 G4:2 E4:2', 'C#5:3 D5:1 E5:4', 'E5:2 D5:1 C#5:1 A4:4'],
  C: ['G4:3 F4:1 E4:4', 'C5:4 G4:4', 'E4:2 G4:2 C5:2 Bb4:2'],
  F: ['A4:3 G4:1 F4:4', 'C5:2 A4:2 F4:4', 'F4:2 A4:2 C5:4'],
  Am: ['E4:3 D4:1 C4:4', 'A4:4 E4:4', 'C5:2 B4:2 A4:4'],
  Eb: ['G4:4 Eb4:4', 'Bb4:3 G4:1 Eb4:4', 'Eb5:2 D5:2 Bb4:4'],
  Cm: ['Eb4:2 D4:1 C4:1 D4:4', 'G4:4 Eb4:4', 'C5:3 Bb4:1 G4:4'],
};

/** A phrase for `chord`, chosen with `random` (none for a chord without phrases). */
export function cellFor(chord: string, random: () => number): string | null {
  const cells = CELLS[chord];
  return cells ? cells[Math.floor(random() * cells.length)]! : null;
}

export function pick<T>(list: readonly T[], random: () => number): T {
  return list[Math.floor(random() * list.length)]!;
}

/** A section with no notes: a silence between pieces. */
export function silence(bpm: number, beats: number): Section {
  return { bpm, beats, notes: [] };
}

/** The lowest and the highest note of some notes (null when there are none). */
export function span(notes: readonly ScoreNote[]): [number, number] | null {
  const pitched = notes.map((n) => n.midi).filter((m): m is number => m !== null);
  return pitched.length ? [Math.min(...pitched), Math.max(...pitched)] : null;
}

/** Semitones that move a phrase written around `from` to sit around `to` (whole octaves). */
export function octavesTo(from: string, to: string): number {
  return 12 * Math.round((midi(to) - midi(from)) / 12);
}
