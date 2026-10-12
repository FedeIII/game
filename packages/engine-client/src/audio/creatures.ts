/**
 * The voices of the mobs (audio/fx.ts plays them where the mob is): synthesized throats through the
 * formants of a vowel, a voice for each kind of mob and a sound for each moment:
 *   alert   it sees the player and starts the hunt
 *   windup  it gathers itself for a blow: a warning that a careful player hears
 *   hurt    a blow reaches it
 *   death   it falls
 * Small creatures (imps, goblins) chitter; big ones (brutes, hobgoblins, bugbears) growl; beasts
 * (worgs, hounds) bark and snarl; the watchers whisper; the Seekers (people) shout; the great foes
 * roar. Each call is a little different (`Math.random`).
 */
import type { MobKind } from '@game/engine';
import type { VoiceFx } from './fx.ts';
import type { VoiceShape } from './synth.ts';

export type VoiceEvent = 'alert' | 'windup' | 'hurt' | 'death';
type Syllable = VoiceShape & { readonly at: number };
type Kind = 'chitter' | 'growl' | 'snarl' | 'whisper' | 'shout' | 'roar';

/** The voice of each kind of mob, and how big its throat is (1 the usual size: more is lower). */
export const VOICE_OF: Readonly<Record<MobKind, { readonly kind: Kind; readonly size: number }>> = {
  imp: { kind: 'chitter', size: 0.9 },
  goblin: { kind: 'chitter', size: 1.1 },
  brute: { kind: 'growl', size: 1.1 },
  hobgoblin: { kind: 'growl', size: 0.85 },
  bugbear: { kind: 'growl', size: 1.2 },
  worg: { kind: 'snarl', size: 1.2 },
  hound: { kind: 'snarl', size: 0.9 },
  watcher: { kind: 'whisper', size: 1 },
  seeker: { kind: 'shout', size: 1 },
  adept: { kind: 'shout', size: 0.9 },
  devastator: { kind: 'roar', size: 1 },
  warden: { kind: 'roar', size: 1.25 },
};

const r = (a: number, b: number) => a + Math.random() * (b - a);

/** The syllables of a call: `size` makes the throat lower and the vowel darker. */
export function syllables(kind: Kind, event: VoiceEvent, size: number): Syllable[] {
  const p = (hz: number) => hz / size;
  const f = (a: number, b: number, c: number): [number, number, number] => [a / Math.sqrt(size), b / Math.sqrt(size), c / Math.sqrt(size)];
  switch (kind) {
    case 'chitter': {
      if (event === 'hurt') return [{ at: 0, from: p(r(600, 700)), to: p(r(950, 1100)), seconds: 0.16, formants: f(1000, 2300, 3300), rough: 0.25, gain: 0.32 }];
      if (event === 'death') return [{ at: 0, from: p(r(800, 900)), to: p(r(260, 320)), seconds: 0.42, formants: f(950, 2100, 3100), rough: 0.3, gain: 0.32 }];
      const n = event === 'windup' ? 2 : 3 + Math.floor(Math.random() * 3);
      return Array.from({ length: n }, (_, k) => {
        const base = p(r(380, 650));
        return { at: k * r(0.06, 0.09), from: base, to: base * r(0.8, 1.35), seconds: r(0.05, 0.075), formants: f(900, 2200, 3200), rough: 0.3, gain: event === 'windup' ? 0.34 : 0.28 };
      });
    }
    case 'growl': {
      if (event === 'hurt') return [{ at: 0, from: p(r(120, 140)), to: p(r(90, 100)), seconds: 0.16, formants: f(550, 950, 2400), rough: 0.45, gain: 0.45 }];
      if (event === 'death') return [{ at: 0, from: p(r(120, 135)), to: p(50), seconds: 0.95, formants: f(500, 850, 2300), rough: 0.5, tremolo: 9, gain: 0.45 }];
      if (event === 'windup') return [{ at: 0, from: p(r(70, 80)), to: p(r(115, 130)), seconds: 0.5, formants: f(520, 900, 2400), rough: 0.55, tremolo: 24, gain: 0.48 }];
      return [{ at: 0, from: p(r(85, 100)), to: p(r(70, 80)), seconds: 0.6, formants: f(480, 860, 2300), rough: 0.5, tremolo: 22, gain: 0.42 }];
    }
    case 'snarl': {
      if (event === 'hurt') return [{ at: 0, from: p(r(600, 650)), to: p(r(850, 950)), seconds: 0.15, formants: f(800, 1700, 3000), rough: 0.35, gain: 0.34 }];
      if (event === 'death') return [{ at: 0, from: p(r(480, 520)), to: p(240), seconds: 0.5, formants: f(750, 1500, 2900), rough: 0.35, gain: 0.32 }];
      if (event === 'windup') return [{ at: 0, from: p(r(140, 160)), to: p(r(150, 170)), seconds: 0.48, formants: f(700, 1400, 2800), rough: 0.8, tremolo: 38, gain: 0.42 }];
      // Two barks.
      return [0, r(0.18, 0.24)].map((at) => ({ at, from: p(r(260, 290)), to: p(r(170, 190)), seconds: 0.12, formants: f(700, 1500, 2800), rough: 0.55, gain: 0.4 }));
    }
    case 'whisper': {
      if (event === 'hurt') return [{ at: 0, from: p(300), to: p(300), seconds: 0.2, formants: f(1200, 2600, 3800), rough: 1, gain: 0.3 }];
      if (event === 'death') return [{ at: 0, from: p(300), to: p(300), seconds: 0.8, formants: f(900, 2000, 3200), rough: 1, tremolo: 6, gain: 0.3 }];
      return [{ at: 0, from: p(300), to: p(300), seconds: event === 'windup' ? 0.5 : 0.8, formants: f(r(700, 1300), r(1800, 2600), 3400), rough: 1, tremolo: event === 'windup' ? 14 : 5, gain: 0.3 }];
    }
    case 'shout': {
      if (event === 'hurt') return [{ at: 0, from: p(r(190, 210)), to: p(r(150, 160)), seconds: 0.18, formants: f(500, 1000, 2500), rough: 0.18, gain: 0.32 }];
      if (event === 'death') return [{ at: 0, from: p(r(200, 220)), to: p(110), seconds: 0.7, formants: f(700, 1150, 2500), rough: 0.2, gain: 0.32 }];
      if (event === 'windup') return [{ at: 0, from: p(r(140, 160)), to: p(r(190, 210)), seconds: 0.35, formants: f(750, 1200, 2500), rough: 0.25, gain: 0.34 }];
      return [{ at: 0, from: p(r(170, 190)), to: p(r(150, 160)), seconds: 0.4, formants: f(750, 1200, 2500), rough: 0.18, gain: 0.32 }];
    }
    case 'roar': {
      if (event === 'hurt') return [{ at: 0, from: p(r(90, 100)), to: p(r(70, 80)), seconds: 0.3, formants: f(420, 820, 2100), rough: 0.6, tremolo: 18, gain: 0.55 }];
      if (event === 'death') return [{ at: 0, from: p(r(95, 105)), to: p(38), seconds: 1.6, formants: f(400, 780, 2000), rough: 0.65, tremolo: 12, gain: 0.55 }];
      return [{ at: 0, from: p(r(58, 66)), to: p(r(event === 'windup' ? 90 : 52, event === 'windup' ? 100 : 58)), seconds: event === 'windup' ? 0.8 : 1.2, formants: f(400, 800, 2000), rough: 0.65, tremolo: 18, gain: 0.58 }];
    }
  }
}

/** The voice of a mob for a moment, for audio/fx.ts. */
export function mobVoice(kind: MobKind, event: VoiceEvent): VoiceFx {
  const v = VOICE_OF[kind];
  return { key: `${kind}:${event}`, shapes: () => syllables(v.kind, event, v.size) };
}
