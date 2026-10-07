import type { FixtureKind, Interaction } from '@game/engine';

/**
 * The projects of the azyr.io landing page, one house each, in the order of the landing page.
 * The texts come from the project list (/var/www/azyr.io/public/index.html) and the detail page
 * of each project (wallet.html, osler.html, ...). When those pages change, change this file.
 *
 * Kandrax Rol speaks Spanish, as its page does; everything else is in English.
 */

/** A thing to act on in a house, in one of the slots of the house plan (see layout.ts). */
export interface Exhibit {
  readonly slot: Slot;
  readonly kind: FixtureKind;
  readonly content: Interaction;
}

/**
 * Places in a house: two against the north wall, two tables (2 x 1) on the sides, two corners
 * by the south wall. The portal and the keeper have places of their own.
 */
export type Slot = 'wallLeft' | 'wallRight' | 'tableLeft' | 'tableRight' | 'cornerLeft' | 'cornerRight';

export interface Project {
  readonly id: string;
  /** The name on the sign and on the link card. */
  readonly name: string;
  /** The keeper: an NPC look (art/characters.ts) and what the keeper says. */
  readonly keeper: { readonly look: string; readonly pages: readonly string[] };
  readonly exhibits: readonly Exhibit[];
  /** The portal: the most prominent thing in the house, and the link to the project. */
  readonly portal: { readonly colour: number; readonly pages: readonly string[]; readonly url: string; readonly label: string };
}

const say = (...pages: string[]): Interaction => ({ pages });

export const PROJECTS: readonly Project[] = [
  {
    id: 'vest101',
    name: 'vest101',
    keeper: {
      look: 'treasurer',
      pages: [
        'Welcome to vest101, a portfolio tracker.',
        'One place for everything you own.',
        'Trading 212 and Interactive Brokers, Bitcoin, gold and private investments.',
        'All in a single currency, so the total actually means something.',
      ],
    },
    exhibits: [
      {
        slot: 'wallLeft',
        kind: 'bookshelf',
        content: say('Portfolio: every broker and every asset class in one figure.', 'A stale number that looks fresh is worse than no number.'),
      },
      {
        slot: 'tableLeft',
        kind: 'desk',
        content: say('The Inbox: agents propose, you decide.', 'Every change waits here with its reasoning. Nothing is applied on its own.'),
      },
      {
        slot: 'tableRight',
        kind: 'maptable',
        content: say('Prices, allocation, profit and loss: they update as the market moves.'),
      },
      {
        slot: 'cornerRight',
        kind: 'coinchest',
        content: say('Dividends: income by month, by ticker and by source.', 'Not an estimate from a yield: the payments that actually arrived.'),
      },
      {
        slot: 'cornerLeft',
        kind: 'lectern',
        content: say('The Advisor answers questions against the real holdings.', 'It analyses; it does not recommend.'),
      },
    ],
    portal: {
      colour: 0xe0b050,
      pages: ['A golden light. Beyond it: vest101.com.', 'Nothing it shows is investment advice. Investments can lose value.'],
      url: 'https://vest101.com',
      label: 'Visit vest101',
    },
  },
  {
    id: 'osler',
    name: 'Osler·MD',
    keeper: {
      look: 'healer',
      pages: ['Welcome to Osler·MD, a personal medical assistant.', 'Upload your records and get guidance shaped by your own history.'],
    },
    exhibits: [
      {
        slot: 'wallLeft',
        kind: 'apothecary',
        content: say("Lab results, doctor's notes and reports, kept as a private medical memory."),
      },
      {
        slot: 'tableRight',
        kind: 'desk',
        content: say('Ask about meals, exercise, sleep, habits and supplements.', 'The answers use your own history, not generic advice.'),
      },
      {
        slot: 'wallRight',
        kind: 'bookshelf',
        content: say('In English and Spanish. Your health data stays private to your account.'),
      },
      {
        slot: 'cornerLeft',
        kind: 'lectern',
        content: say('Osler is not a doctor. It gives general wellness information only.', 'In an emergency, contact your local emergency services.'),
      },
    ],
    portal: {
      colour: 0x7fd6c8,
      pages: ['A pale, clean light. Beyond it: osler.azyr.io.'],
      url: 'https://osler.azyr.io',
      label: 'Open Osler·MD',
    },
  },
  {
    id: 'kandrax-rol',
    name: 'Kandrax Rol',
    keeper: {
      look: 'bard',
      pages: ['¡Bienvenido a Kandrax Rol!', 'Un canal de YouTube dedicado al arte del rol de mesa.'],
    },
    exhibits: [
      {
        slot: 'tableLeft',
        kind: 'maptable',
        content: say('Aventuras épicas por los reinos de Dungeons & Dragons.', 'Donde la narración y la imaginación se unen.'),
      },
      {
        slot: 'wallRight',
        kind: 'bookshelf',
        content: say('Cada sesión trae nuevos desafíos y personajes memorables.'),
      },
      {
        slot: 'tableRight',
        kind: 'boardtable',
        content: say('El juego de mesa, convertido en un arte colaborativo.'),
      },
      {
        slot: 'cornerLeft',
        kind: 'lectern',
        content: say('Suscríbete para seguir nuestras campañas en curso y nuestros oneshots.'),
      },
    ],
    portal: {
      colour: 0xa070e0,
      pages: ['Una luz violeta. Al otro lado: el canal de YouTube.'],
      url: 'https://www.youtube.com/@KandraxRol',
      label: 'Visitar el canal',
    },
  },
  {
    id: 'kandrax-app',
    name: 'Kandrax App',
    keeper: {
      look: 'dungeonmaster',
      pages: ['Kandrax App: a tool for Dungeons & Dragons.', 'From dungeon masters to players, it helps everyone at the table.'],
    },
    exhibits: [
      {
        slot: 'tableLeft',
        kind: 'desk',
        content: say('Character tracking and campaign organization.'),
      },
      {
        slot: 'wallRight',
        kind: 'bookshelf',
        content: say("Quick reference to the game's mechanics."),
      },
      {
        slot: 'tableRight',
        kind: 'maptable',
        content: say('Focus on what matters most: the story.', 'A clean interface, and a deep respect for the game itself.'),
      },
    ],
    portal: {
      colour: 0x60c080,
      pages: ['A green light. Beyond it: kandrax.app.'],
      url: 'https://www.kandrax.app/',
      label: 'Visit Kandrax App',
    },
  },
  {
    id: 'hidden-agenda',
    name: 'Hidden Agenda',
    keeper: {
      look: 'spymaster',
      pages: ['Hidden Agenda: a board game where deception meets teamwork.', 'Trust is a rare commodity here.'],
    },
    exhibits: [
      {
        slot: 'tableLeft',
        kind: 'boardtable',
        content: say('Agents, Spies, Snipers and CEOs, each with unique abilities.', 'Every move counts.'),
      },
      {
        slot: 'wallRight',
        kind: 'mirror',
        content: say('Keep your true allegiance hidden.', 'Reveal your identity at the right moment. Make accusations.'),
      },
      {
        slot: 'tableRight',
        kind: 'desk',
        content: say('Play around one screen, or online:', 'share a room code and join from your own device.'),
      },
    ],
    portal: {
      colour: 0xd04848,
      pages: ['A red light. Beyond it: hidden-agenda.azyr.io.'],
      url: 'https://hidden-agenda.azyr.io/',
      label: 'Play Hidden Agenda',
    },
  },
  {
    id: 'azyrio',
    name: 'Azyrio',
    keeper: {
      look: 'gamer',
      pages: ['Azyrio: my gaming content channel.', 'Indie gems and popular titles, with thoughtful commentary.'],
    },
    exhibits: [
      {
        slot: 'wallRight',
        kind: 'mirror',
        content: say('In every video: thoughtful commentary and gameplay highlights.'),
      },
      {
        slot: 'wallLeft',
        kind: 'bookshelf',
        content: say('Game reviews and playthroughs.', 'For anyone who likes good game design.'),
      },
      {
        slot: 'tableRight',
        kind: 'boardtable',
        content: say('A celebration of what makes gaming special.'),
      },
    ],
    portal: {
      colour: 0x5a8cff,
      pages: ['A blue light. Beyond it: the Azyrio channel.'],
      url: 'https://www.youtube.com/@Azyrio',
      label: 'Visit the channel',
    },
  },
  {
    id: 'github',
    name: 'GitHub',
    keeper: {
      look: 'smith',
      pages: ['GitHub: code and open source.', 'Web development, tools and experimental projects.'],
    },
    exhibits: [
      {
        slot: 'cornerRight',
        kind: 'anvil',
        content: say('From full-stack applications to utility libraries.'),
      },
      {
        slot: 'tableLeft',
        kind: 'desk',
        content: say('Clean, maintainable software.', 'Each repository, a commitment to quality.'),
      },
      {
        slot: 'wallRight',
        kind: 'bookshelf',
        content: say('Personal projects and open source contributions.'),
      },
    ],
    portal: {
      colour: 0xc8d0dc,
      pages: ['A silver light. Beyond it: github.com/FedeIII.'],
      url: 'https://github.com/FedeIII',
      label: 'Visit the GitHub profile',
    },
  },
  {
    id: 'journal',
    name: 'Journal',
    keeper: {
      look: 'archivist',
      pages: ['Journal: daily reflections.', 'Write your thoughts each day.', 'Revisit them on the same date in future years.'],
    },
    exhibits: [
      {
        slot: 'tableLeft',
        kind: 'desk',
        content: say("Today's page, and last year's page beside it."),
      },
      {
        slot: 'wallRight',
        kind: 'bookshelf',
        content: say('Years of memories, side by side.', 'A time-traveling walk through your own history.'),
      },
      {
        slot: 'cornerRight',
        kind: 'lectern',
        content: say('A digital journal for daily memories, compared across years.'),
      },
    ],
    portal: {
      colour: 0xe09a50,
      pages: ['An amber light. Beyond it: journal.azyr.io.'],
      url: 'https://journal.azyr.io',
      label: 'Open Journal',
    },
  },
];
