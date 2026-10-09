import { Ground, fixtureTiles, fixtureType, type Building, type BuildingStyle, type Fixture, type FixtureKind, type Light, type NpcDef } from '@game/engine';
import { CANDLE } from './houses.ts';

/**
 * Thornwick: the town nearest the home, west of it in the wilds. A road leads there from the
 * home (road.ts), and a signpost by the home points the way.
 *
 * The plan of the town, one character per tile, north at the top; its north-west tile is
 * (TOWN.x0, TOWN.y0). The main street runs from east to west, and the road from the home comes
 * in at its east end. Four buildings face the street from the north, with a small square and a
 * fountain between them; five more stand back to back with the street and face the lane in the
 * south, by the lake. Alleys between them join the street and the lane. Five buildings open (the
 * inn, the smithy, the chapel, the apothecary and the reeve's house) and four are shut for good.
 * In front of each door the ground stays clear: no lamp, prop or tree in the 5 x 3 tiles below it
 * (a test checks it).
 *
 *   .  garden: grass with tufts and flowers      T  a tree in a garden
 *   =  cobblestones                               :  the dirt lane
 *   1-9  the building of BUILDINGS[n - 1]         F  the fountain (3 x 3)
 *   N  the notice board (2 x 1)    L  a lamp post    b  a barrel    x  a crate
 *
 * The things (F, N, L, b, x) stand on cobblestones, or on the lane.
 */
const MAP = [
  '.T.......T.......T...................T.....T.',
  '.............................................',
  '..1111111111...............3333333...........',
  '..1111111111...........T...3333333...........',
  '..1111111111.2222222.......3333333.444444..T.',
  '..1111111111.2222222=======3333333.444444....',
  '..1111111111.2222222NNFFF==3333333.444444....',
  '..1111111111.2222222==FFF==3333333.444444.T..',
  '..1111111111.2222222==FFF==3333333.444444....',
  '..1111111111.2222222=======3333333.444444....',
  'xL========L========bL=====L======L======xL===',
  '=============================================',
  '=============================================',
  'b====L=================L=========L=======L===',
  '==5555555==========777777777==8888888========',
  '==5555555==666666==777777777==8888888==99999=',
  '==5555555==666666==777777777==8888888==99999=',
  '==5555555==666666==777777777==8888888==99999=',
  '==5555555==666666==777777777==8888888==99999=',
  '==5555555==666666==777777777==8888888==99999=',
  ':::::::::::::::::::::::::::::::::::::::::::::',
  'b::::::::L::::::::L:::::::::L::::::::L::::::x',
  'T........T..................T...............T',
];

export const TOWN_NAME = 'Thornwick';

/** The rectangle of the town, in tiles (inclusive). */
export const TOWN = { x0: -52, y0: -8, x1: -52 + MAP[0]!.length - 1, y1: -8 + MAP.length - 1 } as const;

/** Where the road comes in: the tile just east of the town, in the middle of the main street. */
export const TOWN_GATE = { tx: TOWN.x1 + 1, ty: TOWN.y0 + 11 } as const;

/** What a tile of the town is outside the buildings. */
export const Plot = { Garden: 0, Tree: 1, Street: 2, Lane: 3 } as const;
export type Plot = (typeof Plot)[keyof typeof Plot];

type Tile = readonly [number, number];

// Lights, in pixels from a fixture's anchor corner (y up is negative). The radius snaps to the
// nearest radius of the light atlas (48, 96, 150).
const LAMP: Light = { radius: 96, colour: 0xffb060, x: 8, y: -41 };
/** The light that a kind of thing gives off, unless the thing has a light of its own. */
const LIGHTS: Partial<Record<FixtureKind, Light>> = {
  table: CANDLE,
  desk: { radius: 48, colour: 0xffa850, x: 28, y: -26 },
  candelabra: { radius: 48, colour: 0xffb060, x: 8, y: -29 },
  cauldron: { radius: 48, colour: 0x70d060, x: 8, y: -15 },
  forge: { radius: 96, colour: 0xff7030, x: 16, y: -20 },
  crystalball: { radius: 48, colour: 0x6a8cff, x: 8, y: -19 },
  lamppost: LAMP,
};

/** A thing in a building plan, by its letter: its kind, and what it says (else the world's line for the kind). */
interface Thing {
  readonly kind: FixtureKind;
  readonly pages?: readonly string[];
}

/**
 * Someone who lives in a building, by its letter in the plan (its home tile): an NPC look
 * (art/characters.ts), what it says when a visitor talks to it, and lines that it says by itself.
 * With `doorstep`, it also walks out of the door, to the 5 x 2 tiles in front of it.
 */
interface Person {
  readonly id: string;
  readonly look: string;
  readonly pages: readonly string[];
  readonly barks: readonly string[];
  readonly doorstep?: boolean;
}

/**
 * A building of the town. The plan is the building tile by tile, from the north wall to the
 * south wall, walls included:
 *   #  wall          D  the door (south wall)     +  a lit window (south wall)     .  floor
 * Every other character is a thing of `things` or a person of `people`. A thing of more than one
 * tile (a table, a rug) has its letter on each of its tiles.
 */
interface Plan {
  readonly id: string;
  /** The name on the sign over the door. */
  readonly sign?: string;
  readonly style: BuildingStyle;
  readonly floor: Ground;
  readonly plan: readonly string[];
  readonly things?: Readonly<Record<string, Thing>>;
  readonly people?: Readonly<Record<string, Person>>;
  /** Things on the ridge of the roof, each in a column of the plan (0 is the west wall). */
  readonly roofProps?: readonly { readonly name: string; readonly column: number }[];
  /** A building that is shut for good: what the player says at its door (Building.locked). */
  readonly locked?: string;
}

/** The buildings, in the order of their digits in MAP. */
const BUILDINGS: readonly Plan[] = [
  {
    id: 'inn',
    sign: 'The Crooked Lantern',
    style: { walls: 'timber', roof: 'shingle' },
    floor: Ground.Floor,
    roofProps: [
      { name: 'chimney', column: 2 },
      { name: 'vane', column: 7 },
    ],
    plan: [
      '##########',
      '#bbx.aaca#',
      '#........#',
      '#.tt..tt.#',
      '#........#',
      '#K..M..gg#',
      '#........#',
      '#+##D##+##',
    ],
    things: {
      b: { kind: 'barrel', pages: ['Ale. It smells better than it tastes.'] },
      x: { kind: 'crate', pages: ['Turnips, and one very old onion.'] },
      a: { kind: 'apothecary', pages: ['Bottles of cider, of ale, and of something green.'] },
      c: { kind: 'candelabra' },
      t: { kind: 'table', pages: ['A sticky table. Someone has cut a crow into it.'] },
      g: { kind: 'boardtable', pages: ['A game of dice, left half played.'] },
    },
    people: {
      K: {
        id: 'innkeeper',
        look: 'innkeeper',
        doorstep: true,
        pages: [
          'Welcome to the Crooked Lantern, traveller.',
          'The beds are taken, but the fire is free and the ale is cheap.',
          'Go back into the woods before the candles burn down. Not after.',
        ],
        barks: ['Another round?', 'Wipe your boots. The woods come in on them.', 'The fire is free. The ale is not.'],
      },
      M: {
        id: 'minstrel',
        look: 'bard',
        pages: [
          'A song for a traveller? I only know sad ones.',
          'This one is about a miller who walked into the woods and came back wrong.',
          '...Perhaps another night.',
        ],
        barks: ['La la... no. Again.', "Who has a rhyme for 'imp'?", 'One more song, then bed.'],
      },
    },
  },
  {
    id: 'smithy',
    sign: 'Smithy',
    style: { walls: 'stone', roof: 'slate' },
    floor: Ground.FloorStone,
    roofProps: [{ name: 'chimney', column: 1 }],
    plan: [
      '#######',
      '#ff.ab#',
      '#.....#',
      '#..K.x#',
      '#.....#',
      '#+#D#+#',
    ],
    things: {
      f: { kind: 'forge', pages: ['The forge is hot. The coals breathe.'] },
      a: { kind: 'anvil', pages: ['Dents on dents. The smith hits hard.'] },
      b: { kind: 'barrel', pages: ['Water for the hot iron.'] },
      x: { kind: 'crate', pages: ['Nails, horseshoes and broken blades.'] },
    },
    people: {
      K: {
        id: 'smith',
        look: 'smith',
        doorstep: true,
        pages: [
          'Mind the forge. It bites.',
          'I mend blades and I make nails. Lately more blades than nails.',
          'Every blade in Thornwick has been through my hands twice.',
        ],
        barks: ['Hot iron waits for nobody.', 'More blades. Always more blades.', 'Where are my tongs?'],
      },
    },
  },
  {
    id: 'chapel',
    sign: 'Chapel',
    style: { walls: 'gothic', roof: 'slate' },
    floor: Ground.FloorStone,
    roofProps: [{ name: 'spire', column: 3 }],
    plan: [
      '#######',
      '#c.l.c#',
      '#.....#',
      '#.rr..#',
      '#.rr..#',
      '#...K.#',
      '#.....#',
      '#+#D#+#',
    ],
    things: {
      c: { kind: 'candelabra', pages: ['The candles never go out. Someone sees to that.'] },
      l: { kind: 'lectern', pages: ['An old book of prayers, open at the prayer for travellers.'] },
      r: { kind: 'rug' },
    },
    people: {
      K: {
        id: 'priest',
        look: 'priest',
        doorstep: true,
        pages: ['Peace to you, traveller.', 'The candles of this chapel have burned for a hundred years.', 'When the night is long, come in and sit for a while.'],
        barks: ['Peace on this house.', 'The light holds.', 'Pray, and keep to the road.'],
      },
    },
  },
  {
    id: 'chandler',
    sign: 'Chandler',
    style: { walls: 'planks', roof: 'shingle' },
    floor: Ground.Floor,
    plan: [
      '######',
      '#xx..#',
      '#....#',
      '#....#',
      '#....#',
      '##D###',
    ],
    things: { x: { kind: 'crate' } },
    locked: 'Boarded up. A note on the door says: CLOSED. GONE SOUTH.',
  },
  {
    id: 'apothecary',
    sign: 'Apothecary',
    style: { walls: 'planks', roof: 'thatch' },
    floor: Ground.FloorEarth,
    roofProps: [{ name: 'chimney', column: 5 }],
    plan: [
      '#######',
      '#aa.uw#',
      '#.....#',
      '#.K.s.#',
      '#.....#',
      '#+#D#+#',
    ],
    things: {
      a: { kind: 'apothecary', pages: ['Jars of roots, of powders, and of dried things with legs.'] },
      u: { kind: 'cauldron', pages: ['Something green bubbles. It smells of mint, and of rot.'] },
      w: { kind: 'crystalball', pages: ['Cloudy glass. You see only your own face.'] },
      s: { kind: 'scales', pages: ['Small brass scales, for very small doses.'] },
    },
    people: {
      K: {
        id: 'apothecary',
        look: 'healer',
        doorstep: true,
        pages: [
          'Careful with that shelf. Half of it heals and half of it kills.',
          'Nightcap for sleep, ashroot for wounds. The rest I will not name.',
          'If an imp scratches you, wash it with salt. Then wash it again.',
        ],
        barks: ['Salt, salt and more salt.', 'Who took my ashroot?', 'Do not touch the green jar.'],
      },
    },
  },
  {
    id: 'cottage',
    style: { walls: 'rubble', roof: 'thatch' },
    floor: Ground.FloorEarth,
    plan: [
      '######',
      '#....#',
      '#....#',
      '#....#',
      '###D##',
    ],
    locked: 'Locked. Nobody answers.',
  },
  {
    id: 'reeve',
    sign: 'Reeve',
    style: { walls: 'brick', roof: 'clay' },
    floor: Ground.Floor,
    roofProps: [{ name: 'flag-wine', column: 4 }],
    plan: [
      '#########',
      '#bb.mm.k#',
      '#.......#',
      '#.dd..K.#',
      '#.......#',
      '#+#+D+#+#',
    ],
    things: {
      b: { kind: 'bookshelf', pages: ['Ledgers of taxes, of births and of deaths. More deaths, lately.'] },
      m: { kind: 'maptable', pages: ['A map of the valley. The woods round the town are inked black.'] },
      k: { kind: 'coinchest', pages: ["The town's strongbox. Locked, and nearly empty."] },
      d: { kind: 'desk', pages: ['Letters to the families who left. None of them is sent.'] },
    },
    people: {
      K: {
        id: 'reeve',
        look: 'treasurer',
        pages: [
          'I am the reeve of Thornwick. Of what is left of it.',
          'Four houses shut this year. The families went south and did not write.',
          'We still have the forge, the chapel and the inn. While we have those, we have a town.',
        ],
        barks: ['Taxes, taxes...', 'Another letter with no answer.', 'The gate, the lamps. Always the lamps.'],
      },
    },
  },
  {
    id: 'granary',
    sign: 'Granary',
    style: { walls: 'timber', roof: 'thatch' },
    floor: Ground.FloorEarth,
    plan: [
      '#######',
      '#.....#',
      '#.....#',
      '#.....#',
      '#.....#',
      '###D###',
    ],
    locked: 'The doors are barred from the inside.',
  },
  {
    id: 'house',
    style: { walls: 'stone', roof: 'slate' },
    floor: Ground.Floor,
    roofProps: [{ name: 'chimney', column: 1 }],
    plan: [
      '#####',
      '#...#',
      '#...#',
      '#...#',
      '##D##',
    ],
    locked: 'Locked. Through a crack you see an empty room, and thick dust.',
  },
];

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

/** The floor of each building, by id. */
const FLOORS = new Map<string, Ground>();
/** The people of the buildings. */
const RESIDENTS: NpcDef[] = [];

/** Makes the building of a plan at the rectangle of its digit in MAP. */
function build(plan: Plan, index: number): Building {
  const where = `the ${plan.id} of ${TOWN_NAME}`;
  const digit = tilesOf(MAP, TOWN.x0, TOWN.y0).get(String(index + 1)) ?? [];
  const x0 = Math.min(...digit.map(([x]) => x));
  const y0 = Math.min(...digit.map(([, y]) => y));
  const x1 = Math.max(...digit.map(([x]) => x));
  const y1 = Math.max(...digit.map(([, y]) => y));
  if (digit.length === 0 || digit.length !== (x1 - x0 + 1) * (y1 - y0 + 1)) throw new Error(`${where}: its tiles in the map are not a rectangle`);
  if (plan.plan.length !== y1 - y0 + 1 || plan.plan.some((row) => row.length !== x1 - x0 + 1)) {
    throw new Error(`${where}: the plan is not ${x1 - x0 + 1} x ${y1 - y0 + 1}, as in the map`);
  }
  const fixtures: Fixture[] = [];
  const windows: number[] = [];
  const homes = new Map<string, Tile>();
  let doorX: number | null = null;
  for (const [ch, tiles] of tilesOf(plan.plan, x0, y0)) {
    const onWall = tiles.filter(([x, y]) => x === x0 || x === x1 || y === y0 || y === y1);
    const isCorner = ([x, y]: Tile) => (x === x0 || x === x1) && (y === y0 || y === y1);
    if (ch === '#' || ch === 'D' || ch === '+') {
      if (ch !== '#' && tiles.some((t) => t[1] !== y1 || isCorner(t))) throw new Error(`${where}: '${ch}' is only for the south wall, not a corner`);
      if (onWall.length !== tiles.length) throw new Error(`${where}: '${ch}' inside the building`);
      if (ch === 'D') {
        if (tiles.length !== 1) throw new Error(`${where}: a building has one door`);
        doorX = tiles[0]![0];
      }
      if (ch === '+') windows.push(...tiles.map(([x]) => x));
      continue;
    }
    if (onWall.length) throw new Error(`${where}: '${ch}' on the walls`);
    if (ch === '.') continue;
    if (plan.people?.[ch]) {
      if (tiles.length !== 1) throw new Error(`${where}: '${ch}' is one person, on one tile`);
      homes.set(ch, tiles[0]!);
      continue;
    }
    const thing = plan.things?.[ch];
    if (!thing) throw new Error(`${where}: no thing for '${ch}'`);
    const light = LIGHTS[thing.kind];
    for (const [tx, ty] of anchors(thing.kind, tiles, where)) {
      fixtures.push({ kind: thing.kind, tx, ty, ...(thing.pages ? { content: { pages: thing.pages } } : {}), ...(light ? { light } : {}) });
    }
  }
  if (doorX === null) throw new Error(`${where}: a building needs a door`);
  if (plan.plan[plan.plan.length - 2]![doorX - x0] !== '.') throw new Error(`${where}: the tile inside the door must be free`);
  if (plan.locked && plan.people) throw new Error(`${where}: nobody lives in a building that is shut`);

  // The people walk the open floor ('.', their own tiles, and things that do not collide, such
  // as rugs); with a doorstep, also the door and the 5 x 2 tiles in front of it.
  const things = plan.things ?? {};
  const walkable = (ch: string) => ch === '.' || plan.people?.[ch] !== undefined || (things[ch] !== undefined && fixtureType(things[ch]!.kind).tiles.every((t) => t.box === null));
  const floor: Tile[] = [];
  plan.plan.forEach((row, y) => [...row].forEach((ch, x) => walkable(ch) && x > 0 && y > 0 && x < row.length - 1 && y < plan.plan.length - 1 && floor.push([x0 + x, y0 + y])));
  const doorstep: Tile[] = [[doorX, y1]];
  for (let ty = y1 + 1; ty <= y1 + 2; ty++) for (let tx = doorX - 2; tx <= doorX + 2; tx++) doorstep.push([tx, ty]);
  for (const [ch, person] of Object.entries(plan.people ?? {})) {
    const home = homes.get(ch);
    if (!home) throw new Error(`${where}: ${person.id} ('${ch}') is not in the plan`);
    RESIDENTS.push({
      id: person.id,
      look: person.look,
      home,
      area: person.doorstep ? [...floor, ...doorstep] : floor,
      content: { pages: person.pages, speaker: 'fixture' },
      barks: person.barks,
    });
  }
  FLOORS.set(plan.id, plan.floor);
  return {
    id: plan.id,
    x0,
    y0,
    x1,
    y1,
    doorX,
    fixtures,
    style: plan.style,
    windows,
    ...(plan.sign ? { sign: plan.sign } : {}),
    ...(plan.roofProps ? { roofProps: plan.roofProps.map(({ name, column }) => ({ name, tx: x0 + column })) } : {}),
    ...(plan.locked ? { locked: plan.locked } : {}),
  };
}

export const TOWN_BUILDINGS: readonly Building[] = BUILDINGS.map(build);

/** The floor of a building of the town. */
export function townFloor(building: Building): Ground {
  return FLOORS.get(building.id) ?? Ground.Floor;
}

/** The things of the streets by their character in MAP: a template, without its place. */
const STREET_THINGS: Readonly<Record<string, Fixture>> = {
  F: { kind: 'fountain', tx: 0, ty: 0 },
  N: {
    kind: 'noticeboard',
    tx: 0,
    ty: 0,
    content: {
      pages: ['NOTICE. The gate shuts at dusk. Keep to the lamps. By order of the Reeve.', 'Under it, in another hand: LOST, one grey goat. Answers to nothing.'],
    },
  },
  L: { kind: 'lamppost', tx: 0, ty: 0, light: LAMP },
  b: { kind: 'barrel', tx: 0, ty: 0 },
  x: { kind: 'crate', tx: 0, ty: 0 },
};

/** The fountain, the notice board, the lamps and the props of the streets. */
export const TOWN_STREET_FIXTURES: readonly Fixture[] = [...tilesOf(MAP, TOWN.x0, TOWN.y0)].flatMap(([ch, tiles]) => {
  const thing = STREET_THINGS[ch];
  if (!thing) return [];
  return anchors(thing.kind, tiles, TOWN_NAME).map(([tx, ty]) => ({ ...thing, tx, ty }));
});

/**
 * What a tile of the town is outside the buildings (inside TOWN). A thing of the streets stands
 * on the ground of the tile north of it: a lamp in the lane on the lane, a lamp in the street on
 * the cobblestones.
 */
export function plotAt(tx: number, ty: number): Plot {
  const ch = MAP[ty - TOWN.y0]?.[tx - TOWN.x0] ?? '.';
  if (ch === 'T') return Plot.Tree;
  if (ch === '.') return Plot.Garden;
  if (ch === ':') return Plot.Lane;
  if (ch in STREET_THINGS && MAP[ty - TOWN.y0 - 1]?.[tx - TOWN.x0] === ':') return Plot.Lane;
  return Plot.Street;
}

/** Whether a tile is in the town's rectangle. */
export function inTown(tx: number, ty: number): boolean {
  return tx >= TOWN.x0 && tx <= TOWN.x1 && ty >= TOWN.y0 && ty <= TOWN.y1;
}

// ---------------------------------------------------------------- people in the streets

/** The open tiles of the streets in a rectangle of MAP (columns and rows of the map, inclusive). */
function streetArea(c0: number, r0: number, c1: number, r1: number): Tile[] {
  const things = new Set(TOWN_STREET_FIXTURES.flatMap((f) => fixtureTiles(f).map(([x, y]) => `${x},${y}`)));
  const out: Tile[] = [];
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const tx = TOWN.x0 + c;
      const ty = TOWN.y0 + r;
      const ch = MAP[r]?.[c];
      if ((ch === '=' || ch === ':') && !things.has(`${tx},${ty}`)) out.push([tx, ty]);
    }
  }
  return out;
}

const at = (c: number, r: number): Tile => [TOWN.x0 + c, TOWN.y0 + r];

const WALKERS: readonly NpcDef[] = [
  {
    id: 'watchman',
    look: 'watchman',
    home: at(42, 11),
    area: streetArea(38, 11, 44, 13),
    content: {
      speaker: 'fixture',
      pages: [
        'Halt! Who walks the road at night?',
        'Ah, from the hut in the woods. Welcome to Thornwick.',
        'Keep inside the lamplight. The things in the trees do not come past the gate.',
      ],
    },
    barks: ['Nothing comes past this gate.', 'Keep to the lamps.', 'A quiet night. Too quiet.'],
  },
  {
    id: 'peddler',
    look: 'dungeonmaster',
    home: at(15, 12),
    area: streetArea(2, 11, 37, 12),
    content: {
      speaker: 'fixture',
      pages: [
        'Pots! Pins! Candles! Well... I had candles.',
        'The chandler shut his shop when the roads went bad. Now I sell what I can find.',
        'Come back when you have coin. Everybody says that.',
      ],
    },
    barks: ['Pots and pins!', 'Fine pins, nearly new!', 'Who needs a pot? Anybody?'],
  },
  {
    id: 'widow',
    look: 'archivist',
    home: at(25, 8),
    area: streetArea(20, 5, 26, 9),
    content: {
      speaker: 'fixture',
      pages: ['The fountain was dry for three summers.', 'Then one night it filled again. Nobody knows why.', 'I come here to listen to it. It sounds like rain.'],
    },
    barks: ['Listen... like rain.', 'Three summers dry.', 'My husband built that wall.'],
  },
  {
    id: 'child',
    look: 'child',
    home: at(12, 20),
    area: [...streetArea(0, 20, 44, 21), ...streetArea(17, 14, 18, 19)],
    content: {
      speaker: 'fixture',
      pages: ['Are you an adventurer? Have you seen the imps?', 'Mother says they cannot come past the lamps.', 'I am not scared. Much.'],
    },
    barks: ['Catch me if you can!', 'I saw an imp! I think.', 'Not scared, not scared!'],
  },
];

/** The NPCs of the town: the people of the buildings, then the people of the streets. */
export const TOWN_NPCS: readonly NpcDef[] = [...RESIDENTS, ...WALKERS];
