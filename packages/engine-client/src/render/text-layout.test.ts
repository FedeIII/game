import { describe, expect, it } from 'vitest';
import { measureLine, wrapBubble, wrapText } from './text-layout.ts';

// Every character is 4 pixels wide, with 1 pixel between characters: n characters = 5n - 1.
const measure = (line: string) => measureLine(line, () => 4, 1);

describe('measureLine', () => {
  it('adds the advances and the spacing between characters', () => {
    expect(measure('')).toBe(0);
    expect(measure('a')).toBe(4);
    expect(measure("It's")).toBe(19);
  });

  it('counts a character outside the basic plane once', () => {
    expect(measure('😀')).toBe(4);
  });
});

describe('wrapText', () => {
  it('keeps a line that fits', () => {
    expect(wrapText("It's a tree", 100, measure)).toEqual(["It's a tree"]);
  });

  it('breaks at spaces', () => {
    // "aaaa bbbb" is 9 characters = 44 px and "bbbb cc" is 7 = 34 px; the limit is 35.
    expect(wrapText('aaaa bbbb cc', 35, measure)).toEqual(['aaaa', 'bbbb cc']);
  });

  it('gives a word that is too long a line of its own', () => {
    expect(wrapText('a supercalifragilistic b', 20, measure)).toEqual(['a', 'supercalifragilistic', 'b']);
  });

  it('ignores extra spaces and gives no lines for empty text', () => {
    expect(wrapText('  a   b  ', 100, measure)).toEqual(['a b']);
    expect(wrapText('   ', 100, measure)).toEqual([]);
  });
});

describe('wrapBubble', () => {
  const widths = { base: 104, widest: 208, lineHeight: 11 };
  const widthOf = (lines: readonly string[]) => Math.max(...lines.map(measure));

  it('wraps a short text at the usual width', () => {
    const text = 'I keep the watch here at the south gate.';
    expect(wrapBubble(text, widths, measure)).toEqual(wrapText(text, 104, measure));
    // Three lines at the usual width are not long: the bubble keeps its shape.
    const three = 'aaaa '.repeat(11).trim();
    expect(wrapText(three, 104, measure)).toHaveLength(3);
    expect(wrapBubble(three, widths, measure)).toEqual(wrapText(three, 104, measure));
  });

  it('makes the bubble of a long text wider and less tall', () => {
    // 40 words of 4 letters: 10 lines of 94 px at the usual width.
    const text = 'abcd '.repeat(40).trim();
    expect(wrapText(text, 104, measure)).toHaveLength(10);
    const lines = wrapBubble(text, widths, measure);
    expect(lines).toHaveLength(5);
    expect(widthOf(lines)).toBe(194);
    expect(lines.join(' ')).toBe(text);
  });

  it('gives lines of about the same length, not a last short line', () => {
    // 30 words: the square root gives 180 px, 7 words on a line: 7, 7, 7, 7 and 2. Balanced: 6 words on each.
    const text = 'abcd '.repeat(30).trim();
    expect(wrapText(text, 180, measure).map((line) => line.split(' ').length)).toEqual([7, 7, 7, 7, 2]);
    const lines = wrapBubble(text, widths, measure);
    expect(lines.map((line) => line.split(' ').length)).toEqual([6, 6, 6, 6, 6]);
    // The narrowest width for that number of lines: 1 px less gives one more line.
    expect(wrapText(text, widthOf(lines) - 1, measure).length).toBeGreaterThan(lines.length);
  });

  it('never goes wider than the widest', () => {
    const text = 'abcd '.repeat(200).trim();
    expect(widthOf(wrapBubble(text, widths, measure))).toBeLessThanOrEqual(208);
    expect(widthOf(wrapBubble(text, { ...widths, widest: 150 }, measure))).toBeLessThanOrEqual(150);
  });

  it('wraps at the widest when the screen is narrower than the usual width', () => {
    const text = 'abcd '.repeat(10).trim();
    expect(wrapBubble(text, { ...widths, widest: 60 }, measure)).toEqual(wrapText(text, 60, measure));
  });

  it('keeps one line, and a word that is too long', () => {
    expect(wrapBubble('Hello there.', widths, measure)).toEqual(['Hello there.']);
    expect(wrapBubble('a'.repeat(60), widths, measure)).toEqual(['a'.repeat(60)]);
    expect(wrapBubble('   ', widths, measure)).toEqual([]);
  });
});
