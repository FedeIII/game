import { Ground, type Fixture } from '@game/engine';
import { SELA } from './dialogs.ts';
import { STONE_BACK } from './quests.ts';
import { Town, type Plan } from './towns.ts';
import { SEEKER_CAMP_SITE } from './wren.ts';

/**
 * The camp of the Ashen Seekers (story phase 8; "Shadows of the Ashen Seekers", phase 4, "Unraveling
 * the Mystery"): grey tents in a clearing of the hills east of the Silvervein, at the east end of the
 * burned trail from the Wren homestead (wren.ts). The Seekers move their camp all the time (the
 * `RPG` notes: "a mobile camp"), and this one is half packed. Their standard stands by a cold fire.
 *
 * Blades and a cinder adept guard it for a character at `held` or `late` (source.ts, the ambush
 * CAMP_GUARD). Then the character finds Sela tied to the post (a variant of the post, as Himo's in
 * camp.ts): a Seeker who would not burn a family. Freed, she tells what the Seekers want. The chest
 * gives the wave stone back to a character who has none (the Seekers took it at the Wren homestead).
 *
 * A place of the town builder (towns.ts), but not a town: mobs come here as in the woods.
 *
 *   .  grass    :  trampled earth    1-2  the tents    C  the cold fire    P  the standard
 *   S  the post    c  the chest    L  the reading stand with a torn page    x  a crate    b  a barrel
 */
const MAP = [
  '................',
  '.11111....22222.',
  '.11111....22222.',
  '.11111....22222.',
  '.11111....22222.',
  '::::::::::::::::',
  '::::::::::::::::',
  ':::::::::::::::.',
  '.P::::C:::::S::.',
  '.:::::::::::::x.',
  '.L:::::::::c::b.',
  '................',
];

/** The tents: grey canvas, shut and half packed. */
const BUILDINGS: readonly Plan[] = [
  {
    id: 'seeker-tent',
    style: { walls: 'ashcanvas', roof: 'ashcanvas' },
    floor: Ground.FloorEarth,
    plan: ['#####', '#...#', '#...#', '##D##'],
    locked: 'Laced shut. Inside, bedrolls are tied for the road.',
  },
  {
    id: 'seeker-tent-2',
    style: { walls: 'ashcanvas', roof: 'ashcanvas' },
    floor: Ground.FloorEarth,
    plan: ['#####', '#...#', '#...#', '##D##'],
    locked: 'Laced shut. It smells of cold ash and incense.',
  },
];

/** The things of the camp by their character in MAP: a template, without its place. */
const THINGS: Readonly<Record<string, Fixture>> = {
  C: { kind: 'campfire', tx: 0, ty: 0, content: { pages: ['A fire that was put out with care. The ash is cold, and raked into the shape of a bird.'] } },
  P: {
    kind: 'standard',
    tx: 0,
    ty: 0,
    content: {
      pages: ['A standard of grey cloth: a red phoenix that rises from ashes.'],
      lore: [{ gate: { ability: 'int', dc: 11 }, pages: ['The cloth is old, older than the pole. Somebody mended it many times, with great care.'] }],
    },
  },
  S: {
    kind: 'stake',
    tx: 0,
    ty: 0,
    // The conversation with Sela has her face (the NPC look `defector`).
    look: 'defector',
    content: { pages: ['A post, driven deep into the ground. Cut ropes lie at its foot.'] },
    // For a character whose fight in the camp is over: Sela, tied to it, to talk to and to free.
    variant: { when: { quest: 'ashes', at: ['camp'] }, frame: 'fixture/stake-bound-sela', content: { speaker: 'fixture', dialog: SELA } },
  },
  c: {
    kind: 'chest',
    tx: 0,
    ty: 0,
    content: { pages: ['Stolen things: a cup, a bell, a book with no cover. All of them old. All of them broken on purpose.'] },
    // A character without the wave stone gets it back here.
    variant: {
      when: [{ quest: 'ashes', at: ['camp', 'captive'] }, { has: 'wave-stone', not: true }],
      frame: 'fixture/chest',
      content: { pages: ['Stolen things, all of them broken on purpose. One is whole: a carved stone with three waves.', 'You take the stone.'], effect: STONE_BACK },
    },
  },
  L: {
    kind: 'lectern',
    tx: 0,
    ty: 0,
    content: {
      pages: ['A torn page on a stand, in a neat hand: "...and when the last chain of the Four breaks, the Sleeper wakes, and the ash becomes a world."'],
      lore: [{ gate: { ability: 'int', dc: 12 }, pages: ['In the margin, in another hand: "Hondurria, then the walls." The rest of the page is burned away.'] }],
    },
  },
  x: { kind: 'crate', tx: 0, ty: 0, content: { pages: ['Rope, lamp oil, and masks of bone, wrapped in cloth.'] } },
  b: { kind: 'barrel', tx: 0, ty: 0, content: { pages: ['Water, and a ladle.'] } },
};

/** The camp, built from its plan, with its middle on the camp site: the burned trail comes in at the west end of its middle row. */
export const SEEKER_CAMP = new Town({ name: 'the camp of the Seekers', x0: SEEKER_CAMP_SITE.tx - 8, y0: SEEKER_CAMP_SITE.ty - 6, map: MAP, buildings: BUILDINGS, things: THINGS });

/** The tile of the post, where Sela is tied (the map marks it at `camp`). */
export const SEEKER_STAKE = SEEKER_CAMP.at(12, 8);
