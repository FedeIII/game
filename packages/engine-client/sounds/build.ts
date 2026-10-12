/**
 * Builds the samples of the game's sounds (sounds/catalog.ts): it downloads the recordings, cuts
 * each one, measures its pitch, makes a loop in each note of a sustained instrument, and writes
 * small mono MP3 files to src/generated/sounds/ with a manifest, src/generated/sounds.json. The
 * page decodes them when the music needs them (src/audio/samples.ts).
 *
 *   node sounds/build.ts             # all the instruments
 *   node sounds/build.ts harp celli  # only these (the others stay as they are)
 *
 * It needs the network for the first build: the recordings stay in SOUNDS_CACHE (default
 * ~/.cache/game-sounds), so the next builds read them from there. Run it only when the catalog
 * changes; the output is in git, and `npm run build` does not need it.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMp3Encoder } from 'wasm-media-encoders';
import { MPEGDecoder } from 'mpg123-decoder';
import { CREDITS, INSTRUMENTS, type InstrumentDef, type SampleRate } from './catalog.ts';
import { detectPitch, midiOf, midiOfName, nameOfMidi } from './pitch.ts';
import { readWav, type Pcm } from './wav.ts';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'src', 'generated', 'sounds');
const MANIFEST = join(here, '..', 'src', 'generated', 'sounds.json');
const CACHE = process.env.SOUNDS_CACHE ?? join(homedir(), '.cache', 'game-sounds');
const VSCO = 'https://raw.githubusercontent.com/sgossner/VSCO-2-CE/master/';
const VSCO_TREE = 'https://api.github.com/repos/sgossner/VSCO-2-CE/git/trees/master?recursive=1';
const FLUID = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/';

/** The onset of a sample: its first sample louder than this share of its peak. The page finds it by the same rule. */
export const ONSET_SHARE = 0.05;
/** A sample starts this long before its onset (s): the start of the attack. */
const PRE_ROLL = 0.012;
/** The level of a sustain is evened out from this long before its loop (s): the copies of the loop fade over about this. */
const LEVEL_FROM = 0.5;
/** The bitrate of the MP3 at each rate (kbit/s), mono. */
const BITRATE: Record<SampleRate, 40 | 64 | 80> = { 22050: 40, 32000: 64, 44100: 80 };

/** One sample in the manifest. Times are seconds from the start of the file as the build wrote it. */
export interface SampleEntry {
  readonly file: string;
  /** The MIDI note that it sounds (with cents), or null for a drum. */
  readonly root: number | null;
  /** Where its onset is (ONSET_SHARE). */
  readonly onset: number;
  /** A sustain's loop. */
  readonly loop?: readonly [number, number];
  readonly seconds: number;
}

export interface InstrumentEntry {
  readonly kind: 'sustain' | 'once';
  readonly rate: SampleRate;
  readonly samples: readonly SampleEntry[];
}

export interface Manifest {
  readonly credits: readonly string[];
  readonly instruments: Readonly<Record<string, InstrumentEntry>>;
}

// ---------------------------------------------------------------- downloads

async function fetchBytes(url: string, tries = 4): Promise<Uint8Array> {
  for (let i = 1; ; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return new Uint8Array(await response.arrayBuffer());
    } catch (error) {
      if (i >= tries) throw new Error(`${url}: ${(error as Error).message}`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * i));
    }
  }
}

/** A file of the cache, downloaded once. */
async function cached(name: string, url: string): Promise<Uint8Array> {
  const path = join(CACHE, name.replace(/[^A-Za-z0-9._-]+/g, '_'));
  if (existsSync(path)) return new Uint8Array(readFileSync(path));
  const bytes = await fetchBytes(url);
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(path, bytes);
  return bytes;
}

let tree: string[] | null = null;
/** The paths of every file of VSCO 2 CE. */
async function vscoFiles(): Promise<string[]> {
  if (!tree) {
    const json = JSON.parse(new TextDecoder().decode(await cached('vsco-tree.json', VSCO_TREE))) as { tree: { path: string; type: string }[] };
    tree = json.tree.filter((x) => x.type === 'blob').map((x) => x.path);
  }
  return tree;
}

const vscoUrl = (path: string) => VSCO + path.split('/').map(encodeURIComponent).join('/');

// ---------------------------------------------------------------- choosing the files

interface Pick {
  /** A name for the log. */
  readonly label: string;
  /** The note that its name says (sounding), or null. */
  readonly named: number | null;
  read(): Promise<Pcm>;
}

/** The note in a VSCO file name: the first "<letter>[#]<octave>" between separators. */
function noteInName(file: string): number | null {
  const m = /(?:^|[_\-\s])([A-G]#?-?\d)(?=[_\-.\s])/.exec(file);
  return m ? midiOfName(m[1]!) : null;
}

/** Keeps a note only `every` semitones (or more) above the last one kept. */
function thin<T extends { named: number | null }>(list: T[], every: number | undefined): T[] {
  if (!every) return list;
  const out: T[] = [];
  let last = -Infinity;
  for (const item of [...list].sort((a, b) => (a.named ?? 0) - (b.named ?? 0))) {
    if (item.named === null || item.named - last >= every) {
      out.push(item);
      if (item.named !== null) last = item.named;
    }
  }
  return out;
}

const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

async function picksOf(def: InstrumentDef): Promise<Pick[]> {
  const source = def.source;
  if (source.kind === 'fluid') {
    const [lo, hi] = def.range ?? [48, 72];
    const picks: Pick[] = [];
    for (let note = lo; note <= hi; note += def.every ?? 3) {
      const name = `${FLAT_NAMES[note % 12]}${Math.floor(note / 12) - 1}`;
      picks.push({ label: `${source.name} ${name}`, named: note, read: async () => decodeMp3(await cached(`fluid-${source.name}-${name}.mp3`, `${FLUID}${source.name}-mp3/${name}.mp3`)) });
    }
    return picks;
  }
  const files = (await vscoFiles()).filter((p) => p.slice(0, p.lastIndexOf('/')) === source.dir && source.match.test(p.slice(p.lastIndexOf('/') + 1)));
  const shift = 12 * (source.octave ?? 0);
  // By note: the preferred files of each note (a dynamic), then at most `variants` of them.
  const byNote = new Map<string, string[]>();
  for (const path of files.sort()) {
    const named = def.pitched ? noteInName(path.slice(path.lastIndexOf('/') + 1)) : null;
    const key = named === null ? path : String(named);
    byNote.set(key, [...(byNote.get(key) ?? []), path]);
  }
  const picks: Pick[] = [];
  for (const [key, paths] of byNote) {
    let chosen = paths;
    for (const pattern of source.prefer ?? []) {
      const preferred = paths.filter((p) => pattern.test(p));
      if (preferred.length > 0) {
        chosen = preferred;
        break;
      }
    }
    const named = def.pitched && /^\d+$/.test(key) ? Number(key) + shift : null;
    if (named !== null && def.range && (named < def.range[0] - 3 || named > def.range[1] + 3)) continue;
    for (const path of chosen.slice(0, def.variants ?? (def.pitched ? 1 : chosen.length))) {
      picks.push({ label: path.slice(path.lastIndexOf('/') + 1), named, read: async () => readWav(await cached(`vsco-${path}`, vscoUrl(path))) });
    }
  }
  // Thin the notes, but keep every variant of a note that stays.
  const kept = new Set(thin(picks.filter((p, i) => picks.findIndex((q) => q.named === p.named) === i), def.every).map((p) => p.named));
  return picks.filter((p) => p.named === null || kept.has(p.named)).sort((a, b) => (a.named ?? 0) - (b.named ?? 0) || a.label.localeCompare(b.label));
}

let mp3Decoder: MPEGDecoder | null = null;
async function decodeMp3(bytes: Uint8Array): Promise<Pcm> {
  if (!mp3Decoder) {
    mp3Decoder = new MPEGDecoder();
    await mp3Decoder.ready;
  }
  await mp3Decoder.reset();
  const decoded = mp3Decoder.decode(bytes);
  return { rate: decoded.sampleRate, channels: decoded.channelData };
}

// ---------------------------------------------------------------- cutting

interface Prepared {
  readonly samples: Float32Array;
  readonly rate: number;
  readonly onset: number;
  readonly loop?: readonly [number, number];
  readonly root: number | null;
  readonly note: string;
}

function mono(pcm: Pcm): Float32Array {
  const out = new Float32Array(pcm.channels[0]!.length);
  for (const channel of pcm.channels) for (let i = 0; i < out.length; i++) out[i]! += channel[i]! / pcm.channels.length;
  return out;
}

function peakOf(x: Float32Array, from = 0, to = x.length): number {
  let peak = 0;
  for (let i = from; i < to; i++) peak = Math.max(peak, Math.abs(x[i]!));
  return peak;
}

function onsetOf(x: Float32Array): number {
  const threshold = ONSET_SHARE * peakOf(x);
  for (let i = 0; i < x.length; i++) if (Math.abs(x[i]!) >= threshold) return i;
  return 0;
}

function prepare(def: InstrumentDef, pcm: Pcm, named: number | null): Prepared {
  const rate = pcm.rate;
  const all = mono(pcm);
  const start = Math.max(0, onsetOf(all) - Math.round(PRE_ROLL * rate));
  const length = Math.round(def.seconds * rate);
  let x = new Float32Array(length);
  x.set(all.subarray(start, start + length));
  // The pitch: a stretch after the attack (longer for a low note).
  let root: number | null = null;
  let note = '-';
  if (def.pitched && def.measure === 'name') {
    root = named;
    note = named === null ? 'no name' : nameOfMidi(named);
  } else if (def.pitched) {
    const from = Math.round((def.kind === 'sustain' ? 0.35 : 0.06) * rate);
    const span = Math.round((named !== null && named < 48 ? 0.45 : 0.25) * rate);
    const found = detectPitch(x.subarray(from, from + span), rate, 25, def.highHz ?? 1600);
    const measured = found && found.clarity > 0.6 ? midiOf(found.hz) : null;
    // A measure an octave (or more) away from the name is most often an octave error of the measure.
    if (measured !== null && named !== null) {
      const octaves = Math.round((named - measured) / 12);
      root = Math.abs(named - (measured + 12 * octaves)) < 1 ? measured + 12 * octaves : named;
      note = `${nameOfMidi(root)}${octaves !== 0 ? ` (measured ${nameOfMidi(measured)})` : ''}${Math.abs(named - root) >= 0.5 ? ` (named ${nameOfMidi(named)})` : ''}`;
    } else {
      root = measured ?? named;
      note = root === null ? 'no pitch' : `${nameOfMidi(root)}${measured === null ? ' (by its name)' : ''}`;
    }
  }
  // A short fade in, so that the cut never clicks.
  for (let i = 0; i < Math.min(64, length); i++) x[i]! *= i / 64;
  const onset = onsetOf(x) / rate;
  let loop: [number, number] | undefined;
  if (def.kind === 'sustain') {
    // The loop: from loopFrom after the onset to the end. The page holds a long note with copies of
    // it that fade into each other (src/audio/sampler.ts), so it needs no seam here; it needs a
    // steady level: the slow changes of loudness of the stretch (from LEVEL_FROM before its start)
    // are evened out, so that one copy does not swell over the other.
    const ls = Math.round((onset + (def.loopFrom ?? 1)) * rate);
    const le = length - Math.round(0.01 * rate);
    if (le - ls < 0.8 * rate) throw new Error(`${def.id}: the loop is too short`);
    evenLevel(x, Math.max(Math.round((onset + 0.3) * rate), ls - Math.round(LEVEL_FROM * rate)), le, rate);
    x = x.slice(0, le);
    loop = [ls / rate, le / rate];
    // Loudness: the loop's RMS to -15 dBFS, without a peak over 0.95.
    let sum = 0;
    for (let i = ls; i < le; i++) sum += x[i]! * x[i]!;
    const rms = Math.sqrt(sum / (le - ls)) || 1;
    const gain = Math.min(0.178 / rms, 0.95 / (peakOf(x) || 1));
    for (let i = 0; i < x.length; i++) x[i]! *= gain;
  } else {
    // A one-shot: a cosine fade over its last quarter (at most 0.4 s), and its peak to 0.9.
    const fade = Math.min(Math.round(0.4 * rate), Math.round(length / 4));
    for (let i = 0; i < fade; i++) x[length - fade + i]! *= Math.cos((i / fade) * (Math.PI / 2));
    const gain = 0.9 / (peakOf(x) || 1);
    for (let i = 0; i < x.length; i++) x[i]! *= gain;
  }
  return { samples: x, rate, onset, root, note, ...(loop ? { loop } : {}) };
}

/**
 * Evens out the slow changes of loudness of x[from, to): each stretch of 120 ms is scaled towards
 * the median loudness of the whole (at most 2x up or down), with the gain eased between stretches.
 * Before `from` the gain eases from 1, so the attack stays as it was.
 */
function evenLevel(x: Float32Array, from: number, to: number, rate: number): void {
  const hop = Math.round(0.12 * rate);
  const levels: number[] = [];
  for (let a = from; a + hop <= to; a += hop) {
    let sum = 0;
    for (let i = a; i < a + hop; i++) sum += x[i]! * x[i]!;
    levels.push(Math.sqrt(sum / hop));
  }
  if (levels.length < 3) return;
  const median = [...levels].sort((a, b) => a - b)[Math.floor(levels.length / 2)]!;
  const gains = levels.map((l) => Math.max(0.5, Math.min(2, median / (l || median))));
  // A gain for each sample: 1 before `from`, eased into the first stretch's, then between the middles of the stretches.
  const ease = Math.round(0.1 * rate);
  for (let i = Math.max(0, from - ease); i < x.length; i++) {
    let g: number;
    if (i < from) g = 1 + (gains[0]! - 1) * ((i - (from - ease)) / ease);
    else {
      const pos = (i - from) / hop - 0.5;
      const k = Math.max(0, Math.min(gains.length - 1, Math.floor(pos)));
      const next = Math.min(gains.length - 1, k + 1);
      const f = Math.max(0, Math.min(1, pos - k));
      g = gains[k]! + (gains[next]! - gains[k]!) * f;
    }
    x[i]! *= g;
  }
}

// ---------------------------------------------------------------- encoding

async function encode(prepared: Prepared, rate: SampleRate): Promise<Uint8Array> {
  // A new encoder for each file: one that is configured again keeps the end of the last file in its buffer.
  const encoder = await createMp3Encoder();
  encoder.configure({ channels: 1, sampleRate: prepared.rate, bitrate: BITRATE[rate], outputSampleRate: rate });
  // encode() and finalize() return views of the encoder's memory, which the next call writes over: copy each one at once.
  const head = encoder.encode([prepared.samples]).slice();
  const parts = [head, encoder.finalize().slice()];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

// ---------------------------------------------------------------- main

async function main(): Promise<void> {
  const only = new Set(process.argv.slice(2));
  const unknown = [...only].filter((id) => !INSTRUMENTS.some((d) => d.id === id));
  if (unknown.length) throw new Error(`unknown instruments: ${unknown.join(', ')}`);
  mkdirSync(OUT, { recursive: true });
  const before: Manifest | null = existsSync(MANIFEST) ? (JSON.parse(readFileSync(MANIFEST, 'utf8')) as Manifest) : null;
  const instruments: Record<string, InstrumentEntry> = {};
  let bytes = 0;
  let seconds = 0;
  for (const def of INSTRUMENTS) {
    if (only.size > 0 && !only.has(def.id)) {
      const kept = before?.instruments[def.id];
      if (kept) instruments[def.id] = kept;
      continue;
    }
    for (const file of readdirSync(OUT)) if (file.startsWith(`${def.id}-`)) rmSync(join(OUT, file));
    const picks = await picksOf(def);
    if (picks.length === 0) throw new Error(`${def.id}: no files`);
    let prepared: { pick: Pick; prepared: Prepared }[] = [];
    for (const pick of picks) prepared.push({ pick, prepared: prepare(def, await pick.read(), pick.named) });
    // A pitched instrument without notes in its names (the organ): its range and its thinning by the measured notes.
    if (def.pitched && picks.every((p) => p.named === null)) {
      const [lo, hi] = def.range ?? [-Infinity, Infinity];
      const inRange = prepared.filter((p) => p.prepared.root !== null && p.prepared.root >= lo - 3 && p.prepared.root <= hi + 3);
      const kept = new Set(thin(inRange.map((p) => ({ ...p, named: p.prepared.root })), def.every).map((p) => p.pick));
      prepared = inRange.filter((p) => kept.has(p.pick)).sort((a, b) => a.prepared.root! - b.prepared.root!);
    }
    const samples: SampleEntry[] = [];
    const notes: string[] = [];
    for (const [i, { pick, prepared: one }] of prepared.entries()) {
      const prepared = one;
      const mp3 = await encode(prepared, def.rate);
      const file = `${def.id}-${i + 1}.mp3`;
      writeFileSync(join(OUT, file), mp3);
      bytes += mp3.length;
      seconds += prepared.samples.length / prepared.rate;
      const round = (n: number) => Math.round(n * 10000) / 10000;
      samples.push({ file, root: prepared.root === null ? null : Math.round(prepared.root * 100) / 100, onset: round(prepared.onset), ...(prepared.loop ? { loop: [round(prepared.loop[0]), round(prepared.loop[1])] as const } : {}), seconds: round(prepared.samples.length / prepared.rate) });
      notes.push(def.pitched ? prepared.note : pick.label.replace(/\.wav$/, ''));
    }
    instruments[def.id] = { kind: def.kind, rate: def.rate, samples };
    console.log(`sounds: ${def.id.padEnd(13)} ${String(samples.length).padStart(2)} samples: ${notes.join(', ')}`);
  }
  const manifest: Manifest = { credits: CREDITS, instruments };
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 1)}\n`);
  const total = readdirSync(OUT).reduce((n, f) => n + readFileSync(join(OUT, f)).length, 0);
  console.log(`sounds: ${(bytes / 1e6).toFixed(2)} MB written now (${seconds.toFixed(0)} s of sound); ${(total / 1e6).toFixed(2)} MB in ${OUT}`);
  mp3Decoder?.free();
}

await main();
