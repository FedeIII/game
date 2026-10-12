import { describe, expect, it } from 'vitest';
import { PROLOGUE_TIMING, cardMs, cardTexts, lineMs } from './prologue.ts';

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
  });

  it('fills in the name and the kind of the character', () => {
    const texts = cardTexts({ scene: 'hut', title: '{name}', subtitle: '{kind}', lines: ['Hello, {name}.'] }, 'Quester', 'Human fighter');
    expect(texts).toEqual({ title: 'Quester', subtitle: 'Human fighter', lines: ['Hello, Quester.'] });
    expect(cardTexts({ scene: 'map', lines: ['The map.'] }, 'A', 'B').title).toBeNull();
  });
});
