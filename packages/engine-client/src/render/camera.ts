import type { Container } from 'pixi.js';

/**
 * The camera shows at least this many world pixels on the short side of the screen. A phone
 * gets fewer, so that the sprites are not too small for its small physical size.
 */
const TARGET_SHORT_SIDE = 240;
const TARGET_SHORT_SIDE_SMALL = 192;
/** A screen whose short side is less than this (CSS pixels) is a phone. */
const SMALL_SCREEN = 500;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Pixel-perfect camera. One world pixel is always a whole number of device pixels (`zoom`),
 * and the world moves in whole device pixels. Thus the pixel art never blurs or shimmers.
 */
export class Camera {
  /** Device pixels for each world pixel. Always a whole number. */
  zoom = 1;
  private dpr = 1;
  private width = 0;
  private height = 0;
  private centreX = 0;
  private centreY = 0;

  /** Sets the screen size in CSS pixels and the device pixel ratio. */
  resize(width: number, height: number, dpr: number): void {
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    const shortSide = Math.min(width, height);
    const target = shortSide < SMALL_SCREEN ? TARGET_SHORT_SIDE_SMALL : TARGET_SHORT_SIDE;
    this.zoom = Math.max(1, Math.floor((shortSide * dpr) / target));
  }

  /** Moves and scales the world container so that the world point (x, y) is at the screen centre. */
  follow(world: Container, x: number, y: number): void {
    this.centreX = x;
    this.centreY = y;
    world.scale.set(this.zoom / this.dpr);
    world.position.set(
      Math.round((this.width * this.dpr) / 2 - x * this.zoom) / this.dpr,
      Math.round((this.height * this.dpr) / 2 - y * this.zoom) / this.dpr,
    );
  }

  /** The part of the world that is on the screen, in world pixels. */
  view(): Rect {
    const width = (this.width * this.dpr) / this.zoom;
    const height = (this.height * this.dpr) / this.zoom;
    return { x: this.centreX - width / 2, y: this.centreY - height / 2, width, height };
  }
}
