import { describe, expect, it } from 'vitest';
import { PROLOGUE_TIMING, bannerLineOf, bannerWidth, cardMs, cardTexts, layerOffset, layerShows, lineMs, prologueLayout } from './prologue.ts';

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
