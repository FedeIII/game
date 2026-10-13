import { describe, expect, it } from 'vitest';
import { TILE_SIZE, fixtureTiles, landAt } from '@game/engine';
import {
  BRONZEHOLD,
  CAMP,
  DEFAULT_SEED,
  ENCLAVE_REACH,
  FOREST_EDGE_Y,
  HALE,
  IRONHOLD,
  LANDS,
  SEEKER_CAMP,
  SHRINE_RECT,
  SILVERSPRING,
  SILVERSPRING_NAME_SIGN,
  TEXTS_ES,
  WHITEGROVE,
  WREN,
  WildsSource,
  northRoad,
} from '../src/index.ts';

const source = new WildsSource(DEFAULT_SEED);
const lands = source.lands();
const landOf = (tx: number, ty: number) => landAt(lands, tx, ty)?.id;
/** The land of each corner of a rectangle of tiles. */
const cornerLands = (r: { x0: number; y0: number; x1: number; y1: number }) => [
  landOf(r.x0, r.y0),
  landOf(r.x1, r.y0),
  landOf(r.x0, r.y1),
  landOf(r.x1, r.y1),
];

describe('the lands of the Wilds', () => {
  it('are the Mithril Enclave, the Iron Sovereignty and the wildlands, each with a Spanish name', () => {
    expect(lands).toBe(LANDS);
    expect(lands.map((l) => l.title)).toEqual(['Mithril Enclave', 'Iron Sovereignty', 'The Wildlands']);
    for (const land of lands) expect(TEXTS_ES[land.title], land.title).toBeTruthy();
  });

  it('put the hut, the hamlets and Ironhold in the Iron Sovereignty, to the north edge of Ironhold', () => {
    const home = source.spawn();
    expect(landOf(Math.floor(home.x / TILE_SIZE), Math.floor(home.y / TILE_SIZE))).toBe('iron-sovereignty');
    for (const town of [WHITEGROVE, BRONZEHOLD, IRONHOLD]) expect(cornerLands(town), town.name).toEqual(Array(4).fill('iron-sovereignty'));
    expect(FOREST_EDGE_Y).toBe(IRONHOLD.y0);
    expect(landOf(-30, FOREST_EDGE_Y)).toBe('iron-sovereignty');
    expect(landOf(-30, FOREST_EDGE_Y - 1)).toBe('wildlands');
  });

  it('put the Mithril Enclave round Silverspring only, and the wildlands north and south of it', () => {
    expect(cornerLands(SILVERSPRING)).toEqual(Array(4).fill('mithril-enclave'));
    for (const [tx, ty] of fixtureTiles(SILVERSPRING_NAME_SIGN)) expect(landOf(tx, ty)).toBe('mithril-enclave');
    const middle = Math.floor((SILVERSPRING.x0 + SILVERSPRING.x1) / 2);
    expect(landOf(middle, SILVERSPRING.y0 - ENCLAVE_REACH)).toBe('mithril-enclave');
    expect(landOf(middle, SILVERSPRING.y0 - ENCLAVE_REACH - 1)).toBe('wildlands');
    expect(landOf(middle, SILVERSPRING.y1 + ENCLAVE_REACH + 1)).toBe('wildlands');
    expect(landOf(SILVERSPRING.x0 - ENCLAVE_REACH - 1, SILVERSPRING.y0)).toBe('wildlands');
  });

  it('leave the homesteads, the camps and the shrine in the wildlands', () => {
    for (const [name, place] of Object.entries({ HALE, CAMP, SEEKER_CAMP, SHRINE_RECT, WREN }))
      expect(cornerLands(place), name).toEqual(Array(4).fill('wildlands'));
  });

  it('give the north road one crossing out of the Sovereignty and one into the Enclave', () => {
    const road = northRoad();
    const seen: string[] = [];
    // The north road from Ironhold to Silverspring, row by row.
    for (let ty = FOREST_EDGE_Y + 2; ty >= SILVERSPRING.y0; ty--) {
      for (let tx = -20; tx <= SILVERSPRING.x0; tx++) {
        if (!road.on(tx, ty)) continue;
        const land = landOf(tx, ty)!;
        if (seen.at(-1) !== land) seen.push(land);
        break;
      }
    }
    expect(seen).toEqual(['iron-sovereignty', 'wildlands', 'mithril-enclave']);
  });
});
