import type { Interactable } from '@game/engine';

/**
 * Every text of the engine that the player reads, in one place. Do not put a user-facing text in
 * another file: add it here, so a translation later is one file. What things say is not here:
 * that is content, and each world brings its own (WorldDefinition.examine, fixture content).
 */
export const STRINGS = {
  hintKeyboard: 'WASD or arrow keys to move · E to act',
  hintKeyboardFight: 'WASD or arrow keys to move · E to act · Space to attack',
  attack: 'Attack',
  hintTouch: 'Touch and drag anywhere to move',
  doorBlocked: 'Step out of the doorway first.',
  doorBlockedByOther: 'Someone is in the doorway.',
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
    rug: 'rug',
    crate: 'crate',
    cauldron: 'cauldron',
    telescope: 'telescope',
    candelabra: 'candelabra',
    forge: 'forge',
    crystalball: 'crystal ball',
    scales: 'scales',
  } satisfies Record<Interactable, string>,
  linkClose: 'Close',
  linkKeyHint: 'or press E',
  /** The "You" section of the settings: the visitor's look and name. */
  you: {
    heading: 'You',
    newLook: 'New look',
    drawing: 'Drawing…',
    name: 'Name',
    noName: 'No name',
    nameHint: 'Everyone sees it over your head. If it is empty, your look gives you a name.',
  },
  worlds: 'Worlds',
  worldsCurrent: 'you are here',
  /** The presence label of a shared (multiplayer) world. */
  presence: {
    connecting: 'Looking for other visitors…',
    alone: 'You are the only visitor here',
    others: (n: number): string => (n === 1 ? '1 other visitor here' : `${n} other visitors here`),
    offline: 'No connection: you see no other visitors',
    version: 'The game has changed: reload the page to see other visitors',
    full: 'The world is full: you are alone in your copy',
    busy: 'Too many open tabs: this one is alone',
    world: 'This world is not shared now',
  },
} as const;
