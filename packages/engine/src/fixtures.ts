import type { Box } from './world.ts';

/**
 * Fixtures: furniture, props and NPCs that stand on the tile grid. A fixture type says which
 * tiles it covers and how each one collides; a fixture is one placed instance, with its own
 * content (what acting on it shows). Worlds place fixtures; the engine draws them, collides with
 * them and finds them for the action button.
 */

export interface FixtureTile {
  /** Offset from the anchor tile (the south-west tile of the footprint). */
  readonly dx: number;
  readonly dy: number;
  /** The solid part of the tile, in tile-local pixels; null for a tile that does not collide. */
  readonly box: Box | null;
}

export interface FixtureType {
  /** A number for the type. Types keep their order in FIXTURE_TYPES (see FIXTURE_CODE_BASE). */
  readonly id: number;
  readonly kind: string;
  readonly tiles: readonly FixtureTile[];
  /** The depth line: pixels below the top of the anchor tile. It sorts the fixture against the player. */
  readonly depth: number;
}

const ONE_TILE = (box: Box): FixtureTile[] => [{ dx: 0, dy: 0, box }];
const TWO_WIDE = (y0: number, y1: number): FixtureTile[] => [
  { dx: 0, dy: 0, box: [1, y0, 16, y1] },
  { dx: 1, dy: 0, box: [0, y0, 15, y1] },
];

/**
 * Every fixture type. The boxes match the footprints of the art (art/fixtures.ts). Things that
 * stand against a north wall (bookshelf, apothecary, portal) fill the north part of the tile.
 */
export const FIXTURE_TYPES = [
  { id: 0, kind: 'bookshelf', tiles: ONE_TILE([1, 0, 15, 6]), depth: 3 },
  { id: 1, kind: 'table', tiles: TWO_WIDE(3, 13), depth: 8 },
  {
    id: 2,
    kind: 'bed',
    tiles: [
      { dx: 0, dy: -1, box: [1, 1, 15, 16] },
      { dx: 0, dy: 0, box: [1, 0, 15, 15] },
    ],
    depth: 0,
  },
  { id: 3, kind: 'chest', tiles: ONE_TILE([2, 4, 14, 13]), depth: 8.5 },
  { id: 4, kind: 'barrel', tiles: ONE_TILE([3, 3, 13, 13]), depth: 8 },
  { id: 5, kind: 'lectern', tiles: ONE_TILE([4, 5, 12, 13]), depth: 9 },
  { id: 6, kind: 'desk', tiles: TWO_WIDE(3, 13), depth: 8 },
  { id: 7, kind: 'anvil', tiles: ONE_TILE([2, 6, 14, 13]), depth: 9 },
  { id: 8, kind: 'maptable', tiles: TWO_WIDE(3, 13), depth: 8 },
  { id: 9, kind: 'boardtable', tiles: TWO_WIDE(3, 13), depth: 8 },
  { id: 10, kind: 'mirror', tiles: ONE_TILE([3, 8, 13, 13]), depth: 10 },
  { id: 11, kind: 'apothecary', tiles: ONE_TILE([1, 0, 15, 6]), depth: 3 },
  { id: 12, kind: 'coinchest', tiles: ONE_TILE([2, 4, 14, 13]), depth: 8.5 },
  { id: 13, kind: 'noticeboard', tiles: TWO_WIDE(9, 12), depth: 10 },
  { id: 14, kind: 'lamppost', tiles: ONE_TILE([6, 10, 10, 14]), depth: 12 },
  {
    id: 15,
    kind: 'fountain',
    tiles: [
      { dx: 0, dy: -2, box: [5, 5, 16, 16] },
      { dx: 1, dy: -2, box: [0, 2, 16, 16] },
      { dx: 2, dy: -2, box: [0, 5, 11, 16] },
      { dx: 0, dy: -1, box: [2, 0, 16, 16] },
      { dx: 1, dy: -1, box: [0, 0, 16, 16] },
      { dx: 2, dy: -1, box: [0, 0, 14, 16] },
      { dx: 0, dy: 0, box: [5, 0, 16, 11] },
      { dx: 1, dy: 0, box: [0, 0, 16, 14] },
      { dx: 2, dy: 0, box: [0, 0, 11, 11] },
    ],
    depth: -8,
  },
  { id: 16, kind: 'portal', tiles: TWO_WIDE(0, 5), depth: 3 },
  { id: 17, kind: 'npc', tiles: ONE_TILE([4, 9, 12, 15]), depth: 12 },
  // A rug lies on the floor: it does not collide, and it sorts under everything near it.
  {
    id: 18,
    kind: 'rug',
    tiles: [
      { dx: 0, dy: -1, box: null },
      { dx: 1, dy: -1, box: null },
      { dx: 0, dy: 0, box: null },
      { dx: 1, dy: 0, box: null },
    ],
    depth: -40,
  },
  { id: 19, kind: 'crate', tiles: ONE_TILE([2, 4, 14, 14]), depth: 9 },
  { id: 20, kind: 'cauldron', tiles: ONE_TILE([2, 3, 14, 14]), depth: 9 },
  { id: 21, kind: 'telescope', tiles: ONE_TILE([3, 4, 13, 14]), depth: 10 },
  { id: 22, kind: 'candelabra', tiles: ONE_TILE([5, 7, 11, 13]), depth: 10 },
  { id: 23, kind: 'forge', tiles: TWO_WIDE(0, 9), depth: 5 },
  { id: 24, kind: 'crystalball', tiles: ONE_TILE([3, 5, 13, 13]), depth: 9 },
  { id: 25, kind: 'scales', tiles: ONE_TILE([2, 5, 14, 13]), depth: 9 },
] as const satisfies readonly FixtureType[];

export type FixtureKind = (typeof FIXTURE_TYPES)[number]['kind'];

const BY_KIND = new Map<string, FixtureType>(FIXTURE_TYPES.map((t) => [t.kind, t]));

export function fixtureType(kind: FixtureKind): FixtureType {
  return BY_KIND.get(kind)!;
}

/**
 * Structure codes from this value up are fixture tiles. Each type has a range of codes, one per
 * tile of its footprint, right after the range of the type before it in FIXTURE_TYPES. So add a
 * new type at the end of the list, and do not change the number of tiles of a type: both would
 * move the codes of the types after it. The codes must stay below 256 (a Uint8Array).
 */
export const FIXTURE_CODE_BASE = 16;

const FIRST_CODE = new Map<FixtureType, number>();
const BY_CODE: { type: FixtureType; tile: FixtureTile }[] = [];
{
  let code = FIXTURE_CODE_BASE;
  for (const type of FIXTURE_TYPES as readonly FixtureType[]) {
    FIRST_CODE.set(type, code);
    for (const tile of type.tiles) BY_CODE[code++] = { type, tile };
  }
  if (code > 256) throw new Error('fixture codes do not fit in a byte');
}

export function fixtureCode(type: FixtureType, tileIndex: number): number {
  return FIRST_CODE.get(type)! + tileIndex;
}

/** The fixture type and the tile of its footprint that a structure code stands for, or null. */
export function decodeFixture(code: number): { type: FixtureType; tile: FixtureTile } | null {
  return BY_CODE[code] ?? null;
}

/** A link that the GUI offers: a real HTML link, so it works with touch and with a screen reader. */
export interface Link {
  readonly url: string;
  /** The text of the link, for example "Open Osler·MD". */
  readonly label: string;
  /** The heading over it, for example "Osler·MD". */
  readonly title: string;
}

/** What acting on a fixture shows. */
export interface Interaction {
  /** Pages of text, one at a time: the action button shows the next page. */
  readonly pages?: readonly string[];
  /** Who says the pages: the player (who examines a thing) or the fixture (an NPC). */
  readonly speaker?: 'player' | 'fixture';
  readonly link?: Link;
}

/** A light that a fixture gives off. */
export interface Light {
  /** World pixels to full darkness. */
  readonly radius: number;
  /** The colour of the warm glow, as 0xRRGGBB. */
  readonly colour: number;
  /** The centre, in pixels from the anchor tile's south-west corner (y up is negative). */
  readonly x: number;
  readonly y: number;
}

/** One placed fixture. */
export interface Fixture {
  readonly kind: FixtureKind;
  /** The anchor tile: the south-west tile of the footprint. */
  readonly tx: number;
  readonly ty: number;
  /** An art variant: the look of an NPC, for example. */
  readonly look?: string;
  /** What acting on it shows. Without content, the world's default line for the kind is used. */
  readonly content?: Interaction;
  readonly light?: Light;
}

/** The tiles that a fixture covers, with the structure code of each. */
export function fixtureTiles(fixture: Fixture): [number, number, number][] {
  const type = fixtureType(fixture.kind);
  return type.tiles.map((tile, i) => [fixture.tx + tile.dx, fixture.ty + tile.dy, fixtureCode(type, i)]);
}
