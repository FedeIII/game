/**
 * The music of the Wilds (the woods, the roads): slow pieces in D minor, at 58 beats a minute, that a
 * composer puts together anew each time. A piece is four sections of four chords (eight beats each:
 * about 33 s a section): an opening of low strings and a harp, two sections where a soloist (a
 * clarinet, a solo violin, a flute, an oboe or the celli) sings phrases over them, and a close. Now
 * and then the soloist sings melody A of the theme of Kandrax over its chords. After a piece comes a
 * silence of one or two sections, with only the sounds of the place: music all the time tires.
 */
import { chord, hits, line, type Composer, type ScoreNote, type Section } from '../music.ts';
import { CHORDS, cellFor, pick, silence } from './common.ts';
import { MELODY_A } from './kandrax.ts';

export const WILDS_BPM = 58;
const SECTION_BEATS = 32;

/** Four chords for a piece. The first is the theme's (its melody fits it). */
export const WILDS_PROGRESSIONS: readonly (readonly string[])[] = [
  ['Dm', 'Bb', 'Gm', 'A'],
  ['Dm', 'C', 'Bb', 'A'],
  ['Dm', 'F', 'C', 'Dm'],
  ['Gm', 'Dm', 'Eb', 'Dm'],
  ['Dm', 'Am', 'Bb', 'Dm'],
];

/** The soloists, and how far each one moves the phrases (written around A4). */
export const WILDS_SOLOISTS: readonly { readonly inst: string; readonly shift: number; readonly vel: number }[] = [
  { inst: 'clarinet', shift: 0, vel: 0.55 },
  { inst: 'violin', shift: 0, vel: 0.5 },
  { inst: 'flute', shift: 12, vel: 0.5 },
  { inst: 'oboe', shift: 0, vel: 0.5 },
  { inst: 'celli', shift: -12, vel: 0.55 },
];

export const WILDS_INSTRUMENTS = ['basses', 'celli', 'violas', 'harp', 'violins', 'clarinet', 'violin', 'flute', 'oboe', 'timpaniSoft'] as const;
export const WILDS_FIRST = ['basses', 'celli', 'violas', 'harp'] as const;

type Part = 'open' | 'a' | 'b' | 'close';

/** The notes of one section of a piece. */
export function wildsSection(part: Part, chords: readonly string[], soloist: (typeof WILDS_SOLOISTS)[number], motif: boolean, random: () => number): ScoreNote[] {
  const notes: ScoreNote[] = [];
  const soft = part === 'open' || part === 'close';
  chords.forEach((name, i) => {
    const c = CHORDS[name]!;
    const at = i * 8;
    notes.push(...line('basses', `${c.bass}:8`, at, { vel: soft ? 0.32 : 0.38, attack: 1.2, release: 1.5 }));
    if (!(part === 'open' && i === 0)) notes.push(...chord('violas', `${c.pad[0]} ${c.pad[1]}`, at, 8, { vel: 0.3, attack: 2, release: 2 }));
    if (soloist.inst !== 'celli' && (soft || i % 2 === 0)) notes.push(...line('celli', `${c.cello}:8`, at, { vel: 0.34, attack: 1.4, release: 1.5 }));
    if (part === 'b') notes.push(...line('violins', `${c.top}:8`, at, { vel: 0.27, attack: 2.2, release: 2, shift: 12 }));
    // The harp: four notes up, at a free moment of the chord (not always).
    if (random() < (part === 'close' ? 0.5 : 0.75)) {
      const from = at + pick([0, 2, 4], random);
      notes.push(...line('harp', c.arp.map((n) => `${n}:1`).join(' '), from, { vel: 0.42 }));
    }
    // The soloist.
    if (part === 'a' || part === 'b') {
      const phrase = motif && part === 'a' ? MELODY_A[i]! : random() < 0.75 ? cellFor(name, random) : null;
      if (phrase) notes.push(...line(soloist.inst, phrase, at, { vel: soloist.vel, attack: 0.12, hold: 1.04, release: 0.6, shift: soloist.shift }));
    }
  });
  if (part === 'a' && random() < 0.5) notes.push(...hits('timpaniSoft', [0], 0.3));
  return notes;
}

/** A composer of the Wilds: pieces and silences, each piece with its own chords and soloist. */
export function wildsComposer(): Composer {
  const parts: Part[] = ['open', 'a', 'b', 'close'];
  let chords: readonly string[] = WILDS_PROGRESSIONS[0]!;
  let soloist = WILDS_SOLOISTS[0]!;
  let motif = false;
  let step = 0;
  let rest = 0;
  return (_index, random): Section => {
    if (rest > 0) {
      rest--;
      return silence(WILDS_BPM, SECTION_BEATS);
    }
    if (step === 0) {
      chords = pick(WILDS_PROGRESSIONS, random);
      soloist = pick(WILDS_SOLOISTS, random);
      // The theme's melody comes back now and then, over the theme's chords.
      motif = chords === WILDS_PROGRESSIONS[0] && random() < 0.6;
    }
    const part = parts[step]!;
    step = (step + 1) % parts.length;
    if (step === 0) rest = random() < 0.5 ? 1 : 2;
    return { bpm: WILDS_BPM, beats: SECTION_BEATS, notes: wildsSection(part, chords, soloist, motif, random) };
  };
}
