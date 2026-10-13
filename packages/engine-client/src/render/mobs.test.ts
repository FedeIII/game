import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '@game/engine';
import { seesMob } from './mobs.ts';

describe('a mob that lurks (an ambush)', () => {
  const mob = (x: number, state: 'lurk' | 'chase') => ({ x, y: 0, state });
  const seeker = { x: 0, y: 0, range: 5 * TILE_SIZE };

  it('shows only within the seek of the player (Wisdom), as a hidden thing does', () => {
    expect(seesMob(mob(4 * TILE_SIZE, 'lurk'), seeker)).toBe(true);
    expect(seesMob(mob(5 * TILE_SIZE, 'lurk'), seeker)).toBe(true);
    expect(seesMob(mob(6 * TILE_SIZE, 'lurk'), seeker)).toBe(false);
    expect(seesMob(mob(1, 'lurk'), null)).toBe(false);
  });

  it('shows at any distance once it hunts', () => {
    expect(seesMob(mob(20 * TILE_SIZE, 'chase'), seeker)).toBe(true);
    expect(seesMob(mob(20 * TILE_SIZE, 'chase'), null)).toBe(true);
  });
});
