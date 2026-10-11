import { Ground, type Fixture } from '@game/engine';
import { HIMO_FREE } from './quests.ts';
import { campSite } from './road.ts';
import { Town, type Plan } from './towns.ts';

/**
 * The camp of the war band (story phase 4b; chapter 1.5.1, "the hobgoblin camp" of S6): two tents of
 * hide, a fire, and the post where they keep their prisoner, in a clearing in the hills off the north
 * road (road.ts, campSite; a trail leads to it). A place of the town builder (towns.ts), but not a
 * town: mobs come here as anywhere in the woods.
 *
 * The scout Himo is tied to the post, for a character whose war band fell on the road (quests.ts,
 * raid at `band`): the post shows him (Fixture.variant), and cutting the ropes frees him (HIMO_FREE).
 *
 *   .  grass    :  trampled earth    1-2  the tents    C  the fire    S  the post    x  a crate    b  a barrel
 */
const MAP = [
  '................',
  '.11111....22222.',
  '.11111....22222.',
  '.11111....22222.',
  '.11111....22222.',
  '::::::::::::::::',
  ':::::::::::::::.',
  ':::::::C::::::::',
  '::::::::::::::::',
  'x::::::::S:::::b',
  ':::::::::::::::.',
  '................',
];

/** The tents: hide on poles, shut (nothing to find in them). */
const BUILDINGS: readonly Plan[] = [
  {
    id: 'camp-tent',
    style: { walls: 'canvas', roof: 'canvas' },
    floor: Ground.FloorEarth,
    plan: ['#####', '#...#', '#...#', '##D##'],
    locked: 'A tent of the war band. It stinks of wet fur and smoke.',
  },
  {
    id: 'camp-tent-2',
    style: { walls: 'canvas', roof: 'canvas' },
    floor: Ground.FloorEarth,
    plan: ['#####', '#...#', '#...#', '##D##'],
    locked: 'Empty, but for bones and a broken spear.',
  },
];

/** The fire of the camp: a low red light. */
const FIRE_LIGHT = { radius: 96, colour: 0xff7030, x: 8, y: -10 } as const;

/** The things of the camp by their character in MAP: a template, without its place. */
const THINGS: Readonly<Record<string, Fixture>> = {
  C: { kind: 'campfire', tx: 0, ty: 0, light: FIRE_LIGHT, content: { pages: ['The fire of the war band. Bones in the ashes.'] } },
  S: {
    kind: 'stake',
    tx: 0,
    ty: 0,
    content: { pages: ['A thick post, driven deep into the ground. Cut ropes lie at its foot.'] },
    // For a character whose war band fell on the road: Himo, tied to it, and the ropes to cut.
    variant: {
      when: { quest: 'raid', at: ['band'] },
      frame: 'fixture/stake-bound',
      content: {
        pages: ['Himo, the scout of Ironhold, is tied to the post. Bruised, and alive.', 'You cut the ropes. "Get me home," he says. "Please."'],
        effect: HIMO_FREE,
      },
    },
  },
  x: { kind: 'crate', tx: 0, ty: 0, content: { pages: ['Stolen crates, empty now.'] } },
  b: { kind: 'barrel', tx: 0, ty: 0, content: { pages: ['A barrel of bad water.'] } },
};

const SITE = campSite();

/** The camp, built from its plan, with its middle on the camp site. */
export const CAMP = new Town({ name: 'the camp of the war band', x0: SITE.tx - 8, y0: SITE.ty - 6, map: MAP, buildings: BUILDINGS, things: THINGS });

/** Where the trail comes into the camp: the tile just east of it, on its middle row of trampled earth. */
export const CAMP_GATE = { tx: CAMP.x1 + 1, ty: CAMP.y0 + 7 } as const;

/** The post of the camp, where Himo is (the map marks it at the step `band`). */
export const CAMP_STAKE: readonly [number, number] = [CAMP.x0 + 9, CAMP.y0 + 9];
