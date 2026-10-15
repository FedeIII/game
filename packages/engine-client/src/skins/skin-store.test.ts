import { Texture, TextureSource } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { SKIN_COLUMNS, SKIN_FRAME, SKIN_ROW_CELLS, SKIN_VIEW_ROWS, SKIN_VIEWS } from '../../art/skins.ts';
import { playerFrames, type PlayerTextures } from '../render/player-view.ts';
import { SkinStore, sheetTextures } from './skin-store.ts';

/** The textures of a sheet without a canvas (a test has no DOM). */
function fakeSheet(): PlayerTextures {
  const width = SKIN_ROW_CELLS * SKIN_FRAME.width;
  const height = SKIN_VIEWS.length * SKIN_VIEW_ROWS * SKIN_FRAME.height;
  return sheetTextures(new Texture({ source: new TextureSource({ width, height }) }), 30);
}

describe('the frames of a skin sheet', () => {
  it('lists every frame of the sheet once', () => {
    const frames = playerFrames(fakeSheet());
    expect(frames.length).toBe(SKIN_VIEWS.length * SKIN_COLUMNS.count);
    expect(new Set(frames).size).toBe(frames.length);
    expect(new Set(frames.map((f) => `${f.frame.x},${f.frame.y}`)).size).toBe(frames.length);
  });
});

describe('the skin store', () => {
  it('frees every frame of a skin that it drops, the brace and the evade too', () => {
    const store = new SkinStore();
    const ready = (store as unknown as { ready: Map<string, PlayerTextures> }).ready;
    const sheets = Array.from({ length: 41 }, () => fakeSheet());
    sheets.forEach((textures, i) => ready.set(`skin-${i}`, textures));
    store.retain(new Set(sheets.slice(1).map((_, i) => `skin-${i + 1}`)));
    expect(ready.has('skin-0')).toBe(false);
    expect(playerFrames(sheets[0]!).filter((frame) => !frame.destroyed)).toEqual([]);
    expect(playerFrames(sheets[1]!).every((frame) => !frame.destroyed)).toBe(true);
  });
});
