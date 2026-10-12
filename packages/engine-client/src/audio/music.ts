/**
 * The music of the game: tracks that the audio engine (audio/audio.ts) plays on the recorded
 * instruments (audio/samples.ts). A track is a score: sections, one after another, each with its
 * tempo, its length in beats and its notes. A track's next section may differ each time (a theme
 * that grows, music that varies), so a track never ends until the engine stops it.
 *
 * The notes of a section are written in a small notation (`line`, `chord`):
 *   "A4:2 F4 G4 A4:3 r:1"   notes with their beats (a note without beats keeps the last), r a rest
 *   "D3+F3+A3:8"            a chord: notes that start together
 *   ">A4:2"                 an accent: the note a little louder
 */
import { midi } from './notes.ts';
import { playNote } from './sampler.ts';
import type { SampleBank } from './samples.ts';

/** Something that plays over time: it schedules what starts before `until` (seconds of the context). */
export interface Pattern {
  schedule(ctx: BaseAudioContext, out: AudioNode, until: number): void;
}

/** A piece of music: from a start time, a pattern that goes on until the engine stops it. */
export interface MusicTrack {
  readonly id: string;
  /** The instruments that it plays: the engine loads them before it starts the track. */
  readonly instruments: readonly string[];
  /** The instruments that it needs to start (the others load while it plays, and join when ready). Default: all. */
  readonly first?: readonly string[];
  /** A score's composer (scoreTrack): the tests read its sections. */
  readonly compose?: () => Composer;
  /** Its gain in the mix (default 1): a quiet piece a little up, so that the moods sit together. */
  readonly level?: number;
  start(t0: number, bank: SampleBank): Pattern;
}

/** A note of a score. */
export interface ScoreNote {
  readonly inst: string;
  /** A MIDI note, or null for an instrument without notes (a drum). */
  readonly midi: number | null;
  /** When it starts, in beats from the start of its section. */
  readonly beat: number;
  /** How long it is held, in beats. */
  readonly beats: number;
  readonly vel: number;
  readonly attack?: number;
  readonly release?: number;
  readonly cut?: boolean;
  readonly pan?: number;
}

export interface Section {
  readonly bpm: number;
  readonly beats: number;
  readonly notes: readonly ScoreNote[];
}

/** Options of the notes of a line or a chord. */
export interface LineOptions {
  readonly vel?: number;
  readonly attack?: number;
  readonly release?: number;
  readonly cut?: boolean;
  readonly pan?: number;
  /** Semitones to add to every note. */
  readonly shift?: number;
  /** Hold each note this share of its beats (legato over 1, staccato under). */
  readonly hold?: number;
}

function noteOf(name: string): number {
  return midi(name);
}

/** Notes, one after another, from `beat`: "A4:2 F4 G4 A4:3 r:1" (see the notation above). */
export function line(inst: string, text: string, beat = 0, o: LineOptions = {}): ScoreNote[] {
  const out: ScoreNote[] = [];
  let at = beat;
  let beats = 1;
  for (const token of text.trim().split(/\s+/)) {
    if (!token) continue;
    const accent = token.startsWith('>');
    const [what, length] = (accent ? token.slice(1) : token).split(':');
    if (length !== undefined) beats = Number(length);
    if (!Number.isFinite(beats) || beats <= 0) throw new Error(`bad beats in "${token}"`);
    if (what !== 'r') {
      for (const name of what!.split('+')) {
        out.push({
          inst,
          midi: name === 'x' ? null : noteOf(name) + (o.shift ?? 0),
          beat: at,
          beats: beats * (o.hold ?? 1),
          vel: Math.min(1, (o.vel ?? 0.7) + (accent ? 0.15 : 0)),
          ...(o.attack !== undefined ? { attack: o.attack } : {}),
          ...(o.release !== undefined ? { release: o.release } : {}),
          ...(o.cut ? { cut: true } : {}),
          ...(o.pan !== undefined ? { pan: o.pan } : {}),
        });
      }
    }
    at += beats;
  }
  return out;
}

/** The notes of a chord, together at `beat` for `beats`: chord('violas', 'D4 F4 A4', 0, 8). */
export function chord(inst: string, notes: string, beat: number, beats: number, o: LineOptions = {}): ScoreNote[] {
  return line(inst, `${notes.trim().split(/\s+/).join('+')}:${beats}`, beat, o);
}

/** Hits of an instrument without notes (a drum) at these beats. */
export function hits(inst: string, beats: readonly number[], vel = 0.7, o: Omit<LineOptions, 'vel'> = {}): ScoreNote[] {
  return beats.map((beat) => ({ inst, midi: null, beat, beats: 1, vel, ...(o.pan !== undefined ? { pan: o.pan } : {}), ...(o.cut ? { cut: true } : {}), ...(o.release !== undefined ? { release: o.release } : {}) }));
}

/** Where each section sits on the stage, from the audience (-1 left, 1 right): the seating of an orchestra. */
export const SEATING: Readonly<Record<string, number>> = {
  violins: -0.35,
  violinsTrem: -0.35,
  violinsSpic: -0.35,
  violinsPizz: -0.35,
  violin: -0.15,
  violas: 0.15,
  celli: 0.32,
  celliTrem: 0.32,
  celliSpic: 0.32,
  celliPizz: 0.32,
  basses: 0.45,
  harp: -0.5,
  flute: -0.1,
  oboe: 0.08,
  clarinet: -0.04,
  horn: -0.22,
  hornStac: -0.22,
  trumpet: 0.18,
  trumpetStac: 0.18,
  trombone: 0.28,
  glock: 0.25,
  organ: 0,
  choir: 0,
  oohs: 0,
};

/** How loud each instrument is in the mix (its samples are all at one level). */
export const LEVELS: Readonly<Record<string, number>> = {
  basses: 0.9,
  celli: 0.9,
  violas: 0.75,
  violins: 0.8,
  violin: 0.8,
  harp: 0.75,
  horn: 0.8,
  hornStac: 0.7,
  trumpet: 0.6,
  trumpetStac: 0.6,
  trombone: 0.7,
  flute: 0.65,
  oboe: 0.6,
  clarinet: 0.6,
  choir: 0.7,
  oohs: 0.7,
  organ: 0.55,
  glock: 0.45,
  timpani: 0.9,
  timpaniSoft: 0.9,
  timpaniRoll: 0.8,
  bassDrum: 0.9,
  taiko: 0.9,
  cymbal: 0.5,
  cymbalSwell: 0.55,
  gong: 0.6,
  triangle: 0.35,
};

/** A section's place in the orchestra: a gain at its level, panned to its seat, into `out`. */
export function seatBus(ctx: BaseAudioContext, out: AudioNode, inst: string): AudioNode {
  const gain = ctx.createGain();
  gain.gain.value = LEVELS[inst] ?? 0.7;
  const seat = SEATING[inst] ?? 0;
  if (seat !== 0 && 'createStereoPanner' in ctx) {
    const pan = ctx.createStereoPanner();
    pan.pan.value = seat;
    gain.connect(pan).connect(out);
  } else gain.connect(out);
  return gain;
}

/** The instruments without fixed notes, whose timing stays tight. */
const DRUMS: ReadonlySet<string> = new Set(['timpani', 'timpaniSoft', 'timpaniRoll', 'bassDrum', 'bassDrumRoll', 'taiko', 'drumSticks', 'snare', 'tenorDrum', 'frameDrum', 'logDrum', 'tambourine']);

/** Gives the sections of a track one after another (index 0, 1, ...); it may keep a state (a piece that goes on). */
export type Composer = (index: number, random: () => number) => Section;

/**
 * A track from a score: `compose()` makes a composer for each time the track starts, which gives its
 * sections. The notes are humanized a little: a few milliseconds early or late, a little softer or
 * louder, except the drums' timing.
 */
export function scoreTrack(id: string, instruments: readonly string[], compose: () => Composer, o: { readonly first?: readonly string[]; readonly level?: number } = {}): MusicTrack {
  return {
    id,
    instruments,
    compose,
    ...(o.first ? { first: o.first } : {}),
    ...(o.level !== undefined ? { level: o.level } : {}),
    start(t0: number, bank: SampleBank): Pattern {
      const random = Math.random;
      const next = compose();
      let index = 0;
      let sectionAt = t0;
      let pending: { t: number; note: ScoreNote; seconds: number }[] = [];
      const buses = new Map<string, AudioNode>();
      const busOf = (ctx: BaseAudioContext, out: AudioNode, inst: string): AudioNode => {
        let bus = buses.get(inst);
        if (!bus) {
          bus = seatBus(ctx, out, inst);
          buses.set(inst, bus);
        }
        return bus;
      };
      return {
        schedule(ctx, out, until) {
          // The sections that start before `until`: their notes wait in `pending`.
          while (sectionAt < until) {
            const section = next(index++, random);
            const beat = 60 / section.bpm;
            for (const note of section.notes) {
              const drum = DRUMS.has(note.inst);
              const jitter = (random() - 0.5) * (drum ? 0.006 : 0.024);
              pending.push({ t: sectionAt + note.beat * beat + jitter, note: { ...note, vel: Math.max(0.05, Math.min(1, note.vel + (random() - 0.5) * 0.08)) }, seconds: note.beats * beat });
            }
            sectionAt += section.beats * beat;
          }
          const now = pending.filter((p) => p.t < until);
          if (now.length === 0) return;
          pending = pending.filter((p) => p.t >= until);
          for (const { t, note, seconds } of now) {
            const instrument = bank.get(note.inst);
            if (!instrument || t < ctx.currentTime - 0.05) continue;
            playNote(ctx, busOf(ctx, out, note.inst), instrument, note.midi, {
              t: Math.max(t, ctx.currentTime),
              dur: seconds,
              vel: note.vel,
              ...(note.attack !== undefined ? { attack: note.attack } : {}),
              ...(note.release !== undefined ? { release: note.release } : {}),
              ...(note.cut ? { cut: true } : {}),
              ...(note.pan !== undefined ? { pan: note.pan } : {}),
            });
          }
        },
      };
    },
  };
}
