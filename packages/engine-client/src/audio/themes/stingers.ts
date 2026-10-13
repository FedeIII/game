/**
 * Short pieces for moments of the game (audio/director.ts plays them over the music, which steps
 * back for them):
 *   discover     a place seen for the first time: awe. A choir and the violins open on D major, a
 *                horn calls, a harp runs up, a glockenspiel and a soft gong
 *   questStart   a quest begins: a horn call over a timpani
 *   questStep    a quest moves on (something learned): a harp and a glockenspiel, voices under them
 *   questEnd     a quest ends: a fanfare of trumpets and horns in D major, timpani and a cymbal
 *   victory      a fight won: a short cadence of the brass
 *   defeat       the player falls: low strings that fall, voices, a gong
 *   refuge       a refuge found: an organ chord and voices
 *   rest         a rest in a bed: a lullaby on the harp
 *   dawn         the night ends (6:00): a horn calls over soft strings in D major, the violins rise,
 *                a harp runs up, and a glockenspiel catches the first light
 *   dusk         the night comes (20:00): the celli and the basses sink from D minor to B flat, the
 *                violas under voices, and a low harp note
 * The horn has no samples between C4 and D5: its calls stay in the third octave.
 */
import { chord, hits, line, type ScoreNote } from '../music.ts';

export interface Stinger {
  readonly id: string;
  readonly bpm: number;
  readonly beats: number;
  readonly notes: readonly ScoreNote[];
  readonly instruments: readonly string[];
}

function stinger(id: string, bpm: number, beats: number, notes: ScoreNote[]): Stinger {
  return { id, bpm, beats, notes, instruments: [...new Set(notes.map((n) => n.inst))] };
}

export const STINGERS = {
  discover: stinger('discover', 60, 8, [
    ...hits('timpaniRoll', [0], 0.4),
    ...hits('gong', [0], 0.3),
    ...line('harp', 'D3:0.125 F#3:0.125 A3:0.125 D4:0.125 F#4:0.125 A4:0.125 D5:0.125 F#5:0.125 A5:0.125', 0, { vel: 0.5 }),
    ...chord('choir', 'D4 F#4 A4', 0, 7, { vel: 0.55, attack: 1.4, release: 2 }),
    ...line('violins', 'A5:7', 0.5, { vel: 0.45, attack: 1.2, release: 2 }),
    ...chord('violas', 'F#3 A3', 0, 7, { vel: 0.4, attack: 1.2, release: 2 }),
    ...line('basses', 'D2:7', 0, { vel: 0.45, attack: 0.8, release: 2 }),
    ...line('horn', 'A2:0.5 D3:0.5 F#3:1 A3:4', 1, { vel: 0.6, attack: 0.05, hold: 1.03, release: 1 }),
    ...line('glock', 'D6:0.5 F#6:0.5 A6:0.5 D7:2', 2.5, { vel: 0.38 }),
  ]),
  questStart: stinger('questStart', 80, 5, [
    ...hits('timpaniSoft', [0], 0.6),
    ...line('horn', 'D3:1 A3:1 F3:0.5 G3:0.5 A3:2', 0, { vel: 0.62, attack: 0.04, hold: 1.03, release: 0.8 }),
    ...line('celli', 'D3:5', 0, { vel: 0.4, attack: 0.3, release: 1 }),
    ...line('harp', 'D3:0.25 A3:0.25 D4:0.25 F4:0.25', 0, { vel: 0.45 }),
  ]),
  questStep: stinger('questStep', 72, 6, [
    ...line('harp', 'D4:0.25 F4:0.25 A4:0.25 D5:0.25 F5:0.25 A5:0.5', 0, { vel: 0.46 }),
    ...line('glock', 'A6:1 F6:1 D6:2', 1.5, { vel: 0.32 }),
    ...chord('oohs', 'D4 F4 A4', 0, 5, { vel: 0.34, attack: 1.2, release: 1.5 }),
  ]),
  questEnd: stinger('questEnd', 100, 8, [
    ...line('trumpetStac', 'D5:0.5 D5:0.5 D5:0.5 A4:0.5', 0, { vel: 0.68 }),
    ...line('trumpet', 'D5:3', 2, { vel: 0.6, attack: 0.04, release: 1 }),
    ...chord('horn', 'D3 F#3 A3', 2, 4, { vel: 0.58, attack: 0.06, release: 1.2 }),
    ...chord('trombone', 'D2 A2', 2, 4, { vel: 0.5, attack: 0.06, release: 1.2 }),
    ...chord('violins', 'F#4 A4 D5', 2, 4, { vel: 0.5, attack: 0.1, release: 1.2 }),
    ...hits('timpaniRoll', [0], 0.6),
    ...hits('timpani', [2], 0.8),
    ...hits('cymbal', [2], 0.55),
  ]),
  // The victory plays on the fight's own instruments: they are loaded when it comes.
  victory: stinger('victory', 96, 5, [
    ...line('hornStac', 'A2:0.5 A2:0.5', 0, { vel: 0.6 }),
    ...line('horn', 'D3:3', 1, { vel: 0.6, attack: 0.04, release: 1 }),
    ...line('trumpetStac', 'A4:0.5 A4:0.5 D5:1', 0, { vel: 0.55 }),
    ...line('basses', 'D2:4', 1, { vel: 0.45, attack: 0.08, release: 1 }),
    ...hits('timpaniSoft', [1], 0.7),
  ]),
  defeat: stinger('defeat', 60, 9, [
    ...hits('gong', [0], 0.45),
    ...line('celli', 'D3:2 C3:2 Bb2:2 A2:3', 0, { vel: 0.55, attack: 0.15, hold: 1.03, release: 1.5 }),
    ...line('basses', 'D2:2 C2:2 Bb1:2 A1:3', 0, { vel: 0.45, attack: 0.2, hold: 1.03, release: 1.5 }),
    ...chord('oohs', 'D4 F4 A4', 0, 4, { vel: 0.36, attack: 1, release: 1.5 }),
    ...chord('oohs', 'C#4 E4 A4', 5, 4, { vel: 0.34, attack: 1, release: 2 }),
    ...hits('timpaniSoft', [0], 0.5),
  ]),
  refuge: stinger('refuge', 60, 5, [
    ...chord('organ', 'D3 D4 F#4 A4', 0, 4, { vel: 0.42, attack: 0.4, release: 1.5 }),
    ...chord('oohs', 'F#4 A4', 0, 4, { vel: 0.34, attack: 1, release: 1.5 }),
  ]),
  rest: stinger('rest', 66, 6, [
    ...line('harp', 'D3:0.5 A3:0.5 D4:0.5 F4:0.5 A4:1 F3:0.5 C4:0.5 F4:0.5 A4:0.5 D5:1', 0, { vel: 0.42 }),
    ...line('celli', 'D3:6', 0, { vel: 0.3, attack: 0.8, release: 1.5 }),
  ]),
  // The hour (2026-10-13): soft, a moment of the world and not of the player, under the level of a quest.
  dawn: stinger('dawn', 66, 8, [
    ...line('celli', 'D3:7', 0, { vel: 0.3, attack: 1.2, release: 1.5 }),
    ...chord('violas', 'F#3 A3', 0.5, 6.5, { vel: 0.24, attack: 1.6, release: 1.5 }),
    ...line('horn', 'A2:1 D3:1 F#3:1.5 E3:0.5 A3:3', 0.5, { vel: 0.44, attack: 0.08, hold: 1.03, release: 1 }),
    ...line('violins', 'A4:2 D5:4', 2, { vel: 0.22, attack: 1.4, release: 1.5 }),
    ...line('harp', 'D3:0.25 A3:0.25 D4:0.25 F#4:0.25 A4:0.25 D5:0.5', 4, { vel: 0.34 }),
    ...line('glock', 'A6:1 D7:2', 5, { vel: 0.2 }),
  ]),
  dusk: stinger('dusk', 60, 8, [
    ...line('basses', 'D2:4 Bb1:4', 0, { vel: 0.36, attack: 0.8, hold: 1.02, release: 1.8 }),
    ...line('celli', 'A2:2 G2:2 F2:4', 0, { vel: 0.38, attack: 0.6, hold: 1.03, release: 1.8 }),
    ...chord('violas', 'F3 A3', 0, 4, { vel: 0.24, attack: 1.2, release: 1.2 }),
    ...chord('violas', 'D3 F3', 4, 4, { vel: 0.22, attack: 1, release: 1.8 }),
    ...chord('oohs', 'D4 F4', 3, 5, { vel: 0.26, attack: 1.5, release: 2 }),
    ...line('harp', 'D2:4', 4, { vel: 0.36 }),
  ]),
} as const satisfies Record<string, Stinger>;

export type StingerId = keyof typeof STINGERS;

/** The instruments of every stinger. */
export const STINGER_INSTRUMENTS: readonly string[] = [...new Set(Object.values(STINGERS).flatMap((s) => s.instruments))];
