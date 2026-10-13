import { describe, expect, it } from 'vitest';
import type { Land, PlaceTitle } from '@game/engine';
import { LAND_DEPTH, LandCrossings, PlaceArrivals, TITLE_AWAY } from './place-titles.ts';

const TOWN: PlaceTitle = { id: 'town', title: 'Town', x0: 0, y0: 0, x1: 9, y1: 9 };
const VILLAGE: PlaceTitle = { id: 'village', title: 'Village', x0: 100, y0: 0, x1: 109, y1: 9 };

describe('the titles of places', () => {
  it('show when the player comes into a place, once for each visit', () => {
    const arrivals = new PlaceArrivals([TOWN, VILLAGE]);
    expect(arrivals.update(-5, 5)).toBeNull();
    expect(arrivals.update(-1, 5)).toBeNull();
    expect(arrivals.update(0, 5)).toBe(TOWN);
    expect(arrivals.current).toBe(TOWN);
    for (let tx = 1; tx <= 9; tx++) expect(arrivals.update(tx, 5)).toBeNull();
  });

  it('do not show again after a short walk out of the place and back', () => {
    const arrivals = new PlaceArrivals([TOWN]);
    arrivals.update(-20, 5);
    expect(arrivals.update(0, 5)).toBe(TOWN);
    expect(arrivals.update(-TITLE_AWAY, 5)).toBeNull();
    expect(arrivals.current).toBe(TOWN);
    expect(arrivals.update(0, 5)).toBeNull();
  });

  it('show again on a new visit, after the player went far enough away', () => {
    const arrivals = new PlaceArrivals([TOWN]);
    arrivals.update(-20, 5);
    expect(arrivals.update(0, 5)).toBe(TOWN);
    expect(arrivals.update(-TITLE_AWAY - 1, 5)).toBeNull();
    expect(arrivals.current).toBeNull();
    expect(arrivals.update(0, 5)).toBe(TOWN);
  });

  it('do not show for the place where the page starts', () => {
    const arrivals = new PlaceArrivals([TOWN]);
    expect(arrivals.update(4, 4)).toBeNull();
    expect(arrivals.current).toBe(TOWN);
    expect(arrivals.update(5, 4)).toBeNull();
  });

  it('show for a jump into a place (a wake at a refuge), and for another place on the way', () => {
    const arrivals = new PlaceArrivals([TOWN, VILLAGE]);
    arrivals.update(50, 5);
    expect(arrivals.update(5, 5)).toBe(TOWN);
    expect(arrivals.update(105, 5)).toBe(VILLAGE);
    expect(arrivals.current).toBe(VILLAGE);
  });

  it('show nothing in a world without titled places', () => {
    const arrivals = new PlaceArrivals([]);
    arrivals.update(0, 0);
    expect(arrivals.update(5, 5)).toBeNull();
    expect(arrivals.current).toBeNull();
  });
});

/** A small land round a town in the north, a land from row 0 south, and the land between them everywhere else. */
const ENCLAVE: Land = { id: 'enclave', title: 'Enclave', x0: 90, y0: -110, x1: 110, y1: -90 };
const SOUTH: Land = { id: 'south', title: 'South', x0: -Infinity, y0: 0, x1: Infinity, y1: Infinity };
const WILD: Land = { id: 'wild', title: 'Wild', x0: -Infinity, y0: -Infinity, x1: Infinity, y1: Infinity };
const LANDS = [ENCLAVE, SOUTH, WILD];

describe('the titles of lands', () => {
  it('show at each crossing, in both directions, LAND_DEPTH tiles past the border', () => {
    const crossings = new LandCrossings(LANDS);
    expect(crossings.update(5, 10)).toBeNull();
    expect(crossings.current).toBe(SOUTH);
    // North over the border (row -1 is the first row of the wild).
    for (let ty = 9; ty > -1 - LAND_DEPTH; ty--) expect(crossings.update(5, ty), `row ${ty}`).toBeNull();
    expect(crossings.update(5, -1 - LAND_DEPTH)).toBe(WILD);
    expect(crossings.current).toBe(WILD);
    expect(crossings.update(5, -20)).toBeNull();
    // Back south.
    for (let ty = -19; ty < LAND_DEPTH; ty++) expect(crossings.update(5, ty), `row ${ty}`).toBeNull();
    expect(crossings.update(5, LAND_DEPTH)).toBe(SOUTH);
  });

  it('do not show again and again for a walk along the border', () => {
    const crossings = new LandCrossings(LANDS);
    crossings.update(5, 10);
    for (let i = 0; i < 10; i++) for (const ty of [1, 0, -1, -2, -1, 0]) expect(crossings.update(5 + i, ty)).toBeNull();
    expect(crossings.current).toBe(SOUTH);
  });

  it('give a small land before the big land round it', () => {
    const crossings = new LandCrossings(LANDS);
    crossings.update(100, -50);
    expect(crossings.current).toBe(WILD);
    expect(crossings.update(100, -89)).toBeNull();
    expect(crossings.update(100, -90 - LAND_DEPTH)).toBe(ENCLAVE);
    expect(crossings.update(100, -100)).toBeNull();
    expect(crossings.update(100, -111 - LAND_DEPTH)).toBe(WILD);
  });

  it('do not show for the land where the page starts, and show for a jump into another land', () => {
    const crossings = new LandCrossings(LANDS);
    expect(crossings.update(100, -100)).toBeNull();
    expect(crossings.current).toBe(ENCLAVE);
    expect(crossings.update(0, 30)).toBe(SOUTH);
  });

  it('show nothing in a world without lands', () => {
    const crossings = new LandCrossings([]);
    crossings.update(0, 0);
    expect(crossings.update(0, -50)).toBeNull();
    expect(crossings.current).toBeNull();
  });
});
