/**
 * The sound effects of the game (2026-10-12, Fede's request: "more sound effects ... extend the sound
 * system to the entire game"): each one a short recipe of synthesized sounds (audio/synth.ts) and of
 * recorded ones (metal, bubbles, a scrape, a chain: audio/samples.ts).
 *
 * An effect plays once at first as its recipe (live Web Audio nodes); meanwhile a few variants of it
 * are rendered into small buffers (an OfflineAudioContext, mono, 32 kHz), and from then on it plays
 * one of them at random, a little higher or lower: a sound that repeats (a step) never sounds the
 * same twice, and costs one node.
 */
import type { AudioEngine } from './audio.ts';
import { playNote } from './sampler.ts';
import type { SampleBank } from './samples.ts';
import { boom, bell, clink, creak, crunch, gulp, noiseHit, ring, rustle, splash, thud, voice, whoosh, type VoiceShape } from './synth.ts';

type Render = (ctx: BaseAudioContext, out: AudioNode, t: number, bank: SampleBank) => void;

interface FxDef {
  /** How long it is (s): the length of a rendered variant. */
  readonly seconds: number;
  /** How many variants to render. */
  readonly variants: number;
  /** The recorded instruments that it plays. */
  readonly samples?: readonly string[];
  readonly render: Render;
}

/** A recorded sound of the bank, if it is loaded: a variant at random, `cents` higher or lower. */
function rec(bank: SampleBank, inst: string, ctx: BaseAudioContext, out: AudioNode, t: number, vel: number, cents = 0): void {
  const instrument = bank.get(inst);
  if (instrument) playNote(ctx, out, instrument, null, { t, dur: 2, vel, detune: cents + (Math.random() - 0.5) * 200 });
}

const r = (a: number, b: number) => a + Math.random() * (b - a);

export const FX = {
  // ------------------------------------------------------------ fights
  swing: { seconds: 0.35, variants: 4, render: (c, o, t) => whoosh(c, o, t, r(0.18, 0.24), 0.32, r(400, 520), r(2200, 3000)) },
  swingHeavy: { seconds: 0.45, variants: 3, render: (c, o, t) => whoosh(c, o, t, r(0.28, 0.34), 0.38, r(220, 300), r(1300, 1700)) },
  swingLight: { seconds: 0.25, variants: 3, render: (c, o, t) => whoosh(c, o, t, r(0.12, 0.16), 0.24, r(650, 800), r(2600, 3200)) },
  bowShot: {
    seconds: 0.35,
    variants: 3,
    render: (c, o, t) => {
      // The string: a low tone that dies at once; the click of the release; the arrow away.
      const osc = c.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(r(150, 175), t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.12);
      const g = c.createGain();
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(g).connect(o);
      osc.start(t);
      osc.stop(t + 0.18);
      noiseHit(c, o, t, 0.015, 3200, 0.2, 'highpass');
      whoosh(c, o, t + 0.02, 0.18, 0.12, 900, 3200);
    },
  },
  cantrip: {
    seconds: 0.6,
    variants: 3,
    samples: ['zap'],
    render: (c, o, t, b) => {
      rec(b, 'zap', c, o, t, 0.5, 300);
      whoosh(c, o, t, 0.26, 0.14, 800, 4200);
    },
  },
  arrowHit: {
    seconds: 0.2,
    variants: 3,
    render: (c, o, t) => {
      thud(c, o, t, r(200, 240), 0.25, 0.08);
      noiseHit(c, o, t, 0.03, 1500, 0.22, 'bandpass');
    },
  },
  fireBolt: {
    seconds: 0.7,
    variants: 3,
    samples: ['zap'],
    render: (c, o, t, b) => {
      rec(b, 'zap', c, o, t, 0.4, -500);
      whoosh(c, o, t, 0.45, 0.2, 200, 1400);
      crunch(c, o, t + 0.1, 0.08, 2600);
    },
  },
  fireHit: {
    seconds: 0.5,
    variants: 3,
    render: (c, o, t) => {
      noiseHit(c, o, t, 0.25, 900, 0.4, 'lowpass');
      crunch(c, o, t + 0.05, 0.12, 2800);
      crunch(c, o, t + 0.2, 0.08, 2200);
    },
  },
  hitFlesh: {
    seconds: 0.3,
    variants: 4,
    render: (c, o, t) => {
      thud(c, o, t, r(90, 115), 0.6, 0.14);
      noiseHit(c, o, t, 0.06, r(1000, 1400), 0.35, 'lowpass');
      noiseHit(c, o, t + 0.005, 0.02, 2500, 0.12, 'bandpass');
    },
  },
  hitArmor: {
    seconds: 0.9,
    variants: 4,
    samples: ['metalHit'],
    render: (c, o, t, b) => {
      rec(b, 'metalHit', c, o, t, 0.5);
      thud(c, o, t, 120, 0.35, 0.1);
    },
  },
  crit: {
    seconds: 0.9,
    variants: 3,
    samples: ['slap'],
    render: (c, o, t, b) => {
      thud(c, o, t, 80, 0.65, 0.2);
      noiseHit(c, o, t, 0.08, 1200, 0.4, 'lowpass');
      rec(b, 'slap', c, o, t, 0.6);
      boom(c, o, t, 0.22, 55, 0.6);
    },
  },
  glance: {
    seconds: 0.8,
    variants: 3,
    samples: ['metalHit'],
    render: (c, o, t, b) => {
      rec(b, 'metalHit', c, o, t, 0.4, 600);
      clink(c, o, t + 0.01, r(3200, 3800), 0.06);
    },
  },
  hurt: {
    seconds: 1,
    variants: 3,
    render: (c, o, t) => {
      thud(c, o, t, 70, 0.7, 0.22);
      noiseHit(c, o, t, 0.1, 700, 0.5, 'lowpass');
      ring(c, o, t + 0.05, 0.022, 0.8);
    },
  },
  down: {
    seconds: 1.6,
    variants: 1,
    render: (c, o, t) => {
      boom(c, o, t, 0.5, 45, 1.4);
      thud(c, o, t + 0.05, 60, 0.6, 0.3);
      rustle(c, o, t + 0.1, 0.4, 800, 0.15);
    },
  },
  dodge: {
    seconds: 0.5,
    variants: 3,
    render: (c, o, t) => {
      whoosh(c, o, t, 0.32, 0.18, 220, 1100);
      rustle(c, o, t, 0.25, 1800, 0.08);
      thud(c, o, t + 0.3, 80, 0.2, 0.08);
    },
  },
  mobFall: {
    seconds: 0.4,
    variants: 3,
    render: (c, o, t) => {
      thud(c, o, t, r(55, 75), 0.45, 0.25);
      rustle(c, o, t + 0.05, 0.2, 900, 0.1);
    },
  },
  // ------------------------------------------------------------ steps
  stepGrass: {
    seconds: 0.1,
    variants: 5,
    render: (c, o, t) => {
      noiseHit(c, o, t, 0.05, r(1000, 1600), 0.16, 'bandpass');
      thud(c, o, t, 55, 0.08, 0.05);
    },
  },
  stepDirt: {
    seconds: 0.12,
    variants: 5,
    render: (c, o, t) => {
      noiseHit(c, o, t, 0.035, r(1900, 2600), 0.28, 'bandpass');
      crunch(c, o, t + 0.01, 0.08, 2500);
    },
  },
  stepSand: {
    seconds: 0.12,
    variants: 4,
    render: (c, o, t) => {
      noiseHit(c, o, t, 0.05, r(2800, 3600), 0.2, 'bandpass');
      crunch(c, o, t + 0.01, 0.06, 3200);
    },
  },
  stepStone: {
    seconds: 0.1,
    variants: 5,
    render: (c, o, t) => {
      thud(c, o, t, r(150, 190), 0.12, 0.04);
      noiseHit(c, o, t, 0.008, 3500, 0.08, 'highpass');
    },
  },
  stepWood: {
    seconds: 0.12,
    variants: 5,
    render: (c, o, t) => {
      thud(c, o, t, r(105, 125), 0.18, 0.07);
      noiseHit(c, o, t, 0.02, 900, 0.1, 'bandpass');
    },
  },
  stepEarth: {
    seconds: 0.1,
    variants: 4,
    render: (c, o, t) => {
      noiseHit(c, o, t, 0.05, 600, 0.18, 'lowpass');
      thud(c, o, t, 60, 0.08, 0.05);
    },
  },
  stepWater: { seconds: 0.3, variants: 4, render: (c, o, t) => splash(c, o, t, 0.2, r(0.18, 0.24)) },
  // ------------------------------------------------------------ doors and things
  doorOpen: {
    seconds: 0.7,
    variants: 3,
    samples: ['woodClick'],
    render: (c, o, t, b) => {
      rec(b, 'woodClick', c, o, t, 0.5);
      creak(c, o, t + 0.05, r(0.45, 0.6), r(45, 65), 0.2);
    },
  },
  doorClose: {
    seconds: 0.35,
    variants: 3,
    samples: ['woodClick'],
    render: (c, o, t, b) => {
      thud(c, o, t, 95, 0.45, 0.14);
      rec(b, 'woodClick', c, o, t + 0.04, 0.6);
    },
  },
  // Up or down the stairs of a building (Building.storeys): four steps on wood, and a creak.
  stairs: {
    seconds: 0.8,
    variants: 3,
    samples: ['woodClick'],
    render: (c, o, t, b) => {
      for (let i = 0; i < 4; i++) {
        thud(c, o, t + i * 0.13 + r(0, 0.02), r(110, 140), 0.32, 0.08);
        rec(b, 'woodClick', c, o, t + i * 0.13, 0.25, -300);
      }
      creak(c, o, t + 0.2, 0.35, r(55, 70), 0.08);
    },
  },
  doorLocked: {
    seconds: 0.6,
    variants: 2,
    samples: ['chain', 'woodClick'],
    render: (c, o, t, b) => {
      rec(b, 'chain', c, o, t, 0.3);
      rec(b, 'woodClick', c, o, t, 0.45, 400);
      rec(b, 'woodClick', c, o, t + 0.09, 0.4, 400);
    },
  },
  doorBarred: {
    seconds: 0.5,
    variants: 2,
    render: (c, o, t) => {
      thud(c, o, t, 80, 0.6, 0.2);
      creak(c, o, t + 0.05, 0.18, 40, 0.15);
    },
  },
  doorForced: {
    seconds: 1.2,
    variants: 2,
    samples: ['slap'],
    render: (c, o, t, b) => {
      boom(c, o, t, 0.45, 50, 1);
      noiseHit(c, o, t, 0.35, 1100, 0.5, 'bandpass');
      rec(b, 'slap', c, o, t, 0.7);
      for (let k = 0; k < 4; k++) noiseHit(c, o, t + 0.04 + k * r(0.03, 0.07), 0.02, r(1500, 3000), 0.25, 'bandpass');
    },
  },
  chestOpen: {
    seconds: 0.5,
    variants: 3,
    render: (c, o, t) => {
      creak(c, o, t, 0.35, r(75, 95), 0.2);
      thud(c, o, t + 0.35, 110, 0.25, 0.08);
    },
  },
  chestLocked: {
    seconds: 0.6,
    variants: 2,
    samples: ['chain', 'woodClick'],
    render: (c, o, t, b) => {
      rec(b, 'chain', c, o, t, 0.3, 300);
      rec(b, 'woodClick', c, o, t + 0.05, 0.4, 600);
    },
  },
  lockPick: {
    seconds: 0.8,
    variants: 2,
    samples: ['guiro', 'woodClick'],
    render: (c, o, t, b) => {
      rec(b, 'guiro', c, o, t, 0.35);
      noiseHit(c, o, t + 0.25, 0.008, 4000, 0.12, 'highpass');
      noiseHit(c, o, t + 0.4, 0.008, 4200, 0.12, 'highpass');
      rec(b, 'woodClick', c, o, t + 0.55, 0.55, 300);
    },
  },
  herbs: {
    seconds: 0.5,
    variants: 3,
    render: (c, o, t) => {
      rustle(c, o, t, 0.3, 2600, 0.22);
      crunch(c, o, t + 0.15, 0.16, 2400);
    },
  },
  dig: {
    seconds: 1.1,
    variants: 2,
    samples: ['scrape'],
    render: (c, o, t, b) => {
      rec(b, 'scrape', c, o, t, 0.5);
      rec(b, 'scrape', c, o, t + 0.35, 0.45);
      thud(c, o, t + 0.7, 70, 0.25, 0.15);
    },
  },
  coins: {
    seconds: 0.5,
    variants: 4,
    samples: ['shaker'],
    render: (c, o, t, b) => {
      const n = 3 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) clink(c, o, t + Math.random() * 0.2, r(2400, 3800), r(0.06, 0.11));
      rec(b, 'shaker', c, o, t, 0.2);
    },
  },
  pickup: {
    seconds: 0.25,
    variants: 3,
    render: (c, o, t) => {
      rustle(c, o, t, 0.15, 1800, 0.12);
      thud(c, o, t + 0.08, 140, 0.12, 0.05);
    },
  },
  drop: {
    seconds: 0.25,
    variants: 3,
    render: (c, o, t) => {
      thud(c, o, t, 90, 0.3, 0.12);
      rustle(c, o, t, 0.12, 1200, 0.08);
    },
  },
  equip: {
    seconds: 0.6,
    variants: 3,
    samples: ['metalHit'],
    render: (c, o, t, b) => {
      rec(b, 'metalHit', c, o, t, 0.3, 900);
      rustle(c, o, t, 0.2, 2000, 0.16);
    },
  },
  pack: { seconds: 0.22, variants: 3, render: (c, o, t) => rustle(c, o, t, 0.18, 2400, 0.18) },
  drink: {
    seconds: 1,
    variants: 2,
    samples: ['bubbles'],
    render: (c, o, t, b) => {
      rec(b, 'bubbles', c, o, t, 0.45);
      gulp(c, o, t + 0.25, 0.25);
      gulp(c, o, t + 0.47, 0.22);
    },
  },
  chew: {
    seconds: 0.6,
    variants: 2,
    render: (c, o, t) => {
      for (const at of [0, 0.18, 0.36]) crunch(c, o, t + at, 0.26, 1800);
    },
  },
  heal: {
    seconds: 1.2,
    variants: 2,
    render: (c, o, t) => {
      bell(c, o, t, 1760, 0.07, 1.1, -0.2);
      bell(c, o, t + 0.08, 2640, 0.05, 1, 0.2);
      whoosh(c, o, t, 0.5, 0.05, 900, 3500);
    },
  },
  // ------------------------------------------------------------ the GUI
  uiOpen: { seconds: 0.2, variants: 3, render: (c, o, t) => rustle(c, o, t, 0.16, 3600, 0.14) },
  page: { seconds: 0.35, variants: 3, render: (c, o, t) => rustle(c, o, t, 0.3, 4200, 0.14) },
  uiClick: { seconds: 0.15, variants: 2, samples: ['woodClick'], render: (c, o, t, b) => rec(b, 'woodClick', c, o, t, 0.28, 700) },
  uiSelect: { seconds: 0.05, variants: 2, render: (c, o, t) => noiseHit(c, o, t, 0.008, 4500, 0.05, 'highpass') },
} as const satisfies Record<string, FxDef>;

export type FxId = keyof typeof FX;

/** The recorded instruments of all the effects (the game loads them early: they are small). */
export const FX_INSTRUMENTS: readonly string[] = [...new Set(Object.values(FX).flatMap((d) => ('samples' in d ? d.samples : [])))];

/** A creature's voice: a key ("imp:alert") and its syllables. */
export interface VoiceFx {
  readonly key: string;
  readonly shapes: () => readonly (VoiceShape & { readonly at: number })[];
}

export interface FxOptions {
  /** 0 to 1 (and a little more). */
  readonly gain?: number;
  /** -1 (left) to 1 (right). */
  readonly pan?: number;
  /** Seconds from now. */
  readonly delay?: number;
}

const RENDER_RATE = 32000;

/**
 * Plays the effects: a rendered variant when it has one, else the recipe itself (and it renders the
 * variants for the next time).
 */
export class FxPlayer {
  private readonly buffers = new Map<string, AudioBuffer[]>();
  private readonly rendering = new Set<string>();
  private readonly voices = new Map<string, FxDef>();
  private readonly engine: AudioEngine;

  constructor(engine: AudioEngine) {
    this.engine = engine;
  }

  /** Renders the variants of these effects now (in the background), so that their first play is light too. */
  prepare(ids: readonly FxId[]): void {
    for (const id of ids) void this.render(id, FX[id]);
  }

  play(id: FxId, o: FxOptions = {}): void {
    this.playDef(id, FX[id], o);
  }

  /** Plays a creature's voice (audio/creatures.ts): each variant (and each live call) has its own syllables. */
  voice(fx: VoiceFx, o: FxOptions = {}): void {
    let def = this.voices.get(fx.key);
    if (!def) {
      // Long enough for the longest of a few calls.
      const seconds = Math.max(...Array.from({ length: 6 }, () => Math.max(...fx.shapes().map((s) => s.at + s.seconds)))) + 0.1;
      def = { seconds, variants: 3, render: (c, out, t) => fx.shapes().forEach((s) => voice(c, out, t + s.at, s)) };
      this.voices.set(fx.key, def);
    }
    this.playDef(`voice:${fx.key}`, def, o);
  }

  private playDef(key: string, def: FxDef, o: FxOptions): void {
    const ctx = this.engine.context;
    const bus = this.engine.effectsInput;
    if (!ctx || !bus || ctx.state !== 'running' || this.engine.settings.muted) return;
    const t = ctx.currentTime + 0.005 + (o.delay ?? 0);
    const gain = ctx.createGain();
    gain.gain.value = o.gain ?? 1;
    let out: AudioNode = gain;
    if (o.pan) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, o.pan));
      gain.connect(pan);
      out = pan;
    }
    out.connect(bus);
    const variants = this.buffers.get(key);
    if (variants && variants.length > 0) {
      const src = ctx.createBufferSource();
      src.buffer = variants[Math.floor(Math.random() * variants.length)]!;
      src.playbackRate.value = 0.96 + Math.random() * 0.08;
      src.connect(gain);
      src.start(t);
      src.onended = () => out.disconnect();
      return;
    }
    def.render(ctx, gain, t, this.engine.bank);
    window.setTimeout(() => out.disconnect(), (def.seconds + 0.5 + (o.delay ?? 0)) * 1000);
    void this.render(key, def);
  }

  /** Renders the variants of an effect into buffers (once). */
  private async render(key: string, def: FxDef): Promise<void> {
    if (this.buffers.has(key) || this.rendering.has(key) || typeof OfflineAudioContext === 'undefined') return;
    // An effect with recorded sounds waits for them.
    if (def.samples && !this.engine.bank.ready(def.samples)) {
      await this.engine.bank.load(def.samples);
      if (!this.engine.bank.ready(def.samples)) return;
    }
    this.rendering.add(key);
    try {
      const list: AudioBuffer[] = [];
      for (let i = 0; i < def.variants; i++) {
        const ctx = new OfflineAudioContext(1, Math.ceil(def.seconds * RENDER_RATE), RENDER_RATE);
        def.render(ctx, ctx.destination, 0.002, this.engine.bank);
        list.push(await ctx.startRendering());
      }
      this.buffers.set(key, list);
    } catch {
      // No rendering here: the recipe plays live each time.
    } finally {
      this.rendering.delete(key);
    }
  }
}

/** Where a sound at (dx, dy) world pixels from the listener is heard: its gain and its pan, or null beyond `range`. */
export function spatial(dx: number, dy: number, range = 14 * 16): { readonly gain: number; readonly pan: number } | null {
  const distance = Math.hypot(dx, dy);
  if (distance > range) return null;
  return { gain: (1 - distance / range) ** 1.6, pan: Math.max(-0.85, Math.min(0.85, dx / 128)) };
}
