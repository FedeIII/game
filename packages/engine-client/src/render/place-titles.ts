import type { PlaceTitle } from '@game/engine';

/** How far out of a place (tiles) a player goes before its visit ends: a new arrival then shows the title again. */
export const TITLE_AWAY = 12;

const inside = (place: PlaceTitle, tx: number, ty: number, margin = 0) =>
  tx >= place.x0 - margin && tx <= place.x1 + margin && ty >= place.y0 - margin && ty <= place.y1 + margin;

/**
 * Decides when the name of a place shows over the screen (WorldSource.placeTitles; Fede's rule,
 * 2026-10-13): when the player comes into the place, once for each visit. A visit ends when the player
 * is more than TITLE_AWAY tiles out of the place, so a walk to the edge of a town and back shows nothing.
 * The place where the page starts (a character that was there last, or a reload for a new build) gets
 * no title: the player did not arrive there. A wake at a refuge in a place is an arrival.
 */
export class PlaceArrivals {
  private readonly places: readonly PlaceTitle[];
  /** The place of the visit under way, or null. */
  private visit: PlaceTitle | null = null;
  private started = false;

  constructor(places: readonly PlaceTitle[]) {
    this.places = places;
  }

  /** The place of the visit under way, or null (for the debug panel). */
  get current(): PlaceTitle | null {
    return this.visit;
  }

  /** Follows the player's tile on each frame: gives the place that the player came into now (show its title), or null. */
  update(tx: number, ty: number): PlaceTitle | null {
    const first = !this.started;
    this.started = true;
    const place = this.places.find((p) => inside(p, tx, ty)) ?? null;
    if (this.visit && this.visit !== place && !inside(this.visit, tx, ty, TITLE_AWAY)) this.visit = null;
    if (!place || place === this.visit) return null;
    this.visit = place;
    return first ? null : place;
  }
}
