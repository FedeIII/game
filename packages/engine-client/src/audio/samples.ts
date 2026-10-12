/**
 * The recorded instruments of the game (2026-10-12): the samples that sounds/build.ts made from the
 * VSCO 2 orchestra and the FluidR3 choir (src/generated/sounds/, and the manifest sounds.json). The
 * bank fetches and decodes an instrument the first time the music or a sound needs it, at the rate of
 * its files (a low instrument needs less: less memory), and keeps it.
 *
 * An MP3 decoder may put the delay of the encoder (1105 samples) before the sound, or take it away:
 * the bank measures it on each instrument (the onset of its samples against the manifest's) and
 * starts every sample after it.
 */
import manifest from '../generated/sounds.json';

/** The share of its peak where a sample's onset is (the same rule as sounds/build.ts). */
const ONSET_SHARE = 0.05;
/** The delays (samples at the file's rate) that a decoder leaves before the sound: LAME's 576 + 529, or none. */
const DELAY_CANDIDATES = [0, 529, 576, 1105] as const;
/** At most this many files are fetched and decoded at once. */
const PARALLEL = 4;

interface SampleEntry {
  readonly file: string;
  readonly root: number | null;
  readonly onset: number;
  readonly loop?: readonly number[];
  readonly seconds: number;
}
interface InstrumentEntry {
  readonly kind: string;
  readonly rate: number;
  readonly samples: readonly SampleEntry[];
}

const INSTRUMENTS = (manifest as unknown as { instruments: Record<string, InstrumentEntry> }).instruments;
/** The credits of the recordings (the "Sound" section of the settings shows them). */
export const SOUND_CREDITS: readonly string[] = (manifest as unknown as { credits: string[] }).credits;

const URLS = new Map(
  Object.entries(import.meta.glob('../generated/sounds/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>).map(([path, url]) => [path.split('/').pop()!, url]),
);

/** The ids of the instruments that the bank knows. */
export const INSTRUMENT_IDS: readonly string[] = Object.keys(INSTRUMENTS);

export interface Sample {
  readonly buffer: AudioBuffer;
  /** The MIDI note that it sounds, or null (a drum). */
  readonly root: number | null;
  /** Where the sound starts in the buffer (s): after the decoder's delay. Times below are from here. */
  readonly start: number;
  /** A sustain's steady stretch (s from `start`). */
  readonly loop: readonly [number, number] | null;
  /** How long the sound is (s from `start`). */
  readonly length: number;
}

export interface Instrument {
  readonly id: string;
  readonly kind: 'sustain' | 'once';
  readonly samples: readonly Sample[];
}

/** The sample for a note: the nearest root (a variant at random among equals), and the playback rate that tunes it. */
export function pickSample(instrument: Instrument, midi: number | null, random: () => number = Math.random): { sample: Sample; rate: number } | null {
  const list = instrument.samples;
  if (list.length === 0) return null;
  if (midi === null || list[0]!.root === null) return { sample: list[Math.floor(random() * list.length)]!, rate: 1 };
  let best = Infinity;
  for (const s of list) best = Math.min(best, Math.abs(s.root! - midi));
  const near = list.filter((s) => Math.abs(Math.abs(s.root! - midi) - best) < 0.01);
  const sample = near[Math.floor(random() * near.length)]!;
  return { sample, rate: 2 ** ((midi - sample.root!) / 12) };
}

/** The decoder's delay (s) from the measured delays of an instrument's samples: the nearest known one, else their median. */
export function decoderDelay(measured: readonly number[], rate: number): number {
  if (measured.length === 0) return 0;
  const median = [...measured].sort((a, b) => a - b)[Math.floor(measured.length / 2)]!;
  let best: number = DELAY_CANDIDATES[0];
  for (const c of DELAY_CANDIDATES) if (Math.abs(c / rate - median) < Math.abs(best / rate - median)) best = c;
  return Math.abs(best / rate - median) < 0.015 ? best / rate : Math.max(0, median);
}

function onsetOf(data: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]!));
  const threshold = ONSET_SHARE * peak;
  for (let i = 0; i < data.length; i++) if (Math.abs(data[i]!) >= threshold) return i;
  return 0;
}

/** An instrument that no music has used for this long (ms) may go (SampleBank.sweep). */
export const IDLE_MS = 180_000;

export class SampleBank {
  private readonly loaded = new Map<string, Instrument>();
  private readonly loading = new Map<string, Promise<Instrument | null>>();
  private active = 0;
  private readonly queue: (() => void)[] = [];
  /** The instruments that stay (the sudden moods). */
  private readonly pinned = new Set<string>();
  /** When each instrument was last asked for (ms). */
  private readonly used = new Map<string, number>();

  /** An instrument, if it is ready. */
  get(id: string): Instrument | null {
    const instrument = this.loaded.get(id) ?? null;
    if (instrument) this.used.set(id, performance.now());
    return instrument;
  }

  /** These instruments stay loaded (once they are). */
  pin(ids: readonly string[]): void {
    for (const id of ids) this.pinned.add(id);
  }

  /** Lets go of the instruments that are not pinned, not in `keep`, and idle for IDLE_MS: their memory comes back. */
  sweep(keep: readonly string[], now = performance.now()): string[] {
    const gone: string[] = [];
    for (const id of this.loaded.keys()) {
      if (this.pinned.has(id) || keep.includes(id) || now - (this.used.get(id) ?? 0) < IDLE_MS) continue;
      this.loaded.delete(id);
      gone.push(id);
    }
    return gone;
  }

  /** The ids of the instruments that are ready. */
  get readyIds(): string[] {
    return [...this.loaded.keys()];
  }

  /** Whether all of these are ready. */
  ready(ids: readonly string[]): boolean {
    return ids.every((id) => this.loaded.has(id));
  }

  /** Fetches and decodes these instruments (those not ready yet). It resolves when all are ready or failed. */
  load(ids: readonly string[]): Promise<void> {
    return Promise.all(ids.map((id) => this.loadOne(id))).then(() => undefined);
  }

  private loadOne(id: string): Promise<Instrument | null> {
    const done = this.loaded.get(id);
    if (done) return Promise.resolve(done);
    let pending = this.loading.get(id);
    if (!pending) {
      pending = this.decode(id).then(
        (instrument) => {
          if (instrument) {
            this.loaded.set(id, instrument);
            this.used.set(id, performance.now());
          }
          this.loading.delete(id);
          return instrument;
        },
        () => {
          this.loading.delete(id);
          return null;
        },
      );
      this.loading.set(id, pending);
    }
    return pending;
  }

  /** Runs `task` when fewer than PARALLEL run. */
  private async limited<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= PARALLEL) await new Promise<void>((resolve) => this.queue.push(resolve));
    this.active++;
    try {
      return await task();
    } finally {
      this.active--;
      this.queue.shift()?.();
    }
  }

  private async decode(id: string): Promise<Instrument | null> {
    const entry = INSTRUMENTS[id];
    if (!entry || typeof OfflineAudioContext === 'undefined') return null;
    // A context at the files' rate: decodeAudioData gives the samples at its rate.
    const ctx = new OfflineAudioContext(1, 1, entry.rate);
    const buffers = await Promise.all(
      entry.samples.map((s) =>
        this.limited(async () => {
          const url = URLS.get(s.file);
          if (!url) throw new Error(`no file ${s.file}`);
          const response = await fetch(url);
          if (!response.ok) throw new Error(`${s.file}: ${response.status}`);
          return ctx.decodeAudioData(await response.arrayBuffer());
        }),
      ),
    );
    const delay = decoderDelay(
      buffers.map((b, i) => onsetOf(b.getChannelData(0)) / b.sampleRate - entry.samples[i]!.onset),
      entry.rate,
    );
    const samples: Sample[] = buffers.map((buffer, i) => {
      const s = entry.samples[i]!;
      const length = Math.min(s.seconds, buffer.duration - delay);
      const loop = s.loop && s.loop.length === 2 ? ([s.loop[0]!, Math.min(s.loop[1]!, length - 0.005)] as const) : null;
      return { buffer, root: s.root, start: delay, loop, length };
    });
    return { id, kind: entry.kind === 'sustain' ? 'sustain' : 'once', samples };
  }
}
