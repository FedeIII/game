/**
 * The sounds of the game (audio/audio.ts plays them): effects that play once, and ambiences that loop
 * under a place or a scene until the engine changes them. All are made of the instruments of
 * audio/synth.ts, with a little chance in each, so a sound that repeats does not sound the same.
 */
import type { Pattern } from './music.ts';
import { midi } from './notes.ts';
import { playNote } from './sampler.ts';
import type { SampleBank } from './samples.ts';
import { anvil, bell, boom, brownBuffer, creak, noiseBuffer, noiseHit, rustle, whoosh } from './synth.ts';
import { hz } from './notes.ts';

/** The recorded instruments that the effects use (a page loads them with the music that comes with them). */
export const EFFECT_INSTRUMENTS = ['gong', 'glock', 'timpaniSoft', 'harp'] as const;

/** The effects (one-shots). */
export const EFFECTS = ['whoosh', 'title', 'tick', 'click', 'end'] as const;
export type EffectId = (typeof EFFECTS)[number];

/**
 * The ambiences (loops): the prologue's scenes (night, wind, gale, candle, forge, hearth), and the
 * places of the game: the night forest (wind, crickets, owls, a far howl now and then, leaves), a town
 * (a far forge), a haven by a river (water, chimes), a room (its hum and a creak), the ruins (wind and
 * embers), a camp (its fires), the shrine (a low hum, a bell now and then).
 */
export const AMBIENCES = ['night', 'wind', 'gale', 'candle', 'forge', 'hearth', 'forest', 'town', 'haven', 'indoor', 'ruins', 'camp', 'shrine'] as const;
export type AmbienceId = (typeof AMBIENCES)[number];

/** The sounds of things near the player (positional: the game sets their gain and pan): water, a fire, a fountain, a forge. */
export const LAYERS = ['water', 'fire', 'fountain', 'forge'] as const;
export type LayerId = (typeof LAYERS)[number];

/** Plays an effect at time `t`, on the recorded instruments of `bank` where it has them, else synthesized. */
export function playEffect(id: EffectId, ctx: BaseAudioContext, out: AudioNode, t: number, bank?: SampleBank): void {
  const gong = bank?.get('gong');
  const glock = bank?.get('glock');
  const timpani = bank?.get('timpaniSoft');
  const harp = bank?.get('harp');
  switch (id) {
    case 'whoosh':
      whoosh(ctx, out, t, 1.5, 0.12, 240, 1300);
      break;
    case 'title':
      if (gong && glock && timpani) {
        // A soft gong and a timpani under a breath of air, and two glockenspiel notes a fifth apart.
        playNote(ctx, out, gong, null, { t, dur: 6, vel: 0.45 });
        playNote(ctx, out, timpani, null, { t, dur: 3, vel: 0.6 });
        whoosh(ctx, out, t, 3.2, 0.05, 120, 700);
        playNote(ctx, out, glock, midi('D6'), { t: t + 0.05, dur: 2, vel: 0.45, pan: -0.25 });
        playNote(ctx, out, glock, midi('A6'), { t: t + 0.12, dur: 2, vel: 0.35, pan: 0.25 });
        break;
      }
      // A deep drum, a long breath of air, and two bells a fifth apart.
      boom(ctx, out, t, 0.42, 46, 3.6);
      whoosh(ctx, out, t, 3.2, 0.07, 120, 700);
      bell(ctx, out, t + 0.04, hz('D5'), 0.05, 6, -0.25);
      bell(ctx, out, t + 0.1, hz('A5'), 0.035, 6, 0.25);
      break;
    case 'tick':
      // The scratch of a quill: a tiny click, never twice the same.
      noiseHit(ctx, out, t, 0.01 + Math.random() * 0.012, 3600 + Math.random() * 2400, 0.018 + Math.random() * 0.01, 'highpass', (Math.random() - 0.5) * 0.4);
      break;
    case 'click': {
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(980, t);
      osc.frequency.exponentialRampToValueAtTime(620, t + 0.05);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + 0.08);
      break;
    }
    case 'end':
      if (glock && harp) {
        // The chord of D minor on the glockenspiel, with the harp under it.
        ['D6', 'F6', 'A6'].forEach((note, i) => playNote(ctx, out, glock, midi(note), { t: t + i * 0.22, dur: 2, vel: 0.45, pan: (i - 1) * 0.3 }));
        ['D3', 'A3', 'D4', 'F4'].forEach((note, i) => playNote(ctx, out, harp, midi(note), { t: t + i * 0.11, dur: 3, vel: 0.5, pan: -0.3 }));
        break;
      }
      bell(ctx, out, t, hz('D5'), 0.04, 5, -0.3);
      bell(ctx, out, t + 0.22, hz('F5'), 0.035, 5, 0);
      bell(ctx, out, t + 0.44, hz('A5'), 0.035, 6, 0.3);
      break;
  }
}

/** A loop that plays under a scene: its steady sound starts at once, and its events come as the time comes. */
export interface Ambience extends Pattern {
  /** Ends it at `t` (the engine fades its gain first). */
  stop(t: number): void;
}

/** Wind: brown noise through a band whose middle and loudness drift, in slow gusts. */
function wind(ctx: BaseAudioContext, out: AudioNode, t0: number, level: number, low: number, high: number, gustHz: number): AudioScheduledSourceNode[] {
  const src = ctx.createBufferSource();
  src.buffer = brownBuffer(ctx);
  src.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 0.8;
  band.frequency.value = (low + high) / 2;
  const drift = ctx.createOscillator();
  drift.frequency.value = gustHz * 0.6;
  const driftDepth = ctx.createGain();
  driftDepth.gain.value = (high - low) / 2;
  drift.connect(driftDepth).connect(band.frequency);
  const g = ctx.createGain();
  g.gain.value = level;
  const gust = ctx.createOscillator();
  gust.frequency.value = gustHz;
  const gustDepth = ctx.createGain();
  gustDepth.gain.value = level * 0.6;
  gust.connect(gustDepth).connect(g.gain);
  src.connect(band).connect(g).connect(out);
  for (const node of [src, drift, gust]) node.start(t0);
  return [src, drift, gust];
}

/** The roar of a fire: brown noise, low. */
function roar(ctx: BaseAudioContext, out: AudioNode, t0: number, level: number, cutoff: number): AudioScheduledSourceNode[] {
  const src = ctx.createBufferSource();
  src.buffer = brownBuffer(ctx);
  src.loop = true;
  const low = ctx.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = cutoff;
  const g = ctx.createGain();
  g.gain.value = level;
  src.connect(low).connect(g).connect(out);
  src.start(t0, 1.3);
  return [src];
}

/** Events at random times: `every()` gives the gap to the next one, `play(t)` plays one. */
function events(t0: number, every: () => number, play: (ctx: BaseAudioContext, out: AudioNode, t: number) => void): Pattern {
  let next = t0 + every() * 0.5;
  return {
    schedule(ctx, out, until) {
      while (next < until) {
        play(ctx, out, next);
        next += every();
      }
    },
  };
}

/** Crickets in the dark: chirps of three short notes, here and there. */
const crickets = (t0: number) =>
  events(
    t0,
    () => 0.35 + Math.random() * 1.1,
    (ctx, out, t) => {
      const pitch = 4200 + Math.random() * 700;
      const pan = (Math.random() - 0.5) * 1.6;
      const level = 0.006 + Math.random() * 0.008;
      for (let k = 0; k < 3; k++) {
        const osc = ctx.createOscillator();
        osc.frequency.value = pitch;
        const g = ctx.createGain();
        const at = t + k * 0.055;
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(level, at + 0.006);
        g.gain.linearRampToValueAtTime(0, at + 0.03);
        const p = ctx.createStereoPanner();
        p.pan.value = pan;
        osc.connect(g).connect(p).connect(out);
        osc.start(at);
        osc.stop(at + 0.035);
      }
    },
  );

/** The crackle of a fire: little clicks and now and then a pop. */
const crackle = (t0: number, level: number) =>
  events(
    t0,
    () => 0.03 + Math.random() * 0.28,
    (ctx, out, t) => {
      const pop = Math.random() < 0.12;
      noiseHit(ctx, out, t, pop ? 0.04 : 0.006 + Math.random() * 0.012, pop ? 900 : 1800 + Math.random() * 2600, level * (pop ? 1.6 : 0.4 + Math.random() * 0.8), pop ? 'bandpass' : 'highpass', (Math.random() - 0.5) * 0.6);
    },
  );

/** Hammers on anvils, far in the factory: two strokes, a rest, again. */
const anvils = (t0: number) =>
  events(
    t0,
    () => 1.5 + Math.random() * 1.1,
    (ctx, out, t) => {
      const freq = 760 + Math.random() * 140;
      const pan = (Math.random() - 0.5) * 1.2;
      anvil(ctx, out, t, freq, 0.035, pan);
      anvil(ctx, out, t + 0.34, freq * 1.01, 0.028, pan);
      if (Math.random() < 0.3) boom(ctx, out, t + 0.1, 0.06, 40, 1.4);
    },
  );

/** Owls far in the woods: a hoot of two notes, now and then, from one side or the other. */
const owls = (t0: number) =>
  events(
    t0,
    () => 9 + Math.random() * 14,
    (ctx, out, t) => {
      const pitch = 360 + Math.random() * 60;
      const pan = (Math.random() - 0.5) * 1.6;
      for (const [at, len, f] of [
        [0, 0.22, pitch],
        [0.38, 0.5, pitch * 0.95],
      ] as const) {
        const osc = ctx.createOscillator();
        osc.frequency.setValueAtTime(f, t + at);
        osc.frequency.linearRampToValueAtTime(f * 0.94, t + at + len);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t + at);
        g.gain.linearRampToValueAtTime(0.018, t + at + 0.06);
        g.gain.linearRampToValueAtTime(0, t + at + len);
        const p = ctx.createStereoPanner();
        p.pan.value = pan;
        osc.connect(g).connect(p).connect(out);
        osc.start(t + at);
        osc.stop(t + at + len + 0.02);
      }
    },
  );

/** A wolf far away: a long howl that rises and falls, very soft, seldom. */
const howls = (t0: number) =>
  events(
    t0 + 20,
    () => 35 + Math.random() * 50,
    (ctx, out, t) => {
      const osc = ctx.createOscillator();
      const base = 380 + Math.random() * 60;
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.linearRampToValueAtTime(base * 1.55, t + 0.5);
      osc.frequency.linearRampToValueAtTime(base * 1.45, t + 1.4);
      osc.frequency.linearRampToValueAtTime(base * 1.1, t + 2);
      const vib = ctx.createOscillator();
      vib.frequency.value = 5;
      const depth = ctx.createGain();
      depth.gain.value = 6;
      vib.connect(depth).connect(osc.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.01, t + 0.4);
      g.gain.setValueAtTime(0.01, t + 1.5);
      g.gain.linearRampToValueAtTime(0, t + 2);
      const low = ctx.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.value = 1400;
      const p = ctx.createStereoPanner();
      p.pan.value = (Math.random() - 0.5) * 1.6;
      osc.connect(low).connect(g).connect(p).connect(out);
      for (const n of [osc, vib]) {
        n.start(t);
        n.stop(t + 2.05);
      }
    },
  );

/** Leaves stirred by a gust, here and there. */
const leaves = (t0: number) => events(t0, () => 4 + Math.random() * 6, (ctx, out, t) => rustle(ctx, out, t, 0.6 + Math.random() * 0.6, 2400 + Math.random() * 1500, 0.012));

/** A far forge: two strokes on an anvil, now and then. */
const farAnvils = (t0: number) =>
  events(
    t0,
    () => 6 + Math.random() * 5,
    (ctx, out, t) => {
      const pan = (Math.random() - 0.5) * 1.2;
      anvil(ctx, out, t, 780 + Math.random() * 100, 0.008, pan);
      anvil(ctx, out, t + 0.36, 790 + Math.random() * 100, 0.006, pan);
    },
  );

/** Chimes in the wind: a soft high note now and then. */
const chimes = (t0: number) => events(t0, () => 5 + Math.random() * 7, (ctx, out, t) => bell(ctx, out, t, 1760 * [1, 1.125, 1.25, 1.5][Math.floor(Math.random() * 4)]!, 0.006, 2.5, (Math.random() - 0.5) * 1.2));

/** A board that creaks somewhere in the room. */
const creaks = (t0: number) => events(t0, () => 8 + Math.random() * 12, (ctx, out, t) => creak(ctx, out, t, 0.25 + Math.random() * 0.3, 40 + Math.random() * 30, 0.03));

/** A bell far off, seldom. */
const farBell = (t0: number) => events(t0, () => 10 + Math.random() * 12, (ctx, out, t) => bell(ctx, out, t, 440 * [1, 1.5, 1.2][Math.floor(Math.random() * 3)]!, 0.012, 6, (Math.random() - 0.5) * 0.8));

/** Water over stones: noise through three bands whose middles wander. */
function babble(ctx: BaseAudioContext, out: AudioNode, t0: number, level: number): AudioScheduledSourceNode[] {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  const sources: AudioScheduledSourceNode[] = [src];
  for (const [f, q, rate] of [
    [380, 2.5, 0.7],
    [900, 3, 1.1],
    [1900, 3.5, 1.7],
  ] as const) {
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = f;
    band.Q.value = q;
    const lfo = ctx.createOscillator();
    lfo.type = 'triangle';
    lfo.frequency.value = rate * (0.8 + Math.random() * 0.4);
    const depth = ctx.createGain();
    depth.gain.value = f * 0.35;
    lfo.connect(depth).connect(band.frequency);
    const g = ctx.createGain();
    g.gain.value = level;
    src.connect(band).connect(g).connect(out);
    lfo.start(t0);
    sources.push(lfo);
  }
  src.start(t0);
  return sources;
}

/** A low hum of two notes a fifth apart, that breathes. */
function hum(ctx: BaseAudioContext, out: AudioNode, t0: number, level: number): AudioScheduledSourceNode[] {
  const g = ctx.createGain();
  g.gain.value = level;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.08;
  const depth = ctx.createGain();
  depth.gain.value = level * 0.5;
  lfo.connect(depth).connect(g.gain);
  g.connect(out);
  const sources: AudioScheduledSourceNode[] = [lfo];
  for (const f of [55, 82.6, 110.3]) {
    const osc = ctx.createOscillator();
    osc.frequency.value = f;
    osc.connect(g);
    osc.start(t0);
    sources.push(osc);
  }
  lfo.start(t0);
  return sources;
}

/** Drops of a fountain: small bright bubbles. */
const drops = (t0: number) =>
  events(
    t0,
    () => 0.05 + Math.random() * 0.2,
    (ctx, out, t) => {
      const osc = ctx.createOscillator();
      const f = 900 + Math.random() * 1400;
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.04);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.02, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + 0.06);
    },
  );

/** Starts a sound of a thing near the player (the game sets its gain and pan). */
export function startLayer(id: LayerId, ctx: BaseAudioContext, out: AudioNode, t0: number): Ambience {
  const sources: AudioScheduledSourceNode[] = [];
  const patterns: Pattern[] = [];
  switch (id) {
    case 'water':
      sources.push(...babble(ctx, out, t0, 0.06));
      break;
    case 'fire':
      sources.push(...roar(ctx, out, t0, 0.05, 320));
      patterns.push(crackle(t0, 0.035));
      break;
    case 'fountain':
      sources.push(...babble(ctx, out, t0, 0.025));
      patterns.push(drops(t0));
      break;
    case 'forge':
      sources.push(...roar(ctx, out, t0, 0.06, 360));
      patterns.push(crackle(t0, 0.03), anvils(t0));
      break;
  }
  return {
    schedule(c, o, until) {
      for (const p of patterns) p.schedule(c, o, until);
    },
    stop(t) {
      for (const s of sources) s.stop(t);
      patterns.length = 0;
    },
  };
}

/** Starts an ambience at `t0`. */
export function startAmbience(id: AmbienceId, ctx: BaseAudioContext, out: AudioNode, t0: number): Ambience {
  const sources: AudioScheduledSourceNode[] = [];
  const patterns: Pattern[] = [];
  switch (id) {
    case 'night':
      sources.push(...wind(ctx, out, t0, 0.05, 220, 520, 0.07));
      patterns.push(crickets(t0));
      break;
    case 'wind':
      sources.push(...wind(ctx, out, t0, 0.09, 280, 820, 0.1));
      break;
    case 'gale':
      sources.push(...wind(ctx, out, t0, 0.12, 360, 1200, 0.16));
      break;
    case 'candle':
      sources.push(...roar(ctx, out, t0, 0.012, 260));
      patterns.push(crackle(t0, 0.012));
      break;
    case 'forge':
      sources.push(...roar(ctx, out, t0, 0.07, 340));
      patterns.push(crackle(t0, 0.03), anvils(t0));
      break;
    case 'hearth':
      sources.push(...roar(ctx, out, t0, 0.025, 300));
      patterns.push(crackle(t0, 0.022), crickets(t0));
      break;
    case 'forest':
      sources.push(...wind(ctx, out, t0, 0.04, 200, 480, 0.06));
      patterns.push(crickets(t0), owls(t0), howls(t0), leaves(t0));
      break;
    case 'town':
      sources.push(...wind(ctx, out, t0, 0.03, 240, 560, 0.08));
      patterns.push(farAnvils(t0));
      break;
    case 'haven':
      sources.push(...wind(ctx, out, t0, 0.03, 260, 600, 0.08), ...babble(ctx, out, t0, 0.025));
      patterns.push(chimes(t0));
      break;
    case 'indoor':
      sources.push(...roar(ctx, out, t0, 0.012, 180));
      patterns.push(creaks(t0));
      break;
    case 'ruins':
      sources.push(...wind(ctx, out, t0, 0.07, 260, 760, 0.1));
      patterns.push(crackle(t0, 0.01));
      break;
    case 'camp':
      sources.push(...wind(ctx, out, t0, 0.04, 220, 520, 0.07), ...roar(ctx, out, t0, 0.03, 300));
      patterns.push(crackle(t0, 0.02));
      break;
    case 'shrine':
      sources.push(...wind(ctx, out, t0, 0.05, 160, 420, 0.05), ...hum(ctx, out, t0, 0.006));
      patterns.push(farBell(t0));
      break;
  }
  return {
    schedule(c, o, until) {
      for (const p of patterns) p.schedule(c, o, until);
    },
    stop(t) {
      for (const s of sources) s.stop(t);
      patterns.length = 0;
    },
  };
}
