/**
 * The sounds of the game (audio/audio.ts plays them): effects that play once, and ambiences that loop
 * under a place or a scene until the engine changes them. All are made of the instruments of
 * audio/synth.ts, with a little chance in each, so a sound that repeats does not sound the same.
 */
import type { Pattern } from './music.ts';
import { midi } from './notes.ts';
import { playNote } from './sampler.ts';
import type { SampleBank } from './samples.ts';
import { anvil, bell, boom, brownBuffer, creak, noiseBuffer, noiseHit, rustle, voice, whoosh } from './synth.ts';
import { hz } from './notes.ts';

/** The recorded instruments that the effects use (a page loads them with the music that comes with them). */
export const EFFECT_INSTRUMENTS = ['gong', 'glock', 'timpaniSoft', 'harp'] as const;

/** The effects (one-shots). */
export const EFFECTS = ['whoosh', 'title', 'tick', 'click', 'end'] as const;
export type EffectId = (typeof EFFECTS)[number];

/**
 * The ambiences (loops): the prologue's scenes (night, wind, gale, candle, forge, hearth, and the town
 * and the shrine of its dominions), and the places of the game, by day and at night (2026-10-13: the
 * sound follows the hour; ambienceOf in audio/game-sounds.ts chooses):
 *   forest      at night: wind, crickets, owls, a far howl now and then, leaves
 *   forestDay   by day: wind, leaves, birds, a woodpecker far off, a crow now and then
 *   townDay     by day: a light wind, a far forge, far voices, a dog now and then
 *   townNight   at night: a light wind, crickets, an owl and a dog now and then
 *   haven       by day: a river, chimes in the wind, birds
 *   havenNight  at night: a river, fewer chimes, crickets, an owl now and then
 *   hearth      the hut at night: a fire and crickets; hearthDay: the fire, and a bird outside
 *   ruins       at night: a strong wind and embers; ruinsDay: and crows
 *   camp        by day: wind and its fires; campNight: and crickets
 *   shrine      by day: a low hum and a bell now and then; shrineNight: and soft crickets
 *   indoor      a room (its hum and a creak), the same at any hour; candle: the chapel
 * `town` (a far forge) is the prologue's: the game's town has townDay and townNight.
 */
export const AMBIENCES = [
  'night',
  'wind',
  'gale',
  'candle',
  'forge',
  'hearth',
  'hearthDay',
  'forest',
  'forestDay',
  'town',
  'townDay',
  'townNight',
  'haven',
  'havenNight',
  'indoor',
  'ruins',
  'ruinsDay',
  'camp',
  'campNight',
  'shrine',
  'shrineNight',
] as const;
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

/** Crickets in the dark: chirps of three short notes, here and there (`loud`: a share of their level). */
const crickets = (t0: number, loud = 1) =>
  events(
    t0,
    () => 0.35 + Math.random() * 1.1,
    (ctx, out, t) => {
      const pitch = 4200 + Math.random() * 700;
      const pan = (Math.random() - 0.5) * 1.6;
      const level = (0.006 + Math.random() * 0.008) * loud;
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

/** Owls far in the woods: a hoot of two notes, now and then (`every`: a share of the gap), from one side or the other. */
const owls = (t0: number, every = 1) =>
  events(
    t0,
    () => (9 + Math.random() * 14) * every,
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

/** Chimes in the wind: a soft high note now and then (`every`: a share of the gap). */
const chimes = (t0: number, every = 1) => events(t0, () => (5 + Math.random() * 7) * every, (ctx, out, t) => bell(ctx, out, t, 1760 * [1, 1.125, 1.25, 1.5][Math.floor(Math.random() * 4)]!, 0.006, 2.5, (Math.random() - 0.5) * 1.2));

/** A low-pass for a sound far away (`cutoff` Hz), from its side, into `out`: the sounds of the day come from the distance. */
function far(ctx: BaseAudioContext, out: AudioNode, cutoff: number, pan: number): AudioNode {
  const low = ctx.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = cutoff;
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  low.connect(p).connect(out);
  return low;
}

/** One whistled note of a bird: a sine that glides from `f0` to `f1` (Hz) in `seconds`. */
function chirp(ctx: BaseAudioContext, out: AudioNode, t: number, f0: number, f1: number, seconds: number, level: number): void {
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(f1, t + seconds);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + Math.min(0.012, seconds * 0.3));
  g.gain.setValueAtTime(level, t + seconds * 0.6);
  g.gain.linearRampToValueAtTime(0, t + seconds);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + seconds + 0.01);
}

/**
 * Birds in the trees by day, here and there (`loud`: a share of their level; `every`: of the gap): a
 * warble of quick notes, a call of two falling notes, or a trill. The woods are dark and overcast: a few
 * birds, soft and far.
 */
const birds = (t0: number, loud = 1, every = 1) =>
  events(
    t0,
    () => (1.4 + Math.random() * 3.2) * every,
    (ctx, out, t) => {
      const level = (0.005 + Math.random() * 0.006) * loud;
      const dest = far(ctx, out, 3800 + Math.random() * 2400, (Math.random() - 0.5) * 1.6);
      const kind = Math.random();
      if (kind < 0.45) {
        // A warble: four to nine quick notes that wander.
        let at = t;
        let f = 2600 + Math.random() * 1600;
        for (let k = 3 + Math.floor(Math.random() * 6); k > 0; k--) {
          const len = 0.04 + Math.random() * 0.06;
          const to = Math.max(2000, Math.min(5200, f * (0.82 + Math.random() * 0.4)));
          chirp(ctx, dest, at, f, to, len, level);
          f = to * (0.9 + Math.random() * 0.25);
          at += len + 0.015 + Math.random() * 0.04;
        }
      } else if (kind < 0.8) {
        // A call: two notes that fall, two or three times.
        const high = 3300 + Math.random() * 900;
        for (let k = 0, n = 2 + Math.floor(Math.random() * 2); k < n; k++) {
          const at = t + k * 0.42;
          chirp(ctx, dest, at, high, high * 0.96, 0.13, level);
          chirp(ctx, dest, at + 0.17, high * 0.8, high * 0.74, 0.16, level * 0.85);
        }
      } else {
        // A trill: a quick run of the same chirp.
        const f = 4000 + Math.random() * 900;
        for (let k = 0, n = 10 + Math.floor(Math.random() * 10); k < n; k++) chirp(ctx, dest, t + k * 0.045, f * 1.04, f, 0.03, level * 0.7);
      }
    },
  );

/** A woodpecker far off: a quick roll of knocks on a trunk, seldom. */
const woodpecker = (t0: number) =>
  events(
    t0 + 8,
    () => 18 + Math.random() * 24,
    (ctx, out, t) => {
      const pan = (Math.random() - 0.5) * 1.6;
      const rate = 14 + Math.random() * 5;
      const n = 10 + Math.floor(Math.random() * 7);
      for (let k = 0; k < n; k++) noiseHit(ctx, out, t + k / rate, 0.012, 1100 + Math.random() * 200, 0.02 * (1 - (k / n) * 0.5), 'bandpass', pan);
    },
  );

/** Crows far away: one to three caws, now and then (`every`: a share of the gap). */
const crows = (t0: number, every = 1) =>
  events(
    t0 + 4,
    () => (12 + Math.random() * 18) * every,
    (ctx, out, t) => {
      const dest = far(ctx, out, 2600, (Math.random() - 0.5) * 1.6);
      const pitch = 560 + Math.random() * 120;
      for (let k = 0, n = 1 + Math.floor(Math.random() * 3); k < n; k++) {
        voice(ctx, dest, t + k * (0.42 + Math.random() * 0.1), { from: pitch, to: pitch * 0.78, seconds: 0.26 + Math.random() * 0.08, formants: [1150, 1900, 2900], rough: 0.55, gain: 0.018 });
      }
    },
  );

/** A dog far away: two or three barks, seldom (`every`: a share of the gap). */
const dog = (t0: number, every = 1) =>
  events(
    t0 + 10,
    () => (24 + Math.random() * 30) * every,
    (ctx, out, t) => {
      const dest = far(ctx, out, 1700, (Math.random() - 0.5) * 1.4);
      const pitch = 420 + Math.random() * 120;
      for (let k = 0, n = 2 + Math.floor(Math.random() * 2); k < n; k++) {
        voice(ctx, dest, t + k * (0.3 + Math.random() * 0.12), { from: pitch, to: pitch * 0.7, seconds: 0.12, formants: [700, 1500, 2600], rough: 0.4, gain: 0.02 });
      }
    },
  );

/** The vowels of far voices (three formants each): a, e, i, o, u. */
const VOWELS: readonly (readonly [number, number, number])[] = [
  [730, 1090, 2440],
  [530, 1840, 2480],
  [300, 2200, 2900],
  [570, 840, 2410],
  [320, 870, 2240],
];

/**
 * People far away in the streets by day: a phrase of a few syllables now and then, a man's voice or a
 * woman's, and a laugh seldom. Far and soft: no words, only the sound of a town at work.
 */
const voices = (t0: number) =>
  events(
    t0,
    () => 1.6 + Math.random() * 3.4,
    (ctx, out, t) => {
      const dest = far(ctx, out, 1500 + Math.random() * 500, (Math.random() - 0.5) * 1.4);
      const woman = Math.random() < 0.45;
      const base = woman ? 190 + Math.random() * 50 : 105 + Math.random() * 40;
      const laugh = Math.random() < 0.1;
      const gain = 0.022 + Math.random() * 0.016;
      let at = t;
      const n = laugh ? 4 + Math.floor(Math.random() * 3) : 2 + Math.floor(Math.random() * 5);
      for (let k = 0; k < n; k++) {
        // A phrase falls a little in pitch to its end; a laugh is quick and high.
        const pitch = laugh ? base * 1.4 * (1 - k * 0.03) : base * (1.08 - (k / n) * 0.18) * (0.95 + Math.random() * 0.1);
        const seconds = laugh ? 0.09 : 0.09 + Math.random() * 0.14;
        const vowel = laugh ? VOWELS[0]! : VOWELS[Math.floor(Math.random() * VOWELS.length)]!;
        const formants: [number, number, number] = woman ? [vowel[0] * 1.15, vowel[1] * 1.15, vowel[2] * 1.1] : [vowel[0], vowel[1], vowel[2]];
        voice(ctx, dest, at, { from: pitch, to: pitch * (laugh ? 0.9 : 0.96), seconds, formants, rough: 0.25, gain });
        at += seconds + (laugh ? 0.06 : 0.03 + Math.random() * 0.07);
      }
    },
  );

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
    case 'hearthDay':
      // The fire; outside, through the wall, a bird now and then.
      sources.push(...roar(ctx, out, t0, 0.025, 300));
      patterns.push(crackle(t0, 0.022), birds(t0, 0.5, 2.5));
      break;
    case 'forest':
      sources.push(...wind(ctx, out, t0, 0.04, 200, 480, 0.06));
      patterns.push(crickets(t0), owls(t0), howls(t0), leaves(t0));
      break;
    case 'forestDay':
      // A little more wind and leaves than at night, birds, and no crickets or owls.
      sources.push(...wind(ctx, out, t0, 0.045, 220, 560, 0.07));
      patterns.push(birds(t0), woodpecker(t0), crows(t0, 1.6), leaves(t0), leaves(t0 + 2.5));
      break;
    case 'town':
      sources.push(...wind(ctx, out, t0, 0.03, 240, 560, 0.08));
      patterns.push(farAnvils(t0));
      break;
    case 'townDay':
      sources.push(...wind(ctx, out, t0, 0.03, 240, 560, 0.08));
      patterns.push(farAnvils(t0), voices(t0), dog(t0), birds(t0, 0.6, 2));
      break;
    case 'townNight':
      sources.push(...wind(ctx, out, t0, 0.03, 220, 520, 0.07));
      patterns.push(crickets(t0, 0.7), owls(t0, 1.8), dog(t0, 1.6));
      break;
    case 'haven':
      sources.push(...wind(ctx, out, t0, 0.03, 260, 600, 0.08), ...babble(ctx, out, t0, 0.025));
      patterns.push(chimes(t0), birds(t0, 0.8, 1.4));
      break;
    case 'havenNight':
      sources.push(...wind(ctx, out, t0, 0.03, 240, 560, 0.07), ...babble(ctx, out, t0, 0.025));
      patterns.push(chimes(t0, 1.6), crickets(t0, 0.8), owls(t0, 1.6));
      break;
    case 'indoor':
      sources.push(...roar(ctx, out, t0, 0.012, 180));
      patterns.push(creaks(t0));
      break;
    case 'ruins':
      sources.push(...wind(ctx, out, t0, 0.07, 260, 760, 0.1));
      patterns.push(crackle(t0, 0.01));
      break;
    case 'ruinsDay':
      sources.push(...wind(ctx, out, t0, 0.07, 260, 760, 0.1));
      patterns.push(crackle(t0, 0.01), crows(t0));
      break;
    case 'camp':
      sources.push(...wind(ctx, out, t0, 0.04, 220, 520, 0.07), ...roar(ctx, out, t0, 0.03, 300));
      patterns.push(crackle(t0, 0.02));
      break;
    case 'campNight':
      sources.push(...wind(ctx, out, t0, 0.04, 220, 520, 0.07), ...roar(ctx, out, t0, 0.03, 300));
      patterns.push(crackle(t0, 0.02), crickets(t0, 0.8));
      break;
    case 'shrine':
      sources.push(...wind(ctx, out, t0, 0.05, 160, 420, 0.05), ...hum(ctx, out, t0, 0.006));
      patterns.push(farBell(t0));
      break;
    case 'shrineNight':
      sources.push(...wind(ctx, out, t0, 0.05, 160, 420, 0.05), ...hum(ctx, out, t0, 0.006));
      patterns.push(farBell(t0), crickets(t0, 0.5));
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
