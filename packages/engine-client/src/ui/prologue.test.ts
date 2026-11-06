import { describe, expect, it } from 'vitest';
import { PROLOGUE_TIMING, bannerLineOf, bannerScale, bannerWidth, cardMs, cardTexts, cropLeft, layerOffset, layerShows, lineMs, prologueLayout } from './prologue.ts';

describe('the prologue', () => {
  it('gives a line the time to type it and to read it', () => {
    const line = 'x'.repeat(90);
    expect(lineMs(line)).toBeCloseTo((90 / PROLOGUE_TIMING.typing) * 1000 + PROLOGUE_TIMING.read + 90 * PROLOGUE_TIMING.readPerChar, 6);
    expect(lineMs('a short one')).toBeLessThan(lineMs(line));
  });

  it('gives a card its fades, its title and its lines', () => {
    const lines = ['One line.', 'And another one.'];
    expect(cardMs({ lines })).toBeCloseTo(2 * PROLOGUE_TIMING.fade + lineMs(lines[0]!) + lineMs(lines[1]!), 6);
    expect(cardMs({ title: 'Kandrax', lines })).toBeCloseTo(cardMs({ lines }) + PROLOGUE_TIMING.title, 6);
    // A banner takes the time of a title; a banner that comes with a later line takes none.
    expect(cardMs({ banner: 'Iron Sovereignty', lines })).toBeCloseTo(cardMs({ title: 'Kandrax', lines }), 6);
    expect(cardMs({ banner: 'Iron Sovereignty', bannerLine: 1, lines })).toBeCloseTo(cardMs({ lines }), 6);
    expect(bannerLineOf({ banner: 'Iron Sovereignty' })).toBe(0);
    expect(bannerLineOf({ banner: 'Iron Sovereignty', bannerLine: 1 })).toBe(1);
    expect(bannerLineOf({})).toBeNull();
  });

  it('fills in the name and the kind of the character', () => {
    const texts = cardTexts({ scene: 'hut', title: '{name}', subtitle: '{kind}', lines: ['Hello, {name}.'] }, 'Quester', 'Human fighter');
    expect(texts).toEqual({ title: 'Quester', subtitle: 'Human fighter', banner: null, lines: ['Hello, Quester.'] });
    expect(cardTexts({ scene: 'map', lines: ['The map.'] }, 'A', 'B').title).toBeNull();
    expect(cardTexts({ scene: 'iron', banner: 'Iron Sovereignty', lines: [] }, 'A', 'B').banner).toBe('Iron Sovereignty');
  });

  it('pans a layer by its depth, and lets a tall layer rise', () => {
    expect(layerOffset({ depth: 1 }, 0)).toEqual({ x: 0, y: 0 });
    expect(layerOffset({ depth: 1 }, 1)).toEqual({ x: PROLOGUE_TIMING.pan, y: 0 });
    expect(layerOffset({ depth: 0, rise: 140 }, 0.5)).toEqual({ x: 0, y: 70 });
    expect(layerOffset({ depth: 0, rise: 140 }, 2)).toEqual({ x: 0, y: 140 });
  });

  it("shows the labels of the page's language only", () => {
    expect(layerShows({}, 'es')).toBe(true);
    expect(layerShows({ lang: 'es' }, 'es')).toBe(true);
    expect(layerShows({ lang: 'en' }, 'es')).toBe(false);
  });

  it('measures a banner in the pixel font', () => {
    expect(bannerWidth('I')).toBeGreaterThan(0);
    expect(bannerWidth('Iron Sovereignty')).toBeGreaterThan(bannerWidth('Iron'));
    // An accented capital draws as the plain one.
    expect(bannerWidth('Á')).toBe(bannerWidth('A'));
  });

  it('draws a banner at twice the font, or at its own size in a narrow view', () => {
    // The full view takes every name at twice the font, also the longest one (Spanish).
    expect(bannerScale(bannerWidth('Soberanía del Hierro'), 320)).toBe(2);
    expect(bannerScale(bannerWidth('Iron Sovereignty'), 183)).toBe(2);
    expect(bannerScale(bannerWidth('Soberanía del Hierro'), 183)).toBe(1);
  });

  it('shows the part of a scene around its focus in a narrow view', () => {
    expect(cropLeft({ focus: 200 }, 320)).toBe(0);
    expect(cropLeft({ focus: 200 }, 180)).toBe(110);
    // Without a focus, the middle; the part stays inside the scene.
    expect(cropLeft({}, 180)).toBe(70);
    expect(cropLeft({ focus: 10 }, 180)).toBe(0);
    expect(cropLeft({ focus: 310 }, 180)).toBe(140);
    expect(cropLeft(undefined, 200)).toBe(60);
  });

  describe('the layout', () => {
    // About 430 characters (the longest card in Spanish), 7 pixels each, rows of 21 pixels, three paragraphs.
    const need = (width: number) => (Math.ceil(430 / Math.floor(width / 7)) + 3) * 21;

    it('puts the text under a large scene on a desktop', () => {
      const layout = prologueLayout(1416, 876, need);
      expect(layout.side).toBe(false);
      expect(layout.fits).toBe(true);
      expect(Number.isInteger(layout.scale)).toBe(true);
      expect(layout.scale).toBeGreaterThanOrEqual(3);
      expect(layout.textWidth).toBeLessThanOrEqual(820);
    });

    it('puts the text under the scene on a phone held upright', () => {
      const layout = prologueLayout(366, 820, need);
      expect(layout.side).toBe(false);
      expect(layout.fits).toBe(true);
      expect(180 * layout.scale + 18 + layout.textHeight).toBeLessThanOrEqual(820);
    });

    it('shows a larger part of the scene on a phone held upright, sharp in device pixels', () => {
      for (const [width, height, dpr] of [
        [366, 820, 3],
        [388, 891, 2.625],
        [336, 616, 2],
        [744, 1000, 2],
      ] as const) {
        const at = `${width} x ${height} @${dpr}`;
        const layout = prologueLayout(width, height, need, dpr);
        expect(layout.side, at).toBe(false);
        expect(layout.fits, at).toBe(true);
        expect(layout.crop, at).toBeLessThan(320);
        expect(layout.crop, at).toBeGreaterThanOrEqual(180);
        expect(Number.isInteger(Math.round(layout.scale * dpr * 1e6) / 1e6), at).toBe(true);
        // Larger than the whole scene across the screen, and as wide as the screen allows.
        expect(layout.scale, at).toBeGreaterThan(width / 320);
        expect(layout.sceneWidth, at).toBeCloseTo(layout.crop * layout.scale, 6);
        expect(layout.sceneWidth, at).toBeLessThanOrEqual(width);
        expect(layout.sceneWidth, at).toBeGreaterThan(width - layout.scale);
        expect(layout.sceneHeight + 18 + layout.textHeight, at).toBeLessThanOrEqual(height);
      }
      // An iPhone: a square part of the scene, two pixels of the page for each pixel of the art.
      expect(prologueLayout(366, 820, need, 3)).toMatchObject({ scale: 2, crop: 183, sceneWidth: 366, sceneHeight: 360 });
    });

    it('shows all the scene on a screen that is not upright', () => {
      for (const [width, height] of [
        [1416, 876],
        [820, 330],
        [600, 600],
      ] as const) {
        const layout = prologueLayout(width, height, need, 2);
        expect(layout.crop, `${width} x ${height}`).toBe(320);
        expect(layout.sceneWidth).toBe(Math.round(320 * layout.scale));
        expect(layout).toEqual(prologueLayout(width, height, need));
      }
    });

    it('puts the text beside the scene on a phone on its side', () => {
      const layout = prologueLayout(820, 330, need);
      expect(layout.side).toBe(true);
      expect(layout.fits).toBe(true);
      expect(320 * layout.scale + 18 + layout.textWidth).toBeLessThanOrEqual(820);
      expect(layout.textHeight).toBeLessThanOrEqual(330 - 38);
      expect(180 * layout.scale).toBeLessThanOrEqual(330 - 38);
    });

    it('never makes the scene tiny to fit the text', () => {
      for (const [width, height] of [
        [643, 316],
        [280, 340],
        [600, 200],
      ] as const) {
        const layout = prologueLayout(width, height, need);
        expect(layout.scale, `${width} x ${height}`).toBeGreaterThanOrEqual(0.5);
      }
    });

    it('lets the text scroll when nothing fits', () => {
      const tall = prologueLayout(280, 340, need);
      expect(tall.fits).toBe(false);
      expect(tall.side).toBe(false);
      const wide = prologueLayout(600, 200, need);
      expect(wide.fits).toBe(false);
      expect(wide.side).toBe(true);
      expect(wide.textHeight).toBeGreaterThan(0);
    });
  });
});
