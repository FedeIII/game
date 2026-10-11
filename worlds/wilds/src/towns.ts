import { Ground, fixtureTiles, fixtureType, type Building, type BuildingStyle, type Dialog, type Fixture, type FixtureKind, type Light, type Lore, type NpcDef } from '@game/engine';
import { CANDLE } from './houses.ts';

/**
 * The fixed towns of the Wilds (Ironhold: town.ts; Silverspring: silverspring.ts). A town is a plan
 * of characters, one for each tile, north at the top; its north-west tile is (x0, y0):
 *
 *   .  garden: grass with tufts and flowers      T  a tree in a garden
 *   =  cobblestones                               :  the dirt lane
 *   ~  water (a stream or a pool)                 h  a bridge of planks over the water
 *   1-9  the building of `buildings[n - 1]`
 *
 * Every other character is a thing of the streets (`things`: a fountain, a lamp, a crate). The
 * things stand on cobblestones, or on the lane. In front of each door the ground stays clear: no
 * lamp, prop or tree in the 5 x 3 tiles below it (a test checks it).
 */

export type Tile = readonly [number, number];

/** What a tile of a town is outside the buildings. */
export const Plot = { Garden: 0, Tree: 1, Street: 2, Lane: 3, Water: 4, Bridge: 5 } as const;
export type Plot = (typeof Plot)[keyof typeof Plot];

// Lights, in pixels from a fixture's anchor corner (y up is negative). The radius snaps to the
// nearest radius of the light atlas (48, 96, 150).
export const LAMP: Light = { radius: 96, colour: 0xffb060, x: 8, y: -41 };
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
export interface Thing {
  readonly kind: FixtureKind;
  readonly pages?: readonly string[];
  /** Pages behind a gate (Interaction.lore): for Intelligence. */
  readonly lore?: readonly Lore[];
  /** A conversation with the thing (the cauldron: its recipes). */
  readonly dialog?: Dialog;
  /** A bed that rests only a character with this refuge (Interaction.restFor: the room at the inn). */
  readonly restFor?: string;
}

/**
 * Someone who lives in a building, by its letter in the plan (its home tile): an NPC look
 * (art/characters.ts), what it says when a visitor talks to it (pages, or a conversation:
 * dialogs.ts), and lines that it says by itself. With `doorstep`, it also walks out of the door,
 * to the 5 x 2 tiles in front of it.
 */
export interface Person {
  readonly id: string;
  readonly look: string;
  readonly pages?: readonly string[];
  readonly dialog?: Dialog;
  readonly barks: readonly string[];
  readonly doorstep?: boolean;
  /** What it says once to a player with a good name who comes close (NpcDef.greeting). */
  readonly greeting?: string;
}

/**
 * A building of a town. The plan is the building tile by tile, from the north wall to the south
 * wall, walls included:
 *   #  wall          D  the door (south wall)     +  a lit window (south wall)     .  floor
 * Every other character is a thing of `things` or a person of `people`. A thing of more than one
 * tile (a table, a rug) has its letter on each of its tiles.
 */
export interface Plan {
  /** Unique in the world (a refuge names its building by it). */
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

/** A town: its name, where it is, its map, its buildings in the order of their digits, and the things of its streets by character. */
export interface TownPlan {
  readonly name: string;
  readonly x0: number;
  readonly y0: number;
  readonly map: readonly string[];
  readonly buildings: readonly Plan[];
  /** The things of the streets by their character in the map: a template, without its place. */
  readonly things: Readonly<Record<string, Fixture>>;
}

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

/** The characters of the map that are ground, not things: gardens, trees, streets, the lane, water and bridges. */
const GROUND_CHARACTERS = new Set(['.', 'T', '=', ':', '~', 'h']);

/** A town, built from its plan: its rectangle (tiles, inclusive), its buildings, the people of the buildings and the things of its streets. */
export class Town {
  readonly name: string;
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly buildings: readonly Building[];
  /** The people of the buildings, in the order of the buildings. */
  readonly residents: readonly NpcDef[];
  /** The things of the streets (lamps, a fountain, props). */
  readonly streetFixtures: readonly Fixture[];
  private readonly map: readonly string[];
  private readonly things: Readonly<Record<string, Fixture>>;
  private readonly floors = new Map<string, Ground>();

  constructor(plan: TownPlan) {
    this.name = plan.name;
    this.map = plan.map;
    this.things = plan.things;
    this.x0 = plan.x0;
    this.y0 = plan.y0;
    this.x1 = plan.x0 + plan.map[0]!.length - 1;
    this.y1 = plan.y0 + plan.map.length - 1;
    if (plan.map.some((row) => row.length !== plan.map[0]!.length)) throw new Error(`${plan.name}: the rows of the map are not all of one length`);
    const residents: NpcDef[] = [];
    this.buildings = plan.buildings.map((b, i) => this.build(b, i, residents));
    this.residents = residents;
    const tiles = tilesOf(plan.map, plan.x0, plan.y0);
    for (const ch of tiles.keys()) {
      if (!GROUND_CHARACTERS.has(ch) && !/[1-9]/.test(ch) && !plan.things[ch]) throw new Error(`${plan.name}: no thing for '${ch}' in the map`);
    }
    this.streetFixtures = [...tiles].flatMap(([ch, list]) => {
      const thing = plan.things[ch];
      if (!thing) return [];
      return anchors(thing.kind, list, plan.name).map(([tx, ty]) => ({ ...thing, tx, ty }));
    });
  }

  /** Whether a tile is in the town's rectangle. */
  has(tx: number, ty: number): boolean {
    return tx >= this.x0 && tx <= this.x1 && ty >= this.y0 && ty <= this.y1;
  }

  /** The floor of a building of the town. */
  floor(building: Building): Ground {
    return this.floors.get(building.id) ?? Ground.Floor;
  }

  /**
   * What a tile of the town is outside the buildings (inside the town). A thing of the streets
   * stands on the ground of the tile north of it: a lamp in the lane on the lane, a lamp in the
   * street on the cobblestones.
   */
  plotAt(tx: number, ty: number): Plot {
    const ch = this.map[ty - this.y0]?.[tx - this.x0] ?? '.';
    if (ch === 'T') return Plot.Tree;
    if (ch === '.') return Plot.Garden;
    if (ch === ':') return Plot.Lane;
    if (ch === '~') return Plot.Water;
    if (ch === 'h') return Plot.Bridge;
    if (ch in this.things && this.map[ty - this.y0 - 1]?.[tx - this.x0] === ':') return Plot.Lane;
    return Plot.Street;
  }

  /** A tile by its column and row in the map. */
  at(c: number, r: number): Tile {
    return [this.x0 + c, this.y0 + r];
  }

  /** The open tiles of the streets (cobblestones, the lane, bridges) in a rectangle of the map (columns and rows, inclusive). */
  streetArea(c0: number, r0: number, c1: number, r1: number): Tile[] {
    const things = new Set(this.streetFixtures.flatMap((f) => fixtureTiles(f).map(([x, y]) => `${x},${y}`)));
    const out: Tile[] = [];
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const [tx, ty] = this.at(c, r);
        const ch = this.map[r]?.[c];
        if ((ch === '=' || ch === ':' || ch === 'h') && !things.has(`${tx},${ty}`)) out.push([tx, ty]);
      }
    }
    return out;
  }

  /** Makes the building of a plan at the rectangle of its digit in the map. */
  private build(plan: Plan, index: number, residents: NpcDef[]): Building {
    const where = `the ${plan.id} of ${this.name}`;
    const digit = tilesOf(this.map, this.x0, this.y0).get(String(index + 1)) ?? [];
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
        // A thing with a conversation (the cauldron) says its lines over itself.
        const said = {
          ...(thing.pages ? { pages: thing.pages } : {}),
          ...(thing.lore ? { lore: thing.lore } : {}),
          ...(thing.dialog ? { dialog: thing.dialog, speaker: 'fixture' as const } : {}),
          ...(thing.restFor ? { rest: true, restFor: thing.restFor } : {}),
        };
        const content = thing.pages || thing.lore || thing.dialog ? { content: said } : {};
        fixtures.push({ kind: thing.kind, tx, ty, ...content, ...(light ? { light } : {}) });
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
      residents.push({
        id: person.id,
        look: person.look,
        home,
        area: person.doorstep ? [...floor, ...doorstep] : floor,
        content: { speaker: 'fixture', ...(person.pages ? { pages: person.pages } : {}), ...(person.dialog ? { dialog: person.dialog } : {}) },
        barks: person.barks,
        ...(person.greeting ? { greeting: person.greeting } : {}),
      });
    }
    this.floors.set(plan.id, plan.floor);
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
}
