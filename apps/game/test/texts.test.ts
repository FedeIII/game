import { describe, expect, it } from 'vitest';
import { TEXTS_ES } from '@game/world-wilds';
import { GLYPHS } from '../../../packages/engine-client/art/font.ts';
import { ES } from '../../../packages/engine-client/src/ui/strings-es.ts';

/** Whether the pixel font draws a character: its glyph, a plain form of it (pixel-text.ts), or its letter without the accent. */
const drawable = (c: string) => {
  const base = c.normalize('NFD')[0]!;
  return c === ' ' || c in GLYPHS || '«»‘’“”…'.includes(c) || base in GLYPHS || base.toLowerCase() in GLYPHS;
};
const undrawable = (texts: readonly string[]) => [...new Set(texts.flatMap((text) => [...text.replaceAll('{name}', '')].filter((c) => !drawable(c))))];

describe('the Spanish texts and the pixel font', () => {
  it('draw every letter of the texts of the Wilds (speech, signs, names)', () => {
    expect(undrawable(Object.values(TEXTS_ES))).toEqual([]);
  });

  it('draw every letter of what the player says in the engine (its lines in a bubble)', () => {
    const said = [
      ES.barred,
      ES.forced,
      ES.herbsGone,
      ES.cacheGone,
      ES.dug,
      ES.picked,
      ES.locked,
      ES.chestEmpty,
      ES.packFull,
      ES.chestOffline,
      ES.pileOffline,
      ES.dropOffline,
      ES.rested,
      ES.woke,
      ES.wokeLost(3),
      ES.refuge,
      ES.doorBlocked,
      ES.doorBlockedByOther,
      ES.barredPlain,
      ES.lockedPlain,
      ES.loreHint('[INT 13]'),
      ES.found('4 monedas y un anillo de plata'),
      ...Object.values(ES.drank).filter((line): line is string => typeof line === 'string'),
      ...Object.values(ES.items).flatMap((names) => [names.name, names.a, names.many]),
    ];
    expect(undrawable(said)).toEqual([]);
  });
});
