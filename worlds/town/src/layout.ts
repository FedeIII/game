import { fixtureTiles, type Building, type Fixture, type Light } from '@game/engine';
import { PROJECTS, type Project, type Slot } from './projects.ts';

/**
 * The plan of the town of Azyr (tile coordinates):
 *
 *   y  4..11  row A: four houses, doors south onto the plaza
 *   y 12..23  street A and the plaza: fountain, notice board, the crier, lamps
 *   y 24..32  row B: four houses, with lanes between them from the plaza to street B
 *   y 33..37  street B, in front of the doors of row B
 *
 * Outside x 0..62, y 0..40 the forest begins.
 */
export const BOUNDS = { x0: 0, y0: 0, x1: 62, y1: 40 } as const;
export const HOUSE = { width: 11, height: 8 } as const;
const COLUMNS = [4, 18, 32, 46];
const ROWS = [4, 25];
/** Cobblestones: streets across, and lanes 3 tiles wide between the houses of row B. */
export const STREETS = [
  { x0: 2, y0: 12, x1: 60, y1: 23 },
  { x0: 2, y0: 33, x1: 60, y1: 37 },
  { x0: 15, y0: 24, x1: 17, y1: 32 },
  { x0: 29, y0: 24, x1: 31, y1: 32 },
  { x0: 43, y0: 24, x1: 45, y1: 32 },
] as const;
/** Where a new player starts: in the plaza, south of the fountain. */
export const SPAWN = { tx: 30, ty: 22 } as const;

// Lights, in pixels from a fixture's anchor corner (y up is negative).
const LAMP: Light = { radius: 96, colour: 0xffb060, x: 8, y: -41 };
const DESK_CANDLE: Light = { radius: 48, colour: 0xffa850, x: 28, y: -26 };

/**
 * The plan of a house (x0, y0 is its north-west wall corner; the interior is x0+1..x0+9 by
 * y0+1..y0+6). The door is at x0+5 in the south wall, and the column of the door and the row just
 * inside the south wall stay free. The portal stands at the end of that corridor, against the north
 * wall: the first thing in view on the way in. The keeper stands next to the corridor.
 */
const SLOTS: Record<Slot, (x0: number, y0: number) => [number, number]> = {
  wallLeft: (x0, y0) => [x0 + 2, y0 + 1],
  wallRight: (x0, y0) => [x0 + 8, y0 + 1],
  tableLeft: (x0, y0) => [x0 + 1, y0 + 3],
  tableRight: (x0, y0) => [x0 + 7, y0 + 3],
  cornerLeft: (x0, y0) => [x0 + 1, y0 + 6],
  cornerRight: (x0, y0) => [x0 + 9, y0 + 6],
};

function house(project: Project, index: number): Building {
  const x0 = COLUMNS[index % 4]!;
  const y0 = ROWS[Math.floor(index / 4)]!;
  const fixtures: Fixture[] = [
    {
      kind: 'portal',
      tx: x0 + 5,
      ty: y0 + 1,
      content: { pages: project.portal.pages, link: { url: project.portal.url, label: project.portal.label, title: project.name } },
      light: { radius: 96, colour: project.portal.colour, x: 16, y: -26 },
    },
    { kind: 'npc', tx: x0 + 4, ty: y0 + 5, look: project.keeper.look, content: { pages: project.keeper.pages, speaker: 'fixture' } },
    ...project.exhibits.map((exhibit): Fixture => {
      const [tx, ty] = SLOTS[exhibit.slot](x0, y0);
      return { kind: exhibit.kind, tx, ty, content: exhibit.content, ...(exhibit.kind === 'desk' ? { light: DESK_CANDLE } : {}) };
    }),
  ];
  return { id: project.id, x0, y0, x1: x0 + HOUSE.width - 1, y1: y0 + HOUSE.height - 1, doorX: x0 + 5, fixtures, sign: project.name };
}

export const HOUSES: readonly Building[] = PROJECTS.map(house);

/** The plaza and the streets: the fountain, the notice board, the crier and the lamps. */
export const OUTDOOR: readonly Fixture[] = [
  { kind: 'fountain', tx: 29, ty: 19 },
  {
    kind: 'noticeboard',
    tx: 24,
    ty: 21,
    content: {
      pages: ['AZYR · Developer & Creator.', 'Eight houses: vest101, Osler·MD, Kandrax Rol and Kandrax App,', 'Hidden Agenda, Azyrio, GitHub and Journal.'],
      link: { url: 'https://azyr.io', label: 'Visit azyr.io', title: 'Azyr' },
    },
  },
  {
    kind: 'npc',
    tx: 34,
    ty: 21,
    look: 'crier',
    content: {
      speaker: 'fixture',
      pages: ['Welcome to the town of Azyr!', 'Each house holds one of the projects. Walk in and look around.', 'The portals inside lead to the real thing.'],
    },
  },
  ...[
    [16, 12], [30, 12], [44, 12], [2, 14], [60, 14],
    [26, 18], [34, 18],
    [16, 34], [30, 34], [44, 34], [2, 35], [60, 35],
  ].map(([tx, ty]): Fixture => ({ kind: 'lamppost', tx: tx!, ty: ty!, light: LAMP })),
];

/** Every fixture of the town, in houses and outside, by each tile of its footprint. */
export function fixturesByTile(): Map<string, { fixture: Fixture; code: number }> {
  const out = new Map<string, { fixture: Fixture; code: number }>();
  for (const fixture of [...HOUSES.flatMap((h) => h.fixtures), ...OUTDOOR]) {
    for (const [tx, ty, code] of fixtureTiles(fixture)) {
      const key = `${tx},${ty}`;
      if (out.has(key)) throw new Error(`two fixtures on tile ${key}`);
      out.set(key, { fixture, code });
    }
  }
  return out;
}
