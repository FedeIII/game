import { describe, expect, it } from 'vitest';
import { BRONZEHOLD, IRONHOLD, SILVERSPRING, WHITEGROVE } from '@game/world-wilds';
import { fontFrames } from '../../../packages/engine-client/art/font.ts';

describe('the art of the Wilds', () => {
  it('has a frame for the emblem over each door that has one', () => {
    const frames = new Set(fontFrames().map((f) => f.name));
    const emblems = [IRONHOLD, WHITEGROVE, BRONZEHOLD, SILVERSPRING].flatMap((town) => town.buildings.flatMap((b) => (b.emblem ? [b.emblem] : [])));
    expect(emblems).toContain('chalice');
    for (const emblem of emblems) expect(frames.has(`ui/emblem/${emblem}`), emblem).toBe(true);
  });
});
