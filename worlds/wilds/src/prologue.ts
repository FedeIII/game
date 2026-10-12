import type { PrologueCard } from '@game/engine';

/**
 * The prologue of the Wilds (Fede's request, 2026-10-12): Kandrax as Fede's documents tell it (the
 * Drive, read live: `Kandrax AI Context` and `Kandrax - Mundo` for the world, `Kandrax - Dioses` for
 * what people know of the gods, `0.0 - Guía del aventurero novato` for Thrain and his company,
 * `Los Investigadores de Forjacero` for the consultants of Thrain). The English follows Fede's own
 * English where there is one (`Kandrax AI Context`); the Spanish (text-es.ts) is Fede's Spanish.
 * It tells only what a character of Kandrax knows: the secret of the gods stays a secret.
 *
 * Each card names a painted scene of the page's art (art/prologue.ts in the engine client). The last
 * one tells the character who it is, and gives it its mission: the letter on the table of its hut.
 */
export const PROLOGUE: readonly PrologueCard[] = [
  {
    scene: 'kandrax',
    // The name of the game (Fede, 2026-10-12), the same in every language.
    title: 'World of Kandrax',
    lines: ['Civilization is young in Kandrax: governments are small, and there are no big empires.'],
  },
  {
    scene: 'ruins',
    lines: ['There were great civilizations before, put out by cataclysms. Their remains can still be found.'],
  },
  {
    scene: 'map',
    lines: [
      'The civilized lands are the Dominions: the Human Dominions to the north, the Dwarven Dominions in the mountains of the east, the Elven Dominions to the south, and the Central Dominions between the other three.',
    ],
  },
  {
    scene: 'wild',
    lines: [
      'Between the Dominions, and even inside them, lie lands that nobody rules. Beyond them: the Wilds to the north and to the south, an immense desert to the east, and the Great Sea Ápeiron to the west.',
      'Many regions are uncharted. News is slow to spread, and the regions live apart.',
    ],
  },
  {
    scene: 'gods',
    lines: ['People in Kandrax worship many gods, great and small.', 'The gods show themselves to their followers in mysterious ways, and guide Kandrax.'],
  },
  {
    scene: 'central',
    lines: [
      'The Central Dominions are the youngest: a few hundred years of history, and every people of the world in them.',
      'The Iron Sovereignty knows mining, metalwork and engineering; the Mithril Enclave knows arcane and divine magic. Between them lie the Wilds.',
    ],
  },
  {
    scene: 'factory',
    lines: [
      'In Thalesferro stands the great factory of Thrain Steelforge, a dwarf engineer.',
      'His company makes and exports all kinds of equipment: from weapons and armour, through tools and mechanisms, to complex arcane objects.',
      'And there Thrain looks into strange arcane events.',
    ],
  },
  {
    scene: 'hut',
    title: '{name}',
    subtitle: '{kind}',
    lines: [
      'You are a consultant for Thrain Steelforge: you go where something strange happens, and you tell him what you find.',
      'Now homesteads burn in the Wilds, and nobody knows who burns them. Thrain has a mission for you.',
      'His letter waits on the table of your hut.',
    ],
  },
];
