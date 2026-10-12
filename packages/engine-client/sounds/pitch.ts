/**
 * The pitch of a recorded note, by the YIN method (de Cheveigné and Kawahara, 2002): the lag where
 * the signal is most like itself. The names of the files of a sample library do not always use the
 * same octaves, so the build measures each note (sounds/build.ts).
 */

/** The frequency (Hz) of `samples` at `rate`, and how clear it is (0 to 1), or null for no pitch. */
export function detectPitch(samples: Float32Array, rate: number, low = 25, high = 2500): { readonly hz: number; readonly clarity: number } | null {
  const maxLag = Math.min(Math.floor(rate / low), Math.floor(samples.length / 2));
  const minLag = Math.max(2, Math.floor(rate / high));
  const window = samples.length - maxLag;
  if (window < minLag * 4) return null;
  // The difference function, and its cumulative mean normalized form.
  const d = new Float64Array(maxLag + 1);
  for (let lag = 1; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < window; i++) {
      const delta = samples[i]! - samples[i + lag]!;
      sum += delta * delta;
    }
    d[lag] = sum;
  }
  const cmnd = new Float64Array(maxLag + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let lag = 1; lag <= maxLag; lag++) {
    running += d[lag]!;
    cmnd[lag] = running > 0 ? (d[lag]! * lag) / running : 1;
  }
  // The first dip under the threshold (the smallest lag: not an octave below), else the deepest.
  const THRESHOLD = 0.15;
  let best = -1;
  for (let lag = minLag; lag <= maxLag; lag++) {
    if (cmnd[lag]! < THRESHOLD) {
      while (lag + 1 <= maxLag && cmnd[lag + 1]! < cmnd[lag]!) lag++;
      best = lag;
      break;
    }
  }
  if (best < 0) {
    let min = Infinity;
    for (let lag = minLag; lag <= maxLag; lag++) {
      if (cmnd[lag]! < min) {
        min = cmnd[lag]!;
        best = lag;
      }
    }
  }
  if (best <= minLag || best >= maxLag) return null;
  // A parabola through the dip and its neighbours: a lag between two samples.
  const a = cmnd[best - 1]!;
  const b = cmnd[best]!;
  const c = cmnd[best + 1]!;
  const shift = (a - c) / (2 * (a - 2 * b + c) || 1);
  const lag = best + (Number.isFinite(shift) ? Math.max(-1, Math.min(1, shift)) : 0);
  return { hz: rate / lag, clarity: Math.max(0, 1 - b) };
}

/** A MIDI note number (69 = A4 = 440 Hz), with cents as the fraction. */
export function midiOf(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

const NAMES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** The MIDI note of a name as "C#3", "Bb2" or "A#0" (scientific octaves: C4 = 60), or null. */
export function midiOfName(name: string): number | null {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return null;
  const accidental = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + NAMES[m[1]!]! + accidental;
}

/** The name of a MIDI note: 62 is "D4". */
export function nameOfMidi(midi: number): string {
  const n = Math.round(midi);
  return `${['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
}
