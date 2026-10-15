import type { MechanicEventKind } from '@game/engine';
import { FIGHT_INK } from './fight-numbers.ts';

/**
 * The words of the mechanics of the sandbox (mechanics.ts, MechanicEvent; STRINGS.sandbox.words): what a
 * mechanic did shows as a word in the small font that rises over the player or over the mob, as the
 * numbers of a fight do (render/fight-numbers.ts). Green for a good moment of the player, red for what a
 * mob does against it (Fede, 2026-10-15), grey or pale for a word of no side.
 */
/** The blue of a spell of protection (the spell Shield of a wizard or a sorcerer). */
const SPELL_BLUE = 0x8ab8ff;

export interface MechanicWordStyle {
  readonly over: 'player' | 'mob';
  readonly ink: number;
  /** The word of the page that this one takes the place of in the same frame: "evade" or "miss". */
  readonly replaces?: 'evade' | 'miss';
  /** A sound with the word: the ring of steel on steel (the sound of a glancing blow). */
  readonly sound?: 'glance';
  /** Sparks and a flash where the weapons of the player and the mob meet (render/sparks.ts). */
  readonly sparks?: boolean;
}

export const MECHANIC_WORDS: Readonly<Record<MechanicEventKind, MechanicWordStyle>> = {
  sharp: { over: 'player', ink: FIGHT_INK.good, replaces: 'evade' },
  riposte: { over: 'mob', ink: FIGHT_INK.good },
  side: { over: 'player', ink: FIGHT_INK.miss },
  behind: { over: 'player', ink: FIGHT_INK.miss },
  flank: { over: 'mob', ink: FIGHT_INK.good },
  parry: { over: 'player', ink: FIGHT_INK.good, replaces: 'miss', sound: 'glance', sparks: true },
  block: { over: 'player', ink: FIGHT_INK.good, replaces: 'miss', sound: 'glance' },
  broken: { over: 'player', ink: FIGHT_INK.hurt },
  shoved: { over: 'mob', ink: FIGHT_INK.good },
  held: { over: 'mob', ink: FIGHT_INK.miss },
  tooBig: { over: 'mob', ink: FIGHT_INK.miss },
  clash: { over: 'player', ink: FIGHT_INK.blow, sound: 'glance' },
  clashWon: { over: 'mob', ink: FIGHT_INK.good, sound: 'glance' },
  clashLost: { over: 'player', ink: FIGHT_INK.hurt, sound: 'glance' },
  shield: { over: 'player', ink: SPELL_BLUE },
  deflect: { over: 'player', ink: FIGHT_INK.good },
  caught: { over: 'player', ink: FIGHT_INK.good },
  uncanny: { over: 'player', ink: FIGHT_INK.good },
  protect: { over: 'player', ink: FIGHT_INK.good },
  rage: { over: 'player', ink: FIGHT_INK.hurt },
  thrust: { over: 'mob', ink: FIGHT_INK.blow },
  sweep: { over: 'mob', ink: FIGHT_INK.blow },
  slam: { over: 'mob', ink: FIGHT_INK.hurt },
  bite: { over: 'mob', ink: FIGHT_INK.blow },
  raise: { over: 'mob', ink: FIGHT_INK.miss },
  mobParry: { over: 'mob', ink: FIGHT_INK.miss, sound: 'glance' },
};
