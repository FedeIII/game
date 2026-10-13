import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { menuLogo, MENU_LOGO_FRAMES } from './menu-logo.ts';

const logo = menuLogo();
const alpha = (frame: number, x: number, y: number) => logo.image.get(x, frame * logo.height + y) & 0xff;

describe('the logo of the menu', () => {
  it('is a sheet of frames one under the other, and the generated files are up to date', () => {
    expect(logo.frames).toBe(MENU_LOGO_FRAMES);
    expect(logo.image.width).toBe(logo.width);
    expect(logo.image.height).toBe(logo.height * logo.frames);
    const json = JSON.parse(readFileSync(new URL('../src/generated/menu-logo.json', import.meta.url), 'utf8'));
    expect(json).toEqual({ width: logo.width, height: logo.height, frames: logo.frames, pad: logo.pad });
  });

  it('keeps its glow inside the frame: the outer rows and columns are clear', () => {
    for (let f = 0; f < logo.frames; f++) {
      for (let x = 0; x < logo.width; x++) {
        expect(alpha(f, x, 0)).toBe(0);
        expect(alpha(f, x, logo.height - 1)).toBe(0);
      }
      for (let y = 0; y < logo.height; y++) {
        expect(alpha(f, 0, y)).toBe(0);
        expect(alpha(f, logo.width - 1, y)).toBe(0);
      }
    }
  });

  it('has its letters in the middle, between the glow on each side', () => {
    let left = Infinity;
    let right = -Infinity;
    for (let y = 0; y < logo.height; y++) {
      for (let x = 0; x < logo.width; x++) {
        if (alpha(0, x, y) < 255) continue;
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    }
    // The outline is opaque, and it is one or two pixels round the letters.
    expect(left).toBeGreaterThanOrEqual(logo.pad - 2);
    expect(logo.width - 1 - right).toBeGreaterThanOrEqual(logo.pad - 2);
    expect(Math.abs(left - (logo.width - 1 - right))).toBeLessThanOrEqual(1);
  });

  it('changes only the opaque metal in the frames of the shine, and the shine crosses the whole logo', () => {
    const touched = new Set<number>();
    for (let f = 1; f < logo.frames; f++) {
      for (let y = 0; y < logo.height; y++) {
        for (let x = 0; x < logo.width; x++) {
          const rest = logo.image.get(x, y);
          const now = logo.image.get(x, f * logo.height + y);
          if (rest === now) continue;
          expect(rest & 0xff).toBe(255);
          touched.add(Math.floor((x / logo.width) * 10));
        }
      }
    }
    expect(touched.size).toBe(10);
  });
});
