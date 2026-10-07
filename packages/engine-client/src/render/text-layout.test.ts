import { describe, expect, it } from 'vitest';
import { measureLine, wrapText } from './text-layout.ts';

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
