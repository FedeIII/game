import { Ground, type Fixture } from '@game/engine';
import { MIRA } from './dialogs.ts';
import { Road } from './road.ts';
import { Town, type Plan } from './towns.ts';

/**
 * The Wren homestead (story phase 7; "Shadows of the Ashen Seekers", phase 3, "Race Against Time"):
 * a whole house by the pool of the Silvervein, south-west of it, where Mira Wren lives with her two
 * children. Her children find carved stones in the mud of the pool, the stones of the old shrine of
 * Tigris (phase 9). The Ashen Seekers come for the stones: their cinder hounds march on the house from
 * the east, on a burned trail from their camp in the hills (SEEKER_TRAIL; source.ts, the ambush
 * CINDERS).
 *
 * A place of the town builder (towns.ts), but not a town: mobs come here as in the woods.
 *
 *   .  grass    1  the house    :  the yard path, to the burned trail    T  a tree
 */
const MAP = [
  '.............',
  '..1111111....',
  '..1111111.T..',
  '..1111111....',
  '..1111111....',
  '..1111111..T.',
  '..1111111....',
  '.....::::::::',
  '.............',
  '.T...........',
  '.............',
];

const BUILDINGS: readonly Plan[] = [
  {
    id: 'wren-house',
    style: { walls: 'planks', roof: 'thatch' },
    floor: Ground.FloorEarth,
    roofProps: [{ name: 'chimney', column: 1 }],
    plan: ['#######', '#b.s.c#', '#b....#', '#..M..#', '#tt..x#', '#+#D#+#'],
    things: {
      b: { kind: 'bed', pages: ['A wide bed, and two small mattresses rolled under it.'] },
      s: { kind: 'bookshelf', pages: ['No books: river stones, lined up with care. Some are carved with waves.'] },
      c: { kind: 'chest', pages: ["Children's clothes, mended many times."] },
      t: { kind: 'table', pages: ['A bowl of fish soup, still warm.'] },
      x: { kind: 'barrel', pages: ['Salted fish.'] },
    },
    people: {
      M: {
        id: 'mira',
        look: 'survivor',
        dialog: MIRA,
        barks: ['Pip! Away from the water!', 'The goats are restless tonight.', 'Who goes there?'],
        doorstep: true,
      },
    },
  },
];

/** The homestead, with its north-west tile at (176, -108): south-west of the pool of the Silvervein (river.ts). */
export const WREN = new Town({ name: 'the Wren homestead', x0: 176, y0: -108, map: MAP, buildings: BUILDINGS, things: {} as Readonly<Record<string, Fixture>> });

/** Mira Wren (story phase 7). Her order is her code on the wire: add new people at the end. */
export const WREN_NPCS = WREN.residents;

/** Where the yard path meets the burned trail: the east end of the path. */
export const WREN_GATE = WREN.at(12, 7);

/**
 * The middle of the camp of the Ashen Seekers (story phase 8): in the hills east of the Silvervein,
 * at the east end of the burned trail.
 */
export const SEEKER_CAMP_SITE = { tx: 236, ty: -100 } as const;

/** The burned trail of the Seekers: from the yard of the Wren homestead east to their camp (its west edge). */
export const SEEKER_TRAIL = new Road(WREN_GATE[0] + 1.5, WREN_GATE[1] + 0.5, SEEKER_CAMP_SITE.tx - 8 + 0.5, SEEKER_CAMP_SITE.ty + 0.5);
