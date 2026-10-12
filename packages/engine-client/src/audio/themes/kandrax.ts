/**
 * The theme of Kandrax (the prologue; 2026-10-12, on the recorded orchestra since the same day): D
 * minor, 66 beats a minute, four chords of eight beats (Dm, Bb, Gm, A: a round of about 29 s), again
 * and again, and each round a little fuller:
 *   round 0  the low strings, a harp and the timpani: the night
 *   round 1  melody A on a French horn, an octave down (an oboe the next time round) over the strings
 *   round 2  melody B on the violins, the choir, the horn in the middle, the celli against them
 *   round 3  everyone: melody A an octave up on the violins and the flute, horns, trombones,
 *            trumpets on the last chord, drums and a cymbal
 * then rounds 1 to 3 again, with other colours.
 */
import { chord, hits, line, scoreTrack, type ScoreNote, type Section } from '../music.ts';

export const KANDRAX_BPM = 66;
/** A chord lasts eight beats; a round is four chords. */
export const CHORD_BEATS = 8;
export const ROUND_BEATS = 4 * CHORD_BEATS;

interface Chord {
  readonly bass: string;
  readonly cello: string;
  /** The middle strings: violas take the two low notes, violins the top one. */
  readonly pad: readonly [string, string, string];
  /** The harp: eight notes, up and down, twice over the chord. */
  readonly arp: string;
  readonly choir: string;
  readonly choirHigh: string;
  readonly bell: string;
}

export const THEME_CHORDS: readonly Chord[] = [
  { bass: 'D2', cello: 'D3', pad: ['F3', 'A3', 'D4'], arp: 'D3 A3 D4 F4 A4 F4 D4 A3', choir: 'D4 F4 A4', choirHigh: 'F4 A4 D5', bell: 'D6' },
  { bass: 'Bb1', cello: 'Bb2', pad: ['F3', 'Bb3', 'D4'], arp: 'Bb2 F3 Bb3 D4 F4 D4 Bb3 F3', choir: 'D4 F4 Bb4', choirHigh: 'F4 Bb4 D5', bell: 'F6' },
  { bass: 'G1', cello: 'G2', pad: ['G3', 'Bb3', 'D4'], arp: 'G2 D3 G3 Bb3 D4 Bb3 G3 D3', choir: 'D4 G4 Bb4', choirHigh: 'G4 Bb4 D5', bell: 'D6' },
  { bass: 'A1', cello: 'A2', pad: ['E3', 'A3', 'C#4'], arp: 'A2 E3 A3 C#4 E4 C#4 A3 E3', choir: 'C#4 E4 A4', choirHigh: 'E4 A4 C#5', bell: 'E6' },
];

/** The two melodies, one bar of eight beats for each chord. */
export const MELODY_A: readonly string[] = ['A4:2 F4:1 G4:1 A4:3 r:1', 'Bb4:2 A4:1 G4:1 F4:3 r:1', 'G4:2 F4:1 E4:1 D4:3 r:1', 'E4:2 C#5:2 A4:4'];
export const MELODY_B: readonly string[] = ['D5:3 E5:1 F5:2 E5:1 D5:1', 'D5:2 C5:1 Bb4:1 A4:4', 'Bb4:2 A4:1 G4:1 F4:2 E4:2', 'C#5:2 E5:2 A4:4'];
/** A third under melody A: the horns' line in the last round. */
const MELODY_A_LOW: readonly string[] = ['F4:2 D4:1 E4:1 F4:3 r:1', 'G4:2 F4:1 E4:1 D4:3 r:1', 'E4:2 D4:1 C#4:1 A3:3 r:1', 'C#4:2 E4:2 C#4:4'];
/** The celli against melody B. */
const CELLO_COUNTER: readonly string[] = ['D3:4 C3:4', 'Bb2:4 D3:4', 'G2:4 A2:2 Bb2:2', 'A2:4 E3:2 C#3:2'];

/** What a round has: 0 is the first; then 1, 2, 3 go round. */
export function themeRound(round: number): 0 | 1 | 2 | 3 {
  return round === 0 ? 0 : ((1 + ((round - 1) % 3)) as 1 | 2 | 3);
}

/** The instruments of the theme: the first ones start it (round 0), the others load meanwhile. */
export const THEME_FIRST = ['basses', 'celli', 'violas', 'harp', 'timpaniSoft', 'timpaniRoll'] as const;
export const THEME_INSTRUMENTS = [...THEME_FIRST, 'violins', 'horn', 'oboe', 'flute', 'choir', 'oohs', 'glock', 'trombone', 'trumpetStac', 'trumpet', 'timpani', 'bassDrum', 'cymbal', 'cymbalSwell'] as const;

/** The notes of a round. */
export function themeNotes(round: number): ScoreNote[] {
  const kind = themeRound(round);
  /** The cycle of rounds 1 to 3: odd cycles have other colours. */
  const cycle = round === 0 ? 0 : Math.floor((round - 1) / 3);
  const notes: ScoreNote[] = [];
  THEME_CHORDS.forEach((c, i) => {
    const at = i * CHORD_BEATS;
    const loud = kind === 3;
    // The ground: the basses' root, the celli an octave up (a line of their own in round 2).
    notes.push(...line('basses', `${c.bass}:8`, at, { vel: loud ? 0.75 : 0.55, attack: 0.25, release: 0.8 }));
    if (kind === 2) notes.push(...line('celli', CELLO_COUNTER[i]!, at, { vel: 0.6, attack: 0.12, hold: 1.02 }));
    else notes.push(...line('celli', `${c.cello}:8`, at, { vel: loud ? 0.7 : 0.5, attack: kind === 0 ? 0.6 : 0.3, release: 0.8 }));
    // The middle: violas always; violins on the top note from round 1, when they do not sing.
    notes.push(...chord('violas', `${c.pad[0]} ${c.pad[1]}`, at, 8, { vel: kind === 0 ? 0.4 : 0.5, attack: 0.7, release: 1 }));
    if (kind === 1) notes.push(...line('violins', `${c.pad[2]}:8`, at, { vel: 0.42, attack: 0.9, release: 1 }));
    // The harp, up and down in eighths; the first of each four a little stronger. In the last round it runs up.
    const arp = c.arp.split(' ');
    for (let k = 0; k < 16; k++) {
      const note = loud && i === 0 ? [...arp].reverse()[k % 8]! : arp[k % 8]!;
      notes.push(...line('harp', `${note}:0.5`, at + k * 0.5, { vel: k % 4 === 0 ? 0.62 : 0.48, hold: 4 }));
    }
    // The melodies.
    if (kind === 1) {
      // The horn sings it an octave down, where it is warm (and where it was recorded); the oboe as written.
      const horn = cycle % 2 === 0;
      notes.push(...line(horn ? 'horn' : 'oboe', MELODY_A[i]!, at, { vel: horn ? 0.7 : 0.62, attack: 0.05, hold: 1.03, release: 0.4, shift: horn ? -12 : 0 }));
      // The flute answers the last bar an octave up.
      if (i === 3) notes.push(...line('flute', 'E5:2 C#6:2 A5:4', at, { vel: 0.5, attack: 0.08, hold: 1.02 }));
    }
    if (kind === 2) {
      notes.push(...line('violins', MELODY_B[i]!, at, { vel: 0.64, attack: 0.08, hold: 1.04, release: 0.5 }));
      notes.push(...chord(cycle % 2 === 0 ? 'choir' : 'oohs', c.choir, at, 8, { vel: 0.5, attack: 1.0, release: 1.2 }));
      notes.push(...line('horn', `${c.pad[1]}:8`, at, { vel: 0.45, attack: 0.5, release: 0.8 }));
      notes.push(...line('glock', `${c.bell}:4`, at, { vel: 0.4 }));
    }
    if (kind === 3) {
      notes.push(...line('violins', MELODY_A[i]!, at, { vel: 0.78, attack: 0.05, hold: 1.03, release: 0.5, shift: 12 }));
      notes.push(...line('flute', MELODY_A[i]!, at, { vel: 0.55, attack: 0.05, hold: 1.02, shift: 12 }));
      notes.push(...line('horn', MELODY_A_LOW[i]!, at, { vel: 0.72, attack: 0.05, hold: 1.03, shift: -12 }));
      notes.push(...line('trombone', `${c.cello}:8`, at, { vel: 0.55, attack: 0.3, release: 0.8 }));
      notes.push(...chord('choir', c.choirHigh, at, 8, { vel: 0.6, attack: 0.6, release: 1.2 }));
      notes.push(...hits('timpani', [at], 0.85));
      if (i === 3) {
        // Trumpets on the last chord: a call, then a held A.
        notes.push(...line('trumpetStac', 'A4:0.5 A4:0.5 A4:1 E5:2', at, { vel: 0.7 }));
        notes.push(...line('trumpet', 'A4:4', at + 4, { vel: 0.55, attack: 0.15, release: 0.6 }));
      }
    }
    // The timpani: soft on the first and the last chord at first, on every chord later.
    if (kind === 0 && (i === 0 || i === 3)) notes.push(...hits('timpaniSoft', [at], 0.55));
    if (kind === 1 || kind === 2) notes.push(...hits('timpaniSoft', [at], 0.6));
  });
  // The start and the end of a round.
  if (kind === 0) notes.push(...hits('timpaniRoll', [0], 0.45));
  if (kind === 2) {
    // A roll and a cymbal that swell into the last round.
    notes.push(...hits('timpaniRoll', [ROUND_BEATS - 4], 0.7));
    notes.push(...hits('cymbalSwell', [ROUND_BEATS - 7.5], 0.6));
  }
  if (kind === 3) {
    notes.push(...hits('cymbal', [0], 0.75));
    notes.push(...hits('bassDrum', [0, 2 * CHORD_BEATS], 0.7));
  }
  return notes;
}

export function themeSection(round: number): Section {
  return { bpm: KANDRAX_BPM, beats: ROUND_BEATS, notes: themeNotes(round) };
}

/** The theme of Kandrax. */
export const KANDRAX_THEME = scoreTrack('kandrax', THEME_INSTRUMENTS, () => (index) => themeSection(index), { first: THEME_FIRST });

/** The length of a round of the theme (s). */
export const THEME_ROUND_SECONDS = (ROUND_BEATS * 60) / KANDRAX_BPM;
