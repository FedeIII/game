/**
 * The night forms of the music of the places (2026-10-13, Fede's choice: the music follows the hour).
 * At night a place plays its own piece, softer and slower: a slower tempo, softer notes, fewer
 * instruments, and more silence. The pieces stay the same, so a place keeps its music; only its hour
 * changes. audio/game-music.ts makes a track of each (`<mood>-night`).
 */
import type { Composer, Section } from '../music.ts';
import type { PlaceMood } from '../director.ts';
import { silence } from './common.ts';
import { WILDS_SOLOISTS, wildsComposer } from './wilds.ts';

/** How a piece changes at night. */
export interface NightForm {
  /** The tempo, as a share of the day's. */
  readonly tempo: number;
  /** The loudness of every note, as a share of the day's. */
  readonly vel: number;
  /** The instruments that do not play at night. */
  readonly drop?: readonly string[];
  /** A share of loudness for some instruments, on top of `vel`. */
  readonly soften?: Readonly<Record<string, number>>;
  /** A silence of `beats` after every `every` sections (beside the silences of the piece). */
  readonly rest?: { readonly every: number; readonly beats: number };
  /** The level of the track, as a share of the day's. */
  readonly level?: number;
  /** Another composer for the night (the Wilds: their quieter soloists), in place of the day's. */
  readonly compose?: () => Composer;
}

/** The soloists of the Wilds at night: the darker voices (the clarinet, the solo violin, the celli). */
export const NIGHT_SOLOISTS = WILDS_SOLOISTS.filter((s) => ['clarinet', 'violin', 'celli'].includes(s.inst));

export const NIGHT_FORMS: Readonly<Record<PlaceMood, NightForm>> = {
  // The woods: no high violins and no timpani, the darker soloists, and two or three sections of silence after a piece.
  wilds: { tempo: 0.9, vel: 0.85, drop: ['violins', 'timpaniSoft', 'flute', 'oboe'], level: 0.9, compose: () => wildsComposer({ soloists: NIGHT_SOLOISTS, rests: [2, 3] }) },
  // Ironhold asleep: the fiddle and the clarinet over the harp and the plucked celli, a soft drum, no tambourine.
  town: { tempo: 0.84, vel: 0.8, drop: ['tambourine', 'flute'], soften: { frameDrum: 0.55 }, rest: { every: 2, beats: 16 } },
  // Silverspring: the harp and the flute, the violas; no oboe and no glockenspiel.
  haven: { tempo: 0.86, vel: 0.82, drop: ['oboe', 'glock'] },
  // The hut: the lullaby on the clarinet only, slower.
  home: { tempo: 0.87, vel: 0.85, drop: ['violin'] },
  // The chapel: the organ, and the voices further away.
  chapel: { tempo: 0.88, vel: 0.82, soften: { oohs: 0.75 } },
  // The burned homesteads: the drone, the voices and the celli; no solo violin.
  ruins: { tempo: 0.89, vel: 0.92, drop: ['violin'] },
  // A camp at night: softer drums, no trombone and no cymbal.
  camp: { tempo: 0.89, vel: 0.8, drop: ['trombone', 'cymbalBow'], soften: { taiko: 0.7, logDrum: 0.8 } },
  // The shrine: no glockenspiel, softer bells and gong.
  shrine: { tempo: 0.88, vel: 0.85, drop: ['glock'], soften: { bells: 0.8, gong: 0.8 } },
};

/** A composer of a piece's night form: the day's sections, slower and softer, without the dropped instruments. */
export function nightComposer(compose: () => Composer, form: NightForm): () => Composer {
  const drop = new Set(form.drop ?? []);
  return () => {
    const day = compose();
    let dayIndex = 0;
    let count = 0;
    let bpm = 60;
    return (_index, random): Section => {
      const n = count++;
      if (form.rest && n % (form.rest.every + 1) === form.rest.every) return silence(bpm, form.rest.beats);
      const section = day(dayIndex++, random);
      bpm = section.bpm * form.tempo;
      return {
        bpm,
        beats: section.beats,
        notes: section.notes.filter((note) => !drop.has(note.inst)).map((note) => ({ ...note, vel: Math.max(0.05, note.vel * form.vel * (form.soften?.[note.inst] ?? 1)) })),
      };
    };
  };
}
