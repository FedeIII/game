import { Ground, type BuildingStyle, type FixtureKind, type Interaction, type Light } from '@game/engine';

/**
 * The projects of the azyr.io landing page, one house each, in the order of the landing page.
 * The texts come from the project list (/var/www/azyr.io/public/index.html) and the detail page
 * of each project (wallet.html, osler.html, ...). When those pages change, change this file.
 *
 * Kandrax Rol speaks Spanish, as its page does; everything else is in English.
 *
 * Each house has its own size, style and plan, and its things match its style: a counting
 * house for vest101, a healer's hut for Osler·MD, a players' tent for Kandrax Rol, and so on.
 */

/** A thing in a house plan, by its letter. */
export interface Exhibit {
  readonly kind: FixtureKind;
  /** What acting on it shows. Without content, the town's line for the kind (index.ts) is used. */
  readonly content?: Interaction;
  /** A light of its own. Default: the light of its kind (layout.ts), if the kind has one. */
  readonly light?: Light;
}

/**
 * A house: how it looks, and its plan.
 *
 * The plan is the house tile by tile, from the north wall to the south wall, walls included:
 *   #  wall          D  the door (south wall)     +  a lit window (south wall)
 *   .  floor         P  the portal (2 tiles)      K  the keeper
 * Every other character is a thing of `exhibits`. A thing of more than one tile (a desk, a
 * rug) has its letter on each of its tiles.
 */
export interface House {
  readonly style: BuildingStyle;
  readonly floor: Ground;
  readonly plan: readonly string[];
  /**
   * Things on the ridge of the roof (art/buildings.ts ROOF_PROPS), each in a column of the plan
   * (0 is the west wall).
   */
  readonly roofProps?: readonly { readonly name: string; readonly column: number }[];
  readonly exhibits: Readonly<Record<string, Exhibit>>;
}

export interface Project {
  readonly id: string;
  /** The name on the sign and on the link card. */
  readonly name: string;
  /** The keeper: an NPC look (art/characters.ts) and what the keeper says. */
  readonly keeper: { readonly look: string; readonly pages: readonly string[] };
  /** The portal: the most prominent thing in the house, and the link to the project. */
  readonly portal: { readonly colour: number; readonly pages: readonly string[]; readonly url: string; readonly label: string };
  readonly house: House;
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
    portal: {
      colour: 0xe0b050,
      pages: ['A golden light. Beyond it: vest101.com.', 'Nothing it shows is investment advice. Investments can lose value.'],
      url: 'https://vest101.com',
      label: 'Visit vest101',
    },
    // A timber counting house: ledgers, scales and a strongbox.
    house: {
      style: { walls: 'timber', roof: 'shingle' },
      floor: Ground.Floor,
      roofProps: [
        { name: 'vane', column: 2 },
        { name: 'chimney', column: 5 },
      ],
      plan: [
        '#######',
        '#bPPsc#',
        '#.....#',
        '#dd..K#',
        '#l....#',
        '#+#+#D#',
      ],
      exhibits: {
        b: { kind: 'bookshelf', content: say('Portfolio: every broker and every asset class in one figure.', 'A stale number that looks fresh is worse than no number.') },
        s: { kind: 'scales', content: say('Prices, allocation, profit and loss: they update as the market moves.') },
        c: { kind: 'coinchest', content: say('Dividends: income by month, by ticker and by source.', 'Not an estimate from a yield: the payments that actually arrived.') },
        d: { kind: 'desk', content: say('The Inbox: agents propose, you decide.', 'Every change waits here with its reasoning. Nothing is applied on its own.') },
        l: { kind: 'lectern', content: say('The Advisor answers questions against the real holdings.', 'It analyses; it does not recommend.') },
      },
    },
  },
  {
    id: 'osler',
    name: 'Osler·MD',
    keeper: {
      look: 'healer',
      pages: ['Welcome to Osler·MD, a personal medical assistant.', 'Upload your records and get guidance shaped by your own history.'],
    },
    portal: {
      colour: 0x7fd6c8,
      pages: ['A pale, clean light. Beyond it: osler.azyr.io.'],
      url: 'https://osler.azyr.io',
      label: 'Open Osler·MD',
    },
    // A healer's hut of planks and thatch: jars of remedies and a brew on the fire.
    house: {
      style: { walls: 'planks', roof: 'thatch' },
      floor: Ground.FloorEarth,
      roofProps: [{ name: 'chimney', column: 1 }],
      plan: [
        '######',
        '#aPPb#',
        '#....#',
        '#crrK#',
        '#.rr.#',
        '#l...#',
        '##+#D#',
      ],
      exhibits: {
        a: { kind: 'apothecary', content: say("Lab results, doctor's notes and reports, kept as a private medical memory.") },
        b: { kind: 'bookshelf', content: say('In English and Spanish. Your health data stays private to your account.') },
        c: { kind: 'cauldron', content: say('Ask about meals, exercise, sleep, habits and supplements.', 'The answers use your own history, not generic advice.') },
        r: { kind: 'rug' },
        l: { kind: 'lectern', content: say('Osler is not a doctor. It gives general wellness information only.', 'In an emergency, contact your local emergency services.') },
      },
    },
  },
  {
    id: 'kandrax-rol',
    name: 'Kandrax Rol',
    keeper: {
      look: 'bard',
      pages: ['¡Bienvenido a Kandrax Rol!', 'Un canal de YouTube dedicado al arte del rol de mesa.'],
    },
    portal: {
      colour: 0xa070e0,
      pages: ['Una luz violeta. Al otro lado: el canal de YouTube.'],
      url: 'https://www.youtube.com/@KandraxRol',
      label: 'Visitar el canal',
    },
    // A players' tent, low and wide: a map, a game board and the props of the next session.
    house: {
      style: { walls: 'canvas', roof: 'canvas' },
      floor: Ground.FloorEarth,
      roofProps: [
        { name: 'flag-wine', column: 2 },
        { name: 'flag-wine', column: 5 },
      ],
      plan: [
        '########',
        '#bPPx.l#',
        '#......#',
        '#mmK.gg#',
        '####D###',
      ],
      exhibits: {
        b: { kind: 'bookshelf', content: say('Cada sesión trae nuevos desafíos y personajes memorables.') },
        x: { kind: 'crate', content: say('Dados, mapas y miniaturas, listos para la próxima sesión.') },
        l: { kind: 'lectern', content: say('Suscríbete para seguir nuestras campañas en curso y nuestros oneshots.') },
        m: { kind: 'maptable', content: say('Aventuras épicas por los reinos de Dungeons & Dragons.', 'Donde la narración y la imaginación se unen.') },
        g: { kind: 'boardtable', content: say('El juego de mesa, convertido en un arte colaborativo.') },
      },
    },
  },
  {
    id: 'kandrax-app',
    name: 'Kandrax App',
    keeper: {
      look: 'dungeonmaster',
      pages: ['Kandrax App: a tool for Dungeons & Dragons.', 'From dungeon masters to players, it helps everyone at the table.'],
    },
    portal: {
      colour: 0x60c080,
      pages: ['A green light. Beyond it: kandrax.app.'],
      url: 'https://www.kandrax.app/',
      label: 'Visit Kandrax App',
    },
    // A small rubble keep with a flat, battlemented roof: maps, records and a telescope.
    house: {
      style: { walls: 'rubble', roof: 'battlement' },
      floor: Ground.FloorStone,
      roofProps: [{ name: 'flag-green', column: 3 }],
      plan: [
        '######',
        '#bPPt#',
        '#....#',
        '#.mmK#',
        '#....#',
        '#..dd#',
        '##D+##',
      ],
      exhibits: {
        b: { kind: 'bookshelf', content: say("Quick reference to the game's mechanics.") },
        t: { kind: 'telescope', content: say('A clean interface, powerful features,', 'and a deep respect for the game itself.') },
        m: { kind: 'maptable', content: say('Focus on what matters most: the story.') },
        d: { kind: 'desk', content: say('Character tracking and campaign organization.') },
      },
    },
  },
  {
    id: 'hidden-agenda',
    name: 'Hidden Agenda',
    keeper: {
      look: 'spymaster',
      pages: ['Hidden Agenda: a board game where deception meets teamwork.', 'Trust is a rare commodity here.'],
    },
    portal: {
      colour: 0xd04848,
      pages: ['A red light. Beyond it: hidden-agenda.azyr.io.'],
      url: 'https://hidden-agenda.azyr.io/',
      label: 'Play Hidden Agenda',
    },
    // A brick house with a red clay roof: a game in progress, a mirror, sealed crates.
    house: {
      style: { walls: 'brick', roof: 'clay' },
      floor: Ground.Floor,
      roofProps: [{ name: 'chimney', column: 1 }],
      plan: [
        '#######',
        '#xPPm.#',
        '#.....#',
        '#gg.K.#',
        '#dd...#',
        '#+#D#+#',
      ],
      exhibits: {
        x: { kind: 'crate', content: say('Careful planning, and the strategic elimination of enemy pieces.', 'Lead your team to victory.') },
        m: { kind: 'mirror', content: say('Keep your true allegiance hidden.', 'Reveal your identity at the right moment. Make accusations.') },
        g: { kind: 'boardtable', content: say('Agents, Spies, Snipers and CEOs, each with unique abilities.', 'Every move counts.') },
        d: { kind: 'desk', content: say('Play around one screen, or online:', 'share a room code and join from your own device.') },
      },
    },
  },
  {
    id: 'azyrio',
    name: 'Azyrio',
    keeper: {
      look: 'gamer',
      pages: ['Azyrio: my gaming content channel.', 'Indie gems and popular titles, with thoughtful commentary.'],
    },
    portal: {
      colour: 0x5a8cff,
      pages: ['A blue light. Beyond it: the Azyrio channel.'],
      url: 'https://www.youtube.com/@Azyrio',
      label: 'Visit the channel',
    },
    // A painted parlour under an indigo roof: a crystal ball that shows other worlds.
    house: {
      style: { walls: 'painted', roof: 'indigo' },
      floor: Ground.Floor,
      roofProps: [{ name: 'moon', column: 3 }],
      plan: [
        '######',
        '#bPPo#',
        '#.rr.#',
        '#.rrK#',
        '#gg..#',
        '##+#D#',
      ],
      exhibits: {
        b: { kind: 'bookshelf', content: say('Game reviews and playthroughs.', 'For anyone who likes good game design.') },
        o: { kind: 'crystalball', content: say('In every video: thoughtful commentary and gameplay highlights.') },
        r: { kind: 'rug' },
        g: { kind: 'boardtable', content: say('A celebration of what makes gaming special.') },
      },
    },
  },
  {
    id: 'github',
    name: 'GitHub',
    keeper: {
      look: 'smith',
      pages: ['GitHub: code and open source.', 'Web development, tools and experimental projects.'],
    },
    portal: {
      colour: 0xc8d0dc,
      pages: ['A silver light. Beyond it: github.com/FedeIII.'],
      url: 'https://github.com/FedeIII',
      label: 'Visit the GitHub profile',
    },
    // A stone smithy: a forge under its own chimney, an anvil, a water barrel.
    house: {
      style: { walls: 'stone', roof: 'slate' },
      floor: Ground.FloorStone,
      roofProps: [{ name: 'chimney', column: 5 }],
      plan: [
        '########',
        '#bPP.ff#',
        '#......#',
        '#dd.Ka.#',
        '#.....w#',
        '#D+###+#',
      ],
      exhibits: {
        b: { kind: 'bookshelf', content: say('Personal projects and open source contributions.') },
        f: { kind: 'forge', content: say('From full-stack applications to utility libraries.') },
        d: { kind: 'desk', content: say('Clean, maintainable software.') },
        a: { kind: 'anvil', content: say('Each repository: a commitment to quality and innovation.') },
        w: { kind: 'barrel', content: say('Water, to cool the hot iron.') },
      },
    },
  },
  {
    id: 'journal',
    name: 'Journal',
    keeper: {
      look: 'archivist',
      pages: ['Journal: daily reflections.', 'A place to capture your memories, one day at a time.'],
    },
    portal: {
      colour: 0xe09a50,
      pages: ['An amber light. Beyond it: journal.azyr.io.'],
      url: 'https://journal.azyr.io',
      label: 'Open Journal',
    },
    // A tall gothic chapel of records with a green copper roof, lit by candles.
    house: {
      style: { walls: 'gothic', roof: 'copper' },
      floor: Ground.FloorStone,
      roofProps: [
        { name: 'spire', column: 1 },
        { name: 'spire', column: 4 },
      ],
      plan: [
        '######',
        '#bPPc#',
        '#....#',
        '#c..K#',
        '#dd..#',
        '#...l#',
        '#D+###',
      ],
      exhibits: {
        b: { kind: 'bookshelf', content: say('Years of memories, side by side.', 'A time-traveling walk through your own history.') },
        c: { kind: 'candelabra', content: say('A digital journal for daily memories, compared across years.') },
        d: { kind: 'desk', content: say("Today's page, and last year's page beside it.") },
        l: { kind: 'lectern', content: say('Write your thoughts each day.', 'Revisit them on the same date in future years.') },
      },
    },
  },
];
