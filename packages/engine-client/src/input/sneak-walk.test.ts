import { describe, expect, it } from 'vitest';
import { NO_INPUT, PLAYER_SPEED, SNEAK_SPEED, createPlayer } from '@game/engine';
import { SneakWalk } from './sneak-walk.ts';

const EAST = { x: 1, y: 0 };

describe('SneakWalk', () => {
  it('walks the keys at SNEAK_SPEED while C has it on', () => {
    const walk = new SneakWalk();
    expect(walk.input(EAST, NO_INPUT).x).toBe(1);
    walk.toggle();
    expect(walk.on).toBe(true);
    expect(walk.input(EAST, NO_INPUT).x).toBe(SNEAK_SPEED);
    walk.toggle();
    expect(walk.input(EAST, NO_INPUT).x).toBe(1);
  });

  it('shows a player that stands with the sneak walk on as sneaking', () => {
    const walk = new SneakWalk();
    const player = createPlayer(0, 0);
    expect(walk.shown(player, false)).toBe(false);
    walk.toggle();
    expect(walk.shown(player, false)).toBe(true);
  });

  it('ends at an attack: the keys walk at full speed, and the player stands up', () => {
    const walk = new SneakWalk();
    walk.toggle();
    walk.attack();
    expect(walk.on).toBe(false);
    expect(walk.input(EAST, NO_INPUT).x).toBe(1);
    // After the attack the crouch is gone (PlayerView ends it while the attack lasts).
    const player = createPlayer(0, 0);
    expect(walk.shown(player, false)).toBe(false);
  });

  it('keeps a slow push of the joystick a sneak after an attack', () => {
    const walk = new SneakWalk();
    walk.toggle();
    walk.attack();
    const push = walk.input(NO_INPUT, { x: 0.4, y: 0 });
    expect(push.x).toBeCloseTo(0.4, 9);
    const player = { ...createPlayer(0, 0), vx: push.x * PLAYER_SPEED, vy: 0 };
    expect(walk.shown(player, false)).toBe(true);
  });
});
