/**
 * The marks at the edge of the screen (Wisdom): `ui/danger/<i>` points to a mob that hunts the
 * player out of its view, and `ui/homeward/<i>` to the home. Each comes in 16 directions, i x 22.5
 * degrees clockwise from east, drawn at that angle (not turned at run time, so the pixel grid
 * stays). White with a dark outline: the client tints the white.
 */
import { Image } from './png.ts';
import type { Frame } from './sprites.ts';

const SIZE = 13;
const DIRECTIONS = 16;
const WHITE = 0xffffffff;
const OUTLINE = 0x0c0808ff;
/** Each pixel takes this many samples on a side: it is inside when half of them are. */
const SAMPLES = 4;

type Point = readonly [number, number];

/** A thick chevron, pointing east: the danger mark. Its way is clear in every direction. */
const DANGER: readonly Point[] = [
  [5.4, 0],
  [-0.6, -5],
  [-3.8, -5],
  [2, 0],
  [-3.8, 5],
  [-0.6, 5],
];
/** An arrow with a shaft, pointing east: the way home. */
const HOMEWARD: readonly Point[] = [
  [5.2, 0],
  [0.8, -3.3],
  [0.8, -1.1],
  [-4.6, -1.1],
  [-4.6, 1.1],
  [0.8, 1.1],
  [0.8, 3.3],
];

function insidePolygon(x: number, y: number, polygon: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]!;
    const [xj, yj] = polygon[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** The shape turned by `angle` (radians, clockwise on the screen), as pixels with an outline. */
function mark(polygon: readonly Point[], angle: number): Image {
  const image = new Image(SIZE, SIZE);
  const c = SIZE / 2;
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  const filled = new Set<number>();
  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      let hits = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = px + (sx + 0.5) / SAMPLES - c;
          const y = py + (sy + 0.5) / SAMPLES - c;
          // Back into the shape's own frame.
          if (insidePolygon(x * cos - y * sin, x * sin + y * cos, polygon)) hits++;
        }
      }
      if (hits * 2 >= SAMPLES * SAMPLES) filled.add(py * SIZE + px);
    }
  }
  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      if (filled.has(py * SIZE + px)) {
        image.set(px, py, WHITE);
        continue;
      }
      let edge = false;
      for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1 && !edge; dx++) edge = filled.has((py + dy) * SIZE + (px + dx)) && px + dx >= 0 && px + dx < SIZE;
      if (edge) image.set(px, py, OUTLINE);
    }
  }
  return image;
}

export function markFrames(): Frame[] {
  const frames: Frame[] = [];
  for (let i = 0; i < DIRECTIONS; i++) {
    const angle = (i * 2 * Math.PI) / DIRECTIONS;
    frames.push({ name: `ui/danger/${i}`, image: mark(DANGER, angle), anchor: { x: 0.5, y: 0.5 } });
    frames.push({ name: `ui/homeward/${i}`, image: mark(HOMEWARD, angle), anchor: { x: 0.5, y: 0.5 } });
  }
  return frames;
}
