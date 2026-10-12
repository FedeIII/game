import type { Fixture } from '@game/engine';
import { VERATH } from './dialogs.ts';

/**
 * The dream of Verath (story phase 10; "Shadows of the Ashen Seekers", phase 6, "The Veiled
 * Encounter"): for a character at `relic`, a bed where it sleeps (the bed of its home, the room at
 * the Crooked Lantern, the bed at the Silver Trout) opens a dream in place of a rest. Verath
 * Shadowweave speaks in the ash (dialogs.ts, VERATH), and the character's choice ends chapter 1.
 * After the dream the bed rests as before.
 */
export const DREAM_BED: NonNullable<Fixture['variant']> = {
  when: { quest: 'ashes', at: ['relic'] },
  frame: 'fixture/bed',
  content: { speaker: 'fixture', dialog: VERATH, face: 'verath', dream: true },
};
