import type { Interactable } from '@game/engine';

/**
 * Every text of the engine that the player reads, in one place. Do not put a user-facing text in
 * another file: add it here, so a translation later is one file. What things say is not here:
 * that is content, and each world brings its own (WorldDefinition.examine, fixture content).
 */
export const STRINGS = {
  hintKeyboard: 'WASD or arrow keys to move · E to act',
  hintTouch: 'Touch and drag anywhere to move',
  doorBlocked: 'Step out of the doorway first.',
  actionLabel: 'Act',
  openDoor: 'Open the door',
  closeDoor: 'Close the door',
  examine: (name: string): string => `Examine the ${name}`,
  talk: 'Talk',
  next: 'Next',
  close: 'Close',
  lookIntoPortal: 'Look into the portal',
  /** The names of things in action labels ("Examine the map table"). */
  names: {
    tree: 'tree',
    rock: 'rock',
    door: 'door',
    bookshelf: 'bookshelf',
    table: 'table',
    bed: 'bed',
    chest: 'chest',
    barrel: 'barrel',
    lectern: 'lectern',
    desk: 'desk',
    anvil: 'anvil',
    maptable: 'map table',
    boardtable: 'game board',
    mirror: 'mirror',
    apothecary: 'cabinet',
    coinchest: 'strongbox',
    noticeboard: 'notice board',
    lamppost: 'lamp',
    fountain: 'fountain',
    portal: 'portal',
    npc: 'stranger',
  } satisfies Record<Interactable, string>,
  linkClose: 'Close',
  linkKeyHint: 'or press E',
  worlds: 'Worlds',
  worldsCurrent: 'you are here',
} as const;
