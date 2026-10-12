/**
 * Plays a note on a recorded instrument (audio/samples.ts): the sample nearest the note, tuned by
 * its playback rate, through a gain that shapes it. A sustained note longer than its sample is held
 * by copies of the sample's steady stretch (its loop) that fade into each other, each one starting a
 * little before the last one ends: no seam, on any decoder.
 */
import { pickSample, type Instrument } from './samples.ts';

export interface NoteOptions {
  /** When the note sounds (context time). */
  readonly t: number;
  /** How long it is held (s). A "once" instrument plays out, unless `cut`. */
  readonly dur: number;
  /** 0 to 1. */
  readonly vel?: number;
  /** -1 (left) to 1 (right); none: as `out` places it. */
  readonly pan?: number;
  /** The fade in (s): a sample has its own attack, so this is short unless the note swells. */
  readonly attack?: number;
  /** The fade out after `dur` (s). */
  readonly release?: number;
  /** A "once" note stops at the end of `dur` + `release` (a damped string). */
  readonly cut?: boolean;
  /** Cents, to bend the note. */
  readonly detune?: number;
}

/** How a velocity becomes a gain: soft notes much softer. */
export function velocityGain(vel: number): number {
  return Math.max(0, Math.min(1, vel)) ** 1.6;
}

/** The copies of a loop that hold a sustained note: when each starts (s of the sample's time from the note's start), and the content it plays from. */
export function holdSegments(loop: readonly [number, number], need: number): { readonly at: number; readonly from: number }[] {
  const [start, end] = loop;
  const fade = crossfadeOf(loop);
  const segments = [{ at: 0, from: 0 }];
  if (need <= end) return segments;
  // Each copy plays the loop; it starts `fade` before the one before it ends.
  for (let at = end - fade; at < need; at += end - start - fade) segments.push({ at, from: start });
  return segments;
}

/** The crossfade of two copies of a loop (s). */
export function crossfadeOf(loop: readonly [number, number]): number {
  return Math.min(0.5, (loop[1] - loop[0]) / 3);
}

const FADE_IN = new Float32Array(17).map((_, i) => Math.sin((i / 16) * (Math.PI / 2)));
const FADE_OUT = new Float32Array(17).map((_, i) => Math.cos((i / 16) * (Math.PI / 2)));

/** Plays a note; returns when it ends (context time). Nothing plays (and `t` comes back) without a sample. */
export function playNote(ctx: BaseAudioContext, out: AudioNode, instrument: Instrument, midi: number | null, o: NoteOptions, random: () => number = Math.random): number {
  const picked = pickSample(instrument, midi, random);
  if (!picked) return o.t;
  const { sample, rate } = picked;
  const sustain = instrument.kind === 'sustain' && sample.loop !== null;
  const attack = o.attack ?? (sustain ? 0.02 : 0.003);
  const release = o.release ?? (sustain ? 0.35 : 0.08);
  const peak = velocityGain(o.vel ?? 0.7);
  const t = o.t;
  // The real time that the sample's content lasts at this rate.
  const playsFor = sample.length / rate;
  const end = sustain || o.cut ? t + o.dur + release : t + playsFor;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(peak, t + attack);
  if (sustain || o.cut) {
    const off = Math.max(t + attack, t + o.dur);
    env.gain.setValueAtTime(peak, off);
    env.gain.linearRampToValueAtTime(0, off + release);
  }
  if (o.pan !== undefined && o.pan !== 0 && 'createStereoPanner' in ctx) {
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, o.pan));
    env.connect(p).connect(out);
  } else env.connect(out);

  const source = (offset: number, at: number, until: number, gain: AudioNode) => {
    const src = ctx.createBufferSource();
    src.buffer = sample.buffer;
    src.playbackRate.value = rate;
    if (o.detune) src.detune.value = o.detune;
    src.connect(gain);
    src.start(at, sample.start + offset);
    src.stop(Math.max(at + 0.01, until));
  };

  if (!sustain || (end - t) * rate <= sample.loop![1]) {
    source(0, t, Math.min(end, t + playsFor) + 0.02, env);
    return end;
  }
  // A long sustained note: copies of the loop, each fading into the next.
  const loop = sample.loop!;
  const fade = crossfadeOf(loop);
  const segments = holdSegments(loop, (end - t) * rate);
  segments.forEach((segment, i) => {
    const g = ctx.createGain();
    g.connect(env);
    const startAt = t + segment.at / rate;
    // The content that this copy plays, until the next copy has taken over.
    const next = segments[i + 1];
    const stopContent = next ? next.at - segment.at + segment.from + fade : loop[1];
    const stopAt = Math.min(end, startAt + (stopContent - segment.from) / rate);
    if (i > 0) g.gain.setValueCurveAtTime(FADE_IN, startAt, fade / rate);
    else g.gain.setValueAtTime(1, startAt);
    if (next) g.gain.setValueCurveAtTime(FADE_OUT, t + next.at / rate, fade / rate);
    source(segment.from, startAt, stopAt + 0.02, g);
  });
  return end;
}
