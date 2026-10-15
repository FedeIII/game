import type { MechanicEventKind } from '@game/engine';
import { FIGHT_INK } from './fight-numbers.ts';

/**
 * The words of the mechanics of the sandbox (mechanics.ts, MechanicEvent; STRINGS.sandbox.words): what a
 * mechanic did shows as a word in the small font that rises over the player or over the mob, as the
 * numbers of a fight do (render/fight-numbers.ts). Gold for a good moment of the player, the grey of a
 * miss for what goes against it.
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
}

export const MECHANIC_WORDS: Readonly<Record<MechanicEventKind, MechanicWordStyle>> = {
  sharp: { over: 'player', ink: FIGHT_INK.crit, replaces: 'evade' },
  riposte: { over: 'mob', ink: FIGHT_INK.crit },
  behind: { over: 'player', ink: FIGHT_INK.miss },
  flank: { over: 'mob', ink: FIGHT_INK.crit },
  parry: { over: 'player', ink: FIGHT_INK.crit, replaces: 'miss', sound: 'glance' },
  block: { over: 'player', ink: FIGHT_INK.crit, replaces: 'miss', sound: 'glance' },
  broken: { over: 'player', ink: FIGHT_INK.hurt },
  shoved: { over: 'mob', ink: FIGHT_INK.crit },
  held: { over: 'mob', ink: FIGHT_INK.miss },
  tooBig: { over: 'mob', ink: FIGHT_INK.miss },
  clash: { over: 'player', ink: FIGHT_INK.blow, sound: 'glance' },
  clashWon: { over: 'mob', ink: FIGHT_INK.crit, sound: 'glance' },
  clashLost: { over: 'player', ink: FIGHT_INK.hurt, sound: 'glance' },
  shield: { over: 'player', ink: SPELL_BLUE },
  deflect: { over: 'player', ink: FIGHT_INK.crit },
  caught: { over: 'player', ink: FIGHT_INK.crit },
  uncanny: { over: 'player', ink: FIGHT_INK.crit },
  protect: { over: 'player', ink: FIGHT_INK.crit },
  rage: { over: 'player', ink: FIGHT_INK.hurt },
};
