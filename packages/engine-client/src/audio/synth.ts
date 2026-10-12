/**
 * The instruments of the game's music and sounds (audio/music.ts, audio/sounds.ts): each one builds a
 * few Web Audio nodes at a time `t` of the context, plays once, and stops by itself. They work in an
 * AudioContext (the page) and in an OfflineAudioContext (tests: a render to a file). Nothing here
 * keeps a node: a sound that has played is gone.
 */

/** A small seeded random generator, so a pluck or a noise sounds the same each time (mulberry32). */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A plucked string by the Karplus-Strong method: a burst of noise in a delay line of one period, which
 * averages itself out into a tone that dies away. `brightness` (0 to 1) is how much of the high part of
 * the burst stays; `decay` how slowly it dies. Returns the samples and the true frequency of the loop
 * (the page corrects the pitch with the playback rate).
 */
export function pluckSamples(freq: number, sampleRate: number, seconds: number, brightness = 0.5, decay = 0.996, seed = 1): { samples: Float32Array; frequency: number } {
  const period = Math.max(2, Math.floor(sampleRate / freq));
  const ring = new Float32Array(period);
  const rand = seeded(seed);
  // The burst, softened by a one-pole low-pass: a darker string for a lower brightness.
  let last = 0;
  for (let i = 0; i < period; i++) {
    last = last + (rand() * 2 - 1 - last) * (0.15 + brightness * 0.85);
    ring[i] = last;
  }
  const length = Math.floor(sampleRate * seconds);
  const samples = new Float32Array(length);
  let index = 0;
  for (let i = 0; i < length; i++) {
    const a = ring[index]!;
    const b = ring[(index + 1) % period]!;
    samples[i] = a;
    ring[index] = decay * 0.5 * (a + b);
    index = (index + 1) % period;
  }
  // A soft start, so the attack does not click.
  for (let i = 0; i < Math.min(64, length); i++) samples[i]! *= i / 64;
  return { samples, frequency: sampleRate / (period + 0.5) };
}

interface Cache {
  readonly plucks: Map<string, { buffer: AudioBuffer; frequency: number }>;
  noise?: AudioBuffer;
  brown?: AudioBuffer;
}
const caches = new WeakMap<BaseAudioContext, Cache>();
function cacheOf(ctx: BaseAudioContext): Cache {
  let cache = caches.get(ctx);
  if (!cache) {
    cache = { plucks: new Map() };
    caches.set(ctx, cache);
  }
  return cache;
}

/** Two seconds of white noise (stereo), made once for each context. */
export function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const cache = cacheOf(ctx);
  if (!cache.noise) {
    const buffer = ctx.createBuffer(2, ctx.sampleRate * 2, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      const rand = seeded(17 + c);
      for (let i = 0; i < data.length; i++) data[i] = rand() * 2 - 1;
    }
    cache.noise = buffer;
  }
  return cache.noise;
}

/** Four seconds of brown noise (stereo): a deep rumble, for wind and fire. */
export function brownBuffer(ctx: BaseAudioContext): AudioBuffer {
  const cache = cacheOf(ctx);
  if (!cache.brown) {
    const buffer = ctx.createBuffer(2, ctx.sampleRate * 4, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      const rand = seeded(29 + c);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        last = (last + 0.02 * (rand() * 2 - 1)) / 1.02;
        data[i] = last * 3.5;
      }
    }
    cache.brown = buffer;
  }
  return cache.brown;
}

/** A reverb: the impulse of a hall, noise that dies away over `seconds`, darker at its end. */
export function reverbBuffer(ctx: BaseAudioContext, seconds: number, seed: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    const rand = seeded(seed + c * 7);
    let low = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      low += (rand() * 2 - 1 - low) * (0.6 - 0.5 * t);
      data[i] = low * (1 - t) ** 2.4;
    }
  }
  return buffer;
}

/** A gain that goes up to `peak` over `attack`, stays, and goes back to nothing over `release`, ending at `end`. */
function envelope(ctx: BaseAudioContext, t: number, attack: number, end: number, release: number, peak: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, Math.max(t + attack, end - release));
  g.gain.linearRampToValueAtTime(0, end);
  return g;
}

/** Pans a node (-1 left to 1 right) and sends it to `out`. */
function panned(ctx: BaseAudioContext, node: AudioNode, out: AudioNode, pan: number): void {
  if (pan === 0) {
    node.connect(out);
    return;
  }
  const p = ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  node.connect(p).connect(out);
}

// ---------------------------------------------------------------- instruments

/** A harp string (pluckSamples). */
export function pluck(ctx: BaseAudioContext, out: AudioNode, t: number, freq: number, gain = 0.25, pan = 0, brightness = 0.55): void {
  const cache = cacheOf(ctx);
  const key = `${freq.toFixed(2)}:${brightness}`;
  let entry = cache.plucks.get(key);
  if (!entry) {
    const made = pluckSamples(freq, ctx.sampleRate, 4, brightness, freq < 150 ? 0.998 : 0.9965, Math.round(freq));
    const buffer = ctx.createBuffer(1, made.samples.length, ctx.sampleRate);
    buffer.getChannelData(0).set(made.samples);
    entry = { buffer, frequency: made.frequency };
    cache.plucks.set(key, entry);
  }
  const src = ctx.createBufferSource();
  src.buffer = entry.buffer;
  src.playbackRate.value = freq / entry.frequency;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(g);
  panned(ctx, g, out, pan);
  src.start(t);
  src.stop(t + entry.buffer.duration);
}

/** A warm pad: two detuned saws for each note, through a low-pass that opens slowly. */
export function pad(ctx: BaseAudioContext, out: AudioNode, t: number, duration: number, freqs: readonly number[], gain = 0.05, cutoff = 900, attack = 2.2, release = 3): void {
  const end = t + duration + release;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 0.6;
  filter.frequency.setValueAtTime(cutoff * 0.5, t);
  filter.frequency.linearRampToValueAtTime(cutoff, t + attack + duration * 0.5);
  filter.frequency.linearRampToValueAtTime(cutoff * 0.6, end);
  const env = envelope(ctx, t, attack, end, release, gain);
  filter.connect(env).connect(out);
  for (const freq of freqs) {
    for (const cents of [-7, 6]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.detune.value = cents;
      osc.connect(filter);
      osc.start(t);
      osc.stop(end + 0.05);
    }
  }
}

/** A low flute: a sine with a little of its octave, a breath of noise, and a vibrato that grows. */
export function flute(ctx: BaseAudioContext, out: AudioNode, t: number, duration: number, freq: number, gain = 0.09, pan = 0): void {
  const end = t + duration + 0.45;
  const env = envelope(ctx, t, 0.14, end, 0.45, gain);
  panned(ctx, env, out, pan);
  const vibrato = ctx.createOscillator();
  vibrato.frequency.value = 4.8;
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(0, t);
  depth.gain.linearRampToValueAtTime(9, t + Math.min(0.9, duration));
  vibrato.connect(depth);
  for (const [type, mult, level] of [
    ['sine', 1, 1],
    ['triangle', 2, 0.12],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq * mult;
    depth.connect(osc.detune);
    const g = ctx.createGain();
    g.gain.value = level;
    osc.connect(g).connect(env);
    osc.start(t);
    osc.stop(end + 0.05);
  }
  const breath = ctx.createBufferSource();
  breath.buffer = noiseBuffer(ctx);
  breath.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = freq * 2;
  band.Q.value = 3;
  const bg = ctx.createGain();
  bg.gain.value = 0.18;
  breath.connect(band).connect(bg).connect(env);
  breath.start(t, Math.random());
  breath.stop(end + 0.05);
  vibrato.start(t);
  vibrato.stop(end + 0.05);
}

/** A choir that sings "ah": detuned saws through the formants of the vowel. */
export function choir(ctx: BaseAudioContext, out: AudioNode, t: number, duration: number, freqs: readonly number[], gain = 0.03, attack = 1.8, release = 2.6): void {
  const end = t + duration + release;
  const env = envelope(ctx, t, attack, end, release, gain);
  env.connect(out);
  const formants: [number, number, number][] = [
    [720, 7, 1],
    [1180, 8, 0.55],
    [2700, 10, 0.22],
  ];
  const voices = ctx.createGain();
  for (const [f, q, level] of formants) {
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = f;
    band.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = level * 3;
    voices.connect(band).connect(g).connect(env);
  }
  const vibrato = ctx.createOscillator();
  vibrato.frequency.value = 5.3;
  const depth = ctx.createGain();
  depth.gain.value = 7;
  vibrato.connect(depth);
  vibrato.start(t);
  vibrato.stop(end + 0.05);
  for (const freq of freqs) {
    for (const cents of [-9, 0, 8]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.detune.value = cents;
      depth.connect(osc.detune);
      osc.connect(voices);
      osc.start(t);
      osc.stop(end + 0.05);
    }
  }
}

/** A bell, by frequency modulation: bright at the strike, a pure tone as it rings out. */
export function bell(ctx: BaseAudioContext, out: AudioNode, t: number, freq: number, gain = 0.06, decay = 4.5, pan = 0): void {
  const end = t + decay;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, end);
  panned(ctx, env, out, pan);
  const carrier = ctx.createOscillator();
  carrier.frequency.value = freq;
  const mod = ctx.createOscillator();
  mod.frequency.value = freq * 3.5;
  const index = ctx.createGain();
  index.gain.setValueAtTime(freq * 2.2, t);
  index.gain.exponentialRampToValueAtTime(freq * 0.05, t + decay * 0.6);
  mod.connect(index).connect(carrier.frequency);
  carrier.connect(env);
  // A second partial, higher and shorter.
  const partial = ctx.createOscillator();
  partial.frequency.value = freq * 2.76;
  const pg = ctx.createGain();
  pg.gain.setValueAtTime(0.35, t);
  pg.gain.exponentialRampToValueAtTime(0.001, t + decay * 0.35);
  partial.connect(pg).connect(env);
  for (const osc of [carrier, mod, partial]) {
    osc.start(t);
    osc.stop(end + 0.05);
  }
}

/** A deep drum, as a timpani: a sine that falls in pitch, and a thump of noise. */
export function boom(ctx: BaseAudioContext, out: AudioNode, t: number, gain = 0.4, pitch = 62, decay = 2.4): void {
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(pitch * 1.7, t);
  osc.frequency.exponentialRampToValueAtTime(pitch, t + 0.18);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(t + decay + 0.05);
  const thump = ctx.createBufferSource();
  thump.buffer = noiseBuffer(ctx);
  const low = ctx.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 220;
  const tg = ctx.createGain();
  tg.gain.setValueAtTime(gain * 0.9, t);
  tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  thump.connect(low).connect(tg).connect(out);
  thump.start(t);
  thump.stop(t + 0.45);
}

/** A hammer on an anvil: the partials of struck metal, and a click. */
export function anvil(ctx: BaseAudioContext, out: AudioNode, t: number, freq = 820, gain = 0.06, pan = 0): void {
  const env = ctx.createGain();
  env.gain.value = gain;
  panned(ctx, env, out, pan);
  for (const [mult, level, decay] of [
    [1, 1, 1.1],
    [2.76, 0.6, 0.7],
    [5.4, 0.35, 0.4],
    [8.93, 0.2, 0.25],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.frequency.value = freq * mult;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(g).connect(env);
    osc.start(t);
    osc.stop(t + decay + 0.05);
  }
  noiseHit(ctx, env, t, 0.03, 2500, 1.2);
}

/** A short hit of noise through a filter: a click, a crackle, the tick of a quill. */
export function noiseHit(ctx: BaseAudioContext, out: AudioNode, t: number, length: number, freq: number, gain: number, type: BiquadFilterType = 'highpass', pan = 0): void {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + length);
  src.connect(filter).connect(g);
  panned(ctx, g, out, pan);
  src.start(t, Math.random() * 1.5);
  src.stop(t + length + 0.02);
}

/** A rush of air: noise through a band that sweeps up and back down. */
export function whoosh(ctx: BaseAudioContext, out: AudioNode, t: number, duration = 1.3, gain = 0.2, from = 260, peak = 1600): void {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 1.4;
  band.frequency.setValueAtTime(from, t);
  band.frequency.exponentialRampToValueAtTime(peak, t + duration * 0.45);
  band.frequency.exponentialRampToValueAtTime(from * 0.8, t + duration);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + duration * 0.45);
  env.gain.linearRampToValueAtTime(0, t + duration);
  src.connect(band).connect(env).connect(out);
  src.start(t, Math.random());
  src.stop(t + duration + 0.05);
}
