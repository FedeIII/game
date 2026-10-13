import { describe, expect, it } from 'vitest';
import type { PlaceTitle } from '@game/engine';
import { PlaceArrivals, TITLE_AWAY } from './place-titles.ts';

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
