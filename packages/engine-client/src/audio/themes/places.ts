/**
 * The music of the places of a world (WorldSource.soundAreas names their moods):
 *   town    Ironhold: a folk dance in D dorian, 100 beats a minute: a fiddle (the solo violin), a
 *           flute, a clarinet, the celli and the harp plucked like a lute, a frame drum, a tambourine
 *   haven   Silverspring: bright, in D major, 70 a minute: a flute and an oboe over a harp and a glockenspiel
 *   home    the hut, a homestead: a lullaby on a clarinet or a solo violin, over a harp
 *   chapel  a quiet organ and a choir
 *   ruins   the burned homesteads: a lament on a solo violin, then the celli, over a drone
 *   camp    the camp of the war band, of the Seekers: low drums, trembling celli, a horn
 *   shrine  the shrine of Tigris: an organ, a choir, bells and a gong, very slow
 *   dream   the dream: voices, a harp, a glockenspiel and bells, out of time
 * Each one goes round, most with a silence in the round.
 */
import { chord, hits, line, type Composer, type ScoreNote, type Section } from '../music.ts';
import { CHORDS, pick, silence } from './common.ts';

// ---------------------------------------------------------------- town (Ironhold)

const TOWN_BPM = 100;
const TOWN_A_CHORDS = ['Dm', 'C', 'Dm', 'Am', 'Dm', 'C', 'G', 'Dm'];
const TOWN_B_CHORDS = ['F', 'C', 'Dm', 'A', 'F', 'C', 'G', 'Dm'];
/** The tune: a bar of four beats for each chord. */
const TOWN_A = ['D5:1 F5:0.5 E5:0.5 D5:1 A4:1', 'C5:1 E5:0.5 D5:0.5 C5:1 G4:1', 'A4:0.5 B4:0.5 C5:0.5 D5:0.5 E5:1 F5:1', 'E5:1 C5:1 A4:2', 'D5:1 F5:0.5 E5:0.5 D5:1 A4:1', 'C5:1 E5:0.5 F5:0.5 G5:1 E5:1', 'D5:0.5 C5:0.5 B4:0.5 G4:0.5 B4:1 D5:1', 'D5:3 r:1'];
const TOWN_B = ['A5:1.5 G5:0.5 F5:1 C5:1', 'G5:1.5 F5:0.5 E5:1 C5:1', 'F5:1 E5:0.5 D5:0.5 A4:1 D5:1', 'C#5:1 E5:1 A5:2', 'A5:1.5 G5:0.5 F5:1 A5:1', 'G5:1 E5:1 C5:1 E5:1', 'D5:1 B4:0.5 C5:0.5 D5:1 G5:1', 'F5:1 E5:1 D5:2'];

type TownPart = 'a' | 'a2' | 'b' | 'a3' | 'interlude';

function townSection(part: TownPart): ScoreNote[] {
  const chords = part === 'b' ? TOWN_B_CHORDS : TOWN_A_CHORDS;
  const tune = part === 'b' ? TOWN_B : TOWN_A;
  const notes: ScoreNote[] = [];
  chords.forEach((name, bar) => {
    const c = CHORDS[name]!;
    const at = bar * 4;
    // The bass: plucked celli on one and three; the harp strums the chord on two and four.
    notes.push(...line('celliPizz', `${c.cello}:2 ${c.arp[1]}:2`, at, { vel: 0.6 }));
    for (const beat of [1, 3]) c.arp.slice(1).forEach((n, k) => notes.push(...line('harp', `${n}:1`, at + beat + k * 0.03, { vel: 0.36 })));
    // The drums.
    notes.push(...hits('frameDrum', [at, at + 2], 0.5), ...hits('frameDrum', [at + 2.5], 0.28));
    if (part !== 'interlude') notes.push(...hits('tambourine', [at + 1, at + 3], 0.3));
    if (part === 'interlude') return;
    // The fiddle (and the flute with it, from the second time); the clarinet holds the chords in B.
    notes.push(...line('violin', tune[bar]!, at, { vel: 0.62, attack: 0.02, hold: 0.95, release: 0.2 }));
    if (part === 'a2' || part === 'a3') notes.push(...line('flute', tune[bar]!, at, { vel: 0.45, attack: 0.02, hold: 0.95, release: 0.2 }));
    if (part === 'b') notes.push(...line('clarinet', `${c.pad[1]}:4`, at, { vel: 0.4, attack: 0.15, release: 0.3, shift: 12 }));
    if (part === 'a3') notes.push(...line('celli', `${c.cello}:4`, at, { vel: 0.4, attack: 0.08, release: 0.3 }));
  });
  return notes;
}

export const TOWN_INSTRUMENTS = ['celliPizz', 'harp', 'frameDrum', 'tambourine', 'violin', 'flute', 'clarinet', 'celli'] as const;

export function townComposer(): Composer {
  const parts: TownPart[] = ['a', 'a2', 'b', 'a3', 'interlude'];
  return (index): Section => ({ bpm: TOWN_BPM, beats: 32, notes: townSection(parts[index % parts.length]!) });
}

// ---------------------------------------------------------------- haven (Silverspring)

const HAVEN_BPM = 70;
const HAVEN_CHORDS = ['D', 'Bm', 'G', 'A', 'D', 'F#m', 'G', 'A'];
const HAVEN_TUNE = ['F#5:2 E5:1 D5:1', 'D5:2 B4:2', 'B4:1 C#5:1 D5:1 E5:1', 'E5:4', 'F#5:2 A5:2', 'G5:1 F#5:1 E5:2', 'D5:1 E5:1 B4:2', 'A4:4'];
const HAVEN_COUNTER = ['A5:4', 'F#5:4', 'G5:4', 'E5:4', 'A5:4', 'A5:4', 'B5:4', 'C#6:4'];

type HavenPart = 'flute' | 'oboe' | 'harp' | 'rest';

function havenSection(part: HavenPart): ScoreNote[] {
  const notes: ScoreNote[] = [];
  HAVEN_CHORDS.forEach((name, bar) => {
    const c = CHORDS[name]!;
    const at = bar * 4;
    // The harp, up and down in eighths.
    const arp = [...c.arp, ...[...c.arp].reverse()];
    arp.forEach((n, k) => notes.push(...line('harp', `${n}:0.5`, at + k * 0.5, { vel: k === 0 ? 0.48 : 0.38, shift: 12 })));
    notes.push(...line('celli', `${c.cello}:4`, at, { vel: 0.32, attack: 0.8, release: 1 }));
    if (part !== 'harp') notes.push(...chord('violas', `${c.pad[0]} ${c.pad[1]}`, at, 4, { vel: 0.26, attack: 1.2, release: 1.2 }));
    if (part === 'flute') notes.push(...line('flute', HAVEN_TUNE[bar]!, at, { vel: 0.55, attack: 0.08, hold: 1.02 }));
    if (part === 'oboe') {
      notes.push(...line('oboe', HAVEN_TUNE[bar]!, at, { vel: 0.52, attack: 0.06, hold: 1.02 }));
      notes.push(...line('flute', HAVEN_COUNTER[bar]!, at, { vel: 0.36, attack: 0.4, release: 0.6 }));
    }
    if (bar % 4 === 0) notes.push(...line('glock', `${c.top}:2`, at, { vel: 0.3, shift: 24 }));
  });
  return notes;
}

export const HAVEN_INSTRUMENTS = ['harp', 'celli', 'violas', 'flute', 'oboe', 'glock'] as const;

export function havenComposer(): Composer {
  const parts: HavenPart[] = ['flute', 'oboe', 'harp', 'rest'];
  return (index): Section => {
    const part = parts[index % parts.length]!;
    return part === 'rest' ? silence(HAVEN_BPM, 16) : { bpm: HAVEN_BPM, beats: 32, notes: havenSection(part) };
  };
}

// ---------------------------------------------------------------- home

const HOME_BPM = 60;
const HOME_CHORDS = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Gm', 'A', 'Dm'];
const HOME_TUNE = ['A4:2 G4:1 F4:1', 'F4:2 D4:2', 'C5:2 A4:2', 'G4:4', 'A4:2 Bb4:1 A4:1', 'G4:2 D4:2', 'E4:2 C#5:2', 'D5:4'];

function homeSection(solo: 'clarinet' | 'violin'): ScoreNote[] {
  const notes: ScoreNote[] = [];
  HOME_CHORDS.forEach((name, bar) => {
    const c = CHORDS[name]!;
    const at = bar * 4;
    c.arp.forEach((n, k) => notes.push(...line('harp', `${n}:1`, at + k, { vel: k === 0 ? 0.42 : 0.34 })));
    notes.push(...line('celli', `${c.cello}:4`, at, { vel: 0.28, attack: 1, release: 1.2 }));
    notes.push(...line(solo, HOME_TUNE[bar]!, at, { vel: 0.48, attack: 0.1, hold: 1.03, release: 0.5 }));
  });
  return notes;
}

export const HOME_INSTRUMENTS = ['harp', 'celli', 'clarinet', 'violin'] as const;

export function homeComposer(): Composer {
  return (index): Section => {
    const step = index % 3;
    return step === 2 ? silence(HOME_BPM, 32) : { bpm: HOME_BPM, beats: 32, notes: homeSection(step === 0 ? 'clarinet' : 'violin') };
  };
}

// ---------------------------------------------------------------- chapel

const CHAPEL_BPM = 50;
const CHAPEL_CHORDS = ['Dm', 'Bb', 'F', 'C', 'Gm', 'Dm', 'A', 'D'];

export const CHAPEL_INSTRUMENTS = ['organ', 'oohs'] as const;

export function chapelComposer(): Composer {
  return (index): Section => {
    if (index % 2 === 1) return silence(CHAPEL_BPM, 16);
    const notes: ScoreNote[] = [];
    CHAPEL_CHORDS.forEach((name, bar) => {
      const c = CHORDS[name]!;
      const at = bar * 4;
      notes.push(...chord('organ', `${c.cello} ${c.choir}`, at, 4, { vel: 0.4, attack: 0.3, release: 0.8 }));
      notes.push(...chord('oohs', c.choir.split(' ').slice(1).join(' '), at, 4, { vel: 0.32, attack: 1, release: 1 }));
    });
    return { bpm: CHAPEL_BPM, beats: 32, notes };
  };
}

// ---------------------------------------------------------------- ruins

const RUINS_BPM = 54;
const RUINS_CHORDS = ['Dm', 'Eb', 'Dm', 'Cm'];
const RUINS_TUNE = ['A4:4 Bb4:2 A4:2', 'G4:4 Eb4:4', 'F4:2 E4:2 D4:4', 'Eb4:2 D4:1 C4:1 D4:4'];

export const RUINS_INSTRUMENTS = ['basses', 'oohs', 'violin', 'celli', 'violas'] as const;

export function ruinsComposer(): Composer {
  return (index): Section => {
    const step = index % 4;
    if (step === 3) return silence(RUINS_BPM, 32);
    const notes: ScoreNote[] = [];
    RUINS_CHORDS.forEach((name, i) => {
      const c = CHORDS[name]!;
      const at = i * 8;
      // A drone of D under everything; the voices and the violas hold the chord.
      notes.push(...line('basses', 'D2:8', at, { vel: 0.36, attack: 1.5, release: 1.5 }));
      notes.push(...chord('oohs', c.choir, at, 8, { vel: step === 0 ? 0.26 : 0.3, attack: 2.2, release: 2 }));
      if (step === 0) notes.push(...chord('violas', `${c.pad[0]} ${c.pad[1]}`, at, 8, { vel: 0.26, attack: 2, release: 2 }));
      if (step === 1) notes.push(...line('violin', RUINS_TUNE[i]!, at, { vel: 0.52, attack: 0.2, hold: 1.04, release: 0.8 }));
      if (step === 2) notes.push(...line('celli', RUINS_TUNE[i]!, at, { vel: 0.52, attack: 0.2, hold: 1.04, release: 0.8, shift: -12 }));
    });
    return { bpm: RUINS_BPM, beats: 32, notes };
  };
}

// ---------------------------------------------------------------- camp

const CAMP_BPM = 72;

export const CAMP_INSTRUMENTS = ['taiko', 'logDrum', 'celliTrem', 'basses', 'horn', 'trombone', 'cymbalBow'] as const;

export function campComposer(): Composer {
  return (index, random): Section => {
    const notes: ScoreNote[] = [];
    notes.push(...hits('taiko', [0, 3, 8, 11], 0.5));
    notes.push(...hits('logDrum', [1.5, 5.5, 9.5, 13.5], 0.34));
    notes.push(...line('celliTrem', index % 2 === 0 ? 'D2:16' : 'D2+Eb2:16', 0, { vel: 0.34, attack: 2, release: 1.5 }));
    notes.push(...line('basses', 'D2:16', 0, { vel: 0.36, attack: 1.5, release: 1.5 }));
    if (index % 2 === 1) notes.push(...line('horn', 'D3:6 Eb3:2 D3:8', 0, { vel: 0.4, attack: 0.6, release: 0.8 }));
    else if (random() < 0.6) notes.push(...line('trombone', 'A2:8 Bb2:8', 0, { vel: 0.36, attack: 0.8, release: 1 }));
    if (index % 4 === 0) notes.push(...hits('cymbalBow', [0], 0.4));
    return { bpm: CAMP_BPM, beats: 16, notes };
  };
}

// ---------------------------------------------------------------- shrine

const SHRINE_BPM = 48;
/** Open chords: D minor with its ninth, B flat with its seventh, G minor with its ninth, A with a fourth that falls to the third. */
const SHRINE_CHORDS: readonly (readonly [string, string])[] = [
  ['D3 A3 E4 F4', 'A4 D5'],
  ['Bb2 F3 A3 D4', 'F4 A4'],
  ['G2 D3 A3 Bb3', 'D4 G4'],
  ['A2 E3 A3 D4', 'E4 A4'],
];

export const SHRINE_INSTRUMENTS = ['organ', 'oohs', 'bells', 'gong', 'glock'] as const;

export function shrineComposer(): Composer {
  return (index, random): Section => {
    const notes: ScoreNote[] = [];
    SHRINE_CHORDS.forEach(([organ, voices], i) => {
      const at = i * 8;
      notes.push(...chord('organ', organ, at, 8, { vel: 0.36, attack: 1.2, release: 1.5 }));
      notes.push(...chord('oohs', voices, at, 8, { vel: 0.3, attack: 2, release: 2 }));
      // The fourth of the last chord falls to the third.
      if (i === 3) notes.push(...line('organ', 'C#4:4', at + 4, { vel: 0.36, attack: 0.6, release: 1.5 }));
      if (random() < 0.6) notes.push(...hits('bells', [at + pick([1, 3, 5], random)], 0.32));
      if (random() < 0.4) notes.push(...line('glock', `${pick(['D6', 'A6', 'F6'], random)}:2`, at + 2, { vel: 0.22 }));
    });
    if (index % 2 === 0) notes.push(...hits('gong', [0], 0.26));
    return { bpm: SHRINE_BPM, beats: 32, notes };
  };
}

// ---------------------------------------------------------------- dream

const DREAM_BPM = 50;
const DREAM_PENTATONIC = ['D6', 'F6', 'G6', 'A6', 'C7'];

export const DREAM_INSTRUMENTS = ['oohs', 'harp', 'glock', 'bells', 'flute', 'violins'] as const;

export function dreamComposer(): Composer {
  return (index, random): Section => {
    const notes: ScoreNote[] = [];
    const chords = index % 2 === 0 ? ['Dm', 'Bb', 'Gm'] : ['Bb', 'Dm', 'A'];
    chords.forEach((name, i) => {
      const c = CHORDS[name]!;
      const at = i * 8;
      notes.push(...chord('oohs', c.choir, at, 8, { vel: 0.32, attack: 2.5, release: 2.5 }));
      notes.push(...line('harp', c.arp.map((n) => `${n}:0.5`).join(' '), at + pick([0, 2, 4], random), { vel: 0.34, shift: 24 }));
      notes.push(...line('violins', `${c.top}:8`, at, { vel: 0.22, attack: 3, release: 2.5, shift: 12 }));
      for (let k = 0; k < 3; k++) if (random() < 0.6) notes.push(...line('glock', `${pick(DREAM_PENTATONIC, random)}:1`, at + k * 2.5 + random(), { vel: 0.22 }));
    });
    if (random() < 0.5) notes.push(...line('flute', 'A5:6 F5:6', 6, { vel: 0.32, attack: 1, release: 1.5 }));
    if (random() < 0.5) notes.push(...hits('bells', [12], 0.26));
    return { bpm: DREAM_BPM, beats: 24, notes };
  };
}
