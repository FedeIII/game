/**
 * Effects of a fight: the arc of an attack (`fx/slash/<i>`) and the star of a stun (`fx/star`).
 * They are drawn in white and greys; the game tints them (the colour of a blade, a spell, a
 * flame). An arc faces right (+x); the game turns it to the side of the attack.
 */
import { Image } from './image.ts';
import type { Frame } from './sprites.ts';

/** The arc frame: the attacker's chest is at the anchor, on the left side of the frame. */
export const SLASH_FRAME = { width: 32, height: 32, pivotX: 6, pivotY: 16 } as const;
export const SLASH_FRAMES = 4;

const grey = (v: number, alpha: number) => ((v << 24) | (v << 16) | (v << 8) | Math.round(alpha * 255)) >>> 0;

/**
 * A crescent that sweeps from above to below in front of the attacker: frame i shows the arc up
 * to its edge at that moment, bright at the edge and fading behind it, then the whole arc fades.
 */
function slash(i: number): Image {
  const { width, height, pivotX, pivotY } = SLASH_FRAME;
  const image = new Image(width, height);
  const t = (i + 1) / SLASH_FRAMES;
  const span = 2.1;
  const edge = -span / 2 + span * Math.min(1, t * 1.35);
  const fade = t > 0.75 ? 1 - (t - 0.75) / 0.25 * 0.75 : 1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x + 0.5 - pivotX;
      const dy = y + 0.5 - pivotY;
      const r = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      if (a > edge || a < -span / 2) continue;
      // Thick in the middle of the sweep, thin at both ends.
      const along = (a + span / 2) / span;
      const thick = 1.2 + 3.2 * Math.sin(Math.PI * along);
      const inner = 15 - thick / 2;
      if (r < inner || r > inner + thick) continue;
      const trail = Math.max(0, 1 - (edge - a) / 1.4);
      const alpha = trail * fade;
      if (alpha < 0.12) continue;
      const v = Math.round(150 + 105 * trail);
      image.set(x, y, grey(v, Math.min(1, alpha * 1.1)));
    }
  }
  return image;
}

/** A small four-pointed star. */
function star(): Image {
  const image = new Image(5, 5);
  for (const [x, y, v] of [
    [2, 0, 200],
    [2, 1, 255],
    [0, 2, 200],
    [1, 2, 255],
    [2, 2, 255],
    [3, 2, 255],
    [4, 2, 200],
    [2, 3, 255],
    [2, 4, 200],
  ] as const) {
    image.set(x, y, grey(v, 1));
  }
  return image;
}

export function fxFrames(): Frame[] {
  const anchor = { x: SLASH_FRAME.pivotX / SLASH_FRAME.width, y: SLASH_FRAME.pivotY / SLASH_FRAME.height };
  const frames: Frame[] = [];
  for (let i = 0; i < SLASH_FRAMES; i++) frames.push({ name: `fx/slash/${i}`, image: slash(i), anchor });
  frames.push({ name: 'fx/star', image: star(), anchor: { x: 0.5, y: 0.5 } });
  return frames;
}
