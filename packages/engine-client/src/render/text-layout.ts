/**
 * Text layout without a renderer, so it can be tested: the width of a line from the advance of
 * each character, and line breaks at spaces.
 */

/** The width of a line: the sum of the advances, plus `spacing` between two characters. */
export function measureLine(line: string, advance: (code: number) => number, spacing: number): number {
  let width = 0;
  let count = 0;
  for (const ch of line) {
    width += advance(ch.codePointAt(0)!);
    count++;
  }
  return count === 0 ? 0 : width + (count - 1) * spacing;
}

/** Splits text into lines no wider than `maxWidth`, at spaces. A longer word gets its own line. */
export function wrapText(text: string, maxWidth: number, measure: (line: string) => number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measure(candidate) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** The width of a bubble's text, in world pixels: the usual width, the widest, and the height of a line. */
export interface BubbleWidths {
  /** A short text wraps at this width, as it always did. */
  readonly base: number;
  /** A long text never wraps wider than this. */
  readonly widest: number;
  readonly lineHeight: number;
}

/**
 * How many times as wide as tall a long text's bubble is, about. A short text keeps the shape
 * that `base` gives it.
 */
const BUBBLE_SHAPE = 4;

/**
 * Splits the text of a speech bubble into lines. A short text wraps at `base`. A long text would
 * make a tall, narrow bubble at `base`, so it wraps wider: the width grows with the square root of
 * the text's length (BUBBLE_SHAPE), up to `widest`. Then the width shrinks to the narrowest that
 * gives as few lines, so the lines are of about the same length.
 */
export function wrapBubble(text: string, widths: BubbleWidths, measure: (line: string) => number): string[] {
  const base = Math.min(widths.base, widths.widest);
  const lines = wrapText(text, base, measure);
  if (lines.length <= 1) return lines;
  const length = measure(lines.join(' '));
  const wide = Math.min(widths.widest, Math.floor(Math.sqrt(BUBBLE_SHAPE * widths.lineHeight * length)));
  if (wide <= base) return lines;
  const fewest = wrapText(text, wide, measure).length;
  if (fewest >= lines.length) return lines;
  // A wider line never gives more lines, so a binary search finds the narrowest width.
  let low = base + 1;
  let high = wide;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (wrapText(text, mid, measure).length <= fewest) high = mid;
    else low = mid + 1;
  }
  return wrapText(text, low, measure);
}
