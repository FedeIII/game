import type { Examinable } from '@game/shared';

/**
 * Every text that the player reads, in one place. Do not put a user-facing text in another
 * file: add it here, so a translation later is one file.
 */
export const STRINGS = {
  hintKeyboard: 'WASD or arrow keys to move · E to examine',
  hintTouch: 'Touch and drag anywhere to move',
  examine: { tree: "It's a tree", rock: "It's a rock" } satisfies Record<Examinable, string>,
  actionLabel: 'Examine',
  actionLabelFor: (thing: Examinable): string => `Examine the ${thing}`,
} as const;
