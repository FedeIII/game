import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BRONZEHOLD, IRONHOLD, SILVERSPRING, WHITEGROVE } from '@game/world-wilds';
import { fontFrames } from '../../../packages/engine-client/art/font.ts';

const TOWNS = [IRONHOLD, WHITEGROVE, BRONZEHOLD, SILVERSPRING];

/** The names of the frames in the atlas that the game loads. */
function atlasFrames(): Set<string> {
  const atlas = JSON.parse(readFileSync(new URL('../../../packages/engine-client/src/generated/atlas.json', import.meta.url), 'utf8')) as { frames: Record<string, unknown> };
  return new Set(Object.keys(atlas.frames));
}

describe('the art of the Wilds', () => {
  it('has a frame for the emblem over each door that has one', () => {
    const frames = new Set(fontFrames().map((f) => f.name));
    const emblems = TOWNS.flatMap((town) => town.buildings.flatMap((b) => (b.emblem ? [b.emblem] : [])));
    expect(emblems).toContain('chalice');
    for (const emblem of emblems) expect(frames.has(`ui/emblem/${emblem}`), emblem).toBe(true);
  });

  it('has a frame for the look of each thing in the streets of the towns', () => {
    const frames = atlasFrames();
    const looks = TOWNS.flatMap((town) => town.streetFixtures.flatMap((f) => (f.look ? [`fixture/${f.kind}/${f.look}`] : [])));
    expect(looks).toContain('fixture/palisade/10');
    for (const frame of new Set(looks)) expect(frames.has(frame), frame).toBe(true);
  });

  it('shows the anvil of the Sovereignty on the standard of Bronzehold, not the phoenix of the Seekers', () => {
    const standards = BRONZEHOLD.streetFixtures.filter((f) => f.kind === 'standard');
    expect(standards).toHaveLength(1);
    expect(standards[0]!.look).toBe('iron');
    expect(atlasFrames().has('fixture/standard/iron')).toBe(true);
  });
});
