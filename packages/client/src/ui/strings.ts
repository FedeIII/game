import type { Examinable } from '@game/shared';

/**
 * Every text that the player reads, in one place. Do not put a user-facing text in another
 * file: add it here, so a translation later is one file.
 */
export const STRINGS = {
  hintKeyboard: 'WASD or arrow keys to move · E to act',
  hintTouch: 'Touch and drag anywhere to move',
  examine: {
    tree: "It's a tree",
    rock: "It's a rock",
    bookshelf: 'Old books. The ink has faded.',
    table: 'A candle still burns. Someone was here.',
    bed: 'A narrow bed. The blanket smells of smoke.',
    chest: "A heavy chest. It's locked.",
    barrel: 'A barrel of sour wine.',
  } satisfies Record<Examinable, string>,
  doorBlocked: 'Step out of the doorway first.',
  actionLabel: 'Act',
  actionLabelFor: (thing: Examinable): string => `Examine the ${thing}`,
  openDoor: 'Open the door',
  closeDoor: 'Close the door',
} as const;
