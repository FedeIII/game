/**
 * The music of danger and of fights:
 *   tension  mobs hunt the player, and no blow has come yet: trembling strings on a cluster of two
 *            notes a semitone apart, a heartbeat on the timpani, a bowed cymbal, a horn that swells
 *   combat   a fight: 132 beats a minute, the celli and the violins in short bows on a rhythm of
 *            3 + 3 + 2 eighths, war drums on the same rhythm, horn stabs, and a melody of the horns
 *            and the trombones; sections of four bars that grow, with a cymbal at their starts
 *   battle   a fight with a great foe: the combat, with a choir, a gong and the timpani
 */
import { chord, hits, line, type Composer, type ScoreNote, type Section } from '../music.ts';
import { midi } from '../notes.ts';
import { CHORDS, pick } from './common.ts';

// ---------------------------------------------------------------- tension

const TENSION_BPM = 66;

export const TENSION_INSTRUMENTS = ['violinsTrem', 'celliTrem', 'basses', 'timpaniSoft', 'horn', 'cymbalBow'] as const;

export function tensionComposer(): Composer {
  return (index): Section => {
    const notes: ScoreNote[] = [];
    notes.push(...line('violinsTrem', index % 2 === 0 ? 'D5+Eb5:16' : 'A4+Bb4:16', 0, { vel: 0.3, attack: index === 0 ? 1.5 : 3, release: 2 }));
    notes.push(...line('celliTrem', 'D2:16', 0, { vel: 0.36, attack: index === 0 ? 1 : 2, release: 1.5 }));
    notes.push(...line('basses', 'D2:16', 0, { vel: 0.3, attack: 1.5, release: 1.5 }));
    // The heartbeat: two beats close together, every two beats.
    for (let beat = 0; beat < 16; beat += 2) notes.push(...hits('timpaniSoft', [beat], 0.42), ...hits('timpaniSoft', [beat + 0.45], 0.28));
    if (index % 2 === 1) notes.push(...line('horn', 'D3:7 Eb3:1 D3:8', 0, { vel: 0.36, attack: 1.2, release: 1 }));
    if (index % 4 === 0) notes.push(...hits('cymbalBow', [0], 0.38));
    return { bpm: TENSION_BPM, beats: 16, notes };
  };
}

// ---------------------------------------------------------------- combat

const COMBAT_BPM = 132;
export const COMBAT_PROGRESSIONS: readonly (readonly string[])[] = [
  ['Dm', 'Bb', 'C', 'A'],
  ['Dm', 'Dm', 'Bb', 'A'],
  ['Dm', 'C', 'Bb', 'C'],
];
/** The eighths of a bar: 3 + 3 + 2. */
const ACCENTS: ReadonlySet<number> = new Set([0, 3, 6]);
/** The melody of the brass, a bar for each chord (around D3). */
const BRASS: Readonly<Record<string, string>> = {
  Dm: 'D3:1.5 F3:0.5 A3:2',
  Bb: 'Bb2:1.5 D3:0.5 F3:2',
  C: 'C3:1.5 E3:0.5 G3:2',
  A: 'A2:1 C#3:1 E3:2',
};

const MAJOR: ReadonlySet<string> = new Set(['Bb', 'C', 'A', 'F', 'G', 'D', 'Eb']);

/** The celli's eighths for a chord: the root six times, then the third and the second above it. */
function ostinato(name: string): number[] {
  const root = midi(CHORDS[name]!.cello);
  const third = MAJOR.has(name) ? 4 : 3;
  return [0, 0, 0, 0, 0, 0, third, 2].map((d) => root + d);
}

type CombatPart = 'drive' | 'brass' | 'full' | 'break';

/** The notes of four bars of combat. A battle adds the choir, the gong and the timpani. */
export function combatSection(part: CombatPart, chords: readonly string[], battle: boolean, crash: boolean): ScoreNote[] {
  const notes: ScoreNote[] = [];
  chords.forEach((name, bar) => {
    const c = CHORDS[name]!;
    const at = bar * 4;
    // The celli in eighths, accented on 3 + 3 + 2.
    ostinato(name).forEach((m, k) => notes.push({ inst: 'celliSpic', midi: m, beat: at + k * 0.5, beats: 0.5, vel: ACCENTS.has(k) ? 0.78 : 0.56 }));
    notes.push(...line('basses', `${c.bass}:4`, at, { vel: 0.5, attack: 0.03, release: 0.3 }));
    // The drums on the same rhythm.
    notes.push(...hits('taiko', [at, at + 1.5, at + 3], 0.74));
    if (bar % 2 === 1) notes.push(...hits('tenorDrum', [at + 2, at + 2.5, at + 3, at + 3.5], 0.42));
    if (part === 'break') {
      notes.push(...hits(battle ? 'timpani' : 'timpaniSoft', [at, at + 3], 0.7));
      notes.push(...line('violinsTrem', `${c.top}:4`, at, { vel: 0.4, attack: 0.3, release: 0.4, shift: 12 }));
      return;
    }
    // Horn stabs on the accents of the first half of the bar.
    notes.push(...chord('hornStac', `${c.pad[0]} ${c.pad[1]}`, at, 0.5, { vel: 0.62 }), ...chord('hornStac', `${c.pad[0]} ${c.pad[1]}`, at + 1.5, 0.5, { vel: 0.55 }));
    if (part === 'brass' || part === 'full') {
      const melody = BRASS[name] ?? BRASS.Dm!;
      notes.push(...line('trombone', melody, at, { vel: 0.66, attack: 0.03, hold: 1.02, release: 0.25 }));
      notes.push(...line('horn', melody, at, { vel: 0.6, attack: 0.03, hold: 1.02, release: 0.25 }));
    }
    if (part === 'full') {
      // The violins run over the chord in eighths, an octave and more above.
      const run = [c.top, c.pad[1], c.top, c.pad[0], c.top, c.pad[1], c.top, c.pad[1]];
      run.forEach((n, k) => notes.push(...line('violinsSpic', `${n}:0.5`, at + k * 0.5, { vel: ACCENTS.has(k) ? 0.66 : 0.48, shift: n === c.top ? 12 : 24 })));
      notes.push(...line('trumpetStac', `${c.top}:1`, at, { vel: 0.6, shift: 12 }));
    }
    if (battle) {
      notes.push(...chord('choir', c.choir, at, 4, { vel: 0.6, attack: 0.08, release: 0.4 }));
      notes.push(...hits('timpani', [at], 0.8));
    }
  });
  // A roll of the snare into the next section.
  notes.push(...[15, 15.25, 15.5, 15.75].flatMap((beat, k) => hits('snare', [beat], 0.35 + k * 0.1)));
  if (crash) notes.push(...hits('cymbal', [0], 0.62), ...hits('bassDrum', [0], 0.75));
  if (crash && battle) notes.push(...hits('gong', [0], 0.5));
  return notes;
}

export const COMBAT_INSTRUMENTS = ['celliSpic', 'basses', 'taiko', 'tenorDrum', 'hornStac', 'trombone', 'horn', 'violinsSpic', 'trumpetStac', 'snare', 'cymbal', 'bassDrum', 'timpaniSoft', 'violinsTrem'] as const;
export const COMBAT_FIRST = ['celliSpic', 'basses', 'taiko', 'hornStac'] as const;
export const BATTLE_INSTRUMENTS = [...COMBAT_INSTRUMENTS, 'choir', 'timpani', 'gong'] as const;

/** A composer of a fight: four bars at a time, each a little fuller, a break now and then. */
export function combatComposer(battle: boolean): () => Composer {
  return () => {
    let chords = COMBAT_PROGRESSIONS[0]!;
    return (index, random): Section => {
      if (index % 4 === 0) chords = pick(COMBAT_PROGRESSIONS, random);
      const parts: CombatPart[] = ['drive', 'brass', 'full', random() < 0.3 ? 'break' : 'full'];
      const part = index === 0 ? 'drive' : parts[index % 4]!;
      return { bpm: COMBAT_BPM, beats: 16, notes: combatSection(part, chords, battle, index % 2 === 0) };
    };
  };
}
