import { describe, expect, it } from 'vitest';
import {
  AVERAGE_DICE,
  BRACE_WINDOW_TICKS,
  FACE_SLACK,
  INPUT_BATCH_TICKS,
  NO_INPUT,
  Room,
  World,
  createPlayer,
  facingCode,
  facingToward,
  fromWireInput,
  parseClientMessage,
  stepPlayer,
  stunPlayer,
  toWireInput,
  type InputMessage,
  type MoveInput,
  type SnapshotMessage,
  type SolidMap,
} from '../src/index.ts';
import { houseSource } from './helpers.ts';

/**
 * The player faces the mouse (MoveInput.face) while it stands (Fede, 2026-10-14): it faces its walk
 * while it walks, the way of its attack in an attack and a brace, and the way of a roll in a roll.
 */
const OPEN: SolidMap = { solidBox: () => null };
const DEG = Math.PI / 180;

describe('the facing of a player that stands', () => {
  it('faces the direction to face (the mouse) while it stands', () => {
    const player = createPlayer(0, 0);
    stepPlayer(player, { x: 0, y: 0, face: 0 }, OPEN);
    expect(player.facing).toBe('right');
    stepPlayer(player, { x: 0, y: 0, face: -90 * DEG }, OPEN);
    expect(player.facing).toBe('up');
    stepPlayer(player, { x: 0, y: 0, face: 170 * DEG }, OPEN);
    expect(player.facing).toBe('left');
    expect(player.x).toBe(0);
    expect(player.y).toBe(0);
  });

  it('faces its walk while it walks, wherever the mouse is', () => {
    const player = createPlayer(0, 0);
    stepPlayer(player, { x: 1, y: 0, face: Math.PI }, OPEN);
    expect(player.facing).toBe('right');
    stepPlayer(player, { x: 0, y: 1, face: -Math.PI / 2 }, OPEN);
    expect(player.facing).toBe('down');
    // It stops: now it faces the mouse.
    stepPlayer(player, { x: 0, y: 0, face: -Math.PI / 2 }, OPEN);
    expect(player.facing).toBe('up');
  });

  it('keeps its facing without a direction to face (a touch screen, or the mouse off the world)', () => {
    const player = createPlayer(0, 0);
    stepPlayer(player, { x: -1, y: 0 }, OPEN);
    stepPlayer(player, NO_INPUT, OPEN);
    expect(player.facing).toBe('left');
  });

  it('does not flicker near a diagonal', () => {
    // Up to FACE_SLACK past the diagonal, the facing stays.
    expect(facingToward('right', 45 * DEG + FACE_SLACK * 0.9)).toBe('right');
    expect(facingToward('down', 45 * DEG - FACE_SLACK * 0.9)).toBe('down');
    expect(facingToward('right', 45 * DEG + FACE_SLACK * 1.1)).toBe('down');
    expect(facingToward('down', 45 * DEG - FACE_SLACK * 1.1)).toBe('right');
    expect(facingToward('left', -135 * DEG)).toBe('left');
    expect(facingToward('up', -135 * DEG)).toBe('up');
    // Far from the facing: the nearest facing.
    expect(facingToward('up', 90 * DEG)).toBe('down');
  });

  it('rolls towards the mouse when it stands, and the way it walks when it walks', () => {
    const still = createPlayer(0, 0);
    stepPlayer(still, { x: 0, y: 0, face: 30 * DEG, dodge: true }, OPEN);
    expect(still.dodge).toBeGreaterThan(0);
    expect(still.dodgeAim).toBeCloseTo(30 * DEG, 9);
    expect(still.facing).toBe('right');
    // Exactly towards the mouse, not only to the nearest facing.
    expect(Math.atan2(still.y, still.x)).toBeCloseTo(30 * DEG, 9);

    const walking = createPlayer(0, 0);
    stepPlayer(walking, { x: 0, y: 1, face: Math.PI, dodge: true }, OPEN);
    expect(walking.dodgeAim).toBeCloseTo(Math.PI / 2, 9);
    expect(walking.facing).toBe('down');
    // In the roll it faces the roll, wherever the mouse is.
    stepPlayer(walking, { x: 0, y: 0, face: Math.PI }, OPEN);
    expect(walking.facing).toBe('down');
  });

  it('faces the way of its attack in the attack and in a brace, then the mouse again', () => {
    const player = createPlayer(0, 0);
    const traits = { brace: true };
    stepPlayer(player, { x: 0, y: 0, face: Math.PI, attack: 0 }, OPEN, traits);
    expect(player.facing).toBe('right');
    while (player.attack > 0) stepPlayer(player, { x: 0, y: 0, face: Math.PI }, OPEN, traits);
    expect(player.facing).toBe('right');
    expect(player.braceWindow).toBe(BRACE_WINDOW_TICKS);
    // A step back braces: it faces the way that it struck.
    stepPlayer(player, { x: -1, y: 0, face: Math.PI }, OPEN, traits);
    expect(player.brace).toBeGreaterThan(0);
    expect(player.facing).toBe('right');
    while (player.brace > 0) stepPlayer(player, { x: 0, y: 0, face: Math.PI }, OPEN, traits);
    stepPlayer(player, { x: 0, y: 0, face: Math.PI }, OPEN, traits);
    expect(player.facing).toBe('left');
  });

  it('does not turn while it is stunned', () => {
    const player = createPlayer(0, 0);
    stunPlayer(player, 10);
    stepPlayer(player, { x: 0, y: 0, face: -Math.PI / 2 }, OPEN);
    expect(player.facing).toBe('down');
  });
});

describe('the direction to face on the wire (protocol 45)', () => {
  it('sends it as a fifth number, 1 + its code, with the dodge as 0 or 1', () => {
    expect(toWireInput({ x: 0, y: 0, face: 0 })).toEqual([0, 0, 0, 0, 1]);
    expect(toWireInput({ x: 0, y: 0, face: Math.PI / 2 })).toEqual([0, 0, 0, 0, 65]);
    expect(toWireInput({ x: 1, y: 0, attack: Math.PI, dodge: true, face: -Math.PI / 2 })).toEqual([100, 0, 129, 1, 193]);
    expect(fromWireInput([0, 0, 0, 0, 65])).toEqual({ x: 0, y: 0, face: Math.PI / 2 });
    expect(fromWireInput([100, 0, 129, 1, 193])).toEqual({ x: 1, y: 0, attack: Math.PI, dodge: true, face: -Math.PI / 2 });
    // Without it, the input is as before.
    expect(toWireInput({ x: 1, y: 0, dodge: true })).toEqual([100, 0, 0, 1]);
    expect(toWireInput({ x: 0, y: 0, attack: 0 })).toEqual([0, 0, 1]);
    expect(toWireInput({ x: 0, y: 0, face: Number.NaN })).toEqual([0, 0]);
  });

  it('applies the same input on both sides', () => {
    for (const face of [0.3, 1, -2.9, Math.PI, 7]) {
      const once = fromWireInput(toWireInput({ x: 0, y: 0, face }));
      expect(fromWireInput(toWireInput(once))).toEqual(once);
    }
  });

  it('reads it in a batch of inputs, and refuses a bad one', () => {
    expect(parseClientMessage(JSON.stringify({ t: 'in', s: 1, i: [[0, 0, 0, 0, 1], [0, 0, 4, 1, 256]] }))).toEqual({ t: 'in', s: 1, i: [[0, 0, 0, 0, 1], [0, 0, 4, 1, 256]] });
    for (const bad of [[0, 0, 0, 0, 0], [0, 0, 0, 0, 257], [0, 0, 0, 2, 5], [0, 0, 0, 0, 1.5], [0, 0, 0, 0, 1, 1], [0, 0, -1, 0, 5]]) {
      expect(parseClientMessage(JSON.stringify({ t: 'in', s: 1, i: [bad] })), JSON.stringify(bad)).toBeNull();
    }
  });

  it('the server turns a player that stands to it, and the others see the facing', () => {
    const room = new Room(new World(houseSource()), { dice: AVERAGE_DICE });
    const a = room.join(0, 1)!;
    const b = room.join(0, 2)!;
    const send = (input: MoveInput, s: number) => {
      const message: InputMessage = { t: 'in', s, i: Array(INPUT_BATCH_TICKS).fill(toWireInput(input)) };
      room.input(a.id, message, s * 50);
    };
    send({ x: 0, y: 0, face: Math.PI }, 1);
    expect(a.state.facing).toBe('left');
    const seen = new Map<number, SnapshotMessage>();
    room.broadcast(200, (id, m) => seen.set(id, m));
    expect(seen.get(b.id)!.p.find((p) => p[0] === a.id)![5]).toBe(facingCode('left'));
    // It walks: it faces its walk.
    send({ x: 0, y: 1, face: Math.PI }, 1 + INPUT_BATCH_TICKS);
    expect(a.state.facing).toBe('down');
  });
});
