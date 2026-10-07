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
