import type { MechanicEventKind } from '@game/engine';
import { FIGHT_INK } from './fight-numbers.ts';

/**
 * The words of the mechanics of the sandbox (mechanics.ts, MechanicEvent; STRINGS.sandbox.words): what a
 * mechanic did shows as a word in the small font that rises over the player or over the mob, as the
 * numbers of a fight do (render/fight-numbers.ts). Gold for a good moment of the player, the pale ink
 * of a blow for what a mob does.
 */
export interface MechanicWordStyle {
  readonly over: 'player' | 'mob';
  readonly ink: number;
}

export const MECHANIC_WORDS: Readonly<Record<MechanicEventKind, MechanicWordStyle>> = {
  sharp: { over: 'player', ink: FIGHT_INK.crit },
  riposte: { over: 'mob', ink: FIGHT_INK.crit },
};
