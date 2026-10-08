import { Ground, fixtureTiles, fixtureType, type Building, type Fixture, type FixtureKind, type Light, type NpcDef } from '@game/engine';
import { PROJECTS, type Project } from './projects.ts';

/**
 * The plan of the town of Azyr, one character per tile, north at the top. Outside it the forest
 * begins. Four houses face the plaza from the north; four more stand back to back with it and
 * face the lane in the south. Alleys between the houses join the plaza and the lane.
 *
 * The town is small on purpose: from the spawn, a desktop screen at the default zoom (1280 x
 * 720: 26 x 15 tiles) shows all eight doors at once, and a phone the four in the middle. So the
 * north fronts are on row 8, the south fronts on row 20, and the outer doors are near the
 * inner ends of their houses. In front of each door the ground stays clear: no lamp, prop or
 * tree in the 5 x 3 tiles below it (the tests check both).
 *
 *   .  garden: grass with tufts and flowers      T  a tree in a garden
 *   =  cobblestones                               1-8  the house of PROJECTS[n - 1] (projects.ts)
 *   F  the fountain (3 x 3)     N  the notice board (2 x 1)     C  the town crier
 *   L  a lamp post              b  a barrel                     x  a crate
 *
 * The things (F, N, C, L, b, x) stand on cobblestones.
 */
const MAP = [
  '............T............T............',
  '.T....................................',
  '...222222............444444.888888....',
  '...222222.1111111..T.444444.888888....',
  '...222222.1111111....444444.888888..T.',
  '...222222.1111111.T..444444.888888....',
  '...222222.1111111....444444.888888....',
  '...222222.1111111....444444.888888....',
  '...222222.1111111....444444.888888....',
  '..=L=======L======FFF=====L======L==..',
  'T.================FFF===============..',
  '..x===============FFF==============x..',
  '..b========NN=========C============b..',
  '..==================================.T',
  '..==================================..',
  '..=666666===========5555555=77777777..',
  '..=666666=33333333==5555555=77777777..',
  'T.=666666=33333333==5555555=77777777..',
  '..=666666=33333333==5555555=77777777..',
  '..=666666=33333333==5555555=77777777.T',
  '..=666666=33333333==5555555=77777777..',
  '.==L======L========L=============L===.',
  '.b==================================b.',
  '.x==================================x.',
  '................T................T....',
  '......T...................T...........',
];

export const BOUNDS = { x0: 0, y0: 0, x1: MAP[0]!.length - 1, y1: MAP.length - 1 } as const;

/** Where a new player starts: south of the fountain, at the top of the main alley. */
export const SPAWN = { tx: 19, ty: 13 } as const;

// Lights, in pixels from a fixture's anchor corner (y up is negative). The radius snaps to the
// nearest radius of the light atlas (48, 96, 150).
const LAMP: Light = { radius: 96, colour: 0xffb060, x: 8, y: -41 };
/** The light that a kind of thing gives off, unless the thing has a light of its own. */
const LIGHTS: Partial<Record<FixtureKind, Light>> = {
  desk: { radius: 48, colour: 0xffa850, x: 28, y: -26 },
  candelabra: { radius: 48, colour: 0xffb060, x: 8, y: -29 },
  cauldron: { radius: 48, colour: 0x70d060, x: 8, y: -15 },
  forge: { radius: 96, colour: 0xff7030, x: 16, y: -20 },
  crystalball: { radius: 48, colour: 0x6a8cff, x: 8, y: -19 },
  lamppost: LAMP,
};

/** What a tile outside the houses is: a garden, a garden with a tree, or a street. */
export const Plot = { Garden: 0, Tree: 1, Street: 2 } as const;
export type Plot = (typeof Plot)[keyof typeof Plot];

type Tile = readonly [number, number];

/** The tiles of each character of a plan whose north-west tile is (x0, y0). */
function tilesOf(rows: readonly string[], x0: number, y0: number): Map<string, Tile[]> {
  const out = new Map<string, Tile[]>();
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const list = out.get(ch) ?? [];
      list.push([x0 + x, y0 + y]);
      out.set(ch, list);
    });
  });
  return out;
}

/**
 * Finds where the things of one kind stand from the tiles of their character. A thing of one
 * tile stands on each of the tiles; a thing of more tiles covers one group of touching tiles,
 * which must be its footprint exactly. Returns the anchor (south-west) tile of each thing.
 */
function anchors(kind: FixtureKind, tiles: readonly Tile[], where: string): Tile[] {
  if (fixtureType(kind).tiles.length === 1) return [...tiles];
  const left = new Set(tiles.map(([x, y]) => `${x},${y}`));
  const out: Tile[] = [];
  for (const [sx, sy] of tiles) {
    if (!left.has(`${sx},${sy}`)) continue;
    const group: Tile[] = [];
    const queue: Tile[] = [[sx, sy]];
    left.delete(`${sx},${sy}`);
    while (queue.length) {
      const [x, y] = queue.pop()!;
      group.push([x, y]);
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const) {
        if (left.delete(`${nx},${ny}`)) queue.push([nx, ny]);
      }
    }
    const tx = Math.min(...group.map(([x]) => x));
    const ty = Math.max(...group.map(([, y]) => y));
    const footprint = fixtureTiles({ kind, tx, ty }).map(([x, y]) => `${x},${y}`).sort();
    const drawn = group.map(([x, y]) => `${x},${y}`).sort();
    if (footprint.join(' ') !== drawn.join(' ')) throw new Error(`${where}: the ${kind} at ${tx},${ty} does not match its footprint`);
    out.push([tx, ty]);
  }
  return out;
}

/** The ground in front of a door where its keeper may walk: `reach` tiles to each side, `rows` deep. */
const DOORSTEP = { reach: 2, rows: 2 } as const;

/** The floor of each house, by building id. */
const FLOORS = new Map<string, Ground>();
/** The keeper of each house, by building id. */
const KEEPERS = new Map<string, NpcDef>();

/** Makes the building of a project from its plan, at the rectangle of its digit in MAP. */
function house(project: Project, index: number): Building {
  const where = `house ${project.id}`;
  const digit = MAP.flatMap((row, y) => [...row].flatMap((ch, x) => (ch === String(index + 1) ? [[x, y] as const] : [])));
  const x0 = Math.min(...digit.map(([x]) => x));
  const y0 = Math.min(...digit.map(([, y]) => y));
  const x1 = Math.max(...digit.map(([x]) => x));
  const y1 = Math.max(...digit.map(([, y]) => y));
  const { plan, exhibits, style, floor, roofProps } = project.house;
  if (digit.length !== (x1 - x0 + 1) * (y1 - y0 + 1)) throw new Error(`${where}: its tiles in the map are not a rectangle`);
  if (plan.length !== y1 - y0 + 1 || plan.some((row) => row.length !== x1 - x0 + 1)) {
    throw new Error(`${where}: the plan is not ${x1 - x0 + 1} x ${y1 - y0 + 1}, as in the map`);
  }

  // The walls: '#' all round, and the door and the windows in the south wall only.
  const fixtures: Fixture[] = [];
  let keeper: Tile | null = null;
  const windows: number[] = [];
  let doorX = -1;
  for (const [ch, tiles] of tilesOf(plan, x0, y0)) {
    const onWall = tiles.filter(([x, y]) => x === x0 || x === x1 || y === y0 || y === y1);
    const isCorner = ([x, y]: Tile) => (x === x0 || x === x1) && (y === y0 || y === y1);
    if (ch === '#' || ch === 'D' || ch === '+') {
      if (ch !== '#' && tiles.some((t) => t[1] !== y1 || isCorner(t))) throw new Error(`${where}: '${ch}' is only for the south wall, not a corner`);
      if (onWall.length !== tiles.length) throw new Error(`${where}: '${ch}' inside the house`);
      if (ch === 'D') {
        if (tiles.length !== 1) throw new Error(`${where}: a house has one door`);
        doorX = tiles[0]![0];
      }
      if (ch === '+') windows.push(...tiles.map(([x]) => x));
      continue;
    }
    if (onWall.length) throw new Error(`${where}: '${ch}' on the walls`);
    if (ch === '.') continue;
    if (ch === 'P') {
      const [portal, more] = anchors('portal', tiles, where);
      if (!portal || more) throw new Error(`${where}: a house has one portal`);
      fixtures.push({
        kind: 'portal',
        tx: portal[0],
        ty: portal[1],
        content: { pages: project.portal.pages, link: { url: project.portal.url, label: project.portal.label, title: project.name } },
        light: { radius: 96, colour: project.portal.colour, x: 16, y: -26 },
      });
      continue;
    }
    if (ch === 'K') {
      if (tiles.length !== 1) throw new Error(`${where}: a house has one keeper`);
      keeper = tiles[0]!;
      continue;
    }
    const exhibit = exhibits[ch];
    if (!exhibit) throw new Error(`${where}: no exhibit for '${ch}'`);
    const light = exhibit.light ?? LIGHTS[exhibit.kind];
    for (const [tx, ty] of anchors(exhibit.kind, tiles, where)) {
      fixtures.push({ kind: exhibit.kind, tx, ty, ...(exhibit.content ? { content: exhibit.content } : {}), ...(light ? { light } : {}) });
    }
  }
  if (doorX < 0) throw new Error(`${where}: a house needs a door`);
  if (!keeper) throw new Error(`${where}: a house needs a keeper`);
  // The keeper walks the open floor of the house ('.', its own tile, and things that do not
  // collide, such as rugs), the door, and the ground in front of the door: the 5 x 2 tiles that
  // stay clear (see MAP). It opens the door to pass, and closes it behind it.
  const walkable = (ch: string) => ch === '.' || ch === 'K' || (exhibits[ch] !== undefined && fixtureType(exhibits[ch]!.kind).tiles.every((t) => t.box === null));
  const area: Tile[] = [];
  plan.forEach((row, y) => [...row].forEach((ch, x) => walkable(ch) && x > 0 && y > 0 && x < row.length - 1 && y < plan.length - 1 && area.push([x0 + x, y0 + y])));
  area.push([doorX, y1]);
  for (let ty = y1 + 1; ty <= y1 + DOORSTEP.rows; ty++) {
    for (let tx = doorX - DOORSTEP.reach; tx <= doorX + DOORSTEP.reach; tx++) area.push([tx, ty]);
  }
  KEEPERS.set(project.id, {
    id: project.id,
    look: project.keeper.look,
    home: keeper,
    area,
    content: { pages: project.keeper.pages, speaker: 'fixture' },
  });
  if (plan[plan.length - 2]![doorX - x0] !== '.') throw new Error(`${where}: the tile inside the door must be free`);
  for (const letter of Object.keys(exhibits)) {
    if (!plan.some((row) => row.includes(letter))) throw new Error(`${where}: exhibit '${letter}' is not in the plan`);
  }
  FLOORS.set(project.id, floor);
  return {
    id: project.id,
    x0,
    y0,
    x1,
    y1,
    doorX,
    fixtures,
    sign: project.name,
    style,
    windows,
    ...(roofProps ? { roofProps: roofProps.map(({ name, column }) => ({ name, tx: x0 + column })) } : {}),
  };
}

export const HOUSES: readonly Building[] = PROJECTS.map(house);

/** The floor of a house of the town. */
export function floorOf(building: Building): Ground {
  return FLOORS.get(building.id) ?? Ground.Floor;
}

const NOTICES: Fixture = {
  kind: 'noticeboard',
  tx: 0,
  ty: 0,
  content: {
    pages: ['AZYR · Developer & Creator.', 'Eight houses: vest101, Osler·MD, Kandrax Rol and Kandrax App,', 'Hidden Agenda, Azyrio, GitHub and Journal.'],
    link: { url: 'https://azyr.io', label: 'Visit azyr.io', title: 'Azyr' },
  },
};
/** The things of the town by their character in MAP: a template, without its place. */
const THINGS: Readonly<Record<string, Fixture>> = {
  F: { kind: 'fountain', tx: 0, ty: 0 },
  N: NOTICES,
  L: { kind: 'lamppost', tx: 0, ty: 0, light: LAMP },
  b: { kind: 'barrel', tx: 0, ty: 0 },
  x: { kind: 'crate', tx: 0, ty: 0 },
};

/** The fountain, the notice board, the lamps and the props of the plaza and the lane. */
export const OUTDOOR: readonly Fixture[] = [...tilesOf(MAP, 0, 0)].flatMap(([ch, tiles]) => {
  const thing = THINGS[ch];
  if (!thing) return [];
  return anchors(thing.kind, tiles, 'the town').map(([tx, ty]) => ({ ...thing, tx, ty }));
});

/**
 * The crier walks the plaza: the open street tiles south of the fountain and beside it
 * (x 13..25, y 11..12), from its place C in MAP.
 */
const CRIER_AREA = { x0: 13, y0: 11, x1: 25, y1: 12 } as const;

function crier(): NpcDef {
  const home = tilesOf(MAP, 0, 0).get('C')?.[0];
  if (!home) throw new Error('the town: no crier (C) in the map');
  const things = new Set(OUTDOOR.flatMap((f) => fixtureTiles(f).map(([x, y]) => `${x},${y}`)));
  const area: Tile[] = [];
  for (let ty = CRIER_AREA.y0; ty <= CRIER_AREA.y1; ty++) {
    for (let tx = CRIER_AREA.x0; tx <= CRIER_AREA.x1; tx++) {
      const ch = MAP[ty]?.[tx];
      if ((ch === '=' || ch === 'C') && !things.has(`${tx},${ty}`)) area.push([tx, ty]);
    }
  }
  return {
    id: 'crier',
    look: 'crier',
    home,
    area,
    content: {
      speaker: 'fixture',
      pages: ['Welcome to the town of Azyr!', 'Each house holds one of the projects. Walk in and look around.', 'The portals inside lead to the real thing.'],
    },
  };
}

/** The NPCs of the town: the keeper of each house, in the order of PROJECTS, and the crier. */
export const NPCS: readonly NpcDef[] = [...PROJECTS.map((p) => KEEPERS.get(p.id)!), crier()];

/** What a tile of the town is outside the houses (inside BOUNDS). */
export function plotAt(tx: number, ty: number): Plot {
  const ch = MAP[ty]?.[tx] ?? '.';
  if (ch === 'T') return Plot.Tree;
  return ch === '.' ? Plot.Garden : Plot.Street;
}

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
