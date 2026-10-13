import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { NameTag, TAG_MARGIN, nearView } from './name-tag.ts';
import type { PixelFont } from './pixel-text.ts';

const VIEW = { x: 0, y: 0, width: 400, height: 240 };
/** A font that draws nothing: the tag needs only its sizes. */
const FONT = { height: 5, layout: () => new Container(), measure: (text: string) => text.length * 4 } as unknown as PixelFont;
/** One frame at 60 frames a second. */
const FRAME = 1 / 60;

describe('the name over the head of another player', () => {
  it('belongs to a player on the screen or near it', () => {
    expect(nearView(200, 120, VIEW)).toBe(true);
    expect(nearView(-TAG_MARGIN, 120, VIEW)).toBe(true);
    expect(nearView(VIEW.width + TAG_MARGIN, VIEW.height + TAG_MARGIN, VIEW)).toBe(true);
    expect(nearView(-TAG_MARGIN - 1, 120, VIEW)).toBe(false);
    expect(nearView(200, VIEW.height + TAG_MARGIN + 1, VIEW)).toBe(false);
    expect(nearView(2000, 120, VIEW)).toBe(false);
  });

  it('fades out when its player goes far from the screen, and fades in when it comes back', () => {
    const layer = new Container();
    const tag = new NameTag(FONT, layer);
    tag.set('Brann');
    tag.place(200, 120, 28, VIEW, 1, true, FRAME);
    expect(tag.showing).toBe(true);
    // The player walks far off to the east: the name does not stay at the edge of the screen.
    tag.place(2000, 120, 28, VIEW, 1, true, FRAME);
    expect(tag.showing).toBe(true);
    for (let i = 0; i < 30; i++) tag.place(2000, 120, 28, VIEW, 1, true, FRAME);
    expect(tag.showing).toBe(false);
    // It comes back: the name shows again.
    tag.place(300, 120, 28, VIEW, 1, true, FRAME);
    expect(tag.showing).toBe(true);
  });

  it('does not show at all for a player that is far when the name comes', () => {
    const tag = new NameTag(FONT, new Container());
    tag.set('Brann');
    tag.place(2000, 120, 28, VIEW, 1, true, FRAME);
    expect(tag.showing).toBe(false);
  });

  it('stays inside the screen for a player just off it', () => {
    const layer = new Container();
    const tag = new NameTag(FONT, layer);
    tag.set('Brann');
    tag.place(VIEW.width + TAG_MARGIN / 2, 120, 28, VIEW);
    expect(tag.showing).toBe(true);
    const shown = layer.children[0]!;
    expect(shown.x + FONT.measure('Brann')).toBeLessThanOrEqual(VIEW.width);
  });
});
