/**
 * The instruments of the game's music and the samples of its sounds: which recordings
 * sounds/build.ts takes, and how it cuts them. The orchestra comes from the VS Chamber Orchestra 2
 * Community Edition (VSCO 2 CE, CC0: https://github.com/sgossner/VSCO-2-CE); the choir from the
 * FluidR3 GM soundfont by Frank Wen (CC BY 3.0, through https://github.com/gleitz/midi-js-soundfonts).
 *
 * A "sustain" instrument holds a note as long as the music wants (a loop in each sample); a "once"
 * instrument plays out (a pluck, a hit, a drum). Each sample is mono: the mixer pans it.
 */

export type SampleRate = 22050 | 32000 | 44100;

export type Source =
  | {
      readonly kind: 'vsco';
      /** The folder in the VSCO 2 CE repository. */
      readonly dir: string;
      /** The files of the folder to take. */
      readonly match: RegExp;
      /**
       * For each note, the first of these patterns that a file of the note matches wins (a dynamic,
       * a round robin): the others are left out.
       */
      readonly prefer?: readonly RegExp[];
      /** Octaves of the names: the name's note plus this is the sounding note (VSCO names some instruments an octave low). */
      readonly octave?: number;
    }
  | {
      readonly kind: 'fluid';
      /** The instrument of the FluidR3 GM soundfont (gleitz/midi-js-soundfonts). */
      readonly name: string;
    };

export interface InstrumentDef {
  readonly id: string;
  readonly source: Source;
  readonly kind: 'sustain' | 'once';
  /** The notes that the music plays on it (MIDI, sounding). Samples far outside are left out; a fluid source takes a note every `every`. */
  readonly range?: readonly [number, number];
  /** Keep a note only this many semitones (or more) above the last one kept. */
  readonly every?: number;
  /** Seconds of each sample, from its onset. */
  readonly seconds: number;
  /** For a sustain: where its loop starts, in seconds after the onset (after the attack). */
  readonly loopFrom?: number;
  /** The sample rate of the MP3. A dark, low instrument needs less. */
  readonly rate: SampleRate;
  /** Whether it has a pitch to measure. Without it (a drum), each file is a variant. */
  readonly pitched: boolean;
  /** At most this many files of each note (round robins: a note that repeats sounds a little different). */
  readonly variants?: number;
  /** The highest pitch to look for (Hz): the pitch of a high instrument. */
  readonly highHz?: number;
  /** 'name': the note of a sample is the one that its name says (a glockenspiel: its overtones mislead a measure). Default: measured. */
  readonly measure?: 'name';
}

const v = (dir: string, match: RegExp, rest: Omit<Extract<Source, { kind: 'vsco' }>, 'kind' | 'dir' | 'match'> = {}): Source => ({ kind: 'vsco', dir, match, ...rest });

export const INSTRUMENTS: readonly InstrumentDef[] = [
  // ------------------------------------------------------------ strings
  { id: 'violins', source: v('Strings/Violin Section/susVib', /_v1\.wav$/, { octave: 1 }), kind: 'sustain', range: [55, 88], every: 3, seconds: 2.9, loopFrom: 1.0, rate: 32000, pitched: true },
  { id: 'violas', source: v('Strings/Viola Section/susvib', /_v1_1\.wav$/, { octave: 1 }), kind: 'sustain', range: [48, 77], every: 3, seconds: 2.9, loopFrom: 1.0, rate: 32000, pitched: true },
  { id: 'celli', source: v('Strings/Cello Section/susvib', /_v1_1\.wav$/, { octave: 1 }), kind: 'sustain', range: [36, 69], every: 3, seconds: 2.9, loopFrom: 1.0, rate: 22050, pitched: true },
  { id: 'basses', source: v('Strings/Solo Contrabass/SusVib', /_v1_rr1\.wav$/, { octave: 1 }), kind: 'sustain', range: [28, 52], every: 3, seconds: 2.9, loopFrom: 1.0, rate: 22050, pitched: true },
  { id: 'violin', source: v('Strings/Solo Violin/Arco Vib', /_p\.wav$/), kind: 'sustain', range: [55, 90], every: 3, seconds: 2.9, loopFrom: 1.0, rate: 32000, pitched: true },
  { id: 'violinsTrem', source: v('Strings/Violin Section/Trem', /_v[12]\.wav$/, { octave: 1, prefer: [/_v1\./, /_v2\./] }), kind: 'sustain', range: [55, 88], every: 3, seconds: 2.6, loopFrom: 0.8, rate: 32000, pitched: true },
  { id: 'celliTrem', source: v('Strings/Cello Section/trem', /_v[12]_1\.wav$/, { octave: 1, prefer: [/_v1_/, /_v2_/] }), kind: 'sustain', range: [36, 64], every: 3, seconds: 2.6, loopFrom: 0.8, rate: 22050, pitched: true },
  { id: 'violinsSpic', source: v('Strings/Violin Section/Spic', /_v2_rr[12]\.wav$/, { octave: 1 }), kind: 'once', range: [55, 84], every: 3, seconds: 0.5, rate: 32000, pitched: true, variants: 2 },
  { id: 'celliSpic', source: v('Strings/Cello Section/spic', /_v2_RR[12]\.wav$/, { octave: 1 }), kind: 'once', range: [36, 64], every: 3, seconds: 0.5, rate: 22050, pitched: true, variants: 2 },
  { id: 'violinsPizz', source: v('Strings/Violin Section/Pizz', /_v2_rr1\.wav$/, { octave: 1 }), kind: 'once', range: [55, 86], every: 3, seconds: 1.0, rate: 32000, pitched: true },
  { id: 'celliPizz', source: v('Strings/Cello Section/pizzT', /_v2_RR1\.wav$/, { octave: 1 }), kind: 'once', range: [36, 64], every: 3, seconds: 1.3, rate: 22050, pitched: true },
  { id: 'harp', source: v('Strings/Harp', /\.wav$/), kind: 'once', range: [28, 96], every: 4, seconds: 2.8, rate: 32000, pitched: true, highHz: 3200 },
  // ------------------------------------------------------------ brass
  { id: 'horn', source: v('Brass/F Horn/sus', /_v[123]_1\.wav$/, { octave: 1, prefer: [/_v2_/, /_v1_/, /_v3_/] }), kind: 'sustain', range: [38, 77], every: 3, seconds: 2.9, loopFrom: 1.0, rate: 22050, pitched: true },
  { id: 'hornStac', source: v('Brass/F Horn/stac', /_v2_rr[12]\.wav$/, { octave: 1 }), kind: 'once', range: [38, 77], every: 3, seconds: 0.8, rate: 22050, pitched: true, variants: 2 },
  { id: 'trumpet', source: v('Brass/Trumpet/sus', /_v1_rr1\.wav$/, { octave: 1 }), kind: 'sustain', range: [55, 84], every: 3, seconds: 2.6, loopFrom: 0.9, rate: 32000, pitched: true },
  { id: 'trumpetStac', source: v('Brass/Trumpet/stac', /_v2_rr1\.wav$/, { octave: 1 }), kind: 'once', range: [55, 84], every: 3, seconds: 0.7, rate: 32000, pitched: true },
  { id: 'trombone', source: v('Brass/Tenor Trombone/sus', /_v[12]_1\.wav$/, { octave: 1, prefer: [/_v2_/, /_v1_/] }), kind: 'sustain', range: [34, 70], every: 3, seconds: 2.9, loopFrom: 1.0, rate: 22050, pitched: true },
  // ------------------------------------------------------------ woodwinds and keys
  { id: 'flute', source: v('Woodwinds/Flute/susvib', /_v1_1\.wav$/, { octave: 1 }), kind: 'sustain', range: [60, 96], every: 3, seconds: 2.6, loopFrom: 0.9, rate: 32000, pitched: true, highHz: 2600 },
  { id: 'oboe', source: v('Woodwinds/Oboe/Vib', /_v1_Main\.wav$/, { octave: 1 }), kind: 'sustain', range: [58, 89], every: 3, seconds: 2.6, loopFrom: 0.9, rate: 32000, pitched: true },
  { id: 'clarinet', source: v('Woodwinds/Clarinet/susLong', /_v2_rr1_sum\.wav$/, { octave: 1 }), kind: 'sustain', range: [50, 82], every: 3, seconds: 2.6, loopFrom: 0.9, rate: 32000, pitched: true },
  { id: 'organ', source: v('Keys/Organ/Quiet', /Man3Quiet_\d+_rr1\.wav$/), kind: 'sustain', range: [36, 84], every: 3, seconds: 2.6, loopFrom: 0.9, rate: 32000, pitched: true },
  { id: 'glock', source: v('Percussion/Glock', /\.wav$/, { octave: 1 }), kind: 'once', seconds: 2.4, rate: 44100, pitched: true, measure: 'name' },
  // ------------------------------------------------------------ the choir (FluidR3)
  { id: 'choir', source: { kind: 'fluid', name: 'choir_aahs' }, kind: 'sustain', range: [48, 81], every: 3, seconds: 2.6, loopFrom: 0.9, rate: 32000, pitched: true },
  { id: 'oohs', source: { kind: 'fluid', name: 'voice_oohs' }, kind: 'sustain', range: [55, 79], every: 3, seconds: 2.6, loopFrom: 0.9, rate: 32000, pitched: true },
  // ------------------------------------------------------------ percussion
  // The timpani: hits without a note (the modes of a drum head mislead a measure), the low drums first.
  { id: 'timpani', source: v('Percussion/Timpani', /^Timpani[1-4]_Hit_v3_rr1_Sum\.wav$/), kind: 'once', seconds: 3.0, rate: 22050, pitched: false },
  { id: 'timpaniSoft', source: v('Percussion/Timpani', /^Timpani[1-3]_Hit_v1_rr1_Sum\.wav$/), kind: 'once', seconds: 3.0, rate: 22050, pitched: false },
  { id: 'timpaniRoll', source: v('Percussion/Timpani/Rolls', /^Timpani[1-3]_Roll_v3_rr1_Sum\.wav$/), kind: 'once', seconds: 4.0, rate: 22050, pitched: false },
  { id: 'bassDrum', source: v('VSCO 1 Percussion/drums/bass', /^bdrum_(f|ff|mp)_1\.wav$/), kind: 'once', seconds: 2.4, rate: 22050, pitched: false },
  { id: 'bassDrumRoll', source: v('VSCO 1 Percussion/drums/bass', /^bdrum_roll1\.wav$/), kind: 'once', seconds: 5.0, rate: 22050, pitched: false },
  { id: 'taiko', source: v('VSCO 1 Percussion/drums/other/ethnic/giant/mallet', /_(ff_1|f_1|mf_1)\.wav$/), kind: 'once', seconds: 2.0, rate: 22050, pitched: false },
  { id: 'drumSticks', source: v('VSCO 1 Percussion/drums/other/ethnic/giant/sticks', /_(fff_1|f_1|mf_1)\.wav$/), kind: 'once', seconds: 1.2, rate: 32000, pitched: false },
  { id: 'snare', source: v('VSCO 1 Percussion/drums/snare/drum1', /^snare1_(f_1|f_2|ff_1)\.wav$/), kind: 'once', seconds: 0.7, rate: 32000, pitched: false },
  { id: 'tenorDrum', source: v('VSCO 1 Percussion/drums/tenor/tenor_lower', /^tenor_(f_1|mf_1|fff_1)\.wav$/), kind: 'once', seconds: 1.0, rate: 22050, pitched: false },
  { id: 'cymbal', source: v('VSCO 1 Percussion/varMetal/Cymbals/clash', /^crash_hit_(ff_loose|mp_loose)\.wav$/), kind: 'once', seconds: 3.5, rate: 44100, pitched: false },
  { id: 'cymbalSwell', source: v('VSCO 1 Percussion/varMetal/Cymbals/susp', /^susp_hit_softmall_roll\d?_cresc\.wav$/), kind: 'once', seconds: 7.0, rate: 32000, pitched: false },
  { id: 'cymbalBow', source: v('Percussion', /^susCymb\d-bow-1\.wav$/), kind: 'once', seconds: 5.0, rate: 32000, pitched: false },
  { id: 'gong', source: v('VSCO 1 Percussion/varMetal/Gong', /^gong_hit_(p|mf|f)\.wav$/), kind: 'once', seconds: 6.0, rate: 32000, pitched: false },
  { id: 'triangle', source: v('Percussion', /^Triangle3-Hit_v2_rr1_Sum\.wav$/), kind: 'once', seconds: 2.0, rate: 44100, pitched: false },
  { id: 'tambourine', source: v('Percussion', /^Tamb1-Hit_v\d_rr1_Sum\.wav$/), kind: 'once', seconds: 0.6, rate: 32000, pitched: false },
  { id: 'frameDrum', source: v('Miscellania Raw/Misc 2', /^rtomtom_frame2?\.wav$/), kind: 'once', seconds: 0.9, rate: 22050, pitched: false },
  { id: 'logDrum', source: v('Percussion', /^LogDrum(Hi|Lo)_MedM_v2_rr1_Sum\.wav$/), kind: 'once', seconds: 0.7, rate: 22050, pitched: false },
  { id: 'bells', source: v('Miscellania Raw/Misc 2/NepaleseBells', /^fx1_short_r0[1-4]_main\.wav$/), kind: 'once', seconds: 3.0, rate: 32000, pitched: false },
  { id: 'anvil', source: v('Percussion', /^Anvil_Hit1_v\d_Sum\.wav$/), kind: 'once', seconds: 1.4, rate: 32000, pitched: false },
];

/** The credits that the game shows for its sounds (the settings' "Sound" section). */
export const CREDITS = [
  'VS Chamber Orchestra 2 Community Edition (Versilian Studios, CC0)',
  'FluidR3 GM by Frank Wen (CC BY 3.0)',
] as const;
