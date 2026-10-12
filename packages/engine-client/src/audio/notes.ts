/**
 * Notes and chords for the music of the game (audio/music.ts): pure functions, so the tests run in
 * Node. A note is a name with an octave ("D3", "Bb4", "F#2"); A4 is 440 Hz, in equal temperament.
 */

const STEPS: Readonly<Record<string, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** The MIDI number of a note ("A4" is 69). */
export function midi(note: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(note);
  if (!m) throw new Error(`bad note "${note}"`);
  const [, letter, accidental, octave] = m;
  return 12 * (Number(octave) + 1) + STEPS[letter!]! + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);
}

/** The frequency of a MIDI number (Hz). */
export function frequencyOf(n: number): number {
  return 440 * 2 ** ((n - 69) / 12);
}

/** The frequency of a note (Hz). */
export function hz(note: string): number {
  return frequencyOf(midi(note));
}
